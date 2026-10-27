const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async () => {
  const moduleURL = name => pathToFileURL(path.resolve(name)).href;
  const { choreography, Playback, DURATION } = await import(moduleURL('site/quick-workshop-core.mjs'));
  let previous = choreography(0);
  for (let frame = 1; frame <= DURATION * 120; frame++) {
    const pose = choreography(frame / 120);
    assert(Number.isFinite(pose.heading));
    assert(Math.hypot(pose.x, pose.z) < 2.9, 'Character stays on the platform');
    assert(Math.hypot(pose.x - previous.x, pose.z - previous.z) < .01, 'No position jump at an action or loop boundary');
    if (pose.action !== 'Walking') assert(Math.hypot(pose.x - previous.x, pose.z - previous.z) < .006);
    previous = pose;
  }
  assert.equal(choreography(3).action, 'Walking');
  assert.equal(choreography(9).action, 'Wave');
  assert.deepEqual(choreography(0), choreography(DURATION));
  assert.deepEqual(choreography(-1), choreography(DURATION - 1));

  const clock = new Playback(true);
  clock.visible = true; clock.tick(0); clock.tick(1000);
  assert.equal(clock.time, 0, 'Reduced motion starts still');
  clock.paused = false; clock.tick(1000); clock.tick(1040);
  assert.equal(clock.time, .04);
  clock.paused = true; clock.tick(10000); clock.paused = false; clock.tick(20000); clock.tick(20040);
  assert.equal(clock.time, .08, 'Resume preserves time without a jump');
  for (const flag of ['hidden', 'visible']) {
    const held = clock.time;
    clock[flag] = flag === 'hidden'; clock.tick(50000);
    assert.equal(clock.time, held);
    clock[flag] = flag !== 'hidden'; clock.tick(60000); clock.tick(60040);
  }
  assert.equal(clock.time, .16, 'Offscreen and hidden clocks do not catch up');
  assert.equal(clock.tick(1000000), .05, 'Slow frames are bounded');

  // Parse and animate the actual shipped glTF asset, not a replacement fixture.
  globalThis.ProgressEvent = class { constructor(type, init) { Object.assign(this, init); } };
  const THREE = await import(moduleURL('site/vendor/three.module.min.js'));
  const { GLTFLoader } = await import(moduleURL('site/vendor/GLTFLoader.js'));
  const bytes = fs.readFileSync('site/media/robot-expressive.glb');
  const gltf = await new Promise((resolve, reject) => new GLTFLoader().parse(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', resolve, reject));
  const model = gltf.scene;
  model.updateMatrixWorld(true);
  let skinned = 0;
  model.traverse(o => { if (o.isSkinnedMesh) { skinned++; o.skeleton.update(); } });
  assert(skinned > 0, 'The character has a real skeletal rig');
  const bounds = new THREE.Box3().setFromObject(model, true);
  const size = bounds.getSize(new THREE.Vector3());
  assert(size.y > 3 && size.y < 5, 'World matrices must be updated before measuring the model');
  const scale = 2.5 / size.y;
  model.scale.setScalar(scale); model.position.y = -bounds.min.y * scale;
  const mixer = new THREE.AnimationMixer(model);
  for (const name of ['Idle', 'Walking', 'Wave']) {
    const clip = gltf.animations.find(c => c.name === name);
    assert(clip && clip.duration > .2, `Shipped ${name} clip exists`);
    const action = mixer.clipAction(clip).play();
    mixer.update(.2); model.updateMatrixWorld(true);
    model.traverse(o => { if (o.isSkinnedMesh) o.skeleton.update(); });
    const animated = new THREE.Box3().setFromObject(model, true).getSize(new THREE.Vector3());
    assert(animated.y > 1.7 && animated.y < 3.5, 'Animated character keeps a useful on-stage scale');
    action.stop();
  }

  const events = {}, pressed = {}, classes = new Set();
  const button = { hidden: true, addEventListener(k, f) { this[k] = f; }, setAttribute(k, v) { pressed[k] = v; } };
  const choices = Array.from({ length: 5 }, (_, i) => ({ dataset: { toolIndex: String(i) }, textContent: 'Tool ' + i,
    addEventListener(k, f) { this[k] = f; }, setAttribute(k, v) { this[k] = v; } }));
  const groups = choices.map((_, i) => ({ dataset: { skillGroup: String(i) }, classList: { toggle(k, v) { this[k] = v; } } }));
  const status = {}, controls = { hidden: true };
  const context = {
    matchMedia: () => ({ matches: true, addEventListener(k, f) { events.system = f; } }),
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
    document: {
      documentElement: { classList: { toggle(k, v) { v ? classes.add(k) : classes.delete(k); } } },
      getElementById: id => id === 'quick-motion' ? button : status,
      querySelector: () => controls,
      querySelectorAll: selector => selector === '[data-tool-index]' ? choices : groups,
    },
    window: { addEventListener(k, f) { events[k] = f; }, dispatchEvent(e) { events.last = e; } },
  };
  vm.runInNewContext(fs.readFileSync('site/quick-motion.js', 'utf8'), context);
  assert.equal(pressed['aria-pressed'], 'false');
  assert.equal(button.hidden, true, 'Unavailable animation never exposes a dead pause control');
  events['quick-scene-ready'](); assert.equal(button.hidden, false);
  button.click(); assert.equal(events.last.detail.paused, false);
  events.system({ matches: true }); assert.equal(events.last.detail.paused, true);
  choices[3].click(); assert.equal(groups[3].classList.equipped, true);
  assert.equal(groups[1].classList.equipped, false);
  assert.match(status.textContent, /All skills remain visible/);
  events['quick-scene-unavailable'](); assert.equal(button.hidden, true);

  const html = fs.readFileSync('dist/site/quick.html', 'utf8');
  assert.equal((html.match(/id="workshop-canvas"/g) || []).length, 1);
  assert(!html.includes('data-quick-scene='));
  assert(html.includes('prefers-reduced-motion:reduce'));
  for (const id of ['projects', 'experience', 'skills', 'education', 'contact']) assert(html.includes(`id="${id}"`));
  assert(html.includes('href="kamaldeep-singh-resume.pdf"'));
  console.log('Quick workshop passed: continuous route, reduced motion, pause/visibility clocks, real skeleton and clips, character scale, UI controls, fallback and ungated content.');
})().catch(error => { console.error(error); process.exitCode = 1; });
