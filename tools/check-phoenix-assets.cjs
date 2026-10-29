const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readGLB(file) {
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  return JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
}

const root = 'dist/site';
const island = readGLB(path.join(root, 'media/phoenix-island/island.glb'));
const phoenix = readGLB(path.join(root, 'media/phoenix-island/phoenix.glb'));
assert(island.nodes.some(node => node.name === 'ISLE_17'));
assert(phoenix.skins.some(skin => skin.joints.length > 50));
assert(phoenix.animations.some(clip => clip.name === 'Take 001'));
for (const model of [island, phoenix]) {
  assert.equal((model.extensionsRequired || []).length, 0, 'Assets require no missing external decoder');
  assert(model.buffers.every(buffer => !buffer.uri), 'All geometry is embedded');
  assert(model.images.every(image => image.bufferView !== undefined), 'Textures are embedded');
  assert.match(model.asset.extras.license, /CC-BY-4\.0/);
}
const html = fs.readFileSync(path.join(root, 'flight.html'), 'utf8');
for (const id of ['flight-start', 'flight-pause', 'flight-resume', 'flight-reset', 'view-toggle', 'flight-stick', 'touch-climb', 'touch-descend', 'touch-boost', 'touch-roll-left', 'touch-roll-right', 'touch-loop']) {
  assert(html.includes(`id="${id}"`), `Flight control exists: ${id}`);
}
assert(html.includes('NORBERTO-3D') && html.includes('Stéphane Agullo'));
assert(html.includes('href="quick.html"'));
for (const filename of ['phoenix-island.mjs', 'phoenix-flight-core.mjs', 'phoenix-input.mjs', 'phoenix-collision.mjs', 'phoenix-camera.mjs', 'phoenix-model.mjs', 'phoenix-island.css', 'vendor/GLTFLoader.js', 'vendor/BufferGeometryUtils.js']) {
  assert(fs.statSync(path.join(root, filename)).isFile(), `Deployment includes ${filename}`);
}
console.log('Phoenix assets passed: actual embedded models/flight rig, dependencies, controls, fallback resume link, and attribution packaged.');
