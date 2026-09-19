// Authored encounter: a shielded abyssal ray buds destructible tide knots from
// its three dorsal organs. Destroying knots weakens its mantle; destroying all
// three opens a damage window and interrupts the currents. No breath/lunge loop.
const TIDE_ORGANS=[[-9,-22,0],[14,-22,-14],[14,-22,14]];
function updateTideEncounter(b,dt){
 b.tide??={phase:'gather',age:0,cycle:0,pods:[],shot:1.1};const t=b.tide;t.age+=dt;
 const phase=bossCombatPhase(b);
 if(t.phase==='gather'&&t.age>=1.8){
  t.phase='cast';t.age=0;t.cycle++;
  t.pods=TIDE_ORGANS.map((local,i)=>{const source=bossMount(b,local);return{x:source.x,y:source.y,from:{...source},target:{x:clamp(ship.x+(i-1)*175,100,W-100),y:clamp(ship.y+(i===1?140:-115),110,H-110)},hp:10,max:10,age:0,i};});
  announce('TIDE KNOTS RELEASED','BREAK THE THREE NODES TO OPEN ITS MANTLE');
  window.flightAudio?.bossAttack?.('water',2,b.x);
 }
 if(t.phase==='cast'&&t.age>=1.25){t.phase='hold';t.age=0;}
 if((t.phase==='cast'||t.phase==='hold')&&t.pods.every(p=>p.hp<=0)){
  t.phase='exposed';t.age=0;b.exposed=5.5;t.pods=[];announce('MANTLE EXPOSED','CURRENT BROKEN · ATTACK NOW');
 }
 if(t.phase==='hold'&&t.age>=6.5){t.phase='release';t.age=0;}
 if(t.phase==='release'&&t.age>=1.1){t.phase='exposed';t.age=0;b.exposed=2.5;t.pods=[];}
 if(t.phase==='exposed'){
  b.exposed=Math.max(0,b.exposed-dt);if(b.exposed===0){t.phase='gather';t.age=0;}
 }
 for(const p of t.pods){if(p.hp<=0)continue;p.age+=dt;
  if(t.phase==='cast'||t.phase==='hold'){const u=clamp(p.age/1.25,0,1),smooth=u*u*(3-2*u);p.x=p.from.x+(p.target.x-p.from.x)*smooth;p.y=p.from.y+(p.target.y-p.from.y)*smooth;}
  const dx=p.x-ship.x,dy=p.y-ship.y,d=Math.hypot(dx,dy);
  if(t.phase==='hold'&&d<210&&d>24){const pull=(1-d/210)*38*dt;ship.x=clamp(ship.x+dx/d*pull,30,W-30);ship.y=clamp(ship.y+dy/d*pull,30,H-30);}
  // A physical ring expands from surviving knots, with a wide escape gap aimed
  // away from the boss. The warning is the knot brightening before release.
  if(t.phase==='release'){const r=30+t.age*185,gap=Math.atan2(p.y-b.y,p.x-b.x),a=Math.atan2(ship.y-p.y,ship.x-p.x),delta=Math.abs(Math.atan2(Math.sin(a-gap),Math.cos(a-gap)));if(Math.abs(d-r)<15&&delta>.7)damage();}
 }
 // Small aimed pearls are emitted by actual dorsal organs on either side.
 t.shot-=dt;if(t.shot<=0&&t.phase!=='exposed'&&b.x>50&&b.x<W-50){
  const m=bossMount(b,TIDE_ORGANS[(t.cycle+Math.floor(b.age*2))%3]),a=Math.atan2(ship.y-m.y,ship.x-m.x);const speed=340+phase*35;
  hostile.push({x:m.x,y:m.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:6,c:'#97e9d9',kind:'water',launchAngle:a,bossShot:true});t.shot=(.65-phase*.1)*(sectors[level].salvoRestScale||1);
 }
}
function moveTideBoss(b,dt){
 const x=b.x,y=b.y,a=b.age*.28,target={x:W*.52+Math.cos(a)*W*.26,y:H*.48+Math.sin(a*1.45)*H*.21};
 driveBoss(b,target,dt,2.5,240);const facing=ship.x>b.x?Math.PI:0;b.turnYaw=(b.turnYaw||0)+clamp(facing-(b.turnYaw||0),-dt*2,dt*2);updateBossAttitude(b,dt,(b.x-x)/dt,(b.y-y)/dt);
}
function hitTideNode(s){if(!boss?.tide)return false;for(const p of boss.tide.pods){if(p.hp<=0)continue;if(Math.hypot(s.x-p.x,s.y-p.y)<17+s.r){p.hp-=s.damage;burst(p.x,p.y,p.hp<=0?'#e6ffbf':'#99dfcc',p.hp<=0?14:3);return true;}}return false;}
function drawTideEncounter(b){const t=b.tide;if(!t)return;ctx.save();
 for(const p of t.pods){if(p.hp<=0)continue;
  const glow=t.phase==='hold'&&t.age>5.4?1:.6;
  orb(p.x,p.y,23,'#7eeee0',glow);orb(p.x,p.y,10,'#d7ffd3',.95);
  healthBar(p.x,p.y-29,34,p.hp,p.max,'#a6f0d7');
  if(t.phase==='hold')for(let arm=0;arm<3;arm++){ctx.beginPath();for(let j=0;j<28;j++){const u=j/27,r=22+u*175,a=u*4+b.age*2+arm*TAU/3,x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.strokeStyle='#88dfd6';ctx.globalAlpha=.16;ctx.lineWidth=1.6;ctx.stroke();ctx.globalAlpha=1;}
  if(t.phase==='release'){const r=30+t.age*185,gap=Math.atan2(p.y-b.y,p.x-b.x);ctx.beginPath();ctx.arc(p.x,p.y,r,gap+.7,gap+TAU-.7);ctx.strokeStyle='#b9fff1';ctx.lineWidth=9;ctx.globalAlpha=.8;ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#f0fff9';ctx.stroke();ctx.globalAlpha=1;}
 }
 // Armor state is readable on the actual dorsal organs, not a giant bubble.
 for(const local of TIDE_ORGANS){const m=bossMount(b,local);orb(m.x,m.y,b.exposed>0?17:8,b.exposed>0?'#ffc176':'#87d9d2',.55+.2*Math.sin(b.age*5));}
 ctx.restore();
}
