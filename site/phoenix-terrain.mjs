import * as THREE from './vendor/three.module.min.js';

/**
 * Bake static, world-updated Three.js meshes into an ocean-relative height field.
 * +Y is height. Vertices are transformed once per mesh, not per triangle/sample.
 * Indexed and non-indexed geometry, including drawRange, are supported.
 *
 * Each node represents a half-cell footprint. Triangle/footprint clipping keeps
 * thin ledges from vanishing between sample points, then a one-cell maximum
 * dilation adds clearance near cliffs. heightAt returns the maximum of its four
 * surrounding nodes. This deliberately favors avoiding geometry over hugging it.
 * It is an upper-surface field: caves, overhang undersides, and vertical walls
 * cannot be traversed as separate layers. Call once after island normalization.
 */
export function buildTerrainField(terrainMeshes, {
  minX = -140, maxX = 140, minZ = -140, maxZ = 140, size = 129,
} = {}) {
  if (![minX, maxX, minZ, maxZ].every(Number.isFinite) || maxX <= minX || maxZ <= minZ) {
    throw new RangeError('Terrain bounds must be finite and increasing.');
  }
  if (!Number.isInteger(size) || size < 2 || size > 2049) {
    throw new RangeError('Terrain field size must be an integer from 2 to 2049.');
  }
  const stepX = (maxX - minX) / (size - 1), stepZ = (maxZ - minZ) / (size - 1);
  const halfX = stepX * .5, halfZ = stepZ * .5;
  const rawHeights = new Float32Array(size * size);
  const vertex = new THREE.Vector3();
  let meshCount = 0, triangleCount = 0, rasterizedTriangles = 0, skippedVertical = 0;

  // Sutherland-Hodgman clipping in X/Z. Y is recovered from the triangle plane.
  function clip(polygon, axis, boundary, greater) {
    if (!polygon.length) return polygon;
    const result = [];
    let previous = polygon[polygon.length - 1];
    let previousInside = greater ? previous[axis] >= boundary : previous[axis] <= boundary;
    for (const point of polygon) {
      const inside = greater ? point[axis] >= boundary : point[axis] <= boundary;
      if (inside !== previousInside) {
        const fraction = (boundary - previous[axis]) / (point[axis] - previous[axis]);
        result.push([
          previous[0] + (point[0] - previous[0]) * fraction,
          previous[1] + (point[1] - previous[1]) * fraction,
        ]);
      }
      if (inside) result.push(point);
      previous = point; previousInside = inside;
    }
    return result;
  }

  for (const mesh of terrainMeshes || []) {
    const geometry = mesh.geometry, positions = geometry?.getAttribute('position');
    if (!positions || !mesh.matrixWorld) continue;
    meshCount++;
    const world = new Float64Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
      world[i * 3] = vertex.x; world[i * 3 + 1] = vertex.y; world[i * 3 + 2] = vertex.z;
    }
    const index = geometry.index;
    const count = index ? index.count : positions.count;
    const start = Math.max(0, Math.floor(geometry.drawRange?.start || 0));
    const requested = geometry.drawRange?.count ?? Infinity;
    const end = Math.min(count, Number.isFinite(requested) ? start + Math.max(0, requested) : count);
    for (let offset = start; offset + 2 < end; offset += 3) {
      triangleCount++;
      const a = (index ? index.getX(offset) : offset) * 3;
      const b = (index ? index.getX(offset + 1) : offset + 1) * 3;
      const c = (index ? index.getX(offset + 2) : offset + 2) * 3;
      const ax = world[a], ay = world[a + 1], az = world[a + 2];
      const bx = world[b], by = world[b + 1], bz = world[b + 2];
      const cx = world[c], cy = world[c + 1], cz = world[c + 2];
      if (![ax, ay, az, bx, by, bz, cx, cy, cz].every(Number.isFinite)) continue;
      if (Math.max(ay, by, cy) <= 0) continue;
      const denominator = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
      if (Math.abs(denominator) < 1e-10) { skippedVertical++; continue; }
      const slopeX = ((by - ay) * (cz - az) - (cy - ay) * (bz - az)) / denominator;
      const slopeZ = ((bx - ax) * (cy - ay) - (cx - ax) * (by - ay)) / denominator;
      const x0 = Math.max(0, Math.ceil((Math.min(ax, bx, cx) - minX) / stepX - .5));
      const x1 = Math.min(size - 1, Math.floor((Math.max(ax, bx, cx) - minX) / stepX + .5));
      const z0 = Math.max(0, Math.ceil((Math.min(az, bz, cz) - minZ) / stepZ - .5));
      const z1 = Math.min(size - 1, Math.floor((Math.max(az, bz, cz) - minZ) / stepZ + .5));
      if (x1 < x0 || z1 < z0) continue;
      const triangle = [[ax, az], [bx, bz], [cx, cz]];
      let covered = false;
      for (let z = z0; z <= z1; z++) {
        const sampleZ = minZ + z * stepZ;
        // Clip each row first, so triangles do not repeat the Z clips per node.
        const row = clip(clip(triangle, 1, sampleZ - halfZ, true), 1, sampleZ + halfZ, false);
        if (!row.length) continue;
        for (let x = x0; x <= x1; x++) {
          const sampleX = minX + x * stepX;
          const polygon = clip(clip(row, 0, sampleX - halfX, true), 0, sampleX + halfX, false);
          if (!polygon.length) continue;
          let height = 0;
          for (const point of polygon) height = Math.max(height, ay + slopeX * (point[0] - ax) + slopeZ * (point[1] - az));
          if (height > 0) {
            const cell = z * size + x;
            rawHeights[cell] = Math.max(rawHeights[cell], height);
            covered = true;
          }
        }
      }
      if (covered) rasterizedTriangles++;
    }
  }

  const heights = new Float32Array(rawHeights.length);
  for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
    let height = 0;
    for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
      const nx = x + ox, nz = z + oz;
      if (nx >= 0 && nx < size && nz >= 0 && nz < size) height = Math.max(height, rawHeights[nz * size + nx]);
    }
    heights[z * size + x] = height;
  }

  function heightAt(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z) || x < minX || x > maxX || z < minZ || z > maxZ) return 0;
    const gx = (x - minX) / stepX, gz = (z - minZ) / stepZ;
    const x0 = Math.min(size - 1, Math.max(0, Math.floor(gx))), x1 = Math.min(size - 1, x0 + 1);
    const z0 = Math.min(size - 1, Math.max(0, Math.floor(gz))), z1 = Math.min(size - 1, z0 + 1);
    return Math.max(heights[z0 * size + x0], heights[z0 * size + x1], heights[z1 * size + x0], heights[z1 * size + x1]);
  }

  return {
    heightAt, heights, rawHeights, resolution: size, size,
    minX, maxX, minZ, maxZ, stepX, stepZ,
    meshCount, triangleCount, rasterizedTriangles, skippedVertical,
  };
}
