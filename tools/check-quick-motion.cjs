const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const sandbox={};vm.runInNewContext(fs.readFileSync('site/quick-motion.js','utf8'),sandbox);
let depth=0,ops=0;
const c=new Proxy({}, {get(_,key){return (...args)=>{ops++;for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg),`${key} must use finite coordinates`);if(key==='save')depth++;if(key==='restore')depth--;assert.ok(depth>=0,'balanced canvas state');};},set(){return true;}});
for(const kind of ['walk','workshop','operations','tools','city','card'])for(const t of [0,.5,1.8,2.1,3.4,12.1,17,1234])for(const p of [0,.5,1]){sandbox.QuickSceneCore.paint(c,kind,t,p,Math.floor(t)%5);assert.equal(depth,0,kind+' must restore transforms');}
assert.ok(ops>10000);
// Each scene must be optional: factual sections and actions are present in built HTML.
const q=fs.readFileSync('dist/site/quick.html','utf8');
assert.equal((q.match(/<canvas data-quick-scene=/g)||[]).length,6);
for(const id of ['projects','experience','skills','education','contact'])assert.ok(q.includes(`id="${id}"`));
assert.ok(q.includes('href="kamaldeep-singh-resume.pdf"'));
assert.ok(q.includes('prefers-reduced-motion: reduce'));
console.log('Quick scenes passed: six renderers at 144 time/scroll combinations; finite geometry, balanced canvas state, ungated content.');
// Exercise user-visible lifecycle behavior with controlled browser clocks.
function lifecycle(prefersReduced=false){
 let calls=0,seq=0;const frames=new Map(),events={},intersections=[];
 const noop=()=>{},classes={add:noop,toggle:noop};
 const ctx=new Proxy({}, {get:()=>()=>{calls++;},set:()=>true});
 const canvas={dataset:{quickScene:'walk'},parentElement:{classList:classes},getContext:()=>ctx,getBoundingClientRect:()=>({top:100,height:740})};
 const button={hidden:true,addEventListener:(k,f)=>events[k]=f,setAttribute:noop};
 const doc={hidden:false,documentElement:{classList:classes},querySelectorAll:s=>s==='[data-quick-scene]'?[canvas]:[],getElementById:()=>button,querySelector:()=>({hidden:true}),addEventListener:(k,f)=>events[k]=f};
 const env={document:doc,devicePixelRatio:1,innerHeight:900,matchMedia:()=>({matches:prefersReduced,addEventListener:noop}),requestAnimationFrame:f=>{frames.set(++seq,f);return seq;},cancelAnimationFrame:id=>frames.delete(id),ResizeObserver:class{constructor(cb){this.cb=cb}observe(target){this.cb([{target,contentRect:{width:600,height:740}}]);}},IntersectionObserver:class{constructor(cb){intersections.push(cb)}observe(){}unobserve(){}}};env.window=env;
 vm.runInNewContext(fs.readFileSync('site/quick-motion.js','utf8'),env);
 function step(now){const pending=[...frames.values()];frames.clear();pending.forEach(f=>f(now));}
 function visible(v){intersections[0]([{target:canvas,isIntersecting:v}]);}
 visible(true);
 if(prefersReduced){assert.equal(frames.size,0,'reduced motion starts still');assert.equal(button.textContent,'ENABLE ANIMATION');events.click();}
 step(10);step(50);assert.equal(canvas.dataset.sceneTime,'0.04','visible clock advances');
 events.click();const frozen=canvas.dataset.sceneTime;assert.equal(frames.size,0,'pause cancels rendering');assert.equal(frozen,'0.04','pause preserves action position');
 events.click();step(100);step(140);assert.equal(canvas.dataset.sceneTime,'0.08','resume has no time jump');
 visible(false);assert.equal(frames.size,0,'offscreen rendering is suspended');step(180);assert.equal(canvas.dataset.sceneTime,'0.08');
 visible(true);doc.hidden=true;const before=calls;events.visibilitychange();assert.equal(frames.size,0,'hidden document has no rendering loop');assert.equal(calls,before,'hidden document does not paint');
 doc.hidden=false;events.visibilitychange();step(1000);step(1040);assert.equal(canvas.dataset.sceneTime,'0.12','background time is not replayed');
}
lifecycle();lifecycle(true);
console.log('Lifecycle passed: reduced motion, visible-only clocks, pause/resume continuity, hidden-tab suspension.');
// Regression coverage for the former elastic arms and sliding/floating feet.
const core=sandbox.QuickSceneCore;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function rigid(rig,upper,lower){assert.ok(Math.abs(distance(rig.root,rig.joint)-upper)<1e-7);assert.ok(Math.abs(distance(rig.joint,rig.end)-lower)<1e-7);}
for(let frame=0;frame<600;frame++){
 const t=frame/60,walk=core.walkPose(t),work=core.workshopPose(t),card=core.cardPose(t);
 walk.legs.forEach(leg=>{rigid(leg,56,55);if(leg.planted){assert.equal(leg.end[1],-5,'support foot stays on the floor');const next=core.walkPose(t+.00001).legs[walk.legs.indexOf(leg)];if(next.planted)assert.ok(Math.abs((next.end[0]-leg.end[0])/.00001+core.STRIDE/(core.STANCE*core.WALK_PERIOD))<1e-4,'planted foot matches road speed');}});
 walk.arms.forEach(arm=>rigid(arm,43,42));rigid(work,43*1.03,42*1.03);rigid(card.arm,43*1.2,42*1.2);
 assert.ok(card.arm.joint[1]>card.arm.root[1],'card elbow stays below shoulder');
 if(card.holding)assert.ok(distance(card.arm.end,card.grip)<1e-7,'held card stays attached to hand');
 if(t>1.95)assert.deepEqual(card.card,core.cardPose(1.95).card,'released card remains on table');
}
for(const root of [[0,0],[10,-20]])for(const target of [[0,0],[1e5,-1e5],[-4,2]])rigid(core.solveLimb(root,target,54,51),54,51);
const loopA=core.walkPose(.00001),loopB=core.walkPose(core.WALK_PERIOD+.00001);loopA.legs.forEach((leg,i)=>assert.ok(distance(leg.end,loopB.legs[i].end)<1e-7));
console.log('Character motion passed: 600 frames of fixed bone lengths, ground contact/speed, attached props, restrained elbows, release holds and seamless gait loop.');
