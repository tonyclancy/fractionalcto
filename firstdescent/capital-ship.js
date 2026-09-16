/* Retained shipyard geometry. -X is the bow; -Z is the visible broadside. */
const capitalSiegeMeshes=(()=>{
 const metal=[84,99,108],armor=[115,129,134],edge=[170,176,166],dark=[23,35,44],recess=[10,20,28],brass=[158,124,77],hot=[246,160,79],cold=[91,202,224];
 const tint=(c,f)=>c.map(n=>Math.round(n*f));
 function build(){
  const mesh=[],parts=[],components=[];mesh.industrial=true;mesh.parts=parts;mesh.components=components;
  const face=(v,c,em=0)=>mesh.push({v,c,em,flex:0});
  const component=(name,start)=>components.push({name,start,end:mesh.length});
  function plate(points,z0,z1,c=metal,bevel=1){
   const start=mesh.length,cx=points.reduce((n,p)=>n+p[0],0)/points.length,cy=points.reduce((n,p)=>n+p[1],0)/points.length;
   const rim=points.map(p=>[p[0],p[1],z0+bevel]),back=points.map(p=>[p[0],p[1],z1]),top=points.map(p=>{const l=Math.hypot(p[0]-cx,p[1]-cy)||1,s=Math.max(.5,1-bevel/l);return[cx+(p[0]-cx)*s,cy+(p[1]-cy)*s,z0];});
   face(top,c);face(back.slice().reverse(),tint(c,.55));
   for(let i=0;i<points.length;i++){const j=(i+1)%points.length;face([top[i],top[j],rim[j],rim[i]],tint(c,1.18));face([rim[i],rim[j],back[j],back[i]],tint(c,.7));}
   component('beveled plate',start);
  }
  function box(x,y,z,w,h,d,c=metal,bevel=.55){const q=Math.min(w,h)*.16;plate([[x-w/2+q,y-h/2],[x+w/2-q,y-h/2],[x+w/2,y-h/2+q],[x+w/2,y+h/2-q],[x+w/2-q,y+h/2],[x-w/2+q,y+h/2],[x-w/2,y+h/2-q],[x-w/2,y-h/2+q]],z-d/2,z+d/2,c,Math.min(bevel,d*.35));}
  function hull(stations,c=metal,sides=10){
   const start=mesh.length,rings=stations.map(p=>Array.from({length:sides},(_,i)=>{const a=(i+.5)/sides*Math.PI*2;return[p[0],p[1]+Math.cos(a)*p[3],p[2]+Math.sin(a)*p[4]];}));
   face(rings[0].slice().reverse(),tint(c,.8));face(rings.at(-1),dark);
   for(let j=0;j<rings.length-1;j++)for(let i=0;i<sides;i++){const k=(i+1)%sides;face([rings[j][i],rings[j][k],rings[j+1][k],rings[j+1][i]],tint(c,.72+.18*(1+Math.sin(i*.8))));}
   component('closed hull',start);
  }
  function tube(x0,x1,y,z,r,c=metal,open=false,endRadius=r,sides=20){
   const start=mesh.length,ring=(x,rr)=>Array.from({length:sides},(_,i)=>{const a=i/sides*Math.PI*2;return[x,y+Math.cos(a)*rr,z+Math.sin(a)*rr];});
   const a=ring(x0,r),b=ring(x1,endRadius);
   for(let i=0;i<sides;i++){const j=(i+1)%sides;face([a[i],a[j],b[j],b[i]],i%5?c:tint(c,1.12));}
   face(b,dark);
   if(!open)face(a.slice().reverse(),c);
   else{
    const inner=ring(x0,r*.72),deep=ring(x0+(x1-x0)*.75,endRadius*.48);
    for(let i=0;i<sides;i++){const j=(i+1)%sides;face([a[j],a[i],inner[i],inner[j]],edge);face([inner[j],inner[i],deep[i],deep[j]],i%3?recess:dark);}
    face(deep.slice().reverse(),recess);
   }
   component(open?'deep recessed bore':'closed cylinder',start);
  }
  function annulus(x0,x1,y,z,outer,inner,c=metal,sides=24){
   const start=mesh.length,ring=(x,r)=>Array.from({length:sides},(_,i)=>{const a=i/sides*Math.PI*2;return[x,y+Math.cos(a)*r,z+Math.sin(a)*r];}),rings=[ring(x0,outer),ring(x1,outer),ring(x0,inner),ring(x1,inner)];
   for(let i=0;i<sides;i++){const j=(i+1)%sides;face([rings[0][i],rings[0][j],rings[1][j],rings[1][i]],c);face([rings[2][j],rings[2][i],rings[3][i],rings[3][j]],dark);face([rings[0][j],rings[0][i],rings[2][i],rings[2][j]],edge);face([rings[1][i],rings[1][j],rings[3][j],rings[3][i]],c);}
   component('hollow engine collar',start);
  }
  function rod(a,b,r,c=metal,sides=8){
   const start=mesh.length,d=b.map((v,i)=>v-a[i]),len=Math.hypot(...d)||1,t=d.map(v=>v/len),axis=Math.abs(t[2])>.8?[1,0,0]:[0,0,1],cross=(x,y)=>[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]];
   let u=cross(t,axis),l=Math.hypot(...u);u=u.map(v=>v/l);const v=cross(t,u),rings=[a,b].map(p=>Array.from({length:sides},(_,i)=>{const q=i/sides*Math.PI*2;return p.map((n,k)=>n+r*(u[k]*Math.cos(q)+v[k]*Math.sin(q)));}));
   face(rings[0].slice().reverse(),c);face(rings[1],c);for(let i=0;i<sides;i++){const j=(i+1)%sides;face([rings[0][i],rings[0][j],rings[1][j],rings[1][i]],c);}component('structural spar',start);
  }
  function part(name,start,pivot,axis,speed=0){const seen=new Set(),vertices=[];for(let i=start;i<mesh.length;i++)for(const v of mesh[i].v)if(!seen.has(v)){seen.add(v);vertices.push({v,rest:v.slice()});}const p={name,pivot,axis,speed,vertices};parts.push(p);return p;}
  function light(x,y,z,w,h,c=hot){const start=mesh.length;box(x,y,z,w,h,.7,c,.12);for(let i=start;i<mesh.length;i++)mesh[i].em=.75;}
  return{mesh,face,plate,box,hull,tube,annulus,rod,part,light};
 }
 const out={},h=build(),drives=[],guns=[];
 // Planetary gyroscope: compact pressure sphere, revolving segmented armor,
 // four braced weapon/drive arms. Deliberately no carrier deck or long prow.
 h.hull([[-63,0,0,8,10],[-46,0,0,28,30],[-18,0,0,40,43],[17,0,0,40,43],[45,0,0,28,30],[61,0,0,8,10]],dark,32);
 for(const side of [-1,1]){
  h.rod([-35,side*22,-2],[-12,side*53,-23],5,metal,12);
  h.rod([29,side*23,-4],[-12,side*53,-23],3,brass,10);
  h.hull([[42,side*17,0,8,10],[73,side*20,0,11,12],[99,side*20,0,7,9]],metal,12);
  h.tube(100,82,side*20,0,8,edge,true,9,20);
  drives.push({center:[100.5,side*20,0],axis:[1,0,0],radius:5});
  h.rod([-33,side*20,-8],[-83,side*14,-22],5,metal,12);
  h.plate([[-89,side*17],[-65,side*29],[-43,side*18],[-66,side*8]],-29,-20,[104,132,150],1);
  const start=h.mesh.length;h.tube(-116,-67,side*35,-17,4.3,edge,true,6,20);
  const gun=h.part('articulated lance '+side,start,[-63,side*35,-17],'recoil');gun.gun=[-116,side*35,-17];gun.gunRest=gun.gun.slice();guns.push(gun.gun);
 }
 for(const [radius,z,speed] of [[48,-45,.48],[35,-49,-.7]]){
  const start=h.mesh.length;
  for(let i=0;i<16;i++){
   const a=i*Math.PI/8,b=a+.32,inner=radius-7;
   h.plate([[Math.cos(a)*inner,Math.sin(a)*inner],[Math.cos(a)*radius,Math.sin(a)*radius],[Math.cos(b)*radius,Math.sin(b)*radius],[Math.cos(b)*inner,Math.sin(b)*inner]],z,z+5,i%4===0?brass:[101,136,155],.6);
   const x=Math.cos(a+.16)*(radius-3),y=Math.sin(a+.16)*(radius-3);h.light(x,y,z-.7,2,2,cold);
  }
  h.part('counter-rotating gyroscope '+radius,start,[0,0,z],'z',speed);
 }
 for(let i=0;i<9;i++){const x=-27+i*7;h.box(x,0,-46,4,22-Math.abs(i-4)*3,3,brass,.4);h.light(x,0,-48,1.2,7,cold);}
 h.mesh.dynamic=true;h.mesh.capitalHull=true;out.hull=h.mesh;out.drives=drives;out.guns=guns;

 for(const sign of [-1,1]){
  const id=sign<0?'dorsal':'ventral',y=sign*65,m=build();
  m.box(-8,sign*51,-23,47,22,27,dark,1);
  m.plate([[-37,y-12],[-27,y-16],[14,y-16],[24,y-6],[18,y+12],[-29,y+14]],-40,-13,armor,1.2);
  m.box(-10,y,-41,36,16,3,recess,.65);
  m.plate([[-31,y-10],[-6,y-12],[10,y-7],[7,y+8],[-30,y+8]],-44,-40,metal,.6);
  for(const side of [-1,1]){
   m.tube(-61,-9,y+side*5,-28,4.2,edge,true,5,20);
   for(const x of [-47,-32,-20])m.tube(x,x+2.6,y+side*5,-28,5.35,dark,true,5.35,16);
  }
  for(let i=0;i<8;i++){m.box(1+i*2.6,y,-45,1.05,17,2,brass,.15);if(i<4)m.light(-23+i*6,y+sign*10,-45,3,1.6,hot);}
  m.light(-17,y,-45.7,12,2.4,hot);out[id]=m.mesh;
  const wreck=build();wreck.box(-8,sign*51,-23,45,21,25,dark,1);wreck.box(-8,y,-22,47,17,22,recess,.9);
  for(let j=0;j<6;j++){
   const x=-30+j*8;wreck.plate([[x,y-9],[x+5,y-8],[x+7,y+7+(j%3)*2],[x+2,y+4]],-40-(j%2)*3,-30,j%2?metal:brass,.4);
   if(j%2===0)wreck.light(x+3,y,-36,2,4,hot);
  }
  out[id+'Wreck']=wreck.mesh;
 }
 for(const open of [false,true]){
  const m=build();m.tube(110,76,0,-8,15.5,dark,true,17,24);m.tube(110.5,102,0,-8,14,brass,true,14,24);
  for(let j=0;j<8;j++){const a=j*Math.PI/4;m.rod([80,Math.cos(a)*16,-8+Math.sin(a)*16],[105,Math.cos(a)*14,-8+Math.sin(a)*14],1.4,edge,8);}
  if(open){m.tube(104,99,0,-8,8,cold,false,7,24);m.tube(106,104,0,-8,4,hot,false,4,16);}
  else{m.box(110.9,0,-8,2.8,23,23,armor,.6);m.box(112.5,0,-8,.8,15,2.4,brass,.2);}
  for(const side of [-1,1])m.tube(116,85,side*21,-11,3.8,edge,true,4.6,18);
  out[open?'reactorOpen':'reactorClosed']=m.mesh;
 }
 for(const open of [false,true]){
  const m=build();m.tube(-96,-67,0,-25,16.7,dark,true,17,24);m.tube(-98,-89,0,-25,13,brass,true,13,24);
  for(const side of [-1,1]){
   const y=side*(open?16:6.5);m.box(-94,y,-25,9,12,26,metal,.9);m.box(-99,y,-25,1.5,8,21,armor,.45);
   m.light(-98,y,-39,6,1.3,open?cold:hot);
  }
  if(open){m.tube(-96,-86,0,-25,7.8,hot,false,7,24);m.tube(-97.3,-95,0,-25,4,cold,false,4,20);}
  out[open?'coreOpen':'coreClosed']=m.mesh;
 }
 return out;
})();

function animateCapitalHull(b){
 const design=capitalShipDesign(b),phase=Number.isFinite(b.propulsionTime)?b.propulsionTime:(b.age||0),core=b.siege?.nodes.find(n=>n.id==='core'),recoil=Math.min(1,(core?.muzzle||0)/.13)*3.6;
 for(const part of design.mesh.parts){
  const angle=phase*part.speed,c=Math.cos(angle),s=Math.sin(angle),p=part.pivot;
  for(const q of part.vertices){const r=q.rest,x=r[0]-p[0],y=r[1]-p[1],z=r[2]-p[2];
   q.v[0]=part.axis==='z'?p[0]+x*c-y*s:part.axis==='y'?p[0]+x*c+z*s:r[0]+(part.axis==='recoil'?recoil:0);
   q.v[1]=part.axis==='z'?p[1]+x*s+y*c:part.axis==='x'?p[1]+y*c-z*s:r[1];q.v[2]=part.axis==='x'?p[2]+y*s+z*c:part.axis==='y'?p[2]-x*s+z*c:r[2];
  }
  if(part.gun){part.gun[0]=part.gunRest[0]+recoil;part.gun[1]=part.gunRest[1];part.gun[2]=part.gunRest[2];}
 }
}

function isCapitalSiege(b=boss){return !!b&&!!sectors[level].siege&&bossIndex()===1;}
function capitalShipDesign(b){
 if(!b.capitalDesign){const base=machineBossDesigns[1];b.capitalDesign={...base,mesh:capitalSiegeMeshes.hull,drives:capitalSiegeMeshes.drives,guns:capitalSiegeMeshes.guns,mouth:[-116,0,-17],scale:3.4,bodyVolumes:[{center:[0,0,0],radii:[62,42,43]},{center:[74,0,0],radii:[33,28,22]},{center:[-78,0,-20],radii:[28,20,16]},{center:[-7,-61,-23],radii:[34,16,18]},{center:[-7,61,-23],radii:[34,16,18]}]};}
 return b.capitalDesign;
}
function initCapitalSiege(b){
 if(b.siege)return b.siege;
 const total=b.max||b.hp||1000,node=(id,local,radii,fraction,clock)=>({id,local,radii,radius:Math.max(radii[1],radii[2])*3.4,hp:total*fraction,max:total*fraction,hit:0,clock,warning:0,muzzle:0,heading:Math.PI,cycle:0,special:null});
 b.siege={stage:'batteries',age:0,orbGranted:false,pulses:[],nodes:[node('dorsal',[-12,-65,-28],[50,16,17],.15,2.8),node('ventral',[-12,65,-28],[50,16,17],.15,4.3),node('reactor',[103,0,-8],[13,15,15],.23,2.6),node('core',[-94,0,-25],[15,15,15],.47,2.4)]};
 b.hp=total;b.max=total;b.pass=null;b.charge=0;b.attack=null;b.special=Infinity;
 announce('GYRO SENTINEL · ARMOR LOCKED','DESTROY THE UPPER AND LOWER STABILIZER PODS');
 return b.siege;
}
function capitalNodePosition(b,n){return bossMount(b,n.local);}
function capitalNodeActive(b,n){const siege=initCapitalSiege(b);return n.hp>0&&(siege.stage==='batteries'?(n.id==='dorsal'||n.id==='ventral'):n.id===siege.stage);}
function capitalSiegeHint(b){const s=initCapitalSiege(b),special=s.nodes.find(n=>n.special)?.special;if(special)return special.kind==='purge'?'REACTOR PURGE · MOVE ABOVE OR BELOW ITS OPENING':'CAPACITOR DISCHARGE · DODGE THROUGH THE GAP';return s.stage==='batteries'?'STABILIZER PODS · '+s.nodes.slice(0,2).filter(n=>n.hp>0).length+' REMAIN':s.stage==='reactor'?'AFT REACTOR · FLY BEHIND · SPACE: REAR FIRE':'COMMAND CORE EXPOSED · ATTACK THE BOW';}
function capitalNodeShape(b,n,padding=0){
 const p=capitalNodePosition(b,n),scale=capitalShipDesign(b).scale,pose=bossFlightPose(b),axes=n.radii.map((r,i)=>{const a=[0,0,0];a[i]=r*scale+padding;return rotateVertex(a,pose.yaw,pose.roll,pose.pitch,0,0);});
 let xx=0,xy=0,yy=0;for(const a of axes){xx+=a[0]*a[0];xy+=a[0]*a[1];yy+=a[1]*a[1];}return{x:p.x,y:p.y,xx,xy,yy,det:xx*yy-xy*xy};
}
function capitalNodeIntersection(b,n,a,z,padding=0){
 const q=capitalNodeShape(b,n,padding),x=a.x-q.x,y=a.y-q.y,dx=z.x-a.x,dy=z.y-a.y;
 const A=q.yy*dx*dx-2*q.xy*dx*dy+q.xx*dy*dy,B=2*(q.yy*x*dx-q.xy*(x*dy+y*dx)+q.xx*y*dy),C=q.yy*x*x-2*q.xy*x*y+q.xx*y*y-q.det;
 if(C<=0)return 0;if(A<1e-12)return Infinity;const D=B*B-4*A*C;if(D<0)return Infinity;const t=(-B-Math.sqrt(D))/(2*A);return t>=0&&t<=1?t:Infinity;
}
function capitalFirstHullHit(b,a,z,padding=0){
 // Reuse the collider's cached projected ellipsoids. An analytic segment
 // intersection avoids dozens of hull queries for every homing missile.
 if(bossBodyHit(b,a.x,a.y,padding))return 0;let nearest=Infinity;
 for(const q of b.bodyHitVolumes||[]){
  const x=a.x-b.x-q.x,y=a.y-b.y-q.y,dx=z.x-a.x,dy=z.y-a.y,A=q.yy*dx*dx-2*q.xy*dx*dy+q.xx*dy*dy,B=2*(q.yy*x*dx-q.xy*(x*dy+y*dx)+q.xx*y*dy),C=q.yy*x*x-2*q.xy*x*y+q.xx*y*y-q.det;
  if(A<1e-12)continue;const D=B*B-4*A*C;if(D<0)continue;const t=(-B-Math.sqrt(D))/(2*A);if(t>=0&&t<=1)nearest=Math.min(nearest,t);
 }return nearest;
}
function capitalShotSideAllowed(b,n,s,a){const p=capitalNodePosition(b,n);return n.id!=='reactor'||(s.vx<0&&a.x>=p.x-n.radius*.35);}
function capitalShotTarget(s){
 if(!isCapitalSiege())return null;const b=boss;initCapitalSiege(b);let chosen=null,best=Infinity;
 for(const n of b.siege.nodes){if(!capitalNodeActive(b,n))continue;const p=capitalNodePosition(b,n),direction=s.direction||Math.sign(s.vx)||1;if((p.x-s.x)*direction<=0||!capitalShotSideAllowed(b,n,s,s))continue;
  const distance=Math.hypot(p.x-s.x,p.y-s.y),entry=capitalNodeIntersection(b,n,s,p,s.r||0),hull=capitalFirstHullHit(b,s,p,s.r||0);
  if(entry>hull+.01||distance>=best)continue;chosen=p;best=distance;
 }return chosen;
}
function capitalAdvanceStage(b){
 const s=b.siege;
 if(s.stage==='batteries'&&s.nodes.slice(0,2).every(n=>n.hp<=0)){
  s.stage='reactor';
  // A recovered weapon orb is guaranteed here, even after a checkpoint loss.
  // The player keeps their weapon and chooses when to move the orb to the rear.
  if(!weaponOrb.owned){weaponOrb.owned=true;weaponOrb.angle=0;weaponOrb.target=0;s.orbGranted=true;window.flightAudio?.pickup(ship.x);updateHUD();}
  announce('STABILIZER PODS DESTROYED','FLY AROUND THE HULL · SPACE: REAR FIRE · BREAK THE AFT REACTOR');
 }else if(s.stage==='reactor'&&s.nodes[2].hp<=0){s.stage='core';announce('REACTOR BREACHED · COMMAND CORE OPEN','RETURN TO THE BOW · SPACE SWITCHES THE WEAPON ORB');}
}
function capitalDamageNode(b,n,amount){
 if(!capitalNodeActive(b,n))return;const lost=Math.min(n.hp,Math.max(0,amount));n.hp-=lost;b.hp=b.siege.nodes.reduce((sum,node)=>sum+node.hp,0);n.hit=.1;const p=capitalNodePosition(b,n);
 if(n.hp<=0){n.warning=0;n.burst=0;n.special=null;explode(p.x,p.y,'#ffc27e',n.id==='core'?2.1:1.55,false);if(n.id==='core')for(const local of [[-45,-20,-10],[20,10,-10],[62,-25,-10]]){const breach=bossMount(b,local);explode(breach.x,breach.y,'#ffb869',1.35,false);}score+=n.id==='dorsal'||n.id==='ventral'?450:700;capitalAdvanceStage(b);}
 else burst(p.x,p.y,'#ffd799',3);
}
function hitCapitalSection(s){
 if(!isCapitalSiege())return false;const b=boss;initCapitalSiege(b);
 const prev=s.trail?.[s.trail.length-1],a=prev||{x:s.x-(s.vx||0)/120,y:s.y-(s.vy||0)/120},z={x:s.x,y:s.y},hull=capitalFirstHullHit(b,a,z,s.r||0);
 let node=null,tNode=Infinity;
 for(const n of b.siege.nodes){if(n.hp<=0)continue;const t=capitalNodeIntersection(b,n,a,z,s.r||0);if(t<tNode){tNode=t;node=n;}}
 if(node&&tNode<=hull+.015){
  if(capitalNodeActive(b,node)&&capitalShotSideAllowed(b,node,s,a))capitalDamageNode(b,node,bossDamage(s.damage));
  else terrainImpact(a.x+(z.x-a.x)*tNode,a.y+(z.y-a.y)*tNode,s.vx,s.vy);
  return true;
 }
 if(Number.isFinite(hull)){terrainImpact(a.x+(z.x-a.x)*hull,a.y+(z.y-a.y)*hull,s.vx,s.vy);return true;}return false;
}
function capitalBodyDamage(){return 0;}
function capitalNovaDamage(b,amount){
 if(!isCapitalSiege(b))return false;initCapitalSiege(b);const targets=b.siege.nodes.filter(n=>capitalNodeActive(b,n));
 // Nova damages only exposed sections and cannot trigger several stages at once.
 for(const n of targets)capitalDamageNode(b,n,amount/Math.max(1,targets.length));return true;
}
function moveCapitalShip(b,dt){
 initCapitalSiege(b);const oldX=b.x,oldY=b.y,age=b.age||0;
 // Destroyed stabilizers change the patrol into tighter, faster attack circuits.
 const phase=b.siege.stage==='core'?1.55:b.siege.stage==='reactor'?1.25:1;
 const orbit=age*.65*phase,thrust=Math.max(0,Math.sin(age*.7*phase))**6;const targetX=805+Math.cos(orbit)*82-thrust*(b.siege.stage==='core'?95:50),targetY=H*.5+Math.sin(orbit*2)*34;
 b.navVX=clamp((b.navVX||0)+((targetX-b.x)*2.1-(b.navVX||0)*2.9)*dt,-155,95);
 b.navVY=clamp((b.navVY||0)+((targetY-b.y)*2.6-(b.navVY||0)*3.2)*dt,-40,40);
 b.x+=b.navVX*dt;b.y+=b.navVY*dt;updateBossAttitude(b,dt,(b.x-oldX)/dt,(b.y-oldY)/dt);
}
function capitalGunMounts(b,n){
 const sy=n.id==='dorsal'?-65:65;
 const locals=n.id==='dorsal'||n.id==='ventral'?[[-61,sy-5,-28],[-61,sy+5,-28]]:n.id==='reactor'?[[116,-21,-11],[116,21,-11]]:capitalShipDesign(b).guns;
 const direction=n.id==='reactor'?1:-1;
 return locals.map(p=>{const a=bossMount(b,p),tip=bossMount(b,[p[0]+direction*20,p[1],p[2]]);a.heading=Math.atan2(tip.y-a.y,tip.x-a.x)+(n.aimOffset||0);a.heading=Math.atan2(Math.sin(a.heading),Math.cos(a.heading));a.baseX=a.x;a.baseY=a.y;a.x+=Math.cos(a.heading)*22.4;a.y+=Math.sin(a.heading)*22.4;return a;});
}
function capitalDischargeFrame(b,kind){
 const local=kind==='purge'?[109,0,-8]:[-97,0,-25],direction=kind==='purge'?1:-1,a=bossMount(b,local),tip=bossMount(b,[local[0]+direction*20,local[1],local[2]]);
 return{x:a.x,y:a.y,heading:Math.atan2(tip.y-a.y,tip.x-a.x)};
}
function capitalPurgeContact(frame,x,y,padding=14){const dx=x-frame.x,dy=y-frame.y,along=dx*Math.cos(frame.heading)+dy*Math.sin(frame.heading),across=-dx*Math.sin(frame.heading)+dy*Math.cos(frame.heading);return along>=-padding&&along<=300+padding&&Math.abs(across)<20+Math.max(0,along)*.11+padding;}
function capitalPulseGap(radius){return Math.min(.6,Math.max(.19,Math.asin(Math.min(.99,46/Math.max(1,radius)))));}
function capitalPulseContact(pulse,x,y,padding=14){
 const dx=x-pulse.x,dy=y-pulse.y,radius=Math.hypot(dx,dy),angle=Math.atan2(Math.sin(Math.atan2(dy,dx)-pulse.heading),Math.cos(Math.atan2(dy,dx)-pulse.heading)),edge=Math.asin(Math.min(1,padding/Math.max(1,radius)));
 return Math.abs(radius-pulse.r)<pulse.width+padding&&Math.abs(angle)<.82+edge&&Math.abs(angle-pulse.gap)>capitalPulseGap(pulse.r)-edge;
}
function updateCapitalDischarges(b,dt){
 const siege=b.siege;
 for(const node of siege.nodes){const a=node.special;if(!a||!capitalNodeActive(b,node))continue;const previous=a.age;a.age+=dt;
  if(previous<a.warning&&a.age>=a.warning){const frame=capitalDischargeFrame(b,a.kind);window.flightAudio?.laserBeam(a.kind==='purge'?a.duration:.35);if(a.kind==='pulse')siege.pulses.push({...frame,age:0,r:28,width:18,gap:a.gap,life:1.9});}
  if(a.kind==='purge'&&a.age>=a.warning&&a.age<a.warning+a.duration&&capitalPurgeContact(capitalDischargeFrame(b,a.kind),ship.x,ship.y))damage();
  if(a.age>=a.warning+a.duration)node.special=null;
 }
 for(const pulse of siege.pulses){pulse.age+=dt;pulse.r=28+pulse.age*510;if(capitalPulseContact(pulse,ship.x,ship.y))damage();}
 siege.pulses=siege.pulses.filter(p=>p.age<p.life);
}
function updateCapitalSiege(b,dt){
 const s=initCapitalSiege(b);s.age+=dt;b.charge=0;b.attack=null;b.special=Infinity;
 updateCapitalDischarges(b,dt);
 for(const n of s.nodes){n.hit=Math.max(0,n.hit-dt);n.muzzle=Math.max(0,n.muzzle-dt);if(!capitalNodeActive(b,n)||b.x>W-240||n.special)continue;
  if(n.target){const gun=capitalGunMounts(b,n)[0],axis=gun.heading-(n.aimOffset||0),desired=Math.atan2(n.target.y-gun.baseY,n.target.x-gun.baseX),offset=clamp(Math.atan2(Math.sin(desired-axis),Math.cos(desired-axis)),-.65,.65);n.aimOffset=(n.aimOffset||0)+clamp(offset-(n.aimOffset||0),-dt*2,dt*2);}
  if(n.warning>0){n.warning-=dt;if(n.warning<=0){n.burst=n.id==='core'?6:4;n.burstClock=0;}}
  if(n.burst>0){n.burstClock-=dt;if(n.burstClock<=0){const mounts=capitalGunMounts(b,n);n.lastGun=(n.burst-1)%mounts.length;const mount=mounts[n.lastGun],speed=n.id==='core'?880:n.id==='reactor'?780:810,seeking=n.id!=='reactor'&&n.cycle%3===0&&n.burst===1;
    hostile.push({x:mount.x,y:mount.y,vx:Math.cos(mount.heading)*speed,vy:Math.sin(mount.heading)*speed,r:n.id==='core'?8:7,kind:seeking?'seeker':'rocket',bossRound:true,scale:n.id==='core'?.95:.85,c:'#ffbd75',launchAngle:mount.heading});n.muzzle=.17;n.burst--;n.burstClock=n.id==='core'?.14:.17;window.flightAudio?.shot('missile',mount.x,true);
   }}else if(n.warning<=0){n.clock-=dt;if(n.clock<=0){n.cycle++;n.clock=n.id==='core'?1.9:2.15;n.heading=n.id==='reactor'?0:Math.PI;
    if(n.id==='reactor'&&n.cycle%2===0){n.special={kind:'purge',age:0,warning:1.15,duration:.76};window.flightAudio?.laserCharge();}
    else if(n.id==='core'&&n.cycle%2===0){n.special={kind:'pulse',age:0,warning:1.3,duration:.3,gap:(n.cycle%4===0?-1:1)*.28};window.flightAudio?.laserCharge();}
    else{n.target={x:ship.x,y:ship.y};n.warning=.8;}
   }}
 }
 const active=s.nodes.filter(n=>capitalNodeActive(b,n));b.siegeLoad=active.reduce((load,n)=>Math.max(load,n.special?Math.min(1,n.special.age/n.special.warning):n.warning>0?1-n.warning/.8:n.burst>0?1:0),0);b.siegeStrike=active.some(n=>n.burst>0||n.special&&n.special.age>=n.special.warning);
}
function drawCapitalDischarges(b){
 ctx.save();
 for(const node of b.siege.nodes){const a=node.special;if(!a)continue;const frame=capitalDischargeFrame(b,a.kind),charging=a.age<a.warning;
  ctx.save();ctx.translate(frame.x,frame.y);ctx.rotate(frame.heading);
  if(a.kind==='purge'){
   if(charging){orb(0,0,17+a.age/a.warning*17,'#ffd29c',.7);}
   else{const age=a.age-a.warning,fade=Math.min(1,age/.08,(a.duration-age)/.12);ctx.globalCompositeOperation='lighter';
    for(let i=0;i<10;i++){const along=((age*660+i*33)%330),width=16+along*.11,offset=Math.sin(age*23+i*2.1)*width*.18;ctx.globalAlpha=Math.max(0,fade)*(1-along/360)*.8;const plume=ctx.createLinearGradient(along-38,0,along+49,0);plume.addColorStop(0,'rgba(255,238,174,0)');plume.addColorStop(.3,'#ffe5b0');plume.addColorStop(.65,'#ffaa62');plume.addColorStop(1,'rgba(219,86,29,0)');ctx.fillStyle=plume;ctx.beginPath();ctx.moveTo(along-38,offset);ctx.bezierCurveTo(along-15,offset-width,along+23,offset-width*.6,along+49,offset);ctx.bezierCurveTo(along+23,offset+width*.7,along-15,offset+width,along-38,offset);ctx.fill();}
    orb(0,0,32,'#fff0c8',Math.max(0,fade)*.9);
   }
  }else{orb(0,0,12+Math.min(1,a.age/a.warning)*24,'#b9efff',.7);}
  ctx.restore();
 }
 for(const pulse of b.siege.pulses){const gap=capitalPulseGap(pulse.r),alpha=Math.min(1,pulse.age/.035,(pulse.life-pulse.age)/.3);ctx.globalAlpha=Math.max(0,alpha);ctx.lineCap='round';for(const [start,end] of [[-.82,Math.max(-.82,pulse.gap-gap)],[Math.min(.82,pulse.gap+gap),.82]]){if(end<=start)continue;for(const [width,color] of [[48,'rgba(105,187,245,.22)'],[25,'rgba(132,220,255,.75)'],[7,'#f2fdff']]){ctx.lineWidth=width;ctx.strokeStyle=color;ctx.beginPath();ctx.arc(pulse.x,pulse.y,pulse.r,pulse.heading+start,pulse.heading+end);ctx.stroke();}}}
 ctx.restore();
}
function drawCapitalSiege(b){
 const s=initCapitalSiege(b),pose=bossFlightPose(b),scale=capitalShipDesign(b).scale;
 const mesh=(m,hit=0)=>drawModel(m,b.x,b.y,scale,pose.yaw,pose.roll,pose.pitch,b.age,hit);
 for(const n of s.nodes){
  if(n.id==='dorsal'||n.id==='ventral')mesh(capitalSiegeMeshes[n.id+(n.hp<=0?'Wreck':'')],n.hit);
  else if(n.id==='reactor')mesh(capitalSiegeMeshes[s.stage==='batteries'?'reactorClosed':'reactorOpen'],n.hit);
  else mesh(capitalSiegeMeshes[s.stage==='core'?'coreOpen':'coreClosed'],n.hit);
 }
 for(const n of s.nodes)if(capitalNodeActive(b,n))for(const gun of capitalGunMounts(b,n))drawModel(meshes.cannon,gun.baseX,gun.baseY,.8,0,0,gun.heading-Math.PI,b.age,n.hit);
 // Flush modules before drawing their targeting information, keeping labels
 // clear while the actual objects remain solid GPU-rendered geometry.
 window.gpuModels?.flush(ctx);
 drawCapitalDischarges(b);
 ctx.save();ctx.textAlign='center';ctx.font='bold 10px "DM Sans",sans-serif';
 for(const n of s.nodes){if(n.hp<=0)continue;const p=capitalNodePosition(b,n),active=capitalNodeActive(b,n);
  if(active){const above=n.id==='dorsal'||n.id==='core',yy=p.y+(above?-1:1)*(n.radius+20);healthBar(p.x,yy,70,n.hp,n.max,'#ffc782');ctx.fillStyle='#ffe3bb';ctx.fillText(n.id==='dorsal'?'UPPER STABILIZER':n.id==='ventral'?'LOWER STABILIZER':n.id==='reactor'?'AFT REACTOR':'COMMAND CORE',p.x,yy+(above?-7:17));}

  if(n.muzzle>0){const gun=capitalGunMounts(b,n)[n.lastGun||0],strength=n.muzzle/.17;ctx.save();ctx.translate(gun.x,gun.y);ctx.rotate(gun.heading);orb(9,0,29,'#ffd399',strength*.85);ctx.globalAlpha=strength;poly([[0,-7],[39,0],[0,7]],'#fff0be');ctx.strokeStyle='#ffe8bb';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(11+(1-strength)*18,0,4,8+(1-strength)*14,0,0,TAU);ctx.stroke();ctx.restore();}
 }
 ctx.restore();
}
