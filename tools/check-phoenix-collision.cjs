const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const moduleURL = name => pathToFileURL(path.resolve(name)).href;
  const THREE = await import(moduleURL('site/vendor/three.module.min.js'));
  const { createCollisionWorld } = await import(moduleURL('site/phoenix-collision.mjs'));
  const mesh = vertices => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flat(), 3));
    const result = new THREE.Mesh(geometry); result.updateMatrixWorld(true); return result;
  };
  const wall = mesh([
    [0,-20,-20], [0,20,-20], [0,20,20],
    [0,-20,-20], [0,20,20], [0,-20,20],
  ]);
  const roof = mesh([
    [-10,6,-10], [10,6,-10], [10,6,10],
    [-10,6,-10], [10,6,10], [-10,6,10],
  ]);
  const floor = mesh([
    [-10,0,-10], [10,0,-10], [10,0,10],
    [-10,0,-10], [10,0,10], [-10,0,10],
  ]);
  const world = createCollisionWorld([wall], { cellSize: 4 });
  let result = world.constrainMotion({x:-5,y:3,z:0}, {x:5,y:-3,z:0}, 1);
  assert(result.hit); assert(result.position.x < -1 && result.position.x > -1.03);
  assert(Math.abs(result.position.y + 3) < 1e-3, 'A wall slides descent downward without adding upward motion');
  assert(result.normal.x < -.99);
  result = world.constrainMotion({x:5,y:3,z:0}, {x:-5,y:-3,z:0}, 1);
  assert(result.hit && result.position.x > 1, 'Collision is two-sided');
  assert(Math.abs(result.position.y + 3) < 1e-3);
  result = world.constrainMotion({x:-100,y:2,z:0}, {x:100,y:2,z:0}, .6);
  assert(result.hit && result.position.x < -.6, 'A high-speed sweep cannot tunnel through a thin wall');
  result = world.constrainMotion({x:-2,y:2,z:0}, {x:-4,y:2,z:0}, 1);
  assert(!result.hit && result.position.x === -4, 'Departing motion is not glued to the wall');
  result = world.constrainMotion({x:-1.015,y:2,z:0}, {x:-1.015,y:2,z:5}, 1);
  assert(Math.abs(result.position.z - 5) < 1e-6, 'Tangential travel is not blocked');

  const overhead = createCollisionWorld([roof, floor]);
  result = overhead.constrainMotion({x:-5,y:2,z:0}, {x:5,y:2,z:0}, .75);
  assert(!result.hit && result.position.y === 2 && result.position.x === 5,
    'Flight below a roof passes without being lifted onto its upper surface');
  result = overhead.constrainMotion({x:0,y:2,z:0}, {x:0,y:10,z:0}, .75);
  assert(result.hit && result.normal.y < -.99 && result.position.y < 5.25 && result.position.y > 5.2,
    'The underside stops ascent below the roof');
  result = overhead.constrainMotion({x:0,y:3,z:0}, {x:0,y:-3,z:0}, .75);
  assert(result.hit && result.normal.y > .99 && result.position.y > .75 && result.position.y < .78,
    'A downward flight reaches the actual floor, not the roof above it');

  function block(x,y,z,w,h,d) {
    const result = new THREE.Mesh(new THREE.BoxGeometry(w,h,d));
    result.position.set(x,y,z); result.updateMatrixWorld(true); return result;
  }
  const arch = createCollisionWorld([block(-3,3,0,1,6,3),block(3,3,0,1,6,3),block(0,6,0,7,1,3)]);
  result = arch.constrainMotion({x:0,y:2,z:8}, {x:0,y:2,z:-8}, .8);
  assert(!result.hit && result.position.z === -8, 'A real arch opening remains traversable');
  result = arch.constrainMotion({x:0,y:2,z:8}, {x:3,y:2,z:-8}, .8);
  assert(result.hit && result.position.x < 2, 'A path into the arch support is blocked');
  result = arch.constrainMotion({x:0,y:2,z:8}, {x:0,y:2,z:-8}, 2.6);
  assert(result.hit && result.position.z > 1.5, 'A passage narrower than the body diameter blocks entry');

  const corner = createCollisionWorld([wall,block(-10,0,0,20,40,.5)]);
  result = corner.constrainMotion({x:-5,y:3,z:5},{x:5,y:-3,z:-5},.6);
  assert(result.hit && result.position.x < -.6 && result.position.z > .85,
    'Sliding into a second wall stops outside both surfaces');
  assert(Math.abs(result.position.y+3) < 1e-3, 'A corner preserves downward sliding');
  result = world.constrainMotion({x:-5,y:3,z:0},{x:-5,y:3,z:0},1);
  assert(!result.hit && result.position.x === -5 && result.position.y === 3,
    'Zero motion in clear space remains exactly stationary');

  const edgeOnly = mesh([[0,0,0],[0,4,0],[0,0,4]]);
  const edgeWorld = createCollisionWorld([edgeOnly]);
  result = edgeWorld.clipCamera({x:-5,y:-.5,z:2}, {x:5,y:-.5,z:2}, 1);
  assert(result.hit && result.position.x < -.8, 'Finite triangle edge cylinders stop sphere sweeps');
  result = edgeWorld.clipCamera({x:-5,y:-.5,z:-.5}, {x:5,y:-.5,z:-.5}, 1);
  assert(result.hit && result.position.x < -.7, 'Triangle endpoint spheres stop vertex-only collisions');
  result = edgeWorld.clipCamera({x:-5,y:-2,z:-2}, {x:5,y:-2,z:-2}, .5);
  assert(!result.hit, 'Missing the actual triangle does not hit its infinite plane');

  result = world.clipCamera({x:-5,y:3,z:0}, {x:5,y:-3,z:0}, 1);
  assert(result.hit && result.position.y > .5,
    'A camera shortens its arm at first impact instead of sliding down/up the wall');
  const penetration = world.constrainMotion({x:-.5,y:2,z:0}, {x:-.5,y:2,z:2}, 1);
  assert(penetration.startedPenetrating && penetration.position.x < -1);
  assert(Math.abs(penetration.position.y - 2) < 1e-8, 'Wall depenetration is horizontal');
  const insideRoof = overhead.constrainMotion({x:0,y:5.7,z:0}, {x:0,y:5.7,z:1}, .75);
  assert(insideRoof.startedPenetrating && insideRoof.position.y < 5.3,
    'An underside overlap recovers downward, not through the roof');

  const transformed = block(4,2,0,1,4,4);
  transformed.rotation.y = Math.PI / 4; transformed.scale.set(1,1.5,1); transformed.updateMatrixWorld(true);
  const transformedWorld = createCollisionWorld([transformed], {cellSize:2});
  result = transformedWorld.constrainMotion({x:-2,y:2,z:0}, {x:10,y:2,z:0}, .5);
  assert(result.hit, 'Indexed geometry uses the mesh world transform');
  assert.equal(transformedWorld.triangleCount, 12);
  const source = Array.from(transformed.geometry.getAttribute('position').array);
  createCollisionWorld([transformed]);
  assert.deepEqual(Array.from(transformed.geometry.getAttribute('position').array), source, 'Building collision leaves source geometry untouched');

  const range = new THREE.Mesh(wall.geometry.clone()); range.geometry.setDrawRange(0,0); range.updateMatrixWorld(true);
  assert.equal(createCollisionWorld([range]).triangleCount, 0, 'drawRange is respected');
  const empty = createCollisionWorld([]);
  result = empty.constrainMotion({x:0,y:2,z:0},{x:10,y:-5,z:10},1);
  assert.deepEqual(result.position,{x:10,y:-5,z:10}); assert(!result.hit);
  assert.throws(() => world.constrainMotion({x:NaN,y:0,z:0},{x:1,y:0,z:0}), /finite/);
  assert.throws(() => createCollisionWorld([], {cellSize:0}), /positive/);
  console.log('Phoenix collision passed: actual 3D surfaces, downward/tangent/underside motion, arch traversal, continuous face/edge/vertex hits, camera arm clipping, overlap recovery, transformed geometry and source preservation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
