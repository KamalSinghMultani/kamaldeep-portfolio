const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async () => {
  const local = name => pathToFileURL(path.resolve(name)).href;
  const { createFlightState, stepFlight, resetFlight, requestTrick } = await import(local('site/phoenix-flight-core.mjs'));
  const THREE = await import(local('site/vendor/three.module.min.js'));
  const { createCollisionWorld } = await import(local('site/phoenix-collision.mjs'));
  const make = options => createFlightState({ position: { x: 0, y: 45, z: 130 }, ...options });
  const simulate = (state, input, seconds, fps = 60, observe) => {
    for (let i = 0; i < Math.round(seconds * fps); i++) {
      const old = { ...state.position };
      stepFlight(state, typeof input === 'function' ? input(i / fps) : input, 1 / fps);
      observe?.(state, old);
    }
    return state;
  };
  const separation = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  const block = (w, h, d, x, y, z, rotationX = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
    mesh.position.set(x, y, z); mesh.rotation.x = rotationX; mesh.updateMatrixWorld(true); return mesh;
  };
  const resolver = meshes => {
    const world = createCollisionWorld(meshes);
    return (start, end, radius) => world.constrainMotion(start, end, radius);
  };

  const straight = simulate(make(), {}, 4);
  assert(Math.abs(straight.position.x) < 1e-8);
  assert(Math.abs(straight.position.z - 62) < 1e-7);
  assert.equal(straight.position.y, 45);
  assert(Math.abs(straight.actualSpeed - 17) < 1e-7);
  const rates = [30, 60, 120, 144].map(fps => simulate(make(), { turn: .3, climb: .12, boost: true }, 5, fps));
  rates.slice(1).forEach(state => {
    assert(separation(state.position, rates[0].position) < .025, 'Refresh rate does not change distance/trajectory');
    assert(Math.abs(state.yaw - rates[0].yaw) < .001);
    assert(Math.abs(state.speed - rates[0].speed) < .001);
  });

  const steering = make();
  stepFlight(steering, { turn: 1, climb: .5 }, 1 / 60);
  assert(steering.turnRate > 0 && steering.turnRate < steering.config.maximumTurnRate);
  assert(steering.pitch > 0 && steering.pitch < steering.config.maximumPitch * .5);
  simulate(steering, { turn: 1, climb: .5 }, 1);
  assert(steering.position.x > 0 && steering.position.y > 45 && steering.bank < 0);
  const heldBank = Math.abs(steering.bank);
  simulate(steering, {}, 3);
  assert(Math.abs(steering.bank) < heldBank * .01, 'Bank eases level after steering release');

  for (const fps of [30, 60, 120, 144]) {
    const reverse = simulate(make(), { climb: 1 }, 1, fps);
    assert(reverse.pitch > .5);
    simulate(reverse, { climb: -1 }, 4, fps, (state, old) => {
      assert(state.position.y <= old.y + 1e-9, 'Down input never continues an earlier ascent');
    });
    assert(reverse.motionPitch < -.6);
  }
  let heightReads = 0;
  const noLift = make({ position: { x: 0, y: 12, z: 0 }, groundHeight: () => { heightReads++; return 200; } });
  simulate(noLift, {}, 1);
  assert.equal(noLift.position.y, 12, 'A legacy terrain-height callback cannot lift the bird');
  assert.equal(heightReads, 0);

  const acceleration = make();
  stepFlight(acceleration, { boost: true }, 1 / 60);
  assert(acceleration.speed > 17 && acceleration.speed < 18);
  simulate(acceleration, { boost: true }, 3); assert(acceleration.speed > 29.9);
  simulate(acceleration, { brake: true }, 4); assert(acceleration.speed >= 3 && acceleration.speed < 3.01);
  const paused = make();
  const snapshot = JSON.stringify(paused);
  for (const dt of [0, NaN, -1, Infinity]) stepFlight(paused, {}, dt);
  assert.equal(JSON.stringify(paused), snapshot);
  stepFlight(paused, { paused: true }, 100);
  const frozen = JSON.stringify(paused); stepFlight(paused, {}, 100);
  assert.equal(JSON.stringify(paused), frozen);
  const beforeResume = { ...paused.position };
  stepFlight(paused, { paused: false }, 1000);
  assert(separation(paused.position, beforeResume) <= 17 * .051, 'Resume gaps are bounded');

  const wallFlight = make({ position: { x: 0, y: 45, z: 20 }, resolveMotion: resolver([block(60, 100, 2, 0, 45, 0)]) });
  let sawHit = false;
  simulate(wallFlight, {}, 3, 60, state => {
    sawHit ||= Boolean(state.collision?.hit);
    assert(state.position.z >= 2.2, 'Continuous collision prevents tunneling into a wall');
    assert.equal(state.position.y, 45, 'A level wall approach does not climb');
  });
  assert(sawHit && wallFlight.blocked && wallFlight.actualSpeed < .01);

  const slopeFlight = make({ position: { x: 0, y: 16, z: 20 }, resolveMotion: resolver([block(80, 1, 70, 0, 14, 0, .45)]) });
  let slopeHit = false;
  simulate(slopeFlight, { climb: -.2 }, 4, 60, (state, old) => {
    slopeHit ||= Boolean(state.collision?.hit);
    assert(state.position.y <= old.y + 1e-8 || state.startedPenetrating, 'Slope sliding cannot reverse descent intent');
  });
  assert(slopeHit, 'The slope regression actually reaches an obstacle');

  const roofFlight = make({ position: { x: 0, y: 15, z: 0 }, resolveMotion: resolver([block(100, 2, 100, 0, 25, 0)]) });
  simulate(roofFlight, { climb: 1 }, 2, 60, state => assert(state.position.y <= 22.8 + 1e-6, 'Roof underside is a ceiling, not a terrain floor'));
  simulate(roofFlight, { climb: -1 }, .5, 60, (state, old) => assert(state.position.y <= old.y + 1e-9));

  let recoverOnce = true;
  const recovery = make({ resolveMotion: (start, end) => {
    if (recoverOnce) { recoverOnce = false; return { position: { ...end, y: start.y + 1 }, hit: true, startedPenetrating: true }; }
    return { position: end, hit: false, startedPenetrating: false };
  } });
  const recoveryStart = recovery.position.y; stepFlight(recovery, { climb: -1 }, 1 / 120);
  assert(recovery.position.y > recoveryStart && recovery.startedPenetrating, 'Actual initial recovery is the explicit ascent exception');
  const invalidResolver = make({ resolveMotion: () => ({ position: { x: NaN, y: 0, z: 0 } }) });
  const validStart = { ...invalidResolver.position }; stepFlight(invalidResolver, {}, 1 / 60);
  assert.deepEqual(invalidResolver.position, validStart); assert(invalidResolver.blocked);

  const floor = simulate(make({ position: { x: 0, y: 8, z: 20 } }), { climb: -1 }, 12);
  const ceiling = simulate(make({ position: { x: 0, y: 159, z: 20 } }), { climb: 1 }, 12);
  assert(floor.position.y >= 2.5 && ceiling.position.y <= 160);
  const edge = make({ position: { x: 0, y: 40, z: -390 } });
  simulate(edge, { boost: true }, 15, 60, state => {
    assert(Math.hypot(state.position.x, state.position.z) <= 400 + 1e-8);
    assert.equal(state.yaw, 0, 'World boundary never secretly steers the bird');
  });
  assert(edge.speed < 3.1 && edge.actualSpeed < .01 && edge.blocked);
  simulate(edge, { turn: 1 }, 4);
  assert(edge.position.z > -395, 'The pilot can turn away from the boundary');

  for (const name of ['rollLeft', 'rollRight']) {
    const rolled = make(), plain = make();
    assert(requestTrick(rolled, name));
    simulate(rolled, { turn: .5, climb: -.2 }, .5);
    simulate(plain, { turn: .5, climb: -.2 }, .5);
    assert(separation(rolled.position, plain.position) < 1e-8, 'Rolls leave normal steering live');
    assert(name === 'rollLeft' ? rolled.trickRoll > 0 : rolled.trickRoll < 0);
    simulate(rolled, {}, 1); assert.equal(rolled.trick, null); assert.equal(rolled.trickRoll, 0);
  }

  const loop = make({ position: { x: 0, y: 50, z: 0 } });
  const start = { ...loop.position }, initialYaw = loop.yaw;
  assert(requestTrick(loop, 'loop'));
  const radius = loop.trick.radius;
  simulate(loop, {}, .8);
  assert(Math.abs(loop.position.y - (50 + radius)) < 1e-7 && Math.abs(loop.position.z + radius) < 1e-7,
    'The first loop quarter changes actual altitude and position');
  assert(Math.abs(loop.trickPitch - Math.PI / 2) < 1e-7);
  simulate(loop, {}, 2.4);
  assert.equal(loop.trick, null); assert.equal(loop.trickPitch, 0);
  assert(separation(loop.position, start) < 1e-7 && Math.abs(loop.yaw - initialYaw) < 1e-8,
    'A full loop returns position and heading without a reset teleport');
  for (const fps of [30, 120, 144]) {
    const equivalent = make({ position: start }); requestTrick(equivalent, 'loop');
    simulate(equivalent, {}, 3.2, fps);
    if (fps !== 144) assert(separation(equivalent.position, start) < 1e-7);
    assert(Math.abs(equivalent.position.y - 50) < .01, 'Loop altitude is refresh-rate independent');
  }

  const unsafeCeiling = make({ position: { x: 0, y: 155, z: 0 } });
  assert.equal(requestTrick(unsafeCeiling, 'loop'), false); assert.match(unsafeCeiling.trickRejectedReason, /room/);
  const unsafeRock = make({ position: start, resolveMotion: resolver([block(100, 2, 100, 0, 62, 0)]) });
  assert.equal(requestTrick(unsafeRock, 'loop'), false); assert.match(unsafeRock.trickRejectedReason, /obstructed/);
  const tooSlow = make({ speed: 3 }); assert.equal(requestTrick(tooSlow, 'loop'), false);
  const reserved = make(); requestTrick(reserved, 'rollLeft'); assert.equal(requestTrick(reserved, 'loop'), false);
  assert.equal(requestTrick(make(), 'unknown'), false);
  assert.equal(requestTrick(make({ paused: true }), 'rollLeft'), false);

  const pilotCancelled = make({ position: start }); requestTrick(pilotCancelled, 'loop'); simulate(pilotCancelled, {}, .8);
  const highPoint = pilotCancelled.position.y;
  stepFlight(pilotCancelled, { climb: -1 }, 1 / 60);
  assert.equal(pilotCancelled.trick, null); assert(pilotCancelled.position.y <= highPoint);
  assert(pilotCancelled.trickPitch > 0, 'Cancelling does not instantly snap visual pitch to zero');
  simulate(pilotCancelled, { climb: -1 }, 2); assert(Math.abs(pilotCancelled.trickPitch) < .001);

  const upperArc = make({ position: start }); requestTrick(upperArc, 'loop'); simulate(upperArc, {}, 1.6);
  const upperVelocity = { ...upperArc.velocity }, upperHeight = upperArc.position.y;
  stepFlight(upperArc, { climb: -1 }, 1 / 120);
  assert(upperVelocity.z > 16 && upperArc.velocity.z > 14, 'Upper-arc cancellation retains horizontal momentum instead of reversing direction in one frame');
  assert(Math.abs(upperArc.velocity.z - upperVelocity.z) < 2.5);
  assert(upperArc.position.y <= upperHeight, 'Momentum recovery still honors descent immediately');
  simulate(upperArc, { climb: -1 }, 1.2);
  assert(upperArc.velocity.z < -10 && upperArc.recoveryRemaining === 0, 'Horizontal transport eases back to steerable cruise');

  let obstacleActive = false;
  const obstacle = resolver([block(100, 2, 100, 0, 62, 0)]);
  const interrupted = make({ position: start, resolveMotion: (a, b, r) => obstacleActive ? obstacle(a, b, r) : { position: b, hit: false } });
  requestTrick(interrupted, 'loop'); simulate(interrupted, {}, .4); obstacleActive = true;
  let cancelledAt;
  for (let i = 0; i < 180 && interrupted.trick; i++) {
    const previous = { ...interrupted.position }; stepFlight(interrupted, {}, 1 / 60);
    assert(separation(previous, interrupted.position) < .9, 'Interrupted loops cannot teleport');
    if (!interrupted.trick) cancelledAt = { ...interrupted.position };
  }
  assert(cancelledAt && interrupted.trickCancelledReason.includes('obstacle'));
  assert(separation(cancelledAt, start) > 1, 'Obstacle interruption stays at contact instead of resetting to launch');

  const trickPause = make({ position: start }); requestTrick(trickPause, 'loop'); simulate(trickPause, {}, .5);
  stepFlight(trickPause, { paused: true }, 1); const held = JSON.stringify(trickPause);
  stepFlight(trickPause, {}, 100); assert.equal(JSON.stringify(trickPause), held, 'Pause also freezes trick progress');
  const positionRef = trickPause.position, velocityRef = trickPause.velocity;
  resetFlight(trickPause, { position: { x: 10, y: 50, z: 80 }, yaw: Math.PI / 2 });
  assert.strictEqual(trickPause.position, positionRef); assert.strictEqual(trickPause.velocity, velocityRef);
  assert.deepEqual(trickPause.position, { x: 10, y: 50, z: 80 });
  assert.equal(trickPause.trick, null); assert.equal(trickPause.trickPitch, 0); assert.equal(trickPause.trickRoll, 0);
  assert.equal(trickPause.collision, null); assert.equal(trickPause.blocked, false); assert.equal(trickPause.time, 0);
  resetFlight(trickPause); assert.deepEqual(trickPause.position, start);

  console.log('Phoenix flight passed: refresh-rate equivalence, input-faithful descent, swept collisions/undersides/slopes, manual boundaries, boost/brake, steerable rolls, real prechecked loops, interruption recovery, pause and reset.');
})().catch(error => { console.error(error); process.exitCode = 1; });
