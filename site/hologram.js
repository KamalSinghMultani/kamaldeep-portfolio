/* Lenticular hologram — the 3D layer behind the four middle sections.
 *
 * The optics, and why they are what they are:
 *
 * A parallax barrier (an opaque mask with a slit every period) is the textbook
 * mechanism, and it was the first thing built here. It is also wrong for this:
 * a barrier throws away three quarters of the light, so at screen scale the
 * portrait shreds into venetian blinds instead of reading as a picture. Real
 * lenticular PRINT uses lenses, which refract rather than block — each lenslet
 * magnifies one frame to fill its whole period, so you see a complete image
 * that changes as you tilt, with no light lost.
 *
 * So the lens is modelled, not the barrier: every pixel takes its colour from
 * ONE of the four frames, sampled at full resolution, chosen by where the pixel
 * sits inside the lens period versus the current frame weights. Those are the
 * same weights the CSS plates use, so both layers show the same walk. The plate
 * is a real mesh tilting in 3D on the shared pointer/scroll signal, with a
 * dimmer backing copy a little further away for depth.
 *
 * Plate positions come from the CSS plates themselves: those stay in the layout
 * at opacity 0 and their rects are read each frame. One orthographic camera in
 * CSS-pixel space keeps the artwork exactly the size the CSS already chose.
 */
export function mountHologram(THREE, opts) {
  var SECTIONS = opts.sections;
  var TILT = Math.PI / 7;   // ~26 degrees each way — a lenticular's real cone
  var TEX = 512;            // atlas cell size; frames are 520x640, close enough
  var CELL_H = 630;

  var renderer = new THREE.WebGLRenderer({
    canvas: opts.canvas, alpha: true, antialias: true, powerPreference: 'low-power'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var scene = new THREE.Scene();
  var camera = new THREE.OrthographicCamera(0, 1, 1, 0, -2000, 2000);
  var plates = [];
  var weights = new THREE.Vector4(1, 0, 0, 0);

  // ---- the atlas --------------------------------------------------------
  // Four frames in a 2x2 grid. Sampling is inset by half a texel so linear
  // filtering never drags a neighbouring cell across a frame's edge.
  function atlas(images) {
    var c = document.createElement('canvas');
    c.width = TEX * 2; c.height = CELL_H * 2;
    var g = c.getContext('2d');
    for (var k = 0; k < images.length; k++) {
      g.drawImage(images[k], (k % 2) * TEX, Math.floor(k / 2) * CELL_H, TEX, CELL_H);
    }
    return c;
  }

  // ---- the lens ---------------------------------------------------------
  // Restrained on purpose: the plate sits under body copy, so this tints and
  // textures rather than blooming. The halftone matches the page's 7px dots.
  var VERT = [
    'varying vec2 vUv;',
    'void main(){ vUv = uv;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'
  ].join('\n');

  var FRAG = [
    'uniform sampler2D map;',
    'uniform vec4 uW;',
    'uniform float uOpacity;',
    'uniform float uPeriod;',
    'uniform vec2 uSize;',
    'varying vec2 vUv;',
    'void main(){',
    '  vec2 px = vUv * uSize;',
    // where this pixel sits inside one lens period
    '  float t = fract(px.x / uPeriod);',
    // the four frame bands tile the period, each as wide as its weight
    '  float c0 = uW.x;',
    '  float c1 = c0 + uW.y;',
    '  float c2 = c1 + uW.z;',
    '  float k = t < c0 ? 0.0 : (t < c1 ? 1.0 : (t < c2 ? 2.0 : 3.0));',
    // pick that frame's cell out of the 2x2 atlas, inset by half a texel
    '  vec2 cell = vec2(mod(k, 2.0), 1.0 - floor(k / 2.0));',
    '  vec2 uv = (clamp(vUv, 0.001, 0.999) + cell) * 0.5;',
    '  vec4 c = texture2D(map, uv);',
    '  if (c.a < 0.02) discard;',
    // ridge shading across the lens, then scanlines and the halftone
    '  float ridge = 0.88 + 0.12 * cos(t * 6.2831853);',
    '  float scan = 0.88 + 0.12 * sin(px.y * 1.1);',
    '  float d = step(0.35, fract(px.x / 7.0) * fract(px.y / 7.0) * 4.0);',
    '  gl_FragColor = vec4(c.rgb * ridge * scan * mix(0.90, 1.0, d), c.a * uOpacity);',
    '}'
  ].join('\n');

  function makePlate(sec, images) {
    var tex = new THREE.CanvasTexture(atlas(images));
    tex.colorSpace = THREE.SRGBColorSpace;   // else three lifts the darks badly
    tex.minFilter = tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;

    function surface(opacity, period) {
      return new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.ShaderMaterial({
          uniforms: {
            map: { value: tex },
            uW: { value: weights },
            uOpacity: { value: opacity },
            uPeriod: { value: period },
            uSize: { value: new THREE.Vector2(TEX, CELL_H) }
          },
          vertexShader: VERT, fragmentShader: FRAG,
          transparent: true, depthWrite: false
        })
      );
    }

    var face = surface(sec.opacity, 9);
    // a dimmer copy set back a little — the parallax between the two is what
    // makes the plate read as an object rather than a decal
    var back = surface(sec.opacity * 0.45, 15);
    back.position.z = -26;

    var group = new THREE.Group();
    group.add(back);
    group.add(face);
    group.userData = { el: sec.el, clip: sec.section, meshes: [face, back] };
    scene.add(group);
    plates.push(group);
    opts.onPlate && opts.onPlate();
  }

  // ---- placement --------------------------------------------------------
  var vw = 0, vh = 0;
  function resize() {
    vw = window.innerWidth; vh = window.innerHeight;
    renderer.setSize(vw, vh, false);
    camera.left = 0; camera.right = vw; camera.top = vh; camera.bottom = 0;
    camera.updateProjectionMatrix();
  }

  var angle = 0, lean = 0;
  function render() {
    // Each plate is drawn on its own with a scissor set to its SECTION, because
    // a fixed full-viewport canvas has none of the section overflow clipping the
    // CSS plates sat inside — without this a plate bleeds into its neighbour.
    renderer.setScissorTest(false);
    renderer.clear();
    renderer.autoClear = false;
    renderer.setScissorTest(true);

    for (var i = 0; i < plates.length; i++) plates[i].visible = false;

    for (var j = 0; j < plates.length; j++) {
      var g = plates[j];
      var r = g.userData.el.getBoundingClientRect();
      var s = g.userData.clip.getBoundingClientRect();
      if (!(r.bottom > -80 && r.top < vh + 80 && r.width > 1)) continue;

      var top = Math.max(0, s.top), bottom = Math.min(vh, s.bottom);
      if (bottom - top < 1) continue;

      // CSS pixel space, y flipped into three's y-up world
      g.position.set(r.left + r.width / 2, vh - (r.top + r.height / 2), 0);
      g.rotation.y = angle;
      g.rotation.x = lean;
      for (var m = 0; m < g.userData.meshes.length; m++) {
        g.userData.meshes[m].scale.set(r.width, r.height, 1);
      }

      g.visible = true;
      // scissor origin is bottom-left
      renderer.setScissor(Math.max(0, s.left), vh - bottom,
                          Math.min(vw, s.right) - Math.max(0, s.left), bottom - top);
      renderer.render(scene, camera);
      g.visible = false;
    }

    renderer.setScissorTest(false);
    renderer.autoClear = true;
  }

  // ---- load the frames the page already carries -------------------------
  // The SVGs are inlined in the document, so they are serialised straight out
  // of the DOM: no second network trip and no separate raster assets.
  var mounted = false;
  function ready() {
    if (mounted || plates.length < SECTIONS.length) return;
    mounted = true;
    document.documentElement.classList.add('holo-on');
  }

  function load(sec) {
    var svgs = sec.el.querySelectorAll('svg');
    var pending = svgs.length;
    var images = new Array(pending);
    if (!pending) return;
    for (var i = 0; i < svgs.length; i++) {
      (function (n) {
        var clone = svgs[n].cloneNode(true);
        clone.setAttribute('width', TEX);
        clone.setAttribute('height', CELL_H);
        var src = new XMLSerializer().serializeToString(clone);
        var im = new Image();
        im.onload = function () {
          images[n] = im;
          if (--pending === 0) { makePlate(sec, images); ready(); }
        };
        im.onerror = function () { pending = -1; };
        im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
      })(i);
    }
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  for (var s = 0; s < SECTIONS.length; s++) load(SECTIONS[s]);

  return {
    /**
     * x is the shared lens signal, -1..1 — the same one the CSS plates read.
     * w is the four frame weights, so both layers show the identical walk.
     */
    set: function (x, w, y) {
      x = Math.max(-1, Math.min(1, x));
      angle = x * TILT;
      lean = Math.max(-1, Math.min(1, y || 0)) * (TILT * 0.22);
      if (w) weights.set(w[0], w[1], w[2], w[3]);
    },
    render: render
  };
}
