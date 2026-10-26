/* Original procedural foley, mixed against the rendered playhead. */
(function(scope){
'use strict';
const cues=[
 [.18,'signal'],[1.12,'link'],[2,'brake'],[3.15,'door'],[3.62,'door'],[3.84,'step'],[4.32,'step'],[4.72,'hinge'],[5.12,'step'],
 [6.04,'static'],[6.55,'breach'],[7.2,'paper'],[7.65,'paper'],[8.4,'static'],
 [9.12,'run'],[9.4,'run'],[9.78,'door'],[10,'skid'],[10.4,'rev'],[10.55,'cloth'],
 [12.1,'signal'],[12.8,'skid'],[13.75,'signal'],[15.2,'skid'],[15.65,'horn'],[16.25,'skid'],[17.1,'ramp'],
 [18.4,'door'],[18.85,'step'],[19.3,'step'],[19.7,'cloth'],[20.52,'block'],
 [21.14,'punch'],[21.66,'body'],[21.74,'gun'],[21.86,'ricochet'],[21.92,'glass'],[22.25,'cloth'],[22.72,'disarm'],[22.94,'metal'],[23,'body'],
 [24.05,'hinge'],[24.4,'step'],[24.95,'mask'],[25.55,'cock'],
 [27,'gun'],[27.09,'bullet'],[27.75,'block'],[28.1,'metal'],[28.36,'glass'],[28.62,'punch'],[28.76,'tear'],[28.96,'body'],
 [30.08,'signal'],[30.6,'signal'],[31.05,'signal'],[31.95,'final']
].map(([at,type])=>({at,type}));
function crossed(from,to){if(from===null||to<=from)return [];return cues.filter(c=>from<c.at&&to>=c.at);}
scope.MovieSoundCore={cues,crossed};
if(typeof document==='undefined')return;
const button=document.getElementById('movie-sound');if(!button)return;
let audio,master,bus,compressor,buffer,enabled=false,last=null,lastTime=null,direction=0,pulse=-1;
const voices=new Set(),beds={};
function gain(value=0){const g=audio.createGain();g.gain.value=value;return g;}
function init(){const Audio=scope.AudioContext||scope.webkitAudioContext;if(!Audio)throw new Error('Audio unavailable');audio=new Audio();master=gain();compressor=audio.createDynamicsCompressor();compressor.threshold.value=-18;compressor.knee.value=14;compressor.ratio.value=5;compressor.attack.value=.003;compressor.release.value=.2;bus=gain(.65);bus.connect(compressor).connect(master).connect(audio.destination);
 buffer=audio.createBuffer(1,audio.sampleRate*4,audio.sampleRate);const data=buffer.getChannelData(0);let seed=17;for(let i=0;i<data.length;i++){seed=seed*16807%2147483647;data[i]=seed/2147483647*2-1;}
 bed('rain',null,'lowpass',2700);bed('wind',null,'lowpass',290);bed('fan','triangle',null,62);bed('engine','sawtooth','lowpass',95);bed('hum','sine',null,120);bed('siren','sine',null,600);
}
function bed(name,type,filterType,freq){const source=type?audio.createOscillator():audio.createBufferSource();if(type){source.type=type;source.frequency.value=freq;}else{source.buffer=buffer;source.loop=true;}let output=source;if(filterType){const f=audio.createBiquadFilter();f.type=filterType;f.frequency.value=freq;source.connect(f);output=f;}const level=gain();output.connect(level).connect(bus);source.start();beds[name]={source,level};}
function envelope(node,level,duration,pan=0,attack=.006){const at=audio.currentTime,g=gain();g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(Math.max(.0002,level),at+attack);g.gain.exponentialRampToValueAtTime(.0001,at+duration);const stereo=audio.createStereoPanner();stereo.pan.value=pan;node.connect(g).connect(stereo).connect(bus);node.start(at);node.stop(at+duration+.02);const voice={node,g,stereo};voices.add(voice);node.onended=()=>{node.disconnect();g.disconnect();stereo.disconnect();voices.delete(voice);};}
function tone(f,end,duration,level,type='sine',pan=0){const o=audio.createOscillator();o.type=type;o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),audio.currentTime+duration);envelope(o,level,duration,pan);}
function noise(duration,level,freq=1500,kind='bandpass',pan=0,attack=.006){const source=audio.createBufferSource(),f=audio.createBiquadFilter();source.buffer=buffer;f.type=kind;f.frequency.value=freq;f.Q.value=.7;source.connect(f);const proxy={connect:n=>f.connect(n),start:t=>source.start(t),stop:t=>source.stop(t),disconnect:()=>{source.disconnect();f.disconnect();},set onended(fn){source.onended=fn;}};envelope(proxy,level,duration,pan,attack);}
function play(type,garage=false){switch(type){
 case 'signal':tone(880,880,.12,.06);break;
 case 'final':tone(880,880,.3,.095);break;
 case 'link':tone(620,1240,.16,.04,'triangle');break;
 case 'gun':noise(.13,.5,3600,'highpass',.35);tone(160,38,.24,.23,'triangle');if(garage)noise(.65,.1,1150,'lowpass',-.25,.07);break;
 case 'bullet':noise(.5,.13,4200,'bandpass',-.7,.06);tone(1700,280,.34,.04,'sine',-.5);break;
 case 'ricochet':tone(2300,620,.2,.07,'triangle',.2);break;
 case 'glass':noise(.65,.18,6200,'highpass',.25);tone(3100,2300,.13,.025,'triangle');break;
 case 'punch':noise(.12,.22,700,'lowpass');tone(135,42,.2,.19,'triangle');break;
 case 'block':noise(.09,.2,1400);tone(210,70,.13,.13,'triangle');break;
 case 'body':noise(.25,.2,350,'lowpass');tone(80,28,.32,.18,'sine');break;
 case 'door':case 'breach':noise(.15,type==='breach'?.23:.13,600,'lowpass');tone(120,38,.23,.13,'triangle');break;
 case 'hinge':tone(320,130,.45,.025,'sawtooth');noise(.25,.05,1300);break;
 case 'step':case 'run':noise(.13,.09,garage?800:1800);tone(100,50,.13,.05,'triangle');break;
 case 'disarm':case 'cock':noise(.1,.14,3100,'highpass');tone(1450,750,.1,.045,'triangle');break;
 case 'metal':case 'mask':tone(1650,1190,.26,.065,'triangle',.35);noise(.12,.1,3400);break;
 case 'cloth':case 'paper':case 'tear':noise(type==='tear'?.55:.28,type==='tear'?.13:.065,type==='cloth'?1100:3200,'bandpass',0,.025);break;
 case 'static':noise(.33,.11,3300,'highpass');break;
 case 'skid':case 'brake':noise(.5,.12,2100);tone(690,320,.48,.055,'triangle');break;
 case 'horn':tone(220,220,.55,.06,'sawtooth',.5);tone(293,293,.55,.04,'triangle',.5);break;
 case 'rev':tone(65,145,.55,.06,'sawtooth');break;
 case 'ramp':noise(.4,.08,260,'lowpass');break;
 case 'rewind':noise(.18,.04,1900,'bandpass',0,.035);break;
 }}
function cancel(){for(const v of voices){v.g.gain.cancelScheduledValues(audio.currentTime);v.g.gain.setTargetAtTime(.0001,audio.currentTime,.012);try{v.node.stop(audio.currentTime+.06);}catch(_){}}}
function quiet(){if(audio){master.gain.setTargetAtTime(0,audio.currentTime,.03);cancel();}last=null;lastTime=null;direction=0;pulse=-1;}
function update(value,time,running){if(!enabled||!audio)return;if(!running||document.hidden){quiet();return;}const scene=Math.min(10,Math.floor(value/3)),ending=value>=31.94,garage=scene===6||scene===7;const delta=last===null?0:value-last,moving=Math.abs(delta)>.00001,dir=moving?Math.sign(delta):direction;
 if(moving&&direction&&dir!==direction){cancel();if(dir<0)play('rewind');}direction=dir;
 master.gain.setTargetAtTime(.5,audio.currentTime,.04);
 const levels={rain:ending?0:scene===0?.025:scene===2?.003:garage?.008:.06,wind:ending?0:scene>=8?.045:scene===0||scene===2||garage?.004:.018,fan:scene===0?.012:0,engine:scene===3?(value<10.8?.025:.008):scene===4||scene===5?(moving?.037:.015):scene===6&&value<18.5?.012:scene===1&&value<3.2?.009:0,hum:scene===2?.004:garage?(value<21.9?.009:.002):0,siren:scene===3?.008:scene===9?.006:0};
 for(const [name,level]of Object.entries(levels))beds[name].level.gain.setTargetAtTime(level,audio.currentTime,ending?.025:.18);
 beds.engine.source.frequency.setTargetAtTime(moving?65+Math.min(Math.abs(delta)*900,65)+Math.sin(time*2)*4:43,audio.currentTime,.08);
 beds.siren.source.frequency.setTargetAtTime(540+Math.sin(time*2.5)*170,audio.currentTime,.06);
 // Each cue crosses once in the forward direction. Reverse restores visuals,
 // with a soft rewind cue instead of replaying forward gunfire or impacts.
 for(const cue of crossed(last,value))play(cue.type,garage);
 const bin=Math.floor(time/2.4);if(bin!==pulse){pulse=bin;if(!ending&&(!moving||dir>0)&&(scene===0&&value>.18||scene===6&&value<19.65))play('signal');}
 last=value;lastTime=time;
}
button.addEventListener('click',async()=>{try{if(!audio)init();enabled=!enabled;if(enabled){await audio.resume();last=scope.MovieScene?.snapshot().action??null;}else quiet();button.textContent=enabled?'SOUND ON':'SOUND OFF';button.setAttribute('aria-pressed',String(enabled));}catch(_){enabled=false;quiet();button.textContent='SOUND UNAVAILABLE';button.disabled=true;}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)quiet();});
scope.MovieAudio={update,quiet};
})(typeof window==='undefined'?globalThis:window);
