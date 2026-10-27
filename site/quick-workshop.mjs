import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { choreography, Playback } from './quick-workshop-core.mjs';

const stage = document.getElementById('workshop-stage');
const canvas = document.getElementById('workshop-canvas');
const hello = document.getElementById('workshop-hello');
const replay = document.getElementById('workshop-replay');
const progress = document.getElementById('workshop-progress');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const playback = new Playback(reduced.matches);
let renderer, frame = 0, mixer, activeAction, actor, actions, greeting = 0, disposed = false;
let loaded = false, pointerX = 0, pointerY = 0, cameraX = 0, cameraY = 0;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#e7e5df');
const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, .1, 60);
const focus = new THREE.Vector3(0, 1.1, 0);
const heading = new THREE.Quaternion();
const axis = new THREE.Vector3(0, 1, 0);
const cream = new THREE.MeshStandardMaterial({ color: '#f8f5ed', roughness: .64, metalness: .08 });
const graphite = new THREE.MeshStandardMaterial({ color: '#282b2d', roughness: .52, metalness: .3 });
const red = new THREE.MeshStandardMaterial({ color: '#c9263e', roughness: .42, metalness: .15 });
const dark = new THREE.MeshStandardMaterial({ color: '#13191d', roughness: .38, metalness: .25 });
const signal = new THREE.MeshStandardMaterial({ color: '#ed3654', emissive: '#e12648', emissiveIntensity: .3, roughness: .3 });

function box(x, y, z, w, h, d, material, parent = scene) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
function curve(points, material, radius = .018) {
  const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 32, radius, 6, false), material);
  scene.add(mesh); return path;
}

scene.add(new THREE.HemisphereLight('#fff9ea', '#808b9a', 2.6));
const key = new THREE.DirectionalLight('#fff5df', 4.2);
key.position.set(-3, 8, 6); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -5, right: 5, top: 6, bottom: -4, near: .5, far: 25 });
key.shadow.normalBias = .035; key.shadow.bias = -.0001;
key.shadow.radius = 4; scene.add(key);
const rim = new THREE.DirectionalLight('#ffffff', 2); rim.position.set(4, 4, -4); scene.add(rim);

// A tangible miniature: stage, console, server, desk lamp, and connecting cables.
const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.25, 3.25, .28, 96), cream);
plinth.position.y = -.17; plinth.receiveShadow = true; plinth.castShadow = true; scene.add(plinth);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: .16 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -.32; ground.receiveShadow = true; scene.add(ground);
const ring = new THREE.Mesh(new THREE.TorusGeometry(2.96, .012, 6, 100), new THREE.MeshBasicMaterial({ color: '#c8c5bd' }));
ring.rotation.x = Math.PI / 2; ring.position.y = -.022; scene.add(ring);

const desk = new THREE.Group(); desk.position.set(.6, 0, -1.05); scene.add(desk);
box(0, 1.16, 0, 2.1, .12, .88, cream, desk);
for (const x of [-.82, .82]) box(x, .55, 0, .09, 1.1, .58, graphite, desk);
box(-.25, 1.36, -.1, .08, .35, .1, graphite, desk);
box(-.25, 1.25, -.05, .52, .04, .3, graphite, desk);
const monitor = box(-.25, 1.76, -.16, 1.12, .73, .09, graphite, desk);
monitor.rotation.x = -.09;
const screen = box(-.25, 1.76, -.104, 1.02, .62, .015, dark, desk);
screen.rotation.x = -.09;
const screenGroup = new THREE.Group(); screenGroup.position.set(-.7, 1.9, -.065); desk.add(screenGroup);
for (let i = 0; i < 5; i++) box(.07 + (i % 2) * .09, -i * .085, .02, [.48, .64, .33, .54, .42][i], .018, .012, i === 2 ? signal : cream, screenGroup);
box(-.22, 1.236, .23, .76, .025, .22, graphite, desk);
for (let row = 0; row < 3; row++) for (let col = 0; col < 10; col++) box(-.55 + col * .073, 1.252, .16 + row * .06, .046, .012, .035, cream, desk);
const lamp = new THREE.Group(); lamp.position.set(.78, 1.24, -.05); desk.add(lamp);
box(0, .02, 0, .25, .04, .25, red, lamp); box(0, .24, 0, .04, .45, .04, red, lamp);
const lampShade = new THREE.Mesh(new THREE.ConeGeometry(.22, .24, 32, 1, true), red);
lampShade.position.set(-.07, .52, 0); lampShade.rotation.z = .4; lamp.add(lampShade);

const rack = new THREE.Group(); rack.position.set(2.05, 0, .05); scene.add(rack);
box(0, .69, 0, .7, 1.38, .75, graphite, rack);
const leds = [];
for (let i = 0; i < 3; i++) {
  box(0, .34 + i * .37, .39, .59, .29, .025, dark, rack);
  for (let j = 0; j < 4; j++) box(-.18 + j * .085, .34 + i * .37, .411, .035, .11, .012, graphite, rack);
  const light = box(.23, .34 + i * .37, .413, .035, .035, .012, signal.clone(), rack); leds.push(light);
}
const cables = [
  curve([[1.9, .04, .55], [1.75, .04, 1.4], [.8, .04, 1.7], [.1, .04, 1.2]], red),
  curve([[1.7, .04, .32], [1.3, .04, .68], [.6, .04, .55], [.3, .04, -.65]], graphite),
];
const packets = cables.map(path => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(.044, 12, 8), signal);
  scene.add(mesh); return { mesh, path };
});
// Small hardware details give the scene a readable purpose at normal page size.
box(-2.15, .12, -.8, .44, .24, .44, red);
for (let i = 0; i < 3; i++) box(-2.15, .085 + i * .065, -.57, .27, .014, .012, cream);
const plant = new THREE.Group(); plant.position.set(-1.8, 0, -1.6); scene.add(plant);
const pot = new THREE.Mesh(new THREE.CylinderGeometry(.22, .16, .32, 24), graphite); pot.position.y = .16; plant.add(pot);
for (let i = 0; i < 5; i++) {
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 8), red);
  leaf.scale.set(.45, 2.8, .4); leaf.position.set(Math.sin(i * 2.4) * .12, .5, Math.cos(i * 2.4) * .12);
  leaf.rotation.z = Math.sin(i * 2.4) * .55; plant.add(leaf);
}

function transition(name) {
  const next = actions?.[name];
  if (!next || next === activeAction) return;
  next.reset().setEffectiveWeight(1).setEffectiveTimeScale(name === 'Walking' ? .8 : 1).play();
  if (activeAction) next.crossFadeFrom(activeAction, .28, true);
  activeAction = next;
  canvas.dataset.action = name;
}

function draw(dt = 0) {
  if (!renderer || disposed) return;
  const pose = choreography(playback.time);
  if (actor) {
    actor.position.set(pose.x, 0, pose.z);
    heading.setFromAxisAngle(axis, greeting > 0 ? .42 : pose.heading);
    if (dt > 0) actor.quaternion.rotateTowards(heading, dt * 4.5);
    else if (!loaded) actor.quaternion.copy(heading);
    if (greeting > 0) greeting = Math.max(0, greeting - dt);
    transition(greeting > 0 ? 'Wave' : pose.action);
    mixer.update(dt);
  }
  if (dt > 0 && !playback.paused) {
    cameraX = THREE.MathUtils.damp(cameraX, pointerX, 4, dt);
    cameraY = THREE.MathUtils.damp(cameraY, pointerY, 4, dt);
  }
  camera.position.set(7.5 + cameraX * .65, 6 + cameraY * .35, 10);
  camera.lookAt(focus);
  leds.forEach((led, i) => { led.material.emissiveIntensity = .15 + pose.connected * (i + 1) * .3; });
  packets.forEach(({ mesh, path }, i) => {
    mesh.visible = pose.connected > .5;
    mesh.position.copy(path.getPointAt((playback.time * .16 + i * .5) % 1));
  });
  progress.style.transform = `scaleX(${pose.time / 20})`;
  canvas.dataset.sceneTime = playback.time.toFixed(2);
  canvas.dataset.paused = String(playback.paused);
  renderer.render(scene, camera);
}

function loop(now) {
  frame = 0;
  if (!playback.running || disposed) return;
  const dt = playback.tick(now);
  if (greeting > 0) playback.time -= dt;
  draw(dt);
  frame = requestAnimationFrame(loop);
}
function wake() {
  cancelAnimationFrame(frame); frame = 0; playback.resetClock();
  if (!document.hidden && renderer) draw();
  if (playback.running && loaded && !disposed) frame = requestAnimationFrame(loop);
}
function resize() {
  if (!renderer) return;
  const { width, height } = stage.getBoundingClientRect();
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  const aspect = width / height, horizontal = Math.max(3.9, 3.7 * aspect), vertical = horizontal / aspect;
  camera.left = -horizontal; camera.right = horizontal;
  camera.top = vertical; camera.bottom = -vertical;
  camera.updateProjectionMatrix(); draw();
}
function unavailable(error) {
  cancelAnimationFrame(frame); disposed = true;
  stage.classList.remove('workshop-ready'); stage.dataset.status = 'unavailable';
  hello.hidden = true; replay.hidden = true;
  renderer?.dispose();
  window.dispatchEvent(new CustomEvent('quick-scene-unavailable'));
  console.warn('Optional workshop unavailable; resume content remains available.', error);
}

try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(entries => { playback.visible = entries[0].isIntersecting; wake(); }, { threshold: .05 }).observe(stage);
  document.addEventListener('visibilitychange', () => { playback.hidden = document.hidden; wake(); });
  window.addEventListener('quick-motion-change', e => { playback.paused = e.detail.paused; wake(); });
  stage.addEventListener('pointermove', e => {
    if (playback.paused || e.pointerType === 'touch') return;
    const r = stage.getBoundingClientRect();
    pointerX = (e.clientX - r.left) / r.width - .5; pointerY = (e.clientY - r.top) / r.height - .5;
  }, { passive: true });
  stage.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); unavailable('WebGL context lost'); });
  new GLTFLoader().load(new URL('./media/robot-expressive.glb', import.meta.url).href, gltf => {
    if (disposed) return;
    const model = gltf.scene;
    model.updateMatrixWorld(true);
    model.traverse(object => { if (object.isSkinnedMesh) object.skeleton.update(); });
    const bounds = new THREE.Box3().setFromObject(model, true), size = bounds.getSize(new THREE.Vector3());
    const scale = 2.5 / size.y;
    model.scale.setScalar(scale); model.position.y = -bounds.min.y * scale;
    model.traverse(object => {
      if (!object.isMesh) return;
      if (object.isSkinnedMesh) object.frustumCulled = false;
      object.castShadow = true; object.receiveShadow = true;
      const palette = material => {
        const next = material.clone();
        next.color.set(material.name === 'Main' ? '#cb2943' : material.name === 'Grey' ? '#e8e4dc' : '#22272b');
        next.roughness = .48; next.metalness = .12; return next;
      };
      object.material = Array.isArray(object.material) ? object.material.map(palette) : palette(object.material);
    });
    actor = new THREE.Group(); actor.add(model); scene.add(actor);
    mixer = new THREE.AnimationMixer(model);
    actions = Object.fromEntries(gltf.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
    actions.Wave.setLoop(THREE.LoopOnce, 1); actions.Wave.clampWhenFinished = true;
    transition('Idle'); draw(); loaded = true;
    stage.classList.add('workshop-ready'); stage.dataset.status = 'ready';
    hello.hidden = false; replay.hidden = false;
    window.dispatchEvent(new CustomEvent('quick-scene-ready'));
    resize(); wake();
  }, undefined, unavailable);
  hello.addEventListener('click', () => {
    // An explicit greeting never overrides the visitor's motion preference.
    if (playback.paused) {
      mixer.stopAllAction(); activeAction = undefined;
      greeting = actions.Wave.getClip().duration;
      transition('Wave'); activeAction.time = .7; mixer.update(0); draw();
      return;
    }
    greeting = actions.Wave.getClip().duration;
    if (activeAction === actions.Wave) activeAction.reset().setEffectiveWeight(1).play();
    transition('Wave');
  });
  replay.addEventListener('click', () => {
    playback.time = 0; greeting = 0; mixer.stopAllAction(); activeAction = undefined;
    actor.quaternion.setFromAxisAngle(axis, .42); wake();
  });
} catch (error) { unavailable(error); }
