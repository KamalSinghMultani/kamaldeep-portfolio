const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async () => {
  const local = name => pathToFileURL(path.resolve(name)).href;
  const THREE = await import(local('site/vendor/three.module.min.js'));
  const { buildTerrainField } = await import(local('site/phoenix-terrain.mjs'));
  const mesh = (vertices, indices) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    if (indices) geometry.setIndex(indices);
    return new THREE.Mesh(geometry);
  };
  const update = object => { object.updateMatrixWorld(true); return object; };
  const bounds = { minX: -20, maxX: 20, minZ: -20, maxZ: 20, size: 81 };

  const empty = buildTerrainField([], bounds);
  assert.equal(empty.heightAt(0, 0), 0);
  assert.equal(empty.heightAt(50, 50), 0);
  assert.equal(empty.heightAt(NaN, 0), 0);
  assert.equal(empty.resolution, 81);
  assert.equal(empty.heights.length, 81 * 81);
  assert.throws(() => buildTerrainField([], { minX: 1, maxX: 0 }), RangeError);
  assert.throws(() => buildTerrainField([], { size: 1 }), RangeError);

  const triangle = mesh([0, 2, 0, 4, 2, 0, 0, 2, 4], [0, 1, 2]);
  triangle.position.set(5, 7, -3); triangle.scale.set(2, 2, 2); update(triangle);
  const untouched = Array.from(triangle.geometry.attributes.position.array);
  const transformed = buildTerrainField([triangle], bounds);
  assert.equal(transformed.heightAt(6, -2), 11, 'World translation and scale affect an indexed mesh');
  assert.equal(transformed.heightAt(-8, -8), 0);
  assert.deepEqual(Array.from(triangle.geometry.attributes.position.array), untouched, 'Baking leaves source geometry intact');
  assert.equal(transformed.meshCount, 1); assert.equal(transformed.triangleCount, 1);

  const rotated = new THREE.Mesh(new THREE.PlaneGeometry(6, 6));
  rotated.rotation.x = -Math.PI / 2; rotated.rotation.z = Math.PI / 4; rotated.position.set(-7, 13, 5); update(rotated);
  assert.equal(buildTerrainField([rotated], bounds).heightAt(-7, 5), 13, 'World rotation is respected');

  const low = update(mesh([-4, 3, -4, 4, 3, -4, -4, 3, 4, 4, 3, -4, 4, 3, 4, -4, 3, 4]));
  const high = update(mesh([-2, 12, -2, 2, 12, -2, 0, 12, 2]));
  const submerged = update(mesh([-20, -4, -20, 20, -4, -20, 0, -4, 20]));
  assert.equal(buildTerrainField([high, low, submerged], bounds).heightAt(0, 0), 12, 'Highest positive layer wins');
  assert.equal(buildTerrainField([low, submerged, high], bounds).heightAt(0, 0), 12, 'Mesh ordering does not change the field');
  assert.equal(buildTerrainField([submerged], bounds).heightAt(0, 0), 0, 'Ocean remains zero above submerged geometry');

  const slope = update(mesh([0, 0, 0, 4, 4, 0, 0, 0, 4]));
  const sloped = buildTerrainField([slope], { minX: 0, maxX: 4, minZ: 0, maxZ: 4, size: 17 });
  const sampled = sloped.heightAt(1, 1);
  assert(sampled >= 1 && sampled <= 1 + 2.6 * sloped.stepX,
    'Slopes are locally sampled and conservatively padded, not filled with the triangle peak');
  assert.equal(sloped.heightAt(5, 1), 0, 'Outside the field is water');

  const narrow = update(mesh([1.18, 9, 1.18, 1.22, 9, 1.18, 1.18, 9, 1.22]));
  const tiny = buildTerrainField([narrow], { minX: 0, maxX: 4, minZ: 0, maxZ: 4, size: 5 });
  assert.equal(tiny.rawHeights[1 * 5 + 1], 9, 'A ledge smaller than a cell cannot vanish between grid nodes');
  assert.equal(tiny.heights[2 * 5 + 2], 9, 'One-cell dilation preserves a conservative edge margin');
  assert.equal(tiny.rawHeights[2 * 5 + 2], 0, 'The margin does not rewrite the raw field');
  assert.equal(tiny.heightAt(1.6, 1.6), 9, 'Lookup takes the maximum surrounding samples');
  assert.equal(tiny.heightAt(4, 4), 0);

  const wall = update(mesh([0, 0, 0, 0, 20, 0, 0, 20, 4]));
  const vertical = buildTerrainField([wall], bounds);
  assert.equal(vertical.skippedVertical, 1);
  assert.equal(vertical.heightAt(0, 1), 0, 'Vertical triangles do not produce an invalid projected height');

  const limited = update(mesh([0, 7, 0, 2, 7, 0, 0, 7, 2, 8, 50, 0, 10, 50, 0, 8, 50, 2]));
  limited.geometry.setDrawRange(0, 3);
  const drawn = buildTerrainField([limited], bounds);
  assert.equal(drawn.heightAt(.5, .5), 7);
  assert.equal(drawn.heightAt(8.5, .5), 0, 'Undrawn geometry is not included as an invisible obstacle');
  assert.equal(drawn.triangleCount, 1);

  console.log('Phoenix terrain passed: transformed/indexed and non-indexed meshes, upper surfaces, ocean, local slopes, narrow ledges, conservative dilation, vertical skips and draw ranges.');
})().catch(error => { console.error(error); process.exitCode = 1; });
