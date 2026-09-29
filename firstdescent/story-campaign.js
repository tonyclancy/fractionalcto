'use strict';
// A fixed story route, independent of the additive 92-world exploration archive.
const STORY_ROUTE=[
 {id:'verdant-reach',world:'Caelus',system:'Vesper',title:'First Contact',kind:'guardian',brief:'Defeat the guardian. Recover the signal that led the expedition here.',result:'A damaged star map reveals a distress call from Ferrum.',socket:'Distress coordinates'},
 {id:'ember-forge',world:'Ferrum',system:'Vesper',title:'The Last Engineer',kind:'guardian',brief:'Dismantle the Dreadnought. Approach the escape pod to rescue its engineer and gain a sabotage drone.',result:'The Foundry shard completes the coordinates to Orison. A submerged relay is still transmitting.',socket:'Orison coordinates'},
 {id:'lumen-reef',world:'Thalassa',system:'Orison',title:'The Sunken Relay',kind:'relay',brief:'Stay inside each relay’s ring to reconnect three nodes. Defeat the guardian to recover the transmission.',result:'“We reached Eventide. Our ship is gone. The archive carries us.” The recording points to Nivara.',socket:'Expedition recording'},
 {id:'nivara-glacial-heart',world:'Nivara',system:'Orison',title:'The Frozen Archive',kind:'seal',brief:'Shoot through three frozen archive seals, then defeat the sentinel. The fragments hold the way to Eventide.',result:'The archive reveals a dormant gate in Eventide. Its furnace must be restarted before the expedition can escape.',socket:'Eventide coordinates'},
 {id:'eventide-carmine-corona',world:'Carmine',system:'Eventide',title:'The Gate Furnace',kind:'furnace',brief:'Hold near three diversion controls during the guardian encounter. Route their energy into the rescue gate.',result:'The gate has power. Aureus holds the final signal. Recover it and protect the extraction beacon.',socket:'Gate ignition'},
 {id:'eventide-aureus-corona',world:'Aureus',system:'Eventide',title:'Bring Them Home',kind:'extraction',brief:'Defeat the Origin guardian. Then intercept raiders before they reach the extraction beacon.',result:'The expedition’s voices cross the gate. Their archive is safe. You have brought them home.',socket:'Extraction signal'}
];
const STORY_DEFINITION={id:'origin-route-001',version:1,finalStage:STORY_ROUTE[5].id,systems:['Vesper','Orison','Eventide'].map(name=>({id:name,name,discovery:name+' route decoded',stages:STORY_ROUTE.filter(m=>m.system===name).map(m=>({id:m.id,name:m.world,kind:'core'}))})),milestones:[]};
const storyStore=createOriginStore(missionPreview?null:runStorage,STORY_DEFINITION);
let storyMission=null;
function migrateStoryVictories(){for(const m of STORY_ROUTE.slice(0,2))if(originStore.has(m.id))storyStore.collect(m.id);}
function storyIndex(){return flightRun?.story===STORY_DEFINITION.id?STORY_ROUTE.findIndex(m=>m.id===sectors[level].id):-1;}
function storyActive(){return storyIndex()>=0;}
function storyNextLevel(){const next=STORY_ROUTE[storyIndex()+1];return next?sectors.findIndex(s=>s.id===next.id):-1;}
function prepareStoryMission(){const i=storyIndex();storyMission=i<0?null:{index:i,done:0,charge:0,node:null,guardian:false,complete:false,age:0,extract:null};if(i>=0){const kind=STORY_ROUTE[i].kind;if(kind!=='guardian')window.gpuModels?.prepare([storyMesh(kind==='extraction'?'beacon':kind),...(kind==='extraction'?[storyMesh('raider')]:[])],sectors[level].id);}}
function storyCheckpoint(){if(!storyActive()||!storyMission)return null;return{index:storyMission.index,done:storyMission.done,guardian:storyMission.guardian,extract:!!storyMission.extract};}
function restoreStoryCheckpoint(saved){if(!storyActive()||saved?.index!==storyIndex())return;storyMission.done=Math.max(0,Math.min(3,saved.done||0));storyMission.guardian=!!saved.guardian;if(saved.guardian){bossDefeated=true;transition=4;time=Math.max(time,sectors[level].duration+.01);world=time*SCROLL_SPEED;}if(saved.extract)beginStoryExtraction();}
function storyObjective(){const m=storyMission,d=STORY_ROUTE[storyIndex()];if(!d||!m)return '';if(m.complete)return 'SIGNAL SHARD SECURED · ROUTE UPDATED';if(m.extract)return `PROTECT BEACON · ${Math.ceil(Math.max(0,32-m.extract.age))}s · INTEGRITY ${m.extract.hp}/6`;
 const task=d.kind==='relay'?`LINK RELAYS ${m.done}/3 · HOLD INSIDE RING`:d.kind==='seal'?`BREAK SEALS ${m.done}/3 · SHOOT THE CORE`:d.kind==='furnace'?`DIVERT ENERGY ${m.done}/3 · HOLD INSIDE RING`:d.kind==='extraction'?'DEFEAT GUARDIAN · THEN PROTECT BEACON':d.world==='Ferrum'?'DEFEAT DREADNOUGHT · ENGINEER RESCUE OPTIONAL':'DEFEAT GUARDIAN · RECOVER SIGNAL';return `${m.index+1}/6 · ${m.done===3?'OBJECTIVE COMPLETE · DEFEAT GUARDIAN':task}${m.guardian?' · GUARDIAN DOWN':''}`;}
function beginStory(target){migrateStoryVictories();const p=storyStore.snapshot();const index=target===undefined?(p.complete?0:STORY_ROUTE.findIndex(m=>m.id===p.next)):target;if(!Number.isInteger(index)||index<0||index>=6)return;if(STORY_ROUTE.slice(0,index).some(m=>!storyStore.has(m.id)))return;beginDescent(sectors.findIndex(s=>s.id===STORY_ROUTE[index].id),'story');}
function storySocketMarkup(){const p=storyStore.snapshot();return `<div class="story-route">${STORY_ROUTE.map((m,i)=>{const done=storyStore.has(m.id),open=STORY_ROUTE.slice(0,i).every(s=>storyStore.has(s.id));return `<article class="story-stop ${done?'secured':open?'available':'locked'}"><span class="eyebrow">${m.system} · ${String(i+1).padStart(2,'0')}</span><h3><span aria-label="${done?'Shard secured':'Empty socket'}">${done?'◆':'◇'}</span> ${m.world}</h3><strong>${m.title}</strong><p>${m.brief}</p><small>${done?'SHARD SECURED':open?'ROUTE OPEN':'ROUTE LOCKED'} · ${m.socket}</small></article>`;}).join('')}</div>`;}
function showStoryMap(resume=false){if(state!=='title'&&state!=='paused')return;const previous=state;migrateStoryVictories();const p=storyStore.snapshot(),next=STORY_ROUTE.find(m=>m.id===p.next),overlay=$('#overlay');atlasOpen=true;atlasSystemId=null;overlay.className='overlay universe-atlas origin-log';overlay.onclick=null;overlay.innerHTML=`<div class="atlas-shell story-shell"><header class="atlas-header"><div><span class="eyebrow mint">THE ORIGIN SIGNAL · SIX MISSIONS</span><h2>BRING THEM HOME</h2><p>Find the lost expedition. Rebuild its route through three solar systems.</p></div><button id="storyBack">${resume?'RESUME FLIGHT':'← MAIN MENU'}</button></header><section class="origin-summary"><div><span class="eyebrow">SIGNAL SHARDS</span><strong>${p.count}<small> / 6 secured</small></strong><progress max="6" value="${p.count}" aria-label="Story route progress"></progress></div><div><h3>${p.complete?'The expedition is home.':next.world+' · '+next.title}</h3><p>${p.complete?'All six signals form a route home. Your full universe archive remains available to explore.':next.brief}</p>${resume?'':`<button id="storyLaunch" class="primary">${p.complete?'REPLAY STORY':'CONTINUE STORY'} ↗</button>`}</div></section>${storySocketMarkup()}<p class="atlas-note">${p.durable?'Saved on this device.':'Session preview · progress resets on reload.'} Completed missions survive defeat. Signal Shards open the next mission automatically. The engineer is optional.</p>${resume?'':typeof relayLoadoutMarkup==='function'?'<section class="relay-card"><div><h3>FLIGHT EQUIPMENT</h3><p>Rescue the engineer on Ferrum to unlock the Recovery Kit.</p>'+relayLoadoutMarkup()+'</div></section>':''}<div class="relay-actions">${resume?'':`<button id="storyArchive">EXPLORATION ARCHIVE · ${originStore.snapshot().count}/92</button>`}${resume?'':'<button id="storyExplore">FLY EXPLORATION ROUTE ↗</button>'}</div><p class="atlas-note">Your exploration archive is separate. Story missions do not require collecting all 92 crystals.</p></div>`;
 $('#storyBack').onclick=()=>{atlasOpen=false;if(resume&&previous==='paused'){state='paused';pause();}else showTitleScreen();};if(!resume){$('#storyLaunch').onclick=()=>beginStory();$('#storyExplore').onclick=()=>beginDescent(0,'exploration');}if(!resume)$('#storyArchive').onclick=()=>{if(resume)return;atlasOpen=false;state='title';showOriginMission();};if(!resume)for(const mode of ['standard','support']){const button=$('[data-relay-loadout="'+mode+'"]');if(button)button.onclick=()=>{if(mode==='support'&&!relayStore.snapshot().unlocked)return;relayLoadout=mode;showStoryMap();};}$('#storyBack').focus();}
function storyGuardianDefeated(b){if(!storyActive()||b!==boss||b.hp>0)return false;storyMission.guardian=true;storyMission.shardSource={x:b.x,y:b.y};if(flightRun.storyOwner===originStore.account())originStore.collect(sectors[level].id);saveCheckpoint();return true;}
function beginStoryExtraction(){storyMission.extract={age:0,hp:6,next:2,spawned:0,raiders:[],x:360,y:H/2};ship.hp=Math.max(ship.hp,3);ship.inv=Math.min(ship.inv,2);announce('BEACON ONLINE','INTERCEPT RAIDERS · PROTECT THE EXPEDITION',3);window.flightAudio?.setMusicActive(true);}
function storyMayFire(){return storyActive()&&!storyMission?.complete;}
function storyTarget(){return storyActive()&&STORY_ROUTE[storyIndex()].kind==='seal'?storyMission?.node:null;}
const STORY_NO_TARGETS=Object.freeze([]);
function storyTargets(){if(!storyActive())return STORY_NO_TARGETS;const n=storyTarget();return [...(n&&n.hp>0?[n]:[]),...(storyMission?.extract?.raiders||[]).filter(r=>r.hp>0)];}
function storyHitTarget(s,target){target.hp-=s.damage;s.seen.add(target);s.spent=true;burst(target.x,target.y,target.storySeal?'#bcefff':'#ffab79',5);if(target.hp<=0){explode(target.x,target.y,target.storySeal?'#bcefff':'#ffa265',target.storySeal?1:.65,false);if(target.storySeal)finishStoryNode();}}
function finishStoryNode(){const m=storyMission;if(!m||m.done>=3)return;m.done++;m.node=null;m.charge=0;window.flightAudio?.engineerCue?.('link',ship.x);announce(m.done===3?'LINK COMPLETE':`NODE ${m.done} / 3 SECURED`,m.done===3?'RECOVER THE GUARDIAN’S SIGNAL':'NEXT SIGNAL LOCATED',1);saveCheckpoint();}
function storyNodePosition(n,dt){
 // Repeating approaches prevent a missed object from blocking the mission.
 n.x-=dt*48;if(n.x< -130)n.x=W+130;
 const solids=obstacles.flatMap(obstacleSolids);let target=n.baseY;const clear=y=>!sceneryBorderContact(n.x,y,78,70)&&solids.every(r=>n.x+78<r.x||n.x-78>r.x+r.w||y+70<r.y||y-70>r.y+r.h);
 if(!clear(target))target=[H/2,250,510,310,450].find(clear)??H/2;n.y+=(target-n.y)*Math.min(1,dt*3);
}
function updateStoryMission(dt){if(!storyActive()||!storyMission||state!=='playing'||sectorBlend)return;const m=storyMission,d=STORY_ROUTE[m.index];m.age+=dt;if(m.complete)return;
 if(['relay','seal','furnace'].includes(d.kind)&&m.done<3&&time>(d.kind==='furnace'?sectors[level].duration:12)){
  if(!m.node){const y=[250,500,360][m.done];m.node={x:W-300,y,baseY:y,hp:42,r:32,storySeal:d.kind==='seal'};}
  storyNodePosition(m.node,dt);
  if(d.kind!=='seal'){const nearby=Math.hypot(ship.x-m.node.x,ship.y-m.node.y)<112;m.charge=clamp(m.charge+(nearby?dt:-dt*.35),0,1.5);if(m.charge>=1.5)finishStoryNode();}
 }
 if(!m.guardian)return;
 if(d.kind==='extraction'){
  if(!m.extract){if(transition>1)return;beginStoryExtraction();saveCheckpoint();}
  const e=m.extract;e.age+=dt;e.next-=dt;window.flightAudio?.setIntensity(.85);
  if(e.next<=0&&e.spawned<10){e.next=2.5;const i=e.spawned++;e.raiders.push({storyRaider:true,x:i%3===2?-45:W+45,y:150+(i*173)%450,hp:13,r:23,age:0});}
  for(const r of e.raiders){if(r.hp<=0)continue;r.age+=dt;const dx=e.x-r.x,dy=e.y-r.y,len=Math.hypot(dx,dy),step=dt*145;r.x+=dx/Math.max(1,len)*step;r.y+=dy/Math.max(1,len)*step;if(len<36){r.hp=0;e.hp--;burst(e.x,e.y,'#ffad72',18);window.flightAudio?.shipHit?.(e.x,false);}else if(Math.hypot(r.x-ship.x,r.y-ship.y)<r.r+25){damage();r.hp=0;}}
  e.raiders=e.raiders.filter(r=>r.hp>0);if(e.hp<=0){announce('EXTRACTION INTERRUPTED','RETRY THE BEACON DEFENSE',3);end(false);return;}if(e.age<32||e.raiders.length)return;
 }else if(['relay','seal','furnace'].includes(d.kind)&&m.done<3)return;
 m.complete=true;if(flightRun.storyOwner===storyStore.account())storyStore.collect(d.id);transition=ORIGIN_RECOVERY_DURATION+.2;originRecovery={story:true,index:m.index,x:clamp(m.shardSource?.x??ship.x+220,70,W-70),y:clamp(m.shardSource?.y??ship.y,90,H-90),kind:originEntry(d.id)?.kind||'core',age:0,phase:-1};updateOriginRecovery(0);annTimer=0;$('#announcement').style.opacity=0;updateHUD();
}
function finishStorySector(){if(!storyActive())return false;if(!storyMission?.complete){transition=1;return true;}showStoryDebrief();return true;}
function showStoryDebrief(){const d=STORY_ROUTE[storyIndex()],next=STORY_ROUTE[storyIndex()+1],final=!next,r=typeof relayDebrief!=='undefined'?relayDebrief:null;if(typeof relayDebrief!=='undefined')relayDebrief=null;state=final?'victory':'debrief';if(final)recordFlightRun(true);keys.clear();pointer=null;touchContacts.clear();annTimer=0;$('#announcement').style.opacity=0;$('#pause').hidden=true;$('#touchControls').classList.remove('active');window.flightAudio?.setMusicActive(false);const overlay=$('#overlay');overlay.className='overlay universe-atlas origin-log';overlay.innerHTML=`<div class="atlas-shell story-shell"><span class="eyebrow mint">${final?'EXPEDITION COMPLETE':'MISSION '+(storyIndex()+1)+' COMPLETE · SHARD SECURED'}</span><h2>${final?'WELCOME HOME':d.socket.toUpperCase()}</h2><p class="story-result">${d.result}</p>${r?`<p>${r.rescued?'The engineer is aboard. Recovery Kit unlocked for future flights.':'The engineer’s distress call remains available on a replay. Your route is open.'}</p>`:''}${storySocketMarkup()}<div class="relay-actions"><button id="storyContinue" class="primary">${next?'CONTINUE TO '+next.world.toUpperCase():'RETURN TO MISSION MAP'} ↗</button><button id="storyMenu">MAIN MENU</button></div><p>${next?next.brief:'Your signal shards are safe. Continue exploring the broader universe, or replay the story.'}</p></div>`;$('#storyContinue').onclick=()=>{if(final){showTitleScreen();showStoryMap();return;}atlasOpen=false;state='playing';overlay.className='overlay hidden';$('#pause').hidden=false;$('#touchControls').classList.add('active');window.flightAudio?.setMusicActive(true);advanceSector(storyNextLevel());canvas.focus();};$('#storyMenu').onclick=showTitleScreen;$('#storyContinue').focus();}
const storyMeshes=new Map();
function storyMesh(kind){
 if(storyMeshes.has(kind))return storyMeshes.get(kind);const m=meshBuilder(),hot=kind==='furnace',light=hot?[255,165,72]:[126,229,232];
 if(kind==='raider'){
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
 if(n)drawModel(storyMesh(d.kind),n.x,n.y,1,.12*Math.sin(m.age*.7),.05*Math.sin(m.age),0,m.age,0);
 if(e){drawModel(storyMesh('beacon'),e.x,e.y,1.3,.1*Math.sin(m.age),0,0,m.age,0);for(const r of e.raiders)drawModel(storyMesh('raider'),r.x,r.y,1,0,0,Math.atan2(e.y-r.y,e.x-r.x),r.age,0);}
 window.gpuModels?.flush(ctx);ctx.save();
 if(n){const c=d.kind==='furnace'?'#ffbe75':'#8de5ee';const halo=ctx.createRadialGradient(n.x,n.y,10,n.x,n.y,100);halo.addColorStop(0,c+'28');halo.addColorStop(1,c+'00');ctx.fillStyle=halo;ctx.fillRect(n.x-100,n.y-100,200,200);ctx.strokeStyle=c+'70';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(n.x,n.y,112,0,TAU);ctx.stroke();ctx.strokeStyle=c;ctx.lineWidth=3;ctx.beginPath();ctx.arc(n.x,n.y,112,-Math.PI/2,-Math.PI/2+TAU*(d.kind==='seal'?1-n.hp/42:m.charge/1.5));ctx.stroke();ctx.fillStyle='#081923dc';ctx.fillRect(n.x-158,n.y+123,316,26);ctx.fillStyle='#e7f8ff';ctx.font='600 14px system-ui';ctx.textAlign='center';ctx.fillText(d.kind==='seal'?'ARCHIVE SEAL · SHOOT':d.kind==='furnace'?'DIVERSION CONTROL · HOLD NEAR':'RELAY · HOLD NEAR',n.x,n.y+142);}
 if(e){ctx.strokeStyle='#8df6d7';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,55+Math.sin(m.age*2)*3,0,TAU);ctx.stroke();ctx.fillStyle='#b7ffe8';ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillText(`EXTRACTION · ${e.hp}/6`,e.x,e.y+80);for(const r of e.raiders){ctx.strokeStyle='#ffc590';ctx.lineWidth=3;const a=Math.atan2(e.y-r.y,e.x-r.x);ctx.beginPath();ctx.moveTo(r.x-Math.cos(a)*22,r.y-Math.sin(a)*22);ctx.lineTo(r.x-Math.cos(a)*(36+Math.sin(r.age*36)*5),r.y-Math.sin(a)*36);ctx.stroke();}}
 ctx.restore();
}

function updateStoryRecovery(r,phase){
 const d=STORY_ROUTE[r.index],next=STORY_ROUTE[r.index+1],p=storyStore.snapshot();if(phase===2)window.flightAudio?.signalRecovered?.((r.index+1)/6,true);
 const panel=$('#originRecoveryPanel');if(!panel)return;panel.hidden=false;panel.innerHTML=`<span class="eyebrow">${phase===0?'MISSION COMPLETE · SIGNAL DETECTED':phase===1?'RECOVERY LINK · DRAWING SHARD ABOARD':'SIGNAL SHARD SECURED'}</span><strong>${d.socket.toUpperCase()}</strong><p>${d.result}</p><div class="recovery-progress"><b>${p.count} / 6</b><span>${next?'NEXT: '+next.world.toUpperCase():'EXPEDITION HOME'}</span></div><div class="recovery-track"><i style="width:${p.count/6*100}%"></i></div><small>${p.durable?'Saved on this device · Survives defeat':'Session progress · Device saving unavailable'}</small>`;
}
function storyNova(){if(!storyActive())return;for(const target of storyTargets())if(target.hp>0)storyHitTarget({damage:50,seen:new Set()},target);}

function storyHomingTarget(s,target){for(const e of storyTargets())if(e.hp>0&&(e.x-s.x)*(s.direction||1)>-40&&(!target||Math.hypot(e.x-s.x,e.y-s.y)<Math.hypot(target.x-s.x,target.y-s.y)))target=e;return target;}
