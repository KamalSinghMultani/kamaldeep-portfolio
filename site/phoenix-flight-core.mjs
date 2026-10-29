/**
 * Pure arcade flight. +Y up; yaw0 faces -Z, positive turn goes toward +X.
 * Input.forward/strafe are local -1..1 axes; climb is independent world-up.
 * Neutral input hovers exactly. Released axes stop immediately; reversing an
 * axis clears its previous motion before easing into the new direction. Yaw,
 * visual pitch, and bank never create translation. Combined input is normalized.
 *
 * resolveMotion(start,end,bodyRadius,state) optionally returns the static-world
 * sweep result {position,hit,normal,startedPenetrating,recoveryDistance}. Invalid
 * results block motion. Slope sliding that adds unrequested ascent is blocked;
 * only actual initial-penetration recovery may displace a descending bird up.
 *
 * requestTrick(state,'rollLeft'|'rollRight'|'loop') returns acceptance. Rolls
 * leave steering live. A loop sweeps a prechecked vertical circle and returns to
 * its initial position/heading; descend or brake cancels it. Add trickRoll and
 * trickPitch to the actor's normal bank/pitch. Collision cancels a trick with an
 * eased visual recovery, never a teleport to the trick's start. Cancellation
 * restores only currently held translation commands, with no momentum drift.
 */
const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const finite = (n, fallback) => Number.isFinite(n) ? n : fallback;
const angle = n => ((n + Math.PI) % TAU + TAU) % TAU - Math.PI;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const validPosition = p => p && [p.x, p.y, p.z].every(Number.isFinite);

export const DEFAULT_FLIGHT_OPTIONS = Object.freeze({
  cruiseSpeed: 17, boostSpeed: 30, minimumSpeed: 0, brakeSpeed: 0,
  speedResponse: 5.5, turnResponse: 5.8, pitchResponse: 5.2, bankResponse: 4.8,
  maximumTurnRate: 1.08, maximumPitch: .65, maximumBank: .62,
  minimumAltitude: 2.5, maximumAltitude: 160, worldRadius: 400,
  boundaryMargin: 32, bodyRadius: 1.2, maximumDelta: .05,
  integrationStep: 1 / 120, rollDuration: 1.15, loopDuration: 3.2,
  minimumLoopSpeed: 8, trickRecovery: 6.5,
});

function configuration(previous = {}, override = {}) {
  const c = { ...DEFAULT_FLIGHT_OPTIONS, ...previous };
  for (const key of Object.keys(DEFAULT_FLIGHT_OPTIONS)) {
    if (Number.isFinite(override[key]) && override[key] >= 0) c[key] = override[key];
  }
  if (Object.prototype.hasOwnProperty.call(override, 'resolveMotion')) c.resolveMotion = typeof override.resolveMotion === 'function' ? override.resolveMotion : undefined;
  c.maximumDelta = Math.max(.001, c.maximumDelta);
  c.integrationStep = Math.max(1 / 1000, c.integrationStep);
  c.worldRadius = Math.max(1, c.worldRadius);
  c.boundaryMargin = clamp(c.boundaryMargin, .1, c.worldRadius * .5);
  c.maximumAltitude = Math.max(c.minimumAltitude, c.maximumAltitude);
  c.maximumPitch = clamp(c.maximumPitch, 0, Math.PI * .45);
  c.rollDuration = Math.max(.2, c.rollDuration); c.loopDuration = Math.max(.5, c.loopDuration);
  return c;
}

function damped(value, target, response, dt) {
  if (response <= 0) return { value: target, integral: target * dt };
  const decay = Math.exp(-response * dt);
  return { value: target + (value - target) * decay,
    integral: target * dt + (value - target) * (1 - decay) / response };
}

function bounded(point, c) {
  const p = { ...point }, radius = Math.hypot(p.x, p.z);
  if (radius > c.worldRadius) { p.x *= c.worldRadius / radius; p.z *= c.worldRadius / radius; }
  p.y = clamp(p.y, c.minimumAltitude, c.maximumAltitude);
  return p;
}
function inBounds(p, c) {
  return p.y >= c.minimumAltitude - 1e-8 && p.y <= c.maximumAltitude + 1e-8 && Math.hypot(p.x, p.z) <= c.worldRadius + 1e-8;
}

function resolve(state, start, end) {
  if (!state.config.resolveMotion) return { position: { ...end }, hit: false, startedPenetrating: false };
  const result = state.config.resolveMotion({ ...start }, { ...end }, state.config.bodyRadius, state);
  if (!validPosition(result?.position)) return { position: { ...start }, hit: true, invalid: true, normal: { x: 0, y: 0, z: 0 }, startedPenetrating: false };
  return { ...result, position: { ...result.position } };
}

function cancelTrick(state, reason) {
  if (!state.trick) return;
  Object.assign(state.commandVelocity, { forward: 0, strafe: 0, climb: 0 });
  state.recoveryVelocity = null; state.recoveryRemaining = 0;
  state.trick = null;
  state.trickRoll = angle(state.trickRoll); state.trickPitch = angle(state.trickPitch);
  state.trickCancelledReason = reason;
}

export function createFlightState(options = {}) {
  const p = options.position || options.spawn || { x: 0, y: 38, z: 135 };
  const config = configuration({}, options);
  const state = { config, spawn: { position: { x: finite(p.x, 0), y: finite(p.y, 38), z: finite(p.z, 135) },
    yaw: finite(options.yaw, 0), pitch: finite(options.pitch, 0), speed: 0 }, position: {}, velocity: {} };
  return resetFlight(state, options);
}

export function resetFlight(state, options = {}) {
  state.config = configuration(state.config, options);
  const p = options.position || options.spawn || state.spawn.position;
  Object.assign(state.position, bounded({ x: finite(p.x, state.spawn.position.x), y: finite(p.y, state.spawn.position.y), z: finite(p.z, state.spawn.position.z) }, state.config));
  state.yaw = angle(finite(options.yaw, state.spawn.yaw));
  state.pitch = clamp(finite(options.pitch, state.spawn.pitch), -state.config.maximumPitch, state.config.maximumPitch);
  state.motionPitch = 0; state.bank = 0; state.turnRate = 0;
  state.speed = 0;
  Object.assign(state.commandVelocity ??= {}, { forward: 0, strafe: 0, climb: 0 });
  state.actualSpeed = 0; state.paused = Boolean(options.paused); state.time = 0; state.distance = 0;
  state.boundaryAssist = 0; state.terrainAssist = false;
  state.collision = null; state.blocked = false; state.startedPenetrating = false;
  state.trick = null; state.trickRoll = 0; state.trickPitch = 0;
  state.recoveryVelocity = null; state.recoveryRemaining = 0;
  state.trickRejectedReason = ''; state.trickCancelledReason = '';
  Object.assign(state.velocity, { x: 0, y: 0, z: 0 });
  return state;
}

function loopPosition(trick, phase) {
  const theta = TAU * phase, pitch = trick.pitch;
  const forward = trick.radius * (Math.sin(pitch + theta) - Math.sin(pitch));
  return { x: trick.start.x + Math.sin(trick.yaw) * forward,
    y: trick.start.y + trick.radius * (Math.cos(pitch) - Math.cos(pitch + theta)),
    z: trick.start.z - Math.cos(trick.yaw) * forward };
}

export function requestTrick(state, name) {
  const reject = reason => { state.trickRejectedReason = reason; return false; };
  if (!['rollLeft', 'rollRight', 'loop'].includes(name)) return reject('Unknown trick.');
  if (state.paused) return reject('Resume flight before performing a trick.');
  if (state.trick) return reject('A trick is already in progress.');
  if (state.recoveryRemaining > 0) return reject('Wait for the flight path to settle.');
  if (Math.abs(state.trickRoll) > .02 || Math.abs(state.trickPitch) > .02) return reject('Wait for the wings to settle.');
  const c = state.config;
  const trick = { name, elapsed: 0, duration: name === 'loop' ? c.loopDuration : c.rollDuration,
    start: { ...state.position }, yaw: state.yaw, pitch: state.motionPitch, speed: state.actualSpeed };
  if (name === 'loop') {
    if (state.actualSpeed < c.minimumLoopSpeed) return reject('Gain some speed before looping.');
    const actualForward = state.velocity.x * Math.sin(state.yaw) - state.velocity.z * Math.cos(state.yaw);
    const actualStrafe = state.velocity.x * Math.cos(state.yaw) + state.velocity.z * Math.sin(state.yaw);
    if (actualForward < c.minimumLoopSpeed || Math.abs(actualStrafe) > actualForward * .25 || Math.abs(state.velocity.y) > actualForward * .25) {
      return reject('Move forward in a straight line before looping.');
    }
    // Entry follows the already visible attitude; vertical/sideways travel is
    // rejected above instead of snapping a hovering bird through ninety degrees.
    trick.pitch = state.pitch;
    trick.radius = trick.speed * trick.duration / TAU;
    let previous = { ...state.position };
    for (let i = 1; i <= 96; i++) {
      const next = loopPosition(trick, i / 96);
      if (!inBounds(next, c)) return reject('Move into open air with more room above and around you.');
      const result = resolve(state, previous, next);
      if (result.hit || result.startedPenetrating || distance(result.position, next) > 1e-4) return reject('The loop path is obstructed. Move into open air.');
      previous = next;
    }
    state.pitch = trick.pitch; state.turnRate = 0;
  }
  state.trick = trick; state.trickRoll = 0; state.trickPitch = 0;
  state.trickRejectedReason = ''; state.trickCancelledReason = '';
  return true;
}

function applyMotion(state, old, wanted, climb, intent) {
  const candidate = bounded(wanted, state.config);
  const boundaryBlocked = distance(candidate, wanted) > 1e-8;
  const result = resolve(state, old, candidate);
  // A slope slide may add upward displacement even to a downward command.
  // Block that request at contact rather than lifting the bird over the slope.
  const ascentLimit = climb < -.001 ? old.y : Math.max(old.y, candidate.y);
  let intentBlocked = result.position.y > ascentLimit + 1e-8;
  if (intent && !result.startedPenetrating) {
    const dx = result.position.x - old.x, dz = result.position.z - old.z;
    const components = { forward: dx * Math.sin(intent.yaw) - dz * Math.cos(intent.yaw),
      strafe: dx * Math.cos(intent.yaw) + dz * Math.sin(intent.yaw), climb: result.position.y - old.y };
    for (const axis of ['forward', 'strafe', 'climb']) {
      intentBlocked ||= Math.abs(intent[axis]) < 1e-10 ? Math.abs(components[axis]) > 1e-8 : components[axis] * intent[axis] < -1e-8;
    }
  }
  if (!result.startedPenetrating && intentBlocked) {
    result.position = { ...old }; result.hit = true; result.intentBlocked = true;
  } else if (intent && !result.startedPenetrating) {
    // Remove harmless solver roundoff on explicitly inactive world axes, too:
    // a vertical command preserves the exact previous X/Z, not just a tolerance.
    if (intent.forward === 0 && intent.strafe === 0) {
      result.position.x = old.x; result.position.z = old.z;
    }
    if (intent.climb === 0) result.position.y = old.y;
  }
  if (result.hit) state.collision = result;
  state.startedPenetrating ||= Boolean(result.startedPenetrating);
  const blocked = boundaryBlocked || result.intentBlocked || (!result.startedPenetrating && distance(result.position, candidate) > 1e-5);
  state.blocked ||= Boolean(blocked);
  Object.assign(state.position, result.position);
  return { blocked, result };
}

export function stepFlight(state, input = {}, deltaSeconds = 0, options) {
  if (options) state.config = configuration(state.config, options);
  if (Object.prototype.hasOwnProperty.call(input, 'paused')) state.paused = Boolean(input.paused);
  if (state.paused || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return state;
  const c = state.config, dt = Math.min(deltaSeconds, c.maximumDelta);
  const count = Math.max(1, Math.ceil(dt / c.integrationStep - 1e-10)), h = dt / count;
  const turn = input.brake ? 0 : clamp(finite(input.turn, 0), -1, 1), climb = clamp(finite(input.climb, 0), -1, 1);
  let forward = input.brake ? 0 : clamp(finite(input.forward, 0), -1, 1);
  let strafe = input.brake ? 0 : clamp(finite(input.strafe, 0), -1, 1);
  let vertical = input.brake ? 0 : climb;
  const magnitude = Math.hypot(forward, strafe, vertical);
  if (magnitude > 1) { forward /= magnitude; strafe /= magnitude; vertical /= magnitude; }
  const initial = { ...state.position };
  let travelled = 0;
  state.collision = null; state.blocked = false; state.startedPenetrating = false;
  for (let i = 0; i < count; i++) {
    const old = { ...state.position };
    if (state.trick && (input.brake || input.cancelTrick || (state.trick.name === 'loop' && climb < -.001))) cancelTrick(state, 'Trick cancelled by pilot.');
    if (state.trick?.name === 'loop') {
      const trick = state.trick;
      trick.elapsed = Math.min(trick.duration, trick.elapsed + h);
      const phase = Math.min(1, trick.elapsed / trick.duration);
      const next = phase >= 1 - 1e-10 ? { ...trick.start } : loopPosition(trick, phase);
      state.yaw = trick.yaw; state.pitch = trick.pitch; state.motionPitch = trick.pitch;
      state.bank = damped(state.bank, 0, c.bankResponse, h).value;
      state.trickPitch = TAU * phase;
      const motion = applyMotion(state, old, next, 1);
      if (motion.result.hit || motion.blocked) cancelTrick(state, 'Loop interrupted by an obstacle.');
      else if (phase >= 1 - 1e-10) { state.trick = null; state.trickPitch = 0; }
    } else {
      if (turn === 0 || state.turnRate * turn < 0) state.turnRate = 0;
      const yaw = damped(state.turnRate, turn * c.maximumTurnRate, c.turnResponse, h);
      const yawMid = state.yaw + yaw.integral * .5;
      state.turnRate = yaw.value; state.yaw = angle(state.yaw + yaw.integral);
      const targetPitch = vertical * c.maximumPitch;
      state.pitch = damped(state.pitch, targetPitch, c.pitchResponse, h).value;
      const turnBank = c.maximumTurnRate > 0 ? -state.turnRate / c.maximumTurnRate * c.maximumBank : 0;
      state.bank = damped(state.bank, clamp(turnBank - strafe * c.maximumBank * .65, -c.maximumBank, c.maximumBank), c.bankResponse, h).value;
      const radius = Math.hypot(old.x, old.z);
      const edge = clamp((radius - (c.worldRadius - c.boundaryMargin)) / c.boundaryMargin, 0, 1);
      const requestedX = Math.sin(yawMid) * forward + Math.cos(yawMid) * strafe;
      const requestedZ = -Math.cos(yawMid) * forward + Math.sin(yawMid) * strafe;
      const outward = radius > 1e-8 ? Math.max(0, (old.x * requestedX + old.z * requestedZ) / radius) : 0;
      state.boundaryAssist = edge * outward;
      const baseSpeed = (input.boost ? c.boostSpeed : c.cruiseSpeed) * (1 - state.boundaryAssist);
      const travel = {};
      for (const [axis, command] of [['forward', forward], ['strafe', strafe], ['climb', vertical]]) {
        if (command === 0 || state.commandVelocity[axis] * command < 0) state.commandVelocity[axis] = 0;
        if (command === 0) travel[axis] = 0;
        else {
          const motion = damped(state.commandVelocity[axis], command * baseSpeed, c.speedResponse, h);
          state.commandVelocity[axis] = motion.value; travel[axis] = motion.integral;
        }
      }
      state.speed = Math.hypot(state.commandVelocity.forward, state.commandVelocity.strafe, state.commandVelocity.climb);
      state.motionPitch = state.speed > 1e-8 ? Math.atan2(state.commandVelocity.climb, Math.hypot(state.commandVelocity.forward, state.commandVelocity.strafe)) : 0;
      const next = { x: old.x + Math.sin(yawMid) * travel.forward + Math.cos(yawMid) * travel.strafe,
        y: old.y + travel.climb, z: old.z - Math.cos(yawMid) * travel.forward + Math.sin(yawMid) * travel.strafe };
      const constrained = applyMotion(state, old, next, vertical, { yaw: yawMid, forward, strafe, climb: vertical });
      if (constrained.result.hit && state.trick) cancelTrick(state, 'Roll interrupted by an obstacle.');
      if (state.trick) {
        state.trick.elapsed = Math.min(state.trick.duration, state.trick.elapsed + h);
        const p = state.trick.elapsed / state.trick.duration;
        state.trickRoll = (state.trick.name === 'rollRight' ? -1 : 1) * TAU * p * p * (3 - 2 * p);
        if (p >= 1 - 1e-10) { state.trick = null; state.trickRoll = 0; }
      }
    }
    if (!state.trick) {
      state.trickRoll = damped(state.trickRoll, 0, c.trickRecovery, h).value;
      state.trickPitch = damped(state.trickPitch, 0, c.trickRecovery, h).value;
      if (Math.abs(state.trickRoll) < 1e-5) state.trickRoll = 0;
      if (Math.abs(state.trickPitch) < 1e-5) state.trickPitch = 0;
    }
    const moved = distance(state.position, old);
    travelled += moved; state.distance += moved; state.time += h;
  }
  Object.assign(state.velocity, { x: (state.position.x - initial.x) / dt,
    y: (state.position.y - initial.y) / dt, z: (state.position.z - initial.z) / dt });
  state.actualSpeed = travelled / dt;
  return state;
}
