// Check the real renderer and routing against real portfolio data, without a GPU.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const page = fs.readFileSync(path.join(__dirname,'../site/index.src.html'),'utf8');
const source = fs.readFileSync(path.join(__dirname,'../site/game-menu.js'),'utf8');
const dataSource = page.slice(page.indexOf('  var STATS ='),page.indexOf('  function el('));
const dataContext = {};
vm.runInNewContext(dataSource+'\nthis.data={missions:MISSIONS,stats:STATS,labs:LABS,skills:SKILLS,categories:CATS};',dataContext);
const data = dataContext.data;
data.demos = {};
let openedLab = null;
data.openLab = (name) => { openedLab = name; };
const names=['status','arsenal','targets','records','contact'];
const destinations=[];
let paused = true;
const events = {};
function element() {
  const attrs={};
  return { innerHTML:'',textContent:'',hidden:false,inert:false,scrollTop:0,handlers:{},dataset:{},
    classList:{add(){},remove(){},toggle(){},contains(){return paused;}},
    addEventListener(k,fn){this.handlers[k]=fn;},
    setAttribute(k,v){attrs[k]=v;},removeAttribute(k){delete attrs[k];},
    appendChild(){},replaceChildren(){},remove(){},focus(){this.focused=true;},
    getAnimations(){return [];},
    querySelectorAll(){return [];},
    animate(){
      let finish;
      const finished=new Promise(resolve=>{finish=resolve;});
      const animation={finished,cancel:finish,finish};
      queueMicrotask(finish);
      return animation;
    }
  };
}
const menu = names.map(name=>{const a=element();a.dataset.screen=name;a.querySelector=()=>element();return a;});
const nodes={};
for(const id of ['game','game-scene','alley-stage','alley-menu-toggle','alley-motion','alley-beat-name','alley-beat-number','game-scene-count','game-announcement','lab']){
  assert.ok(page.includes('id="'+id+'"'),'Source has '+id);
  nodes[id]=element();
}
nodes.lab.hidden=true;
const back=element(),nav=element(),heading=element(),diagram=element(),controls=element();
nodes.game.querySelectorAll=()=>menu;
nodes.game.querySelector=selector=>({'.game-back':back,'.game-nav':nav,'.duality-controls':controls}[selector]);
nodes['game-scene'].querySelector=selector=>selector==='h1'?heading:selector==='#project-diagram'&&nodes['game-scene'].innerHTML.includes('id="project-diagram"')?diagram:null;
const document={createElement(){return element();},title:'',activeElement:menu[0],documentElement:element(),
  getElementById(id){return nodes[id] || (id.startsWith('dg-')?{content:{cloneNode(){return {};}}}:null);},
  querySelector(){return element();},addEventListener(k,fn){events['document-'+k]=fn;}};
const location={hash:'#menu'};
const context={window:{PORTFOLIO:data,AlleyScene:{go(index,instant){destinations.push({index,instant});}},addEventListener(k,fn){events[k]=fn;},dispatchEvent(){}},document,location,
  navigator:{clipboard:{writeText:async()=>{}}},
  CustomEvent:class{constructor(type,args){this.type=type;this.detail=args.detail;}},console};
vm.runInNewContext(source,context);
async function route(hash){location.hash=hash;await events.hashchange();return nodes['game-scene'].innerHTML;}
(async()=>{
  assert.equal(nodes.game.hidden,false);
  assert.match(await route('#status'),/SHERIDAN COLLEGE/);
  assert.match(await route('#status'),/data-lab="DIRECTORY SERVICES"/);
  for(const mission of data.missions){
    for(const chapter of ['challenge','build','evidence']){
      const html=await route('#targets/'+mission.id+'/'+chapter);
      assert.match(html,/aria-current="step"/);
      assert.ok(!html.includes('undefined'),'No missing project content');
      assert.ok(html.includes(mission.stack[0]));
      assert.match(html,/MY CONTRIBUTION|REPLAY BUILD|WHAT THE PROJECT DEMONSTRATES/);
    }
  }
  assert.match(await route('#targets/ad/evidence'),/repadmin \/replsummary/);
  for(const role of ['pearson','samskrita']){
    const html=await route('#records/'+role);
    assert.match(html,/EXPLORE MY PROCESS/);
    assert.match(html,/KEY CONTRIBUTIONS/);
  }
  for(const cat of ['dir','cloud','net','auto','dev']){
    const html=await route('#arsenal/'+cat);
    assert.match(html,/aria-label="Select a tool"/);
    assert.ok(!html.includes('undefined'));
  }
  assert.match(await route('#arsenal/auto/PowerShell'),/Automate recurring administration/);
  for(const [alias,index] of [['about',0],['skills',1],['projects',2],['experience',3],['contact',4]]){
    await route('#'+alias);assert.equal(destinations.at(-1).index,index);
  }
  await route('#projects/ad/challenge');const moves=destinations.length;
  await route('#projects/ad/build');assert.equal(destinations.length,moves,'Opening project detail must not advance the confrontation');
  nodes['game-scene'].scrollTop=180;await route('#skills');await route('#projects/ad/build');
  assert.equal(nodes['game-scene'].scrollTop,180,'Returning to detail restores its reading position');
  const contact=await route('#contact');
  assert.match(contact,/mailto:singkamal670@gmail.com/);
  assert.match(contact,/https:\/\/github.com\/KamalSinghMultani/);
  assert.match(await route('#targets/not-a-project/not-a-chapter'),/ACTIVE DIRECTORY LAB/);
  assert.match(await route('#%invalid'),/KAMALDEEP/);
  assert.equal(nodes.game.dataset.screen,'status');
  await nodes.game.handlers.click({target:{closest(selector){return selector==='[data-lab]'?{dataset:{lab:'NETWORKING'}}:null;}}});
  assert.equal(openedLab,'NETWORKING');
  let prevented=false;
  nav.handlers.keydown({key:'ArrowDown',preventDefault(){prevented=true;}});
  assert.equal(prevented,true);assert.equal(menu[1].focused,true);
  paused=false;
  location.hash='#targets/ad/build';const first=events.hashchange();
  location.hash='#contact';const last=events.hashchange();
  await Promise.all([first,last]);
  assert.equal(nodes.game.dataset.screen,'contact');
  assert.match(nodes['game-scene'].innerHTML,/LET’S BUILD/);
  assert.equal(nodes['game-scene'].inert,false,'Rapid navigation cannot leave the scene disabled');
  console.log('Passed: all 5 sections, 9 project chapters, 2 roles, 5 skill categories, deep links, malformed routes, lab dispatch, keyboard menu, and interrupted transitions.');
})().catch(error=>{console.error(error);process.exitCode=1;});
