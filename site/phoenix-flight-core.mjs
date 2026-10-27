/**
 * Numeric arcade flight, independent of Three.js, DOM events, and wall clocks.
 *
 * Coordinates: +Y up, yaw 0 faces -Z; positive yaw/turn goes toward +X.
 * Positive pitch/climb ascends. Bank is negative during a right-hand turn.
 * Position, velocity, yaw/pitch/bank (radians), and speed are exposed on state.
 *
 * createFlightState({ position:{x,y,z}, yaw, speed, ...options }) stores a spawn.
 * stepFlight(state, { turn, climb, throttle, boost, brake, paused }, dt, options)
 * mutates and returns state. turn/climb are -1..1; throttle is 0..1, default 1.
 * Neutral input cruises; throttle 0/brake slows without abruptly stopping.
 * options.groundHeight(x,z) returns terrain height in WORLD units. Non-finite
 * samples are treated as open water. Terrain clearance wins over the ceiling.
 * Set state.paused, or input.paused. Reset returns to the original spawn unless
 * an explicit position/yaw is supplied. A large resumed-frame delta is bounded.
 */

const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const angle = value => ((value + Math.PI) % TAU + TAU) % TAU - Math.PI;

export const DEFAULT_FLIGHT_OPTIONS = Object.freeze({
  cruiseSpeed: 17,
  boostSpeed: 30,
  minimumSpeed: 4,
  brakeSpeed: 3,
  speedResponse: 2.2,
  turnResponse: 4.8,
  pitchResponse: 3.8,
  bankResponse: 4.2,
  maximumTurnRate: 1.08,
  maximumPitch: .65,
  maximumBank: .62,
  minimumAltitude: 2.5,
  maximumAltitude: 160,
  terrainClearance: 5,
  terrainLookAhead: 1.4,
  worldRadius: 400,
  boundaryMargin: 48,
  maximumDelta: .05,
  integrationStep: 1 / 120,
});

function configuration(previous = {}, override = {}) {
  const result = { ...DEFAULT_FLIGHT_OPTIONS, ...previous };
  for (const key of Object.keys(DEFAULT_FLIGHT_OPTIONS)) {
    if (Number.isFinite(override[key]) && override[key] >= 0) result[key] = override[key];
  }
  if (Object.prototype.hasOwnProperty.call(override, 'groundHeight')) {
    result.groundHeight = typeof override.groundHeight === 'function' ? override.groundHeight : undefined;
  }
  result.maximumDelta = Math.max(.001, result.maximumDelta);
  result.integrationStep = Math.max(1 / 1000, result.integrationStep);
  result.worldRadius = Math.max(1, result.worldRadius);
  result.boundaryMargin = clamp(result.boundaryMargin, 1, result.worldRadius * .5);
  result.maximumAltitude = Math.max(result.minimumAltitude, result.maximumAltitude);
  result.maximumPitch = clamp(result.maximumPitch, 0, Math.PI * .45);
  return result;
}

function terrainFloor(config, x, z) {
  const height = config.groundHeight?.(x, z);
  return Number.isFinite(height) ? Math.max(config.minimumAltitude, height + config.terrainClearance) : config.minimumAltitude;
}

// Both the endpoint and integral of first-order exponential damping are exact.
// The integral avoids accelerating farther merely because the frame rate is low.
function damped(value, target, response, dt) {
  if (response <= 0) return { value: target, integral: target * dt };
  const attenuation = Math.exp(-response * dt);
  return {
    value: target + (value - target) * attenuation,
    integral: target * dt + (value - target) * (1 - attenuation) / response,
  };
}

export function createFlightState(options = {}) {
  const position = options.position || options.spawn || { x: 0, y: 38, z: 135 };
  const config = configuration({}, options);
  const state = {
    config,
    spawn: {
      position: { x: finite(position.x, 0), y: finite(position.y, 38), z: finite(position.z, 135) },
      yaw: finite(options.yaw, 0),
      pitch: finite(options.pitch, 0),
      speed: finite(options.speed, config.cruiseSpeed),
    },
    position: {}, velocity: {},
  };
  return resetFlight(state);
}

export function resetFlight(state, options = {}) {
  state.config = configuration(state.config, options);
  const config = state.config;
  const spawn = options.position || options.spawn || state.spawn.position;
  Object.assign(state.position, {
    x: finite(spawn.x, state.spawn.position.x),
    y: finite(spawn.y, state.spawn.position.y),
    z: finite(spawn.z, state.spawn.position.z),
  });
  const radius = Math.hypot(state.position.x, state.position.z);
  if (radius > config.worldRadius) {
    const ratio = config.worldRadius / radius;
    state.position.x *= ratio; state.position.z *= ratio;
  }
  const floor = terrainFloor(config, state.position.x, state.position.z);
  state.position.y = clamp(state.position.y, floor, Math.max(config.maximumAltitude, floor));
  state.yaw = angle(finite(options.yaw, state.spawn.yaw));
  state.pitch = clamp(finite(options.pitch, state.spawn.pitch), -config.maximumPitch, config.maximumPitch);
  state.bank = 0; state.turnRate = 0;
  state.speed = Math.max(0, finite(options.speed, state.spawn.speed));
  state.paused = Boolean(options.paused);
  state.time = 0; state.distance = 0;
  state.boundaryAssist = 0; state.terrainAssist = false;
  Object.assign(state.velocity, { x: 0, y: 0, z: 0 });
  return state;
}

export function stepFlight(state, input = {}, deltaSeconds = 0, options) {
  if (options) state.config = configuration(state.config, options);
  if (Object.prototype.hasOwnProperty.call(input, 'paused')) state.paused = Boolean(input.paused);
  if (state.paused || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return state;
  const config = state.config;
  const dt = Math.min(deltaSeconds, config.maximumDelta);
  const steps = Math.max(1, Math.ceil(dt / config.integrationStep - 1e-10));
  const h = dt / steps;
  const turn = clamp(finite(input.turn, 0), -1, 1);
  const climb = clamp(finite(input.climb, 0), -1, 1);
  const throttle = clamp(finite(input.throttle, 1), 0, 1);
  const targetSpeed = input.brake ? config.brakeSpeed : config.minimumSpeed +
    ((input.boost ? config.boostSpeed : config.cruiseSpeed) - config.minimumSpeed) * throttle;

  for (let i = 0; i < steps; i++) {
    const old = { ...state.position };
    const radius = Math.hypot(old.x, old.z);
    const assist = clamp((radius - (config.worldRadius - config.boundaryMargin)) / config.boundaryMargin, 0, 1);
    const inwardYaw = Math.atan2(-old.x, old.z);
    const inwardRate = clamp(angle(inwardYaw - state.yaw) * 2, -config.maximumTurnRate, config.maximumTurnRate);
    const targetRate = turn * config.maximumTurnRate * (1 - assist) + inwardRate * assist;
    state.boundaryAssist = assist;

    const yawMotion = damped(state.turnRate, targetRate, config.turnResponse, h);
    const yawMidpoint = state.yaw + yawMotion.integral * .5;
    state.turnRate = yawMotion.value;
    state.yaw = angle(state.yaw + yawMotion.integral);

    let targetPitch = climb * config.maximumPitch;
    const lookDistance = Math.max(8, state.speed * config.terrainLookAhead);
    const aheadX = old.x + Math.sin(state.yaw) * lookDistance;
    const aheadZ = old.z - Math.cos(state.yaw) * lookDistance;
    const floor = terrainFloor(config, old.x, old.z);
    const aheadFloor = Math.max(floor, terrainFloor(config, aheadX, aheadZ));
    const ceiling = Math.max(config.maximumAltitude, floor);
    state.terrainAssist = aheadFloor > old.y - 3;
    if (state.terrainAssist) {
      targetPitch = Math.max(targetPitch, clamp(Math.atan2(aheadFloor + 3 - old.y, lookDistance), 0, config.maximumPitch));
    }
    if (old.y > ceiling - 8 && !state.terrainAssist) {
      targetPitch = Math.min(targetPitch, Math.max(0, (ceiling - old.y) * .04));
    }
    const oldPitch = state.pitch;
    state.pitch = damped(state.pitch, targetPitch, config.pitchResponse, h).value;
    const pitchMidpoint = (oldPitch + state.pitch) * .5;
    const targetBank = config.maximumTurnRate > 0 ? -state.turnRate / config.maximumTurnRate * config.maximumBank : 0;
    state.bank = damped(state.bank, targetBank, config.bankResponse, h).value;
    const motion = damped(state.speed, targetSpeed, config.speedResponse, h);
    state.speed = motion.value;
    const horizontal = Math.cos(pitchMidpoint) * motion.integral;
    state.position.x += Math.sin(yawMidpoint) * horizontal;
    state.position.z -= Math.cos(yawMidpoint) * horizontal;
    state.position.y += Math.sin(pitchMidpoint) * motion.integral;

    const nextRadius = Math.hypot(state.position.x, state.position.z);
    if (nextRadius > config.worldRadius) {
      const ratio = config.worldRadius / nextRadius;
      state.position.x *= ratio; state.position.z *= ratio;
    }
    const nextFloor = terrainFloor(config, state.position.x, state.position.z);
    state.position.y = clamp(state.position.y, nextFloor, Math.max(config.maximumAltitude, nextFloor));
    state.velocity.x = (state.position.x - old.x) / h;
    state.velocity.y = (state.position.y - old.y) / h;
    state.velocity.z = (state.position.z - old.z) / h;
    state.distance += Math.hypot(state.position.x - old.x, state.position.y - old.y, state.position.z - old.z);
    state.time += h;
  }
  return state;
}
