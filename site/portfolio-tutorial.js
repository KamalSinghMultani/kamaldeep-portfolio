/* Thirteen real discoveries reward exploration with the complete film. */
(function(){
'use strict';
const app=document.getElementById('game'),panel=document.getElementById('game-scene');
const objectives=[
 ['intro',0,2,'[data-discovery="intro"] summary','Open MEET KAMALDEEP to learn who I am.','Trace the red signal.'],
 ['education',0,5,'[data-discovery="education"] summary','Explore my education and background.','Identify the bank arrival.'],
 ['category',1,7,'.category-tabs a:not([aria-current])','Choose a skill area to explore my toolkit.','Witness the bank breach.'],
 ['tool',1,9,'.tool-inventory a:not([aria-current])','Select a technology to discover how I use it.','Follow the robbery into the escape.'],
 ['lab',1,11,'.tool-evidence [data-lab]','Open the related lab for practical context.','Set the pursuit in motion.'],
 ['challenge',2,13,'[data-discovery="challenge"] summary','Open the challenge behind this project.','Track the getaway.'],
 ['build',2,15,'.chapter-tabs a[href$="/build"]','Explore BUILD to see my implementation.','Launch the city chase.'],
 ['evidence',2,17,'.chapter-tabs a[href$="/evidence"]','Explore EVIDENCE to see what the work demonstrates.','Follow the target underground.'],
 ['responsibilities',3,19,'[data-discovery="responsibilities"] summary','Open my responsibilities at this workplace.','Search the garage.'],
 ['process',3,21,'.workflow details:not([open]) summary','Open a process step to learn how I solve problems.','Face the ambush.'],
 ['contributions',3,23,'[data-discovery="contributions"] summary','Explore my contributions and outcomes.','Resolve the confrontation.'],
 ['contact',4,29,'[data-discovery="contact"] summary','Open LET’S WORK TOGETHER to explore ways to connect.','Watch the rooftop duel.'],
 ['ending',4,32,'[data-discovery="ending"]','Finish the story. No email or external visit required.','Reveal the citywide twist.']
].map(([id,act,end,selector,prompt,reward])=>({id,act,end,selector,prompt,reward}));
let done=new Set();try{const saved=JSON.parse(localStorage.getItem('portfolio-discoveries-v1')||'[]');if(Array.isArray(saved))done=new Set(saved.filter(id=>objectives.some(o=>o.id===id)));}catch(_){}
let act=0,beat=0,on=true,target=null,coach=null,lastCompleted='',pendingLab=null;
const guide=document.getElementById('movie-guide'),text=document.getElementById('movie-guide-text'),step=document.getElementById('movie-guide-step'),find=document.getElementById('movie-guide-find'),toggle=document.getElementById('movie-guide-toggle');
function pending(){return objectives.find(o=>o.act===act&&!done.has(o.id));}
function complete(o,href){
 if(!o||done.has(o.id))return false;
 done.add(o.id);lastCompleted=o.id;
 try{localStorage.setItem('portfolio-discoveries-v1',JSON.stringify([...done]));}catch(_){}
 const base=href||location.hash.split('?')[0];
 location.hash=base+'?beat='+Math.max(beat,o.end);
 refresh(act,Math.max(beat,o.end),on);
 return true;
}
function refresh(section,value,enabled){
 const readingOffset=panel.scrollTop;
 act=section;beat=value;on=enabled;
 panel.querySelectorAll('[data-guide-target]').forEach(el=>{el.removeAttribute('data-guide-target');el.removeAttribute('aria-describedby');});
 app.querySelectorAll('.game-nav [data-guide-target]').forEach(el=>{el.removeAttribute('data-guide-target');el.removeAttribute('aria-describedby');});
 if(coach){coach.remove();coach=null;}
 target=null;guide.hidden=!on;app.dataset.guide=on?'on':'off';
 toggle.textContent=on?'TUTORIAL ON':'SHOW TUTORIAL';toggle.setAttribute('aria-pressed',String(on));
 const o=pending();let message='All 13 discoveries explored. Revisit any section or replay the film.',reward='Your progress is saved.';
 if(o){target=panel.querySelector(o.selector);message=o.prompt;reward=o.reward;
  if(!target&&o.id==='challenge'){target=panel.querySelector('.chapter-tabs a[href$="/challenge"]');message='Return to CHALLENGE, then open the project’s problem.';}
 }else{
  const remaining=objectives.find(item=>!done.has(item.id));
  if(remaining){const routes=['status','arsenal','targets','records','contact'];target=app.querySelector('.game-nav a[data-screen="'+routes[remaining.act]+'"]');message='Section explored. Choose '+['ABOUT','SKILLS','PROJECTS','EXPERIENCE','CONTACT'][remaining.act]+' for your next discovery.';reward='Continue exploring my work.';}
 }
 step.textContent='DISCOVERIES · '+done.size+' / 13';
 text.textContent=message;
 find.hidden=!target;find.textContent='SHOW ME WHERE →';find.setAttribute('aria-label','Show the next portfolio discovery');
 document.getElementById('movie-next').removeAttribute('data-guide-next');
 if(on&&target){
  target.setAttribute('data-guide-target','true');target.setAttribute('aria-describedby','tutorial-coach');
  coach=document.createElement('aside');coach.id='tutorial-coach';coach.className='tutorial-coach';coach.setAttribute('role','note');
  const title=document.createElement('strong');title.textContent=(lastCompleted?'DISCOVERY SAVED · ':'')+'YOUR NEXT DISCOVERY';
  const copy=document.createElement('p');copy.textContent=message;
  const payoff=document.createElement('span');payoff.textContent='STORY REWARD · '+reward;
  coach.append(title,copy,payoff);
  if(panel.contains(target)){
   const anchor=target.closest('details,nav')||target;
   anchor.before(coach);
  }else{guide.append(coach);}
 }
 const finish=panel.querySelector('[data-discovery="ending"]');if(finish)finish.hidden=!done.has('contact');
 panel.querySelectorAll('[data-discovery]').forEach(el=>{el.dataset.discovered=String(done.has(el.dataset.discovery));});
 panel.scrollTop=readingOffset;
}
function interact(event){
 if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button>0)return false;
 const el=event.target.closest('a,button');if(!el||!panel.contains(el))return false;
 const choices=[['category','.category-tabs a'],['tool','.tool-inventory a'],['lab','.tool-evidence [data-lab]'],['build','.chapter-tabs a[href$="/build"], .chapter-footer a[href$="/build"]'],['evidence','.chapter-tabs a[href$="/evidence"], .chapter-footer a[href$="/evidence"]'],['ending','[data-discovery="ending"]']];
 const match=choices.find(([,selector])=>el.matches(selector));if(!match)return false;
 const o=objectives.find(item=>item.id===match[0]&&item.act===act);if(!o||done.has(o.id))return false;
 if(o.id==='ending'&&!done.has('contact'))return false;
 if(o.id==='lab'){pendingLab=o;return true;}
 const href=el.getAttribute('href');
 if(href)event.preventDefault();
 complete(o,href&&href.split('?')[0]);return true;
}
function disclose(el){
 let id=el.dataset.discovery;if(!id&&el.matches('.workflow details'))id='process';
 complete(objectives.find(o=>o.id===id&&o.act===act));
}
const lab=document.getElementById('lab');
if(lab&&typeof MutationObserver!=='undefined')new MutationObserver(()=>{if(lab.hidden&&pendingLab){const item=pendingLab;pendingLab=null;if(act===item.act)complete(item);}}).observe(lab,{attributes:true,attributeFilter:['hidden']});
function locate(){if(target){(coach&&panel.contains(coach)?coach:target).scrollIntoView({block:'start',behavior:'instant'});target.focus({preventScroll:true});}}
document.getElementById('tutorial-restart').addEventListener('click',()=>{done.clear();lastCompleted='';pendingLab=null;try{localStorage.removeItem('portfolio-discoveries-v1');}catch(_){}panel.querySelectorAll('details[open]').forEach(el=>el.open=false);location.hash='#about?beat=0';refresh(0,0,on);});
window.PortfolioTutorial={refresh,interact,disclose,find:locate};
})();
