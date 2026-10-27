"""Inspect the two downloaded GLBs without Blender, npm, or optional packages.

Reports embedded resources, actual transformed geometry bounds, skeletal poses,
and animation targets. Usage: python tools/inspect-flight-assets.py
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import io
import json
import math
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parents[1]
IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
FORMATS = {5120: "b", 5121: "B", 5122: "h", 5123: "H", 5125: "I", 5126: "f"}
SIZES = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def multiply(a, b):
    return [sum(a[row * 4 + k] * b[k * 4 + col] for k in range(4))
            for row in range(4) for col in range(4)]


def transform(m, p):
    p = [*p[:3], 1]
    return [sum(m[row * 4 + col] * p[col] for col in range(4)) for row in range(3)]


def matrix(node):
    if "matrix" in node:
        return [node["matrix"][col * 4 + row] for row in range(4) for col in range(4)]
    x, y, z, w = node.get("rotation", [0, 0, 0, 1])
    sx, sy, sz = node.get("scale", [1, 1, 1])
    tx, ty, tz = node.get("translation", [0, 0, 0])
    return [
        (1 - 2*y*y - 2*z*z)*sx, (2*x*y - 2*z*w)*sy, (2*x*z + 2*y*w)*sz, tx,
        (2*x*y + 2*z*w)*sx, (1 - 2*x*x - 2*z*z)*sy, (2*y*z - 2*x*w)*sz, ty,
        (2*x*z - 2*y*w)*sx, (2*y*z + 2*x*w)*sy, (1 - 2*x*x - 2*y*y)*sz, tz,
        0, 0, 0, 1,
    ]


def bounds(points):
    points = list(points)
    if not points:
        return None
    low = [min(p[k] for p in points) for k in range(3)]
    high = [max(p[k] for p in points) for k in range(3)]
    return {"min": low, "max": high, "size": [high[k]-low[k] for k in range(3)],
            "center": [(high[k]+low[k])/2 for k in range(3)]}


def quaternion_mix(a, b, t):
    dot = sum(x*y for x, y in zip(a, b))
    if dot < 0:
        b = [-n for n in b]
        dot = -dot
    if dot > .9995:
        out = [x+(y-x)*t for x, y in zip(a, b)]
        length = math.sqrt(sum(x*x for x in out))
        return [x/length for x in out]
    theta = math.acos(max(-1, min(1, dot)))
    return [(math.sin((1-t)*theta)*x + math.sin(t*theta)*y)/math.sin(theta)
            for x, y in zip(a, b)]


class GLB:
    def __init__(self, path):
        self.path = path
        data = path.read_bytes()
        assert data[:4] == b"glTF" and struct.unpack_from("<I", data, 4)[0] == 2
        cursor = 12
        self.binary = b""
        while cursor < len(data):
            length, kind = struct.unpack_from("<II", data, cursor)
            content = data[cursor+8:cursor+8+length]
            if kind == 0x4E4F534A:
                self.g = json.loads(content)
            elif kind == 0x004E4942:
                self.binary = content
            cursor += 8 + length
        self.cache = {}

    def accessor(self, index):
        if index in self.cache:
            return self.cache[index]
        a = self.g["accessors"][index]
        assert "sparse" not in a, "Sparse accessor is not handled by this inspector"
        view = self.g["bufferViews"][a["bufferView"]]
        fmt = "<" + FORMATS[a["componentType"]] * SIZES[a["type"]]
        size = struct.calcsize(fmt)
        start = view.get("byteOffset", 0) + a.get("byteOffset", 0)
        stride = view.get("byteStride", size)
        values = [list(struct.unpack_from(fmt, self.binary, start + i*stride)) for i in range(a["count"])]
        if a.get("normalized") and a["componentType"] != 5126:
            scale = {5120: 127, 5121: 255, 5122: 32767, 5123: 65535}[a["componentType"]]
            values = [[max(-1, x/scale) for x in row] for row in values]
        self.cache[index] = values
        return values

    def pose(self, time=None):
        nodes = copy.deepcopy(self.g["nodes"])
        if time is not None and self.g.get("animations"):
            animation = self.g["animations"][0]
            for channel in animation["channels"]:
                target = channel["target"]
                if target["path"] == "weights":
                    continue
                sampler = animation["samplers"][channel["sampler"]]
                times = [r[0] for r in self.accessor(sampler["input"])]
                values = self.accessor(sampler["output"])
                right = next((i for i, value in enumerate(times) if value >= time), len(times)-1)
                left = max(0, right-1)
                p = (time-times[left])/(times[right]-times[left]) if times[right] != times[left] else 0
                p = min(1, max(0, p))
                assert sampler.get("interpolation", "LINEAR") in ("LINEAR", "STEP")
                if sampler.get("interpolation") == "STEP":
                    value = values[left]
                elif target["path"] == "rotation":
                    value = quaternion_mix(values[left], values[right], p)
                else:
                    value = [a+(b-a)*p for a, b in zip(values[left], values[right])]
                nodes[target["node"]][target["path"]] = value
        worlds = {}
        def visit(index, parent):
            world = multiply(parent, matrix(nodes[index]))
            worlds[index] = world
            for child in nodes[index].get("children", []):
                visit(child, world)
        for node in self.g["scenes"][self.g.get("scene", 0)]["nodes"]:
            visit(node, IDENTITY)
        return worlds

    def vertices(self, index, world):
        node = self.g["nodes"][index]
        if "mesh" not in node:
            return []
        out = []
        for primitive in self.g["meshes"][node["mesh"]]["primitives"]:
            attrs = primitive["attributes"]
            positions = self.accessor(attrs["POSITION"])
            if "skin" not in node:
                out.extend(transform(world[index], p) for p in positions)
                continue
            skin = self.g["skins"][node["skin"]]
            inverse_bind = self.accessor(skin["inverseBindMatrices"])
            matrices = [multiply(world[joint], [ib[col*4+row] for row in range(4) for col in range(4)])
                        for joint, ib in zip(skin["joints"], inverse_bind)]
            joints, weights = self.accessor(attrs["JOINTS_0"]), self.accessor(attrs["WEIGHTS_0"])
            for point, js, ws in zip(positions, joints, weights):
                result = [0., 0., 0.]
                for joint, weight in zip(js, ws):
                    if weight:
                        moved = transform(matrices[int(joint)], point)
                        result = [a+weight*b for a, b in zip(result, moved)]
                out.append(result)
        return out

    def report(self):
        world = self.pose()
        mesh_nodes = [i for i, n in enumerate(self.g["nodes"]) if "mesh" in n]
        meshes = []
        all_points = []
        for index in mesh_nodes:
            points = self.vertices(index, world)
            all_points.extend(points)
            node = self.g["nodes"][index]
            mesh = self.g["meshes"][node["mesh"]]
            triangles = sum(self.g["accessors"][p["indices"]]["count"]//3 if "indices" in p
                            else self.g["accessors"][p["attributes"]["POSITION"]]["count"]//3
                            for p in mesh["primitives"])
            meshes.append({"node": index, "name": node.get("name"), "skinned": "skin" in node,
                           "vertices": len(points), "triangles": triangles, "bounds": bounds(points),
                           "materials": [self.g["materials"][p["material"]].get("name") for p in mesh["primitives"]]})
        animations = []
        for animation in self.g.get("animations", []):
            animations.append({"name": animation.get("name"),
                               "duration": max(self.accessor(s["input"])[-1][0] for s in animation["samplers"]),
                               "channels": len(animation["channels"]),
                               "targets": [{"node": c["target"]["node"], "name": self.g["nodes"][c["target"]["node"]].get("name"),
                                            "path": c["target"]["path"]} for c in animation["channels"]]})
        images = []
        for image in self.g.get("images", []):
            entry = {"mime": image.get("mimeType"), "embedded": "bufferView" in image}
            if "bufferView" in image:
                view = self.g["bufferViews"][image["bufferView"]]
                blob = self.binary[view.get("byteOffset", 0):view.get("byteOffset", 0)+view["byteLength"]]
                entry["bytes"] = len(blob)
                try:
                    from PIL import Image
                    with Image.open(io.BytesIO(blob)) as img:
                        entry.update({"dimensions": list(img.size), "mode": img.mode})
                except ImportError:
                    pass
            images.append(entry)
        # This phoenix repeats its flap roughly four times inside the full clip.
        # Sampling only quarter-duration points would misleadingly look static.
        sample_times = [k/20 for k in range(17)] if self.g.get("skins") else [0, 9.6, 19.2, 28.8, 38.4]
        samples = []
        animated_points = []
        for time in sample_times:
            posed = self.pose(time)
            points = [p for index in mesh_nodes for p in self.vertices(index, posed)]
            animated_points.extend(points)
            landmarks = {self.g["nodes"][i].get("name"): transform(m, [0, 0, 0]) for i, m in posed.items()
                         if self.g["nodes"][i].get("name") in ("b_Root_01", "b_Head_06", "b_Left_Foot_036", "b_Right_Foot_039", "B_Left_Wing_0_070", "B_Right_Wing_0_079", "ISLE_17", "ROT")}
            samples.append({"time": time, "bounds": bounds(points), "landmarks": landmarks})
        result = {"source_file": str(self.path), "bytes": self.path.stat().st_size,
                "sha256": hashlib.sha256(self.path.read_bytes()).hexdigest(),
                "generator": self.g.get("asset", {}), "extensions_used": self.g.get("extensionsUsed", []),
                "extensions_required": self.g.get("extensionsRequired", []), "mesh_count": len(meshes),
                "vertex_count": sum(m["vertices"] for m in meshes), "triangles": sum(m["triangles"] for m in meshes),
                "bounds": bounds(all_points), "meshes": meshes, "images": images,
                "materials": self.g.get("materials", []), "animations": animations,
                "joint_counts": [len(s["joints"]) for s in self.g.get("skins", [])],
                "cameras": self.g.get("cameras", []), "animation_samples": samples}
        if self.g.get("skins"):
            result["flight_cycle_bounds"] = bounds(animated_points)
        return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path, default=Path.home()/"Downloads")
    parser.add_argument("--output", type=Path, default=ROOT/"design/phoenix-flight/asset-inspection.json")
    args = parser.parse_args()
    report = {name: GLB(args.input_dir/(name+".glb")).report() for name in ("island", "phoenix_bird")}
    solid = next(m for m in report["island"]["meshes"] if m["name"] == "ISLE_17_roc_0")
    scale = 240 / max(solid["bounds"]["size"][0], solid["bounds"]["size"][2])
    center = solid["bounds"]["center"]
    report["island"]["recommended_normalization"] = {
        "scale": scale, "translation": [-center[0]*scale, 218.125*scale, -center[2]*scale],
        "reference_sea_surface_y": -218.125, "reference_solid_node": solid["name"],
    }
    bird = report["phoenix_bird"]
    landmarks = bird["animation_samples"][0]["landmarks"]
    root, head = landmarks["b_Root_01"], landmarks["b_Head_06"]
    direction = [head[k]-root[k] for k in range(3)]
    yaw = math.atan2(direction[0], -direction[2])
    bird["recommended_normalization"] = {
        "horizontal_forward_yaw": yaw, "horizontal_forward_yaw_degrees": math.degrees(yaw),
        "scale_for_maximum_wingspan_7": 7/bird["flight_cycle_bounds"]["size"][2],
        "bind_body_pivot_world": root, "body_pivot_offset_before_yaw": [-n for n in root],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    for name, data in report.items():
        print(name, json.dumps({k: data[k] for k in ("bytes", "mesh_count", "triangles", "bounds", "images")}, ensure_ascii=True))
        print("animations:", [(a["name"], a["duration"]) for a in data["animations"]])
        print("normalization:", json.dumps(data["recommended_normalization"], ensure_ascii=True))
    print("Wrote", args.output)


if __name__ == "__main__":
    main()
