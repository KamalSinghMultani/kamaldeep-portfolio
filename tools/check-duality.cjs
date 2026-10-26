// Exercise the real interaction runtime without requiring a GPU or a browser.
// Shader appearance is deliberately outside this control/fallback check.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../site/duality.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../site/index.html'), 'utf8');

function setup(reduced = false, stored = null) {
  let frames = [], time = 0;
  const events = {};
  function node(id) {
    return {
      id, handlers: {}, attrs: {}, dataset: {}, value: '0', textContent: '', disabled: true,
      style: { setProperty(k, v) { this[k] = v; } },
      classList: { values: new Set(), add(k) { this.values.add(k); }, remove(k) { this.values.delete(k); },
        toggle(k, yes) { yes ? this.add(k) : this.remove(k); }, contains(k) { return this.values.has(k); } },
      addEventListener(k, fn) { this.handlers[k] = fn; },
      setAttribute(k, value) { this.attrs[k] = value; },
      getBoundingClientRect() { return { left: 500, top: 100, width: 400, height: 650 }; },
      getContext() { return null; },
      emit(type, extra = {}) { this.handlers[type]({ target: this, ...extra }); },
      closest() { return null; }
    };
  }
  const nodes = {};
  for (const id of ['title', 'duality-stage', 'duality-art', 'duality-canvas', 'duality-angle',
    'duality-identity', 'duality-meter', 'motion-toggle']) {
    assert.ok(html.includes('id="' + id + '"'), 'Built page contains ' + id);
    nodes[id] = node(id);
  }
  const buttons = [node('kakashi'), node('obito')];
  buttons.forEach((button, index) => { button.dataset.identity = String(index); });
  nodes['duality-stage'].querySelectorAll = () => buttons;
  const root = node('root');
  const media = { matches: reduced, addEventListener(k, fn) { this.change = fn; } };
  const document = { hidden: false, documentElement: root,
    getElementById: id => nodes[id], addEventListener(k, fn) { events[k] = fn; } };
  const window = { matchMedia: query => query.includes('reduced') ? media : { matches: true },
    localStorage: { getItem: () => stored, setItem: (_, v) => { stored = v; } },
    dispatchEvent: event => { events[event.type] = event.detail; } };
  const context = { window, document, console,
    requestAnimationFrame(fn) { frames.push(fn); return frames.length; },
    IntersectionObserver: class { constructor(fn) { this.fn = fn; } observe() { this.fn([{ isIntersecting: true }]); } },
    ResizeObserver: class { observe() {} },
    CustomEvent: class { constructor(type, value) { this.type = type; this.detail = value.detail; } } };
  vm.runInNewContext(source, context);
  function settle() {
    let count = 0;
    while (frames.length && count++ < 150) {
      const pending = frames; frames = []; time += 16;
      pending.forEach(fn => fn(time));
    }
    assert.ok(count < 150, 'Animation settles and releases the frame loop');
  }
  settle();
  return { nodes, buttons, root, media, settle, events, document };
}

const normal = setup();
const slider = normal.nodes['duality-angle'];
assert.equal(slider.disabled, false);
assert.equal(normal.root.classList.contains('motion-paused'), false);
assert.equal(normal.nodes['duality-stage'].classList.contains('webgl-ready'), false,
  'CSS fallback remains active without WebGL');
normal.buttons[1].emit('click'); normal.settle();
assert.equal(normal.nodes['duality-identity'].textContent, 'OBITO');
assert.equal(slider.value, '100');
assert.equal(normal.nodes['duality-stage'].style['--reveal'], '4.000px');
normal.buttons[0].emit('click'); normal.settle();
assert.equal(normal.nodes['duality-identity'].textContent, 'KAKASHI');
assert.equal(normal.nodes['duality-stage'].style['--reveal'], '0.000px');
slider.value = '50'; slider.emit('input'); normal.settle();
assert.equal(normal.nodes['duality-identity'].textContent, 'DUALITY');
assert.equal(slider.attrs['aria-valuetext'], '50% — Both identities');
normal.nodes['motion-toggle'].emit('click'); normal.settle();
assert.equal(normal.root.classList.contains('motion-calm'), true,
  'The first click reduces motion');
assert.equal(normal.root.classList.contains('motion-paused'), false);
normal.nodes['motion-toggle'].emit('click'); normal.settle();
assert.equal(normal.root.classList.contains('motion-paused'), true);
assert.equal(normal.nodes['duality-stage'].style['--tilt-y'], '0.00deg');
normal.buttons[1].emit('click'); normal.settle();
assert.equal(slider.value, '100', 'Identity selection works with motion disabled');
normal.nodes.title.emit('pointermove', { clientX: 500, clientY: 150, pointerType: 'mouse' });
normal.settle();
assert.equal(slider.value, '100', 'Paused motion ignores mouse tracking');

const pointer = setup();
pointer.nodes.title.emit('pointermove', { clientX: 900, clientY: 350, pointerType: 'mouse' });
pointer.settle();
assert.equal(pointer.nodes['duality-angle'].value, '100');
pointer.nodes.title.emit('pointermove', { clientX: 500, clientY: 350, pointerType: 'mouse' });
pointer.settle();
assert.equal(pointer.nodes['duality-angle'].value, '0');

const reduced = setup(true);
assert.equal(reduced.root.classList.contains('motion-calm'), true);
assert.equal(reduced.root.classList.contains('motion-paused'), false);
assert.equal(reduced.nodes['motion-toggle'].disabled, false);
reduced.buttons[1].emit('click'); reduced.settle();
assert.equal(reduced.nodes['duality-identity'].textContent, 'OBITO');
reduced.nodes['motion-toggle'].emit('click'); reduced.settle();
assert.equal(reduced.root.classList.contains('motion-paused'), true);
assert.equal(reduced.nodes['duality-stage'].style['--tilt-x'], '0.00deg');
reduced.nodes['motion-toggle'].emit('click'); reduced.settle();
assert.equal(reduced.root.classList.contains('motion-paused'), false,
  'An explicit site choice can enable motion without changing system settings');
assert.equal(setup(false, 'off').root.classList.contains('motion-paused'), true,
  'A saved motion-off preference is restored');
console.log('Passed: both identities, midpoint, pointer control, slider, motion toggle, reduced motion, persistence, CSS fallback, and animation settling.');
