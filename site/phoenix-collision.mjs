import * as THREE from './vendor/three.module.min.js';

/**
 * Static triangle collision for the imported island. +Y is up, but the collision
 * world has no privileged terrain height: roofs, undersides, walls, and openings
 * are tested at their actual positions. Source geometry is never changed.
 *
 * Call after normalization and updateMatrixWorld(true). Exclude sky, clouds,
 * ocean and decorative effects before calling. A body sphere approximates the
 * bird; feather-tip collisions are intentionally not modeled by this sphere.
 *
 * constrainMotion(start,end,radius=1.2) sweeps continuously then slides along
 * contact planes. clipCamera(start,end,radius=.45) stops at the first hit without
 * sliding, so a chase camera shortens its arm instead of rising above a roof.
 * Both return plain {position,hit,normal,contacts,startedPenetrating,...} values.
 * Recovery handles local surface overlaps only; spawn/teleport positions must
 * be in open space, rather than deep inside a closed solid. Physical sliding
 * on a slope can raise Y; a controller may reject that slide to preserve a
 * descending flight command while retaining the safe starting position.
 */
export function createCollisionWorld(meshes, {
  cellSize = 12, skin = .015, maxSlides = 4, maxRecovery = 6,
  maxCellsPerTriangle = 512, maxQueryCells = 32768,
} = {}) {
  if (!Number.isFinite(cellSize) || cellSize <= 0) throw new RangeError('Collision cellSize must be positive.');
  if (!Number.isFinite(skin) || skin < 0) throw new RangeError('Collision skin must be non-negative.');
  maxSlides = Math.max(1, Math.min(8, Math.floor(maxSlides)));
  maxRecovery = Math.max(1, Math.min(12, Math.floor(maxRecovery)));
  const triangles = [], cells = new Map(), largeTriangles = [];
  const vertex = new THREE.Vector3();
  const minWorld = new THREE.Vector3(Infinity, Infinity, Infinity);
  const maxWorld = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  let meshCount = 0, degenerateTriangles = 0;
  const cell = value => Math.floor(value / cellSize);
  const key = (x, y, z) => `${x},${y},${z}`;

  for (const mesh of meshes || []) {
    const geometry = mesh.geometry, positions = geometry?.getAttribute('position');
    if (!positions || !mesh.matrixWorld || mesh.isSkinnedMesh) continue;
    meshCount++;
    const world = new Float64Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
      world[i * 3] = vertex.x; world[i * 3 + 1] = vertex.y; world[i * 3 + 2] = vertex.z;
    }
    const index = geometry.index, count = index ? index.count : positions.count;
    const begin = Math.max(0, Math.floor(geometry.drawRange?.start || 0));
    const requested = geometry.drawRange?.count ?? Infinity;
    const end = Math.min(count, Number.isFinite(requested) ? begin + Math.max(0, requested) : count);
    for (let offset = begin; offset + 2 < end; offset += 3) {
      const a = (index ? index.getX(offset) : offset) * 3;
      const b = (index ? index.getX(offset + 1) : offset + 1) * 3;
      const c = (index ? index.getX(offset + 2) : offset + 2) * 3;
      const points = [a, b, c].map(i => new THREE.Vector3(world[i], world[i + 1], world[i + 2]));
      if (!points.every(p => [p.x, p.y, p.z].every(Number.isFinite))) continue;
      const shape = new THREE.Triangle(...points), normal = shape.getNormal(new THREE.Vector3());
      if (normal.lengthSq() < .5) { degenerateTriangles++; continue; }
      const bounds = new THREE.Box3().setFromPoints(points);
      const triangle = { shape, normal, bounds };
      const id = triangles.push(triangle) - 1;
      minWorld.min(bounds.min); maxWorld.max(bounds.max);
      const x0 = cell(bounds.min.x), x1 = cell(bounds.max.x);
      const y0 = cell(bounds.min.y), y1 = cell(bounds.max.y);
      const z0 = cell(bounds.min.z), z1 = cell(bounds.max.z);
      const span = (x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1);
      if (span > maxCellsPerTriangle) { largeTriangles.push(id); continue; }
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
        const address = key(x, y, z), bucket = cells.get(address);
        if (bucket) bucket.push(id); else cells.set(address, [id]);
      }
    }
  }

  const candidates = new Set();
  function query(start, end, radius) {
    candidates.clear();
    const x0 = cell(Math.min(start.x, end.x) - radius), x1 = cell(Math.max(start.x, end.x) + radius);
    const y0 = cell(Math.min(start.y, end.y) - radius), y1 = cell(Math.max(start.y, end.y) + radius);
    const z0 = cell(Math.min(start.z, end.z) - radius), z1 = cell(Math.max(start.z, end.z) + radius);
    if ((x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1) > maxQueryCells) {
      for (let i = 0; i < triangles.length; i++) candidates.add(i);
    } else {
      for (const id of largeTriangles) candidates.add(id);
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
        const bucket = cells.get(key(x, y, z));
        if (bucket) for (const id of bucket) candidates.add(id);
      }
    }
    return candidates;
  }

  const closest = new THREE.Vector3(), offset = new THREE.Vector3(), normal = new THREE.Vector3();
  const impact = new THREE.Vector3(), contactPoint = new THREE.Vector3();
  const delta = new THREE.Vector3(), edge = new THREE.Vector3(), w = new THREE.Vector3();
  const perpendicularVelocity = new THREE.Vector3(), perpendicularOffset = new THREE.Vector3();
  const temporaryEnd = new THREE.Vector3();
  let bestTime, bestNormal, bestId;

  function consider(time, nx, ny, nz, motion, id) {
    if (!Number.isFinite(time) || time < -1e-8 || time > 1 + 1e-8 || time >= bestTime) return;
    // A tangent or departing touch must not glue a sphere to the surface.
    if (nx * motion.x + ny * motion.y + nz * motion.z >= -1e-9) return;
    bestTime = Math.max(0, Math.min(1, time));
    bestNormal.set(nx, ny, nz); bestId = id;
  }

  function firstRoot(a, b, c) {
    if (a < 1e-18) return Infinity;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return Infinity;
    return (-b - Math.sqrt(Math.max(0, discriminant))) / (2 * a);
  }

  function sweep(start, motion, radius) {
    bestTime = Infinity; bestNormal = new THREE.Vector3(); bestId = -1;
    temporaryEnd.copy(start).add(motion);
    const aMotion = motion.lengthSq();
    if (aMotion < 1e-18) return null;
    for (const id of query(start, temporaryEnd, radius)) {
      const triangle = triangles[id], { shape, normal: n } = triangle;
      const signed = n.dot(offset.copy(start).sub(shape.a)), toward = n.dot(motion);
      let time = Infinity, side = 1;
      if (signed >= radius - 1e-7 && toward < -1e-10) time = (radius - signed) / toward;
      else if (signed <= -radius + 1e-7 && toward > 1e-10) { time = (-radius - signed) / toward; side = -1; }
      if (time >= -1e-8 && time <= Math.min(1, bestTime)) {
        impact.copy(start).addScaledVector(motion, Math.max(0, time));
        contactPoint.copy(impact).addScaledVector(n, -radius * side);
        if (shape.containsPoint(contactPoint)) consider(time, n.x * side, n.y * side, n.z * side, motion, id);
      }

      for (const point of [shape.a, shape.b, shape.c]) {
        offset.copy(start).sub(point);
        const t = firstRoot(aMotion, 2 * offset.dot(motion), offset.lengthSq() - radius * radius);
        if (t < bestTime && t >= -1e-8 && t <= 1) {
          normal.copy(start).addScaledVector(motion, Math.max(0, t)).sub(point).normalize();
          consider(t, normal.x, normal.y, normal.z, motion, id);
        }
      }

      // Sweep against each finite edge cylinder; endpoint spheres above cap it.
      const points = [shape.a, shape.b, shape.c];
      for (let i = 0; i < 3; i++) {
        const a = points[i], b = points[(i + 1) % 3];
        edge.copy(b).sub(a); const lengthSquared = edge.lengthSq();
        if (lengthSquared < 1e-18) continue;
        w.copy(start).sub(a);
        const velocityAlong = motion.dot(edge) / lengthSquared;
        const offsetAlong = w.dot(edge) / lengthSquared;
        perpendicularVelocity.copy(motion).addScaledVector(edge, -velocityAlong);
        perpendicularOffset.copy(w).addScaledVector(edge, -offsetAlong);
        const t = firstRoot(perpendicularVelocity.lengthSq(), 2 * perpendicularVelocity.dot(perpendicularOffset), perpendicularOffset.lengthSq() - radius * radius);
        if (t < -1e-8 || t > 1 || t >= bestTime) continue;
        const along = offsetAlong + velocityAlong * Math.max(0, t);
        if (along < -1e-8 || along > 1 + 1e-8) continue;
        closest.copy(a).addScaledVector(edge, Math.max(0, Math.min(1, along)));
        normal.copy(start).addScaledVector(motion, Math.max(0, t)).sub(closest).normalize();
        consider(t, normal.x, normal.y, normal.z, motion, id);
      }
    }
    return Number.isFinite(bestTime) ? { time: bestTime, normal: bestNormal.clone(), triangle: bestId } : null;
  }

  function resolve(startValue, endValue, radius, slide) {
    if (![startValue?.x, startValue?.y, startValue?.z, endValue?.x, endValue?.y, endValue?.z].every(Number.isFinite)) {
      throw new TypeError('Collision motion requires finite xyz positions.');
    }
    if (!Number.isFinite(radius) || radius < 0) throw new RangeError('Collision radius must be non-negative.');
    const effectiveRadius = radius + skin;
    const position = new THREE.Vector3(startValue.x, startValue.y, startValue.z);
    const desired = new THREE.Vector3(endValue.x, endValue.y, endValue.z);
    delta.copy(desired).sub(position);
    const contacts = [];
    let startedPenetrating = false;
    // Recovery is local to an actual intersecting triangle, not a world-height
    // assumption. A normal below an overhang points down, never up through it.
    for (let iteration = 0; iteration < maxRecovery; iteration++) {
      let depth = 1e-7, recovery = null, triangleId = -1;
      for (const id of query(position, position, effectiveRadius)) {
        const triangle = triangles[id];
        triangle.shape.closestPointToPoint(position, closest);
        offset.copy(position).sub(closest);
        const distance = offset.length(), penetration = effectiveRadius - distance;
        if (penetration <= depth) continue;
        if (distance > 1e-9) offset.multiplyScalar(1 / distance);
        else {
          offset.copy(triangle.normal);
          if (offset.dot(delta) > 0) offset.negate();
        }
        depth = penetration; recovery = offset.clone(); triangleId = id;
      }
      if (!recovery) break;
      startedPenetrating = true;
      position.addScaledVector(recovery, depth + 1e-6);
      contacts.push({ normal: { x: recovery.x, y: recovery.y, z: recovery.z }, triangle: triangleId, recovery: true });
    }

    const recoveredStart = position.clone();
    const remaining = delta.clone();
    for (let iteration = 0; iteration < (slide ? maxSlides : 1) && remaining.lengthSq() > 1e-16; iteration++) {
      const collision = sweep(position, remaining, effectiveRadius);
      if (!collision) { position.add(remaining); remaining.set(0, 0, 0); break; }
      const length = remaining.length();
      // Stop a tiny distance before the contact; this is not a normal-direction
      // kick and cannot introduce an artificial upward displacement.
      const travel = Math.max(0, collision.time - 1e-5 / Math.max(length, 1));
      position.addScaledVector(remaining, travel);
      contacts.push({ normal: { x: collision.normal.x, y: collision.normal.y, z: collision.normal.z }, triangle: collision.triangle, recovery: false });
      if (!slide) { remaining.set(0, 0, 0); break; }
      remaining.multiplyScalar(1 - travel);
      const into = remaining.dot(collision.normal);
      if (into < 0) remaining.addScaledVector(collision.normal, -into);
    }
    const last = contacts[contacts.length - 1];
    return {
      position: { x: position.x, y: position.y, z: position.z },
      hit: contacts.length > 0,
      normal: last?.normal || { x: 0, y: 0, z: 0 },
      contacts, startedPenetrating,
      recoveryDistance: recoveredStart.distanceTo(new THREE.Vector3(startValue.x, startValue.y, startValue.z)),
    };
  }

  return {
    constrainMotion: (start, end, radius = 1.2) => resolve(start, end, radius, true),
    clipCamera: (start, end, radius = .45) => resolve(start, end, radius, false),
    meshCount, triangleCount: triangles.length, degenerateTriangles,
    cellCount: cells.size, largeTriangleCount: largeTriangles.length, cellSize,
    bounds: { min: { x: minWorld.x, y: minWorld.y, z: minWorld.z }, max: { x: maxWorld.x, y: maxWorld.y, z: maxWorld.z } },
  };
}
