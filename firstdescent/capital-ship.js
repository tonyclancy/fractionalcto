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
 // One long pressure hull, with a tapered armored prow and layered aft decks.
 h.hull([[-89,0,0,10,13],[-68,0,0,24,24],[-27,0,0,35,31],[29,0,0,38,32],[70,0,0,31,26],[96,0,0,22,22]],dark,12);
 h.hull([[-69,-33,0,8,14],[-25,-39,0,14,20],[38,-40,0,13,22],[78,-35,0,9,17]],metal,8);
 h.hull([[-35,29,0,8,15],[5,37,0,12,20],[57,37,0,12,21],[87,28,0,7,16]],metal,8);
 const panels=[
  [[-94,-12],[-62,-31],[-21,-34],[-31,-14],[-76,-3]],
  [[-91,11],[-63,27],[-26,31],[-14,16],[-63,5]],
  [[-20,-35],[24,-39],[46,-26],[27,-14],[-31,-15]],
  [[-18,17],[22,15],[55,28],[36,38],[-12,31]],
  [[35,-27],[69,-30],[91,-20],[79,-5],[49,-7]],
  [[45,7],[82,3],[95,19],[79,31],[56,28]]
 ];
 panels.forEach((p,i)=>h.plate(p,-35-(i%2)*2,-24,i<2?armor:metal,1.6));
 // Broad ceramic armor inlays establish a few readable shapes before the fine
 // engineering details. The luminous seams sit inside dark recessed channels.
 const ceramic=[157,165,159],navy=[35,58,76];
 h.plate([[-88,-12],[-64,-25],[-42,-29],[-48,-20],[-76,-8]],-39,-35,ceramic,.7);
 h.plate([[-85,11],[-62,22],[-36,25],[-43,18],[-72,7]],-41,-37,navy,.75);
 h.plate([[-19,-31],[13,-35],[29,-29],[15,-23],[-23,-23]],-39.3,-35,navy,.85);
 h.plate([[-9,22],[19,20],[37,28],[27,33],[-7,28]],-42,-38,ceramic,.6);
 h.plate([[53,-23],[70,-25],[83,-18],[77,-11],[54,-14]],-39,-35,ceramic,.7);
 h.plate([[59,13],[80,9],[87,18],[76,25],[63,22]],-41,-36,navy,.65);
 for(const [a,b] of [
  [[-80,-7,-39.7],[-47,-17,-39.7]],
  [[-36,-19,-39.7],[9,-19,-39.7]],
  [[17,-19,-40],[42,-11,-40]],
  [[-72,10,-42],[-45,18,-42]],
  [[-33,17,-42],[5,15,-42]],
  [[34,17,-42],[59,25,-42]]
 ]){
  h.rod(a,b,1.55,recess,6);const start=h.mesh.length;
  h.rod(a.map((v,i)=>i===2?v-.65:v),b.map((v,i)=>i===2?v-.65:v),.52,cold,6);
  for(let i=start;i<h.mesh.length;i++)h.mesh[i].em=.65;
 }
 // The dark service trench is recessed between armor banks, with separate
 // conduits and maintenance covers that give the visible broadside scale.
 h.box(-7,0,-33,118,20,4,recess);h.rod([-58,-10,-38],[56,-10,-38],1.45,edge);h.rod([-59,11,-38],[59,11,-38],1.5,brass);
 for(let i=0;i<13;i++){
  const x=-54+i*8;h.box(x,-1,-37,5.8,11+(i%3),3,i%4===0?brass:dark,.45);
  h.box(x,1,-39,3.8,6,.8,i%4===0?edge:metal,.2);
  if(i%3===0)h.light(x,-6,-40,3,1.2,cold);
 }
 h.plate([[-44,-29],[-9,-34],[-15,-25],[-40,-21]],-39,-35,edge,.6);
 h.plate([[6,23],[31,25],[37,33],[4,29]],-40,-36,armor,.65);
 // Two inset heat exchanger beds have deep shadows and separate copper fins.
 // Their asymmetric covers distinguish the bow service deck from the engines.
 for(const [cx,cy,width] of [[-25,-42,30],[30,42,35]]){
  h.box(cx,cy,-20,width+5,9,13,navy,.7);
  h.box(cx,cy,-28,width,6,2,recess,.35);
  for(let i=0;i<7;i++){
   const x=cx-width*.42+i*width*.14;
   h.plate([[x-1,cy-3],[x+.35,cy-3],[x+2.2,cy+3],[x+.8,cy+3]],-31,-27,i%3===0?brass:edge,.22);
  }
 }
 // Deliberate broadside panel seams, fasteners, docking pads and heat exchangers.
 for(const sign of [-1,1]){
  for(let i=0;i<11;i++){const x=-57+i*12,y=sign*(20+Math.sin((i/10)*Math.PI)*10);h.box(x,y,-38,4,1.2,1.2,edge,.15);h.box(x+3,y+sign*3,-38,.95,.95,1,brass,.12);}
  for(let i=0;i<8;i++){h.box(42+i*4,sign*18,-38,1.4,9,2.5,dark,.15);h.box(42+i*4,sign*18,-40,.65,7,.7,edge,.1);}
  h.rod([-25,sign*30,-17],[-9,sign*55,-26],6.5,dark);h.rod([15,sign*31,-17],[5,sign*56,-26],4.6,metal);
  h.rod([-29,sign*32,-23],[-12,sign*52,-30],1.8,brass);
 }
 // An offset command tower is part of the aft superstructure, not an eye.
 h.plate([[23,-35],[28,-48],[52,-49],[65,-39],[57,-31]],-42,-18,dark,1.2);
 h.plate([[29,-38],[32,-46],[52,-46],[60,-39],[53,-35]],-47,-39,armor,.75);
 h.box(44,-41,-48.5,26,4,1.8,recess,.25);
 for(let i=0;i<7;i++)h.light(33+i*3.5,-41,-49.8,2.2,1.3,hot);
 h.plate([[31,-46],[54,-46],[59,-43],[56,-42],[32,-43]],-49,-45,navy,.4);
 h.plate([[30,-38],[53,-36],[59,-39],[61,-35],[49,-32],[27,-35]],-45,-40,metal,.6);
 for(let i=0;i<5;i++)h.light(32+i*5,-35,-45.6,2.3,.85,hot);
 h.rod([57,-39,-35],[66,-51,-33],.7,edge,6);h.rod([64,-43,-31],[72,-49,-31],.55,brass,6);
 h.light(66,-51,-34,1.8,1.1,cold);
 h.box(43,-48,-29,20,3,17,metal,.6);h.rod([44,-48,-25],[44,-56,-25],1.1,edge);
 const sensorStart=h.mesh.length;h.box(44,-56,-25,13,2.1,4.3,dark,.3);h.light(44,-57.2,-27,8,.9,cold);h.part('bridge scanner',sensorStart,[44,-56,-25],'y',.45);
 // Four independently built engine bells surround the recessed aft reactor.
 for(const [i,y,z,r,x] of [[0,-31,7,11.5,106],[1,31,7,11.5,106],[2,-20,-28,7.8,112],[3,20,-28,7.8,112]]){
  h.hull([[57,y*.8,z*.7,r*.72,r*.8],[82,y,z,r*1.1,r*1.1],[x-8,y,z,r,r]],metal,10);
  h.tube(x,x-29,y,z,r,dark,true,r*.68,24);
  h.annulus(x-3,x-5,y,z,r*1.035,r*.76,brass,24);
  // The collar is hollow too: a second genuine bore leaves the outlet open.
  h.tube(x+.4,x-8,y,z,r*.96,edge,true,r*.82,24);
  for(let j=0;j<6;j++){const a=j*Math.PI/3;h.rod([77,y+Math.cos(a)*r*1.06,z+Math.sin(a)*r*1.06],[x-6,y+Math.cos(a)*r*1.02,z+Math.sin(a)*r*1.02],.75,edge,6);}
  // A black cooling jacket and hot ceramic inserts make each drive a complete
  // machine when seen side-on, even while the actual outlet faces away.
  h.plate([[70,y-r*.5],[82,y-r*.68],[x-9,y-r*.43],[x-9,y+r*.45],[80,y+r*.7],[70,y+r*.5]],z-r*1.13,z-r*.75,navy,.55);
  for(let j=0;j<3;j++)h.light(80+j*5,y,z-r*1.2,2.1,r*.7,j===1?hot:cold);
  const fanStart=h.mesh.length,fanX=x-4.7;
  for(let j=0;j<7;j++){const a=j*Math.PI*2/7,cy=y+Math.cos(a)*r*.37,cz=z+Math.sin(a)*r*.37;h.rod([fanX,y,z],[fanX,cy,cz],.6,cold,6);}
  h.tube(fanX+.5,fanX-1,y,z,r*.18,hot,false,r*.18,12);
  for(let j=fanStart;j<h.mesh.length;j++)h.mesh[j].em=.35;
  h.part('engine turbine '+i,fanStart,[fanX,y,z],'x',i%2?-3.1:2.8);
  drives.push({center:[x+.5,y,z],axis:[1,0,0],radius:r*.53});
 }
 // The forward batteries are rooted in armored galleries; their existing
 // muzzle coordinates stay unchanged for the final core defense pattern.
 for(const side of [-1,1]){
  h.hull([[-40,side*31,-14,9,10],[-68,side*35,-17,10,11],[-83,side*35,-17,7,8]],dark,8);
  h.plate([[-83,side*35-9],[-47,side*35-10],[-36,side*35],[-50,side*35+10],[-83,side*35+8]],-32,-21,metal,.8);
  const start=h.mesh.length;h.tube(-116,-63,side*35,-17,4.4,edge,true,5.2,20);
  for(const x of [-108,-97,-86])h.tube(x,x+2,side*35,-17,5.5,dark,true,5.5,20);
  const part=h.part('bow gun '+side,start,[-63,side*35,-17],'recoil');part.gun=[-116,side*35,-17];part.gunRest=part.gun.slice();guns.push(part.gun);
 }
 h.light(-73,-20,-34,4,1.4,cold);h.light(75,25,-31,3,1.6,hot);
 // Layered bow armor, recessed docking ports and vented machinery add depth
 // without changing the flight corridor or collidable hull dimensions.
 for(const sign of [-1,1]){
  for(let i=0;i<5;i++){
   const x=-70+i*19,y=sign*(24+Math.sin(i*.7)*4);
   h.plate([[x-8,y-4],[x+7,y-6],[x+10,y+2],[x-5,y+5]],-44,-39,i%2?navy:ceramic,.65);
   h.rod([x-5,y,-45],[x+5,y-1,-45],.55,brass,6);
  }
  h.box(13,sign*14,-42,25,7,5,recess,.6);
  for(let j=0;j<6;j++)h.box(3+j*4,sign*14,-45,1.3,5,1,metal,.2);
  h.light(29,sign*14,-44,2,5,hot);
 }
 h.plate([[-106,-9],[-79,-18],[-61,-16],[-82,-4]],-32,-22,navy,1);
 h.plate([[-106,9],[-79,18],[-61,16],[-82,4]],-33,-23,ceramic,1);
 for(let j=0;j<4;j++){h.box(-47+j*7,0,-43,4,8,4,dark,.5);h.light(-47+j*7,-2,-46,2,1,cold);}
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
   q.v[0]=part.axis==='y'?p[0]+x*c+z*s:r[0]+(part.axis==='recoil'?recoil:0);
   q.v[1]=part.axis==='x'?p[1]+y*c-z*s:r[1];q.v[2]=part.axis==='x'?p[2]+y*s+z*c:part.axis==='y'?p[2]-x*s+z*c:r[2];
  }
  if(part.gun){part.gun[0]=part.gunRest[0]+recoil;part.gun[1]=part.gunRest[1];part.gun[2]=part.gunRest[2];}
 }
}

function isCapitalSiege(b=boss){return !!b&&!!sectors[level].siege&&bossIndex()===1;}
function capitalShipDesign(b){
 if(!b.capitalDesign){const base=machineBossDesigns[1];b.capitalDesign={...base,mesh:capitalSiegeMeshes.hull,drives:capitalSiegeMeshes.drives,guns:capitalSiegeMeshes.guns,mouth:[-116,0,-17],scale:3.4,bodyVolumes:[...base.bodyVolumes,{center:[-7,-61,-23],radii:[34,16,18]},{center:[-7,61,-23],radii:[34,16,18]}]};}
 return b.capitalDesign;
}
function initCapitalSiege(b){
 if(b.siege)return b.siege;
 const total=b.max||b.hp||1000,node=(id,local,radii,fraction,clock)=>({id,local,radii,radius:Math.max(radii[1],radii[2])*3.4,hp:total*fraction,max:total*fraction,hit:0,clock,warning:0,muzzle:0,heading:Math.PI,cycle:0,special:null});
 b.siege={stage:'batteries',age:0,orbGranted:false,pulses:[],nodes:[node('dorsal',[-12,-65,-28],[50,16,17],.15,2.8),node('ventral',[-12,65,-28],[50,16,17],.15,4.3),node('reactor',[103,0,-8],[13,15,15],.23,2.6),node('core',[-94,0,-25],[15,15,15],.47,2.4)]};
 b.hp=total;b.max=total;b.pass=null;b.charge=0;b.attack=null;b.special=Infinity;
 announce('CAPITAL SHIP · ARMORED HULL','DESTROY THE UPPER AND LOWER DECK BATTERIES');
 return b.siege;
}
function capitalNodePosition(b,n){return bossMount(b,n.local);}
function capitalNodeActive(b,n){const siege=initCapitalSiege(b);return n.hp>0&&(siege.stage==='batteries'?(n.id==='dorsal'||n.id==='ventral'):n.id===siege.stage);}
function capitalSiegeHint(b){const s=initCapitalSiege(b),special=s.nodes.find(n=>n.special)?.special;if(special)return special.kind==='purge'?'REACTOR PURGE · MOVE ABOVE OR BELOW ITS OPENING':'CAPACITOR DISCHARGE · FOLLOW THE MARKED GAP';return s.stage==='batteries'?'DECK BATTERIES · '+s.nodes.slice(0,2).filter(n=>n.hp>0).length+' REMAIN':s.stage==='reactor'?'AFT REACTOR · FLY BEHIND · SPACE: REAR FIRE':'COMMAND CORE EXPOSED · ATTACK THE BOW';}
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
  announce('DECK BATTERIES DESTROYED','FLY AROUND THE HULL · SPACE: REAR FIRE · BREAK THE AFT REACTOR');
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
 const targetX=820+Math.sin(age*.19)*42,targetY=H*.5+Math.sin(age*.26)*26;
 b.navVX=clamp((b.navVX||0)+((targetX-b.x)*2.1-(b.navVX||0)*2.9)*dt,-135,80);
 b.navVY=clamp((b.navVY||0)+((targetY-b.y)*2.6-(b.navVY||0)*3.2)*dt,-30,30);
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
  if(n.burst>0){n.burstClock-=dt;if(n.burstClock<=0){const mounts=capitalGunMounts(b,n);n.lastGun=(n.burst-1)%mounts.length;const mount=mounts[n.lastGun],speed=n.id==='core'?735:n.id==='reactor'?650:630;
    hostile.push({x:mount.x,y:mount.y,vx:Math.cos(mount.heading)*speed,vy:Math.sin(mount.heading)*speed,r:n.id==='core'?12:11,kind:'rocket',bossRound:true,scale:n.id==='core'?1.48:1.26,c:'#ffbd75',launchAngle:mount.heading});n.muzzle=.17;n.burst--;n.burstClock=n.id==='core'?.14:.17;window.flightAudio?.shot('missile',mount.x,true);
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
   if(charging){ctx.fillStyle='rgba(255,171,92,.15)';ctx.strokeStyle='#ffca90';ctx.lineWidth=2;ctx.setLineDash([8,11]);ctx.beginPath();ctx.moveTo(0,-20);ctx.lineTo(300,-53);ctx.lineTo(300,53);ctx.lineTo(0,20);ctx.closePath();ctx.fill();ctx.stroke();ctx.setLineDash([]);orb(0,0,17+a.age/a.warning*17,'#ffd29c',.7);}
   else{const age=a.age-a.warning,fade=Math.min(1,age/.08,(a.duration-age)/.12);ctx.globalCompositeOperation='lighter';
    for(let i=0;i<10;i++){const along=((age*660+i*33)%330),width=16+along*.11,offset=Math.sin(age*23+i*2.1)*width*.18;ctx.globalAlpha=Math.max(0,fade)*(1-along/360)*.8;const plume=ctx.createLinearGradient(along-38,0,along+49,0);plume.addColorStop(0,'rgba(255,238,174,0)');plume.addColorStop(.3,'#ffe5b0');plume.addColorStop(.65,'#ffaa62');plume.addColorStop(1,'rgba(219,86,29,0)');ctx.fillStyle=plume;ctx.beginPath();ctx.moveTo(along-38,offset);ctx.bezierCurveTo(along-15,offset-width,along+23,offset-width*.6,along+49,offset);ctx.bezierCurveTo(along+23,offset+width*.7,along-15,offset+width,along-38,offset);ctx.fill();}
    orb(0,0,32,'#fff0c8',Math.max(0,fade)*.9);
   }
  }else{const gap=capitalPulseGap(360);ctx.strokeStyle='#ffa98f';ctx.globalAlpha=.4;ctx.lineWidth=1.5;ctx.setLineDash([7,11]);for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(side*.82)*330,Math.sin(side*.82)*330);ctx.stroke();}ctx.strokeStyle='#a5ffe0';for(const side of [-1,1]){const angle=a.gap+side*gap;ctx.beginPath();ctx.moveTo(Math.cos(angle)*55,Math.sin(angle)*55);ctx.lineTo(Math.cos(angle)*360,Math.sin(angle)*360);ctx.stroke();}ctx.setLineDash([]);ctx.globalAlpha=1;orb(0,0,12+Math.min(1,a.age/a.warning)*24,'#b9efff',.7);}
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
  if(active){const above=n.id==='dorsal'||n.id==='core',yy=p.y+(above?-1:1)*(n.radius+20);healthBar(p.x,yy,70,n.hp,n.max,'#ffc782');ctx.fillStyle='#ffe3bb';ctx.fillText(n.id==='dorsal'?'UPPER BATTERY':n.id==='ventral'?'LOWER BATTERY':n.id==='reactor'?'AFT REACTOR':'COMMAND CORE',p.x,yy+(above?-7:17));}
  if(n.warning>0){ctx.strokeStyle='#f5a973';ctx.globalAlpha=.25+.35*(1-n.warning/.8);ctx.lineWidth=2;ctx.setLineDash([7,12]);for(const gun of capitalGunMounts(b,n)){ctx.beginPath();ctx.moveTo(gun.x,gun.y);ctx.lineTo(gun.x+Math.cos(gun.heading)*W,gun.y+Math.sin(gun.heading)*W);ctx.stroke();}ctx.setLineDash([]);ctx.globalAlpha=1;}
  if(n.muzzle>0){const gun=capitalGunMounts(b,n)[n.lastGun||0],strength=n.muzzle/.17;ctx.save();ctx.translate(gun.x,gun.y);ctx.rotate(gun.heading);orb(9,0,29,'#ffd399',strength*.85);ctx.globalAlpha=strength;poly([[0,-7],[39,0],[0,7]],'#fff0be');ctx.strokeStyle='#ffe8bb';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(11+(1-strength)*18,0,4,8+(1-strength)*14,0,0,TAU);ctx.stroke();ctx.restore();}
 }
 ctx.restore();
}
