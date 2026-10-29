// A plan projection of the supplied terrain; no replacement landscape is drawn.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { loadGeometry } = require('./phoenix-test-assets.cjs');
(async () => {
  const local = file => pathToFileURL(path.resolve(file)).href;
  const THREE = await import(local('site/vendor/three.module.min.js'));
  const { prepareIsland } = await import(local('site/phoenix-model.mjs'));
  const { solid } = prepareIsland(await loadGeometry('site/media/phoenix-island/island.glb'));
  const triangles = [], p = new THREE.Vector3();
  for (const mesh of solid.filter(mesh => /ile-sable|ile-herbe|ile-roc|_roc_/.test(mesh.name))) {
    const vertices = mesh.geometry.attributes.position, index = mesh.geometry.index;
    for (let i = 0; i < (index?.count || vertices.count); i += 3) {
      const points = [];
      for (let j = 0; j < 3; j++) {
        p.fromBufferAttribute(vertices, index ? index.getX(i + j) : i + j).applyMatrix4(mesh.matrixWorld);
        points.push([p.x, p.y, p.z]);
      }
      // Clip at the normalized ocean surface. Underwater parts of a coastal
      // triangle must not turn the plan into the mesh's rectangular sea floor.
      const clipped = [];
      let previous = points[2];
      for (const point of points) {
        if ((point[1] >= .05) !== (previous[1] >= .05)) {
          const t = (.05 - previous[1]) / (point[1] - previous[1]);
          clipped.push(previous.map((value,axis)=>value+(point[axis]-value)*t));
        }
        if (point[1] >= .05) clipped.push(point);
        previous = point;
      }
      for (let j=1;j+1<clipped.length;j++) {
        const [a,b,c]=[clipped[0],clipped[j],clipped[j+1]];
        const area = Math.abs((b[0]-a[0])*(c[2]-a[2])-(c[0]-a[0])*(b[2]-a[2]));
        if (area < .8) continue;
        triangles.push([a[0],a[2],b[0],b[2],c[0],c[2],(a[1]+b[1]+c[1])/3].map(v=>Math.round(v*10)/10));
      }
    }
  }
  triangles.sort((a,b)=>a[6]-b[6]);
  const output = { source:'ISLAND by Stéphane Agullo; exact normalized ground geometry projected in X/Z', triangles };
  const target = process.argv[2] || 'design/phoenix-flight/island-plan.json';
  fs.writeFileSync(target, JSON.stringify(output));
  console.log(`Projected ${triangles.length} actual ground faces; ${fs.statSync(target).size} bytes: ${target}`);
})().catch(error=>{console.error(error);process.exitCode=1;});
