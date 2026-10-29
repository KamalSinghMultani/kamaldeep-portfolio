const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { loadGeometry } = require('./phoenix-test-assets.cjs');

(async () => {
  const THREE = await import(pathToFileURL(path.resolve('site/vendor/three.module.min.js')).href);
  const { createPhoenixVisual } = await import(pathToFileURL(path.resolve('site/phoenix-model.mjs')).href);
  const asset = await loadGeometry('site/media/phoenix-island/phoenix.glb');
  const visual = createPhoenixVisual(asset);
  const pilot = new THREE.Group(); pilot.add(visual.group);
  const point = new THREE.Vector3();
  let worstDrift = 0;
  visual.reset();
  for (let i = 0; i < 600; i++) {
    pilot.position.set(Math.sin(i / 100) * 80, 120 - i * .15, i / 3);
    pilot.rotation.set(Math.sin(i / 100) * .6, i / 100, i / 30, 'YXZ');
    visual.update(1 / 60, 25);
    visual.anchor.getWorldPosition(point);
    worstDrift = Math.max(worstDrift, point.distanceTo(pilot.position));
  }
  assert(worstDrift < 1e-5, `Animated body must follow pilot during descents and rolls: ${worstDrift}`);
  const wingTrack = asset.animations[0].tracks.find(track => /Wing|wing/.test(track.name));
  assert(wingTrack, 'Original articulated wing animation remains');
  assert(visual.mixer.time > 9, 'Supplied skeleton clip advances during flight');
  visual.reset(); visual.anchor.getWorldPosition(point);
  assert(point.distanceTo(pilot.position) < 1e-5, 'Reset anchors the same body position');
  console.log(`Phoenix model passed: real animated skeleton stays on pilot through 600 descent/turn/roll frames (drift ${worstDrift.toExponential(2)}).`);
})().catch(error => { console.error(error); process.exitCode = 1; });
