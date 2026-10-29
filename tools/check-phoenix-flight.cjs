const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async () => {
  const local = name => pathToFileURL(path.resolve(name)).href;
  const { createFlightState, stepFlight, resetFlight, requestTrick } = await import(local('site/phoenix-flight-core.mjs'));
  const THREE = await import(local('site/vendor/three.module.min.js'));
  const { createCollisionWorld } = await import(local('site/phoenix-collision.mjs'));
  const make = options => createFlightState({ position: { x: 0, y: 45, z: 130 }, ...options });
  const separation = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  const near = (a, b, tolerance = 1e-8) => assert(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);
  const simulate = (state, input, seconds, fps = 60, observe) => {
    for (let i = 0; i < Math.round(seconds * fps); i++) {
      const previous = { ...state.position };
      stepFlight(state, typeof input === 'function' ? input(i / fps) : input, 1 / fps);
      observe?.(state, previous);
    }
    return state;
  };
  const block = (w, h, d, x, y, z, rotationX = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
    mesh.position.set(x, y, z); mesh.rotation.x = rotationX; mesh.updateMatrixWorld(true); return mesh;
  };
  const resolver = meshes => {
    const world = createCollisionWorld(meshes);
    return (a, b, radius) => world.constrainMotion(a, b, radius);
  };
  const moving = options => simulate(make(options), { forward: 1 }, .75);

  const idle = make(), spawn = { ...idle.position };
  assert.equal(idle.speed, 0); assert.equal(idle.actualSpeed, 0);
  simulate(idle, {}, 12); assert.deepEqual(idle.position, spawn);
  simulate(idle, { boost: true, throttle: 1 }, 2); assert.deepEqual(idle.position, spawn);
  assert.equal(idle.distance, 0); assert.equal(idle.speed, 0); assert.equal(idle.actualSpeed, 0);
  const idleYaw = simulate(make(), { turn: 1 }, 2);
  assert.deepEqual(idleYaw.position, spawn); assert(idleYaw.yaw > 1);
  const releasedYaw = idleYaw.yaw; simulate(idleYaw, {}, 1); assert.equal(idleYaw.yaw, releasedYaw);

  for (const direction of [-1, 1]) {
    const vertical = simulate(make(), { climb: direction }, 1);
    assert.equal(vertical.position.x, spawn.x); assert.equal(vertical.position.z, spawn.z);
    assert((vertical.position.y - spawn.y) * direction > 10);
    const side = simulate(make(), { strafe: direction }, 1);
    assert((side.position.x - spawn.x) * direction > 10);
    assert.equal(side.position.z, spawn.z); assert.equal(side.position.y, spawn.y);
    const forward = simulate(make(), { forward: direction }, 1);
    assert((spawn.z - forward.position.z) * direction > 10);
    assert.equal(forward.position.x, spawn.x); assert.equal(forward.position.y, spawn.y);
  }
  const rotated = simulate(make({ yaw: Math.PI / 2 }), { forward: 1 }, 1);
  assert(rotated.position.x > 10); near(rotated.position.z, spawn.z);
  const rightOfRotated = simulate(make({ yaw: Math.PI / 2 }), { strafe: 1 }, 1);
  assert(rightOfRotated.position.z > spawn.z + 10); near(rightOfRotated.position.x, spawn.x);
  const roundoff = make({ resolveMotion: (a, b) => ({ position: { ...b, x: b.x + 1e-10, z: b.z - 1e-10 }, hit: true }) });
  simulate(roundoff, { climb: 1 }, 1);
  assert.equal(roundoff.position.x, spawn.x); assert.equal(roundoff.position.z, spawn.z);

  const release = moving(); const stopped = { ...release.position };
  stepFlight(release, {}, 1 / 60);
  assert.deepEqual(release.position, stopped); assert.equal(release.speed, 0);
  assert.deepEqual(release.velocity, { x: 0, y: 0, z: 0 });
  simulate(release, { climb: 1 }, 1, 60, state => {
    assert.equal(state.position.x, stopped.x); assert.equal(state.position.z, stopped.z);
  });
  const afterClimb = { ...release.position };
  simulate(release, { strafe: 1 }, 1, 60, state => {
    assert.equal(state.position.y, afterClimb.y); assert.equal(state.position.z, afterClimb.z);
  });
  const afterSideways = { ...release.position };
  simulate(release, { climb: -1 }, 1, 60, state => {
    assert.equal(state.position.x, afterSideways.x); assert.equal(state.position.z, afterSideways.z);
  });
  const reverse = moving(), beforeReverse = { ...reverse.position };
  stepFlight(reverse, { forward: -1 }, 1 / 60);
  assert(reverse.position.z > beforeReverse.z, 'Reverse cannot retain prior forward motion');
  const down = simulate(make(), { climb: 1 }, 1);
  stepFlight(down, { climb: -1 }, 1 / 60);
  assert(down.velocity.y < 0, 'Descent starts on its first commanded frame');
  const diagonalRelease = simulate(make(), { forward: 1, strafe: 1, climb: 1 }, 1);
  const mixedStart = { ...diagonalRelease.position };
  stepFlight(diagonalRelease, { climb: -1 }, 1 / 60);
  assert.equal(diagonalRelease.position.x, mixedStart.x); assert.equal(diagonalRelease.position.z, mixedStart.z);
  assert(diagonalRelease.position.y < mixedStart.y);

  const axisDistance = simulate(make(), { forward: 1 }, 2).distance;
  for (const command of [{ forward: 1, climb: 1 }, { forward: 1, strafe: 1 }, { forward: 1, strafe: 1, climb: 1 }]) {
    const diagonal = simulate(make(), command, 2);
    near(diagonal.distance, axisDistance, 1e-7);
    assert(diagonal.actualSpeed <= 17 + 1e-8, 'Diagonal input has no speed advantage');
  }
  const rates = [30, 60, 120, 144].map(fps => simulate(make(), { forward: .8, strafe: -.3, turn: .3, climb: .12, boost: true }, 5, fps));
  rates.slice(1).forEach(state => {
    assert(separation(state.position, rates[0].position) < .025, 'Trajectory is refresh-rate independent');
    near(state.yaw, rates[0].yaw, .001); near(state.speed, rates[0].speed, .001);
  });
  const boost = simulate(make(), { forward: 1, boost: true }, 2); assert(boost.actualSpeed > 29.9);
  const beforeBrake = { ...boost.position }, beforeBrakeYaw = boost.yaw;
  stepFlight(boost, { forward: 1, strafe: 1, climb: 1, turn: 1, boost: true, brake: true }, 1 / 60);
  assert.deepEqual(boost.position, beforeBrake); assert.equal(boost.yaw, beforeBrakeYaw);
  assert.equal(boost.actualSpeed, 0);

  const paused = moving(); const validSnapshot = JSON.stringify(paused);
  for (const dt of [0, NaN, -1, Infinity]) stepFlight(paused, { forward: 1 }, dt);
  assert.equal(JSON.stringify(paused), validSnapshot);
  stepFlight(paused, { paused: true }, 100);
  const frozen = JSON.stringify(paused); stepFlight(paused, { forward: 1 }, 100);
  assert.equal(JSON.stringify(paused), frozen);
  const beforeResume = { ...paused.position };
  stepFlight(paused, { paused: false }, 1000); assert.deepEqual(paused.position, beforeResume);
  stepFlight(paused, { forward: 1, boost: true }, 1000);
  assert(separation(paused.position, beforeResume) <= 30 * .051);

  const wall = make({ position: { x: 0, y: 45, z: 20 }, resolveMotion: resolver([block(60, 100, 2, 0, 45, 0)]) });
  let sawHit = false;
  simulate(wall, { forward: 1 }, 3, 60, state => {
    sawHit ||= Boolean(state.collision?.hit); assert(state.position.z >= 2.2);
    assert.equal(state.position.y, 45); assert.equal(state.position.x, 0);
  });
  assert(sawHit && wall.blocked && wall.actualSpeed < .01);
  assert.equal(requestTrick(wall, 'loop'), false, 'A blocked bird has no actual motion speed for a loop');
  const roof = make({ position: { x: 0, y: 15, z: 0 }, resolveMotion: resolver([block(100, 2, 100, 0, 25, 0)]) });
  simulate(roof, { climb: 1 }, 2, 60, state => {
    assert(state.position.y <= 22.8 + 1e-6); assert.equal(state.position.x, 0); assert.equal(state.position.z, 0);
  });
  simulate(roof, { climb: -1 }, .5, 60, (state, previous) => assert(state.position.y <= previous.y));
  const slope = make({ position: { x: 0, y: 16, z: 20 }, resolveMotion: resolver([block(80, 1, 70, 0, 14, 0, .45)]) });
  let slopeHit = false;
  simulate(slope, { forward: 1, climb: -.2 }, 4, 60, (state, previous) => {
    slopeHit ||= Boolean(state.collision?.hit);
    assert(state.position.y <= previous.y + 1e-8 || state.startedPenetrating);
  });
  assert(slopeHit);
  const verticalSlope = make({ position: { x: 0, y: 25, z: 0 }, resolveMotion: resolver([block(80, 1, 70, 0, 14, 0, .45)]) });
  simulate(verticalSlope, { climb: -1 }, 3, 60, (state, previous) => {
    assert.equal(state.position.x, 0); assert.equal(state.position.z, 0);
    assert(state.position.y <= previous.y + 1e-8 || state.startedPenetrating);
  });
  const floor = simulate(make({ position: { x: 0, y: 8, z: 20 } }), { climb: -1 }, 3);
  const ceiling = simulate(make({ position: { x: 0, y: 159, z: 20 } }), { climb: 1 }, 3);
  assert(floor.position.y >= 2.5 && ceiling.position.y <= 160);
  const edge = make({ position: { x: 0, y: 40, z: -390 } });
  simulate(edge, { forward: 1, boost: true }, 15, 60, state => {
    assert(Math.hypot(state.position.x, state.position.z) <= 400 + 1e-8); assert.equal(state.yaw, 0);
  });
  assert(edge.actualSpeed < .1);
  simulate(edge, { forward: -1 }, 1); assert(edge.position.z > -395, 'Reverse leaves the boundary under direct input');

  assert.equal(requestTrick(make(), 'loop'), false, 'A stationary bird cannot start a translating loop');
  assert.equal(requestTrick(make({ speed: 17 }), 'loop'), false, 'Configured nominal speed is not actual movement');
  for (const command of [{ climb: 1 }, { strafe: 1 }, { forward: -1 }, { forward: 1, climb: 1 }]) {
    const notForward = simulate(make(), command, 1);
    assert.equal(requestTrick(notForward, 'loop'), false);
    assert.match(notForward.trickRejectedReason, /forward/);
  }
  for (const name of ['rollLeft', 'rollRight']) {
    const hoverRoll = make(); assert(requestTrick(hoverRoll, name));
    simulate(hoverRoll, {}, .5); assert.deepEqual(hoverRoll.position, spawn);
    assert(name === 'rollLeft' ? hoverRoll.trickRoll > 0 : hoverRoll.trickRoll < 0);
    simulate(hoverRoll, {}, 1); assert.equal(hoverRoll.trick, null); assert.equal(hoverRoll.trickRoll, 0);
    const movingRoll = make(), plain = make(); requestTrick(movingRoll, name);
    simulate(movingRoll, { forward: 1, strafe: .4, climb: -.2, turn: .5 }, .5);
    simulate(plain, { forward: 1, strafe: .4, climb: -.2, turn: .5 }, .5);
    assert(separation(movingRoll.position, plain.position) < 1e-8);
  }
  const loop = moving({ position: { x: 0, y: 50, z: 0 } }), loopStart = { ...loop.position };
  assert(requestTrick(loop, 'loop')); const radius = loop.trick.radius;
  simulate(loop, {}, .8);
  near(loop.position.y, loopStart.y + radius); near(loop.position.z, loopStart.z - radius);
  simulate(loop, {}, 2.4); assert.equal(loop.trick, null); assert.equal(loop.trickPitch, 0);
  assert(separation(loop.position, loopStart) < 1e-7);
  stepFlight(loop, {}, 1 / 60); assert.deepEqual(loop.position, loopStart); assert.equal(loop.actualSpeed, 0);
  const unsafe = moving({ position: { x: 0, y: 155, z: 0 } });
  assert.equal(requestTrick(unsafe, 'loop'), false); assert.match(unsafe.trickRejectedReason, /room/);
  const obstructed = moving({ position: { x: 0, y: 50, z: 0 }, resolveMotion: resolver([block(100, 2, 100, 0, 62, 0)]) });
  assert.equal(requestTrick(obstructed, 'loop'), false);
  const reserved = make(); requestTrick(reserved, 'rollLeft'); assert.equal(requestTrick(reserved, 'loop'), false);
  assert.equal(requestTrick(make(), 'unknown'), false);
  assert.equal(requestTrick(make({ paused: true }), 'rollLeft'), false);

  const cancelled = moving({ position: { x: 0, y: 50, z: 0 } }); requestTrick(cancelled, 'loop'); simulate(cancelled, {}, 1.6);
  const cancellationStart = { ...cancelled.position };
  stepFlight(cancelled, { climb: -1 }, 1 / 60);
  assert.equal(cancelled.trick, null); assert.equal(cancelled.position.x, cancellationStart.x); assert.equal(cancelled.position.z, cancellationStart.z);
  assert(cancelled.position.y < cancellationStart.y && cancelled.trickPitch !== 0);
  assert.equal(cancelled.recoveryRemaining, 0, 'Cancelled loops retain no automatic transport');
  const heldPosition = { ...cancelled.position }; simulate(cancelled, {}, 1); assert.deepEqual(cancelled.position, heldPosition);
  const brakeRoll = make(); requestTrick(brakeRoll, 'rollLeft'); simulate(brakeRoll, {}, .3);
  stepFlight(brakeRoll, { brake: true, forward: 1, climb: 1 }, 1 / 60);
  assert.equal(brakeRoll.trick, null); assert.deepEqual(brakeRoll.position, spawn); assert.equal(brakeRoll.actualSpeed, 0);

  let obstacleActive = false; const roofResolver = resolver([block(100, 2, 100, 0, 62, 0)]);
  const interrupted = moving({ position: { x: 0, y: 50, z: 0 }, resolveMotion: (a, b, r) => obstacleActive ? roofResolver(a, b, r) : { position: b, hit: false } });
  const interruptionStart = { ...interrupted.position }; requestTrick(interrupted, 'loop'); simulate(interrupted, {}, .4); obstacleActive = true;
  for (let i = 0; i < 180 && interrupted.trick; i++) stepFlight(interrupted, {}, 1 / 60);
  assert.equal(interrupted.trick, null); assert.match(interrupted.trickCancelledReason, /obstacle/);
  assert(separation(interrupted.position, interruptionStart) > 1);
  const obstacleHold = { ...interrupted.position }; stepFlight(interrupted, {}, 1 / 60); assert.deepEqual(interrupted.position, obstacleHold);

  const trickPause = moving({ position: { x: 0, y: 50, z: 0 } }); requestTrick(trickPause, 'loop'); simulate(trickPause, {}, .5);
  stepFlight(trickPause, { paused: true }, 1); const trickSnapshot = JSON.stringify(trickPause);
  stepFlight(trickPause, {}, 100); assert.equal(JSON.stringify(trickPause), trickSnapshot);
  const positionRef = trickPause.position, velocityRef = trickPause.velocity, commandRef = trickPause.commandVelocity;
  resetFlight(trickPause, { position: { x: 10, y: 50, z: 80 }, yaw: Math.PI / 2 });
  assert.strictEqual(trickPause.position, positionRef); assert.strictEqual(trickPause.velocity, velocityRef); assert.strictEqual(trickPause.commandVelocity, commandRef);
  assert.equal(trickPause.speed, 0); assert.equal(trickPause.trick, null); assert.equal(trickPause.trickPitch, 0); assert.equal(trickPause.trickRoll, 0);
  assert.equal(trickPause.collision, null); assert.equal(trickPause.blocked, false); assert.equal(trickPause.time, 0);
  const resetPose = { ...trickPause.position }; stepFlight(trickPause, {}, 1 / 60); assert.deepEqual(trickPause.position, resetPose);

  console.log('Phoenix command flight passed: exact hover, pure vertical/sideways/reverse, yaw without drift, normalized mixed axes, immediate release/reversal/brake, refresh-rate equivalence, real collisions, opt-in tricks, pause and reset.');
})().catch(error => { console.error(error); process.exitCode = 1; });
