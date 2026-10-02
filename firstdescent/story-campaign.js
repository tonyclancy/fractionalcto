'use strict';
// A fixed story route, independent of the additive 92-world exploration archive.
const STORY_ROUTE=[
 {id:'verdant-reach',world:'Caelus',system:'Vesper',title:'First Contact',kind:'guardian',purpose:'Find the expedition’s first missing coordinates.',brief:'Defeat the guardian and recover its signal shard. The shard reveals where the expedition went next.',result:'The first coordinates reveal a distress call from Ferrum’s Foundry.',socket:'Distress coordinates',benefit:'Opens the route to Ferrum · hull service and one nova'},
 {id:'ember-forge',world:'Ferrum',system:'Vesper',title:'The Last Engineer',kind:'guardian',purpose:'Recover the route to Orison. An engineer is still trapped in the Foundry.',brief:'Optional: enter the escape pod’s green ring during the Foundry run. Then defeat the Dreadnought to recover the next coordinates.',result:'The Foundry shard reveals Orison. A submerged expedition relay is still transmitting.',socket:'Orison coordinates',benefit:'Optional engineer rescue: a sabotage drone now, one portal repair during the finale'},
 {id:'lumen-reef',world:'Thalassa',system:'Orison',title:'The Sunken Relay',kind:'relay',purpose:'Locate the survivors by reconnecting their submerged relay.',brief:'Hold inside each relay’s ring to reconnect three nodes. Then defeat the guardian and recover the next signal shard.',result:'The relay locates five carriers in Eventide. Their crew are alive in stasis; the frozen archive on Nivara holds the way forward.',socket:'Survivor location',benefit:'Connected relays strengthen the final portal by two integrity points'},
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
const STORY_RETURN_FLIGHT=Object.freeze({launch:3,spacing:.7,approach:3.4,beyond:3.5,settle:.45});
function storyCarrierCrossingAge(i){return STORY_RETURN_FLIGHT.launch+i*STORY_RETURN_FLIGHT.spacing+STORY_RETURN_FLIGHT.approach;}
function storyRescueFinishAge(){return storyCarrierCrossingAge(4)+STORY_RETURN_FLIGHT.beyond+STORY_RETURN_FLIGHT.settle;}
function storyCarrierEntry(e,i){const localX=104*.55,localY=104*(.08+Math.sin(i*1.7)*.08),point=storyPortalProject(e,localX,localY,5);return{...point,localX,localY,scale:1.15};}
function storyCarrierPosition(e,i){
 const u=clamp((e.returnAge-STORY_RETURN_FLIGHT.launch-i*STORY_RETURN_FLIGHT.spacing)/STORY_RETURN_FLIGHT.approach,0,1),gate=storyGatePosition(e),entry=storyCarrierEntry(e,i),start=W+100+i*30;
 return{x:start+(gate.x+entry.x-start)*navigationEase(u),y:gate.y+entry.y+Math.sin(i*1.7)*120*(1-u)+Math.sin(u*Math.PI)*45,scale:entry.scale,u};
}
function storyCarrierBeyond(e,i){
 const elapsed=e.returnAge-storyCarrierCrossingAge(i),u=clamp(elapsed/STORY_RETURN_FLIGHT.beyond,0,1),entry=storyCarrierEntry(e,i),perspective=1/(1+18*u*u*(3-2*u)),target=storyPortalProject(e,104*(.08+(i-2)*.025),104*(-.27+(i%2)*.025),5);
 // One continuous hull crosses the window, turns away, then follows the
 // lake toward the city. Perspective, not an early dissolve, makes it small.
 return{x:target.x+(entry.x-target.x)*perspective,y:target.y+(entry.y-target.y)*perspective,scale:entry.scale*perspective,yaw:Math.PI*.5*navigationEase(elapsed/.8),alpha:1-navigationEase((u-.84)/.16),elapsed,u,visible:elapsed>=0&&u<1};
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
  if(e.returning){e.returnAge+=dt;updateStoryEscort(e);if(!e.opened&&e.returnAge>=1.6){e.opened=true;window.flightAudio?.portalOpen?.();announce('THE WAY HOME IS OPEN','FRIENDLY CARRIERS · WEAPONS SAFE',3);}const previous=e.evacuated;e.evacuated=0;for(let i=0;i<5;i++)if(storyCarrierPosition(e,i).u===1)e.evacuated++;if(e.evacuated>previous){const g=storyGatePosition(e);for(let i=previous;i<e.evacuated;i++)window.flightAudio?.engineerCue?.('link',g.x+storyCarrierEntry(e,i).x);}if(e.returnAge<storyRescueFinishAge())return;}
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
 if(e)for(const r of e.raiders)drawModel(storyMesh('raider'),r.x,r.y,r.scale||1,.08*Math.sin(r.age*3),.18*Math.sin(r.age*4),Math.atan2(e.y-r.y,e.x-r.x),r.age,r.hit||0);
 window.gpuModels?.flush(ctx);ctx.save();
 for(const echo of m.relayEchoes)drawRelayActivation(echo);
 if(n&&d.kind==='relay')drawRelaySignal(n,m);
 if(n&&d.kind!=='relay'){const c=d.kind==='furnace'?'#ffbe75':'#8de5ee';const halo=ctx.createRadialGradient(n.x,n.y,10,n.x,n.y,100);halo.addColorStop(0,c+'28');halo.addColorStop(1,c+'00');ctx.fillStyle=halo;ctx.fillRect(n.x-100,n.y-100,200,200);ctx.strokeStyle=c+'70';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(n.x,n.y,112,0,TAU);ctx.stroke();ctx.strokeStyle=c;ctx.lineWidth=3;ctx.beginPath();ctx.arc(n.x,n.y,112,-Math.PI/2,-Math.PI/2+TAU*(d.kind==='seal'?1-n.hp/42:m.charge/1.5));ctx.stroke();ctx.fillStyle='#081923dc';ctx.fillRect(n.x-158,n.y+123,316,26);ctx.fillStyle='#e7f8ff';ctx.font='600 14px system-ui';ctx.textAlign='center';ctx.fillText(d.kind==='seal'?'ARCHIVE SEAL · SHOOT':d.kind==='furnace'?'DIVERSION CONTROL · HOLD NEAR':'RELAY · HOLD NEAR',n.x,n.y+142);}
 if(e)drawStoryGate(e);if(e?.returning)drawStoryApproachingCarriers(e);
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
 panel.innerHTML=`<span class="eyebrow">${phase===0?'GUARDIAN DOWN':phase===1?'SIGNAL TRANSFERRING':'SIGNAL SECURED'}</span><strong>${phase===2?(next?'NEXT: '+next.world.toUpperCase():'EXPEDITION HOME'):'RECOVERING THE SHARD'}</strong><p>${phase===2?(next?d.socket+' recovered · '+storyServiceReceipt():storyServiceReceipt()):'SIGNAL SHARD · RETURN COORDINATES'}</p>`;
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
let storyPortalFrame=null,storyPortalFront=null,storyPortalRotor=null,storyPortalVista=null,storyPortalDestination=null;
function storyPortalPose(e){return{yaw:-.73+(e.returning?.08*navigationEase(e.returnAge/2.4):0),roll:.06,pitch:-.09};}
function storyPortalAxes(e){const p=storyPortalPose(e);return{u:rotateVertex([1,0,0],p.yaw,p.roll,p.pitch,0,0),v:rotateVertex([0,1,0],p.yaw,p.roll,p.pitch,0,0),n:rotateVertex([0,0,1],p.yaw,p.roll,p.pitch,0,0)};}
function storyPortalProject(e,x,y,z=5){const b=storyPortalAxes(e),s=storyPortalPhase(e).scale;return{x:(b.u[0]*x+b.v[0]*y+b.n[0]*z)*s,y:(b.u[1]*x+b.v[1]*y+b.n[1]*z)*s};}
function storyPortalPlane(e){const b=storyPortalAxes(e),s=storyPortalPhase(e).scale;return{a:b.u[0]*s,b:b.u[1]*s,c:b.v[0]*s,d:b.v[1]*s,x:b.n[0]*5*s,y:b.n[1]*5*s};}
function storyPortalUndoPlane(e){const m=storyPortalPlane(e),det=m.a*m.d-m.b*m.c;ctx.transform(m.d/det,-m.b/det,-m.c/det,m.a/det,(m.c*m.y-m.d*m.x)/det,(m.b*m.x-m.a*m.y)/det);}
function storyPortalRotorPose(e,spin){
 // Rotate the circular rotor in its own plane before tilting the entire
 // machine. A screen-space rotation would make an oval orbit the frame.
 const b=storyPortalAxes(e),c=Math.cos(spin),s=Math.sin(spin),u=b.u.map((n,i)=>n*c+b.v[i]*s),v=b.v.map((n,i)=>-b.u[i]*s+n*c);
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
function buildStoryPortalMachine(){
 storyPortalFrame=storyPortalLathe([[111,-8],[127,-8],[131,-5],[131,9],[126,12],[109,12],[107,8],[107,5]],96,[[76,92,105],[112,131,144],[40,53,67],[55,69,83],[113,127,132],[47,64,76],[86,114,123]]);
 storyPortalFront=storyPortalLathe([[107,5],[109,-6],[113,-11],[127,-11],[131,-7]],96,[[78,108,117],[116,151,164],[152,170,174],[72,95,111]]);
 const m=meshBuilder();
 for(let i=0;i<9;i++){
  const a=i/9*TAU-Math.PI/2,rad=(r,t,z)=>[Math.cos(a)*r-Math.sin(a)*t,Math.sin(a)*r+Math.cos(a)*t,z];
  storyPortalModule(storyPortalFront,a,[[113,-5],[119,-9],[133,-9],[139,-5],[139,5],[133,9],[119,9],[113,5]],-14,-8,[119,142,155]);
  storyPortalModule(storyPortalFront,a,[[120,-6],[132,-6],[135,-3],[135,3],[132,6],[120,6]],-15,-14,[31,47,64]);
  storyPortalModule(storyPortalFront,a,[[114,-2],[121,-3],[125,-2],[125,2],[121,3],[114,2]],-16,-14,[184,151,101]);
  for(const side of [-1,1]){
   const p=rad(132,side*7,-15);m.ellipsoid(...p,1.2,1.2,.7,[196,204,200],0,6,4);
   for(let j=0;j<4;j++)storyPortalModule(storyPortalFront,a,[[125+j*2,side*3],[126+j*2,side*3],[126+j*2,side*5],[125+j*2,side*5]],-15.5,-14,[115,148,164]);
  }
  const cable=[];for(let j=0;j<=9;j++){const aa=a+.1+j/9*.48;cable.push([Math.cos(aa)*132,Math.sin(aa)*132,2+Math.sin(j/9*Math.PI)*5]);}m.tube(cable,1.1,[115,92,64],0,0,8,1);
 }
 storyPortalFront.push(...m.faces);storyPortalRotor=storyPortalRing(111,1.3,1.5,96,true);
 // Sparse cut seams and metallic inlays follow the annulus, rather than a
 // square texture floating across it. Each group lies between the locks.
 for(let i=0;i<27;i++){
  const a=(i+.5)/27*TAU-Math.PI/2;
  storyPortalModule(storyPortalFront,a,[[115,-.3],[126,-.3],[126,.3],[115,.3]],-11.2,-10.8,[39,62,78]);
  if(i%3===1)storyPortalModule(storyPortalFront,a+.025,[[119,-.4],[125,-.4],[125,.4],[119,.4]],-11.4,-11,[162,147,115]);
 }
 for(let i=0;i<24;i++){const a=i/24*TAU;storyPortalModule(storyPortalRotor,a,[[109,-1.2],[113,-1.2],[114,0],[113,1.2],[109,1.2]],-8,-5,i%3?[64,91,108]:[196,157,96]);}
 // Authored metal shapes provide the panel detail. Suppress the generic
 // square-grid hull shader; fine abrasion comes from the retained bump map.
 for(const mesh of [storyPortalFrame,storyPortalFront,storyPortalRotor]){mesh.portalMachinery=true;for(const face of mesh)face.textureWeight=0;}
}
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
  for(const side of [-1,1]){const x=p.x+19*p.scale,y=p.y+side*8*p.scale,length=(24+Math.sin(e.returnAge*25+i)*3)*p.scale,g=ctx.createLinearGradient(x,y,x+length,y);g.addColorStop(0,'#eafff4d0');g.addColorStop(.25,'#86ffda80');g.addColorStop(1,'#62dff500');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x,y-2.5*p.scale);ctx.lineTo(x+length,y);ctx.lineTo(x,y+2.5*p.scale);ctx.fill();}
  drawModel(storyMesh('carrier'),p.x,p.y,p.scale,0,.12*Math.sin(e.returnAge+i),Math.PI,e.returnAge,0);
 }
 window.gpuModels?.flush(ctx);
 for(let i=0;i<5;i++){const p=storyCarrierPosition(e,i);if(p.u<=0||p.u>=.9)continue;ctx.globalAlpha=1-navigationEase((p.u-.72)/.18);ctx.fillStyle='#071b28cf';ctx.fillRect(p.x-37,p.y+20,74,16);ctx.fillStyle='#c4fff0';ctx.font='600 9px system-ui';ctx.textAlign='center';ctx.fillText('FRIENDLY',p.x,p.y+31);}
 ctx.restore();
}
function storyPortalPassages(e){
 if(!e.returning)return[];const passages=[];
 for(let i=0;i<5;i++){const age=e.returnAge-storyCarrierCrossingAge(i);if(age>=0&&age<1.25)passages.push({x:storyCarrierEntry(e,i).localX,y:storyCarrierEntry(e,i).localY,age,life:1-age/1.25});}
 return passages;
}
function drawStoryCarriersBeyond(e,open){
 if(!e.returning||!open)return;ctx.save();storyPortalUndoPlane(e);window.gpuModels?.setEnvironment?.('daylight');
 for(let i=0;i<5;i++){
  const p=storyCarrierBeyond(e,i);if(!p.visible)continue;
  ctx.globalAlpha=p.alpha*open;
  for(const side of [-1,1]){const x=p.x+18*p.scale*Math.cos(p.yaw),y=p.y+side*7*p.scale,length=22*p.scale,dx=Math.cos(p.yaw)*length,dy=Math.sin(p.yaw)*length,g=ctx.createLinearGradient(x,y,x+dx,y+dy);g.addColorStop(0,'#f4fff5d0');g.addColorStop(.25,'#8cecd48a');g.addColorStop(1,'#99efff00');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-1.4*p.scale*Math.sin(p.yaw),y+1.4*p.scale*Math.cos(p.yaw));ctx.lineTo(x+dx,y+dy);ctx.lineTo(x+1.4*p.scale*Math.sin(p.yaw),y-1.4*p.scale*Math.cos(p.yaw));ctx.fill();}
  drawModel(storyMesh('carrier'),p.x,p.y,p.scale,p.yaw,.12*Math.sin(e.returnAge+i)*(1-p.yaw/(Math.PI*.5)),Math.PI,e.returnAge,0);
 }
 // Flush while the aperture's real Canvas clip is active. Carriers cannot
 // bleed across the frame or exist outside the destination after crossing.
 window.gpuModels?.flush(ctx);window.gpuModels?.setEnvironment?.(sceneryLighting(sectors[level]));
 for(let i=0;i<5;i++){const p=storyCarrierBeyond(e,i);if(!p.visible)continue;ctx.globalAlpha=p.alpha*open;ctx.fillStyle='#effff0';for(const side of [-1,1]){ctx.beginPath();ctx.arc(p.x+18*p.scale*Math.cos(p.yaw),p.y+side*7*p.scale,Math.max(.45,1.5*p.scale),0,TAU);ctx.fill();}}
 ctx.restore();
}
function drawStoryPortalPassageShimmer(passages,scale){
 ctx.save();ctx.globalCompositeOperation='screen';
 for(const p of passages){
  ctx.globalAlpha=1;const radius=(13+p.age*38)*scale,g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);g.addColorStop(0,`rgba(219,255,245,${p.life*.36})`);g.addColorStop(.3,`rgba(115,229,255,${p.life*.22})`);g.addColorStop(1,'#83dfff00');ctx.fillStyle=g;ctx.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);
  for(let i=0;i<3;i++){const age=p.age-i*.13;if(age<0)continue;const r=(6+age*115)*scale;ctx.globalAlpha=p.life*p.life*(.7-i*.13);ctx.strokeStyle=i%2?'#a6f4ff':'#e0fff4';ctx.lineWidth=(2.5-i*.5)*scale;ctx.beginPath();for(let j=0;j<=64;j++){const a=j/64*TAU,w=1+.045*Math.sin(a*7-p.age*13+i),x=p.x+Math.cos(a)*r*w,y=p.y+Math.sin(a)*r*1.2*w;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.stroke();}
 }
 ctx.restore();
}
function drawStoryGate(e){
 if(!storyPortalFrame)prepareStoryPortal();const g=storyGatePosition(e),p=storyPortalPhase(e),pose=storyPortalPose(e),rotor=storyPortalRotorPose(e,p.spin+p.open*(e.returnAge||0)*.25),t=e.returning?e.returnAge:e.age,passages=storyPortalPassages(e),panorama=storyPortalDestination?.complete&&storyPortalDestination.naturalWidth?storyPortalDestination:storyPortalVista,sourceW=panorama.naturalWidth||panorama.width,sourceH=panorama.naturalHeight||panorama.height;
 ctx.save();ctx.translate(g.x,g.y);
 const radius=175*p.scale,halo=ctx.createRadialGradient(0,0,90*p.scale,0,0,radius);halo.addColorStop(0,`rgba(120,226,247,${.04+p.open*.12})`);halo.addColorStop(1,'#69caff00');ctx.fillStyle=halo;ctx.fillRect(-radius,-radius,radius*2,radius*2);
 window.gpuModels?.setEnvironment?.('portal');drawModel(storyPortalFrame,0,0,p.scale,pose.yaw,pose.roll,pose.pitch,t,0);window.gpuModels?.flush(ctx);
 // The destination, water, carrier ripple and lens all share the same
 // projected circular plane, recessed behind a shallow physical throat.
 ctx.save();const plane=storyPortalPlane(e);ctx.transform(plane.a,plane.b,plane.c,plane.d,plane.x,plane.y);const rx=104,ry=104;
 ctx.save();ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,TAU);ctx.clip();ctx.fillStyle='#050d20';ctx.fillRect(-rx,-ry,rx*2,ry*2);
 if(p.open>0){ctx.globalAlpha=p.open;ctx.drawImage(panorama,-ry,-ry,ry*2,ry*2);
  // Subtle whole-window refraction stays transparent enough to reveal the
  // rendered destination. The river has its own visible flowing reflection.
  for(let i=0;i<18;i++){const y=-ry+i*ry/9;let shift=Math.sin(i*.9-t*2.6)*2*1;for(const hit of passages)shift+=Math.sin((y-hit.y)*.06-hit.age*18)*Math.exp(-Math.abs(y-hit.y)/(38*1))*hit.life*9*1;ctx.globalAlpha=.18*p.open;ctx.drawImage(panorama,0,i*sourceH/18,sourceW,sourceH/18,-ry+shift,y,ry*2,ry/9+1);}
  ctx.save();ctx.beginPath();ctx.moveTo(-rx*.16,-ry*.12);ctx.lineTo(rx*.22,-ry*.12);ctx.lineTo(rx*.70,ry);ctx.lineTo(-rx*.75,ry);ctx.closePath();ctx.clip();
  for(let i=9;i<24;i++){const u=i/24,shift=Math.sin(u*35-t*3.4)*1.9*1;ctx.globalAlpha=.42*p.open;ctx.drawImage(panorama,0,u*sourceH,sourceW,sourceH/24,-ry+shift,-ry+u*ry*2,ry*2,ry/12+1);}
  ctx.restore();ctx.globalAlpha=.23*p.open;ctx.strokeStyle='#edfff9';ctx.lineWidth=.8*1;
  for(const f of [{x:.59,y:.345,h:.10},{x:.72,y:.345,h:.16},{x:.83,y:.31,h:.26},{x:.20,y:.35,h:.18}])for(let i=0;i<5;i++){const u=(t*.75+i/5)%1,x=(f.x-.5)*ry*2+Math.sin(i*2.3)*2*1,y=(f.y-.5+u*f.h)*ry*2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+.6*1,y+5*1);ctx.stroke();}
  drawStoryCarriersBeyond(e,p.open);
  // Uneven traveling wavefronts move across the glassy aperture, rather
  // than turning the vista into a uniform set of concentric target circles.
  ctx.globalCompositeOperation='screen';for(let i=0;i<6;i++){const u=(t*.22+i/6)%1,r=Math.max(1,u*rx);ctx.globalAlpha=(1-u)*.16*p.open;ctx.strokeStyle=i%2?'#b4feff':'#c5b7ff';ctx.lineWidth=(1-u)*2+1;ctx.beginPath();for(let j=0;j<=56;j++){const a=j/56*TAU,wave=1+.04*Math.sin(a*5+t*3+i),x=Math.cos(a)*r*wave,y=Math.sin(a)*r*ry/rx*wave;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.stroke();}
  ctx.globalAlpha=.55*p.open;ctx.strokeStyle='#c9ffff';ctx.lineWidth=1;for(let i=0;i<30;i++){const a=i*2.399+t*.18,u=((t*.14+i*.618)%1),r=(.2+u*.8)*rx;ctx.beginPath();ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r*ry/rx);ctx.lineTo(Math.cos(a)*r*(1+.06*u),Math.sin(a)*r*ry/rx*(1+.06*u));ctx.stroke();}
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
 ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<3;i++){ctx.strokeStyle=i===0?'#d4ffef':'#65d2ec';ctx.globalAlpha=(.35+p.open*.45)/(i+1);ctx.lineWidth=(i===0?1.6:4)*p.scale;ctx.beginPath();for(let j=0;j<=96;j++){const a=j/96*TAU,r=107.5+i*.35,v=storyPortalProject(e,Math.cos(a)*r,Math.sin(a)*r,-6);j?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y);}ctx.closePath();ctx.stroke();}
 for(let i=0;i<4;i++){ctx.globalAlpha=.4+p.open*.45;ctx.lineWidth=2*p.scale;ctx.strokeStyle=i%2?'#9eefff':'#e0fff1';ctx.beginPath();for(let j=0;j<13;j++){const a=t*.7+i*TAU/4+j/12*.2,v=storyPortalProject(e,Math.cos(a)*112,Math.sin(a)*112,-8);j?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y);}ctx.stroke();}
 const bloom=e.returning?Math.sin(clamp((t-1.3)/1.2,0,1)*Math.PI)*.35:0;if(bloom>0){const light=ctx.createRadialGradient(0,0,5,0,0,radius);light.addColorStop(0,`rgba(223,255,255,${bloom})`);light.addColorStop(1,'#7b9cff00');ctx.globalAlpha=1;ctx.fillStyle=light;ctx.fillRect(-radius,-radius,radius*2,radius*2);}
 ctx.restore();window.gpuModels?.setEnvironment?.(sceneryLighting(sectors[level]));
 if(e.repairGlow>0){ctx.globalAlpha=e.repairGlow/2;ctx.strokeStyle='#b8ffe4';ctx.lineWidth=3;ctx.beginPath();for(let i=0;i<=96;i++){const a=i/96*TAU,r=175+(2-e.repairGlow)*35,v=storyPortalProject(e,Math.cos(a)*r,Math.sin(a)*r,0);i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y);}ctx.closePath();ctx.stroke();}
 ctx.restore();
}
function updateStoryPortalHUD(){
 const marker=$('#portalObjective'),e=storyMission?.extract,visible=storyActive()&&!!e&&state==='playing'&&!sectorBlend&&!storyMission.complete;
 if(!marker)return;marker.hidden=!visible;if(!visible)return;
 const g=storyGatePosition(e),p=storyPortalPhase(e),b=readFlightMarkerLayout();if(!b)return;const x=b.left+g.x/W*b.width,y=clamp(b.top+(g.y+156*p.scale)/H*b.height,0,b.frameHeight-48);marker.style.left=x/b.frameWidth*100+'%';marker.style.top=y/b.frameHeight*100+'%';
 hudText('#portalObjective strong',e.returning?(e.returnAge<2.5?'PORTAL SECURED · OPENING HOME':'BRINGING YOUR PEOPLE HOME'):'DEFEND THE PORTAL · SAVE YOUR PEOPLE');
 hudText('#portalObjective span',e.returning?`FRIENDLY CARRIERS ${e.evacuated}/5 · WEAPONS SAFE`:`BOTH SIDES · INTEGRITY ${e.hp}/${e.max}${e.age<32?' · '+Math.ceil(32-e.age)+'s':' · CLEAR THE APPROACH'}`);
}
let campaignBriefView=null;
function campaignBriefVisible(){return state==='title'&&atlasOpen&&!!campaignBriefView&&$('#overlay').classList.contains('campaign-intro');}
function prepareCampaignBrief(index){
 const mission=STORY_ROUTE[index],definition=sectors.find(s=>s.id===mission.id);
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
const STORY_PROLOGUE=Object.freeze([
 {channel:'HOME · THE EXPEDITION DEPARTS',title:'They followed a signal.',line:'An expedition left home to investigate the Origin Signal.',scene:'home'},
 {channel:'EVENTIDE · CONTACT LOST',title:'Then the way home collapsed.',line:'Their return gate failed. The expedition is stranded.',scene:'lost'},
 {channel:'EXPEDITION CHANNEL · DISTRESS CALL',title:'“We’re still alive.”',line:'Five carriers. Survivors in stasis. Six missing coordinates.',scene:'carriers'},
 {channel:'RESCUE COMMAND · YOUR MISSION',title:'Bring them home.',line:'Recover the coordinates. Open the gate. Defend their escape.',scene:'pilot'}
]);
let campaignPrologue=null;
const storyIntroMemory=new Set();
function storyIntroKey(){return 'first-descent-rescue-intro-v174:'+(storyStore.account()||'guest');}
function storyIntroWasSeen(){const key=storyIntroKey();if(storyIntroMemory.has(key))return true;try{return !missionPreview&&runStorage?.getItem(key)==='seen';}catch{return false;}}
function rememberStoryIntro(){const key=storyIntroKey();storyIntroMemory.add(key);try{if(!missionPreview)runStorage?.setItem(key,'seen');}catch{ /* A blocked preference store never blocks play. */ }}
function storyResumeInfo(){const p=storyStore.snapshot(),index=p.complete?0:Math.max(0,STORY_ROUTE.findIndex(m=>m.id===p.next));return{p,index,next:STORY_ROUTE[index],recap:p.complete?'All five carriers reached home. Their crew and discoveries are safe.':STORY_RECAPS[index]};}
function showCampaignEntry(){if(state!=='title')return;migrateStoryVictories();const p=storyStore.snapshot();if(!p.count&&!storyIntroWasSeen())showCampaignPrologue();else showCampaignBrief();}
function campaignPrologueVisible(){return state==='title'&&atlasOpen&&!!campaignPrologue&&$('#overlay').classList.contains('story-prologue');}
function showCampaignPrologue(){
 if(state!=='title')return;campaignBriefView=null;atlasOpen=true;sectorBlend=null;
 const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 campaignPrologue={age:0,step:0,paused:reduced,reducedMotion:reduced,owner:storyStore.account(),home:prepareStoryDestination(),homeReveal:0};
 prepareStoryPortal();
 window.gpuModels?.prepare?.([storyMesh('carrier'),meshes.player2],sectors[level].id);
 const overlay=$('#overlay');overlay.onclick=null;overlay.className='overlay story-prologue';
 overlay.innerHTML='<section class="prologue-caption" aria-labelledby="prologueTitle"><div class="prologue-top"><span class="eyebrow mint">FIRST DESCENT · THE RESCUE</span><span id="prologueCount">1 / 4</span></div><div id="prologueWords" aria-live="polite" aria-atomic="true"><p id="prologueChannel" class="transmission-channel"></p><h2 id="prologueTitle"></h2><p id="prologueLine"></p></div><div class="prologue-progress" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="prologue-actions"><button id="prologueNext" class="primary">NEXT ↗</button><button id="prologuePause">PAUSE STORY</button><button id="prologueSkip">SKIP TO BRIEFING</button><button id="storyBack">Back</button></div></section>';
 $('#prologueNext').onclick=()=>{if(!campaignPrologueVisible())return;if(campaignPrologue.step===3){finishCampaignPrologue();return;}campaignPrologue.age=(campaignPrologue.step+1)*5.5;campaignPrologue.step++;presentCampaignPrologue();};
 $('#prologueSkip').onclick=finishCampaignPrologue;$('#storyBack').onclick=showTitleScreen;
 $('#prologuePause').onclick=()=>{if(!campaignPrologue)return;campaignPrologue.paused=!campaignPrologue.paused;presentCampaignPrologue();};
 presentCampaignPrologue();$('#prologueNext').focus({preventScroll:true});enableAudio();window.flightAudio?.setTitle(true);
}
function presentCampaignPrologue(){
 const v=campaignPrologue;if(!v)return;const beat=STORY_PROLOGUE[v.step];
 $('#prologueChannel').textContent=beat.channel;$('#prologueTitle').textContent=beat.title;$('#prologueLine').textContent=beat.line;$('#prologueCount').textContent=(v.step+1)+' / 4';
 $('#prologueWords').setAttribute('data-step',String(v.step));$('#prologueNext').textContent=v.step===3?'MISSION BRIEFING ↗':'NEXT ↗';$('#prologuePause').textContent=v.paused?'PLAY STORY':'PAUSE STORY';$('#prologuePause').setAttribute('aria-pressed',String(v.paused));
 $('#overlay').setAttribute('data-story-step',String(v.step));
}
function finishCampaignPrologue(){if(!campaignPrologue)return;if(campaignPrologue.owner===storyStore.account())rememberStoryIntro();campaignPrologue=null;showCampaignBrief();}
function updateCampaignPrologue(dt){
 if(!campaignPrologueVisible()||document.hidden)return;const v=campaignPrologue;
 if(v.owner!==storyStore.account()){campaignPrologue=null;showCampaignBrief();return;}
 if(imageReady(v.home))v.homeReveal=Math.min(1,v.homeReveal+Math.max(0,dt)*2);
 if(v.paused)return;v.age+=Math.max(0,dt);if(v.age>=22){finishCampaignPrologue();return;}
 const step=Math.min(3,Math.floor(v.age/5.5));if(step!==v.step){v.step=step;presentCampaignPrologue();}
}
function prologueGatePose(v){return {x:W*.72,y:H*.38,scale:1.55,yaw:-.52,roll:.04,pitch:-.13,age:v.age};}
function drawPrologueGate(v,phase,t){
 const p=prologueGatePose(v),intensity=phase==='lost'?1-navigationEase(Math.min(1,t/2.5)):phase==='carriers'?.12:.7;
 drawModel(storyPortalFrame,p.x,p.y,p.scale,p.yaw,p.roll,p.pitch,t,0);
 drawModel(storyPortalRotor,p.x,p.y,p.scale,p.yaw,p.roll,p.pitch,t,0);
 drawModel(storyPortalFront,p.x,p.y,p.scale,p.yaw,p.roll,p.pitch,t,0);window.gpuModels?.flush(ctx);
 ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-.13);ctx.scale(.87,1);
 const glow=ctx.createRadialGradient(0,0,20,0,0,200);glow.addColorStop(0,'#82e5f900');glow.addColorStop(.68,'#74d5e6'+Math.round(intensity*55).toString(16).padStart(2,'0'));glow.addColorStop(1,'#70c5dc00');ctx.fillStyle=glow;ctx.fillRect(-205,-205,410,410);
 // The return channel dies inward, leaving a solid, unlit machine behind.
 ctx.strokeStyle='#c2f9ee';ctx.lineWidth=2;ctx.globalAlpha=intensity;ctx.beginPath();ctx.arc(0,0,171,0,TAU);ctx.stroke();
 for(let i=0;i<9;i++){ctx.globalAlpha=intensity*(.14+i*.045);ctx.beginPath();const r=24+i*16+(t*11%16);ctx.ellipse(Math.sin(t+i)*3,0,r,r,0,0,TAU);ctx.stroke();}
 ctx.restore();
}
function prologueShardMesh(){
 if(storyMeshes.has('coordinate'))return storyMeshes.get('coordinate');
 const top=[0,-14,0],bottom=[0,14,0],rim=[[9,0,0],[0,0,9],[-9,0,0],[0,0,-9]],mesh=[];
 for(let i=0;i<4;i++){mesh.push({v:[top,rim[i],rim[(i+1)%4]],c:[109,217,211],em:.32},{v:[bottom,rim[(i+1)%4],rim[i]],c:[54,136,165],em:.12});}
 storyMeshes.set('coordinate',mesh);return mesh;
}
function drawCampaignPrologueScene(){
 const v=campaignPrologue;if(!v)return;const t=v.reducedMotion?2:Math.max(0,v.age-v.step*5.5),phase=STORY_PROLOGUE[v.step].scene;
 ctx.save();
 if(phase==='home'&&imageReady(v.home)){
  const zoom=1.04+t*.004,scale=Math.max(W/v.home.naturalWidth,H/v.home.naturalHeight)*zoom,w=v.home.naturalWidth*scale,h=v.home.naturalHeight*scale;
  ctx.globalAlpha=v.homeReveal;ctx.drawImage(v.home,(W-w)*.5,(H-h)*.38,w,h);ctx.globalAlpha=1;
 }else{
  const system=contentReleases[0].systems[0];paintRotatingGalaxy(ctx,GALAXIES[system.galaxyId],W*.35,H*.39,W*.72,phase==='lost'?.7:.36,v.reducedMotion?0:v.age*.12);
 }
 const shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#03101b28');shade.addColorStop(.42,'#03101b05');shade.addColorStop(1,'#030b16ed');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
 window.gpuModels?.setEnvironment?.(phase==='home'?'daylight':'space');
 drawPrologueGate(v,phase,t);
 if(phase==='home'||phase==='carriers'||phase==='lost'){
  for(let i=0;i<5;i++){
   const scale=phase==='home'?1.75+i*.13:2.2+i*.12;
   const x=phase==='home'?W*(.20+i*.095)+t*32:W*(.18+i*.095)+Math.sin(t*.35+i)*9;
   const y=H*(.23+(i%2)*.11)+Math.sin(t*.5+i)*4;
   if(phase==='home'){ctx.save();const trail=ctx.createLinearGradient(x-75,y,x,y);trail.addColorStop(0,'#aaf9ee00');trail.addColorStop(1,'#aaf9eeaa');ctx.strokeStyle=trail;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-75,y+7);ctx.lineTo(x-24,y+7);ctx.stroke();ctx.restore();}
   drawModel(storyMesh('carrier'),x,y,scale,.18,.12,0,t+i,0);
  }window.gpuModels?.flush(ctx);
  if(phase==='carriers'){
   // Each ship sends its own life signal; the fleet remains visibly intact.
   ctx.save();ctx.strokeStyle='#9be8d9';ctx.lineWidth=1.5;
   for(let i=0;i<5;i++){const x=W*(.18+i*.095),y=H*(.23+(i%2)*.11),r=36+(t*.45+i*.2)%1*35;ctx.globalAlpha=.3*(1-(r-36)/35);ctx.beginPath();ctx.ellipse(x,y,r,r*.45,0,0,TAU);ctx.stroke();}ctx.restore();
  }
 }else if(phase==='pilot'){drawShip(W*.34+t*25,H*.31+Math.sin(t*.7)*5,3.8,true,v.reducedMotion?0:v.age);window.gpuModels?.flush(ctx);}
 if(phase!=='home'){
  for(let i=0;i<6;i++){const a=i*TAU/6-.7,spread=phase==='lost'?navigationEase(Math.min(1,t/3)):phase==='pilot'?1-navigationEase(t/7):1,x=W*.72+Math.cos(a)*(205+spread*78),y=H*.38+Math.sin(a)*(205+spread*35);drawModel(prologueShardMesh(),x,y,1.25,.3+t*.22+i,.1,Math.sin(t*.3+i)*.2,t,0);}
  window.gpuModels?.flush(ctx);
 }
 if(!v.reducedMotion&&!v.paused){const u=(v.age%5.5)/5.5,fade=u<.06?1-u/.06:u>.94?(u-.94)/.06:0;if(fade>0){ctx.globalAlpha=fade*.65;ctx.fillStyle='#030a14';ctx.fillRect(0,0,W,H);}}
 ctx.restore();window.gpuModels?.setEnvironment?.(sceneryLighting(sectors[level]));
}
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
 overlay.innerHTML=`<section class="campaign-scene" aria-label="Next mission preview: ${next.world}"><div class="campaign-scene-heading"><span class="eyebrow"><i aria-hidden="true"></i>${returning?'YOUR JOURNEY CONTINUES':'YOUR JOURNEY BEGINS'}</span><h3>${next.world}</h3><p>${next.system} · ${next.title}</p></div><div class="campaign-scene-route"><span class="eyebrow">THE ROUTE HOME · ${p.complete?0:p.count} / 6 COORDINATES</span><ol>${STORY_ROUTE.map((m,i)=>`<li class="${i<index?'secured':i===index?'next':''}"><i aria-hidden="true">${i<index?'◆':'◇'}</i><span>${m.world}</span></li>`).join('')}</ol><p>Recover coordinates → restore the gate → bring them home.</p></div></section><section class="transmission-card campaign-brief" aria-labelledby="campaignBriefTitle"><span class="eyebrow mint">${returning?'RESCUE IN PROGRESS · '+p.count+'/6 COORDINATES':'SIX MISSIONS · THREE SOLAR SYSTEMS'}</span><h2 id="campaignBriefTitle">${returning?'The rescue continues.':'Bring them home.'}</h2><p class="transmission-task">${returning?recap:'Six coordinates. Five stranded carriers. One route home.'}</p><p class="brief-destination">${returning?'RESUMING':'FIRST DESTINATION'} · ${next.world.toUpperCase()} · ${next.title}</p><p class="brief-instruction">${STORY_ACTIONS[index]}</p><p class="transmission-service">${p.durable?'Missions saved on this device.':'Session progress · keep this tab open.'} ${index===1?'Engineer rescue is optional.':'Progress survives defeat.'}</p><div class="transmission-actions"><button id="campaignTakeoff" class="primary">${returning?'CONTINUE':'BEGIN'} CAMPAIGN ↗</button><button id="storyBack" class="transmission-secondary">Back</button></div><button id="campaignStory" class="story-replay">MISSION STORY ↗</button></section>`;
 $('#storyBack').onclick=showTitleScreen;$('#campaignStory').onclick=showCampaignPrologue;$('#campaignTakeoff').onclick=()=>{campaignBriefView=null;atlasOpen=false;beginStory(index);};$('#campaignTakeoff').focus({preventScroll:true});
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
