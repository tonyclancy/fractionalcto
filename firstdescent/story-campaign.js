'use strict';
// A fixed story route, independent of the additive 92-world exploration archive.
const STORY_ROUTE=[
 {id:'verdant-reach',world:'Caelus',system:'Vesper',title:'First Contact',kind:'guardian',brief:'Defeat the guardian. Recover the signal that led the expedition here.',result:'A damaged star map reveals a distress call from Ferrum.',socket:'Distress coordinates',benefit:'Route to Ferrum · hull service and one nova'},
 {id:'ember-forge',world:'Ferrum',system:'Vesper',title:'The Last Engineer',kind:'guardian',brief:'Enter the escape pod’s green ring on the way through the Foundry. The rescued engineer sends a sabotage drone to jam one Dreadnought weapon.',result:'The Foundry shard completes the coordinates to Orison. A submerged relay is still transmitting.',socket:'Orison coordinates',benefit:'Engineer can repair the final beacon once if rescued'},
 {id:'lumen-reef',world:'Thalassa',system:'Orison',title:'The Sunken Relay',kind:'relay',brief:'Stay inside each relay’s ring to reconnect three nodes. Defeat the guardian to recover the transmission.',result:'“We reached Eventide. Our ship is gone. The archive carries us.” The recording points to Nivara.',socket:'Expedition recording',benefit:'Relay uplink adds two points of extraction integrity'},
 {id:'nivara-glacial-heart',world:'Nivara',system:'Orison',title:'The Frozen Archive',kind:'seal',brief:'Shoot through three frozen archive seals, then defeat the sentinel. The fragments hold the way to Eventide.',result:'The archive reveals a dormant gate in Eventide. Its furnace must be restarted before the expedition can escape.',socket:'Eventide coordinates',benefit:'Archive telemetry reveals openings when later guardians change phase'},
 {id:'eventide-carmine-corona',world:'Carmine',system:'Eventide',title:'The Gate Furnace',kind:'furnace',brief:'Hold near three diversion controls during the guardian encounter. Route their energy into the rescue gate.',result:'The gate has power. Aureus holds the final signal. Recover it and protect the extraction beacon.',socket:'Gate ignition',benefit:'Diversion controls grant a brief hull guard · rescue gate powered'},
 {id:'eventide-aureus-corona',world:'Aureus',system:'Eventide',title:'Bring Them Home',kind:'extraction',brief:'Defeat the Origin guardian. Then defend the rescue portal from both sides until the expedition can cross.',result:'The expedition’s voices cross the gate. Their archive is safe. You have brought them home.',socket:'Extraction signal',benefit:'Protect the archive carriers and watch them cross the rescue gate'}
];
const STORY_DEFINITION={id:'origin-route-001',version:1,finalStage:STORY_ROUTE[5].id,systems:['Vesper','Orison','Eventide'].map(name=>({id:name,name,discovery:name+' route decoded',stages:STORY_ROUTE.filter(m=>m.system===name).map(m=>({id:m.id,name:m.world,kind:'core'}))})),milestones:[]};
const storyStore=createOriginStore(missionPreview?null:runStorage,STORY_DEFINITION);
let storyMission=null;
function migrateStoryVictories(){for(const m of STORY_ROUTE.slice(0,2))if(originStore.has(m.id))storyStore.collect(m.id);}
function storyIndex(){return flightRun?.story===STORY_DEFINITION.id?STORY_ROUTE.findIndex(m=>m.id===sectors[level].id):-1;}
function storyActive(){return storyIndex()>=0;}
function storyNextLevel(){const next=STORY_ROUTE[storyIndex()+1];return next?sectors.findIndex(s=>s.id===next.id):-1;}
function prepareStoryMission(){const i=storyIndex();storyMission=i<0?null:{index:i,done:0,charge:0,node:null,guardian:false,complete:false,age:0,extract:null,relayEchoes:[],bossPhase:-1,pendingPhase:false};if(i>=0){if(flightRun.storyEngineer===undefined)flightRun.storyEngineer=i>1&&relayStore.snapshot().unlocked;const kind=STORY_ROUTE[i].kind;if(kind==='extraction')prepareStoryPortal();if(kind!=='guardian')window.gpuModels?.prepare([storyMesh(kind==='extraction'?'beacon':kind),...(kind==='extraction'?[storyMesh('raider'),storyMesh('carrier')]:[])],sectors[level].id);}}
function storyCheckpoint(){if(!storyActive()||!storyMission)return null;return{index:storyMission.index,done:storyMission.done,guardian:storyMission.guardian,complete:storyMission.complete,reward:storyMission.reward,engineer:!!flightRun.storyEngineer,extract:!!storyMission.extract};}
function restoreStoryCheckpoint(saved){if(!storyActive()||saved?.index!==storyIndex())return;storyMission.done=Math.max(0,Math.min(3,saved.done||0));storyMission.guardian=!!saved.guardian;storyMission.complete=!!saved.complete;storyMission.reward=saved.reward;flightRun.storyEngineer=!!saved.engineer;if(saved.guardian){bossDefeated=true;transition=4;time=Math.max(time,sectors[level].duration+.01);world=time*SCROLL_SPEED;}if(saved.extract&&!saved.complete)beginStoryExtraction();}
function storyObjective(){const m=storyMission,d=STORY_ROUTE[storyIndex()];if(!d||!m)return '';if(m.complete)return 'SIGNAL SHARD SECURED · ROUTE UPDATED';if(m.extract){const e=m.extract;return e.returning?`RESCUING EXPEDITION ${e.evacuated}/5 · FRIENDLY CARRIERS · WEAPONS SAFE`:`DEFEND PORTAL · SAVE YOUR PEOPLE · ${e.age>=32?'CLEAR THE APPROACH':Math.ceil(32-e.age)+'s'} · INTEGRITY ${e.hp}/${e.max}${e.engineer&&!e.repaired?' · ENGINEER ON STANDBY':''}`;}
 const opening=openingMissionTask();if(opening&&!m.guardian)return `${m.index+1}/6 · ${opening.title}`;
 const task=d.kind==='relay'?`LINK RELAYS ${m.done}/3 · HOLD INSIDE RING`:d.kind==='seal'?`BREAK SEALS ${m.done}/3 · SHOOT THE CORE`:d.kind==='furnace'?`DIVERT ENERGY ${m.done}/3 · HOLD INSIDE RING`:d.kind==='extraction'?'DEFEAT GUARDIAN · THEN DEFEND THE PORTAL':d.world==='Ferrum'?'DEFEAT DREADNOUGHT · ENGINEER RESCUE OPTIONAL':'DEFEAT GUARDIAN · RECOVER SIGNAL';return `${m.index+1}/6 · ${m.done===3?'OBJECTIVE COMPLETE · DEFEAT GUARDIAN':task}${m.guardian?' · GUARDIAN DOWN':''}`;}
function beginStory(target){migrateStoryVictories();const p=storyStore.snapshot();const index=target===undefined?(p.complete?0:STORY_ROUTE.findIndex(m=>m.id===p.next)):target;if(!Number.isInteger(index)||index<0||index>=6)return;if(STORY_ROUTE.slice(0,index).some(m=>!storyStore.has(m.id)))return;beginDescent(sectors.findIndex(s=>s.id===STORY_ROUTE[index].id),'story');}
function storySocketMarkup(){const p=storyStore.snapshot();return `<div class="story-route">${STORY_ROUTE.map((m,i)=>{const done=storyStore.has(m.id),open=STORY_ROUTE.slice(0,i).every(s=>storyStore.has(s.id));return `<article class="story-stop ${done?'secured':open?'available':'locked'}"><span class="eyebrow">${m.system} · ${String(i+1).padStart(2,'0')}</span><h3><span aria-label="${done?'Shard secured':'Empty socket'}">${done?'◆':'◇'}</span> ${m.world}</h3><strong>${m.title}</strong><p>${m.brief}</p><p class="story-benefit">${m.benefit}</p><small>${done?'SHARD SECURED':open?'ROUTE OPEN':'ROUTE LOCKED'} · ${m.socket}</small></article>`;}).join('')}</div>`;}
function showStoryMap(resume=false){if(state!=='title'&&state!=='paused')return;const previous=state;migrateStoryVictories();const p=storyStore.snapshot(),next=STORY_ROUTE.find(m=>m.id===p.next),overlay=$('#overlay');atlasOpen=true;atlasSystemId=null;overlay.className='overlay universe-atlas origin-log';overlay.onclick=null;overlay.innerHTML=`<div class="atlas-shell story-shell"><header class="atlas-header"><div><span class="eyebrow mint">THE ORIGIN SIGNAL · SIX MISSIONS</span><h2>BRING THEM HOME</h2><p>Find the lost expedition. Rebuild its route through three solar systems.</p></div><button id="storyBack">${resume?'RESUME FLIGHT':'← MAIN MENU'}</button></header><section class="origin-summary"><div><span class="eyebrow">SIGNAL SHARDS</span><strong>${p.count}<small> / 6 secured</small></strong><progress max="6" value="${p.count}" aria-label="Story route progress"></progress></div><div><h3>${p.complete?'The expedition is home.':next.world+' · '+next.title}</h3><p>${p.complete?'All six signals form a route home. Your full universe archive remains available to explore.':next.brief}</p>${resume?'':`<button id="storyLaunch" class="primary">${p.complete?'REPLAY STORY':'CONTINUE STORY'} ↗</button>`}</div></section>${storySocketMarkup()}<p class="atlas-note">${p.durable?'Saved on this device.':'Session preview · progress resets on reload.'} Completed missions survive defeat. Signal Shards open the next mission automatically. The engineer is optional.</p>${resume?'':typeof relayLoadoutMarkup==='function'?'<section class="relay-card"><div><h3>FLIGHT EQUIPMENT</h3><p>Rescue the engineer on Ferrum to unlock the Recovery Kit.</p>'+relayLoadoutMarkup()+'</div></section>':''}<div class="relay-actions">${resume?'':`<button id="storyArchive">EXPLORATION ARCHIVE · ${originStore.snapshot().count}/92</button>`}${resume?'':'<button id="storyExplore">FLY EXPLORATION ROUTE ↗</button>'}</div><p class="atlas-note">Your exploration archive is separate. Story missions do not require collecting all 92 crystals.</p></div>`;
 $('#storyBack').onclick=()=>{atlasOpen=false;if(resume&&previous==='paused'){state='paused';pause();}else showTitleScreen();};if(!resume){$('#storyLaunch').onclick=()=>beginStory();$('#storyExplore').onclick=()=>beginDescent(0,'exploration');}if(!resume)$('#storyArchive').onclick=()=>{if(resume)return;atlasOpen=false;state='title';showOriginMission();};if(!resume)for(const mode of ['standard','support']){const button=$('[data-relay-loadout="'+mode+'"]');if(button)button.onclick=()=>{if(mode==='support'&&!relayStore.snapshot().unlocked)return;relayLoadout=mode;showStoryMap();};}$('#storyBack').focus();}
function storyGuardianDefeated(b){if(!storyActive()||b!==boss||b.hp>0)return false;storyMission.guardian=true;if(storyIndex()===1)flightRun.storyEngineer=!!ferrumMission?.boarded;storyMission.shardSource={x:b.x,y:b.y};if(flightRun.storyOwner===originStore.account())originStore.collect(sectors[level].id);saveCheckpoint();return true;}
// Rewards follow the reached route, rather than granting all replay unlocks at launch.
function storyBenefits(){const i=storyIndex();return{uplink:i>2,telemetry:i>3,engineer:!!flightRun?.storyEngineer};}
function beginStoryExtraction(){
 const benefits=storyBenefits(),max=benefits.uplink?8:6;
 storyMission.extract={age:0,hp:max,max,next:2,spawned:0,raiders:[],x:W/2,y:H/2,previousShip:{x:ship.x,y:ship.y},engineer:benefits.engineer,repaired:false,repairGlow:0,returning:false,returnAge:0,evacuated:0};
 ship.hp=Math.max(ship.hp,3);ship.inv=Math.min(ship.inv,2);
 prepareStoryPortal();announce('DEFEND THE PORTAL','PROTECT BOTH SIDES · BRING YOUR PEOPLE HOME',3);window.flightAudio?.setRescueCelebration?.(false);window.flightAudio?.setMusicActive(true);
}
function updateStoryBoss(b){
 if(!storyActive()||!storyMission||b.entry)return;
 const m=storyMission,phase=bossCombatPhase(b);
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
 e.returning=true;e.returnAge=0;e.sceneWorld=world;e.escortStart={x:ship.x,y:ship.y};e.raiders=[];shots=[];muzzleFlash=0;explosions=[];hostile=[];hazards=[];acidClouds=[];enemies=[];ship.inv=Math.max(ship.inv,8);
 keys.clear();pointer=null;announce('PORTAL SECURED','OPENING THE WAY HOME · WEAPONS SAFE',3);window.flightAudio?.setBossApproach?.(0);window.flightAudio?.setRescueCelebration?.(true);window.flightAudio?.setMusicActive(true);
}
function storyCarrierPosition(e,i){
 const u=clamp((e.returnAge-3-i*.7)/3.4,0,1),gate=storyGatePosition(e),start=W+100+i*30;
 return{x:start+(gate.x-start)*navigationEase(u),y:gate.y+Math.sin(i*1.7)*120*(1-u)+Math.sin(u*Math.PI)*45,scale:1-navigationEase((u-.86)/.14),u};
}
function storyGatePosition(e){return{x:e.x-storyRescuePan(e),y:e.y};}
function storyMayFire(){return storyActive()&&!storyMission?.complete&&!storyMission?.extract?.returning;}
function playerWeaponsActive(){return typeof storyActive==='function'&&storyActive()?storyMayFire():!bossDefeated;}
function storyTarget(){return storyActive()&&STORY_ROUTE[storyIndex()].kind==='seal'?storyMission?.node:null;}
const STORY_NO_TARGETS=Object.freeze([]);
function storyTargets(){if(!storyActive())return STORY_NO_TARGETS;const n=storyTarget();return [...(n&&n.hp>0?[n]:[]),...(storyMission?.extract?.raiders||[]).filter(r=>r.hp>0)];}
function storyHitTarget(s,target){target.hp-=s.damage;if(target.storyRaider)target.hit=.16;s.seen.add(target);s.spent=true;burst(target.x,target.y,target.storySeal?'#bcefff':'#ffab79',5);if(target.hp<=0){if(target.storyRaider){score+=target.kind==='breaker'?250:150;kills++;}explode(target.x,target.y,target.storySeal?'#bcefff':'#ffa265',target.storySeal?1:.65,false);if(target.storySeal)finishStoryNode();}}
function finishStoryNode(){const m=storyMission;if(!m||m.done>=3)return;if(m.node)m.relayEchoes.push({...m.node,kind:STORY_ROUTE[m.index].kind,age:0,number:m.done+1});m.done++;if(STORY_ROUTE[m.index].kind==='furnace'){ship.inv=Math.max(ship.inv,3);rings.push({x:ship.x,y:ship.y,r:20,life:.9,c:'#ffdc8b'});}m.node=null;m.charge=0;window.flightAudio?.engineerCue?.('link',ship.x);announce(m.done===3?'LINK COMPLETE':`NODE ${m.done} / 3 SECURED`,STORY_ROUTE[m.index].kind==='furnace'?'GATE ENERGY ROUTED · HULL GUARD 3s':m.done===3?'RECOVER THE GUARDIAN’S SIGNAL':'NEXT SIGNAL LOCATED',1);saveCheckpoint();}
function storyNodePosition(n,dt){
 // Repeating approaches prevent a missed object from blocking the mission.
 n.x-=dt*48;if(n.x< -130)n.x=W+130;
 const solids=obstacles.flatMap(obstacleSolids);let target=n.baseY;const clear=y=>!sceneryBorderContact(n.x,y,78,70)&&solids.every(r=>n.x+78<r.x||n.x-78>r.x+r.w||y+70<r.y||y-70>r.y+r.h);
 if(!clear(target))target=[H/2,250,510,310,450].find(clear)??H/2;n.y+=(target-n.y)*Math.min(1,dt*3);
}
function updateStoryMission(dt){if(!storyActive()||!storyMission||state!=='playing'||sectorBlend)return;const m=storyMission,d=STORY_ROUTE[m.index];updateOpeningMission();m.age+=dt;for(const echo of m.relayEchoes){echo.age+=dt;echo.x-=48*dt;}m.relayEchoes=m.relayEchoes.filter(e=>e.age<2.2);if(m.complete)return;
 if(['relay','seal','furnace'].includes(d.kind)&&m.done<3&&time>(d.kind==='furnace'?sectors[level].duration:12)){
  if(!m.node){const y=[250,500,360][m.done];m.node={x:W-300,y,baseY:y,hp:42,r:32,storySeal:d.kind==='seal'};}
  storyNodePosition(m.node,dt);
  if(d.kind!=='seal'){const nearby=Math.hypot(ship.x-m.node.x,ship.y-m.node.y)<112;m.charge=clamp(m.charge+(nearby?dt:-dt*.35),0,1.5);if(m.charge>=1.5)finishStoryNode();}
 }
 if(!m.guardian)return;
 if(d.kind==='extraction'){
  if(!m.extract){if(transition>1)return;beginStoryExtraction();saveCheckpoint();}
  const e=m.extract;
  e.repairGlow=Math.max(0,e.repairGlow-dt);
  if(e.returning){e.returnAge+=dt;updateStoryEscort(e);if(!e.opened&&e.returnAge>=1.6){e.opened=true;window.flightAudio?.portalOpen?.();announce('THE WAY HOME IS OPEN','FRIENDLY CARRIERS · WEAPONS SAFE',3);}const previous=e.evacuated;e.evacuated=0;for(let i=0;i<5;i++)if(storyCarrierPosition(e,i).u===1)e.evacuated++;if(e.evacuated>previous){const g=storyGatePosition(e);burst(g.x,g.y,'#b8ffe4',10);window.flightAudio?.engineerCue?.('link',g.x);}if(e.returnAge<10.5)return;}
  else{
  e.age+=dt;e.next-=dt;window.flightAudio?.setIntensity(.85);
  updateStoryRaiders(e,dt);
  e.raiders=e.raiders.filter(r=>r.hp>0);
  repairStoryBeacon(e);
  if(e.hp<=0){announce('EXTRACTION INTERRUPTED','RETRY THE BEACON DEFENSE',3);end(false);return;}if(e.age<32||e.spawned<18||e.raiders.length)return;beginStoryReturn(e);return;
  }
 }else if(['relay','seal','furnace'].includes(d.kind)&&m.done<3)return;
 m.complete=true;const hullBefore=ship.hp,novaBefore=novas;ship.hp=Math.min(5,ship.hp+1);novas=Math.min(3,novas+1);m.reward={hull:ship.hp-hullBefore,novas:novas-novaBefore};queuePickupEffect('rescue',{title:'MISSION REWARD · SIGNAL SECURED',detail:`HULL +${ship.hp-hullBefore} · NOVA +${novas-novaBefore} · ROUTE UPDATED`},m.shardSource||ship);ship.inv=Math.max(ship.inv,ORIGIN_RECOVERY_DURATION+1);saveCheckpoint();if(flightRun.storyOwner===storyStore.account())storyStore.collect(d.id);transition=3.4;originRecovery={story:true,index:m.index,x:clamp(m.shardSource?.x??ship.x+220,70,W-70),y:clamp(m.shardSource?.y??ship.y,90,H-90),kind:originEntry(d.id)?.kind||'core',age:0,phase:-1};updateOriginRecovery(0);annTimer=0;$('#announcement').style.opacity=0;updateHUD();
}
function finishStorySector(){if(!storyActive())return false;if(!storyMission?.complete){transition=1;return true;}showStoryDebrief();return true;}
// Brief transmissions keep the next action in view; the full route is optional.
const STORY_TRANSMISSIONS=[
 {voice:'DISTRESS CALL · FERRUM',line:'“The Foundry is falling. One engineer is still alive.”',task:'Reach the escape pod. Then break the Dreadnought.'},
 {voice:'RECOVERED TRANSMISSION · ORISON',line:'“There is a signal under the water. It is still calling.”',task:'Reconnect three relays. Follow the expedition.'},
 {voice:'EXPEDITION RECORDING · NIVARA',line:'“Our ship is gone. The archive carries us.”',task:'Break the frozen seals. Recover the way to Eventide.'},
 {voice:'ARCHIVE DECODED · EVENTIDE',line:'“There is a way home. But the gate has no power.”',task:'Divert the furnace energy. Restart the rescue gate.'},
 {voice:'RESCUE CHANNEL · AUREUS',line:'“We can see the gate. Please do not leave us here.”',task:'Defeat the guardian. Defend the portal from both sides.'},
 {voice:'EXPEDITION CHANNEL · HOME',line:'“We made it. All of us. Thank you.”',task:'Five archive carriers recovered.'}
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
 const receipt=storyServiceReceipt(),crew=index===1&&flightRun?.storyEngineer?'ENGINEER ABOARD · SABOTAGE DRONE ONLINE':index===1&&r&&!r.rescued?'Engineer rescue available on a replay':final&&flightRun?.storyEngineer?'Your engineer helped bring them home.':'';
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
 if(storyMeshes.has(kind))return storyMeshes.get(kind);const m=meshBuilder(),hot=kind==='furnace',light=hot?[255,165,72]:[126,229,232];
 if(kind==='carrier'){
  m.ellipsoid(0,0,0,25,9,8,[160,185,189],0,14,8);m.ellipsoid(12,-2,-7,6,3,2,[109,232,219],.5,10,6);
  for(const side of [-1,1]){m.wedge([6,side*4,0],[-21,side*14,3],[-14,side*4,-5],2,[89,115,137]);m.ellipsoid(-18,side*8,1,4,3,3,[117,245,223],.7,8,6);}
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
function drawStoryMission(){
 if(!storyActive()||!storyMission||sectorBlend)return;const m=storyMission,d=STORY_ROUTE[m.index],n=m.node,e=m.extract;
 if(n)drawModel(storyMesh(d.kind),n.x,n.y,1,(d.kind==='relay'?.3:.12)*Math.sin(m.age*.7),.05*Math.sin(m.age),0,m.age,0);
 for(const echo of m.relayEchoes){ctx.save();ctx.globalAlpha*=1-navigationEase((echo.age-.65)/1.55);drawModel(storyMesh(echo.kind||'relay'),echo.x,echo.y,1,.3*Math.sin(m.age*.7),.05*Math.sin(m.age),0,m.age,0);ctx.restore();}
 if(e?.returning)for(let i=0;i<5;i++){const p=storyCarrierPosition(e,i);if(p.u<1)drawModel(storyMesh('carrier'),p.x,p.y,p.scale,0,.12*Math.sin(m.age+i),Math.PI,m.age,0);}
 if(e)for(const r of e.raiders)drawModel(storyMesh('raider'),r.x,r.y,r.scale||1,.08*Math.sin(r.age*3),.18*Math.sin(r.age*4),Math.atan2(e.y-r.y,e.x-r.x),r.age,r.hit||0);
 window.gpuModels?.flush(ctx);ctx.save();
 for(const echo of m.relayEchoes)drawRelayActivation(echo);
 if(n&&d.kind==='relay')drawRelaySignal(n,m);
 if(n&&d.kind!=='relay'){const c=d.kind==='furnace'?'#ffbe75':'#8de5ee';const halo=ctx.createRadialGradient(n.x,n.y,10,n.x,n.y,100);halo.addColorStop(0,c+'28');halo.addColorStop(1,c+'00');ctx.fillStyle=halo;ctx.fillRect(n.x-100,n.y-100,200,200);ctx.strokeStyle=c+'70';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(n.x,n.y,112,0,TAU);ctx.stroke();ctx.strokeStyle=c;ctx.lineWidth=3;ctx.beginPath();ctx.arc(n.x,n.y,112,-Math.PI/2,-Math.PI/2+TAU*(d.kind==='seal'?1-n.hp/42:m.charge/1.5));ctx.stroke();ctx.fillStyle='#081923dc';ctx.fillRect(n.x-158,n.y+123,316,26);ctx.fillStyle='#e7f8ff';ctx.font='600 14px system-ui';ctx.textAlign='center';ctx.fillText(d.kind==='seal'?'ARCHIVE SEAL · SHOOT':d.kind==='furnace'?'DIVERSION CONTROL · HOLD NEAR':'RELAY · HOLD NEAR',n.x,n.y+142);}
 if(e)drawStoryGate(e);if(e?.returning){for(let i=0;i<5;i++){const p=storyCarrierPosition(e,i);if(p.u>=1)continue;ctx.strokeStyle='#a4ffdfaa';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x+35*p.scale,p.y);ctx.lineTo(p.x+90*p.scale,p.y);ctx.stroke();ctx.fillStyle='#071b28cf';ctx.fillRect(p.x-37,p.y+20,74,16);ctx.fillStyle='#c4fff0';ctx.font='600 9px system-ui';ctx.textAlign='center';ctx.fillText('FRIENDLY',p.x,p.y+31);}}
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
 ctx.save();ctx.fillStyle='#081923ce';ctx.fillRect(n.x-171,n.y+126,342,40);ctx.textAlign='center';ctx.fillStyle='#e7fff7';ctx.font='600 13px system-ui';ctx.fillText(near?`RECONNECTING · ${Math.floor(charge*100)}%`:'EXPEDITION RELAY · HOLD INSIDE RING',n.x,n.y+142);ctx.fillStyle='#9bc5ca';ctx.font='10px system-ui';ctx.fillText(`RECOVER THE TRANSMISSION · ${m.done}/3 LINKED`,n.x,n.y+158);ctx.restore();
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
 panel.innerHTML=`<span class="eyebrow">${phase===0?'GUARDIAN DOWN':phase===1?'SIGNAL TRANSFERRING':'SIGNAL SECURED'}</span><strong>${phase===2?(next?'NEXT: '+next.world.toUpperCase():'EXPEDITION HOME'):'RECOVERING THE SHARD'}</strong><p>${phase===2?storyServiceReceipt():'Drawing the signal aboard your ship'}</p>`;
}
function storyNova(){if(!storyActive())return;for(const target of storyTargets())if(target.hp>0)storyHitTarget({damage:50,seen:new Set()},target);}

function storyHomingTarget(s,target){for(const e of storyTargets())if(e.hp>0&&(e.x-s.x)*(s.direction||1)>-40&&(!target||Math.hypot(e.x-s.x,e.y-s.y)<Math.hypot(target.x-s.x,target.y-s.y)))target=e;return target;}

// Authored opening missions use pressure, recovery and a final escalation.
// The exploration archive retains its existing schedules and challenges.
const OPENING_MISSIONS=Object.freeze([
 {waves:[
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
  {at:46,count:3,type:3,center:250,formation:'line',aimed:true}
 ],beats:[
  {at:0,title:'FOLLOW THE SIGNAL',detail:'Reach the guardian · weapons fire automatically'},
  {at:9,title:'CONTACT BEHIND YOU',detail:'Flip to face left · clear the rear formation'},
  {at:17,title:'CLOUDBREAK',detail:'Keep moving across the aimed bursts'},
  {at:29,title:'CHANNEL CLEAR',detail:'Collect supplies · prepare for the counterattack'},
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
  {at:0,title:'ENTER THE FOUNDRY',detail:'Reach the Dreadnought · watch the machinery'},
  {at:16,title:'ANSWER THE DISTRESS CALL',detail:'Enter the green ring · gain a sabotage drone'},
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
 updateOpeningRescueMarker();
 const el=$('#flightObjective');if(!el)return;const task=openingMissionTask(),visible=!!task&&state==='playing'&&!sectorBlend&&!bossDefeated&&!boss&&annTimer<=0;
 el.hidden=!visible;if(!visible)return;
 hudText('#flightObjectiveTitle',task.title);hudText('#flightObjectiveDetail',task.detail);
}
// Four fixtures, attached to real solid patches on the scrolling shore. Their
// positions and cycles are simulation-time functions; no random per-frame jets.
function prepareOpeningJets(){
 getOpeningVentMesh();prepareOpeningJetSteam();const bands=prepareSceneryBorders().layers,jets=[];
 for(let i=0;i<4;i++){
  const at=32+i*3.6,edge=i%2,offset=sceneryBorderOffset((at+sectorIntroLead)*SCROLL_SPEED),band=bands[edge];
  let x=W-260,h=-1;
  for(let n=0;n<17;n++){const candidate=W-260+(n%2?1:-1)*Math.ceil(n/2)*24,height=sceneryBorderExtent(band,candidate-26,candidate+26,offset);if(height>42){x=candidate;h=height;break;}}
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
   if(openingJetContact(j,p,f.previous))damage();
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
 box(0,0,0,58,16,22,[77,91,94]);box(0,7,-8,46,13,13,[30,39,44]);
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
 hudText('#rescueTarget strong',m.available===false?'ENGINEER · WAIT FOR CLEARANCE':'ENGINEER · ENTER GREEN RING');
 const layout=readFlightMarkerLayout();if(!layout)return;
 const b=layout,x=b.left+clamp(m.x/W*b.width,98,b.width-98),y=b.top+clamp((m.y+FERRUM_RELAY.radius+68)/H*b.height,45,b.height-35);
marker.style.left=x/b.frameWidth*100+'%';marker.style.top=y/b.frameHeight*100+'%';
}

// The final defense and rescue share one centered portal. Only the rescue
// camera moves it; combat coordinates remain anchored while the gate charges.
function storyRescuePan(e){return e.returning?W*.22*navigationEase(e.returnAge/2.4):0;}
function storyRescueWorld(){const e=storyActive()?storyMission?.extract:null;return e?.returning?(e.sceneWorld??world)+storyRescuePan(e):null;}
function storyPortalPhase(e){return{open:e.returning?navigationEase((e.returnAge-1.3)/1.15):0,scale:1+(e.returning?.85*navigationEase(e.returnAge/2.4):0),spin:e.returning?e.age*.28+Math.min(e.returnAge,1.6)*2.8:e.age*.28,charge:e.returning?1:clamp(e.age/32,0,1)};}
function updateStoryEscort(e){const u=navigationEase(e.returnAge/2.4),start=e.escortStart||ship;ship.x=(start.x-storyRescuePan(e))*(1-u)+W*.80*u;ship.y=start.y*(1-u)+H*.79*u;ship.inv=Math.max(ship.inv,2);pilotTurn.target=Math.PI;}
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
  if(r.contactCooldown<=0&&pilotHullContactTime(r.contactOldX,r.contactOldY,r.x,r.y,r.r,e.previousShip?.x??ship.x,e.previousShip?.y??ship.y)<=1){damage();r.hp-=10;r.contactCooldown=1;burst(r.x,r.y,'#ff9872',6);}
  if(r.kind!=='skirmisher'&&r.shotCount<2&&r.age>=(r.shotAt??2)&&hostile.length<48&&Math.hypot(r.x-ship.x,r.y-ship.y)>180){aimed(r.x,r.y,400,0,'bolt');hostile.at(-1).c='#ff7865';r.shotCount++;r.shotAt=r.age+2.4;window.flightAudio?.shot?.('pulse',r.x,true);}
 }
 e.previousShip={x:ship.x,y:ship.y};
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
let storyPortalFrame=null,storyPortalRotor=null,storyPortalVista=null,storyPortalDestination=null;
function storyPortalRing(radius,width,depth,segments,rotor=false){
 const faces=[],cross=8;
 const v=(a,b)=>[Math.cos(a)*(radius+Math.cos(b)*width)*(rotor?1:.76),Math.sin(a)*(radius+Math.cos(b)*width),Math.sin(b)*depth];
 for(let i=0;i<segments;i++)for(let j=0;j<cross;j++){const a=i/segments*TAU,b=j/cross*TAU,c=(j+1)/cross*TAU,n=(i+1)/segments*TAU;faces.push({v:[v(a,b),v(n,b),v(n,c),v(a,c)],c:rotor?(i%6===0?[185,158,113]:[95,118,135]):i%8===0?[113,124,131]:[63,77,92],em:0,flex:0});}
 faces.industrial=true;return faces;
}
function prepareStoryPortal(){
 if(!storyPortalDestination){storyPortalDestination=new Image();storyPortalDestination.src='assets/portal-home-v170.webp';storyPortalDestination.decode?.().catch(()=>{});}
 if(!storyPortalFrame){storyPortalFrame=storyPortalRing(132,13,19,72);storyPortalRotor=storyPortalRing(111,6,9,64,true);}
 if(!storyPortalVista){
  const c=document.createElement('canvas');c.width=c.height=512;const v=c.getContext('2d'),sky=v.createLinearGradient(0,0,512,512);sky.addColorStop(0,'#080c30');sky.addColorStop(.4,'#173d65');sky.addColorStop(1,'#020920');v.fillStyle=sky;v.fillRect(0,0,512,512);
  for(let i=0;i<38;i++){const x=256+Math.cos(i*2.399)*Math.sqrt(i/38)*225,y=260+Math.sin(i*2.399)*95,r=22+(i%7)*12,g=v.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,i%2?'#a58de938':'#7dfff84a');g.addColorStop(1,'#294f8e00');v.fillStyle=g;v.fillRect(x-r,y-r,r*2,r*2);}
  for(let i=0;i<320;i++){const x=(i*97.13)%512,y=(i*177.31)%512,r=i%19===0?1.9:.65;v.globalAlpha=.3+(i%7)*.1;v.fillStyle=i%3?'#e3f7ff':'#9affec';v.beginPath();v.arc(x,y,r,0,TAU);v.fill();}v.globalAlpha=1;
  // The retained cosmic field is a loading fallback; the home environment
  // image is queued when entering Aureus, before the final guardian fight.
  storyPortalVista=c;
 }
 window.gpuModels?.prepare([storyPortalFrame,storyPortalRotor,storyRaiderMesh()],sectors[level].id);
}
function drawStoryGate(e){
 if(!storyPortalFrame)prepareStoryPortal();const g=storyGatePosition(e),p=storyPortalPhase(e),t=e.returning?e.returnAge:e.age,rx=78*p.scale,ry=103*p.scale,panorama=storyPortalDestination?.complete&&storyPortalDestination.naturalWidth?storyPortalDestination:storyPortalVista,sourceW=panorama.naturalWidth||panorama.width,sourceH=panorama.naturalHeight||panorama.height;
 drawModel(storyPortalFrame,g.x,g.y,p.scale,.12,-.05,0,t,0);window.gpuModels?.flush(ctx);ctx.save();ctx.translate(g.x,g.y);ctx.scale(.76,1);drawModel(storyPortalRotor,0,0,p.scale,0,0,p.spin,t,0);window.gpuModels?.flush(ctx);ctx.restore();
 ctx.save();ctx.translate(g.x,g.y);
 const halo=ctx.createRadialGradient(0,0,rx*.7,0,0,ry*1.8);halo.addColorStop(0,`rgba(126,225,255,${.08+p.open*.28})`);halo.addColorStop(.6,`rgba(86,150,242,${p.open*.14})`);halo.addColorStop(1,'#466eff00');ctx.fillStyle=halo;ctx.fillRect(-ry*1.8,-ry*1.8,ry*3.6,ry*3.6);
 ctx.save();ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,TAU);ctx.clip();ctx.fillStyle='#050d20';ctx.fillRect(-rx,-ry,rx*2,ry*2);
 if(p.open>0){ctx.globalAlpha=p.open;ctx.drawImage(panorama,-ry,-ry,ry*2,ry*2);
  // Subtle whole-window refraction stays transparent enough to reveal the
  // rendered destination. The river has its own visible flowing reflection.
  for(let i=0;i<18;i++){const y=-ry+i*ry/9,shift=Math.sin(i*.9-t*2.6)*2*p.scale;ctx.globalAlpha=.18*p.open;ctx.drawImage(panorama,0,i*sourceH/18,sourceW,sourceH/18,-ry+shift,y,ry*2,ry/9+1);}
  ctx.save();ctx.beginPath();ctx.moveTo(-rx*.16,-ry*.12);ctx.lineTo(rx*.22,-ry*.12);ctx.lineTo(rx*.70,ry);ctx.lineTo(-rx*.75,ry);ctx.closePath();ctx.clip();
  for(let i=9;i<24;i++){const u=i/24,shift=Math.sin(u*35-t*3.4)*1.9*p.scale;ctx.globalAlpha=.42*p.open;ctx.drawImage(panorama,0,u*sourceH,sourceW,sourceH/24,-ry+shift,-ry+u*ry*2,ry*2,ry/12+1);}
  ctx.restore();ctx.globalAlpha=.23*p.open;ctx.strokeStyle='#edfff9';ctx.lineWidth=.8*p.scale;
  for(const f of [{x:.59,y:.345,h:.10},{x:.72,y:.345,h:.16},{x:.83,y:.31,h:.26},{x:.20,y:.35,h:.18}])for(let i=0;i<5;i++){const u=(t*.75+i/5)%1,x=(f.x-.5)*ry*2+Math.sin(i*2.3)*2*p.scale,y=(f.y-.5+u*f.h)*ry*2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+.6*p.scale,y+5*p.scale);ctx.stroke();}
  // Uneven traveling wavefronts move across the glassy aperture, rather
  // than turning the vista into a uniform set of concentric target circles.
  ctx.globalCompositeOperation='screen';for(let i=0;i<6;i++){const u=(t*.22+i/6)%1,r=Math.max(1,u*rx);ctx.globalAlpha=(1-u)*.16*p.open;ctx.strokeStyle=i%2?'#b4feff':'#c5b7ff';ctx.lineWidth=(1-u)*2+1;ctx.beginPath();for(let j=0;j<=56;j++){const a=j/56*TAU,wave=1+.04*Math.sin(a*5+t*3+i),x=Math.cos(a)*r*wave,y=Math.sin(a)*r*ry/rx*wave;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.stroke();}
  ctx.globalAlpha=.55*p.open;ctx.strokeStyle='#c9ffff';ctx.lineWidth=1;for(let i=0;i<30;i++){const a=i*2.399+t*.18,u=((t*.14+i*.618)%1),r=(.2+u*.8)*rx;ctx.beginPath();ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r*ry/rx);ctx.lineTo(Math.cos(a)*r*(1+.06*u),Math.sin(a)*r*ry/rx*(1+.06*u));ctx.stroke();}
 }
 ctx.restore();ctx.globalAlpha=1;
 // Lock lamps fill as the defense proceeds. The center spins independently
 // until the locks engage; the aperture then blooms into a larger window.
 ctx.save();ctx.scale(p.scale,p.scale);for(let i=0;i<9;i++){const a=i/9*TAU-Math.PI/2,on=i/9<=p.charge;ctx.save();ctx.translate(Math.cos(a)*101,Math.sin(a)*132);ctx.rotate(a);ctx.fillStyle=on?'#d1fff2':'#354355';ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(-3,-7);ctx.lineTo(-3,7);ctx.fill();ctx.restore();}
 ctx.strokeStyle=p.open?'#c2fffa':'#79bdd6';ctx.lineWidth=p.open?3:1.5;ctx.beginPath();ctx.ellipse(0,0,78,103,0,0,TAU);ctx.stroke();
 for(let i=0;i<28;i++){const a=i/28*TAU+p.spin;ctx.strokeStyle=i%4?'#a2bec9':'#f3d3a3';ctx.lineWidth=i%4?1:3;ctx.beginPath();ctx.moveTo(Math.cos(a)*84,Math.sin(a)*110);ctx.lineTo(Math.cos(a)*89,Math.sin(a)*117);ctx.stroke();}ctx.restore();
 const bloom=e.returning?Math.sin(clamp((t-1.3)/1.2,0,1)*Math.PI)*.5:0;if(bloom>0){ctx.globalCompositeOperation='screen';const light=ctx.createRadialGradient(0,0,5,0,0,ry*1.7);light.addColorStop(0,`rgba(223,255,255,${bloom})`);light.addColorStop(1,'#7b9cff00');ctx.fillStyle=light;ctx.fillRect(-ry*1.7,-ry*1.7,ry*3.4,ry*3.4);ctx.globalCompositeOperation='source-over';}
 if(e.repairGlow>0){ctx.globalAlpha=e.repairGlow/2;ctx.strokeStyle='#b8ffe4';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,rx+30+(2-e.repairGlow)*45,ry+30+(2-e.repairGlow)*45,0,0,TAU);ctx.stroke();ctx.globalAlpha=1;}
 ctx.restore();
}
function updateStoryPortalHUD(){
 const marker=$('#portalObjective'),e=storyMission?.extract,visible=storyActive()&&!!e&&state==='playing'&&!sectorBlend&&!storyMission.complete;
 if(!marker)return;marker.hidden=!visible;if(!visible)return;
 const g=storyGatePosition(e),p=storyPortalPhase(e),b=readFlightMarkerLayout();if(!b)return;const x=b.left+g.x/W*b.width,y=clamp(b.top+(g.y+154*p.scale)/H*b.height,0,b.frameHeight-48);marker.style.left=x/b.frameWidth*100+'%';marker.style.top=y/b.frameHeight*100+'%';
 hudText('#portalObjective strong',e.returning?(e.returnAge<2.5?'PORTAL SECURED · OPENING HOME':'BRINGING YOUR PEOPLE HOME'):'DEFEND THE PORTAL · SAVE YOUR PEOPLE');
 hudText('#portalObjective span',e.returning?`FRIENDLY CARRIERS ${e.evacuated}/5 · WEAPONS SAFE`:`BOTH SIDES · INTEGRITY ${e.hp}/${e.max}${e.age<32?' · '+Math.ceil(32-e.age)+'s':' · CLEAR THE APPROACH'}`);
}
function showCampaignBrief(){
 if(state!=='title')return;migrateStoryVictories();const p=storyStore.snapshot(),index=p.complete?0:Math.max(0,STORY_ROUTE.findIndex(m=>m.id===p.next)),next=STORY_ROUTE[index];atlasOpen=true;
 const overlay=$('#overlay');overlay.className='overlay story-transmission';overlay.innerHTML=`<section class="transmission-card campaign-brief" aria-labelledby="campaignBriefTitle"><span class="eyebrow mint">SIX MISSIONS · THREE SOLAR SYSTEMS</span><h2 id="campaignBriefTitle">Bring them home.</h2><p class="transmission-task">Follow the Origin Signal. Recover six shards to reopen their route home.</p><ul class="brief-goals"><li><b>Find them</b><span>Rescue the engineer. Follow their transmissions.</span></li><li><b>Open the way</b><span>Recover six shards. Restore the relays and rescue gate.</span></li><li><b>Bring them home</b><span>Defend the final portal while your people escape.</span></li></ul><p class="transmission-service">${p.count?'RESUMING':'FIRST DESTINATION'} · ${next.world.toUpperCase()} · ${next.title}</p><div class="transmission-actions"><button id="campaignTakeoff" class="primary">${p.count&&!p.complete?'CONTINUE':'BEGIN'} CAMPAIGN ↗</button><button id="storyBack" class="transmission-secondary">Back</button></div></section>`;
 $('#storyBack').onclick=showTitleScreen;$('#campaignTakeoff').onclick=()=>{atlasOpen=false;beginStory(index);};$('#campaignTakeoff').focus({preventScroll:true});
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
