const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const sceneSource=fs.readFileSync('site/movie-scene.js','utf8'),navSource=fs.readFileSync('site/movie-navigation.js','utf8');
const nodes={},events={},frames=[];let motionChanges=0,drawCalls=0;
function node(){const attrs={};return {dataset:{},innerHTML:'',textContent:'',handlers:{},disabled:false,
  setAttribute(k,v){attrs[k]=String(v);},getAttribute(k){return attrs[k]??null;},removeAttribute(k){delete attrs[k];},
  addEventListener(k,fn){this.handlers[k]=fn;},querySelectorAll(){return [];},getBoundingClientRect(){return {width:900,height:500};},classList:{toggle(){}}};}
for(const id of ['game','alley-stage','alley-motion','movie-location','movie-previous','movie-next','movie-chapters','game-scene','alley-beat-number','alley-beat-name','movie-description','movie-beat-count','movie-announcement','movie-guide','movie-guide-text','movie-guide-toggle'])nodes[id]=node();
const chapterButtons=Array.from({length:11},node);nodes['movie-chapters'].querySelectorAll=()=>chapterButtons;
const canvasContext=new Proxy({},{get(obj,key){if(key in obj)return obj[key];return (...args)=>{drawCalls++;for(const x of args)if(typeof x==='number')assert(Number.isFinite(x),'Canvas geometry must be finite: '+key);};},set(obj,key,value){obj[key]=value;return true;}});
nodes['alley-stage'].getContext=()=>canvasContext;
const location={hash:'#about'},history={replaceState(_s,_t,url){location.hash=url;}};
const document={hidden:false,documentElement:node(),getElementById(id){return nodes[id];},addEventListener(k,fn){events[k]=fn;}};
const context={document,location,history,URLSearchParams,console,devicePixelRatio:1,matchMedia(){return {matches:false,addEventListener(){}};},localStorage:{getItem(){return null;},setItem(){}},
  requestAnimationFrame(fn){frames.push(fn);return frames.length;},cancelAnimationFrame(){},ResizeObserver:class{observe(){}},IntersectionObserver:class{observe(){}},CustomEvent:class{constructor(type,args){this.type=type;this.detail=args?.detail;}},
  addEventListener(k,fn){events[k]=fn;},dispatchEvent(event){if(event.type==='portfolio-motion-change'){assert.equal(typeof event.detail.paused,'boolean');motionChanges++;}}};
context.cast=[];context.cars=[];
const observedSource=sceneSource.replace('function actor(x,y,s,time,o={}){','function actor(x,y,s,time,o={}){globalThis.cast.push({x,y,s,kind:o.kind,from:o.from,to:o.to,mix:o.mix,gun:o.gun});').replace('function car(x,y,s,time,o={}){','function car(x,y,s,time,o={}){globalThis.cars.push({x,y,s,door:o.door});');
context.window=context;vm.createContext(context);vm.runInContext(observedSource,context);vm.runInContext(navSource,context);
// Sample all drawings, including cross-location wipes, without needing a GPU.
for(let i=0;i<=320;i++)context.MovieScene.go(i/10,true);
assert(drawCalls>50000);assert.equal(nodes['alley-stage'].dataset.chapter,'11');
context.cast=[];context.cars=[];context.MovieScene.go(20.62,true);const garageCast=JSON.stringify(context.cast.slice(0,2)),garageCars=JSON.stringify(context.cars.slice(0,4)); // A wipe may also render the incoming view.
context.cast=[];context.cars=[];context.MovieScene.go(21,true);assert.equal(JSON.stringify(context.cast),garageCast,'Garage cast does not jump at the chapter cut');assert.equal(JSON.stringify(context.cars),garageCars,'Garage vehicles retain their placement');
for(const beat of [24,25,26,27,28,29,28,27,26,30,31]){context.cast=[];context.MovieScene.go(beat,true);assert.equal(context.cast.length,2,'Rooftop remains one-on-one, including rewind and the twist');assert.deepEqual(Array.from(context.cast,a=>a.kind).sort(),['boss','hero']);}
context.cast=[];context.MovieScene.go(23,true);const defeated=context.cast.filter(a=>a.kind==='mask');assert.equal(defeated.length,2);for(const a of defeated){assert.equal(a.to,'down');assert.equal(a.mix,1);assert(!a.gun,'Disarmed opponents do not retain their weapon');}
context.cast=[];context.MovieScene.go(29,true);assert.equal(context.cast.find(a=>a.kind==='boss').to,'down');assert.equal(context.cast.find(a=>a.kind==='hero').to,'ready');
context.MovieNavigation.sync(0,true,true);assert.equal(location.hash,'#about?beat=0');
nodes['movie-next'].handlers.click();assert.equal(location.hash,'#about?beat=1');context.MovieNavigation.sync(0,false,false);assert.equal(nodes['movie-beat-count'].textContent,'02 / 33');
location.hash='#skills';context.MovieNavigation.sync(1,true,false);assert.equal(location.hash,'#skills?beat=6');
const link={getAttribute(k){return k==='href'?'#arsenal/auto/PowerShell':null;}};let prevented=false;
context.MovieNavigation.interact({target:{closest(){return link;}},preventDefault(){prevented=true;}});assert(prevented);assert.equal(location.hash,'#arsenal/auto/PowerShell?beat=7');
context.MovieNavigation.sync(1,false,false);location.hash='#skills?beat=6';context.MovieNavigation.sync(1,false,false);assert.equal(nodes['movie-beat-count'].textContent,'07 / 33','Browser Back restores the explicit saved beat');
location.hash='#projects/ad/build?beat=15';context.MovieNavigation.sync(2,true,false);
context.MovieNavigation.interact({target:{closest(){return {getAttribute(k){return k==='href'?'#targets/ad/challenge':null;}};}},preventDefault(){}});assert.equal(location.hash,'#targets/ad/challenge?beat=14','Previous project chapter rewinds the story');
location.hash='#experience?beat=20';context.MovieNavigation.sync(3,true,false);nodes['game-scene'].handlers.toggle({target:{tagName:'DETAILS',open:true,isConnected:true}});assert.equal(location.hash,'#experience?beat=21');
context.MovieNavigation.sync(3,false,false);nodes['game-scene'].handlers.toggle({target:{tagName:'DETAILS',open:false,isConnected:true}});assert.equal(location.hash,'#experience?beat=21','Closing a detail does not advance');
location.hash='#experience?beat=23';context.MovieNavigation.sync(3,false,false);context.MovieNavigation.advance();assert.equal(location.hash,'#experience?beat=23');nodes['movie-next'].handlers.click();assert.equal(location.hash,'#contact?beat=24');
location.hash='#contact?beat=999';context.MovieNavigation.sync(4,true,false);assert.equal(location.hash,'#contact?beat=32');nodes['movie-next'].handlers.click();assert.equal(location.hash,'#about?beat=0');
// Every held beat supplies the exact visible next-button instruction.
// Pause and hidden-page guards are checked through the actual rendering layer.
nodes['alley-motion'].handlers.click();assert.equal(nodes['alley-motion'].getAttribute('aria-pressed'),'false');context.MovieScene.go(17);assert.equal(context.MovieScene.snapshot().action,17);
assert(motionChanges>=2);document.hidden=true;const calls=drawCalls;events.visibilitychange();assert.equal(drawCalls,calls,'A hidden document does not render');
const reduced={...context,matchMedia(){return {matches:true,addEventListener(){}};}};reduced.window=reduced;document.hidden=false;vm.createContext(reduced);vm.runInContext(sceneSource,reduced);assert.equal(nodes['alley-motion'].getAttribute('aria-pressed'),'false','System reduced motion is honored on first load');reduced.MovieScene.go(32);assert.equal(reduced.MovieScene.snapshot().action,32);
console.log('Passed: every authored scene and wipe renders finite geometry; garage continuity, one-on-one cast, defeated outcomes, contextual guide, skill/detail/chapter interactions, beat history, next-act/replay, URL repair, reduced motion, and hidden-page rendering.');
