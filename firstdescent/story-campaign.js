'use strict';
// A fixed story route, independent of the additive 92-world exploration archive.
const STORY_ROUTE=[
 {id:'verdant-reach',world:'Caelus',system:'Vesper',title:'First Contact',kind:'guardian',purpose:'Find the expedition’s first missing coordinates.',brief:'Defeat the guardian and recover its signal shard. The shard reveals where the expedition went next.',result:'The first coordinates reveal a distress call from Ferrum’s Foundry.',socket:'Distress coordinates',benefit:'Opens the route to Ferrum · hull service and one nova'},
 {id:'ember-forge',world:'Ferrum',system:'Vesper',title:'The Last Engineer',kind:'guardian',purpose:'Recover the route to Orison. An engineer is still trapped in the Foundry.',brief:'Optional: enter the escape pod’s green ring during the Foundry run. Then defeat the Dreadnought to recover the next coordinates.',result:'The Foundry shard reveals Orison. A submerged expedition relay is still transmitting.',socket:'Orison coordinates',benefit:'Optional engineer rescue: a sabotage drone now, one portal repair during the finale'},
 {id:'lumen-reef',world:'Thalassa',system:'Orison',title:'The Sunken Relay',kind:'relay',purpose:'Locate the survivors by reconnecting their submerged relay.',brief:'Hold inside the relay rings: activate sonar, disrupt enemy weapons, then locate the survivors. Defeat the guardian to recover the next signal shard.',result:'The relay locates five carriers in Eventide. Their crew are alive in stasis; the frozen archive on Nivara holds the way forward.',socket:'Survivor location',benefit:'Connected relays strengthen the final portal by two integrity points'},
 {id:'nivara-glacial-heart',world:'Nivara',system:'Orison',title:'The Frozen Archive',kind:'seal',purpose:'Recover the navigation records needed to reach the stranded carriers.',brief:'Shoot through three frozen archive seals, then defeat the sentinel. The records reveal Eventide’s dormant rescue gate.',result:'The archive reveals a rescue gate in Eventide. Its furnace must be restarted before the carriers can come home.',socket:'Eventide coordinates',benefit:'Archive telemetry reveals openings when later guardians change phase'},
 {id:'eventide-carmine-corona',world:'Carmine',system:'Eventide',title:'The Gate Furnace',kind:'furnace',purpose:'Restore power to the gate that will carry the survivors home.',brief:'Hold near three diversion controls during the guardian encounter. Route their energy into the rescue gate.',result:'The gate has power. Aureus holds the final coordinates. Open the route and defend the portal.',socket:'Gate ignition',benefit:'Diversion controls grant a brief hull guard · rescue gate powered'},
 {id:'eventide-aureus-corona',world:'Aureus',system:'Eventide',title:'Bring Them Home',kind:'extraction',purpose:'Open the route home and protect the five survivor carriers.',brief:'Defeat the Origin guardian. Defend the portal from both sides. Once it opens, weapons stand down and the friendly carriers cross.',result:'All five carriers reached home. The expedition’s crew and discoveries are safe.',socket:'Return coordinates',benefit:'Bring the expedition home · watch the carriers cross the rescue gate'}
];
const STORY_DEFINITION={id:'origin-route-001',version:1,finalStage:STORY_ROUTE[5].id,systems:['Vesper','Orison','Eventide'].map(name=>({id:name,name,discovery:name+' route decoded',stages:STORY_ROUTE.filter(m=>m.system===name).map(m=>({id:m.id,name:m.world,kind:'core'}))})),milestones:[]};
const storyStore=createOriginStore(missionPreview?null:runStorage,STORY_DEFINITION);
let storyMission=null;
function migrateStoryVictories(){for(const m of STORY_ROUTE.slice(0,2))if(originStore.has(m.id))storyStore.collect(m.id);}
function storyIndex(){return flightRun?.story===STORY_DEFINITION.id?STORY_ROUTE.findIndex(m=>m.id===sectors[level].id):-1;}
function storyActive(){return storyIndex()>=0;}
function storyNextLevel(){const next=STORY_ROUTE[storyIndex()+1];return next?sectors.findIndex(s=>s.id===next.id):-1;}
function prepareStoryMission(){const i=storyIndex();storyMission=i<0?null:{index:i,done:0,charge:0,node:null,guardian:false,complete:false,age:0,extract:null,relayEchoes:[],bossPhase:-1,pendingPhase:false};if(i>=0){if(flightRun.storyEngineer===undefined)flightRun.storyEngineer=i>1&&relayStore.snapshot().unlocked;const kind=STORY_ROUTE[i].kind;if(kind==='seal')window.gpuModels?.prepare([0,1,2,3].map(archiveIceMesh).concat([archiveFragmentMesh(),storyMesh('relay')]),sectors[level].id);if(kind==='relay')window.gpuModels?.prepare([0,1,2].map(sunkenCarrierMesh),sectors[level].id);if(kind==='extraction')prepareStoryPortal();if(kind!=='guardian')window.gpuModels?.prepare([storyMesh(kind==='extraction'?'beacon':kind),...(['relay','furnace'].includes(kind)?[storyMesh(kind).rotor]:[]),...(kind==='extraction'?[storyMesh('raider'),storyMesh('carrier')]:[])],sectors[level].id);}}
function storyCheckpoint(){if(!storyActive()||!storyMission)return null;return{index:storyMission.index,done:storyMission.done,guardian:storyMission.guardian,complete:storyMission.complete,reward:storyMission.reward,engineer:!!flightRun.storyEngineer,extract:!!storyMission.extract};}
function restoreStoryCheckpoint(saved){if(!storyActive()||saved?.index!==storyIndex())return;storyMission.done=Math.max(0,Math.min(3,saved.done||0));storyMission.guardian=!!saved.guardian;storyMission.complete=!!saved.complete;storyMission.reward=saved.reward;flightRun.storyEngineer=!!saved.engineer;if(saved.guardian){bossDefeated=true;transition=4;time=Math.max(time,sectors[level].duration+.01);world=time*SCROLL_SPEED;}if(saved.extract&&!saved.complete)beginStoryExtraction();}
function storyObjective(){const m=storyMission,d=STORY_ROUTE[storyIndex()];if(!d||!m)return '';if(m.complete)return 'SIGNAL SHARD SECURED · ROUTE UPDATED';if(m.extract){const e=m.extract;return e.returning&&e.returnAge>=storyPilotCrossingAge()?`EXPEDITION SAFE · WELCOME HOME`:e.returning&&e.returnAge>=storyPilotLaunchAge()?`EXPEDITION 5/5 SAFE · HEADING HOME`:e.returning?`RESCUING EXPEDITION ${e.evacuated}/5 · FRIENDLY CARRIERS · WEAPONS SAFE`:`DEFEND PORTAL · SAVE YOUR PEOPLE · ${e.age>=32?'CLEAR THE APPROACH':Math.ceil(32-e.age)+'s'} · INTEGRITY ${e.hp}/${e.max}${e.engineer&&!e.repaired?' · ENGINEER ON STANDBY':''}`;}
 const opening=openingMissionTask();if(opening&&!m.guardian)return `${m.index+1}/6 · ${opening.title}`;
 const task=d.kind==='relay'?`LINK RELAYS ${m.done}/3 · HOLD INSIDE RING`:d.kind==='seal'?`BREAK SEALS ${m.done}/3 · SHOOT THE CORE`:d.kind==='furnace'?`DIVERT ENERGY ${m.done}/3 · HOLD INSIDE RING`:d.kind==='extraction'?'DEFEAT GUARDIAN · THEN DEFEND THE PORTAL':d.world==='Ferrum'?'DEFEAT DREADNOUGHT · ENGINEER RESCUE OPTIONAL':'DEFEAT GUARDIAN · RECOVER SIGNAL';return `${m.index+1}/6 · ${m.done===3?'OBJECTIVE COMPLETE · DEFEAT GUARDIAN':task}${m.guardian?' · GUARDIAN DOWN':''}`;}
function beginStory(target){migrateStoryVictories();const p=storyStore.snapshot();const index=target===undefined?(p.complete?0:STORY_ROUTE.findIndex(m=>m.id===p.next)):target;if(!Number.isInteger(index)||index<0||index>=6)return;if(STORY_ROUTE.slice(0,index).some(m=>!storyStore.has(m.id)))return;beginDescent(sectors.findIndex(s=>s.id===STORY_ROUTE[index].id),'story');}
function storySocketMarkup(){const p=storyStore.snapshot();return `<div class="story-route">${STORY_ROUTE.map((m,i)=>{const done=storyStore.has(m.id),open=STORY_ROUTE.slice(0,i).every(s=>storyStore.has(s.id));return `<article class="story-stop ${done?'secured':open?'available':'locked'}"><span class="eyebrow">${m.system} · ${String(i+1).padStart(2,'0')}</span><h3><span aria-label="${done?'Shard secured':'Empty socket'}">${done?'◆':'◇'}</span> ${m.world}</h3><strong>${m.title}</strong><p>${m.brief}</p><p class="story-benefit">${m.benefit}</p><small>${done?'SHARD SECURED':open?'ROUTE OPEN':'ROUTE LOCKED'} · ${m.socket}</small></article>`;}).join('')}</div>`;}
function showStoryMap(resume=false){if(state!=='title'&&state!=='paused')return;const previous=state;migrateStoryVictories();const p=storyStore.snapshot(),next=STORY_ROUTE.find(m=>m.id===p.next),overlay=$('#overlay');atlasOpen=true;atlasSystemId=null;overlay.className='overlay universe-atlas origin-log';overlay.onclick=null;overlay.innerHTML=`<div class="atlas-shell story-shell"><header class="atlas-header"><div><span class="eyebrow mint">THE ORIGIN SIGNAL · SIX MISSIONS</span><h2>BRING THEM HOME</h2><p>Find the lost expedition. Rebuild its route through three solar systems.</p></div><button id="storyBack">${resume?'RESUME FLIGHT':'← MAIN MENU'}</button></header><section class="origin-summary"><div><span class="eyebrow">SIGNAL SHARDS</span><strong>${p.count}<small> / 6 secured</small></strong><progress max="6" value="${p.count}" aria-label="Story route progress"></progress></div><div><h3>${p.complete?'The expedition is home.':next.world+' · '+next.title}</h3><p>${p.complete?'All six signals form a route home. Your full universe archive remains available to explore.':next.brief}</p>${resume?'':`<button id="storyLaunch" class="primary">${p.complete?'REPLAY STORY':'CONTINUE STORY'} ↗</button>`}</div></section>${storySocketMarkup()}<p class="atlas-note">${p.durable?'Saved on this device.':'Session preview · progress resets on reload.'} Completed missions survive defeat. Signal Shards open the next mission automatically. The engineer is optional.</p>${resume?'':typeof relayLoadoutMarkup==='function'?'<section class="relay-card"><div><h3>FLIGHT EQUIPMENT</h3><p>Rescue the engineer on Ferrum to unlock the Recovery Kit.</p>'+relayLoadoutMarkup()+'</div></section>':''}<div class="relay-actions">${resume?'':`<button id="storyArchive">EXPLORATION ARCHIVE · ${originStore.snapshot().count}/92</button>`}${resume?'':'<button id="storyExplore">FLY EXPLORATION ROUTE ↗</button>'}</div><p class="atlas-note">Your exploration archive is separate. Story missions do not require collecting all 92 crystals.</p></div>`;
 $('#storyBack').onclick=()=>{atlasOpen=false;if(resume&&previous==='paused'){state='paused';pause();}else showTitleScreen();};if(!resume){$('#storyLaunch').onclick=()=>beginStory();$('#storyExplore').onclick=()=>beginDescent(0,'exploration');}if(!resume)$('#storyArchive').onclick=()=>{if(resume)return;atlasOpen=false;state='title';showOriginMission();};if(!resume)for(const mode of ['standard','support']){const button=$('[data-relay-loadout="'+mode+'"]');if(button)button.onclick=()=>{if(mode==='support'&&!relayStore.snapshot().unlocked)return;relayLoadout=mode;showStoryMap();};}$('#storyBack').focus();}
function storyGuardianDefeated(b){if(!storyActive()||b!==boss||b.hp>0)return false;storyMission.guardian=true;ship.silk=0;if(isOriginGuardian(b)){storyMission.originLocks=3;hostile=[];}if(storyIndex()===1)flightRun.storyEngineer=!!ferrumMission?.boarded;storyMission.shardSource={x:b.x,y:b.y};if(flightRun.storyOwner===originStore.account())originStore.collect(sectors[level].id);saveCheckpoint();return true;}
// Rewards follow the reached route, rather than granting all replay unlocks at launch.
function storyBenefits(){const i=storyIndex();return{uplink:i>2,telemetry:i>3,engineer:!!flightRun?.storyEngineer};}
function beginStoryExtraction(){
 const benefits=storyBenefits(),max=benefits.uplink?8:6;
 storyMission.extract={age:0,hp:max,max,next:2,spawned:0,raiders:[],x:W/2,y:H/2,previousShip:{x:ship.x,y:ship.y},engineer:benefits.engineer,repaired:false,repairGlow:0,returning:false,returnAge:0,evacuated:0};
 ship.hp=Math.max(ship.hp,3);ship.inv=Math.min(ship.inv,2);
 prepareStoryPortal();announce('DEFEND THE PORTAL','PROTECT BOTH SIDES · BRING YOUR PEOPLE HOME',3);window.flightAudio?.setRescueCelebration?.(false);window.flightAudio?.setMusicActive(true);
}
function updateStoryBoss(b){
 if(!storyActive()||!storyMission||b.entry||isOriginGuardian(b))return;
 const m=storyMission,phase=bossCombatPhase(b),archive=m.archive;
 // Spend one recovered opening in a safe gap; never interrupt an authored attack
 // or chain all three windows together when the seals were collected early.
 if(archive?.openings>0&&m.age>=archive.nextOpening&&!bossPatternBusy(b)&&!b.recovery&&!b.exposed&&!b.eyeAttack&&!b.pressureFollowup&&!b.comboSteps?.length&&!b.broodWatch){
  archive.openings--;archive.nextOpening=m.age+14;b.exposed=3;b.recovery=3;holdBossSalvo(b);
  announce('ARCHIVE LINK · SENTINEL EXPOSED','AIM AT THE GLOWING CORE · 3 SECONDS',2);window.flightAudio?.archiveCue?.('opening',b.x);
 }
 if(phase!==m.bossPhase){if(m.bossPhase>=0)m.pendingPhase=true;m.bossPhase=phase;}
 // Keep the existing authored attacks. Explain the change only in a clear gap.
 if(!m.pendingPhase||bossPatternBusy(b)||b.recovery||b.siege||isTideEncounter())return;
 m.pendingPhase=false;
 if(storyBenefits().telemetry){b.exposed=Math.max(b.exposed||0,2.8);b.recovery=Math.max(b.recovery||0,2.8);announce('ARCHIVE TELEMETRY · OPENING FOUND','ALIGN WITH THE GLOWING WEAK POINT · ATTACK NOW',2);window.flightAudio?.engineerCue?.('link',b.x);}
 else announce(`${STORY_ROUTE[m.index].world.toUpperCase()} GUARDIAN · ${phase===2?'FINAL ASSAULT':'PATTERN CHANGING'}`,bossEncounterHint(b),2);
}
function repairStoryBeacon(e){
 if(e.engineer&&!e.repaired&&e.hp<=3&&e.hp>0){e.repaired=true;e.hp=Math.min(e.max,e.hp+3);e.repairGlow=2;burst(e.x,e.y,'#b8ffe4',20);announce('ENGINEER · BEACON REPAIRED','INTEGRITY +3 · REPAIR CHARGE USED',3);window.flightAudio?.pickup?.(e.x,'repair');}
}
function beginStoryReturn(e){
 e.returning=true;e.portalStamp=null;e.returnAge=0;flash=shake=0;particles=[];rings=[];pickupEffects=[];e.sceneWorld=world;e.escortStart={x:ship.x,y:ship.y};e.raiders=[];shots=[];muzzleFlash=0;explosions=[];hostile=[];hazards=[];acidClouds=[];enemies=[];ship.inv=Math.max(ship.inv,8);
 keys.clear();pointer=null;announce('PORTAL SECURED','OPENING THE WAY HOME · WEAPONS SAFE',3);window.flightAudio?.setBossApproach?.(0);window.flightAudio?.setRescueCelebration?.(true);window.flightAudio?.setMusicActive(true);
}
const STORY_RETURN_FLIGHT=Object.freeze({launch:3,spacing:.7,approach:3.4,settle:.45});
function storyCarrierCrossingAge(i){return STORY_RETURN_FLIGHT.launch+i*STORY_RETURN_FLIGHT.spacing+STORY_RETURN_FLIGHT.approach;}
const STORY_PILOT_RETURN=Object.freeze({delay:.65,approach:2.8,window:2.8,arrival:4});
function storyPilotLaunchAge(){return storyCarrierCrossingAge(4)+STORY_PILOT_RETURN.delay;}
function storyPilotCrossingAge(){return storyPilotLaunchAge()+STORY_PILOT_RETURN.approach;}
function storyRescueFinishAge(){return storyPilotCrossingAge()+STORY_PILOT_RETURN.window+STORY_PILOT_RETURN.arrival;}
function storyCarrierEntry(e,i){const localX=104*.55,localY=104*(.08+Math.sin(i*1.7)*.08),point=storyPortalProject(e,localX,localY,5);return{...point,localX,localY,scale:1.15};}
function storyCarrierPosition(e,i){
 const u=clamp((e.returnAge-STORY_RETURN_FLIGHT.launch-i*STORY_RETURN_FLIGHT.spacing)/STORY_RETURN_FLIGHT.approach,0,1),gate=storyGatePosition(e),entry=storyCarrierEntry(e,i),start=W+100+i*30;
 return{x:start+(gate.x+entry.x-start)*navigationEase(u),y:gate.y+entry.y+Math.sin(i*1.7)*120*(1-u)+Math.sin(u*Math.PI)*45,scale:entry.scale,u};
}
function storyCarrierArrivalAge(i){return storyRescueFinishAge()-1.4-(4-i)*.12;}
function storyReturnFlight(e,entry,target,elapsed,duration){
 const u=clamp(elapsed/duration,0,1),depth=1/(1+9*u*u),localX=target.x+(entry.localX-target.x)*depth,localY=target.y+(entry.localY-target.y)*depth,point=storyPortalProject(e,localX,localY,5);
 return{...point,localX,localY,target,scale:entry.scale*depth,alpha:1-navigationEase((u-.88)/.12),elapsed,u,visible:elapsed>=0&&u<1};
}
function storyCarrierBeyond(e,i){
 const elapsed=e.returnAge-storyCarrierCrossingAge(i),target={x:18+(i-2)*6,y:-32+(i%2)*3};
 return{...storyReturnFlight(e,storyCarrierEntry(e,i),target,elapsed,storyCarrierArrivalAge(i)-storyCarrierCrossingAge(i)),yaw:0};
}
function storyPilotEntry(e){const localX=40,localY=17;return{...storyPortalProject(e,localX,localY,5),localX,localY,scale:1};}
function storyPilotPosition(e){
 const u=clamp((e.returnAge-storyPilotLaunchAge())/STORY_PILOT_RETURN.approach,0,1),gate=storyGatePosition(e),entry=storyPilotEntry(e),s=navigationEase(u);
 return{x:W*.80+(gate.x+entry.x-W*.80)*s,y:H*.79+(gate.y+entry.y-H*.79)*s-Math.sin(u*Math.PI)*40,scale:entry.scale,u};
}
function storyPilotBeyond(e){
 const elapsed=e.returnAge-storyPilotCrossingAge();
 return storyReturnFlight(e,storyPilotEntry(e),{x:19,y:-31},elapsed,STORY_PILOT_RETURN.window+STORY_PILOT_RETURN.arrival);
}
function storyHomecomingImageSize(){return Math.max(W,H)*1.4;}
function storyHomecoming(e){
 const age=e.returnAge-storyPilotCrossingAge(),u=clamp(age/STORY_PILOT_RETURN.window,0,1),arrival=Math.max(0,age-STORY_PILOT_RETURN.window);
 const progress=navigationEase(u),finalZoom=storyHomecomingImageSize()/(208*storyPortalPhase(e).scale);
 return{age,u,turn:navigationEase(age/1.5),zoom:1+(finalZoom-1)*progress,reveal:progress,arrival};
}
// One camera basis drives the chassis, aperture, rotor and ships. The view
// straightens toward the gate's normal as we advance through its throat.
function storyHomecomingProjection(e,h){
 const cached=e.homeProjection;if(cached?.age===h.age&&cached.turn===h.turn)return cached;
 const gate=storyPortalPose(e),remaining=1-h.turn,pose={yaw:gate.yaw*remaining,roll:gate.roll*remaining,pitch:gate.pitch*remaining},scale=storyPortalPhase(e).scale;
 const axes={u:rotateVertex([1,0,0],pose.yaw,pose.roll,pose.pitch,0,0),v:rotateVertex([0,1,0],pose.yaw,pose.roll,pose.pitch,0,0),n:rotateVertex([0,0,1],pose.yaw,pose.roll,pose.pitch,0,0)};
 return e.homeProjection={age:h.age,turn:h.turn,pose,axes,scale,plane:{a:axes.u[0]*scale,b:axes.u[1]*scale,c:axes.v[0]*scale,d:axes.v[1]*scale,x:axes.n[0]*5*scale,y:axes.n[1]*5*scale}};
}
function storyHomecomingView(e,h){
 // The photo and circular doorway share one camera scale. Blending two
 // separately zoomed pictures made the vista overshoot, then shrink back.
 const plane=storyHomecomingProjection(e,h).plane,gate=storyGatePosition(e),travel=navigationEase(h.u),size=storyHomecomingImageSize(),cx=gate.x+(W*.5-gate.x)*travel,cy=gate.y+(H*.35+size*.15-gate.y)*travel,z=h.zoom;
 return{a:plane.a*z,b:plane.b*z,c:plane.c*z,d:plane.d*z,x:cx+plane.x*z,y:cy+plane.y*z,cx,cy};
}
function storyHomecomingPoint(e,p,h){
 const from=storyPortalPlane(e),to=storyHomecomingProjection(e,h).plane,det=from.a*from.d-from.b*from.c,x=p.x-from.x,y=p.y-from.y,lx=(from.d*x-from.c*y)/det,ly=(from.a*y-from.b*x)/det;
 return{...p,x:to.a*lx+to.c*ly+to.x,y:to.b*lx+to.d*ly+to.y};
}
function storyHomecomingCraft(e,p,h,view=storyHomecomingView(e,h)){
 const original=storyPortalPlane(e),scale=Math.sqrt((view.a*view.d-view.b*view.c)/(original.a*original.d-original.b*original.c)),x=view.a*p.localX+view.c*p.localY+view.x,y=view.b*p.localX+view.d*p.localY+view.y,tx=view.a*p.target.x+view.c*p.target.y+view.x,ty=view.b*p.target.x+view.d*p.target.y+view.y;
 return{...p,x,y,scale:p.scale*scale,wake:Math.atan2(y-ty,x-tx)};
}
function storyCarrierTransitPose(e,i,cameraTurn=0){
 const t=navigationEase((storyCarrierPosition(e,i).u-.55)/.45),axes=storyHomecomingProjection(e,{age:e.returnAge-storyPilotCrossingAge(),turn:cameraTurn}).axes;
 return{yaw:Math.atan2(-axes.n[2],axes.v[2])*t,roll:Math.asin(clamp(axes.u[2],-1,1))*t,pitch:Math.PI+(Math.atan2(-axes.u[0],axes.u[1])+Math.PI)*t};
}
function storyCarrierMesh(i){return storyMesh(i%3?'carrier-'+i%3:'carrier');}

function storyPilotTransitPose(e,cameraTurn=0){
 const approach=storyPilotPosition(e).u,bank=navigationEase((approach-.3)/.7),camera=storyHomecomingProjection(e,{age:e.returnAge-storyPilotCrossingAge(),turn:cameraTurn}),b=camera.axes;
 // The nose follows the gate normal while the wings bank into its plane.
 // Looking through the doorway then gives a true rear view, with horizontal
 // wings, instead of rotating a side-on sprite or reversing its heading.
 const target={yaw:(Math.atan2(-b.n[2],b.v[2])+TAU)%TAU,roll:Math.asin(clamp(b.u[2],-1,1)),pitch:Math.atan2(-b.u[0],b.u[1])};
 return{yaw:Math.PI+(target.yaw-Math.PI)*bank,roll:(PILOT_SIDE_ROLL+Math.PI)*(1-bank)+target.roll*bank,pitch:target.pitch*bank};
}
function storyPilotInCinematic(){const e=storyActive()?storyMission?.extract:null;return !!e?.returning&&e.returnAge>=storyPilotLaunchAge();}
function storyHomeSceneOpaque(){const e=storyActive()?storyMission?.extract:null;return !!e?.returning&&e.returnAge>=storyPilotCrossingAge()+STORY_PILOT_RETURN.window;}
function storyGatePosition(e){return{x:e.x-storyRescuePan(e),y:e.y};}
function storyMayFire(){return storyActive()&&!storyMission?.complete&&!storyMission?.extract?.returning;}
function playerWeaponsActive(){return typeof storyActive==='function'&&storyActive()?storyMayFire():!bossDefeated;}
function storyTarget(){return storyActive()&&STORY_ROUTE[storyIndex()].kind==='seal'?storyMission?.node:null;}
const STORY_NO_TARGETS=Object.freeze([]);
let storyCombatDefinitions=null;
function storyCombatSectors(){
 if(storyCombatDefinitions)return storyCombatDefinitions;
 const difficulty=[1,1.45,1.95,2.4,2.9,3.4],caps=[9,10,10,11,12,13],health=[1.07,1.12,1.20,1.26,1.34,1.40],counts=[0,0,22,24,26,28];
 storyCombatDefinitions=Object.freeze(campaign.map(d=>{
  const i=STORY_ROUTE.findIndex(m=>m.id===d.id);if(i<0)return d;
  const waves=i<2?d.waves:Object.freeze(Array.from({length:counts[i]},(_,n)=>+(3+(d.duration-8.5)*Math.pow(n/(counts[i]-1),.84)).toFixed(3)));
  return Object.freeze({...d,bossVariation:null,...(i===4?{arsenal:'silk'}:{}),...(i===5?{encounterProfile:{...bossEncounterProfile(d),signature:'ORIGIN LOCKDOWN'}}:{}),difficulty:difficulty[i],enemyHealthScale:health[i],waves,pacing:Object.freeze({...d.pacing,maxActiveEnemies:caps[i]}),flankWaves:Object.freeze(d.flankWaves.filter(n=>n<waves.length)),broodWaves:Object.freeze(d.broodWaves.filter(n=>n<waves.length))});
 }));return storyCombatDefinitions;
}
const storyTargetCache={mission:null,time:-1,node:null,raiders:null,count:-1,dirty:false,list:[]};
function storyTargets(){
 if(!storyActive())return STORY_NO_TARGETS;
 const c=storyTargetCache,n=storyTarget(),raiders=storyMission?.extract?.raiders;
 if(c.mission!==storyMission||c.time!==time||c.node!==n||c.raiders!==raiders||c.count!==(raiders?.length||0)||c.dirty){
  c.list.length=0;if(n?.hp>0)c.list.push(n);if(raiders)for(const r of raiders)if(r.hp>0)c.list.push(r);
  c.mission=storyMission;c.time=time;c.node=n;c.raiders=raiders;c.count=raiders?.length||0;c.dirty=false;
 }return c.list;
}
function storyHitTarget(s,target){
 if(target.hp<=0)return;storyTargetCache.dirty=true;target.hp-=s.damage;s.seen.add(target);s.spent=true;
 if(target.storySeal){
  const stage=Math.min(3,Math.floor((1-Math.max(0,target.hp)/42)*4));
  if(stage>(target.crackStage||0)){target.crackStage=stage;window.flightAudio?.archiveCue?.('crack',target.x);burst(target.x,target.y,'#c5edff',5);}
  if(target.hp<=0)finishStoryNode();return;
 }
 if(target.storyRaider)target.hit=.16;burst(target.x,target.y,'#ffab79',5);
 if(target.hp<=0){if(target.storyRaider){score+=target.kind==='breaker'?250:150;kills++;}explode(target.x,target.y,'#ffa265',.65,false);}
}
function finishStoryNode(){
 const m=storyMission;if(!m||m.done>=3)return;const kind=STORY_ROUTE[m.index].kind;
 if(m.node&&kind!=='seal')m.relayEchoes.push({...m.node,kind,age:0,number:m.done+1});m.done++;
 if(kind==='relay')activateSunkenRelay(m,m.node||ship);
 if(kind==='seal')activateFrozenArchive(m,m.node||ship);
 if(kind==='furnace'){ship.inv=Math.max(ship.inv,3);rings.push({x:ship.x,y:ship.y,r:20,life:.9,c:'#ffdc8b'});}
 m.node=null;m.charge=0;if(kind!=='relay'&&kind!=='seal')window.flightAudio?.engineerCue?.('link',ship.x);
 const title=kind==='seal'?`ARCHIVE ${m.done}/3 RECOVERED`:kind==='furnace'?`GATE POWER ${m.done}/3`:`RELAY ${m.done}/3 CONNECTED`;
 const benefit=kind==='seal'?'BOSS PHASE OPENINGS REVEALED':kind==='furnace'?'RESCUE GATE POWERED · HULL GUARD 3s':'SURVIVORS LOCATED · FINAL PORTAL +2 INTEGRITY';
 if(kind==='relay'&&m.done===3){annTimer=0;$('#announcement').style.opacity=0;}
 else announce(title,kind==='relay'?['SONAR ONLINE · THREATS MARKED','DEFENSE PULSE · ESCORTS JAMMED','FIVE CARRIERS FOUND · FINAL PORTAL +2'][m.done-1]:m.done===3?benefit:kind==='furnace'?'ENERGY ROUTED · HULL GUARD 3s':'ICE BURST · MOVE BETWEEN THE MARKED RAYS',2);saveCheckpoint();
}
// Nivara: finite, simulation-time effects. Checkpoints retain the recovered
// records, not fresh hazards or repeatable combat rewards.
const ARCHIVE_WARNING=1.25;
function activateFrozenArchive(m,n){
 const a=m.archive||(m.archive={sources:[],readyAt:0,openings:0,nextOpening:0});
 a.sources.push({x:n.x,y:n.y,at:m.age,number:m.done,angle:.16+m.done*.23,fired:false});
 a.readyAt=m.age+3.4;window.flightAudio?.archiveCue?.('warning',n.x);
}
function updateFrozenArchive(m,dt){
 const a=m.archive;if(!a)return;
 for(const p of a.sources){
  const age=m.age-p.at;
  if(!p.fired&&age>=ARCHIVE_WARNING){
   p.fired=true;a.openings++;window.flightAudio?.archiveCue?.('shatter',p.x);
   for(let i=0;i<8;i++){const angle=p.angle+i*TAU/8,speed=240;hostile.push({x:p.x,y:p.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:6,c:'#bbecff',kind:'archiveIce',age:0});}
   if(p.number===3){a.discoveryAt=m.age;annTimer=0;$('#announcement').style.opacity=0;window.flightAudio?.archiveCue?.('decoded',p.x);}
  }
 }
 a.sources=a.sources.filter(p=>m.age-p.at<4.8);
}
function archiveIceMesh(stage=0){
 const key='archive-ice-'+stage;if(storyMeshes.has(key))return storyMeshes.get(key);
 const m=meshBuilder();m.ellipsoid(0,0,0,14,21,12,[103,163,184],.2,8,5);
 for(let i=0;i<9;i++){
  const a=i*TAU/9,spread=stage*(i%3===0?.8:.35),cx=Math.cos(a)*spread,cy=Math.sin(a)*spread;
  const polar=(r,t,z)=>[cx+Math.cos(t)*r,cy+Math.sin(t)*r,z];
  const radius=t=>46+6*Math.sin(t*3)+4*Math.cos(t*2),lo=a-TAU/18,hi=a+TAU/18;
  const v=[[cx+5,cy-8,-33],polar(radius(lo),lo,-6),polar(radius(hi),hi,-6),polar(28,a+.07,12)];
  const shades=[[177,222,240],[86,142,168],[216,246,251],[104,178,203]];
  for(let j=0;j<4;j++){const ids=[[0,1,2],[0,3,1],[0,2,3],[1,3,2]][j];m.faces.push({v:ids.map(k=>v[k]),c:shades[(j+i)%4],em:j===0?.1:0});}
  // Narrow dark fissures with pale inner edges sit on the same faceted surface.
  if(stage>0&&i<stage*3){const path=[polar(11,a,-34),polar(25,a+.11,-25),polar(39,a-.1,-15)];m.tube(path,1.1,[28,63,83],0,0,5,2);m.tube(path.map(v=>[v[0]+.9,v[1]-.5,v[2]-.5]),.38,[221,250,255],.35,0,4,2);}
 }
 const faces=m.faces;storyMeshes.set(key,faces);return faces;
}
function archiveFragmentMesh(){
 const key='archive-fragment';if(storyMeshes.has(key))return storyMeshes.get(key);
 const m=meshBuilder();m.wedge([-9,-4,1],[11,0,-4],[-3,7,3],5,[137,208,234]);m.wedge([-9,-4,1],[11,0,-4],[-2,-7,-2],3,[216,246,254]);storyMeshes.set(key,m.faces);return m.faces;
}
function drawFrozenSeal(n,age,stage=Math.min(3,Math.floor((1-Math.max(0,n.hp)/42)*4))){
 const pose={yaw:.28+Math.sin(age*.6)*.08,roll:.06*Math.sin(age*.8),pitch:.05};
 drawModel(archiveIceMesh(stage),n.x,n.y,1,pose.yaw,pose.roll,pose.pitch,age,0);
}
function drawArchiveGeometry(m){
 const a=m.archive;if(!a)return;
 for(const p of a.sources){
  const t=m.age-p.at;
  if(!p.fired){drawFrozenSeal(p,m.age,3);continue;}
  const u=t-ARCHIVE_WARNING;
  if(u<1.7)for(let i=0;i<12;i++){
   const angle=i*2.399+p.number*.7,speed=40+(i%4)*19;
   ctx.save();ctx.globalAlpha*=clamp((1.7-u)/.6,0,1);
   drawModel(archiveFragmentMesh(),p.x+Math.cos(angle)*speed*u,p.y+Math.sin(angle)*speed*u+35*u*u,.6+(i%3)*.18,u*(i%2?2:-3),angle+u,angle*.4,m.age,0);ctx.restore();
  }
 }
 if(a.discoveryAt!==undefined){
  const t=m.age-a.discoveryAt;if(t>=8)return;
  const x=W*.66,y=H*.25,fade=clamp((8-t)/1.4,0,1),assemble=navigationEase(clamp(t/1.8,0,1));
  ctx.save();ctx.globalAlpha*=fade*.85;
  // The dormant gate uses the same beveled machinery as the final rescue gate.
  drawStoryNodeMachine('relay',x+132,y+32,m.age*.3);
  for(let i=0;i<3;i++)drawModel(archiveFragmentMesh(),x-140+i*85+Math.cos(i*2)*80*(1-assemble),y+Math.sin(i*1.6)*32-90*(1-assemble),1.5,.4,i*.8+(1-assemble)*2,0,m.age,0);
  ctx.restore();
 }
}
function drawArchiveSignals(m){
 const a=m.archive;
 if(a)for(const p of a.sources){
  if(p.fired)continue;const t=clamp((m.age-p.at)/ARCHIVE_WARNING,0,1);
  ctx.save();ctx.translate(p.x,p.y);ctx.strokeStyle='#ffd4a0';ctx.lineWidth=1.5;ctx.globalAlpha=.65+t*.3;
  for(let i=0;i<8;i++){
   const angle=p.angle+i*TAU/8;ctx.save();ctx.rotate(angle);ctx.beginPath();ctx.moveTo(58,0);ctx.lineTo(175,0);ctx.moveTo(166,-5);ctx.lineTo(175,0);ctx.lineTo(166,5);ctx.stroke();ctx.restore();
  }
  ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,61,-Math.PI/2,-Math.PI/2+TAU*t);ctx.stroke();ctx.restore();
 }
 if(m.node){
  ctx.save();ctx.translate(m.node.x,m.node.y);ctx.strokeStyle='#c4edff';ctx.lineWidth=1.5;
  for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*60,-13);ctx.lineTo(side*54,-13);ctx.lineTo(side*54,13);ctx.lineTo(side*60,13);ctx.stroke();}ctx.restore();
 }
 if(a?.discoveryAt!==undefined){
  const t=m.age-a.discoveryAt;if(t>=8)return;const x=W*.66,y=H*.25,progress=clamp((t-.7)/1.8,0,1);
  ctx.save();ctx.globalAlpha=clamp((8-t)/1.4,0,1);ctx.strokeStyle='#98def0';ctx.lineWidth=1.5;
  const pts=[[-140,0],[-55,32],[30,-2],[132,32]];
  // Quiet holographic orbits distinguish decoded coordinates from loose debris.
  ctx.strokeStyle='#81c5e342';ctx.lineWidth=1;
  for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(x+pts[i][0],y+pts[i][1],19+i*3,8+i*2,-.35,0,TAU);ctx.stroke();}
  ctx.strokeStyle='#a8e5ff';ctx.lineWidth=2;
  for(let i=0;i<3;i++){const u=clamp(progress*3-i,0,1);if(!u)continue;ctx.fillStyle='#c5f2ff';ctx.beginPath();ctx.arc(x+pts[i][0],y+pts[i][1],2.5,0,TAU);ctx.fill();}

  for(let i=0;i<3;i++){
   const u=clamp(progress*3-i,0,1),p=pts[i],q=pts[i+1];ctx.beginPath();ctx.moveTo(x+p[0],y+p[1]);ctx.lineTo(x+p[0]+(q[0]-p[0])*u,y+p[1]+(q[1]-p[1])*u);ctx.stroke();
  }
  ctx.strokeStyle='#ddac70';ctx.beginPath();ctx.arc(x+132,y+32,45,-.8,.8);ctx.stroke();ctx.restore();
 }
}
function drawArchiveIce(b){
 ctx.save();ctx.strokeStyle='#b8e9ff88';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-b.vx*.07,b.y-b.vy*.07);ctx.stroke();ctx.restore();
 drawModel(archiveFragmentMesh(),b.x,b.y,.72,(b.age||0)*3,Math.atan2(b.vy,b.vx),(b.age||0)*2,b.age||0,0);
}

// Relay effects use simulation time and a bounded list of three sources.
// Completed checkpoints restore objective progress, never replay a free pulse.
function activateSunkenRelay(m,n){
 const net=m.network||(m.network={sources:[],readyAt:0});
 net.sources.push({x:n.x,y:n.y,number:m.done,at:m.age});net.readyAt=m.age+3.2;
 if(m.done===3)net.discoveryAt=m.age;
 window.flightAudio?.relayCue?.(m.done,n.x);
}
function updateSunkenRelay(m,dt){
 const net=m.network;if(!net)return;
 for(const p of net.sources){
  p.x-=48*dt;const age=m.age-p.at,radius=age*620;
  if(age>2.8)continue;
  for(const e of enemies){
   if(e.hp<=0||e.x<0||e.x>W||Math.hypot(e.x-p.x,e.y-p.y)>radius)continue;
   if(p.number===1)e.relayRevealedUntil=Math.max(e.relayRevealedUntil||0,time+8);
   if(p.number===2&&e.relayPulse!==p){e.relayPulse=p;e.relayJammedUntil=time+6;e.shotWindup=null;e.shoot=Math.max(e.shoot||0,.8);}
  }
  if(p.number===2){
   // In-flight bullets dissolve once reached; lasers and boss bodies remain threats.
   for(const h of hostile)if(!h.expired&&Math.hypot(h.x-p.x,h.y-p.y)<radius){h.expired=true;burst(h.x,h.y,'#a0f6ff',3);}
   hostile=hostile.filter(h=>!h.expired);
  }
 }
 net.sources=net.sources.filter(p=>m.age-p.at<10);
}
const sunkenCarrierHolograms=[];
function sunkenCarrierMesh(variant=0){
 if(!sunkenCarrierHolograms[variant])sunkenCarrierHolograms[variant]=storyCarrierMesh(variant).map(f=>({...f,c:f.c.map((c,i)=>c*.35+[50,165,180][i]*.65),em:.25}));
 return sunkenCarrierHolograms[variant];
}
function drawSunkenNetwork(m){
 const net=m.network;if(!net)return;ctx.save();
 for(const p of net.sources){
  const age=m.age-p.at,fade=clamp((10-age)/2,0,1),r=age*620;
  ctx.globalAlpha=fade;ctx.strokeStyle=p.number===2?'#c0efff':'#79e8da';
  if(age<2.8){ctx.lineWidth=2;ctx.globalAlpha=fade*.5*(1-age/2.8);ctx.beginPath();ctx.arc(p.x,p.y,r,0,TAU);ctx.stroke();ctx.lineWidth=9;ctx.globalAlpha*=.14;ctx.stroke();}
  // A lit circuit carries moving packets to the next relay, not a full-screen flash.
  const target=p.number===3?{x:W*.66,y:H*.25}:m.node||{x:Math.min(W-120,p.x+300),y:p.y-90};
  const u=clamp(age/.85,0,1),dx=target.x-p.x,dy=target.y-p.y;
  ctx.globalAlpha=fade*.35;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+dx*u,p.y+dy*u);ctx.stroke();
  ctx.fillStyle='#cbfff4';ctx.globalAlpha=fade*.8;
  for(let i=0;i<4;i++){const t=(age*.5+i/4)%1;if(t>u)continue;ctx.beginPath();ctx.arc(p.x+dx*t,p.y+dy*t,2,0,TAU);ctx.fill();}
  ctx.beginPath();ctx.arc(p.x,p.y,8,0,TAU);ctx.fill();
 }
 for(const e of enemies){
  const jam=Math.max(0,(e.relayJammedUntil||0)-time),scan=Math.max(0,(e.relayRevealedUntil||0)-time);if(e.hp<=0||!jam&&!scan)continue;
  const r=Math.max(24,Math.min(65,(e.r||25)+12));ctx.globalAlpha=Math.min(1,Math.max(jam,scan));ctx.strokeStyle=jam?'#d8f4ff':'#8cffe0';ctx.lineWidth=1.6;
  for(const sx of [-1,1])for(const sy of [-1,1]){ctx.beginPath();ctx.moveTo(e.x+sx*(r-9),e.y+sy*r);ctx.lineTo(e.x+sx*r,e.y+sy*r);ctx.lineTo(e.x+sx*r,e.y+sy*(r-9));ctx.stroke();}
  if(jam){ctx.beginPath();ctx.arc(e.x,e.y,r+7,-Math.PI/2,-Math.PI/2+TAU*clamp(jam/6,0,1));ctx.stroke();}
  else if(e.shotWindup){ctx.globalAlpha*=.35;ctx.setLineDash([5,9]);ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.shotWindup.targetX,e.shotWindup.targetY);ctx.stroke();ctx.setLineDash([]);}
 }
 if(net.discoveryAt!==undefined){
  const age=m.age-net.discoveryAt,alpha=clamp(age/.65,0,1)*clamp((8-age)/1.5,0,1);
  if(alpha>0){
   // Five real carrier silhouettes materialize inside a projected transmission.
   const x=W*.66,y=H*.25,w=340,h=110;ctx.globalAlpha=alpha;
   ctx.fillStyle='#062332ce';ctx.fillRect(x-w/2,y-h/2,w,h);ctx.strokeStyle='#88e8de';ctx.lineWidth=1;
   for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(x+side*w/2,y-h/2+14);ctx.lineTo(x+side*w/2,y-h/2);ctx.lineTo(x+side*(w/2-24),y-h/2);ctx.stroke();}
   for(let i=0;i<5;i++){
    const u=clamp((age-i*.25)/.5,0,1);ctx.globalAlpha=alpha*u*.85;
    drawModel(sunkenCarrierMesh(i%3),x+(i-2)*59,y+Math.abs(i-2)*8,.62,0,.1,0,m.age,0);
   }
   window.gpuModels?.flush(ctx);ctx.globalAlpha=alpha*.2;ctx.strokeStyle='#b8ffef';
   for(let i=0;i<8;i++){const sy=y-h/2+(i*19+age*24)%h;ctx.beginPath();ctx.moveTo(x-w/2,sy);ctx.lineTo(x+w/2,sy);ctx.stroke();}

  }
 }
 ctx.restore();
}
function storyNodePosition(n,dt){
 // Hold the objective in the flight corridor instead of making a missed
 // approach disappear for an entire scroll cycle, including after the boss.
 n.x=Math.max(W*.22,n.x-dt*48);
 const solids=obstacles.flatMap(obstacleSolids);let target=n.baseY;const clear=y=>!sceneryBorderContact(n.x,y,78,70)&&solids.every(r=>n.x+78<r.x||n.x-78>r.x+r.w||y+70<r.y||y-70>r.y+r.h);
 if(!clear(target))target=[H/2,250,510,310,450].find(clear)??H/2;n.y+=(target-n.y)*Math.min(1,dt*3);
}
function storyNodeFeedback(m,kind){
 if(!m.node){m.signalNode=null;m.signalStep=0;return;}
 if(m.signalNode!==m.node){m.signalNode=m.node;m.signalStep=0;}
 const progress=kind==='seal'?1-m.node.hp/42:m.charge/1.5,step=Math.min(3,Math.floor(progress*4));
 if(kind!=='seal'&&step>m.signalStep){m.signalStep=step;window.flightAudio?.engineerCue?.('link',m.node.x);}
}
function updateStoryMission(dt){if(!storyActive()||!storyMission||state!=='playing'||sectorBlend)return;const m=storyMission,d=STORY_ROUTE[m.index];updateOpeningMission();m.age+=dt;updateSunkenRelay(m,dt);updateFrozenArchive(m,dt);for(const echo of m.relayEchoes){echo.age+=dt;echo.x-=48*dt;}m.relayEchoes=m.relayEchoes.filter(e=>e.age<2.2);if(m.complete)return;
 if(['relay','seal','furnace'].includes(d.kind)&&m.done<3&&m.age>=Math.max(m.network?.readyAt||0,m.archive?.readyAt||0)&&time>(d.kind==='furnace'?sectors[level].duration:12)){
  if(!m.node){const y=[250,500,360][m.done];m.node={x:W-300,y,baseY:y,hp:42,r:d.kind==='seal'?43:32,storySeal:d.kind==='seal'};}
  storyNodePosition(m.node,dt);
  if(d.kind!=='seal'){const nearby=Math.hypot(ship.x-m.node.x,ship.y-m.node.y)<112;m.charge=clamp(m.charge+(nearby?dt:-dt*.35),0,1.5);if(m.charge>=1.5)finishStoryNode();}
 }
 storyNodeFeedback(m,d.kind);
 if(!m.guardian)return;
 if(d.kind==='extraction'){
  if(!m.extract){if(transition>1)return;beginStoryExtraction();saveCheckpoint();}
  const e=m.extract;
  e.repairGlow=Math.max(0,e.repairGlow-dt);
  if(e.returning){e.returnAge+=dt;updateStoryEscort(e);if(!e.opened&&e.returnAge>=1.6){e.opened=true;window.flightAudio?.portalOpen?.();announce('THE WAY HOME IS OPEN','FRIENDLY CARRIERS · WEAPONS SAFE',3);}const previous=e.evacuated;e.evacuated=0;for(let i=0;i<5;i++)if(storyCarrierPosition(e,i).u===1)e.evacuated++;if(e.evacuated>previous){const g=storyGatePosition(e);for(let i=previous;i<e.evacuated;i++)window.flightAudio?.engineerCue?.('link',g.x+storyCarrierEntry(e,i).x);}if(e.returnAge<storyRescueFinishAge())return;}
  else{
  e.age+=dt;e.next-=dt;window.flightAudio?.setIntensity(.85);
  updateStoryRaiders(e,dt);
  e.raiders=e.raiders.filter(r=>r.hp>0);
  repairStoryBeacon(e);
  if(e.hp<=0){announce('EXTRACTION INTERRUPTED','RETRY THE BEACON DEFENSE',3);end(false);return;}if(e.age<32||e.spawned<18||e.raiders.length)return;beginStoryReturn(e);return;
  }
 }else if(['relay','seal','furnace'].includes(d.kind)&&m.done<3)return;
 if(d.kind==='seal'&&m.archive?.sources.some(p=>!p.fired))return;
 if(d.kind==='seal'&&m.archive?.discoveryAt!==undefined&&m.age-m.archive.discoveryAt<6)return;
 if(d.kind==='relay'&&m.network?.discoveryAt!==undefined&&m.age-m.network.discoveryAt<6)return;
 if(d.kind==='extraction'){
  m.complete=true;m.reward={hull:0,novas:0};originRecovery=null;transition=.3;
  if(flightRun.storyOwner===storyStore.account())storyStore.collect(d.id);
  saveCheckpoint();updateHUD();return;
 }
 m.complete=true;const hullBefore=ship.hp,novaBefore=novas;ship.hp=Math.min(5,ship.hp+1);novas=Math.min(3,novas+1);m.reward={hull:ship.hp-hullBefore,novas:novas-novaBefore};queuePickupEffect('rescue',{title:'MISSION REWARD · SIGNAL SECURED',detail:storyServiceReceipt()+' · ROUTE UPDATED'},m.shardSource||ship);ship.inv=Math.max(ship.inv,ORIGIN_RECOVERY_DURATION+1);saveCheckpoint();if(flightRun.storyOwner===storyStore.account())storyStore.collect(d.id);transition=3.4;originRecovery={story:true,index:m.index,x:clamp(m.shardSource?.x??ship.x+220,70,W-70),y:clamp(m.shardSource?.y??ship.y,90,H-90),kind:originEntry(d.id)?.kind||'core',age:0,phase:-1};updateOriginRecovery(0);annTimer=0;$('#announcement').style.opacity=0;updateHUD();
}
function finishStorySector(){if(!storyActive())return false;if(!storyMission?.complete){transition=1;return true;}showStoryDebrief();return true;}
// Brief transmissions keep the next action in view; the full route is optional.
const STORY_TRANSMISSIONS=[
 {voice:'DISTRESS CALL · FERRUM',line:'“The Foundry is falling. One engineer is still alive.”',task:'Optional: rescue the engineer en route. Break the Dreadnought.'},
 {voice:'RECOVERED TRANSMISSION · ORISON',line:'“Our relay can tell you where the carriers are.”',task:'Reconnect three relays to locate the survivors. Then defeat the guardian.'},
 {voice:'EXPEDITION RECORDING · NIVARA',line:'“Five carriers. The crew are in stasis. We’re still alive.”',task:'Break the frozen seals to recover the navigation records. Reach Eventide.'},
 {voice:'ARCHIVE DECODED · EVENTIDE',line:'“There is a way home. But the gate has no power.”',task:'Divert the furnace energy. Restart the rescue gate.'},
 {voice:'RESCUE CHANNEL · AUREUS',line:'“We can see the gate. Please do not leave us here.”',task:'Defeat the guardian. Defend the portal from both sides.'},
 {voice:'EXPEDITION CHANNEL · HOME',line:'“You heard us. You found us. We’re home.”',task:'Five rescue carriers arrived home. The expedition’s crew and discoveries are safe.'}
];
function storyServiceReceipt(){const r=storyMission?.reward||{},items=[];
 if(r.hull)items.push(`Hull repaired +${r.hull}`);else if(ship.hp>=5)items.push('Hull full');
 if(r.novas)items.push(`Nova replenished +${r.novas}`);else if(novas>=3)items.push('Novas full');
 return items.join(' · ');
}
function storyTransmissionRoute(index){return `<ol class="transmission-stops" aria-label="Six-mission journey">${STORY_ROUTE.map((m,i)=>`<li class="${i<=index?'secured':i===index+1?'next':''}" ${i===index+1?'aria-current="step"':''}><i aria-hidden="true">${i<=index?'◆':'◇'}</i><span>${m.world}</span><span class="sr-only">${i<=index?' secured':i===index+1?' next':' ahead'}</span></li>`).join('')}</ol>`;}
function showStoryDebrief(){
 const index=storyIndex(),d=STORY_ROUTE[index],next=STORY_ROUTE[index+1],final=!next,message=STORY_TRANSMISSIONS[index],r=typeof relayDebrief!=='undefined'?relayDebrief:null;
 if(typeof relayDebrief!=='undefined')relayDebrief=null;
 state=final?'victory':'debrief';if(final)recordFlightRun(true);atlasOpen=false;keys.clear();pointer=null;touchContacts.clear();annTimer=0;$('#announcement').style.opacity=0;$('#pause').hidden=true;$('#touchControls').classList.remove('active');$('#originRecoveryPanel').hidden=true;window.flightAudio?.setBossApproach?.(0);window.flightAudio?.setIntensity?.(.12);if(final)window.flightAudio?.setRescueCelebration?.(true);window.flightAudio?.setMusicActive(true);
 const overlay=$('#overlay');overlay.onclick=null;
 const receipt=storyServiceReceipt(),crew=index===1&&flightRun?.storyEngineer?'ENGINEER ABOARD · SABOTAGE DRONE ONLINE':index===1&&r&&!r.rescued?'Engineer not aboard · the rescue can still succeed':final&&flightRun?.storyEngineer?'Your engineer helped bring them home.':'';
 let routePresented=false;
 const renderTransmission=()=>{
  overlay.className='overlay story-transmission';overlay.scrollTop=0;
  overlay.innerHTML=`<section class="transmission-card ${routePresented?'settled':''} ${final?'rescue-victory':''}" aria-labelledby="transmissionTitle"><div class="transmission-heading"><span class="eyebrow mint">${final?'CONGRATULATIONS · EXPEDITION SAVED':'SIGNAL RECOVERED'}</span><span class="transmission-count">${index+1} / 6</span></div><div class="transmission-link" aria-hidden="true"><svg viewBox="0 0 400 48"><path class="transmission-trail" d="M18 24 H380"/><path class="transmission-route-progress" d="M18 24 H380"/><circle cx="18" cy="24" r="5"/><circle class="transmission-destination" cx="380" cy="24" r="7"/></svg><span>${d.world.toUpperCase()}</span><span>${next?next.world.toUpperCase():'HOME'}</span></div><p class="transmission-channel">${message.voice}</p><h2 id="transmissionTitle">${final?'You saved the lost expedition.':message.line}</h2><p class="transmission-task">${final?'WELCOME HOME · '+message.line:message.task}</p>${crew?`<p class="transmission-crew">${crew}</p>`:''}${receipt&&!final?`<p class="transmission-service">${receipt}</p>`:''}${final?`<p class="transmission-service">${message.task}</p>`:''}${storyTransmissionRoute(index)}<div class="transmission-actions"><button id="storyContinue" class="primary">${next?'LAUNCH TO '+next.world.toUpperCase():'BACK TO BASE'} <span aria-hidden="true">↗</span></button><button id="storyJourney" class="transmission-secondary">Journey</button></div></section>`;
  routePresented=true;
  $('#storyContinue').onclick=()=>{if(!['debrief','victory'].includes(state))return;if(final){showTitleScreen();return;}atlasOpen=false;state='playing';overlay.className='overlay hidden';$('#pause').hidden=false;$('#touchControls').classList.add('active');window.flightAudio?.setMusicActive(true);advanceSector(storyNextLevel());canvas.focus();};
  $('#storyJourney').onclick=()=>{overlay.className='overlay universe-atlas story-journey';overlay.innerHTML=`<div class="atlas-shell story-shell"><header class="atlas-header"><div><span class="eyebrow mint">YOUR JOURNEY · ${index+1} / 6</span><h2>THE ROUTE HOME</h2></div><button id="storyJourneyBack">← BACK TO TRANSMISSION</button></header>${storySocketMarkup()}<button id="storyMenu">MAIN MENU</button></div>`;overlay.scrollTop=0;$('#storyJourneyBack').onclick=renderTransmission;overlay.onkeydown=e=>{if(e.key==='Escape'&&overlay.classList.contains('story-journey')){e.preventDefault();e.stopPropagation();renderTransmission();}};$('#storyMenu').onclick=showTitleScreen;$('#storyJourneyBack').focus({preventScroll:true});};
  $('#storyContinue').focus({preventScroll:true});
 };
 renderTransmission();
}
const storyMeshes=new Map();
function storyMesh(kind){
 if(storyMeshes.has(kind))return storyMeshes.get(kind);if(['relay','furnace','beacon'].includes(kind))return storyRelayMesh(kind);const m=meshBuilder(),hot=kind==='furnace',light=hot?[255,165,72]:[126,229,232];
 if(kind.startsWith('carrier')){
  const variant=Number(kind.split('-')[1]||0),panel=[[185,207,215],[198,184,149],[146,187,199]][variant],length=variant===1?33:29;
  m.ellipsoid(0,0,0,length,11,10,panel,0,18,10);m.ellipsoid(16,-2,-9,9,4,3,[27,69,83],0,12,6);
  for(const side of [-1,1]){
   m.wedge([10,side*7,1],[-24,side*(variant===2?25:21),3],[-18,side*7,-6],3,[72,103,123]);
   m.ellipsoid(-18,side*13,2,15,5,5,[64,85,103],0,12,6);
   m.ellipsoid(-32,side*13,2,2,4,4,[199,244,255],.85,10,6);
   m.tube([[-29,side*13,2],[-24,side*13,2]],5.4,[32,48,60],0,0,8,2);
   for(let j=0;j<4;j++){const x=-15+j*8;m.wedge([x,side*7,-8],[x+5,side*9,-6],[x+5,side*5,-10],.7,[92,121,141]);m.ellipsoid(x,side*10,-3,1.2,1.3,1,[190,239,248],.5,6,4);}
   m.tube([[-22,side*19,1],[-12,side*17,-2]],.8,[226,200,143]);
   m.ellipsoid(-22,side*21,1,1.5,1.5,1.5,side<0?[116,242,213]:[252,148,112],.7,6,4);
  }
  for(const x of [-19,-7,5])m.tube([[x,-8,-6],[x,-4,-10],[x,4,-10],[x,8,-6]],.65,[74,98,117],0,0,6,2);
 }else if(kind==='raider'){return storyRaiderMesh();
 }else{
  m.ellipsoid(0,0,2,26,30,17,[43,65,77],0,16,10);
  for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*31,y=Math.sin(a)*31;m.tube([[x*.7,y*.7,8],[x,y,1],[x*.9,y*.9,-12]],3.5,[136,158,164]);m.ellipsoid(x*.83,y*.83,-11,2,2,2,light,.65,8,5);}
  m.ellipsoid(0,0,-16,12,18,6,light,.6,16,10);
  for(const side of [-1,1])m.tube([[side*20,-23,-9],[side*28,0,-14],[side*20,23,-9]],2.5,hot?[174,124,74]:[169,189,195]);
  if(kind==='seal'){for(let i=0;i<5;i++){const a=i*1.256;m.wedge([Math.cos(a)*5,Math.sin(a)*5,-29],[Math.cos(a+.5)*41,Math.sin(a+.5)*41,-3],[Math.cos(a+1)*26,Math.sin(a+1)*26,-10],7,[140+i*9,189+i*7,220+i*5]);}}
 }
 const faces=m.faces;faces.industrial=true;storyMeshes.set(kind,faces);return faces;
}
// The relays are compact members of the rescue-gate family. Reuse its
// beveled profiles and nine locks, with fewer segments at this screen size.
function storyRelayMesh(kind){
 const machine=createStoryPortalMachine(36,false),scale=.32;
 const small=mesh=>{const faces=mesh.map(f=>({...f,v:f.v.map(v=>v.map(n=>n*scale)),textureWeight:0}));faces.portalMachinery=true;return faces;};
 const faces=small([...machine.frame,...machine.front]),hot=kind==='furnace';
 faces.push({v:Array.from({length:36},(_,i)=>[Math.cos(i/36*TAU)*33,Math.sin(i/36*TAU)*33,-1]),c:hot?[60,30,16]:[15,53,65],em:.2,flex:0,textureWeight:0});
 faces.rotor=small(machine.rotor);storyMeshes.set(kind,faces);return faces;
}
function storyRelayPose(age){return{yaw:.38+Math.sin(age*.7)*.12,roll:.08*Math.sin(age*.6),pitch:-.08};}
function drawStoryNodeMachine(kind,x,y,age){
 const mesh=storyMesh(kind),pose=mesh.rotor?storyRelayPose(age):{yaw:.12*Math.sin(age*.7),roll:.05*Math.sin(age),pitch:0};
 drawModel(mesh,x,y,1,pose.yaw,pose.roll,pose.pitch,age,0);
 if(mesh.rotor){const axes={u:rotateVertex([1,0,0],pose.yaw,pose.roll,pose.pitch,0,0),v:rotateVertex([0,1,0],pose.yaw,pose.roll,pose.pitch,0,0),n:rotateVertex([0,0,1],pose.yaw,pose.roll,pose.pitch,0,0)},rotor=storyPortalRotorBasisPose(axes,age*.65);drawModel(mesh.rotor,x,y,1,rotor.yaw,rotor.roll,rotor.pitch,age,0);}
}
function drawStoryRelaySurface(n,age,kind,charge=0){
 const pose=storyRelayPose(age),u=rotateVertex([1,0,0],pose.yaw,pose.roll,pose.pitch,0,0),v=rotateVertex([0,1,0],pose.yaw,pose.roll,pose.pitch,0,0),hot=kind==='furnace',opacity=ctx.globalAlpha;
 ctx.save();ctx.translate(n.x,n.y);ctx.transform(u[0],u[1],v[0],v[1],0,0);ctx.beginPath();ctx.arc(0,0,32.6,0,TAU);ctx.clip();
 const glow=ctx.createRadialGradient(-10,-9,1,0,0,34);glow.addColorStop(0,hot?'#f2b46388':'#82e3e980');glow.addColorStop(.6,hot?'#bc672529':'#2d84953a');glow.addColorStop(1,'#163f5300');ctx.fillStyle=glow;ctx.fillRect(-34,-34,68,68);
 ctx.strokeStyle=hot?'#ffdba0':'#afffff';ctx.lineWidth=.7;
 for(let i=0;i<5;i++){const phase=(age*.27+i/5)%1;ctx.globalAlpha=opacity*(1-phase)*(.3+charge*.3);ctx.beginPath();ctx.ellipse(-5+Math.sin(age*.9+i)*3,4,3+phase*40,2+phase*34,.2,0,TAU);ctx.stroke();}
 ctx.globalAlpha=opacity*.8;ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,32.4,0,TAU);ctx.stroke();ctx.restore();
}
function drawStoryMission(){
 if(!storyActive()||!storyMission||sectorBlend)return;const m=storyMission,d=STORY_ROUTE[m.index],n=m.node,e=m.extract;
 if(n){if(d.kind==='seal')drawFrozenSeal(n,m.age);else drawStoryNodeMachine(d.kind,n.x,n.y,m.age);}
 if(d.kind==='seal')drawArchiveGeometry(m);
 for(const echo of m.relayEchoes){ctx.save();ctx.globalAlpha*=1-navigationEase((echo.age-.65)/1.55);drawStoryNodeMachine(echo.kind||'relay',echo.x,echo.y,m.age);ctx.restore();}
 if(e)for(const r of e.raiders)drawModel(storyMesh('raider'),r.x,r.y,r.scale||1,.08*Math.sin(r.age*3),.18*Math.sin(r.age*4),Math.atan2(e.y-r.y,e.x-r.x),r.age,r.hit||0);
 window.gpuModels?.flush(ctx);ctx.save();
 for(const echo of m.relayEchoes){ctx.save();ctx.globalAlpha=1-navigationEase(echo.age/2.2);drawStoryRelaySurface(echo,m.age,echo.kind||'relay',1);ctx.restore();drawRelayActivation(echo);}
 if(n&&['relay','furnace'].includes(d.kind))drawStoryRelaySurface(n,m.age,d.kind,clamp(m.charge/1.5,0,1));
 if(d.kind==='relay')drawSunkenNetwork(m);
 if(d.kind==='seal')drawArchiveSignals(m);
 if(n&&d.kind==='relay')drawRelaySignal(n,m);
 if(n&&!['relay','seal'].includes(d.kind))drawStoryNodeSignal(n,m,d.kind);
 if(e&&!e.returning)drawStoryGate(e);
 if(e)drawStoryRaiderEffects(e);
 ctx.restore();
}

// Motion uses simulation time, so pause/travel freeze the signal and its packets.
// A few paths and dots share the retained relay model; no per-frame asset baking.
function drawRelaySignal(n,m){
 const t=m.age,charge=clamp(m.charge/1.5,0,1),near=Math.hypot(ship.x-n.x,ship.y-n.y)<112;
 ctx.save();ctx.translate(n.x,n.y);
 const pulse=.5+.5*Math.sin(t*3.4),glow=ctx.createRadialGradient(0,0,6,0,0,70);
 glow.addColorStop(0,`rgba(157,247,241,${.18+pulse*.12+charge*.18})`);glow.addColorStop(1,'#8de5ee00');ctx.fillStyle=glow;ctx.fillRect(-70,-70,140,140);
 // Rotating broken bands and outgoing sonar rings make the idle node readable.
 ctx.lineWidth=2;ctx.strokeStyle='#a3eee9b0';
 for(let i=0;i<3;i++){const a=t*.8+i*TAU/3;ctx.beginPath();ctx.ellipse(0,0,43,36,.18*Math.sin(t*.7),a,a+.8);ctx.stroke();}
 for(let i=0;i<2;i++){const u=(t*.48+i*.5)%1;ctx.globalAlpha=(1-u)*.32;ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,0,45+u*65,0,TAU);ctx.stroke();}
 ctx.globalAlpha=1;ctx.strokeStyle=near?'#b6fff18c':'#8de5ee48';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,112,0,TAU);ctx.stroke();
 ctx.strokeStyle='#c0fff1';ctx.lineWidth=3.5;ctx.beginPath();ctx.arc(0,0,112,-Math.PI/2,-Math.PI/2+TAU*charge);ctx.stroke();
 ctx.restore();
 if(near){
  const ax=n.x,ay=n.y,bx=ship.x,by=ship.y,cx=(ax+bx)/2,cy=(ay+by)/2-18;
  ctx.save();ctx.strokeStyle='#9cf9e64d';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(ax,ay);ctx.quadraticCurveTo(cx,cy,bx,by);ctx.stroke();ctx.strokeStyle='#baffebc0';ctx.lineWidth=1.3;ctx.stroke();
  ctx.fillStyle='#e3fff4';for(let i=0;i<4;i++){const u=(t*1.4+i*.25)%1,x=(1-u)**2*ax+2*(1-u)*u*cx+u*u*bx,y=(1-u)**2*ay+2*(1-u)*u*cy+u*u*by;ctx.beginPath();ctx.arc(x,y,2.4,0,TAU);ctx.fill();}ctx.restore();
 }
 if($('#missionTarget'))return;
 ctx.save();ctx.fillStyle='#081923ce';ctx.fillRect(n.x-171,n.y+126,342,40);ctx.textAlign='center';ctx.fillStyle='#e7fff7';ctx.font='600 13px system-ui';ctx.fillText(near?`RECONNECTING · ${Math.floor(charge*100)}%`:'EXPEDITION RELAY · HOLD INSIDE RING',n.x,n.y+142);ctx.fillStyle='#9bc5ca';ctx.font='10px system-ui';ctx.fillText(`RECOVER THE TRANSMISSION · ${m.done}/3 LINKED`,n.x,n.y+158);ctx.restore();
}
function drawStoryNodeSignal(n,m,kind){
 const seal=kind==='seal',near=Math.hypot(ship.x-n.x,ship.y-n.y)<112,progress=clamp(seal?1-n.hp/42:m.charge/1.5,0,1),color=seal?'#b6e9ff':'#ffc778';
 ctx.save();ctx.translate(n.x,n.y);ctx.strokeStyle=color;ctx.globalAlpha=near?.8:.45;ctx.lineWidth=1.5;
 // Broken signal bands invite an approach; a filling ring confirms action.
 for(let i=0;i<3;i++){const a=m.age*.55+i*TAU/3;ctx.beginPath();ctx.arc(0,0,52,a,a+.65);ctx.stroke();}
 ctx.globalAlpha=near?.7:.35;ctx.beginPath();ctx.arc(0,0,112,0,TAU);ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,112,-Math.PI/2,-Math.PI/2+TAU*progress);ctx.stroke();
 if(seal){for(let i=0;i<3;i++){const a=i*TAU/3+m.age*.2;ctx.save();ctx.rotate(a);ctx.fillStyle=color;const r=63+Math.sin(m.age*4+i)*5;ctx.beginPath();ctx.moveTo(r+8,-4);ctx.lineTo(r,0);ctx.lineTo(r+8,4);ctx.fill();ctx.restore();}}
 ctx.restore();
 if(near&&!seal){const dx=n.x-ship.x,dy=n.y-ship.y;ctx.save();ctx.strokeStyle='#ffd392a0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ship.x,ship.y);ctx.lineTo(n.x,n.y);ctx.stroke();ctx.fillStyle='#fff4d6';for(let i=0;i<4;i++){const u=(m.age*1.3+i*.25)%1;ctx.beginPath();ctx.arc(ship.x+dx*u,ship.y+dy*u,2.5,0,TAU);ctx.fill();}ctx.restore();}
}
function storyInteractionHint(){
 if(storyActive()&&storyMission?.archive){
  const m=storyMission,a=m.archive,p=a.sources.find(p=>!p.fired);
  if(p)return{n:p,title:'ICE BURST',action:'Move between the marked rays',discovery:true};
  if(a.discoveryAt!==undefined&&m.age-a.discoveryAt<8)return{n:{x:W*.66,y:H*.25-25},title:'ROUTE TO EVENTIDE',action:'Gate found · Power offline',discovery:true};
 }

 if(storyActive()&&storyMission?.network?.discoveryAt!==undefined&&storyMission.age-storyMission.network.discoveryAt<8)return{n:{x:W*.66,y:H*.25-65},title:'5 CARRIERS FOUND',action:'Alive in Eventide · Portal +2',discovery:true};
 if(!storyActive()||!storyMission?.node)return null;const m=storyMission,n=m.node,kind=STORY_ROUTE[m.index].kind,seal=kind==='seal',near=Math.hypot(ship.x-n.x,ship.y-n.y)<112;
 return{n,title:seal?'BREAK THE ARCHIVE SEAL':kind==='furnace'?'POWER THE RESCUE GATE':'CONNECT THE RELAY',action:seal?'Shoot the crystal':near?'Stay in the ring':'Enter the ring',progress:clamp(seal?1-n.hp/42:m.charge/1.5,0,1),count:m.done};
}
function updateStoryInteractionHUD(){
 const marker=$('#missionTarget');if(!marker)return;const hint=storyInteractionHint(),visible=!!hint&&state==='playing'&&!sectorBlend&&!storyMission.complete&&hint.n.x>0&&hint.n.x<W;marker.hidden=!visible;if(!visible)return;
 hudText('#missionTarget strong',hint.title);hudText('#missionTarget span',hint.discovery?hint.action:hint.action+' · '+hint.count+'/3'+(STORY_ROUTE[storyIndex()]?.kind==='relay'?' · '+['Sonar','Disrupt','Locate'][hint.count]:''));hudElement('#missionTarget .mission-link-progress').hidden=!!hint.discovery;hudWidth('#missionTarget i',Math.round((hint.progress||0)*100)+'%');
 positionStoryInteractionMarker();
}
function positionStoryInteractionMarker(){
 const marker=hudElement('#missionTarget'),m=storyMission,n=storyInteractionHint()?.n;
 if(!marker||marker.hidden)return;
 if(!n||state!=='playing'||sectorBlend||m.complete||n.x<=0||n.x>=W){marker.hidden=true;return;}
 const b=readFlightMarkerLayout();if(!b)return;
 const x=b.left+clamp(n.x/W*b.width,105,b.width-105),y=b.top+clamp((n.y+135)/H*b.height,35,b.height-74);
 marker.style.transform=`translate3d(${x}px,${y}px,0) translateX(-50%)`;
}
function drawRelayActivation(e){
 const u=clamp(e.age/2.2,0,1),fade=1-navigationEase(u);
 ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=fade;ctx.strokeStyle=e.kind==='furnace'?'#ffd58e':'#baffdf';ctx.lineWidth=3*(1-u)+.5;
 for(let i=0;i<2;i++){const p=clamp((e.age-i*.18)/1.4,0,1);if(p<=0||p>=1)continue;ctx.globalAlpha=fade*(1-p);ctx.beginPath();ctx.arc(0,0,36+p*125,0,TAU);ctx.stroke();}
 ctx.globalAlpha=fade;ctx.strokeStyle='#c8ffdf';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,43,0,TAU);ctx.stroke();
 ctx.fillStyle='#defff0';for(let i=0;i<10;i++){const a=i*2.39996,r=34+u*(55+i%3*15);ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,1.8*(1-u)+.3,0,TAU);ctx.fill();}
 ctx.fillStyle='#baffdf';ctx.textAlign='center';ctx.font='600 13px system-ui';ctx.fillText(e.kind==='furnace'?`CONTROL ${e.number} · ENERGY ROUTED`:e.kind==='seal'?`SEAL ${e.number} · ARCHIVE RECOVERED`:`RELAY ${e.number} CONNECTED`,0,135-u*16);ctx.restore();
}

function updateStoryRecovery(r,phase){
 const d=STORY_ROUTE[r.index],next=STORY_ROUTE[r.index+1];if(phase===2&&r.index<5)window.flightAudio?.signalRecovered?.((r.index+1)/6,true);
 const panel=$('#originRecoveryPanel');if(!panel)return;panel.hidden=false;panel.classList.add('story-recovery');
 panel.innerHTML=`<span class="eyebrow">${phase===0?'GUARDIAN DOWN':phase===1?'SIGNAL TRANSFERRING':'SIGNAL SECURED'}</span><strong>${phase===2?(next?'NEXT: '+next.world.toUpperCase():'EXPEDITION HOME'):'RECOVERING THE SHARD'}</strong><p>${phase===2?(next?d.socket+' recovered · '+storyServiceReceipt():storyServiceReceipt()):'SIGNAL SHARD · RETURN COORDINATES'}</p>`;
}
function storyNova(){if(!storyActive())return;for(const target of storyTargets())if(target.hp>0)storyHitTarget({damage:50,seen:new Set()},target);}

function storyHomingTarget(s,target){for(const e of storyTargets())if(e.hp>0&&(e.x-s.x)*(s.direction||1)>-40&&(!target||Math.hypot(e.x-s.x,e.y-s.y)<Math.hypot(target.x-s.x,target.y-s.y)))target=e;return target;}

// Authored opening missions use pressure, recovery and a final escalation.
// The exploration archive retains its existing schedules and challenges.
const OPENING_MISSIONS=Object.freeze([
 {bossAt:52,waves:[
  {at:3,count:2,type:1,center:330,formation:'line'},
  {at:7,count:3,type:1,center:460,formation:'wedge'},
  {at:11,count:2,type:1,center:300,formation:'line',side:'left'},
  {at:14,count:3,type:3,center:470,formation:'line',aimed:true},
  {at:18,count:3,type:1,center:260,formation:'wedge',aimed:true},
  {at:21,count:4,type:1,center:460,formation:'wedge',aimed:true},
  {at:24,count:3,type:2,center:320,formation:'line',elite:'hunter'},
  {at:34,count:4,type:1,center:280,formation:'wedge',aimed:true},
  {at:36,count:3,type:1,center:490,formation:'line',side:'left',aimed:true},
  {at:39,count:3,type:3,center:300,formation:'line',aimed:true},
  {at:41,count:3,type:1,center:470,formation:'line',side:'left',aimed:true},
  {at:44,count:4,type:1,center:380,formation:'wedge',elite:'ace',aimed:true},
  {at:48,count:3,type:3,center:250,formation:'line',aimed:true}
 ],beats:[
  {at:0,title:'FOLLOW THE SIGNAL',detail:'Recover the first coordinates · move to dodge · weapons fire automatically'},
  {at:9,title:'CONTACT BEHIND YOU',detail:'Space / double tap to face left · clear the rear formation'},
  {at:17,title:'CLOUDBREAK',detail:'Keep moving across the aimed bursts'},
  {at:29,title:'CHANNEL CLEAR',detail:'Collect supplies for weapons and protection · prepare for the counterattack'},
  {at:33,title:'CROSSWIND AMBUSH',detail:'Attackers on both sides · turn to meet them'},
  {at:50,title:'GUARDIAN APPROACHING',detail:'Dodge its charge · flip and attack the opening'}
 ]},
 {waves:[
  {at:3,count:2,type:0,center:380,formation:'line'},
  {at:7,count:3,type:0,center:260,formation:'wedge'},
  {at:10,count:3,type:2,center:480,formation:'line',aimed:true},
  {at:13,count:3,type:0,center:320,formation:'line',aimed:true},
  {at:16,count:2,type:0,center:530,formation:'line'},
  {at:29,count:3,type:0,center:260,formation:'wedge',aimed:true},
  {at:32,count:3,type:2,center:460,formation:'line',aimed:true},
  {at:35,count:3,type:0,center:340,formation:'wedge',aimed:true},
  {at:39,count:3,type:2,center:480,formation:'line',aimed:true},
  {at:42,count:3,type:0,center:280,formation:'line',side:'left',aimed:true},
  {at:45,count:4,type:0,center:390,formation:'wedge',elite:'hunter',aimed:true}
 ],beats:[
  {at:0,title:'ENTER THE FOUNDRY',detail:'Recover the route to Orison · reach the Dreadnought'},
  {at:16,title:'ANSWER THE DISTRESS CALL',detail:'Optional rescue · enter the green ring · gain a sabotage drone'},
  {at:30,title:'PRESSURE LOCKDOWN',detail:'Amber vents warn before firing · pass through the cool gaps'},
  {at:49,title:'DREADNOUGHT APPROACHING',detail:'Break both stabilizers · then circle behind the reactor'}
 ]}
].map(p=>Object.freeze({...p,times:Object.freeze(p.waves.map(w=>w.at))})));
function openingMissionPlan(){const i=storyIndex();return i===0||i===1?OPENING_MISSIONS[i]:null;}
function openingMissionBeat(){const plan=openingMissionPlan();return plan?Math.max(0,plan.beats.findLastIndex(b=>time>=b.at)):-1;}
function openingMissionTask(){
 const plan=openingMissionPlan();if(!plan||storyMission?.complete)return null;
 if(boss){if(boss.siege)return {title:'DISMANTLE THE DREADNOUGHT',detail:capitalSiegeHint(boss)};return {title:boss.exposed>0?'COUNTERATTACK NOW':'DEFEAT THE SKY GUARDIAN',detail:bossEncounterHint(boss)};}
 if(storyIndex()===1&&time>=16&&time<30){const m=ferrumMission;return m?.boarded?{title:'ENGINEER ABOARD',detail:'Drone jams one boss weapon · attack its green opening'}:m?.status==='missed'?{title:'DISTRESS CALL PASSED',detail:'Rescue optional · the route remains open'}:plan.beats[1];}
 return plan.beats[openingMissionBeat()];
}
function updateOpeningMissionHUD(){
 updateOpeningRescueMarker();updateStoryInteractionHUD();
 const el=$('#flightObjective');if(!el)return;const task=openingMissionTask(),visible=!!task&&state==='playing'&&!sectorBlend&&!bossDefeated&&!boss&&annTimer<=0;
 el.hidden=!visible;if(!visible)return;
 hudText('#flightObjectiveTitle',task.title);hudText('#flightObjectiveDetail',task.detail);
}
// Four fixtures, attached to real solid patches on the scrolling shore. Their
// positions and cycles are simulation-time functions; no random per-frame jets.
function openingVentSeat(band,x,offset){
 const border=band.mesh.border,step=border.period/(border.heights.length-1),lo=x-31,hi=x+31;
 let floor=Math.min(sceneryBorderExtent(band,lo,lo,offset),sceneryBorderExtent(band,hi,hi,offset));
 for(let k=Math.ceil((lo-offset)/step);k*step+offset<hi;k++){const u=k*step+offset;floor=Math.min(floor,sceneryBorderExtent(band,u,u,offset));}
 const crest=sceneryBorderExtent(band,lo,hi,offset);
 return {height:floor-7,solid:floor>49&&crest-floor<14};
}
function prepareOpeningJets(){
 getOpeningVentMesh();prepareOpeningJetSteam();const bands=prepareSceneryBorders().layers,jets=[];
 for(let i=0;i<4;i++){
  const at=32+i*3.6,edge=i%2,offset=sceneryBorderOffset((at+sectorIntroLead)*SCROLL_SPEED),band=bands[edge];
  let x=W-260,h=-1;
  for(let n=0;n<81;n++){const candidate=W-260+(n%2?1:-1)*Math.ceil(n/2)*12;if(candidate<W*.45||candidate>W-70)continue;const seat=openingVentSeat(band,candidate,offset);if(seat.solid){x=candidate;h=seat.height;break;}}
  if(h<0)continue;
  jets.push({at,along:x+at*SCROLL_SPEED,y:edge?H-h:h,edge,stage:-1,cycle:-1});
 }
 return jets;
}
function openingJetPose(j){
 const age=time-j.at,x=j.along-time*SCROLL_SPEED,cycle=Math.floor(Math.max(0,age)/5.4),phase=((age%5.4)+5.4)%5.4;
 const stage=age<0||age>17||x<-80||x>W+80?-1:time>=49?2:phase<1.6?0:phase<3.2?1:2;
 // Growth and collapse remain within the amber warning envelope.
 const heat=stage===1?Math.min(1,(phase-1.6)/.15,(3.2-phase)/.2):0;
 return{x,y:j.y,age,cycle,stage,heat,length:250*clamp(heat,0,1),direction:j.edge?-1:1};
}
function openingJetContact(j,p,previous){
 if(p.stage!==1||p.length<4)return false;
 const end=p.y+p.direction*p.length,oldX=j.along-previous.time*SCROLL_SPEED;
 // Relative sweep catches a quick crossing or a vent moving past the hull.
 return segmentBoxTime(previous.x-oldX,previous.y,ship.x-p.x-(previous.x-oldX),ship.y-previous.y,-45,Math.min(p.y,end)-14,45,Math.max(p.y,end)+14)!==Infinity;
}
function updateOpeningMission(){
 const plan=openingMissionPlan(),m=storyMission;if(!plan||!m||m.complete)return;
 const f=m.opening||(m.opening={beat:-1,jets:null,previous:{x:ship.x,y:ship.y,time},retired:false});
 const beat=openingMissionBeat();if(beat!==f.beat){f.beat=beat;const b=plan.beats[beat];if(beat>0&&!(storyIndex()===1&&beat===1)&&!boss)announce(b.title,b.detail,1);}
 if(storyIndex()===1&&time>=19&&!f.rescueClear){f.rescueClear=true;beginEnemyRetreat();}
 if(time>=(storyIndex()===0?50:49)&&!f.retired){f.retired=true;beginEnemyRetreat();}
 if(storyIndex()===1&&!boss&&time>=30&&time<sectors[level].duration){
  if(!f.jets)f.jets=prepareOpeningJets();
  for(const j of f.jets){const p=openingJetPose(j);
   if(p.stage!==j.stage||p.cycle!==j.cycle){if(p.stage===0&&p.x>0&&p.x<W)window.flightAudio?.laserCharge?.(p.x);if(p.stage===1&&p.x>0&&p.x<W)window.flightAudio?.thrusterBurst?.(.45);j.stage=p.stage;j.cycle=p.cycle;}
   if(openingJetContact(j,p,f.previous))damage('environment');
  }
 }
 f.previous.x=ship.x;f.previous.y=ship.y;f.previous.time=time;
}
let openingVentMesh=null;
function getOpeningVentMesh(){
 if(openingVentMesh)return openingVentMesh;const m=meshBuilder();
 const box=(x,y,z,w,h,d,color)=>{
  const q=Math.min(w,h)*.18,points=[[-w/2+q,-h/2],[w/2-q,-h/2],[w/2,-h/2+q],[w/2,h/2-q],[w/2-q,h/2],[-w/2+q,h/2],[-w/2,h/2-q],[-w/2,-h/2+q]];
  const back=points.map(p=>[x+p[0],y+p[1],z+d/2]),rim=points.map(p=>[x+p[0],y+p[1],z-d/2+2]),front=points.map(p=>[x+p[0]*.9,y+p[1]*.9,z-d/2]);
  m.faces.push({v:front,c:color},{v:back.slice().reverse(),c:color.map(v=>v*.6)});
  for(let i=0;i<8;i++){const n=(i+1)%8;m.faces.push({v:[front[i],front[n],rim[n],rim[i]],c:color.map(v=>v*1.15)},{v:[rim[i],rim[n],back[n],back[i]],c:color.map(v=>v*.75)});}
 };
 // Flange and feed pipes extend back into the rock, behind the nozzle.
 box(0,-5,1,62,18,24,[65,70,66]);
 for(const side of [-1,1]){m.tube([[side*19,-30,3],[side*19,-14,0],[side*16,-5,-5]],3.5,[74,66,51],0,0,6,1);box(side*23,-3,-13,5,5,3,[155,139,106]);}
 box(0,0,0,54,16,22,[77,91,94]);box(0,7,-8,46,13,13,[30,39,44]);
 for(let x=-18;x<=18;x+=9)box(x,14,-9,3,6,15,[142,137,112]);
 m.faces.industrial=true;openingVentMesh=m.faces;return openingVentMesh;
}
function drawOpeningMission(){
 if(!openingMissionPlan()||storyIndex()!==1||!storyMission?.opening?.jets)return;
 const steam=prepareOpeningJetSteam();
 for(const j of storyMission.opening.jets){const p=openingJetPose(j);if(p.stage<0)continue;
  drawModel(getOpeningVentMesh(),p.x,p.y,1,0,0,j.edge?Math.PI:0,time);window.gpuModels?.flush(ctx);
  ctx.save();ctx.globalAlpha=1;ctx.translate(p.x,p.y);ctx.scale(1,p.direction);
  const warn=p.stage===0,hot=p.stage===1;
  if(warn){ctx.strokeStyle='#ffc373';ctx.lineWidth=3;ctx.globalAlpha=.8+.15*Math.sin(time*8);ctx.setLineDash([7,9]);ctx.beginPath();ctx.moveTo(0,20);ctx.lineTo(0,250);ctx.stroke();ctx.setLineDash([]);ctx.scale(1,p.direction);const labelY=p.direction*270;ctx.fillStyle='#182029dd';ctx.fillRect(-64,labelY-14,128,20);ctx.fillStyle='#ffd8a3';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText('VENT CHARGING',0,labelY);ctx.scale(1,p.direction);}
  if(hot){const g=ctx.createLinearGradient(0,0,0,p.length||1);g.addColorStop(0,'#fff9e8f0');g.addColorStop(.15,'#ffe2bdb0');g.addColorStop(.55,'#dbb08d40');g.addColorStop(1,'#cb743100');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-10,10);for(let i=0;i<=14;i++){const u=i/14;ctx.lineTo(10+u*4+Math.sin(time*37+i*1.8)*3,u*p.length);}for(let i=14;i>=0;i--){const u=i/14;ctx.lineTo(-10-u*4+Math.sin(time*31+i*1.5)*3,u*p.length);}ctx.closePath();ctx.fill();}
  const count=(window.flightEffectsQuality||1)<.8?5:9;
  for(let i=0;i<count;i++){const u=((time-j.at)*(hot?1.4:.35)+i/count)%1,size=26+u*(hot?54:30);ctx.globalAlpha=(1-u)*(hot?.86:.25)*(time<49?1:clamp(1-(time-49)/3,0,1));ctx.drawImage(steam,Math.sin(u*7+i)*u*13-size/2,15+u*(hot?p.length:70)-size*.35,size,size);}
  ctx.restore();
 }
}

let openingJetSteam=null;
function prepareOpeningJetSteam(){
 if(openingJetSteam)return openingJetSteam;const sprite=document.createElement('canvas');sprite.width=sprite.height=128;const c=sprite.getContext('2d');
 for(let i=0;i<22;i++){const a=i*2.39996,r=9+Math.sqrt(i/22)*30,x=64+Math.cos(a)*r,y=64+Math.sin(a)*r*.8,size=14+i%5*2;const shade=c.createRadialGradient(x-5,y-7,1,x,y,size);shade.addColorStop(0,'#e9dfcba8');shade.addColorStop(.35,'#bfb9ab86');shade.addColorStop(.7,'#767b7555');shade.addColorStop(1,'#545e5b00');c.fillStyle=shade;c.fillRect(x-size,y-size,size*2,size*2);}
 openingJetSteam=sprite;return sprite;
}

let openingMarkerLayout=null,openingMarkerObserver=null;
function updateOpeningRescueMarker(){
 const marker=$('#rescueTarget');if(!marker)return;const m=ferrumMission;
 const visible=storyIndex()===1&&state==='playing'&&!sectorBlend&&m?.status==='active'&&m.x>0&&m.x<W;
 marker.hidden=!visible;if(!visible)return;
 hudText('#rescueTarget strong',m.available===false?'ENGINEER · WAIT FOR CLEARANCE':'RESCUE THE ENGINEER');hudText('#rescueTarget span',m.available===false?'Approach through a clear gap':'Enter green ring · gain a sabotage drone');
 positionOpeningRescueMarker();
}
// Follow the rendered pod every frame; instruction text keeps its slower HUD
// cadence. A transform avoids laying out and repainting scrolling text.
function positionOpeningRescueMarker(){
 const marker=hudElement('#rescueTarget'),m=ferrumMission;if(!marker||marker.hidden||!m)return;
 if(state!=='playing'||sectorBlend||m.status!=='active'||m.x<=0||m.x>=W){marker.hidden=true;return;}
 const b=readFlightMarkerLayout();if(!b)return;
 const x=b.left+clamp(m.x/W*b.width,98,b.width-98),y=b.top+clamp((m.y+FERRUM_RELAY.radius+68)/H*b.height,45,b.height-35);
 marker.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
}

// The final defense and rescue share one centered portal. Only the rescue
// camera moves it; combat coordinates remain anchored while the gate charges.
function storyRescuePan(e){return e.returning?W*.22*navigationEase(e.returnAge/2.4):0;}
function storyRescueWorld(){const e=storyActive()?storyMission?.extract:null;return e?.returning?(e.sceneWorld??world)+storyRescuePan(e):null;}
function storyPortalPhase(e){return{open:e.returning?navigationEase((e.returnAge-1.5)/1.3):0,scale:1+(e.returning?.85*navigationEase(e.returnAge/2.4):0),spin:e.returning?e.age*.28+Math.min(e.returnAge,1.6)*2.8:e.age*.28,charge:e.returning?1:clamp(e.age/32,0,1)};}
function updateStoryEscort(e){
 const u=navigationEase(e.returnAge/2.4),start=e.escortStart||ship;
 if(e.returnAge>=storyPilotLaunchAge()){const p=storyPilotPosition(e);ship.x=p.x;ship.y=p.y;}
 else{ship.x=(start.x-storyRescuePan(e))*(1-u)+W*.80*u;ship.y=start.y*(1-u)+H*.79*u;}
 ship.inv=Math.max(ship.inv,2);pilotTurn.target=Math.PI;
 if(!e.pilotCrossed&&e.returnAge>=storyPilotCrossingAge()){e.pilotCrossed=true;annTimer=0;$('#announcement').style.opacity=0;window.flightAudio?.homecomingCue?.('cross');}
 if(!e.homeArrived&&e.returnAge>=storyPilotCrossingAge()+STORY_PILOT_RETURN.window){e.homeArrived=true;window.flightAudio?.setEnvironment?.('air','verdant');window.flightAudio?.homecomingCue?.('home');}
}
function makeStoryRaider(i){
 const kind=i%5===4?'breaker':i%3===1?'lancer':'skirmisher',heavy=kind==='breaker',left=i%2===1;
 return{storyRaider:true,kind,x:left?-85:W+85,y:125+(i*197)%510,hp:heavy?60:kind==='lancer'?38:28,max:heavy?60:kind==='lancer'?38:28,r:heavy?43:35,scale:heavy?1.18:.94,age:0,seed:i,shotAt:1.4+i%3*.22,shotCount:0,hit:0,contactCooldown:0};
}
function updateStoryRaiders(e,dt){
 if(e.next<=0&&e.spawned<18){e.next=e.spawned%3===2?2.0:1.55;e.raiders.push(makeStoryRaider(e.spawned++));}
 for(const r of e.raiders){if(r.hp<=0)continue;r.contactOldX=r.x;r.contactOldY=r.y;r.age+=dt;r.hit=Math.max(0,(r.hit||0)-dt);r.contactCooldown=Math.max(0,(r.contactCooldown||0)-dt);
  const dx=e.x-r.x,dy=e.y-r.y,len=Math.hypot(dx,dy),speed=r.kind==='breaker'?150:r.kind==='lancer'?175:190,ux=dx/Math.max(1,len),uy=dy/Math.max(1,len),weave=Math.sin(r.age*3.1+(r.seed||0))*48*clamp((len-120)/260,0,1);
  r.x+=(ux*speed-uy*weave)*dt;r.y+=(uy*speed+ux*weave)*dt;
  if(len<80||Math.hypot(e.x-r.x,e.y-r.y)<80){r.hp=0;e.hp--;repairStoryBeacon(e);burst(e.x,e.y,'#ffad72',18);window.flightAudio?.shipHit?.(e.x,false);continue;}
  // Both the moving hull and a fast pilot swipe use relative swept contact.
  if(r.contactCooldown<=0&&pilotHullContactTime(r.contactOldX,r.contactOldY,r.x,r.y,r.r,e.previousShip?.x??ship.x,e.previousShip?.y??ship.y)<=1){damage('collision');r.hp-=10;r.contactCooldown=1;burst(r.x,r.y,'#ff9872',6);}
  if(r.kind!=='skirmisher'&&r.shotCount<2&&r.age>=(r.shotAt??2)&&hostile.length<48&&Math.hypot(r.x-ship.x,r.y-ship.y)>180){aimed(r.x,r.y,400,0,'bolt');hostile.at(-1).c='#ff7865';r.shotCount++;r.shotAt=r.age+2.4;window.flightAudio?.shot?.('pulse',r.x,true);}
 }
 if(!e.previousShip)e.previousShip={x:ship.x,y:ship.y};else{e.previousShip.x=ship.x;e.previousShip.y=ship.y;}
}
let storyRaiderGeometry=null;
function storyRaiderMesh(){
 if(storyRaiderGeometry)return storyRaiderGeometry;const m=meshBuilder();
 m.ellipsoid(0,0,0,39,15,14,[46,56,67],0,20,10);m.ellipsoid(13,0,-11,19,8,6,[112,66,58],0,14,7);
 m.wedge([52,0,-5],[11,-10,-15],[11,10,-15],10,[164,174,177]);
 for(const side of [-1,1]){
  m.wedge([23,side*9,-4],[-33,side*41,3],[-15,side*12,-12],9,[57,67,79]);
  m.wedge([-6,side*12,-12],[-38,side*44,-4],[-25,side*15,-13],3,[173,103,80]);
  m.wedge([-28,side*21,0],[-50,side*32,5],[-36,side*14,-9],6,[103,112,122]);
  m.ellipsoid(-25,side*15,3,14,7,7,[29,35,42],0,12,7);m.ellipsoid(-39,side*15,1,3,5,5,[255,106,68],.8,8,5);
  m.tube([[17,side*8,-14],[-7,side*12,-16],[-20,side*22,-8]],1.8,[225,163,119],0,0,6,1);
  for(let i=0;i<4;i++)m.wedge([-21+i*8,side*9,-13],[-17+i*8,side*15,-13],[-13+i*8,side*9,-13],2,[124,140,151]);
 }
 m.ellipsoid(23,0,-15,8,3,2,[255,86,65],.9,10,5);storyRaiderGeometry=m.faces;storyRaiderGeometry.industrial=true;return storyRaiderGeometry;
}
function drawStoryRaiderEffects(e){
 for(const r of e.raiders){const a=Math.atan2(e.y-r.y,e.x-r.x),size=r.scale||1;ctx.save();ctx.translate(r.x,r.y);ctx.rotate(a);
  for(const side of [-1,1]){const g=ctx.createLinearGradient(-40*size,0,-85*size,0);g.addColorStop(0,'#fff4dce0');g.addColorStop(.3,'#ff856a80');g.addColorStop(1,'#ff593000');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-37*size,side*15*size-4);ctx.lineTo((-76-Math.sin(r.age*31)*9)*size,side*15*size);ctx.lineTo(-37*size,side*15*size+4);ctx.fill();}
  const warning=r.kind!=='skirmisher'&&r.shotCount<2&&r.age>(r.shotAt??2)-.65;if(warning){ctx.fillStyle='#ffe0ac';ctx.globalAlpha=.55+.4*Math.sin(r.age*24)**2;ctx.beginPath();ctx.arc(46*size,0,5,0,TAU);ctx.fill();}ctx.restore();
  if(r.hp<r.max){ctx.fillStyle='#07121c';ctx.fillRect(r.x-25,r.y+50*size,50,4);ctx.fillStyle='#ff997a';ctx.fillRect(r.x-25,r.y+50*size,50*clamp(r.hp/r.max,0,1),4);}
 }
}
let storyPortalFrame=null,storyPortalFront=null,storyPortalRotor=null,storyPortalVista=null,storyPortalDestination=null;
function storyPortalPose(e){return{yaw:-.73+(e.returning?.08*navigationEase(e.returnAge/2.4):0),roll:.06,pitch:-.09};}
function storyPortalProjection(e){
 // The defense pose is fixed. Rescue motion settles after 2.4 seconds.
 // Retain the three basis vectors rather than rotate them for each light point.
 const age=e.returning?Math.min(e.returnAge||0,2.4):0,c=e.portalProjection;
 if(c&&c.returning===!!e.returning&&c.age===age)return c;
 const pose=storyPortalPose(e),scale=storyPortalPhase(e).scale,axes={u:rotateVertex([1,0,0],pose.yaw,pose.roll,pose.pitch,0,0),v:rotateVertex([0,1,0],pose.yaw,pose.roll,pose.pitch,0,0),n:rotateVertex([0,0,1],pose.yaw,pose.roll,pose.pitch,0,0)};
 return e.portalProjection={returning:!!e.returning,age,axes,scale,plane:{a:axes.u[0]*scale,b:axes.u[1]*scale,c:axes.v[0]*scale,d:axes.v[1]*scale,x:axes.n[0]*5*scale,y:axes.n[1]*5*scale}};
}
function storyPortalAxes(e){return storyPortalProjection(e).axes;}
function storyPortalProject(e,x,y,z=5){const {axes:b,scale:s}=storyPortalProjection(e);return{x:(b.u[0]*x+b.v[0]*y+b.n[0]*z)*s,y:(b.u[1]*x+b.v[1]*y+b.n[1]*z)*s};}
function storyPortalPlane(e){return storyPortalProjection(e).plane;}
function storyPortalLightPlane(e,z){const {axes:b,scale:s}=storyPortalProjection(e);ctx.transform(b.u[0]*s,b.u[1]*s,b.v[0]*s,b.v[1]*s,b.n[0]*z*s,b.n[1]*z*s);}
function drawStoryPortalRear(e,p,pose,t){
 const gpu=window.gpuModels,ratio=window.flightRenderScale||1,stamp=e.portalStamp;
 // Only the stationary rear shell is cached. The front bevel and spinning
 // rotor keep their shared depth-tested 3D pass, and rescue is always live.
 if(!e.returning&&stamp?.ratio===ratio){ctx.save();ctx.transform(...stamp.inverse);ctx.drawImage(stamp.image,stamp.x,stamp.y,stamp.w,stamp.h);ctx.restore();return;}
 drawModel(storyPortalFrame,0,0,p.scale,pose.yaw,pose.roll,pose.pitch,t,0);
 const captured=gpu?.flush(ctx,!e.returning&&!!gpu.supportsStamps);
 if(captured){const a=ctx.getTransform(),aa=a.a/ratio,bb=a.b/ratio,cc=a.c/ratio,dd=a.d/ratio,xx=a.e/ratio,yy=a.f/ratio,det=aa*dd-bb*cc;
  if(Math.abs(det)>1e-8)e.portalStamp={...captured,ratio,inverse:[dd/det,-bb/det,-cc/det,aa/det,(cc*yy-dd*xx)/det,(bb*xx-aa*yy)/det]};
 }
}
function storyPortalUndoPlane(e){const m=storyPortalPlane(e),det=m.a*m.d-m.b*m.c;ctx.transform(m.d/det,-m.b/det,-m.c/det,m.a/det,(m.c*m.y-m.d*m.x)/det,(m.b*m.x-m.a*m.y)/det);}
function storyPortalRotorPose(e,spin){
 // Rotate the circular rotor in its own plane before tilting the entire
 // machine. A screen-space rotation would make an oval orbit the frame.
 return storyPortalRotorBasisPose(storyPortalAxes(e),spin);
}
function storyPortalRotorBasisPose(b,spin){
 const c=Math.cos(spin),s=Math.sin(spin),u=b.u.map((n,i)=>n*c+b.v[i]*s),v=b.v.map((n,i)=>-b.u[i]*s+n*c);
 return{roll:Math.asin(clamp(v[2],-1,1)),yaw:Math.atan2(-u[2],b.n[2]),pitch:Math.atan2(-v[0],v[1])};
}
function storyPortalLathe(profile,segments,colors){
 const faces=[];
 for(let i=0;i<segments;i++)for(let j=0;j<profile.length-1;j++){
  const v=(k,p)=>[Math.cos(k/segments*TAU)*p[0],Math.sin(k/segments*TAU)*p[0],p[1]],c=colors[j%colors.length],panel=Math.floor(i/8)%3;
  faces.push({v:[v(i,profile[j]),v(i+1,profile[j]),v(i+1,profile[j+1]),v(i,profile[j+1])],c:c.map(n=>n+panel*3),em:0,flex:0});
 }
 faces.portalMachinery=true;return faces;
}
function storyPortalModule(faces,angle,outline,front,back,color){
 const pt=(p,z)=>[Math.cos(angle)*p[0]-Math.sin(angle)*p[1],Math.sin(angle)*p[0]+Math.cos(angle)*p[1],z];
 faces.push({v:outline.map(p=>pt(p,front)),c:color,em:0,flex:0},{v:outline.map(p=>pt(p,back)).reverse(),c:color.map(n=>n*.5),em:0,flex:0});
 for(let i=0;i<outline.length;i++)faces.push({v:[pt(outline[i],front),pt(outline[(i+1)%outline.length],front),pt(outline[(i+1)%outline.length],back),pt(outline[i],back)],c:color.map(n=>n*.65),em:0,flex:0});
}
function storyPortalRing(radius,width,depth,segments,rotor=false){
 const z=rotor?-6:0,profile=Array.from({length:9},(_,i)=>{const a=i/8*TAU;return[radius+Math.cos(a)*width,z+Math.sin(a)*depth];});
 return storyPortalLathe(profile,segments,rotor?[[101,136,150],[179,161,123]]:[[77,93,109],[123,143,156]]);
}
function createStoryPortalMachine(segments=96,detail=true){
 let frame,front,rotor;
 frame=storyPortalLathe([[111,-8],[127,-8],[131,-5],[131,9],[126,12],[109,12],[107,8],[107,5]],segments,[[76,92,105],[112,131,144],[40,53,67],[55,69,83],[113,127,132],[47,64,76],[86,114,123]]);
 front=storyPortalLathe([[107,5],[109,-6],[113,-11],[127,-11],[131,-7]],segments,[[78,108,117],[116,151,164],[152,170,174],[72,95,111]]);
 const m=meshBuilder();m.ellipsoid(0,0,0,14,21,12,[103,163,184],.2,8,5);
 for(let i=0;i<9;i++){
  const a=i/9*TAU-Math.PI/2,rad=(r,t,z)=>[Math.cos(a)*r-Math.sin(a)*t,Math.sin(a)*r+Math.cos(a)*t,z];
  storyPortalModule(front,a,[[113,-5],[119,-9],[133,-9],[139,-5],[139,5],[133,9],[119,9],[113,5]],-14,-8,[119,142,155]);
  storyPortalModule(front,a,[[120,-6],[132,-6],[135,-3],[135,3],[132,6],[120,6]],-15,-14,[31,47,64]);
  storyPortalModule(front,a,[[114,-2],[121,-3],[125,-2],[125,2],[121,3],[114,2]],-16,-14,[184,151,101]);
  if(detail)for(const side of [-1,1]){
   const p=rad(132,side*7,-15);m.ellipsoid(...p,1.2,1.2,.7,[196,204,200],0,6,4);
   for(let j=0;j<4;j++)storyPortalModule(front,a,[[125+j*2,side*3],[126+j*2,side*3],[126+j*2,side*5],[125+j*2,side*5]],-15.5,-14,[115,148,164]);
  }
  const cable=[];for(let j=0;j<=9;j++){const aa=a+.1+j/9*.48;cable.push([Math.cos(aa)*132,Math.sin(aa)*132,2+Math.sin(j/9*Math.PI)*5]);}if(detail)m.tube(cable,1.1,[115,92,64],0,0,8,1);
 }
 front.push(...m.faces);rotor=storyPortalRing(111,1.3,1.5,segments,true);
 // Sparse cut seams and metallic inlays follow the annulus, rather than a
 // square texture floating across it. Each group lies between the locks.
 for(let i=0;i<27;i++){
  const a=(i+.5)/27*TAU-Math.PI/2;
  storyPortalModule(front,a,[[115,-.3],[126,-.3],[126,.3],[115,.3]],-11.2,-10.8,[39,62,78]);
  if(i%3===1)storyPortalModule(front,a+.025,[[119,-.4],[125,-.4],[125,.4],[119,.4]],-11.4,-11,[162,147,115]);
 }
 for(let i=0;i<24;i++){const a=i/24*TAU;storyPortalModule(rotor,a,[[109,-1.2],[113,-1.2],[114,0],[113,1.2],[109,1.2]],-8,-5,i%3?[64,91,108]:[196,157,96]);}
 // Authored metal shapes provide the panel detail. Suppress the generic
 // square-grid hull shader; fine abrasion comes from the retained bump map.
 for(const mesh of [frame,front,rotor]){mesh.portalMachinery=true;for(const face of mesh)face.textureWeight=0;} return {frame,front,rotor};
}
function buildStoryPortalMachine(){const machine=createStoryPortalMachine();storyPortalFrame=machine.frame;storyPortalFront=machine.front;storyPortalRotor=machine.rotor;}

function prepareStoryDestination(){if(!storyPortalDestination){storyPortalDestination=new Image();storyPortalDestination.src='assets/portal-home-v170.webp';storyPortalDestination.decode?.().catch(()=>{});}return storyPortalDestination;}
function prepareStoryPortal(){
 prepareStoryDestination();
 if(!storyPortalFrame)buildStoryPortalMachine();
 if(!storyPortalVista){
  const c=document.createElement('canvas');c.width=c.height=512;const v=c.getContext('2d'),sky=v.createLinearGradient(0,0,512,512);sky.addColorStop(0,'#080c30');sky.addColorStop(.4,'#173d65');sky.addColorStop(1,'#020920');v.fillStyle=sky;v.fillRect(0,0,512,512);
  for(let i=0;i<38;i++){const x=256+Math.cos(i*2.399)*Math.sqrt(i/38)*225,y=260+Math.sin(i*2.399)*95,r=22+(i%7)*12,g=v.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,i%2?'#a58de938':'#7dfff84a');g.addColorStop(1,'#294f8e00');v.fillStyle=g;v.fillRect(x-r,y-r,r*2,r*2);}
  for(let i=0;i<320;i++){const x=(i*97.13)%512,y=(i*177.31)%512,r=i%19===0?1.9:.65;v.globalAlpha=.3+(i%7)*.1;v.fillStyle=i%3?'#e3f7ff':'#9affec';v.beginPath();v.arc(x,y,r,0,TAU);v.fill();}v.globalAlpha=1;
  // The retained cosmic field is a loading fallback; the home environment
  // image is queued when entering Aureus, before the final guardian fight.
  storyPortalVista=c;
 }
 window.gpuModels?.prepare([storyPortalFrame,storyPortalFront,storyPortalRotor,storyRaiderMesh()],sectors[level].id);
}
function drawStoryApproachingCarriers(e){
 ctx.save();
 for(let i=0;i<5;i++){
  const p=storyCarrierPosition(e,i);if(p.u<=0||p.u>=1)continue;
  window.gpuModels?.setEnvironmentBlend?.(sceneryLighting(sectors[level]),'daylight',navigationEase((p.u-.65)/.35));
  const pose=storyCarrierTransitPose(e,i),nose=rotateVertex([1,0,0],pose.yaw,pose.roll,pose.pitch,0,0);
  drawStoryReturnEngines(e,{...p,wake:Math.atan2(-nose[1],-nose[0])},pose,false);
  drawModel(storyCarrierMesh(i),p.x,p.y,p.scale,pose.yaw,pose.roll,pose.pitch,e.returnAge,0);window.gpuModels?.flush(ctx);
 }
 window.gpuModels?.flush(ctx);window.gpuModels?.setEnvironment?.(sceneryLighting(sectors[level]));
 for(let i=0;i<5;i++){const p=storyCarrierPosition(e,i);if(p.u<=0||p.u>=.9)continue;ctx.globalAlpha=1-navigationEase((p.u-.72)/.18);ctx.fillStyle='#071b28cf';ctx.fillRect(p.x-37,p.y+20,74,16);ctx.fillStyle='#c4fff0';ctx.font='600 9px system-ui';ctx.textAlign='center';ctx.fillText('FRIENDLY',p.x,p.y+31);}
 const pilot=storyPilotPosition(e);if(e.returnAge>=storyPilotLaunchAge()&&pilot.u<1){ctx.globalAlpha=1;window.gpuModels?.setEnvironmentBlend?.(sceneryLighting(sectors[level]),'daylight',navigationEase(pilot.u));drawStoryHomewardPilot(e,pilot);window.gpuModels?.flush(ctx);window.gpuModels?.setEnvironment?.(sceneryLighting(sectors[level]));}
 ctx.restore();
}
function drawStoryHomewardPilot(e,p,cameraTurn=0){
 const pose=storyPilotTransitPose(e,cameraTurn);drawStoryReturnEngines(e,p,pose,true);
 drawModel(meshes[power===3?'player3':power===2?'player2':'player'],p.x,p.y,p.scale,pose.yaw,pose.roll,pose.pitch,e.returnAge,0);
}
function storyPassageEnvelope(age){return Math.sin(Math.PI*clamp(age/1.25,0,1))**2;}
function storyPortalPassages(e){
 if(!e.returning)return[];const passages=[];
 for(let i=0;i<5;i++){const age=e.returnAge-storyCarrierCrossingAge(i);if(age>=0&&age<1.25)passages.push({x:storyCarrierEntry(e,i).localX,y:storyCarrierEntry(e,i).localY,age,life:1-age/1.25,strength:storyPassageEnvelope(age)});}
 const age=e.returnAge-storyPilotCrossingAge();if(age>=0&&age<1.25){const p=storyPilotEntry(e);passages.push({x:p.localX,y:p.localY,age,life:1-age/1.25,strength:storyPassageEnvelope(age)});}
 return passages;
}
function drawStoryCarriersBeyond(e,open){
 if(!e.returning||!open)return;ctx.save();storyPortalUndoPlane(e);window.gpuModels?.setEnvironment?.('daylight');
 for(let i=0;i<5;i++){const p=storyCarrierBeyond(e,i);if(!p.visible)continue;ctx.globalAlpha=p.alpha*open;drawStoryReturningCarrier(e,p,i);}
 const pilot=storyPilotBeyond(e);if(pilot.visible){ctx.globalAlpha=pilot.alpha*open;drawStoryHomewardPilot(e,pilot);}
 window.gpuModels?.flush(ctx);window.gpuModels?.setEnvironment?.(sceneryLighting(sectors[level]));ctx.restore();
}
function drawStoryReturnEngines(e,p,pose,pilot){
 const span=pilot?19:13,tail=pilot?-42:-32;
 for(const side of [-1,1]){
  const nozzle=rotateVertex([tail,side*span,pilot?0:2],pose.yaw,pose.roll,pose.pitch,0,0),x=p.x+nozzle[0]*p.scale,y=p.y+nozzle[1]*p.scale,length=(pilot?58:34)*p.scale,angle=p.wake??Math.atan2(p.y-storyPortalProject(e,19,-31).y,p.x-storyPortalProject(e,19,-31).x),tx=x+Math.cos(angle)*length,ty=y+Math.sin(angle)*length;
  const plume=ctx.createLinearGradient(x,y,tx,ty);plume.addColorStop(0,'#f3fcffde');plume.addColorStop(.2,'#a4e4ffa0');plume.addColorStop(1,'#88dfff00');ctx.fillStyle=plume;ctx.beginPath();ctx.moveTo(x-Math.sin(angle)*3*p.scale,y+Math.cos(angle)*3*p.scale);ctx.lineTo(tx,ty);ctx.lineTo(x+Math.sin(angle)*3*p.scale,y-Math.cos(angle)*3*p.scale);ctx.fill();
  const r=5.5*p.scale,glow=ctx.createRadialGradient(x,y,0,x,y,r);glow.addColorStop(0,'#f5ffffef');glow.addColorStop(.25,'#b9ecffb0');glow.addColorStop(1,'#7ed4ff00');ctx.fillStyle=glow;ctx.fillRect(x-r,y-r,r*2,r*2);
 }
}
function drawStoryReturningCarrier(e,p,i,cameraTurn=0){
 const pose=storyCarrierTransitPose(e,i,cameraTurn);drawStoryReturnEngines(e,p,pose,false);drawModel(storyCarrierMesh(i),p.x,p.y,p.scale,pose.yaw,pose.roll,pose.pitch,e.returnAge,0);
}
let storyPortalFilm=null,storyPortalRevealCanvas=null,storyPortalSurfaceCanvas=null,storyPortalSurfaceBrush=null,storyPortalSurfaceAge=null,storyPortalSurfaceOwner=null,storyPortalSurfaceSource=null;
function prepareStoryPortalFilm(){
 if(storyPortalFilm)return storyPortalFilm;
 const c=document.createElement('canvas');c.width=c.height=256;const v=c.getContext('2d'),pixels=v.createImageData(256,256);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const field=Math.sin(x*.035+Math.sin(y*.046)*2.4)+Math.sin(y*.041+Math.cos(x*.027)*3.1)+.45*Math.sin((x+y)*.083),wave=(.5+.5*Math.sin(field*3+Math.hypot(x-128,y-128)*.063))**3,light=(.5+.5*Math.sin(field*1.7))*.35,index=(y*256+x)*4;
  pixels.data[index]=9+wave*80+light*34;pixels.data[index+1]=31+wave*122+light*55;pixels.data[index+2]=61+wave*150+light*70;pixels.data[index+3]=255;
 }
 v.putImageData(pixels,0,0);return storyPortalFilm=c;
}
function storyPortalSurfaceState(e){
 const open=storyPortalPhase(e).open,age=e.returnAge,arrival=Math.max(0,age-storyPilotCrossingAge());
 return{open,charge:navigationEase((age-.35)/.85),surge:Math.sin(Math.PI*clamp((age-.65)/1.65,0,1))**2,veil:(.035+.82*(1-open)**1.7)*(1-navigationEase(arrival/2.8)),distortion:(1-open)*3.5};
}
function drawStoryPortalSurface(e,ctx){
 const t=e.returnAge,s=storyPortalSurfaceState(e),film=prepareStoryPortalFilm(),photo=storyPortalDestination?.complete&&storyPortalDestination.naturalWidth?storyPortalDestination:storyPortalVista;
 ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle='#071b31';ctx.fillRect(-104,-104,208,208);
 // The home vista emerges through the membrane from its center, with a
 // soft edge. The same surface is used before and during the camera turn.
 if(s.open>0){
  let panorama=photo;
  if(s.open<1){
   if(!storyPortalRevealCanvas){storyPortalRevealCanvas=document.createElement('canvas');storyPortalRevealCanvas.width=storyPortalRevealCanvas.height=768;}
   const c=storyPortalRevealCanvas,v=c.getContext('2d'),edge=s.open*630,inner=Math.max(0,edge-135);v.clearRect(0,0,768,768);v.globalCompositeOperation='source-over';v.drawImage(photo,0,0,768,768);
   const reveal=v.createRadialGradient(384,384,inner,384,384,edge+75);reveal.addColorStop(0,'#ffffff');reveal.addColorStop(.5,'#ffffffd0');reveal.addColorStop(1,'#ffffff00');v.globalCompositeOperation='destination-in';v.fillStyle=reveal;v.fillRect(0,0,768,768);v.globalCompositeOperation='source-over';panorama=c;
  }
  ctx.globalAlpha=1;ctx.drawImage(panorama,-104,-104,208,208);
  if(s.distortion>0){const sourceW=panorama.naturalWidth||panorama.width,sourceH=panorama.naturalHeight||panorama.height;ctx.globalAlpha=.3*s.open*(1-s.open);for(let i=0;i<24;i++){const shift=Math.sin(i*.61-t*1.9)*s.distortion;ctx.drawImage(panorama,0,i*sourceH/24,sourceW,sourceH/24,-104+shift,-104+i*208/24,208,208/24+.5);}}
 }
 if(s.veil>0){
  ctx.globalAlpha=s.veil*(.32+s.charge*.68);ctx.save();ctx.rotate(t*.22);ctx.drawImage(film,-155,-155,310,310);ctx.restore();
  ctx.globalCompositeOperation='screen';ctx.globalAlpha=s.veil*.32;ctx.save();ctx.rotate(-t*.31+.8);ctx.transform(1,.12,-.07,1,0,0);ctx.drawImage(film,-160,-160,320,320);ctx.restore();
  // Continuous contours do not wrap or restart at full brightness.
  for(let i=0;i<9;i++){const radius=12+i*11,glint=.5+.5*Math.sin(t*1.6-i*.7);ctx.globalAlpha=s.veil*(.035+glint*.065);ctx.lineWidth=1.1;ctx.strokeStyle=i%2?'#97dbef':'#8fafe6';ctx.beginPath();for(let j=0;j<=72;j++){const a=j/72*TAU,r=radius+(3+s.surge*7)*Math.sin(a*3-t*1.4+i*.5)+2*Math.sin(a*7+t*.7);const x=Math.cos(a)*r,y=Math.sin(a)*r;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.stroke();}
  // Offset light and shadow give the fluid dome depth as it energizes.
  const light=ctx.createRadialGradient(-28,-35,4,0,0,115);light.addColorStop(0,'#caf9ff70');light.addColorStop(.4,'#7edeee30');light.addColorStop(1,'#061a3d00');ctx.globalAlpha=s.veil*(.45+s.surge*.5);ctx.fillStyle=light;ctx.fillRect(-104,-104,208,208);
 }
 ctx.restore();
}
// Rasterize the water, image and entry shimmer in a local opaque surface.
// Keep the photo and faint ripples in local pixels before projecting them.
// The recorded white frames occurred while compositing this transformed view.
function storyPortalSurfaceSize(){
 // Largest stretch of the current projection, including framebuffer scale.
 const m=ctx.getTransform?.();if(!m||!Number.isFinite(m.a))return 768;
 const aa=m.a*m.a+m.b*m.b,bb=m.c*m.c+m.d*m.d,ab=m.a*m.c+m.b*m.d;
 const diameter=208*Math.sqrt((aa+bb+Math.hypot(aa-bb,2*ab))/2)*1.1;
 return [256,384,512,768].find(size=>size>=diameter)||768;
}
function drawStoryPortalPane(e){
 if(!storyPortalSurfaceCanvas){
  storyPortalSurfaceCanvas=document.createElement('canvas');
  storyPortalSurfaceBrush=storyPortalSurfaceCanvas.getContext('2d',{alpha:false,willReadFrequently:true});
 }
 // Grow in a few steps during entry; never oscillate with small changes in
 // quality or pose. Repaint a resized surface before copying it to the scene.
 const size=Math.max(storyPortalSurfaceOwner===e?storyPortalSurfaceCanvas.width:0,storyPortalSurfaceSize());
 const resized=storyPortalSurfaceCanvas.width!==size;
 if(resized)storyPortalSurfaceCanvas.width=storyPortalSurfaceCanvas.height=size;
 // Paused frames reuse the same bitmap; active frames share one surface clock.
 const passages=storyPortalPassages(e),surface=storyPortalSurfaceState(e),ageKey=surface.open===1&&surface.veil===0&&passages.length===0?'home':e.returnAge,source=storyPortalDestination?.complete&&storyPortalDestination.naturalWidth?storyPortalDestination:storyPortalVista;
 if(resized||storyPortalSurfaceOwner!==e||storyPortalSurfaceAge!==ageKey||storyPortalSurfaceSource!==source){
  const c=storyPortalSurfaceBrush,scale=size/208;c.setTransform(scale,0,0,scale,size/2,size/2);c.globalAlpha=1;c.globalCompositeOperation='source-over';
  drawStoryPortalSurface(e,c);drawStoryPortalPassageShimmer(passages,1,c);storyPortalSurfaceAge=ageKey;storyPortalSurfaceOwner=e;storyPortalSurfaceSource=source;
 }
 ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;ctx.filter='none';ctx.drawImage(storyPortalSurfaceCanvas,-104,-104,208,208);ctx.restore();
}
// The camera follows the pilot through the same projected aperture. The
// expanding window masks the old world before revealing the home panorama.
// Everything uses the rescue clock, so pausing holds the entire finale.
function drawStoryHomecoming(e){
 if(!e?.returning)return;
 if(!storyPortalFrame)prepareStoryPortal();
 const h=storyHomecoming(e),gate=storyGatePosition(e),plane=storyHomecomingProjection(e,h).plane,view=storyHomecomingView(e,h),cx=view.cx,cy=view.cy,z=h.zoom;
 // Keep the actual machine around the aperture during the camera push.
 // Its near and far rim share the window's exact scale and center, and
 // leave the viewport only when the camera has physically passed through.
 if(h.u<1)drawStoryHomecomingFrame(e,h,cx,cy,false);
 ctx.save();ctx.beginPath();
 for(let i=0;i<=80;i++){const a=i/80*TAU,x=104*Math.cos(a),y=104*Math.sin(a),px=cx+(plane.a*x+plane.c*y+plane.x)*z,py=cy+(plane.b*x+plane.d*y+plane.y)*z;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.clip();
 ctx.save();ctx.transform(view.a,view.b,view.c,view.d,view.x,view.y);
 drawStoryPortalPane(e);ctx.restore();
 // Animated reflections anchor the arrival in the lake, rather than a still
 // postcard. A bounded set of ripples avoids allocating a particle system.
 ctx.globalAlpha=h.reveal*.20;ctx.strokeStyle='#e2fff7';ctx.lineWidth=1;
 for(let i=0;i<22;i++){const y=H*(.48+i*.024),x=W*(.48+Math.sin(i*2.39+h.age*.4)*.08),w=W*(.015+i*.0015);ctx.beginPath();ctx.moveTo(x-w,y);ctx.quadraticCurveTo(x,y+Math.sin(h.age*3+i)*2,x+w,y);ctx.stroke();}
 window.gpuModels?.setEnvironment?.('daylight');
 for(let i=0;i<5;i++){const p=storyHomecomingCraft(e,storyCarrierBeyond(e,i),h,view);if(p.visible){ctx.globalAlpha=p.alpha;drawStoryReturningCarrier(e,p,i,h.turn);}}
 const pilot=storyHomecomingCraft(e,storyPilotBeyond(e),h,view);if(pilot.visible){ctx.globalAlpha=pilot.alpha;drawStoryHomewardPilot(e,pilot,h.turn);}
 window.gpuModels?.flush(ctx);window.gpuModels?.setEnvironment?.(sceneryLighting(sectors[level]));
 const title=navigationEase((h.arrival-.5)/1.2);if(title>0){
  ctx.globalAlpha=title;const shade=ctx.createLinearGradient(0,H*.57,0,H);shade.addColorStop(0,'#0b233800');shade.addColorStop(1,'#061a35b3');ctx.fillStyle=shade;ctx.fillRect(0,H*.57,W,H*.43);
 }

 ctx.restore();
 if(h.u<1)drawStoryHomecomingFrame(e,h,cx,cy,true);
 if(e.returnAge<storyPilotCrossingAge())drawStoryApproachingCarriers(e);
}
function drawStoryHomecomingFrame(e,h,x,y,front){
 const p=storyPortalPhase(e),projection=storyHomecomingProjection(e,h),pose=projection.pose,scale=p.scale*h.zoom;
 ctx.save();ctx.translate(x,y);window.gpuModels?.setEnvironment?.('portal');
 if(front){
  const rotor=storyPortalRotorBasisPose(projection.axes,p.spin+p.open*e.returnAge*.25);
  drawModel(storyPortalFront,0,0,scale,pose.yaw,pose.roll,pose.pitch,e.returnAge,0);
  drawModel(storyPortalRotor,0,0,scale,rotor.yaw,rotor.roll,rotor.pitch,e.returnAge,0);
 }else drawModel(storyPortalFrame,0,0,scale,pose.yaw,pose.roll,pose.pitch,e.returnAge,0);
 window.gpuModels?.flush(ctx);
 if(front){
  const b=projection.axes;ctx.transform(b.u[0]*scale,b.u[1]*scale,b.v[0]*scale,b.v[1]*scale,b.n[0]*-8*scale,b.n[1]*-8*scale);
  ctx.strokeStyle='#c7fff3';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,0,107.5,0,TAU);ctx.stroke();
 }
 window.gpuModels?.setEnvironment?.(sceneryLighting(sectors[level]));ctx.restore();
}
function drawStoryPortalPassageShimmer(passages,scale,brush){
 const context=brush||ctx;
 context.save();context.globalCompositeOperation='screen';
 for(const p of passages){
  const strength=storyPassageEnvelope(p.age),radius=(13+p.age*38)*scale,g=context.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);
  g.addColorStop(0,`rgba(174,239,255,${strength*.13})`);g.addColorStop(.4,`rgba(115,229,255,${strength*.09})`);g.addColorStop(1,'#83dfff00');context.globalAlpha=1;context.fillStyle=g;context.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);
  const r=(3+p.age*75)*scale;context.globalAlpha=strength*.27;context.strokeStyle='#b3efff';context.lineWidth=1.4*scale;context.beginPath();
  for(let j=0;j<=64;j++){const a=j/64*TAU,w=1+.025*Math.sin(a*7-p.age*5),x=p.x+Math.cos(a)*r*w,y=p.y+Math.sin(a)*r*1.12*w;j?context.lineTo(x,y):context.moveTo(x,y);}context.closePath();context.stroke();
 }
 context.restore();
}
function drawStoryGate(e){
 if(!storyPortalFrame)prepareStoryPortal();const g=storyGatePosition(e),p=storyPortalPhase(e),pose=storyPortalPose(e),rotor=storyPortalRotorPose(e,p.spin+p.open*(e.returnAge||0)*.25),t=e.returning?e.returnAge:e.age,passages=storyPortalPassages(e),panorama=storyPortalDestination?.complete&&storyPortalDestination.naturalWidth?storyPortalDestination:storyPortalVista,sourceW=panorama.naturalWidth||panorama.width,sourceH=panorama.naturalHeight||panorama.height,surfaceFade=e.returning?1-navigationEase((e.returnAge-storyPilotCrossingAge()+.8)/.8):1;
 ctx.save();ctx.translate(g.x,g.y);
 const radius=175*p.scale,halo=ctx.createRadialGradient(0,0,90*p.scale,0,0,radius);halo.addColorStop(0,`rgba(120,226,247,${.04+p.open*.12})`);halo.addColorStop(1,'#69caff00');ctx.fillStyle=halo;ctx.fillRect(-radius,-radius,radius*2,radius*2);
 window.gpuModels?.setEnvironment?.('portal');drawStoryPortalRear(e,p,pose,t);
 // The destination, water, carrier ripple and lens all share the same
 // projected circular plane, recessed behind a shallow physical throat.
 ctx.save();const plane=storyPortalPlane(e);ctx.transform(plane.a,plane.b,plane.c,plane.d,plane.x,plane.y);const rx=104,ry=104;
 ctx.save();ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,TAU);ctx.clip();ctx.fillStyle='#050d20';ctx.fillRect(-rx,-ry,rx*2,ry*2);
 if(p.open>0){ctx.globalAlpha=p.open;ctx.drawImage(panorama,-ry,-ry,ry*2,ry*2);
  // Subtle whole-window refraction stays transparent enough to reveal the
  // rendered destination. The river has its own visible flowing reflection.
  for(let i=0;i<18;i++){const y=-ry+i*ry/9;let shift=Math.sin(i*.9-t*2.6)*1.1;for(const hit of passages)shift+=Math.sin((y-hit.y)*.06-hit.age*18)*Math.exp(-Math.abs(y-hit.y)/(38*1))*hit.strength*4;ctx.globalAlpha=.18*p.open*surfaceFade;ctx.drawImage(panorama,0,i*sourceH/18,sourceW,sourceH/18,-ry+shift,y,ry*2,ry/9+1);}
  ctx.save();ctx.beginPath();ctx.moveTo(-rx*.16,-ry*.12);ctx.lineTo(rx*.22,-ry*.12);ctx.lineTo(rx*.70,ry);ctx.lineTo(-rx*.75,ry);ctx.closePath();ctx.clip();
  for(let i=9;i<24;i++){const u=i/24,shift=Math.sin(u*35-t*3.4)*1.9*1;ctx.globalAlpha=.22*p.open*surfaceFade;ctx.drawImage(panorama,0,u*sourceH,sourceW,sourceH/24,-ry+shift,-ry+u*ry*2,ry*2,ry/12+1);}
  ctx.restore();ctx.strokeStyle='#edfff9';ctx.lineWidth=.8*1;
  for(const f of [{x:.59,y:.345,h:.10},{x:.72,y:.345,h:.16},{x:.83,y:.31,h:.26},{x:.20,y:.35,h:.18}])for(let i=0;i<5;i++){const u=(t*.75+i/5)%1,x=(f.x-.5)*ry*2+Math.sin(i*2.3)*2*1,y=(f.y-.5+u*f.h)*ry*2;ctx.globalAlpha=.23*p.open*surfaceFade*Math.sin(u*Math.PI)**2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+.6*1,y+5*1);ctx.stroke();}
  drawStoryCarriersBeyond(e,p.open);
  // Uneven traveling wavefronts move across the glassy aperture, rather
  // than turning the vista into a uniform set of concentric target circles.
  ctx.globalCompositeOperation='screen';for(let i=0;i<6;i++){const u=(t*.22+i/6)%1,r=Math.max(1,u*rx);ctx.globalAlpha=Math.sin(u*Math.PI)**2*.16*p.open*surfaceFade;ctx.strokeStyle=i%2?'#b4feff':'#c5b7ff';ctx.lineWidth=(1-u)*2+1;ctx.beginPath();for(let j=0;j<=56;j++){const a=j/56*TAU,wave=1+.04*Math.sin(a*5+t*3+i),x=Math.cos(a)*r*wave,y=Math.sin(a)*r*ry/rx*wave;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.stroke();}
  ctx.strokeStyle='#c9ffff';ctx.lineWidth=1;for(let i=0;i<30;i++){const a=i*2.399+t*.18,u=((t*.14+i*.618)%1),r=(.2+u*.8)*rx;ctx.globalAlpha=.55*p.open*surfaceFade*Math.sin(u*Math.PI)**2;ctx.beginPath();ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r*ry/rx);ctx.lineTo(Math.cos(a)*r*(1+.06*u),Math.sin(a)*r*ry/rx*(1+.06*u));ctx.stroke();}
  drawStoryPortalPassageShimmer(passages,1);
 }
 ctx.restore();ctx.globalAlpha=1;
 ctx.restore();
 // Foreground bevels and locks genuinely occlude the rear window. This pass
 // exposes the asymmetric near/far rim instead of drawing a flat oval on top.
 window.gpuModels?.setEnvironment?.('portal');drawModel(storyPortalFront,0,0,p.scale,pose.yaw,pose.roll,pose.pitch,t,0);drawModel(storyPortalRotor,0,0,p.scale,rotor.yaw,rotor.roll,rotor.pitch,t,0);window.gpuModels?.flush(ctx);
 ctx.save();const b=storyPortalAxes(e);ctx.transform(b.u[0]*p.scale,b.u[1]*p.scale,b.v[0]*p.scale,b.v[1]*p.scale,b.n[0]*-16*p.scale,b.n[1]*-16*p.scale);
 for(let i=0;i<9;i++){const a=i/9*TAU-Math.PI/2,on=i/9<=p.charge;ctx.save();ctx.rotate(a);ctx.fillStyle=on?'#d5fff2':'#527481';ctx.fillRect(117,-1,7,2);if(on){ctx.globalCompositeOperation='screen';const light=ctx.createRadialGradient(121,0,0,121,0,11);light.addColorStop(0,`rgba(117,245,238,${.24+p.open*.15})`);light.addColorStop(1,'#7ceeff00');ctx.fillStyle=light;ctx.fillRect(110,-11,22,22);}ctx.restore();}
 ctx.restore();
 // Recessed luminous rails spill moving light onto the machined inner edge.
 ctx.save();ctx.globalCompositeOperation='screen';
 ctx.save();storyPortalLightPlane(e,-6);
 for(let i=0;i<3;i++){ctx.strokeStyle=i===0?'#d4ffef':'#65d2ec';ctx.globalAlpha=(.35+p.open*.45)/(i+1);ctx.lineWidth=i===0?1.6:4;ctx.beginPath();ctx.arc(0,0,107.5+i*.35,0,TAU);ctx.stroke();}ctx.restore();
 ctx.save();storyPortalLightPlane(e,-8);
 for(let i=0;i<4;i++){ctx.globalAlpha=.4+p.open*.45;ctx.lineWidth=2;ctx.strokeStyle=i%2?'#9eefff':'#e0fff1';const a=t*.7+i*TAU/4;ctx.beginPath();ctx.arc(0,0,112,a,a+.2);ctx.stroke();}ctx.restore();
 const bloom=e.returning?Math.sin(clamp((t-1.3)/1.2,0,1)*Math.PI)*.35:0;if(bloom>0){const light=ctx.createRadialGradient(0,0,5,0,0,radius);light.addColorStop(0,`rgba(223,255,255,${bloom})`);light.addColorStop(1,'#7b9cff00');ctx.globalAlpha=1;ctx.fillStyle=light;ctx.fillRect(-radius,-radius,radius*2,radius*2);}
 ctx.restore();window.gpuModels?.setEnvironment?.(sceneryLighting(sectors[level]));
 if(e.repairGlow>0){ctx.save();storyPortalLightPlane(e,0);ctx.globalAlpha=e.repairGlow/2;ctx.strokeStyle='#b8ffe4';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,175+(2-e.repairGlow)*35,0,TAU);ctx.stroke();ctx.restore();}
 ctx.restore();
}
function updateStoryPortalHUD(){
 const marker=$('#portalObjective'),e=storyMission?.extract,visible=storyActive()&&!!e&&state==='playing'&&!sectorBlend&&!storyMission.complete;
 if(!marker)return;marker.hidden=!visible||e.returnAge>=storyPilotCrossingAge();if(marker.hidden)return;
 hudText('#portalObjective strong',e.returning?(e.returnAge<2.5?'PORTAL SECURED · OPENING HOME':e.returnAge>=storyPilotLaunchAge()?'YOUR TURN · HEADING HOME':'BRINGING YOUR PEOPLE HOME'):'DEFEND THE PORTAL · SAVE YOUR PEOPLE');
 hudText('#portalObjective span',e.returning?`FRIENDLY CARRIERS ${e.evacuated}/5 · WEAPONS SAFE`:`BOTH SIDES · INTEGRITY ${e.hp}/${e.max}${e.age<32?' · '+Math.ceil(32-e.age)+'s':' · CLEAR THE APPROACH'}`);
 positionStoryPortalMarker();
}
function positionStoryPortalMarker(){
 const marker=hudElement('#portalObjective'),m=storyMission,e=m?.extract;
 if(!marker||marker.hidden)return;
 if(!e||state!=='playing'||sectorBlend||m.complete||e.returnAge>=storyPilotCrossingAge()){marker.hidden=true;return;}
 const g=storyGatePosition(e),p=storyPortalPhase(e),b=readFlightMarkerLayout();if(!b)return;
 const x=b.left+g.x/W*b.width,y=clamp(b.top+(g.y+156*p.scale)/H*b.height,0,b.frameHeight-48);
 marker.style.transform=`translate3d(${x}px,${y}px,0) translateX(-50%)`;
}
function positionHomecomingCaption(){
 const caption=hudElement('#homecomingCaption');if(!caption)return;
 const e=storyActive()?storyMission?.extract:null,visible=e?.returning&&['playing','paused'].includes(state)&&e.returnAge>storyPilotCrossingAge()+STORY_PILOT_RETURN.window+.5;
 caption.hidden=!visible;if(!visible)return;
 const progress=navigationEase((storyHomecoming(e).arrival-.5)/1.2);caption.style.opacity=progress;caption.style.transform=`translate3d(0,${(1-progress)*12}px,0)`;
}
function positionFlightMarkers(){
 positionOpeningRescueMarker();positionStoryInteractionMarker();positionStoryPortalMarker();positionHomecomingCaption();
}
let campaignBriefView=null;
function campaignBriefVisible(){return state==='title'&&atlasOpen&&!!campaignBriefView&&$('#overlay').classList.contains('campaign-intro');}
function prepareCampaignBrief(index){
 const mission=STORY_ROUTE[index],definition=sectors.find(s=>s.id===mission.id);
 queueSectorArt(definition);
 campaignBriefView={index,definition,owner:storyStore.account(),progress:storyStore.snapshot().count,image:loadArt(definition.background),cloud:definition.medium==='air'&&!definition.stellar&&definition.theme!=='forge'?loadArt('shoreCloud'):null,startedAt:navigationSeconds(),reducedMotion:typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches};
 window.gpuModels?.prepare?.([meshes.player2],definition.id);
 return campaignBriefView;
}
function campaignBriefPose(view=campaignBriefView,seconds=navigationSeconds()){
 const t=view.reducedMotion?0:Math.max(0,seconds-view.startedAt);
 return{t,x:W*.25+Math.sin(t*.32)*22,y:H*.47+Math.sin(t*.7)*12,panX:Math.sin(t*.07)*W*.025,panY:Math.sin(t*.05)*H*.015};
}
function drawCampaignBriefScene(){
 const view=campaignBriefView;if(!view)return;const {definition:d,image,cloud}=view,p=campaignBriefPose(),t=p.t,water=d.medium==='water',hot=d.stellar||d.theme==='forge',ice=d.worldIdentity?.habitat==='ice';
 window.gpuModels?.setEnvironment?.(sceneryLighting(d));
 ctx.save();
 // The destination painting and ship move at different depths. Only the
 // current preview is loaded; no combat state or world position is changed.
 if(imageReady(image)){const scale=Math.max(W*.84/image.naturalWidth,H/image.naturalHeight)*1.08,w=image.naturalWidth*scale,h=image.naturalHeight*scale;ctx.drawImage(image,(W*.84-w)*.5+p.panX,(H-h)*.5+p.panY,w,h);}
 else{const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,water?'#154857':hot?'#542f22':'#355367');sky.addColorStop(1,'#061623');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);}
 const shade=ctx.createLinearGradient(0,0,W*.9,0);shade.addColorStop(0,'#05111c14');shade.addColorStop(.46,'#05111c22');shade.addColorStop(.72,'#05111cbb');shade.addColorStop(1,'#030c15');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
 const vignette=ctx.createLinearGradient(0,0,0,H);vignette.addColorStop(0,'#03101b80');vignette.addColorStop(.25,'#03101b00');vignette.addColorStop(.58,'#03101b00');vignette.addColorStop(1,'#03101be8');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
 if(water){
  ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<4;i++){const x=W*(.08+i*.12)+Math.sin(t*.16+i)*12;ctx.save();ctx.translate(x,-H*.03);ctx.rotate(-.16);ctx.scale(42,H*.85);const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,'#b4e8ef25');g.addColorStop(.45,'#82e6e910');g.addColorStop(1,'#82e6e900');ctx.fillStyle=g;ctx.fillRect(-1,0,2,1);ctx.restore();}ctx.restore();
 }
 if(imageReady(cloud)){ctx.save();ctx.globalAlpha=.24;for(let i=0;i<3;i++){const x=W*(.07+i*.19)+Math.sin(t*.045+i)*35,y=H*(.39+i*.13),w=W*(.20+i*.035);ctx.drawImage(cloud,x-w/2,y,w,w*.43);}ctx.restore();}
 // Persistent drifting motes use edge fades instead of sudden expiry.
 for(let i=0;i<38;i++){const depth=.25+(i%5)*.18,u=((i*.618+t*(hot?.026:water?.011:.004)*(1+depth))%1+1)%1,x=W*(.025+(i*.381966%1)*.57)+Math.sin(t*.35+i)*7*depth,y=H*(1-u),alpha=Math.sin(u*Math.PI)*(.13+depth*.21);ctx.globalAlpha=alpha;ctx.strokeStyle=ice?'#d9f0ff':hot?'#ffd5a0':water?'#c0f1ed':'#effaf4';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=.8;ctx.beginPath();if(water&&!ice){ctx.arc(x,y,1.5+depth*2.4,0,TAU);ctx.stroke();}else{ctx.ellipse(x,y,hot?1.2:1.6,hot?3.5:1.6,0,0,TAU);ctx.fill();}}
 ctx.globalAlpha=1;
 const light=ctx.createRadialGradient(p.x,p.y,12,p.x,p.y,200);light.addColorStop(0,hot?'#ffb27c14':'#9dedff18');light.addColorStop(1,'#80dfff00');ctx.fillStyle=light;ctx.fillRect(p.x-200,p.y-200,400,400);
 drawShip(p.x,p.y,3.2,true,t);window.gpuModels?.flush(ctx);
 // Nearby spray/embers cross the ship at a faster depth than the landscape.
 ctx.globalAlpha=.3;ctx.strokeStyle=water?'#b9f3ed':hot?'#ffd1a1':'#e7faf8';ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<10;i++){const u=(i*.618+t*.055)%1,x=W*.57-u*W*.6,y=H*(.31+(i*.271%1)*.35);ctx.moveTo(x,y);ctx.lineTo(x+7,y+1);}ctx.stroke();ctx.restore();
}
// The rescue story is presentation only: progress belongs to storyStore.
const STORY_RECAPS=Object.freeze([
 'Their return gate has failed. The first trace of the expedition is on Caelus.',
 'The Caelus signal led to a distress call from Ferrum’s Foundry.',
 'Ferrum revealed the route to Orison. The submerged relay can locate the survivors.',
 'Thalassa located the carriers in Eventide. The frozen archive holds the missing route.',
 'Nivara revealed a dormant rescue gate. Its furnace must be restarted.',
 'The furnace has power. One last signal will open the survivors’ way home.'
]);
const STORY_ACTIONS=Object.freeze(['Defeat the guardian. Recover the first coordinates.','Optional: rescue the engineer en route. Break the Dreadnought.','Hold inside three relay rings. Locate the survivors.','Break three archive seals. Find the route to Eventide.','Connect three diversion controls. Power the rescue gate.','Defend both sides of the portal. Save the five carriers.']);
let campaignPrologue=null;
function storyResumeInfo(){const p=storyStore.snapshot(),index=p.complete?0:Math.max(0,STORY_ROUTE.findIndex(m=>m.id===p.next));return{p,index,next:STORY_ROUTE[index],recap:p.complete?'All five carriers reached home. Their crew and discoveries are safe.':STORY_RECAPS[index]};}
function showCampaignEntry(){if(state==='title')showCampaignBrief();}
function campaignPrologueVisible(){return false;}
function showCampaignPrologue(){if(state!=='title')return;showCampaignBrief();const story=$('#campaignStory');if(story)story.open=true;}
function updateCampaignPrologue(){}
function drawCampaignPrologueScene(){}
function refreshStoryLobby(){
 if(state!=='title')return;const overlay=$('#overlay');
 if(overlay.classList.contains('title-screen'))updateExpeditionIntro();
 else if(campaignBriefVisible()&&(campaignBriefView.owner!==storyStore.account()||campaignBriefView.progress!==storyStore.snapshot().count))showCampaignBrief();
}

function showCampaignBrief(){
 if(state!=='title')return;campaignPrologue=null;migrateStoryVictories();const {p,index,next,recap}=storyResumeInfo();atlasOpen=true;sectorBlend=null;
 prepareCampaignBrief(index);
 const returning=p.count&&!p.complete;
 const overlay=$('#overlay');overlay.className='overlay story-transmission campaign-intro';overlay.onclick=null;
 overlay.innerHTML=`<section class="campaign-scene" aria-label="Next mission preview: ${next.world}"><div class="campaign-scene-heading"><span class="eyebrow"><i aria-hidden="true"></i>${returning?'YOUR JOURNEY CONTINUES':'YOUR JOURNEY BEGINS'}</span><h3>${next.world}</h3><p>${next.system} · ${next.title}</p></div><div class="campaign-scene-route"><span class="eyebrow">THE ROUTE HOME · ${p.complete?0:p.count} / 6 COORDINATES</span><ol>${STORY_ROUTE.map((m,i)=>`<li class="${i<index?'secured':i===index?'next':''}"><i aria-hidden="true">${i<index?'◆':'◇'}</i><span>${m.world}</span></li>`).join('')}</ol><p>Recover coordinates → restore the gate → bring them home.</p></div></section><section class="transmission-card campaign-brief" aria-labelledby="campaignBriefTitle"><span class="eyebrow mint">${returning?'RESCUE IN PROGRESS · '+p.count+'/6 COORDINATES':'SIX MISSIONS · THREE SOLAR SYSTEMS'}</span><h2 id="campaignBriefTitle">${returning?'The rescue continues.':'Bring them home.'}</h2><p class="brief-destination">${returning?'RESUMING':'FIRST DESTINATION'} · ${next.world.toUpperCase()} · ${next.title}</p><p class="brief-instruction">${STORY_ACTIONS[index]}</p><div class="transmission-actions"><button id="campaignTakeoff" class="primary">${returning?'CONTINUE':'BEGIN'} CAMPAIGN ↗</button><button id="storyBack" class="transmission-secondary">Back</button></div><details id="campaignStory" class="brief-details"><summary>The story &amp; saved progress</summary><p class="brief-story">An expedition followed the Origin Signal. Their return gate failed. Five carriers are stranded. You are their way home.</p><p class="transmission-task">${returning?recap:'Recover six coordinates across three systems. Restore the gate and defend their escape.'}</p><p class="transmission-service">${p.durable?'Missions saved on this device.':'Session progress · keep this tab open.'} ${index===1?'Engineer rescue is optional.':'Progress survives defeat.'}</p></details></section>`;
 $('#storyBack').onclick=showTitleScreen;$('#campaignTakeoff').onclick=()=>{campaignBriefView=null;atlasOpen=false;beginStory(index);};$('#campaignTakeoff').focus({preventScroll:true});
}

function readFlightMarkerLayout(){
 if(!openingMarkerLayout){
  const stage=canvas.parentElement,rect=canvas.getBoundingClientRect?.(),frame=stage?.getBoundingClientRect?.();
  if(!rect||!frame)return;
  const fit=window.getComputedStyle?.(canvas).objectFit,scale=Math.min(rect.width/W,rect.height/H),width=fit==='contain'?W*scale:rect.width,height=fit==='contain'?H*scale:rect.height;
  openingMarkerLayout={width,height,frameWidth:frame.width,frameHeight:frame.height,left:rect.left-frame.left+(rect.width-width)/2,top:rect.top-frame.top+(rect.height-height)/2};
  if(!openingMarkerObserver&&typeof ResizeObserver!=='undefined'){openingMarkerObserver=new ResizeObserver(()=>{openingMarkerLayout=null;});openingMarkerObserver.observe(canvas);}
 }
 return openingMarkerLayout;
}

// Campaign finale: its own director, separate from the sky-warden patterns.
function isOriginGuardian(b=boss){return !!b&&storyActive()&&storyIndex()===5;}
function originGuardianState(b){return b.origin??={phase:0,cycle:0,rest:1.8,attack:null,wingAge:b.age,previous:{x:ship.x,y:ship.y},lockAge:99};}
function originEyes(b){
 const d=bossDesign(),pose=bossFlightPose(b),sockets=d.mesh.eyeSockets;
 // Only the camera-facing eye fires; the far eye must not shine through the skull.
 if(!sockets?.length)return[bossMount(b,d.mouth)];
 const eye=sockets.reduce((near,p)=>rotateVertex(p,pose.yaw,pose.roll,pose.pitch,0,0)[2]<rotateVertex(near,pose.yaw,pose.roll,pose.pitch,0,0)[2]?p:near);
 return[bossMount(b,eye)];
}
function originGuardianHint(b){const g=b.origin,a=g?.attack;if(!a)return b.exposed>0?'CORE EXPOSED · ATTACK NOW':'GATE LOCKS '+(g?.phase||0)+'/3 · WATCH ITS EYES AND WINGS';return a.kind==='eyes'?'EYES LOCKED · LEAVE THE AMBER SIGHTLINES':a.kind==='sonic'?'WINGS COMPRESSING · MOVE TO THE MINT OPENING':'PLASMA BARRAGE · SIDESTEP THE AIM, THEN WEAVE';}
function beginOriginAttack(b,kind){
 const g=originGuardianState(b),warning=kind==='eyes'?1.65:kind==='sonic'?1.8:1.6;
 const a={kind,age:0,warning,duration:kind==='eyes'?1.15:kind==='sonic'?4.9:2.1,origin:{x:b.x,y:b.y},target:{x:ship.x,y:ship.y},fired:false};
 if(kind==='sonic')planBossSonicGap(b,a);
 g.attack=a;g.cycle++;b.exposed=0;b.recovery=0;
 announce(kind==='eyes'?'SOLAR GAZE':kind==='sonic'?'SONIC WINGBREAK':'PLASMA BARRAGE',kind==='eyes'?'EYES LOCKED · MOVE OFF THE SIGHTLINES':kind==='sonic'?'MOVE TO THE MINT OPENING':'SIDESTEP THE AIM · WEAVE BETWEEN BURSTS');
 window.flightAudio?.weaponCue?.(kind==='eyes'?'gaze':kind,'warn',b.x,warning);
}
function originLaserLines(b,a){return originEyes(b).map(p=>{const angle=Math.atan2(a.target.y-p.y,a.target.x-p.x);return {x:p.x,y:p.y,ex:p.x+Math.cos(angle)*W*1.4,ey:p.y+Math.sin(angle)*W*1.4};});}
function originLaserHit(line,old,current,r=22){
 const angle=Math.atan2(line.ey-line.y,line.ex-line.x),c=Math.cos(angle),s=Math.sin(angle),point=p=>({x:(p.x-line.x)*c+(p.y-line.y)*s,y:-(p.x-line.x)*s+(p.y-line.y)*c}),a=point(old),b=point(current);
 return segmentBoxTime(a.x,a.y,b.x-a.x,b.y-a.y,0,-r,Math.hypot(line.ex-line.x,line.ey-line.y),r)!==Infinity;
}
function sonicGapHalf(a){return a.gapHalf??.58;}
function planBossSonicGap(b,a){
 const p=a.origin,dx=ship.x-p.x,dy=ship.y-p.y,d=Math.hypot(dx,dy),aim=Math.atan2(dy,dx);
 const preferred=(b.sonicCycle||0)%2?1:-1;b.sonicCycle=(b.sonicCycle||0)+1;
 a.gapHalf=clamp(Math.atan2(80,d),.12,.34);
 let best=null;
 // Choose a reachable lane away from the pilot's current bearing. Alternate
 // high/low preferences, but reject terrain, hulls and obstructed approaches.
 for(const sign of [preferred,-preferred])for(const offset of [160,220,280])for(const side of [0,-80,80]){
  const x=clamp(ship.x+side,65,W-85),y=clamp(ship.y+sign*offset,75,H-75),travel=Math.hypot(x-ship.x,y-ship.y),angle=Math.atan2(y-p.y,x-p.x);
  const delta=Math.abs(Math.atan2(Math.sin(angle-aim),Math.cos(angle-aim)));
  if(travel<90||delta<a.gapHalf+.08||Math.hypot(x-p.x,y-p.y)<150)continue;
  let clear=true;
  for(let i=1;i<=12&&clear;i++){
   const px=ship.x+(x-ship.x)*i/12,py=ship.y+(y-ship.y)*i/12;
   clear=!sceneryBorderContact(px,py,32,22)&&!bossBodyHit(b,px,py,40)&&!obstacles.some(o=>obstacleSolids(o).some(r=>px+32>r.x&&px-32<r.x+r.w&&py+22>r.y&&py-22<r.y+r.h));
  }
  if(!clear)continue;
  const score=travel+(sign===preferred?0:500)+Math.abs(side)*.25;
  if(!best||score<best.score)best={x,y,angle,score};
 }
 // In a blocked corridor preserve a possible escape instead of forcing a
 // lane through solid scenery. All choices lock before the warning begins.
 a.gap=best?.angle??aim;a.safePoint=best?{x:best.x,y:best.y}:{x:ship.x,y:ship.y};
}
function originSonicRadius(a,age,ring=0){return 55+Math.max(0,age-a.warning-ring*.8)*270;}
function originSonicHit(a,oldAge,old,current,ring=0){
 if(a.age<a.warning+ring*.8)return false;
 for(let i=0;i<=8;i++){const t=i/8,age=oldAge+(a.age-oldAge)*t;if(age<a.warning+ring*.8)continue;const x=old.x+(current.x-old.x)*t-a.origin.x,y=old.y+(current.y-old.y)*t-a.origin.y,delta=Math.atan2(Math.sin(Math.atan2(y,x)-a.gap),Math.cos(Math.atan2(y,x)-a.gap));if(Math.abs(delta)>sonicGapHalf(a)&&Math.abs(Math.hypot(x,y)-originSonicRadius(a,age,ring))<22)return true;}
 return false;
}
function updateOriginGuardian(b,dt){
 if(state!=='playing'||sectorBlend||b.entry||b.hp<=0)return;
 const g=originGuardianState(b),phase=bossCombatPhase(b);g.lockAge+=dt;
 b.attack=null;b.salvoWindup=null;b.pass=null;b.breath=null;b.arsenal=null;b.charge=0;b.shoot=99;
 b.exposed=Math.max(0,(b.exposed||0)-dt);b.recovery=Math.max(0,(b.recovery||0)-dt);
 if(phase>g.phase){g.phase=phase;g.lockAge=0;g.attack=null;g.rest=storyBenefits().telemetry?3.2:2.6;b.exposed=g.rest;b.recovery=g.rest;announce('GATE LOCK '+phase+'/3 RELEASED',phase===1?'SOLAR CORE DESTABILIZING':'FINAL LOCK · BREAK THE GUARDIAN');window.flightAudio?.engineerCue?.('link',W/2);}
 g.wingAge+=dt*(g.attack?.kind==='sonic'?(g.attack.age<g.attack.warning?.28:2.8):1);
 const a=g.attack;
 if(!a){g.rest-=dt;if(g.rest<=0){const sequence=g.phase===0?['eyes','volley','sonic']:g.phase===1?['volley','sonic','eyes']:['sonic','eyes','volley','eyes'];beginOriginAttack(b,sequence[g.cycle%sequence.length]);}g.previous={x:ship.x,y:ship.y};return;}
 const oldAge=a.age;a.age+=dt;
 if(a.age>=a.warning){
  if(!a.fired){a.fired=true;if(a.kind!=='volley')window.flightAudio?.weaponCue?.(a.kind==='eyes'?'gaze':a.kind,'fire',b.x,a.duration);}
  if(a.kind==='eyes'){const t=clamp((a.warning-oldAge)/dt,0,1),from={x:g.previous.x+(ship.x-g.previous.x)*t,y:g.previous.y+(ship.y-g.previous.y)*t};for(const line of originLaserLines(b,a))if(originLaserHit(line,from,ship))damage('laser');}
  else if(a.kind==='volley'){updateBossPlasmaBarrage(b,a);
  }else for(let i=0;i<(g.phase===2?2:1);i++)if(originSonicHit(a,oldAge,g.previous,ship,i))damage('shockwave');
 }
 if(a.age>=a.warning+a.duration){g.attack=null;g.rest=g.phase===2?2.1:2.7;b.exposed=g.rest;b.recovery=g.rest;}
 g.previous={x:ship.x,y:ship.y};
}
function moveOriginGuardian(b,dt){
 const g=originGuardianState(b),oldX=b.x,oldY=b.y;
 // Hold the head still throughout a laser lock and firing. Other attacks
 // permit a slow deliberate patrol; no inherited crossing charge.
 if(!g.attack)driveBoss(b,{x:W*.77+Math.sin(b.age*.21)*60,y:H*.5+Math.sin(b.age*.38)*100},dt,2.4,85);
 if(g.attack?.kind==='volley'){if(g.attack.age<g.attack.warning){const facing=g.attack.target.x>b.x?Math.PI:0;b.turnYaw=(b.turnYaw||0)+clamp(facing-(b.turnYaw||0),-dt*2.8,dt*2.8);}}else b.turnYaw=0;
 updateBossAttitude(b,dt,(b.x-oldX)/dt,(b.y-oldY)/dt);
 if(g.attack?.kind==='eyes'||g.attack?.kind==='volley'){b.flightPitch=0;b.flightYaw=0;b.flightBank=0;}
}
// Shared by the final guardian and exploration bosses. Targets lock at windup;
// all damage comes from visible projectiles using the normal swept collision path.
function bossPlasmaMuzzle(b){const d=bossDesign();return bossMount(b,bossOrganic()?d.mouth:(d.guns?.[0]||d.mouth));}
function updateBossPlasmaBarrage(b,a){
 a.salvos??=0;
 while(a.salvos<3&&a.age>=a.warning+a.salvos*.5){
  const m=bossPlasmaMuzzle(b);
  a.aim??=Math.atan2(a.target.y-m.y,a.target.x-m.x);
  const shift=a.salvos===1?.12:0;
  for(let i=-2;i<=2;i++){
   const angle=a.aim+i*.24+shift,speed=430;
   hostile.push({x:m.x,y:m.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:7,age:0,kind:'arsenal',arsenal:'plasma',c:'#86e7ff',life:3.6,baseSpeed:speed,side:1,bossShot:true});
  }
  a.salvos++;b.muzzle=.18;
  window.flightAudio?.weaponCue?.('volley','fire',m.x,.3);
 }
}
function drawBossPlasmaCharge(b,a){
 const m=bossPlasmaMuzzle(b),q=clamp(a.age/a.warning,0,1),active=a.age>=a.warning;
 const pulse=active?Math.max(0,1-((a.age-a.warning)% .5)/.2):q;
 ctx.save();
 if(!active){
  const aim=Math.atan2(a.target.y-m.y,a.target.x-m.x);
  ctx.strokeStyle='#a7efff';ctx.lineWidth=1.2;ctx.globalAlpha=.22+q*.25;ctx.setLineDash([8,12]);
  for(let i=-2;i<=2;i++){const angle=aim+i*.24;ctx.beginPath();ctx.moveTo(m.x+Math.cos(angle)*25,m.y+Math.sin(angle)*25);ctx.lineTo(m.x+Math.cos(angle)*420,m.y+Math.sin(angle)*420);ctx.stroke();}
  ctx.setLineDash([]);
  for(let i=0;i<9;i++){const phase=(a.age*1.8+i*.618)%1,angle=i*2.399+a.age*.7,r=12+(1-phase)*42;ctx.globalAlpha=Math.sin(phase*Math.PI)*q;ctx.fillStyle=i%2?'#85dfff':'#f3fcff';ctx.beginPath();ctx.arc(m.x+Math.cos(angle)*r,m.y+Math.sin(angle)*r,1.2+i%3*.4,0,TAU);ctx.fill();}
 }
 ctx.globalAlpha=1;orb(m.x,m.y,16+pulse*25,'#66d9ff',.4+pulse*.45);orb(m.x,m.y,6+pulse*9,'#d5f7ff',.85);ctx.fillStyle='#effcff';ctx.beginPath();ctx.arc(m.x,m.y,2+pulse*4,0,TAU);ctx.fill();ctx.restore();
}
function drawOriginGuardian(b,g=b.origin){
 const a=g?.attack;if(!a)return;
 ctx.save();const active=a.age>=a.warning,charge=clamp(a.age/a.warning,0,1);
 if(a.kind==='eyes'){
  for(const line of originLaserLines(b,a)){
   ctx.strokeStyle=a.profile?.color||(active?'#ffb85b':'#ffd388');ctx.globalAlpha=active?.22:.65;ctx.lineWidth=active?30:1.5;ctx.setLineDash(active?[]:[9,8]);ctx.beginPath();ctx.moveTo(line.x,line.y);ctx.lineTo(line.ex,line.ey);ctx.stroke();ctx.setLineDash([]);
   if(active){ctx.globalAlpha=.95;ctx.lineWidth=10;ctx.stroke();ctx.strokeStyle='#fff9e5';ctx.lineWidth=3;ctx.stroke();}orb(line.x,line.y,7+charge*11,'#ffe2ad',.5+charge*.3);
  }
 }else if(a.kind==='volley'){
  drawBossPlasmaCharge(b,a);
 }else{
  const p=a.origin,half=sonicGapHalf(a);
  if(!active&&a.safePoint){
   const reach=Math.hypot(a.safePoint.x-p.x,a.safePoint.y-p.y);
   ctx.strokeStyle='#9cffdf';ctx.globalAlpha=.38;ctx.lineWidth=1.5;ctx.setLineDash([7,9]);
   for(const side of [-1,1]){const angle=a.gap+side*half;ctx.beginPath();ctx.moveTo(p.x+Math.cos(angle)*65,p.y+Math.sin(angle)*65);ctx.lineTo(p.x+Math.cos(angle)*reach,p.y+Math.sin(angle)*reach);ctx.stroke();}
   ctx.setLineDash([]);ctx.globalAlpha=.85;ctx.lineWidth=3;
   ctx.save();ctx.translate(a.safePoint.x,a.safePoint.y);ctx.rotate(a.gap+Math.PI);
   for(let i=0;i<2;i++){ctx.beginPath();ctx.moveTo(-10-i*14,-8);ctx.lineTo(-i*14,0);ctx.lineTo(-10-i*14,8);ctx.stroke();}ctx.restore();
  }
  for(let ring=0;ring<(g.phase===2?2:1);ring++){
   if(ring&&a.age<a.warning+ring*.8)continue;const r=active?originSonicRadius(a,a.age,ring):55;if(r>W*1.4)continue;
   ctx.strokeStyle=a.profile?.color||(active?'#dff9ff':'#e8c787');ctx.globalAlpha=active?.72:.45;ctx.lineWidth=active?5:2;ctx.beginPath();ctx.arc(p.x,p.y,r,a.gap+half,a.gap+TAU-half);ctx.stroke();
   if(active){ctx.globalAlpha=.14;ctx.lineWidth=21;ctx.stroke();}
   ctx.strokeStyle='#9cffdf';ctx.globalAlpha=.8;ctx.lineWidth=3;for(const side of [-1,1]){const angle=a.gap+side*half;ctx.beginPath();ctx.moveTo(p.x+Math.cos(angle)*(r-12),p.y+Math.sin(angle)*(r-12));ctx.lineTo(p.x+Math.cos(angle)*(r+20),p.y+Math.sin(angle)*(r+20));ctx.stroke();}
  }
 }ctx.restore();
}
function applySilkSnare(){
 if(ship.inv>0)return;if(ship.shield>0){damage();return;}if((ship.silkGrace||0)>0)return;
 ship.silk=2.2;ship.silkGrace=4.2;window.flightAudio?.weaponCue?.('silk','attach',ship.x);announce('SILK SNARE','THRUST REDUCED BRIEFLY · NOVA BREAKS THE WEB',3);
}
function updateSilkSnare(dt){ship.silk=Math.max(0,(ship.silk||0)-dt);ship.silkGrace=Math.max(0,(ship.silkGrace||0)-dt);}
function drawSilkSnare(){
 if(!(ship.silk>0))return;const alpha=Math.min(1,ship.silk/.65);ctx.save();ctx.translate(ship.x,ship.y);ctx.globalAlpha=alpha*.82;ctx.strokeStyle='#e6edcd';ctx.lineWidth=1.2;
 for(let i=0;i<7;i++){const a=i*TAU/7,stretch=1+(1-alpha)*.3;ctx.beginPath();ctx.moveTo(Math.cos(a)*8,Math.sin(a)*5);ctx.quadraticCurveTo(Math.cos(a+.2)*26,Math.sin(a+.2)*18,Math.cos(a)*50*stretch,Math.sin(a)*27*stretch);ctx.stroke();}
 for(let ring=1;ring<4;ring++){ctx.beginPath();for(let i=0;i<=7;i++){const a=i*TAU/7,x=Math.cos(a)*ring*14,y=Math.sin(a)*ring*8;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}ctx.restore();
}
