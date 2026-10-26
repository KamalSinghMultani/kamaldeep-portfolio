const assert=require('node:assert/strict');
require('../site/movie-scene.js');
const {Timeline,shot,effects,beatInfo,acts,ends,surveillance}=globalThis.MovieCore;
function finish(c){for(let i=0;i<1100;i++)c.advance(1/60);}
const clock=new Timeline();clock.seek(32);const seen=new Set();for(let i=0;i<1000;i++){clock.advance(1/60);seen.add(shot(clock.value).index);}
assert.equal(clock.value,32);assert.equal(seen.size,11,'End-to-end jumps visit all eleven locations');
const wet=clock.weather;clock.seek(0);const reverse=new Set();for(let i=0;i<1000;i++){clock.advance(1/60);reverse.add(shot(clock.value).index);}
assert.equal(clock.value,0);assert.equal(reverse.size,11);assert(clock.weather>wet);
const state=effects(28.6);clock.seek(28.6,true);clock.seek(0);finish(clock);clock.seek(28.6,true);assert.deepEqual(effects(clock.value),state,'Destruction is reconstructed from story position');
assert.equal(effects(21).brokenLight,0);assert.equal(effects(23).brokenLight,1);assert.equal(effects(21).fall,0);assert.equal(effects(23).fall,1);assert.equal(effects(27).bagTear,0);assert.equal(effects(29).bagTear,1);assert(effects(31.6).dots>30);
clock.seek(0,true);clock.seek(32);for(let i=0;i<145;i++)clock.advance(1/60);const position=clock.value;clock.seek(0);assert.equal(clock.value,position);finish(clock);assert.equal(clock.value,0);
for(let i=0;i<120;i++){clock.seek(i%2?32:0);clock.advance(1/60);assert(clock.value>=0&&clock.value<=32);}clock.seek(19);finish(clock);assert.equal(clock.value,19);
let before=clock.weather;clock.advance(.03);assert.equal(clock.value,19);assert(clock.weather>before);before=clock.weather;clock.advance(.03,false);assert.equal(clock.weather,before);
for(let act=0;act<5;act++)for(let i=acts[act];i<=ends[act];i++)assert.equal(beatInfo(i).act,act);
assert.equal(shot(2.99).index,0);assert(shot(2.99).cut>.99);assert.equal(shot(3).index,1);assert.equal(beatInfo(32).next,'REPLAY THE FILM');
assert.equal(surveillance(0).signal,0);assert.equal(surveillance(0).carArrival,0);
assert(surveillance(1).signal>0);assert(surveillance(1).linked>.9);assert.equal(surveillance(1).carArrival,0,'Map alert and camera link precede the car');
assert.equal(surveillance(2).carArrival,1);assert.equal(surveillance(2).cut,0,'Hold the parked car in CCTV before cutting outside');
assert.equal(surveillance(2.62).cut,1);
const arrival=surveillance(1.6);clock.seek(3,true);clock.seek(1.6);finish(clock);assert.deepEqual(surveillance(clock.value),arrival,'Rewinding restores the same CCTV arrival');
console.log('Passed: 11-location forward/reverse traversal, 33-beat mapping, deterministic impacts, interrupted retargeting, ambient independence, pause, and final replay.');
