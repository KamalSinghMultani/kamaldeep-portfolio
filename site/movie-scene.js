/* RED DOT: an authored, seekable 2D film. Action is a pure function of the
   playhead; rain, electrical flicker and idle movement use a separate clock. */
(function(scope){
  'use strict';
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
  const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
  const range=(t,a,b)=>ease((t-a)/(b-a));
  const rand=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
  const acts=[0,6,12,18,24],ends=[5,11,17,23,32];
  const scenes=[
    ['RED DOT','BEDROOM / 00:17',['Rain against the glass. A city asleep.','A red signal moves downtown. The linked street camera comes online.','The bank’s exterior CCTV catches a black car pulling up.'],['WATCH THE MAP','CHECK THE LINKED FEED','CUT TO THE CAR']],
    ['THE ARRIVAL','DOWNTOWN BANK',['The same black car waits outside the bank. The doors are about to open.','Three masked figures step out.','The lead robber pulls the glass door open. The others follow.'],['OPEN THE CAR','OPEN THE BANK','CHECK THE CAMERAS']],
    ['THE ROBBERY','BANK / CCTV 04',['The camera feed begins to fail.','The doors burst open. Everyone down.','Cash into bags. A face turns toward the camera.'],['BREACH THE BANK','WATCH THE COUNTER','CUT THE FEED']],
    ['ESCAPE','DOWNTOWN BANK',['They run for the car. Sirens, somewhere far away.','Doors slam. Tires lose their grip.','The getaway car disappears. Time to grab the coat.'],['START THE ENGINE','GRAB THE COAT','TAKE THE WHEEL']],
    ['THE CAR','CITY / SOUTHBOUND',['The signal moves through the dashboard map.','One turn. Then another.','There. The same black car.'],['TAKE THE TURN','FIND THE GETAWAY','START THE CHASE']],
    ['CITY CHASE','LOWER CITY',['Two cars cut through the rain.','A truck crosses the intersection. Barely enough room.','The getaway car dives into an underground garage.'],['CLEAR THE TRUCK','FOLLOW UNDERGROUND','SEARCH THE GARAGE']],
    ['PARKING GARAGE','LEVEL −02',['15 metres. Concrete. Fluorescent light.','5 metres. An open door. Money on the ground.','A masked attacker steps into his path.'],['CLOSE THE DISTANCE','LEAVE THE CAR','MEET THE ATTACK']],
    ['FIRST CONFRONTATION','LEVEL −02 / EMERGENCY',['The attacker lunges. The MC catches the punch.','The second robber fires. The MC ducks behind the column.','The wrist turns. The pistol drops. Both attackers stay down.'],['DODGE THE SHOT','DISARM','FOLLOW THE SIGNAL']],
    ['THE REAL TARGET','ROOFTOP',['The same stairwell leads to the rooftop. One man is waiting.','The last robber removes his mask. He has the money.','He draws a pistol. There is nobody else coming.'],['FACE THE TARGET','WATCH HIS HAND','FACE THE SHOT']],
    ['FINAL ACTION','ROOFTOP / ONE ON ONE',['A bullet cuts through rain. The MC slips out of its path.','He closes the gap. Fists collide. The pistol is knocked away.','The final counter lands. The villain falls. The bag tears.'],['CLOSE THE GAP','LAND THE COUNTER','CHECK THE SIGNAL']],
    ['THE TWIST','THE CITY',['The signal is still there. Somewhere else.','Three. Five. Ten. This was never one robbery.','The city goes dark. One last signal.'],['PULL BACK','CUT TO BLACK','REPLAY THE FILM']]
  ];
  function beatInfo(value){const beat=clamp(Math.round(value),0,32),scene=Math.floor(beat/3),part=beat%3,s=scenes[scene];return {beat,scene,part,title:s[0],location:s[1],description:s[2][part],next:s[3][part],act:acts.reduce((a,start,i)=>beat>=start?i:a,0)};}
  function shot(value){const t=clamp(value,0,32),index=Math.min(10,Math.floor(t/3));return {index,local:t-index*3,cut:range(t-index*3,2.62,3)};}
  class Timeline{
    constructor(value=0){this.value=value;this.target=value;this.velocity=0;this.weather=0;this.elapsed=0;this.duration=0;this.from=value;this.initialVelocity=0;}
    seek(target,instant=false){target=clamp(target,0,32);if(target===this.target&&!instant)return;this.target=target;this.from=this.value;this.elapsed=0;this.duration=instant?0:.6+Math.abs(target-this.value)*.48;this.initialVelocity=clamp(this.velocity,-2,2);if(instant){this.value=target;this.velocity=0;}}
    advance(dt,motion=true){if(!motion)return;dt=clamp(dt,0,.05);this.weather+=dt;if(!this.duration)return;this.elapsed+=dt;const u=clamp(this.elapsed/this.duration),d=this.duration,v=this.initialVelocity;
      this.value=clamp((2*u*u*u-3*u*u+1)*this.from+(u*u*u-2*u*u+u)*d*v+(-2*u*u*u+3*u*u)*this.target,0,32);
      this.velocity=((6*u*u-6*u)*this.from+(3*u*u-4*u+1)*d*v+(-6*u*u+6*u)*this.target)/d;
      if(u===1){this.value=this.target;this.velocity=0;this.duration=0;}
    }
  }
  // Deterministic trajectories shared by rendering and behavioral checks.
  function effects(value){const s=shot(value),p=s.local;return {scene:s.index,local:p,bullet:s.index===7?range(p,.8,1.6):0,brokenLight:s.index===7?range(p,.9,1.13):0,fall:s.index===7?range(p,1.78,2):0,bagTear:s.index===9?range(p,1.5,2):0,escape:0,dots:s.index===10?Math.round(lerp(1,36,range(p,0,1.6))):1};}
  function surveillance(p){return {signal:range(p,.1,.35),route:range(p,.1,1.1),linked:range(p,.65,1.05),carArrival:range(p,1.1,2),cut:range(p,2.05,2.62)};}
  scope.MovieCore={Timeline,shot,effects,beatInfo,acts,ends,scenes,surveillance};
  if(typeof document==='undefined')return;
  const canvas=document.getElementById('alley-stage');if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;
  const app=document.getElementById('game'),toggle=document.getElementById('alley-motion'),system=matchMedia('(prefers-reduced-motion: reduce)');
  const B='#08080a',W='#ffffff',R='#d81032';let preference;try{preference=localStorage.getItem('portfolio-motion');}catch(_){}
  let motion=preference?preference==='on':!system.matches,width=1000,height=650,visible=true,last=0,frame=0,lastShot=-1,lastPaint=0,paintCost=0,paintCount=0,paintWindow=0;
  const clock=new Timeline();
  function poly(points,fill=B,stroke=null,lw=2){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}}
  function line(points,color=W,lw=2){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
  function rect(x,y,w,h,c=B){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}
  function oval(x,y,rx,ry,c=W){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();}
  function label(text,x,y,size=24,color=W,align='left'){ctx.fillStyle=color;ctx.font=`${size}px Anton, Impact, sans-serif`;ctx.textAlign=align;ctx.fillText(text,x,y);}
  function burst(x,y,r,color=W){const ps=[];for(let i=0;i<20;i++){const a=i*Math.PI/10,d=r*(i%2?.25:.7+rand(i)*.3);ps.push([x+Math.cos(a)*d,y+Math.sin(a)*d]);}poly(ps,color);}
  function tone(x,y,w,h,color=B,spacing=16){ctx.fillStyle=color;for(let yy=y;yy<y+h;yy+=spacing)for(let xx=x;xx<x+w;xx+=spacing){ctx.beginPath();ctx.arc(xx+(yy%32?spacing/2:0),yy,1.7,0,7);ctx.fill();}}
  function skyline(time,drift=0){rect(-300,-200,1800,1000,R);for(let i=-2;i<15;i++){const x=i*112-drift,h=110+rand(i+70)*260;rect(x,460-h,108,h+160,B);line([[x,460-h],[x+108,460-h],[x+108,555]],W,2);for(let j=0;j<4;j++)for(let k=0;k<7;k++)if(rand(i*45+j*7+k)>.45)rect(x+12+j*23,475-h+k*36,8,17,W);line([[x+42,460-h],[x+42,424-h]],B,4);}
    const gust=Math.sin(time*.7)*15;ctx.beginPath();ctx.moveTo(-100,75);ctx.quadraticCurveTo(680,245+gust,1300,25);ctx.strokeStyle=B;ctx.lineWidth=5;ctx.stroke();
    if(time%23>20.1&&time%23<20.24)poly([[960,-40],[880,90],[920,73],[850,214],[878,88],[852,104]],W);
  }
  function ground(time,y=560){poly([[-300,y],[1500,y-25],[1600,1000],[-400,1000]],B,W,3);for(let i=0;i<16;i++)line([[600+(i-8)*35,y],[600+(i-8)*230,900]],R,2);for(let i=0;i<24;i++){const x=rand(i+14)*1250,y2=y+16+rand(i+17)*170;line([[x,y2],[x+20+Math.sin(time*2+i)*12,y2]],i%3?R:W,2);}}
  function rain(time,near=false,clip=null,bullet=null){ctx.save();if(clip){ctx.beginPath();ctx.rect(...clip);ctx.clip();}const wind=18+Math.sin(time*.7)*17+Math.sin(time*1.31)*9,drift=18*time-17/.7*Math.cos(time*.7)-9/1.31*Math.cos(time*1.31);
    for(let i=0;i<(near?105:165);i++){const k=i+(near?250:0),speed=(near?490:300)+rand(k+6)*150;let x=((rand(k+7)*1600-drift)%1600+1600)%1600-200,y=(rand(k+88)*950+time*speed)%950-120;
      if(bullet){const dx=x-bullet.x,dy=y-bullet.y;if(Math.abs(dx)<150&&Math.abs(dy)<42){y+=(dy<0?-1:1)*(43-Math.abs(dy))*(1-Math.abs(dx)/150);x+=Math.sin(time*7+i)*9;}}
      line([[x,y],[x-wind*.5,y+(near?35:20)]],i%4?W:R,near?1.8:1);
    }ctx.restore();
  }
  function splashes(time,y=615){for(let i=0;i<32;i++){const p=(time*1.4+rand(i+790))%1;ctx.beginPath();ctx.ellipse(rand(i+20)*1200,y+rand(i+13)*85,p*19+2,p*4+1,0,Math.PI,2*Math.PI);ctx.strokeStyle=i%4?W:R;ctx.lineWidth=p<.75?1:.5;ctx.stroke();}}
  function puddle(x,y,w,time){
    ctx.save();ctx.beginPath();ctx.ellipse(x,y,w,14,0,0,Math.PI*2);ctx.clip();
    for(let i=0;i<7;i++){const yy=y-12+i*4,shift=Math.sin(time*1.8+i*.8)*9;line([[x-w+shift,yy],[x+w*.55+shift,yy]],i%3?W:R,1.5);}
    for(let i=0;i<3;i++){const q=(time*.6+i/3)%1;ctx.beginPath();ctx.ellipse(x-w*.4+i*w*.4,y,q*w*.35,q*11,0,0,Math.PI*2);ctx.strokeStyle=B;ctx.lineWidth=3;ctx.stroke();}ctx.restore();
  }
  function streetDetails(time,travel=0){
    // Fixed lamp posts, walk signals and a fire escape give the city a scale.
    for(const base of [92,1114]){const x=base-travel;line([[x,535],[x,218],[x+34,194],[x+103,194]],B,13);line([[x+3,527],[x+3,225],[x+39,202],[x+100,202]],W,2);poly([[x+65,189],[x+119,189],[x+126,204],[x+61,204]],B,W,2);line([[x+74,208],[x+112,208]],W,5);}
    for(let i=0;i<3;i++){const yy=232+i*62;poly([[260,yy],[350,yy],[358,yy+13],[254,yy+13]],B,W,2);line([[263,yy],[263,yy-28],[346,yy-28],[346,yy]],W,1);for(let j=0;j<6;j++)line([[268+j*14,yy-26],[268+j*14,yy]],W,1);if(i<2){line([[271,yy+14],[337,yy+61]],W,2);for(let j=0;j<5;j++)line([[279+j*12,yy+20+j*8],[294+j*12,yy+20+j*8]],W,1);}}
    rect(1091,297,49,76,B);line([[1091,297],[1140,297],[1140,373],[1091,373],[1091,297]],W,2);oval(1115,317,10,10,R);rect(1107,338,17,22,W);
    poly([[982,417],[1061,417],[1066,441],[978,441]],B,W,2);label('DOWNTOWN',986,435,13,W);
    ctx.beginPath();ctx.moveTo(38,123);ctx.quadraticCurveTo(611,211+Math.sin(time*.7)*8,1173,110);ctx.strokeStyle=B;ctx.lineWidth=4;ctx.stroke();
  }
  function paper(x,y,s,angle=0){
    // Fictional banknotes: engraved border, portrait medallion, denomination,
    // treasury lines and seal remain recognizable in the falling-money shots.
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(s,s);
    poly([[-34,-15],[30,-16],[35,14],[-31,16]],W,B,1.4);
    poly([[-29,-11],[26,-12],[30,10],[-27,12]],null,B,1);
    oval(0,0,10,11,B);oval(1,-3,3.6,4.5,W);poly([[-5,7],[-3,2],[3,0],[7,6]],W);
    label('100',-26,-3,7,B);label('100',16,9,7,B);
    for(let i=0;i<4;i++){line([[-24,2+i*1.8],[-14,2+i*1.8]],B,.65);line([[14,-9+i*2],[24,-9+i*2]],B,.65);}
    oval(16,1,2.5,2.5,R);line([[-25,13],[-4,12]],B,.7);ctx.restore();
  }
  function person(x,y,s,time,o={}){ctx.save();ctx.translate(x,y);ctx.scale(s*(o.facing??(o.flip?-1:1)),s);ctx.rotate(o.tilt||0);const idle=Math.sin(time*1.7+(o.seed||0))*.9,walk=o.walk||0,hem=Math.sin(time*.72)*7+(o.coat||0),seated=o.seated;
    const leg=seated?42:Math.sin(walk)*22;
    line([[-16,-100],[-24-leg,-48],[-36-leg,3]],W,33);line([[19,-104],[26+leg,-49],[37+leg,4]],W,31);
    line([[-16,-100],[-24-leg,-48],[-36-leg,3]],B,29);line([[19,-104],[26+leg,-49],[37+leg,4]],B,27);
    poly([[-49-leg,-5],[-25-leg,-4],[-25-leg,9],[-65-leg,10],[-67-leg,5]],B,W,2);poly([[26+leg,-4],[49+leg,-5],[65+leg,6],[60+leg,11],[25+leg,10]],B,W,2);
    ctx.translate(0,idle);
    if(o.mask){
      poly([[-47,-235],[-26,-255],[26,-254],[51,-227],[43,-114],[-43,-114]],B,W,3);
      poly([[-35,-237],[-21,-243],[31,-127],[16,-118]],R);
      line([[0,-244],[1,-122]],W,2);line([[-32,-169],[-9,-169],[-9,-142],[-32,-142]],W,2);
      line([[13,-181],[34,-181],[34,-147],[13,-147]],W,2);line([[-38,-119],[39,-119]],R,5);
    }else{poly([[-42,-238],[23,-249],[48,-211],[27,-158],[54+hem,-64],[1,-78],[-17,-55],[-64+hem,-77],[-43,-151]],B,W,2.5);poly([[25,-243],[43,-208],[26,-155],[47+hem,-76],[27+hem,-89],[15,-180]],R);poly([[-13,-238],[9,-243],[17,-217],[-2,-178],[-17,-217]],W);poly([[-4,-228],[4,-232],[8,-216],[0,-187]],R);line([[-34,-228],[-17,-205],[-31,-195],[-14,-156]],W,2);}
    let left=[[-37,-220],[-58,-182],[-31,-143]],right=[[30,-222],[57,-178],[29,-145]];
    if(o.aim){right=[[30,-220],[80,-214],[134,-221]];left=[[-37,-219],[8,-192],[103,-209]];}
    if(o.punch){right=[[30,-220],[75,-222],[141,-230]];left=[[-37,-220],[-63,-188],[-20,-195]];}
    if(o.guard){left=[[-37,-220],[-73,-237],[-39,-275]];right=[[30,-220],[60,-233],[12,-257]];}
    if(seated){left=[[-37,-220],[-60,-177],[10,-171]];right=[[30,-220],[75,-188],[126,-181]];}
    if(o.bag)right=[[30,-222],[57,-176],[63,-118]];
    if(o.hand)right=[[30,-220],[62,-180],o.hand];
    line(left,B,23);line(right,B,24);line(right.map(([a,b])=>[a+4,b-8]),R,2);if(o.aim){poly([[127,-234],[182,-234],[182,-221],[151,-219],[147,-200],[135,-203]],B,W,2);}
    if(o.bag){poly([[20,-111],[97,-111],[117,-97],[119,-57],[101,-44],[14,-44],[1,-61],[2,-94]],B,W,3);line([[37,-108],[44,-130],[74,-130],[83,-108]],W,4);line([[29,-101],[28,-51]],R,4);line([[91,-101],[91,-51]],R,4);line([[12,-99],[106,-99]],W,2);}
    ctx.save();ctx.translate(-3,-273);ctx.rotate(o.look||-.12);if(o.mask)ctx.scale(.76,.76);poly([[-25,-29],[20,-27],[29,-4],[22,22],[-2,28],[-26,10]],B,R,3);
    if(o.face){poly([[1,-10],[23,-7],[17,12],[-1,16]],W);line([[3,6],[14,8],[19,3]],B,3);}
    if(o.mask){
      // Hood + full mask, never the protagonist's fedora and tie.
      poly([[-34,13],[-37,-22],[-23,-48],[8,-53],[34,-32],[39,15],[27,35],[-23,34]],B,W,3);
      poly([[-23,-29],[3,-39],[26,-24],[24,11],[9,29],[-12,24],[-26,3]],W,B,2);
      poly([[-21,-13],[-4,-10],[-7,-3],[-21,-6]],B);poly([[5,-10],[23,-16],[21,-7],[7,-4]],B);
      line([[-12,12],[11,15],[18,7]],B,3);
      const variant=(o.seed||0)%3;
      if(variant===0)line([[-15,-29],[-11,-18],[-8,-2],[-5,5]],R,5);
      else if(variant===1){poly([[-3,-29],[4,-22],[-2,-15],[-9,-23]],R);line([[-14,18],[14,20]],R,3);}
      else{line([[12,-31],[7,-21],[15,-17]],R,4);line([[-18,7],[-10,13]],R,4);}
    }else{poly([[-35,-30],[-25,-65],[15,-69],[34,-35]],B,W,3);poly([[-33,-37],[31,-42],[34,-31],[-37,-26]],o.hero?R:W);poly([[-60,-24],[48,-39],[64,-25],[-53,-10]],B,W,3);}ctx.restore();ctx.restore();
  }
  // Authored joint poses share one body rig, so reactions interpolate instead
  // of reusing the same standing cutout for every outcome.
  const poses={
    ready:{head:[0,-280],neck:[0,-239],hip:[0,-126],el:[-52,-197],hl:[-28,-163],er:[55,-196],hr:[34,-164],kl:[-26,-65],fl:[-43,0],kr:[31,-63],fr:[50,0],angle:0},
    block:{head:[-14,-278],neck:[-8,-236],hip:[0,-123],el:[-32,-224],hl:[32,-264],er:[57,-204],hr:[85,-248],kl:[-36,-62],fl:[-59,0],kr:[44,-67],fr:[68,0],angle:-.08},
    punch:{head:[20,-270],neck:[12,-230],hip:[-4,-119],el:[-22,-180],hl:[21,-199],er:[82,-225],hr:[145,-229],kl:[-45,-60],fl:[-77,0],kr:[37,-65],fr:[74,0],angle:.1},
    aim:{head:[7,-280],neck:[0,-239],hip:[0,-126],el:[16,-209],hl:[107,-221],er:[70,-222],hr:[139,-224],kl:[-27,-65],fl:[-48,0],kr:[36,-61],fr:[60,0],angle:0},
    duck:{head:[-25,-174],neck:[-17,-137],hip:[8,-68],el:[-57,-121],hl:[-26,-185],er:[31,-124],hr:[25,-180],kl:[-50,-42],fl:[-55,0],kr:[55,-42],fr:[67,0],angle:-.12},
    disarm:{head:[5,-270],neck:[4,-229],hip:[-9,-123],el:[45,-201],hl:[124,-231],er:[83,-221],hr:[142,-221],kl:[-40,-67],fl:[-63,0],kr:[33,-65],fr:[65,0],angle:.08},
    recoil:{head:[-53,-241],neck:[-36,-206],hip:[3,-108],el:[-68,-172],hl:[-77,-216],er:[17,-169],hr:[61,-197],kl:[-28,-50],fl:[-69,0],kr:[64,-43],fr:[93,0],angle:-.35},
    down:{head:[112,-34],neck:[71,-28],hip:[-17,-24],el:[48,-5],hl:[81,0],er:[92,-18],hr:[128,-4],kl:[-64,-19],fl:[-128,0],kr:[-62,-4],fr:[-116,8],angle:1.4}
  };
  function actor(x,y,s,time,o={}){
    const a=poses[o.from||'ready'],b=poses[o.to||o.from||'ready'],mix=clamp(o.mix||0),q={};
    for(const key of Object.keys(a))q[key]=Array.isArray(a[key])?a[key].map((v,i)=>lerp(v,b[key][i],mix)):lerp(a[key],b[key],mix);
    ctx.save();ctx.translate(x,y);ctx.scale(s*(o.facing??1),s);
    const idle=(o.to==='down'?1-mix:1)*Math.sin(time*1.8+(o.seed||0))*.8;
    q.head[1]+=idle;q.neck[1]+=idle;
    const vx=q.hip[0]-q.neck[0],vy=q.hip[1]-q.neck[1],len=Math.hypot(vx,vy)||1,n=[vy/len,-vx/len];
    const shoulder=side=>[q.neck[0]+n[0]*32*side,q.neck[1]+n[1]*32*side];
    const hip=side=>[q.hip[0]+n[0]*19*side,q.hip[1]+n[1]*19*side];
    for(const [k,f,side] of [['kl','fl',-1],['kr','fr',1]]){line([hip(side),q[k],q[f]],W,29);line([hip(side),q[k],q[f]],B,23);poly([[q[f][0]-12,q[f][1]-5],[q[f][0]+14,q[f][1]-5],[q[f][0]+25,q[f][1]+5],[q[f][0]-14,q[f][1]+5]],B,W,2);}
    const hem=o.kind==='hero'?31:10;
    poly([shoulder(-1),shoulder(1),[q.hip[0]+n[0]*31+vx/len*hem,q.hip[1]+n[1]*31+vy/len*hem],[q.hip[0],q.hip[1]+15],[q.hip[0]-n[0]*31+vx/len*(hem+8),q.hip[1]-n[1]*31+vy/len*(hem+8)]],B,W,3);
    line([shoulder(1),[q.hip[0]+n[0]*22,q.hip[1]+n[1]*22]],R,5);
    if(o.kind==='hero'){poly([[q.neck[0]-12,q.neck[1]],[q.neck[0]+12,q.neck[1]],[q.neck[0],q.neck[1]+40]],W);line([[q.neck[0],q.neck[1]+5],[q.neck[0]+2,q.neck[1]+31]],R,4);}
    for(const [e,h,side] of [['el','hl',-1],['er','hr',1]]){line([shoulder(side),q[e],q[h]],W,22);line([shoulder(side),q[e],q[h]],B,16);oval(...q[h],7,7,W);}
    if(o.gun){const [gx,gy]=q.hr;poly([[gx-6,gy-12],[gx+42,gy-12],[gx+42,gy-1],[gx+7,gy],[gx+4,gy+19],[gx-6,gy+16]],B,W,2);}
    ctx.save();ctx.translate(...q.head);ctx.rotate(q.angle);
    poly([[-22,-22],[12,-27],[26,-12],[21,18],[4,29],[-19,18]],o.kind==='hero'?B:W,R,2.5);
    if(o.kind==='hero'){poly([[-32,-22],[-21,-52],[15,-55],[36,-23]],B,W,2);poly([[-51,-18],[38,-29],[54,-18],[-44,-7]],B,W,2);line([[-25,-28],[26,-32]],R,5);}
    else if(o.kind==='boss'){poly([[-25,3],[-28,-29],[-8,-43],[20,-36],[29,-19],[9,-27],[-12,-14]],B,W,2);line([[-9,-4],[1,-7]],B,3);line([[11,-7],[20,-4]],B,3);line([[4,14],[17,10]],B,3);line([[15,-17],[10,8]],R,3);}
    else{poly([[-30,15],[-32,-25],[-13,-39],[17,-34],[31,-18],[30,22],[20,31],[-24,29]],null,W,3);line([[-14,-5],[-3,-1]],B,4);line([[7,-2],[20,-6]],B,4);line([[-8,14],[13,14]],B,3);line([[-15+(o.seed||0)*7,-24],[-8+(o.seed||0)*5,5]],R,4);}
    ctx.restore();ctx.restore();
  }
  function fist(x,y,s,flip=1){
    ctx.save();ctx.translate(x,y);ctx.scale(s*flip,s);
    poly([[-49,-13],[-17,-13],[-15,-23],[12,-24],[25,-17],[31,-6],[30,14],[18,24],[-11,23],[-20,13],[-49,13]],W,B,2.5);
    for(const yy of [-12,-2,8])line([[12,yy],[27,yy+2]],B,2);
    poly([[-18,11],[-9,-4],[4,-1],[0,12],[-7,18]],W,B,2);ctx.restore();
  }
  function actionPanel(title,x,y,w,h,draw){
    ctx.save();poly([[x,y+9],[x+w,y],[x+w-9,y+h],[x-8,y+h-7]],B,W,4);ctx.beginPath();ctx.rect(x+4,y+29,w-17,h-36);ctx.clip();draw();ctx.restore();label(title,x+13,y+26,18,R);
  }
  function civilian(x,y,s,time,o={}){
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);
    const fear=o.fear??1,crouch=o.crouch?1:0,variant=o.variant||0;
    const breath=Math.sin(time*2.3+variant)*1.2,flinch=Math.sin(time*9+variant)*fear*.45;
    // Adult limbs share the same scale; crouching bends knees instead of
    // shrinking the person or moving their feet through the floor.
    if(crouch){
      // Kneeling surrender: knees carry the weight, shins fold underneath,
      // and the tucked feet are behind the thighs rather than planted in a squat.
      for(const side of [-1,1]){ctx.save();ctx.scale(side,1);
        oval(13,-1,10,15,B);line([[8,8],[17,9]],W,2);
        line([[43,-13],[17,-3]],W,25);line([[43,-13],[17,-3]],B,20);
        ctx.beginPath();ctx.moveTo(12,-66);ctx.lineTo(30,-65);ctx.quadraticCurveTo(45,-44,58,-21);ctx.quadraticCurveTo(69,3,46,7);ctx.quadraticCurveTo(32,8,25,-9);ctx.lineTo(7,-45);ctx.closePath();ctx.fillStyle=B;ctx.fill();ctx.strokeStyle=W;ctx.lineWidth=2.5;ctx.stroke();
        line([[39,-12],[50,-7]],W,1.2);ctx.restore();
      }
    }else{
      const legs=[[[-19,-128],[-23,-66],[-29,-5]],[[19,-128],[25,-66],[34,-5]]];
      for(const leg of legs){line(leg,W,27);line(leg,B,21);const [fx,fy]=leg[2];poly([[fx-12,fy-5],[fx+12,fy-5],[fx+23,fy+4],[fx-15,fy+5]],B,W,2);}
    }
    ctx.translate(flinch,breath);const shoulder=crouch?-132:-250,hip=crouch?-57:-127,head=shoulder-35;
    poly([[-35,shoulder+5],[-17,shoulder-7],[18,shoulder-7],[38,shoulder+6],[31,hip],[-31,hip]],o.staff?W:B,o.staff?B:W,3);
    poly([[-14,shoulder-5],[0,shoulder+14],[15,shoulder-5],[9,shoulder+28],[-9,shoulder+28]],o.staff?B:W);
    if(o.staff){poly([[-3,shoulder+14],[4,shoulder+14],[8,hip-12],[0,hip-5],[-6,hip-14]],R);rect(14,shoulder+36,19,12,B);rect(16,shoulder+38,5,7,W);}
    else{line([[-24,shoulder+28],[-20,hip-7]],R,3);line([[18,shoulder+33],[21,hip-9]],W,1);}
    // Tellers surrender with spread fingers; customers shield their temples.
    const hands=crouch?[[-18,head-21],[18,head-21]]:[[-65,head-20],[65,head-20]];
    const elbows=crouch?[[-66,shoulder-12],[66,shoulder-12]]:[[-73,shoulder+27],[76,shoulder+22]];
    for(let i=0;i<2;i++){const arm=[[(i?1:-1)*32,shoulder+8],elbows[i],hands[i]];line(arm,o.staff?B:W,20);line(arm,o.staff?W:B,14);}
    // Tilted head, lifted brows, wide eyes and an open mouth read as fear,
    // including in the first held robbery beat.
    ctx.save();ctx.translate(0,head);ctx.rotate((variant===1?.09:-.09)*fear);
    if(variant===1)poly([[-26,-19],[-17,-35],[16,-33],[27,-15],[30,32],[-29,29]],B,W,2);
    poly([[-23,-19],[-12,-28],[14,-26],[24,-14],[20,15],[8,27],[-10,24],[-23,11]],W,B,2);
    poly([[-25,-10],[-25,-23],[-10,-37],[16,-32],[27,-17],[23,-7],[12,-21],[-5,-19],[-18,-24]],B,W,1.5);
    line([[-17,-10],[-7,-14]],B,2.8);line([[7,-14],[16,-9]],B,2.8);
    oval(-11,-3,5,6,B);oval(11,-3,5,6,B);oval(-10,-4,1.8,2,W);oval(12,-4,1.8,2,W);
    line([[0,0],[-2,7],[2,8]],B,1.5);oval(1,16,5,6.5,B);line([[-3,12],[4,12]],W,1.5);
    line([[18,6],[18,12]],R,2);ctx.restore();
    for(const [hx,hy] of hands){oval(hx,hy,8,10,W);for(let i=0;i<4;i++)line([[hx-6+i*4,hy-3],[hx-8+i*4,hy-17+(i===0||i===3?4:0)]],W,2.6);line([[hx+5,hy+2],[hx+13,hy-5]],W,3);}
    ctx.restore();
  }
  function securityCamera(x,y,s,time,flip=false){
    ctx.save();ctx.translate(x,y);ctx.scale(s*(flip?-1:1),s);rect(-9,-24,13,37,B);line([[0,-7],[25,7],[46,-1]],B,9);line([[0,-9],[25,5],[46,-3]],W,2);
    ctx.translate(47,-6);ctx.rotate(.18+Math.sin(time*.35)*.035);poly([[-20,-18],[48,-18],[58,-8],[49,13],[-22,13]],B,W,3);poly([[40,-14],[56,-8],[49,11],[36,10]],W);oval(46,-1,5,7,B);oval(17,7,3,3,R);line([[-24,-22],[53,-22],[60,-14]],B,5);ctx.restore();
  }
  function bankDoor(x,y,w,h,open){
    rect(x-9,y-10,w+18,h+16,W);rect(x,y,w,h,B);line([[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]],B,4);
    // Hinged glass leaves narrow in projection and extend toward the viewer.
    for(let side=0;side<2;side++){const hinge=x+side*w,sign=side?-1:1,leaf=w*.5*(1-open*.84),depth=open*35;
      const points=[[hinge,y],[hinge+sign*leaf,y+depth],[hinge+sign*leaf,y+h+depth],[hinge,y+h]];poly(points,B,W,3);
      line([[hinge+sign*7,y+8],[hinge+sign*(leaf-7),y+depth+8],[hinge+sign*(leaf-7),y+h*.56+depth*.7]],R,2);
      line([[hinge+sign*leaf*.2,y+h*.23],[hinge+sign*leaf*.65,y+h*.08]],W,2);line([[hinge+sign*leaf*.2,y+h*.38],[hinge+sign*leaf*.74,y+h*.16]],W,1);
      line([[hinge+sign*(leaf-12),y+h*.54+depth],[hinge+sign*(leaf-12),y+h*.7+depth]],W,5);
      line([[hinge,y+h*.82],[hinge+sign*leaf,y+h*.82+depth]],W,2);
    }
    line([[x-13,y+h+8],[x+w+20,y+h+8]],W,5);
  }
  function car(x,y,s,time,o={}){ctx.save();ctx.translate(x,y);ctx.scale(s*(o.flip?-1:1),s);ctx.rotate(o.tilt||0);
    if(o.lights){ctx.save();ctx.globalAlpha=.2;poly([[133,-45],[560,-130],[600,55],[124,-12]],W);ctx.restore();}
    poly([[-186,-18],[-174,-68],[-109,-83],[-62,-141],[70,-139],[126,-82],[184,-64],[196,-15],[152,1],[-154,1]],B,W,3);
    poly([[-98,-82],[-55,-129],[5,-128],[3,-84]],R,W,2);poly([[16,-128],[65,-127],[109,-82],[16,-82]],R,W,2);
    line([[-165,-58],[161,-56]],R,5);line([[12,-74],[11,-18],[116,-18],[116,-72]],W,2);rect(80,-65,17,4,W);rect(169,-55,18,14,o.broken?B:W);rect(-180,-53,16,10,R);
    line([[-174,-23],[175,-23]],W,2);line([[-98,-73],[-99,-26]],W,2);rect(-75,-65,17,4,W);
    poly([[-75,-93],[-58,-120],[-21,-120],[-33,-110]],B);poly([[30,-120],[59,-121],[84,-101],[75,-98]],B);
    line([[-53,-119],[-71,-92]],W,1.5);line([[86,-107],[102,-86]],W,1.5);
    poly([[100,-87],[123,-90],[132,-81],[105,-78]],B,W,2);rect(-177,-35,23,6,W);
    for(let i=0;i<4;i++)line([[146+i*7,-46],[146+i*7,-30]],W,1);
    if(o.broken){line([[69,-127],[47,-106],[65,-101],[41,-83]],W,2);line([[169,-54],[184,-41],[170,-41],[183,-52]],R,2);}
    for(const wx of [-114,120]){oval(wx,-4,37,37,B);oval(wx,-4,27,27,W);oval(wx,-4,21,21,B);for(let i=0;i<5;i++){let a=i*1.256+(o.speed?time*o.speed:0);line([[wx+Math.cos(a)*8,-4+Math.sin(a)*8],[wx+Math.cos(a)*20,-4+Math.sin(a)*20]],W,3);}}
    if(o.door){ctx.save();ctx.translate(12,-78);ctx.rotate(-o.door*.8);poly([[0,0],[99,0],[125,75],[4,90]],B,W,3);line([[14,48],[90,46]],R,4);ctx.restore();}
    ctx.restore();
  }
  function map(x,y,w,h,time,progress=0,dots=1){
    ctx.save();ctx.translate(x,y);ctx.scale(w/440,h/270);rect(0,0,440,270,B);ctx.beginPath();ctx.rect(0,0,440,270);ctx.clip();
    // District footprints and a river give the surveillance map a recognizable
    // city geography. The signal follows streets, rather than a diagonal line.
    const land=[[9,18],[133,6],[187,42],[296,20],[365,48],[426,23],[437,220],[357,259],[273,238],[169,264],[30,241]];
    poly(land,B,W,1.5);ctx.save();ctx.beginPath();land.forEach(([xx,yy],i)=>i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy));ctx.closePath();ctx.clip();
    for(let row=0;row<8;row++)for(let col=0;col<12;col++){const xx=18+col*35,yy=15+row*32;if(col===5||col===6&&row>3)continue;rect(xx,yy,21+rand(row*11+col)*6,18,B);line([[xx,yy],[xx+23,yy],[xx+23,yy+19],[xx,yy+19],[xx,yy]],W,.8);}
    poly([[182,-5],[209,-5],[233,65],[211,111],[249,167],[236,213],[277,280],[246,280],[209,221],[220,171],[183,115],[202,63]],R);
    for(const road of [[[0,73],[161,73],[240,72],[440,72]],[[0,169],[158,169],[275,168],[440,168]],[[110,0],[110,270]],[[289,0],[289,270]],[[0,219],[166,218],[366,117],[440,119]]])line(road,W,2.5);
    line([[181,74],[241,74]],W,7);line([[210,170],[255,170]],W,7);line([[181,74],[241,74]],B,3);line([[210,170],[255,170]],B,3);ctx.restore();
    const route=[[71,218],[110,218],[110,169],[159,169],[159,73],[289,73]],k=clamp(progress)*5,i=Math.min(4,Math.floor(k)),f=k-i,dx=lerp(route[i][0],route[i+1][0],f),dy=lerp(route[i][1],route[i+1][1],f);
    if(dots){line([...route.slice(0,i+1),[dx,dy]],R,4);for(let j=0;j<dots;j++){const xx=j?28+rand(j+250)*383:dx,yy=j?28+rand(j+260)*210:dy;oval(xx,yy,5,5,R);ctx.beginPath();ctx.arc(xx,yy,10+(time*.65+j*.1)%1*13,0,7);ctx.strokeStyle=R;ctx.lineWidth=1.5;ctx.stroke();}}
    rect(292,74,65,19,B);label('BANK',296,88,14,W);rect(32,24,96,20,B);label('NORTHSIDE',36,39,13,W);rect(305,226,71,18,B);label('DOCKS',309,240,13,W);
    line([[414,27],[414,55]],W,2);poly([[414,17],[409,31],[419,31]],W);label('N',410,13,10,W);label('CITY / LIVE',10,264,11,R);ctx.restore();line([[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]],W,3);
  }
  function monitor(x,y,w,h,title,baseY){
    const foot=baseY===undefined?y+h+39:baseY;
    // Stems end on a named desk plane; stacked displays share a support pole.
    rect(x+w*.48,y+h+12,w*.04,Math.max(0,foot-y-h-12),W);
    poly([[x+w*.35,foot-5],[x+w*.65,foot-5],[x+w*.7,foot+4],[x+w*.3,foot+4]],B,W,2);
    rect(x-7,y-7,w+14,h+20,B);line([[x-7,y-7],[x+w+7,y-7],[x+w+7,y+h+13],[x-7,y+h+13],[x-7,y-7]],W,3);
    label(title,x+8,y+20,14,W);oval(x+w-6,y+h+7,2,2,R);
  }
  function streetCamera(time,p){
    const state=surveillance(p);rect(0,0,600,340,B);
    // A camera mounted on the bank looks down along its steps and curb.
    // The building is behind the lens, so there is no facade within this feed.
    poly([[457,0],[600,0],[600,340],[74,340]],W);
    for(let i=0;i<8;i++)line([[465+i*48,0],[79+i*48,340]],B,1.5);
    for(let i=0;i<6;i++)line([[458-i*69,i*60],[600,i*60]],B,1.5);
    line([[450,0],[68,340]],W,7);line([[433,0],[51,340]],B,4);
    poly([[543,0],[600,0],[600,128],[454,88]],B);line([[541,17],[478,72],[592,104]],R,3);
    line([[66,67],[239,67]],W,3);line([[27,108],[186,108]],W,3);
    if(state.carArrival>0){
      const x=lerp(-145,273,state.carArrival),y=lerp(328,197,state.carArrival);
      ctx.save();ctx.translate(x,y);ctx.rotate(-.48);
      // Roof, front/rear glazing, mirrors and tires make the overhead car legible.
      for(const xx of [-61,60])for(const yy of [-39,39])rect(xx-16,yy-5,32,10,B);
      poly([[-101,-28],[-78,-42],[60,-42],[98,-26],[105,21],[77,39],[-73,39],[-100,25]],B,W,3);
      poly([[34,-33],[62,-30],[71,27],[35,30]],W);poly([[-62,-32],[-42,-33],[-43,29],[-64,27]],W);
      poly([[-34,-32],[24,-32],[30,30],[-34,30]],B,R,3);line([[-85,-18],[-85,17]],R,3);line([[88,-17],[88,15]],W,4);
      rect(-8,-48,13,7,W);rect(-8,40,13,7,W);ctx.restore();
      if(state.linked>.9){for(const [dx,dy,sx,sy] of [[-114,-73,1,1],[115,-73,-1,1],[-114,72,1,-1],[115,72,-1,-1]])line([[x+dx+sx*19,y+dy],[x+dx,y+dy],[x+dx,y+dy+sy*17]],R,2);}
    }
    // Lens edges, scanlines and rain belong to the live camera, not a thumbnail.
    for(let i=0;i<31;i++){const xx=(rand(i+810)*660-time*17+660)%660,yy=(rand(i+890)*420+time*150)%420-40;line([[xx,yy],[xx-6,yy+18]],i%3?W:R,1);}
    for(let i=0;i<5;i++)line([[0,(time*7+i*77)%340],[600,(time*7+i*77)%340]],W,.5);
    poly([[0,0],[31,0],[0,29]],B);poly([[600,0],[567,0],[600,29]],B);poly([[0,340],[31,340],[0,312]],B);poly([[600,340],[567,340],[600,311]],B);
    rect(0,0,600,33,B);label('CAM 04 / BANK · STREET',16,24,21,W);oval(573,17,5,5,R);
    rect(0,305,600,35,B);label(state.carArrival>.9?'VEHICLE AT ENTRANCE':state.linked>.9?'LIVE / TRACKING SIGNAL':'LIVE / NO ALERTS',15,329,19,state.linked>.9?R:W);
  }
  function cameraFeed(x,y,w,h,time,index,p=0){
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.translate(x,y);
    if(index===0){ctx.scale(w/600,h/340);streetCamera(time,p);}
    else{ctx.scale(w/220,h/135);rect(0,0,220,135,B);for(let i=0;i<5;i++){rect(i*48,35+rand(i)*35,39,88,B);line([[i*48,130],[i*48,35+rand(i)*35],[i*48+39,35+rand(i)*35]],W,2);}line([[0,112],[220,64]],R,4);for(let i=0;i<4;i++){const xx=(time*12+i*52)%220;rect(xx,102-xx*.15,10,5,W);}rect(0,0,220,20,B);label('CAM 12 / EAST BRIDGE',7,14,11);oval(206,11,3,3,R);}
    ctx.restore();
  }
  function seatedOperator(time,p){
    // Seen from behind, centred on the map. Chair, shoulders and hat are drawn
    // from the same viewpoint; no face or front-of-jacket tie is visible.
    ctx.save();ctx.translate(700,554);const breath=Math.sin(time*1.7)*1.1,tap=Math.sin(time*7)*1.2;
    poly([[-63,-15],[-37,-7],[-48,73],[-68,85],[-87,73]],B,W,3);poly([[35,-8],[62,-17],[84,72],[67,87],[45,75]],B,W,3);
    poly([[-88,70],[-64,74],[-62,89],[-100,91],[-111,84]],B,W,3);poly([[65,75],[85,69],[108,83],[103,92],[65,91]],B,W,3);
    ctx.save();ctx.translate(0,breath);
    poly([[-49,-139],[-23,-151],[22,-151],[56,-135],[69,-84],[49,-17],[-54,-14],[-69,-81]],B,W,3);
    line([[-43,-132],[-16,-112],[0,-114],[25,-118],[48,-133]],R,3);line([[1,-110],[1,-32]],W,1.5);
    // Forearms reach past either side of the chair toward the shared keyboard.
    line([[-53,-126],[-105,-76],[-74,-63+tap]],W,25);line([[-53,-126],[-105,-76],[-74,-63+tap]],B,19);
    line([[54,-126],[105,-77],[73,-62-tap]],R,25);line([[54,-126],[105,-77],[73,-62-tap]],B,19);
    oval(-73,-65+tap,12,5,W);oval(72,-64-tap,12,5,W);
    ctx.save();ctx.translate(0,-174);ctx.rotate(-surveillance(p).linked*.07);
    poly([[-27,-18],[26,-18],[24,23],[12,35],[-15,35],[-27,20]],B,R,3);
    poly([[-44,-20],[-29,-54],[29,-54],[45,-20]],B,W,3);poly([[-41,-24],[43,-24],[46,-14],[-44,-14]],R);
    poly([[-68,-14],[-39,-26],[40,-26],[69,-13],[47,0],[-46,1]],B,W,3);ctx.restore();ctx.restore();
    // The chair back occludes his seated lower back, with both legs visible below.
    poly([[-58,-100],[-44,-113],[44,-113],[58,-99],[49,4],[-50,4]],B,W,4);line([[-45,-92],[-37,-10]],R,3);line([[43,-91],[37,-11]],R,3);
    poly([[-56,3],[56,3],[66,18],[-65,18]],B,W,3);line([[0,21],[0,75]],W,8);
    line([[-74,100],[0,75],[74,100]],W,5);line([[0,75],[0,114]],W,5);
    for(const [xx,yy] of [[-76,102],[77,103],[0,116]]){oval(xx,yy,10,6,W);oval(xx,yy,6,3,B);}ctx.restore();
  }
  function room(p,time){
    const state=surveillance(p);
    rect(-200,-200,1600,1100,B);poly([[0,0],[1200,0],[1110,545],[82,535]],R);tone(0,0,1200,530,B,20);
    rect(43,79,203,333,B);ctx.save();ctx.beginPath();ctx.rect(52,88,185,315);ctx.clip();skyline(time);rain(time,false);ctx.restore();line([[43,79],[246,79],[246,412],[43,412],[43,79]],W,6);line([[145,83],[145,408]],B,9);line([[48,257],[240,257]],B,8);
    ground(time,597);
    // One desk plane. Monitor feet, keyboard, mouse and mug all contact this plane.
    poly([[274,422],[1139,422],[1180,527],[245,527]],B,W,4);
    poly([[245,527],[1180,527],[1177,549],[248,549]],B,W,3);
    line([[287,551],[274,688]],W,6);line([[1135,551],[1151,687]],W,6);
    monitor(574,121,363,237,'',441);map(574,121,363,237,time,state.route,state.signal>.02?1:0);
    monitor(279,229,266,169,'',444);cameraFeed(279,229,266,169,time,0,p);
    monitor(965,173,177,118,'',443);cameraFeed(965,173,177,118,time,1);
    monitor(965,326,177,85,'',455);for(let i=0;i<5;i++){const n=(i+Math.floor(time*1.7))%10;rect(975,342+i*12,30+n*10,2,i%3?W:R);}label('FEED ACCESS / ONLINE',973,337,10,W);
    if(state.linked>.01){ctx.save();ctx.globalAlpha=state.linked;line([[566,380],[558,380],[558,264],[546,264]],R,3);rect(579,330,351,26,B);label(state.carArrival>.9?'CAM 04 / VEHICLE AT BANK':'ALERT LINKED → CAM 04',589,348,17,R);line([[272,221],[552,221],[552,419],[272,419],[272,221]],R,2);ctx.restore();}
    poly([[610,468],[787,468],[807,499],[594,499]],B,W,2);for(let row=0;row<4;row++)for(let col=0;col<14;col++)rect(615+col*12-row*3,474+row*5,8,2,W);
    poly([[816,471],[864,471],[873,503],[810,503]],null,W,1);oval(840,486,11,15,W);line([[840,475],[840,482]],B,2);
    // A flattened saucer sits visibly inside the desktop; the cup meets it.
    oval(1024,495,28,7,R);oval(1024,494,22,5,W);poly([[1007,459],[1041,459],[1038,490],[1012,490]],W,B,2);oval(1024,459,17,5,W);oval(1024,459,12,3,B);line([[1042,466],[1054,466],[1053,482],[1040,484]],W,4);
    for(let i=0;i<2;i++){ctx.beginPath();ctx.moveTo(1018+i*11,450);ctx.quadraticCurveTo(1014+i*11+Math.sin(time+i)*4,436,1020+i*11,429);ctx.strokeStyle=W;ctx.lineWidth=1;ctx.stroke();}
    // Cables drop behind the desk; the computer tower stands on the floor.
    for(let i=0;i<2;i++){ctx.beginPath();ctx.moveTo(1112+i*9,543);ctx.bezierCurveTo(1113+i*8,572,1059,602,1070+i*10,651);ctx.strokeStyle=i?W:R;ctx.lineWidth=2;ctx.stroke();}
    rect(1003,555,103,143,B);line([[1003,555],[1106,555],[1106,698],[1003,698],[1003,555]],W,3);for(let i=0;i<2;i++){const yy=590+i*66;oval(1054,yy,26,26,R);oval(1054,yy,22,22,B);for(let k=0;k<3;k++){const a=time*4+k*2.094;line([[1054,yy],[1054+Math.cos(a)*19,yy+Math.sin(a)*19]],W,4);}}
    label('00:17',65,446,21,W);seatedOperator(time,p);
  }
  function bank(p,time,escape=false){
    skyline(time);streetDetails(time);poly([[251,77],[1101,72],[1148,582],[218,582]],W,B,6);
    for(let i=0;i<6;i++)line([[242,122+i*69],[1120,121+i*70]],B,1);tone(269,84,810,75,B,17);
    poly([[231,164],[1120,158],[1131,240],[220,246]],B,W,4);label('DOWNTOWN BANK',675,220,49,W,'center');
    // Recessed divided-light windows, stone mullions and sill shadows.
    for(const x of [290,475,911]){rect(x-8,264,155,242,B);rect(x,273,139,222,B);for(let r=1;r<4;r++)line([[x,273+r*53],[x+139,273+r*53]],W,3);for(let c=1;c<3;c++)line([[x+c*46,273],[x+c*46,495]],W,3);poly([[x+7,282],[x+41,282],[x+41,488],[x+7,488]],R);line([[x+61,319],[x+116,281]],W,2);line([[x+62,342],[x+128,292]],W,1);poly([[x-13,508],[x+150,508],[x+157,520],[x-18,520]],B);}
    for(const x of [254,450,864,1090]){rect(x,254,15,285,W);line([[x+15,254],[x+15,538]],B,3);rect(x-5,534,28,9,B);}
    rect(671,250,182,39,B);label('ENTRANCE',706,277,22);const opened=escape?1:range(p,1.38,1.95);bankDoor(680,306,164,244,opened);
    securityCamera(299,248,.77,time);securityCamera(1049,249,.82,time,true);line([[1049,225],[1087,225],[1087,109]],B,3);
    ground(time,579);poly([[623,557],[879,557],[905,582],[602,582]],B,W,3);line([[611,592],[889,592]],W,3);rain(time,false);
    const a=range(p,0,1),walk=range(p,1,2.35),cx=escape?485+range(p,.7,2.4)*990:456;
    car(cx,670,.81,time,{door:escape?1-range(p,.15,.8):a*(1-range(p,1,1.6)),speed:escape?range(p,.5,2)*15:0});
    for(let i=2;i>=0;i--){const travel=escape?1-range(p,0,.85):walk,xx=lerp(408+i*89,734-i*64,travel),yy=lerp(651+i*8,559+i*20,travel),scale=lerp(.67,.55,travel);if((escape&&p<.9)||(!escape&&p>.72)){
      ctx.save();ctx.globalAlpha=escape?1:range(p,.72,1)*(1-range(p,2.2+i*.08,2.57+i*.02));
      const hand=!escape&&i===0&&p>1.35?[(692+82*(1-opened*.84)-xx)/scale,(450+opened*35-yy)/scale]:null;
      person(xx,yy,scale,time,{mask:true,seed:i,walk:travel*12+i,bag:i===1,hand,tilt:escape?.12:0});ctx.restore();}}
    if(escape&&p>1.35){ctx.save();poly([[12,43],[377,68],[344,412],[0,361]],B,W,5);ctx.beginPath();ctx.rect(6,64,335,318);ctx.clip();person(205,389,.9,time,{hero:true,coat:range(p,1.3,2)*60});label('TIME TO GO.',30,102,30);ctx.restore();}
    splashes(time,642);rain(time,true);
  }
  function robbery(p,time){
    const breach=range(p,.05,.95),fear=.85+range(p,.1,.8)*.15,loot=range(p,1,2.1);
    rect(-200,-200,1600,1100,B);
    // One room: a level back wall, two receding side walls and a shared floor.
    poly([[-140,0],[1340,0],[1080,155],[160,155]],W);tone(0,15,1200,95,B,18);
    poly([[-140,0],[160,155],[160,443],[-140,775]],B,W,3);
    poly([[1080,155],[1340,0],[1340,775],[1080,443]],B,W,3);
    rect(160,155,920,288,W);line([[160,189],[1080,189]],B,4);
    poly([[160,443],[1080,443],[1400,820],[-200,820]],B,W,3);
    // Tile lines converge on the same vanishing point behind the counter.
    for(let i=-5;i<=10;i++){const end=i*170;line([[lerp(620,end,.26),443],[end,800]],W,1);}
    for(const y of [474,516,570,639,723])line([[-100,y],[1300,y]],W,1);
    for(const x of [162,541,1063]){rect(x,154,17,289,B);rect(x-5,192,27,13,B);rect(x-7,431,31,12,B);}
    // Ceiling beams, pendant fixtures and wall signage establish bank scale.
    for(const x of [65,587,1150]){line([[x,22],[lerp(x,620,.22),149]],B,8);}
    for(const x of [390,830]){line([[x,50],[x,106]],B,4);poly([[x-38,106],[x+38,106],[x+28,126],[x-28,126]],B,W,3);line([[x-22,129],[x+22,129]],R,3);}
    rect(597,192,432,39,B);label('DOWNTOWN / SAVINGS & TRUST',814,219,23,W,'center');
    oval(482,248,29,29,B);oval(482,248,24,24,W);line([[482,230],[482,248],[497,258]],B,3);
    // The entrance belongs to the back wall, clear of the customer floor.
    bankDoor(192,241,168,201,.75+breach*.25);rect(204,211,143,23,B);label('STREET ENTRANCE',275,228,14,W,'center');
    securityCamera(191,200,.57,time);rect(402,303,106,101,B);label('BANKING',414,325,17);label('PERSONAL',414,350,12);label('BUSINESS',414,370,12);line([[414,384],[494,384]],R,3);
    // Two teller bays; grilles are behind staff, not across their faces.
    for(const x of [617,855]){rect(x,251,187,194,B);poly([[x+8,445],[x+8,273],[x+23,261],[x+164,261],[x+178,273],[x+178,445]],null,W,2);for(let j=1;j<6;j++)line([[x+12+j*27,276],[x+12+j*27,429]],W,.7);label(x===617?'01':'02',x+83,282,19,R);}
    civilian(714,554,.87,time,{staff:true,fear,variant:0});
    civilian(949,554,.87,time,{staff:true,fear,variant:1});
    // Counter top hides the same waist height on both tellers. Its return and
    // front panels follow the room perspective, with terminals on fixed bases.
    poly([[594,434],[1071,434],[1137,488],[567,488]],W,B,3);
    poly([[602,443],[1065,443],[1104,476],[585,476]],B);
    poly([[567,488],[1137,488],[1137,604],[567,604]],B,W,4);
    poly([[1071,434],[1137,488],[1137,604],[1071,540]],B,W,2);
    line([[578,501],[1125,501]],R,5);
    for(let i=0;i<3;i++){const x=590+i*174;rect(x,521,145,60,W);rect(x+3,524,139,54,B);line([[x+10,570],[x+135,570]],W,1);}
    for(const x of [646,991]){poly([[x,406],[x+51,406],[x+47,447],[x-4,447]],B,W,2);line([[x+22,449],[x+22,460]],W,5);line([[x+7,462],[x+38,462]],W,3);}
    label('DEPOSITS / WITHDRAWALS',827,593,15,W,'center');
    for(let stack=0;stack<3;stack++)for(let j=0;j<3;j++){ctx.save();ctx.globalAlpha=1-loot*.7;paper(914-stack*36,463-j*3,.48);ctx.restore();}
    // Rear guard, advancing gunman, then the bag carrier: ordered by floor depth.
    person(216,530,.76,time,{mask:true,bank:true,seed:2,aim:breach>.75});
    person(lerp(430,485,breach),627,.91,time,{mask:true,bank:true,seed:0,aim:true,walk:breach*8});
    person(lerp(334,883,breach),lerp(562,625,breach),.85,time,{mask:true,bank:true,seed:1,bag:true,walk:breach*10,hand:loot>.2?[103,-160]:null});
    // Full-size adults crouch in front of the counter and along the left wall.
    // Open eyes and hands at the temples remain visible, clear of the gunmen.
    civilian(105,640,.98,time,{variant:0,fear,crouch:true});
    civilian(657,668,1.03,time,{variant:1,fear,crouch:true});
    civilian(1065,670,1.02,time,{variant:0,fear,crouch:true});
    // Perspective contact shadows anchor bodies without a second floor grid.
    for(const [x,y,w] of [[105,649,61],[657,677,65],[1065,679,66]])line([[x-w,y],[x+w,y]],R,2);
    if(p>.9)for(let i=0;i<9;i++){const q=range(p,1+i*.065,1.55+i*.065);paper(lerp(899,933,q),463-Math.sin(q*Math.PI)*75+q*92,.56,q*.8);}
    rect(927,165,126,23,R);label('SILENT ALARM',938,182,15,W);oval(916,177,6+Math.sin(time*4),6,R);
    rect(30,665,236,33,B);oval(44,681,4,4,R);label('REC / CAM 04 · MAIN HALL',58,687,17,W);
    // The mask close-up occupies the upper-left wall, leaving frightened
    // customers and tellers visible throughout the final held beat.
    if(p>1.7){ctx.save();ctx.globalAlpha=range(p,1.7,2.1);poly([[24,119],[300,99],[311,317],[24,333]],B,W,4);ctx.beginPath();ctx.rect(29,124,272,193);ctx.clip();person(166,737,1.68,time,{mask:true,seed:1,look:-.04});label('CAM 04 / SUBJECT',43,145,14,R);ctx.restore();}
    const glitch=p>2.15?range(p,2.15,2.6):.025;for(let i=0;i<4;i++){const yy=(i*173+Math.floor(time*5)*19)%720;rect(0,yy,1200,glitch*(4+rand(i)*15),i%3?B:W);}
    if(p>2.4){rect(0,0,1200,720,B);for(let i=0;i<100;i++)rect(rand(i+Math.floor(time*9))*1200,rand(i+19)*720,rand(i+8)*90+4,3,i%4?W:R);label('SIGNAL LOST',600,375,63,R,'center');}
  }
  function driving(p,time){
    skyline(time,(time*48)%112);ground(time,482);rain(time,false);
    const turn=Math.sin(range(p,0,1)*Math.PI)*130;
    poly([[544+turn,417],[719+turn,417],[1170,720],[50,720]],B,W,5);
    for(let i=0;i<6;i++){const q=(time*.55+i/6)%1;line([[636+turn*(1-q),435+q*q*330],[636+turn*(1-q),453+q*q*330]],W,4+q*7);}
    if(p>1)car(790-range(p,1,2)*45,467,.22+range(p,1,2)*.16,time,{speed:12});
    // Windshield frame, mirror and dashboard place the viewer behind the driver.
    poly([[-100,-50],[259,-50],[151,443],[45,572],[-100,570]],B,W,6);
    poly([[1011,-50],[1330,-50],[1350,665],[1063,472]],B,W,6);
    line([[190,75],[1039,75]],W,3);rect(639,76,11,42,B);
    poly([[550,110],[742,110],[752,174],[541,174]],B,W,3);
    line([[561,157],[638,127],[731,155]],W,1);for(let i=0;i<4;i++)rect(572+i*44,134,8,6,R);
    poly([[-50,592],[350,509],[856,514],[1280,596],[1300,850],[-100,850]],B,W,6);
    line([[437,540],[729,540]],R,4);
    for(let i=0;i<3;i++){const x=527+i*68;oval(x,577,29,29,W);oval(x,577,25,25,B);for(let j=0;j<7;j++){const a=2.6+j*.7;line([[x+Math.cos(a)*20,577+Math.sin(a)*20],[x+Math.cos(a)*23,577+Math.sin(a)*23]],W,1);}const needle=-1.2+p*.35+Math.sin(time*2+i)*.03;line([[x,577],[x+Math.cos(needle)*20,577+Math.sin(needle)*20]],R,3);}
    label('SIGNAL LOCK',584,625,16,R,'center');
    for(let i=0;i<5;i++)line([[455,651+i*7],[724,651+i*7]],W,1);
    map(791,541,290,143,time,p/2);rect(795,543,176,21,B);label('TARGET / SOUTHBOUND',803,559,14,R);
    // Seated over-shoulder view: pelvis and back stay in the driver's seat,
    // elbows stay bent, and both hands contact the upper steering rim.
    ctx.save();ctx.translate(408,577);ctx.rotate(Math.sin(p*Math.PI)*.12);
    ctx.beginPath();ctx.arc(0,0,82,0,7);ctx.strokeStyle=W;ctx.lineWidth=13;ctx.stroke();ctx.beginPath();ctx.arc(0,0,81,0,7);ctx.strokeStyle=B;ctx.lineWidth=7;ctx.stroke();line([[-71,-21],[0,10],[73,-21]],W,7);line([[0,10],[0,75]],W,7);oval(0,9,21,19,B);ctx.restore();
    poly([[260,453],[301,429],[363,431],[403,459],[427,676],[264,691]],B,W,3);
    line([[292,444],[328,461],[372,444]],R,4);
    poly([[304,363],[361,362],[364,408],[348,437],[317,435],[301,407]],B,R,3);
    poly([[288,363],[299,323],[350,319],[376,359]],B,W,3);poly([[266,369],[292,355],[371,352],[393,364],[365,381],[287,383]],B,W,3);line([[299,354],[365,350]],R,4);
    for(const arm of [[[278,462],[292,524],[345,526]],[[387,460],[423,498],[471,526]]]){line(arm,W,27);line(arm,B,21);const [x,y]=arm[2];poly([[x-7,y-5],[x+4,y-7],[x+10,y+3],[x+4,y+10],[x-7,y+5]],W,B,1);}
    // Seat back and headrest establish a real sitting posture.
    poly([[251,502],[280,481],[341,484],[365,510],[390,748],[229,748]],B,W,4);line([[270,520],[257,701]],R,3);line([[345,521],[366,702]],W,2);
    // Continuous wipers sweep the exterior without moving the action playhead.
    const a=Math.sin(time*1.6)*.68;line([[610,507],[610+Math.sin(a)*350,507-Math.cos(a)*315]],B,8);
    line([[979,506],[979+Math.sin(a-.2)*281,506-Math.cos(a-.2)*265]],B,6);
    for(let i=0;i<5;i++)line([[291+i*136,(time*140+i*123)%490],[319+i*136,(time*140+i*123)%490+14]],W,2);
  }
  function roadCar(x,y,s,time,turn=0,hero=false){
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.rotate(turn);
    for(const wx of [-83,83]){oval(wx,-13,15,28,B);oval(wx,-13,10,22,W);oval(wx,-13,6,16,B);}
    poly([[-98,-25],[-90,-69],[-66,-87],[-51,-139],[48,-139],[68,-88],[92,-70],[100,-25],[81,-3],[-79,-3]],B,W,3);
    poly([[-48,-134],[44,-134],[60,-87],[-61,-87]],W);poly([[-42,-127],[38,-127],[49,-94],[-52,-94]],B);
    line([[-89,-66],[88,-66]],W,3);line([[-84,-24],[86,-24]],W,3);
    poly([[-86,-54],[-37,-52],[-37,-40],[-88,-42]],R);poly([[38,-52],[85,-54],[88,-42],[38,-40]],R);
    rect(-21,-39,43,13,W);rect(-13,-35,27,5,B);line([[-61,-17],[-44,-17]],W,4);line([[45,-17],[64,-17]],W,4);
    if(hero)line([[-42,-74],[43,-74]],R,3);
    for(let i=0;i<5;i++){const q=(time*2+i/5)%1;line([[-99-q*22,-8+q*30],[-105-q*28,1+q*30]],W,1);line([[99+q*22,-8+q*30],[105+q*28,1+q*30]],W,1);}
    ctx.restore();
  }
  function chase(p,time){
    skyline(time);ground(time,421);rain(time,false);
    // A road with a real vanishing point; cars are seen from behind in pursuit.
    poly([[525,398],[707,398],[1137,730],[42,730]],B,W,4);
    for(let i=0;i<7;i++){const q=(time*.7+i/7)%1;line([[613,407+q*q*330],[613,418+q*q*349]],W,3+q*5);}
    for(const side of [-1,1])for(let i=0;i<4;i++){const d=i/4,xx=616+side*(117+d*480),yy=413+d*d*257;line([[xx,yy],[xx,yy-80-d*150]],W,3);line([[xx,yy-80-d*150],[xx-side*36,yy-80-d*150]],W,4);}
    const dodge=range(p,.4,1.1),swing=Math.sin(dodge*Math.PI),entry=range(p,1.05,1.42);
    if(entry>0){ctx.save();ctx.globalAlpha=entry;poly([[497,253],[786,253],[804,440],[478,440]],W,B,3);rect(521,289,243,150,B);label('P / UNDERGROUND B2',542,279,17,B);poly([[545,363],[741,363],[872,598],[340,598]],B,W,3);line([[552,376],[737,376]],R,4);ctx.restore();}
    roadCar(lerp(696+swing*53,646,entry),lerp(505,425,entry),lerp(.67,.38,entry),time,-swing*.1);roadCar(lerp(469+swing*62,554,entry),lerp(672,539,entry),lerp(1.12,.74,entry),time,-swing*.1,true);
    // The truck crosses the far intersection, never drives through the hero.
    const tx=lerp(-560,1400,dodge);ctx.save();ctx.translate(tx,425);ctx.scale(.62,.62);
    rect(-270,-166,354,137,W);for(let i=0;i<8;i++)line([[-253+i*42,-156],[-253+i*42,-41]],B,2);
    poly([[85,-117],[181,-117],[226,-67],[226,-18],[85,-18]],B,W,3);poly([[103,-108],[174,-108],[205,-72],[103,-72]],W);
    for(const wx of [-190,9,168]){oval(wx,-15,29,29,B);oval(wx,-15,18,18,W);oval(wx,-15,11,11,B);}ctx.restore();
    if(p>1.42){ctx.save();const edge=lerp(1300,-120,range(p,1.42,2));ctx.beginPath();ctx.moveTo(edge,0);ctx.lineTo(1500,0);ctx.lineTo(1500,800);ctx.lineTo(edge-70,800);ctx.closePath();ctx.clip();garageSequence(0,time);ctx.restore();}
    if(p<1.42)rain(time,true);
  }
  function garageBase(time,broken=0){
    rect(-300,-200,1800,1200,B);
    poly([[-100,25],[1300,25],[995,349],[220,349]],W);tone(0,35,1200,105,B,19);
    rect(190,349,835,135,B);line([[190,349],[1025,349]],W,4);line([[190,420],[1025,420]],R,7);
    poly([[190,484],[1025,484],[1380,800],[-170,800]],B,W,2);
    // Parking bays, wheel stops and the far wall share one perspective.
    for(let i=0;i<8;i++){const x=215+i*107;line([[x,484],[620+(x-620)*2.3,742]],W,2);}
    for(const y of [535,638])line([[-80,y],[1300,y]],W,1);
    for(const x of [222,394,798,940]){poly([[x,458],[x+68,458],[x+75,468],[x-5,468]],W);label(String(Math.round(x/17)),x+20,403,20,W);}
    car(329,453,.28,time);car(958,451,.29,time);
    // Ceiling conduits, brackets and fluorescent housings recede into depth.
    for(const x of [90,386,835,1175])line([[x,-10],[lerp(x,620,.65),349]],B,8);
    for(const y of [161,262])line([[50,y],[1160,y]],B,8);
    line([[114,66],[1057,66],[995,303]],R,9);for(let i=0;i<7;i++)line([[167+i*126,53],[167+i*126,78]],B,3);
    for(const [x,y,w] of [[270,177,185],[566,286,108],[701,103,193]]){
      poly([[x-5,y-8],[x+w+10,y-8],[x+w,y+17],[x-12,y+17]],B,W,2);
      if(x===701&&broken>.05)continue;poly([[x,y],[x+w,y],[x+w-8,y+8],[x-5,y+8]],Math.sin(time*9+x)>.985?B:W,B,1);
    }
    // Side columns leave the central action unobstructed.
    for(const [x,w] of [[76,87],[1040,92]]){poly([[x,40],[x+w,61],[x+w+12,608],[x-9,651]],B,W,3);poly([[x,455],[x+w+8,429],[x+w+9,475],[x-3,505]],R);label('B2',x+19,419,31,W);for(let i=0;i<4;i++)line([[x+4+i*20,526],[x+14+i*20,509]],W,3);}
    rect(559,367,117,68,B);line([[559,367],[676,367],[676,435]],W,2);label('STAIRS',577,392,17,W);label('ROOF ↑',574,419,21,R);
    rect(999,386,24,49,R);rect(1004,394,14,28,B);securityCamera(1063,151,.6,time,true);
    puddle(990,613,107,time);puddle(174,667,94,time);puddle(729,526,56,time);
    for(let i=0;i<10;i++){const y=184+(time*240+i*47)%415;line([[1012,y],[1010,y+13]],W,1.2);}
    ctx.beginPath();ctx.moveTo(895,94);ctx.quadraticCurveTo(938+Math.sin(time)*6,159,885,235);ctx.strokeStyle=B;ctx.lineWidth=4;ctx.stroke();
    if(broken){for(let i=0;i<17;i++){const q=broken,x=736+q*(rand(i+66)-.5)*340,y=118+q*110+q*q*310;poly([[x,y],[x+8,y+13],[x-5,y+20]],W);}rect(415,89,41,23,R);label('EMERGENCY',472,108,24,R);}
  }
  function garageSequence(t,time){
    const walk=range(t,.25,1.55),attack=range(t,1.65,2.62),firstFall=range(t,3.1,3.78),reveal=range(t,3.35,3.75),dodge=range(t,3.72,4),disarm=range(t,4.2,4.72),lastFall=range(t,4.72,5);
    garageBase(time,range(t,3.9,4.13));
    // These cars, cash and the cover column are identical across both chapters.
    car(270,640,.78,time,{door:range(t,.3,.7)});car(880,514,.63,time,{door:1});
    for(let i=0;i<7;i++)paper(778+rand(i+44)*201,554+rand(i+59)*56,.5,Math.sin(time*.8+i)*.025);
    if(t>.2){
      const hx=350+walk*150-dodge*95-disarm*145;
      let from='ready',to='block',mix=attack;
      if(dodge>0){from='block';to='duck';mix=dodge;}
      if(disarm>0){from='duck';to='disarm';mix=disarm;}
      if(lastFall>0){from='disarm';to='punch';mix=lastFall;}if(lastFall>.8){from='punch';to='ready';mix=range(lastFall,.8,1);}
      actor(hx,640,.89,time,{kind:'hero',from,to,mix,facing:1-2*range(t,3.35,3.7)});
    }
    if(t>1.5){ctx.save();ctx.globalAlpha=range(t,1.5,1.65);actor(820-attack*110+firstFall*165,637+firstFall*14,.87,time,{kind:'mask',seed:1,from:firstFall?'punch':'ready',to:firstFall?'down':'punch',mix:firstFall||attack,facing:-1});ctx.restore();}
    if(reveal>0){ctx.save();ctx.globalAlpha=reveal;actor(125+reveal*65,640,.87,time,{kind:'mask',seed:2,from:'aim',to:lastFall?'down':'recoil',mix:lastFall||disarm*.32,facing:1,gun:disarm<.3});ctx.restore();}
    // The same cover column is present from the garage entrance onward.
    poly([[359,48],[425,57],[435,682],[352,698]],B,W,3);poly([[356,479],[431,451],[433,494],[354,525]],R);label('B2',374,431,21,W);
    if(t>3.72&&t<4.22){
      const shot=range(t,3.74,4.04),bx=lerp(347,417,shot);line([[bx-33,444],[bx,444]],W,4);if(shot>.6)burst(420,445,25,R);
      actionPanel('DODGE / TAKE COVER',685,83,428,223,()=>{actor(846,289,.68,time,{kind:'hero',from:'block',to:'duck',mix:dodge});line([[710,128],[1091,128]],R,3);poly([[995,121],[1031,121],[1031,321],[995,321]],B,W,3);});
    }
    if(disarm>0){const x=lerp(305,570,disarm),y=lerp(437,666,disarm);ctx.save();ctx.translate(x,y);ctx.rotate(disarm*5);poly([[-25,-7],[29,-7],[29,5],[-8,5],[-11,23],[-24,21]],W);ctx.restore();}
    if(t>=4.72){actionPanel('DISARM / WEAPON RELEASED',698,88,410,173,()=>{line([[725,208],[819,173],[886,190]],W,20);line([[1070,205],[978,170],[902,191]],R,20);fist(886,190,.7);poly([[884,161],[903,156],[920,170],[916,192],[907,193],[907,175],[894,175]],W,B,2);line([[898,162],[908,170]],B,2);poly([[922,126],[973,115],[977,126],[940,136],[946,152],[932,156]],W);line([[943,173],[959,159]],R,2);});label('TWO DOWN / SIGNAL → ROOF',647,324,22,R);}
    if(t<3){rect(35,96,277,104,B);label('SIGNAL DISTANCE',53,124,20,R);label(`${Math.round(lerp(15,5,walk))} METRES`,54,177,44);}
  }
  function garage(p,time){garageSequence(p,time);}
  function fight(p,time){garageSequence(3+p,time);}
  function roofBase(time){
    skyline(time);ground(time,537);
    // Skyline service details: antenna, water tower and rooftop aerial cables.
    line([[969,301],[969,61]],B,8);line([[928,114],[1008,114],[947,149],[993,183]],B,5);line([[926,277],[969,184],[1013,277]],B,4);
    rect(475,261,143,160,B);line([[475,403],[475,261],[618,261],[618,403]],W,2);
    for(const x of [510,582])line([[x,261],[x+7,145]],B,8);poly([[494,100],[537,77],[597,98],[598,181],[496,181]],B,W,2);line([[496,122],[598,122]],R,3);
    poly([[0,403],[1200,388],[1200,539],[0,544]],B,W,4);line([[0,419],[1200,404]],W,2);for(let i=0;i<10;i++)line([[i*145,426],[i*145,532]],R,2);
    poly([[42,176],[260,158],[273,569],[16,592]],B,W,5);poly([[42,176],[80,145],[291,137],[260,158]],W,B,3);
    rect(58,237,151,322,B);line([[57,237],[209,237],[209,557],[57,557],[57,237]],W,3);line([[179,401],[179,433]],W,5);for(const y of [269,485])rect(58,y,12,18,W);label('ROOF ACCESS',44,211,23,R);
    rect(87,218,68,11,W);rect(232,352,19,55,R);line([[248,225],[248,523]],W,2);
    // Ventilation fans turn on the environment clock behind the action.
    poly([[1020,417],[1139,417],[1180,462],[1050,462]],B,W,3);poly([[1050,462],[1180,462],[1180,535],[1050,535]],B,W,3);
    for(let i=0;i<7;i++)line([[1060,474+i*7],[1170,474+i*7]],W,1);
    oval(1094,441,41,13,W);oval(1094,441,35,10,B);for(let i=0;i<4;i++){const a=time*1.3+i*Math.PI/2;line([[1094,441],[1094+Math.cos(a)*30,441+Math.sin(a)*8]],W,3);}
    poly([[311,474],[425,463],[445,493],[327,507]],B,W,2);for(let i=0;i<7;i++)line([[326+i*14,478],[337+i*14,498]],W,1);
    for(const x of [354,788]){line([[x,501],[x,474],[x+39,474]],W,5);oval(x+42,474,8,8,B);}
    puddle(487,674,121,time);puddle(955,580,94,time);puddle(160,624,90,time);
    ctx.beginPath();ctx.moveTo(275,206);ctx.quadraticCurveTo(716,342+Math.sin(time*.7)*13,1134,213);ctx.strokeStyle=B;ctx.lineWidth=4;ctx.stroke();
    for(let i=0;i<4;i++){const phase=time*.55+i*1.9,x=325+i*182+Math.sin(phase)*22,y=570+Math.sin(phase*.8+i)*15;poly([[x,y],[x+22,y-5],[x+28,y+4],[x+5,y+7]],i%2?W:R);}
    rain(time,false);
  }
  function rooftop(p,time){
    roofBase(time);car(961,590,.7,time,{door:0});
    const approach=range(p,0,1),draw=range(p,1,2);
    actor(lerp(214,421,approach),649,.94,time,{kind:'hero',from:'ready',to:'block',mix:draw*.5});
    actor(884,642,.94,time,{kind:'boss',from:'ready',to:'aim',mix:draw,facing:-1,gun:draw>.05});
    // Only the third robber reached the roof. His discarded mask stays here.
    const unmask=range(p,.55,1);ctx.save();ctx.translate(lerp(884,992,unmask),lerp(379,637,unmask));ctx.rotate(unmask*2.7);poly([[-17,-22],[14,-23],[22,-9],[15,20],[-9,24],[-20,8]],W,B,2);line([[-13,-3],[-3,0]],B,3);line([[6,0],[15,-3]],B,3);line([[-10,-19],[-4,12]],R,3);ctx.restore();
    poly([[795,594],[862,594],[877,645],[783,645]],B,W,3);line([[809,594],[814,578],[843,578],[849,594]],W,3);
    if(p>1.5){actionPanel('THE LAST ROBBER',482,91,367,134,()=>{label('“YOU SHOULD HAVE',505,153,25,W);label('STAYED HOME.”',550,194,25,R);});}
    splashes(time);rain(time,true);
  }
  function finale(p,time){
    roofBase(time);car(961,590,.7,time,{broken:range(p,1.25,1.7)});
    const close=range(p,.35,1),counter=range(p,1.15,2),release=range(p,.7,1.1),tear=range(p,1.5,2);
    const hx=lerp(421,500,close),vx=lerp(884,772,close);
    actor(hx,649,.94,time,{kind:'hero',from:close<1?'duck':'punch',to:close<1?'punch':'ready',mix:close<1?close:range(p,1.76,2)});
    actor(vx+counter*105,642+counter*12,.94,time,{kind:'boss',from:close<1?'aim':'punch',to:close<1?'punch':'down',mix:close<1?close:counter,facing:-1,gun:release<.4});
    // Bullet magnification is a held, readable beat, not a blink between poses.
    if(p<.72){ctx.save();ctx.globalAlpha=1-range(p,.38,.72);actionPanel('01 / THE SHOT — SLIP THE BULLET',95,86,1029,202,()=>{
      const bx=lerp(783,313,range(p,0,.72)),by=191;rain(time,false,[104,121,997,145],{x:bx,y:by});
      line([[bx+89,by],[1088,by]],R,3);poly([[bx-87,by],[bx-51,by-19],[bx+57,by-19],[bx+71,by-13],[bx+71,by+13],[bx+57,by+19],[bx-51,by+19]],W,B,3);line([[bx+44,by-17],[bx+44,by+17]],R,5);for(let i=0;i<7;i++)line([[bx+86+i*29,by-28-Math.sin(i)*9],[bx+109+i*29,by-21]],W,1);
    });ctx.restore();}
    if(close>.55&&counter<.45){actionPanel('02 / PUNCH CLASH',448,93,384,171,()=>{line([[475,212],[535,175],[604,177]],W,29);line([[799,212],[735,175],[667,177]],R,29);fist(610,177,.8);fist(662,177,.8,-1);burst(636,177,43,R);});}
    if(release>0){ctx.save();ctx.translate(lerp(780,1062,release),lerp(427,662,release));ctx.rotate(release*5);poly([[-25,-7],[27,-7],[27,5],[-10,5],[-12,22],[-24,20]],W);ctx.restore();}
    const bx=829,by=lerp(594,566,counter);
    poly([[bx-35-tear*24,by],[bx-tear*22,by+8],[bx-tear*23,by+68],[bx-46-tear*32,by+61]],B,W,3);poly([[bx+tear*23,by+8],[bx+39+tear*21,by],[bx+48+tear*30,by+61],[bx+tear*25,by+68]],B,W,3);
    if(tear>0)for(let i=0;i<37;i++){const a=rand(i+522)*6.28,x=bx+Math.cos(a)*tear*(100+rand(i+519)*450),y=by-tear*230+Math.sin(a)*tear*158;paper(x+Math.sin(time+i)*tear*7,y,.55+rand(i+920)*1.2,tear*(i*.4+Math.sin(time+i)*.05));}
    if(counter>.6){rect(343,98,581,51,B);label('03 / COUNTER — ONE LEFT STANDING',362,136,25,R);line([[815,646],[1051,646]],R,3);}
    splashes(time);rain(time,true);
  }
  function twist(p,time){skyline(time);const zoom=lerp(1,.72,range(p,0,1.4));ctx.save();ctx.translate(600,360);ctx.scale(zoom,zoom);ctx.translate(-600,-360);
    roofBase(time);car(961,590,.7,time,{broken:1});actor(500,649,.94,time,{kind:'hero'});actor(877,654,.94,time,{kind:'boss',from:'down',facing:-1});
    for(let i=0;i<13;i++)paper(695+rand(i+832)*358,610+rand(i+633)*62,.5,rand(i+891)*2);
    const count=effects(30+p).dots;
    // As the camera pulls back, linked incidents spread across the skyline.
    // Network growth is reversible; only the beacon pulses use weather time.
    for(let i=1;i<count;i++){const parent=Math.floor((i-1)/3),x=120+rand(i+451)*1000,y=60+rand(i+415)*430,px=120+rand(parent+451)*1000,py=60+rand(parent+415)*430;line([[px,py],[px,y],[x,y]],R,1);}
    for(let i=0;i<count;i++){const x=120+rand(i+451)*1000,y=60+rand(i+415)*430;oval(x,y,7,7,R);ctx.beginPath();ctx.arc(x,y,15+(time*.8+i*.07)%1*17,0,7);ctx.strokeStyle=W;ctx.lineWidth=1.5;ctx.stroke();if(i<5){rect(x+20,y-19,61,18,B);label('NODE '+String(i+1).padStart(2,'0'),x+24,y-6,11,R);}}
    ctx.restore();rain(time,false);
    if(p>.45&&p<1.95){rect(39,85,399,69,B);label('CITYWIDE / '+count+' ACTIVE SIGNALS',57,114,24,R);label('SAME PATTERN. DIFFERENT LOCATIONS.',57,139,15,W);}
    if(p<.9){poly([[784,306],[1128,285],[1147,669],[790,696]],B,W,6);map(803,325,310,305,time,.9,Math.min(count,8));label('SIGNAL STILL ACTIVE',819,665,22,R);}
    const fade=range(p,1.6,2);if(fade){ctx.save();ctx.globalAlpha=fade;rect(-200,-200,1600,1200,B);ctx.restore();}
    if(p>=1.95){oval(600,340,9,9,R);ctx.beginPath();ctx.arc(600,340,20+((time*.4)%1)*33,0,7);ctx.strokeStyle=R;ctx.lineWidth=1.5;ctx.stroke();label('THIS WAS ONLY THE BEGINNING.',600,418,30,W,'center');label('RED DOT',600,471,20,R,'center');}
  }
  const drawings=[room,(p,t)=>bank(p,t),robbery,(p,t)=>bank(p,t,true),driving,chase,garage,fight,rooftop,finale,twist];
  function renderShot(index,p,time){
    ctx.save();const push=index===0?surveillance(p).cut*.9:0;
    // Push toward the live street feed before cutting outside to the same car.
    ctx.translate(600,360);ctx.scale(1+push,1+push);ctx.translate(-lerp(600,412,clamp(push)),-lerp(360,311,clamp(push)));drawings[index](p,time);ctx.restore();
  }
  function draw(){if(width<=0||height<=0)return;const dpr=Math.min(devicePixelRatio||1,1.6);ctx.setTransform(dpr,0,0,dpr,0,0);rect(0,0,width,height,B);const s=shot(clock.value),scale=Math.min(width/1200,height/(width<760?720:660));
    ctx.save();ctx.translate(width/2,height/2);ctx.scale(scale,scale);ctx.translate(-600,width<760?-360:-385);renderShot(s.index,Math.min(s.local,2.62),clock.weather);
    // A reversible diagonal panel wipe bridges locations; both sides are drawn
    // at the same weather time rather than restarting a shot's ambient loops.
    if(s.cut>0&&s.index<10){ctx.save();const edge=lerp(1400,-230,s.cut);ctx.beginPath();ctx.moveTo(edge,0);ctx.lineTo(1500,0);ctx.lineTo(1500,900);ctx.lineTo(edge-150,900);ctx.closePath();ctx.clip();renderShot(s.index+1,0,clock.weather);ctx.restore();line([[edge,0],[edge-150,900]],W,13);line([[edge+16,0],[edge-134,900]],R,7);}
    ctx.restore();poly([[0,0],[width,0],[width,13],[width*.72,7],[width*.49,16],[width*.18,8],[0,19]],B);poly([[0,height],[width,height],[width,height-17],[width*.77,height-7],[width*.51,height-20],[width*.21,height-10],[0,height-18]],B);
    const info=beatInfo(clock.value);canvas.dataset.chapter=String(s.index+1);canvas.dataset.beat=String(info.beat);canvas.dataset.playhead=clock.value.toFixed(3);canvas.dataset.weather=clock.weather.toFixed(2);
    const locationKey=s.index+':'+(s.index===5&&s.local>1.42?'entry':'');if(lastShot!==locationKey){lastShot=locationKey;document.getElementById('movie-location').textContent=s.index===5&&s.local>1.42?'GARAGE / ENTRY −02':scenes[s.index][1];}
  }
  function tick(now){frame=0;if(!visible||document.hidden)return;const dt=last?(now-last)/1000:0;last=now;clock.advance(dt,motion);if(scope.MovieAudio)scope.MovieAudio.update(clock.value,clock.weather,motion);if(!lastPaint||now-lastPaint>= (width<760?32:15)){const start=typeof performance!=='undefined'?performance.now():0;draw();lastPaint=now;paintCount++;paintCost+=(typeof performance!=='undefined'?performance.now():0)-start;if(now-paintWindow>=1000){canvas.dataset.renderMs=(paintCost/paintCount).toFixed(2);canvas.dataset.renderFps=String(Math.round(paintCount*1000/(now-paintWindow)));paintCost=0;paintCount=0;paintWindow=now;}}app.dataset.travelling=clock.duration?'true':'false';if(motion)frame=requestAnimationFrame(tick);}
  function wake(){cancelAnimationFrame(frame);last=0;frame=0;if(scope.MovieAudio&&(!motion||!visible||document.hidden))scope.MovieAudio.quiet();app.dataset.travelling=clock.duration?'true':'false';if(visible&&!document.hidden){draw();if(motion)frame=requestAnimationFrame(tick);}}
  function setMotion(enabled){motion=enabled;document.documentElement.classList.toggle('motion-paused',!motion);toggle.textContent=motion?'PAUSE MOTION':'ENABLE MOTION';toggle.setAttribute('aria-pressed',String(motion));if(!motion)clock.seek(clock.target,true);window.dispatchEvent(new CustomEvent('portfolio-motion-change',{detail:{paused:!motion}}));wake();}
  function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;const dpr=Math.min(devicePixelRatio||1,1.6);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);wake();}
  scope.MovieScene={go(beat,instant=false){clock.seek(beat,instant||!motion);canvas.setAttribute('aria-label',beatInfo(beat).title+'. '+beatInfo(beat).description);wake();},snapshot(){return {action:clock.value,target:clock.target,weather:clock.weather,motion};}};
  toggle.addEventListener('click',()=>{setMotion(!motion);try{preference=motion?'on':'off';localStorage.setItem('portfolio-motion',preference);}catch(_){}});
  system.addEventListener('change',()=>{if(!preference)setMotion(!system.matches);});document.addEventListener('visibilitychange',wake);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;wake();},{threshold:.01}).observe(canvas);new ResizeObserver(resize).observe(canvas);setMotion(motion);resize();
})(globalThis);
