const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const local = file => pathToFileURL(path.resolve(file)).href;
  const { readFlightCommands } = await import(local('site/phoenix-input.mjs'));
  const { createFlightState, stepFlight } = await import(local('site/phoenix-flight-core.mjs'));
  const state = createFlightState({ position: { x: 0, y: 60, z: 0 }, yaw: .7 });
  const advance = (codes, seconds = 1, pointer) => {
    for (let i = 0; i < seconds * 60; i++) stepFlight(state, readFlightCommands(new Set(codes), pointer), 1 / 60);
  };
  advance([]);
  assert.deepEqual(state.position, { x: 0, y: 60, z: 0 }, 'No key means no automatic flight');
  advance(['KeyW']); assert(Math.hypot(state.position.x, state.position.z) > 5);
  const horizontal = { x: state.position.x, z: state.position.z }, initialY = state.position.y;
  advance(['ArrowDown']);
  assert.equal(state.position.x, horizontal.x); assert.equal(state.position.z, horizontal.z);
  assert(state.position.y < initialY, 'Arrow Down lowers without carrying W momentum');
  const lower = state.position.y; advance(['Space']);
  assert.equal(state.position.x, horizontal.x); assert.equal(state.position.z, horizontal.z);
  assert(state.position.y > lower, 'Space raises vertically');
  const held = { ...state.position }, yaw = state.yaw;
  advance(['ArrowLeft']); assert(state.yaw !== yaw); assert.deepEqual(state.position, held, 'Turning in hover does not advance');
  advance(['KeyW','KeyS','KeyA','KeyD','Space','KeyC']); assert.deepEqual(state.position, held, 'Opposing commands cancel');
  advance(['KeyD']); assert.equal(state.position.y, held.y, 'Strafing preserves altitude');
  const moved = { ...state.position }; advance(['ShiftLeft']); assert.deepEqual(state.position, moved, 'Boost alone cannot launch the bird');
  advance([], 1, { vertical: -1 }); assert(state.position.y < moved.y);
  assert.equal(state.position.x, moved.x); assert.equal(state.position.z, moved.z, 'Touch descent is independent of horizontal movement');
  console.log('Phoenix input passed: keyboard and touch commands drive exact hover, independent vertical/sideways travel, yaw in place, opposing keys, release and boost-only hold.');
})().catch(error => { console.error(error); process.exitCode = 1; });
