const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async () => {
  const { createFlightState, stepFlight, resetFlight } = await import(pathToFileURL(path.resolve('site/phoenix-flight-core.mjs')).href);
  const make = options => createFlightState({ position: { x: 0, y: 45, z: 130 }, ...options });
  const simulate = (state, input, seconds, fps) => {
    for (let i = 0; i < Math.round(seconds * fps); i++) stepFlight(state, typeof input === 'function' ? input(i / fps) : input, 1 / fps);
    return state;
  };

  const straight = simulate(make(), {}, 4, 60);
  assert(Math.abs(straight.position.x) < 1e-8);
  assert(Math.abs(straight.position.z - 62) < 1e-7, 'Neutral flight moves forward at cruise speed');
  assert.equal(straight.position.y, 45);

  const turn = make();
  stepFlight(turn, { turn: 1, climb: .5 }, 1 / 60);
  assert(turn.turnRate > 0 && turn.turnRate < turn.config.maximumTurnRate, 'Steering eases in');
  assert(turn.pitch > 0 && turn.pitch < turn.config.maximumPitch * .5, 'Pitch eases in');
  simulate(turn, { turn: 1, climb: .5 }, 1, 60);
  assert(turn.position.x > 0 && turn.position.y > 45);
  assert(turn.bank < 0, 'Bank follows the direction of the turn');
  const bankBeforeRelease = Math.abs(turn.bank);
  simulate(turn, {}, 3, 60);
  assert(Math.abs(turn.bank) < bankBeforeRelease * .01, 'Wings ease level when steering is released');

  const rates = [30, 60, 120, 144].map(fps => simulate(make(), { turn: .3, climb: .12, boost: true }, 5, fps));
  const baseline = rates[0];
  rates.slice(1).forEach(state => {
    assert(Math.hypot(state.position.x - baseline.position.x, state.position.y - baseline.position.y, state.position.z - baseline.position.z) < .025,
      'Equivalent real time produces equivalent flight across refresh rates');
    assert(Math.abs(state.yaw - baseline.yaw) < .001);
    assert(Math.abs(state.speed - baseline.speed) < .001);
  });

  const acceleration = make();
  stepFlight(acceleration, { boost: true }, 1 / 60);
  assert(acceleration.speed > 17 && acceleration.speed < 18, 'Boost accelerates instead of snapping');
  simulate(acceleration, { boost: true }, 3, 60);
  assert(acceleration.speed > 29.9);
  simulate(acceleration, { brake: true }, 4, 60);
  assert(acceleration.speed >= 3 && acceleration.speed < 3.01, 'Brake decelerates into slow flight');

  const paused = make();
  const snapshot = JSON.stringify(paused);
  stepFlight(paused, {}, 0); stepFlight(paused, {}, NaN); stepFlight(paused, {}, -1);
  assert.equal(JSON.stringify(paused), snapshot, 'Invalid and zero clock deltas do nothing');
  stepFlight(paused, { paused: true }, 100);
  const frozen = JSON.stringify(paused);
  stepFlight(paused, {}, 100);
  assert.equal(JSON.stringify(paused), frozen, 'Pause preserves the complete flight state');
  const prior = { ...paused.position };
  stepFlight(paused, { paused: false }, 1000);
  assert(Math.hypot(paused.position.x - prior.x, paused.position.y - prior.y, paused.position.z - prior.z) <= 17 * .051,
    'A resumed wall-clock gap cannot teleport the bird');

  const floor = simulate(make({ position: { x: 0, y: 8, z: 20 } }), { climb: -1 }, 12, 60);
  assert(floor.position.y >= 2.5);
  const ceiling = simulate(make({ position: { x: 0, y: 159, z: 20 } }), { climb: 1 }, 12, 60);
  assert(ceiling.position.y <= 160);
  const terrain = make({ position: { x: 0, y: 22, z: 65 }, groundHeight: (x, z) => z < 30 ? 27 : 14 });
  for (let i = 0; i < 600; i++) {
    stepFlight(terrain, { climb: -1 }, 1 / 60);
    const height = terrain.position.z < 30 ? 27 : 14;
    assert(terrain.position.y >= height + 5, 'Terrain clearance holds while crossing an elevated surface');
  }
  const tallTerrain = make({ groundHeight: () => 200 });
  assert(tallTerrain.position.y >= 205, 'Terrain clearance has priority over a lower configured ceiling');

  const edge = make({ position: { x: 0, y: 40, z: -390 } });
  let assisted = false;
  for (let i = 0; i < 1800; i++) {
    stepFlight(edge, { boost: true }, 1 / 60);
    assisted ||= edge.boundaryAssist > 0;
    assert(Math.hypot(edge.position.x, edge.position.z) <= 400 + 1e-8, 'Bird cannot leave the bounded world');
  }
  assert(assisted && edge.position.z > -350, 'Boundary steering brings outward flight back into the world');

  const initialPositionReference = edge.position;
  resetFlight(edge, { position: { x: 10, y: 50, z: 80 }, yaw: Math.PI / 2 });
  assert.strictEqual(edge.position, initialPositionReference, 'Reset preserves references used by a renderer');
  assert.deepEqual(edge.position, { x: 10, y: 50, z: 80 });
  assert.equal(edge.time, 0); assert.equal(edge.bank, 0); assert.equal(edge.paused, false);
  assert.equal(edge.yaw, Math.PI / 2);
  resetFlight(edge);
  assert.deepEqual(edge.position, { x: 0, y: 40, z: -390 }, 'Default reset returns to the original spawn');

  console.log('Phoenix flight passed: smooth steering/bank, refresh-rate equivalence, boost/brake, pause/resume, terrain/altitude/bounds safety and reference-preserving reset.');
})().catch(error => { console.error(error); process.exitCode = 1; });
