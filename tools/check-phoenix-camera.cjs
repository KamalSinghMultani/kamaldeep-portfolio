const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async () => {
  const { createCameraState, updateCameraRig } = await import(pathToFileURL(path.resolve('site/phoenix-camera.mjs')).href);
  const pilot = () => ({ position: { x: 0, y: 50, z: 0 }, yaw: 0, pitch: 0, bank: 0, speed: 17 });
  const state = createCameraState(pilot());
  assert.equal(state.position.y, 56);
  assert.equal(state.position.z, 12);

  // Descending input must never trigger an implicit camera rise or cliff lift.
  const descending = pilot();
  descending.pitch = -.55;
  let lastEye = state.position.y, lastFocus = state.focus.y;
  for (let i = 0; i < 120; i++) {
    descending.position.y -= .15;
    descending.position.z -= .22;
    updateCameraRig(state, descending, 1 / 60);
    assert(state.position.y < lastEye, 'Eye descends with the body');
    assert(state.focus.y < lastFocus, 'Look point descends with the body');
    lastEye = state.position.y; lastFocus = state.focus.y;
  }
  const snapshot = [state.position.toArray(), state.focus.toArray(), state.up.toArray(), state.fov];
  descending.position.y += 100;
  updateCameraRig(state, descending, 0);
  assert.deepEqual([state.position.toArray(), state.focus.toArray(), state.up.toArray(), state.fov], snapshot, 'Pause holds the rig exactly');

  const turning = pilot(), rig = createCameraState(turning);
  let last = rig.position.clone();
  for (let i = 0; i < 240; i++) {
    turning.yaw += 1.5 / 60;
    turning.position.x += Math.sin(turning.yaw) * .28;
    turning.position.z -= Math.cos(turning.yaw) * .28;
    updateCameraRig(rig, turning, 1 / 60);
    assert(rig.position.distanceTo(last) < .7, 'A strong sustained turn has no eye jump');
    assert(Math.hypot(rig.position.x - turning.position.x, rig.position.z - turning.position.z) > 9.8, 'Orbit never cuts through the bird');
    assert(Math.abs(turning.yaw - rig.headingYaw) < .2, 'Camera does not retain a stale route');
    last.copy(rig.position);
  }
  for (let i = 0; i < 180; i++) {
    turning.trickPitch = i / 179 * Math.PI * 2;
    turning.trickRoll = i / 179 * Math.PI * 2;
    turning.bank = -.6;
    updateCameraRig(rig, turning, 1 / 60);
    assert.deepEqual(rig.up.toArray(), [0, 1, 0], 'Default horizon ignores wing/bank/trick roll');
  }

  // A flight loop translates the eye with the body without turning the horizon
  // upside down or chasing the temporarily reversed travel velocity.
  const looping = pilot(), loopRig = createCameraState(looping);
  let lastLoopEye = loopRig.position.clone();
  for (let i = 1; i <= 240; i++) {
    const angle = i / 240 * Math.PI * 2;
    looping.position.y = 50 + 10 * (1 - Math.cos(angle));
    looping.position.z = -10 * Math.sin(angle);
    looping.trickPitch = angle;
    looping.velocity = { x: 0, y: Math.sin(angle) * 17, z: -Math.cos(angle) * 17 };
    updateCameraRig(loopRig, looping, 1 / 60);
    assert.equal(loopRig.headingYaw, 0, 'Loop reversal does not swing the camera behind velocity');
    assert(Math.abs(loopRig.position.y - looping.position.y - 6) < 1e-8, 'Camera follows the full loop altitude');
    assert(loopRig.position.distanceTo(lastLoopEye) < .3, 'Loop eye movement stays continuous');
    assert.deepEqual(loopRig.up.toArray(), [0, 1, 0]);
    lastLoopEye.copy(loopRig.position);
  }

  // A wall across the camera segment shortens its spring arm, never raises it.
  const collision = (start, end) => {
    if (end.z <= 4) return { position: { ...end }, hit: false };
    const ratio = (4 - start.z) / (end.z - start.z);
    return { position: { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio, z: 4 }, hit: true };
  };
  const fixed = pilot(), blocked = createCameraState(fixed, { collision });
  assert.equal(blocked.position.z, 4);
  assert(blocked.position.y < 56, 'Obstruction retracts instead of forcing height above the roof');
  assert.equal(blocked.collisionHit, true);
  const firstHit = createCameraState(pilot());
  let collisionCalls = 0;
  updateCameraRig(firstHit, fixed, 1 / 60, { collision: (start, end, radius) => {
    collisionCalls++;
    assert.equal(start.x, fixed.position.x);
    assert.equal(start.y, fixed.position.y + firstHit.options.anchorHeight, 'Cast starts just above the body, not at lookahead');
    assert.equal(start.z, fixed.position.z);
    assert.equal(radius, firstHit.options.cameraRadius);
    return collision(start, end);
  } });
  assert(collisionCalls >= 1);
  assert(firstHit.options.anchorHeight + firstHit.options.cameraRadius < 1.2, 'Camera cast starts inside the pilot collision envelope beneath ceilings');
  assert(Math.abs(firstHit.position.z - 4) < 1e-8, 'First obstacle hit retracts immediately, with no smoothing through a wall');
  const shortLength = blocked.armLength;
  updateCameraRig(blocked, fixed, 1 / 60, { collision: undefined });
  assert(blocked.armLength > shortLength && blocked.position.z < 6, 'Arm extends gradually after obstruction');
  const portrait = createCameraState(pilot(), { aspect: .45 });
  assert(portrait.position.z > 20, 'Narrow screens keep the full wingspan in view');
  assert(Number.isFinite(portrait.fov));

  console.log('Phoenix camera passed: descending intent, pause hold, tight-turn continuity, full orbit clearance, stable trick horizon, real segment clipping and portrait framing.');
})().catch(error => { console.error(error); process.exitCode = 1; });
