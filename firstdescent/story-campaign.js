'use strict';
// A fixed story route, independent of the additive 92-world exploration archive.
const STORY_ROUTE=[
 {id:'verdant-reach',world:'Caelus',system:'Vesper',title:'First Contact',kind:'guardian',brief:'Defeat the guardian. Recover the signal that led the expedition here.',result:'A damaged star map reveals a distress call from Ferrum.',socket:'Distress coordinates',benefit:'Route to Ferrum · hull service and one nova'},
 {id:'ember-forge',world:'Ferrum',system:'Vesper',title:'The Last Engineer',kind:'guardian',brief:'Dismantle the Dreadnought. Approach the escape pod to rescue its engineer and gain a sabotage drone.',result:'The Foundry shard completes the coordinates to Orison. A submerged relay is still transmitting.',socket:'Orison coordinates',benefit:'Engineer can repair the final beacon once if rescued'},
 {id:'lumen-reef',world:'Thalassa',system:'Orison',title:'The Sunken Relay',kind:'relay',brief:'Stay inside each relay’s ring to reconnect three nodes. Defeat the guardian to recover the transmission.',result:'“We reached Eventide. Our ship is gone. The archive carries us.” The recording points to Nivara.',socket:'Expedition recording',benefit:'Relay uplink adds two points of extraction integrity'},
 {id:'nivara-glacial-heart',world:'Nivara',system:'Orison',title:'The Frozen Archive',kind:'seal',brief:'Shoot through three frozen archive seals, then defeat the sentinel. The fragments hold the way to Eventide.',result:'The archive reveals a dormant gate in Eventide. Its furnace must be restarted before the expedition can escape.',socket:'Eventide coordinates',benefit:'Archive telemetry reveals openings when later guardians change phase'},
 {id:'eventide-carmine-corona',world:'Carmine',system:'Eventide',title:'The Gate Furnace',kind:'furnace',brief:'Hold near three diversion controls during the guardian encounter. Route their energy into the rescue gate.',result:'The gate has power. Aureus holds the final signal. Recover it and protect the extraction beacon.',socket:'Gate ignition',benefit:'Diversion controls grant a brief hull guard · rescue gate powered'},
 {id:'eventide-aureus-corona',world:'Aureus',system:'Eventide',title:'Bring Them Home',kind:'extraction',brief:'Defeat the Origin guardian. Then intercept raiders before they reach the extraction beacon.',result:'The expedition’s voices cross the gate. Their archive is safe. You have brought them home.',socket:'Extraction signal',benefit:'Protect the archive carriers and watch them cross the rescue gate'}
];
const STORY_DEFINITION={id:'origin-route-001',version:1,finalStage:STORY_ROUTE[5].id,systems:['Vesper','Orison','Eventide'].map(name=>({id:name,name,discovery:name+' route decoded',stages:STORY_ROUTE.filter(m=>m.system===name).map(m=>({id:m.id,name:m.world,kind:'core'}))})),milestones:[]};
const storyStore=createOriginStore(missionPreview?null:runStorage,STORY_DEFINITION);
let storyMission=null;
function migrateStoryVictories(){for(const m of STORY_ROUTE.slice(0,2))if(originStore.has(m.id))storyStore.collect(m.id);}
function storyIndex(){return flightRun?.story===STORY_DEFINITION.id?STORY_ROUTE.findIndex(m=>m.id===sectors[level].id):-1;}
function storyActive(){return storyIndex()>=0;}
function storyNextLevel(){const next=STORY_ROUTE[storyIndex()+1];return next?sectors.findIndex(s=>s.id===next.id):-1;}
function prepareStoryMission(){const i=storyIndex();storyMission=i<0?null:{index:i,done:0,charge:0,node:null,guardian:false,complete:false,age:0,extract:null,relayEchoes:[],bossPhase:-1,pendingPhase:false};if(i>=0){if(flightRun.storyEngineer===undefined)flightRun.storyEngineer=i>1&&relayStore.snapshot().unlocked;const kind=STORY_ROUTE[i].kind;if(kind!=='guardian')window.gpuModels?.prepare([storyMesh(kind==='extraction'?'beacon':kind),...(kind==='extraction'?[storyMesh('raider'),storyMesh('carrier')]:[])],sectors[level].id);}}
function storyCheckpoint(){if(!storyActive()||!storyMission)return null;return{index:storyMission.index,done:storyMission.done,guardian:storyMission.guardian,complete:storyMission.complete,reward:storyMission.reward,engineer:!!flightRun.storyEngineer,extract:!!storyMission.extract};}
function restoreStoryCheckpoint(saved){if(!storyActive()||saved?.index!==storyIndex())return;storyMission.done=Math.max(0,Math.min(3,saved.done||0));storyMission.guardian=!!saved.guardian;storyMission.complete=!!saved.complete;storyMission.reward=saved.reward;flightRun.storyEngineer=!!saved.engineer;if(saved.guardian){bossDefeated=true;transition=4;time=Math.max(time,sectors[level].duration+.01);world=time*SCROLL_SPEED;}if(saved.extract&&!saved.complete)beginStoryExtraction();}
function storyObjective(){const m=storyMission,d=STORY_ROUTE[storyIndex()];if(!d||!m)return '';if(m.complete)return 'SIGNAL SHARD SECURED · ROUTE UPDATED';if(m.extract){const e=m.extract;return e.returning?`RESCUING EXPEDITION ${e.evacuated}/5 · FRIENDLY CARRIERS · WEAPONS SAFE`:`${e.age>=32?'INTERCEPT FINAL RAIDERS':'PROTECT BEACON · '+Math.ceil(32-e.age)+'s'} · INTEGRITY ${e.hp}/${e.max}${e.engineer&&!e.repaired?' · ENGINEER ON STANDBY':''}`;}
 const task=d.kind==='relay'?`LINK RELAYS ${m.done}/3 · HOLD INSIDE RING`:d.kind==='seal'?`BREAK SEALS ${m.done}/3 · SHOOT THE CORE`:d.kind==='furnace'?`DIVERT ENERGY ${m.done}/3 · HOLD INSIDE RING`:d.kind==='extraction'?'DEFEAT GUARDIAN · THEN PROTECT BEACON':d.world==='Ferrum'?'DEFEAT DREADNOUGHT · ENGINEER RESCUE OPTIONAL':'DEFEAT GUARDIAN · RECOVER SIGNAL';return `${m.index+1}/6 · ${m.done===3?'OBJECTIVE COMPLETE · DEFEAT GUARDIAN':task}${m.guardian?' · GUARDIAN DOWN':''}`;}
function beginStory(target){migrateStoryVictories();const p=storyStore.snapshot();const index=target===undefined?(p.complete?0:STORY_ROUTE.findIndex(m=>m.id===p.next)):target;if(!Number.isInteger(index)||index<0||index>=6)return;if(STORY_ROUTE.slice(0,index).some(m=>!storyStore.has(m.id)))return;beginDescent(sectors.findIndex(s=>s.id===STORY_ROUTE[index].id),'story');}
function storySocketMarkup(){const p=storyStore.snapshot();return `<div class="story-route">${STORY_ROUTE.map((m,i)=>{const done=storyStore.has(m.id),open=STORY_ROUTE.slice(0,i).every(s=>storyStore.has(s.id));return `<article class="story-stop ${done?'secured':open?'available':'locked'}"><span class="eyebrow">${m.system} · ${String(i+1).padStart(2,'0')}</span><h3><span aria-label="${done?'Shard secured':'Empty socket'}">${done?'◆':'◇'}</span> ${m.world}</h3><strong>${m.title}</strong><p>${m.brief}</p><p class="story-benefit">${m.benefit}</p><small>${done?'SHARD SECURED':open?'ROUTE OPEN':'ROUTE LOCKED'} · ${m.socket}</small></article>`;}).join('')}</div>`;}
function showStoryMap(resume=false){if(state!=='title'&&state!=='paused')return;const previous=state;migrateStoryVictories();const p=storyStore.snapshot(),next=STORY_ROUTE.find(m=>m.id===p.next),overlay=$('#overlay');atlasOpen=true;atlasSystemId=null;overlay.className='overlay universe-atlas origin-log';overlay.onclick=null;overlay.innerHTML=`<div class="atlas-shell story-shell"><header class="atlas-header"><div><span class="eyebrow mint">THE ORIGIN SIGNAL · SIX MISSIONS</span><h2>BRING THEM HOME</h2><p>Find the lost expedition. Rebuild its route through three solar systems.</p></div><button id="storyBack">${resume?'RESUME FLIGHT':'← MAIN MENU'}</button></header><section class="origin-summary"><div><span class="eyebrow">SIGNAL SHARDS</span><strong>${p.count}<small> / 6 secured</small></strong><progress max="6" value="${p.count}" aria-label="Story route progress"></progress></div><div><h3>${p.complete?'The expedition is home.':next.world+' · '+next.title}</h3><p>${p.complete?'All six signals form a route home. Your full universe archive remains available to explore.':next.brief}</p>${resume?'':`<button id="storyLaunch" class="primary">${p.complete?'REPLAY STORY':'CONTINUE STORY'} ↗</button>`}</div></section>${storySocketMarkup()}<p class="atlas-note">${p.durable?'Saved on this device.':'Session preview · progress resets on reload.'} Completed missions survive defeat. Signal Shards open the next mission automatically. The engineer is optional.</p>${resume?'':typeof relayLoadoutMarkup==='function'?'<section class="relay-card"><div><h3>FLIGHT EQUIPMENT</h3><p>Rescue the engineer on Ferrum to unlock the Recovery Kit.</p>'+relayLoadoutMarkup()+'</div></section>':''}<div class="relay-actions">${resume?'':`<button id="storyArchive">EXPLORATION ARCHIVE · ${originStore.snapshot().count}/92</button>`}${resume?'':'<button id="storyExplore">FLY EXPLORATION ROUTE ↗</button>'}</div><p class="atlas-note">Your exploration archive is separate. Story missions do not require collecting all 92 crystals.</p></div>`;
 $('#storyBack').onclick=()=>{atlasOpen=false;if(resume&&previous==='paused'){state='paused';pause();}else showTitleScreen();};if(!resume){$('#storyLaunch').onclick=()=>beginStory();$('#storyExplore').onclick=()=>beginDescent(0,'exploration');}if(!resume)$('#storyArchive').onclick=()=>{if(resume)return;atlasOpen=false;state='title';showOriginMission();};if(!resume)for(const mode of ['standard','support']){const button=$('[data-relay-loadout="'+mode+'"]');if(button)button.onclick=()=>{if(mode==='support'&&!relayStore.snapshot().unlocked)return;relayLoadout=mode;showStoryMap();};}$('#storyBack').focus();}
function storyGuardianDefeated(b){if(!storyActive()||b!==boss||b.hp>0)return false;storyMission.guardian=true;if(storyIndex()===1)flightRun.storyEngineer=!!ferrumMission?.boarded;storyMission.shardSource={x:b.x,y:b.y};if(flightRun.storyOwner===originStore.account())originStore.collect(sectors[level].id);saveCheckpoint();return true;}
// Rewards follow the reached route, rather than granting all replay unlocks at launch.
function storyBenefits(){const i=storyIndex();return{uplink:i>2,telemetry:i>3,engineer:!!flightRun?.storyEngineer};}
function beginStoryExtraction(){
 const benefits=storyBenefits(),max=benefits.uplink?8:6;
 storyMission.extract={age:0,hp:max,max,next:2,spawned:0,raiders:[],x:360,y:H/2,engineer:benefits.engineer,repaired:false,repairGlow:0,returning:false,returnAge:0,evacuated:0};
 ship.hp=Math.max(ship.hp,3);ship.inv=Math.min(ship.inv,2);
 announce('BEACON ONLINE',`DESTROY RAIDERS · KEEP THE BEACON ALIVE · INTEGRITY ${max}${benefits.engineer?' · ENGINEER ON STANDBY':''}`,3);window.flightAudio?.setMusicActive(true);
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
 e.returning=true;e.returnAge=0;e.raiders=[];shots=[];muzzleFlash=0;explosions=[];hostile=[];hazards=[];acidClouds=[];enemies=[];ship.inv=Math.max(ship.inv,8);
 announce('EXPEDITION IN TRANSIT','FRIENDLY CARRIERS → GATE HOME · WEAPONS SAFE',3);window.flightAudio?.signalRecovered?.(1,true);
}
function storyCarrierPosition(e,i){
 const u=clamp((e.returnAge-i*.65)/2.8,0,1),gate=storyGatePosition(e);
 return{x:e.x+(gate.x-e.x)*navigationEase(u),y:e.y+Math.sin(i*1.7)*65*(1-u),scale:1-navigationEase((u-.78)/.22),u};
}
function storyGatePosition(e){return{x:Math.min(W-150,e.x+580),y:e.y};}
function storyMayFire(){return storyActive()&&!storyMission?.complete&&!storyMission?.extract?.returning;}
function playerWeaponsActive(){return typeof storyActive==='function'&&storyActive()?storyMayFire():!bossDefeated;}
function storyTarget(){return storyActive()&&STORY_ROUTE[storyIndex()].kind==='seal'?storyMission?.node:null;}
const STORY_NO_TARGETS=Object.freeze([]);
function storyTargets(){if(!storyActive())return STORY_NO_TARGETS;const n=storyTarget();return [...(n&&n.hp>0?[n]:[]),...(storyMission?.extract?.raiders||[]).filter(r=>r.hp>0)];}
function storyHitTarget(s,target){target.hp-=s.damage;s.seen.add(target);s.spent=true;burst(target.x,target.y,target.storySeal?'#bcefff':'#ffab79',5);if(target.hp<=0){explode(target.x,target.y,target.storySeal?'#bcefff':'#ffa265',target.storySeal?1:.65,false);if(target.storySeal)finishStoryNode();}}
function finishStoryNode(){const m=storyMission;if(!m||m.done>=3)return;if(m.node)m.relayEchoes.push({...m.node,kind:STORY_ROUTE[m.index].kind,age:0,number:m.done+1});m.done++;if(STORY_ROUTE[m.index].kind==='furnace'){ship.inv=Math.max(ship.inv,3);rings.push({x:ship.x,y:ship.y,r:20,life:.9,c:'#ffdc8b'});}m.node=null;m.charge=0;window.flightAudio?.engineerCue?.('link',ship.x);announce(m.done===3?'LINK COMPLETE':`NODE ${m.done} / 3 SECURED`,STORY_ROUTE[m.index].kind==='furnace'?'GATE ENERGY ROUTED · HULL GUARD 3s':m.done===3?'RECOVER THE GUARDIAN’S SIGNAL':'NEXT SIGNAL LOCATED',1);saveCheckpoint();}
function storyNodePosition(n,dt){
 // Repeating approaches prevent a missed object from blocking the mission.
 n.x-=dt*48;if(n.x< -130)n.x=W+130;
 const solids=obstacles.flatMap(obstacleSolids);let target=n.baseY;const clear=y=>!sceneryBorderContact(n.x,y,78,70)&&solids.every(r=>n.x+78<r.x||n.x-78>r.x+r.w||y+70<r.y||y-70>r.y+r.h);
 if(!clear(target))target=[H/2,250,510,310,450].find(clear)??H/2;n.y+=(target-n.y)*Math.min(1,dt*3);
}
function updateStoryMission(dt){if(!storyActive()||!storyMission||state!=='playing'||sectorBlend)return;const m=storyMission,d=STORY_ROUTE[m.index];m.age+=dt;for(const echo of m.relayEchoes){echo.age+=dt;echo.x-=48*dt;}m.relayEchoes=m.relayEchoes.filter(e=>e.age<2.2);if(m.complete)return;
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
  if(e.returning){e.returnAge+=dt;const previous=e.evacuated;e.evacuated=0;for(let i=0;i<5;i++)if(storyCarrierPosition(e,i).u===1)e.evacuated++;if(e.evacuated>previous){const g=storyGatePosition(e);burst(g.x,g.y,'#b8ffe4',10);window.flightAudio?.engineerCue?.('link',g.x);}if(e.returnAge<6)return;}
  else{
  e.age+=dt;e.next-=dt;window.flightAudio?.setIntensity(.85);
  if(e.next<=0&&e.spawned<14){e.next=1.9;const i=e.spawned++;e.raiders.push({storyRaider:true,x:i%3===2?-45:W+45,y:150+(i*173)%450,hp:13,r:23,age:0});}
  for(const r of e.raiders){if(r.hp<=0)continue;r.age+=dt;const dx=e.x-r.x,dy=e.y-r.y,len=Math.hypot(dx,dy),step=dt*145;r.x+=dx/Math.max(1,len)*step;r.y+=dy/Math.max(1,len)*step;if(len<36){r.hp=0;e.hp--;repairStoryBeacon(e);burst(e.x,e.y,'#ffad72',18);window.flightAudio?.shipHit?.(e.x,false);}else if(Math.hypot(r.x-ship.x,r.y-ship.y)<r.r+25){damage();r.hp=0;}}
  e.raiders=e.raiders.filter(r=>r.hp>0);
  repairStoryBeacon(e);
  if(e.hp<=0){announce('EXTRACTION INTERRUPTED','RETRY THE BEACON DEFENSE',3);end(false);return;}if(e.age<32||e.raiders.length)return;beginStoryReturn(e);return;
  }
 }else if(['relay','seal','furnace'].includes(d.kind)&&m.done<3)return;
 m.complete=true;const hullBefore=ship.hp,novaBefore=novas;ship.hp=Math.min(5,ship.hp+1);novas=Math.min(3,novas+1);m.reward={hull:ship.hp-hullBefore,novas:novas-novaBefore};queuePickupEffect('rescue',{title:'MISSION REWARD · SIGNAL SECURED',detail:`HULL +${ship.hp-hullBefore} · NOVA +${novas-novaBefore} · ROUTE UPDATED`},m.shardSource||ship);ship.inv=Math.max(ship.inv,ORIGIN_RECOVERY_DURATION+1);saveCheckpoint();if(flightRun.storyOwner===storyStore.account())storyStore.collect(d.id);transition=3.4;originRecovery={story:true,index:m.index,x:clamp(m.shardSource?.x??ship.x+220,70,W-70),y:clamp(m.shardSource?.y??ship.y,90,H-90),kind:originEntry(d.id)?.kind||'core',age:0,phase:-1};updateOriginRecovery(0);annTimer=0;$('#announcement').style.opacity=0;updateHUD();
}
function finishStorySector(){if(!storyActive())return false;if(!storyMission?.complete){transition=1;return true;}showStoryDebrief();return true;}
// Brief transmissions keep the next action in view; the full route is optional.
const STORY_TRANSMISSIONS=[
 {voice:'DISTRESS CALL · FERRUM',line:'“The Foundry is falling. One engineer is still alive.”',task:'Break the Dreadnought. Reach the escape pod.'},
 {voice:'RECOVERED TRANSMISSION · ORISON',line:'“There is a signal under the water. It is still calling.”',task:'Reconnect three relays. Follow the expedition.'},
 {voice:'EXPEDITION RECORDING · NIVARA',line:'“Our ship is gone. The archive carries us.”',task:'Break the frozen seals. Recover the way to Eventide.'},
 {voice:'ARCHIVE DECODED · EVENTIDE',line:'“There is a way home. But the gate has no power.”',task:'Divert the furnace energy. Restart the rescue gate.'},
 {voice:'RESCUE CHANNEL · AUREUS',line:'“We can see the gate. Please do not leave us here.”',task:'Defeat the guardian. Protect the extraction beacon.'},
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
 state=final?'victory':'debrief';if(final)recordFlightRun(true);atlasOpen=false;keys.clear();pointer=null;touchContacts.clear();annTimer=0;$('#announcement').style.opacity=0;$('#pause').hidden=true;$('#touchControls').classList.remove('active');$('#originRecoveryPanel').hidden=true;window.flightAudio?.setBossApproach?.(0);window.flightAudio?.setIntensity?.(.12);window.flightAudio?.setMusicActive(true);
 const overlay=$('#overlay');overlay.onclick=null;
 const receipt=storyServiceReceipt(),crew=index===1&&flightRun?.storyEngineer?'ENGINEER ABOARD · SABOTAGE DRONE ONLINE':index===1&&r&&!r.rescued?'Engineer rescue available on a replay':final&&flightRun?.storyEngineer?'Your engineer helped bring them home.':'';
 let routePresented=false;
 const renderTransmission=()=>{
  overlay.className='overlay story-transmission';overlay.scrollTop=0;
  overlay.innerHTML=`<section class="transmission-card ${routePresented?'settled':''}" aria-labelledby="transmissionTitle"><div class="transmission-heading"><span class="eyebrow mint">${final?'EXPEDITION COMPLETE':'SIGNAL RECOVERED'}</span><span class="transmission-count">${index+1} / 6</span></div><div class="transmission-link" aria-hidden="true"><svg viewBox="0 0 400 48"><path class="transmission-trail" d="M18 24 H380"/><path class="transmission-route-progress" d="M18 24 H380"/><circle cx="18" cy="24" r="5"/><circle class="transmission-destination" cx="380" cy="24" r="7"/></svg><span>${d.world.toUpperCase()}</span><span>${next?next.world.toUpperCase():'HOME'}</span></div><p class="transmission-channel">${message.voice}</p><h2 id="transmissionTitle">${final?'WELCOME HOME':message.line}</h2><p class="transmission-task">${final?message.line:message.task}</p>${crew?`<p class="transmission-crew">${crew}</p>`:''}${receipt&&!final?`<p class="transmission-service">${receipt}</p>`:''}${final?`<p class="transmission-service">${message.task}</p>`:''}${storyTransmissionRoute(index)}<div class="transmission-actions"><button id="storyContinue" class="primary">${next?'LAUNCH TO '+next.world.toUpperCase():'BACK TO BASE'} <span aria-hidden="true">↗</span></button><button id="storyJourney" class="transmission-secondary">Journey</button></div></section>`;
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
 }else if(kind==='raider'){
  m.ellipsoid(0,0,0,23,10,9,[113,44,38],0,14,8);
  for(const side of [-1,1]){m.wedge([12,side*4,0],[-20,side*23,4],[-14,side*5,-6],3,[167,76,51]);m.ellipsoid(-14,side*10,1,4,5,5,[241,171,88],.6,8,6);}
  m.ellipsoid(12,-1,-8,5,3,2,[244,194,115],.5,8,6);
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
 if(e?.returning)for(let i=0;i<5;i++){const p=storyCarrierPosition(e,i);if(p.u<1)drawModel(storyMesh('carrier'),p.x,p.y,p.scale,0,0,0,m.age,0);}
 if(e){drawModel(storyMesh('beacon'),e.x,e.y,1.3,.1*Math.sin(m.age),0,0,m.age,0);for(const r of e.raiders)drawModel(storyMesh('raider'),r.x,r.y,1,0,0,Math.atan2(e.y-r.y,e.x-r.x),r.age,0);}
 window.gpuModels?.flush(ctx);ctx.save();
 for(const echo of m.relayEchoes)drawRelayActivation(echo);
 if(n&&d.kind==='relay')drawRelaySignal(n,m);
 if(n&&d.kind!=='relay'){const c=d.kind==='furnace'?'#ffbe75':'#8de5ee';const halo=ctx.createRadialGradient(n.x,n.y,10,n.x,n.y,100);halo.addColorStop(0,c+'28');halo.addColorStop(1,c+'00');ctx.fillStyle=halo;ctx.fillRect(n.x-100,n.y-100,200,200);ctx.strokeStyle=c+'70';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(n.x,n.y,112,0,TAU);ctx.stroke();ctx.strokeStyle=c;ctx.lineWidth=3;ctx.beginPath();ctx.arc(n.x,n.y,112,-Math.PI/2,-Math.PI/2+TAU*(d.kind==='seal'?1-n.hp/42:m.charge/1.5));ctx.stroke();ctx.fillStyle='#081923dc';ctx.fillRect(n.x-158,n.y+123,316,26);ctx.fillStyle='#e7f8ff';ctx.font='600 14px system-ui';ctx.textAlign='center';ctx.fillText(d.kind==='seal'?'ARCHIVE SEAL · SHOOT':d.kind==='furnace'?'DIVERSION CONTROL · HOLD NEAR':'RELAY · HOLD NEAR',n.x,n.y+142);}
 if(e?.returning){drawStoryGate(e);for(let i=0;i<5;i++){const p=storyCarrierPosition(e,i);if(p.u>=1)continue;ctx.strokeStyle='#a4ffdfaa';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x-35*p.scale,p.y);ctx.lineTo(p.x-65*p.scale,p.y);ctx.stroke();ctx.fillStyle='#071b28cf';ctx.fillRect(p.x-37,p.y+20,74,16);ctx.fillStyle='#c4fff0';ctx.font='600 9px system-ui';ctx.textAlign='center';ctx.fillText('FRIENDLY',p.x,p.y+31);}}
 if(e){if(e.repairGlow>0){ctx.strokeStyle='#b8ffe4';ctx.globalAlpha=e.repairGlow/2;ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,55+(2-e.repairGlow)*70,0,TAU);ctx.stroke();ctx.globalAlpha=1;}ctx.strokeStyle=e.returning?'#8df6d7':'#ffc485';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,55+Math.sin(m.age*2)*3,0,TAU);ctx.stroke();ctx.fillStyle='#b7ffe8';ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillText(e.returning?`FRIENDLY CARRIERS · ${e.evacuated}/5`:`DEFEND BEACON · ${e.hp}/${e.max}`,e.x,e.y+80);for(const r of e.raiders){ctx.fillStyle='#091620dd';ctx.fillRect(r.x-48,r.y+28,96,20);ctx.fillStyle='#ffd39c';ctx.font='600 10px system-ui';ctx.fillText('RAIDER · STOP',r.x,r.y+42);ctx.strokeStyle='#ffc590';ctx.lineWidth=3;const a=Math.atan2(e.y-r.y,e.x-r.x);ctx.beginPath();ctx.moveTo(r.x-Math.cos(a)*22,r.y-Math.sin(a)*22);ctx.lineTo(r.x-Math.cos(a)*(36+Math.sin(r.age*36)*5),r.y-Math.sin(a)*36);ctx.stroke();}}
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
 const d=STORY_ROUTE[r.index],next=STORY_ROUTE[r.index+1];if(phase===2)window.flightAudio?.signalRecovered?.((r.index+1)/6,true);
 const panel=$('#originRecoveryPanel');if(!panel)return;panel.hidden=false;panel.classList.add('story-recovery');
 panel.innerHTML=`<span class="eyebrow">${phase===0?'GUARDIAN DOWN':phase===1?'SIGNAL TRANSFERRING':'SIGNAL SECURED'}</span><strong>${phase===2?(next?'NEXT: '+next.world.toUpperCase():'EXPEDITION HOME'):'RECOVERING THE SHARD'}</strong><p>${phase===2?storyServiceReceipt():'Drawing the signal aboard your ship'}</p>`;
}
function storyNova(){if(!storyActive())return;for(const target of storyTargets())if(target.hp>0)storyHitTarget({damage:50,seen:new Set()},target);}

function storyHomingTarget(s,target){for(const e of storyTargets())if(e.hp>0&&(e.x-s.x)*(s.direction||1)>-40&&(!target||Math.hypot(e.x-s.x,e.y-s.y)<Math.hypot(target.x-s.x,target.y-s.y)))target=e;return target;}

function drawStoryGate(e){
 const g=storyGatePosition(e),t=e.returnAge,open=navigationEase(Math.min(1,t/.7)),fade=1-navigationEase((t-5.6)/.4);
 ctx.save();ctx.translate(g.x,g.y);ctx.globalAlpha=fade;
 const light=ctx.createRadialGradient(0,0,5,0,0,120);light.addColorStop(0,'#b0ffe48c');light.addColorStop(.5,'#79dac337');light.addColorStop(1,'#79dac300');ctx.fillStyle=light;ctx.fillRect(-120,-120,240,240);
 for(let i=0;i<3;i++){ctx.strokeStyle=i===0?'#e5fff0':'#91e4d4';ctx.lineWidth=i===0?3:1.3;ctx.beginPath();ctx.ellipse(0,0,(31+i*8)*open,(95+i*8)*open,.12*Math.sin(t+i),0,TAU);ctx.stroke();}
 ctx.fillStyle='#d3ffef';for(let i=0;i<18;i++){const a=i*2.399+t*(i%2?1:-1),r=30+(i%4)*8;ctx.beginPath();ctx.arc(Math.cos(a)*r*open,Math.sin(a)*100*open,1.3,0,TAU);ctx.fill();}
 ctx.textAlign='center';ctx.font='600 13px system-ui';ctx.fillText('GATE HOME · WEAPONS SAFE',0,137);ctx.restore();
}
