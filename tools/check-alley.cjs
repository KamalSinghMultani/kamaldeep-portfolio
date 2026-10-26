// Behavioral checks for reversible action, independent weather, and interrupted navigation.
const assert=require('node:assert/strict');
require('../site/alley-scene.js');
const {Timeline,action}=globalThis.AlleyCore;
function finish(clock){for(let i=0;i<210;i++)clock.advance(1/60);}
const clock=new Timeline();
clock.seek(4);assert.equal(clock.duration,3);
const forward=[];for(let i=0;i<180;i++){clock.advance(1/60);forward.push(clock.value);}
finish(clock);assert.equal(clock.value,4);assert.equal(action(clock.value).impact,1);
assert(forward.some(t=>t>.92&&t<1.14),'Forward jumps pass through the first shot');
assert(forward.some(t=>t>3.48&&t<3.68),'Forward jumps pass through the return shot');
const rain=clock.weather;clock.seek(0);const reverse=[];
for(let i=0;i<181;i++){clock.advance(1/60);reverse.push(clock.value);}
assert.equal(clock.value,0);assert(clock.weather>rain,'Weather never rewinds');
assert.equal(action(clock.value).impact,0,'Debris and fallen silhouettes return to their intact state');
assert(reverse.some(t=>t>1&&t<2),'Reverse jumps carry the bullet back along its path');
const stateBefore=action(1.6);clock.seek(1.6,true);assert.deepEqual(action(clock.value),stateBefore,'Action drawing depends only on playhead, not visit history');
clock.seek(4);for(let i=0;i<30;i++)clock.advance(1/60);
const position=clock.value,velocity=clock.velocity;clock.seek(0);
assert.equal(clock.value,position,'Retargeting cannot snap the playhead');
assert.equal(clock.initialVelocity,Math.max(-2,Math.min(2,velocity)),'Retargeting preserves bounded momentum');
finish(clock);assert.equal(clock.value,0);
for(let j=0;j<80;j++){clock.seek(j%2?0:4);clock.advance(1/60);assert(clock.value>=0&&clock.value<=4);}
clock.seek(3);finish(clock);assert.equal(clock.value,3,'Rapid clicks settle at the newest target');
const held=clock.value,wet=clock.weather;for(let i=0;i<120;i++)clock.advance(1/60);
assert.equal(clock.value,held);assert(clock.weather>wet,'Weather continues after section arrival');
const frozen=clock.weather;clock.advance(.02,false);assert.equal(clock.weather,frozen);
clock.seek(4,true);assert.equal(clock.value,4);assert.equal(clock.duration,0);
assert.equal(action(0).bulletVisible,false);assert.equal(action(2).bulletVisible,true);
console.log('Passed: full forward/reverse traversal, deterministic reconstruction, independent weather, idle rain, interruption continuity, bounds, rapid retargeting, and reduced-motion seek.');
