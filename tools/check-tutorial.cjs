const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('site/portfolio-tutorial.js','utf8');
const saved={};let observer;
function element(){return {dataset:{},hidden:false,textContent:'',handlers:{},querySelector(){return null},querySelectorAll(){return []},contains(){return true},setAttribute(){},removeAttribute(){},addEventListener(k,f){this.handlers[k]=f}}}
const nodes={};for(const id of ['game','game-scene','movie-guide','movie-guide-text','movie-guide-step','movie-guide-find','movie-guide-toggle','movie-next','tutorial-restart','lab'])nodes[id]=element();
const context={document:{getElementById(id){return nodes[id]}},location:{hash:'#about?beat=0'},localStorage:{getItem(k){return saved[k]||null},setItem(k,v){saved[k]=v},removeItem(k){delete saved[k]}},MutationObserver:class{constructor(fn){observer=fn}observe(){}}};context.window=context;vm.createContext(context);vm.runInContext(source,context);
let tutorial=context.PortfolioTutorial;
function hold(act,beat){tutorial.refresh(act,beat,true)}
function disclosure(id){tutorial.disclose({dataset:{discovery:id},matches(s){return id==='process'}})}
function click(selector,href){const el={matches(s){return s.includes(selector)},getAttribute(){return href}};return tutorial.interact({target:{closest(){return el}},preventDefault(){}})}
const endpoints=[];function check(expected){assert.equal(Number(context.location.hash.split('beat=')[1]),expected);endpoints.push(expected)}
hold(0,0);disclosure('intro');check(2);disclosure('intro');check(2);disclosure('education');check(5);
hold(1,6);click('.category-tabs a','#arsenal/dir');check(7);click('.tool-inventory a','#arsenal/dir/DNS');check(9);click('.tool-evidence [data-lab]',null);check(9);nodes.lab.hidden=true;observer();check(11);
hold(2,12);disclosure('challenge');check(13);click('.chapter-tabs a[href$="/build"]','#targets/ad/build');check(15);click('.chapter-tabs a[href$="/evidence"]','#targets/ad/evidence');check(17);
hold(3,18);disclosure('responsibilities');check(19);disclosure('process');check(21);disclosure('contributions');check(23);
hold(4,24);const before=context.location.hash;click('[data-discovery="ending"]',null);assert.equal(context.location.hash,before);disclosure('contact');check(29);click('[data-discovery="ending"]',null);check(32);
assert.match(nodes['movie-guide-step'].textContent,/13 \/ 13/);
vm.runInContext(source,context);tutorial=context.PortfolioTutorial;hold(0,0);assert.match(nodes['movie-guide-step'].textContent,/13 \/ 13/,'Reload keeps discoveries');
nodes['tutorial-restart'].handlers.click();assert.equal(context.location.hash,'#about?beat=0');assert.match(nodes['movie-guide-step'].textContent,/0 \/ 13/);
hold(2,12);click('.chapter-tabs a[href$="/evidence"]','#targets/ad/evidence');check(17);disclosure('challenge');check(17);assert.match(nodes['movie-guide-text'].textContent,/BUILD/,'Free exploration finds the remaining discovery without rewinding');
console.log('Passed: all 13 objectives, grouped endpoints, duplicate prevention, modal reward timing, reload persistence, optional ending, restart, and out-of-order discovery.');
