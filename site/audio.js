/* Menu audio: a short synthesised score plus UI sounds, built live in WebAudio.
 *
 * There is no audio file anywhere in this project. Everything below is generated
 * from oscillators and noise, which keeps index.html self-contained, costs no
 * download, and is original by construction so there is nothing to license.
 *
 * Two rules shape the whole module:
 *
 *   1. No AudioContext exists until the visitor's first real gesture. Browsers
 *      block autoplay anyway, and this way a visitor who never interacts pays
 *      nothing at all.
 *   2. Sound is independent of `motion-paused`. Turning motion off is not a
 *      request for silence, so the two toggles never touch each other.
 */
(function () {
  'use strict';

  const app = document.getElementById('game');
  if (!app || !window.AudioContext) return;

  const STORE = 'portfolio-sound';
  const BPM = 104;
  const BEAT = 60 / BPM;

  let ctx = null;          // built on first gesture, never before
  let master = null, musicGain = null, sfxGain = null;
  let timer = null, nextNote = 0, step = 0;
  let ducked = false;

  let enabled = true;
  try {
    enabled = window.localStorage.getItem(STORE) !== 'off';
  } catch (_) { /* private mode: fall back to on */ }

  /* ---------------------------------------------------------------- score --
   * D minor, sparse on purpose: a loop somebody may leave running for several
   * minutes gets tiring fast, so most steps are deliberately silent.
   */
  const BASS = [146.83, 0, 174.61, 0, 220.00, 0, 174.61, 0,
                130.81, 0, 155.56, 0, 196.00, 0, 146.83, 0];
  const STAB = [0, 0, 0, [440.00, 523.25, 659.25], 0, 0, 0, 0,
                0, 0, 0, [392.00, 466.16, 587.33], 0, 0, 0, 0];
  const KICK = [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0];

  function env(node, at, peak, attack, decay) {
    node.gain.setValueAtTime(0.0001, at);
    node.gain.exponentialRampToValueAtTime(peak, at + attack);
    node.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  }

  const attackTail = decay => decay + 0.08;

  function tone(at, freq, peak, decay, type, dest) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(freq, at);
    env(gain, at, peak, 0.006, decay);
    osc.connect(gain).connect(dest || musicGain);
    osc.start(at);
    osc.stop(at + attackTail(decay));
  }

  /* One short noise burst, reused for hats and for the screen-wipe whoosh.
     The buffer is built once and replayed: the hats fire a few times a second
     for as long as the page is open, and rebuilding it each time would churn
     megabytes of Float32 for no audible difference. */
  let noiseBuffer = null;
  function noiseSource() {
    if (!noiseBuffer) {
      const frames = Math.ceil(ctx.sampleRate * 0.5);
      noiseBuffer = ctx.createBuffer(1, frames, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    return src;
  }

  function noise(at, peak, decay, freq, q, dest) {
    const src = noiseSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, at);
    filter.Q.value = q || 1;
    env(gain, at, peak, 0.004, decay);
    src.connect(filter).connect(gain).connect(dest || musicGain);
    src.start(at);
    src.stop(at + decay + 0.08);
  }

  function kick(at) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, at);
    osc.frequency.exponentialRampToValueAtTime(42, at + 0.11);
    env(gain, at, 0.5, 0.005, 0.16);
    osc.connect(gain).connect(musicGain);
    osc.start(at);
    osc.stop(at + 0.3);
  }

  function scheduleStep(index, at) {
    const bass = BASS[index];
    if (bass) tone(at, bass, 0.24, 0.34, 'triangle');

    const stab = STAB[index];
    if (stab) stab.forEach(f => tone(at, f, 0.055, 0.42, 'sawtooth'));

    if (KICK[index]) kick(at);

    /* Swung eighths: the off-beat lands late, which is what stops the loop
       sounding like a metronome. */
    noise(at, 0.035, 0.03, 8200, 1.2);
    noise(at + BEAT * 0.34, 0.02, 0.025, 8200, 1.2);
  }

  /* Lookahead scheduler. Notes are queued against ctx.currentTime a little way
     ahead; scheduling each note with setTimeout instead would drift audibly. */
  function pump() {
    while (nextNote < ctx.currentTime + 0.12) {
      scheduleStep(step % BASS.length, nextNote);
      nextNote += BEAT / 2;
      step++;
    }
  }

  /* ------------------------------------------------------------------ ui --- */
  const SFX = {
    move:    at => tone(at, 660, 0.16, 0.05, 'square', sfxGain),
    hover:   at => tone(at, 880, 0.05, 0.03, 'square', sfxGain),
    confirm: at => { tone(at, 523.25, 0.2, 0.09, 'square', sfxGain);
                     tone(at + 0.06, 784, 0.18, 0.14, 'square', sfxGain); },
    back:    at => { tone(at, 392, 0.16, 0.08, 'square', sfxGain);
                     tone(at + 0.05, 262, 0.14, 0.13, 'square', sfxGain); },
    wipe:    at => noise(at, 0.16, 0.2, 1400, 0.6, sfxGain)
  };

  function play(name) {
    if (!ctx || !enabled) return;
    const fn = SFX[name];
    if (fn) fn(ctx.currentTime + 0.001);
  }

  /* --------------------------------------------------------------- start --- */
  function build() {
    ctx = new AudioContext();
    master = ctx.createGain();
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();
    master.gain.value = enabled ? 0.9 : 0;
    musicGain.gain.value = 0.5;
    sfxGain.gain.value = 0.9;
    musicGain.connect(master);
    sfxGain.connect(master);
    master.connect(ctx.destination);
    nextNote = ctx.currentTime + 0.1;
    timer = setInterval(pump, 25);
    pump();
  }

  function wake() {
    if (!ctx) { build(); return; }
    if (ctx.state === 'suspended') ctx.resume();
  }

  /* The first genuine gesture builds the graph. Pointerdown and keydown both
     count; scroll does not, because a browser will not unlock audio on it. */
  ['pointerdown', 'keydown'].forEach(type => {
    document.addEventListener(type, function once() {
      document.removeEventListener(type, once);
      if (enabled) wake();
    }, { once: false });
  });

  function setEnabled(on) {
    enabled = on;
    try { window.localStorage.setItem(STORE, on ? 'on' : 'off'); } catch (_) {}
    if (!on) {
      if (master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
    } else {
      wake();
      if (master) master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.02);
    }
    sync();
  }

  /* --------------------------------------------------------------- toggle -- */
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'sound-toggle';
  button.className = 'game-toggle';
  button.addEventListener('click', () => setEnabled(!enabled));

  function sync() {
    button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    button.textContent = enabled ? 'SOUND ON' : 'SOUND OFF';
    button.setAttribute('aria-label', enabled ? 'Turn menu sound off' : 'Turn menu sound on');
  }
  sync();

  const slot = document.getElementById('game-sound-slot');
  if (slot) slot.appendChild(button);

  /* ---------------------------------------------------------------- hooks -- */
  /* The menu already announces every screen change, so the transition sound
     needs no hook inside render(). */
  window.addEventListener('portfolio-scene-change', () => play('wipe'));

  const nav = app.querySelector('.game-nav');
  if (nav) {
    nav.addEventListener('focusin', event => {
      if (event.target.closest('a')) play('move');
    });
    nav.addEventListener('pointerenter', event => {
      if (event.target.closest && event.target.closest('a')) play('hover');
    }, true);
  }

  app.addEventListener('click', event => {
    if (event.target.closest('.game-back')) play('back');
    else if (event.target.closest('.game-nav a, [data-lab]')) play('confirm');
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') play('back');
  });

  /* A demo clip and a backing track fighting each other helps nobody. */
  function duck(on) {
    if (!ctx || ducked === on) return;
    ducked = on;
    musicGain.gain.setTargetAtTime(on ? 0.06 : 0.5, ctx.currentTime, 0.08);
  }
  document.addEventListener('play', event => {
    if (event.target.tagName === 'VIDEO') duck(true);
  }, true);
  ['pause', 'ended'].forEach(type => {
    document.addEventListener(type, event => {
      if (event.target.tagName !== 'VIDEO') return;
      const playing = Array.prototype.some.call(
        document.querySelectorAll('video'), v => !v.paused);
      if (!playing) duck(false);
    }, true);
  });

  window.addEventListener('pagehide', () => {
    if (timer) clearInterval(timer);
    if (ctx && ctx.state === 'running') ctx.suspend();
  });
})();
