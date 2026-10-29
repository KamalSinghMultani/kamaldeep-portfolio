import { Vector3, MathUtils } from './vendor/three.module.min.js';

/**
 * A body-relative chase rig. Pilot translation is followed immediately; only
 * the orbit/look offsets are damped. This prevents a descending bird from
 * appearing to rise because a world-space camera is still catching up.
 *
 * Pilot: { position:{x,y,z}, yaw, pitch, bank, speed, trickRoll? }.
 * yaw zero is -Z; positive yaw turns toward +X. The rig deliberately follows
 * transport yaw/pitch, not the supplied wing animation or trick attitude.
 *
 * collision(start,end,radius) may return {position:{x,y,z},hit} (or plain xyz).
 * It clips the actual eye segment. There is no terrain-height camera lift.
 */
export const DEFAULT_CAMERA_OPTIONS = Object.freeze({
  aspect: 1,
  distance: 12,
  height: 6,
  lookAhead: 3.8,
  focusHeight: 1.1,
  anchorHeight: .4,
  headingResponse: 10,
  offsetResponse: 10,
  focusResponse: 12,
  armExtendResponse: 5,
  maximumHeadingLag: .34,
  cameraRadius: .55,
  fov: 57,
  followRoll: false,
  maximumDelta: .05,
});

const TAU = Math.PI * 2;
const finite = (n, fallback) => Number.isFinite(n) ? n : fallback;
const wrap = value => ((value + Math.PI) % TAU + TAU) % TAU - Math.PI;
const attenuation = (rate, dt) => 1 - Math.exp(-rate * dt);

function normalizedOptions(previous, next) {
  const result = { ...DEFAULT_CAMERA_OPTIONS, ...previous, ...next };
  for (const key of Object.keys(DEFAULT_CAMERA_OPTIONS)) {
    if (typeof DEFAULT_CAMERA_OPTIONS[key] === 'number') result[key] = finite(result[key], DEFAULT_CAMERA_OPTIONS[key]);
  }
  result.aspect = Math.max(.2, result.aspect);
  result.maximumDelta = Math.max(.001, result.maximumDelta);
  result.distance = Math.max(2, result.distance);
  result.height = Math.max(0, result.height);
  result.cameraRadius = Math.max(0, result.cameraRadius);
  return result;
}

export function createCameraState(pilot = {}, options = {}) {
  const state = {
    position: new Vector3(), focus: new Vector3(), up: new Vector3(0, 1, 0),
    offset: new Vector3(), lookOffset: new Vector3(),
    headingYaw: 0, horizonRoll: 0, armLength: 0, collisionHit: false, fov: 57,
    options: normalizedOptions({}, options),
    // Reused scratch vectors avoid vector allocations on the per-frame path.
    scratch: { body: new Vector3(), desiredOffset: new Vector3(), desiredLook: new Vector3(),
      anchor: new Vector3(), eye: new Vector3(), arm: new Vector3(), direction: new Vector3() },
  };
  return updateCameraRig(state, pilot, 0, options, true);
}

export function updateCameraRig(state, pilot, deltaSeconds, options = {}, snap = false) {
  // A paused render is an actual hold. Explicit snap is used for reset/resize.
  if (!snap && (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0)) return state;
  const config = state.options = normalizedOptions(state.options, options);
  const dt = Math.min(Math.max(0, deltaSeconds || 0), config.maximumDelta);
  const { body, desiredOffset, desiredLook, anchor, eye, arm, direction } = state.scratch;
  body.set(finite(pilot?.position?.x, 0), finite(pilot?.position?.y, 0), finite(pilot?.position?.z, 0));
  const yaw = finite(pilot?.yaw, 0), pitch = finite(pilot?.pitch, 0), speed = finite(pilot?.speed, 17);
  if (snap) state.headingYaw = yaw;
  else {
    const error = wrap(yaw - state.headingYaw);
    state.headingYaw += error * attenuation(config.headingResponse, dt);
    // Even an abrupt turn cannot leave the camera facing the old route.
    state.headingYaw = yaw - MathUtils.clamp(wrap(yaw - state.headingYaw), -config.maximumHeadingLag, config.maximumHeadingLag);
  }
  const portrait = Math.max(1, .8 / config.aspect);
  const distance = (config.distance + Math.max(0, speed - 17) * .035) * portrait;
  desiredOffset.set(-Math.sin(state.headingYaw) * distance, config.height * Math.sqrt(portrait), Math.cos(state.headingYaw) * distance);
  desiredLook.set(Math.sin(yaw) * Math.cos(pitch) * config.lookAhead,
    config.focusHeight + Math.sin(pitch) * config.lookAhead,
    -Math.cos(yaw) * Math.cos(pitch) * config.lookAhead);
  if (snap) { state.offset.copy(desiredOffset); state.lookOffset.copy(desiredLook); }
  else {
    state.offset.lerp(desiredOffset, attenuation(config.offsetResponse, dt));
    state.lookOffset.lerp(desiredLook, attenuation(config.focusResponse, dt));
  }
  // Damping a tight orbital turn must not cut the eye through the phoenix.
  const horizontal = Math.hypot(state.offset.x, state.offset.z), minimumOrbit = distance * .82;
  if (horizontal < minimumOrbit) {
    if (horizontal > .0001) {
      state.offset.x *= minimumOrbit / horizontal; state.offset.z *= minimumOrbit / horizontal;
    } else { state.offset.x = desiredOffset.x; state.offset.z = desiredOffset.z; }
  }
  // Vertical offset is deliberately independent of pitch and wall height.
  state.offset.y = desiredOffset.y;
  // Keep the cast sphere inside the pilot's clearance envelope, including
  // flight immediately beneath an overhang. Focus height is a framing choice.
  anchor.copy(body); anchor.y += config.anchorHeight;
  eye.copy(body).add(state.offset);
  arm.copy(eye).sub(anchor);
  const wantedLength = arm.length();
  let allowedLength = wantedLength;
  state.collisionHit = false;
  if (typeof config.collision === 'function') {
    const result = config.collision(anchor, eye, config.cameraRadius);
    const point = result?.position || result;
    if (point && [point.x, point.y, point.z].every(Number.isFinite)) {
      allowedLength = Math.min(wantedLength, anchor.distanceTo(point));
      state.collisionHit = Boolean(result.hit) || allowedLength < wantedLength - .001;
    }
  }
  // A wall retracts the camera immediately. Open space lets the arm ease out.
  if (snap || allowedLength < state.armLength) state.armLength = allowedLength;
  else state.armLength = MathUtils.lerp(state.armLength, allowedLength, attenuation(config.armExtendResponse, dt));
  state.position.copy(anchor).addScaledVector(arm, Math.min(state.armLength, wantedLength) / Math.max(wantedLength, .0001));
  // Recheck after interpolation for unusual non-radial collision corrections.
  if (typeof config.collision === 'function') {
    const result = config.collision(anchor, state.position, config.cameraRadius);
    const point = result?.position || result;
    if (point && [point.x, point.y, point.z].every(Number.isFinite)) state.position.copy(point);
    state.collisionHit ||= Boolean(result?.hit);
  }
  state.focus.copy(body).add(state.lookOffset);
  const targetRoll = config.followRoll ? finite(pilot?.bank, 0) + finite(pilot?.trickRoll, 0) : 0;
  if (snap) state.horizonRoll = targetRoll;
  else state.horizonRoll += wrap(targetRoll - state.horizonRoll) * attenuation(10, dt);
  state.up.set(0, 1, 0);
  if (Math.abs(state.horizonRoll) > .00001) {
    direction.copy(state.focus).sub(state.position).normalize();
    state.up.applyAxisAngle(direction, state.horizonRoll);
  }
  const targetFov = config.fov + MathUtils.clamp(speed - 17, 0, 20) * .2;
  state.fov = snap ? targetFov : MathUtils.lerp(state.fov, targetFov, attenuation(4, dt));
  return state;
}
