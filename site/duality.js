/* Two aligned identities, sampled through narrow virtual lenslets.
 * Native WebGL keeps the hero independent of the optional three.js background.
 * CSS masks remain a complete fallback, including file:// and context loss.
 */
(function () {
  'use strict';
  var stage = document.getElementById('duality-stage');
  if (!stage) return;
  var game = document.getElementById('game');
  var hero = game || document.getElementById('title');
  var identityNames = game ? ['FOCUS', 'CREATE'] : ['KAKASHI', 'OBITO'];
  var art = document.getElementById('duality-art');
  var canvas = document.getElementById('duality-canvas');
  var slider = document.getElementById('duality-angle');
  var identity = document.getElementById('duality-identity');
  var meter = document.getElementById('duality-meter');
  var toggle = document.getElementById('motion-toggle');
  var buttons = Array.from(stage.querySelectorAll('[data-identity]'));
  var systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var saved = null;
  try { saved = window.localStorage.getItem('portfolio-motion'); } catch (_) {}
  /* Three levels, not two. Killing every animation because the OS asks for
     reduced motion left the whole site frozen; "reduced" means dropping the
     things that actually cause trouble — parallax, overshoot, big sweeps — not
     going completely still. So an untouched visitor whose OS asks for less
     lands on CALM, which keeps the ambient life at low amplitude. */
  var level = saved === 'off' ? 'off'
            : saved === 'full' ? 'full'
            : saved === 'on' ? 'full'
            : saved === 'calm' ? 'calm'
            : systemMotion.matches ? 'calm' : 'full';
  var paused = level === 'off';
  var angle = 0, target = 0, x = -.25, y = 0, targetX = -.25, targetY = 0;
  var frame = 0, previousTime = 0, visible = true, rendering = null;
  var selection = identityNames[0], manuallyControlled = false, lastPointerX = null;
  var clamp = function (n, lo, hi) { return Math.max(lo, Math.min(hi, n)); };

  var LABEL = { full: 'MOTION FULL', calm: 'MOTION CALM', off: 'MOTION OFF' };
  var HINT = {
    full: 'Motion at full strength. Activate for reduced motion.',
    calm: 'Motion reduced. Activate to turn motion off.',
    off: 'Motion off. Activate for full motion.'
  };

  function notifyMotion() {
    paused = level === 'off';
    var root = document.documentElement;
    root.classList.toggle('motion-paused', paused);
    root.classList.toggle('motion-calm', level === 'calm');
    root.classList.toggle('motion-enabled', !paused);
    root.style.setProperty('--amp', paused ? '0' : level === 'calm' ? '.4' : '1');
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.innerHTML = LABEL[level] + ' <span aria-hidden="true">◉</span>';
    toggle.setAttribute('aria-label', HINT[level]);
    toggle.disabled = false;
    window.dispatchEvent(new CustomEvent('portfolio-motion-change', { detail: { paused: paused, level: level } }));
    schedule();
  }

  function paint() {
    stage.style.setProperty('--flip', angle.toFixed(4));
    stage.style.setProperty('--reveal', (angle * 4).toFixed(3) + 'px');
    stage.style.setProperty('--tilt-x', (paused ? 0 : -y * 7).toFixed(2) + 'deg');
    stage.style.setProperty('--tilt-y', (paused ? 0 : x * 11).toFixed(2) + 'deg');
    stage.style.setProperty('--light-x', (50 + x * 42).toFixed(2) + '%');
    stage.style.setProperty('--light-y', (35 + y * 30).toFixed(2) + '%');
    stage.style.setProperty('--foil', (paused ? .06 : .12 + Math.abs(x) * .13).toFixed(3));
    // Keep the physical slider at the requested position while easing the art.
    slider.value = String(Math.round(target * 100));
    meter.style.transform = 'translateX(' + (angle * 733.33).toFixed(1) + '%)';
    var next = angle < .42 ? identityNames[0] : angle > .58 ? identityNames[1] : 'DUALITY';
    if (selection !== next) {
      selection = next;
      identity.textContent = next;
    }
    slider.setAttribute('aria-valuetext', Math.round(target * 100) + '% — ' +
      (target < .42 ? identityNames[0] : target > .58 ? identityNames[1] : 'Both identities'));
    buttons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.identity === '0' ? target < .42 : target > .58));
    });
    if (rendering) rendering.draw(angle, paused ? 0 : x, paused ? 0 : y);
  }

  function tick(time) {
    frame = 0;
    if (!visible || document.hidden) { previousTime = 0; return; }
    var dt = previousTime ? Math.min(time - previousTime, 48) : 16;
    previousTime = time;
    var ease = paused ? 1 : 1 - Math.exp(-dt / 85);
    angle += (target - angle) * ease;
    x += (targetX - x) * ease;
    y += (targetY - y) * ease;
    var moving = Math.abs(target - angle) + Math.abs(targetX - x) + Math.abs(targetY - y) > .001;
    if (!moving) { angle = target; x = targetX; y = targetY; }
    paint();
    if (moving) schedule(); else previousTime = 0;
  }
  function schedule() {
    if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function select(value) {
    target = clamp(value, 0, 1);
    targetX = target * 2 - 1;
    targetY = 0;
    manuallyControlled = true;
    schedule();
  }
  slider.addEventListener('input', function () { select(Number(slider.value) / 100); });
  buttons.forEach(function (button) {
    if(game) button.textContent = identityNames[Number(button.dataset.identity)];
    button.addEventListener('click', function () { select(Number(button.dataset.identity)); });
    button.disabled = false;
  });
  slider.disabled = false;
  toggle.disabled = false;
  // Cycles full -> calm -> off. An explicit choice always overrides the system
  // preference, so someone who wants the full thing gets it in one click.
  var ORDER = ['full', 'calm', 'off'];
  toggle.addEventListener('click', function () {
    level = ORDER[(ORDER.indexOf(level) + 1) % ORDER.length];
    try { window.localStorage.setItem('portfolio-motion', level); } catch (_) {}
    notifyMotion();
  });
  systemMotion.addEventListener('change', function (event) {
    var preference = null;
    try { preference = window.localStorage.getItem('portfolio-motion'); } catch (_) {}
    if (preference) return;            // an explicit choice stands
    level = event.matches ? 'calm' : 'full';
    notifyMotion();
  });
  hero.addEventListener('pointermove', function (event) {
    if (!finePointer.matches || paused || event.pointerType === 'touch') return;
    if (event.target.closest('.duality-controls, a, button')) return;
    // Do not undo a keyboard or touch selection until the mouse actually moves.
    if (manuallyControlled && (lastPointerX === null || Math.abs(event.clientX - lastPointerX) < 3)) {
      lastPointerX = event.clientX; return;
    }
    manuallyControlled = false;
    lastPointerX = event.clientX;
    var rect = stage.getBoundingClientRect();
    target = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    targetX = target * 2 - 1;
    targetY = clamp((event.clientY - rect.top) / (rect.height - 100) * 2 - 1, -1, 1);
    schedule();
  }, { passive: true });
  hero.addEventListener('pointerleave', function () {
    targetX = 0; targetY = 0; schedule();
  });
  var observer = new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    if (visible) schedule();
  });
  observer.observe(hero);
  document.addEventListener('visibilitychange', schedule);

  function createRenderer() {
    var gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
    if (!gl) return null;
    var vertex = 'attribute vec2 aPosition; varying vec2 vUv; void main(){vUv=(aPosition+1.0)*0.5;gl_Position=vec4(aPosition,0.0,1.0);}';
    var fragment = [
      'precision mediump float;',
      'varying vec2 vUv;',
      'uniform sampler2D uAtlas;',
      'uniform float uAngle;',
      'uniform vec2 uLight;',
      'uniform vec2 uResolution;',
      'void main(){',
      '  vec2 uv=clamp(vUv,vec2(0.0015),vec2(0.9985));',
      '  float pitch=3.2;',
      '  float lens=fract(gl_FragCoord.x/pitch);',
      '  float bend=sin(uAngle*3.14159265);',
      // Each lens samples an identity according to the angle of observation.
      // A modest spatial sweep and lens phase produce a ribbed flip, crisp at both ends.
      '  float phase=uAngle+(uv.x-0.5)*0.32*bend+(lens-0.5)*0.16*bend;',
      '  float choose=smoothstep(0.482,0.518,phase);',
      '  float refract=(lens-0.5)*0.0008*bend;',
      '  vec2 left=vec2(clamp(uv.x*0.5+refract,0.001,0.499),uv.y);',
      '  vec2 right=vec2(clamp(0.5+uv.x*0.5+refract,0.501,0.999),uv.y);',
      '  vec3 color=mix(texture2D(uAtlas,left).rgb,texture2D(uAtlas,right).rgb,choose);',
      '  float ridge=0.976+0.024*cos(lens*6.2831853);',
      '  vec2 lamp=vec2(0.5+uLight.x*0.42,0.65-uLight.y*0.3);',
      '  float reflection=pow(max(0.0,1.0-distance(uv,lamp)),9.0)*0.11;',
      '  color=color*ridge+vec3(0.95,0.89,0.76)*reflection;',
      '  gl_FragColor=vec4(color,1.0);',
      '}'
    ].join('\n');
    function shader(type, source) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, source); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh); throw new Error('Lens shader unavailable');
      }
      return sh;
    }
    var vs = shader(gl.VERTEX_SHADER, vertex), fs = shader(gl.FRAGMENT_SHADER, fragment);
    var program = gl.createProgram();
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Lens program unavailable');
    gl.useProgram(program);
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    var attribute = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
    var angleUniform = gl.getUniformLocation(program, 'uAngle');
    var lightUniform = gl.getUniformLocation(program, 'uLight');
    var resolutionUniform = gl.getUniformLocation(program, 'uResolution');
    var texture = gl.createTexture(), ready = false;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program, 'uAtlas'), 0);
    var textureImage = new Image();
    textureImage.onload = function () {
      if (gl.isContextLost()) return;
      try {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureImage);
        if (gl.getError() !== gl.NO_ERROR) return;
        ready = true; schedule();
      } catch (_) { /* CSS retains both identities if local texture upload is blocked. */ }
    };
    textureImage.src = game ? 'media/menu-character.png' : 'media/duality-atlas.png';
    return { draw: function (phase, lightX, lightY) {
      if (!ready || gl.isContextLost()) return;
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      var width = Math.round(art.clientWidth * ratio), height = Math.round(art.clientHeight * ratio);
      if (!width || !height) return;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width; canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      gl.uniform1f(angleUniform, phase);
      gl.uniform2f(lightUniform, lightX, lightY);
      gl.uniform2f(resolutionUniform, width, height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      stage.classList.add('webgl-ready');
    } };
  }
  function mount() {
    try { rendering = createRenderer(); } catch (_) { rendering = null; }
    schedule();
  }
  canvas.addEventListener('webglcontextlost', function (event) {
    event.preventDefault(); rendering = null;
    stage.classList.remove('webgl-ready'); schedule();
  });
  canvas.addEventListener('webglcontextrestored', mount);
  new ResizeObserver(schedule).observe(art);
  if(game) {
    art.setAttribute('aria-label', 'Original anime engineer portrait with two lenticular poses');
    identity.textContent = identityNames[0];
    window.addEventListener('portfolio-scene-change', function(event){
      select(event.detail.screen === 'contact' ? 1 : 0);
    });
  }
  notifyMotion();
  mount();
})();
