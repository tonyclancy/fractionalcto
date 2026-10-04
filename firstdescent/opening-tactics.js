'use strict';
// Authored campaign roles. Visual signals describe
// real combat state; they never promise safety while projectiles remain in flight.
let openingFeedback=null;
const openingRoleMeshes=new Map();
function openingTacticsActive(){return storyActive();}
// Replace a few existing waves, preserving their times and the rest of each
// world's roster. The first two missions teach these counters before reuse.
const CAMPAIGN_TACTICAL_WAVES=Object.freeze({
 'lumen-reef':Object.freeze({
  3:Object.freeze({count:2,type:1,center:280,formation:'line',aimed:true,role:'suppressor'}),
  12:Object.freeze({count:2,type:1,center:480,formation:'line',aimed:true,role:'suppressor'})
 }),
 'nivara-glacial-heart':Object.freeze({
  3:Object.freeze({count:3,type:1,center:470,formation:'wedge',aimed:true,role:'coordinator'}),
  14:Object.freeze({count:3,type:0,center:280,formation:'wedge',aimed:true,role:'coordinator'})
 })
});
function campaignTacticalWave(index){return storyActive()?CAMPAIGN_TACTICAL_WAVES[sectors[level].id]?.[index]:undefined;}
function resetOpeningTactics(){openingFeedback=null;}
function configureOpeningRole(e,authored,n){
 if(!openingTacticsActive()||!authored?.role)return;
 const split=authored.role==='suppressor'&&authored.formation==='split';
 if(n===0||split){e.openingRole=authored.role;e.roleTeaching=!!authored.teach;e.roleInterrupts=0;e.roleSplit=split;if(split)e.rolePartner=enemies.find(q=>q.wave===e.wave&&q.openingRole==='suppressor')||null;
  if(e.openingRole==='suppressor'){e.aimedFire=true;e.pressureFire=true;e.shoot=authored.teach?2.1:split?1.3+n*1.15:1.3;e.hp=e.max=Math.max(e.max,authored.teach?26:32);}
  if(e.openingRole==='coordinator'){e.hp=e.max=Math.max(e.max,34);e.shoot=2.4;}
 }else if(authored.role==='coordinator')e.openingEscort=enemies.find(q=>q.wave===e.wave&&q.openingRole==='coordinator')||null;
}
function openingWeaponWarning(e){return e.openingRole==='suppressor'?(e.roleTeaching?1.55:1.05):COMBAT_BALANCE.enemyWindup;}
function openingWeaponReady(e){
 if(!e.roleSplit)return true;
 const partner=e.rolePartner||enemies.find(q=>q.rolePartner===e);
 return !partner||partner.hp<=0||partner.retreat||!partner.shotWindup;
}
function openingWeaponCount(e){return e.openingRole==='suppressor'?(e.roleTeaching?2:3):null;}
function openingRoleMotion(e,dt){
 if(!e.openingRole||e.retreat||e.hp<=0)return;
 // A suppressor brakes only while visibly charging. It cannot track the pilot
 // or teleport into an ideal firing position after the sightline has locked.
 if(e.openingRole==='suppressor'&&e.shotWindup&&e.shotWindup.fired===0){e.x+=(e.contactOldX-e.x)*.82;e.y+=(e.contactOldY-e.y)*.82;}
}
function openingRoleFeedback(kind,e){
 if(!openingTacticsActive())return;
 const previous=openingFeedback;if(previous&&time-previous.at<.45)return;
 const cues={interrupt:['WEAPON INTERRUPTED','Charge broken · 2 seconds to press the attack'],formation:['FORMATION DISRUPTED','Escorts lose protection · weapons briefly jammed'],flank:['REAR ATTACKER DOWN','Turn to face the next threat'],weak:['WEAK POINT HIT','Your aim found the opening']};
 const c=cues[kind];if(!c)return;
 openingFeedback={at:time,kind,x:e.x,y:e.y,title:c[0],detail:c[1],expires:time+(kind==='weak'?1:1.8)};
 window.flightAudio?.tacticalCue?.(kind,e.x);
}
function openingFeedbackTask(){return openingFeedback&&time<openingFeedback.expires?openingFeedback:null;}
function openingGuardActive(e){const g=e.openingEscort;return g&&g.hp>0&&!g.retreat&&!(g.relayJammedUntil>time)&&g.x>30&&g.x<W-30&&Math.hypot(e.x-g.x,e.y-g.y)<360;}
function openingRoleDamage(s,e){
 let amount=s.damage;
 if(openingGuardActive(e)){amount*=.65;e.guardImpact=time;}
 if(e.openingRole==='suppressor'&&e.shotWindup&&e.shotWindup.fired===0){
  e.rolePressure=(e.rolePressure||0)+amount;
  if(e.rolePressure>=8){e.shotWindup=null;e.shoot=2;e.rolePressure=0;e.roleInterrupts++;e.roleInterruptedUntil=time+2;openingRoleFeedback('interrupt',e);}
 }
 return amount;
}
function openingRoleDefeated(e){
 if(!e.openingRole||e.roleDefeatHandled)return;e.roleDefeatHandled=true;
 if(e.openingRole==='coordinator'){
  for(const q of enemies)if(q.openingEscort===e&&q.hp>0){q.openingEscort=null;q.relayJammedUntil=time+2.2;q.shotWindup=null;}
  openingRoleFeedback('formation',e);
 }else if(e.openingRole==='flanker')openingRoleFeedback('flank',e);
}
function openingRoleMesh(role){
 if(openingRoleMeshes.has(role))return openingRoleMeshes.get(role);const m=meshBuilder();
 const c=role==='coordinator'?[244,188,99]:role==='flanker'?[228,120,184]:[129,198,247];
 if(role==='coordinator')for(const side of [-1,1]){
  m.wedge([-12,side*21,-17],[14,side*24,-17],[24,side*37,-10],4,c);
  m.tube([[-8,side*26,-20],[10,side*30,-20]],1.8,[255,232,174],0,.5,6,1);
 }else if(role==='suppressor'){
  for(const side of [-1,1])m.tube([[-30,side*9,-19],[-2,side*9,-19]],3,c,0,.25,8,1);
 }else for(const side of [-1,1])m.wedge([6,side*20,-15],[22,side*25,-12],[-9,side*34,-8],3,c);
 m.faces.industrial=true;openingRoleMeshes.set(role,m.faces);return m.faces;
}
function drawOpeningRole(e){
 if(!e.openingRole||e.hp<=0||e.x<0||e.x>W)return;
 const p=speciesFlightPose(e);drawModel(openingRoleMesh(e.openingRole),e.x,e.y,p.scale,p.yaw,p.roll,p.pitch,p.age,0);
}
function drawOpeningTactics(){
 if(!openingTacticsActive()||sectorBlend||state==='title')return;
 ctx.save();ctx.globalAlpha=1;
 for(const e of enemies){
  if(e.hp<=0||e.retreat)continue;
  if(openingGuardActive(e)){
   ctx.strokeStyle='#edc77e';ctx.beginPath();ctx.arc(e.x,e.y,e.r+13,Math.PI*.7,Math.PI*1.3);ctx.stroke();
  }
  // The weapon's charge glow and sound warn of its locked burst.
  // Do not draw a sightline across the player or friendly ships.
  if(e.openingRole==='coordinator'&&e.x>0&&e.x<W){ctx.strokeStyle='#f6cd89';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(e.x-12,e.y-e.r-12);ctx.lineTo(e.x,e.y-e.r-21);ctx.lineTo(e.x+12,e.y-e.r-12);ctx.stroke();}
  if(e.roleInterruptedUntil>time){ctx.strokeStyle='#adfce0';ctx.lineWidth=2;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(e.x+side*(e.r+10),e.y-13);ctx.lineTo(e.x+side*(e.r+16),e.y);ctx.lineTo(e.x+side*(e.r+10),e.y+13);ctx.stroke();}}
 }
 if(openingFeedback&&openingFeedback.kind!=='weak'&&time<openingFeedback.expires){const f=openingFeedback,u=clamp((time-f.at)/1.8,0,1);ctx.globalAlpha=1-u;ctx.strokeStyle='#b2ffe4';ctx.lineWidth=2;for(let i=0;i<6;i++){const a=i*TAU/6,r=24+u*40;ctx.beginPath();ctx.moveTo(f.x+Math.cos(a)*r,f.y+Math.sin(a)*r);ctx.lineTo(f.x+Math.cos(a)*(r+8),f.y+Math.sin(a)*(r+8));ctx.stroke();}}
 ctx.restore();
}
