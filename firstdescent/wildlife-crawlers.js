// Small surface animals are solid articulated meshes, not canvas decals. Every
// route owns its vertices: delayed GPU batches must never share a last pose.
const crawlerShellPalettes={
 'ember-beetle':{shell:[67,65,57],rim:[134,94,61],head:[50,49,44],leg:[109,94,71],wide:1,long:1},
 'moss-beetle':{shell:[66,88,65],rim:[112,126,82],head:[50,67,52],leg:[100,111,77],wide:1.07,long:.96},
 'sand-beetle':{shell:[118,105,77],rim:[170,149,102],head:[83,78,57],leg:[131,116,82],wide:.92,long:1.04},
 'frost-beetle':{shell:[94,115,119],rim:[155,169,166],head:[63,83,88],leg:[126,145,144],wide:1.04,long:.91},
 'cave-beetle':{shell:[73,80,85],rim:[115,119,128],head:[44,51,58],leg:[97,101,111],wide:.92,long:1.10},
 crab:{shell:[87,114,106],rim:[143,156,128],head:[57,79,76],leg:[119,131,110],wide:1,long:1}
};
function prepareCrawlerModel(route){
 if(route.crawlerRig)return route.crawlerRig;
 const crab=route.kind==='crab',palette=crawlerShellPalettes[route.kind]||crawlerShellPalettes['moss-beetle'];
 const mesh=[],parts=[],legs=[],antennae=[],claws=[],seed=route.seed||0;
 // A restrained individual tint avoids identical stamped shells on a bank.
 const tint=.94+.10*(Math.sin(seed*1.71)*.5+.5),color=c=>c.map(n=>Math.round(n*tint));
 const shell=color(palette.shell),rim=color(palette.rim),head=color(palette.head),legColor=color(palette.leg);
 function part(name,build){
  const builder=meshBuilder();build(builder);const points=new Map();
  for(const face of builder.faces){
   face.smoothGroup='crawler-'+name;face.textureWeight=.28;face.wet=.11;
   face.v=face.v.map(v=>{const key=v.map(n=>n.toFixed(6)).join(',');if(!points.has(key))points.set(key,{v,rest:v.slice()});return points.get(key).v;});mesh.push(face);
  }
  const value={name,points:[...points.values()]};parts.push(value);return value;
 }
 function segment(name,radius,c){return part(name,m=>m.tube([[0,0,0],[1,0,0]],radius,c,0,0,5,1));}
 const body=part('body',m=>{
  if(crab){
   m.ellipsoid(-.5,0,-2.1,4.1,4.5,2.0,shell,0,14,8);
   m.ellipsoid(.2,0,-2.8,2.9,3.55,1.5,rim,0,10,6);
   for(const side of [-1,1]){
    m.tube([[2.3,side*3.4,-2.5],[-.4,side*4.35,-2.0],[-3.2,side*2.8,-1.6]],.25,shell,0,0,5,1);
    m.tube([[2.8,side*1.8,-2.0],[4.1,side*2.3,-2.7]],.33,head,0,0,5,1);
    m.ellipsoid(4.2,side*2.35,-2.85,.56,.46,.53,[30,39,35],0,6,4);
   }
  }else{
   const wide=palette.wide,long=palette.long;
   m.ellipsoid(-1.55,0,-1.55,4.65*long,2.65*wide,1.30,head,0,10,6);
   for(const side of [-1,1])m.ellipsoid(-1.95,side*.72*wide,-2.13,4.45*long,1.97*wide,1.82,shell,0,12,7);
   m.ellipsoid(2.05,0,-2.02,2.08,2.36*wide,1.65,rim,0,10,6);
   m.ellipsoid(4.46,0,-1.65,1.59,1.57*wide,1.19,head,0,10,5);
   m.tube([[-5.65*long,0,-2.88],[-2.3,0,-3.97],[.95,0,-3.54]],.12,head,0,0,5,1);
   // A narrow raised rim catches light without turning the whole insect orange.
   for(const side of [-1,1]){
    m.tube([[-5.4*long,side*1.0,-2.36],[-2.5,side*2.6*wide,-2.31],[.65,side*1.7*wide,-2.75]],.15,rim,0,0,5,1);
    m.ellipsoid(4.9,side*1.22*wide,-2.10,.50,.38,.45,[25,33,29],0,6,4);
   }
  }
 });
 for(let side=-1;side<=1;side+=2)for(let i=0;i<(crab?4:3);i++){
  const name='leg-'+side+'-'+i,rootX=crab?2.3-i*1.55:2.65-i*2.65;
  legs.push({side,index:i,rootX,rootY:side*(crab?3.15:1.9),rootZ:-1.9,
   reach:crab?6.5:5.6+(i===1?.6:0),spread:crab?1.7-i*1.35:2.0-i*2.0,
   phase:((i+(side>0?1:0))%2)*Math.PI,
   upper:segment(name+'-upper',crab?.43:.36,legColor),lower:segment(name+'-lower',crab?.32:.28,legColor),
   toe:segment(name+'-toe',.18,head),foot:[0,0,0],knee:[0,0,0]});
 }
 if(crab){
  for(const side of [-1,1]){
   const name='claw-'+side;
   claws.push({side,upper:segment(name+'-upper',.56,legColor),lower:segment(name+'-lower',.45,rim),
    palm:part(name+'-palm',m=>m.ellipsoid(0,0,0,1.45,1.05,.82,rim,0,8,5)),
    fixed:segment(name+'-fixed',.36,shell),moving:segment(name+'-moving',.36,rim)});
  }
 }else{
  for(const side of [-1,1]){
   antennae.push({side,base:segment('antenna-'+side+'-base',.16,legColor),mid:segment('antenna-'+side+'-mid',.12,legColor),tip:segment('antenna-'+side+'-tip',.07,rim)});
  }
 }
 mesh.skin=true;mesh.alienMaterial='chitin';mesh.dynamic=true;mesh.cpuBounds=true;
 const rig={mesh,parts,body,legs,antennae,claws,crab,palette,triangles:mesh.reduce((n,f)=>n+f.v.length-2,0)};
 route.crawlerRig=rig;
 animateCrawlerModel(route,{stride:seed,time:0,motion:0,turn:0,speed:0});
 return rig;
}
// Map a retained tapered segment onto its current joint endpoints. All vertex
// and rest arrays remain the same objects throughout the route's lifetime.
function positionCrawlerSegment(part,ax,ay,az,bx,by,bz){
 const dx=bx-ax,dy=by-ay,dz=bz-az,length=Math.hypot(dx,dy,dz)||1,ux=dx/length,uy=dy/length,uz=dz/length;
 const cross=Math.hypot(ux,uy)||1,vx=-uy/cross,vy=ux/cross;
 const wx=-uz*vy,wy=uz*vx,wz=ux*vy-uy*vx;
 for(const point of part.points){const r=point.rest,v=point.v;v[0]=ax+r[0]*dx+r[1]*vx+r[2]*wx;v[1]=ay+r[0]*dy+r[1]*vy+r[2]*wy;v[2]=az+r[0]*dz+r[2]*wz;}
}
function animateCrawlerModel(route,p){
 const rig=route.crawlerRig||prepareCrawlerModel(route),stride=p.stride||0,time=p.time||0,motion=Math.max(0,Math.min(1,p.motion??1));
 const sway=Math.sin(stride)*.085*motion,bob=Math.cos(stride*2)*.075*motion,lean=Math.max(-.12,Math.min(.12,(p.turn||0)*.10));
 for(const point of rig.body.points){const r=point.rest,v=point.v;v[0]=r[0];v[1]=r[1]+sway;v[2]=r[2]+bob+r[1]*lean;}
 for(const leg of rig.legs){
  const cycle=((stride+leg.phase)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)/(Math.PI*2),stance=.60;
  let sweep,lift=0;
  if(cycle<stance)sweep=1-2*cycle/stance;
  else{const t=(cycle-stance)/(1-stance);sweep=-Math.cos(t*Math.PI);lift=Math.sin(t*Math.PI)*(rig.crab?1.55:1.85);}
  const rx=leg.rootX,ry=leg.rootY+sway,rz=leg.rootZ+bob;
  const footX=rx+leg.spread+sweep*(rig.crab?1.50:1.85),footY=leg.side*leg.reach,footZ=-lift;
  const kneeX=rx+(footX-rx)*.43-1.00,kneeY=leg.side*(leg.reach*.74),kneeZ=-2.30-lift*.36;
  leg.foot[0]=footX;leg.foot[1]=footY;leg.foot[2]=footZ;leg.knee[0]=kneeX;leg.knee[1]=kneeY;leg.knee[2]=kneeZ;
  positionCrawlerSegment(leg.upper,rx,ry,rz,kneeX,kneeY,kneeZ);
  positionCrawlerSegment(leg.lower,kneeX,kneeY,kneeZ,footX,footY,footZ);
  positionCrawlerSegment(leg.toe,footX,footY,footZ,footX-.50,footY+leg.side*.36,footZ-.04);
 }
 for(const a of rig.antennae){
  const side=a.side,twitch=Math.sin(time*4.1+side*2.2+route.seed)*.34+Math.sin(time*7.3+side)*.11;
  const mx=7.6+twitch,my=side*(2.1+twitch),mz=-2.55+Math.sin(time*3.4+side)*.35;
  const tx=10.25+twitch*.4,ty=side*(3.55+twitch*1.2),tz=-1.5+Math.sin(time*2.1+side)*.55;
  positionCrawlerSegment(a.base,5.55,side*.85+sway,-1.80+bob,6.8,side*1.50,-2.6);
  positionCrawlerSegment(a.mid,6.8,side*1.50,-2.6,mx,my,mz);
  positionCrawlerSegment(a.tip,mx,my,mz,tx,ty,tz);
 }
 for(const claw of rig.claws){
  const side=claw.side,flex=Math.sin(time*2.0+side+route.seed)*.22,px=6.9+flex,py=side*(4.8+flex),pz=-1.7;
  positionCrawlerSegment(claw.upper,2.9,side*2.5,-1.8,4.8,side*5.4,-2.4);
  positionCrawlerSegment(claw.lower,4.8,side*5.4,-2.4,px,py,pz);
  for(const point of claw.palm.points){const r=point.rest,v=point.v;v[0]=px+r[0];v[1]=py+r[1];v[2]=pz+r[2];}
  positionCrawlerSegment(claw.fixed,px+.8,py-side*.52,pz,px+2.8,py-side*.2,pz+.1);
  positionCrawlerSegment(claw.moving,px+.65,py+side*.56,pz,px+2.7,py+side*(.32+flex*.75),pz-.02);
 }
 return rig.mesh;
}
function drawCrawlerContactShadow(route,p){
 const rig=route.crawlerRig||prepareCrawlerModel(route),alpha=ctx.globalAlpha;
 ctx.save();ctx.globalAlpha=alpha*.27;ctx.fillStyle='#0d1716';ctx.beginPath();ctx.ellipse(-.5,.65,rig.crab?4.8:6.2,rig.crab?4.2:2.9,0,0,Math.PI*2);ctx.fill();
 ctx.globalAlpha=alpha*.12;ctx.beginPath();ctx.ellipse(-.5,.7,rig.crab?5.6:7.0,rig.crab?4.8:3.5,0,0,Math.PI*2);ctx.fill();ctx.restore();
}
