'use strict';
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d'),W=1440,H=760;
const $=s=>document.querySelector(s),TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rand=(a,b)=>a+Math.random()*(b-a);
const titleMarkup=$('#overlay').innerHTML;
function showTitleScreen(){state='title';$('#overlay').className='overlay title-screen';$('#overlay').innerHTML=titleMarkup;$('#launch').onclick=start;const music=$('#introMusic');if(music)music.onclick=()=>$('#music').onclick();window.flightAudio?.setTitle(!document.hidden);musicControls();}
const sectors=campaign;
const themeIndex=()=>LEVEL_THEMES[sectors[level].theme],bossIndex=()=>BOSS_KINDS[sectors[level].bossKind],difficulty=()=>sectors[level].difficulty;
const currentSection=()=>sectors[level].checkpoints.reduce((section,at,i)=>time>=at?i:section,0);
let state='title',level=0,time=0,world=0,last=0,spawnClock=0,score=0,weapon='pulse',power=1,novas=3,fireClock=0,shake=0,flash=0,boss=null,bossDefeated=false,transition=0,kills=0,annTimer=0,sound=true;
let enemies=[],shots=[],hostile=[],particles=[],drops=[],rings=[],explosions=[],hazards=[],acidClouds=[];
let speedLevel=0,companion=0,companionClock=0,waveIndex=0,gateIndex=0,supplyIndex=0;
let obstacles=[];


let checkpoint=null,hudClock=0,sectorBlend=null,sectorIntroLead=0;
let challengeState={wave:0,gate:false,warned:false,reward:false};
let weaponOrb={owned:false,angle:0,target:0};
function orbPosition(){return{x:ship.x+Math.cos(weaponOrb.angle)*65,y:ship.y-Math.sin(weaponOrb.angle)*68};}
function switchOrb(){if(state!=='playing'||sectorBlend||!weaponOrb.owned)return;weaponOrb.target=weaponOrb.target===0?Math.PI:0;updateHUD();}
function updateWeaponOrb(dt){const delta=weaponOrb.target-weaponOrb.angle;weaponOrb.angle+=clamp(delta,-Math.PI*dt/.55,Math.PI*dt/.55);}

function saveCheckpoint(){checkpoint={section:currentSection(),sceneLead:sectorIntroLead,score,kills,weapon,power,speedLevel,companion,novas,orbOwned:weaponOrb.owned,orbSide:weaponOrb.target};}
// Restored scenery can cross the old fixed spawn. Choose clear positions from
// the actual collision profiles, with deterministic preferences and full ship clearance.
function placeCheckpointRecovery(){
 const solids=obstacles.flatMap(obstacleSolids),rotors=obstacles.filter(o=>o.rotor),preferredY=380;
 const clear=(x,y,mx,my)=>solids.every(r=>x+mx<r.x||x-mx>r.x+r.w||y+my<r.y||y-my>r.y+r.h)&&rotors.every(o=>!rotorContact(o,x,y,Math.max(mx,my)));
 const ordered=(origin,min,max,extra=[])=>[...new Set([clamp(origin,min,max),min,max,...extra.filter(v=>v>=min&&v<=max),...Array.from({length:Math.ceil((max-min)/12)},(_,i)=>min+i*12)])].sort((a,b)=>Math.abs(a-origin)-Math.abs(b-origin)||a-b);
 const find=(x,y,mx,my,minX=40,maxX=W-65,from=null)=>{
  const xs=ordered(x,minX,maxX,solids.flatMap(r=>[r.x-mx-2,r.x+r.w+mx+2])),ys=ordered(y,42,H-42,solids.flatMap(r=>[r.y-my-2,r.y+r.h+my+2]));
  for(const px of xs)for(const py of ys){if(!clear(px,py,mx,my))continue;if(from){const steps=Math.max(1,Math.ceil(Math.hypot(px-from.x,py-from.y)/18));let reachable=true;for(let j=0;j<=steps;j++){const t=j/steps;if(!clear(from.x+(px-from.x)*t,from.y+(py-from.y)*t,52,32)){reachable=false;break;}}if(!reachable)continue;}return{x:px,y:py};}
  return null;
 };
 const spawn=find(210,preferredY,52,32)||find(210,preferredY,24,14);
 if(spawn){ship.x=spawn.x;ship.y=spawn.y;}
 let from={x:ship.x,y:ship.y};
 drops=sectors[level].recovery.map((d,i)=>{
  const minX=Math.min(W-90,ship.x+100),x=clamp(Math.max(d.x,ship.x+170+i*140),minX,W-70),y=clamp(ship.y+d.y-preferredY,42,H-42);
  const point=find(x,y,27,27,minX,W-65,from)||find(x,y,27,27,minX,W-65)||{x,y};from=point;
  return{...d,...point,r:23,age:0};
 });
}
function retrySection(){
 if(flightRun)flightRun.retries++;
 const saved={...checkpoint};weaponOrb={owned:saved.orbOwned,angle:saved.orbSide,target:saved.orbSide};resetSector();checkpoint=saved;sectorIntroLead=saved.sceneLead||0;time=sectors[level].checkpoints[saved.section];world=time*SCROLL_SPEED;
 ({score,kills,weapon,power,speedLevel,companion,novas}=saved);novas=Math.max(1,novas);
 challengeState.wave=(sectors[level].challenge?.waves||[]).filter(at=>at<time).length;
 waveIndex=waveTimes[level].filter(at=>at<time).length;gateIndex=gatePlans[level].filter(g=>g.at<time).length;supplyIndex=supplyPlans[level].filter(d=>d.at<time).length;
 obstacles=gatePlans[level].slice(0,gateIndex).map((g,id)=>({...g,id,x:W+100-(time-g.at)*SCROLL_SPEED,w:g.width||82+level*8})).filter(o=>o.x+o.w>-30);
 ship={x:210,y:380,vx:0,vy:0,hp:5,inv:3,shield:0,frontShield:0,frontFlash:0};
 flightPose={pitch:0,roll:0,yaw:0,thrust:0,vx:0,vy:0};keys.clear();pointer=null;shake=flash=0;accumulator=0;companionClock=0;
 // Same two recovery items, in reachable open space, on every retry.
 placeCheckpointRecovery();
 state='playing';window.flightAudio?.setMusicActive(true);$('#overlay').classList.add('hidden');$('#pause').hidden=false;$('#touchControls').classList.add('active');canvas.focus();
 announce('SECTION '+(saved.section+1)+' / 4','CHECKPOINT RESTORED · POWER + SHIELD AHEAD');updateHUD();
}
function bossDamage(amount){return amount/((1+Math.max(0,power-1)*.09+companion*.035)*(sectors[level].bossArmor||1));}

const waveTimes=sectors.map(s=>s.waves),gatePlans=sectors.map(s=>s.obstacles),supplyPlans=sectors.map(s=>s.supplies);
const SCROLL_SPEED=100;
const weaponNames={pulse:'PULSE',spread:'STARFIRE',beam:'ION LANCE',helix:'HELIX',wave:'PHOTON WAVE',missile:'SEEKER'};
let ship={x:210,y:380,hp:5,inv:0,shield:0,frontShield:0,frontFlash:0};const keys=new Set();let pointer=null;
const stars=Array.from({length:190},()=>({x:rand(0,W),y:rand(0,H),z:rand(.15,1.1),r:rand(.4,1.8)}));
const rocks=Array.from({length:16},(_,i)=>({x:rand(0,W+500),y:i%2?rand(650,860):rand(-100,80),r:rand(45,130),seed:rand(0,10),z:rand(.2,.7)}));
function tone(freq=440,duration=.06,type='sine',vol=.04,slide=0){if(sound)window.flightAudio?.note({frequency:freq,end:Math.max(25,freq+slide),duration,type,gain:vol})}
function enableAudio(){try{window.flightAudio?.init();window.flightAudio?.setEnabled(sound)}catch(error){console.warn('Audio unavailable',error)}}
function glow(color,blur=15){ctx.shadowColor=color;ctx.shadowBlur=blur}function noGlow(){ctx.shadowBlur=0}
function poly(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.3;ctx.stroke()}}
function orb(x,y,r,color,alpha=1){ctx.globalAlpha=alpha;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.globalAlpha=1}
function background(dt){drawBackdrop(dt)}
function drawBaseShip(x,y,scale=1,preview=false){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);const tilt=preview?Math.sin(world*.005)*.03:(keys.has('ArrowUp')||keys.has('w'))?-.09:(keys.has('ArrowDown')||keys.has('s'))?.09:0;ctx.rotate(tilt);
orb(-44,0,67,'#26e5dd',.4);glow('#6af9da',20);poly([[-32,-8],[-75-rand(0,25),0],[-32,8]],'#6effdd');poly([[-36,-4],[-85-rand(0,20),0],[-36,4]],'#effff5');noGlow();
poly([[-27,-11],[-43,-36],[-14,-30],[18,-9]],'#356272','#94b8ba');poly([[-27,11],[-43,36],[-14,30],[18,9]],'#203e51','#6e9da7');poly([[-35,-16],[2,-21],[55,0],[2,21],[-35,16],[-20,0]],'#8babb4','#e7fafa');poly([[-21,-11],[9,-14],[55,0],[-2,4]],'#d2e5e4');poly([[-5,5],[55,0],[4,19],[-28,13]],'#486777');poly([[0,-9],[20,-4],[28,0],[2,2],[-8,-3]],'#102c41','#68f8ef');glow('#7afee3',10);poly([[2,-6],[17,-3],[19,-1],[2,-1]],'#81ffe8');ctx.fillStyle='#81ffe8';ctx.fillRect(-28,-23,14,3);ctx.fillRect(-28,20,14,3);noGlow();ctx.restore()}
function enemyShape(e){drawEnemy(e)}
function drawBoss(){if(boss)drawMenace(boss)}
function burst(x,y,color,count=22){for(let i=0;i<count;i++){const a=rand(0,TAU),v=rand(45,320);particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.2,.8),max:.8,c:color,r:rand(1,4)})}rings.push({x,y,r:8,life:.5,c:color})}
function announce(title,sub=''){const el=$('#announcement');el.textContent=title;if(sub){let small=document.createElement('small');small.textContent=sub;el.append(small)}el.className=/^SECTOR|^FIRST CONTACT/.test(title)?'':'compact';el.style.opacity=1;annTimer=/^SECTOR/.test(title)?2.4:1.8}
function updateHUD(){$('#score').textContent=String(score).padStart(6,'0');$('#sectorNum').textContent=`${String(level+1).padStart(2,'0')} / ${String(sectors.length).padStart(2,'0')}`;$('#sectorName').textContent=sectors[level].name;$('#hearts').textContent='▰ '.repeat(Math.max(0,ship.hp))+'▱ '.repeat(5-Math.max(0,ship.hp));$('#weapon').textContent=`${weaponNames[weapon]} / MK ${['I','II','III'][power-1]}${ship.shield>0?' + SHIELD':''}`;$('#loadout').textContent=`BOOST ${speedLevel}/3 · DRONES ${companion}/2${ship.frontShield?' · GUARD '+ship.frontShield:''}${weaponOrb.owned?' · ORB '+(weaponOrb.target===0?'FRONT':'REAR'):''}`;$('#novas').textContent='● '.repeat(novas)+'○ '.repeat(3-novas);$('#progressLabel').textContent=`${sectors[level].scrollAxis==='down'?'DESCENT · ':sectors[level].scrollAxis==='up'?'ASCENT · ':''}SECTION ${currentSection()+1} / 4`;$('#progress').style.width=Math.min(100,time/sectors[level].duration*100)+'%';$('#status').textContent=state==='playing'?(boss?'BOSS ENGAGED':`SECTION ${currentSection()+1} / 4`):state==='title'?'AWAITING PILOT':state.toUpperCase();if(boss){$('#bosshealth').style.width=Math.max(0,boss.hp/boss.max*100)+'%';const hint=$('#bosstactic');if(hint)hint.textContent=typeof isCapitalSiege==='function'&&isCapitalSiege(boss)?capitalSiegeHint(boss):typeof bossEncounterHint==='function'?bossEncounterHint(boss):boss.exposed>0?'EXPOSED · ATTACK NOW':encounterRules[sectors[level].bossKind].hint;}}
function start(){weaponOrb={owned:false,angle:0,target:0};beginFlightRun();frameError=null;resizeFlightSurface();window.flightAudio?.setTitle(false);enableAudio();window.flightAudio?.intro();keys.clear();pointer=null;flash=0;shake=0;world=0;accumulator=0;flightPose={pitch:0,roll:0,yaw:0,thrust:0,vx:0,vy:0};level=0;score=0;power=1;weapon='pulse';novas=3;kills=0;speedLevel=0;companion=0;companionClock=0;ship={x:210,y:380,hp:5,inv:2,shield:0,frontShield:0,frontFlash:0};resetSector();state='playing';$('#overlay').classList.add('hidden');$('#pause').hidden=false;$('#touchControls').classList.add('active');canvas.focus();announce('SECTOR 01',sectors[0].name);updateHUD()}
function resetSector(){sectorBlend=null;sectorIntroLead=0;window.gpuModels?.prepare([bossDesign()?.mesh,...sectors[level].models.map(n=>meshes[n]),meshes.spore,meshes.missile,meshes.siphon,meshes.cannon,meshes.shrapnel,meshes.bone,meshes.rib,meshes.spineChip,meshes.chitinChip,meshes.orbitalRock].filter(Boolean));challengeState={wave:0,gate:false,warned:false,reward:false};window.flightAudio?.setSector(sectors[level].music);time=0;spawnClock=1;fireClock=0;enemies=[];shots=[];hostile=[];particles=[];drops=[];rings=[];explosions=[];hazards=[];acidClouds=[];waveIndex=0;gateIndex=0;supplyIndex=0;obstacles=[];boss=null;bossDefeated=false;transition=0;$('#bossbar').hidden=true;ship.x=210;ship.y=380;ship.vx=0;ship.vy=0;ship.inv=3;saveCheckpoint();updateHUD()}
function panel(title,description,label,action){$('#overlay').classList.remove('hidden','records-view','title-screen');$('#overlay').innerHTML=`<div class="intro"><div class="eyebrow mint">FIRST DESCENT / FLIGHT RECORD</div><h1 class="result-title">${title}</h1><p class="introcopy">${description}</p><button class="primary" id="panelAction">${label}<span>↗</span></button><div class="launch-caption">SCORE ${String(score).padStart(6,'0')} · SECTOR ${level+1} / ${sectors.length}</div></div>`;$('#panelAction').onclick=action;$('#panelAction').focus()}
function pause(){if(state==='playing'){state='paused';window.flightAudio?.setMusicActive(false);window.flightAudio?.clear();keys.clear();pointer=null;panel('FLIGHT<br><em>PAUSED</em>','Take a breath. The galaxy can wait.','RESUME MISSION',pause)}else if(state==='paused'){state='playing';window.flightAudio?.setMusicActive(true);$('#overlay').classList.add('hidden');canvas.focus()}updateHUD()}
function end(win){if(!win&&flightRun)flightRun.deaths++;recordFlightRun(win);window.flightAudio?.setMusicActive(false);window.flightAudio?.clear();state=win?'victory':'gameover';$('#pause').hidden=true;$('#touchControls').classList.remove('active');$('#bossbar').hidden=true;
 panel(win?'GALAXY<br><em>SECURED</em>':'SIGNAL<br><em>LOST</em>',win?`${sectors.length} sectors cleared. Your expedition made it home.`:`Restart sector ${level+1}, section ${checkpoint.section+1} of 4.<br>Your checkpoint loadout returns, with power and shield pickups ahead.`,win?'FLY AGAIN':'RETRY SECTION',win?start:retrySection);updateHUD()}
function makeShot(x,y,kind,angle=0,side=0){
 const c={pulse:'#92ffe7',spread:'#ffc26b',beam:'#87cfff',helix:'#be93ff',wave:'#6cffe8',missile:'#ffb86c',drone:'#a1eeff'}[kind];
 const speed=kind==='missile'?430:kind==='wave'?660:850;
 shots.push({x,y,base:y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,damage:(kind==='beam'?5+power:kind==='wave'?4+power:kind==='missile'?8+power*2:2+power*.6)*(1-(power-1)*.065),r:kind==='wave'?22:kind==='beam'?10:kind==='missile'?8:6,c,kind,beam:['beam','wave'].includes(kind),seen:new Set(),age:0,side,trail:[]});
}
function fire(origin=ship,direction=1,fromOrb=false){
 const launch=(x,y,...args)=>{makeShot(origin.x+(x-ship.x)*(fromOrb?.4:1)*direction,origin.y+y-ship.y,...args);const s=shots[shots.length-1];s.vx*=direction;s.direction=direction;};
 if(weapon==='helix'){for(const side of [-1,1])launch(ship.x+48,ship.y,'helix',0,side);if(power===3)launch(ship.x+50,ship.y,'pulse')}
 else if(weapon==='wave'){launch(ship.x+50,ship.y,'wave');if(power>1)for(const side of [-1,1])launch(ship.x+25,ship.y+side*24,'wave',side*.09)}
 else if(weapon==='missile'){for(const side of [-1,1])launch(ship.x+26,ship.y+side*27,'missile',side*.18);if(power>1)launch(ship.x+50,ship.y,'pulse')}
 else {const n=weapon==='spread'?power+2:power;for(let i=0;i<n;i++)launch(ship.x+48,ship.y+(i-(n-1)/2)*13,weapon,weapon==='spread'?(i-(n-1)/2)*.13:0)}
 if(!fromOrb)muzzleFlash=.07;window.flightAudio?.shot(weapon,ship.x);
}
function damage(){if(ship.inv>0||state!=='playing')return;if(ship.shield>0){ship.shield--;ship.inv=1.2;window.flightAudio?.shipHit(ship.x,true);burst(ship.x,ship.y,'#8ddfff',15)}else{ship.hp--;ship.inv=2;shake=10;flash=.12;burst(ship.x,ship.y,'#ffa782',30);window.flightAudio?.shipHit(ship.x);if(ship.hp<=0)end(false)}updateHUD()}
function nova(){if(state!=='playing'||sectorBlend||novas<=0)return;novas--;flash=.55;shake=14;for(const e of enemies){explode(e.x,e.y,e.type===1||e.type===3?'#87ffd1':'#ffb36b',enemyExplosionSize(e),e.type===1||e.type===3,organicVoice(e));score+=100}enemies=[];hostile=[];if(boss){if(typeof isCapitalSiege==='function'&&isCapitalSiege(boss))capitalNovaDamage(boss,95);else{boss.hp-=95;boss.hit=.2}}rings.push({x:ship.x,y:ship.y,r:10,life:1.2,c:'#c0fff0'});window.flightAudio?.explosion(ship.x,3,false);updateHUD()}
function spawn(){
 if(sectors[level].broodWaves.includes(waveIndex)){const hp=130+difficulty()*35,mother={brood:true,type:3,x:W+110,y:380,base:380,age:0,phase:waveIndex*.4,speed:115,hp,max:hp,hit:0,r:54,shoot:2};enemies.push(mother);for(let n=0;n<6;n++)enemies.push({satellite:true,mother,orbit:n*TAU/6,type:1,x:mother.x,y:mother.y,base:380,age:0,phase:n*.3,speed:245,hp:14,max:14,hit:0,r:20,shoot:Infinity});return}

 const i=waveIndex,elite=i===11?'hunter':i%10===7?(Math.floor(i/10)%2?'hunter':'ace'):null,type=elite==='hunter'?2:elite==='ace'?0:sectors[level].roster[i%sectors[level].roster.length],center=sectors[level].routes[(i+Math.floor(difficulty())*2)%sectors[level].routes.length],count=elite?3:i===0?3:4+(difficulty()>0?1:0);
 for(let n=0;n<count;n++){const leader=n===0?elite:null,memberType=elite&&n>0?0:type,offset=i%3===0?(n-(count-1)/2)*52:i%3===1?Math.sin(n*1.15)*75:(n%2?1:-1)*Math.ceil(n/2)*42,y=clamp(center+offset,100,H-100),hp=([7,9,22,13][memberType]+difficulty()*3)*(leader?2.5:1);
 const enemy={x:W+180+n*96,y,base:y,type:memberType,elite:leader,wave:i,hp,max:hp,hit:0,age:0,phase:i*.45+n*.16,shoot:1.5+n*.38,speed:([220,180,130,205][memberType]+difficulty()*17)*(leader==='ace'?1.55:1)*(1+Math.min(i,20)*.018),r:memberType===2?39:31};prepareEnemyEntry(enemy,i,n);enemies.push(enemy);}
}
function updateStructures(dt){
 const plan=gatePlans[level];while(gateIndex<plan.length&&time>=plan[gateIndex].at){const g=plan[gateIndex];obstacles.push({...g,id:gateIndex,x:W+100,w:g.width||82+level*8});gateIndex++}
 for(const o of obstacles){o.x=W+100-(time-o.at)*SCROLL_SPEED;if(o.rotor&&rotorContact(o,ship.x,ship.y,18))damage();if(obstacleSolids(o).some(r=>ship.x+24>r.x&&ship.x-24<r.x+r.w&&ship.y+14>r.y&&ship.y-14<r.y+r.h))damage()}
 obstacles=obstacles.filter(o=>o.x+o.w>-30);
}
function aimed(x,y,speed=520,offset=0,kind='bolt'){const a=Math.atan2(ship.y-y,ship.x-x)+offset;hostile.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:7,c:sectors[level].color,kind,launchAngle:a})}
// Boss attacks are timed sequences: a locked acid volley, a sweeping autocannon,
// and a serpent's alternating venom strikes. Every round keeps its launch vector.
function updateBossWeapon(b,dt){
 if(typeof isCapitalSiege==='function'&&isCapitalSiege(b))return;
 if(bossIndex()>=3)return;
 b.shoot-=dt;
 if((b.pass&&b.pass.stage!=='rear')||b.charge>0||b.breath||b.eyeAttack||b.rush>0||b.vacuum>0||b.rackShots>0||hazards.some(h=>h.age>=h.warning)){b.attack=null;b.fireHeading=null;return}
 if(!b.attack&&b.shoot<=0&&b.x<1250){const r=firingRig(b,true);b.attack={age:0,next:.7,index:0,heading:r.heading};b.fireHeading=r.heading;b.shoot=99}
 const a=b.attack;if(!a)return;a.age+=dt;
 const count=bossIndex()===0?3:bossIndex()===1?9:4,interval=bossIndex()===0?.22:bossIndex()===1?.12:.32;
 const offset=bossIndex()===1?-.42+a.index*.105:bossIndex()===2?(a.index%2?-.17:.17):0;
 b.fireHeading=a.heading+offset;
 if(a.age<a.next)return;
 const r=firingRig(b,true);if(r.organic){const mouth=organicMouth(b);r.muzzleX=mouth.x;r.muzzleY=mouth.y;}else if(!bossDesign()&&bossIndex()===1&&imageReady(art.bossAtlas)){const gun=openingBossMount(b,a.index%2?'lower':'upper');r.muzzleX=gun.x;r.muzzleY=gun.y;}const speed=bossIndex()===0?560:bossIndex()===1?690:620,angle=b.fireHeading;
 hostile.push({x:r.muzzleX,y:r.muzzleY,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:bossIndex()===0?13:10,c:sectors[level].color,kind:r.organic?organicShotKind():'bolt',launchAngle:angle,scale:bossIndex()===0?1.8:1.5,bossShot:true});
 b.muzzle=.16;window.flightAudio?.shot(bossIndex()===1?'bolt':'spore',b.x,true);a.index++;a.next+=interval*(r.organic?.85:1);
 if(a.index>=count){b.attack=null;b.fireHeading=null;b.shoot=(b.hp/b.max<.5?1.15:1.8)*(r.organic?.7:1)}
}
function updateBossWingAudio(b){if(!bossOrganic()||typeof organicBossWingPhase!=='function')return;const stroke=Math.floor(organicBossWingPhase(bossIndex(),b)/TAU);if(b.wingAudioStroke!==undefined&&stroke>b.wingAudioStroke)window.flightAudio?.wingbeat?.(b.x,b.propulsion||0,bossIndex());b.wingAudioStroke=stroke;}
function steerHostile(b,dt){b.age=(b.age||0)+dt;if(b.kind==='seed'&&b.age>.85&&!b.split){b.split=true;for(let i=0;i<5;i++){const a=Math.PI+(i-2)*.28;hostile.push({x:b.x,y:b.y,vx:Math.cos(a)*620,vy:Math.sin(a)*620,r:7,scale:1,kind:'spore',c:b.c});}burst(b.x,b.y,b.c,10);b.x=-200;return;}if(b.kind!=='seeker'||b.age>1.8)return;const heading=Math.atan2(b.vy,b.vx),target=Math.atan2(ship.y-b.y,ship.x-b.x),delta=Math.atan2(Math.sin(target-heading),Math.cos(target-heading)),angle=heading+clamp(delta,-.7*dt,.7*dt),speed=Math.hypot(b.vx,b.vy);b.vx=Math.cos(angle)*speed;b.vy=Math.sin(angle)*speed}
function spawnSupplies(){const plan=supplyPlans[level];while(supplyIndex<plan.length&&time>=plan[supplyIndex].at){const item=plan[supplyIndex++];drops.push({x:W+28,y:item.y,type:item.type,r:23,age:0})}}
function enemyExplosionSize(e){return e.satellite?.65:e.brood?1.8:e.type===2?1.5:1}
function kill(e){score+=e.elite?750:e.type===2?300:150;kills++;explode(e.x,e.y,e.type===1||e.type===3?'#98ffc5':'#ffb26a',enemyExplosionSize(e),e.type===1||e.type===3,organicVoice(e));updateHUD()}
function collect(d){
 if(['spread','beam','helix','wave','missile'].includes(d.type)){if(weapon===d.type)power=Math.min(3,power+1);else weapon=d.type}
 else if(d.type==='orb'){weaponOrb.owned=true;weaponOrb.angle=weaponOrb.target=0;}
 else if(d.type==='power')power=Math.min(3,power+1);
 else if(d.type==='speed')speedLevel=Math.min(3,speedLevel+1);
 else if(d.type==='companion')companion=Math.min(2,companion+1);
 else if(d.type==='frontShield')ship.frontShield=Math.min(8,(ship.frontShield||0)+6);
 else if(d.type==='shield')ship.shield=Math.min(3,ship.shield+2);
 else if(d.type==='repair')ship.hp=Math.min(5,ship.hp+2);
 else if(d.type==='nova')novas=Math.min(3,novas+1);
 score+=50;burst(d.x,d.y,'#a8ffdb',12);window.flightAudio?.pickup(d.x);
 const label={orb:'WEAPON ORB ONLINE · SPACE TO SWITCH',speed:`ENGINE BOOST ${speedLevel}/3`,companion:'WINGMATE ONLINE',power:'CANNONS UPGRADED',frontShield:'FRONT GUARD ONLINE',shield:'SHIELD RESTORED',repair:'HULL REPAIRED',nova:'NOVA RECHARGED'}[d.type]||weaponNames[d.type]+' ACQUIRED';
 announce(label);annTimer=1.4;updateHUD();
}
// Capture once at the sector boundary. Blurring a small cached image avoids
// filtering the full live scene on every frame of the transition.
function sectorSceneTime(){return time+sectorIntroLead+(sectorBlend?.age||0);}
function advanceSector(){
 // Capture scenery afresh so the old ship never becomes part of the fade.
 ctx.setTransform(renderScale,0,0,renderScale,0,0);window.gpuModels?.begin();ctx.save();background(0);drawDreamAtmosphere();drawStructures();window.gpuModels?.flush(ctx);drawNearField();ctx.restore();
 const motion={x:ship.x,y:ship.y,vx:ship.vx,vy:ship.vy};
 const outgoing=document.createElement('canvas');outgoing.width=720;outgoing.height=380;
 outgoing.getContext('2d').drawImage(canvas,0,0,720,380);
 const haze=document.createElement('canvas');haze.width=720;haze.height=380;const hc=haze.getContext('2d');hc.filter='blur(9px)';hc.drawImage(outgoing,-18,-10,756,400);hc.filter='none';
 level++;ship.hp=Math.min(5,ship.hp+2);novas=Math.min(3,novas+1);resetSector();Object.assign(ship,motion);
 sectorBlend={outgoing,haze,age:0,duration:1.65};$('#announcement').style.opacity=0;annTimer=0;window.flightAudio?.setIntensity(0);
}
function drawSectorBlend(){if(!sectorBlend)return;const u=clamp(sectorBlend.age/sectorBlend.duration,0,1),e=u*u*(3-2*u),soft=Math.sin(Math.PI*u);
 ctx.save();ctx.globalAlpha=(1-e)*(1-soft*.8);ctx.drawImage(sectorBlend.outgoing,0,0,W,H);
 ctx.globalAlpha=(1-e)*soft*.8;ctx.drawImage(sectorBlend.haze,0,0,W,H);
 ctx.globalAlpha=soft*.12;ctx.fillStyle=sectors[level].color;ctx.fillRect(0,0,W,H);ctx.restore();
}
function updateShipMovement(dt,environment=true){
let dx=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0),dy=(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0);
const len=Math.hypot(dx,dy)||1,maxSpeed=390+speedLevel*75;
let targetVX=dx/len*maxSpeed,targetVY=dy/len*maxSpeed;
if(pointer?.relative){targetVX=pointer.dx*maxSpeed;targetVY=pointer.dy*maxSpeed}
else if(pointer){const px=(pointer.x-ship.x)/dt,py=(pointer.y-ship.y)/dt,scale=Math.min(1,maxSpeed/(Math.hypot(px,py)||1));targetVX=px*scale;targetVY=py*scale}
// Steering has no acceleration lag or release drift; only the visual attitude eases.
ship.vx=targetVX;ship.vy=targetVY;
const suction=environment&&boss?bossSuctionForce(boss):0;ship.x=clamp(ship.x+(ship.vx+suction)*dt,40,W-65);ship.y=clamp(ship.y+(ship.vy+(environment?sectorCurrent():0))*dt,42,H-42);if(ship.x===40||ship.x===W-65)ship.vx=0;if(ship.y===42||ship.y===H-42)ship.vy=0;
const targetPitch=clamp(ship.vy/2800,-.18,.18),targetYaw=clamp(ship.vx/3400,-.15,.15),easing=1-Math.exp(-dt*11);
flightPose.pitch+=(targetPitch-flightPose.pitch)*easing;const rollRate=-ship.vy/maxSpeed*7;flightPose.rollRate=((flightPose.rollRate||0)+(rollRate-(flightPose.rollRate||0))*(1-Math.exp(-dt*12)));flightPose.roll+=flightPose.rollRate*dt;if(Math.abs(ship.vy)<10)flightPose.roll+=(Math.round(flightPose.roll/TAU)*TAU-flightPose.roll)*(1-Math.exp(-dt*5));flightPose.yaw+=(targetYaw-flightPose.yaw)*easing;
const accel=Math.hypot(ship.vx-flightPose.vx,ship.vy-flightPose.vy)/dt,thrust=clamp(.15+Math.max(0,ship.vx)/800+Math.abs(ship.vy)/2400+accel/22000,.1,1.1);flightPose.thrust+=(thrust-flightPose.thrust)*(1-Math.exp(-dt*8));flightPose.vx=ship.vx;flightPose.vy=ship.vy;
}
function update(dt){if(state!=='paused')world+=dt*SCROLL_SPEED;if(state!=='playing')return;if(sectorBlend){updateShipMovement(dt,false);updateWeaponOrb(dt);flash=Math.max(0,flash-dt);shake=Math.max(0,shake-dt*30);sectorBlend.age+=dt;if(sectorBlend.age>=sectorBlend.duration){sectorIntroLead+=sectorBlend.duration;sectorBlend=null;saveCheckpoint();announce('SECTOR '+String(level+1).padStart(2,'0'),sectors[level].name);}return;}if(flightRun)flightRun.activeTicks+=Math.round(dt*120);time+=dt;if(checkpoint&&currentSection()>checkpoint.section){saveCheckpoint();announce('SECTION '+(checkpoint.section+1)+' / 4','CHECKPOINT SAVED')}ship.inv=Math.max(0,ship.inv-dt);ship.frontFlash=Math.max(0,(ship.frontFlash||0)-dt);fireClock-=dt;spawnClock-=dt;companionClock-=dt;muzzleFlash=Math.max(0,muzzleFlash-dt);if(companion>0&&companionClock<=0&&!bossDefeated){for(let i=0;i<companion;i++){const pos=dronePosition(i);makeShot(pos.x+20,pos.y,'drone');window.flightAudio?.shot('drone',pos.x,true)}companionClock=.3}spawnSupplies();flash=Math.max(0,flash-dt);shake=Math.max(0,shake-dt*30);if(annTimer>0){annTimer-=dt;if(annTimer<=0)$('#announcement').style.opacity=0}
updateShipMovement(dt);
updateWeaponOrb(dt);if(fireClock<=0&&!bossDefeated){if(weaponOrb.owned&&Math.abs(weaponOrb.angle-weaponOrb.target)<.02)fire(orbPosition(),weaponOrb.target===0?1:-1,true);else fire();fireClock=weapon==='missile'?.38:weapon==='wave'?.28:weapon==='beam'?.18:.13}
updateStructures(dt);const storm=stormLane();if(storm&&!storm.warning&&Math.abs(ship.x-storm.x)<32)damage();updateAcidClouds(dt);updateChallenge();while(waveIndex<waveTimes[level].length&&time>=waveTimes[level][waveIndex]){spawn();waveIndex++}if(time>sectors[level].duration&&!boss&&!bossDefeated){boss={x:W+180,y:H/2,r:sectors[level].bossRadius,hp:sectors[level].hp,max:sectors[level].hp,age:0,shoot:2,hit:0,special:10,charge:0};enemies=[];announce('WARNING','MASSIVE HOSTILE SIGNATURE');$('#bossbar').hidden=false;$('#bossname').textContent=sectors[level].boss;if(typeof isCapitalSiege==='function'&&isCapitalSiege(boss))initCapitalSiege(boss);tone(150,.6,'triangle',.08,-50)}
for(const e of enemies){enemyKinematics(e,dt);e.muzzle=Math.max(0,(e.muzzle||0)-dt);e.hit=Math.max(0,e.hit-dt);e.shoot-=dt;if(e.shoot<0&&e.x>45&&e.x<W-45&&e.y>35&&e.y<H-35&&(!e.entry||e.age>1.6)){const rig=firingRig(e);e.muzzle=.16;if(e.x>0&&e.x<W)window.flightAudio?.shot(e.elite==='hunter'?'seeker':rig.organic?'spore':'bolt',e.x,true);if(e.elite)aimed(rig.muzzleX,rig.muzzleY,e.elite==='hunter'?285:520+difficulty()*45,0,e.elite==='hunter'?'seeker':rig.organic?organicShotKind():'bolt');else hostile.push({x:rig.muzzleX,y:rig.muzzleY,vx:(e.direction||-1)*(520+difficulty()*45),vy:0,r:7,c:sectors[level].color,kind:rig.organic?organicShotKind():'bolt',launchAngle:e.direction===1?0:Math.PI});e.shoot=(e.elite==='hunter'?1.65:3.2)-difficulty()*.2}if(Math.hypot(e.x-ship.x,e.y-ship.y)<43){damage();if(!e.brood){explode(e.x,e.y,'#ffb48a',enemyExplosionSize(e),e.type===1||e.type===3,organicVoice(e));e.hp=0}}}
window.flightAudio?.setIntensity(boss?.9:Math.min(.75,enemies.length/24));if(boss){const b=boss;b.age+=dt;b.depth=1;b.muzzle=Math.max(0,(b.muzzle||0)-dt);updateBossSpecial(b,dt);updateEncounter(b,dt);updateBossArms(b,dt);moveBoss(b,dt);updateBossWingAudio(b);b.hit=Math.max(0,b.hit-dt);updateBossWeapon(b,dt);if(bossBodyHit(b,ship.x,ship.y,18))damage()}
for(const s of shots){const oldX=s.x,oldY=s.y;moveShot(s,dt);const impact=shotTerrainHit(oldX,oldY,s);if(impact){terrainImpact(impact.x,impact.y,s.vx,s.vy);s.x=W+100;continue}if(hitEncounterNode(s)){s.x=W+100;continue;}for(const e of enemies){if(e.hp>0&&!s.seen.has(e)&&Math.hypot(e.x-s.x,e.y-s.y)<e.r*(e.depth||1)+s.r+7){e.hp-=s.damage;e.hit=.12;s.seen.add(e);if(!s.beam)s.x=W+100;burst(e.x,e.y,s.c,3);if(e.hp<=0)kill(e)}}if(boss&&!s.seen.has(boss)&&bossBodyHit(boss,s.x,s.y,s.r)){boss.hp-=bossDamage(s.damage)*encounterDamage(boss,s);boss.hit=.1;s.seen.add(boss);s.x=W+100;burst(s.x>W?boss.x-boss.r*.6:s.x,s.y,s.c,2)}}shots=shots.filter(s=>s.x>-70&&s.x<W+60&&s.y>-30&&s.y<H+30);enemies=enemies.filter(e=>e.hp>0&&(e.entry?e.age<16&&(e.age<4.5||(e.x>-170&&e.x<W+170&&e.y>-100&&e.y<H+100)):e.x>-170));
// Ordinary hostile rounds obey the same solid scenery as the player's rounds.
// Breath volumes and beam hazards are managed separately by their encounter rules.
for(const b of hostile){const oldX=b.x,oldY=b.y;steerHostile(b,dt);if(b.kind==='seed'&&b.split)continue;b.x+=b.vx*dt;b.y+=b.vy*dt;const impact=shotTerrainHit(oldX,oldY,b);if(impact){terrainImpact(impact.x,impact.y,b.vx,b.vy);b.x=-100;continue}if(blockWithFrontShield(b,oldX)){b.x=-100;continue}if(Math.hypot(b.x-ship.x,b.y-ship.y)<b.r+14){damage();b.x=-100}}hostile=hostile.filter(b=>b.x>-50&&b.x<W+200&&b.y>-50&&b.y<H+50);
for(const d of drops){d.x-=70*dt;d.age+=dt;const distance=Math.hypot(d.x-ship.x,d.y-ship.y);if(distance<150){d.x+=(ship.x-d.x)*dt*2.8;d.y+=(ship.y-d.y)*dt*2.8}if(distance<55){collect(d);d.x=-100}}drops=drops.filter(d=>d.x>-30);
if(boss&&boss.hp<=0){window.flightAudio?.clear();explodeBoss(boss);enemies=[];hazards=[];acidClouds=[];rings.push({x:boss.x,y:boss.y,r:20,life:1.1,c:'#fff'});score+=3000*(level+1);boss=null;bossDefeated=true;transition=4;hostile=[];shots=[];flash=.48;shake=20;$('#bossbar').hidden=true;announce('SECTOR CLEARED','JUMP DRIVE CHARGING');tone(55,.9,'triangle',.04,-25)}
if(state!=='playing')return;if(bossDefeated){transition-=dt;if(transition<=0){if(level===sectors.length-1){end(true)}else{advanceSector()}}}hudClock+=dt;if(hudClock>=.08){hudClock=0;updateHUD()}}
function render(dt){resizeFlightSurface();ctx.setTransform(renderScale,0,0,renderScale,0,0);window.gpuModels?.begin();ctx.save();if(shake)ctx.translate(rand(-shake,shake),rand(-shake,shake));background(dt);drawDreamAtmosphere();drawStructures();if(sectorBlend){window.gpuModels?.flush(ctx);drawNearField();drawSectorBlend();}if(state==='title'){drawShip(1020,320+Math.sin(world*.004)*8,3.15,true);for(let i=0;i<3;i++){ctx.strokeStyle='#88f8dd';ctx.globalAlpha=.2-i*.05;ctx.beginPath();ctx.moveTo(630-i*65,317+i*5);ctx.lineTo(790-i*20,317+i*5);ctx.stroke()}ctx.globalAlpha=1}else{for(const e of enemies)enemyShape(e);drawBoss();window.gpuModels?.flush(ctx);if(boss)drawEncounterDefenses(boss);for(const d of drops)drawPickup(d);for(const s of shots)drawProjectile(s);for(const b of hostile)drawHostile(b);drawHazards();drawAcidClouds();drawSectorRule();drawEntryWarnings();noGlow();if(state!=='gameover'){ctx.save();ctx.globalAlpha*=ship.inv>0?.74+Math.sin(ship.inv*28)*.26:1;drawShip(ship.x,ship.y);ctx.restore();}drawFrontShield();drawWeaponOrb();for(let i=0;i<companion;i++)drawDrone(i);if(ship.shield>0){ctx.strokeStyle='#99eaff';ctx.lineWidth=2;glow('#69caff',12);ctx.beginPath();ctx.arc(ship.x,ship.y,48+Math.sin(world*.04)*3,0,TAU);ctx.stroke();noGlow()}}
window.gpuModels?.flush(ctx);drawExplosions(dt);if(!sectorBlend)drawNearField();const active=state!=='paused';for(const p of particles){if(active){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.c;if(p.spark){ctx.strokeStyle=p.c;ctx.lineWidth=p.r;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.025,p.y-p.vy*.025);ctx.stroke()}else ctx.fillRect(p.x,p.y,p.r,p.r)}ctx.globalAlpha=1;particles=particles.filter(p=>p.life>0);for(const r of rings){if(active){r.life-=dt;r.r+=dt*550}ctx.globalAlpha=Math.max(0,r.life);ctx.strokeStyle=r.c;ctx.lineWidth=3;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,TAU);ctx.stroke()}rings=rings.filter(r=>r.life>0);ctx.globalAlpha=1;if(flash>0){ctx.fillStyle=`rgba(166,255,227,${Math.min(.7,flash)})`;ctx.fillRect(0,0,W,H)}ctx.restore();window.gpuModels?.flush(ctx);drawTouchSteering()}
let accumulator=0,frameError=null;
let renderScale=1,renderQuality=1.5,surfaceWidth=W,surfaceDirty=true;
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{surfaceDirty=true;}).observe(canvas);
window.addEventListener('resize',()=>{surfaceDirty=true;});
function resizeFlightSurface(){if(surfaceDirty){surfaceWidth=canvas.getBoundingClientRect?.().width||W;surfaceDirty=false;}const width=surfaceWidth;const ratio=Math.max(1,Math.min(renderQuality,width*(window.devicePixelRatio||1)/W));if(Math.abs(renderScale-ratio)>.03||canvas.width!==Math.round(W*ratio)){renderScale=ratio;canvas.width=Math.round(W*ratio);canvas.height=Math.round(H*ratio);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';}window.flightRenderScale=renderScale;}

function reportFrameError(error){
 if(frameError)return;
 frameError={message:String(error?.message||error),stack:String(error?.stack||''),sector:level+1,time:Number(time.toFixed(2))};
 console.error('First Descent flight interrupted',frameError);
 state='error';window.flightAudio?.setMusicActive(false);window.flightAudio?.clear();keys.clear();pointer=null;accumulator=0;
 $('#pause').hidden=true;$('#touchControls').classList.remove('active');
 panel('FLIGHT<br><em>INTERRUPTED</em>','The game encountered a graphics or simulation error.<br>Reload to restore the mission.','RELOAD GAME',()=>location.reload());
 const detail=document.createElement('p');detail.className='launch-caption';detail.textContent=`Sector ${frameError.sector} · ${frameError.time}s · ${frameError.message}`;$('#overlay').append(detail);
}
window.addEventListener('game-render-error',event=>reportFrameError(event.detail));
function frame(now){
 requestAnimationFrame(frame);
 const elapsed=(now-last)/1000,dt=Math.min(elapsed,.1);last=now;if(elapsed>0&&elapsed<.5)trackFrame(elapsed);
 if(frameError)return;
 musicControls();
 try{accumulator+=dt;while(accumulator>=1/120){captureMotion();update(1/120);accumulator-=1/120}renderSmooth(dt,accumulator*120)}catch(error){reportFrameError(error)}
}
window.addEventListener('keydown',e=>{if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();const k=e.key.length===1?e.key.toLowerCase():e.key;keys.add(k);if(e.repeat)return;if(k==='Enter'&&state==='title'){start();return;}if(k==='p'||k==='Escape')pause();if(k==='x')nova();if(k===' ')switchOrb()});window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));window.addEventListener('blur',()=>{keys.clear();pointer=null;if(state==='playing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
// Touch controls are relative to where the finger lands, in screen pixels so
// the same thumb motion works in portrait, landscape and high-DPI displays.
function setPointer(e){
 if(!pointer||e.pointerId!==pointer.id)return;
 const r=canvas.getBoundingClientRect();
 if(pointer.relative){
  const x=e.clientX-pointer.anchorClientX,y=e.clientY-pointer.anchorClientY,distance=Math.hypot(x,y),amount=clamp((distance-5)/27,0,1);
  pointer.dx=distance?x/distance*amount:0;pointer.dy=distance?y/distance*amount:0;
  pointer.visualX=distance?x/distance*Math.min(32,distance):0;pointer.visualY=distance?y/distance*Math.min(32,distance):0;
 }else{pointer.x=(e.clientX-r.left)/r.width*W;pointer.y=(e.clientY-r.top)/r.height*H;}
}
function releasePointer(e){if(!pointer||e.pointerId!==pointer.id)return;pointer=null;}
canvas.addEventListener('pointerdown',e=>{
 if(state!=='playing'||pointer)return;
 const relative=e.pointerType==='touch'||e.pointerType==='pen';
 pointer={id:e.pointerId,relative,anchorClientX:e.clientX,anchorClientY:e.clientY,dx:0,dy:0,visualX:0,visualY:0};
 canvas.setPointerCapture(e.pointerId);setPointer(e);
});
canvas.addEventListener('pointermove',setPointer);
canvas.addEventListener('pointerup',releasePointer);canvas.addEventListener('pointercancel',releasePointer);canvas.addEventListener('lostpointercapture',releasePointer);
function drawTouchSteering(){
 if(state!=='playing'||!pointer?.relative)return;
 const r=canvas.getBoundingClientRect(),sx=W/r.width,sy=H/r.height;
 ctx.save();ctx.translate((pointer.anchorClientX-r.left)*sx,(pointer.anchorClientY-r.top)*sy);ctx.scale(sx,sy);
 ctx.strokeStyle='#b3ffe5';ctx.fillStyle='#b3ffe5';ctx.lineWidth=1;ctx.globalAlpha=.2;ctx.beginPath();ctx.arc(0,0,32,0,TAU);ctx.stroke();
 ctx.globalAlpha=.32;ctx.beginPath();ctx.arc(pointer.visualX,pointer.visualY,10,0,TAU);ctx.fill();ctx.restore();
}
$('#launch').onclick=start;$('#pause').onclick=pause;$('#novaTouch').onclick=nova;$('#orbTouch').onclick=switchOrb;$('#sound').onclick=()=>{sound=!sound;enableAudio();$('#sound').textContent=sound?'SFX ON':'SFX OFF';$('#sound').setAttribute('aria-label',sound?'Mute sound effects':'Enable sound effects');if(sound){if(state!=='title')tone(660,.12,'sine',.05)}};$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('.stage').requestFullscreen()}catch{announce('FULLSCREEN UNAVAILABLE')}};
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_game_status',description:'Read the current First Descent flight status.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:(input)=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('Expected an empty object');return {state,sector:level+1,score,hull:ship.hp,weapon,power,novas,speedLevel,companion,renderer:window.gpuModels?.stats()||{engine:'Canvas compatibility'}}}})).catch(()=>{})}catch{}}
$('#records').onclick=showLocalScores;$('#campaignCaption').textContent=`${sectors.length} DREAM BIOMES · ${sectors.length} BOSSES · 4 CHECKPOINTS PER SECTOR`;
updateHUD();requestAnimationFrame(frame);

// Title music is independently switchable; the first gesture unlocks browser audio.
function musicControls(){const info=window.flightAudio?.stats();if(!info)return;const button=$('#music');const label=!info.musicEnabled?'MUSIC OFF':info.musicPlaying||state!=='title'?'MUSIC ON':'PLAY MUSIC';if(button.textContent!==label){button.textContent=label;button.setAttribute('aria-label',info.musicEnabled&&(info.musicPlaying||state!=='title')?'Turn off music':'Play music');button.setAttribute('aria-pressed',String(info.musicEnabled));}const titleButton=$('#introMusic'),titleLabel=$('#introMusicLabel');if(titleButton&&titleLabel){const playing=info.musicEnabled&&info.musicPlaying;titleLabel.textContent=playing?'PAUSE THE THEME':'PLAY THE THEME';titleButton.setAttribute('aria-label',playing?'Pause the theme':'Play the theme');titleButton.setAttribute('aria-pressed',String(playing));titleButton.classList.toggle('playing',playing);}}
$('#music').onclick=()=>{const info=window.flightAudio?.stats();if(!info)return;window.flightAudio.setMusicEnabled(!info.musicEnabled||(state==='title'&&info.state!=='running'));if(state==='title')window.flightAudio.setTitle(!document.hidden);else window.flightAudio.setMusicActive(state==='playing'&&!document.hidden);enableAudio();musicControls()};
function unlockTitleMusic(event){if(state!=='title'||event.target?.closest?.('button,a'))return;window.flightAudio?.setTitle(true);enableAudio()}
window.addEventListener('pointerdown',unlockTitleMusic);window.addEventListener('keydown',unlockTitleMusic);
document.addEventListener('visibilitychange',()=>{if(state==='title')window.flightAudio?.setTitle(!document.hidden);else window.flightAudio?.setMusicActive(state==='playing'&&!document.hidden)});
window.flightAudio?.setTitle(true);musicControls();
if($('#introMusic'))$('#introMusic').onclick=()=>$('#music').onclick();

function updateChallenge(){const c=sectors[level].challenge;if(!c)return;
 if(time>=c.at&&!challengeState.warned&&time<c.end){challengeState.warned=true;announce(c.title,themeIndex()===0?'ASTEROID NARROWS · FOLLOW THE OPEN CHANNEL':sectors[level].scrollAxis?'CHANGING SHAFT · FOLLOW THE OPEN CHANNEL':'OFFSET GATES AHEAD · FOLLOW THE OPEN CHANNEL');}
 if(!challengeState.gate&&time>=c.at-4&&time<c.end){challengeState.gate=true;const at=c.at-4,o={at,id:50,x:W+100-(time-at)*SCROLL_SPEED,w:420,width:420,shutters:true,parts:[{x:0,y:0,w:420,h:90,ceiling:true},{x:0,y:670,w:420,h:90,ceiling:false}]};obstacles.push(o);if(c.gate)enemies.push({sentry:true,anchorAt:at,x:o.x+110,y:125,base:125,type:2,age:0,phase:0,speed:0,r:28,hp:65,max:65,hit:0,shoot:2});}
 while(challengeState.wave<c.waves.length&&time>=c.waves[challengeState.wave]){const n=challengeState.wave++,type=c.types[n%c.types.length];for(let i=0;i<c.count;i++){const y=c.gate?330+i*45:180+((n*137+i*110)%380),hp=[10,13,27,17][type]+difficulty()*3;const e={x:W+80+i*115,y,base:y,type,age:0,phase:n*.7+i*.25,speed:(210+difficulty()*15)*c.speed,r:type===2?39:31,hp,max:hp,hit:0,shoot:2+i*.5,challenge:true};if(sectors[level].scrollAxis)prepareEnemyEntry(e,n,i);enemies.push(e);}}
 if(time>=c.end&&!challengeState.reward){challengeState.reward=true;drops.push({x:W-100,y:380,type:'repair',r:23,age:0});}
}

// Interpolate presentation between fixed simulation ticks on high-refresh displays.
const priorActors=new WeakMap();let priorWorld=0,priorPose=null,priorBossPose=null;
const bossPoseFields=['turnYaw','flightPitch','flightYaw','flightBank','maneuverRoll','beamPitch','propulsionTime','propulsion','actionLoad','attackDrive','flightVX','flightVY'];
function captureMotion(){priorWorld=world;priorPose={...flightPose};priorBossPose=boss?{actor:boss,values:Object.fromEntries(bossPoseFields.map(k=>[k,boss[k]||0]))}:null;for(const a of [ship,boss,...enemies,...shots,...hostile,...drops].filter(Boolean))priorActors.set(a,{x:a.x,y:a.y,age:a.age});}
function renderSmooth(dt,alpha){if(state!=='playing'||!priorPose){render(dt);return;}const restore=[],savedWorld=world,savedPose={...flightPose};for(const a of [ship,boss,...enemies,...shots,...hostile,...drops].filter(Boolean)){const p=priorActors.get(a);if(!p)continue;restore.push([a,a.x,a.y,a.age]);a.x=p.x+(a.x-p.x)*alpha;a.y=p.y+(a.y-p.y)*alpha;if(Number.isFinite(a.age)&&Number.isFinite(p.age))a.age=p.age+(a.age-p.age)*alpha;}const savedBoss=priorBossPose?.actor===boss?Object.fromEntries(bossPoseFields.filter(k=>Object.prototype.hasOwnProperty.call(boss,k)).map(k=>[k,boss[k]])):null;if(savedBoss)for(const k of bossPoseFields)boss[k]=priorBossPose.values[k]+((boss[k]||0)-priorBossPose.values[k])*alpha;world=priorWorld+(world-priorWorld)*alpha;for(const key of ['pitch','yaw','roll','thrust'])flightPose[key]=priorPose[key]+(flightPose[key]-priorPose[key])*alpha;try{render(dt);}finally{world=savedWorld;Object.assign(flightPose,savedPose);if(savedBoss)for(const k of bossPoseFields){if(Object.prototype.hasOwnProperty.call(savedBoss,k))boss[k]=savedBoss[k];else delete boss[k];}for(const [a,x,y,age] of restore){a.x=x;a.y=y;if(age!==undefined)a.age=age;}}}

let frameReportTicks=0;const frameSamples=[];function trackFrame(dt){frameSamples.push(dt*1000);if(frameSamples.length>120)frameSamples.shift();if(frameSamples.length===120&&++frameReportTicks%30===0){const sorted=frameSamples.slice().sort((a,b)=>a-b);window.flightPerformance={fps:Math.round(1000/(frameSamples.reduce((a,b)=>a+b,0)/120)),p95:Math.round(sorted[114]),resolution:renderScale};if(window.flightPerformance.fps<53&&renderQuality>1){renderQuality=Math.max(1,renderQuality-.25);frameSamples.length=0;}}}
