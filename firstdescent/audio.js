'use strict';
// Local Web Audio synthesis works in browsers and native web-view wrappers.
window.flightAudio=(()=>{
 let context,master,compressor,enabled=true,lastSwim=-1,lastBlast=-1,lastShieldHit=-1,noiseBuffer,arcadeNoise,guitarCurve,noiseSerial=0;
 let worldBus,worldFilter,worldDucker,room,roomSend,roomReturn,cueMusicBus,pressureNoise;
 let environment='air',pendingBossCue=null,bossCueCount=0,lastBossCueAt=-10,bossCueKind='none',worldDuckUntil=0;
 const instrumentWaves={},roomBuffers=new Map();
 const acoustics={
  air:{cutoff:14000,room:.18,wet:.045,damping:.025,spread:.75},
  water:{cutoff:2100,room:.38,wet:.13,damping:.008,spread:.36},
  hangar:{cutoff:10500,room:.74,wet:.10,damping:.02,spread:.65},
  cavern:{cutoff:7200,room:1.15,wet:.15,damping:.012,spread:.55}
 };
 const voices=new Set(),releasing=new Set(),lastCries=new Map();
 // Reserve headroom for readable combat cues; at most 60 voices + four 8ms release tails.
 const voiceLimit=64,activeLimit=60,musicLimit=24,voiceCounters={started:0,stolen:0,dropped:0,peak:0};
 const themeBeat=60/112; // 112 BPM; all sequencer and echo divisions share this clock.
 let musicEnabled=true,titleActive=false,musicTimer=null,musicBus,musicDelay,musicEcho,musicCross,nextBeat=0,musicStep=0,sectorTrack=-1,musicDucker,intensity=0,smoothedIntensity=0,bossApproach=0,smoothedApproach=0,bossEngaged=false,duckUntil=0,duckDepth=1;
 try{musicEnabled=localStorage.getItem('neon-vanguard-title-music')!=='off'}catch{}

 function init(){
  // Explicit game playback uses the media output session on supported iOS versions.
  try{if(window.navigator?.audioSession)window.navigator.audioSession.type='playback';}catch{}
  if(!context){
   const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;
   context=new Audio();master=context.createGain();master.gain.value=enabled?.8:0;
   compressor=context.createDynamicsCompressor();compressor.threshold.value=-10;compressor.knee.value=12;compressor.ratio.value=3;if(compressor.attack)compressor.attack.value=.006;if(compressor.release)compressor.release.value=.20;
   // Add warmth before the limiter; trim the brittle upper register.
   const bass=context.createBiquadFilter(),air=context.createBiquadFilter();
   bass.type='lowshelf';bass.frequency.value=130;bass.gain.value=2.5;
   air.type='highshelf';air.frequency.value=4200;air.gain.value=-1;
   const subsonic=context.createBiquadFilter();subsonic.type='highpass';subsonic.frequency.value=25;subsonic.Q.value=.5;
   master.connect(bass);bass.connect(air);air.connect(subsonic);subsonic.connect(compressor);compressor.connect(context.destination);
   worldBus=context.createGain();worldBus.gain.value=1;worldFilter=context.createBiquadFilter();worldFilter.type='lowpass';worldFilter.Q.value=.5;
   worldDucker=context.createGain();worldDucker.gain.value=1;worldBus.connect(worldFilter);worldFilter.connect(worldDucker);worldDucker.connect(master);
   cueMusicBus=context.createGain();cueMusicBus.gain.value=.62;cueMusicBus.connect(bass);
   if(context.createConvolver){room=context.createConvolver();roomSend=context.createGain();roomReturn=context.createGain();roomReturn.gain.value=.24;worldFilter.connect(roomSend);roomSend.connect(room);room.connect(roomReturn);roomReturn.connect(worldDucker);}
   musicBus=context.createGain();musicBus.gain.value=1.45;musicDucker=context.createGain();musicDucker.gain.value=1;
   const musicBody=context.createBiquadFilter();musicBody.type='peaking';musicBody.frequency.value=250;musicBody.Q.value=.8;musicBody.gain.value=-2;
   musicBus.connect(musicBody);musicBody.connect(musicDucker);musicDucker.connect(bass);
   musicDelay=context.createDelay(1);musicDelay.delayTime.value=themeBeat*.75;musicEcho=context.createGain();musicEcho.gain.value=.23;
   const echoLow=context.createBiquadFilter(),echoHigh=context.createBiquadFilter();echoLow.type='lowpass';echoLow.frequency.value=1900;echoHigh.type='highpass';echoHigh.frequency.value=280;
   musicDelay.connect(echoLow);echoLow.connect(echoHigh);echoHigh.connect(musicEcho);musicEcho.connect(musicDelay);
   const left=context.createStereoPanner(),right=context.createStereoPanner(),cross=context.createDelay(1),crossGain=context.createGain();
   left.pan.value=-.6;right.pan.value=.6;cross.delayTime.value=themeBeat*.25;crossGain.gain.value=.22;musicCross=cross;
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
   if(context.createPeriodicWave)for(const [name,harmonics] of Object.entries({glass:[1,.08,.24,.015,.09,.01],reed:[1,.32,.18,.07,.045,.02],pulse:[1,0,.24,0,.10,0,.04],bass:[1,.3,.12,.035],silk:[1,.09,.03,.008],brass:[1,.52,.25,.12,.065,.025],pluck:[1,.38,.19,.085,.035,.012]})){
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
 function setEnvironment(medium='air',theme='verdant'){const next=medium==='water'?'water':theme==='forge'?'hangar':['core','storm'].includes(theme)?'cavern':'air';if(next===environment)return;environment=next;applyEnvironment();}
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
  const victim=candidates.filter(v=>v.priority<priority||(crowdedMusic&&v.priority===priority))
   .sort((a,b)=>a.priority-b.priority||a.endAt-b.endAt)[0];
  if(!victim){voiceCounters.dropped++;return false;}
  releaseVoice(victim);voiceCounters.stolen++;return true;
 }
 function trackVoice(osc,amp,nodes,music,priority,now,duration){
  const voice={osc,amp,music,priority,endAt:now+duration+.012,disposed:false,dispose(){if(this.disposed)return;this.disposed=true;for(const node of nodes)node?.disconnect();voices.delete(voice);releasing.delete(voice)}};
  voices.add(voice);voiceCounters.started++;voiceCounters.peak=Math.max(voiceCounters.peak,voices.size+releasing.size);osc.onended=()=>voice.dispose();return voice;
 }
 function clear(){if(worldDucker){worldDuckUntil=0;worldDucker.gain.cancelScheduledValues(context.currentTime);worldDucker.gain.setTargetAtTime(1,context.currentTime,.08);}lastCries.clear();for(const v of [...voices,...releasing])if(!v.music)stopVoice(v);lastSwim=-1;lastBlast=-1;lastShieldHit=-1;duckUntil=0;duckDepth=1;if(musicDucker){musicDucker.gain.cancelScheduledValues(context.currentTime);musicDucker.gain.setTargetAtTime(1,context.currentTime,.12)}}
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
  const voice=trackVoice(osc,amp,[osc,drive,filter,amp,panner,send],music,priority,now,duration);osc.start(now);osc.stop(voice.endAt);
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
  {bpm:120,root:0,type:'sawtooth',chords:[[38,45,50],[38,45,53],[34,41,46],[37,44,49]],motif:[62,-1,62,65,62,-1,69,65]},
  {bpm:96,root:0,type:'sine',chords:[[36,43,51],[35,42,50],[32,39,47],[31,38,46]],motif:[72,-1,67,71,-1,63,67,-1]},
  {bpm:112,root:0,type:'sine',chords:[[38,45,53],[41,48,57],[36,43,52],[40,47,55]],motif:[74,69,72,-1,77,72,69,-1]},
  {bpm:126,root:0,type:'sawtooth',chords:[[35,42,50],[38,45,53],[33,40,48],[37,44,52]],motif:[71,71,-1,74,69,71,78,-1]},
  {bpm:116,root:0,type:'triangle',chords:[[33,40,48],[32,39,47],[36,43,51],[31,38,46]],motif:[69,-1,70,64,69,76,-1,63]}
 ];
 // Each sector has its own rhythmic silhouette, register and breathing room.
 const arrangements=[
  {arp:[0,-1,1,2,-1,1,2,-1],bass:[0,-1,0,-1,0,12,-1,7],kick:[0,4],snare:[2,6],hat:[1,3,5,7],swing:0,answer:[71,74,69,67],pad:'triangle'},
  {arp:[0,1,-1,0,2,-1,1,0],bass:[0,-1,0,7,-1,0,12,-1],kick:[0,3,4],snare:[2,6],hat:[1,3,4,7],swing:.035,answer:[65,69,62,60],pad:'sine'},
  {arp:[2,-1,-1,1,-1,0,-1,1],bass:[0,-1,-1,7,0,-1,-1,-1],kick:[0,5],snare:[4],hat:[3,7],swing:.065,answer:[75,71,67,63],pad:'sine'},
  {arp:[0,2,1,-1,2,1,-1,0],bass:[0,-1,7,-1,0,-1,12,7],kick:[0,4],snare:[2,6],hat:[0,3,5,7],swing:.018,answer:[77,74,72,69],pad:'triangle'},
  {arp:[0,0,2,-1,1,0,-1,2],bass:[0,0,-1,7,0,-1,12,-1],kick:[0,3,4,7],snare:[2,6],hat:[1,3,5,7],swing:0,answer:[74,78,71,69],pad:'triangle'},
  {arp:[0,-1,2,1,-1,0,2,-1],bass:[0,-1,7,0,-1,12,0,-1],kick:[0,3,6],snare:[4],hat:[1,2,5,7],swing:.025,answer:[76,70,69,63],pad:'sine'}
 ];
 const hz=midi=>440*Math.pow(2,(midi-69)/12);
 function stopTitleLoop(){
  if(musicTimer!==null)clearInterval(musicTimer);musicTimer=null;
  if(musicBus){musicBus.gain.cancelScheduledValues(context.currentTime);musicBus.gain.setTargetAtTime(0,context.currentTime,.025);}
  for(const v of [...voices])if(v.music)releaseVoice(v);
 }
 // Original E-minor song form: eight-bar theme, developed answer, contrasting
 // bridge, then the theme's full return. Events are [eighth-note step, MIDI,
 // held quarter-note beats]. Rests and releases belong to the phrase itself.
 const titleChords={
  em:{root:40,voices:[55,59,66]},emd:{root:38,voices:[55,59,64]},
  c:{root:36,voices:[55,59,64]},b:{root:35,voices:[54,57,63]},
  am:{root:33,voices:[55,60,64]},emg:{root:43,voices:[55,59,64]},
  d:{root:38,voices:[54,57,64]},g:{root:43,voices:[55,59,62]},
  fs:{root:42,voices:[57,60,64]}
 };
 const titleChanges=[
  'em','emd','c','b','am','emg','c','b',
  'em','emd','c','b','am','emg','c','b',
  'am','d','g','c','am','emg','fs','b',
  'em','emd','c','b','am','emg','c','b'
 ];
 const titleTheme=[
  [[0,64,.5],[1,67,.5],[2,71,1.5],[5,69,.5],[6,67,.9]],
  [[0,66,.5],[1,67,.5],[2,64,2],[7,59,.4]],
  [[0,67,1.5],[3,64,.5],[4,62,1],[6,64,.75]],
  [[0,66,1],[2,63,1],[4,59,1.5]],
  [[0,64,1.5],[3,67,.5],[4,69,1],[6,67,.5],[7,64,.45]],
  [[0,71,1.5],[3,67,.5],[4,66,1],[6,64,.75]],
  [[0,64,1],[2,67,1],[4,71,1.5],[7,69,.4]],
  [[0,66,1],[2,63,1],[4,59,1],[7,59,.4]]
 ];
 const titleDevelopment=[
  titleTheme[0],titleTheme[1],
  [[0,67,1.5],[3,71,.5],[4,72,1],[6,71,.75]],
  [[0,69,1],[2,66,1],[4,63,1.5]],
  [[0,69,1.5],[3,67,.5],[4,64,1],[6,67,.75]],
  [[0,71,2],[4,69,.5],[5,67,.5],[6,64,.75]],
  [[0,67,1],[2,64,1],[4,62,1.5]],
  [[0,63,1],[2,66,1],[4,71,1.5]]
 ];
 const titleBridge=[
  [[0,64,2],[4,67,1],[6,69,.75]],
  [[0,66,1.5],[3,69,.5],[4,74,1.5]],
  [[0,71,2],[4,69,1],[6,67,.75]],
  [[0,64,1.5],[3,62,.5],[4,64,1.5]],
  [[0,69,1],[2,67,1],[4,64,1.5]],
  [[0,67,1],[2,71,1],[4,76,1.5]],
  [[0,72,1.5],[3,69,.5],[4,66,1.5]],
  [[0,63,1],[2,66,1],[4,71,1],[7,59,.4]]
 ];
 const titleReturn=[
  titleTheme[0],titleTheme[1],titleDevelopment[2],titleTheme[3],
  titleTheme[0],titleTheme[1],
  [[0,67,1],[2,64,1],[4,62,1],[6,64,.75]],
  [[0,66,1],[2,63,1],[4,59,1.5]]
 ];
 const titlePhrases=[...titleTheme,...titleDevelopment,...titleBridge,...titleReturn];
 const descentHook=[[[0,0,.5],[1,3,.5],[2,7,1.5],[5,5,.5],[6,3,.9]],[[0,2,.5],[1,3,.5],[2,0,2],[7,-5,.4]]];
 // Subsequent passes re-orchestrate the song instead of restarting the same
 // recording: a spacious response, then a warmer, rhythm-led variation.
 function titleVariation(index){const pass=Math.floor(index/256)%4,bar=Math.floor(index/8)%32;return{pass,ambient:pass===1&&bar<8,answer:pass>0&&bar%4>=2,warm:pass===2,counter:pass===3};}
 // Eight melodic sentences with held notes and genuine rests. Chord tones
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
 const scoreTimbres=['pluck','pulse','glass','reed','pulse','brass'];
 function sectorMelody(theme,form,bar,step){
  const bank=biomeMelodies[sectorTrack],phrase=bank[(bar+form.cycle)%bank.length],event=phrase.find(n=>n[0]===step),chord=theme.chords[form.chordIndex];
  const rests=form.rest||(!form.drive&&bar%8===3)||form.quiet&&step!==0&&step!==4;
  const busy=!rests&&phrase.some(n=>step>=n[0]&&step<n[0]+n[2]);
  return{pitch:!event||rests?-1:chord[0]+event[1]+(form.answer?12:0),duration:event?event[2]*.5:0,busy};
 }
 function sectorArrangement(index,energy){
  const bar=Math.floor(index/8)%128,act=Math.floor(bar/8)%8,cycle=Math.floor(bar/64),boss=energy>.82;
  const approach=bossApproach>.04,quiet=!boss&&!approach&&(act===2||act===5||act===7),drive=boss||approach||act===3||act===6;
  const orders=[[0,1,2,3],[0,2,1,3],[2,1,0,3],[0,1,3,2]];
  return{act,cycle,boss,approach,quiet,drive,chordIndex:orders[(Math.floor(act/2)+cycle)%4][bar%4],rest:!boss&&!approach&&(bar%8===7||act===4&&bar%2===1),answer:act===1||act===4||cycle===1};
 }

 const titleBass=[
  [0,-1,-1,7,0,-1,-1,-1],[0,-1,7,-1,0,-1,12,-1],
  [0,-1,-1,7,0,-1,12,-1],[0,-1,7,-1,0,-1,-1,-1],
  [0,-1,-1,-1,7,-1,-1,-1],[0,-1,7,-1,0,-1,12,-1],
  [0,-1,7,-1,0,-1,12,-1],[0,-1,-1,7,0,-1,-1,-1]
 ];
 function titleStep(index,offset,beat){
  const variation=titleVariation(index),bar=Math.floor(index/8)%32,step=index%8,section=Math.floor(bar/4),chord=titleChords[titleChanges[bar]],phrase=variation.answer?[[0,chord.voices[1]+12,2],[4,chord.voices[2]+12,1.5]]:titlePhrases[bar],event=phrase.find(n=>n[0]===step),suspended=section===4||variation.ambient,climax=section===6&&!variation.ambient,quiet=section===0||suspended,groove=offset+(step%2?beat*.012:0),phraseEnd=bar%8===7;
  const leadBusy=phrase.some(n=>step>=n[0]&&step<n[0]+n[2]*2),leadGain=quiet?.034:climax?.041:.038;
  if(event){
   const pitch=event[1],duration=beat*event[2]*.94;
   // A gently driven string with a stable pitch centre; deliberate long notes
   // carry the tune, rather than a pitch scoop on every sequencer tick.
   note({frequency:hz(pitch),duration,hold:duration*.42,gain:leadGain*(step===0?1:.94),instrument:variation.ambient?'glass':variation.warm?'reed':'pluck',type:variation.ambient?'sine':variation.warm?'triangle':'sawtooth',guitar:!variation.ambient&&!variation.warm,guitarBend:.994,cutoff:quiet?2200:3100,cutoffEnd:1100,attack:.009,vibrato:6,vibratoRate:4.8,pan:.08,endPan:.015,offset:groove,space:true,music:true,priority:2});
   if(event[2]>=1.5&&!variation.ambient)note({frequency:hz(pitch-12),duration:duration*.9,hold:duration*.38,gain:.010,type:'triangle',cutoff:700,attack:.018,pan:-.12,offset:groove+.01,music:true});
   if(climax&&step===0){const harmony=chord.voices.filter(n=>n<pitch).at(-1);note({frequency:hz(harmony),duration:duration*.93,hold:duration*.3,gain:.011,type:'triangle',cutoff:1050,attack:.03,pan:-.32,offset:groove+.015,space:true,music:true});}
  }
  // One closely voiced chord per bar: common tones stay in place and the
  // other voices move by a tone/semitone. No old pad crosses a new harmony.
  if(step===0)for(const [i,pitch] of chord.voices.entries())note({frequency:hz(pitch)*(1+(i-1)*.0015),duration:beat*3.88,hold:beat*1.25,gain:suspended?.007:.0058,type:'triangle',attack:beat*.3,cutoff:quiet?820:1050,pan:(i-1)*.5,endPan:(i-1)*.35,offset:offset+i*.012,music:true,priority:0});
  const arp=suspended?(step===3?0:step===7?2:-1):step%2===1?Math.floor(step/2)%3:-1;
  if(arp>=0&&!(phraseEnd&&step>5)){const side=step%4===1?-.55:.55;note({frequency:hz(chord.voices[arp]+12),duration:beat*.42,attack:.008,gain:leadBusy?.0045:.0085,type:'triangle',cutoff:1300,pan:side,endPan:-side*.25,offset:groove,space:true,music:true,priority:0});}
  // The answer appears only in an actual rest, never over a held lead note.
  if(!leadBusy&&step%2===1&&(bar%4===1||phraseEnd))note({frequency:hz(chord.voices[phraseEnd?2:1]+12),duration:beat*.7,attack:.035,hold:beat*.1,gain:.014,type:'sine',cutoff:1200,pan:-.4,endPan:.15,offset:groove,space:true,music:true});
  if(variation.counter&&!leadBusy&&(step===1||step===5)){const pitch=chord.voices[step===1?0:2]+12+(bar%2?2:0);note({frequency:hz(pitch),end:hz(pitch+(step===1?3:-2)),duration:beat*1.25,attack:.05,hold:beat*.3,gain:.012,type:'triangle',guitar:true,guitarBend:.997,cutoff:1500,pan:step===1?-.5:.5,endPan:step===1?.2:-.2,offset:groove,space:true,music:true,priority:1});}
  const bass=titleBass[section][step],approach=step===7&&[1,5,6].includes(section)&&!phraseEnd;
  if(bass>=0||approach){const next=titleChords[titleChanges[(bar+1)%32]].root,pitch=approach?next+(next<chord.root?1:-1):chord.root+bass;note({frequency:hz(pitch),duration:beat*(suspended?1.45:step===0?.78:.53),hold:beat*.18,gain:quiet?.059:.068,type:'triangle',cutoff:460,cutoffEnd:210,attack:.008,offset:groove,music:true,priority:2});
   if(step===0)note({frequency:hz(chord.root-12),duration:beat*1.45,hold:beat*.42,gain:.028,type:'sine',cutoff:160,attack:.013,offset:groove,music:true,priority:2});}
  const kick=suspended?[0]:climax?[0,4,7]:[0,4];
  if(kick.includes(step)&&!(phraseEnd&&step===7)&&(!variation.ambient||bar%2===0))note({frequency:102,end:43,duration:.2,hold:.025,gain:quiet?.054:.068,cutoff:340,offset:groove,music:true,priority:2});
  if(!variation.ambient&&(suspended?step===4:step===2||step===6)){noise({duration:.10,gain:quiet?.018:.026,cutoff:1700,end:570,highpass:190,offset:groove,music:true});note({frequency:142,end:68,duration:.08,gain:.020,type:'triangle',cutoff:570,offset:groove,music:true});}
  if(!suspended&&step%2===1)noise({duration:step===7&&!phraseEnd?.055:.025,gain:quiet?.007:.011,cutoff:3100,end:1500,highpass:1300,hold:.002,pan:step%4<2?-.3:.3,offset:groove,music:true,priority:0});
  // A short fill marks an eight-bar sentence, with a quieter last cadence
  // that naturally resolves from B7 into the returning E-minor motif.
  if(phraseEnd&&step===7&&bar!==31)for(let i=0;i<2;i++)note({frequency:[116,87][i],end:[78,56][i],duration:.13,gain:.019-i*.003,type:'sine',cutoff:480,offset:offset+i*beat*.25,music:true});
 }
 function bossMusicStep(index,offset,beat){
  const theme=sectorMusic[sectorTrack],figure=bossApproaches[sectorTrack],step=index%8,bar=Math.floor(index/8),root=theme.chords[bar%4][0],intro=bar<4;
  // A separate minor-key overture replaces the ordinary score immediately.
  // Midrange horn harmonics remain audible on phone speakers above the bass.
  if(step===0){
   for(const [i,interval] of [0,3,7].entries())note({frequency:hz(root+12+interval),duration:beat*(intro?3.4:1.5),attack:.06,hold:beat*.8,gain:intro?.047:.032,type:figure.type==='sine'?'triangle':figure.type,cutoff:1700,pan:(i-1)*.22,offset,music:true,priority:4});
   note({frequency:hz(root-12),duration:beat*3.6,hold:beat*1.1,attack:.02,gain:.1,cutoff:240,offset,music:true,priority:4});
  }
  const pitch=root+12+figure.notes[(step+(bar%2)*2)%8];
  note({frequency:hz(pitch),end:hz(pitch-.1),duration:beat*.37,hold:beat*.1,gain:step%2?.041:.059,type:'triangle',cutoff:2200,pan:step%2?-.15:.15,offset,music:true,priority:3});
  if(figure.pulse.includes(step)){
   note({frequency:110,end:38,duration:.23,hold:.04,gain:.105,cutoff:450,offset,music:true,priority:4});
   noise({duration:.14,gain:.043,cutoff:1500,end:260,body:true,offset,music:true,priority:3});
  }
  if(step===6||step===7)noise({duration:.075,gain:.025,cutoff:2500,end:600,offset,music:true,priority:2});
 }
 function startTitleLoop(){
  if(!titleActive||!musicEnabled||!context||context.state!=='running'||musicTimer!==null)return;
  musicBus.gain.cancelScheduledValues(context.currentTime);musicBus.gain.setTargetAtTime(sectorTrack<0?1.45:1.38,context.currentTime,.12);
  const theme=sectorTrack<0?null:sectorMusic[sectorTrack],arr=theme?arrangements[sectorTrack]:arrangements[0],beat=theme?60/(theme.bpm*(bossApproach>.04?1.18:1)):themeBeat;
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
    const form=arrangement,chord=theme.chords[form.chordIndex],offset=Math.max(0,nextBeat-context.currentTime),phrase=Math.floor(bar/4)%4,cadence=bar%4===3&&step>=6,groove=offset+(step%2?beat*arr.swing:0);
    const refrain=bar%16<2&&!form.quiet&&!form.rest,hook=refrain?descentHook[bar%2].find(n=>n[0]===step):null,melody=refrain?{pitch:hook?theme.chords[0][0]+24+hook[1]:-1,duration:hook?.[2]||1,busy:true}:sectorMelody(theme,form,bar,step),lead=melody.pitch;
    if(lead>=0&&!cadence)note({frequency:hz(lead),duration:beat*melody.duration*.94,hold:beat*melody.duration*.38,attack:.014,gain:form.quiet?.031:form.drive?.043:.038,instrument:form.quiet?'glass':scoreTimbres[sectorTrack],type:'triangle',cutoff:form.quiet?1800:form.drive?3200:2600,cutoffEnd:1200,vibrato:5,vibratoRate:4.4,pan:form.answer?-.15:.12,offset:groove,space:true,music:true,priority:2});
    if(form.answer&&!form.drive&&!form.rest&&(step===2||step===6)){
     const line=sectorCounterlines[sectorTrack],interval=line[(bar+(step===6?4:0))%line.length],pitch=chord[0]+interval+12;
     note({frequency:hz(pitch),end:hz(pitch+(step===6?-2:2)),duration:beat*1.35,hold:beat*.38,attack:.055,gain:form.quiet?.008:.012,type:sectorTrack===1||sectorTrack===4?'sawtooth':'triangle',guitar:sectorTrack===0||sectorTrack===5,guitarBend:.997,cutoff:form.quiet?1050:1550,pan:step===2?-.48:.48,endPan:step===2?.22:-.22,offset:groove,space:true,music:true,priority:1});
    }
    // Sparse satellites leave room around the lead. Sixteenths enter only in a
    // driving phrase, so combat never carries every stem at full density.
    const arpIndex=arr.arp[step];
    if(arpIndex>=0&&(!cadence||step===6)&&(!form.quiet||step===3||step===7)&&!form.rest){
     const pitch=chord[arpIndex]+12+(phrase===2?12:0),side=step%2?-.58:.58;
     note({frequency:hz(pitch),duration:beat*.48,gain:lead<0?.013:.008,type:'triangle',cutoff:1550,pan:side,endPan:-side*.25,offset:groove,space:true,music:true});
     if(form.drive&&smoothedIntensity>.35&&step%2===0)note({frequency:hz(chord[(arpIndex+1)%3]+24),duration:beat*.25,gain:.005,type:'sine',cutoff:1700,pan:-side,offset:groove+beat*.25,space:true,music:true,priority:0});
    }
    if(!melody.busy&&step===7&&bar%2===1&&!form.quiet&&!form.rest){const answer=chord[1]+12;note({frequency:hz(answer),duration:beat*1.2,attack:.035,hold:.06,gain:.024,type:'sine',cutoff:1700,pan:-.4,endPan:.2,offset:groove,space:true,music:true,priority:2});}
    if(bar%4===3&&step===6)for(let i=0;i<2;i++)note({frequency:hz(chord[i]+24),duration:beat*1.1,gain:.006,type:'sine',pan:(i-.5)*.8,offset:offset+i*beat*.25,space:true,music:true,priority:0});
    // A slow stereo string voice provides a second melodic arc over the fast arpeggio.
    if((step===1||step===5)&&phrase!==1&&!form.drive){const interval=step===1?7:12,pitch=chord[(bar+Math.floor(step/4))%3]+interval,side=step===1?-.55:.55;note({frequency:hz(pitch)*.997,end:hz(pitch),duration:beat*1.65,attack:.11,hold:beat*.45,gain:.010,type:'triangle',cutoff:1250,pan:side,endPan:-side,offset,space:true,music:true});}
    const bassInterval=arr.bass[step];
    if(bassInterval>=0&&(!form.quiet||step===0||step===4))note({frequency:hz(chord[0]+bassInterval),duration:beat*.54,hold:beat*.12,gain:.068,type:'triangle',cutoff:440,offset:groove,music:true,priority:2});
    if(step===0&&bar%2===0)for(const [i,pitch] of chord.slice(1).entries())for(const side of [-1,1])note({frequency:hz(pitch+12)*(1+side*.002),duration:beat*3.5,hold:beat*.7,gain:.006,type:arr.pad,attack:beat*.5,cutoff:1150,pan:side*.65,endPan:side*.3,offset:offset+i*.025,music:true,priority:0});
    if((form.drive?arr.kick.includes(step)||step===4:arr.kick.includes(step))&&(!form.quiet||step===0)&&!form.rest)note({frequency:112,end:48,duration:.18,hold:.015,gain:.060,cutoff:400,offset:groove,music:true,priority:2});
    if(arr.hat.includes(step)&&!form.quiet&&!form.rest)noise({duration:step===7?.048:.026,gain:.009+smoothedIntensity*.003,cutoff:3000,end:1400,highpass:1100,hold:.002,pan:step%4<2?-.3:.3,offset:groove,music:true,priority:0});
    if(arr.snare.includes(step)&&(!form.quiet||step===4)&&!form.rest){noise({duration:.075,gain:.020+smoothedIntensity*.005,cutoff:1900,end:650,highpass:180,offset:groove,music:true});note({frequency:170,end:76,duration:.052,gain:.016,type:'triangle',cutoff:700,offset:groove,music:true});}
    if(form.drive&&bar%4===3&&step===7)noise({duration:.055,gain:.019,cutoff:1100,end:320,offset:offset+beat/4,music:true,priority:0});
    musicStep++;nextBeat+=beat/2;
   }
  };
  musicTimer=setInterval(tick,50);tick();
 }
 function setTitle(active){if(active){pendingBossCue=null;bossApproach=0;bossEngaged=false;}if(active&&sectorTrack!==-1){stopTitleLoop();musicStep=0;}if(active){sectorTrack=-1;intensity=0;}titleActive=active;if(active)startTitleLoop();else stopTitleLoop()}
 function setSector(sector){pendingBossCue=null;intensity=0;smoothedIntensity=0;bossApproach=0;smoothedApproach=0;bossEngaged=false;stopTitleLoop();musicStep=0;sectorTrack=Math.max(0,Math.min(sectorMusic.length-1,Math.trunc(sector)||0));titleActive=true;startTitleLoop()}
 function setMusicActive(active){titleActive=active;if(active)startTitleLoop();else stopTitleLoop()}
 function setMusicEnabled(value){musicEnabled=value;try{localStorage.setItem('neon-vanguard-title-music',value?'on':'off')}catch{}if(value)startTitleLoop();else stopTitleLoop()}
 function intro(){
  if(!context||!enabled)return;if(context.state==='suspended'){context.resume().then(()=>{if(context.state==='running')intro()}).catch(()=>{});return}clear();
  // A reactor waking up: low fifths, steel resonances, and pneumatic impacts.
  [55,82.41,110].forEach((frequency,i)=>note({frequency,end:frequency*1.015,duration:2.4,gain:.028,type:'sawtooth',attack:.18,offset:i*.12,cutoff:650,space:true,pan:(i-1)*.3}));
  [220,329.63,440,622.25,659.25].forEach((frequency,i)=>{
   note({frequency,end:frequency*.98,duration:.75,gain:.026,type:'triangle',offset:.25+i*.22,attack:.004,space:true,pan:Math.sin(i)*.45});
   note({frequency:frequency*1.5,duration:.3,gain:.005,type:'triangle',offset:.25+i*.22,cutoff:2200,space:true});
  });
  noise({duration:1.4,gain:.045,cutoff:1800,end:180,offset:.1});
  [0,.44,.88].forEach(offset=>{note({frequency:110,end:38,duration:.3,gain:.06,offset});noise({duration:.12,gain:.065,cutoff:2800,end:600,offset})});
 }
 // A voiced throat with two moving vowel resonances; irregular pressure
 // pulses and pitch breaks make the charge sound like an animal scream.
 function lungeThroat(pitch,pan){
  if(!allocateVoice(5,false))return;
  const now=context.currentTime,duration=1.05,osc=context.createOscillator(),amp=context.createGain(),panner=context.createStereoPanner(),throat=context.createBiquadFilter(),mouth=context.createBiquadFilter(),mouthGain=context.createGain();
  osc.type='sawtooth';
  const contour=[[0,.72],[.07,1.15],[.18,2.55],[.31,2.05],[.43,2.8],[.56,1.8],[.68,2.15],[.83,1.2],[1.05,.5]];
  osc.frequency.setValueAtTime(pitch*.72,now);
  for(let i=1;i<contour.length;i++){const [at,mul]=contour[i];osc.frequency.exponentialRampToValueAtTime(pitch*mul,now+at);}
  throat.type=mouth.type='bandpass';throat.Q.value=2.8;mouth.Q.value=3.6;mouthGain.gain.value=.42;
  for(const [filter,base] of [[throat,570],[mouth,1450]]){
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
 // Boss attacks reserve priority above routine gunfire and wing beats.
 function bossAttack(action='fire',kind=0,x=1000){
  if(!enabled||!context||context.state!=='running')return;
  const pan=Math.max(-.85,Math.min(.85,(x/1440-.5)*1.5)),lunging=action==='lunge',pitch=({0:128,2:78,3:96,5:61})[kind]||110;
  if(lunging){
   duckMusic(.64,1.15);
   lungeThroat(pitch,pan);
   // Sustained sub-bass anchors the scream, with a gently beating chest tone.
   note({priority:5,frequency:48+pitch*.12,end:31,duration:1.2,gain:.19,type:'sine',pan,cutoff:180,attack:.045,hold:.55,vibrato:95,vibratoRate:6});
   noise({priority:5,duration:.98,gain:.13,cutoff:1700,end:230,pan,body:true,wet:true,band:true,resonance:1.8});
   return;
  }
  duckMusic(.88,.22);
  note({priority:5,frequency:pitch*1.8,end:pitch*.42,duration:.22,gain:.085,type:'sawtooth',pan,cutoff:1500,attack:.012});
  note({priority:5,frequency:pitch*.6,end:32,duration:.25,gain:.095,type:'sine',pan,cutoff:220});
  noise({priority:5,duration:.18,gain:.12,cutoff:2800,end:700,pan,body:true,wet:true});
 }
 function shot(kind='pulse',x=720,enemy=false){
  if(!enabled||!context||context.state!=='running'||x< -100||x>1540)return;
  if(!enemy)duckMusic(.68,.12);
  const presets={pulse:[245,85,.045,'triangle'],spread:[210,70,.055,'sawtooth'],beam:[340,120,.22,'triangle'],helix:[240,100,.18,'triangle'],wave:[190,55,.23,'sawtooth'],missile:[120,35,.24,'sawtooth'],drone:[280,120,.045,'triangle'],spore:[220,65,.16,'triangle'],bolt:[295,95,.04,'triangle'],seeker:[150,40,.2,'sawtooth']};
  const cannon=['pulse','spread','bolt','drone'].includes(kind);
  const [frequency,end,duration,type]=presets[kind]||presets.pulse,pan=(x/1440*2-1)*.65,priority=enemy?2:3;
  note({frequency,end,duration:cannon?duration*.72:duration,type,pan,endPan:kind==='helix'?-pan:null,attack:.0015,gain:enemy?.022:.084,cutoff:kind==='missile'?650:cannon?2200:1200,cutoffEnd:cannon?1150:null,priority});
  noise({duration:kind==='missile'?.24:cannon?.016:kind==='spore'?.13:.045,gain:enemy?.018:kind==='missile'?.05:cannon?.145:.047,cutoff:kind==='spore'?900:cannon?3600:1650,end:cannon?1100:250,highpass:cannon?600:0,hold:cannon?.0015:0,pan,body:kind==='missile',wet:kind==='spore',priority});
  if(!enemy)note({frequency:125,end:58,duration:cannon?.061:.15,attack:.002,hold:cannon?.009:.025,pan,gain:.096,type:'triangle',cutoff:420,priority});
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
  const theme=sectorMusic[sectorTrack],root=theme.chords[0][0],duration=reveal?4.6:3.6;
  // Encounter cues bypass music ducking AND the world acoustic filter. They
  // reserve priority six, so weapon fire/wing beats cannot steal the entrance.
  duckMusic(.12,duration);duckWorld(duration);
  const hits=reveal?4:3,spacing=reveal?.30:.37;
  for(let i=0;i<hits;i++){
   const offset=i*spacing,weight=1-i*.09;
   note({frequency:reveal?74:68,end:reveal?33:39,duration:reveal?.58:.4,hold:.055,gain:.13*weight,cutoff:250,offset,cue:true});
   note({frequency:reveal?175:145,end:reveal?82:72,duration:.42,gain:.075*weight,type:'triangle',cutoff:1200,offset,cue:true});
   noise({duration:reveal?.34:.22,gain:.095*weight,cutoff:reveal?2600:1700,end:260,highpass:100,offset,cue:true});
  }
  if(reveal){noise({duration:1.3,gain:.19,cutoff:300,end:65,body:true,pressure:true,offset:.03,cue:true});noise({duration:.66,gain:.09,cutoff:2300,end:400,body:true,offset:.03,cue:true});}
  if(!musicEnabled)return true;
  const shapes=[[0,7,3,1,0],[0,6,7,3,0],[0,5,8,1,0],[0,3,10,7,0],[0,1,7,6,0],[0,8,7,1,0]],shape=shapes[sectorTrack];
  for(let i=0;i<5;i++){
   const offset=.12+i*(reveal?.68:.50),pitch=root+12+shape[i],length=i===4?1.65:.72;
   note({frequency:hz(pitch),duration:length,attack:.035,hold:length*.48,gain:reveal?.12:.095,instrument:'brass',cutoff:2600,cutoffEnd:1100,vibrato:9,vibratoRate:4.2,pan:.06,offset,music:true,cue:true});
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
  lastBlast=context.currentTime;duckMusic(size>2?.64:.84,size>2?.45:.14);
  const water=environment==='water',weight=Math.max(.35,Math.min(3.8,size)),length=.38+Math.sqrt(weight)*.53,overlap=[...voices].filter(v=>v.priority===4&&!v.music).length;
  const volume=(.35+Math.sqrt(weight)*.38)/Math.sqrt(1+overlap/12),pan=(x/1440*2-1)*.65,variation=1+Math.sin(noiseSerial*2.37)*.06;
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
 function roar(x=1000){if(!enabled||!context||context.state!=='running')return;const pan=(x/1440-.5)*.8;duckMusic(.58,1.25);note({priority:5,frequency:88,end:39,duration:1.35,gain:.19,pan,type:'sawtooth',cutoff:520,guitar:true,attack:.09,hold:.45});note({priority:5,frequency:44,end:28,duration:1.4,gain:.22,pan,type:'sine',cutoff:160,attack:.06});for(let i=0;i<4;i++)noise({priority:5,duration:.58,gain:.15,cutoff:650-i*80,end:140,offset:i*.21,pan,body:true,wet:true});}
 function breath(kind,duration=2.4){if(!enabled)return;const inhale=kind==='inhale',fire=kind==='fire',water=kind==='water',wind=kind==='wind';duckMusic(wind?.58:.65,duration);noise({priority:5,duration,gain:inhale?.08:wind?.25:.22,cutoff:inhale?260:fire?1700:water?2600:1250,end:inhale?1000:fire?480:water?1100:260,body:true,wet:water||wind,tremolo:wind?24:0});if(!inhale){noise({priority:5,duration,gain:fire?.3:wind?.24:.16,cutoff:fire?220:wind?170:380,end:wind?48:80,body:true,tremolo:wind?12:0});if(fire)for(let i=0;i<6;i++)noise({priority:5,duration:.13,gain:.06,cutoff:2400,end:450,offset:i*duration/6});if(wind)for(let i=0;i<4;i++)noise({priority:5,duration:.2,gain:.045,cutoff:1900,end:520,offset:i*duration/4,pan:i%2?-.18:.18,body:true});}}
 function laserCharge(){note({priority:5,frequency:85,end:420,duration:1.25,attack:.22,hold:.7,gain:.075,type:'sawtooth',cutoff:1100,guitar:true});note({priority:5,frequency:43,end:78,duration:1.25,attack:.18,hold:.75,gain:.13,type:'sine',cutoff:220});noise({priority:5,duration:1.25,gain:.09,cutoff:160,end:1100,body:true})}
 function thrusterBurst(duration=.76){if(enabled)duckMusic(.35,duration);noise({priority:5,duration,gain:.25,cutoff:1300,end:420,body:true});noise({priority:5,duration,gain:.22,cutoff:170,end:55,body:true});note({priority:5,frequency:68,end:38,duration,attack:.015,gain:.16,type:'sine',cutoff:150});}
 function laserBeam(duration=1.6){if(enabled)duckMusic(.55,duration);note({priority:5,frequency:620,end:95,duration:.32,attack:.004,gain:.14,type:'sawtooth',cutoff:2300,guitar:true,space:true});noise({priority:5,duration:.18,gain:.22,cutoff:2600,end:600});noise({priority:5,duration,gain:.23,cutoff:1300,end:650,body:true});noise({priority:5,duration,gain:.23,cutoff:190,end:75,body:true});note({priority:5,frequency:60,end:42,duration,attack:.015,hold:duration*.7,gain:.19,type:'sine',cutoff:180})}


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
 function pickup(x=720){
  const pan=(x/1440*2-1)*.35;
  // Cockpit pickup confirmation stays clear even underwater.
  for(const [frequency,offset] of [[740,0],[1110,.065]]){
   note({priority:5,cue:true,frequency,duration:.22,gain:.075,type:'sine',attack:.002,cutoff:4000,pan,offset});
   note({priority:5,cue:true,frequency:frequency*2,duration:.10,gain:.018,type:'sine',attack:.002,cutoff:5000,pan,offset});
  }
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
 return{init,setEnabled,clear,setEnvironment,bossEntrance,intro,shot,bossAttack,swim,wingbeat,note,explosion,pickup,shipHit,alienCry,roar,breath,laserCharge,laserBeam,thrusterBurst,setTitle,setSector,setIntensity,setBossApproach,setMusicActive,setMusicEnabled,stats:()=>{sweepVoices();const all=[...voices,...releasing];return{mixVersion:2,environment,bossCueCount,bossCueKind,lastBossCueAt,pendingBossCue:!!pendingBossCue,enabled,musicEnabled,sectorTrack,musicStep,bossApproach,musicPlaying:musicTimer!==null,state:context?.state||'locked',voices:all.length,activeVoices:voices.size,releasingVoices:releasing.size,musicVoices:all.filter(v=>v.music).length,effectsVoices:all.filter(v=>!v.music).length,voiceLimit,musicLimit,byPriority:Array.from({length:7},(_,priority)=>all.filter(v=>v.priority===priority).length),...voiceCounters}}};
})();
