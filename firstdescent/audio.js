'use strict';
// Local Web Audio synthesis works in browsers and native web-view wrappers.
window.flightAudio=(()=>{
 let context,master,compressor,delay,echo,enabled=true,lastSwim=-1,lastBlast=-1,lastShieldHit=-1,noiseBuffer,arcadeNoise,guitarCurve,noiseSerial=0;
 const voices=new Set(),releasing=new Set(),lastCries=new Map();
 // Reserve headroom for readable combat cues; at most 60 voices + four 8ms release tails.
 const voiceLimit=64,activeLimit=60,musicLimit=24,voiceCounters={started:0,stolen:0,dropped:0,peak:0};
 const themeBeat=60/112; // 112 BPM; all sequencer and echo divisions share this clock.
 let musicEnabled=true,titleActive=false,musicTimer=null,musicBus,musicDelay,musicEcho,musicCross,nextBeat=0,musicStep=0,sectorTrack=-1,musicDucker,intensity=0,smoothedIntensity=0,duckUntil=0,duckDepth=1;
 try{musicEnabled=localStorage.getItem('neon-vanguard-title-music')!=='off'}catch{}

 function init(){
  if(!context){
   const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;
   context=new Audio();master=context.createGain();master.gain.value=enabled?.65:0;
   compressor=context.createDynamicsCompressor();compressor.threshold.value=-14;compressor.knee.value=18;compressor.ratio.value=2.4;if(compressor.attack)compressor.attack.value=.018;if(compressor.release)compressor.release.value=.34;
   // Add warmth before the limiter; trim the brittle upper register.
   const bass=context.createBiquadFilter(),air=context.createBiquadFilter();
   bass.type='lowshelf';bass.frequency.value=190;bass.gain.value=5;
   air.type='highshelf';air.frequency.value=1600;air.gain.value=-3;
   const subsonic=context.createBiquadFilter();subsonic.type='highpass';subsonic.frequency.value=25;subsonic.Q.value=.5;
   master.connect(bass);bass.connect(air);air.connect(subsonic);subsonic.connect(compressor);compressor.connect(context.destination);
   musicBus=context.createGain();musicBus.gain.value=.55;musicDucker=context.createGain();musicDucker.gain.value=1;
   const musicBody=context.createBiquadFilter();musicBody.type='peaking';musicBody.frequency.value=250;musicBody.Q.value=.8;musicBody.gain.value=-2;
   musicBus.connect(musicBody);musicBody.connect(musicDucker);musicDucker.connect(bass);
   musicDelay=context.createDelay(1);musicDelay.delayTime.value=themeBeat*.75;musicEcho=context.createGain();musicEcho.gain.value=.23;
   const echoLow=context.createBiquadFilter(),echoHigh=context.createBiquadFilter();echoLow.type='lowpass';echoLow.frequency.value=1900;echoHigh.type='highpass';echoHigh.frequency.value=280;
   musicDelay.connect(echoLow);echoLow.connect(echoHigh);echoHigh.connect(musicEcho);musicEcho.connect(musicDelay);
   const left=context.createStereoPanner(),right=context.createStereoPanner(),cross=context.createDelay(1),crossGain=context.createGain();
   left.pan.value=-.6;right.pan.value=.6;cross.delayTime.value=themeBeat*.25;crossGain.gain.value=.22;musicCross=cross;
   musicEcho.connect(left);left.connect(musicBus);musicDelay.connect(cross);cross.connect(crossGain);crossGain.connect(right);right.connect(musicBus);
   delay=context.createDelay(1);delay.delayTime.value=.28;echo=context.createGain();echo.gain.value=.18;
   delay.connect(echo);echo.connect(delay);echo.connect(master);
   guitarCurve=Float32Array.from({length:1024},(_,i)=>Math.tanh((i/1023*2-1)*2.8)/Math.tanh(2.8));
   noiseBuffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate);
   const samples=noiseBuffer.getChannelData(0);let seed=7381,low=0;
   for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const white=seed/2147483648-1;low=(low+.035*white)/1.035;samples[i]=white*.55+low*2.8;}
   // Clocked one-bit shift-register noise: a coarse arcade crackle, not a tone.
   arcadeNoise=context.createBuffer(1,context.sampleRate*2,context.sampleRate);
   const bits=arcadeNoise.getChannelData(0);let shift=0x1ffff,phase=0;
   for(let i=0;i<bits.length;i++){phase+=6500/context.sampleRate;if(phase>=1){phase-=1;shift=(shift>>>1)|(((shift^(shift>>>3))&1)<<16)}bits[i]=((shift&1)?.8:-.8)*.38+samples[i]*.62;}


  }
  context.resume().then(startTitleLoop).catch(()=>{});return true;
 }
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
 function clear(){lastCries.clear();for(const v of [...voices,...releasing])if(!v.music)stopVoice(v);lastSwim=-1;lastBlast=-1;lastShieldHit=-1;duckUntil=0;duckDepth=1;if(musicDucker){musicDucker.gain.cancelScheduledValues(context.currentTime);musicDucker.gain.setTargetAtTime(1,context.currentTime,.12)}}
 function setEnabled(value){enabled=value;if(!enabled)clear();if(master){master.gain.cancelScheduledValues(context.currentTime);master.gain.setTargetAtTime(enabled?.65:0,context.currentTime,.015)}}
 function note({frequency=440,end=frequency,duration=.12,gain=.04,type='sine',pan=0,offset=0,attack=.006,hold=0,cutoff=2800,space=false,music=false,guitar=false,guitarBend=.965,endPan=null,cutoffEnd=null,vibrato=0,vibratoRate=5,priority=music?1:3}={}){
  if(!(music?musicEnabled:enabled)||!context||context.state!=='running'||!allocateVoice(priority,music))return;
  const now=context.currentTime+offset,osc=context.createOscillator(),amp=context.createGain(),filter=context.createBiquadFilter(),panner=context.createStereoPanner();
  osc.type=type;osc.frequency.setValueAtTime(guitar?frequency*guitarBend:frequency,now);if(guitar)osc.frequency.exponentialRampToValueAtTime(frequency,now+.055);
  // A restrained played vibrato gives longer guitar notes a living sustain.
  // It uses parameter automation rather than extra oscillator voices.
  if(vibrato&&duration>.2){const begin=Math.min(.12,duration*.3),count=Math.max(2,Math.ceil((duration-begin)*vibratoRate*4));for(let i=1;i<count;i++){const t=begin+(duration-begin)*i/count,depth=Math.min(1,(t-begin)/.18),base=frequency+(end-frequency)*t/duration;osc.frequency.linearRampToValueAtTime(base*Math.pow(2,Math.sin((t-begin)*vibratoRate*Math.PI*2)*vibrato*depth/1200),now+t);}}
  osc.frequency.exponentialRampToValueAtTime(Math.max(25,end),now+duration);
  filter.type='lowpass';filter.frequency.setValueAtTime(cutoff,now);filter.frequency.exponentialRampToValueAtTime(Math.max(180,cutoffEnd??cutoff*(music?.72:.35)),now+duration);
  amp.gain.setValueAtTime(0,now);amp.gain.linearRampToValueAtTime(gain,now+attack);if(hold>0)amp.gain.setValueAtTime(gain,now+Math.min(duration*.7,attack+hold));amp.gain.exponentialRampToValueAtTime(.0001,now+duration);
  const drive=guitar?context.createWaveShaper():null;if(drive){drive.curve=guitarCurve;drive.oversample='2x';osc.connect(drive);drive.connect(filter)}else osc.connect(filter);
  panner.pan.setValueAtTime(Math.max(-.8,Math.min(.8,pan)),now);if(endPan!==null)panner.pan.linearRampToValueAtTime(Math.max(-.8,Math.min(.8,endPan)),now+duration);filter.connect(amp);amp.connect(panner);panner.connect(music?musicBus:master);if(space)panner.connect(music?musicDelay:delay);
  const voice=trackVoice(osc,amp,[osc,drive,filter,amp,panner],music,priority,now,duration);osc.start(now);osc.stop(voice.endAt);
 }
 // Reuse one noise buffer; transient sources are stopped and disconnected.
 function noise({duration=.15,gain=.04,cutoff=2400,end=300,pan=0,offset=0,band=false,resonance=1.4,arcade=false,body=false,wet=false,music=false,highpass=0,hold=0,tremolo=0,priority=music?1:3}={}){
  if(!(music?musicEnabled:enabled)||!context||context.state!=='running'||!allocateVoice(priority,music))return;
  const now=context.currentTime+offset,osc=context.createBufferSource(),filter=context.createBiquadFilter(),amp=context.createGain(),panner=context.createStereoPanner();
  osc.buffer=arcade?arcadeNoise:noiseBuffer;osc.loop=body;if(arcade){osc.playbackRate.setValueAtTime(1,now);osc.playbackRate.exponentialRampToValueAtTime(.55,now+duration)}filter.type=band?'bandpass':'lowpass';filter.Q.value=band?resonance:.5;
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
  panner.pan.value=Math.max(-.8,Math.min(.8,pan));osc.connect(filter);
  const lowCut=highpass?context.createBiquadFilter():null;if(lowCut){lowCut.type='highpass';lowCut.frequency.value=highpass;lowCut.Q.value=.5;filter.connect(lowCut);lowCut.connect(amp)}else filter.connect(amp);
  // A gain envelope chops broadband noise into dry insect-wing strokes. This
  // needs no free-running LFO/source: automation dies with the tracked voice.
  const flutter=tremolo?context.createGain():null;
  if(flutter){
   const rate=Math.max(20,Math.min(110,tremolo)),floor=.055;
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
  panner.connect(music?musicBus:master);
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
  [[0,64,1.5],[3,67,.5],[4,71,1],[6,69,.5],[7,67,.45]],
  [[0,66,1],[2,64,1.5],[5,59,.5],[6,64,.8]],
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
  titleTheme[4],titleDevelopment[5],
  [[0,67,1],[2,64,1],[4,62,1],[6,64,.75]],
  [[0,66,1],[2,63,1],[4,59,1.5]]
 ];
 const titlePhrases=[...titleTheme,...titleDevelopment,...titleBridge,...titleReturn];
 // Subsequent passes re-orchestrate the song instead of restarting the same
 // recording: a spacious response, then a warmer, rhythm-led variation.
 function titleVariation(index){const pass=Math.floor(index/256)%3,bar=Math.floor(index/8)%32;return{pass,ambient:pass===1&&bar<8,answer:pass>0&&bar%4>=2,warm:pass===2};}
 function sectorArrangement(index,energy){
  const bar=Math.floor(index/8)%128,act=Math.floor(bar/8)%8,cycle=Math.floor(bar/64),boss=energy>.82;
  const quiet=!boss&&(act===2||act===5||act===7),drive=boss||act===3||act===6;
  const orders=[[0,1,2,3],[0,2,1,3],[2,1,0,3],[0,1,3,2]];
  return{act,cycle,boss,quiet,drive,chordIndex:orders[(Math.floor(act/2)+cycle)%4][bar%4],rest:!boss&&(bar%8===7||act===4&&bar%2===1),answer:act===1||act===4||cycle===1};
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
   note({frequency:hz(pitch),duration,hold:duration*.42,gain:leadGain*(step===0?1:.94),type:variation.ambient?'sine':variation.warm?'triangle':'sawtooth',guitar:!variation.ambient&&!variation.warm,guitarBend:.994,cutoff:quiet?1450:1850,cutoffEnd:850,attack:.009,vibrato:6,vibratoRate:4.8,pan:.08,endPan:.015,offset:groove,space:true,music:true,priority:2});
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
 function startTitleLoop(){
  if(!titleActive||!musicEnabled||!context||context.state!=='running'||musicTimer!==null)return;
  musicBus.gain.cancelScheduledValues(context.currentTime);musicBus.gain.setTargetAtTime(sectorTrack<0?.55:.53,context.currentTime,.12);
  const theme=sectorTrack<0?null:sectorMusic[sectorTrack],arr=theme?arrangements[sectorTrack]:arrangements[0],beat=theme?60/theme.bpm:themeBeat;
  musicDelay.delayTime.value=beat*.75;musicCross.delayTime.value=beat*.25;
  nextBeat=context.currentTime+.04;let arrangement=sectorArrangement(musicStep,smoothedIntensity);
  const tick=()=>{
   sweepVoices();smoothedIntensity+=(intensity-smoothedIntensity)*.075;
   if(nextBeat<context.currentTime-.2)nextBeat=context.currentTime+.04;
   while(nextBeat<context.currentTime+.15){
    if(!theme){titleStep(musicStep,Math.max(0,nextBeat-context.currentTime),beat);musicStep++;nextBeat+=beat/2;continue;}
    const bar=Math.floor(musicStep/8)%128,step=musicStep%8;
    // Latch orchestration on the bar line, so combat changes never chop notes.
    if(step===0)arrangement=sectorArrangement(musicStep,smoothedIntensity);
    const form=arrangement,chord=theme.chords[form.chordIndex],offset=Math.max(0,nextBeat-context.currentTime),phrase=Math.floor(bar/4)%4,cadence=bar%4===3&&step>=6,groove=offset+(step%2?beat*arr.swing:0);
    let lead=theme.motif[(step+Math.floor(bar/4)*2)%8];
    if(form.quiet)lead=step===0?chord[2]+12:step===4?chord[1]+12:-1;
    else if(form.answer)lead=step===0?chord[1]+12:step===3?chord[2]+12:step===6?chord[0]+24:-1;
    if(form.rest)lead=-1;
    if(lead>=0&&!cadence)note({frequency:hz(lead+theme.root),duration:beat*(form.quiet?1.8:form.answer?1.2:step%2?.65:1.05),hold:beat*(form.quiet?.6:.18),gain:form.quiet?.026:.036,type:form.quiet?'sine':form.answer?'triangle':theme.type,cutoff:form.quiet?1250:form.drive?2600:1850,pan:form.answer?-.15:.12,offset:groove,space:true,music:true,priority:2,guitar:sectorTrack===1&&!form.quiet&&!form.answer});
    // Sparse satellites leave room around the lead. Sixteenths enter only in a
    // driving phrase, so combat never carries every stem at full density.
    const arpIndex=arr.arp[step];
    if(arpIndex>=0&&(!cadence||step===6)&&(!form.quiet||step===3||step===7)&&!form.rest){
     const pitch=chord[arpIndex]+12+(phrase===2?12:0),side=step%2?-.58:.58;
     note({frequency:hz(pitch),duration:beat*.48,gain:lead<0?.013:.008,type:'triangle',cutoff:1550,pan:side,endPan:-side*.25,offset:groove,space:true,music:true});
     if(form.drive&&smoothedIntensity>.35&&step%2===0)note({frequency:hz(chord[(arpIndex+1)%3]+24),duration:beat*.25,gain:.005,type:'sine',cutoff:1700,pan:-side,offset:groove+beat*.25,space:true,music:true,priority:0});
    }
    if((lead<0||cadence)&&step%2===1&&(!form.quiet||step===7)&&!form.rest){const answer=arr.answer[(Math.floor(step/2)+phrase)%4];note({frequency:hz(answer),duration:beat*1.2,attack:.035,hold:.06,gain:.024,type:'sine',cutoff:1700,pan:-.4,endPan:.2,offset:groove,space:true,music:true,priority:2});}
    if(bar%4===3&&step===6)for(let i=0;i<2;i++)note({frequency:hz(chord[i]+24),duration:beat*1.1,gain:.006,type:'sine',pan:(i-.5)*.8,offset:offset+i*beat*.25,space:true,music:true,priority:0});
    // A slow stereo string voice provides a second melodic arc over the fast arpeggio.
    if((step===1||step===5)&&phrase!==1&&!form.drive){const interval=step===1?7:12,pitch=chord[(bar+Math.floor(step/4))%3]+interval,side=step===1?-.55:.55;note({frequency:hz(pitch)*.997,end:hz(pitch),duration:beat*1.65,attack:.11,hold:beat*.45,gain:.010,type:'triangle',cutoff:1250,pan:side,endPan:-side,offset,space:true,music:true});}
    const bassInterval=arr.bass[step];
    if(bassInterval>=0&&(!form.quiet||step===0||step===4))note({frequency:hz(chord[0]+bassInterval),duration:beat*.54,hold:beat*.12,gain:.068,type:'triangle',cutoff:440,offset:groove,music:true,priority:2});
    if(step===0&&bar%2===0)for(const [i,pitch] of chord.slice(1).entries())for(const side of [-1,1])note({frequency:hz(pitch+12)*(1+side*.002),duration:beat*5.5,hold:beat*.7,gain:.006,type:arr.pad,attack:beat*.5,cutoff:1150,pan:side*.65,endPan:side*.3,offset:offset+i*.025,music:true,priority:0});
    if((form.drive?arr.kick.includes(step)||step===4:arr.kick.includes(step))&&(!form.quiet||step===0)&&!form.rest)note({frequency:112,end:48,duration:.18,hold:.015,gain:.060,cutoff:400,offset:groove,music:true,priority:2});
    if(arr.hat.includes(step)&&!form.quiet&&!form.rest)noise({duration:step===7?.048:.026,gain:.014+smoothedIntensity*.004,cutoff:4000,end:1800,highpass:1100,hold:.002,pan:step%4<2?-.3:.3,offset:groove,music:true,priority:0});
    if(arr.snare.includes(step)&&(!form.quiet||step===4)&&!form.rest){noise({duration:.075,gain:.026+smoothedIntensity*.006,cutoff:2300,end:800,highpass:180,offset:groove,music:true});note({frequency:170,end:76,duration:.052,gain:.016,type:'triangle',cutoff:700,offset:groove,music:true});}
    if(form.drive&&bar%4===3&&step===7)noise({duration:.055,gain:.019,cutoff:1100,end:320,offset:offset+beat/4,music:true,priority:0});
    musicStep++;nextBeat+=beat/2;
   }
  };
  musicTimer=setInterval(tick,50);tick();
 }
 function setTitle(active){if(active&&sectorTrack!==-1){stopTitleLoop();musicStep=0;}if(active){sectorTrack=-1;intensity=0;}titleActive=active;if(active)startTitleLoop();else stopTitleLoop()}
 function setSector(sector){intensity=0;smoothedIntensity=0;stopTitleLoop();musicStep=0;sectorTrack=Math.max(0,Math.min(sectorMusic.length-1,Math.trunc(sector)||0));titleActive=true;startTitleLoop()}
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
 function shot(kind='pulse',x=720,enemy=false){
  if(x< -100||x>1540)return;
  const presets={pulse:[280,85,.045,'square'],spread:[210,70,.055,'sawtooth'],beam:[340,120,.22,'triangle'],helix:[240,100,.18,'triangle'],wave:[190,55,.23,'sawtooth'],missile:[120,35,.24,'sawtooth'],drone:[280,120,.045,'triangle'],spore:[220,65,.16,'triangle'],bolt:[320,95,.04,'square'],seeker:[150,40,.2,'sawtooth']};
  const cannon=['pulse','spread','bolt','drone'].includes(kind);
  const [frequency,end,duration,type]=presets[kind]||presets.pulse,pan=(x/1440*2-1)*.65,priority=enemy?2:3;
  note({frequency,end,duration:cannon?duration*.8:duration,type,pan,endPan:kind==='helix'?-pan:null,attack:.002,gain:enemy?.015:.052,cutoff:kind==='missile'?650:cannon?2000:1200,cutoffEnd:cannon?1250:null,priority});
  noise({duration:kind==='missile'?.24:cannon?.018:kind==='spore'?.13:.045,gain:enemy?.012:kind==='missile'?.032:cannon?.090:.027,cutoff:kind==='spore'?900:cannon?3200:1650,end:cannon?1300:250,highpass:cannon?650:0,hold:cannon?.002:0,pan,body:kind==='missile',wet:kind==='spore',priority});
  if(!enemy)note({frequency:125,end:58,duration:cannon?.061:.15,attack:.002,hold:cannon?.009:.025,pan,gain:.072,type:'triangle',cutoff:420,priority});
 }
 function duckMusic(depth=.76,duration=.28){
  if(!musicDucker||!musicEnabled)return;const t=context.currentTime,param=musicDucker.gain;
  // Overlapping cues extend one smooth dip; a small blast cannot undo a boss dip.
  duckDepth=Math.min(depth,t<duckUntil?duckDepth:1);duckUntil=Math.max(t+duration,duckUntil);
  if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(t);else param.cancelScheduledValues(t);
  param.setTargetAtTime(duckDepth,t,.035);param.setTargetAtTime(1,duckUntil,.38);
 }
 function setIntensity(value){intensity=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;}
 function explosion(x=720,size=1,organic=false){
  if(!enabled||!context||context.state!=='running'||x< -100||x>1540)return;
  if(size<2&&context.currentTime-lastBlast<.035)return;
  lastBlast=context.currentTime;duckMusic(size>2?.64:.84,size>2?.45:.14);
  const weight=Math.max(.35,Math.min(3.8,size)),length=.45+Math.sqrt(weight)*.65,overlap=[...voices].filter(v=>v.priority===4&&!v.music).length,volume=(.28+weight*.23)/Math.sqrt(1+overlap/16),pan=(x/1440*2-1)*.65;
  // Destruction is entirely non-pitched. No oscillators, resonant bandpass,
  // metallic partials, or echoes: those made the previous mix sound like a drum.
  noise({duration:.30*length,gain:.13*volume,cutoff:organic?1650:2200,end:220,pan,body:true,priority:4});
  noise({duration:(organic?1.16:1.28)*length,gain:(organic?.64:.76)*volume,cutoff:250,end:55,pan,offset:.008,body:true,priority:4});
  if(organic){
   for(let i=0;i<(weight>2?5:3);i++)noise({duration:(.47+i*.047)*length,gain:.44*volume/(1+i*.35),cutoff:1100+i*140,end:210+i*25,offset:(.045+i*.113)*length,pan:pan+(i%2?.055:-.055),body:true,wet:true,priority:4});
  }else{
   for(let i=0;i<(weight>2?5:3);i++)noise({duration:(.20+i*.05)*length,gain:.045*volume/(1+i*.3),cutoff:650+i*100,end:150,offset:(.07+i*.12)*length,pan,body:true,priority:4});
  }
 }
 // Original energy-cannon synthesis: electrical wind-up, rapid discharge and bass sustain.
 function alienCry(x,size=1,voice=1){if(!enabled||!context||context.state!=='running')return;const now=context.currentTime;if(now-(lastCries.get(voice)??-10)<.09)return;lastCries.set(voice,now);const boss=voice>=64,id=Math.abs(voice),pan=(x/1440-.5)*1.1,base=(boss?64:115)+(id%11)*(boss?5:12),duration=Math.min(1.45,.32+size*.16+(id%3)*.065),gain=Math.min(.15,.055+size*.024),pulses=2+id%3;
 note({priority:boss?5:4,frequency:base*(1.5+(id%4)*.22),end:base*.55,duration,gain,pan,type:id%2?'sawtooth':'triangle',cutoff:700+(id%5)*170,guitar:true,attack:.025,hold:duration*.2});
 note({priority:boss?5:4,frequency:base*.49,end:base*.31,duration:duration*.9,gain:gain*.85,pan,type:'sine',cutoff:260,attack:.035});
 for(let i=0;i<pulses;i++)noise({priority:boss?5:4,duration:duration*.42,gain:gain*.7,cutoff:1000+(id%7)*210,end:260+(id%4)*90,offset:i*duration*.18,pan,band:true,resonance:1.1+id%3*.25,wet:true,body:true});
 }
 function roar(x=1000){if(!enabled||!context||context.state!=='running')return;const pan=(x/1440-.5)*.8;duckMusic(.58,1.25);note({priority:5,frequency:88,end:39,duration:1.35,gain:.19,pan,type:'sawtooth',cutoff:520,guitar:true,attack:.09,hold:.45});note({priority:5,frequency:44,end:28,duration:1.4,gain:.22,pan,type:'sine',cutoff:160,attack:.06});for(let i=0;i<4;i++)noise({priority:5,duration:.58,gain:.15,cutoff:650-i*80,end:140,offset:i*.21,pan,body:true,wet:true});}
 function breath(kind,duration=2.4){if(!enabled)return;const inhale=kind==='inhale',fire=kind==='fire',water=kind==='water';duckMusic(.65,duration);noise({priority:5,duration,gain:inhale?.08:.22,cutoff:inhale?260:fire?1700:water?2600:1000,end:inhale?1000:fire?480:water?1100:500,body:true,wet:water});if(!inhale){noise({priority:5,duration,gain:fire?.3:.16,cutoff:fire?220:380,end:80,body:true});if(fire)for(let i=0;i<6;i++)noise({priority:5,duration:.13,gain:.06,cutoff:2400,end:450,offset:i*duration/6});}}
 function laserCharge(){note({priority:5,frequency:85,end:420,duration:1.25,attack:.22,hold:.7,gain:.075,type:'sawtooth',cutoff:1100,guitar:true});note({priority:5,frequency:43,end:78,duration:1.25,attack:.18,hold:.75,gain:.13,type:'sine',cutoff:220});noise({priority:5,duration:1.25,gain:.09,cutoff:160,end:1100,body:true})}
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
  // Two clean bell strikes, with no echo tail to obscure combat.
  for(const [frequency,offset] of [[740,0],[1110,.065]]){
   note({priority:5,frequency,duration:.22,gain:.075,type:'sine',attack:.002,cutoff:4000,pan,offset});
   note({priority:5,frequency:frequency*2,duration:.10,gain:.018,type:'sine',attack:.002,cutoff:5000,pan,offset});
  }
 }
 function swim(e){
  if(!context||!enabled||e.x<0||e.x>1440||e.y<0||e.y>760||context.currentTime-lastSwim<.1)return;
  lastSwim=context.currentTime;const frequency=e.brood?95:e.type===1?180:125;
  note({priority:0,frequency,end:frequency*.45,duration:.22,gain:e.brood?.026:.013,type:'sine',cutoff:700,attack:.025,pan:(e.x/1440*2-1)*.7});
  note({priority:0,frequency:frequency*2.1,end:frequency*.8,duration:.13,gain:.005,type:'triangle',cutoff:650,attack:.015,pan:(e.x/1440*2-1)*.7});
 }
 function wingbeat(x=720,strength=.5,kind=0){
  if(!enabled||!context||context.state!=='running'||x< -80||x>1520)return;
  const force=Math.max(0,Math.min(1,strength)),heavy=kind===5,pan=(x/1440*2-1)*.65;
  // An original insect rotor texture: heavy chopped air, leathery blade
  // chatter and a restrained membrane rasp, all triggered by the actual flap.
  const rotor=(heavy?22:kind===2?31:kind===3?26:29)+force*5;
  noise({duration:heavy?.52:.45,hold:.09,gain:(heavy?.14:.095)+force*.025,cutoff:heavy?380:460,end:140,highpass:38,body:true,tremolo:rotor,pan,priority:2});
  noise({duration:heavy?.46:.40,hold:.065,gain:.11+force*.018,cutoff:1050,end:560,band:true,resonance:.55,highpass:160,body:true,tremolo:rotor*1.9,pan,priority:2});
  noise({duration:.29,gain:.038,cutoff:2200,end:1300,band:true,resonance:.55,highpass:720,body:true,tremolo:rotor*3.1,pan,priority:2});
 }
 return{init,setEnabled,clear,intro,shot,swim,wingbeat,note,explosion,pickup,shipHit,alienCry,roar,breath,laserCharge,laserBeam,setTitle,setSector,setIntensity,setMusicActive,setMusicEnabled,stats:()=>{sweepVoices();const all=[...voices,...releasing];return{enabled,musicEnabled,sectorTrack,musicStep,musicPlaying:musicTimer!==null,state:context?.state||'locked',voices:all.length,activeVoices:voices.size,releasingVoices:releasing.size,musicVoices:all.filter(v=>v.music).length,effectsVoices:all.filter(v=>!v.music).length,voiceLimit,musicLimit,byPriority:Array.from({length:6},(_,priority)=>all.filter(v=>v.priority===priority).length),...voiceCounters}}};
})();
