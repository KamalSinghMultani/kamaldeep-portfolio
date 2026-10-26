/* Authored 2D companion scenes. Resume content never depends on this renderer. */
(function(scope){
'use strict';
const B='#08080a',W='#ffffff',R='#d81032',TAU=Math.PI*2;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),mix=(a,b,t)=>a+(b-a)*t,rand=n=>{const v=Math.sin(n*127.1+31.7)*43758;return v-Math.floor(v);};
// Two rigid bones meet at a solved hinge; an unreachable target is clamped,
// never accommodated by stretching a forearm or shin.
function solveLimb(root,target,upper,lower,bend=1){
 const dx=target[0]-root[0],dy=target[1]-root[1],raw=Math.hypot(dx,dy),d=clamp(raw,Math.abs(upper-lower)+.001,upper+lower-.001),ux=raw>1e-8?dx/raw:0,uy=raw>1e-8?dy/raw:1;
 const along=(upper*upper-lower*lower+d*d)/(2*d),height=Math.sqrt(Math.max(0,upper*upper-along*along));
 return {root,joint:[root[0]+ux*along-uy*height*bend,root[1]+uy*along+ux*height*bend],end:[root[0]+ux*d,root[1]+uy*d]};
}
const ease=n=>{const p=clamp(n);return p*p*p*(p*(p*6-15)+10);};
const WALK_PERIOD=1.65,STANCE=.64,STRIDE=64;
function walkPose(time){
 const cycle=((time/WALK_PERIOD)%1+1)%1,bob=Math.cos(cycle*TAU*2)*1.2;
 const legs=[0,.5].map((offset,index)=>{const phase=(cycle+offset)%1,planted=phase<STANCE,p=planted?phase/STANCE:(phase-STANCE)/(1-STANCE),foot=[planted?mix(32,-32,p):mix(-32,32,ease(p)),-5-(planted?0:Math.sin(Math.PI*p)**2*24)];return {...solveLimb([index?5:-5,-102+bob],foot,56,55,-1),planted,phase};});
 const arms=[0,.5].map(offset=>{const swing=-Math.cos((cycle+offset)*TAU)*22;return solveLimb([4,-199+bob],[8+swing,-124+bob],43,42,-1);});
 return {legs,arms,bob,cycle};
}
function workshopPose(time){
 // The torch tracks a short seam within the maker's reach.
 const seam=Math.sin(time*.8)*5;
 return solveLimb([637-33*1.03,413-193*1.03],[555+seam,275],43*1.03,42*1.03,-1);
}
function cardPose(time){
 const reach=ease((time-.35)/1.45),release=1.95,retract=ease((time-release)/1.15),x=mix(646,590,reach),y=mix(260,291,reach),angle=mix(-.25,-.12,reach),tilt=mix(1,.62,reach);
 const grip=[x+55*Math.cos(angle)+12*tilt*Math.sin(angle),y+55*Math.sin(angle)-12*tilt*Math.cos(angle)];
 const arm=solveLimb([703-33*1.2,412-193*1.2],[mix(grip[0],666,retract),mix(grip[1],252,retract)],43*1.2,42*1.2,1);
 return {arm,card:{x,y,angle,tilt},grip,holding:time<=release};
}
function paint(c,kind,t,progress=0,tool=1){
 const w=kind==='walk'?600:900,h=kind==='walk'?740:440;
 const rect=(x,y,a,b,f=B)=>{c.fillStyle=f;c.fillRect(x,y,a,b);};
 const path=(points,fill=B,stroke=W,width=2)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}};
 const line=(p,col=W,width=2)=>{c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=col;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();};
 const oval=(x,y,rx,ry,col=W)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=col;c.fill();};
 const text=(str,x,y,size=16,col=W)=>{c.fillStyle=col;c.font='700 '+size+'px Arial';c.fillText(str,x,y);};
 function sky(width,height,time,depth=1){rect(0,0,width,height,R);const shift=time*depth*12,base=Math.floor(shift/125);for(let i=-1;i<10;i++){const world=i+base,bx=i*125-shift%125,bh=100+rand(world+18)*240;rect(bx,height-bh,110,bh);line([[bx,height],[bx,height-bh],[bx+110,height-bh]],W,2);for(let row=0;row<8;row++)for(let col=0;col<4;col++)if(rand(world*9+row*4+col)>.35)rect(bx+15+col*23,height-bh+20+row*30,7,12,W);}}
 function rain(width,height,time){const wind=14+Math.sin(time*.65)*9;for(let layer=0;layer<2;layer++)for(let i=0;i<65;i++){const x=(rand(i+layer*91)*width+time*wind*(layer+1))%width,y=(rand(i+312)*height+time*(130+layer*130))%height;line([[x,y],[x-7-layer*4,y+13+layer*10]],i%5?W:R,layer?1.5:.7);}for(let i=0;i<12;i++){const p=(time*.9+rand(i))%1;line([[rand(i+50)*width-8*p,height-12-rand(i+60)*45],[rand(i+50)*width+8*p,height-12-rand(i+60)*45]],W,1);}}
 function limb(bones,width=17,edge=W){
  // Tapered sleeves/trousers keep volume as the joints rotate.
  const segment=(a,b,wa,wb)=>{const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;path([[a[0]+nx*wa/2,a[1]+ny*wa/2],[b[0]+nx*wb/2,b[1]+ny*wb/2],[b[0]-nx*wb/2,b[1]-ny*wb/2],[a[0]-nx*wa/2,a[1]-ny*wa/2]],B,edge,2);};
  segment(bones.root,bones.joint,width,width*.82);segment(bones.joint,bones.end,width*.82,width*.64);
  oval(bones.joint[0],bones.joint[1],width*.33,width*.33,B);
 }
 function boot(end,forward=1,edge=W){const [x,y]=end;path([[x-8,y-5],[x+8,y-5],[x+8+forward*12,y+2],[x+8+forward*12,y+6],[x-9,y+6]],B,edge,2);}
 function hero(x,y,s,phase=0,pose='walk'){
  c.save();c.translate(x,y);c.scale(s,s);
  if(pose==='walk'){
   const rig=walkPose(phase),bob=rig.bob,tail=Math.sin(rig.cycle*TAU-.6)*2.5;
   limb(rig.legs[0],21,R);boot(rig.legs[0].end,1,R);limb(rig.arms[0],20,R);
   limb(rig.legs[1],23);boot(rig.legs[1].end);
   c.save();c.translate(0,bob);
   path([[-22,-207],[10,-216],[30,-196],[27,-158],[19,-111],[28,-77],[-8,-87],[-38+tail,-68],[-43+tail,-84],[-30,-139]],B,W,3);
   path([[-30,-175],[-22,-117],[-38+tail,-74],[-43+tail,-84]],R,null);
   line([[10,-207],[21,-187],[9,-173],[20,-159]],W,2);
   path([[-17,-258],[12,-262],[22,-249],[28,-239],[21,-234],[17,-218],[-9,-216],[-21,-237]],B,W,2.5);
   path([[-40,-256],[37,-261],[49,-251],[-47,-245]],B,W,3);
   path([[-25,-257],[-23,-281],[7,-289],[28,-260]],B,W,3);line([[-24,-262],[24,-268]],R,3);
   c.restore();limb(rig.arms[1],20);oval(rig.arms[1].end[0],rig.arms[1].end[1]+3,6,8,B);
  }else{
   // Idle poses keep feet and shoulders anchored. Only the coat edge breathes.
   for(const side of [-1,1]){const leg=solveLimb([side*12,-102],[side*18,-5],52,50,-side);limb(leg,21);boot(leg.end);}
   const tail=Math.sin(t*1.2)*1.5;
   path([[-38,-204],[0,-216],[34,-199],[39,-150],[28,-108],[43+tail,-76],[6,-87],[-20,-73],[-43,-88],[-33,-137]],B,W,3);
   if(pose==='back'){line([[-30,-190],[0,-181],[30,-190]],R,3);line([[0,-181],[0,-92]],W,2);}else{path([[14,-199],[23,-159],[20,-117],[34,-84],[19,-94],[6,-157]],R,null);line([[-23,-195],[-11,-170],[-21,-151],[-5,-122]],W,2);}
   for(const side of [-1,1]){if(side===-1&&(pose==='work'||pose==='card'))continue;limb(solveLimb([side*33,-193],[side*36,-119],43,42,-side),18);}
   path([[-22,-264],[18,-266],[28,-246],[19,-221],[-4,-214],[-23,-232]],B,W,3);
   if(pose==='work'){path([[-28,-264],[25,-270],[37,-221],[-18,-211]],B,W,3);path([[-17,-249],[23,-251],[25,-235],[-14,-229]],R,W,2);}
   else{path([[-42,-257],[40,-270],[57,-254],[-48,-240]],B,W,3);path([[-25,-264],[-20,-292],[16,-299],[35,-270]],B,W,3);line([[-23,-271],[30,-279]],R,4);}
  }
  c.restore();
 }
 function sparks(x,y,time){const active=Math.sin(time*4)>-.1;for(let i=0;i<27;i++){const life=(time*2.1+rand(i))%1,a=rand(i+7)*TAU,len=life*(25+rand(i+22)*90);if(active)line([[x+Math.cos(a)*len,y+Math.sin(a)*len+life*life*50],[x+Math.cos(a)*(len+8),y+Math.sin(a)*(len+8)+life*life*50]],i%3?W:R,2);}if(active){oval(x,y,8,8,W);oval(x,y,3,3,R);}}
 rect(0,0,w,h);
 if(kind==='walk'){
  sky(w,550,t,.35);line([[0,110],[w,145]],B,7);line([[60,0],[72,540]],W,4);rect(0,550,w,190);const groundSpeed=STRIDE/(STANCE*WALK_PERIOD)*1.55;for(let i=-1;i<8;i++){const x=i*110-(t*groundSpeed)%110;line([[x,740],[x+220,550]],R,2);}line([[0,555],[w,555]],W,3);
  for(let i=0;i<5;i++)line([[40+i*145-(t*groundSpeed)%145,650],[113+i*145-(t*groundSpeed)%145,650]],W,3);
  c.save();c.globalAlpha=.17;c.translate(0,929.45);c.scale(1,-.45);hero(300,641,1.55,t);c.restore();
  hero(300,641,1.55,t);
  const flash=t%17;if(flash>12&&flash<12.25){line([[495,0],[453,82],[491,80],[414,189]],W,4);c.globalAlpha=.1;rect(0,0,w,550,W);c.globalAlpha=1;}
  rain(w,h,t);rect(22,25,237,38);text('ALWAYS BUILDING. ALWAYS MOVING.',31,49,12);text('K. SINGH / CITY WALK',22,713,16);
 }else if(kind==='workshop'){
  rect(0,0,w,h);for(let x=0;x<900;x+=80){line([[x,0],[x+100,300]],R,1);}rect(40,40,320,156,W);rect(47,47,306,142);for(let i=0;i<7;i++)line([[66,64+i*16],[130+(i*61+Math.floor(t)*17)%185,64+i*16]],i%3?W:R,2);text('BUILD / TEST / REFINE',60,180,12);
  // Masked maker works on an opened system chassis on a grounded bench.
  hero(637,413,1.03,0,'work');path([[204,263],[478,240],[575,288],[300,315]],B,W,3);path([[300,315],[575,288],[574,343],[300,365]],B,W,3);for(let i=0;i<6;i++){line([[229+i*33,266],[247+i*33,278],[262+i*33,278],[312+i*33,306]],R,2);rect(275+i*31,275+i*3,14,9,W);}path([[321,263],[387,258],[423,279],[356,285]],W,R,2);line([[337,270],[393,276]],B,3);for(let i=0;i<5;i++)oval(344+i*43,329-i*4,9,9,W);
  rect(120,359,647,15,W);line([[153,375],[134,440]],W,9);line([[733,375],[750,440]],W,9);
  const workArm=workshopPose(t),[handX,handY]=workArm.end;limb(workArm,19);path([[handX-18,handY-5],[handX+7,handY-5],[handX-4,handY+23],[handX-20,handY+17]],W,B,2);sparks(handX-21,handY+22,t);
  line([[handX-6,handY+14],[585,351],[694,398],[820,398]],R,4);rect(785,316,75,88,W);rect(793,326,59,59);text('POWER',797,372,11);text('THE WORKSHOP',40,29,16);
 }else if(kind==='operations'){
  sky(900,320,t,.1);rect(0,320,900,120);for(let i=0;i<3;i++){const x=65+i*248;rect(x,77,216,193,W);rect(x+6,83,204,181);text(['DIAGNOSE','RESOLVE','DOCUMENT'][i],x+18,110,16,R);for(let j=0;j<6;j++)line([[x+18,133+j*18],[x+38+(Math.floor(t*.7)+j*21+i*17)%153,133+j*18]],W,2);line([[x+110,271],[x+110,297]],W,5);}path([[50,302],[818,302],[873,343],[21,343]],B,W,3);hero(448,488,1.02,0,'back');path([[402,388],[490,388],[501,440],[394,440]],B,W,3);line([[411,397],[482,397]],R,3);text('SYSTEMS ONLINE / PEOPLE SUPPORTED',40,32,16);
 }else if(kind==='tools'){
  rect(0,0,w,h);for(let x=0;x<w;x+=20)for(let y=0;y<h;y+=20)oval(x,y,1,1,R);
  const labels=['SYSTEMS','CLOUD','NETWORKING','AUTOMATION','DEVELOPMENT'],positions=[[100,65],[662,60],[77,257],[670,250],[330,12]];
  positions.forEach(([x,y],i)=>line([[x+70,y+48],[450,340]],tool===i?R:W,tool===i?3:1));
  hero(450,438,1.04,0,'stand');rect(397,326,110,26,R);rect(437,325,33,30,W);rect(443,331,21,18);
  positions.forEach(([x,y],i)=>{const active=tool===i;rect(x-7,y-7,159,99,active?R:W);rect(x-4,y-4,153,93);if(i===1){oval(x+55,y+30,25,18);oval(x+85,y+26,22,25);rect(x+37,y+30,72,17,W);line([[x+57,y+50],[x+57,y+59],[x+92,y+59]],R,3);}else if(i===0){for(let j=0;j<3;j++){rect(x+34,y+8+j*15,78,11,W);oval(x+99,y+13+j*15,3,3,R);}}else if(i===2){for(const [xx,yy]of [[42,15],[100,15],[72,45]]){line([[x+72,y+30],[x+xx,y+yy]],W,3);rect(x+xx-9,y+yy-7,18,14,R);}}else if(i===3){text('>_',x+36,y+45,39);line([[x+93,y+43],[x+111,y+43]],R,4);}else{text('</>',x+40,y+46,36,W);}text(labels[i],x+7,y+76,12,active?W:R);if(active)oval(x+132,y+8,3+Math.sin(t*2),3+Math.sin(t*2),R);});
 }else if(kind==='city'){
  rect(0,0,900,440,R);const offset=t*8+progress*95;
  for(let side=0;side<2;side++)for(let i=5;i>=0;i--){const depth=(i/6+offset*.0005)%1,x=450+(side?1:-1)*(75+depth*420),top=40-depth*140,bottom=280+depth*205,width=40+depth*145;path([[x,top],[x+(side?width:-width),top-60],[x+(side?width:-width),bottom+100],[x,bottom]],B,W,2);for(let row=0;row<9;row++)for(let col=0;col<3;col++){const wx=x+(side?1:-1)*(12+col*width*.23),wy=top+20+row*(bottom-top)/10;rect(wx,wy,Math.max(3,width*.09),8+depth*8,W);}}
  path([[405,290],[495,290],[645,440],[251,440]],B,W,2);for(let i=0;i<6;i++){const p=(i/6+t*.13)%1;rect(449,300+p*p*140,3+p*4,5+p*15,W);}rain(900,440,t);text('KEEP LEARNING. KEEP MOVING.',300,50,18);text('SHERIDAN / COMPUTER SCIENCE',278,413,18);
 }else if(kind==='card'){
  rect(0,0,900,440);rect(42,22,230,215,W);rect(49,29,216,201);c.save();c.beginPath();c.rect(49,29,216,201);c.clip();sky(280,225,t,.08);rain(280,230,t);c.restore();line([[150,24],[150,234]],W,5);
  hero(703,412,1.2,0,'card');path([[90,267],[754,255],[883,437],[20,437]],B,W,4);line([[82,312],[824,308]],R,2);
  const gesture=cardPose(t),{x:cx,y:cy,angle,tilt}=gesture.card;
  c.save();c.translate(cx,cy);c.rotate(angle);c.scale(1,tilt);rect(-74,-39,148,78,W);rect(-67,-32,8,64,R);text('K. SINGH',-47,-7,20,B);text('LET’S BUILD.',-47,17,12,B);c.restore();
  limb(gesture.arm,22);const [hx,hy]=gesture.arm.end;oval(hx,hy,8,6,W);text('LEAVE A CONNECTION.',330,62,23);text('THE NEXT CHAPTER STARTS WITH A HELLO.',290,90,12);
 }
}
scope.QuickSceneCore={paint,solveLimb,walkPose,workshopPose,cardPose,WALK_PERIOD,STANCE,STRIDE};
if(typeof document==='undefined')return;
const canvases=Array.from(document.querySelectorAll('[data-quick-scene]')),motionButton=document.getElementById('quick-motion'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduced.matches,frame=0,last=0,tool=1;
const items=canvases.map(canvas=>({canvas,c:canvas.getContext('2d'),visible:false,time:0,width:0,height:0})).filter(s=>s.c);
if(!items.length)return;
document.querySelector('.tool-controls').hidden=false;
function draw(s){const ratio=Math.min(devicePixelRatio||1,1.5),w=s.canvas.dataset.quickScene==='walk'?600:900,h=s.canvas.dataset.quickScene==='walk'?740:440;s.c.setTransform(ratio*s.width/w,0,0,ratio*s.height/h,0,0);const rect=s.canvas.getBoundingClientRect();const p=clamp((innerHeight-rect.top)/(innerHeight+rect.height));paint(s.c,s.canvas.dataset.quickScene,paused&&s.time===0&&s.canvas.dataset.quickScene==='card'?3.4:s.time,p,tool);s.canvas.dataset.sceneTime=s.time.toFixed(2);}
function loop(now){frame=0;const dt=last?Math.min((now-last)/1000,.06):0;if(last&&now-last<32){frame=requestAnimationFrame(loop);return;}last=now;for(const s of items)if(s.visible){s.time+=dt;draw(s);}if(!paused&&!document.hidden&&items.some(s=>s.visible))frame=requestAnimationFrame(loop);}
function wake(){cancelAnimationFrame(frame);frame=0;last=0;for(const s of items)if(s.visible&&!document.hidden)draw(s);if(!paused&&!document.hidden&&items.some(s=>s.visible))frame=requestAnimationFrame(loop);}
const resize=new ResizeObserver(entries=>{for(const e of entries){const s=items.find(i=>i.canvas===e.target);s.width=e.contentRect.width;s.height=e.contentRect.height;const ratio=Math.min(devicePixelRatio||1,1.5);s.canvas.width=Math.max(1,Math.round(s.width*ratio));s.canvas.height=Math.max(1,Math.round(s.height*ratio));draw(s);}});
const observer=new IntersectionObserver(entries=>{for(const e of entries){const s=items.find(i=>i.canvas===e.target);s.visible=e.isIntersecting;if(s.visible)s.canvas.parentElement.classList.add('scene-visible');}wake();},{threshold:.03});
for(const s of items){resize.observe(s.canvas);observer.observe(s.canvas);s.canvas.parentElement.classList.add('scene-ready');}
function state(){motionButton.textContent=paused?'ENABLE ANIMATION':'PAUSE ANIMATION';motionButton.setAttribute('aria-pressed',String(!paused));document.documentElement.classList.toggle('quick-paused',paused);wake();}
motionButton.hidden=false;motionButton.addEventListener('click',()=>{paused=!paused;state();});reduced.addEventListener('change',e=>{paused=e.matches;state();});document.addEventListener('visibilitychange',wake);
document.querySelectorAll('[data-tool-index]').forEach(button=>button.addEventListener('click',()=>{tool=Number(button.dataset.toolIndex);document.querySelectorAll('[data-tool-index]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelectorAll('[data-skill-group]').forEach(el=>el.classList.toggle('equipped',Number(el.dataset.skillGroup)===tool));document.getElementById('tool-status').textContent=button.textContent+' selected — the matching skill card is outlined below.';for(const s of items)if(s.visible&&s.canvas.dataset.quickScene==='tools')draw(s);}));
// Progressive enhancement: content remains readable if scripting is disabled.
const reveals=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){e.target.classList.add('quick-entered');reveals.unobserve(e.target);}},{threshold:.08});document.querySelectorAll('main section, .facts').forEach(el=>reveals.observe(el));state();
})(typeof window==='undefined'?globalThis:window);
