/* The confrontation is a seekable drawing. Weather has its own forward clock.
   No action particles are emitted as side effects: every impact can be unwound. */
(function (scope) {
  'use strict';
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
  const rand=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
  class Timeline {
    constructor(value=0){this.value=value;this.target=value;this.velocity=0;this.weather=0;this.elapsed=0;this.duration=0;this.from=value;this.initialVelocity=0;}
    seek(target,instant=false){target=clamp(target,0,4);if(target===this.target&&!instant)return;
      this.target=target;this.from=this.value;this.elapsed=0;
      this.duration=instant?0:Math.min(3,.5+Math.abs(target-this.value)*.625);
      this.initialVelocity=clamp(this.velocity,-2,2);
      if(instant){this.value=target;this.velocity=0;}
    }
    advance(dt,motion=true){if(!motion)return;dt=clamp(dt,0,.05);this.weather+=dt;
      if(!this.duration)return;
      this.elapsed+=dt;const u=clamp(this.elapsed/this.duration),d=this.duration,v=this.initialVelocity;
      this.value=clamp((2*u*u*u-3*u*u+1)*this.from+(u*u*u-2*u*u+u)*d*v+(-2*u*u*u+3*u*u)*this.target,0,4);
      this.velocity=((6*u*u-6*u)*this.from+(3*u*u-4*u+1)*d*v+(-6*u*u+6*u)*this.target)/d;
      if(u===1){this.value=this.target;this.velocity=0;this.duration=0;}
    }
  }
  function action(t){return {
    bullet:lerp(570,1110,smooth(.92,2.94,t)),bulletVisible:t>=.92&&t<3.13,
    shot:smooth(.85,1,t),dodge:smooth(2.5,3,t),draw:smooth(3.03,3.48,t),
    returnBullet:lerp(998,474,smooth(3.48,3.68,t)),returnVisible:t>=3.48&&t<3.7,
    impact:smooth(3.65,4,t),muzzle:Math.max(0,1-Math.abs(t-1.025)/.12),
    counterFlash:Math.max(0,1-Math.abs(t-3.5)/.085)
  };}
  scope.AlleyCore={Timeline,action,clamp,smooth};
  if(typeof document==='undefined')return;
  const canvas=document.getElementById('alley-stage');if(!canvas)return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const app=document.getElementById('game'),toggle=document.getElementById('alley-motion');
  const system=matchMedia('(prefers-reduced-motion: reduce)');
  let preference;try{preference=localStorage.getItem('portfolio-motion');}catch(_){/* storage is optional */}
  let motion=preference?preference==='on':!system.matches;
  const clock=new Timeline();let width=1200,height=800,visible=true,last=0,frame=0,px=0,py=0,tx=0,ty=0;
  const BLACK='#08080a',WHITE='#ffffff',RED='#d81032';
  const poly=(points,fill=BLACK,stroke=null,w=2)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.stroke();}};
  const line=(points,color=WHITE,w=2)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();};
  const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
  const oval=(x,y,rx,ry,color)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();};
  function burst(x,y,r,time){ctx.save();ctx.translate(x,y);ctx.rotate(time*.1);const points=[];for(let i=0;i<16;i++){let a=i*Math.PI/8,d=i%2?r*.26:r*(.7+rand(i)*.6);points.push([Math.cos(a)*d,Math.sin(a)*d]);}poly(points,WHITE);ctx.restore();}
  function figure(x,y,scale,hero,pose,time,index=0,reflection=false){
    const gust=Math.sin(time*.8)+Math.sin(time*1.37)*.5,breath=Math.sin(time*1.8+index)*1.5;
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    if(!hero){ctx.translate(-pose.impact*(30+index*30),pose.impact*(30+index*12));ctx.rotate(-pose.impact*(1.2+index*.15));}
    else {ctx.translate(pose.dodge*46,pose.dodge*27);ctx.rotate(pose.dodge*.3-pose.draw*.26);}
    const rim=reflection?RED:WHITE;
    // Long, angular legs and distinctive shoes anchor every pose.
    poly([[-38,-116],[-3,-109],[-10,-12],[-25,7],[-66,7],[-42,-15]],BLACK,rim,2);
    poly([[0,-110],[32,-115],[51,-9],[70,5],[22,7],[5,-36]],BLACK,rim,2);
    poly([[-27,0],[-59,-3],[-81,13],[-28,13]],BLACK);poly([[26,2],[62,0],[82,12],[26,14]],BLACK);
    ctx.save();ctx.translate(0,breath);
    const hem=gust*9+(hero?pose.dodge*82:0);
    poly([[-50,-266],[26,-273],[49,-220],[36,-157],[60+hem,-68],[9,-90],[-4,-61],[-78+hem*.7,-94],[-47,-178]],BLACK,rim,3);
    // Crimson edge and lining read as light, not facial detail.
    poly([[28,-266],[40,-222],[29,-161],[51+hem,-81],[34+hem*.7,-99],[19,-173]],RED);
    line([[-45,-260],[-25,-229],[-39,-215],[-20,-203],[-19,-115]],WHITE,2);
    poly([[-13,-262],[6,-266],[16,-237],[-1,-171],[-14,-217]],hero?WHITE:BLACK);
    if(hero)poly([[-6,-248],[2,-251],[7,-238],[-1,-204],[-6,-225]],RED);
    // Enemies aim toward the right; the protagonist starts with hands pocketed.
    if(!hero){
      const recoil=pose.muzzle*9;line([[26,-248],[63-recoil,-234],[110-recoil,-237]],BLACK,28);line([[33,-258],[76-recoil,-245],[108-recoil,-247]],RED,3);
      poly([[105-recoil,-252],[155-recoil,-252],[155-recoil,-239],[127-recoil,-239],[121-recoil,-218],[109-recoil,-221]],BLACK,WHITE,2);
      line([[-42,-246],[-20,-218],[82,-234]],BLACK,23);
    }else{
      const reach=pose.draw;
      line([[-42,-250],[lerp(-63,-93,reach),lerp(-204,-227,reach)],[lerp(-30,-151,reach),lerp(-164,-232,reach)]],BLACK,29);
      line([[-49,-250],[lerp(-73,-99,reach),lerp(-204,-237,reach)],[lerp(-36,-151,reach),lerp(-164,-242,reach)]],RED,3);
      line([[33,-249],[57,-204],[24,-159]],BLACK,27);line([[42,-247],[67,-204],[31,-160]],WHITE,2);
      if(reach>.02){ctx.save();ctx.globalAlpha=reach;poly([[-151,-247],[-207,-247],[-207,-234],[-174,-234],[-169,-213],[-155,-215]],BLACK,WHITE,2);ctx.restore();}
      if(reach<.98)line([[-38,-168],[-22,-172]],WHITE,2);
    }
    // Featureless face under a heavy fedora brim. No eyes or rendered features.
    ctx.save();ctx.translate(-5,-297);ctx.rotate(hero?-.15: .05);
    poly([[-29,-27],[17,-31],[28,-8],[34,1],[22,12],[16,33],[-12,31],[-31,12]],BLACK,RED,3);
    poly([[-40,-29],[-26,-67],[13,-72],[39,-35]],BLACK,WHITE,3);
    poly([[-35,-36],[33,-42],[39,-32],[-39,-26]],hero?RED:WHITE);
    poly([[-67,-22],[56,-40],[72,-26],[-53,-8]],BLACK,WHITE,3);
    ctx.restore();ctx.restore();ctx.restore();
  }
  function scenery(time,pose){
    rect(-1200,-1000,4200,3000,RED);
    // Torn architectural planes compose one consistent alley behind every camera.
    poly([[-200,-200],[657,-80],[679,492],[-200,932]],BLACK);
    poly([[1110,-150],[1880,-200],[1840,1080],[1000,501]],BLACK);
    poly([[663,-100],[1099,-70],[998,517],[686,500]],WHITE);
    // Crosshatched distant building and fire escapes.
    for(let row=0;row<7;row++)for(let col=0;col<5;col++){let x=707+col*62,y=-8+row*66;poly([[x,y],[x+25,y+2],[x+22,y+39],[x-2,y+37]],BLACK);}
    for(let k=0;k<4;k++){const y=100+k*112;line([[60,y],[554,y+28],[548,y+65],[72,y+35]],WHITE,3);for(let x=90;x<530;x+=37)line([[x,y+3],[x,y+43]],RED,2);line([[475,y+58],[344,y+139]],WHITE,4);}
    for(let k=0;k<6;k++){let y=78+k*80;line([[1215,y],[1510,y-35]],WHITE,4);line([[1250,y],[1275,y+53]],RED,2);}
    line([[590,-20],[614,335],[595,358],[604,565]],WHITE,6);
    const wind=Math.sin(time*.73)*13+Math.sin(time*1.37)*6;
    ctx.beginPath();ctx.moveTo(416,-40);ctx.quadraticCurveTo(786,180+wind,1234,-65);ctx.strokeStyle=BLACK;ctx.lineWidth=5;ctx.stroke();
    ctx.beginPath();ctx.moveTo(391,-35);ctx.quadraticCurveTo(723,227+wind*1.5,1340,-63);ctx.strokeStyle=BLACK;ctx.lineWidth=3;ctx.stroke();
    // Sign, cable, runoff and texture are original geometric scenery.
    poly([[1113,150],[1230,132],[1222,372],[1088,385]],RED,WHITE,5);
    for(let i=0;i<3;i++)poly([[1126,185+i*52],[1195,173+i*52],[1190,193+i*52],[1122,204+i*52]],BLACK);
    poly([[-200,900],[685,498],[997,502],[1830,900]],BLACK,WHITE,4);
    for(let i=0;i<10;i++)line([[685+i*32,515],[i*207-200,960]],RED,2);
    for(let i=0;i<7;i++)line([[-50,600+i*i*8],[1650,615+i*i*9]],RED,2);
    // Screentone made from white dots, maintaining the three-ink palette.
    for(let y=50;y<510;y+=18)for(let x=665;x<1110;x+=18){if(x>700&&x<1030)continue;oval(x+(y%36?0:9),y,2,2,BLACK);}
    // Breakable crate pieces are transformed from intact positions by impact time.
    for(let i=0;i<8;i++){ctx.save();const d=pose.impact,seed=rand(i+42);ctx.translate(326+(i%4)*25-d*(30+seed*140),647+Math.floor(i/4)*37-d*(Math.sin(seed*3)*120)+d*d*100);ctx.rotate(d*(seed-.5)*5);poly([[0,0],[22,-3],[25,32],[2,36]],BLACK,WHITE,2);line([[5,1],[15,28]],RED,2);ctx.restore();}
    // Irregular paper carried by wind, unrelated to the reversible action.
    for(let i=0;i<4;i++){const phase=(time*.075+rand(i+2))%1;ctx.save();ctx.translate(220+phase*950,555+Math.sin(phase*9+i)*62);ctx.rotate(Math.sin(time+i)*.3+phase*5);poly([[-11,-6],[9,-8],[13,5],[-9,9]],WHITE);ctx.restore();}
    // Local lightning stays in the distant sky and never flashes the reading UI.
    const lightning=time%19;
    if(lightning>16.8&&lightning<16.94)poly([[970,-70],[930,93],[960,74],[897,210],[918,91],[890,110]],RED);
  }
  function weather(time,pose,front){
    const wind=Math.sin(time*.73)*28+Math.sin(time*1.37)*14;
    const count=front?140:240;
    for(let i=0;i<count;i++){
      const seed=i+(front?300:0),speed=(front?580:350)+rand(seed)*220;
      let y=((rand(seed+17)*1200+time*speed)%1300)-200;
      const drift=time*19-(28/.73*Math.cos(time*.73)+14/1.37*Math.cos(time*1.37))*.18;
      let x=((rand(seed+3)*2200-drift)%2200+2200)%2200-300;
      // A local field displaces forward-falling rain around the travelling bullet.
      const dx=x-pose.bullet,dy=y-437;
      if(pose.bulletVisible&&Math.abs(dx)<115&&Math.abs(dy)<37){y+=(dy<0?-1:1)*(38-Math.abs(dy))*(1-Math.abs(dx)/115);x+=Math.sin(time*6+i)*8;}
      const lit=(pose.muzzle>.01&&Math.hypot(x-588,y-438)<130)||(pose.counterFlash>.01&&Math.hypot(x-829,y-437)<130);
      line([[x,y],[x-wind*.35-13,y+(front?36:21)]],lit?WHITE:(front?(i%3?WHITE:RED):(i%3?RED:BLACK)),lit?2:(front?1.5:.8));
    }
    if(!front){
      for(let i=0;i<35;i++){const phase=(time*1.5+rand(i+901))%1,x=200+rand(i+17)*1150,y=627+rand(i+36)*207;ctx.beginPath();ctx.ellipse(x,y,4+phase*18,1+phase*3,0,Math.PI,2*Math.PI);ctx.strokeStyle=i%3?WHITE:RED;ctx.lineWidth=phase<.65?1:.4;ctx.stroke();}
      line([[604,566],[601+Math.sin(time*3)*2,636]],WHITE,2);
    }
  }
  function draw(){
    if(width<=0||height<=0)return;
    const dpr=Math.min(devicePixelRatio||1,1.6);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    const t=clock.value,time=clock.weather,p=action(t),mobile=width<760;
    // Section-specific 2D cameras, interpolated on the same reversible playhead.
    const cameras=[{x:805,y:400,z:1},{x:574,y:419,z:1.65},{x:837,y:437,z:2.55},{x:1040,y:434,z:1.6},{x:900,y:430,z:.95}];
    const i=Math.min(3,Math.floor(t)),u=smooth(i,i+1,t),a=cameras[i],b=cameras[i+1];
    const z=lerp(a.z,b.z,u),cx=lerp(a.x,b.x,u),cy=lerp(a.y,b.y,u),base=Math.max(width/1600,height/910);
    ctx.save();ctx.translate(width*(mobile?.51:.39)+px*4,height*.47+py*3);ctx.scale(base*z,base*z);ctx.translate(-cx,-cy);
    scenery(time,p);weather(time,p,false);
    // Rippling fragments of the protagonist's reflection.
    for(let r=0;r<7;r++){ctx.save();ctx.beginPath();ctx.rect(850,715+r*17,410,12);ctx.clip();ctx.translate(Math.sin(time*2+r)*8,980);ctx.scale(1,-.38);figure(1013,710,1.16,true,p,time,0,true);ctx.restore();}
    figure(368,630,.76,false,p,time,2);figure(585,622,.82,false,p,time,1);figure(430,695,1.04,false,p,time,0);
    figure(1013,710,1.16,true,p,time);
    // Spent casings, bullet, flashes and impacts are deterministic at action time.
    if(t>.92&&t<3.2){const age=smooth(.92,2.6,t);ctx.save();ctx.translate(542-age*104,441-age*145+age*age*260);ctx.rotate(age*12);rect(-4,-2,9,4,WHITE);ctx.restore();}
    if(p.bulletVisible){
      for(let w=0;w<5;w++)line([[p.bullet-112-w*19,437+(w-2)*8],[p.bullet-26,437+(w-2)*2]],w%2?RED:WHITE,1.5);
      poly([[p.bullet-24,430],[p.bullet-5,430],[p.bullet+10,436],[p.bullet-5,443],[p.bullet-24,443]],WHITE,BLACK,2);
      line([[p.bullet-18,432],[p.bullet-18,441]],RED,2);
      for(let d=0;d<12;d++){const phase=(time*.55+d/12)%1,angle=phase*6.28+d;const x=p.bullet-18-phase*115,y=437+Math.sin(angle)*(10+phase*29);line([[x,y],[x-8,y+Math.cos(angle)*6]],WHITE,1.3);}
    }
    if(p.muzzle>.01)burst(588,438,77*p.muzzle,t);
    if(p.returnVisible)line([[p.returnBullet+38,442],[p.returnBullet,444]],WHITE,4);
    if(p.counterFlash>.01)burst(829,437,82*p.counterFlash,t);
    if(p.impact>0){
      const d=p.impact;
      for(let j=0;j<22;j++){const seed=rand(j+45),x=444-d*(seed*220),y=463+d*(rand(j+19)-.2)*155;oval(x,y,2+seed*7*d,2+seed*3,RED);}
      if(d<.6)burst(462,455,100*Math.sin(d*Math.PI/.6),t);
      for(let j=0;j<8;j++){let seed=rand(j+87);ctx.save();ctx.translate(450-d*seed*220,600-d*140+seed*d*d*190);ctx.rotate(d*7);poly([[-4,-3],[7,0],[0,8]],WHITE);ctx.restore();}
    }
    if(p.dodge>.01){for(let j=0;j<17;j++){const k=(time*.7+j/17)%1;line([[1078+k*140,567+j*5+k*70],[1084+k*140,573+j*5+k*70]],WHITE,1.2);}}
    weather(time,p,true);ctx.restore();
    // Torn frame and quiet foreground screen-tone establish the comic panel.
    poly([[0,0],[width,0],[width,18],[width*.79,10],[width*.54,22],[width*.31,12],[0,27]],BLACK);
    poly([[0,height],[width,height],[width,height-30],[width*.8,height-13],[width*.49,height-29],[width*.19,height-10],[0,height-25]],BLACK);
  }
  function tick(now){frame=0;if(!visible||document.hidden)return;const dt=last?(now-last)/1000:0;last=now;
    clock.advance(dt,motion);px+=(tx-px)*.045;py+=(ty-py)*.045;draw();
    app.dataset.travelling=clock.duration?'true':'false';
    if(motion)frame=requestAnimationFrame(tick);
  }
  function wake(){cancelAnimationFrame(frame);last=0;frame=0;if(visible&&!document.hidden){draw();if(motion)frame=requestAnimationFrame(tick);}}
  function setMotion(enabled){motion=enabled;document.documentElement.classList.toggle('motion-paused',!motion);toggle.textContent=motion?'PAUSE MOTION':'ENABLE MOTION';toggle.setAttribute('aria-pressed',String(motion));if(!motion)clock.seek(clock.target,true);window.dispatchEvent(new CustomEvent('portfolio-motion-change'));wake();}
  function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;const dpr=Math.min(devicePixelRatio||1,1.6);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);wake();}
  window.AlleyScene={go(index,instant=false){clock.seek(index,instant||!motion);wake();},snapshot(){return {action:clock.value,target:clock.target,weather:clock.weather,motion,travelling:!!clock.duration};}};
  toggle.addEventListener('click',()=>{setMotion(!motion);try{localStorage.setItem('portfolio-motion',motion?'on':'off');preference=motion?'on':'off';}catch(_){}});
  system.addEventListener('change',()=>{if(!preference)setMotion(!system.matches);});
  document.addEventListener('visibilitychange',wake);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;wake();},{threshold:.01}).observe(canvas);
  new ResizeObserver(resize).observe(canvas);
  canvas.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||!motion)return;const r=canvas.getBoundingClientRect();tx=(e.clientX-r.left)/r.width*2-1;ty=(e.clientY-r.top)/r.height*2-1;},{passive:true});
  canvas.addEventListener('pointerleave',()=>{tx=0;ty=0;});
  setMotion(motion);resize();
})(globalThis);
