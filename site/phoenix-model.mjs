import * as THREE from './vendor/three.module.min.js';

// Normalize the land itself, rather than the model's much larger sky/ocean.
export function prepareIsland(asset) {
  const root = new THREE.Group();
  root.scale.setScalar(1.866809003874327);
  root.position.set(-1.5093930651, 407.1977139701, 1.8787131657);
  root.add(asset.scene);
  root.updateMatrixWorld(true);
  const solid = [];
  asset.scene.traverse(object => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      material.emissiveIntensity = .78;
      material.metalness = 0; material.roughness = 1;
      if (material.transparent) { material.depthWrite = false; material.alphaTest = .02; }
    }
    if (/ISLE_17_/.test(object.name) && !/ile-o_|ile-ecume|ile-nuage|LUNE|ile-lave|bato-|palmier-feuilles/.test(object.name)) solid.push(object);
  });
  // The supplied island clip moves the whole landscape; it is a showcase,
  // not an environmental animation suitable for a freely controlled world.
  return { root, solid };
}

export function createPhoenixVisual(asset) {
  const group = new THREE.Group();
  group.rotation.y = 1.5171840055;
  group.scale.setScalar(.0062019383);
  const bird = asset.scene;
  bird.position.set(41.22199, -116.22089, 14.98684);
  bird.traverse(object => {
    if (!object.isMesh) return;
    if (object.isSkinnedMesh) object.frustumCulled = false;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      material.emissiveIntensity = .95; material.roughness = .85; material.metalness = 0;
      material.alphaTest = .025; material.depthWrite = false;
    }
  });
  group.add(bird);
  const mixer = new THREE.AnimationMixer(bird);
  const clip = asset.animations.find(animation => animation.name === 'Take 001') || asset.animations[0];
  if (!clip) throw new Error('The phoenix has no supplied flight animation.');
  const anchor = bird.getObjectByName('b_Root_01');
  if (!anchor) throw new Error('The phoenix body anchor is missing.');
  const action = mixer.clipAction(clip); action.play();
  const point = new THREE.Vector3();
  function stabilize() {
    // Keep the authored wing/tail motion, but remove translation of the body
    // root. Otherwise the imported flap can visibly rise during a descent.
    anchor.getWorldPosition(point);
    if (group.parent) group.parent.worldToLocal(point);
    group.position.sub(point);
    group.updateMatrixWorld(true);
  }
  function update(dt, speed = 17) {
    action.setEffectiveTimeScale(THREE.MathUtils.lerp(.85, 1.3, THREE.MathUtils.clamp((speed - 3) / 27, 0, 1)));
    mixer.update(dt); stabilize();
  }
  function reset() { group.position.set(0, 0, 0); mixer.setTime(0); stabilize(); }
  return { group, mixer, action, clip, anchor, update, reset };
}
