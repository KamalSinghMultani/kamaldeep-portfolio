/* The resume stays readable with or without the optional WebGL scene. */
(function () {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const button = document.getElementById('quick-motion');
  let paused = reduced.matches;
  function publish() {
    document.documentElement.classList.toggle('quick-paused', paused);
    button.textContent = paused ? 'Enable motion' : 'Pause motion';
    button.setAttribute('aria-pressed', String(!paused));
    window.dispatchEvent(new CustomEvent('quick-motion-change', { detail: { paused } }));
  }
  button.addEventListener('click', () => { paused = !paused; publish(); });
  reduced.addEventListener('change', e => { paused = e.matches; publish(); });
  window.addEventListener('quick-scene-ready', () => { button.hidden = false; publish(); });
  window.addEventListener('quick-scene-unavailable', () => { button.hidden = true; });
  document.querySelector('.tool-controls').hidden = false;
  document.querySelectorAll('[data-tool-index]').forEach(button => button.addEventListener('click', () => {
    const selected = Number(button.dataset.toolIndex);
    document.querySelectorAll('[data-tool-index]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    document.querySelectorAll('[data-skill-group]').forEach(group => group.classList.toggle('equipped', Number(group.dataset.skillGroup) === selected));
    document.getElementById('tool-status').textContent = button.textContent + ' highlighted below. All skills remain visible.';
  }));
  publish();
})();
