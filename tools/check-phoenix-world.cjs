const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { loadGeometry } = require('./phoenix-test-assets.cjs');

// Real selected island geometry; textures are unnecessary for numeric flight.
// Routes sample all coastal bearings and an overhead grid. This is regression
// coverage, not a claim that every possible cave or player trajectory is tested.
(async () => {
  const local = name => pathToFileURL(path.resolve(name)).href;
  const { prepareIsland } = await import(local('site/phoenix-model.mjs'));
  const { createCollisionWorld } = await import(local('site/phoenix-collision.mjs'));
  const { createFlightState, stepFlight, requestTrick } = await import(local('site/phoenix-flight-core.mjs'));
  assert.equal(typeof requestTrick, 'function', 'Flight core exposes the maneuver API');
  const { solid } = prepareIsland(await loadGeometry('site/media/phoenix-island/island.glb'));
  const beforeBuild = performance.now();
  const world = createCollisionWorld(solid);
  const buildMs = performance.now() - beforeBuild;
  assert(world.meshCount > 0 && world.triangleCount > 10000, 'Routes use the actual detailed island');
  const radius = 1.2, fps = 60;
  const counts = { steps: 0, collisionQueries: 0, contacts: 0, clearanceChecks: 0, descentRoutes: 0, cliffRoutes: 0, transects: 0, tricks: 0, rockRejections: 0 };
  const resolveMotion = (start, end, bodyRadius) => {
    counts.collisionQueries++;
    const result = world.constrainMotion(start, end, bodyRadius);
    if (result.hit) counts.contacts++;
    return result;
  };
  const make = (position, yaw = 0, extra = {}) => createFlightState({
    position, yaw, bodyRadius: radius, resolveMotion,
    worldRadius: 500, minimumAltitude: 2.5, maximumAltitude: 190, ...extra,
  });
  function assertClear(position, label) {
    const check = world.constrainMotion(position, position, radius);
    counts.clearanceChecks++;
    assert(check.recoveryDistance < 1e-4, `${label}: body sphere overlaps an actual surface by ${check.recoveryDistance}`);
  }
  function advance(state, input, frames, label, descending = false) {
    for (let i = 0; i < frames; i++) {
      const priorY = state.position.y;
      stepFlight(state, typeof input === 'function' ? input(i / fps) : input, 1 / fps);
      counts.steps++;
      assert(Object.values(state.position).every(Number.isFinite), `${label}: position stays finite`);
      if (descending) assert(state.position.y <= priorY + 1e-7,
        `${label}: down input raised the phoenix from ${priorY} to ${state.position.y}`);
      if (i % 30 === 0 || i === frames - 1) assertClear(state.position, label);
    }
    return state;
  }

  const startTime = performance.now();
  // From clear sky toward land, then descending into its actual slopes/walls.
  // Lower routes begin beyond every solid island AABB corner and approach each
  // coastal direction directly, without teleporting inside the terrain.
  for (let bearing = 0; bearing < 36; bearing++) {
    const angle = bearing * Math.PI / 18;
    const x = Math.sin(angle) * 195, z = Math.cos(angle) * 195;
    const yaw = Math.atan2(-x, z);
    const high = make({ x, y: 135, z }, yaw);
    assertClear(high.position, `descent ${bearing}`);
    advance(high, { climb: -1, boost: true }, fps * 16, `descent ${bearing}`, true);
    counts.descentRoutes++;
    const low = make({ x, y: 20 + bearing % 3 * 12, z }, yaw);
    assertClear(low.position, `cliff ${bearing}`);
    advance(low, { climb: -.12, boost: true }, fps * 9, `cliff ${bearing}`, true);
    counts.cliffRoutes++;
  }

  // Grid across both axes and both directions, above the highest actual mesh.
  const altitude = world.bounds.max.y + 18;
  for (const axis of ['x', 'z']) for (const offset of [-100,-75,-50,-25,0,25,50,75,100]) {
    for (const direction of [-1, 1]) {
      const position = axis === 'z' ? { x: offset, y: altitude, z: 175 * direction } : { x: 175 * direction, y: altitude, z: offset };
      const yaw = axis === 'z' ? (direction > 0 ? 0 : Math.PI) : (direction > 0 ? -Math.PI / 2 : Math.PI / 2);
      const state = make(position, yaw);
      const label = `${axis} transect ${offset}/${direction}`;
      advance(state, {}, fps * 20, label);
      assert(Math.abs(state.position.y - altitude) < 1e-7, `${label}: overhead flight stays level`);
      assert(axis === 'z' ? state.position.z * direction < -150 : state.position.x * direction < -150,
        `${label}: crosses the complete island`);
      counts.transects++;
    }
  }

  for (const type of ['rollLeft', 'rollRight', 'loop']) {
    const state = make({x:0,y:65,z:250});
    assert(requestTrick(state, type), `${type}: accepted in clear water airspace`);
    assert(state.trick, `${type}: maneuver becomes active`);
    let frames = 0;
    while (state.trick && frames < fps * 8) {
      advance(state, {}, 1, type);
      frames++;
    }
    assert(!state.trick, `${type}: finishes`);
    if (type === 'loop') {
      assert(Math.hypot(state.position.x, state.position.y-65, state.position.z-250) < 1,
        'A real loop returns near its starting flight path');
    }
    counts.tricks++;
  }

  // Find an actual front-facing obstruction from outside the island, stop just
  // before it, and verify that a loop cannot start through its solid surface.
  for (let bearing = 0; bearing < 36 && !counts.rockRejections; bearing++) {
    const angle = bearing * Math.PI / 18;
    for (const height of [18,35,55,75]) {
      const outside = {x:Math.sin(angle)*195,y:height,z:Math.cos(angle)*195};
      const hit = world.clipCamera(outside, {x:0,y:height,z:0}, radius);
      if (!hit.hit || hit.startedPenetrating) continue;
      const position = {x:hit.position.x+hit.normal.x*.15,y:hit.position.y+hit.normal.y*.15,z:hit.position.z+hit.normal.z*.15};
      const clear = world.constrainMotion(position, position, radius);
      if (clear.startedPenetrating) continue;
      const state = make(position, Math.atan2(-outside.x, outside.z));
      if (!requestTrick(state,'loop')) {
        assert(state.trickRejectedReason, 'An obstructed loop explains why it cannot start');
        assert(!state.trick, 'Rejected loop does not become active');
        assertClear(state.position, 'rock loop rejection');
        counts.rockRejections++;
        break;
      }
    }
  }
  assert(counts.rockRejections > 0, 'An actual island cliff rejects a loop that would cross it');
  assert(counts.contacts > 0, 'Low-altitude approaches exercised actual island contacts');
  console.log('Phoenix whole-island coverage passed:', JSON.stringify({
    meshes: world.meshCount, triangles: world.triangleCount, ...counts,
    buildMs: Math.round(buildMs), routeMs: Math.round(performance.now()-startTime),
  }));
  console.log('Limits: numeric body-sphere regression on sampled coastal/overhead routes; does not certify every cave, feather-tip clearance, visual camera feel or landing interaction.');
})().catch(error => { console.error(error); process.exitCode = 1; });
