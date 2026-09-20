'use strict';
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d'),W=1440,H=760;
const $=s=>document.querySelector(s),TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rand=(a,b)=>a+Math.random()*(b-a);
const titleMarkup=$('#overlay').innerHTML;
function showTitleScreen(){atlasOpen=false;atlasSystemId=null;$('#overlay').onclick=null;state='title';$('#overlay').className='overlay title-screen';$('#overlay').innerHTML=titleMarkup;$('#launch').onclick=beginDescent;bindUniverseButton();const music=$('#introMusic');if(music)music.onclick=()=>$('#music').onclick();window.flightAudio?.setTitle(!document.hidden);musicControls();updateExpeditionIntro();drawNavigationChart();}
let atlasSystemId=null,atlasOpen=false;
function bindUniverseButton(){const button=$('#universe');if(button)button.onclick=()=>showUniverseAtlas();}
function universeCatalog(){return [...expeditionSystems.values()].map(system=>({system,galaxy:GALAXIES[system.galaxyId],worlds:system.destinations}));}
function showUniverseAtlas(selectedId=null){
 if(state!=='title')return;atlasOpen=true;atlasSystemId=selectedId;const catalog=universeCatalog(),entry=catalog.find(e=>e.system.id===selectedId),overlay=$('#overlay');
 const counts=`${new Set(catalog.map(e=>e.galaxy.id)).size} GALAXIES · ${catalog.reduce((n,e)=>n+systemCensus(e.system).suns,0)} SUNS · ${catalog.reduce((sum,e)=>sum+e.worlds.length,0)} DESTINATIONS`;
 overlay.className='overlay universe-atlas';overlay.innerHTML=`<div class="atlas-shell"><header class="atlas-header"><div><span class="eyebrow mint">EXPEDITION ATLAS</span><h2>${entry?entry.system.name+' SYSTEM':'THE KNOWN UNIVERSE'}</h2><p>${entry?entry.galaxy.name+' · '+systemCensusLabel(entry.system):counts}</p></div><button id="atlasBack">${entry?'← ALL GALAXIES':'← MAIN MENU'}</button></header>${entry?`<div class="atlas-detail"><canvas id="atlasMap" width="800" height="550" aria-label="${entry.system.name} orbital map"></canvas><div class="atlas-worlds"><p class="atlas-note">Conquest route · one encounter per destination</p>${entry.worlds.map((d,i)=>{const stage=campaign.find(s=>s.id===d.stages[0]);return `<article><span class="atlas-number">${String(i+1).padStart(2,'0')}</span><div><h3>${d.name}${d.rings?' <small>RINGED</small>':''}</h3><p>${ENVIRONMENTS[stage.environment]?.label||stage.environment} · ${d.stellarBody?.type||d.climate.toUpperCase()} · ${d.stellarBody?'STELLAR ORBIT':d.orbit+' AU'}</p><p>${stage.name}</p><p class="atlas-note">NATIVE LIFE · ${stage.biosphere.names.join(" · ")}</p></div></article>`;}).join('')}<p class="atlas-note">${systemFocus(entry.system).name} · ${systemFocus(entry.system).type}<br>${entry.system.centralBody?systemCensus(entry.system).suns+' stellar coronas · no planetary landings.':'Hot inner orbits → cold outer worlds.'}</p></div></div>`:`<p class="atlas-note">Begin in Vesper. Conquer its three planets, then cross to the next galaxy. Select a galaxy to explore its worlds.</p><div class="atlas-grid">${catalog.map((e,i)=>`<button class="atlas-card" data-system="${e.system.id}" style="--galaxy:url('assets/${galaxyImageFile(e.galaxy)}');--galaxy-tint:${e.galaxy.tint.join(',')}"><span class="atlas-number">${String(i+1).padStart(2,'0')}</span><strong>${e.galaxy.name}</strong><span>${e.system.name} · ${systemCensusLabel(e.system)}</span><small>${e.worlds.map(d=>d.name).join(' · ')}</small></button>`).join('')}</div>`}</div>`;
 $('#atlasBack').onclick=()=>entry?showUniverseAtlas():closeUniverseAtlas();overlay.onclick=event=>{const button=event.target.closest?.('[data-system]');if(button)showUniverseAtlas(button.dataset.system);};$('#atlasBack').focus();drawUniverseAtlas();
}
function closeUniverseAtlas(){atlasOpen=false;atlasSystemId=null;$('#overlay').onclick=null;showTitleScreen();$('#universe')?.focus();}
function drawUniverseAtlas(){
 if(!atlasOpen||!atlasSystemId)return;const map=$('#atlasMap'),system=expeditionSystems.get(atlasSystemId);if(!map||!system)return;const now=navigationSeconds();if(map.atlasTime&&now-map.atlasTime<1/30)return;map.atlasTime=now;const c=map.getContext('2d');c.clearRect(0,0,800,550);paintSystemChart(c,system,system.destinations[0].id,now*.4);
}
const sectors=campaign;
const themeIndex=()=>LEVEL_THEMES[sectors[level].theme],bossIndex=()=>BOSS_KINDS[sectors[level].bossKind],difficulty=()=>sectors[level].difficulty;
const levelPacing=()=>sectors[level].pacing||{pickupGap:2.4,maxPickups:1,maxActiveEnemies:10,pickupX:650,preBossRelief:true};
const currentSection=()=>sectors[level].checkpoints.reduce((section,at,i)=>time>=at?i:section,0);
let state='title',level=0,time=0,world=0,last=0,spawnClock=0,score=0,weapon='pulse',power=1,novas=3,fireClock=0,shake=0,flash=0,boss=null,bossDefeated=false,transition=0,kills=0,annTimer=0,sound=true;
let enemies=[],shots=[],hostile=[],particles=[],drops=[],rings=[],explosions=[],hazards=[],acidClouds=[];
let speedLevel=0,companion=0,companionClock=0,waveIndex=0,gateIndex=0,supplyIndex=0;
let queuedSupplies=[],queuedSupplyLevel=-1,lastSupplySpawn=-Infinity,preBossRelief=false;
let obstacles=[];


let rescueCharge=0;
const NAVIGATION_SPEED=2;
let checkpoint=null,hudClock=0,sectorBlend=null,sectorIntroLead=0;
let challengeState={wave:0,gate:false,warned:false,reward:false};
let weaponOrb={owned:false,flash:0};
let pilotTurn={angle:0,target:0};
function shipDirection(){return pilotTurn.target===0?1:-1;}
function shipTurning(){return Math.abs(pilotTurn.target-pilotTurn.angle)>.001;}
// Couple the half-turn to a half-roll: yaw alone leaves the underside facing
// the camera after reversal. All fitted equipment shares this upright pose.
function pilotFlightPose(){return{yaw:flightPose.yaw+pilotTurn.angle,roll:flightPose.roll+pilotTurn.angle,pitch:flightPose.pitch};}
function pilotMount(x,y=0,z=0){const pose=pilotFlightPose(),p=projectHull([x,y,z],pose.yaw,pose.roll,pose.pitch);return{x:ship.x+p.x,y:ship.y+p.y};}
function orbPosition(){return pilotMount(65);}

function refreshHullMeter(){
 const block=$('.hullblock');if(!block)return;
 let meter=$('#hullMeter');
 if(!meter){const label=block.querySelector('.eyebrow'),readout=document.createElement('b'),wrap=document.createElement('div');readout.id='hullReadout';label.append(' ',readout);wrap.className='hull-meter';wrap.setAttribute('role','meter');wrap.setAttribute('aria-label','Hull integrity');wrap.setAttribute('aria-valuemin','0');wrap.setAttribute('aria-valuemax','5');wrap.innerHTML='<i id="hullMeter"></i>';block.insertBefore(wrap,$('#hearts'));meter=$('#hullMeter');}
 const hp=clamp(ship?.hp||0,0,5);meter.style.width=(hp*20)+'%';meter.parentElement.setAttribute('aria-valuenow',String(hp));$('#hullReadout').textContent=hp+' / 5'+(rescueCharge?' · RESCUE READY':'');block.classList.toggle('low-hull',hp<=2);
}
if(typeof setInterval==='function')setInterval(refreshHullMeter,80);
function flipShip(){if(state!=='playing'||sectorBlend)return;pilotTurn.target=pilotTurn.target===0?Math.PI:0;fireClock=0;updateHUD();}
function updateOrbCharge(dt){
 if(!weaponOrb.owned)return;
 weaponOrb.charge??=2;weaponOrb.cooldown=Math.max(0,(weaponOrb.cooldown||0)-dt);
 if(!weaponOrb.cooldown)weaponOrb.charge=Math.min(2,weaponOrb.charge+dt*.25);
}
function updatePilotTurn(dt){updateOrbCharge(dt);const delta=pilotTurn.target-pilotTurn.angle;pilotTurn.angle+=clamp(delta,-Math.PI*dt/.22,Math.PI*dt/.22);weaponOrb.flash=Math.max(0,(weaponOrb.flash||0)-dt);}
// Sweep the bullet segment against the attached orb, so fast missiles cannot
// tunnel through it. Rear shots and attacks passing above/below remain threats.
function blockWithOrb(b,oldX,oldY){
 if(!weaponOrb.owned||shipTurning()||(weaponOrb.charge??2)<1)return false;
 const dir=shipDirection(),p=orbPosition(),r=22+(b.r||0);
 if(b.vx*dir>=0||(oldX-p.x)*dir < -r)return false;
 const dx=b.x-oldX,dy=b.y-oldY,length=dx*dx+dy*dy;
 const t=length?clamp(((p.x-oldX)*dx+(p.y-oldY)*dy)/length,0,1):0;
 const x=oldX+dx*t,y=oldY+dy*t;
 if(Math.hypot(x-p.x,y-p.y)>r)return false;
 if(!(weaponOrb.flash>0))window.flightAudio?.shipHit(p.x,true);
 weaponOrb.charge=(weaponOrb.charge??2)-1;weaponOrb.cooldown=2;weaponOrb.flash=.14;burst(x,y,'#a5faff',8);return true;
}


function saveCheckpoint(){checkpoint={section:currentSection(),sceneLead:sectorIntroLead,score,kills,weapon,power,speedLevel,companion,novas,orbOwned:weaponOrb.owned,pilotHeading:pilotTurn.target};}
// Restored scenery can cross the old fixed spawn. Choose clear positions from
// the actual collision profiles, with deterministic preferences and full ship clearance.
function placeCheckpointRecovery(){
 const solids=obstacles.flatMap(obstacleSolids),rotors=obstacles.filter(o=>o.rotor),preferredY=380;
 const clear=(x,y,mx,my)=>solids.every(r=>x+mx<r.x||x-mx>r.x+r.w||y+my<r.y||y-my>r.y+r.h)&&rotors.every(o=>!rotorContact(o,x,y,Math.max(mx,my)));
 const ordered=(origin,min,max,extra=[])=>[...new Set([clamp(origin,min,max),min,max,...extra.filter(v=>v>=min&&v<=max),...Array.from({length:Math.ceil((max-min)/12)},(_,i)=>min+i*12)])].sort((a,b)=>Math.abs(a-origin)-Math.abs(b-origin)||a-b);
 const find=(x,y,mx,my,minX=40,maxX=W-65)=>{
  const xs=ordered(x,minX,maxX,solids.flatMap(r=>[r.x-mx-2,r.x+r.w+mx+2])),ys=ordered(y,42,H-42,solids.flatMap(r=>[r.y-my-2,r.y+r.h+my+2]));
  for(const px of xs)for(const py of ys)if(clear(px,py,mx,my))return{x:px,y:py};
  return null;
 };
 const spawn=find(210,preferredY,52,32)||find(210,preferredY,24,14);
 if(spawn){ship.x=spawn.x;ship.y=spawn.y;}
 // Plan against moving terrain at arrival time, not just the restored snapshot.
 drops=sectors[level].recovery.map((d,i)=>{
  const item=makeSupply({...d,y:clamp(ship.y+d.y-preferredY,60,H-60),recoveryIndex:i},'checkpoint');
  item.route=planRecoveryRoute(item);if(item.route)item.y=item.route.points[0];
  return item;
 });
}
function retrySection(){
 queuedSupplies=[];queuedSupplyLevel=level;lastSupplySpawn=-Infinity;preBossRelief=false;
 if(flightRun)flightRun.retries++;
 const saved={...checkpoint};weaponOrb={owned:saved.orbOwned,flash:0};pilotTurn={angle:saved.pilotHeading||0,target:saved.pilotHeading||0};resetSector();checkpoint=saved;sectorIntroLead=saved.sceneLead||0;time=sectors[level].checkpoints[saved.section];world=time*SCROLL_SPEED;
 ({score,kills,weapon,power,speedLevel,companion,novas}=saved);novas=Math.max(1,novas);
 challengeState.wave=(sectors[level].challenge?.waves||[]).filter(at=>at<time).length;
 waveIndex=waveTimes[level].filter(at=>at<time).length;gateIndex=gatePlans[level].filter(g=>g.at<time).length;supplyIndex=supplyPlans[level].filter(d=>d.at<time).length;
 obstacles=gatePlans[level].slice(0,gateIndex).map((g,id)=>({...g,id,x:W+100-(time-g.at)*SCROLL_SPEED,w:g.width||82+difficulty()*8})).filter(o=>o.x+o.w>-30);
 // Restore an already-entered midpoint gate before choosing the safe spawn.
 // Otherwise the first simulation tick can materialize it around the pilot.
 const c=sectors[level].challenge;
 challengeState.gate=!!(c&&time>=c.at-4);
 if(challengeState.gate){const at=c.at-4,x=W+100-(time-at)*SCROLL_SPEED;
  if(x+420>-30){obstacles.push({at,id:50,x,w:420,width:420,shutters:true});
   if(c.gate)enemies.push({sentry:true,anchorAt:at,x:x+110,y:125,base:125,type:2,age:0,phase:0,speed:0,r:28,hp:65,max:65,hit:0,shoot:2});
  }
 }
 ship={x:210,y:380,vx:0,vy:0,hp:5,inv:3,shield:1,frontShield:0,frontFlash:0};
 flightPose={pitch:0,roll:0,yaw:0,thrust:0,vx:0,vy:0};keys.clear();pointer=null;lastTouchTap=null;touchContacts.clear();pinchGesture=null;shake=flash=0;accumulator=0;companionClock=0;
 // Same two recovery items, in reachable open space, on every retry.
 placeCheckpointRecovery();
 state='playing';window.flightAudio?.setMusicActive(true);$('#overlay').classList.add('hidden');$('#pause').hidden=false;$('#touchControls').classList.add('active');canvas.focus();
 announce('SECTION '+(saved.section+1)+' / 4','CHECKPOINT RESTORED · POWER + SHIELD AHEAD');updateHUD();
}
function bossDamage(amount){return amount/(sectors[level].bossArmor||1);}

const waveTimes=sectors.map(s=>s.waves),gatePlans=sectors.map(s=>s.obstacles),supplyPlans=sectors.map(s=>s.supplies);
const SCROLL_SPEED=100;
const weaponNames={pulse:'PULSE',spread:'STARFIRE',beam:'ION LANCE',helix:'HELIX',wave:'PHOTON WAVE',missile:'SEEKER'};
let ship={x:210,y:380,hp:5,inv:0,shield:0,frontShield:0,frontFlash:0};const keys=new Set();let pointer=null,lastTouchTap=null,pinchGesture=null;const touchContacts=new Map();
const stars=Array.from({length:190},()=>({x:rand(0,W),y:rand(0,H),z:rand(.15,1.1),r:rand(.4,1.8)}));
const rocks=Array.from({length:16},(_,i)=>({x:rand(0,W+500),y:i%2?rand(650,860):rand(-100,80),r:rand(45,130),seed:rand(0,10),z:rand(.2,.7)}));
function tone(freq=440,duration=.06,type='sine',vol=.04,slide=0){if(sound)window.flightAudio?.note({frequency:freq,end:Math.max(25,freq+slide),duration,type,gain:vol})}
function enableAudio(){try{window.flightAudio?.init();window.flightAudio?.setEnabled(sound)}catch(error){console.warn('Audio unavailable',error)}}
function glow(color,blur=15){ctx.shadowColor=color;ctx.shadowBlur=blur}function noGlow(){ctx.shadowBlur=0}
function poly(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.3;ctx.stroke()}}
const orbTextures=new Map();
function orb(x,y,r,color,alpha=1){if(r<=0||alpha<=0)return;let sprite=orbTextures.get(color);if(!sprite){sprite=document.createElement('canvas');sprite.width=sprite.height=96;const c=sprite.getContext('2d'),g=c.createRadialGradient(48,48,0,48,48,48);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(0,0,96,96);if(orbTextures.size>=64)orbTextures.delete(orbTextures.keys().next().value);orbTextures.set(color,sprite);}ctx.globalAlpha=alpha;ctx.drawImage(sprite,x-r,y-r,r*2,r*2);ctx.globalAlpha=1;}
function background(dt){drawBackdrop(dt)}
function drawBaseShip(x,y,scale=1,preview=false){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);const tilt=preview?Math.sin(world*.005)*.03:(keys.has('ArrowUp')||keys.has('w'))?-.09:(keys.has('ArrowDown')||keys.has('s'))?.09:0;ctx.rotate(tilt);
orb(-44,0,67,'#26e5dd',.4);glow('#6af9da',20);poly([[-32,-8],[-75-rand(0,25),0],[-32,8]],'#6effdd');poly([[-36,-4],[-85-rand(0,20),0],[-36,4]],'#effff5');noGlow();
poly([[-27,-11],[-43,-36],[-14,-30],[18,-9]],'#356272','#94b8ba');poly([[-27,11],[-43,36],[-14,30],[18,9]],'#203e51','#6e9da7');poly([[-35,-16],[2,-21],[55,0],[2,21],[-35,16],[-20,0]],'#8babb4','#e7fafa');poly([[-21,-11],[9,-14],[55,0],[-2,4]],'#d2e5e4');poly([[-5,5],[55,0],[4,19],[-28,13]],'#486777');poly([[0,-9],[20,-4],[28,0],[2,2],[-8,-3]],'#102c41','#68f8ef');glow('#7afee3',10);poly([[2,-6],[17,-3],[19,-1],[2,-1]],'#81ffe8');ctx.fillStyle='#81ffe8';ctx.fillRect(-28,-23,14,3);ctx.fillRect(-28,20,14,3);noGlow();ctx.restore()}
function enemyShape(e){drawEnemy(e)}
function drawBoss(){if(boss)drawMenace(boss)}
function burst(x,y,color,count=22){for(let i=0;i<count;i++){const a=rand(0,TAU),v=rand(45,320);particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.2,.8),max:.8,c:color,r:rand(1,4)})}rings.push({x,y,r:8,life:.5,c:color})}
function announce(title,sub=''){const el=$('#announcement');el.textContent=title;if(sub){let small=document.createElement('small');small.textContent=sub;el.append(small)}el.className=/^SECTOR|^FIRST CONTACT/.test(title)?'':'compact';el.style.opacity=1;annTimer=/^SECTOR/.test(title)?2.4:1.8}
function updateHUD(){$('#score').textContent=String(score).padStart(6,'0');const stageProgress=systemStageProgress(expedition.locations[sectors[level].id]);$('#sectorNum').textContent=`${String(stageProgress.number).padStart(2,'0')} / ${String(stageProgress.total).padStart(2,'0')}`;$('#sectorName').textContent=expedition.locations[sectors[level].id].destinationName+' · '+sectors[level].short;const currentLocation=expedition.locations[sectors[level].id],routePlanets=expeditionSystem(currentLocation).destinations.filter(d=>d.kind==='planet').map(d=>d.id),planetIndex=routePlanets.indexOf(currentLocation.destinationId),planetProgress=$('#destinationProgress');if(planetProgress)planetProgress.textContent=currentLocation.destinationKind==='star'?`${currentLocation.systemName} · STELLAR CORONA`:`${currentLocation.galaxyName} · ${currentLocation.systemName} · PLANET ${planetIndex+1} / ${routePlanets.length}`;$('#hearts').textContent='▰ '.repeat(Math.max(0,ship.hp))+'▱ '.repeat(5-Math.max(0,ship.hp));$('#weapon').textContent=`${weaponNames[weapon]} / MK ${['I','II','III'][power-1]}${ship.shield>0?' + SHIELD':''}`;$('#loadout').textContent=`BOOST ${speedLevel}/3 · DRONES ${companion}/2${ship.frontShield?' · GUARD '+ship.frontShield:''}${weaponOrb.owned?' · ORB GUARD':''} · FACING ${shipDirection()===1?'RIGHT':'LEFT'}`;$('#novas').textContent='● '.repeat(novas)+'○ '.repeat(3-novas);$('#progressLabel').textContent=`${!flightRun&&state!=='title'?'TEST FLIGHT · ':''}${sectors[level].scrollAxis==='down'?'DESCENT · ':sectors[level].scrollAxis==='up'?'ASCENT · ':''}SECTION ${currentSection()+1} / 4`;$('#progress').style.width=Math.min(100,time/sectors[level].duration*100)+'%';$('#status').textContent=state==='playing'?(boss?'BOSS ENGAGED':`SECTION ${currentSection()+1} / 4`):state==='title'?'AWAITING PILOT':state.toUpperCase();if(boss){$('#bosshealth').style.width=Math.max(0,boss.hp/boss.max*100)+'%';const hint=$('#bosstactic');if(hint)hint.textContent=bossEncounterProfile(sectors[level]).signature+' · '+(typeof isCapitalSiege==='function'&&isCapitalSiege(boss)?capitalSiegeHint(boss):typeof bossEncounterHint==='function'?bossEncounterHint(boss):boss.exposed>0?'EXPOSED · ATTACK NOW':encounterRules[sectors[level].bossKind].hint);}}
function fullscreenPanel(){const panel=$('.console')||$('.stage');if(panel?.classList){panel.classList.contains??=()=>false;panel.classList.toggle??=()=>{};}return panel;}
function nativeFullscreenElement(){return document.fullscreenElement||document.webkitFullscreenElement;}
function ensureGameFullscreen(){if(!nativeFullscreenElement()&&!fullscreenPanel().classList.contains('expanded'))return toggleGameFullscreen();return requestLandscape();}
// Resume audio before fullscreen consumes the browser user activation.
function beginDescent(){atlasOpen=false;atlasSystemId=null;$('#overlay').onclick=null;enableAudio();const launch=()=>{start();sectorBlend={arrival:true,systemEntry:true,age:0,duration:15.5/NAVIGATION_SPEED,destination:expedition.locations[sectors[0].id]};$('#announcement').style.opacity=0;annTimer=0;render(0);};if(window.safariImmersion?.request(launch))return;void ensureGameFullscreen();launch();}
function start(){rescueCharge=0;weaponOrb={owned:false,flash:0};pilotTurn={angle:0,target:0};beginFlightRun();frameError=null;resizeFlightSurface();window.flightAudio?.setTitle(false);enableAudio();window.flightAudio?.intro();keys.clear();pointer=null;lastTouchTap=null;touchContacts.clear();pinchGesture=null;flash=0;shake=0;world=0;accumulator=0;flightPose={pitch:0,roll:0,yaw:0,thrust:0,vx:0,vy:0};level=0;score=0;power=1;weapon='pulse';novas=3;kills=0;speedLevel=0;companion=0;companionClock=0;ship={x:210,y:380,hp:5,inv:2,shield:1,frontShield:0,frontFlash:0};resetSector();state='playing';$('#overlay').classList.add('hidden');$('#pause').hidden=false;$('#touchControls').classList.add('active');canvas.focus();announce('SECTOR 01',sectors[0].name);updateHUD()}
function resetSector(){flash=0;shake=0;if(sectors[level].stellar)requestStellarPhotosphere();resetWaterWakes();trimSectorArt(sectors[level],sectors[level+1]);prepareSectorArt(sectors[level]);sectorArtPrefetched=false;sectorBlend=null;sectorIntroLead=0;window.gpuModels?.prepare([bossDesign()?.mesh,...sectors[level].models.map(n=>meshes[n]),meshes.spore,meshes.missile,meshes.siphon,meshes.cannon,meshes.shrapnel,meshes.bone,meshes.rib,meshes.spineChip,meshes.chitinChip,meshes.skull,meshes.orbitalRock].filter(Boolean));challengeState={wave:0,gate:false,warned:false,reward:false};window.flightAudio?.setEnvironment?.(sectors[level].medium,sectors[level].theme,sectors[level].environment);window.flightAudio?.setSector(sectors[level].music,sectors[level].id,{kind:bossIndex(),organic:bossOrganic(),anatomy:bossDesign()?.mesh.anatomyProgram||sectors[level].biosphere?.boss.anatomy,habitat:sectors[level].medium,seed:sectors[level].biosphere?.boss.genome?.seed,protection:sectors[level].biosphere?.boss.genome?.protection});window.flightAudio?.setBossApproach?.(0);time=0;spawnClock=1;fireClock=0;enemies=[];shots=[];hostile=[];particles=[];drops=[];rings=[];explosions=[];hazards=[];acidClouds=[];waveIndex=0;gateIndex=0;supplyIndex=0;obstacles=[];boss=null;bossDefeated=false;transition=0;$('#bossbar').hidden=true;ship.x=210;ship.y=380;ship.vx=0;ship.vy=0;ship.edgeBounceX=ship.edgeBounceY=null;ship.inv=3;saveCheckpoint();updateHUD()}
function panel(title,description,label,action){$('#overlay').classList.remove('hidden','records-view','title-screen');$('#overlay').innerHTML=`<div class="intro"><div class="eyebrow mint">FIRST DESCENT / FLIGHT RECORD</div><h1 class="result-title">${title}</h1><p class="introcopy">${description}</p><button class="primary" id="panelAction">${label}<span>↗</span></button><div class="launch-caption">SCORE ${String(score).padStart(6,'0')} · ${expedition.locations[sectors[level].id].systemName} · SECTOR ${systemStageProgress(expedition.locations[sectors[level].id]).number} / ${systemStageProgress(expedition.locations[sectors[level].id]).total}</div></div>`;$('#panelAction').onclick=action;$('#panelAction').focus()}
function pause(){if(state==='playing'){state='paused';window.flightAudio?.setMusicActive(false);window.flightAudio?.clear();keys.clear();pointer=null;lastTouchTap=null;touchContacts.clear();pinchGesture=null;panel('FLIGHT<br><em>PAUSED</em>','Take a breath. The galaxy can wait.','RESUME MISSION',pause)}else if(state==='paused'){enableAudio();const resume=()=>{state='playing';window.flightAudio?.setMusicActive(true);$('#overlay').classList.add('hidden');canvas.focus();updateHUD();};if(window.safariImmersion?.request(resume))return;void ensureGameFullscreen();resume()}updateHUD()}
function end(win){if(!win&&flightRun)flightRun.deaths++;recordFlightRun(win);window.flightAudio?.setMusicActive(false);window.flightAudio?.clear();state=win?'victory':'gameover';$('#pause').hidden=true;$('#touchControls').classList.remove('active');$('#bossbar').hidden=true;
 panel(win?'SYSTEMS<br><em>SECURED</em>':'SIGNAL<br><em>LOST</em>',win?`${contentReleases.flatMap(r=>r.systems).length} systems secured · ${new Set(Object.values(expedition.locations).filter(p=>p.destinationKind==='planet').map(p=>p.destinationId)).size} planets conquered · ${sectors.length} descents cleared.<br>The expedition is secured. New solar systems will arrive in future updates.`:`Continue ${expedition.locations[sectors[level].id].destinationName}, section ${checkpoint.section+1} of 4.<br>Your checkpoint loadout returns, with power and shield pickups ahead.`,win?'FLY AGAIN':'CONTINUE DESCENT',win?beginDescent:retrySection);updateHUD()}
// Upgrades widen coverage and increase total output without multiplying every barrel.
const WEAPON_DAMAGE={pulse:3.2,spread:1.6,beam:5.4,helix:2.1,wave:6,missile:7,drone:2};
const POWER_OUTPUT=[1,1.3,1.6];
function makeShot(x,y,kind,angle=0,side=0){
 const c={pulse:'#92ffe7',spread:'#ffc26b',beam:'#87cfff',helix:'#be93ff',wave:'#6cffe8',missile:'#ffb86c',drone:'#a1eeff'}[kind];
 const speed=kind==='missile'?430:kind==='wave'?660:850;
 shots.push({x,y,base:y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,damage:WEAPON_DAMAGE[kind]||WEAPON_DAMAGE.pulse,r:kind==='wave'?22:kind==='beam'?10:kind==='missile'?8:6,c,kind,beam:['beam','wave'].includes(kind),seen:new Set(),age:0,side,trail:[]});
}
function fire(origin=ship,direction=shipDirection(),fromOrb=false){
 const first=shots.length;
 const launch=(x,y,...args)=>{makeShot(origin.x+(x-ship.x)*(fromOrb?.4:1)*direction,origin.y+y-ship.y,...args);const s=shots[shots.length-1];s.vx*=direction;s.direction=direction;};
 if(weapon==='helix'){for(const side of [-1,1])launch(ship.x+48,ship.y,'helix',0,side);if(power===3)launch(ship.x+50,ship.y,'pulse')}
 else if(weapon==='wave'){launch(ship.x+50,ship.y,'wave');if(power>1)for(const side of [-1,1])launch(ship.x+25,ship.y+side*24,'wave',side*.09)}
 else if(weapon==='missile'){for(const side of [-1,1])launch(ship.x+26,ship.y+side*27,'missile',side*.18);if(power>1)launch(ship.x+50,ship.y,'pulse')}
 else {const n=weapon==='spread'?power+2:power;for(let i=0;i<n;i++)launch(ship.x+48,ship.y+(i-(n-1)/2)*13,weapon,weapon==='spread'?(i-(n-1)/2)*.13:0)}
 const baseCount=weapon==='spread'?3:['helix','missile'].includes(weapon)?2:1;
 const budget=WEAPON_DAMAGE[weapon]*baseCount*POWER_OUTPUT[power-1];
 let total=0;for(let i=first;i<shots.length;i++)total+=shots[i].damage;
 for(let i=first;i<shots.length;i++)shots[i].damage*=budget/total;
 if(!fromOrb)muzzleFlash=.07;window.flightAudio?.shot(weapon,ship.x);
}
// Piercing has a finite energy budget; wide weapons cannot erase an entire
// formation at full damage. Ordinary rounds are consumed at their first hit.
function hitEnemyWithShot(s,e){
 if(s.spent||e.hp<=0||s.seen.has(e))return false;
 e.hp-=s.damage;e.hit=.12;s.seen.add(e);burst(e.x,e.y,s.c,3);
 if(e.hp<=0)kill(e);
 if(!s.beam||s.seen.size>=3)s.spent=true;
 else s.damage*=.6;
 return true;
}
function damage(){if(ship.inv>0||state!=='playing')return;if(ship.shield>0){ship.shield--;ship.inv=COMBAT_BALANCE.shieldGrace;window.flightAudio?.shipHit(ship.x,true);burst(ship.x,ship.y,'#8ddfff',15)}else{ship.hp--;ship.inv=COMBAT_BALANCE.hitGrace;shake=10;flash=.12;burst(ship.x,ship.y,'#ffa782',30);window.flightAudio?.shipHit(ship.x);if(ship.hp<=0){if(rescueCharge){rescueCharge=0;ship.hp=3;ship.inv=3.5;hostile=hostile.filter(b=>Math.hypot(b.x-ship.x,b.y-ship.y)>300);if(flightRun)flightRun.rescues=(flightRun.rescues||0)+1;rings.push({x:ship.x,y:ship.y,r:20,life:.9,c:'#fff1a2'});window.flightAudio?.pickup(ship.x);announce('RESCUE ACTIVATED','HULL RESTORED · ALL UPGRADES RETAINED');}else end(false);}}updateHUD()}
function nova(){if(state!=='playing'||sectorBlend||novas<=0)return;novas--;flash=.55;shake=14;for(const e of enemies){if(e.hp<=0)continue;e.hp=0;kill(e);}enemies=[];hostile=[];if(boss){if(typeof isCapitalSiege==='function'&&isCapitalSiege(boss))capitalNovaDamage(boss,95);else{boss.hp-=95;boss.hit=.2}}rings.push({x:ship.x,y:ship.y,r:10,life:1.2,c:'#c0fff0'});window.flightAudio?.explosion(ship.x,3,false);updateHUD()}
function enemyWaveSlots(){return Math.max(0,levelPacing().maxActiveEnemies-enemies.filter(e=>e.hp>0&&!e.satellite&&!e.sentry).length);}
function spawn(){
 const slots=enemyWaveSlots();if(!slots)return;
 if(sectors[level].broodWaves.includes(waveIndex)){
  const profile=sectors[level].escortEncounter||null,hp=(130+difficulty()*35)*(profile?1.15:1),type=profile&&!profile.organic?2:3;
  const mother={brood:true,escortProfile:profile,type,x:W+210,y:380,base:380,age:0,phase:waveIndex*.4,speed:115,hp,max:hp,hit:0,r:54,shoot:2};enemies.push(mother);
  const count=profile?.count||6;
  for(let n=0;n<count;n++)enemies.push({satellite:true,mother,escortProfile:profile,orbit:n*TAU/count,type:profile&&!profile.organic?0:1,x:mother.x,y:mother.y,base:380,age:0,phase:n*.3,speed:245,hp:profile?20+difficulty()*2:14,max:profile?20+difficulty()*2:14,hit:0,r:20,shoot:profile?3+n*.65:Infinity});return;
 }

 const i=waveIndex,eliteInterval=sectors[level].systemChallenge?.eliteWaveInterval||10,elite=i===11?'hunter':sectors[level].flankWaves?.includes(i)?'ace':i%eliteInterval===Math.min(7,eliteInterval-1)?(Math.floor(i/eliteInterval)%2?'hunter':'ace'):null,type=elite==='hunter'?2:elite==='ace'?0:sectors[level].roster[i%sectors[level].roster.length],center=sectors[level].routes[(i+Math.floor(difficulty())*2)%sectors[level].routes.length],count=Math.min(slots,elite?3:i<2?2:4+(difficulty()>0?1:0));
 for(let n=0;n<count;n++){const leader=n===0?elite:null,memberType=elite&&n>0?0:type,offset=i%3===0?(n-(count-1)/2)*52:i%3===1?Math.sin(n*1.15)*75:(n%2?1:-1)*Math.ceil(n/2)*42,y=clamp(center+offset,100,H-100),hp=([7,9,22,13][memberType]+difficulty()*3)*(leader?2.5:1)*(sectors[level].enemyHealthScale||1);
 const enemy={x:W+180+n*96,y,base:y,type:memberType,elite:leader,wave:i,hp,max:hp,hit:0,age:0,phase:i*.45+n*.16,shoot:(leader?.9:1.5)+n*.38,speed:([220,180,130,205][memberType]+difficulty()*17)*(leader==='ace'?1.55:1)*(1+Math.min(i,20)*.018),r:memberType===2?39:31};prepareEnemyEntry(enemy,i,n);enemies.push(enemy);}
}
function updateStructures(dt){
 const plan=gatePlans[level];while(gateIndex<plan.length&&time>=plan[gateIndex].at){const g=plan[gateIndex];obstacles.push({...g,id:gateIndex,x:W+100,w:g.width||82+difficulty()*8});gateIndex++}
 for(const o of obstacles){o.x=W+100-(time-o.at)*SCROLL_SPEED;if(o.rotor&&rotorContact(o,ship.x,ship.y,18))damage();if(obstacleSolids(o).some(r=>ship.x+24>r.x&&ship.x-24<r.x+r.w&&ship.y+14>r.y&&ship.y-14<r.y+r.h))damage()}
 obstacles=obstacles.filter(o=>o.x+o.w>-30);
}
// A visible emitter charge precedes every ordinary/elite shot. Aimed rounds
// commit to the pilot's position at the warning, rewarding a deliberate dodge.
function updateEnemyWeapon(e,dt){
 e.shoot-=dt;
 const visible=e.x>45&&e.x<W-45&&e.y>35&&e.y<H-35&&(!e.entry||e.age>1.6);
 if(!visible){e.shotWindup=null;return;}
 if(!e.shotWindup&&e.shoot<=0){
  if(Math.hypot(e.x-ship.x,e.y-ship.y)<COMBAT_BALANCE.enemyShotClearance)return;
  e.shotWindup={age:0,targetX:ship.x,targetY:ship.y};
 }
 const windup=e.shotWindup;if(!windup)return;
 windup.age+=dt;if(windup.age<COMBAT_BALANCE.enemyWindup)return;
 const rig=firingRig(e),speed=e.elite==='hunter'?(rig.organic?420:640):(rig.organic?520:760)+difficulty()*45;
 // Never release a surprise point-blank shot after an enemy swoops into the pilot.
 if(Math.hypot(rig.muzzleX-ship.x,rig.muzzleY-ship.y)<COMBAT_BALANCE.enemyShotClearance)return;
 const angle=e.elite?Math.atan2(windup.targetY-rig.muzzleY,windup.targetX-rig.muzzleX):e.verticalTravel?rig.heading:(e.direction===1?0:Math.PI);
 const kind=e.elite==='hunter'?'seeker':rig.organic?organicShotKind(e):'bolt';
 hostile.push({x:rig.muzzleX,y:rig.muzzleY,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:7,c:sectors[level].color,kind,launchAngle:angle});
 e.muzzle=.16;e.shotWindup=null;
 e.shoot=((e.elite==='hunter'?1.65:3.2)-difficulty()*.2)*(enemySpecies(e)?.cadence||1)*(sectors[level].systemChallenge?.enemyFireScale||1);
 window.flightAudio?.shot(kind,e.x,true);
}
function aimed(x,y,speed=520,offset=0,kind='bolt'){const a=Math.atan2(ship.y-y,ship.x-x)+offset;hostile.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:7,c:sectors[level].color,kind,launchAngle:a})}
// Boss attacks are timed sequences: a locked acid volley, a sweeping autocannon,
// and a serpent's alternating venom strikes. Every round keeps its launch vector.
function updateBossWeapon(b,dt){
 if(isTideEncounter())return;
 if(typeof isCapitalSiege==='function'&&isCapitalSiege(b))return;
 if(bossIndex()>=3)return;
 if(b.recovery>0){holdBossSalvo(b);return;}
 b.shoot-=dt;
 if(b.pass&&b.pass.stage!=='rear'){b.attack=null;b.fireHeading=null;return}
 if(!b.attack&&b.shoot<=0&&b.x>0&&b.x<W){const r=firingRig(b,true);b.attack={age:0,next:.42,index:0,heading:Math.atan2(ship.y-r.muzzleY,ship.x-r.muzzleX),target:{x:ship.x,y:ship.y}};b.fireHeading=r.heading;b.shoot=99}
 const a=b.attack;if(!a)return;a.age+=dt;
 const count=bossIndex()===0?4:bossIndex()===1?10:6,interval=bossIndex()===0?.15:bossIndex()===1?.09:.18;
 const offset=bossIndex()===1?-.42+a.index*.105:bossIndex()===2?(a.index%2?-.17:.17):0;
 const origin=firingRig(b,true);a.heading=a.target?Math.atan2(a.target.y-origin.muzzleY,a.target.x-origin.muzzleX):a.heading;b.fireHeading=a.heading+offset;
 if(a.age<a.next)return;
 const r=firingRig(b,true);if(r.organic){const mouth=organicMouth(b);r.muzzleX=mouth.x;r.muzzleY=mouth.y;}else if(!bossDesign()&&bossIndex()===1&&imageReady(art.bossAtlas)){const gun=openingBossMount(b,a.index%2?'lower':'upper');r.muzzleX=gun.x;r.muzzleY=gun.y;}const speed=bossIndex()===0?560:bossIndex()===1?690:620,angle=(a.target?Math.atan2(a.target.y-r.muzzleY,a.target.x-r.muzzleX):a.heading)+offset;
 hostile.push({x:r.muzzleX,y:r.muzzleY,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:r.organic?7:8,c:sectors[level].color,kind:r.organic?organicShotKind():'bolt',launchAngle:angle,scale:r.organic?.85:.9,bossShot:true});
 b.muzzle=.16;bossIndex()===1?window.flightAudio?.shot('bolt',b.x,true):window.flightAudio?.bossAttack?.('fire',bossIndex(),b.x);a.index++;a.next+=interval*(r.organic?.85:1);
 if(a.index>=count){b.attack=null;b.fireHeading=null;b.shoot=(b.hp/b.max<.5?.36:.58)*(r.organic?.72:1)*COMBAT_BALANCE.salvoRest*(sectors[level].salvoRestScale||1)}
}
function updateBossWingAudio(b){if(!bossOrganic()||typeof organicBossWingPhase!=='function')return;const stroke=Math.floor(organicBossWingPhase(bossIndex(),b)/TAU);if(b.wingAudioStroke!==undefined&&stroke>b.wingAudioStroke)window.flightAudio?.wingbeat?.(b.x,b.propulsion||0,bossIndex());b.wingAudioStroke=stroke;}
function steerHostile(b,dt){b.age=(b.age||0)+dt;if(b.kind==='seed'&&b.age>.85&&!b.split){b.split=true;for(let i=0;i<5;i++){const a=Math.PI+(i-2)*.28;hostile.push({x:b.x,y:b.y,vx:Math.cos(a)*620,vy:Math.sin(a)*620,r:7,scale:1,kind:'spore',c:b.c});}burst(b.x,b.y,b.c,10);b.x=-200;return;}if(b.kind!=='seeker'||b.age>1.8)return;const heading=Math.atan2(b.vy,b.vx),target=Math.atan2(ship.y-b.y,ship.x-b.x),delta=Math.atan2(Math.sin(target-heading),Math.cos(target-heading)),angle=heading+clamp(delta,-.7*dt,.7*dt),speed=Math.hypot(b.vx,b.vy);b.vx=Math.cos(angle)*speed;b.vy=Math.sin(angle)*speed}
function supplySlotAvailable(){
 // Supplies now enter at the right edge, not at the old projected pickup point.
 // Enemy positions must not delay a learnable supply timetable.
 return drops.length<levelPacing().maxPickups;
}
// Familiar power-ups enter visibly from the right, with a steady drift.
// Checkpoint supplies retain their authored spacing and repeatable order.
function makeSupply(item,reason='supply'){
 const stagger=reason==='checkpoint'?(item.recoveryIndex||0)*180:0;
 return {...item,x:W+72+stagger,y:clamp(item.y,60,H-60),r:23,age:0,recovery:reason==='checkpoint',drift:reason==='checkpoint'?250:(item.drift||160)};
}
// A small time/height grid plans each recovery pickup once per retry. It uses
// future scenery positions, including vertical passages and the midpoint gate.
// This runs outside the frame loop and never changes authoritative terrain.
function recoveryTerrain(at,x){
 const now=time;time=at;
 try{
  const list=gatePlans[level].map((o,id)=>({...o,id,x:W+100-(at-o.at)*SCROLL_SPEED,w:o.width||82+difficulty()*8})).filter(o=>o.at<=at&&o.x+o.w>-100);
  const c=sectors[level].challenge;
  if(c&&at>=c.at-4&&W+100-(at-c.at+4)*SCROLL_SPEED+420>-30)list.push({at:c.at-4,id:50,x:W+100-(at-c.at+4)*SCROLL_SPEED,w:420,width:420,shutters:true});
  return list.flatMap(o=>{
   // A rotation-invariant asteroid envelope is both cheaper to plan against and
   // safer than sampling a tumbling silhouette at a handful of future frames.
   if(themeIndex()===0)return obstacleForms(o).flatMap((r,index)=>{
    const surface=asteroidSurface(o,r,index),radius=surface.navigationRadius??(surface.navigationRadius=Math.max(...surface.points.map(p=>Math.hypot(...p)))),cx=r.x+r.w/2,cy=r.y+r.h/2;
    if(Math.abs(x-cx)>radius+64)return [];
    return [{x:cx-radius,y:cy-radius,w:radius*2,h:radius*2}];
   });
   const forms=obstacleForms(o);if(!forms.some(r=>x+64>r.x&&x-64<r.x+r.w)&&!o.rotor)return [];
   return [...obstacleSolids(o),...(o.rotor?[{x:o.x+35,y:205,w:350,h:350}]:[])];
  });
 }finally{time=now;}
}
function planRecoveryRoute(item){
 const step=.12,rows=41,dy=16,count=Math.ceil((item.x+60)/item.drift/step),parents=[],start=time;
 let previous=null;
 for(let i=0;i<=count;i++){
  const x=item.x-item.drift*i*step,solids=recoveryTerrain(start+i*step,x),cost=new Float64Array(rows).fill(Infinity),parent=new Int16Array(rows).fill(-1);
  for(let r=0;r<rows;r++){
   const y=60+r*dy;
   if(solids.some(o=>x+64>o.x&&x-64<o.x+o.w&&y+44>o.y&&y-44<o.y+o.h))continue;
   const preference=((y-item.y)/H)**2;
   if(!previous)cost[r]=preference;
   else for(let q=Math.max(0,r-1);q<=Math.min(rows-1,r+1);q++){
    const value=previous[q]+preference+(q===r?0:.035);
    if(value<cost[r]){cost[r]=value;parent[r]=q;}
   }
  }
  parents.push(parent);previous=cost;
 }
 let row=Array.from(previous).reduce((best,v,i)=>v<previous[best]?i:best,0);
 if(!Number.isFinite(previous[row]))return null;
 const points=new Array(count+1);for(let i=count;i>=0;i--){points[i]=60+row*dy;row=parents[i][row];}
 return {step,points,startX:item.x};
}
function updateSupplyMovement(d,dt){
 if(d.recovery&&!d.route){
  d.routeWait=(d.routeWait||0)-dt;if(d.routeWait>0)return;
  d.route=planRecoveryRoute(d);d.routeWait=.5;if(!d.route)return;
  d.age=0;d.y=d.route.points[0];
 }
 d.age+=dt;
 if(d.route){
  const index=Math.min(d.route.points.length-2,Math.floor(d.age/d.route.step)),u=clamp(d.age/d.route.step-index,0,1);
  d.x=d.route.startX-d.drift*d.age;d.y=d.route.points[index]*(1-u)+d.route.points[index+1]*u;
 }else d.x-=(d.drift||70)*dt;
 const distance=Math.hypot(d.x-ship.x,d.y-ship.y);
 // Recovery follows its safe route; do not pull it through a wall toward the pilot.
 if(!d.route&&distance<150){d.x+=(ship.x-d.x)*dt*2.8;d.y+=(ship.y-d.y)*dt*2.8;}
 if(distance<55){collect(d);d.x=-100;}
}
function spawnSupplies(){
 const plan=supplyPlans[level],p=levelPacing();
 if(queuedSupplyLevel!==level){queuedSupplies=[];queuedSupplyLevel=level;lastSupplySpawn=-Infinity;preBossRelief=false;}
 while(supplyIndex<plan.length&&time>=plan[supplyIndex].at)queuedSupplies.push(plan[supplyIndex++]);
 if(p.preBossRelief&&!preBossRelief&&time>=sectors[level].duration-14&&ship.hp<=3){queuedSupplies.unshift({type:'repair',y:clamp(ship.y,120,H-120),relief:true});preBossRelief=true;}
 const item=queuedSupplies[0];
 if(!item||time-lastSupplySpawn<p.pickupGap||!supplySlotAvailable())return;
 queuedSupplies.shift();lastSupplySpawn=time;drops.push(makeSupply({x:clamp(Math.max(ship.x+250,p.pickupX||650),220,W-130),y:item.y,type:item.type,drift:item.drift,relief:!!item.relief},item.relief?'rescue':'supply'));
}
function enemyExplosionSize(e){return e.satellite?.65:e.brood?1.8:e.type===2?1.5:1}
function enemyDefeatReward(e){
 if(e.scoreAwarded)return 0;e.scoreAwarded=true;
 // Repeated summoned broods cannot be farmed indefinitely.
 if(e.guardian){if(!boss||(boss.rewardedGuardians||0)>=4)return 0;boss.rewardedGuardians=(boss.rewardedGuardians||0)+1;}
 return e.elite?750:e.type===2?300:150;
}
function bossClearReward(){return 3000+Math.round((sectors[level].systemChallenge?.progress||0)*1500);}
function kill(e){const reward=enemyDefeatReward(e);score+=reward;if(reward)kills++;explode(e.x,e.y,isOrganicEnemy(e)?'#98ffc5':'#ffb26a',enemyExplosionSize(e),isOrganicEnemy(e),organicVoice(e));updateHUD()}
function collect(d){
 if(['spread','beam','helix','wave','missile'].includes(d.type)){if(weapon===d.type)power=Math.min(3,power+1);else weapon=d.type}
 else if(d.type==='orb'){weaponOrb.owned=true;weaponOrb.charge=2;weaponOrb.cooldown=0;weaponOrb.flash=.25;}
 else if(d.type==='power')power=Math.min(3,power+1);
 else if(d.type==='speed')speedLevel=Math.min(3,speedLevel+1);
 else if(d.type==='companion')companion=Math.min(2,companion+1);
 else if(d.type==='frontShield')ship.frontShield=Math.min(8,(ship.frontShield||0)+6);
 else if(d.type==='shield')ship.shield=Math.min(3,ship.shield+2);
 else if(d.type==='repair')ship.hp=Math.min(5,ship.hp+2);
 else if(d.type==='rescue')rescueCharge=1;
 else if(d.type==='nova')novas=Math.min(3,novas+1);
 score+=50;burst(d.x,d.y,'#a8ffdb',12);window.flightAudio?.pickup(d.x);
 const label={orb:'ORB GUARD · TWO BLOCKS · RECHARGES BETWEEN BURSTS',speed:`ENGINE BOOST ${speedLevel}/3`,companion:'WINGMATE ONLINE',power:'CANNONS UPGRADED',frontShield:'FRONT GUARD ONLINE',shield:'SHIELD RESTORED',repair:'HULL REPAIRED',rescue:'RESCUE READY · SURVIVE ONE FATAL HIT',nova:'NOVA RECHARGED'}[d.type]||weaponNames[d.type]+' ACQUIRED';
 announce(label);annTimer=1.4;updateHUD();
}
// Capture once at the sector boundary. Blurring a small cached image avoids
// filtering the full live scene on every frame of the transition.
function sectorSceneTime(){return time+sectorIntroLead+(sectorBlend?.age||0);}
function advanceSector(target=level+1){
 if(!Number.isInteger(target)||target<0||target>=sectors.length)return;
 // Capture scenery afresh so the old ship never becomes part of the fade.
 ctx.setTransform(renderScale,0,0,renderScale,0,0);window.gpuModels?.begin();ctx.save();background(0);drawDreamAtmosphere();drawStructures();window.gpuModels?.flush(ctx);drawNearField();ctx.restore();
 const fromLocation=expedition.locations[sectors[level].id],fromDestination=fromLocation?.destinationId;const motion={x:ship.x,y:ship.y,vx:ship.vx,vy:ship.vy};
 const outgoing=document.createElement('canvas');outgoing.width=W;outgoing.height=H;
 outgoing.getContext('2d').drawImage(canvas,0,0,W,H);
 const haze=document.createElement('canvas');haze.width=720;haze.height=380;const hc=haze.getContext('2d');hc.filter='blur(9px)';hc.drawImage(outgoing,-18,-10,756,400);hc.filter='none';
 level=target;ship.hp=Math.min(5,ship.hp+2);novas=Math.min(3,novas+1);resetSector();Object.assign(ship,motion);
 const destination=expedition.locations[sectors[level].id],travel=destination?.destinationId!==fromDestination;sectorBlend={outgoing,haze,age:0,duration:(destination.galaxyId!==fromLocation.galaxyId?24:destination.systemId!==fromLocation.systemId?14:travel?11.8:2.2)/NAVIGATION_SPEED,origin:fromLocation,galaxyEntry:destination.galaxyId!==fromLocation.galaxyId,systemEntry:destination.systemId!==fromLocation.systemId,destination:travel?destination:null};$('#announcement').style.opacity=0;annTimer=0;window.flightAudio?.setIntensity(0);
}
// Natural completion and skipping share the arrival bookkeeping. Skipping never
// advances the level a second time or applies the orb command to gameplay.
function finishSectorTravel(){
 if(!sectorBlend)return false;
 sectorIntroLead+=sectorBlend.duration;sectorBlend=null;
 saveCheckpoint();window.flightAudio?.planetArrival?.();
 announce(expedition.locations[sectors[level].id].destinationName,sectors[level].name);
 return true;
}
function skipSectorTravel(){
 if(state!=='playing'||!sectorBlend?.destination)return false;
 pointer=null;lastTouchTap=null;touchContacts.clear();pinchGesture=null;
 return finishSectorTravel();
}
function drawSectorBlend(){if(!sectorBlend)return;const u=clamp(sectorBlend.age/sectorBlend.duration,0,1),e=u*u*(3-2*u),soft=Math.sin(Math.PI*u);
 if(sectorBlend.destination){drawPlanetTransit(sectorBlend.destination,u);drawTravelViewport(u);return;}
 ctx.save();ctx.globalAlpha=(1-e)*(1-soft*.8);ctx.drawImage(sectorBlend.outgoing,0,0,W,H);
 ctx.globalAlpha=(1-e)*soft*.8;ctx.drawImage(sectorBlend.haze,0,0,W,H);
 ctx.globalAlpha=soft*.12;ctx.fillStyle=sectors[level].color;ctx.fillRect(0,0,W,H);ctx.restore();if(sectorBlend.destination)drawPlanetTransit(sectorBlend.destination,u);else drawDescentLabel(u);
}
// One small rebound per edge contact. Input away cancels it immediately;
// holding against the boundary does not retrigger a perpetual wobble.
function pilotEdgeBounce(axis,value,min,max,input,dt){
 const field=axis==='x'?'edgeBounceX':'edgeBounceY';let bounce=ship[field];
 if(bounce&&((bounce.side===1?value-min:max-value)>22||input*bounce.side>0)){ship[field]=null;bounce=null;}
 if(!bounce&&(value<min||value>max)){bounce=ship[field]={side:value<min?1:-1,age:0};}
 if(bounce){
  bounce.age+=dt;
  if(bounce.age<.24){const u=bounce.age/.24;return(bounce.side===1?min:max)+bounce.side*10*Math.sin(Math.PI*u)*(1-u*.35);}
 }
 return clamp(value,min,max);
}
function updateShipMovement(dt,environment=true){
let dx=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0),dy=(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0);
const water=environment&&sectors[level].medium==='water',mobility=water?WATER_HANDLING.pilotSpeed:1;
const len=Math.hypot(dx,dy)||1,maxSpeed=(390+speedLevel*75)*mobility;
let targetVX=dx/len*maxSpeed,targetVY=dy/len*maxSpeed;
const drag=pointer?.relative?{x:(pointer.moveX||0)*mobility,y:(pointer.moveY||0)*mobility}:null;
if(drag){pointer.moveX=pointer.moveY=0;const magnitude=Math.hypot(drag.x,drag.y)/dt,scale=Math.min(1,maxSpeed/(magnitude||1));targetVX=drag.x/dt*scale;targetVY=drag.y/dt*scale}
else if(pointer){const px=(pointer.x-ship.x)/dt,py=(pointer.y-ship.y)/dt,scale=Math.min(1,maxSpeed/(Math.hypot(px,py)||1));targetVX=px*scale;targetVY=py*scale}
// Water carries momentum. Smooth displacement before velocity so touch input
// remains consistent when pointer events arrive less often than simulation ticks.
if(water){
 if(drag){
  const release=1-Math.exp(-dt/WATER_HANDLING.touchBuffer),limit=maxSpeed*.10;
  if(drag.x*(ship.waterInputX||0)+drag.y*(ship.waterInputY||0)<0)ship.waterInputX=ship.waterInputY=0;
  ship.waterInputX=clamp((ship.waterInputX||0)+drag.x,-limit,limit);
  ship.waterInputY=clamp((ship.waterInputY||0)+drag.y,-limit,limit);
  targetVX=ship.waterInputX*release/dt;targetVY=ship.waterInputY*release/dt;
  ship.waterInputX*=1-release;ship.waterInputY*=1-release;
  const cap=Math.min(1,maxSpeed/(Math.hypot(targetVX,targetVY)||1));targetVX*=cap;targetVY*=cap;
 }else ship.waterInputX=ship.waterInputY=0;
 const accelerating=Math.hypot(targetVX,targetVY)>Math.hypot(ship.vx||0,ship.vy||0),reversing=targetVX*(ship.vx||0)+targetVY*(ship.vy||0)<0,ease=1-Math.exp(-dt/(reversing?WATER_HANDLING.reversal:drag?WATER_HANDLING.acceleration:accelerating?WATER_HANDLING.acceleration:WATER_HANDLING.braking));
 ship.vx=(ship.vx||0)+(targetVX-(ship.vx||0))*ease;ship.vy=(ship.vy||0)+(targetVY-(ship.vy||0))*ease;
 if(Math.abs(ship.vx)<.5&&Math.abs(targetVX)<.5)ship.vx=0;if(Math.abs(ship.vy)<.5&&Math.abs(targetVY)<.5)ship.vy=0;
}else{ship.waterInputX=ship.waterInputY=0;ship.vx=targetVX;ship.vy=targetVY;}
const suction=environment&&boss?bossSuctionForce(boss):0,oldX=ship.x,oldY=ship.y;
ship.x=pilotEdgeBounce('x',ship.x+(drag&&!water?drag.x:ship.vx*dt)+suction*dt,40,W-65,targetVX,dt);ship.y=pilotEdgeBounce('y',ship.y+(drag&&!water?drag.y:ship.vy*dt)+(environment?sectorCurrent()*dt:0),42,H-42,targetVY,dt);
// A quick finger swipe still crosses solid scenery; it cannot teleport through it.
if(drag&&environment&&ship.inv<=0&&obstacles.length){const steps=Math.ceil(Math.hypot(ship.x-oldX,ship.y-oldY)/12),solids=obstacles.flatMap(obstacleSolids);for(let i=1;i<=steps;i++){const t=i/steps,x=oldX+(ship.x-oldX)*t,y=oldY+(ship.y-oldY)*t;if(solids.some(r=>x+24>r.x&&x-24<r.x+r.w&&y+14>r.y&&y-14<r.y+r.h)||obstacles.some(o=>o.rotor&&rotorContact(o,x,y,18))){damage();break;}}}
if(ship.x===40||ship.x===W-65)ship.vx=0;if(ship.y===42||ship.y===H-42)ship.vy=0;
const targetPitch=clamp(ship.vy/2800,-.18,.18)*shipDirection(),targetYaw=clamp(ship.vx/3400,-.15,.15),easing=1-Math.exp(-dt*11);
flightPose.pitch+=(targetPitch-flightPose.pitch)*easing;const rollRate=-ship.vy/maxSpeed*7;flightPose.rollRate=((flightPose.rollRate||0)+(rollRate-(flightPose.rollRate||0))*(1-Math.exp(-dt*12)));flightPose.roll+=flightPose.rollRate*dt;if(Math.abs(ship.vy)<10)flightPose.roll+=(Math.round(flightPose.roll/TAU)*TAU-flightPose.roll)*(1-Math.exp(-dt*5));flightPose.yaw+=(targetYaw-flightPose.yaw)*easing;
const accel=Math.hypot(ship.vx-flightPose.vx,ship.vy-flightPose.vy)/dt,thrust=clamp(.15+Math.max(0,ship.vx*shipDirection())/800+Math.abs(ship.vy)/2400+accel/22000,.1,1.1);flightPose.thrust+=(thrust-flightPose.thrust)*(1-Math.exp(-dt*8));flightPose.vx=ship.vx;flightPose.vy=ship.vy;
}
function update(dt){if(state!=='paused'){world+=dt*SCROLL_SPEED;navigationClock+=dt;}if(state!=='playing')return;if(sectorBlend){updateShipMovement(dt,false);updatePilotTurn(dt);flash=Math.max(0,flash-dt);shake=Math.max(0,shake-dt*30);sectorBlend.age+=dt;if(sectorBlend.age>=sectorBlend.duration)finishSectorTravel();return;}if(flightRun)flightRun.activeTicks+=Math.round(dt*120);time+=dt;if(checkpoint&&currentSection()>checkpoint.section){saveCheckpoint();announce('SECTION '+(checkpoint.section+1)+' / 4','CHECKPOINT SAVED')}ship.inv=Math.max(0,ship.inv-dt);ship.frontFlash=Math.max(0,(ship.frontFlash||0)-dt);fireClock-=dt;spawnClock-=dt;companionClock-=dt;muzzleFlash=Math.max(0,muzzleFlash-dt);if(companion>0&&companionClock<=0&&!bossDefeated&&!shipTurning()){for(let i=0;i<companion;i++){const pos=dronePosition(i);makeShot(pos.x+20*shipDirection(),pos.y,'drone');shots[shots.length-1].vx*=shipDirection();shots[shots.length-1].direction=shipDirection();window.flightAudio?.shot('drone',pos.x,true)}companionClock=.3}spawnSupplies();flash=Math.max(0,flash-dt);shake=Math.max(0,shake-dt*30);if(annTimer>0){annTimer-=dt;if(annTimer<=0)$('#announcement').style.opacity=0}
updateShipMovement(dt);
updatePilotTurn(dt);if(fireClock<=0&&!bossDefeated&&!shipTurning()){if(weaponOrb.owned)fire(orbPosition(),shipDirection(),true);else fire();fireClock=weapon==='missile'?.38:weapon==='wave'?.28:weapon==='beam'?.18:.13}
updateStructures(dt);const flare=stellarFlare();if(flare&&!flare.warning&&(flare.top?ship.y<flare.height:ship.y>H-flare.height))damage();const storm=stormLane();if(storm&&!storm.warning&&Math.abs(ship.x-storm.x)<32)damage();updateAcidClouds(dt);updateChallenge();while(waveIndex<waveTimes[level].length&&time>=waveTimes[level][waveIndex]){spawn();waveIndex++}if(time>sectors[level].duration&&!boss&&!bossDefeated){boss={x:W+180,y:H/2,r:sectors[level].bossRadius,hp:sectors[level].hp,max:sectors[level].hp,age:0,shoot:2,hit:0,special:3.5,charge:0};enemies=[];announce('WARNING','MASSIVE HOSTILE SIGNATURE');$('#bossbar').hidden=false;$('#bossname').textContent=sectors[level].boss;if(typeof isCapitalSiege==='function'&&isCapitalSiege(boss))initCapitalSiege(boss);window.flightAudio?.bossEntrance?.()}
for(const e of enemies){enemyKinematics(e,dt);e.muzzle=Math.max(0,(e.muzzle||0)-dt);e.hit=Math.max(0,e.hit-dt);updateEnemyWeapon(e,dt);if(Math.hypot(e.x-ship.x,e.y-ship.y)<43){damage();if(!e.brood){explode(e.x,e.y,'#ffb48a',enemyExplosionSize(e),isOrganicEnemy(e),organicVoice(e));e.hp=0}}}
const bossApproach=boss?1:clamp((time-(sectors[level].duration-18))/18,0,1);window.flightAudio?.setBossApproach?.(bossApproach,!!boss);window.flightAudio?.setIntensity(boss?.96:Math.max(Math.min(.75,enemies.length/24),bossApproach*.82));if(boss){const b=boss;b.age+=dt;b.depth=1;b.muzzle=Math.max(0,(b.muzzle||0)-dt);updateBossSpecial(b,dt);updateEncounter(b,dt);updateBossArms(b,dt);moveBoss(b,dt);updateBossWingAudio(b);b.hit=Math.max(0,b.hit-dt);updateBossWeapon(b,dt);if(bossBodyHit(b,ship.x,ship.y,18))damage()}
if(state!=='playing')return;
updateWaterWakes(dt);
for(const s of shots){const oldX=s.x,oldY=s.y;moveShot(s,dt);const impact=shotTerrainHit(oldX,oldY,s);if(impact){terrainImpact(impact.x,impact.y,s.vx,s.vy);s.x=W+100;continue}if(hitEncounterNode(s)){s.x=W+100;continue;}for(const e of enemies){if(e.hp>0&&!s.seen.has(e)&&Math.hypot(e.x-s.x,e.y-s.y)<e.r*(e.depth||1)+s.r+7){hitEnemyWithShot(s,e);if(s.spent)break}}if(!s.spent&&boss&&!s.seen.has(boss)&&bossBodyHit(boss,s.x,s.y,s.r)){boss.hp-=bossDamage(s.damage)*encounterDamage(boss,s);boss.hit=.1;s.seen.add(boss);burst(s.x,s.y,s.c,2);s.x=W+100}}shots=shots.filter(s=>!s.spent&&s.x>-70&&s.x<W+60&&s.y>-30&&s.y<H+30);enemies=enemies.filter(e=>e.hp>0&&(e.entry?e.age<16&&(e.age<4.5||(e.x>-170&&e.x<W+170&&e.y>-100&&e.y<H+100)):e.x>-170));
// Ordinary hostile rounds obey the same solid scenery as the player's rounds.
// Breath volumes and beam hazards are managed separately by their encounter rules.
for(const b of hostile){const oldX=b.x,oldY=b.y;steerHostile(b,dt);if(b.kind==='seed'&&b.split)continue;b.x+=b.vx*dt;b.y+=b.vy*dt;const impact=shotTerrainHit(oldX,oldY,b);if(impact){terrainImpact(impact.x,impact.y,b.vx,b.vy);b.x=-100;continue}if(blockWithOrb(b,oldX,oldY)||blockWithFrontShield(b,oldX)){b.x=-100;continue}if(Math.hypot(b.x-ship.x,b.y-ship.y)<b.r+14){damage();b.x=-100}}hostile=hostile.filter(b=>b.x>-50&&b.x<W+200&&b.y>-50&&b.y<H+50);
if(state!=='playing')return;
for(const d of drops)updateSupplyMovement(d,dt);drops=drops.filter(d=>d.x>-30);
if(state==='playing'&&boss&&boss.hp<=0){window.flightAudio?.clear();explodeBoss(boss);enemies=[];hazards=[];acidClouds=[];rings.push({x:boss.x,y:boss.y,r:20,life:1.1,c:'#fff'});score+=bossClearReward();boss=null;bossDefeated=true;transition=4;hostile=[];shots=[];flash=.48;shake=20;$('#bossbar').hidden=true;announce('SECTOR CLEARED','DESCENT ROUTE OPEN');tone(55,.9,'triangle',.04,-25)}
if(state!=='playing')return;if(bossDefeated){transition-=dt;if(transition<=0){if(level===sectors.length-1){end(true)}else{advanceSector()}}}hudClock+=dt;if(hudClock>=.08){hudClock=0;updateHUD()}}
function render(dt){resizeFlightSurface();ctx.setTransform(renderScale,0,0,renderScale,0,0);window.gpuModels?.begin();ctx.save();if(shake)ctx.translate(rand(-shake,shake),rand(-shake,shake));ctx.fillStyle='#020610';ctx.fillRect(0,0,W,H);const navigationOpaque=sectorBlend?.destination&&navigationSurfaceReveal(sectorBlend)===0;if(state==='title'){ctx.fillStyle='#030a14';ctx.fillRect(0,0,W,H);drawNavigationStars();}else if(!navigationOpaque){background(dt);drawDreamAtmosphere();drawStructures();}if(sectorBlend){window.gpuModels?.flush(ctx);if(!navigationOpaque)drawNearField();drawSectorBlend();}if(state==='title'){if(atlasOpen)drawUniverseAtlas();else drawNavigationChart();}else{if(!sectorBlend)drawWaterWakes();for(const e of enemies)enemyShape(e);drawBoss();window.gpuModels?.flush(ctx);if(boss)drawEncounterDefenses(boss);for(const d of drops)drawPickup(d);for(const s of shots)drawProjectile(s);for(const b of hostile)drawHostile(b);drawHazards();drawAcidClouds();drawSectorRule();drawEntryWarnings();noGlow();if(state!=='gameover'&&!sectorBlend?.destination){ctx.save();ctx.globalAlpha*=ship.inv>0?.74+Math.sin(ship.inv*28)*.26:1;drawShip(ship.x,ship.y);ctx.restore();drawFrontShield();drawWeaponOrb();drawOrbCharge();for(let i=0;i<companion;i++)drawDrone(i);if(ship.shield>0){ctx.strokeStyle='#99eaff';ctx.lineWidth=2;glow('#69caff',12);ctx.beginPath();ctx.arc(ship.x,ship.y,48+Math.sin(world*.04)*3,0,TAU);ctx.stroke();noGlow()}}}
window.gpuModels?.flush(ctx);drawExplosions(dt);if(!sectorBlend)drawNearField();if(!sectorBlend)drawWaterAtmosphere(true);const active=state!=='paused';for(const p of particles){if(active){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.c;if(p.spark){ctx.strokeStyle=p.c;ctx.lineWidth=p.r;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.025,p.y-p.vy*.025);ctx.stroke()}else ctx.fillRect(p.x,p.y,p.r,p.r)}ctx.globalAlpha=1;particles=particles.filter(p=>p.life>0);for(const r of rings){if(active){r.life-=dt;r.r+=dt*550}ctx.globalAlpha=Math.max(0,r.life);ctx.strokeStyle=r.c;ctx.lineWidth=3;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,TAU);ctx.stroke()}rings=rings.filter(r=>r.life>0);ctx.globalAlpha=1;if(flash>0){ctx.fillStyle=`rgba(166,255,227,${Math.min(.7,flash)})`;ctx.fillRect(0,0,W,H)}ctx.restore();window.gpuModels?.flush(ctx)}
let accumulator=0,frameError=null,musicUiClock=0,sectorArtPrefetched=false;
const renderQualityLimit=matchMedia('(pointer: coarse)').matches?1:1.5;
let renderScale=1,renderQuality=renderQualityLimit,surfaceWidth=W,surfaceDirty=true;
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{surfaceDirty=true;}).observe(canvas);
window.addEventListener('resize',()=>{surfaceDirty=true;});
function resizeFlightSurface(){if(surfaceDirty){surfaceWidth=canvas.getBoundingClientRect?.().width||W;surfaceDirty=false;}const width=surfaceWidth;const ratio=Math.max(.75,Math.min(renderQuality,width*(window.devicePixelRatio||1)/W));if(Math.abs(renderScale-ratio)>.03||canvas.width!==Math.round(W*ratio)){renderScale=ratio;canvas.width=Math.round(W*ratio);canvas.height=Math.round(H*ratio);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';}window.flightRenderScale=renderScale;window.flightEffectsQuality=renderQuality<=.75?.65:1;}

function reportFrameError(error){
 if(frameError)return;
 frameError={message:String(error?.message||error),stack:String(error?.stack||''),sector:level+1,time:Number(time.toFixed(2))};
 console.error('First Descent flight interrupted',frameError);
 state='error';window.flightAudio?.setMusicActive(false);window.flightAudio?.clear();keys.clear();pointer=null;lastTouchTap=null;touchContacts.clear();pinchGesture=null;accumulator=0;
 $('#pause').hidden=true;$('#touchControls').classList.remove('active');
 panel('FLIGHT<br><em>INTERRUPTED</em>','The game encountered a graphics or simulation error.<br>Reload to restore the mission.','RELOAD GAME',()=>location.reload());
 const detail=document.createElement('p');detail.className='launch-caption';detail.textContent=`Sector ${frameError.sector} · ${frameError.time}s · ${frameError.message}`;$('#overlay').append(detail);
}
window.addEventListener('game-render-error',event=>reportFrameError(event.detail));
function frame(now){
 requestAnimationFrame(frame);
 const elapsed=(now-last)/1000,dt=Math.min(elapsed,.1);last=now;if(!document.hidden&&state==='playing'&&elapsed>0&&elapsed<.5)trackFrame(elapsed);
 if(frameError)return;
 if(document.hidden){accumulator=0;return;}
 musicUiClock+=dt;if(musicUiClock>=.2){musicUiClock=0;musicControls();}
 // Fetch the following sector well before the transition, after startup.
 if(state==='paused'&&!surfaceDirty){accumulator=0;return;}
 if(state==='playing'&&!sectorArtPrefetched&&time>sectors[level].duration*.65){sectorArtPrefetched=true;if(sectors[level+1])prepareSectorArt(sectors[level+1]);}
 try{accumulator+=dt;while(accumulator>=1/120){captureMotion();update(1/120);accumulator-=1/120}renderSmooth(dt,accumulator*120)}catch(error){reportFrameError(error)}
}
// Testing shortcuts use the normal sector reset/travel paths, but never save scores.
function testLevelHotkey(e){
 if(e.ctrlKey||e.metaKey||e.altKey||e.target?.isContentEditable||e.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return false;
 const k=e.key.toLowerCase(),direct=/^[1-9]$/.test(k),travel=k==='n',anomaly=k==='b',stellar=k==='j';
 if(!direct&&k!=='['&&k!==']'&&!travel&&!anomaly&&!stellar)return false;
 e.preventDefault();if(e.repeat)return true;
 const target=stellar?sectors.findIndex(s=>s.stellar):anomaly?sectors.findIndex(s=>s.gravityWell):direct?Number(k)-1:level+(k==='['?-1:1);
 if(target<0||target>=sectors.length){announce('NO '+(target<0?'PREVIOUS':'NEXT')+' PLANET');return true;}
 if(state!=='playing'&&state!=='paused'){const origin=level;start();level=origin;resetSector();}
 flightRun=null;
 window.flightAudio?.clear();enableAudio();window.flightAudio?.setMusicActive(true);
 state='playing';$('#overlay').classList.add('hidden');$('#pause').hidden=false;$('#touchControls').classList.add('active');
 ship.hp=5;shake=flash=0;accumulator=0;companionClock=0;
 if(target!==level){advanceSector(target);sectorBlend.testing=true;}else{resetSector();sectorBlend={arrival:true,systemEntry:true,testing:true,age:0,duration:15.5/NAVIGATION_SPEED,destination:expedition.locations[sectors[level].id]};$('#announcement').style.opacity=0;annTimer=0;}
 canvas.focus();updateHUD();return true;
}
window.addEventListener('keydown',e=>{if(atlasOpen){if(e.key==='Escape'){e.preventDefault();atlasSystemId?showUniverseAtlas():closeUniverseAtlas();}return;}if(testLevelHotkey(e))return;if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();const k=e.key.length===1?e.key.toLowerCase():e.key;keys.add(k);if(e.repeat)return;if(k===' '&&skipSectorTravel()){keys.delete(k);return;}if(k==='Enter'&&state==='title'&&!e.target?.closest?.('button,a')){e.preventDefault();beginDescent();return;}if(k==='p'||k==='Escape')pause();if(k==='x')nova();if(k===' ')flipShip()});window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));window.addEventListener('blur',()=>{const touchDevice=matchMedia('(pointer: coarse)').matches||(window.navigator?.maxTouchPoints||0)>0;keys.clear();pointer=null;lastTouchTap=null;touchContacts.clear();pinchGesture=null;if(state==='playing'&&(!touchDevice||document.hidden))pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
// Relative dragging preserves the finger-to-ship offset. A stationary finger
// is neutral, and lifting/repositioning never attracts the ship to the contact.
function setPointer(e){
 if(!pointer||e.pointerId!==pointer.id)return;
 const r=canvas.getBoundingClientRect();
 if(Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY)>12)pointer.dragged=true;
 if(pointer.relative){
  // Consume displacement once, rather than treating a held offset as velocity.
  // One screen pixel of finger travel moves the ship one screen pixel.
  pointer.moveX+=(e.clientX-pointer.lastClientX)*W/r.width;
  pointer.moveY+=(e.clientY-pointer.lastClientY)*H/r.height;
  pointer.lastClientX=e.clientX;pointer.lastClientY=e.clientY;if(Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY)>12){pointer.dragged=true;lastTouchTap=null;}
 }else{pointer.x=(e.clientX-r.left)/r.width*W;pointer.y=(e.clientY-r.top)/r.height*H;}
}
function releasePointer(e,tap=false){
 touchContacts.delete(e.pointerId);if(touchContacts.size<2)pinchGesture=null;
 if(!pointer||e.pointerId!==pointer.id)return;
 const p=pointer,elapsed=e.timeStamp-p.started;
 if(tap&&!p.dragged&&elapsed>=0&&elapsed<=230&&skipSectorTravel())return;
 if(tap&&p.relative&&!p.dragged&&elapsed>=0&&elapsed<=230&&state==='playing'){
  if(lastTouchTap&&e.timeStamp-lastTouchTap.at<=320&&Math.hypot(e.clientX-lastTouchTap.x,e.clientY-lastTouchTap.y)<=40){flipShip();lastTouchTap=null;}
  else lastTouchTap={at:e.timeStamp,x:e.clientX,y:e.clientY};
 }else lastTouchTap=null;
 pointer=null;
}
function flightPointerDown(e){
 if(state!=='playing')return;
 e.preventDefault();
 if(e.pointerType==='touch'){
  touchContacts.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(touchContacts.size===2){const [a,b]=[...touchContacts.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(distance>=48&&distance<=300)pinchGesture={distance,starts:[{...a},{...b}],ids:[...touchContacts.keys()]};}
 }
 canvas.setPointerCapture(e.pointerId);
 if(pointer)return;
 const relative=e.pointerType==='touch'||e.pointerType==='pen';
 pointer={id:e.pointerId,relative,started:e.timeStamp,startX:e.clientX,startY:e.clientY,dragged:false,lastClientX:e.clientX,lastClientY:e.clientY,moveX:0,moveY:0};
 setPointer(e);
}
function flightPointerMove(e){
 if(state==='playing')e.preventDefault();
 if(touchContacts.has(e.pointerId))touchContacts.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pinchGesture&&touchContacts.size===2){
  const [a,b]=pinchGesture.ids.map(id=>touchContacts.get(id)),[sa,sb]=pinchGesture.starts;
  if(a&&b){const ux=(sb.x-sa.x)/pinchGesture.distance,uy=(sb.y-sa.y)/pinchGesture.distance,
   inwardA=(a.x-sa.x)*ux+(a.y-sa.y)*uy,inwardB=-((b.x-sb.x)*ux+(b.y-sb.y)*uy),distance=Math.hypot(a.x-b.x,a.y-b.y);
   // Both fingers must deliberately move inward. One moving thumb beside a
   // resting finger, parallel drags and stretches are ordinary play.
   if(inwardA>18&&inwardB>18&&pinchGesture.distance-distance>Math.max(48,pinchGesture.distance*.3)&&state==='playing'){pause();return;}
  }
 }
 setPointer(e);
}
canvas.addEventListener('pointerdown',flightPointerDown);canvas.addEventListener('pointermove',flightPointerMove);
canvas.addEventListener('pointerup',e=>releasePointer(e,true));canvas.addEventListener('pointercancel',releasePointer);canvas.addEventListener('lostpointercapture',releasePointer);
// The lower HUD and letterboxing are also flight surfaces on touch devices.
// Keep native page scrolling out of gameplay, while buttons retain taps.
const flightSurface=fullscreenPanel();
for(const [type,handler] of [['pointerdown',flightPointerDown],['pointermove',flightPointerMove],['pointerup',e=>releasePointer(e,true)],['pointercancel',releasePointer]])flightSurface.addEventListener(type,e=>{
 if(e.target===canvas||e.target?.closest?.('button,a,.overlay')||!['touch','pen'].includes(e.pointerType))return;
 handler(e);
});
flightSurface.addEventListener('touchmove',e=>{if(state==='playing'&&e.cancelable)e.preventDefault();},{passive:false});

$('#launch').onclick=beginDescent;$('#pause').onclick=pause;$('#novaTouch').onclick=nova;$('#flipTouch').onclick=flipShip;$('#sound').onclick=()=>{sound=!sound;enableAudio();$('#sound').textContent=sound?'SFX ON':'SFX OFF';$('#sound').setAttribute('aria-label',sound?'Mute sound effects':'Enable sound effects');if(sound){if(state!=='title')tone(660,.12,'sine',.05)}};async function requestLandscape(){try{await window.screen?.orientation?.lock?.('landscape');}catch{ /* Phones without orientation locking show the rotate hint. */ }}
async function toggleGameFullscreen(){
 const stage=fullscreenPanel();
 if(stage.classList.contains('expanded')){window.safariImmersion?.release();stage.classList.remove('expanded');document.body?.classList.remove('game-expanded');window.screen?.orientation?.unlock?.();}
 else if(nativeFullscreenElement()){const exit=document.exitFullscreen||document.webkitExitFullscreen;await exit.call(document);window.screen?.orientation?.unlock?.();}
 else{if(window.safariImmersion?.eligible()){if(state==='playing')pause();window.safariImmersion.request(()=>{});return;}try{const request=stage.requestFullscreen||stage.webkitRequestFullscreen;if(!request)throw new Error('unsupported');await request.call(stage,{navigationUI:'hide'});}catch{stage.classList.add('expanded');document.body?.classList.add('game-expanded');}await requestLandscape();}
 updateFullscreenButtons();
}
function updateFullscreenButtons(){const active=!!nativeFullscreenElement()||fullscreenPanel().classList.contains('expanded');fullscreenPanel().classList.toggle('native-fullscreen',!!nativeFullscreenElement());for(const id of ['#fullscreen','#fullscreenStage']){const button=$(id);if(button){const native=!!(fullscreenPanel().requestFullscreen||fullscreenPanel().webkitRequestFullscreen);button.textContent=active?(native?'EXIT FULLSCREEN':'EXIT EXPANDED VIEW'):(native?'FULLSCREEN':'EXPAND GAME');button.setAttribute('aria-label',active?(native?'Exit fullscreen':'Exit expanded view'):(native?'Enter fullscreen':'Expand game'));}}}
$('#fullscreen').onclick=toggleGameFullscreen;if($('#fullscreenStage'))$('#fullscreenStage').onclick=toggleGameFullscreen;document.addEventListener('fullscreenchange',updateFullscreenButtons);document.addEventListener('webkitfullscreenchange',updateFullscreenButtons);
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_game_status',description:'Read the current First Descent flight status.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:(input)=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('Expected an empty object');return {state,sector:level+1,score,hull:ship.hp,weapon,power,novas,speedLevel,companion,renderer:window.gpuModels?.stats()||{engine:'Canvas compatibility'},performance:window.flightPerformance||null}}})).catch(()=>{})}catch{}}
function updateExpeditionIntro(){const system=contentReleases[0].systems[0],planets=system.destinations.filter(d=>d.kind==='planet'),stages=system.destinations.flatMap(d=>d.stages);$('#campaignCaption').textContent=`${system.star.name} · ${systemCensusLabel(system)} · ${stages.length} BOSSES · ${expeditionSystems.size} SYSTEMS TO EXPLORE`;const copy=$('.introcopy');if(copy)copy.textContent=`Something down there is awake.\n${planets.length} worlds orbit an unquiet sun.\nConquer each descent. Secure the ${system.name} system.`;const rail=$('#routeCount');if(rail)rail.textContent=systemCensusLabel(system)+' · THEN A NEW GALAXY';const map=$('#expeditionMap');if(map)map.setAttribute('aria-label',`Rotating ${expeditionGalaxy(expedition.locations[stages[0]]).name}, ${system.name} marked on an outer arm; ${systemCensusLabel(system)}`);}
$('#records').onclick=showLocalScores;bindUniverseButton();updateExpeditionIntro();
updateHUD();requestAnimationFrame(frame);

// Title music is independently switchable; the first gesture unlocks browser audio.
function musicControls(){const info=window.flightAudio?.stats();if(!info)return;const button=$('#music');const label=!info.musicEnabled?'MUSIC OFF':info.musicPlaying||state!=='title'?'MUSIC ON':'PLAY MUSIC';if(button.textContent!==label){button.textContent=label;button.setAttribute('aria-label',info.musicEnabled&&(info.musicPlaying||state!=='title')?'Turn off music':'Play music');button.setAttribute('aria-pressed',String(info.musicEnabled));}const titleButton=$('#introMusic'),titleLabel=$('#introMusicLabel');if(titleButton&&titleLabel){const playing=info.musicEnabled&&info.musicPlaying;titleLabel.textContent=playing?'PAUSE THE THEME':'PLAY THE THEME';titleButton.setAttribute('aria-label',playing?'Pause the theme':'Play the theme');titleButton.setAttribute('aria-pressed',String(playing));titleButton.classList.toggle('playing',playing);}}
$('#music').onclick=()=>{const info=window.flightAudio?.stats();if(!info)return;window.flightAudio.setMusicEnabled(!info.musicEnabled||(state==='title'&&info.state!=='running'));if(state==='title')window.flightAudio.setTitle(!document.hidden);else window.flightAudio.setMusicActive(state==='playing'&&!document.hidden);enableAudio();musicControls()};
function unlockTitleMusic(event){if(state!=='title'||event.target?.closest?.('button,a'))return;window.flightAudio?.setTitle(true);enableAudio()}
window.addEventListener('pointerdown',unlockTitleMusic);window.addEventListener('keydown',unlockTitleMusic);
// Capture also reaches the Safari setup overlay, whose gestures stop propagation.
function recoverGestureAudio(event){
 if(event.isTrusted===false||document.hidden)return;
 const info=window.flightAudio?.stats();
 if(info&&info.state!=='running'&&(sound||info.musicEnabled))enableAudio();
}
for(const name of ['touchend','pointerup','keydown'])document.addEventListener(name,recoverGestureAudio,{capture:true,passive:true});

document.addEventListener('visibilitychange',()=>{if(state==='title')window.flightAudio?.setTitle(!document.hidden);else window.flightAudio?.setMusicActive(state==='playing'&&!document.hidden)});
window.flightAudio?.setTitle(true);musicControls();
if($('#introMusic'))$('#introMusic').onclick=()=>$('#music').onclick();

function updateChallenge(){const c=sectors[level].challenge;if(!c)return;
 if(time>=c.at&&!challengeState.warned&&time<c.end){challengeState.warned=true;announce(c.title,themeIndex()===0?'ASTEROID NARROWS · FOLLOW THE OPEN CHANNEL':sectors[level].scrollAxis?'CHANGING SHAFT · FOLLOW THE OPEN CHANNEL':'OFFSET GATES AHEAD · FOLLOW THE OPEN CHANNEL');}
 if(!challengeState.gate&&time>=c.at-4&&time<c.end){challengeState.gate=true;const at=c.at-4,o={at,id:50,x:W+100-(time-at)*SCROLL_SPEED,w:420,width:420,shutters:true,parts:[{x:0,y:0,w:420,h:90,ceiling:true},{x:0,y:670,w:420,h:90,ceiling:false}]};obstacles.push(o);if(c.gate)enemies.push({sentry:true,anchorAt:at,x:o.x+110,y:125,base:125,type:2,age:0,phase:0,speed:0,r:28,hp:65,max:65,hit:0,shoot:2});}
 while(challengeState.wave<c.waves.length&&time>=c.waves[challengeState.wave]){const n=challengeState.wave++,type=c.types[n%c.types.length],count=Math.min(c.count,enemyWaveSlots());for(let i=0;i<count;i++){const y=c.gate?330+i*45:180+((n*137+i*110)%380),hp=([10,13,27,17][type]+difficulty()*3)*(sectors[level].enemyHealthScale||1);const e={x:W+80+i*115,y,base:y,type,age:0,phase:n*.7+i*.25,speed:(210+difficulty()*15)*c.speed,r:type===2?39:31,hp,max:hp,hit:0,shoot:2+i*.5,challenge:true};if(sectors[level].scrollAxis)prepareEnemyEntry(e,n,i);enemies.push(e);}}
 if(time>=c.end&&!challengeState.reward){challengeState.reward=true;drops.push(makeSupply({x:W-210,y:380,type:'repair'},'reward'));}
}

// Interpolate presentation between fixed simulation ticks on high-refresh displays.
const priorActors=new WeakMap();let priorWorld=0,priorPose=null,priorBossPose=null;
const bossPoseFields=['turnYaw','barrelRoll','flightPitch','flightYaw','flightBank','maneuverRoll','beamPitch','propulsionTime','propulsion','actionLoad','attackDrive','flightVX','flightVY'];
// Retain interpolation snapshots rather than allocating an object per actor
// at 120 Hz. The WeakMap releases snapshots when their actors leave play.
const poseKeys=['pitch','yaw','roll','thrust'],restoreActors=[],restoreValues=[],savedPose={},savedBossValues=[],savedBossHas=[];
const actorGroups=[];
function motionGroups(){actorGroups[0]=enemies;actorGroups[1]=shots;actorGroups[2]=hostile;actorGroups[3]=drops;return actorGroups;}
function captureActor(a){if(!a)return;let p=priorActors.get(a);if(!p){p={};priorActors.set(a,p);}p.x=a.x;p.y=a.y;p.age=a.age;}
function captureMotion(){
 priorWorld=world;if(!priorPose)priorPose={};for(const k of poseKeys)priorPose[k]=flightPose[k];
 if(boss){if(!priorBossPose)priorBossPose={actor:null,values:{}};priorBossPose.actor=boss;for(const k of bossPoseFields)priorBossPose.values[k]=boss[k]||0;}else if(priorBossPose)priorBossPose.actor=null;
 captureActor(ship);captureActor(boss);for(const group of motionGroups())for(const a of group)captureActor(a);
}
function renderSmooth(dt,alpha){
 if(state!=='playing'||!priorPose){render(dt);return;}
 let count=0;const savedWorld=world;
 const interpolate=a=>{if(!a)return;const p=priorActors.get(a);if(!p)return;restoreActors[count]=a;const i=count++*3;restoreValues[i]=a.x;restoreValues[i+1]=a.y;restoreValues[i+2]=a.age;a.x=p.x+(a.x-p.x)*alpha;a.y=p.y+(a.y-p.y)*alpha;if(Number.isFinite(a.age)&&Number.isFinite(p.age))a.age=p.age+(a.age-p.age)*alpha;};
 interpolate(ship);interpolate(boss);for(const group of motionGroups())for(const a of group)interpolate(a);
 const interpolateBoss=priorBossPose?.actor===boss&&boss;
 if(interpolateBoss)for(let i=0;i<bossPoseFields.length;i++){const k=bossPoseFields[i];savedBossHas[i]=Object.prototype.hasOwnProperty.call(boss,k);savedBossValues[i]=boss[k];boss[k]=priorBossPose.values[k]+((boss[k]||0)-priorBossPose.values[k])*alpha;}
 world=priorWorld+(world-priorWorld)*alpha;for(const k of poseKeys){savedPose[k]=flightPose[k];flightPose[k]=priorPose[k]+(flightPose[k]-priorPose[k])*alpha;}
 try{render(dt);}finally{
  world=savedWorld;for(const k of poseKeys)flightPose[k]=savedPose[k];
  if(interpolateBoss)for(let i=0;i<bossPoseFields.length;i++){const k=bossPoseFields[i];if(savedBossHas[i])boss[k]=savedBossValues[i];else delete boss[k];}
  for(let i=0;i<count;i++){const a=restoreActors[i],j=i*3;a.x=restoreValues[j];a.y=restoreValues[j+1];if(restoreValues[j+2]!==undefined)a.age=restoreValues[j+2];}
  restoreActors.length=0;restoreValues.length=0;
 }
}

let frameReportTicks=0,qualityHealthySeconds=0,qualityCooldown=0;const frameSamples=[];
function trackFrame(dt){
 qualityCooldown=Math.max(0,qualityCooldown-dt);frameSamples.push(dt*1000);if(frameSamples.length>120)frameSamples.shift();
 if(frameSamples.length!==120||++frameReportTicks%30!==0)return;
 const sorted=frameSamples.slice().sort((a,b)=>a-b),mean=frameSamples.reduce((a,b)=>a+b,0)/120;
 // Discard just the slowest 5% for adaptation, not for reported frame timing.
 // A texture upload or shader compile should not permanently soften the scene.
 const sustained=sorted.slice(0,114).reduce((a,b)=>a+b,0)/114;
 window.flightPerformance={fps:Math.round(1000/mean),p95:Math.round(sorted[114]),resolution:renderScale,quality:renderQuality};
 if(sustained>1000/53&&sorted[89]>1000/55&&renderQuality>.75){
  renderQuality=Math.max(.75,renderQuality-.25);qualityCooldown=12;qualityHealthySeconds=0;frameSamples.length=0;return;
 }
 const healthy=mean<1000/57&&sorted[107]<1000/54;
 qualityHealthySeconds=healthy?qualityHealthySeconds+30*mean/1000:0;
 // A slow climb and a cooldown avoid repeatedly changing resolution near a
 // device's limit. If the higher quality is too costly, the normal drop wins.
 if(qualityHealthySeconds>=8&&qualityCooldown===0&&renderQuality<renderQualityLimit){
  renderQuality=Math.min(renderQualityLimit,renderQuality+.25);qualityHealthySeconds=0;qualityCooldown=12;frameSamples.length=0;
 }
}


// iPhone browser tabs cannot hide Safari chrome. Home Screen web apps can.
const homeScreenMode=window.navigator?.standalone||matchMedia('(display-mode: standalone)').matches;
const iphoneBrowser=/iPhone|iPod/.test(window.navigator?.userAgent||'')&&!homeScreenMode;
if($('#homeScreenHint'))$('#homeScreenHint').hidden=!iphoneBrowser;
if(homeScreenMode){fullscreenPanel().classList.add('expanded');document.body?.classList.add('game-expanded');}
updateFullscreenButtons();

window.flightImmersionInterrupted=()=>{if(state==='playing')pause();};
window.flightImmersionChanged=updateFullscreenButtons;

for(const eventName of ['selectstart','contextmenu'])document.addEventListener(eventName,event=>{
 if(event.target?.closest?.('.console, .safari-swipe'))event.preventDefault();
});
