import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { createFlightState, stepFlight, resetFlight, requestTrick } from './phoenix-flight-core.mjs';
import { createCollisionWorld } from './phoenix-collision.mjs';
import { createCameraState, updateCameraRig } from './phoenix-camera.mjs';
import { prepareIsland, createPhoenixVisual } from './phoenix-model.mjs';
import { readFlightCommands } from './phoenix-input.mjs';

const $ = id => document.getElementById(id);
const app = $('flight-app'), canvas = $('flight-canvas');
const coarse = matchMedia('(pointer: coarse)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const keys = new Set();
const pointer = { turn: 0, climb: 0, forward: 0, boost: false, vertical: 0, active: false };
const heldTouch = new Map();
const scene = new THREE.Scene();
scene.background = new THREE.Color('#050b25');
scene.fog = new THREE.FogExp2('#081530', .00065);
const camera = new THREE.PerspectiveCamera(57, innerWidth / innerHeight, .2, 2200);
const actor = new THREE.Group();
actor.name = 'PhoenixPilot'; scene.add(actor);
const cameraPosition = new THREE.Vector3(245, 178, 280);
const cameraFocus = new THREE.Vector3(0, 28, 0);
const desiredCamera = new THREE.Vector3(), desiredFocus = new THREE.Vector3();
const actorRotation = new THREE.Euler(0, 0, 0, 'YXZ');
const progress = { island: 0, phoenix: 0 };
const spawn = { position: { x: 64, y: 78, z: 155 }, yaw: Math.atan2(-64, 155) };
const flight = createFlightState({ ...spawn, worldRadius: 360, maximumAltitude: 180, bodyRadius: 1.2 });
const chase = createCameraState(flight);
let renderer, phoenix, collision, started = false, paused = false, overview = false;
let loaded = false, hidden = document.hidden, previousTime = null, frame = 0, frames = 0, hudClock = 0;
let introClock = 0, failed = false, pointerOrigin = null;
let steeringPointerId = null;
let frameMilliseconds = 16.7;
let feedbackUntil = 0;
const islandView = { angle: Math.atan2(245, 280), elevation: .4, distance: 400 };
const islandOrbit = { ...islandView };

// Baked island textures carry the original art direction. Light the bird gently.
scene.add(new THREE.HemisphereLight('#cfddff', '#18384e', .65));
const moon = new THREE.DirectionalLight('#b5d6ff', 1.25);
moon.position.set(-140, 260, 100); scene.add(moon);
const warm = new THREE.DirectionalLight('#ffc782', .5);
warm.position.set(100, 40, -90); scene.add(warm);

function clearInput() {
  keys.clear(); pointer.turn = 0; pointer.climb = 0; pointer.forward = 0; pointer.vertical = 0; pointer.boost = false; pointer.stop = false;
  pointer.active = false; pointerOrigin = null; steeringPointerId = null; heldTouch.clear();
  $('flight-stick').querySelector('span').style.transform = '';
}

function updateLoading(name, event) {
  progress[name] = event.total > 0 ? event.loaded / event.total : Math.max(progress[name], .15);
  const value = Math.min(95, Math.round((progress.island * 11960316 + progress.phoenix * 1630364) / 13590680 * 95));
  $('asset-progress').setAttribute('aria-valuenow', String(value));
  $('asset-progress').querySelector('i').style.width = value + '%';
  $('load-status').textContent = value < 90 ? 'Bringing the island into view… ' + value + '%' : 'Preparing your flight…';
}

function updateActor() {
  actor.position.set(flight.position.x, flight.position.y, flight.position.z);
  actorRotation.set(flight.pitch + flight.trickPitch, -flight.yaw, flight.bank + flight.trickRoll, 'YXZ');
  actor.quaternion.setFromEuler(actorRotation);
}

function updateCamera(dt, snap = false) {
  if (!started || overview) {
    const drift = !started && !reduced.matches ? Math.sin(introClock * .04) * .045 : 0;
    const fit = Math.max(1, .85 / camera.aspect);
    for (const key of ['angle', 'elevation', 'distance']) islandOrbit[key] = snap ? islandView[key] : THREE.MathUtils.damp(islandOrbit[key], islandView[key], 6, dt);
    const distance = islandOrbit.distance * fit, angle = islandOrbit.angle + drift;
    desiredCamera.set(Math.sin(angle) * distance * Math.cos(islandOrbit.elevation), 28 + Math.sin(islandOrbit.elevation) * distance, Math.cos(angle) * distance * Math.cos(islandOrbit.elevation));
    desiredFocus.set(0, 28, 0);
  } else {
    updateCameraRig(chase, flight, dt, { aspect: camera.aspect, collision: collision?.clipCamera }, snap);
    cameraPosition.copy(chase.position); cameraFocus.copy(chase.focus);
    camera.up.copy(chase.up); camera.fov = chase.fov;
    camera.position.copy(cameraPosition); camera.lookAt(cameraFocus); camera.updateProjectionMatrix();
    return;
  }
  // Damp orbit coordinates instead of cutting a chord through the island.
  cameraPosition.copy(desiredCamera); cameraFocus.copy(desiredFocus);
  camera.position.copy(cameraPosition); camera.lookAt(cameraFocus);
  const targetFov = started && !overview ? 57 + Math.max(0, flight.speed - 17) * .38 : 57;
  camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 2.5, dt);
  camera.updateProjectionMatrix();
}

function updateHUD() {
  const radius = Math.hypot(flight.position.x, flight.position.z);
  $('flight-location').textContent = radius < 125 ? 'Above the island' : radius < 200 ? 'Along the coast' : 'Over open water';
  const commands = readInput();
  $('flight-state').textContent = overview ? 'Drag / arrows to orbit · scroll to zoom' : flight.trick ? (flight.trick.name === 'loop' ? 'Looping' : 'Rolling') : flight.blocked ? 'Obstacle · choose another direction' : flight.actualSpeed < .05 ? 'Hovering · waiting for your command' : commands.climb > 0 ? 'Ascending' : commands.climb < 0 ? 'Descending' : commands.forward < 0 ? 'Moving backward' : commands.strafe ? 'Moving sideways' : 'Moving forward';
  $('speed-value').textContent = Math.round(flight.actualSpeed ?? flight.speed);
  $('height-value').textContent = Math.round(flight.position.y);
  canvas.dataset.x = flight.position.x.toFixed(2); canvas.dataset.y = flight.position.y.toFixed(2); canvas.dataset.z = flight.position.z.toFixed(2);
  canvas.dataset.speed = flight.speed.toFixed(2); canvas.dataset.heading = flight.yaw.toFixed(3);
  canvas.dataset.pitch = flight.pitch.toFixed(3); canvas.dataset.bank = flight.bank.toFixed(3);
  canvas.dataset.frames = String(frames); canvas.dataset.paused = String(paused);
  canvas.dataset.fps = (1000 / Math.max(frameMilliseconds, 1)).toFixed(1);
  canvas.dataset.drawCalls = String(renderer.info.render.calls);
  canvas.dataset.input = Array.from(keys).join(',');
  canvas.dataset.trick = flight.trick?.name || '';
  canvas.dataset.trickRoll = flight.trickRoll.toFixed(3);
  canvas.dataset.trickPitch = flight.trickPitch.toFixed(3);
  canvas.dataset.blocked = String(flight.blocked);
  canvas.dataset.cameraY = camera.position.y.toFixed(2);
  canvas.dataset.vx = flight.velocity.x.toFixed(3); canvas.dataset.vy = flight.velocity.y.toFixed(3); canvas.dataset.vz = flight.velocity.z.toFixed(3);
  if (performance.now() > feedbackUntil) $('flight-feedback').textContent = '';
}

function trick(type) {
  if (!started || paused || overview) return;
  if (!requestTrick(flight, type)) {
    $('flight-feedback').textContent = flight.trickRejectedReason || 'Find some open sky before trying that maneuver.';
    feedbackUntil = performance.now() + 4000;
  }
  canvas.focus({ preventScroll: true });
}

function readInput() {
  return overview ? { brake: true } : readFlightCommands(keys, pointer);
}

function loop(now) {
  frame = 0;
  if (hidden || failed || !renderer) { previousTime = null; return; }
  const elapsed = previousTime === null ? 0 : (now - previousTime) / 1000;
  if (elapsed > 0) frameMilliseconds = THREE.MathUtils.lerp(frameMilliseconds, elapsed * 1000, .15);
  const dt = Math.min(elapsed, .05);
  previousTime = now;
  if (loaded) {
    if (started && !paused) {
      stepFlight(flight, readInput(), dt);
      updateActor();
      phoenix.update(dt, flight.speed);
    } else if (!started && !reduced.matches) {
      introClock += dt; phoenix.update(dt * .75);
    }
    if (!paused) updateCamera(dt);
    hudClock += dt;
    if (hudClock >= .1) { updateHUD(); hudClock = 0; }
  }
  renderer.render(scene, camera); frames++;
  if (!paused && !(loaded && !started && reduced.matches)) frame = requestAnimationFrame(loop);
}

function wake() {
  cancelAnimationFrame(frame); frame = 0; previousTime = null;
  if (!hidden && !failed) frame = requestAnimationFrame(loop);
}

function resize() {
  if (!renderer) return;
  const { width, height } = app.getBoundingClientRect();
  camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse.matches ? 1 : 1.25));
  renderer.setSize(width, height, false); wake();
}

function pause(value) {
  if (!started || failed) return;
  paused = value; clearInput();
  $('pause-panel').hidden = !paused;
  $('flight-pause').textContent = paused ? 'Resume' : 'Pause';
  $('flight-pause').setAttribute('aria-pressed', String(paused));
  app.dataset.mode = paused ? 'paused' : 'flying';
  updateHUD(); wake();
  if (paused) $('flight-resume').focus();
  else canvas.focus({ preventScroll: true });
}

function reset() {
  resetFlight(flight); clearInput();
  updateActor(); phoenix.reset();
  updateCamera(0, true); updateHUD(); previousTime = null;
  if (paused) pause(false); else { wake(); canvas.focus({ preventScroll: true }); }
}

function toggleView() {
  overview = !overview; clearInput();
  $('view-toggle').textContent = overview ? 'Follow phoenix' : 'Island view';
  $('view-toggle').setAttribute('aria-pressed', String(overview));
  canvas.dataset.camera = overview ? 'overview' : 'follow';
  updateHUD();
  updateCamera(0, true); renderer.render(scene, camera);
  if (!paused) canvas.focus({ preventScroll: true });
}

function fail(error) {
  console.error('Phoenix flight could not start.', error);
  failed = true; cancelAnimationFrame(frame); clearInput();
  app.dataset.status = 'error'; $('flight-intro').hidden = true;
  $('flight-error').hidden = false;
  $('error-detail').textContent = error?.message?.includes('WebGL') ? 'This browser could not start 3D graphics. The complete résumé is still available.' : 'A world asset could not load. Please reload, or open the quick résumé.';
}

async function initialize() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  camera.position.copy(cameraPosition); camera.lookAt(cameraFocus);
  new ResizeObserver(resize).observe(app);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); fail(new Error('WebGL context lost')); });
  const loader = new GLTFLoader();
  const [islandAsset, birdAsset] = await Promise.all([
    loader.loadAsync(new URL('./media/phoenix-island/island.glb', import.meta.url).href, e => updateLoading('island', e)),
    loader.loadAsync(new URL('./media/phoenix-island/phoenix.glb', import.meta.url).href, e => updateLoading('phoenix', e)),
  ]);
  const { root: islandRoot, solid } = prepareIsland(islandAsset);
  scene.add(islandRoot);
  collision = createCollisionWorld(solid);
  flight.config.resolveMotion = collision.constrainMotion;
  resetFlight(flight);
  phoenix = createPhoenixVisual(birdAsset); actor.add(phoenix.group);
  updateActor(); phoenix.reset();
  // Warm the real skinned/material shaders before accepting flight input.
  // Otherwise a first-flight shader stall can consume most of a held gesture.
  await renderer.compileAsync(scene, camera);
  loaded = true; app.dataset.status = 'ready'; app.dataset.mode = 'intro';
  canvas.dataset.animation = phoenix.clip.name; canvas.dataset.camera = 'overview';
  $('flight-start').disabled = false; $('start-label').textContent = 'Take flight';
  $('load-status').textContent = coarse.matches ? 'The stick moves and turns. ↑ / ↓ move straight up and down. Release to hover.' : 'W/S forward/back · A/D sideways · ←/→ turn · Space/C up/down. Release to hover.';
  $('asset-progress').querySelector('i').style.width = '100%'; $('asset-progress').setAttribute('aria-valuenow', '100');
  resize(); updateHUD(); wake();
}

$('flight-start').addEventListener('click', () => {
  if (!loaded) return;
  started = true; paused = false; overview = false; app.dataset.mode = 'flying';
  $('flight-intro').hidden = true; $('flight-hud').hidden = false;
  $('flight-pause').hidden = false; $('view-toggle').hidden = false;
  $('touch-controls').hidden = !coarse.matches;
  canvas.dataset.camera = 'follow'; clearInput(); previousTime = null;
  canvas.focus({ preventScroll: true }); wake();
});
$('flight-pause').addEventListener('click', () => pause(!paused));
$('flight-resume').addEventListener('click', () => pause(false));
$('flight-reset').addEventListener('click', reset);
$('view-toggle').addEventListener('click', toggleView);
for (const [id, type] of [['touch-roll-left','rollLeft'], ['touch-roll-right','rollRight'], ['touch-loop','loop']]) $(id).addEventListener('click', () => trick(type));
$('credits-toggle').addEventListener('click', () => {
  const visible = $('flight-credits').hidden;
  $('flight-credits').hidden = !visible; $('credits-toggle').setAttribute('aria-expanded', String(visible));
});
$('credits-close').addEventListener('click', () => {
  $('flight-credits').hidden = true; $('credits-toggle').setAttribute('aria-expanded', 'false');
  if (started && !paused) canvas.focus({ preventScroll: true });
});

window.addEventListener('keydown', event => {
  if (!started || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'Escape' || event.code === 'KeyP') { if (!event.repeat) pause(!paused); event.preventDefault(); return; }
  if (event.target instanceof Element && event.target.closest('button,a,aside')) return;
  if (overview && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)) {
    event.preventDefault();
    islandView.angle += event.code === 'ArrowRight' ? .14 : event.code === 'ArrowLeft' ? -.14 : 0;
    islandView.elevation = THREE.MathUtils.clamp(islandView.elevation + (event.code === 'ArrowUp' ? .08 : event.code === 'ArrowDown' ? -.08 : 0), .12, 1.45);
    if (paused) { updateCamera(0, true); renderer.render(scene, camera); }
    return;
  }
  if (paused) return;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyC','KeyX','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight'].includes(event.code)) {
    keys.add(event.code); event.preventDefault();
  }
  if (event.code === 'KeyR' && !event.repeat) reset();
  if (event.code === 'KeyF' && !event.repeat) toggleView();
  const maneuver = { KeyQ: 'rollLeft', KeyE: 'rollRight', KeyL: 'loop' }[event.code];
  if (maneuver) { event.preventDefault(); if (!event.repeat) trick(maneuver); }
});
window.addEventListener('keyup', event => { keys.delete(event.code); });
window.addEventListener('blur', () => { clearInput(); if (started && !paused) pause(true); });
document.addEventListener('visibilitychange', () => {
  hidden = document.hidden; clearInput();
  if (hidden && started && !paused) pause(true);
  wake();
});

function bindSteering(element, isStick = false) {
  element.addEventListener('pointerdown', event => {
    if (!started || paused && !overview || event.button > 0 || steeringPointerId !== null) return;
    steeringPointerId = event.pointerId;
    pointer.active = true; pointerOrigin = { x: event.clientX, y: event.clientY, angle: islandView.angle, elevation: islandView.elevation };
    element.setPointerCapture(event.pointerId);
    if (!isStick) canvas.focus({ preventScroll: true });
  });
  element.addEventListener('pointermove', event => {
    if (!pointer.active || !pointerOrigin || event.pointerId !== steeringPointerId) return;
    if (overview) {
      islandView.angle = pointerOrigin.angle - (event.clientX - pointerOrigin.x) * .006;
      islandView.elevation = THREE.MathUtils.clamp(pointerOrigin.elevation + (event.clientY - pointerOrigin.y) * .004, .12, 1.45);
      if (paused) { updateCamera(0, true); renderer.render(scene, camera); }
      return;
    }
    const max = isStick ? 35 : Math.min(innerWidth, innerHeight) * .18;
    const x = THREE.MathUtils.clamp((event.clientX - pointerOrigin.x) / max, -1, 1);
    const y = THREE.MathUtils.clamp((event.clientY - pointerOrigin.y) / max, -1, 1);
    pointer.turn = x;
    if (isStick) pointer.forward = -y;
    else pointer.climb = -y;
    if (isStick) element.querySelector('span').style.transform = `translate(${x * 29}px,${y * 29}px)`;
  });
  const release = event => {
    if (event.pointerId !== steeringPointerId) return;
    steeringPointerId = null; pointer.active = false; pointerOrigin = null; pointer.turn = 0; pointer.climb = 0; pointer.forward = 0;
    if (isStick) element.querySelector('span').style.transform = '';
  };
  element.addEventListener('pointerup', release); element.addEventListener('pointercancel', release);
  element.addEventListener('lostpointercapture', release);
}
bindSteering(canvas); bindSteering($('flight-stick'), true);
canvas.addEventListener('wheel', event => {
  if (!started || !overview) return;
  event.preventDefault();
  islandView.distance = THREE.MathUtils.clamp(islandView.distance * Math.exp(event.deltaY * .001), 140, 650);
  if (paused) { updateCamera(0, true); renderer.render(scene, camera); }
}, { passive: false });
function updateTouchActions() {
  const actions = [...heldTouch.values()];
  pointer.vertical = (actions.includes('climb') ? 1 : 0) - (actions.includes('descend') ? 1 : 0);
  pointer.boost = actions.includes('boost');
}
function holdButton(id, action) {
  const button = $(id);
  button.addEventListener('pointerdown', e => {
    if (!started || paused) return;
    e.preventDefault(); button.setPointerCapture(e.pointerId);
    heldTouch.set(e.pointerId, action); updateTouchActions();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, e => {
    heldTouch.delete(e.pointerId); updateTouchActions();
  });
}
holdButton('touch-climb', 'climb'); holdButton('touch-descend', 'descend'); holdButton('touch-boost', 'boost');

initialize().catch(fail);
