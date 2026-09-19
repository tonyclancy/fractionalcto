/* Retained shipyard geometry. -X is the bow; -Z is the visible broadside. */
const capitalSiegeMeshes=(()=>{
 const metal=[84,99,108],armor=[115,129,134],edge=[170,176,166],dark=[23,35,44],recess=[10,20,28],brass=[158,124,77],hot=[246,160,79],cold=[91,202,224];
 const tint=(c,f)=>c.map(n=>Math.round(n*f));
 function build(){
  const mesh=[],parts=[],components=[];mesh.industrial=true;mesh.capitalSurface=true;mesh.parts=parts;mesh.components=components;
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
 // Reference: design/sector-2-excavator-concept.png. Solid overlapping shells
 // surround a recessed engine chassis; each panel has its own beveled volume.
 h.hull([[-87,0,0,7,12],[-50,0,0,23,25],[0,0,0,33,36],[48,0,0,28,31],[83,0,0,17,22]],dark,20);
 function shell(points,z,depth,color){
  const start=h.mesh.length;h.plate(points,z,z+depth,color,1.3);
  const seen=new Set();for(let i=start;i<h.mesh.length;i++)for(const v of h.mesh[i].v)if(!seen.has(v)){seen.add(v);v[2]+=Math.abs(v[1])*.26+Math.abs(v[0])*.045;}
 }
 for(const side of [-1,1]){
  const mirror=p=>p.map(([x,y])=>[x,y*side]);
  // Long split mandibles, stepped shoulders and layered rear heat shields.
  shell(mirror([[-112,9],[-72,33],[-30,43],[-12,29],[-48,14]]),-37,9,[108,113,111]);
  shell(mirror([[-93,13],[-62,29],[-34,33],[-24,27],[-57,18]]),-40,4,[134,136,128]);
  shell(mirror([[-31,44],[0,48],[25,34],[10,23],[-12,28]]),-40,10,[103,111,110]);
  shell(mirror([[4,47],[39,43],[56,25],[31,20],[22,32]]),-36,10,[119,123,115]);
  shell(mirror([[41,39],[73,33],[83,16],[61,17]]),-30,8,[89,98,97]);
  // Rear-facing matching armor gives the hull real thickness during banking.
  h.hull([[-102,side*12,7,2,3],[-56,side*26,8,9,16],[0,side*34,6,11,20],[48,side*27,5,8,17],[75,side*19,3,3,8]],metal,10);
  h.rod([-42,side*13,-25],[64,side*13,-24],2.6,dark,10);
  h.rod([-38,side*16,-27],[20,side*16,-29],1,brass,8);
  for(let j=0;j<7;j++){const x=-53+j*18,y=side*(x<0?28:34);h.tube(x,x+3,y,-33,1.4,edge,false,1.4,8);}
  // Articulated pod spars: broad load-bearing upper arm and polished piston.
  h.rod([15,side*29,-9],[-2,side*51,-23],4.1,dark,12);
  h.rod([35,side*23,-12],[7,side*52,-23],2,brass,10);
  h.rod([31,side*27,-12],[11,side*49,-23],.9,edge,8);
  h.box(-3,side*49,-26,11,10,10,metal,1);
  // Integrated vector engines with recessed bores, ring ribs and armor cowls.
  h.hull([[54,side*20,0,9,13],[81,side*20,0,13,16],[100,side*20,0,10,13]],metal,16);
  h.tube(103,83,side*20,0,9,edge,true,8,20);
  for(const x of [76,83,90,97])h.annulus(x,x+2,side*20,0,13,10,dark,16);
  drives.push({center:[103.5,side*20,0],axis:[1,0,0],radius:6});
  const turbineStart=h.mesh.length;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;h.rod([96,side*20+Math.cos(a)*5,Math.sin(a)*5],[99,side*20+Math.cos(a+.4)*8,Math.sin(a+.4)*8],.65,brass,6);}
  h.part('recessed engine impeller '+side,turbineStart,[97,side*20,0],'x',side*5);
  // Cannon barrels are recessed into the armored mandibles, with recoil mounts.
  const start=h.mesh.length;h.tube(-116,-67,side*35,-17,2.5,dark,true,3.5,16);
  for(const x of [-99,-87,-75])h.tube(x,x+2,side*35,-17,3.8,metal,false,3.8,12);
  const gun=h.part('recessed prow cannon '+side,start,[-63,side*35,-17],'recoil');gun.gun=[-116,side*35,-17];gun.gunRest=gun.gun.slice();guns.push(gun.gun);
 }
 // Exposed ribbed heat exchanger in the deep central machinery channel.
 h.box(13,0,-37,64,25,8,recess,1);
 for(let i=0;i<13;i++){const x=-15+i*4.5;h.box(x,0,-43,1.4,23,9,brass,.3);h.box(x,0,-48,1.6,17,1,[114,82,53],.2);}
 for(const side of [-1,1]){
  h.rod([-26,side*11,-41],[50,side*11,-37],1.4,metal,10);
  for(let i=0;i<4;i++){const x=-68+i*32;h.box(x,side*19,-38,10,5,4,dark,.5);h.light(x,side*19,-40.5,5,.8,hot);}
 }
 // Nested access panels and longitudinal rails give armor a readable scale.
 for(const side of [-1,1])for(let i=0;i<7;i++){
  const x=-66+i*19,y=side*(27+Math.sin(i*.6)*9),z=-42+Math.abs(y)*.26+Math.abs(x)*.045;
  h.plate([[x-6,y-2],[x+4,y-3],[x+7,y+1],[x-4,y+3]],z-1,z,[62,71,72],.3);
  h.rod([x-5,y,z-1.4],[x+3,y-.8,z-1.4],.35,edge,6);
 }
 for(const side of [-1,1])for(let i=0;i<6;i++){
  const x=-52+i*19,y=side*8;h.tube(x,x+10,y,-34,2.4,metal,false,2.4,10);
  h.tube(x+2,x+4,y,-34,3.1,brass,false,3.1,10);
 }
 // A fully built opposite broadside remains visible after the ship turns bow
 // to stern. Layered armor and lit service trenches avoid a blank underside.
 for(const side of [-1,1]){
  const mirror=p=>p.map(([x,y])=>[x,y*side]);
  h.plate(mirror([[-104,8],[-73,29],[-23,39],[8,30],[-32,11]]),29,38,[96,108,111],1.15);
  h.plate(mirror([[-17,39],[28,40],[63,28],[48,12],[2,20]]),30,40,[110,121,121],1.1);
  h.plate(mirror([[47,27],[82,23],[91,10],[64,8]]),27,36,[76,90,94],.9);
  h.rod([-74,side*18,42],[70,side*18,40],1.65,edge,10);
  h.rod([-58,side*22,43],[48,side*27,41],.65,brass,8);
  for(let i=0;i<6;i++){
   const x=-62+i*24,y=side*(25+Math.sin(i*.85)*5);
   h.box(x,y,41,11,5,4,dark,.45);h.light(x,y,43.4,5,.9,i%2?cold:hot);
  }
 }
 h.box(10,0,35,68,24,9,recess,1);
 for(let i=0;i<11;i++){const x=-14+i*5;h.box(x,0,41,1.5,21,8,brass,.25);h.box(x,0,46,1.4,14,1,[103,79,57],.15);}
 // Small rigid dorsal sensor tracks the flight direction independently.
 const scanner=h.mesh.length;h.hull([[-25,-5,-31,2,3],[-9,-5,-35,4,5],[5,-5,-34,3,4]],metal,8);h.light(-20,-5,-39,6,1,hot);h.part('recessed targeting scanner',scanner,[-7,-5,-32],'y',.3);
 h.mesh.dynamic=true;h.mesh.capitalHull=true;h.mesh.reverseDetailed=true;out.hull=h.mesh;out.drives=drives;out.guns=guns;

 for(const sign of [-1,1]){
  const id=sign<0?'dorsal':'ventral',y=sign*65,m=build();
  m.hull([[-42,y,-23,5,7],[-26,y,-23,12,14],[9,y,-23,11,13],[23,y,-23,5,8]],dark,10);
  m.plate([[-42,y-6],[-26,y-12],[9,y-10],[24,y-2],[6,y+10],[-29,y+10]],-38,-26,[106,113,111],1);
  m.plate([[-32,y-5],[-20,y-8],[1,y-6],[7,y+3],[-27,y+5]],-40,-36,[128,133,124],.6);
  for(const side of [-1,1]){
   m.tube(-61,-9,y+side*5,-28,2.5,metal,true,3,16);
   for(const x of [-47,-32,-20])m.tube(x,x+2.6,y+side*5,-28,3.3,dark,true,3.3,12);
  }
  for(let i=0;i<8;i++){m.box(1+i*2.6,y,-45,1.05,17,2,brass,.15);if(i<4)m.light(-23+i*6,y+sign*10,-45,3,1.6,hot);}
  m.light(-17,y,-45.7,12,2.4,hot);out[id]=m.mesh;
  const wreck=build();
  for(const z of [-32,-17]){wreck.rod([-31,y-sign*10,z],[14,y-sign*10,z],1.9,dark);for(const x of [-28,-12,5])wreck.rod([x,sign*43,z],[x+5,y+sign*5,z-3],1.4,metal);}
  wreck.rod([-27,y,-27],[12,y,-27],2.2,brass);
  for(let j=0;j<6;j++){
   const x=-30+j*8;wreck.plate([[x,y-sign*9],[x+6,y-sign*8],[x+8,y+sign*(j%3+1)],[x+4,y-sign*3],[x+1,y+sign*5]],-35-(j%2)*3,-31,j%2?dark:metal,.4);
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
  const m=build();m.tube(-96,-67,0,-25,10,dark,true,12,24);m.tube(-98,-89,0,-25,8,brass,true,8,24);
  for(const side of [-1,1]){
   const y=side*(open?13:5);m.box(-94,y,-25,7,8,16,metal,.9);m.box(-99,y,-25,1.5,5,13,armor,.45);
   m.light(-98,y,-39,6,1.3,open?cold:hot);
  }
  if(open){m.tube(-96,-86,0,-25,7.8,hot,false,7,24);m.tube(-97.3,-95,0,-25,4,cold,false,4,20);}
  out[open?'coreOpen':'coreClosed']=m.mesh;
 }
 // Retained damage states: scorched armor and raised, torn breach rims.
 // The marks are real geometry on both broadsides, so they follow every roll.
 for(const key of ['dorsal','ventral','reactorOpen','coreOpen']){
  const base=out[key],pod=key==='dorsal'||key==='ventral',y=key==='dorsal'?-65:key==='ventral'?65:0,x=pod?-12:key==='reactorOpen'?99:-91,z=pod?-47:key==='reactorOpen'?-25:-41;
  for(let stage=1;stage<=3;stage++){
   const m=build();
   // Share the original module; only the small breach geometry is retained
   // per damage state. This keeps all variants inside the mesh budget.
   m.mesh.damageBase=base;
   for(const side of [-1,1])for(let j=0;j<stage;j++){
    const cx=x+(j-1)* (pod?12:4),cy=y+(j%2?4:-3),zz=side<0?z:-z*.65,r=pod?7+j:4+j;
    const rim=Array.from({length:9},(_,i)=>{const a=i/9*Math.PI*2,rr=r*(i%2?.7:1.15);return[cx+Math.cos(a)*rr*1.65,cy+Math.sin(a)*rr,zz];});
    m.face(side<0?rim:rim.slice().reverse(),[13,16,18]);
    for(let i=0;i<rim.length;i++){const a=rim[i],b=rim[(i+1)%rim.length],tip=[(a[0]+b[0])*.5,(a[1]+b[1])*.5,zz+side*(3.5+i%3*1.8)];m.face([a,b,tip],i%3?[93,66,47]:[175,110,61]);}
    for(let k=0;k<3;k++)m.rod([cx-r,cy+k*2-2,zz+side*.5],[cx+r*.7,cy+k*2-3,zz+side*.5],.42,k===1?[244,108,36]:[118,86,60],5);
   }
   m.mesh.damageStage=stage;out[key+'Damage'+stage]=m.mesh;
  }
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
function capitalDevelopmentHull(spec){
 const generated=buildDevelopedMachine({...spec,small:1}),scale=1.65,mesh=generated.map(f=>({...f,v:f.v.map(p=>[p[0]*scale,p[1]*scale,p[2]*scale+8]),joint:f.joint?[f.joint[0]*scale,f.joint[1]*scale,f.joint[2]*scale+8,f.joint[3]]:undefined}));
 const m=meshBuilder(),g=spec.genome,c=g.protection==='cryo'?[143,166,181]:g.protection==='stellar'?[147,124,83]:spec.color.map((n,i)=>Math.round(n*.35+[96,112,119][i]*.65)),steel=[143,159,163],dark=[21,30,37];
 for(const f of mesh)if(!f.em)f.c=f.c.map((n,i)=>Math.round(n*.45+c[i]*.55));
 // Layered service panels, alternating armor courses and recessed conduits
 // make the generated large chassis read as a constructed vessel at boss scale.
 for(const side of [-1,1])for(let i=0;i<11;i++){
  const x=-68+i*13,z=8+side*16,y=(i%2?1:-1)*4;
  m.wedge([x-5,y-8,z],[x+8,y-7,z],[x+7,y+7,z],2,c);m.wedge([x-5,y-8,z],[x+7,y+7,z],[x-6,y+8,z],2,c);
  m.tube([[x-4,y-5,z+side*2],[x+4,y-5,z+side*2],[x+5,y+4,z+side*2]],.55,steel,0,0,5,1);
  for(let slot=0;slot<3;slot++)m.tube([[x-3+slot*2.6,y-2,z+side*2.3],[x-3+slot*2.6,y+4,z+side*2.3]],.6,dark,0,0,5,1);
  m.ellipsoid(x-4,y+5,z+side*2.2,.8,.8,.4,steel,0,7,4);
  if(i%3===0)m.ellipsoid(x+4,y-3,z+side*2.5,1,.65,.4,[131,215,218],.4,8,4);
 }
 for(const side of [-1,1])m.tube([[-61,side*9,25],[-14,side*11,27],[35,side*10,24],[66,side*8,22]],1.2,dark,0,0,7,2);
 // Attachment points retain the destroyable-section contract. The structural
 // chassis between them is generated, and the exposed pods stay recognizable.
 for(const side of [-1,1]){const bend=g.machineFrame==='arc'?30:g.machineFrame==='delta'?-28:0;m.tube([[12,0,5],[bend,side*35,0],[-12,side*57,-20]],5,c,0,0,10,3);}
 m.tube([[-25,0,7],[-61,0,-8],[-90,0,-22]],9,c,0,0,10,3);m.tube([[20,0,4],[70,0,-6],[100,0,-8]],11,c,0,0,10,3);
 for(const drive of capitalSiegeMeshes.drives){const p=drive.center;m.tube([[p[0]-18,p[1],p[2]],p],drive.radius+2,c,0,0,12,2);}
 mesh.push(...m.faces);Object.assign(mesh,{industrial:true,capitalHull:true,capitalSurface:true,parts:[],development:g});return mesh;
}
function capitalLineageHull(spec){
 const m=meshBuilder(),c=spec.color,light=spec.accent,style=spec.armor;
 for(const side of [-1,1]){
  if(style==='cage')for(let i=0;i<3;i++){const x=-30+i*26;m.tube([[x,side*20,-16],[x-9,side*42,-25],[x+12,side*46,-4],[x+23,side*21,6]],3,c,0,0,10,3);}
  else if(style==='fins')for(let i=0;i<4;i++){const x=-42+i*22;m.wedge([x,side*15,-16],[x+28,side*49,-6],[x+21,side*16,12],5,c);m.tube([[x+2,side*18,-17],[x+26,side*45,-7]],.9,light,0,.2,6,1);}
  else for(let i=0;i<4;i++){const x=-40+i*23;m.tube([[x,side*16,-23],[x+6,side*34,-28],[x+18,side*39,-12]],5,c,0,0,8,2);}
 }
 m.faces.industrial=true;return m.faces;
}
function capitalShipDesign(b){
 if(!b.capitalDesign){const base=machineBossDesigns[1];b.capitalDesign={...base,mesh:capitalSiegeMeshes.hull,drives:capitalSiegeMeshes.drives,guns:capitalSiegeMeshes.guns,mouth:[-116,0,-17],scale:3.4,bodyVolumes:[{center:[0,0,0],radii:[70,35,33]},{center:[74,0,0],radii:[33,28,22]},{center:[-78,0,-20],radii:[28,26,20]},{center:[-7,-61,-23],radii:[34,16,18]},{center:[-7,61,-23],radii:[34,16,18]}]};}
 if(!b.capitalDesign.lineageApplied){const spec=typeof sectors!=='undefined'?sectors[level]?.biosphere?.boss:null;if(spec){const hull=spec.genome?capitalDevelopmentHull(spec):capitalSiegeMeshes.hull.map(f=>({...f,c:f.c.map((v,i)=>Math.round(v*.65+spec.color[i]*.35))}));if(!spec.genome){Object.assign(hull,{capitalHull:true,capitalSurface:true,dynamic:true,parts:capitalSiegeMeshes.hull.parts});hull.push(...capitalLineageHull(spec));}b.capitalDesign.mesh=hull;}b.capitalDesign.lineageApplied=true;}
 return b.capitalDesign;
}
function initCapitalSiege(b){
 if(b.siege)return b.siege;
 const total=b.max||b.hp||1000,node=(id,local,radii,fraction,clock)=>({id,local,radii,radius:Math.max(radii[1],radii[2])*3.4,hp:total*fraction,max:total*fraction,hit:0,clock,warning:0,muzzle:0,heading:Math.PI,cycle:0,special:null});
 b.siege={stage:'batteries',age:0,orbGranted:false,pulses:[],maneuverClock:6.5,maneuver:null,nodes:[node('dorsal',[-12,-65,-28],[50,16,17],.15,2.8),node('ventral',[-12,65,-28],[50,16,17],.15,4.3),node('reactor',[103,0,-8],[13,15,15],.23,2.6),node('core',[-94,0,-25],[15,15,15],.47,2.4)]};
 b.hp=total;b.max=total;b.pass=null;b.charge=0;b.attack=null;b.special=Infinity;
 announce('EXCAVATOR PRIME · ARMOR LOCKED','DESTROY THE UPPER AND LOWER STABILIZER PODS');
 return b.siege;
}
function capitalNodePosition(b,n){return bossMount(b,n.local);}
function capitalNodeActive(b,n){const siege=initCapitalSiege(b);return n.hp>0&&(siege.stage==='batteries'?(n.id==='dorsal'||n.id==='ventral'):n.id===siege.stage);}
function capitalSiegeHint(b){const s=initCapitalSiege(b),special=s.nodes.find(n=>n.special)?.special;if(special)return special.kind==='purge'?'THRUSTER IGNITION · CLEAR THE EXHAUST':'CAPACITOR DISCHARGE · DODGE THROUGH THE GAP';return s.stage==='batteries'?'STABILIZER PODS · '+s.nodes.slice(0,2).filter(n=>n.hp>0).length+' REMAIN':s.stage==='reactor'?'AFT REACTOR · FLY BEHIND · SPACE: FLIP':'COMMAND CORE EXPOSED · ATTACK THE BOW';}
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
function capitalShotSideAllowed(b,n,s,a){if(n.id!=='reactor')return true;const p=capitalNodePosition(b,n),tip=bossMount(b,[n.local[0]+20,n.local[1],n.local[2]]),dx=tip.x-p.x,dy=tip.y-p.y,len=Math.hypot(dx,dy)||1;return s.vx*dx+(s.vy||0)*dy<0&&((a.x-p.x)*dx+(a.y-p.y)*dy)/len>=-n.radius*.35;}
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
  if(!weaponOrb.owned){weaponOrb.owned=true;weaponOrb.flash=.25;s.orbGranted=true;window.flightAudio?.pickup(ship.x);updateHUD();}
  announce('STABILIZER PODS DESTROYED','FLY AROUND THE HULL · SPACE: FLIP · BREAK THE AFT REACTOR');
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
  if(capitalNodeActive(b,node)&&capitalShotSideAllowed(b,node,s,a))capitalDamageNode(b,node,bossDamage(s.damage)*1.25);
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
 const siege=initCapitalSiege(b),oldX=b.x,oldY=b.y,age=b.age||0,phase=siege.stage==='core'?1.6:siege.stage==='reactor'?1.3:1;
 if(!siege.maneuver)b.maneuverRoll=.12+Math.sin(age*1.8)*.06;b.turnYaw??=0;b.barrelRoll??=0;
 const active=siege.nodes.filter(n=>capitalNodeActive(b,n)),weaponsBusy=active.some(n=>n.special||n.warning>0||n.burst>0);
 if(!siege.maneuver){
  siege.maneuverClock-=dt*phase;
  if(siege.maneuverClock<=0&&!weaponsBusy&&b.x<W-220){siege.maneuver={stage:'warn',age:0,duration:.7,fromX:b.x,fromY:b.y,toX:b.x,toY:b.y,fromRoll:b.maneuverRoll,fromBarrel:b.barrelRoll};announce('EXCAVATOR ATTACK RUN','BREAK ABOVE OR BELOW THE HULL');window.flightAudio?.thrusterBurst?.(.32);}
 }
 const m=siege.maneuver,next=(stage,duration,toX=b.x,toY=b.y)=>{m.stage=stage;m.age=0;m.duration=duration;m.fromX=b.x;m.fromY=b.y;m.toX=toX;m.toY=toY;m.fromRoll=b.maneuverRoll;m.fromBarrel=b.barrelRoll;};
 if(m){
  m.age+=dt;const u=clamp(m.age/m.duration,0,1),ease=u*u*(3-2*u);
  if(m.stage==='warn'){b.navVX*=Math.exp(-dt*5);b.navVY*=Math.exp(-dt*5);b.x+=b.navVX*dt;b.y+=b.navVY*dt;b.actionLoad=Math.max(b.actionLoad||0,u);if(u>=1)next('lunge',1.05,520,H*.5);}
  else if(m.stage==='lunge'){b.x=m.fromX+(m.toX-m.fromX)*ease;b.y=m.fromY+(m.toY-m.fromY)*ease;b.attackDrive=1;b.propulsion=1;if(u>=1)next('turn',1.05,b.x,b.y);}
  else if(m.stage==='turn'){b.turnYaw=Math.PI*ease;b.barrelRoll=m.fromBarrel;if(u>=1){next('rear',1.45,b.x,H*.5);for(const n of active){n.target={x:ship.x,y:ship.y};n.warning=Math.min(n.warning||Infinity,.32);n.burst=0;}}}
  else if(m.stage==='rear'){b.y=m.fromY+(m.toY-m.fromY)*ease;b.turnYaw=Math.PI;b.barrelRoll=m.fromBarrel+TAU*ease;b.propulsion=.7;if(u>=1)next('return',1.18,900,H*.5);}
  else if(m.stage==='return'){b.x=m.fromX+(m.toX-m.fromX)*ease;b.y=m.fromY+(m.toY-m.fromY)*ease;b.turnYaw=Math.PI;b.attackDrive=1;b.propulsion=1;if(u>=1)next('resetTurn',1.25,b.x,b.y);}
  else if(m.stage==='resetTurn'){b.turnYaw=Math.PI*(1-ease);b.barrelRoll=m.fromBarrel;if(u>=1){b.turnYaw=0;siege.maneuver=null;siege.maneuverClock=6.1-phase*.6;}}
  b.navVX=(b.x-oldX)/dt;b.navVY=(b.y-oldY)/dt;
 }else{
  // Destroyed sections make the patrol tighter and more urgent.
  const orbit=age*.82*phase,thrust=Math.max(0,Math.sin(age*.9*phase))**6,targetX=805+Math.cos(orbit)*98-thrust*(siege.stage==='core'?110:58),targetY=H*.5+Math.sin(orbit*2)*32;
  b.navVX=clamp((b.navVX||0)+((targetX-b.x)*2.35-(b.navVX||0)*3)*dt,-185,120);
  b.navVY=clamp((b.navVY||0)+((targetY-b.y)*2.9-(b.navVY||0)*3.25)*dt,-42,42);b.x+=b.navVX*dt;b.y+=b.navVY*dt;
 }
 updateBossAttitude(b,dt,(b.x-oldX)/dt,(b.y-oldY)/dt);
}
function capitalGunMounts(b,n){
 const sy=n.id==='dorsal'?-65:65;
 const locals=n.id==='dorsal'||n.id==='ventral'?[[-61,sy-5,-28],[-61,sy+5,-28]]:n.id==='reactor'?[[116,-21,-11],[116,21,-11]]:capitalShipDesign(b).guns;
 const direction=n.id==='reactor'?1:-1;
 return locals.map(p=>{const a=bossMount(b,p),tip=bossMount(b,[p[0]+direction*20,p[1],p[2]]);a.heading=Math.atan2(tip.y-a.y,tip.x-a.x)+(n.aimOffset||0);a.heading=Math.atan2(Math.sin(a.heading),Math.cos(a.heading));a.baseX=a.x;a.baseY=a.y;a.x+=Math.cos(a.heading)*22.4;a.y+=Math.sin(a.heading)*22.4;return a;});
}
function capitalDischargeFrame(b,kind){
 const drive=kind==='purge'?capitalShipDesign(b).drives[b.siege?.nodes.find(n=>n.id==='reactor')?.special?.driveIndex||0]:null;
 const local=drive?drive.center:[-97,0,-25],axis=drive?drive.axis:[-1,0,0],a=bossMount(b,local),tip=bossMount(b,local.map((v,i)=>v+axis[i]*20));
 return{x:a.x,y:a.y,heading:Math.atan2(tip.y-a.y,tip.x-a.x),radius:drive?drive.radius*capitalShipDesign(b).scale:20};
}
function capitalPurgeContact(frame,x,y,padding=14){const dx=x-frame.x,dy=y-frame.y,along=dx*Math.cos(frame.heading)+dy*Math.sin(frame.heading),across=-dx*Math.sin(frame.heading)+dy*Math.cos(frame.heading);return along>=-padding&&along<=300+padding&&Math.abs(across)<(frame.radius||20)*Math.pow(Math.max(0,1-Math.max(0,along)/300),.55)+padding;}
function capitalPulseGap(radius){return Math.min(.6,Math.max(.19,Math.asin(Math.min(.99,46/Math.max(1,radius)))));}
function capitalPulseContact(pulse,x,y,padding=14){
 const dx=x-pulse.x,dy=y-pulse.y,radius=Math.hypot(dx,dy),angle=Math.atan2(Math.sin(Math.atan2(dy,dx)-pulse.heading),Math.cos(Math.atan2(dy,dx)-pulse.heading)),edge=Math.asin(Math.min(1,padding/Math.max(1,radius)));
 return Math.abs(radius-pulse.r)<pulse.width+padding&&Math.abs(angle)<.82+edge&&Math.abs(angle-pulse.gap)>capitalPulseGap(pulse.r)-edge;
}
function updateCapitalDischarges(b,dt){
 const siege=b.siege;
 for(const node of siege.nodes){const a=node.special;if(!a||!capitalNodeActive(b,node))continue;const previous=a.age;a.age+=dt;
  if(previous<a.warning&&a.age>=a.warning){const frame=capitalDischargeFrame(b,a.kind);if(a.kind==='purge')window.flightAudio?.thrusterBurst?.(a.duration);else window.flightAudio?.laserBeam(.35);if(a.kind==='pulse')siege.pulses.push({...frame,age:0,r:28,width:18,gap:a.gap,life:1.9});}
  if(a.kind==='purge'&&a.age>=a.warning&&a.age<a.warning+a.duration&&capitalPurgeContact(capitalDischargeFrame(b,a.kind),ship.x,ship.y))damage();
  if(a.age>=a.warning+a.duration)node.special=null;
 }
 for(const pulse of siege.pulses){pulse.age+=dt;pulse.r=28+pulse.age*510;if(capitalPulseContact(pulse,ship.x,ship.y))damage();}
 siege.pulses=siege.pulses.filter(p=>p.age<p.life);
}
function updateCapitalSiege(b,dt){
 const s=initCapitalSiege(b);s.age+=dt;b.charge=0;b.attack=null;b.special=Infinity;
 updateCapitalDischarges(b,dt);
 if(s.maneuver?.stage==='lunge'){b.siegeLoad=1;b.siegeStrike=false;return;}
 for(const n of s.nodes){n.hit=Math.max(0,n.hit-dt);n.muzzle=Math.max(0,n.muzzle-dt);if(!capitalNodeActive(b,n)||(b.x<0||b.x>W)||n.special)continue;
  if(n.target){const gun=capitalGunMounts(b,n)[0],axis=gun.heading-(n.aimOffset||0),desired=Math.atan2(n.target.y-gun.baseY,n.target.x-gun.baseX),offset=clamp(Math.atan2(Math.sin(desired-axis),Math.cos(desired-axis)),-.65,.65);n.aimOffset=(n.aimOffset||0)+clamp(offset-(n.aimOffset||0),-dt*2,dt*2);}
  if(n.warning>0){n.warning-=dt;if(n.warning<=0){n.burst=n.id==='core'?6:4;n.burstClock=0;}}
  if(n.burst>0){n.burstClock-=dt;if(n.burstClock<=0){const mounts=capitalGunMounts(b,n);n.lastGun=(n.burst-1)%mounts.length;const mount=mounts[n.lastGun],speed=n.id==='core'?920:n.id==='reactor'?820:850,seeking=n.id!=='reactor'&&n.cycle%3===0&&n.burst===1;
    hostile.push({x:mount.x,y:mount.y,vx:Math.cos(mount.heading)*speed,vy:Math.sin(mount.heading)*speed,r:n.id==='core'?8:7,kind:seeking?'seeker':'rocket',bossRound:true,scale:n.id==='core'?.95:.85,c:'#ffbd75',launchAngle:mount.heading});n.muzzle=.17;n.burst--;n.burstClock=n.id==='core'?.12:.14;window.flightAudio?.shot('missile',mount.x,true);
   }}else if(n.warning<=0){n.clock-=dt;if(n.clock<=0){n.cycle++;n.clock=(n.id==='core'?.64:.76)*COMBAT_BALANCE.salvoRest*(sectors[level].salvoRestScale||1);n.heading=n.id==='reactor'?0:Math.PI;
    if(n.id==='reactor'&&n.cycle%2===0){n.special={kind:'purge',age:0,warning:1.15,duration:.76,driveIndex:Math.floor(n.cycle/2)%capitalShipDesign(b).drives.length};}
    else if(n.id==='core'&&n.cycle%2===0){n.special={kind:'pulse',age:0,warning:1.3,duration:.3,gap:(n.cycle%4===0?-1:1)*.28};window.flightAudio?.laserCharge();}
    else{n.target={x:ship.x,y:ship.y};n.warning=.8;}
   }}
 }
 const active=s.nodes.filter(n=>capitalNodeActive(b,n));b.siegeLoad=active.reduce((load,n)=>Math.max(load,n.special?Math.min(1,n.special.age/n.special.warning):n.warning>0?1-n.warning/.8:n.burst>0?1:0),0);b.siegeStrike=active.some(n=>n.burst>0||n.special&&n.special.age>=n.special.warning);
}
function capitalIgnitionFlash(a){const remaining=a.warning-a.age;return remaining>0&&remaining<.24?Math.sin((.24-remaining)/.24*Math.PI)**2:0;}
function drawCapitalDischarges(b){
 ctx.save();
 for(const node of b.siege.nodes){const a=node.special;if(!a)continue;const frame=capitalDischargeFrame(b,a.kind),charging=a.age<a.warning;
  ctx.save();ctx.translate(frame.x,frame.y);ctx.rotate(frame.heading);
  if(a.kind==='purge'){
   ctx.strokeStyle='#c8eaff';ctx.lineWidth=3;ctx.globalAlpha=.78;ctx.beginPath();ctx.ellipse(1,0,4,frame.radius*1.08,0,0,TAU);ctx.stroke();ctx.globalAlpha=1;
   if(charging){
    const ignition=capitalIgnitionFlash(a),heat=clamp(a.age/a.warning,0,1);
    orb(0,0,frame.radius*.6,'#ffbb67',heat*.3);
    if(ignition>0){orb(0,0,frame.radius*1.05,'#fff2c1',ignition);ctx.globalAlpha=ignition;ctx.strokeStyle='#ffdca2';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,5,frame.radius*.8,0,0,TAU);ctx.stroke();}
   }else{
    const age=a.age-a.warning,fade=Math.max(0,Math.min(1,age/.035,(a.duration-age)/.09)),r=frame.radius;
    ctx.globalCompositeOperation='lighter';
    // Continuous nozzle-attached exhaust, with compression diamonds inside it.
    for(const [width,length,alpha,hot,tail] of [[r,300,.72,'#b5eaff','rgba(76,139,255,0)'],[r*.53,245,.92,'#fff7d6','rgba(255,163,76,0)']]){
     ctx.globalAlpha=fade*alpha;const gradient=ctx.createLinearGradient(0,0,length,0);gradient.addColorStop(0,hot);gradient.addColorStop(.2,hot);gradient.addColorStop(1,tail);ctx.fillStyle=gradient;
     ctx.beginPath();ctx.moveTo(3,-width*.62);ctx.bezierCurveTo(length*.18,-width,length*.65,-width*.9,length,0);ctx.bezierCurveTo(length*.65,width*.9,length*.18,width,3,width*.62);ctx.closePath();ctx.fill();
    }
    for(let i=0;i<5;i++){const x=25+i*43,w=(11-i*1.4)*(1+.09*Math.sin(age*55-i));ctx.globalAlpha=fade*(.64-i*.09);ctx.fillStyle='#e9f8ff';ctx.beginPath();ctx.moveTo(x-10,0);ctx.lineTo(x,-w);ctx.lineTo(x+17,0);ctx.lineTo(x,w);ctx.closePath();ctx.fill();}
    orb(0,0,r*.75,'#fff6d4',fade*.9);
   }
  }else{orb(0,0,12+Math.min(1,a.age/a.warning)*24,'#b9efff',.7);}
  ctx.restore();
 }
 for(const pulse of b.siege.pulses){const gap=capitalPulseGap(pulse.r),alpha=Math.min(1,pulse.age/.035,(pulse.life-pulse.age)/.3);ctx.globalAlpha=Math.max(0,alpha);ctx.lineCap='round';for(const [start,end] of [[-.82,Math.max(-.82,pulse.gap-gap)],[Math.min(.82,pulse.gap+gap),.82]]){if(end<=start)continue;for(const [width,color] of [[48,'rgba(105,187,245,.22)'],[25,'rgba(132,220,255,.75)'],[7,'#f2fdff']]){ctx.lineWidth=width;ctx.strokeStyle=color;ctx.beginPath();ctx.arc(pulse.x,pulse.y,pulse.r,pulse.heading+start,pulse.heading+end);ctx.stroke();}}}
 ctx.restore();
}
function capitalDamageStage(n){return n.hp>=n.max?0:n.hp<=0?3:n.hp/n.max>.65?1:n.hp/n.max>.3?2:3;}
function capitalSectionMesh(b,n){
 const key=n.id==='dorsal'||n.id==='ventral'?n.id:n.id==='reactor'?(b.siege.stage==='batteries'?'reactorClosed':'reactorOpen'):(b.siege.stage==='core'?'coreOpen':'coreClosed');
 if(n.hp<=0&&(n.id==='dorsal'||n.id==='ventral'))return capitalSiegeMeshes[n.id+'Wreck'];
 const stage=capitalDamageStage(n);return capitalSiegeMeshes[key+(stage?'Damage'+stage:'')]||capitalSiegeMeshes[key];
}
function capitalFireProfile(n){const severity=clamp(1-n.hp/n.max,0,1);return{severity,vents:severity>.65?3:severity>.3?2:1,length:24+severity*70,width:12+severity*24};}
// Reuse small textured billows instead of drawing long, engine-like flame ribbons.
const capitalDamageSprites=new Map();
function capitalDamageSprite(smoke,seed){
 const key=(smoke?'smoke':'fire')+seed;if(capitalDamageSprites.has(key))return capitalDamageSprites.get(key);
 const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
 for(let k=0;k<13;k++){
  const a=k*2.4+seed,x=64+Math.cos(a)*(15+k),y=64+Math.sin(a)*(12+k),r=19+k*.9,fill=g.createRadialGradient(x-r*.18,y-r*.23,1,x,y,r);
  fill.addColorStop(0,smoke?'rgba(59,51,45,.52)':'rgba(255,227,148,.8)');
  fill.addColorStop(.38,smoke?'rgba(29,27,28,.55)':'rgba(244,119,22,.7)');
  fill.addColorStop(.7,smoke?'rgba(20,22,26,.4)':'rgba(150,39,9,.34)');
  fill.addColorStop(1,'rgba(18,18,22,0)');g.fillStyle=fill;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
 }
 capitalDamageSprites.set(key,c);return c;
}
function drawCapitalDamage(b,n){
 const fire=capitalFireProfile(n),severity=fire.severity;if(severity<=0)return;
 const pod=n.id==='dorsal'||n.id==='ventral',local=pod?[n.local[0],n.local[1],-48]:[n.local[0],n.local[1],n.local[2]-18];
 ctx.save();
 for(let j=0;j<fire.vents;j++){
  const socket=[local[0]+(j-1)*9,local[1]+(j%2?3:-2),local[2]],p=bossMount(b,socket);
  // Smoke rises in world space; the breach follows the rolling hull. A broken
  // module burns irregularly, unlike the parallel blue plumes of its engines.
  for(let k=0;k<5;k++){
   const t=(b.age*.36+k/5+j*.19)%1,size=fire.width*(1.2+t*2.2),x=p.x+Math.sin(t*5+j*2+k*.4)*22*t,y=p.y-15-t*(65+severity*70);
   ctx.globalAlpha=Math.sin(Math.PI*t)*(.42+severity*.38);ctx.drawImage(capitalDamageSprite(true,j),x-size,y-size,size*2,size*2);
  }
  ctx.globalAlpha=1;orb(p.x,p.y,12+severity*13,'#fa6f23',.23+severity*.2);
  for(let k=0;k<4;k++){
   const t=(b.age*(1.1+j*.17)+k/4+j*.23)%1,envelope=Math.sin(Math.PI*t),size=fire.width*(.7+t*.75),x=p.x+Math.sin(t*8+j*2.7+k)*size*.48,y=p.y-t*fire.length;
   ctx.globalAlpha=envelope*(.65+severity*.3);ctx.drawImage(capitalDamageSprite(false,j),x-size,y-size,size*2,size*2);
  }
  // Short falling sparks and glowing fragments, with independent trajectories.
  for(let k=0;k<5;k++){
   const t=(b.age*.65+k*.21+j*.13)%1,vx=Math.sin(k*2.3+j)*40,x=p.x+vx*t,y=p.y-25*t+65*t*t;
   ctx.globalAlpha=(1-t)*severity;ctx.strokeStyle=k%2?'#ffd49b':'#dc642b';ctx.lineWidth=k%2?1.3:2.2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-vx*.04,y-(130*t-25)*.04);ctx.stroke();
  }
 }
 ctx.restore();
}
function drawCapitalSiege(b){
 const s=initCapitalSiege(b),pose=bossFlightPose(b),scale=capitalShipDesign(b).scale;
 const mesh=(m,hit=0)=>drawModel(m,b.x,b.y,scale,pose.yaw,pose.roll,pose.pitch,b.age,hit);
 for(const n of s.nodes){const section=capitalSectionMesh(b,n);if(section.damageBase)mesh(section.damageBase,n.hit);mesh(section,n.hit);}
 for(const n of s.nodes)if(capitalNodeActive(b,n))for(const gun of capitalGunMounts(b,n))drawModel(meshes.cannon,gun.baseX,gun.baseY,.8,0,0,gun.heading-Math.PI,b.age,n.hit);
 // Flush modules before drawing their targeting information, keeping labels
 // clear while the actual objects remain solid GPU-rendered geometry.
 window.gpuModels?.flush(ctx);
 drawCapitalDischarges(b);
 for(const n of s.nodes)drawCapitalDamage(b,n);
 ctx.save();ctx.textAlign='center';ctx.font='bold 10px "DM Sans",sans-serif';
 for(const n of s.nodes){if(n.hp<=0)continue;const p=capitalNodePosition(b,n),active=capitalNodeActive(b,n);
  if(active){const above=n.id==='dorsal'||n.id==='core',yy=p.y+(above?-1:1)*(n.radius+20),pulse=.65+.35*Math.sin(b.age*8+n.local[1]);healthBar(p.x,yy,76,n.hp,n.max,'#ffc782');ctx.fillStyle='#fff0ca';ctx.fillText(n.id==='dorsal'?'UPPER STABILIZER':n.id==='ventral'?'LOWER STABILIZER':n.id==='reactor'?'AFT REACTOR':'COMMAND CORE',p.x,yy+(above?-7:17));ctx.strokeStyle='#ffd089';ctx.lineWidth=2.5;ctx.globalAlpha=pulse;ctx.setLineDash([8,7]);ctx.beginPath();ctx.arc(p.x,p.y,n.radius+8+b.age%1*4,b.age*.9,b.age*.9+Math.PI*1.45);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;}

  if(n.muzzle>0){const gun=capitalGunMounts(b,n)[n.lastGun||0],strength=n.muzzle/.17;ctx.save();ctx.translate(gun.x,gun.y);ctx.rotate(gun.heading);orb(9,0,29,'#ffd399',strength*.85);ctx.globalAlpha=strength;poly([[0,-7],[39,0],[0,7]],'#fff0be');ctx.strokeStyle='#ffe8bb';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(11+(1-strength)*18,0,4,8+(1-strength)*14,0,0,TAU);ctx.stroke();ctx.restore();}
 }
 for(const n of s.nodes)if(n.hp<=0){const p=capitalNodePosition(b,n),pulse=.5+.5*Math.sin(b.age*17+n.local[0]);ctx.save();ctx.globalCompositeOperation='lighter';orb(p.x,p.y,18+(n.id==='reactor'?8:0),'#ff6d31',.16+.14*pulse);ctx.strokeStyle='#ffbd72';ctx.lineWidth=1.5;ctx.globalAlpha=.35+.45*pulse;for(let i=0;i<3;i++){const a=b.age*(1.8+i*.7)+i*2.1,len=10+8*Math.sin(b.age*9+i)**2;ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*7,p.y+Math.sin(a)*7);ctx.lineTo(p.x+Math.cos(a)*len,p.y+Math.sin(a)*len);ctx.stroke();}ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgba(25,25,30,.24)';ctx.beginPath();ctx.arc(p.x-8-Math.sin(b.age*.8)*5,p.y-16-(b.age*7%28),13+(b.age*3%8),0,TAU);ctx.fill();ctx.restore();}
 ctx.restore();
}
