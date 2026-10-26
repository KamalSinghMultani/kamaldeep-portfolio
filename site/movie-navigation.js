/* One URL holds the resume route and its reversible film beat. */
(function(){
'use strict';
const core=window.MovieCore;if(!core)return;
const canonical=['about','skills','projects','experience','contact'];
const aliases={status:0,about:0,arsenal:1,skills:1,targets:2,projects:2,records:3,experience:3,contact:4};
const app=document.getElementById('game'),previous=document.getElementById('movie-previous'),next=document.getElementById('movie-next'),chapters=document.getElementById('movie-chapters');
let beat=0,act=0;
const guide=document.getElementById('movie-guide'),guideText=document.getElementById('movie-guide-text'),guideToggle=document.getElementById('movie-guide-toggle');
let guideOn=true;try{guideOn=localStorage.getItem('portfolio-guide')!=='off';}catch(_){}
let guideTarget=null;
const guideStep=document.getElementById('movie-guide-step'),guideFind=document.getElementById('movie-guide-find');
function updateGuide(){if(window.PortfolioTutorial){window.PortfolioTutorial.refresh(act,beat,guideOn);return;}}
if(guideFind)guideFind.addEventListener('click',()=>{window.PortfolioTutorial?.find();});
if(guideToggle)guideToggle.addEventListener('click',()=>{guideOn=!guideOn;try{localStorage.setItem('portfolio-guide',guideOn?'on':'off');}catch(_){}updateGuide();});
chapters.innerHTML=core.scenes.map((s,i)=>'<button type="button" data-movie-chapter="'+i+'" aria-label="Scene '+(i+1)+': '+s[0]+'">'+String(i+1).padStart(2,'0')+'</button>').join('');
function routeFor(value){const info=core.beatInfo(value),base=info.act===act?location.hash.split('?')[0]:'#'+canonical[info.act];return (base||'#about')+'?beat='+value;}
function move(value){location.hash=routeFor(Math.max(0,Math.min(32,value)));}
function advance(){if(!window.PortfolioTutorial&&beat<core.ends[act])move(beat+1);}
function sync(section,changed,initial){act=section;const query=location.hash.split('?')[1]||'',raw=new URLSearchParams(query).get('beat'),parsed=raw!==null&&/^\d+$/.test(raw)?Number(raw):NaN;
 const value=Number.isFinite(parsed)?Math.max(core.acts[act],Math.min(core.ends[act],parsed)):(changed||initial?core.acts[act]:beat);
 if(raw===null||!Number.isFinite(parsed)||parsed!==value)history.replaceState(null,'',location.hash.split('?')[0]+'?beat='+value);
 const moved=value!==beat||initial;beat=value;const info=core.beatInfo(beat);updateGuide();
 document.getElementById('alley-beat-number').textContent=String(info.scene+1).padStart(2,'0');
 document.getElementById('alley-beat-name').textContent=info.title;
 document.getElementById('movie-description').textContent=info.description;
 document.getElementById('movie-beat-count').textContent=String(beat+1).padStart(2,'0')+' / 33';
 next.textContent=(window.PortfolioTutorial?'OPTIONAL · ':'')+info.next+' →';next.setAttribute('aria-label',(beat===32?'Replay film':'Next beat: '+info.next));previous.disabled=beat===0;
 chapters.querySelectorAll('button').forEach((b,i)=>{if(i===info.scene)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
 if(moved){window.MovieScene.go(beat,initial);document.getElementById('movie-announcement').textContent='Scene '+(info.scene+1)+'. '+info.title+'. '+info.description;}
}
previous.addEventListener('click',()=>move(beat-1));next.addEventListener('click',()=>move(beat===32?0:beat+1));
chapters.addEventListener('click',e=>{const button=e.target.closest('[data-movie-chapter]');if(button)move(Number(button.dataset.movieChapter)*3);});
function interact(event){if(event.defaultPrevented)return;if(window.PortfolioTutorial?.interact(event))return;const a=event.target.closest('#game-scene a[href^="#"]');if(!a||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button>0)return;
 const hash=a.getAttribute('href'),target=aliases[hash.slice(1).split('/')[0]];if(target!==act)return;if(window.PortfolioTutorial){event.preventDefault();location.hash=hash.split('?')[0]+'?beat='+beat;return;}
 const oldParts=location.hash.split('?')[0].split('/'),newParts=hash.split('?')[0].split('/'),order=['challenge','build','evidence'];
 const backward=act===2&&oldParts[1]===newParts[1]&&order.includes(oldParts[2])&&order.includes(newParts[2])&&order.indexOf(newParts[2])<order.indexOf(oldParts[2]);
 if(a.getAttribute('aria-current'))return;
 event.preventDefault();location.hash=hash.split('?')[0]+'?beat='+Math.min(core.ends[act],Math.max(core.acts[act],beat+(backward?-1:1)));
}
document.getElementById('game-scene').addEventListener('toggle',e=>{if(e.target.tagName==='DETAILS'&&e.target.open&&e.target.isConnected){if(window.PortfolioTutorial)window.PortfolioTutorial.disclose(e.target);else advance();}},true);
const controls=guide&&guide.parentElement;
if(controls&&typeof ResizeObserver!=='undefined'){const fitGuide=()=>app.style.setProperty('--movie-controls-height',controls.getBoundingClientRect().height+'px');new ResizeObserver(fitGuide).observe(controls);fitGuide();}
window.MovieNavigation={sync,interact,advance,updateGuide};
})();
