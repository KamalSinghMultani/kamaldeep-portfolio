import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { createFlightState, stepFlight, resetFlight } from './phoenix-flight-core.mjs';
import { buildTerrainField } from './phoenix-terrain.mjs';

const $ = id => document.getElementById(id);
const app = $('flight-app'), canvas = $('flight-canvas');
const coarse = matchMedia('(pointer: coarse)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const keys = new Set();
const pointer = { turn: 0, climb: 0, boost: false, vertical: 0, active: false };
const scene = new THREE.Scene();
scene.background = new THREE.Color('#050b25');
scene.fog = new THREE.FogExp2('#081530', .00065);
const camera = new THREE.PerspectiveCamera(57, innerWidth / innerHeight, .2, 2200);
const actor = new THREE.Group();
actor.name = 'PhoenixPilot'; scene.add(actor);
const visual = new THREE.Group();
visual.rotation.y = 1.5171840055;
visual.scale.setScalar(.0062019383);
actor.add(visual);
const cameraPosition = new THREE.Vector3(245, 178, 280);
const cameraFocus = new THREE.Vector3(0, 28, 0);
const desiredCamera = new THREE.Vector3(), desiredFocus = new THREE.Vector3();
const position = new THREE.Vector3(), forward = new THREE.Vector3(), behind = new THREE.Vector3();
const actorRotation = new THREE.Euler(0, 0, 0, 'YXZ');
const progress = { island: 0, phoenix: 0 };
const spawn = { position: { x: 64, y: 78, z: 155 }, yaw: Math.atan2(-64, 155) };
const flight = createFlightState({ ...spawn, worldRadius: 360, maximumAltitude: 180, terrainClearance: 7, terrainLookAhead: 3.5 });
let renderer, mixer, wingAction, terrain, started = false, paused = false, overview = false;
let loaded = false, hidden = document.hidden, previousTime = null, frame = 0, frames = 0, hudClock = 0;
let introClock = 0, failed = false, pointerOrigin = null;
let frameMilliseconds = 16.7;

// Baked island textures carry the original art direction. Light the bird gently.
scene.add(new THREE.HemisphereLight('#cfddff', '#18384e', .65));
const moon = new THREE.DirectionalLight('#b5d6ff', 1.25);
moon.position.set(-140, 260, 100); scene.add(moon);
const warm = new THREE.DirectionalLight('#ffc782', .5);
warm.position.set(100, 40, -90); scene.add(warm);

function clearInput() {
  keys.clear(); pointer.turn = 0; pointer.climb = 0; pointer.vertical = 0; pointer.boost = false;
  pointer.active = false; pointerOrigin = null;
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
  actorRotation.set(flight.pitch, -flight.yaw, flight.bank, 'YXZ');
  actor.quaternion.setFromEuler(actorRotation);
}

function updateCamera(dt, snap = false) {
  if (!started || overview) {
    const drift = !started && !reduced.matches ? Math.sin(introClock * .04) * .045 : 0;
    const fit = Math.max(1, .85 / camera.aspect);
    desiredCamera.set((245 * Math.cos(drift) - 280 * Math.sin(drift)) * fit, 28 + 150 * fit, (280 * Math.cos(drift) + 245 * Math.sin(drift)) * fit);
    desiredFocus.set(0, 28, 0);
  } else {
    position.copy(actor.position);
    forward.set(Math.sin(flight.yaw), 0, -Math.cos(flight.yaw));
    const portrait = Math.max(1, .8 / camera.aspect);
    behind.copy(forward).multiplyScalar(-(12 + flight.speed * .06) * portrait);
    desiredCamera.copy(position).add(behind);
    desiredCamera.y += 6.5 * Math.sqrt(portrait) + Math.max(0, flight.pitch) * 3;
    // Keep the camera clear of the terrain, independently of the flight rig.
    desiredCamera.y = Math.max(desiredCamera.y, (terrain?.heightAt(desiredCamera.x, desiredCamera.z) || 0) + 9);
    desiredFocus.copy(position).addScaledVector(forward, 9);
    desiredFocus.y += 1.8 + flight.pitch * 6;
  }
  if (snap) { cameraPosition.copy(desiredCamera); cameraFocus.copy(desiredFocus); }
  else {
    const response = started && !overview ? 3.2 : 2;
    cameraPosition.lerp(desiredCamera, 1 - Math.exp(-response * dt));
    cameraFocus.lerp(desiredFocus, 1 - Math.exp(-4.5 * dt));
  }
  camera.position.copy(cameraPosition); camera.lookAt(cameraFocus);
  const targetFov = started && !overview ? 57 + Math.max(0, flight.speed - 17) * .38 : 57;
  camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 2.5, dt);
  camera.updateProjectionMatrix();
}

function updateHUD() {
  const radius = Math.hypot(flight.position.x, flight.position.z);
  $('flight-location').textContent = radius < 125 ? 'Above the island' : radius < 200 ? 'Along the coast' : 'Over open water';
  $('flight-state').textContent = flight.boundaryAssist > .1 ? 'Turning toward the island' : flight.terrainAssist ? 'Clearing the terrain' : pointer.boost || keys.has('ShiftLeft') || keys.has('ShiftRight') ? 'Soaring' : flight.speed < 8 ? 'Gliding slowly' : 'Cruising';
  $('speed-value').textContent = Math.round(flight.speed);
  $('height-value').textContent = Math.round(flight.position.y);
  canvas.dataset.x = flight.position.x.toFixed(2); canvas.dataset.y = flight.position.y.toFixed(2); canvas.dataset.z = flight.position.z.toFixed(2);
  canvas.dataset.speed = flight.speed.toFixed(2); canvas.dataset.heading = flight.yaw.toFixed(3);
  canvas.dataset.pitch = flight.pitch.toFixed(3); canvas.dataset.bank = flight.bank.toFixed(3);
  canvas.dataset.frames = String(frames); canvas.dataset.paused = String(paused);
  canvas.dataset.fps = (1000 / Math.max(frameMilliseconds, 1)).toFixed(1);
  canvas.dataset.drawCalls = String(renderer.info.render.calls);
  canvas.dataset.input = Array.from(keys).join(',');
}

function readInput() {
  const turn = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const climb = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  return {
    turn: THREE.MathUtils.clamp(turn + pointer.turn, -1, 1),
    climb: THREE.MathUtils.clamp(climb + pointer.climb + pointer.vertical, -1, 1),
    boost: pointer.boost || keys.has('ShiftLeft') || keys.has('ShiftRight'),
    brake: keys.has('Space'),
  };
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
      wingAction.setEffectiveTimeScale(THREE.MathUtils.lerp(.85, 1.3, THREE.MathUtils.clamp((flight.speed - 3) / 27, 0, 1)));
      mixer.update(dt);
    } else if (!started && !reduced.matches) {
      introClock += dt; mixer.update(dt * .75);
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
  mixer.setTime(0); updateActor();
  updateCamera(0, true); updateHUD(); previousTime = null;
  if (paused) pause(false); else { wake(); canvas.focus({ preventScroll: true }); }
}

function toggleView() {
  overview = !overview;
  $('view-toggle').textContent = overview ? 'Follow phoenix' : 'Island view';
  $('view-toggle').setAttribute('aria-pressed', String(overview));
  canvas.dataset.camera = overview ? 'overview' : 'follow';
  if (paused) { updateCamera(0, true); renderer.render(scene, camera); }
  else canvas.focus({ preventScroll: true });
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
  const island = islandAsset.scene;
  const islandRoot = new THREE.Group();
  islandRoot.scale.setScalar(1.866809003874327);
  islandRoot.position.set(-1.5093930651, 407.1977139701, 1.8787131657);
  islandRoot.add(island); scene.add(islandRoot); islandRoot.updateMatrixWorld(true);
  const solid = [];
  island.traverse(object => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(material => {
      material.emissiveIntensity = .78;
      material.metalness = 0; material.roughness = 1;
      if (material.transparent) { material.depthWrite = false; material.alphaTest = .02; }
    });
    if (/ISLE_17_/.test(object.name) && !/ile-o_|ile-ecume|ile-nuage|LUNE|ile-lave|bato-|palmier-feuilles/.test(object.name)) solid.push(object);
  });
  // One geometry-derived bake; every controller step then uses a cheap lookup.
  terrain = buildTerrainField(solid);
  flight.config.groundHeight = terrain.heightAt;
  resetFlight(flight);

  const bird = birdAsset.scene;
  bird.position.set(41.22199, -116.22089, 14.98684);
  bird.traverse(object => {
    if (!object.isMesh) return;
    if (object.isSkinnedMesh) object.frustumCulled = false;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(material => {
      material.emissiveIntensity = .95; material.roughness = .85; material.metalness = 0;
      material.alphaTest = .025; material.depthWrite = false;
    });
  });
  visual.add(bird);
  mixer = new THREE.AnimationMixer(bird);
  const clip = birdAsset.animations.find(animation => animation.name === 'Take 001') || birdAsset.animations[0];
  if (!clip) throw new Error('The phoenix has no supplied flight animation.');
  wingAction = mixer.clipAction(clip); wingAction.play(); mixer.update(0);
  updateActor(); loaded = true; app.dataset.status = 'ready'; app.dataset.mode = 'intro';
  canvas.dataset.animation = clip.name; canvas.dataset.camera = 'overview';
  $('flight-start').disabled = false; $('start-label').textContent = 'Take flight';
  $('load-status').textContent = coarse.matches ? 'Drag to steer. Use the arrows to climb or descend.' : 'W A S D or arrow keys to steer. Dragging works too.';
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
$('credits-toggle').addEventListener('click', () => {
  const visible = $('flight-credits').hidden;
  $('flight-credits').hidden = !visible; $('credits-toggle').setAttribute('aria-expanded', String(visible));
});
$('credits-close').addEventListener('click', () => { $('flight-credits').hidden = true; $('credits-toggle').setAttribute('aria-expanded', 'false'); });

window.addEventListener('keydown', event => {
  if (!started || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'Escape' || event.code === 'KeyP') { if (!event.repeat) pause(!paused); event.preventDefault(); return; }
  if (event.target.closest('button,a,aside')) return;
  if (paused) return;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight'].includes(event.code)) {
    keys.add(event.code); event.preventDefault();
  }
  if (event.code === 'KeyR' && !event.repeat) reset();
  if (event.code === 'KeyF' && !event.repeat) toggleView();
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
    if (!started || paused || event.button > 0) return;
    pointer.active = true; pointerOrigin = { x: event.clientX, y: event.clientY };
    element.setPointerCapture(event.pointerId);
    if (!isStick) canvas.focus({ preventScroll: true });
  });
  element.addEventListener('pointermove', event => {
    if (!pointer.active || !pointerOrigin) return;
    const max = isStick ? 35 : Math.min(innerWidth, innerHeight) * .18;
    const x = THREE.MathUtils.clamp((event.clientX - pointerOrigin.x) / max, -1, 1);
    const y = THREE.MathUtils.clamp((event.clientY - pointerOrigin.y) / max, -1, 1);
    pointer.turn = x; pointer.climb = -y;
    if (isStick) element.querySelector('span').style.transform = `translate(${x * 29}px,${y * 29}px)`;
  });
  const release = () => { pointer.active = false; pointerOrigin = null; pointer.turn = 0; pointer.climb = 0; if (isStick) element.querySelector('span').style.transform = ''; };
  element.addEventListener('pointerup', release); element.addEventListener('pointercancel', release);
  element.addEventListener('lostpointercapture', release);
}
bindSteering(canvas); bindSteering($('flight-stick'), true);
function holdButton(id, down, up) {
  const button = $(id);
  button.addEventListener('pointerdown', e => { if (paused) return; e.preventDefault(); button.setPointerCapture(e.pointerId); down(); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, up);
}
holdButton('touch-climb', () => { pointer.vertical = 1; }, () => { pointer.vertical = 0; });
holdButton('touch-descend', () => { pointer.vertical = -1; }, () => { pointer.vertical = 0; });
holdButton('touch-boost', () => { pointer.boost = true; }, () => { pointer.boost = false; });

initialize().catch(fail);
