'use strict';
// One authored campaign mission. Other worlds keep their existing encounters.
const FERRUM_RELAY = Object.freeze({id:'ferrum-relay',world:'ember-forge',at:20,radius:82,boarding:.65});
function createRelayStore(storage){
 const key='first-descent-ferrum-relay-v1';let unlocked=false,durable=!!storage;
 function read(){try{const data=JSON.parse(storage?.getItem(key)||'null');return data?.schemaVersion===1&&data.relay===true;}catch{durable=false;return false;}}
 unlocked=read();
 return {snapshot:()=>({unlocked,durable}),unlock(){const fresh=!unlocked;unlocked=true;try{if(!storage)throw Error('No storage');storage.setItem(key,JSON.stringify({schemaVersion:1,relay:true}));durable=true;}catch{durable=false;}return fresh;}};
}
const relayStore=createRelayStore(missionPreview?null:runStorage);
let ferrumMission=null,relayLoadout='standard',relayDebrief=null,relayContinueFlight=null;
const inFerrumMission=()=>sectors[level].id===FERRUM_RELAY.world;
function relayLoadoutMarkup(){const unlocked=relayStore.snapshot().unlocked;return `<div class="relay-loadouts" role="group" aria-label="Starting equipment"><button data-relay-loadout="standard" aria-pressed="${relayLoadout==='standard'}">STRIKE KIT <small>3 novas · standard hull</small></button><button data-relay-loadout="support" aria-pressed="${relayLoadout==='support'}" ${unlocked?'':'disabled'}>RECOVERY KIT <small>${unlocked?'2 novas · one emergency hull restore':'Establish the Ferrum relay to unlock'}</small></button></div>`;}
function relayMissionCard(){const p=relayStore.snapshot();return `<section class="relay-card"><div><span class="eyebrow mint">FERRUM · OPTIONAL MISSION</span><h3>THE LAST ENGINEER</h3><p>Rescue the engineer to launch a sabotage drone. It hacks one boss weapon, interrupts its next attack and creates a 4.5-second opening for bonus damage. Win with the engineer aboard to unlock the recovery kit for future flights.</p><div class="relay-route" aria-label="Mission route"><span>01 · RESCUE</span><i>→</i><span>02 · DISMANTLE</span><i>→</i><span class="${p.unlocked?'relay-earned':''}">03 · ${p.unlocked?'RELAY ONLINE':'RESTORE RELAY'}</span></div></div><div><strong>${p.unlocked?'SUPPORT RELAY ONLINE':'A VOICE IN THE FOUNDRY'}</strong><p>${p.unlocked?'Recovery kit available on future flights. A safety net in exchange for one nova.':'Fly into the pod’s green ring to teleport the engineer aboard. No hovering or extra button. Keep flying past to skip the rescue.'}</p>${relayLoadoutMarkup()}${relayContinueFlight?'<button id="relayResume" class="primary">CONTINUE FLIGHT TO NACRE ↗</button>':''}<button id="relayLaunch" class="primary">${p.unlocked?'REPLAY MISSION':'ANSWER THE CALL'} ↗</button><small>${missionPreview?'Local preview · rewards reset on reload':p.durable?'Relay reward saves on this device only.':'Relay reward lasts this session; device saving is unavailable.'}</small></div></section>`;}
function bindRelayMission(){
 const resume=$('#relayResume');if(resume&&relayContinueFlight)resume.onclick=relayContinueFlight;
 const launch=$('#relayLaunch');if(launch)launch.onclick=()=>beginDescent(sectors.findIndex(s=>s.id===FERRUM_RELAY.world));
 for(const mode of ['standard','support']){const button=$('[data-relay-loadout="'+mode+'"]');if(button)button.onclick=()=>{if(mode==='support'&&!relayStore.snapshot().unlocked)return;relayLoadout=mode;showOriginMission();};}
}
function applyRelayLoadout(){if(relayLoadout==='support'&&relayStore.snapshot().unlocked){novas=2;rescueCharge=1;if(flightRun)flightRun.loadout='relay-recovery';}else if(flightRun)flightRun.loadout='strike';}
function prepareFerrumMission(){
 relayDebrief=null;relayContinueFlight=null;ferrumMission=null;if(!inFerrumMission())return;
 getRescuePodMesh();getEngineerDroneMesh();
 const now=time;let route=null;
 // Build a terrain-safe pickup corridor once before flight, never per frame.
 try{time=FERRUM_RELAY.at;route=planRecoveryRoute({x:W+72,y:190,drift:95});}finally{time=now;}
 ferrumMission={status:'waiting',age:0,warned:false,route,x:W+72,y:route?.points[0]||190,boarded:false,complete:false};
}
function ferrumCheckpoint(){return ferrumMission?{status:ferrumMission.boarded?'aboard':ferrumMission.status,boarded:ferrumMission.boarded,warned:ferrumMission.warned}:null;}
function restoreFerrumCheckpoint(saved){if(!ferrumMission)return;Object.assign(ferrumMission,saved||{});if(time>FERRUM_RELAY.at+18&&!ferrumMission.boarded)ferrumMission.status='missed';}
function updateFerrumMission(dt){
 const m=ferrumMission;if(!m||!inFerrumMission()||m.complete)return;
 if(!m.warned&&time>=16){m.warned=true;announce('DISTRESS CALL · ENGINEER STRANDED','FLY INTO THE GREEN RING · GAIN A BOSS SABOTAGE DRONE',1);}
 if(m.status==='boarding'){
  m.age+=dt;const u=clamp(m.age/FERRUM_RELAY.boarding,0,1);m.x=m.fromX-95*m.age;m.y=m.fromY;
  if(u===1){m.status='aboard';burst(ship.x,ship.y,'#b8ffe4',14);window.flightAudio?.signalRecovered?.(.3,false);announce('ENGINEER ABOARD','SABOTAGE DRONE READY · ONE BOSS WEAPON CAN BE JAMMED',1);}return;
 }
 if(m.boarded||m.status==='missed'||time<FERRUM_RELAY.at)return;
 m.status='active';m.age=time-FERRUM_RELAY.at;
 const r=m.route;m.x=W+72-95*m.age;
 if(r){const i=Math.min(r.points.length-2,Math.floor(m.age/r.step)),u=clamp(m.age/r.step-i,0,1);m.y=r.points[i]*(1-u)+r.points[i+1]*u;}
 // The whole ship must fit. If a future scenery edit blocks the route, docking
 // pauses instead of asking the player to enter solid scenery.
 const clear=!sceneryBorderContact(m.x,m.y,64,44)&&!obstacles.some(o=>obstacleSolids(o).some(v=>m.x+64>v.x&&m.x-64<v.x+v.w&&m.y+44>v.y&&m.y-44<v.y+v.h));
 // Entering the displayed ring latches the rescue. The pilot can immediately
 // dodge away while the short teleport animation completes.
 const close=clear&&Math.hypot(ship.x-m.x,ship.y-m.y)<=FERRUM_RELAY.radius;
 m.available=clear;
 if(close){m.boarded=true;m.status='boarding';m.age=0;m.fromX=m.x;m.fromY=m.y;} else if(m.x<-80){m.status='missed';announce('DISTRESS SIGNAL PASSED','RESCUE DECLINED · THE MAIN ROUTE REMAINS OPEN',0);}
}
let rescuePodMesh=null;
function getRescuePodMesh(){
 if(rescuePodMesh)return rescuePodMesh;const m=meshBuilder();
 m.ellipsoid(0,0,0,27,14,13,[138,154,147],0,16,10);m.ellipsoid(-7,-3,-10,13,8,5,[48,95,104],.15,12,8);
 for(const x of [-17,17])m.tube([[x,-10,-5],[x,-13,-10],[x,11,-10],[x,12,-4]],2,[192,161,98]);
 for(const y of [-11,11]){m.tube([[12,y,0],[27,y,0]],3,[46,57,67]);m.ellipsoid(28,y,0,2,3,3,[119,233,204],.7,8,5);}
 m.tube([[-9,-12,0],[-12,-23,0]],.9,[180,191,180]);m.ellipsoid(-12,-23,0,2,2,2,[169,255,216],.8,6,4);
 rescuePodMesh=m.faces;return rescuePodMesh;
}
function drawFerrumMission(){
 const m=ferrumMission;if(!m||!['active','boarding'].includes(m.status)||sectorBlend)return;
 const boarding=m.status==='boarding',u=boarding?clamp(m.age/FERRUM_RELAY.boarding,0,1):0;
 // The capsule dissolves at its own position; it never slides into the ship.
 ctx.save();ctx.globalAlpha=boarding?1-clamp((u-.1)/.48,0,1):1;
 if(ctx.globalAlpha>0){drawModel(getRescuePodMesh(),m.x,m.y,1.25,0,.04*Math.sin(time*2),-.05,time,0);window.gpuModels?.flush(ctx);}ctx.restore();
 if(boarding){drawEngineerTeleport(m.x,m.y,clamp(u/.72,0,1),false);return;}
 ctx.save();ctx.strokeStyle=m.available===false?'#82939a':'#a9f4d4';ctx.lineWidth=2;ctx.globalAlpha=.65;ctx.beginPath();ctx.arc(m.x,m.y,FERRUM_RELAY.radius,0,TAU);ctx.stroke();
 const x=clamp(m.x,160,W-160),y=clamp(m.y+FERRUM_RELAY.radius+23,75,H-48);ctx.globalAlpha=.94;ctx.fillStyle='#081d25';ctx.fillRect(x-153,y-16,306,42);ctx.font='bold 13px sans-serif';ctx.fillStyle='#c8ffe7';ctx.textAlign='center';ctx.fillText(m.available===false?'ENGINEER · WAIT FOR CLEARANCE':'ENGINEER · ENTER RING TO TELEPORT',x,y);ctx.font='12px sans-serif';ctx.fillText('Drone jams a boss weapon · attack the opening',x,y+18);ctx.restore();
}
// Bounded, deterministic motes: no particle allocation or random flicker per frame.
function drawEngineerTeleport(x,y,phase,arrival){
 if(phase<=0||phase>=1)return;
 const pulse=Math.sin(phase*Math.PI),radius=arrival?54:43;
 ctx.save();ctx.translate(x,y);ctx.globalCompositeOperation='lighter';
 const halo=ctx.createRadialGradient(0,0,0,0,0,radius*1.55);
 halo.addColorStop(0,`rgba(220,255,246,${pulse*.5})`);halo.addColorStop(.32,`rgba(92,245,220,${pulse*.28})`);halo.addColorStop(1,'rgba(55,205,210,0)');
 ctx.fillStyle=halo;ctx.fillRect(-radius*1.55,-radius*1.55,radius*3.1,radius*3.1);
 ctx.strokeStyle='#b9fff1';ctx.lineWidth=2;
 for(let i=0;i<3;i++){const p=clamp(phase*1.35-i*.13,0,1);if(p<=0||p>=1)continue;ctx.globalAlpha=(1-p)*.85;ctx.beginPath();ctx.ellipse(0,(.5-p)*36,radius*(.35+p),8+p*13,0,0,TAU);ctx.stroke();}
 for(let i=0;i<28;i++){
  const a=i*2.39996,r=radius*Math.sqrt((i+.5)/28),delay=(i%5)*.035,p=clamp((phase-delay)/.8,0,1);
  const spread=arrival?1.5-p:1+p*.6,px=Math.cos(a)*r*spread,py=Math.sin(a)*r*.65-(arrival?1-p:p)*48;
  ctx.globalAlpha=Math.sin(p*Math.PI)*.9;ctx.fillStyle=i%3?'#8dffe0':'#f0fff9';ctx.fillRect(px,py,1.6+i%2,3+(i%4));
 }
 ctx.restore();
}
// Draw after scenery so the mission benefit stays legible through the battle.
function drawFerrumSupport(){
 const m=ferrumMission;if(!m||m.complete||sectorBlend||!['playing','paused'].includes(state))return;
 if(m.status==='boarding'){drawEngineerTeleport(ship.x,ship.y,clamp((m.age/FERRUM_RELAY.boarding-.28)/.72,0,1),true);return;}
 if(!m.boarded)return;
 const support=boss?.siege?.engineer,node=support&&boss.siege.nodes.find(n=>n.id===support.target),phase=support?.phase||'ready';
 drawEngineerDrone(boss,support);
 const title={ready:'ENGINEER · SABOTAGE DRONE READY',deploying:'ENGINEER · DRONE APPROACHING WEAPON',hacking:'ENGINEER · HACKING WEAPON',armed:'ENGINEER · WAITING TO INTERRUPT ATTACK',disabled:'ENGINEER · WEAPON JAMMED — ATTACK NOW',returning:'ENGINEER · DRONE RETURNING',spent:'ENGINEER · SABOTAGE COMPLETE'}[phase];
 const detail=phase==='disabled'?'Bonus damage · '+Math.max(0,node?.sabotage||0).toFixed(1)+'s remaining':phase==='hacking'?'Link established · '+Math.floor(clamp(support.age/1.4,0,1)*100)+'%':phase==='spent'?'One intervention used · win to unlock the Recovery Kit':'One weapon interruption · other boss weapons remain active';
 const x=24,y=H-104;
 ctx.save();ctx.fillStyle='rgba(5,22,28,.82)';ctx.fillRect(x,y,390,62);ctx.fillStyle=phase==='disabled'?'#c8ffe7':'#92cbb8';ctx.fillRect(x,y,3,62);ctx.textAlign='left';ctx.font='bold 13px sans-serif';ctx.fillText(title,x+14,y+21);ctx.font='12px sans-serif';ctx.fillText(detail,x+14,y+41);ctx.restore();
}

function ferrumEngineerAboard(){return !!ferrumMission?.boarded&&inFerrumMission();}
// One intervention per encounter. The siege owns this transient state, so a
// checkpoint retry restarts the fight without granting permanent combat buffs.
function updateEngineerSabotage(b,dt){
 if(!ferrumEngineerAboard()||ferrumMission.complete||state!=='playing'||sectorBlend||b.entry||b.hp<=0)return;
 const siege=b.siege;if(!siege)return;
 let d=siege.engineer;
 if(!d){
  const candidates=siege.nodes.filter(n=>capitalNodeActive(b,n));
  const target=candidates.sort((a,z)=>Math.hypot(capitalNodePosition(b,a).x-ship.x,capitalNodePosition(b,a).y-ship.y)-Math.hypot(capitalNodePosition(b,z).x-ship.x,capitalNodePosition(b,z).y-ship.y))[0];
  if(!target||b.x>W-80)return;
  d=siege.engineer={phase:'deploying',target:target.id,age:0,x:ship.x,y:ship.y-36,fromX:ship.x,fromY:ship.y-36,used:false};
  window.flightAudio?.engineerCue?.('launch',ship.x);
 }
 if(d.phase==='spent')return;
 const n=siege.nodes.find(n=>n.id===d.target);d.age+=dt;
 if(d.phase!=='returning'&&(!n||!capitalNodeActive(b,n))){d.phase='returning';d.age=0;d.fromX=d.x;d.fromY=d.y;}
 if(d.phase==='returning'){
  const t=navigationEase(d.age/1.1);d.x=d.fromX+(ship.x-d.fromX)*t;d.y=d.fromY+(ship.y-d.fromY)*t-40*Math.sin(t*Math.PI);
  if(d.age>=1.1){if(d.used)d.phase='spent';else siege.engineer=null;}return;
 }
 const p=capitalNodePosition(b,n);
 if(d.phase==='deploying'){
  const t=navigationEase(d.age/1.25);d.x=d.fromX+(p.x-d.fromX)*t;d.y=d.fromY+(p.y-d.fromY)*t-75*Math.sin(t*Math.PI);
  if(d.age>=1.25){d.phase='hacking';d.age=0;window.flightAudio?.engineerCue?.('link',p.x);}return;
 }
 d.x=p.x;d.y=p.y;
 if(d.phase==='hacking'&&d.age>=1.4){d.phase='armed';d.age=0;}
 // Intercept queued attacks before the gun/discharge update. Rounds already
 // flying and all other weapons are untouched; sealed armor stays sealed.
 if(d.phase==='armed'&&(n.warning>0||n.burst>0||n.special)){
  n.warning=0;n.burst=0;n.muzzle=0;n.special=null;n.target=null;n.sabotage=4.5;n.clock=.7;
  d.phase='disabled';d.age=0;d.used=true;burst(p.x,p.y,'#9dffe1',20);
  window.flightAudio?.engineerCue?.('jam',p.x);updateHUD();
 }else if(d.phase==='disabled'&&!(n.sabotage>0)){
  d.phase='returning';d.age=0;d.fromX=d.x;d.fromY=d.y;window.flightAudio?.engineerCue?.('return',p.x);
 }
}
let engineerDroneMesh=null;
function getEngineerDroneMesh(){
 if(engineerDroneMesh)return engineerDroneMesh;const m=meshBuilder();
 m.ellipsoid(0,0,0,15,9,8,[103,133,144],0,16,10);
 m.ellipsoid(-3,-2,-7,8,5,3,[43,73,86],.1,12,8);
 m.ellipsoid(7,0,-8,3,3,2,[122,255,213],.65,8,6);
 for(const side of [-1,1]){m.tube([[-9,side*5,0],[-17,side*13,0],[-5,side*17,-6],[4,side*12,-10]],1.8,[189,178,142]);m.ellipsoid(-12,side*6,2,3,3,3,[67,202,230],.6,8,6);}
 engineerDroneMesh=m.faces;engineerDroneMesh.industrial=true;return engineerDroneMesh;
}
function drawEngineerDrone(b,d){
 if(d?.phase==='spent')return;
 const attached=d&&['hacking','armed','disabled'].includes(d.phase),n=attached&&b.siege.nodes.find(n=>n.id===d.target),p=n?capitalNodePosition(b,n):d||{x:ship.x-30*shipDirection(),y:ship.y-47+Math.sin(time*3)*4};
 const docking=d?.phase==='returning'?1-.65*clamp(d.age/1.1,0,1):1,pose=attached?bossFlightPose(b):{yaw:0,roll:0,pitch:.1*Math.sin(time*4)};
 drawModel(getEngineerDroneMesh(),p.x,p.y,1.25*docking,pose.yaw,pose.roll,pose.pitch,time,0);window.gpuModels?.flush(ctx);
 ctx.save();ctx.strokeStyle='#a3ffe3';ctx.lineWidth=2;
 if(attached){
  const progress=d.phase==='hacking'?clamp(d.age/1.4,0,1):d.phase==='disabled'?clamp(n.sabotage/4.5,0,1):1;
  ctx.globalAlpha=.8;ctx.beginPath();ctx.arc(p.x,p.y,29,-Math.PI/2,-Math.PI/2+TAU*progress);ctx.stroke();
  if(d.phase==='hacking'||d.phase==='disabled')for(let i=0;i<6;i++){const t=(d.age*1.6+i/6)%1,a=i*2.399;ctx.globalAlpha=(1-t)*.75;const r=19+t*28;ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r);ctx.lineTo(p.x+Math.cos(a)*(r+6),p.y+Math.sin(a)*(r+6));ctx.stroke();}
 }
 ctx.restore();
}
function finishFerrumMission(b){
 const m=ferrumMission;if(!m||m.complete||!inFerrumMission()||b!==boss||b.hp>0)return;
 m.complete=true;const earned=m.boarded&&!!flightRun,fresh=earned?relayStore.unlock():false;
 relayDebrief={rescued:m.boarded,earned,fresh};
}
function showFerrumDebrief(){
 if(!relayDebrief)return false;const r=relayDebrief;relayDebrief=null;state='debrief';annTimer=0;$('#announcement').style.opacity=0;window.flightAudio?.setMusicActive(false);keys.clear();pointer=null;touchContacts.clear();$('#pause').hidden=true;$('#touchControls').classList.remove('active');
 const p=relayStore.snapshot(),overlay=$('#overlay');overlay.className='overlay universe-atlas';overlay.onclick=null;
 overlay.innerHTML=`<div class="atlas-shell relay-debrief"><span class="eyebrow mint">FERRUM · MISSION COMPLETE</span><h2>${r.earned?'A LIGHT IN THE FOUNDRY':'THE ENGINE FALLS'}</h2><p>${r.earned?'The engineer restores an expedition relay beneath the foundry. Another voice joins the journey.':r.rescued?'Engineer recovered in this test flight. Complete a regular mission to save the reward.':'The Dreadnought is down. The unanswered distress call remains available when you return to Ferrum.'}</p><div class="relay-route"><span>CAELUS</span><i>→</i><span class="${r.earned?'relay-earned':''}">FERRUM${r.earned?' · RELAY ONLINE':''}</span><i>→</i><span>NACRE · NEXT</span></div><section class="relay-reward"><span class="eyebrow">${r.earned?(r.fresh?'NEW EQUIPMENT UNLOCKED':'PERMANENT EQUIPMENT AVAILABLE'):'OPTIONAL OBJECTIVE'}</span><h3>${r.earned?'RECOVERY KIT':'RESCUE THE LAST ENGINEER'}</h3><p>${r.earned?'Start future flights with one emergency hull restore and two novas. Choose your kit in the mission log.':'Approach the escape pod during the foundry run, then defeat the Dreadnought with the engineer aboard.'}</p><small>${r.earned?(missionPreview?'Local preview · rewards reset on reload':p.durable?'Saved on this device · Survives defeat':'Session reward · Device saving unavailable'):'The next world is open regardless of the rescue.'}</small></section><div class="relay-actions"><button id="relayContinue" class="primary">CONTINUE TO NACRE ↗</button><button id="relayMap">VIEW MISSION MAP</button></div></div>`;
 const continueFlight=()=>{atlasOpen=false;atlasSystemId=null;overlay.onclick=null;state='playing';window.flightAudio?.setTitle(false);enableAudio();overlay.className='overlay hidden';$('#pause').hidden=false;$('#touchControls').classList.add('active');window.flightAudio?.setMusicActive(true);advanceSector();canvas.focus();};
 relayContinueFlight=continueFlight;$('#relayContinue').onclick=continueFlight;
 $('#relayMap').onclick=()=>{state='title';showOriginMission();};$('#relayContinue').focus();return true;
}
