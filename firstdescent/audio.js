'use strict';
// Local Web Audio synthesis works in browsers and native web-view wrappers.
window.flightAudio=(()=>{
 let context,master,compressor,enabled=true,lastSwim=-1,lastBlast=-1,lastMajorBlast=-1,lastShieldHit=-1,noiseBuffer,arcadeNoise,guitarCurve,noiseSerial=0;
 let worldBus,worldFilter,worldDucker,room,roomSend,roomReturn,cueMusicBus,pressureNoise;
 let environment='air',pendingBossCue=null,bossCueCount=0,lastBossCueAt=-10,bossCueKind='none',worldDuckUntil=0;
 const instrumentWaves={},roomBuffers=new Map();
 const acoustics={
  air:{cutoff:14000,room:.18,wet:.045,damping:.025,spread:.75},
  water:{cutoff:3200,room:.38,wet:.10,damping:.008,spread:.36},
  hangar:{cutoff:10500,room:.74,wet:.10,damping:.02,spread:.65},
  cavern:{cutoff:7200,room:1.15,wet:.15,damping:.012,spread:.55}
 };
 const voices=new Set(),releasing=new Set(),lastCries=new Map();
 // Reserve headroom for readable combat cues; at most 60 voices + four 8ms release tails.
 const voiceLimit=64,activeLimit=60,musicLimit=24,voiceCounters={started:0,stolen:0,dropped:0,peak:0};
 // Instruments follow the place; enemy material is supplied separately by its rig.
 const soundscapes={
  sky:{lead:'arcade',reply:'harp',pad:'silk',drum:155,metal:false,air:.007},
  garden:{lead:'ribbon',reply:'flute',pad:'choir',drum:185,metal:false,air:.006},
  ocean:{lead:'ribbon',reply:'choir',pad:'silk',drum:105,metal:false,air:.003},
  ice:{lead:'crystal',reply:'glass',pad:'choir',drum:215,metal:false,air:.004},
  foundry:{lead:'brass',reply:'pluck',pad:'silk',drum:135,metal:true,air:.009},
  volcanic:{lead:'reed',reply:'mallet',pad:'choir',drum:88,metal:false,air:.012},
  space:{lead:'ribbon',reply:'crystal',pad:'silk',drum:120,metal:true,air:.004}
 };
 let soundscape='sky',shotSerial=0,signalProgress=0;
 function sceneSound(medium,theme,habitat,world={}){
  if(medium==='water')return 'ocean';
  if(world.habitat==='ice'||theme==='ice'||/glaci|frozen/.test(habitat))return 'ice';
  if(theme==='forge')return 'foundry';
  if((theme==='core'&&world.habitat!=='temperate')||/lava|stellar-corona/.test(habitat))return 'volcanic';
  if(/space|orbit|asteroid/.test(world.biome||habitat))return 'space';
  return theme==='verdant'&&habitat==='surface'?'garden':'sky';
 }

 const themeBeat=60/148; // 148 BPM; all sequencer and echo divisions share this clock.
 let musicEnabled=true,titleActive=false,musicTimer=null,musicBus,musicDelay,musicEcho,musicCross,nextBeat=0,musicStep=0,sectorTrack=-1,musicDucker,intensity=0,smoothedIntensity=0,bossApproach=0,smoothedApproach=0,bossEngaged=false,duckUntil=0,duckDepth=1;
 try{musicEnabled=localStorage.getItem('neon-vanguard-title-music')!=='off'}catch{}

 function init(){
  // Explicit game playback uses the media output session on supported iOS versions.
  try{if(window.navigator?.audioSession)window.navigator.audioSession.type='playback';}catch{}
  if(!context){
   const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;
   context=new Audio();master=context.createGain();master.gain.value=enabled?.8:0;
   compressor=context.createDynamicsCompressor();compressor.threshold.value=-3;compressor.knee.value=3;compressor.ratio.value=8;if(compressor.attack)compressor.attack.value=.003;if(compressor.release)compressor.release.value=.20;
   // Add warmth before the limiter; trim the brittle upper register.
   const bass=context.createBiquadFilter(),air=context.createBiquadFilter();
   bass.type='lowshelf';bass.frequency.value=130;bass.gain.value=2.5;
   air.type='highshelf';air.frequency.value=4200;air.gain.value=-1;
   const subsonic=context.createBiquadFilter();subsonic.type='highpass';subsonic.frequency.value=25;subsonic.Q.value=.5;
   master.connect(bass);bass.connect(air);air.connect(subsonic);subsonic.connect(compressor);compressor.connect(context.destination);
   worldBus=context.createGain();worldBus.gain.value=1;worldFilter=context.createBiquadFilter();worldFilter.type='lowpass';worldFilter.Q.value=.5;
   // Control battle peaks before they reach the shared output. Repeated blasts
   // must not push the whole score down through a single shared compressor.
   const effectsCompressor=context.createDynamicsCompressor();effectsCompressor.threshold.value=-14;effectsCompressor.knee.value=9;effectsCompressor.ratio.value=3;effectsCompressor.attack.value=.012;effectsCompressor.release.value=.16;
   worldDucker=context.createGain();worldDucker.gain.value=1;worldBus.connect(effectsCompressor);effectsCompressor.connect(worldFilter);worldFilter.connect(worldDucker);worldDucker.connect(master);
   cueMusicBus=context.createGain();cueMusicBus.gain.value=.62;cueMusicBus.connect(bass);
   if(context.createConvolver){room=context.createConvolver();roomSend=context.createGain();roomReturn=context.createGain();roomReturn.gain.value=.24;worldFilter.connect(roomSend);roomSend.connect(room);room.connect(roomReturn);roomReturn.connect(worldDucker);}
   musicBus=context.createGain();musicBus.gain.value=1.45;musicDucker=context.createGain();musicDucker.gain.value=1;
   const musicBody=context.createBiquadFilter();musicBody.type='peaking';musicBody.frequency.value=250;musicBody.Q.value=.8;musicBody.gain.value=-2;
   const musicPresence=context.createBiquadFilter();musicPresence.type='peaking';musicPresence.frequency.value=2200;musicPresence.Q.value=.7;musicPresence.gain.value=-2;
   musicBus.connect(musicBody);musicBody.connect(musicPresence);musicPresence.connect(musicDucker);musicDucker.connect(bass);
   musicDelay=context.createDelay(1);musicDelay.delayTime.value=themeBeat*.75;musicEcho=context.createGain();musicEcho.gain.value=.14;
   const echoLow=context.createBiquadFilter(),echoHigh=context.createBiquadFilter();echoLow.type='lowpass';echoLow.frequency.value=1900;echoHigh.type='highpass';echoHigh.frequency.value=280;
   musicDelay.connect(echoLow);echoLow.connect(echoHigh);echoHigh.connect(musicEcho);musicEcho.connect(musicDelay);
   const left=context.createStereoPanner(),right=context.createStereoPanner(),cross=context.createDelay(1),crossGain=context.createGain();
   left.pan.value=-.6;right.pan.value=.6;cross.delayTime.value=themeBeat*.25;crossGain.gain.value=.13;musicCross=cross;
   musicEcho.connect(left);left.connect(musicBus);musicDelay.connect(cross);cross.connect(crossGain);crossGain.connect(right);right.connect(musicBus);
   guitarCurve=Float32Array.from({length:1024},(_,i)=>Math.tanh((i/1023*2-1)*2.8)/Math.tanh(2.8));
   noiseBuffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate);
   const samples=noiseBuffer.getChannelData(0);let seed=7381,low=0;
   for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const white=seed/2147483648-1;low=(low+.035*white)/1.035;samples[i]=white*.55+low*2.8;}
   // Clocked one-bit shift-register noise: a coarse arcade crackle, not a tone.
   arcadeNoise=context.createBuffer(1,context.sampleRate*2,context.sampleRate);
   const bits=arcadeNoise.getChannelData(0);let shift=0x1ffff,phase=0;
   for(let i=0;i<bits.length;i++){phase+=6500/context.sampleRate;if(phase>=1){phase-=1;shift=(shift>>>1)|(((shift^(shift>>>3))&1)<<16)}bits[i]=((shift&1)?.8:-.8)*.38+samples[i]*.62;}
   pressureNoise=context.createBuffer(1,context.sampleRate*2,context.sampleRate);const pressure=pressureNoise.getChannelData(0);let body=0,peak=0;
   for(let i=0;i<pressure.length;i++){body=body*.986+samples[i]*.14;pressure[i]=body;peak=Math.max(peak,Math.abs(body));}for(let i=0;i<pressure.length;i++)pressure[i]=pressure[i]/Math.max(.1,peak)*.85;
   if(context.createPeriodicWave)for(const [name,harmonics] of Object.entries({arcade:[1,.64,.18,-.10,-.16,-.07,.03],harp:[1,.24,.11,.045,.017,.005],flute:[1,.07,.025,.008],mallet:[1,.12,.035,.09,.012],glass:[1,.08,.24,.015,.09,.01],reed:[1,.32,.18,.07,.045,.02],pulse:[1,0,.24,0,.10,0,.04],bass:[1,.3,.12,.035],silk:[1,.09,.03,.008],brass:[1,.52,.25,.12,.065,.025],pluck:[1,.38,.19,.085,.035,.012],ribbon:[1,.28,.14,.055,.025,.012],crystal:[1,.015,.29,.01,.075,.002],choir:[1,.10,.035,.13,.026,.012],rubber:[1,.46,.06,.14,.018]})){
    instrumentWaves[name]=context.createPeriodicWave(new Float32Array(harmonics.length+1),Float32Array.from([0,...harmonics]));
   }
   applyEnvironment();
  }
  if(context.state==='running'){startTitleLoop();flushBossCue();return true;}
  // Retry on a real gesture after Safari interrupts audio during app switches.
  context.resume().then(()=>{startTitleLoop();flushBossCue();}).catch(error=>{console.warn('Audio resume failed',error);});return true;
 }
 function impulse(profile){
  if(roomBuffers.has(environment))return roomBuffers.get(environment);
  const length=Math.ceil(context.sampleRate*profile.room),buffer=context.createBuffer(2,length,context.sampleRate);
  for(let channel=0;channel<2;channel++){const data=buffer.getChannelData(channel);let seed=7301+channel*571,low=0;for(let i=0;i<length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;low+=(seed/2147483648-1-low)*profile.damping;const t=i/context.sampleRate;data[i]=t<.018?0:low*Math.exp(-t/profile.room*7)*(1-Math.exp(-(t-.018)*85));}}
  roomBuffers.set(environment,buffer);return buffer;
 }
 function applyEnvironment(){if(!context)return;const p=acoustics[environment];worldFilter.frequency.setTargetAtTime(p.cutoff,context.currentTime,.18);if(room){room.buffer=impulse(p);roomSend.gain.setTargetAtTime(p.wet,context.currentTime,.18);}}
 function setEnvironment(medium='air',theme='verdant',habitat='',world={}){soundscape=sceneSound(medium,theme,habitat,world);const next=medium==='water'?'water':['high-atmosphere','low-atmosphere','surface','stellar-corona'].includes(habitat)?'air':theme==='forge'?'hangar':['core','storm'].includes(theme)?'cavern':'air';if(next===environment)return;environment=next;applyEnvironment();}
 function duckWorld(duration){if(!worldDucker)return;const t=context.currentTime;worldDuckUntil=Math.max(worldDuckUntil,t+duration);const p=worldDucker.gain;if(p.cancelAndHoldAtTime)p.cancelAndHoldAtTime(t);else p.cancelScheduledValues(t);p.setTargetAtTime(.28,t,.035);p.setTargetAtTime(1,worldDuckUntil,.3);}
 function stopVoice(v){try{v.osc.stop()}catch{}v.dispose()}
 function sweepVoices(){if(!context)return;for(const v of [...voices,...releasing])if(v.endAt<=context.currentTime)stopVoice(v)}
 function releaseVoice(v){
  // A tiny crossfade prevents source stealing from introducing a click.
  while(releasing.size>=4)stopVoice(releasing.values().next().value);
  const t=context.currentTime;voices.delete(v);releasing.add(v);v.endAt=t+.008;
  if(v.amp.gain.cancelAndHoldAtTime)v.amp.gain.cancelAndHoldAtTime(t);else v.amp.gain.cancelScheduledValues(t);
  v.amp.gain.linearRampToValueAtTime(.0001,v.endAt);try{v.osc.stop(v.endAt)}catch{v.dispose()}
 }
 function allocateVoice(priority,music){
  sweepVoices();const sameMusic=[...voices].filter(v=>v.music),capacity=priority<=2?48:priority===3?56:activeLimit;
  const crowdedMusic=music&&sameMusic.length>=musicLimit;
  if(!crowdedMusic&&voices.size<capacity)return true;
  // Never sacrifice a critical cue for a shot or background voice. Within music,
  // preserve the lead/rhythm before its quiet ornaments and sustained pads.
  const candidates=crowdedMusic?sameMusic:[...voices];
  const victim=candidates.filter(v=>(music||priority>=5||!v.music||v.priority<2)&&(v.priority<priority||(crowdedMusic&&v.priority===priority)))
   .sort((a,b)=>a.priority-b.priority||a.endAt-b.endAt)[0];
  if(!victim){voiceCounters.dropped++;return false;}
  releaseVoice(victim);voiceCounters.stolen++;return true;
 }
 function trackVoice(osc,amp,nodes,music,priority,now,duration){
  const voice={osc,amp,music,priority,endAt:now+duration+.012,disposed:false,dispose(){if(this.disposed)return;this.disposed=true;for(const node of nodes)node?.disconnect();voices.delete(voice);releasing.delete(voice)}};
  voices.add(voice);voiceCounters.started++;voiceCounters.peak=Math.max(voiceCounters.peak,voices.size+releasing.size);osc.onended=()=>voice.dispose();return voice;
 }
 function clear(){lastImpactAt=lastWeakImpactAt=-1;lastMajorBlast=-1;if(worldDucker){worldDuckUntil=0;worldDucker.gain.cancelScheduledValues(context.currentTime);worldDucker.gain.setTargetAtTime(1,context.currentTime,.08);}lastCries.clear();for(const v of [...voices,...releasing])if(!v.music)stopVoice(v);lastSwim=-1;lastBlast=-1;lastShieldHit=-1;duckUntil=0;duckDepth=1;if(musicDucker){musicDucker.gain.cancelScheduledValues(context.currentTime);musicDucker.gain.setTargetAtTime(1,context.currentTime,.12)}}
 function setEnabled(value){enabled=value;if(!enabled)clear();if(master){master.gain.cancelScheduledValues(context.currentTime);master.gain.setTargetAtTime(enabled?.8:0,context.currentTime,.015)}}
 function note({frequency=440,end=frequency,duration=.12,gain=.04,type='sine',pan=0,offset=0,attack=.006,hold=0,cutoff=2800,space=false,music=false,guitar=false,guitarBend=.965,endPan=null,cutoffEnd=null,vibrato=0,vibratoRate=5,cue=false,instrument=null,priority=cue?6:music?1:3}={}){
  if(!(music?musicEnabled:enabled)||!context||context.state!=='running'||!allocateVoice(priority,music))return;
  const now=context.currentTime+offset,osc=context.createOscillator(),amp=context.createGain(),filter=context.createBiquadFilter(),panner=context.createStereoPanner();
  osc.type=type;osc.frequency.setValueAtTime(guitar?frequency*guitarBend:frequency,now);if(guitar)osc.frequency.exponentialRampToValueAtTime(frequency,now+.055);
  const timbre=instrument||(music?(guitar?'pluck':frequency<180?'bass':duration>1.2?'silk':type==='sine'?'glass':'reed'):null);
  if(timbre&&instrumentWaves[timbre]&&osc.setPeriodicWave)osc.setPeriodicWave(instrumentWaves[timbre]);
  // A restrained played vibrato gives longer guitar notes a living sustain.
  // It uses parameter automation rather than extra oscillator voices.
  if(vibrato&&duration>.2){const begin=Math.min(.12,duration*.3),count=Math.max(2,Math.ceil((duration-begin)*vibratoRate*4));for(let i=1;i<count;i++){const t=begin+(duration-begin)*i/count,depth=Math.min(1,(t-begin)/.18),base=frequency+(end-frequency)*t/duration;osc.frequency.linearRampToValueAtTime(base*Math.pow(2,Math.sin((t-begin)*vibratoRate*Math.PI*2)*vibrato*depth/1200),now+t);}}
  osc.frequency.exponentialRampToValueAtTime(Math.max(25,end),now+duration);
  filter.type='lowpass';filter.frequency.setValueAtTime(cutoff,now);filter.frequency.exponentialRampToValueAtTime(Math.max(180,cutoffEnd??cutoff*(music?.72:.35)),now+duration);
  amp.gain.setValueAtTime(0,now);amp.gain.linearRampToValueAtTime(gain,now+attack);if(hold>0)amp.gain.setValueAtTime(gain,now+Math.min(duration*.7,attack+hold));amp.gain.exponentialRampToValueAtTime(.0001,now+duration);
  const drive=guitar?context.createWaveShaper():null;if(drive){drive.curve=guitarCurve;drive.oversample='2x';osc.connect(drive);drive.connect(filter)}else osc.connect(filter);
  const spread=music||cue?1:acoustics[environment].spread;
  panner.pan.setValueAtTime(Math.max(-.8,Math.min(.8,pan*spread)),now);if(endPan!==null)panner.pan.linearRampToValueAtTime(Math.max(-.8,Math.min(.8,endPan*spread)),now+duration);filter.connect(amp);amp.connect(panner);panner.connect(music?(cue?cueMusicBus:musicBus):cue?master:worldBus);
  const send=space&&music?context.createGain():null;if(send){send.gain.value=.19;panner.connect(send);send.connect(musicDelay);}
  // Two-operator voices give the answering lead and crystal runs a changing
  // spectrum: a bright attack settles into a warm body, rather than a static beep.
  const fm=music&&['ribbon','crystal','rubber'].includes(timbre)?context.createOscillator():null,depth=fm?context.createGain():null;
  if(fm){fm.type='sine';fm.frequency.setValueAtTime(frequency*(timbre==='crystal'?2:1),now);depth.gain.setValueAtTime(frequency*(timbre==='crystal'?.65:timbre==='rubber'?1.1:.28),now);depth.gain.exponentialRampToValueAtTime(frequency*.012,now+duration*.8);fm.connect(depth);depth.connect(osc.frequency);filter.Q.value=.7;}
  const voice=trackVoice(osc,amp,[osc,drive,filter,amp,panner,send,fm,depth],music,priority,now,duration);osc.start(now);osc.stop(voice.endAt);if(fm){fm.start(now);fm.stop(voice.endAt);}
 }
 // Reuse one noise buffer; transient sources are stopped and disconnected.
 function noise({duration=.15,gain=.04,cutoff=2400,end=300,pan=0,offset=0,band=false,resonance=1.4,arcade=false,body=false,wet=false,music=false,highpass=0,hold=0,tremolo=0,cue=false,pressure=false,priority=cue?6:music?1:3}={}){
  if(!(music?musicEnabled:enabled)||!context||context.state!=='running'||!allocateVoice(priority,music))return;
  const now=context.currentTime+offset,osc=context.createBufferSource(),filter=context.createBiquadFilter(),amp=context.createGain(),panner=context.createStereoPanner();
  osc.buffer=pressure?pressureNoise:arcade?arcadeNoise:noiseBuffer;osc.loop=body;if(arcade){osc.playbackRate.setValueAtTime(1,now);osc.playbackRate.exponentialRampToValueAtTime(.55,now+duration)}filter.type=band?'bandpass':'lowpass';filter.Q.value=band?resonance:.5;
  filter.frequency.setValueAtTime(cutoff,now);
  if(wet){filter.frequency.exponentialRampToValueAtTime(cutoff*.42,now+duration*.22);filter.frequency.exponentialRampToValueAtTime(cutoff*1.15,now+duration*.38);filter.frequency.exponentialRampToValueAtTime(cutoff*.38,now+duration*.62);filter.frequency.exponentialRampToValueAtTime(cutoff*.7,now+duration*.75);}
  filter.frequency.exponentialRampToValueAtTime(end,now+duration);
  amp.gain.setValueAtTime(0,now);amp.gain.linearRampToValueAtTime(gain,now+(body?.008:.003));
  if(wet){
   // Irregular pressure bursts make a wet tear, rather than a uniform filtered hiss.
   for(const [at,level] of [[.14,.42],[.27,.88],[.42,.28],[.56,.67],[.72,.20]])amp.gain.linearRampToValueAtTime(gain*level,now+duration*at);
   amp.gain.linearRampToValueAtTime(0,now+duration);
  }else if(body){
   // Keep audible blast energy through the middle; an immediate exponential fade sounded like a pop.
   amp.gain.linearRampToValueAtTime(gain*.8,now+duration*.22);
   amp.gain.linearRampToValueAtTime(gain*.38,now+duration*.62);
   amp.gain.linearRampToValueAtTime(0,now+duration);
  }else{if(arcade||hold)amp.gain.setValueAtTime(gain,now+Math.min(duration*.4,arcade?.045:.003+hold));amp.gain.exponentialRampToValueAtTime(.0001,now+duration);}
  panner.pan.value=Math.max(-.8,Math.min(.8,pan*(music||cue?1:acoustics[environment].spread)));osc.connect(filter);
  const lowCut=highpass?context.createBiquadFilter():null;if(lowCut){lowCut.type='highpass';lowCut.frequency.value=highpass;lowCut.Q.value=.5;filter.connect(lowCut);lowCut.connect(amp)}else filter.connect(amp);
  // A gain envelope chops broadband noise into dry insect-wing strokes. This
  // needs no free-running LFO/source: automation dies with the tracked voice.
  const flutter=tremolo?context.createGain():null;
  if(flutter){
   const rate=Math.max(14,Math.min(110,tremolo)),floor=.055;
   flutter.gain.setValueAtTime(floor,now);
   for(let stroke=0,at=0;at<duration;stroke++){
    const cycle=(1+.055*Math.sin(stroke*1.73))/rate,crest=.9+.1*Math.sin(stroke*2.31+.4);
    // Slightly irregular, narrow pulses sound like a chattering membrane,
    // rather than a pitched square wave or a smooth rushing gust.
    for(const [part,level] of [[.16,crest],[.40,crest*.83],[.63,floor]]){
     if(at+cycle*part<duration)flutter.gain.linearRampToValueAtTime(level,now+at+cycle*part);
    }
    at+=cycle;if(at<duration)flutter.gain.linearRampToValueAtTime(floor,now+at);
   }
   flutter.gain.linearRampToValueAtTime(0,now+duration);amp.connect(flutter);flutter.connect(panner);
  }else amp.connect(panner);
  panner.connect(music?(cue?cueMusicBus:musicBus):cue?master:worldBus);
  const voice=trackVoice(osc,amp,[osc,filter,lowCut,amp,flutter,panner],music,priority,now,duration);osc.start(now,(noiseSerial++*.317)%Math.max(.01,body?1.1:2-duration-.03));osc.stop(voice.endAt);
 }
 const sectorMusic=[
  {bpm:108,root:0,type:'triangle',chords:[[40,47,55],[43,50,59],[45,52,60],[38,45,54]],motif:[64,67,71,-1,69,67,64,-1]},
  {bpm:120,root:0,type:'sawtooth',chords:[[38,45,53],[34,41,50],[43,50,58],[33,40,48]],motif:[62,-1,62,65,62,-1,69,65]},
  {bpm:96,root:0,type:'sine',chords:[[36,43,51],[32,39,48],[39,46,55],[34,41,50]],motif:[72,-1,67,71,-1,63,67,-1]},
  {bpm:112,root:0,type:'sine',chords:[[38,45,53],[41,48,57],[36,43,52],[33,40,48]],motif:[74,69,72,-1,77,72,69,-1]},
  {bpm:126,root:0,type:'sawtooth',chords:[[35,42,50],[38,45,54],[31,38,47],[33,40,49]],motif:[71,71,-1,74,69,71,78,-1]},
  {bpm:116,root:0,type:'triangle',chords:[[33,40,48],[41,48,57],[36,43,52],[31,38,47]],motif:[69,-1,70,64,69,76,-1,63]}
 ];
 // Authored environment scores: harmony, melody and pace change together.
 // Intervals are relative to the sounding chord; lengths are eighth notes.
 const sceneScores={
  sky:{bpm:148,chords:[[43,50,59],[40,47,55],[36,43,52],[38,45,54]],phrases:[[[0,24,1],[1,31,1],[2,28,1],[3,24,2],[5,26,1],[6,28,2]],[[0,24,1],[1,27,1],[2,31,2],[4,34,1],[5,31,1],[6,27,2]],[[0,28,1],[1,31,1],[2,36,2],[4,33,1],[5,31,1],[7,28,1]],[[0,31,1],[1,28,1],[2,26,1],[3,24,2],[5,19,1],[6,24,2]]]},
  garden:{bpm:144,chords:[[41,48,57],[36,43,52],[38,45,53],[34,41,50]],phrases:[[[0,24,1],[1,28,1],[3,31,1],[4,28,1],[5,26,1],[6,24,2]],[[0,28,2],[2,31,1],[3,33,1],[4,31,1],[6,28,1],[7,26,1]],[[0,27,1],[1,24,1],[2,19,2],[4,24,1],[5,27,1],[6,31,2]],[[0,28,1],[2,26,1],[3,24,1],[4,19,2],[6,24,2]]]},
  ocean:{bpm:140,chords:[[39,46,55],[34,41,50],[36,43,51],[32,39,48]],phrases:[[[0,24,1],[1,31,1],[2,28,2],[4,26,1],[5,24,1],[7,19,1]],[[0,24,2],[2,28,1],[3,31,1],[4,33,1],[5,31,1],[6,28,2]],[[0,31,1],[1,27,1],[3,24,1],[4,27,2],[6,22,1],[7,24,1]],[[0,28,1],[1,31,1],[2,36,2],[4,31,1],[5,28,1],[6,24,2]]]},
  ice:{bpm:146,chords:[[38,45,54],[33,40,49],[35,42,50],[31,38,47]],phrases:[[[0,31,1],[1,28,1],[2,24,1],[4,26,1],[5,28,1],[6,31,2]],[[0,28,1],[2,24,1],[3,19,1],[4,24,2],[6,28,1],[7,31,1]],[[0,27,2],[2,31,1],[3,34,1],[5,31,1],[6,27,2]],[[0,31,1],[1,28,1],[2,26,1],[3,24,1],[4,19,2],[6,24,2]]]},
  foundry:{bpm:154,chords:[[38,45,53],[34,41,50],[41,48,57],[36,43,52]],phrases:[[[0,24,1],[1,24,1],[2,27,1],[3,31,2],[5,24,1],[6,34,2]],[[0,28,1],[1,24,1],[3,19,1],[4,24,1],[5,28,1],[6,31,2]],[[0,31,1],[1,28,1],[2,24,2],[4,28,1],[5,31,1],[7,33,1]],[[0,31,1],[2,28,1],[3,26,1],[4,24,1],[5,19,1],[6,24,2]]]},
  volcanic:{bpm:156,chords:[[33,40,48],[41,48,57],[36,43,52],[31,38,47]],phrases:[[[0,24,1],[1,31,1],[2,27,2],[4,24,1],[5,22,1],[6,24,2]],[[0,28,1],[1,31,1],[3,36,1],[4,31,1],[5,28,1],[6,24,2]],[[0,24,1],[1,28,1],[2,31,2],[4,33,1],[6,31,1],[7,28,1]],[[0,31,1],[1,28,1],[2,26,1],[3,24,1],[4,19,2],[6,24,2]]]},
  space:{bpm:150,chords:[[36,43,52],[43,50,59],[45,52,60],[41,48,57]],phrases:[[[0,24,1],[1,28,1],[2,31,1],[3,36,2],[5,31,1],[6,33,2]],[[0,31,1],[1,28,1],[3,26,1],[4,24,2],[6,28,2]],[[0,27,1],[1,31,1],[2,34,2],[4,31,1],[5,27,1],[7,24,1]],[[0,28,1],[2,31,1],[3,33,1],[4,36,1],[5,31,1],[6,24,2]]]}
 };
 // Sector accompaniment keeps its own register, syncopation and stereo figures.
 const arrangements=[
  {arp:[0,-1,1,2,-1,1,2,-1],bass:[0,-1,0,-1,0,12,-1,7],kick:[0,4],snare:[2,6],hat:[1,3,5,7],swing:0,answer:[71,74,69,67],pad:'triangle'},
  {arp:[0,1,-1,0,2,-1,1,0],bass:[0,-1,0,7,-1,0,12,-1],kick:[0,3,4],snare:[2,6],hat:[1,3,4,7],swing:.035,answer:[65,69,62,60],pad:'sine'},
  {arp:[2,-1,-1,1,-1,0,-1,1],bass:[0,-1,-1,7,0,-1,-1,-1],kick:[0,5],snare:[4],hat:[3,7],swing:.065,answer:[75,71,67,63],pad:'sine'},
  {arp:[0,2,1,-1,2,1,-1,0],bass:[0,-1,7,-1,0,-1,12,7],kick:[0,4],snare:[2,6],hat:[0,3,5,7],swing:.018,answer:[77,74,72,69],pad:'triangle'},
  {arp:[0,0,2,-1,1,0,-1,2],bass:[0,0,-1,7,0,-1,12,-1],kick:[0,3,4,7],snare:[2,6],hat:[1,3,5,7],swing:0,answer:[74,78,71,69],pad:'triangle'},
  {arp:[0,-1,2,1,-1,0,2,-1],bass:[0,-1,7,0,-1,12,0,-1],kick:[0,3,6],snare:[4],hat:[1,2,5,7],swing:.025,answer:[76,70,69,63],pad:'sine'}
 ];
 const hz=midi=>440*Math.pow(2,(midi-69)/12);
 // Long accompaniment notes resolve to the sounding triad. Short melody notes
 // may pass through its pentatonic scale, without chromatic clashes or glides.
 function harmonicPitch(pitch,chord,sustained=false){
  const root=chord[0],minor=chord.some(n=>((n-root)%12+12)%12===3);
  const intervals=sustained?chord.map(n=>((n-root)%12+12)%12):minor?[0,3,5,7,10]:[0,2,4,7,9];
  for(let distance=0;distance<=6;distance++)for(const candidate of distance?[pitch-distance,pitch+distance]:[pitch])if(intervals.includes(((candidate-root)%12+12)%12))return candidate;
  return root;
 }

 function stopTitleLoop(){
  if(musicTimer!==null)clearInterval(musicTimer);musicTimer=null;
  if(musicBus){musicBus.gain.cancelScheduledValues(context.currentTime);musicBus.gain.setTargetAtTime(0,context.currentTime,.025);}
  for(const v of [...voices])if(v.music)releaseVoice(v);
 }
 // Original D-Mixolydian theme. A short pickup leaps into a held note, then
 // answers off the beat. The bass carries motion while the melody sings.
 // Events: [eighth-note position (including half steps), MIDI, quarter beats].
 const titleChords={
  em:{root:40,voices:[55,59,64]},emd:{root:38,voices:[55,59,64]},
  c:{root:36,voices:[55,59,64]},b:{root:35,voices:[54,57,63]},
  am:{root:33,voices:[55,60,64]},emg:{root:43,voices:[55,59,64]},
  d:{root:38,voices:[54,57,62]},g:{root:43,voices:[55,59,62]},
  fs:{root:42,voices:[57,60,64]},
  td:{root:38,voices:[57,62,66]},tc:{root:36,voices:[55,60,64]},
  tg:{root:31,voices:[55,59,62]},ta:{root:33,voices:[57,61,64]},
  tbm:{root:35,voices:[54,59,62]},tem:{root:40,voices:[55,59,64]}
 };
 const titleChanges=[
  'td','tc','tg','td','td','tc','tg','ta',
  'td','tc','tg','td','tbm','tg','tem','ta',
  'tbm','tg','td','ta','tbm','tg','tem','ta',
  'td','tc','tg','td','tbm','tg','ta','td'
 ];
 // The five-note identity returns intact before each developed answer.
 const titleTheme=[
  [[0,74,.42],[1,76,.42],[2,81,1.18],[4.5,78,.64],[6,76,.86]],
  [[0,74,.42],[1,72,.42],[2,79,1.18],[4.5,76,.64],[6,74,.86]],
  [[0,71,.68],[1.5,74,.68],[3,79,1.38],[6,78,.42],[7,76,.42]],
  [[0,78,1.65],[3.5,76,.64],[5,74,.9]],
  [[0,74,.42],[1,76,.42],[2,81,1.18],[4.5,78,.64],[6,83,.86]],
  [[0,84,.9],[2,79,.42],[3,76,1.15],[5.5,74,.42],[6.5,72,.65]],
  [[0,71,.68],[1.5,74,.68],[3,79,.9],[5,78,.42],[6,76,.42],[7,74,.42]],
  [[0,73,.9],[2,76,.42],[3,81,1.1],[5.5,79,.42],[6.5,76,.42]]
 ];
 const titleDevelopment=[titleTheme[0],
  [[0,74,.42],[1,72,.42],[2,79,.9],[4,81,.2],[4.5,79,.2],[5,76,.68],[6.5,74,.65]],
  [[0,71,.68],[1.5,74,.68],[3,83,1.38],[6,81,.42],[7,79,.42]],
  [[0,78,.9],[2,76,.42],[3,74,.68],[4.5,69,.68],[6,74,.7]],
  [[0,78,.42],[1,81,.42],[2,83,1.18],[4.5,78,.64],[6,74,.86]],
  [[0,79,.9],[2,78,.42],[3,74,1.15],[5.5,71,.42],[6.5,74,.65]],
  [[0,76,.68],[1.5,79,.68],[3,83,.9],[5,81,.42],[6,79,.42],[7,78,.42]],
  [[0,76,.42],[1,73,.42],[2,69,.9],[4,73,.42],[5,76,.42],[6,81,.65]]];
 const titleBridge=[
  [[0,66,1.65],[3.5,69,.64],[5,71,1.2]],
  [[0,71,.68],[1.5,74,1.6],[5,71,.68],[6.5,67,.65]],
  [[0,69,1.15],[2.5,74,.64],[4,78,1.6]],
  [[0,76,1.65],[3.5,73,.64],[5,69,1.2]],
  [[0,71,.68],[1.5,74,.68],[3,78,1.15],[5.5,81,.9]],
  [[0,83,1.15],[2.5,81,.64],[4,79,.9],[6,74,.7]],
  [[0,79,.68],[1.5,83,.68],[3,81,.68],[4.5,79,.64],[6,78,.7]],
  [[0,76,.42],[1,73,.42],[2,69,.9],[4,73,.42],[5,76,.42],[6,79,.42],[7,81,.42]]
 ];
 const titleReturn=[titleTheme[0],titleTheme[1],titleDevelopment[2],titleTheme[3],
  titleDevelopment[4],titleDevelopment[5],titleDevelopment[7],
  [[0,78,.68],[1.5,76,.68],[3,74,1.65],[7,69,.32]]];
 const titlePhrases=[...titleTheme,...titleDevelopment,...titleBridge,...titleReturn];
 const descentHook=[[[0,0,.75],[2,7,.5],[3,5,.5],[4,3,1],[7,2,.4]],[[0,0,1.5],[3,-5,.5],[4,-2,1],[6,0,.85]]];
 // Later passes trade lead timbres and develop the hook while the rhythm
 // section keeps driving: there is no ambient, half-time opening on repeats.
 function titleVariation(index){const pass=Math.floor(index/256)%4,bar=Math.floor(index/8)%32;return{pass,ambient:false,answer:pass>0&&bar%8===6,warm:pass===2||pass===1&&bar%4>=2,counter:pass===3};}
 // Fallback melodic sentences with held notes and rests. Chord tones
 // connect the melody to changing harmony, rather than rotating one short riff.
 const sectorPhrases=[
  [[0,0,2,2],[3,1,2,1],[5,2,1,2]],
  [[1,2,1,2],[4,1,2,2]],
  [[0,1,2,3],[4,0,2,2],[7,2,1,.7]],
  [[0,2,1,2],[3,1,1,2]],
  [[0,0,2,1],[2,1,2,1],[4,2,1,3]],
  [[1,1,2,3],[5,0,2,2]],
  [[0,2,1,2],[3,0,2,1],[5,1,2,2]],
  [[0,1,1,3],[4,0,2,2]]
 ];
 // Slow counter-lines appear in alternate song acts. Each biome has its own
 // contour, so longer runs develop instead of exposing one repeating motif.
 const sectorCounterlines=[
  [7,12,9,4,14,12,7,2],
  [12,7,10,5,3,7,15,10],
  [15,10,7,3,12,8,5,1],
  [9,14,12,7,16,14,9,5],
  [12,15,10,7,17,12,8,3],
  [7,13,10,5,15,12,6,1]
 ];
 // The last stretch of every sector gains its own pursuit figure. These use
 // different interval contours and drum accents while remaining harmonically
 // connected to that sector's main theme.
 const bossApproaches=[
  {notes:[0,1,0,7,3,1,10,7],pulse:[0,2,4,6],type:'triangle'},
  {notes:[0,0,6,0,10,6,1,0],pulse:[0,1,3,4,6,7],type:'sawtooth'},
  {notes:[0,5,1,8,3,10,5,1],pulse:[0,3,4,7],type:'sine'},
  {notes:[0,7,3,10,5,12,8,3],pulse:[0,2,3,5,6],type:'triangle'},
  {notes:[0,1,6,7,10,6,13,7],pulse:[0,1,2,4,5,7],type:'sawtooth'},
  {notes:[0,3,1,8,6,13,10,1],pulse:[0,2,4,5,6,7],type:'triangle'}
 ];
 // Original musical identities: melodic sentences with held notes and rests,
 // rather than one arpeggio transposed for every biome. Intervals follow the
 // current chord root; later phrases answer and develop the opening hook.
 const biomeMelodies=[
  [[[0,12,3],[3,15,1],[4,19,2],[7,14,1]],[[0,10,2],[3,7,2],[6,12,2]],[[0,15,3],[4,14,1],[5,12,2]],[[0,7,2],[3,10,1],[4,14,3]]],
  [[[0,12,1],[2,12,1],[3,15,2],[6,19,1]],[[0,10,2],[3,7,1],[4,12,3]],[[0,19,2],[2,17,1],[4,15,2],[7,12,1]],[[0,7,3],[4,10,2],[7,11,1]]],
  [[[0,19,4],[5,15,2]],[[1,14,3],[5,12,2]],[[0,22,3],[4,19,2],[7,15,1]],[[0,14,2],[3,10,3]]],
  [[[0,12,2],[2,19,2],[5,22,2]],[[0,19,3],[4,17,1],[6,15,2]],[[1,15,2],[3,19,1],[5,24,2]],[[0,22,2],[3,19,2],[6,14,1]]],
  [[[0,12,1],[1,19,1],[3,15,2],[6,22,1]],[[0,19,2],[3,17,1],[4,15,2],[7,14,1]],[[0,24,3],[4,22,1],[6,19,2]],[[0,15,2],[3,14,2],[6,11,1]]],
  [[[0,12,3],[4,13,1],[6,19,2]],[[0,15,2],[3,12,2],[6,7,2]],[[0,20,3],[4,19,1],[5,15,2]],[[0,13,2],[3,11,2],[6,12,2]]]
 ];
 let planetMusicSeed=0,planetTheme=null;
 function worldMusicIdentity(identity){let seed=0;for(const c of String(identity||''))seed=(Math.imul(seed,31)+c.charCodeAt(0))>>>0;return seed;}
 // Sound identities follow anatomy/material, not merely the six attack scripts.
 // Seeded registers and pulse patterns stay recognisable on repeat encounters.
 const bossVoiceFamilies={
  hunter:{instrument:'reed',pulse:[0,3,4,6],register:92},
  swarm:{instrument:'ribbon',pulse:[0,1,4,5,7],register:73},
  carapace:{instrument:'pluck',pulse:[0,2,5],register:62},
  leviathan:{instrument:'choir',pulse:[0,4,7],register:51},
  siphon:{instrument:'glass',pulse:[0,3,6],register:67},
  turbine:{instrument:'brass',pulse:[0,2,3,6],register:84},
  ion:{instrument:'crystal',pulse:[0,1,4,6,7],register:108},
  plasma:{instrument:'ribbon',pulse:[0,3,4,7],register:58}
 };
 let bossVoice={family:'hunter',kind:0,seed:0,pitch:92,rate:18,...bossVoiceFamilies.hunter},bossActionSerial=0;
 function setBossIdentity(profile={}){
  const kind=profile.kind??Math.max(0,sectorTrack),organic=profile.organic??![1,4].includes(kind),anatomy=profile.anatomy||'',water=profile.habitat==='water'||environment==='water';
  const family=!organic?(kind===4?'ion':'turbine'):profile.protection==='stellar'?'plasma':/squid|nautilus|bell|jelly/.test(anatomy)?'siphon':water?'leviathan':/moth|wasp|mantis|beetle/.test(anatomy)||!anatomy&&kind===5?'swarm':/crab|trilobite/.test(anatomy)?'carapace':'hunter';
  const seed=(profile.seed??planetMusicSeed)>>>0,base=bossVoiceFamilies[family];
  bossVoice={...base,family,kind,seed,pitch:base.register*(.87+(seed%29)/100),rate:12+(seed>>>9)%14};bossActionSerial=0;diveSerial=0;diveVariant=0;
 }
 function currentSectorTheme(){return planetTheme?.track===sectorTrack?planetTheme:sectorMusic[Math.max(0,sectorTrack)];}
 function currentBossTheme(){const theme=currentSectorTheme();return {...theme,chords:theme.bossChords||theme.chords};}
 function planetPhrase(bar){
  const contours=[[12,19,15,22],[19,15,12,7],[12,17,19,15],[22,19,14,12],[15,12,19,24],[7,12,15,19],[19,22,15,12],[12,7,14,19]],rhythms=[[0,2,5,7],[0,3,4,6],[1,3,5,6],[0,1,4,7],[0,2,4,6],[1,2,5,7]],contour=contours[(planetMusicSeed+bar*(1+(planetMusicSeed>>>23)%3))%contours.length],rhythm=rhythms[(Math.floor(planetMusicSeed/8)+bar)%rhythms.length];
  return rhythm.map((at,i)=>[at,contour[(i+((planetMusicSeed>>>11)%4))%4]+(i===3&&((planetMusicSeed>>>17)&1)?12:0),Math.min(i<3?rhythm[i+1]-at:8-at,((planetMusicSeed>>>19)&1)?2:3)]);
 }
 function planetArrival(){
  if(!musicEnabled||!context||context.state!=='running')return;
  const theme=currentSectorTheme(),chord=theme.chords[0],phrase=planetPhrase(0),beat=60/theme.bpm;
  duckMusic(.8,.7);
  phrase.forEach(([at,interval,length],i)=>note({frequency:hz(harmonicPitch(chord[0]+interval,chord)),duration:Math.min(.8,length*beat*.45),gain:.047,attack:.012,instrument:['ribbon','crystal','pluck'][planetMusicSeed%3],cutoff:2700,pan:(i-1.5)*.13,offset:at*beat*.45,music:true,cue:true,space:true}));
  note({frequency:hz(chord[0]-12),duration:1.8,hold:.55,gain:.065,instrument:'bass',cutoff:280,music:true,cue:true});
 }
 function sectorMelody(theme,form,bar,step){
  const bank=theme.phrases||biomeMelodies[sectorTrack],phrase=bank[(bar+form.cycle)%bank.length],event=phrase.find(n=>n[0]===step),chord=theme.chords[form.chordIndex];
  const rests=form.rest&&step===7;
  const busy=!rests&&phrase.some(n=>step>=n[0]&&step<n[0]+n[2]);
  return{pitch:!event||rests?-1:harmonicPitch(chord[0]+event[1]+(form.answer?12:0),chord,event[2]>=3),duration:event?Math.min(event[2]*.5,(8-step)*.5-.04):0,busy};
 }
 function sectorArrangement(index,energy){
  const bar=Math.floor(index/8)%128,act=Math.floor(bar/8)%8,cycle=Math.floor(bar/64),boss=energy>.82;
  const approach=bossApproach>.04,quiet=!boss&&!approach&&bar%32>=16&&bar%32<18,drive=boss||approach||act===0||act===3||act===6;
  const orders=[[0,1,2,3],[0,2,1,3],[2,1,0,3],[0,1,3,2]];
  return{act,cycle,boss,approach,quiet,drive,chordIndex:orders[(Math.floor(act/2)+cycle)%4][bar%4],rest:!boss&&!approach&&bar%8===7,answer:act===1||act===4};
 }

 // Interlocking parts share the current harmony and leave different holes in
 // each eight-bar sentence. Low-priority ornaments yield to combat audio.
 function arcadeOrchestration(index,offset,beat,chord,{quiet=false,drive=false,title=false}={}){
  const step=index%8,bar=Math.floor(index/8),act=Math.floor(bar/4)%4,root=chord[0],cadence=bar%8===7;
  const tone=(pitch,length,gain,instrument,pan,delay=0)=>note({frequency:hz(harmonicPitch(pitch,chord,length>1)),duration:Math.min(beat*length,beat*((8-step)/2)-delay-.012),hold:beat*length*.23,gain,instrument,attack:instrument==='choir'?.075:.008,cutoff:instrument==='rubber'?820:instrument==='choir'?1550:3300,cutoffEnd:instrument==='rubber'?240:1200,pan,offset:offset+delay,space:instrument!=='rubber',music:true,priority:instrument==='ribbon'?2:0});
  // A second voice answers the hook with a warm, separate register.
  if(!title&&(step===3||step===6)&&!quiet&&!cadence&&act!==2)tone(root+12+[7,3,12,7][(bar+step)%4],step===6?.85:1.1,title?.017:.012,'ribbon',-.34);
  // Fast glistening runs: controlled chord tones rather than random pitches.
  if(!quiet&&!cadence&&(act===1||act===3||drive)&&step%2===1){
   const order=act===3?[2,1,0,1]:[0,1,2,1];for(let i=0;i<2;i++)tone(chord[order[(step+i+bar)%4]]+24,.22,i?.006:.008,'crystal',i?.55:-.55,i*beat*.25);
  }
  // Syncopated octave bass plucks and a softly voiced breath behind the melody.
  if((step===3||step===7)&&!quiet&&!cadence&&bar%2===0)tone(root+(step===3?12:7),.3,title?.025:.018,'rubber',-.06);
  if(!title&&step===0&&(act===0||act===2))for(const [i,pitch] of chord.slice(1).entries())tone(pitch+12,3.55,quiet?.004:.006,'choir',i?-.58:.58);
  // Small tuned percussion fills connect phrases, without a noise wall.
  if(cadence&&(step===5||step===6)){tone(root+24+(step===5?7:0),.28,.017,'rubber',step===5?-.25:.25);if(!quiet)noise({duration:.035,gain:.009,cutoff:2800,end:1300,highpass:1000,offset:offset+beat*.25,pan:.28,music:true,priority:0});}
 }
 // Title bass is a written syncopated line, not the lead's rhythm doubled.
 // Final pickups target the next root; major/minor thirds follow the harmony.
 function titleBassPhrase(bar){
  const chord=titleChords[titleChanges[bar%32]],next=titleChords[titleChanges[(bar+1)%32]],minor=['tbm','tem'].includes(titleChanges[bar%32]),third=minor?3:4;
  const r=chord.root;
  return bar%4===3?[[0,r,.68],[1.5,r+7,.42],[3,r+12,.42],[4,r,.42],[5,r+third,.42],[6,r+7,.42],[7,next.root+12,.42]]:
   [[0,r,.68],[1.5,r+12,.42],[3,r+7,.42],[4,r,.68],[5.5,r+third,.42],[7,r+7,.42]];
 }
 function titleStep(index,offset,beat){
  const variation=titleVariation(index),bar=Math.floor(index/8)%32,step=index%8,chord=titleChords[titleChanges[bar]],bridge=bar>=16&&bar<24,climax=bar>=24;
  const phrase=variation.answer?titleDevelopment[bar%8]:titlePhrases[bar];
  signalLayer(index,offset,beat,chord.voices);
  // Schedule sixteenth pickups within their owning eighth-note tick. Notes
  // hold through the bass syncopation instead of stopping on every beat.
  for(const event of phrase.filter(n=>Math.floor(n[0])===step)){
   const [at,pitch,length]=event,duration=beat*length,position=offset+(at-step)*beat/2;
   note({frequency:hz(pitch),duration,hold:duration*.67,gain:bridge?.081:climax?.092:.086,instrument:variation.warm?'ribbon':'arcade',type:'sawtooth',guitar:!variation.warm,guitarBend:.994,cutoff:bridge?2800:4600,cutoffEnd:length>1?2600:1900,attack:.007,vibrato:length>.8?12:4,vibratoRate:5.1,pan:.07,endPan:.01,offset:position,space:true,music:true,priority:3});
   // A lower, sparse answer joins the final return, never a constant unison.
   if(climax&&length>1){const lower=chord.voices.at(-1);note({frequency:hz(lower),duration:duration*.9,hold:duration*.6,gain:.025,instrument:'reed',cutoff:2300,cutoffEnd:1300,attack:.016,pan:-.3,offset:position+.012,space:true,music:true,priority:1});}
  }
  if(step===0)for(const [i,pitch] of chord.voices.entries())note({frequency:hz(pitch)*(1+(i-1)*.0004),duration:beat*3.88,hold:beat*1.25,gain:.0048,type:'triangle',attack:beat*.3,cutoff:bridge?820:1050,pan:(i-1)*.5,endPan:(i-1)*.35,offset:offset+i*.012,music:true,priority:0});
  // Two separate offbeat chord chops establish the groove. In the bridge
  // they move to a warmer register without losing the backbeat.
  if(step===3||step===7)for(const [i,pitch] of chord.voices.slice(1).entries())note({frequency:hz(pitch+(bridge?0:12)),duration:beat*.29,hold:beat*.075,gain:climax?.022:.016,instrument:bridge?'ribbon':'brass',attack:.004,cutoff:3000,cutoffEnd:1250,pan:i?.4:-.4,offset,music:true,priority:1});
  // A small descending answer occupies the deliberate hole at the cadence.
  if(bar%8===3&&step===7)for(const [i,pitch] of [chord.voices[2]+12,chord.voices[1]+12].entries())note({frequency:hz(pitch),duration:beat*.2,hold:beat*.06,gain:.032,instrument:'harp',cutoff:3000,pan:-.27,offset:offset+i*beat*.25,space:true,music:true,priority:1});
  for(const [at,pitch,length] of titleBassPhrase(bar).filter(n=>Math.floor(n[0])===step))note({frequency:hz(pitch),duration:beat*length,hold:beat*length*.53,gain:.09,instrument:'bass',cutoff:1600,cutoffEnd:550,attack:.006,offset:offset+(at-step)*beat/2,music:true,priority:2});
  if(step===0)note({frequency:hz(chord.root-12),duration:beat*.85,hold:beat*.2,gain:.019,type:'sine',cutoff:160,attack:.01,offset,music:true,priority:2});
  arcadeDrums(index,offset,beat,{drive:climax,title:true});
 }
 function bossMusicStep(index,offset,beat){
  const theme=currentBossTheme(),figure=bossApproaches[sectorTrack],step=index%8,bar=Math.floor(index/8),chord=theme.chords[bar%4],root=chord[0],intro=bar<4,breathing=bar%16>=8&&bar%16<10,returning=bar%16>=12,voice=bossVoiceFamilies[bossVoice.family];
  // A separate minor-key overture replaces the ordinary score immediately.
  // Midrange horn harmonics remain audible on phone speakers above the bass.
  if(step===0){
   for(const [i,pitch] of chord.entries())note({frequency:hz(pitch+12),duration:beat*(intro?3.4:1.5),attack:.06,hold:beat*.8,gain:intro?.047:.032,instrument:voice.instrument,type:figure.type==='sine'?'triangle':figure.type,cutoff:1700,pan:(i-1)*.22,offset,music:true,priority:4});
   note({frequency:hz(root-12),duration:beat*3.6,hold:beat*1.1,attack:.02,gain:.1,cutoff:240,offset,music:true,priority:4});
  }
  const pitch=harmonicPitch(root+12+figure.notes[(step+(bar%2)*2)%8],chord);
  if(!breathing||step===0||step===4)note({frequency:hz(pitch),duration:beat*(breathing?1.35:.37),hold:beat*.1,gain:step%2?.035:.052,instrument:voice.instrument,type:'triangle',cutoff:2200,pan:step%2?-.15:.15,offset,music:true,priority:3});
  if((intro?figure.pulse:voice.pulse).includes(step)&&(!breathing||step===0)){
   note({frequency:110,end:38,duration:.23,hold:.04,gain:.105,cutoff:450,offset,music:true,priority:4});
   noise({duration:.14,gain:.043,cutoff:1500,end:260,body:true,offset,music:true,priority:3});
  }
  arcadeOrchestration(index,offset,beat,chord,{drive:returning,quiet:breathing||intro&&bar===0});
  if(!breathing&&(step===6||step===7))noise({duration:.075,gain:.025,cutoff:2500,end:600,offset,music:true,priority:2});
 }
 // A continuous rhythm section is the motor of the score. The world adds
 // its own percussion above this foundation without deleting the backbeat.
 function arcadeDrums(index,offset,beat,{drive=false,title=false}={}){
  const step=index%8,bar=Math.floor(index/8),fill=bar%8===7,weight=title?1:.88;
  const kick=[0,4,...(bar%2?[3]:[5]),...(drive&&bar%4===2?[7]:[])];
  if(kick.includes(step)){
   note({frequency:155,end:46,duration:.19,hold:.018,gain:.12*weight,instrument:'drum',cutoff:950,cutoffEnd:180,offset,music:true,priority:2});
   noise({duration:.018,gain:.021*weight,cutoff:4500,end:900,highpass:800,offset,music:true,priority:1});
  }
  if(step===2||step===6){
   note({frequency:195,end:118,duration:.14,hold:.012,gain:.072*weight,instrument:'drum',type:'triangle',cutoff:1900,offset,music:true,priority:2});
   noise({duration:.15,gain:.067*weight,cutoff:6700,end:2300,highpass:750,hold:.014,pan:.06,offset,music:true,priority:2});
  }
  // Eighth-note timekeeping, a lifted offbeat and occasional sixteenth pickup.
  const open=step===7&&!fill;
  noise({duration:open?.115:.036,gain:(step%2?.025:.015)*weight,cutoff:9200,end:open?4500:6200,highpass:5500,pan:step%2?.28:-.23,offset,music:true,priority:1});
  if((fill&&step>=6)||drive&&step===7)noise({duration:.027,gain:.014*weight,cutoff:8400,end:5100,highpass:4800,pan:-.3,offset:offset+beat*.25,music:true,priority:1});
  if(fill&&step===7)for(let i=0;i<2;i++)note({frequency:[180,132][i],end:[102,76][i],duration:.12,gain:.046*weight,instrument:'drum',type:'triangle',cutoff:1100,pan:i?.2:-.2,offset:offset+i*beat*.25,music:true,priority:2});
 }
 function environmentRhythm(step,offset,beat,chord,arr,form){
  const kit=soundscapes[soundscape];
  if((step===3||step===7)&&!form.quiet){
   note({frequency:kit.drum*(step===3?1.4:1),end:kit.drum*.78,duration:.1,gain:.023,instrument:kit.metal?'mallet':'rubber',cutoff:kit.metal?3000:1300,pan:step===3?-.4:.4,offset,music:true,priority:0});
   if(kit.metal)noise({duration:.032,gain:.012,cutoff:5700,end:2600,highpass:2200,offset,music:true,priority:0});
  }
 }
 function startTitleLoop(){
  if(!titleActive||!musicEnabled||!context||context.state!=='running'||musicTimer!==null)return;
  musicBus.gain.cancelScheduledValues(context.currentTime);musicBus.gain.setTargetAtTime(sectorTrack<0?1.45:1.12,context.currentTime,.12);
  const theme=sectorTrack<0?null:currentSectorTheme(),arr=theme?arrangements[sectorTrack]:arrangements[0],beat=theme?60/(theme.bpm*(bossApproach>.04?1.18:1)):themeBeat;
  musicDelay.delayTime.value=beat*.75;musicCross.delayTime.value=beat*.25;
  nextBeat=context.currentTime+.04;let arrangement=sectorArrangement(musicStep,smoothedIntensity);
  const tick=()=>{
   sweepVoices();smoothedIntensity+=(intensity-smoothedIntensity)*.075;smoothedApproach+=(bossApproach-smoothedApproach)*.085;
   if(nextBeat<context.currentTime-.2)nextBeat=context.currentTime+.04;
   while(nextBeat<context.currentTime+.15){
    if(!theme){titleStep(musicStep,Math.max(0,nextBeat-context.currentTime),beat);musicStep++;nextBeat+=beat/2;continue;}
    if(bossApproach>.04){bossMusicStep(musicStep,Math.max(0,nextBeat-context.currentTime),beat);musicStep++;nextBeat+=beat/2;continue;}
    const bar=Math.floor(musicStep/8)%128,step=musicStep%8;
    // Latch orchestration on the bar line, so combat changes never chop notes.
    if(step===0)arrangement=sectorArrangement(musicStep,smoothedIntensity);
    const form=arrangement,chord=theme.chords[form.chordIndex],offset=Math.max(0,nextBeat-context.currentTime),phrase=Math.floor(bar/4)%4,cadence=bar%8===7&&step===7,groove=offset+(step%2?beat*arr.swing:0);
    signalLayer(musicStep,groove,beat,chord);
    arcadeOrchestration(musicStep,groove,beat,chord,{quiet:form.quiet||form.rest,drive:form.drive});
    const melody=sectorMelody(theme,form,bar,step),lead=melody.pitch;
    if(lead>=0&&!cadence)note({frequency:hz(lead),duration:beat*melody.duration*.94,hold:beat*melody.duration*.38,attack:.014,gain:form.quiet?.059:form.drive?.079:.07,instrument:soundscapes[soundscape].lead,type:'triangle',cutoff:form.quiet?2600:form.drive?4100:3400,cutoffEnd:1500,vibrato:5,vibratoRate:4.4,pan:form.answer?-.15:.12,offset:groove,space:true,music:true,priority:2});
    if(form.answer&&!form.drive&&!form.rest&&(step===2||step===6)){
     const line=sectorCounterlines[sectorTrack],interval=line[(bar+(step===6?4:0))%line.length],pitch=harmonicPitch(chord[0]+interval+12,chord,true);
     note({frequency:hz(pitch),duration:beat*Math.min(1.35,(8-step)*.5-.04),hold:beat*.38,attack:.055,gain:form.quiet?.008:.012,type:sectorTrack===1||sectorTrack===4?'sawtooth':'triangle',guitar:sectorTrack===0||sectorTrack===5,guitarBend:.997,cutoff:form.quiet?1050:1550,pan:step===2?-.48:.48,endPan:step===2?.22:-.22,offset:groove,space:true,music:true,priority:1});
    }
    // Sparse satellites leave room around the lead. Sixteenths enter only in a
    // driving phrase, so combat never carries every stem at full density.
    const arpIndex=arr.arp[step];
    if(arpIndex>=0&&(!cadence||step===6)&&(!form.quiet||step===3||step===7)&&!form.rest){
     const pitch=chord[arpIndex]+12+(phrase===2?12:0),side=step%2?-.58:.58;
     note({frequency:hz(pitch),duration:beat*.48,gain:lead<0?.013:.008,instrument:soundscapes[soundscape].reply,type:'triangle',cutoff:2100,pan:side,endPan:-side*.25,offset:groove,space:true,music:true});
     if(form.drive&&smoothedIntensity>.35&&step%2===0)note({frequency:hz(chord[(arpIndex+1)%3]+24),duration:beat*.25,gain:.005,type:'sine',cutoff:1700,pan:-side,offset:groove+beat*.25,space:true,music:true,priority:0});
    }
    if(!melody.busy&&step===7&&bar%2===1&&!form.quiet&&!form.rest){const answer=chord[1]+12;note({frequency:hz(answer),duration:beat*.44,attack:.035,hold:.06,gain:.024,type:'sine',cutoff:1700,pan:-.4,endPan:.2,offset:groove,space:true,music:true,priority:2});}
    if(bar%4===3&&step===6)for(let i=0;i<2;i++)note({frequency:hz(chord[i]+24),duration:beat*.68,gain:.006,type:'sine',pan:(i-.5)*.8,offset:offset+i*beat*.25,space:true,music:true,priority:0});
    // A slow stereo string voice provides a second melodic arc over the fast arpeggio.
    if((step===1||step===5)&&phrase!==1&&!form.drive){const pitch=chord[(bar+Math.floor(step/4))%3]+12,side=step===1?-.55:.55;note({frequency:hz(pitch),duration:beat*Math.min(1.65,(8-step)*.5-.04),attack:.11,hold:beat*.45,gain:.010,type:'triangle',cutoff:1250,pan:side,endPan:-side,offset,space:true,music:true});}
    const bassInterval=[0,12,0,7,0,12,7,bar%2?-1:12][step];
    if(bassInterval>=0)note({frequency:hz(chord[0]+bassInterval),duration:beat*.54,hold:beat*.12,gain:.082,instrument:'bass',type:'triangle',cutoff:1000,cutoffEnd:320,offset:groove,music:true,priority:2});
    if(step===0&&bar%2===0)for(const [i,pitch] of chord.slice(1).entries())for(const side of [-1,1])note({frequency:hz(pitch+12)*(1+side*.0006),duration:beat*3.5,hold:beat*.7,gain:.006,instrument:soundscapes[soundscape].pad,type:arr.pad,attack:beat*.5,cutoff:1150,pan:side*.65,endPan:side*.3,offset:offset+i*.025,music:true,priority:0});
    arcadeDrums(musicStep,groove,beat,{drive:form.drive});
    environmentRhythm(step,groove,beat,chord,arr,form);
    if(form.drive&&bar%4===3&&step===7)noise({duration:.055,gain:.019,cutoff:1100,end:320,offset:offset+beat/4,music:true,priority:0});
    musicStep++;nextBeat+=beat/2;
   }
  };
  musicTimer=setInterval(tick,50);tick();
 }
 function setTitle(active){if(active){pendingBossCue=null;bossApproach=0;bossEngaged=false;}if(active&&sectorTrack!==-1){stopTitleLoop();musicStep=0;}if(active){sectorTrack=-1;intensity=0;}titleActive=active;if(active)startTitleLoop();else stopTitleLoop()}
 function setSector(sector,identity='',bossProfile={}){pendingBossCue=null;intensity=0;smoothedIntensity=0;bossApproach=0;smoothedApproach=0;bossEngaged=false;stopTitleLoop();musicStep=0;sectorTrack=Math.max(0,Math.min(sectorMusic.length-1,Math.trunc(sector)||0));planetMusicSeed=worldMusicIdentity(identity);setBossIdentity(bossProfile);const base={...sectorMusic[sectorTrack],...sceneScores[soundscape]},shift=identity?[0,2,-2,5,-5,3,-3][planetMusicSeed%7]:0;planetTheme={...base,track:sectorTrack,bossChords:sectorMusic[sectorTrack].chords.map(c=>c.map(n=>n+shift)),chords:base.chords.map(c=>c.map(n=>n+shift))};titleActive=true;startTitleLoop()}
 function setMusicActive(active){titleActive=active;if(active)startTitleLoop();else stopTitleLoop()}
 function setMusicEnabled(value){musicEnabled=value;try{localStorage.setItem('neon-vanguard-title-music',value?'on':'off')}catch{}if(value)startTitleLoop();else stopTitleLoop()}
 function intro(){
  if(!context||!enabled)return;if(context.state==='suspended'){context.resume().then(()=>{if(context.state==='running')intro()}).catch(()=>{});return}clear();
  // A reactor waking up: low fifths, steel resonances, and pneumatic impacts.
  const launchChord=sectorMusic[Math.max(0,sectorTrack)].chords[0];
  [launchChord[0]-12,launchChord[1]-12,launchChord[0]].map(hz).forEach((frequency,i)=>note({frequency,end:frequency*1.003,duration:2.4,gain:.028,type:'sawtooth',attack:.18,offset:i*.12,cutoff:650,space:true,pan:(i-1)*.3}));
  [24,27,31,34,36].map(n=>hz(harmonicPitch(launchChord[0]+n,launchChord))).forEach((frequency,i)=>{
   note({frequency,duration:.75,gain:.026,type:'triangle',offset:.25+i*.22,attack:.004,space:true,pan:Math.sin(i)*.45});
   note({frequency:frequency*2,duration:.3,gain:.005,type:'triangle',offset:.25+i*.22,cutoff:2200,space:true});
  });
  noise({duration:1.4,gain:.045,cutoff:1800,end:180,offset:.1});
  [0,.44,.88].forEach(offset=>{note({frequency:110,end:38,duration:.3,gain:.06,offset});noise({duration:.12,gain:.065,cutoff:2800,end:600,offset})});
 }
 // A voiced throat with two moving vowel resonances; irregular pressure
 // pulses and pitch breaks make the charge sound like an animal scream.
 function lungeThroat(pitch,pan,variant=0){
  if(!allocateVoice(5,false))return;
  const now=context.currentTime,duration=1.05,osc=context.createOscillator(),amp=context.createGain(),panner=context.createStereoPanner(),throat=context.createBiquadFilter(),mouth=context.createBiquadFilter(),mouthGain=context.createGain();
  osc.type='sawtooth';
  const contour=[[[0,.72],[.07,1.15],[.18,2.55],[.31,2.05],[.43,2.8],[.56,1.8],[.68,2.15],[.83,1.2],[1.05,.5]],[[0,1.3],[.07,2.4],[.18,1.2],[.31,1.7],[.43,.9],[.56,2.2],[.68,1.6],[.83,.8],[1.05,.5]],[[0,.6],[.07,.8],[.18,1.1],[.31,1.9],[.43,2.1],[.56,2.6],[.68,1.3],[.83,1.8],[1.05,.5]],[[0,1.1],[.07,1.8],[.18,.8],[.31,2.3],[.43,1],[.56,1.9],[.68,.8],[.83,1.4],[1.05,.5]]][variant];
  osc.frequency.setValueAtTime(pitch*contour[0][1],now);
  for(let i=1;i<contour.length;i++){const [at,mul]=contour[i];osc.frequency.exponentialRampToValueAtTime(pitch*mul,now+at);}
  throat.type=mouth.type='bandpass';throat.Q.value=2.8;mouth.Q.value=3.6;mouthGain.gain.value=.42;
  for(const [filter,base] of [[throat,570*[1,.8,1.15,.9][variant]],[mouth,1450*[1,1.2,.85,1.12][variant]]]){
   filter.frequency.setValueAtTime(base*.65,now);
   filter.frequency.exponentialRampToValueAtTime(base*1.45,now+.21);
   filter.frequency.exponentialRampToValueAtTime(base*.95,now+.58);
   filter.frequency.exponentialRampToValueAtTime(base*.48,now+duration);
  }
  amp.gain.setValueAtTime(0,now);
  for(const [at,level] of [[.045,.10],[.16,.19],[.25,.095],[.34,.21],[.44,.08],[.53,.18],[.65,.07],[.74,.14],[.88,.045],[1.05,0]])amp.gain.linearRampToValueAtTime(level,now+at);
  panner.pan.value=pan;osc.connect(throat);osc.connect(mouth);throat.connect(amp);mouth.connect(mouthGain);mouthGain.connect(amp);amp.connect(panner);panner.connect(worldBus);
  const voice=trackVoice(osc,amp,[osc,throat,mouth,mouthGain,amp,panner],false,5,now,duration);osc.start(now);osc.stop(voice.endAt);
 }
 // Four movement phrases per creature: fixed warning timing, varied articulation.
 // Warning and launch share a phrase; unrelated shots cannot change the sequence.
 let diveSerial=0,diveVariant=0;
 function diveEnvironment(pan,warning){
  const offset=warning?.04:0,gain=warning?.065:.10,length=warning?.55:.68;
  const h=o=>noise({priority:5,pan,offset,...o});
  if(soundscape==='ocean'){
   h({duration:length,gain:gain*1.6,cutoff:290,end:65,body:true,wet:true,pressure:true});
   h({duration:length*.75,gain,cutoff:1150,end:260,wet:true,body:true,offset:offset+.10});
  }else if(soundscape==='ice'){
   h({duration:length,gain:gain*1.25,cutoff:540,end:150,body:true,band:true,resonance:.8});
   for(const at of [.03,.19])h({duration:.09,gain:gain*.85,cutoff:4200,end:1200,highpass:750,offset:offset+at+diveVariant*.018});
  }else if(soundscape==='volcanic'||soundscape==='foundry'){
   h({duration:length,gain:gain*1.5,cutoff:780,end:160,body:true,pressure:true});
   for(const at of [.06,.25])h({duration:.13,gain,cutoff:2700,end:420,body:true,tremolo:38+diveVariant*9,offset:offset+at});
  }else if(soundscape!=='space'){
   h({duration:length,gain,cutoff:850,end:2300,body:true});
   h({duration:length*.7,gain:gain*.6,cutoff:2300,end:450,body:true,offset:offset+.14});
  }
 }
 function bossDiveSound(x){
  const v=bossVoice,pan=Math.max(-.8,Math.min(.8,(x/1440-.5)*1.5));
  diveVariant=[0,2,1,3][(diveSerial+++(v.seed%4))%4];
  const variant=diveVariant,mechanical=['turbine','ion'].includes(v.family),aquatic=['leviathan','siphon'].includes(v.family);
  const register=v.pitch*[.82,1.12,.96,1.25][variant],rhythms=[[0,.24],[0,.11,.37],[0,.34,.49],[0,.14,.28,.47]][variant];
  const n=o=>note({priority:5,pan,...o}),h=o=>noise({priority:5,pan,...o});
  diveEnvironment(pan,true);
  // Consistent low onset signals danger even when the upper gesture changes.
  h({duration:.18,gain:.095,cutoff:190,end:48,body:true,pressure:true});
  for(let i=0;i<rhythms.length;i++){
   const offset=rhythms[i],last=i===rhythms.length-1;
   h({duration:last?.26:.13,gain:mechanical?.10:.085,cutoff:(mechanical?2400:aquatic?760:1250)*(1+variant*.19),end:mechanical?680:220,offset,body:!mechanical,wet:aquatic,tremolo:v.rate*(.65+variant*.3),highpass:mechanical?360:0});
   n({frequency:register*(last?1.15:.85),end:register*(last?1.7:.6),duration:last?.3:.16,gain:.07,instrument:mechanical?'brass':v.instrument,cutoff:mechanical?1300:720,attack:.015,offset,vibrato:mechanical?0:12,vibratoRate:4+variant});
  }
 }
 // Boss attacks reserve priority above routine gunfire and wing beats.
 function bossAttack(action='fire',kind=0,x=1000){
  if(!enabled||!context||context.state!=='running'||x< -100||x>1540)return;
  if(action==='dive-warning'){bossDiveSound(x);return;}
  const v=bossVoice,pan=Math.max(-.8,Math.min(.8,(x/1440-.5)*1.5)),large=['lunge','roar'].includes(action),length=large?(action==='roar'?1.25:[.72,.94,.82,1.02][diveVariant]):.22;
  const pitch=v.pitch*(1+Math.sin(++bossActionSerial*2.399+v.seed%31)*.025),family=v.family;
  if(large)duckMusic(action==='lunge'?.78:.55,action==='lunge'?.25:length);
  if(action==='lunge')diveEnvironment(pan,false);
  const n=(o)=>note({priority:5,pan,...o}),h=(o)=>noise({priority:5,pan,...o});
  // Short projectile cues remain compact; movement gestures have distinct syntax.
  h({duration:length*.85,gain:large?.19:.055,cutoff:family==='ion'?210:160,end:45,body:true,pressure:true});
  if(family==='hunter'){
   if(large)lungeThroat(pitch,pan,action==='lunge'?diveVariant:0);
   n({frequency:pitch*.55,end:33,duration:length,gain:large?.15:.065,cutoff:260,attack:.018});
   for(let i=0;i<(large?3:1);i++)h({duration:length*.28,gain:large?.065:.09,cutoff:1900+i*270,end:400,offset:i*length*.17,highpass:240,body:true,tremolo:24+i*3});
  }else if(family==='swarm'){
   // Chitin latch clicks open, then an insect stridulation accelerates.
   for(let i=0;i<(large?4:2);i++)h({duration:.035+i*.012,gain:large?.11:.07,cutoff:1800+i*310,end:650,offset:i*(large?.09:.035),highpass:350});
   h({duration:length,gain:large?.18:.07,cutoff:650,end:190,body:true,tremolo:v.rate*1.8,band:true,resonance:.6});
   n({frequency:pitch,end:pitch*.58,duration:length*.8,gain:large?.10:.05,instrument:'reed',cutoff:700});
  }else if(family==='carapace'){
   for(let i=0;i<(large?3:1);i++){h({duration:.10,gain:.11,cutoff:1300,end:180,body:true,offset:i*.18});n({frequency:pitch*(1+i*.3),end:35,duration:.20,gain:.075,cutoff:450,offset:i*.18});}
   if(large)h({duration:length*.8,gain:.10,cutoff:850,end:170,body:true,tremolo:9,offset:.08});
  }else if(family==='leviathan'){
   // A pressure surge and two voiced resonances, not an airborne scream.
   n({frequency:pitch,end:pitch*1.25,duration:length,gain:large?.17:.065,attack:large?.065:.012,hold:length*.25,instrument:'silk',cutoff:460,vibrato:22,vibratoRate:3});
   n({frequency:pitch*3,end:pitch*1.5,duration:length*.86,gain:large?.085:.035,attack:.025,instrument:'choir',cutoff:950});
   h({duration:length*.65,gain:large?.14:.07,cutoff:1200,end:240,wet:true,body:true,offset:length*.12});
  }else if(family==='siphon'){
   h({duration:length*.7,gain:large?.21:.08,cutoff:300,end:1400,body:true,wet:true});
   for(let i=0;i<(large?3:2);i++)n({frequency:pitch*(2.4-i*.35),end:pitch*.55,duration:.12+i*.04,gain:large?.09:.045,type:'sine',cutoff:850,offset:length*(.18+i*.19)});
   if(large)h({duration:.35,gain:.16,cutoff:900,end:110,wet:true,pressure:true,body:true,offset:length*.58});
  }else if(family==='turbine'){
   n({frequency:pitch,end:pitch*2.5,duration:length*.45,gain:large?.13:.055,instrument:'brass',cutoff:1200,attack:.012});
   h({duration:length*.8,gain:large?.24:.11,cutoff:2400,end:430,body:true,offset:length*.19,tremolo:v.rate});
   for(let i=0;i<(large?3:1);i++)h({duration:.045,gain:.07,cutoff:3900,end:1100,highpass:700,offset:length*(.1+i*.15)});
  }else if(family==='ion'){
   for(let i=0;i<(large?4:2);i++)n({frequency:pitch*(2-i*.2),end:pitch*.7,duration:.095,gain:.08,instrument:'pulse',cutoff:1800,offset:i*(large?.12:.045)});
   h({duration:length*.75,gain:large?.19:.06,cutoff:1800,end:270,arcade:true,body:true,offset:.06});
  }else{
   h({duration:length,gain:large?.24:.10,cutoff:1700,end:260,body:true,tremolo:8});
   for(let i=0;i<(large?4:2);i++)h({duration:.045+i*.012,gain:.085,cutoff:3200+i*220,end:900,offset:length*(.12+i*.18),highpass:550});
   n({frequency:pitch,end:35,duration:length*.8,gain:large?.12:.045,instrument:'bass',cutoff:230});
  }
 }
 function shot(kind='pulse',x=720,enemy=false,organic=false){
  if(!enabled||!context||context.state!=='running'||x< -100||x>1540)return;
  const variation=1+((shotSerial++%7)-3)*.008;
  if(enemy&&(organic||['spore','acid','bone','sting'].includes(kind))){
   const pan=(x/1440*2-1)*.65,water=environment==='water';
   note({frequency:(water?180:310)*variation,end:water?78:125,duration:water?.19:.105,gain:.035,instrument:'reed',cutoff:1100,pan,priority:2});
   noise({duration:water?.16:.085,gain:.035,cutoff:water?780:1800,end:350,wet:true,band:true,pan,priority:2});
   return;
  }
  // Sustained automatic fire keeps a steady musical bed; only major cues duck it.
  const presets={pulse:[245,85,.045,'triangle'],spread:[210,70,.055,'sawtooth'],beam:[340,120,.22,'triangle'],helix:[240,100,.18,'triangle'],wave:[190,55,.23,'sawtooth'],missile:[120,35,.24,'sawtooth'],drone:[280,120,.045,'triangle'],spore:[220,65,.16,'triangle'],bolt:[295,95,.04,'triangle'],seeker:[150,40,.2,'sawtooth']};
  const cannon=['pulse','spread','bolt','drone'].includes(kind);
  const [frequency,end,duration,type]=presets[kind]||presets.pulse,pan=(x/1440*2-1)*.65,priority=enemy?2:3;
  note({frequency:frequency*variation,end:end*variation,duration:cannon?duration*.72:duration,type,pan,endPan:kind==='helix'?-pan:null,attack:.0015,gain:enemy?.028:.078,cutoff:kind==='missile'?650:cannon?2200:1200,cutoffEnd:cannon?1150:null,priority});
  noise({duration:kind==='missile'?.24:cannon?.016:kind==='spore'?.13:.045,gain:enemy?.018:kind==='missile'?.05:cannon?.065:.038,cutoff:kind==='spore'?900:cannon?3600:1650,end:cannon?1100:250,highpass:cannon?600:0,hold:cannon?.0015:0,pan,body:kind==='missile',wet:kind==='spore',priority});
  if(!enemy)note({frequency:125,end:58,duration:cannon?.061:.15,attack:.002,hold:cannon?.009:.025,pan,gain:.073,type:'triangle',cutoff:420,priority});
 }
 function duckMusic(depth=.76,duration=.28){
  if(!musicDucker||!musicEnabled)return;const t=context.currentTime,param=musicDucker.gain;
  // Overlapping cues extend one smooth dip; a small blast cannot undo a boss dip.
  duckDepth=Math.min(depth,t<duckUntil?duckDepth:1);duckUntil=Math.max(t+duration,duckUntil);
  if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(t);else param.cancelScheduledValues(t);
  param.setTargetAtTime(duckDepth,t,.035);param.setTargetAtTime(1,duckUntil,.38);
 }
 function setIntensity(value){intensity=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;}
 function bossThemeCue(reveal){
  if(!context||context.state!=='running'||sectorTrack<0)return false;
  bossCueCount++;lastBossCueAt=context.currentTime;bossCueKind=reveal?'arrival':'approach';
  const theme=currentBossTheme(),root=theme.chords[0][0],duration=reveal?4.6:3.6;
  // Encounter cues bypass music ducking AND the world acoustic filter. They
  // reserve priority six, so weapon fire/wing beats cannot steal the entrance.
  duckMusic(.38,Math.min(1.25,duration));duckWorld(duration);
  const hits=reveal?4:3,spacing=(reveal?.30:.37)*( .91+(bossVoice.seed%7)*.03);
  for(let i=0;i<hits;i++){
   const offset=i*spacing,weight=1-i*.09;
   note({frequency:reveal?74:68,end:reveal?33:39,duration:reveal?.58:.4,hold:.055,gain:.13*weight,cutoff:250,offset,cue:true});
   note({frequency:reveal?175:145,end:reveal?82:72,duration:.42,gain:.075*weight,type:'triangle',cutoff:1200,offset,cue:true});
   noise({duration:reveal?.34:.22,gain:.095*weight,cutoff:reveal?2600:1700,end:260,highpass:100,offset,cue:true});
  }
  if(reveal){bossAttack('roar',bossVoice.kind,1000);noise({duration:1.3,gain:.19,cutoff:300,end:65,body:true,pressure:true,offset:.03,cue:true});noise({duration:.66,gain:.09,cutoff:2300,end:400,body:true,offset:.03,cue:true});}
  if(!musicEnabled)return true;
  const shapes=[[0,7,3,1,0],[0,6,7,3,0],[0,5,8,1,0],[0,3,10,7,0],[0,1,7,6,0],[0,8,7,1,0]],shape=shapes[sectorTrack];
  for(let i=0;i<5;i++){
   const offset=.12+i*(reveal?.68:.50),pitch=harmonicPitch(root+12+shape[i],theme.chords[0]),length=i===4?1.65:.72;
   note({frequency:hz(pitch),duration:length,attack:.035,hold:length*.48,gain:reveal?.12:.095,instrument:bossVoice.instrument,cutoff:2600,cutoffEnd:1100,vibrato:9,vibratoRate:4.2,pan:.06,offset,music:true,cue:true});
   if(i===0||i===4)note({frequency:hz(root+19),duration:length,attack:.06,hold:length*.45,gain:.043,instrument:'reed',cutoff:1600,pan:-.25,offset,music:true,cue:true});
  }
  note({frequency:hz(root-12),duration,attack:.04,hold:duration*.62,gain:.14,instrument:'bass',cutoff:340,offset:.02,music:true,cue:true});
  note({frequency:hz(root),duration:duration*.94,attack:.09,hold:duration*.5,gain:.08,instrument:'brass',cutoff:1100,offset:.05,music:true,cue:true});
  return true;
 }
 function requestBossCue(reveal){if(!bossThemeCue(reveal))pendingBossCue={reveal:!!reveal||!!pendingBossCue?.reveal};}
 function flushBossCue(){if(pendingBossCue&&context?.state==='running'){const cue=pendingBossCue;pendingBossCue=null;requestBossCue(cue.reveal);}}
 function setBossApproach(value,engaged=false){
  const next=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
  const entering=next>.04&&bossApproach<=.04,leaving=next<=.04&&bossApproach>.04,arrival=engaged&&!bossEngaged;
  bossApproach=next;
  if(entering||arrival){stopTitleLoop();musicStep=0;startTitleLoop();requestBossCue(arrival);}
  bossEngaged=!!engaged;
  if(leaving){pendingBossCue=null;stopTitleLoop();musicStep=0;startTitleLoop();}
 }
 function bossEntrance(){setBossApproach(1,true);}
 function explosion(x=720,size=1,organic=false){
  if(!enabled||!context||context.state!=='running'||x< -100||x>1540)return;
  if(size<2&&context.currentTime-lastBlast<.035)return;
  // A chain kill gets one dominant impact instead of several full-scale blasts.
  if(size>=2){if(context.currentTime-lastMajorBlast<.055)return;lastMajorBlast=context.currentTime;}
  lastBlast=context.currentTime;if(size>2)duckMusic(.8,.3);
  const water=environment==='water',weight=Math.max(.35,Math.min(3.8,size)),length=.38+Math.sqrt(weight)*.53,overlap=[...voices].filter(v=>v.priority===4&&!v.music).length;
  const volume=(.35+Math.sqrt(weight)*.38)/Math.sqrt(1+overlap/6),pan=(x/1440*2-1)*.65,variation=1+Math.sin(noiseSerial*2.37)*.06;
  // Broadband onset, a separately shaped pressure body and material debris.
  // A blast is never a pitched oscillator or ringing bandpass resonance.
  noise({duration:(water?.10:.055)*length,gain:(water?.12:organic?.28:.36)*volume,cutoff:(water?1700:organic?3900:6500)*variation,end:water?420:1100,highpass:water?0:450,pan,priority:4});
  noise({duration:(water?1.32:1.12)*length,gain:(water?.76:.48)*volume,cutoff:water?190:250,end:water?45:65,pan,offset:.008,body:true,pressure:true,priority:4});
  noise({duration:.48*length,gain:(water?.25:.36)*volume,cutoff:water?730:1500,end:water?130:290,pan,offset:.018,body:true,priority:4});
  if(organic){
   for(let i=0;i<(weight>2?4:3);i++)noise({duration:(.30+i*.06)*length,gain:.46*volume/(1+i*.3),cutoff:(water?900:1600)+i*170,end:water?170:330,offset:(.025+i*.095)*length,pan:pan+(i%2?.10:-.10),body:true,wet:true,priority:4});
  }else{
   for(let i=0;i<(weight>2?4:2);i++)noise({duration:(.11+i*.035)*length,gain:.07*volume/(1+i*.3),cutoff:water?950:3500+i*450,end:water?180:650,highpass:water?0:450,offset:(.075+i*.13)*length,pan:pan+(i%2?.16:-.16),priority:4});
  }
  if(water)for(let i=0;i<2;i++)noise({duration:(.18+i*.11)*length,gain:.10*volume,cutoff:650+i*180,end:140,offset:(.25+i*.22)*length,pan:pan+(i?-.12:.12),body:true,wet:true,priority:4});
 }
 // Original energy-cannon synthesis: electrical wind-up, rapid discharge and bass sustain.
 function alienCry(x,size=1,voice=1){if(!enabled||!context||context.state!=='running')return;const now=context.currentTime;if(now-(lastCries.get(voice)??-10)<.09)return;lastCries.set(voice,now);const boss=voice>=64,id=Math.abs(voice),pan=(x/1440-.5)*1.1,base=(boss?64:115)+(id%11)*(boss?5:12),duration=Math.min(1.45,.32+size*.16+(id%3)*.065),gain=Math.min(.15,.055+size*.024),pulses=2+id%3;
 note({priority:boss?5:4,frequency:base*(1.5+(id%4)*.22),end:base*.55,duration,gain,pan,type:id%2?'sawtooth':'triangle',cutoff:700+(id%5)*170,guitar:true,attack:.025,hold:duration*.2});
 note({priority:boss?5:4,frequency:base*.49,end:base*.31,duration:duration*.9,gain:gain*.85,pan,type:'sine',cutoff:260,attack:.035});
 for(let i=0;i<pulses;i++)noise({priority:boss?5:4,duration:duration*.42,gain:gain*.7,cutoff:1000+(id%7)*210,end:260+(id%4)*90,offset:i*duration*.18,pan,band:true,resonance:1.1+id%3*.25,wet:true,body:true});
 }
 function roar(x=1000){bossAttack('roar',bossVoice.kind,x);}
 function breath(kind,duration=2.4){if(!enabled)return;const inhale=kind==='inhale',fire=kind==='fire',water=kind==='water',wind=kind==='wind';duckMusic(.78,Math.min(.45,duration));noise({priority:5,duration,gain:inhale?.08:wind?.25:.22,cutoff:inhale?260:fire?1700:water?2600:1250,end:inhale?1000:fire?480:water?1100:260,body:true,wet:water||wind,tremolo:wind?24:0});if(!inhale){bossAttack('special',bossVoice.kind,720);noise({priority:5,duration,gain:fire?.3:wind?.24:.16,cutoff:fire?220:wind?170:380,end:wind?48:80,body:true,tremolo:wind?12:0});if(fire)for(let i=0;i<6;i++)noise({priority:5,duration:.13,gain:.06,cutoff:2400,end:450,offset:i*duration/6});if(wind)for(let i=0;i<4;i++)noise({priority:5,duration:.2,gain:.045,cutoff:1900,end:520,offset:i*duration/4,pan:i%2?-.18:.18,body:true});}}
 function laserCharge(){note({priority:5,frequency:85,end:420,duration:1.25,attack:.22,hold:.7,gain:.075,type:'sawtooth',cutoff:1100,guitar:true});note({priority:5,frequency:43,end:78,duration:1.25,attack:.18,hold:.75,gain:.13,type:'sine',cutoff:220});noise({priority:5,duration:1.25,gain:.09,cutoff:160,end:1100,body:true})}
 function thrusterBurst(duration=.76){if(enabled)duckMusic(.76,Math.min(.35,duration));const register=bossVoice.pitch/84;noise({priority:5,duration,gain:.25,cutoff:1100+bossVoice.seed%500,end:420,body:true,tremolo:bossVoice.rate});noise({priority:5,duration,gain:.22,cutoff:170,end:55,body:true});note({priority:5,frequency:68*register,end:38*register,duration,attack:.015,gain:.16,type:'sine',cutoff:150});}
 function laserBeam(duration=1.6){if(enabled)duckMusic(.74,Math.min(.45,duration));note({priority:5,frequency:620,end:95,duration:.32,attack:.004,gain:.14,type:'sawtooth',cutoff:2300,guitar:true,space:true});noise({priority:5,duration:.18,gain:.22,cutoff:2600,end:600});noise({priority:5,duration,gain:.23,cutoff:1300,end:650,body:true});noise({priority:5,duration,gain:.23,cutoff:190,end:75,body:true});note({priority:5,frequency:60,end:42,duration,attack:.015,hold:duration*.7,gain:.19,type:'sine',cutoff:180})}


 // Brief non-tonal contacts: armor is dry, tissue soft, an opening weightier.
 // Shared rate limiting prevents continuous fire from covering the score.
 let lastImpactAt=-1,lastWeakImpactAt=-1;
 function impact(x=720,kind='metal'){
  if(!enabled||!context||context.state!=='running')return;
  const weak=kind==='weak',now=context.currentTime;
  if(weak){if(now-lastWeakImpactAt<.075)return;lastWeakImpactAt=now;}else{if(now-lastImpactAt<.11||now-lastWeakImpactAt<.06)return;lastImpactAt=now;}
  const organic=kind==='organic',armor=kind==='armor',pan=(x/1440-.5)*1.2;
  noise({duration:weak?.15:organic?.10:.065,gain:weak?.052:armor?.013:.022,cutoff:weak?1800:organic?1200:3600,end:weak?240:organic?320:1800,highpass:armor?1100:0,body:!armor,pan,priority:weak?4:1});
  if(weak)noise({duration:.13,gain:.032,cutoff:240,end:85,body:true,pressure:true,pan,priority:4});
 }
 function shipHit(x=720,shield=false){
  if(!enabled||!context||context.state!=='running')return;
  const pan=(x/1440*2-1)*.45;
  if(shield){
   if(context.currentTime-lastShieldHit<.06)return;lastShieldHit=context.currentTime;
   noise({priority:5,duration:.16,gain:.075,cutoff:1500,end:350,pan,body:true});
   note({priority:5,frequency:320,end:150,duration:.13,hold:.025,gain:.035,type:'triangle',cutoff:1100,pan});
   return;
  }
  // A physical hull strike with a low pressure thud and short electrical debris.
  noise({priority:5,duration:.075,gain:.15,cutoff:2700,end:650,pan,body:true});
  noise({priority:5,duration:.36,gain:.34,cutoff:340,end:85,pan,body:true});
  noise({priority:5,duration:.18,gain:.065,cutoff:950,end:220,pan,offset:.025,body:true});
  for(let i=0;i<3;i++)noise({priority:5,duration:.024+i*.007,gain:.05-i*.01,cutoff:1900-i*300,end:500,pan,offset:.075+i*.045});
 }
 function setSignalProgress(value){signalProgress=Math.max(0,Math.min(1,Number(value)||0));}
 function signalRecovered(progress=0,systemComplete=false){
  if(!enabled||!context||context.state!=='running')return;
  const chord=sectorTrack<0?[52,55,59]:currentSectorTheme().chords[0];duckMusic(.72,.65);
  const count=systemComplete?4:2+Math.floor(Math.max(0,Math.min(1,progress))*2);
  for(let i=0;i<count;i++)note({frequency:hz(chord[i%3]+12+(i===3?12:0)),duration:.65,hold:.14,attack:.015,gain:.075,instrument:'glass',cutoff:2800,pan:(i-1.5)*.13,offset:.65+i*.16,cue:true,space:true,priority:5});
  note({frequency:hz(chord[0]-12),duration:1.1,attack:.03,gain:.06,instrument:'bass',cutoff:250,offset:.65,cue:true,priority:5});
 }
 function signalLayer(index,offset,beat,chord){
  if(signalProgress<=0||Math.floor(index/8)%8!==6)return;
  const step=index%8,count=1+Math.floor(signalProgress*3),voice=step/2;
  if(step%2||voice>=count)return;
  note({frequency:hz(chord[voice%chord.length]+12),duration:beat*.75,attack:.06,gain:.013,instrument:'glass',pan:(voice-1.5)*.18,offset,music:true,space:true,priority:1});
 }
 function pickup(x=720,kind='power'){
  if(!enabled||!context||context.state!=='running')return;
  const pan=(x/1440*2-1)*.3,shield=['shield','frontShield','orb'].includes(kind),repair=['repair','rescue'].includes(kind),special=['orb','companion','nova'].includes(kind);
  const root=shield?50:repair?53:special?48:52,settle=shield?.16:repair?.12:.09;
  // Physical acquisition: a short low impact and broad pressure transient.
  // Midrange harmonics carry the weight on small speakers as well as headphones.
  note({priority:5,cue:true,frequency:shield?156:188,end:shield?72:94,duration:.20,gain:.15,instrument:'bass',attack:.004,hold:.025,cutoff:850,cutoffEnd:340,pan});
  noise({priority:5,cue:true,duration:.16,gain:.13,cutoff:650,end:180,pressure:true,body:true,pan});
  // Shield energy swells into place; weapons have a tighter mechanical engagement.
  noise({priority:5,cue:true,duration:shield?.40:.24,gain:shield?.07:.045,cutoff:shield?420:1800,end:shield?1300:550,band:true,resonance:.65,body:true,pan,offset:.025});
  note({priority:5,cue:true,frequency:hz(root),end:hz(root+12),duration:shield?.38:.24,gain:.045,instrument:'silk',attack:.045,hold:.055,cutoff:1050,cutoffEnd:1350,pan,offset:.025});
  // A warm major chord provides a positive finish without a high-octave run.
  for(const [i,interval]of [12,16,19].entries())note({priority:5,cue:true,frequency:hz(root+interval),duration:special?.57:.45,hold:.10,gain:i===0?.071:.038,instrument:repair?'choir':'silk',attack:.018,cutoff:1900,cutoffEnd:950,pan:pan+(i-1)*.09,offset:settle+i*.025});
  // One quiet air accent, filtered below the piercing chime range.
  noise({priority:5,cue:true,duration:.11,gain:.018,cutoff:2400,end:1000,highpass:750,pan,offset:settle});
 }
 function swim(e){
  if(!context||!enabled||e.x<0||e.x>1440||e.y<0||e.y>760||context.currentTime-lastSwim<.1)return;
  lastSwim=context.currentTime;const frequency=e.brood?95:e.type===1?180:125;
  if(environment==='water'){const pan=(e.x/1440*2-1)*.7;noise({priority:0,duration:.28,gain:e.brood?.045:.023,cutoff:470,end:110,body:true,pressure:true,pan});noise({priority:0,duration:.17,gain:.016,cutoff:950,end:240,wet:true,pan});return;}
  note({priority:0,frequency,end:frequency*.45,duration:.22,gain:e.brood?.026:.013,type:'sine',cutoff:700,attack:.025,pan:(e.x/1440*2-1)*.7});
  note({priority:0,frequency:frequency*2.1,end:frequency*.8,duration:.13,gain:.005,type:'triangle',cutoff:650,attack:.015,pan:(e.x/1440*2-1)*.7});
 }
 function wingbeat(x=720,strength=.5,kind=0){
  if(!enabled||!context||context.state!=='running'||x< -80||x>1520)return;
  const force=Math.max(0,Math.min(1,strength)),heavy=kind===5,pan=(x/1440*2-1)*.65;
  if(environment==='water'){
   // Fins displace water in a broad pressure stroke, with turbulent bubbles;
   // the airborne insect-rotor chatter has no place below the surface.
   noise({duration:.52,gain:.23+force*.07,cutoff:280,end:65,pressure:true,body:true,pan,priority:2});
   noise({duration:.36,gain:.11+force*.035,cutoff:850,end:230,wet:true,body:true,pan,priority:2});
   noise({duration:.16,gain:.038,cutoff:1400,end:420,offset:.09,wet:true,pan,priority:2});return;
  }
  // An original insect rotor texture: heavy chopped air, leathery blade
  // chatter and a restrained membrane rasp, all triggered by the actual flap.
  // Each anatomy has a distinct low register: chitin chop, fluid surge,
  // hollow membrane, or the Mother’s slower pressure rumble.
  const profile=kind===0?{rate:21,body:145,end:40,chatter:470,length:.54}:kind===2?{rate:20,body:190,end:55,chatter:440,length:.50}:kind===3?{rate:17,body:145,end:42,chatter:350,length:.54}:heavy?{rate:14,body:118,end:34,chatter:275,length:.59}:{rate:18,body:165,end:46,chatter:520,length:.52};
  const rotor=profile.rate+force*2;
  noise({duration:profile.length,hold:.11,gain:(heavy?.29:.265)+force*.035,cutoff:profile.body,end:profile.end,highpass:28,body:true,tremolo:rotor,pan,priority:2});
  noise({duration:profile.length*.85,hold:.065,gain:.10+force*.02,cutoff:profile.chatter,end:150,band:true,resonance:.5,highpass:95,body:true,tremolo:rotor*1.9,pan,priority:2});
  noise({duration:.30,gain:.028,cutoff:heavy?750:1050,end:420,band:true,resonance:.5,highpass:320,body:true,tremolo:rotor*3.1,pan,priority:2});
 }
 return{init,setSignalProgress,signalRecovered,setEnabled,clear,setEnvironment,bossEntrance,planetArrival,intro,shot,bossAttack,swim,wingbeat,note,explosion,pickup,shipHit,impact,alienCry,roar,breath,laserCharge,laserBeam,thrusterBurst,setTitle,setSector,setIntensity,setBossApproach,setMusicActive,setMusicEnabled,setBossIdentity,stats:()=>{sweepVoices();const all=[...voices,...releasing];return{mixVersion:13,musicBpm:sectorTrack<0?148:currentSectorTheme().bpm,soundscape,bossVoice:bossVoice.family,bossVoiceSeed:bossVoice.seed,planetMusicSeed,environment,bossCueCount,bossCueKind,lastBossCueAt,pendingBossCue:!!pendingBossCue,enabled,musicEnabled,sectorTrack,musicStep,bossApproach,musicPlaying:musicTimer!==null,state:context?.state||'locked',voices:all.length,activeVoices:voices.size,releasingVoices:releasing.size,musicVoices:all.filter(v=>v.music).length,effectsVoices:all.filter(v=>!v.music).length,voiceLimit,musicLimit,byPriority:Array.from({length:7},(_,priority)=>all.filter(v=>v.priority===priority).length),...voiceCounters}}};
})();
