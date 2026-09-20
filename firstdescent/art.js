function isTideEncounter(){return typeof updateTideEncounter==='function'&&sectors[level]?.encounterDirector==='tide-knots';}
/* Painted scenery and sprite artwork, with procedural animation and combat effects. */
const art={},artFiles={"blackHole":"black-hole-frontier-v1.webp","orisonOcean":"orison-ocean-v1.webp","orisonGas":"orison-gas-v1.webp","orisonCinder":"orison-cinder-v1.webp","orisonIce":"orison-ice-v1.webp","reefObstacle":"obstacle-reef.webp","stormObstacle":"obstacle-storm.webp","coreObstacle":"obstacle-core.webp","colonyObstacle":"obstacle-colony.webp","carrierObstacle":"obstacle-carrier.webp","derelictObstacle":"obstacle-derelict.webp","space":"space-panorama.webp","carrier":"carrier-panorama.webp","abyss":"abyss-panorama.webp","reef":"reef-descent.webp","storm":"storm-ascent.webp","core":"core-panorama.webp"};
const artCrops={"reefObstacle":{"x":62,"y":24,"w":920,"h":1485},"stormObstacle":{"x":141,"y":14,"w":748,"h":1502},"coreObstacle":{"x":51,"y":6,"w":964,"h":1519},"colonyObstacle":{"x":260,"y":5,"w":509,"h":1525},"carrierObstacle":{"x":230,"y":2,"w":559,"h":1526},"derelictObstacle":{"x":255,"y":4,"w":530,"h":1527}};
function loadArt(key){
 if(art[key]||!artFiles[key])return art[key];
 const img=new Image();img.decoding='async';img.onload=()=>{if(typeof surfaceDirty!=='undefined')surfaceDirty=true;};if(artCrops[key])img.solidCrop=artCrops[key];art[key]=img;img.src='assets/'+artFiles[key];return img;
}
function trimSectorArt(current,next){
 const keep=new Set();for(const d of [current,next])if(d){keep.add(d.background||({verdant:'space',forge:'carrier',abyss:'abyss'}[d.theme]||d.theme));keep.add(d.obstacleArt||({verdant:'colonyObstacle',forge:'carrierObstacle',abyss:'derelictObstacle'}[d.theme]||d.theme+'Obstacle'));}
 for(const key of Object.keys(art))if(!keep.has(key)){panoramaSurfaces.delete(art[key]);delete art[key];}
}
function prepareSectorArt(definition){
 const location=expedition.locations[definition.id];if(location){preparePlanetCloseup(location);galaxyArtwork(expeditionGalaxy(location));requestSpaceImage('cosmic-remnant-v1.webp');}
 const theme={verdant:'space',forge:'carrier',abyss:'abyss',reef:'reef',storm:'storm',core:'core'};
 loadArt(definition.background||theme[definition.theme]||'space');
 loadArt(definition.obstacleArt||({verdant:'colonyObstacle',forge:'carrierObstacle',abyss:'derelictObstacle'}[definition.theme]||definition.theme+'Obstacle'));
}
// Warm the opening sector while the deep-space title is displayed.
loadArt('space');
let muzzleFlash=0,viewY=0;
let flightPose={pitch:0,roll:0,yaw:0,thrust:0,vx:0,vy:0};
const lootColors={rescue:'#ffe2a0',orb:'#9cf6ff',speed:'#67dfff',companion:'#c8a1ff',power:'#ffcf78',helix:'#c899ff',wave:'#6effd9',missile:'#ffab66',beam:'#7cbdff',spread:'#ffd17a',frontShield:'#80fff1',shield:'#79dfff',repair:'#8dffa3',nova:'#fff1a2'};
function imageReady(img){return img&&img.complete&&img.naturalWidth>0}
function sprite(img,col,row,cols,rows,x,y,w,h,hit=0){
 if(!imageReady(img))return false;
 ctx.save();if(hit>0)ctx.filter='brightness(2.8) saturate(0.3)';
 if(img===art.bosses){const crops=[[0,0,435,1024],[435,35,650,890],[1078,0,458,1024]];const [sx,sy,sw,sh]=crops[col];ctx.drawImage(img,sx,sy,sw,sh,x-w/2,y-h/2,w,h)}else ctx.drawImage(img,col*img.naturalWidth/cols,row*img.naturalHeight/rows,img.naturalWidth/cols,img.naturalHeight/rows,x-w/2,y-h/2,w,h);ctx.restore();return true;
}
function drawBackdrop(dt=1/60){
 if(sectors[level].stellar){drawStellarBackdrop(sectors[level]);return;}
 if(sectors[level].gravityWell){drawGravityBackdrop(sectors[level]);return;}
 const s=sectors[level],vertical=s.scrollAxis,painting=scenePainting(),lean=vertical?(ship.x-W/2)*.018:(ship.y-H/2)*.025;
 viewY+=((state==='title'?0:clamp(lean,-12,12))-viewY)*(1-Math.exp(-dt*3));ctx.fillStyle=s.sky;ctx.fillRect(0,0,W,H);
 if(imageReady(painting)){drawPanorama(painting);if(themeIndex()===0){ctx.fillStyle='#06121b1a';ctx.fillRect(0,0,W,H);}}
 else{orb(1000,270,650,s.fog,.8);orb(350,650,450,s.planet,.2);drawSectorEnvironment();}
 if(s.sceneTint){ctx.save();ctx.globalCompositeOperation='soft-light';ctx.fillStyle=`rgba(${s.sceneTint.map(v=>Math.round(v*150)).join(',')},.22)`;ctx.fillRect(0,0,W,H);ctx.restore();}
 // Distant lights, painted geography, suspended particles and near-camera dust
 // have separate speeds. They share one axis and one sector-local clock.
 for(const st of stars){const p=sceneryPosition(st.x,st.y,.025+st.z*.055,24);ctx.globalAlpha=.09+st.z*.23;ctx.fillStyle='#d9faff';ctx.fillRect(p.x,p.y,st.r,st.r)}ctx.globalAlpha=1;
 const flow=vertical==='up'?1:-1;
 for(let i=0;i<22;i++){const p=sceneryPosition((i*137.7)%W,(i*167.4)%H,.38+(i%4)*.055,40);ctx.globalAlpha=.08+(i%3)*.035;ctx.strokeStyle='#c1dcec';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+(vertical?0:2+i%3),p.y+(vertical?flow*(2+i%3):0));ctx.stroke()}ctx.globalAlpha=1;
 const v=ctx.createLinearGradient(0,0,0,H);v.addColorStop(0,'#02061160');v.addColorStop(.24,'transparent');v.addColorStop(.75,'transparent');v.addColorStop(1,'#02061166');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
 drawPlanetarySky();
 drawWaterAtmosphere(false);
 drawCloudAtmosphere();drawHeatHaze();
}
function gravitationalImagePoint(x,y,cx,cy,radius,strength){
 const dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy);if(d<radius*1.05)return null;
 const bend=radius*radius*strength/(d+radius),scale=1+bend/d;
 return{x:cx+dx*scale,y:cy+dy*scale,arc:clamp(bend/radius,0,1)*7,angle:Math.atan2(dy,dx)+Math.PI/2};
}
function drawGravityBackdrop(definition){
 const image=art[definition.background],well=definition.gravityWell,t=sectorSceneTime(),pulse=.5+.5*Math.sin(t*TAU/well.tidalPeriod);
 ctx.fillStyle='#02050e';ctx.fillRect(0,0,W,H);
 let width=W*1.05,height=H*1.05;if(imageReady(image)){const scale=Math.max(W/image.naturalWidth,H/image.naturalHeight)*1.05;width=image.naturalWidth*scale;height=image.naturalHeight*scale;}
 const x=(W-width)/2+Math.sin(t*.035)*12,y=(H-height)/2+Math.sin(t*.027)*7,cx=x+width*well.center[0],cy=y+height*well.center[1],radius=width*well.radius;
 if(imageReady(image)){
  // Subtle, broad tidal refraction affects distant scenery only. Retained
  // image strips stay GPU-backed; no per-frame pixel readback or allocation.
  const bands=(window.flightEffectsQuality||1)<1?20:32,band=H/bands;
  for(let i=0;i<bands;i++){const yy=i*band,h=Math.min(band+1,H-yy),sourceY=clamp((yy-y)/height,0,1)*image.naturalHeight,sourceH=h/height*image.naturalHeight,refraction=Math.sin(t*.42+yy*.012)*2.3*pulse*Math.exp(-Math.abs(yy-cy)/220);ctx.drawImage(image,0,sourceY,image.naturalWidth,sourceH,x+refraction,yy,width,h);}
 }
 ctx.save();
 // Far stars move behind the compact object and form short Einstein arcs
 // around its rim; the dark event horizon occludes them entirely.
 for(let i=0;i<160;i++){const sx=((i*193.73-t*(2+i%4*.3))%(W+100)+W+100)%(W+100)-50,sy=(i*131.31)%H,p=gravitationalImagePoint(sx,sy,cx,cy,radius,well.lensing*(.88+pulse*.24));if(!p)continue;ctx.globalAlpha=.16+(i%5)*.07;ctx.fillStyle=i%6?'#c3d8ee':'#f1cb9a';ctx.beginPath();ctx.ellipse(p.x,p.y,.45+p.arc,.5,p.angle,0,TAU);ctx.fill();}

 ctx.restore();
}
let cloudSurfaces=null,heatSurface=null,causticSurface=null;
function cloudTexture(seed){
 const surface=document.createElement('canvas');surface.width=512;surface.height=192;const c=surface.getContext('2d');
 // Feathered, irregular lobes are baked once. Only whole layers drift during
 // play, so clouds have volume without regenerating noise every frame.
 for(let i=0;i<32;i++){
  const u=i/31,x=38+u*436,y=102+Math.sin(i*2.37+seed)*20,r=22+Math.sin(Math.PI*u)*38;
  c.save();c.translate(x,y);c.scale(1,.58+Math.sin(i+seed)*.12);
  const g=c.createRadialGradient(-r*.15,-r*.2,0,0,0,r);g.addColorStop(0,'#dde6df50');g.addColorStop(.4,'#bacbca30');g.addColorStop(1,'#8bacae00');c.fillStyle=g;c.fillRect(-r,-r,r*2,r*2);c.restore();
 }
 return surface;
}
function drawCloudAtmosphere(){
 const cover=sectors[level].atmosphere?.clouds||0;if(!cover||sectors[level].medium==='water')return;
 cloudSurfaces??=[cloudTexture(1),cloudTexture(4),cloudTexture(7)];ctx.save();const t=sectorSceneTime();
 for(let layer=0;layer<((window.flightEffectsQuality||1)<1?1:2);layer++)for(let i=0;i<3;i++){
  const width=layer?800:1050,height=layer?210:155,span=W+width,x=((i*span/3-t*(layer?52:15)+span)%span+span)%span-width;
  const y=(layer?H*.65:H*.24)+Math.sin(i*2.4+layer)*80+Math.sin(t*.09+i)*8;
  ctx.globalAlpha=cover*(layer?.55:.4);ctx.drawImage(cloudSurfaces[(i+layer)%3],x,y,width,height);
 }ctx.restore();
}
function heatHazeOffset(y,t,strength){const depth=clamp((y/H-.28)/.72,0,1);return strength*depth*(Math.sin(y*.024-t*2.5)*4.4+Math.sin(y*.047-t*1.4)*1.6);}
function drawHeatHaze(){
 const heat=sectors[level].atmosphere?.heat||0;if(!heat)return;
 if(!heatSurface){heatSurface=document.createElement('canvas');heatSurface.width=W/2;heatSurface.height=H/2;}
 const c=heatSurface.getContext('2d');c.drawImage(canvas,0,0,canvas.width,canvas.height,0,0,W/2,H/2);
 const t=sectorSceneTime();ctx.save();
 // Refract the already-painted scenery only. The single reusable GPU-backed
 // surface needs no pixel readback; ships, projectiles and HUD stay sharp.
 const band=(window.flightEffectsQuality||1)<1?8:4;for(let y=Math.floor(H*.28);y<H;y+=band){const h=Math.min(band,H-y),shift=heatHazeOffset(y,t,heat);ctx.globalAlpha=clamp((y/H-.28)/.45,0,1)*.78;ctx.drawImage(heatSurface,2,y/2,(W-8)/2,h/2,4+shift,y,W-8,h);}
 ctx.restore();
}
// Habitat-driven, bounded layers work for any future submerged sector.
function drawWaterAtmosphere(foreground=false){
 if(sectors[level].medium!=='water'||sectorBlend?.destination)return;
 const t=sectorSceneTime(),deep=(sectors[level].atmosphere?.water||.8)>=1;ctx.save();
 if(!foreground){
  const depth=ctx.createLinearGradient(0,0,0,H);depth.addColorStop(0,deep?'#197b8c38':'#52b6c742');depth.addColorStop(1,deep?'#01172d90':'#011f3b78');ctx.fillStyle=depth;ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation='screen';
  // Sunlight scatters through the surface as broad, feathered illumination.
  // No polygon cones or parallel rays: those read as artificial spotlights.
  for(let i=0;i<4;i++){
   const x=i*W/3+Math.sin(t*.12+i*2.1)*75,y=-100+Math.sin(t*.17+i)*35;
   ctx.save();ctx.translate(x,y);ctx.scale(1,.82);
   const g=ctx.createRadialGradient(0,0,0,0,0,620);g.addColorStop(0,deep?'#a6dac322':'#d2ebcc35');g.addColorStop(.38,deep?'#67c7c414':'#86d8cb24');g.addColorStop(1,'#69bbc600');ctx.fillStyle=g;ctx.fillRect(-620,-620,1240,1240);ctx.restore();
  }
  // Retained irregular caustic cells drift over the sea floor at two depths.
  if(!causticSurface){causticSurface=document.createElement('canvas');causticSurface.width=512;causticSurface.height=256;const c=causticSurface.getContext('2d');c.strokeStyle='#ace7cf';c.lineWidth=1.7;c.shadowColor='#8acdbb';c.shadowBlur=4;
   for(let row=-1;row<6;row++)for(let col=-1;col<8;col++){const x=col*79+(row%2)*35,y=row*56,points=[];for(let j=0;j<6;j++){const a=j/6*TAU,r=30+Math.sin(col*3+row+j*1.7)*9;points.push([x+Math.cos(a)*r,y+Math.sin(a)*r*.7]);}c.beginPath();c.moveTo((points[5][0]+points[0][0])/2,(points[5][1]+points[0][1])/2);for(let j=0;j<6;j++){const a=points[j],b=points[(j+1)%6];c.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2);}c.stroke();}}
  for(let layer=0;layer<2;layer++){ctx.globalAlpha=(deep?.045:.075)*(layer?.65:1);const w=760,h=330,dx=((t*(layer?-8:13))%w+w)%w;for(let i=-1;i<3;i++)ctx.drawImage(causticSurface,i*w+dx,H*.51+Math.sin(t*.3+layer)*12,w,h);}
  ctx.globalAlpha=1;
  // Slowly shifting, overlapping surface patches provide a gentle shimmer.
  for(let i=0;i<8;i++){
   const x=(i+.5)*W/8+Math.sin(t*.27+i*1.8)*34,y=20+Math.sin(t*.31+i*2.4)*28;
   ctx.save();ctx.translate(x,y);ctx.scale(1,.38);
   const g=ctx.createRadialGradient(0,0,0,0,0,180);g.addColorStop(0,deep?'#c4ebd10a':'#e0f4d713');g.addColorStop(1,'#a6dfca00');ctx.fillStyle=g;ctx.fillRect(-180,-180,360,360);ctx.restore();
  }
 }else{
  // Rising air pockets, suspended sediment and the pilot's propulsive wake.
  for(let i=0;i<Math.round(52*(window.flightEffectsQuality||1));i++){const speed=18+i%5*7,y=H+20-((t*speed+i*127)%(H+40)),x=((i*197-t*(11+i%4*5))%(W+40)+W+40)%(W+40)-20+Math.sin(t*.9+i)*7,r=1.5+i%4;
   ctx.globalAlpha=.24+(i%3)*.07;ctx.strokeStyle='#afe9ed';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();ctx.fillStyle='#efffff';ctx.fillRect(x-r*.35,y-r*.5,.9,.9);
  }
 }
 ctx.restore();
}
let waterWakes=[],waterWakeTracks=new WeakMap();
function resetWaterWakes(){waterWakes=[];waterWakeTracks=new WeakMap();}
function updateWaterWakes(dt){
 if(sectors[level].medium!=='water'){if(waterWakes.length)resetWaterWakes();return;}
 for(const p of waterWakes){p.age+=dt;p.x+=p.vx*dt;p.y+=(p.vy-9)*dt;const drag=Math.exp(-dt*(p.pilot?1.65:.9));p.vx*=drag;p.vy*=drag;}
 waterWakes=waterWakes.filter(p=>p.age<p.life);
 function trace(actor,size,forward){
  let track=waterWakeTracks.get(actor);if(!track){track={x:actor.x,y:actor.y,clock:0};waterWakeTracks.set(actor,track);}
  const dx=actor.x-track.x,dy=actor.y-track.y;track.x=actor.x;track.y=actor.y;
  // Ignore checkpoint/entry teleports; add the animal's through-water drive
  // so hovering in the scrolling camera still leaves a modest propulsive wake.
  if(Math.hypot(dx,dy)>100||actor.x< -80||actor.x>W+80)return;
  const pilot=actor===ship,vx=dx/dt+forward*(pilot?55:95),vy=dy/dt,speed=Math.hypot(vx,vy),effort=clamp(speed/440,.12,1),angle=Math.atan2(vy,vx);
  track.clock+=dt;if(track.clock<.11-effort*.045)return;track.clock=0;
  const ux=Math.cos(angle),uy=Math.sin(angle),seed=time*19+actor.y*.07;
  waterWakes.push({x:actor.x-ux*size*.85,y:actor.y-uy*size*.85,vx:-ux*(pilot?18+effort*44:30+effort*60),vy:-uy*(pilot?18+effort*44:30+effort*60),angle,size,effort,seed,pilot,age:0,life:(pilot?.85:.65)+effort*.5});
 }
 trace(ship,28,shipDirection());
 for(const d of drops)trace(d,9,-1);
 for(const e of enemies)if(e.hp>0)trace(e,e.satellite?9:e.brood?48:23,e.direction||-1);
 if(boss&&boss.hp>0)trace(boss,Math.min(100,(boss.r||120)*.65),Math.cos(bossFlightPose(boss).yaw)>0?-1:1);
 if(waterWakes.length>120)waterWakes.splice(0,waterWakes.length-120);
}
function drawWaterWakes(){
 if(sectors[level].medium!=='water')return;ctx.save();ctx.lineCap='round';
 for(const p of waterWakes){const fade=(1-p.age/p.life)**2,width=p.size*(.4+p.age*(p.pilot?1.05:.9)),length=18+p.effort*42+p.age*(p.pilot?18:30);
  // A rotation-safe bound skips only turbulence entirely outside the view.
  const reach=Math.hypot(length,width)+6;if(p.x+reach<0||p.x-reach>W||p.y+reach<0||p.y-reach>H)continue;
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.globalAlpha=fade*(.22+p.effort*.28);ctx.strokeStyle='#b8e5dc';ctx.lineWidth=2.4;
  // Disjoint edges share a stroke submission while retaining both curves.
  ctx.beginPath();for(const side of [-1,1]){ctx.moveTo(3,side*width*.35);ctx.bezierCurveTo(-length*.3,side*width*.85,-length*.65,side*width,-length,side*width*.75);}ctx.stroke();
  ctx.globalAlpha=fade*(.28+p.effort*.27);ctx.strokeStyle='#c9f5ec';ctx.lineWidth=1.3;
  for(let i=0;i<3;i++){const x=-length*(i/3+.1),y=Math.sin(p.seed+i*2.1+p.age*4)*width*.52,r=(1.3+i*.75)*(1+p.age*.5);ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();}
  ctx.restore();
 }ctx.restore();
}
// Software-projected solid geometry: yaw reveals the nose and side faces.
function projectHull(v,yaw,roll,pitch){let [x,y,z]=v;let xx=x*Math.cos(yaw)+z*Math.sin(yaw),zz=-x*Math.sin(yaw)+z*Math.cos(yaw);let yy=y*Math.cos(roll)-zz*Math.sin(roll);zz=y*Math.sin(roll)+zz*Math.cos(roll);const f=340/(340+zz);return{x:(xx*Math.cos(pitch)-yy*Math.sin(pitch))*f,y:(xx*Math.sin(pitch)+yy*Math.cos(pitch))*f,z:zz}}
function drawShip(x,y,scale=1,preview=false){
 const pose=pilotFlightPose(),yaw=preview?Math.sin(world*.004)*.5:pose.yaw,roll=preview?-.25+Math.sin(world*.003)*.25:pose.roll,pitch=preview?-.06:pose.pitch,thrust=preview?.45:flightPose.thrust;
 const project=v=>projectHull(v,yaw,roll,pitch);const tier=preview?2:power;
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 // Exhaust follows the rotated engine axis; acceleration lengthens the plume.
 const engine=project([-34,0,0]),tip=project([-74-thrust*105-speedLevel*9,0,0]);const angle=Math.atan2(tip.y-engine.y,tip.x-engine.x),length=Math.hypot(tip.x-engine.x,tip.y-engine.y);
 ctx.save();ctx.translate(engine.x,engine.y);ctx.rotate(angle);ctx.globalCompositeOperation='lighter';orb(0,0,25+thrust*24,'#3bccff',.32+thrust*.3);
 const plume=ctx.createLinearGradient(0,0,length,0);plume.addColorStop(0,'#e7ffff');plume.addColorStop(.16,'#7dfaff');plume.addColorStop(.6,'#289de9aa');plume.addColorStop(1,'#1674e000');
 ctx.fillStyle=plume;ctx.beginPath();ctx.moveTo(0,-6-thrust*3);ctx.bezierCurveTo(length*.4,-10-thrust*6,length*.8,-3,length,0);ctx.bezierCurveTo(length*.8,3,length*.4,10+thrust*6,0,6+thrust*3);ctx.closePath();ctx.fill();
 for(let i=1;i<5;i++){ctx.globalAlpha=(1-i/5)*(.25+thrust*.55);ctx.strokeStyle='#d8ffff';ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(i*length/6,0,2,4+thrust*2,0,0,TAU);ctx.stroke()}ctx.restore();
 drawModel(meshes[tier===3?'player3':tier===2?'player2':'player'],0,0,1,yaw,roll,pitch,world*.01);
 for(const side of [-1,1]){const p=project([-22,side*23,-5]);glow('#7bffed',7);ctx.fillStyle='#a8fff4';ctx.fillRect(p.x-6,p.y-1,12,2);noGlow()}
 if(muzzleFlash>0){const p=project([tier>1?42:48,0,0]);orb(p.x,p.y,18,'#bffff3',.75)}
 ctx.restore();
}
function dronePosition(i){const a=world*.012+i*Math.PI;return{x:ship.x+Math.cos(pilotTurn.angle)*(-50+Math.cos(a)*16),y:ship.y+(i===0?-1:1)*66+Math.sin(a)*12}}
function drawDrone(i){const p=dronePosition(i),age=world*.012+i*Math.PI,yaw=pilotTurn.angle+Math.sin(age)*.22,pitch=flightPose.pitch*.65,roll=pilotTurn.angle+flightPose.roll*.45+Math.sin(age)*.28;orb(p.x-16*Math.cos(pilotTurn.angle),p.y,19,'#9892ff',.22);drawModel(meshes.wingmate,p.x,p.y,1,yaw,roll,pitch,age);}
function healthBar(x,y,w,hp,max,color){ctx.save();ctx.fillStyle='#07101ddd';ctx.fillRect(x-w/2-2,y-2,w+4,8);ctx.fillStyle='#4a394b';ctx.fillRect(x-w/2,y,w,4);ctx.fillStyle=color;ctx.fillRect(x-w/2,y,w*clamp(hp/max,0,1),4);ctx.restore()}
// Route against authored scenery even before either actor enters the viewport.
let routeCache=null;
function routeObstacles(){if(routeCache?.time===time&&routeCache.level===level&&routeCache.source===obstacles&&routeCache.length===obstacles.length)return routeCache.value;const all=themeIndex()===0?obstacles.map(o=>({...o,navigation:true,solidCache:null})):obstacles.slice();const c=sectors[level].challenge;if(c&&c.at-4>time&&c.at-4<time+9)all.push({at:c.at-4,x:W+100-(time-c.at+4)*SCROLL_SPEED,shutters:true});for(const [id,p] of gatePlans[level].entries())if(p.at>time&&p.at<time+9)all.push({...p,id,navigation:themeIndex()===0,x:W+100-(time-p.at)*SCROLL_SPEED,w:p.width});routeCache={time,level,source:obstacles,length:obstacles.length,value:all};return all;}
function enemyRouteY(e,naturalY){if(sectors[level].scrollAxis)return clamp(naturalY,100,H-100);let y=naturalY;const radius=e.brood?90:isOrganicEnemy(e)?70:55;
 for(const o of routeObstacles())for(const r of obstacleSolids(o)){const dist=Math.abs(e.x-(r.x+r.w/2)),u=clamp((r.w/2+(e.direction===1?700:480)-dist)/(e.direction===1?400:300),0,1),blend=passEase(u),edge=r.ceiling?r.y+r.h+radius+12:r.y-radius-12;const target=r.ceiling?Math.max(y,edge):Math.min(y,edge);y+=(target-y)*blend;}
 return clamp(y,80,H-80);
}
function steerEnemyY(e,target,dt){if(e.routeY==null){e.routeY=target;e.routeVY=0;}const a=1-Math.exp(-dt*8);const desired=clamp((target-e.routeY)*7,-320,320);e.routeVY+=(desired-e.routeVY)*a;e.routeY+=e.routeVY*dt;return e.routeY;}
function prepareEnemyEntry(e,wave,n){
 const advanced=sectors[level].entrySides||['right'],flanking=sectors[level].flankWaves?.includes(wave);e.entry=flanking?'left':advanced[wave%advanced.length];e.direction=e.entry==='left'?1:-1;
 if(sectors[level].scrollAxis){e.entry=(flanking||wave%5===4)?(sectors[level].scrollAxis==='down'?'top':'bottom'):(sectors[level].scrollAxis==='down'?'bottom':'top');e.verticalTravel=true;e.verticalDirection=e.entry==='top'?1:-1;e.baseX=clamp(W*.5+Math.sin(wave*1.7)*240+(n-2)*60,200,W-200);e.y=e.entry==='top'?-180-n*96:H+180+n*96;e.x=enemyRouteX(e,e.baseX);e.routeX=e.x;e.direction=e.x<W/2?1:-1;return;}

 if(e.entry==='left'){e.x=-180-n*100;}
 else if(e.entry==='top'||e.entry==='bottom'){
  const solids=routeObstacles().flatMap(obstacleSolids),candidates=[W*.76,W*.55,W*.9,W*.37];
  const safe=candidates.find(x=>Array.from({length:13},(_,j)=>j*(2.5+n*.24)/12).every(a=>{const ex=x+n*12-180*passEase(clamp((a-n*.24)/2.5,0,1));return solids.every(r=>ex+115<r.x-a*SCROLL_SPEED||ex-115>r.x+r.w-a*SCROLL_SPEED);}));
  if(safe==null){e.entry='right';}else{e.entryX=safe+n*12;e.x=e.entryX;e.entryY=e.entry==='top'?-140-n*85:H+140+n*85;e.y=e.entryY;e.entryDelay=n*.24;e.entryTarget=e.base;}
 }
 if(e.entry==='right'||e.entry==='left'){const atX=e.x;e.x=e.entry==='right'?W+100:-100;e.base=enemyRouteY(e,e.base);e.x=atX;e.y=e.base;e.routeY=e.base;e.routeVY=0;}
}
function drawEntryWarnings(){for(const side of ['left','top','bottom']){const incoming=enemies.find(e=>e.entry===side&&e.age<1.2);if(!incoming)continue;const x=side==='left'?26:clamp(incoming.entryX??incoming.x,90,W-90),y=side==='top'?26:side==='bottom'?H-26:incoming.base;ctx.save();ctx.translate(x,y);ctx.globalAlpha=.5+.25*Math.sin(incoming.age*7);ctx.fillStyle='#ffca83';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText(side==='left'?'»':side==='top'?'▼':'▲',0,0);ctx.restore();}}
function frontShieldPosition(){return pilotMount(65)}
function blockWithFrontShield(b,oldX){if(!(ship.frontShield>0)||shipTurning()||b.vx*shipDirection()>=0)return false;const p=frontShieldPosition();if(Math.max(oldX,b.x)+b.r>=p.x-8&&Math.min(oldX,b.x)-b.r<=p.x+8&&Math.abs(b.y-p.y)<40+b.r){ship.frontShield--;ship.frontFlash=.18;burst(p.x,b.y,'#a3ffef',9);window.flightAudio?.shipHit(p.x,true);updateHUD();return true}return false}
function drawFrontShield(){if(!(ship.frontShield>0))return;const p=frontShieldPosition(),hit=ship.frontFlash>0;ctx.save();ctx.translate(p.x,p.y);ctx.scale(Math.cos(pilotTurn.angle),1);const fill=ctx.createRadialGradient(0,0,3,0,0,48);fill.addColorStop(0,'#88ffe908');fill.addColorStop(.7,'#71ffe91a');fill.addColorStop(1,'#b9fff066');ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(0,0,20,43,0,-Math.PI/2,Math.PI/2);ctx.closePath();ctx.fill();glow('#72ffea',hit?28:15);for(let i=0;i<3;i++){ctx.globalAlpha=(hit?1:.75)/(i+1);ctx.lineWidth=i===0?2:4+i*3;ctx.strokeStyle=hit?'#ffffff':'#8cfff0';ctx.beginPath();ctx.ellipse(0,0,20+i,43+i,0,-Math.PI/2,Math.PI/2);ctx.stroke();}ctx.globalAlpha=.18;ctx.lineWidth=1;for(let y=-30;y<=30;y+=12){ctx.beginPath();ctx.moveTo(1,y);ctx.lineTo(15*Math.sqrt(1-y*y/1800),y);ctx.stroke();}noGlow();ctx.restore();}

// A rigid turn follows the path tangent; rendering, guns and exhaust share it.
function steerVerticalEnemyFacing(e,vx,vy,dt){
 if(Math.hypot(vx,vy)<8)return;
 const target=Math.atan2(vy,vx),previous=e.travelHeading??target;
 e.travelHeading=previous+clamp(Math.atan2(Math.sin(target-previous),Math.cos(target-previous)),-dt*5.5,dt*5.5);
 e.direction=Math.cos(e.travelHeading)>=0?1:-1;
 e.travelYaw=0;e.travelPitch=e.travelHeading-Math.PI;
}
function enemyKinematics(e,dt){
 if(sectors[level].medium==='water'&&!e.sentry)dt*=WATER_HANDLING.enemyMotion;
 const species=enemySpecies(e);
 if(e.guardian&&boss){e.age+=dt;const a=e.age*.9+e.orbit;const u=passEase(Math.min(1,e.age/1.2)),x=boss.x+Math.cos(a)*155,y=boss.y+Math.sin(a)*130;e.x=(e.emergeX??x)+(x-(e.emergeX??x))*u;e.y=(e.emergeY??y)+(y-(e.emergeY??y))*u;e.direction=ship.x>=e.x?1:-1;e.travelYaw=Math.sin(a)*.35;e.travelPitch=Math.cos(a)*.18;return;}
 if(e.verticalTravel){
  const oldX=e.x,oldY=e.y;e.age+=dt;
  const organic=isOrganicEnemy(e),frequency=species?.frequency||4,stroke=Math.pow((1+Math.cos((e.age+e.phase)*frequency))*.5,5),swoops=species?.gait==='swoop'||e.elite==='ace';
  if(organic&&stroke>.65&&(e.stroke??0)<=.65)window.flightAudio?.swim(e);
  const speed=e.speed*(organic?.70+stroke*.90:.78*(1+.1*Math.sin(e.age*2.2+e.phase)));
  // Accelerate through the dive, curve back up, then recover into the route.
  // The same seeded phase repeats on retries; no reaction teleporting.
  if(swoops&&e.swoopStart==null&&e.y>100&&e.y<H-100)e.swoopStart=e.age;
  const turnPhase=(e.age-(e.swoopStart??e.age))*1.65;
  e.y+=e.verticalDirection*speed*(swoops&&e.swoopStart!=null?.65+1.1*Math.cos(turnPhase):1)*dt;
  const desired=enemyRouteX(e,e.baseX+Math.sin(e.age*(swoops?1.65:.8)+e.phase)*(swoops?150:42));
  e.routeX+=clamp((desired-e.routeX)*(1-Math.exp(-dt*6)),-260*dt,260*dt);e.x=e.routeX;
  steerVerticalEnemyFacing(e,(e.x-oldX)/dt,(e.y-oldY)/dt,dt);e.depth=1;e.stroke=stroke;return;
 }
 if(e.sentry){e.age+=dt;e.x=W+210-(time-e.anchorAt)*SCROLL_SPEED;const gate=obstacles.find(o=>o.shutters&&o.at===e.anchorAt);if(gate){const r=obstacleSolids(gate)[0];if(sectors[level].scrollAxis){e.x=r.side==='left'?r.x+r.w+30:r.x-30;e.y=r.y+r.h/2;}else e.y=r.h+32;}e.travelPitch=e.travelYaw=0;return;}
 if(e.satellite&&e.mother){
  if(e.mother.hp<=0){e.mother=null;e.base=e.y}
  else{
   e.age+=dt;const angle=e.age*(e.escortProfile?.orbit||2.1)+e.orbit,spread=1+.16*Math.sin(e.age*1.3),oldY=e.y;
   const formation=e.escortProfile?.formation;
   e.x=e.mother.x+(formation==='screen'?-100+Math.cos(angle)*50:Math.cos(angle)*145*spread);
   e.y=enemyRouteY(e,clamp(e.mother.y+(formation==='figure8'?Math.sin(angle*2):Math.sin(angle))*(formation==='petals'?135:108)*spread,70,H-70));
   e.travelYaw=Math.sin(angle)*.18;e.travelPitch=clamp(-(e.y-oldY)/dt/700,-.35,.35);e.depth=1;
   return;
  }
 }

 e.age+=dt;const organic=isOrganicEnemy(e),frequency=species?.frequency||(e.type===1?(themeIndex()===0?4.8:3.2):(themeIndex()===2?9:3.8)),cycle=(e.age+e.phase)*frequency;
 // A brief contraction generates thrust, followed by a longer relaxed glide.
 const stroke=Math.pow((1+Math.cos(cycle))*.5,5);if(organic&&stroke>.65&&(e.stroke??0)<=.65)window.flightAudio?.swim(e);e.stroke=stroke;
 if(e.brood){
  e.entryX??=e.x;
  const route=[[e.entryX,380],[W*.75,H*.28],[W*.43,H*.70],[W*.79,H*.40],[W*.39,H*.23],[W*.64,H*.68],[-180,380]];
  const routeAge=e.age*(e.escortProfile?.pace||1),entry=routeAge<2.2,leg=entry?0:Math.min(5,1+Math.floor((routeAge-2.2)/2.4)),local=entry?routeAge:(routeAge-2.2)%2.4;
  const from=route[leg],to=route[leg+1],t=clamp(entry?local/2.2:(local-1.55)/.85,0,1),ease=t*t*(3-2*t),oldX=e.x,oldY=e.y;
  // Brief readable wind-up, then a fast full barrel roll into the next position.
  const hover=!entry&&local<1.55?Math.sin(local/1.55*Math.PI):0;
  e.x=from[0]+(to[0]-from[0])*ease+hover*14;
  e.y=enemyRouteY(e,from[1]+(to[1]-from[1])*ease-hover*18);
  e.broodRoll=entry?0:(leg-1+ease)*TAU;
  e.travelPitch=clamp(-Math.atan2((e.y-oldY)/dt,Math.max(180,Math.abs(e.x-oldX)/dt))*.45,-.4,.4);
  e.travelYaw=Math.sin(e.age*.8)*.12;e.depth=1;if(sectors[level].scrollAxis)steerVerticalEnemyFacing(e,(e.x-oldX)/dt,(e.y-oldY)/dt,dt);
  if(routeAge>=14.2)e.x=-180-(routeAge-14.2)*240;
  return;
 }
 const thrust=species?.organic?(['glide','undulate','row'].includes(species.gait)?.94+stroke*.28:species.gait==='dart'?.62+stroke*1.4:species.gait==='flutter'?.9+.16*Math.sin(cycle*2):species.gait==='hover'?.82+stroke*.48:species.gait==='swoop'?.86+stroke*.65:.66+stroke*1.12):themeIndex()===1?(e.type===0?1+.5*Math.pow(Math.max(0,Math.sin(e.age*2+e.phase)),4):.8):themeIndex()===2?(e.type===1?1.05+.12*Math.cos((e.age+e.phase)*3.2):1.1+.22*Math.pow(Math.max(0,Math.sin((e.age+e.phase)*9)),2)):organic?.52+stroke*1.48:1;
 const desired=e.speed*thrust*(organic?1.12+stroke*.38:1+.16*Math.pow(Math.max(0,Math.sin((e.age+e.phase)*2)),4));e.swimSpeed=(e.swimSpeed??e.speed)+(desired-(e.swimSpeed??e.speed))*(1-Math.exp(-dt*7));e.x+=(e.direction||-1)*e.swimSpeed*dt;
 const oldY=e.y,turnRate=e.brood?1.05:organic?.45:e.type===2?.35:.7,amplitude=e.brood?112:organic?34:e.type===2?10:30;
 const naturalY=species?e.base+(Math.sin(e.age*(species.gait==='flutter'?2.4:species.gait==='swoop'?.85:species.gait==='glide'?.65:species.gait==='hover'?.5:1.1)+e.phase)-Math.sin(e.phase))*species.amplitude:themeIndex()===1?e.base+(e.type===0?Math.sin(e.age*1.7+e.phase)*52:Math.sin(e.age*.6+e.phase)*18):themeIndex()===2?e.base+(Math.sin(e.age*(e.type===1?1.3:1.8)+e.phase)-Math.sin(e.phase))*(e.type===1?65:48):e.base+(Math.sin(e.age*turnRate+e.phase)-Math.sin(e.phase))*amplitude;
 let routeTarget=enemyRouteY(e,naturalY);
 if((e.entry==='top'||e.entry==='bottom')&&e.age<2.5+(e.entryDelay||0)){
 const t=clamp((e.age-(e.entryDelay||0))/2.5,0,1);e.x=e.entryX-180*passEase(t);routeTarget=e.entryY+(routeTarget-e.entryY)*passEase(t);e.y=routeTarget;e.routeY=e.y;e.routeVY=0;
 }else e.y=steerEnemyY(e,routeTarget,dt);
 const desiredPitch=clamp(-Math.atan2((e.y-oldY)/dt,e.swimSpeed)*.65,-.45,.45);e.travelPitch=(e.travelPitch||0)+(desiredPitch-(e.travelPitch||0))*(1-Math.exp(-dt*7));e.travelYaw=(e.direction===1?Math.PI:0)+(organic?organicSpin(e.age+e.phase).yaw:Math.cos(e.age*turnRate+e.phase)*.12);e.depth=1;
}
// Pose and sockets share one transform, including swarm scale and barrel rolls.
function speciesFlightPose(e){
 const organic=isOrganicEnemy(e),age=e.age+(e.phase||0),activity=organic?organicSpin(age):null;
 const pitch=(e.travelPitch||0)+(activity?.pitch||0);
 return{age:age*(enemySpecies(e)?.genome?.appendageRate||1),yaw:e.travelYaw||0,pitch,roll:e.satellite?e.age*TAU/.75+(e.orbit||0):e.brood?(e.broodRoll||0):organic?activity.roll+clamp(-pitch*.45,-.18,.18):mechanicalFlightRoll(e)-pitch*.65,scale:e.brood?1.4:e.satellite?.5:1};
}
function nativeSpeciesMesh(e){const s=enemySpecies(e);return !e.sentry&&s?meshes[s.id]:null;}
function speciesSocket(e,local,pose=speciesFlightPose(e)){const q=rotateVertex(local,pose.yaw,pose.roll,pose.pitch,0,0),f=window.gpuModels?1:460/(460+q[2]);return{x:e.x+q[0]*f*pose.scale,y:e.y+q[1]*f*pose.scale};}
function drawNativePropulsion(e,mesh,p){
 const organic=isOrganicEnemy(e),water=sectors[level].medium==='water',power=.35+.65*(e.stroke||0),color=water?'#9edbe7':organic?'#92dec5':'#77caff';
 for(const port of mesh.ports||[]){const a=speciesSocket(e,port,p),b=speciesSocket(e,[port[0]+(water?18:28)+power*24,port[1],port[2]],p),dx=b.x-a.x,dy=b.y-a.y,n=Math.hypot(dx,dy)||1,r=(organic?2:3)*p.scale,nx=-dy/n*r,ny=dx/n*r;
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=water?.35:.65;const g=ctx.createLinearGradient(a.x,a.y,b.x,b.y);g.addColorStop(0,color);g.addColorStop(1,color+'00');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(a.x+nx,a.y+ny);ctx.quadraticCurveTo(b.x+nx,b.y+ny,b.x,b.y);ctx.quadraticCurveTo(b.x-nx,b.y-ny,a.x-nx,a.y-ny);ctx.fill();ctx.restore();
 }
}
function firingRig(e,isBoss=false){
 if(!isBoss){const mesh=nativeSpeciesMesh(e);if(mesh?.nativeAnatomy){const p=speciesFlightPose(e),m=speciesSocket(e,mesh.muzzle,p),axis=rotateVertex([-1,0,0],p.yaw,p.roll,p.pitch,0,0),heading=e.verticalTravel||sectors[level].scrollAxis&&e.brood?Math.atan2(axis[1],axis[0]):e.elite?Math.atan2(ship.y-m.y,ship.x-m.x):(e.direction===1?0:Math.PI);return{x:m.x,y:m.y,muzzleX:m.x,muzzleY:m.y,organic:isOrganicEnemy(e),native:true,scale:p.scale,yaw:p.yaw,pitch:p.pitch,heading};}}
if(isBoss&&bossDesign()){const d=bossDesign(),p=bossFlightPose(e),local=d.guns?d.guns[(e.attack?.index||0)%d.guns.length]:d.mouth,m=bossMount(e,local),v=rotateVertex([-1,0,0],p.yaw,p.roll,p.pitch,0,0);return{x:m.x,y:m.y,muzzleX:m.x,muzzleY:m.y,scale:d.scale*p.depth,yaw:p.yaw,pitch:p.pitch,organic:bossOrganic(),heading:e.fireHeading??Math.atan2(v[1],v[0])};}if(isBoss&&bossIndex()===0){const r=bossLaserOrigin(e),rig=bossLaserRig(e);return{x:rig.x,y:rig.y,scale:rig.scale,yaw:rig.yaw,pitch:rig.pitch,organic:true,heading:Math.atan2(r.y-rig.y,r.x-rig.x),muzzleX:r.x,muzzleY:r.y};}const organic=isBoss?bossOrganic():isOrganicEnemy(e),scale=isBoss?2*(e.depth||1):1,x=e.x-(isBoss?88*(e.depth||1)*(e.facing===1?-1:1):(27+(organic&&(e.brood||themeIndex()===0||e.type===3&&themeIndex()!==2)?9*Math.pow((1+Math.cos((e.age+(e.phase||0))*(e.type===1?4.8:3.8)-.3))*.5,5):0))*(e.direction===1?-1:1)),y=e.y;
 // The barrel is a separate articulated mount. Its local muzzle points along -X.
 const heading=isBoss&&e.fireHeading!=null?e.fireHeading:!isBoss&&!e.elite?(e.direction===1?0:Math.PI):Math.atan2(ship.y-y,ship.x-x),pitch=Math.atan2(Math.sin(heading-Math.PI),Math.cos(heading-Math.PI)),yaw=0;
 const v=rotateVertex([-29,0,0],yaw,0,pitch,0,0),f=460/(460+v[2]);return{organic,scale,yaw,pitch,x,y,heading,muzzleX:x+v[0]*f*scale,muzzleY:y+v[1]*f*scale}}
function drawEmitter(e,isBoss=false){const r=firingRig(e,isBoss),pulse=Math.max(0,e.muzzle||0)/.16;if(!r.native){ctx.save();ctx.translate(r.x,r.y);ctx.scale(1,1+(r.organic?pulse*.22:0));drawModel(meshes[r.organic?'siphon':'cannon'],0,0,r.scale,r.yaw,0,r.pitch,e.age);ctx.restore();}if(!isBoss&&e.shotWindup){const charge=clamp(e.shotWindup.age/COMBAT_BALANCE.enemyWindup,0,1);orb(r.muzzleX,r.muzzleY,8+charge*10,r.organic?'#ffcf83':'#ffb36a',.35+charge*.5);}if(isBoss&&e.attack&&e.attack.age<.7){const charge=e.attack.age/.7;orb(r.muzzleX,r.muzzleY,12+charge*22,r.organic?'#b8ef89':'#ffd8a1',.2+charge*.5);}if(pulse>0)orb(r.muzzleX,r.muzzleY,12*r.scale,r.organic?'#b8ef89':'#ffd8a1',pulse*.55)}
// A complete roll around the hull's longitudinal axis; no scale changes.
function mechanicalFlightRoll(e){
 const age=e.age+(e.phase||0)*.3;
 // Light interceptors spin continuously; gunships brace briefly between rolls.
 if(e.type!==2)return age*TAU/.75;
 const cycle=((age%2.8)+2.8)%2.8;
 return TAU*passEase(clamp((cycle-.35)/.75,0,1));
}
function drawMechanicalPropulsion(e,yaw,roll,pitch){
 const drive=clamp((e.swimSpeed||e.speed)/Math.max(1,e.speed),.5,1.5),pulse=.5+.5*Math.sin((e.age+(e.phase||0))*18),length=30+drive*28+pulse*12;
 for(const side of [-1,1]){
  const mount=[35,side*(e.type===2?22:16),-3],base=projectHull(mount,yaw,roll,pitch),nozzle=projectHull([mount[0]+20,mount[1],mount[2]],yaw,roll,pitch),tip=projectHull([mount[0]+20+length,mount[1],mount[2]],yaw,roll,pitch);
  ctx.save();ctx.translate(e.x+nozzle.x,e.y+nozzle.y);ctx.rotate(Math.atan2(tip.y-nozzle.y,tip.x-nozzle.x));ctx.globalCompositeOperation='lighter';
  const jet=ctx.createLinearGradient(0,0,length,0);jet.addColorStop(0,'#eefaff');jet.addColorStop(.25,'#64ccff');jet.addColorStop(1,'#268bff00');
  poly([[0,-4-pulse*2],[length,0],[0,4+pulse*2]],jet);orb(0,0,12+pulse*4,'#7cdcff',.45);ctx.restore();
  drawModel(meshes.vectorEngine,e.x+base.x,e.y+base.y,.7,yaw,roll,pitch,e.age,e.hit);
 }
}
// Habitat equipment is rigid, retained 3D geometry. It shares the creature's
// body transform while tentacles and fins remain free to articulate.
const habitatEquipmentMeshes=new Map();
function habitatEquipment(kind){
 if(habitatEquipmentMeshes.has(kind))return habitatEquipmentMeshes.get(kind);
 const m=meshBuilder(),pressure=kind==='pressure',metal=pressure?[119,157,151]:[177,162,119],dark=[40,58,65],light=pressure?[97,221,177]:[116,204,255];
 for(const side of [-1,1]){
  const y=side*23,z=-14;m.ellipsoid(7,y,z,20,7,7,metal,0,14,8);m.ellipsoid(25,y,z,3,6,6,dark,0,12,6);m.ellipsoid(28,y,z,1.4,3.8,3.8,light,.7,10,5);
  m.tube([[-12,y,z],[-22,side*17,-22],[-26,side*12,-19]],1.6,dark,0,0,6,2);
  for(const x of [-3,14])m.tube([[x,y-6,z],[x,y-4,z-6],[x,y+4,z-6],[x,y+6,z]],1,pressure?dark:[87,102,111],0,0,6,1);
  if(pressure)for(let i=0;i<3;i++)m.tube([[2+i*5,y-4,z-6],[2+i*5,y+4,z-6]],.8,light,0,.15,5,1);
  else m.wedge([1,y,z-7],[16,y+side*8,z-13],[23,y,z-7],1.5,dark);
 }
 m.tube([[-4,-22,-14],[-4,-12,-24],[-4,12,-24],[-4,22,-14]],1.4,metal,0,0,7,1);
 const result={mesh:m.faces,kind};habitatEquipmentMeshes.set(kind,result);return result;
}
function creatureAugmentation(e,definition=sectors[level]){
 if(e.brood||e.satellite||e.sentry||!isOrganicEnemy(e))return null;
 const kind=ENVIRONMENTS[definition.environment]?.augmentation;
 return kind&&(e.type===1||e.elite)?kind:null;
}
function drawHabitatEquipment(e,yaw,roll,pitch){
 const kind=creatureAugmentation(e);if(!kind)return;
 const kit=habitatEquipment(kind),age=e.age+e.phase,thrust=.35+.65*Math.pow(Math.max(0,Math.cos(age*4.8)),3),pressure=kind==='pressure';
 drawModel(kit.mesh,e.x,e.y,1,yaw,roll,pitch,age,e.hit);
 for(const side of [-1,1]){const a=projectHull([29,side*23,-14],yaw,roll,pitch),b=projectHull([42+thrust*(pressure?15:35),side*23,-14],yaw,roll,pitch),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len*3,ny=dx/len*3;
 ctx.save();ctx.globalAlpha=pressure?.38:.6;const g=ctx.createLinearGradient(e.x+a.x,e.y+a.y,e.x+b.x,e.y+b.y);g.addColorStop(0,pressure?'#b0ffe0':'#c0ecff');g.addColorStop(1,pressure?'#74cec000':'#75baff00');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(e.x+a.x+nx,e.y+a.y+ny);ctx.quadraticCurveTo(e.x+b.x+nx,e.y+b.y+ny,e.x+b.x,e.y+b.y);ctx.quadraticCurveTo(e.x+b.x-nx,e.y+b.y-ny,e.x+a.x-nx,e.y+a.y-ny);ctx.closePath();ctx.fill();ctx.restore();
 if(pressure)for(let i=1;i<4;i++){const u=((age*2+i*.29)%1),p=projectHull([30+u*(20+thrust*25),side*23+Math.sin(age*3+i)*u*5,-14],yaw,roll,pitch);ctx.save();ctx.globalAlpha=(1-u)*.35;ctx.strokeStyle='#c0f8ef';ctx.lineWidth=.65;ctx.beginPath();ctx.arc(e.x+p.x,e.y+p.y,1+u*1.8,0,TAU);ctx.stroke();ctx.restore();}}
}
function drawEnemy(e){
 if(e.x< -180||e.x>W+180||e.y< -180||e.y>H+180)return;
 if(e.sentry){ctx.save();ctx.strokeStyle='#83939d';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(e.x,e.y-35);ctx.lineTo(e.x,e.y);ctx.stroke();ctx.restore();drawModel(meshes.sentry,e.x,e.y,1,0,0,0,e.age,e.hit);drawEmitter(e);healthBar(e.x,e.y+40,65,e.hp,e.max,'#ffbd78');return;}
 const native=nativeSpeciesMesh(e);if(native?.nativeAnatomy){const p=speciesFlightPose(e);drawNativePropulsion(e,native,p);drawModel(native,e.x,e.y,p.scale,p.yaw,p.roll,p.pitch,p.age,e.hit);drawEmitter(e);if(e.brood||e.elite||e.hp<e.max)healthBar(e.x,e.y-(e.brood?85:e.r+24),e.brood?100:64,e.hp,e.max,isOrganicEnemy(e)?'#9cffc3':'#ffb797');return;}
 if(e.brood){drawModel(meshes[e.escortProfile?.model||'broodMother'],e.x,e.y,1.4,e.travelYaw||0,organicSpin(e.age+e.phase).roll,(e.travelPitch||0)+organicSpin(e.age+e.phase).pitch,e.age+e.phase,e.hit,e.escortProfile&&(!e.escortProfile.organic||e.escortProfile.rig==='appendages')?null:'octopus');drawEmitter(e);healthBar(e.x,e.y-97,100,e.hp,e.max,'#b4f1b1');return}
 if(e.satellite){const a=e.age*TAU/.75+e.orbit;orb(e.x,e.y,23,'#80ffd5',.13);drawModel(meshes[e.escortProfile?.escort||'swarmlet'],e.x,e.y,e.escortProfile?.5:.82,e.travelYaw||0,a,e.travelPitch||0,e.age+e.phase,e.hit,e.escortProfile&&(!e.escortProfile.organic||e.escortProfile.rig==='appendages')?null:'squid');if(e.escortProfile)drawEmitter(e);if(e.hit>0)healthBar(e.x,e.y-30,32,e.hp,e.max,'#b4f1b1');return}

 const organic=isOrganicEnemy(e),activity=organic?organicSpin(e.age+e.phase):null,yaw=e.travelYaw||0,pitch=(e.travelPitch||0)+(activity?.pitch||0),roll=organic?activity.roll+clamp(-pitch*.45,-.18,.18):mechanicalFlightRoll(e)-pitch*.65;
 if(!organic)drawMechanicalPropulsion(e,yaw,roll,pitch);
 drawModel(meshes[sectors[level].models[e.type]],e.x,e.y,1,yaw,roll,pitch,e.age+e.phase,e.hit,themeIndex()===0?(e.type===1?'squid':e.type===3?'octopus':null):organic?(e.type===1?'ray':themeIndex()===2?null:'octopus'):null);
 if(organic)drawHabitatEquipment(e,yaw,roll,pitch);
 if(!organic&&e.type===0){const p=projectHull([20,0,0],yaw,roll,pitch);drawModel(meshes.rotor,e.x+p.x,e.y+p.y,.95,yaw,roll+e.age*11,pitch,e.age,e.hit)}
 if(!organic&&e.type===2)for(const side of [-1,1]){const p=projectHull([25,side*22,0],yaw,roll,pitch);drawModel(meshes.rotor,e.x+p.x,e.y+p.y,.45,yaw,roll-e.age*13+side,pitch,e.age,e.hit)}
 if(e.type===1&&e.stroke>.75){const p=projectHull([29,0,0],yaw,roll,pitch);orb(e.x+p.x+8,e.y+p.y,18,'#6cdbb2',(e.stroke-.75)*.5)}
 if(themeIndex()===2&&e.type===3&&!meshes[sectors[level].models[e.type]].fauna)for(const side of [-1,1]){const hinge=projectHull([0,side*12,0],yaw,roll,pitch),fold=side*(.4+Math.sin((e.age+e.phase)*9)*.85);drawModel(meshes.scarabWing,e.x+hinge.x,e.y+hinge.y,1,yaw,roll+(side===1?fold:Math.PI-fold),pitch,e.age,e.hit);}
 if(themeIndex()===1&&!organic)for(const side of [-1,1]){const mount=projectHull([28,side*(e.type===2?27:20),-10],yaw,roll,pitch),vector=clamp((e.travelPitch||0)*1.1,-.35,.35);drawModel(meshes.vectorEngine,e.x+mount.x,e.y+mount.y,1,yaw,roll,pitch+vector,e.age,e.hit);orb(e.x+mount.x+22,e.y+mount.y,13,'#ffb067',.3+(e.stroke||0)*.3);}
 drawEmitter(e);if(e.elite){ctx.save();ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillStyle=e.elite==='hunter'?'#ffbc79':'#ff849f';ctx.fillText(e.elite==='hunter'?'MISSILE HUNTER':'ACE INTERCEPTOR',e.x,e.y-e.r-34);ctx.restore()}if(e.max>5&&(e.hp<e.max||e.elite))healthBar(e.x,e.y-e.r-24,e.elite?80:e.type===2?64:46,e.hp,e.max,e.hit>0?'#fff':organic?'#9cffc3':'#ffb797');
}
function bossFlightPose(b){return{yaw:(b.turnYaw||0)+(b.flightYaw||0),pitch:(b.flightPitch||0)+(b.beamPitch||0),roll:(b.flightBank||0)+(b.maneuverRoll||0)+(b.barrelRoll||0),depth:1};}
// A separately aimed organic cannon is mounted in the front-facing cheek socket.
function bossLaserRig(b){const body=bossFlightPose(b),mount=rotateVertex([-30,0,-17],body.yaw,body.roll,body.pitch,0,0),root={x:b.x-35+mount[0]*2.35*body.depth,y:b.y+mount[1]*2.35*body.depth},h=hazards[0];return{...root,scale:1.9*body.depth,yaw:h?-.5:body.yaw-.25,roll:h?0:body.roll,pitch:h?Math.atan2(root.y-h.y,root.x):body.pitch};}
function bossLaserOrigin(b){const rig=bossLaserRig(b),v=rotateVertex(bossLaserMeshes[0].tip,rig.yaw,rig.roll,rig.pitch,0,0);return{x:rig.x+v[0]*rig.scale,y:rig.y+v[1]*rig.scale,scale:rig.scale/1.9};}
function drawBossWeapon(b){
 const rig=bossLaserRig(b),parts=bossLaserMeshes[0],h=hazards[0],opening=h?clamp(h.age/.5,0,1):0,charge=h?clamp(h.age/h.warning,0,1):0;
 for(const f of parts.iris)for(const v of f.v){v[0]=v.rest[0]+opening*6;v[1]=v.rest[1]+v.axis[0]*opening*16;v[2]=v.rest[2]+v.axis[1]*opening*16;}
 for(const f of parts.core)for(const v of f.v)for(let i=0;i<3;i++)v[i]=parts.center[i]+(v.rest[i]-parts.center[i])*(.35+charge*.65);
 drawModel(meshes.laserSocket,rig.x,rig.y,rig.scale,rig.yaw,rig.roll,rig.pitch,b.age,0);
 for(const mesh of [parts.barrel,parts.core,parts.iris])drawModel(mesh,rig.x,rig.y,rig.scale,rig.yaw,rig.roll,rig.pitch,b.age,0);
 // External vascular capacitor swells before discharge; its light runs toward the muzzle.
 if(h)for(let i=0;i<5;i++){const v=rotateVertex([-10-i*10,-18,-15],rig.yaw,rig.roll,rig.pitch,0,0);orb(rig.x+v[0]*rig.scale,rig.y+v[1]*rig.scale,4+charge*3,'#a0ffe3',.15+charge*.45);}
}
function drawBossChamber(b){
 const h=hazards[0];if(!h)return;const p=bossLaserOrigin(b),charge=clamp(h.age/h.warning,0,1);
 orb(p.x,p.y,(10+charge*12)*p.scale,sectors[level].color,.12+charge*.28);
}
function serpentSegments(b){const pose=bossFlightPose(b);return Array.from({length:11},(_,i)=>{const q=i+1,v=projectHull([q*21+Math.sin(b.age*.9-q*.3)*q*3,Math.sin(b.age*1.8-q*.48)*q*12,Math.cos(b.age-q*.3)*q*5],pose.yaw,pose.roll,pose.pitch);return{x:b.x-30+v.x*pose.depth,y:b.y+v.y*pose.depth,scale:(2.1-q*.12)*pose.depth}})}
// Body-space sockets, animation and collision volumes share one transform.
function planetBossAnatomy(base,definition,palette){
 const species=planetSpecies.get(definition.biosphere.species[4]),stretch=[.9+species.length*.13,.88+species.girth*.14,.82+species.span*.22],point=p=>p.map((v,i)=>v*stretch[i]),vertices=new Map(),rest=new Map();
 for(const part of base.parts)part.vertices.forEach((v,i)=>rest.set(v,part.rest[i]));
 const clone=v=>{if(!vertices.has(v))vertices.set(v,point(rest.get(v)||v));return vertices.get(v);};
 const mesh=base.mesh.map(f=>({...f,v:f.v.map(clone),c:f.c.map((v,i)=>Math.min(255,Math.round(v*palette[i]*.7+species.color[i]*.3)))}));
 for(const key of ['skin','dynamic','alienMaterial'])mesh[key]=base.mesh[key];
 const parts=base.parts.map(p=>({...p,pivot:p.pivot&&point(p.pivot),knee:p.knee&&point(p.knee),vertices:p.vertices.map(clone),rest:p.rest.map(point)}));
 // Planet-specific dorsal combs and sensory filaments are real closed meshes,
 // attached to the same spine animation as the inherited anatomical rig.
 const m=meshBuilder(),center=base.bodyVolumes[0].center,radii=base.bodyVolumes[0].radii,count=2+(speciesHash(species.id)%4);
 for(let i=0;i<count;i++){const x=center[0]-radii[0]*.35+i*12,y=center[1]-radii[1]*.85;m.wedge(point([x,y,0]),point([x+7,y-12-i*2,0]),point([x+15,y,0]),2,species.accent);}
 const shellVertices=[...new Set(m.faces.flatMap(f=>f.v))];parts.push({name:'planet-dorsal-comb',rig:'shell',vertices:shellVertices,rest:shellVertices.map(v=>v.slice())});mesh.push(...m.faces);
 for(const side of [-1,1]){const feeler=meshBuilder(),pivot=point([base.mouth[0]*.68,-12,side*11]);feeler.tube([pivot,[pivot[0]-18,-32,side*21],[pivot[0]-38,-44,side*(24+count*4)]],1.4,species.accent,0,0,7,3);const vv=[...new Set(feeler.faces.flatMap(f=>f.v))];parts.push({name:'planet-sensory-fan',rig:'feeler',pivot,side,index:count,lengthScale:1,vertices:vv,rest:vv.map(v=>v.slice())});mesh.push(...feeler.faces);}
 return{...base,mesh,parts,mouth:point(base.mouth),bodyVolumes:base.bodyVolumes.map(v=>({...v,center:point(v.center),radii:point(v.radii)}))};
}
const bossVariants=new Map();
function bossDesign(kind=bossIndex()){
 if(kind===1&&typeof isCapitalSiege==='function'&&isCapitalSiege(typeof boss==='undefined'?null:boss))return capitalShipDesign(boss);
 const base=(typeof alienBossDesigns!=='undefined'&&alienBossDesigns[kind])||(typeof machineBossDesigns!=='undefined'&&machineBossDesigns[kind])||null,definition=sectors[level],palette=definition.bossPalette||(definition.biosphere?[1,1,1]:null);
 if(!base||!palette||kind!==bossIndex())return base;
 if(!bossVariants.has(definition.id)){while(bossVariants.size>=4)bossVariants.delete(bossVariants.keys().next().value);if(definition.biosphere?.boss){bossVariants.set(definition.id,buildSpeciesBoss(definition.biosphere.boss,base,definition.systemChallenge?.progress||0));}else{const mesh=base.mesh.map(f=>({...f,c:f.c.map((v,i)=>Math.min(255,Math.round(v*palette[i])))}));for(const k of ['skin','dynamic','alienMaterial'])mesh[k]=base.mesh[k];bossVariants.set(definition.id,{...base,mesh});}}
 return bossVariants.get(definition.id);
}
// Measure the rendered model rather than the small gameplay collision radius.
// Authored GLBs have their own bounds; the CPU fallback uses its actual mesh.
function bossEntryRadius(b){
 const d=bossDesign();if(!d)return Math.max(200,b.r||0);
 const gpuRadius=window.gpuModels?.modelRadius?.(d.mesh);let radius=0;
 if(Number.isFinite(gpuRadius))radius=gpuRadius;
 else{for(const face of d.mesh)for(const v of face.v)radius=Math.max(radius,Math.hypot(...v));radius+=90;}
 for(const v of d.bodyVolumes||[])radius=Math.max(radius,Math.hypot(...v.center)+Math.hypot(...v.radii));
 return radius*d.scale;
}
function beginBossEntry(b){
 const radius=bossEntryRadius(b),toX=isCapitalSiege(b)?900:W*.72;
 b.x=W+radius+48;b.y=H*.5;b.navVX=b.navVY=0;
 b.entry={age:0,fromX:b.x,toX,radius,duration:clamp((b.x-toX)/300,2.4,4.4)};
 window.gpuModels?.prepare?.([bossDesign().mesh]);
}
function updateBossEntry(b,dt){
 const e=b.entry,oldX=b.x;e.age+=dt;const u=clamp(e.age/e.duration,0,1),ease=u*u*(3-2*u);
 b.x=e.fromX+(e.toX-e.fromX)*ease;b.navVX=(b.x-oldX)/dt;
 updateBossAttitude(b,dt,b.navVX,0);
 if(u===1){b.x=e.toX;b.navVX=b.navVY=0;b.entry=null;}
}
function bossLocalPoint(b,local){return bossOrganic()&&!bossDesign()?.procedural&&typeof alienBossPoint==='function'?alienBossPoint(bossIndex(),b,local):local;}
function bossMount(b,local){const d=bossDesign(),p=bossFlightPose(b),v=rotateVertex(bossLocalPoint(b,local),p.yaw,p.roll,p.pitch,0,0),scale=d.scale*p.depth;return{x:b.x+v[0]*scale,y:b.y+v[1]*scale};}
// Exhaust follows the animated engine outlet through the same body transform.
function drawBossDrives(b,d){
 if(!d.drives)return;const thrust=b.propulsion||0,scale=d.scale*bossFlightPose(b).depth;
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(const drive of d.drives){
  const ignition=b.siege?.nodes.find(n=>n.id==='reactor')?.special;
  if(ignition?.kind==='purge'&&d.drives[ignition.driveIndex||0]===drive)continue;
  const length=26+thrust*53+(Math.sin(b.age*34)+Math.sin(b.age*51))*(2+thrust*3),a=bossMount(b,drive.center),end=drive.center.map((v,i)=>v+drive.axis[i]*length),z=bossMount(b,end),dx=z.x-a.x,dy=z.y-a.y,n=Math.hypot(dx,dy)||1,r=drive.radius*scale,nx=-dy/n*r,ny=dx/n*r;
  const glow=ctx.createLinearGradient(a.x,a.y,z.x,z.y);glow.addColorStop(0,'rgba(209,245,255,.86)');glow.addColorStop(.22,'rgba(104,203,255,.65)');glow.addColorStop(.65,'rgba(92,143,255,.22)');glow.addColorStop(1,'rgba(69,114,255,0)');
  ctx.fillStyle=glow;ctx.beginPath();ctx.moveTo(a.x+nx,a.y+ny);ctx.quadraticCurveTo(a.x+dx*.5+nx*.55,a.y+dy*.5+ny*.55,z.x,z.y);ctx.quadraticCurveTo(a.x+dx*.5-nx*.55,a.y+dy*.5-ny*.55,a.x-nx,a.y-ny);ctx.closePath();ctx.fill();orb(a.x,a.y,r*.85,'#b6eaff',.45+thrust*.25);
 }
 ctx.restore();
}
function drawDesignedBoss(b,d){const k=bossIndex(),p=bossFlightPose(b);if(!d.procedural){if(bossOrganic())window.animateAlienBoss(k,b,d);else animateMachineBoss(k,b);}drawBossDrives(b,d);drawModel(d.mesh,b.x,b.y,d.scale*p.depth,p.yaw,p.roll,p.pitch,b.age*(d.mesh.development?.appendageRate||1),b.hit);const m=bossMount(b,d.mouth),pulse=clamp((b.muzzle||0)/.16,0,1);if(pulse)orb(m.x,m.y,8+6*pulse,bossOrganic()?'#e9a976':'#b7e7ff',pulse*.55);if(k===4&&hazards.length){const h=hazards[0],charge=clamp(h.age/h.warning,0,1);orb(m.x,m.y,8+charge*23,'#b6efff',.3+charge*.45);}}
function drawMenace(b){
 const design=bossDesign();if(design){drawDesignedBoss(b,design);return;}
 if(bossIndex()===0){drawWardenCreature(b);return;}
 if(bossIndex()>=3){drawExpansionBoss(b);return;}

 const {yaw,pitch,roll,depth}=bossFlightPose(b);
 if(bossIndex()===0){drawModel(meshes.hiveHead,b.x-35,b.y,2.35*depth,yaw,roll,pitch,b.age,b.hit)}
 else if(bossIndex()===1){drawModel(meshes.cathedral,b.x,b.y,2.15*depth,yaw,roll,pitch*.5,b.age,b.hit);for(const side of [-1,1]){const mount=projectHull([4,side*45,-5],yaw,roll,pitch*.5);drawModel(meshes.rotor,b.x+mount.x*2.15*depth,b.y+mount.y*2.15*depth,1.5*depth,yaw,b.age*2,0,b.age,b.hit)}}
 else {animateAnatomicalSkin(meshes.voidLeviathan,b.age);animateSovereignFins(b.age);drawModel(meshes.sovereignFins,b.x-20,b.y,2.3*depth,yaw,roll,pitch,b.age,b.hit);drawModel(meshes.voidLeviathan,b.x-20,b.y,2.3*depth,yaw,roll,pitch,b.age,b.hit)}
 drawBossArms(b);if(bossIndex()===2)drawAnatomicalJaw(b);if(!bossOrganic())drawBossPorts(b);if(!hazards.length&&!bossOrganic())drawEmitter(b,true);
}
// Specials have a locked warning, a finite attack and a recovery window.
function bossPort(b,side){if(bossDesign())return bossMount(b,bossDesign().guns?.[side<0?0:1]||bossDesign().mouth);const p=bossFlightPose(b),scale=bossIndex()===1?2.15:2.3,v=rotateVertex([-28,side*35,-24],p.yaw,p.roll,bossIndex()===1?p.pitch*.5:p.pitch,0,0);return{x:b.x+(bossIndex()===2?-20:0)+v[0]*scale*p.depth,y:b.y+v[1]*scale*p.depth};}
function drawBossPorts(b){const p=bossFlightPose(b);drawModel(meshes[bossIndex()===1?'bossRacks':'sporeGlands'],b.x+(bossIndex()===2?-20:0),b.y,(bossIndex()===1?2.15:2.3)*p.depth,p.yaw,p.roll,bossIndex()===1?p.pitch*.5:p.pitch,b.age,b.hit);if(b.charge>0)for(const side of [-1,1]){const r=bossPort(b,side);orb(r.x,r.y,18+Math.sin(b.age*20)*4,sectors[level].color,.55)}}
// Repeatable flight routes give each body a distinct rhythm. Interpolated path
// tangents and a damped drive keep velocity continuous between waypoints.
const bossFlightRoutes=[
 {period:16,drive:4.4,speed:390,points:[[1150,350],[940,185],[735,315],[910,565],[1200,480],[1100,235]]},
 {period:22,drive:3,speed:300,points:[[1170,210],[1020,195],[750,345],[865,565],[1180,520],[1210,335]]},
 {period:18,drive:3.8,speed:410,points:[[1140,340],[1010,555],[710,475],[815,200],[1110,195],[1200,380]]},
 {period:23,drive:3.1,speed:340,points:[[1180,410],[1040,195],[755,250],[870,555],[1185,545],[1150,340]]},
 {period:14,drive:4.6,speed:430,points:[[1170,190],[850,235],[720,430],[980,560],[1200,410],[1060,285]]},
 {period:12.8,drive:3.8,speed:455,points:[[1170,320],[1160,325],[860,185],[850,190],[1075,540],[1080,530],[715,395],[730,390],[1190,245],[1180,250]]}
];
function bossRoutePoint(kind,t,r=bossFlightRoutes[kind]){const n=r.points.length,q=((t/r.period*n)%n+n)%n,i=Math.floor(q),u=q-i,u2=u*u,u3=u2*u;const a=r.points[(i+n-1)%n],b=r.points[i],c=r.points[(i+1)%n],d=r.points[(i+2)%n];return{x:.5*((2*b[0])+(-a[0]+c[0])*u+(2*a[0]-5*b[0]+4*c[0]-d[0])*u2+(-a[0]+3*b[0]-3*c[0]+d[0])*u3),y:.5*((2*b[1])+(-a[1]+c[1])*u+(2*a[1]-5*b[1]+4*c[1]-d[1])*u2+(-a[1]+3*b[1]-3*c[1]+d[1])*u3)};}
function driveBoss(b,target,dt,drive,speed){
 const vx=b.navVX||0,vy=b.navVY||0;let nx=vx+((target.x-b.x)*drive*drive-2*drive*vx)*dt,ny=vy+((target.y-b.y)*drive*drive-2*drive*vy)*dt;
 const magnitude=Math.hypot(nx,ny),limit=speed/Math.max(speed,magnitude);b.navVX=nx*limit;b.navVY=ny*limit;b.x+=b.navVX*dt;b.y+=b.navVY*dt;
}
function moveBoss(b,dt){if(isTideEncounter()){moveTideBoss(b,dt);return;}if(sectors[level].medium==='water')dt*=WATER_HANDLING.bossMotion;if(typeof isCapitalSiege==='function'&&isCapitalSiege(b)){moveCapitalShip(b,dt);return;}const kind=bossIndex(),oldX=b.x,oldY=b.y;
 const crossing=![1,4].includes(kind)&&updateBossPass(b,dt);
 if(!crossing&&Math.abs(ship.x-b.x)>120&&!b.breath){const targetYaw=ship.x>b.x?Math.PI:0;b.turnYaw=(b.turnYaw||0)+clamp(targetYaw-(b.turnYaw||0),-dt*2.4,dt*2.4);}
 if(crossing){b.navVX=(b.x-oldX)/dt;b.navVY=(b.y-oldY)/dt;}
 else{
  const route=sectors[level].flightRoute||bossFlightRoutes[kind];b.patrolTime=(b.patrolTime||0)+dt*(1.25+bossCombatPhase(b)*.12);
  let target=bossRoutePoint(kind,b.patrolTime,route),drive=route.drive*1.15,speed=route.speed*1.25;
  const braced=kind===4&&(b.charge>0||hazards.some(h=>h.kind==='tech'));
  if(braced){b.weaponAnchor??={x:b.x,y:b.y};target=b.weaponAnchor;drive=5;speed=220;}
  else b.weaponAnchor=null;
  if(kind===2&&b.rush>0){target={x:400,y:b.lockY};drive=4.5;speed=570;}
  if(kind===3&&b.vacuum>0){target={x:920,y:clamp(b.lockY??380,180,580)};drive=2.7;speed=190;}
  // Breathing retains gentle flight but cannot make an unannounced sweeping beam.
  if(b.breath)speed=Math.min(speed,165);
  // Recovering creatures keep flying, but hold a readable counterattack lane.
  if(b.exposed>0)speed=Math.min(speed,105);
  driveBoss(b,target,dt,drive,speed);
 }
 updateBossAttitude(b,dt,(b.x-oldX)/dt,(b.y-oldY)/dt);
}
// Attitude comes from the flight forces and attack phase, not a looping bob.
function updateBossAttitude(b,dt,vx,vy){
 const kind=bossIndex(),organic=bossOrganic(),siege=typeof isCapitalSiege==='function'&&isCapitalSiege(b),response=1-Math.exp(-dt*7),oldVX=b.flightVX||0,oldVY=b.flightVY||0;
 b.flightVX=oldVX+(vx-oldVX)*response;b.flightVY=oldVY+(vy-oldVY)*response;
 const ax=(b.flightVX-oldVX)/dt,ay=(b.flightVY-oldVY)/dt,face=Math.cos(b.turnYaw||0),stage=b.pass?.stage,braced=kind===4&&((b.charge||0)>0||hazards.some(h=>h.kind==='tech'));
 const pitch=braced?0:clamp(Math.atan2(-face*b.flightVY,300+Math.abs(b.flightVX)*.5),organic?-.52:siege?-.10:-.32,organic?.52:siege?.10:.32);
 const turnWeight=1-Math.abs(Math.sin(b.turnYaw||0)),bank=braced?0:clamp((b.flightVY*.004+ay*.0016)*turnWeight,organic?-.95:siege?-.16:-.5,organic?.95:siege?.16:.5),yaw=braced?0:clamp(-ax*.00075,siege?-.10:-.4,siege?.10:.4)*turnWeight;
 b.flightPitch=(b.flightPitch||0)+(pitch-(b.flightPitch||0))*response;b.flightBank=(b.flightBank||0)+(bank-(b.flightBank||0))*response;b.flightYaw=(b.flightYaw||0)+(yaw-(b.flightYaw||0))*response;
 const load=siege?(b.siegeLoad||0):['warn','returnWarn'].includes(stage)?passEase((b.pass.age||0)/1.55):(b.charge>0?clamp(1-b.charge/1.7,0,1):0),strike=siege?(b.siegeStrike?1:0):['dash','return'].includes(stage)||b.rush>0?1:0;
 b.actionLoad=(b.actionLoad||0)+(load-(b.actionLoad||0))*response;b.attackDrive=(b.attackDrive||0)+(strike-(b.attackDrive||0))*response;
 b.maneuverRoll??=0;
 if(b.pass){const p=b.pass;if(p.rollStage!==stage){p.rollStage=stage;p.rollStart=b.maneuverRoll;}
  if(stage==='dash'||stage==='return'){const u=clamp(p.age/bossPassProfiles[kind].dash,0,1),sign=stage==='dash'?1:-1;
   b.maneuverRoll=p.rollStart+(kind===3?Math.sin(u*Math.PI)**2*1.15:sign*(kind===5?-1:1)*TAU*passEase(u));
  }
 }
 const effort=clamp(Math.hypot(vx,vy)/450,0,1);b.propulsion=(b.propulsion||0)+(effort-(b.propulsion||0))*response;b.propulsionTime=(b.propulsionTime||0)+dt*(1.62+effort*1.08+.32*(1-clamp(b.hp/(b.max||b.hp||1),0,1)));b.depth=1;
}

function bossCombatPhase(b){const ratio=b.max>0?b.hp/b.max:1;return ratio<.28?2:ratio<.62?1:0;}
function bossPatternBusy(b){return !!(bossIndex()===0&&b.exposed>0||b.venom||(b.pass&&b.pass.stage!=='rear')||b.breath||b.charge>0||b.rush>0||b.vacuum>0||b.barrage>0||b.rackShots>0||b.sporePods?.length||b.salvoWindup||hazards.length||acidClouds.some(h=>h.bossTrap));}
function holdBossSalvo(b){b.shoot=Math.max(b.shoot||0,.52);b.attack=null;b.fireHeading=null;}
function bossEncounterHint(b){if(isTideEncounter())return b.exposed>0?'MANTLE OPEN · BONUS DAMAGE':'BREAK TIDE KNOTS · ESCAPE THROUGH THE RING GAPS';const k=bossIndex(),phase=bossCombatPhase(b);if(b.exposed>0)return 'ALIGN WITH THE GLOWING WEAK POINT · BONUS DAMAGE';if(b.pass)return 'DODGE THE CHARGE · FLIP TO FACE THE BOSS';if(k===0)return b.breath?.kind==='wind'?'WINGSTORM · CUT ACROSS THE PRESSURE':b.breath?'FIRE BREATH · WATCH ITS MOUTH':bossTechnique(sectors[level]).response;if(k===2)return 'PRESSURE SWEEPS · MOVE AHEAD OF THE STREAM';if(k===3)return b.vacuum>0?'FIGHT THE PULL · ESCAPE ABOVE OR BELOW':'SPORE TRAPS · KEEP THE CLEAR CORRIDOR';if(k===4)return b.capacitorSalvo?'CAPACITOR LOCK · SIDESTEP THE BURST':'ARMORED · BAIT THE SWEEP THEN AIM AT THE VENT';if(k===5)return b.broodWatch?'BREAK THE GUARDIAN BROOD':'BROOD → DIVE → VENOM TEMPEST'+(phase===2?' · ENRAGED':'');return '';}
function updateBossSpecial(b,dt){
 if(isTideEncounter()){updateTideEncounter(b,dt);return;}
 if(typeof isCapitalSiege==='function'&&isCapitalSiege(b)){updateCapitalSiege(b,dt);return;}
 const kind=bossIndex(),profile=bossEncounterProfile(sectors[level]),phase=bossCombatPhase(b),hadBreath=!!b.breath;
 b.recovery=Math.max(0,(b.recovery||0)-dt);updateBreath(b,dt);updateTechLaser(b,dt);updateBossSporePods(b,dt);updateEyeAttack(b,dt);
 if(hadBreath&&!b.breath){b.recovery=2.4;b.exposed=Math.max(b.exposed||0,3);announce('HOSTILE RECOVERING','ATTACK NOW · BONUS DAMAGE');if(kind===0&&b.wardenCombo){b.wardenCombo=false;b.passClock=0;}}
 if(b.comboPassPending&&b.pass)b.comboPassStarted=true;
 // The queen's elemental follow-up belongs to the far-side fight, rather
 // than waiting until she has crossed back to the right of the screen.
 if(b.comboPassPending&&b.pass?.stage==='rear'&&b.pass.age>=.8){b.comboPassPending=false;b.comboPassStarted=false;}
 if(b.comboPassPending&&b.comboPassStarted&&!b.pass){b.comboPassPending=false;b.comboPassStarted=false;b.recovery=1.6;}
 if(b.pass&&b.pass.stage!=='rear'){b.charge=0;b.salvoWindup=null;holdBossSalvo(b);return;}
 if(kind>=3){updateExpansionBoss(b,dt);return;}
 b.rush=Math.max(0,(b.rush||0)-dt);
 if(bossPatternBusy(b)||b.recovery>0){holdBossSalvo(b);}else if(b.recovery<=0)b.special-=dt;
 if(b.special<=0&&!bossPatternBusy(b)&&!b.recovery){
  b.lockY=clamp(ship.y,110,H-110);b.lockX=ship.x;b.specialCount=(b.specialCount||0)+1;b.special=(profile.cooldown-phase*profile.phaseStep)*COMBAT_BALANCE.specialRest;
  if(profile.power==='furnace-gale'){const wingstorm=phase>0&&b.specialCount%2===0;if(wingstorm){startBreath(b,'wind',1.15,{duration:1.25+phase*.18,sweep:.24+phase*.07});announce('WARDEN WINGS LOCKING','CROSS THE PRESSURE BEFORE IT BUILDS');}else{startBreath(b,'fire',profile.warning,{duration:1.65+phase*.25});b.wardenCombo=phase===2&&b.specialCount%3===0;announce('WARDEN INHALING',b.wardenCombo?'FIRE WILL FLOW INTO A DIVING STRIKE':'KEEP CLEAR OF ITS MOUTH');}}
  else if(profile.power==='tidal-pressure'){const pressure=phase>0&&b.specialCount%2===0;startBreath(b,pressure?'wind':'water',profile.warning,{duration:pressure?1.8:2.3+phase*.2,sweep:(pressure?.38:.20)+phase*.025});b.pressureFollowup=pressure;announce(pressure?'PRESSURE FRONT BUILDING':profile.signature,pressure?'DODGE THE PUSH · A WATER JET FOLLOWS':'MOVE AHEAD OF THE BLUE SWEEP');}
  else{b.charge=1.5;b.specialFired=false;announce('MISSILE RACKS OPEN','MOVE AWAY FROM THE TARGET MARKER');}
 }
 if(kind===2&&b.pressureFollowup&&!b.breath&&b.recovery===0){b.pressureFollowup=false;b.lockY=clamp(ship.y,110,H-110);b.lockX=ship.x;startBreath(b,'water',1.3,{duration:1.7,sweep:-.24});announce('PRESSURE RELEASE','WATER JET · KEEP MOVING');}
 if(b.charge>0&&b.charge<=dt&&!b.specialFired){b.specialFired=true;b.shoot=3;if(kind===1){b.rackShots=8;b.rackClock=0;}}
 if(b.rackShots>0){b.rackClock-=dt;if(b.rackClock<=0){const side=b.rackShots%2?1:-1,r=bossPort(b,side),a=Math.atan2(b.lockY-r.y,b.lockX-r.x)+(b.rackShots%4-1.5)*.1;hostile.push({x:r.x,y:r.y,vx:Math.cos(a)*570,vy:Math.sin(a)*570,r:9,kind:'rocket',c:'#ffbc78'});window.flightAudio?.shot('missile',r.x,true);b.rackShots--;b.rackClock=.16;}}
 b.charge=Math.max(0,b.charge-dt);
}

function drawSpecialWarning(b){}

function laserHalfWidth(h,x){return (h.width/2)*(.5+.5*clamp(Math.abs(h.x-x)/180,0,1));}
function drawHazards(){if(boss)drawBreath(boss);for(const h of hazards){if(boss){const p=h.kind==='tech'?techLaserOrigin(boss):bossLaserOrigin(boss);h.x=p.x;h.startY=p.y;h.angle=p.angle??Math.atan2(h.y-p.y,-p.x);}const armed=h.age>=h.warning,c=h.kind==='tech'?'#bdaaff':'#83ffd6';ctx.save();
 if(armed){const angle=h.angle??Math.atan2(h.y-h.startY,-h.x),length=Math.hypot(W,H)+300;ctx.translate(h.x,h.startY);ctx.rotate(angle);glow(c,24);ctx.globalAlpha=.8;poly([[0,-h.width/4],[180,-h.width/2],[length,-h.width/2],[length,h.width/2],[180,h.width/2],[0,h.width/4]],c);ctx.globalAlpha=.95;ctx.strokeStyle='#edfff9';ctx.lineWidth=h.kind==='tech'?22:13;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(length,0);ctx.stroke();orb(0,0,h.kind==='tech'?39:28,'#eee4ff',.7);if(h.kind==='tech')for(let i=0;i<4;i++){const travel=(h.age*2.6+i*.25)%1;orb(length*travel,0,8+travel*4,'#f1eaff',.38);}}
 ctx.restore();}if(boss){if(!bossDesign()&&!bossOrganic()&&bossIndex()!==4)drawBossChamber(boss);drawSpecialWarning(boss)}}
function moveShot(s,dt){s.age+=dt;s.trail.push({x:s.x,y:s.y});if(s.trail.length>12)s.trail.shift();
 if(s.kind==='missile'){const direction=s.direction||1;let target=typeof isCapitalSiege==='function'&&isCapitalSiege(boss)?capitalShotTarget(s):(boss&&(boss.x-s.x)*direction>0?boss:null);for(const e of enemies){if(e.hp>0&&(e.x-s.x)*direction>-40&&(!target||Math.hypot(e.x-s.x,e.y-s.y)<Math.hypot(target.x-s.x,target.y-s.y)))target=e}if(target){const a=Math.atan2(target.y-s.y,target.x-s.x);s.vx+=(Math.cos(a)*600-s.vx)*Math.min(1,dt*5);s.vy+=(Math.sin(a)*600-s.vy)*Math.min(1,dt*5)}}
 s.x+=s.vx*dt;s.base+=s.vy*dt;s.y=s.kind==='helix'?s.base+Math.sin(s.age*17)*s.side*(23+power*5):s.base;
}
function drawProjectile(s){ctx.save();const c=s.c;
 if(s.trail.length>1){ctx.strokeStyle=c;ctx.lineWidth=s.kind==='wave'?7:s.kind==='beam'?8:3;ctx.lineCap='round';ctx.globalAlpha=.42;ctx.beginPath();s.trail.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.globalAlpha=1}
 ctx.translate(s.x,s.y);if(s.direction===-1&&s.kind!=='missile')ctx.rotate(Math.PI);glow(c,18);ctx.strokeStyle=c;ctx.fillStyle=c;
 if(s.kind==='wave'){ctx.lineWidth=7;ctx.beginPath();ctx.ellipse(-8,0,17,28+power*4,0,-1.2,1.2);ctx.stroke();ctx.strokeStyle='#efffff';ctx.lineWidth=2;ctx.stroke();orb(0,0,34,c,.12)}
 else if(s.kind==='missile'){ctx.rotate(Math.atan2(s.vy,s.vx));noGlow();drawModel(meshes.missile,0,0,1,0,.15,0,s.age);glow('#ffbd76',10);poly([[-12,-2],[-28-rand(0,8),0],[-12,2]],'#ffc98c')}
 else if(s.kind==='helix'){ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,13,6,s.side*s.age*8,0,TAU);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(1,0,3,0,TAU);ctx.fill()}
 else if(s.kind==='beam'){ctx.fillRect(-45,-4,65,8);ctx.fillStyle='#fff';ctx.fillRect(-42,-1,66,2);for(let i=0;i<2;i++){ctx.beginPath();ctx.ellipse(-15-i*18,0,3,12,0,0,TAU);ctx.stroke()}}
 else{ctx.beginPath();ctx.ellipse(0,0,s.kind==='drone'?12:19,4,0,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(-8,-1,20,2)}ctx.restore();
}
function organicShotKind(e){return (e&&enemySpecies(e)?.shot)||(themeIndex()===3?'water':themeIndex()===2?'wind':'fire');}
function drawBossMissile(b){
 const angle=Math.atan2(b.vy,b.vx),scale=b.scale||.9,age=b.age||0,regent=!!b.regentShot;ctx.save();ctx.translate(b.x,b.y);ctx.rotate(angle);
 // Heavy boss rounds keep a visible metal casing inside the engine glare.
 // Their longer, layered exhaust communicates force without hiding the shot.
 const ignition=clamp(age/.09,.15,1),tail=(18+ignition*30)*scale;const exhaust=ctx.createLinearGradient(-tail,0,-8*scale,0);exhaust.addColorStop(0,regent?'rgba(129,91,255,0)':'rgba(255,129,51,0)');exhaust.addColorStop(.6,regent?'rgba(167,138,255,.72)':'rgba(255,158,79,.72)');exhaust.addColorStop(1,regent?'#e4edff':'#d6ffff');
 poly([[-9*scale,-4*scale],[-tail,0],[-9*scale,4*scale]],exhaust);orb(-17*scale,0,13*scale*ignition,regent?'#b79eff':'#ffad64',.4);orb(-9*scale,0,7*scale,'#d9ffff',.8);
 drawModel(meshes.missile,0,0,scale,0,.14+Math.sin(age*11)*.07,0,age);
 ctx.strokeStyle='#fff0c7';ctx.lineWidth=1.6;ctx.globalAlpha=.65;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse((-22-i*11)*scale,0,1.5,3.8-i*.65,0,0,TAU);ctx.stroke();}ctx.restore();
}
function drawHostile(b){if(b.bossRound){drawBossMissile(b);return;}if(['fire','water','wind'].includes(b.kind)){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx));if(b.bossShot){const scale=b.scale||.9;ctx.scale(scale,scale);orb(0,0,13,b.kind==='fire'?'#ff752d':'#87ecff',.36);ctx.strokeStyle=b.kind==='fire'?'#ffd09a':'#daffff';ctx.lineWidth=2;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(-Math.min(28,8+(b.age||0)*280),side*5);ctx.quadraticCurveTo(-23,side*(12+Math.sin((b.age||0)*29)*2),-3,side*8);ctx.stroke();}}if(b.kind==='wind'){ctx.strokeStyle='#cbebeb';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.globalAlpha=.6-i*.15;ctx.beginPath();ctx.ellipse(-i*9,0,5,9+i*3,0,-1.4,1.4);ctx.stroke();}}else{for(let i=4;i>=0;i--)orb(-i*7,Math.sin((b.age||0)*25+i)*i,Math.max(3,12-i*2),b.kind==='fire'?(i>1?'#e55c2b':'#ffe09b'):'#83dfff',.65-i*.09);}ctx.globalCompositeOperation='lighter';if(b.kind==='wind'){orb(0,0,6,'#ecffff',.75);}else{const hot=b.kind==='fire'?'#fff4ca':'#eaffff';orb(0,0,9,hot,.95);ctx.strokeStyle=hot;ctx.lineWidth=3.2;ctx.beginPath();ctx.moveTo(-19,0);ctx.quadraticCurveTo(-7,-1,5,0);ctx.stroke();}ctx.restore();return;}if(b.kind==='energy'){orb(b.x,b.y,24,b.c,.35);orb(b.x,b.y,12,b.c,.95);orb(b.x-3,b.y-3,5,'#ffffff',.8);return}const angle=Math.atan2(b.vy,b.vx);ctx.save();ctx.translate(b.x,b.y);ctx.rotate(angle);if(b.kind==='spore'||b.kind==='seed'){orb(0,0,15*(b.scale||1),'#65f7ae',.35);drawModel(meshes.spore,0,0,b.scale||1,0,Math.sin(world*.03)*.3,0,world*.01);ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#83ffb8';ctx.lineWidth=2.8;ctx.beginPath();ctx.moveTo(-7,0);ctx.quadraticCurveTo(-20,Math.sin(world*.07+b.x)*6,-36,0);ctx.stroke();ctx.strokeStyle='#e5ffc3';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(-18,0);ctx.stroke();orb(5,0,3.5*(b.scale||1),'#f1ffd0',.92);}else{const seeker=b.kind==='seeker',tail=seeker?48:35,plume=ctx.createLinearGradient(-tail,0,-7,0);plume.addColorStop(0,'rgba(255,99,42,0)');plume.addColorStop(.45,'rgba(255,153,73,.55)');plume.addColorStop(1,'#d6ffff');orb(-11,0,seeker?17:13,'#ffb76e',.32);poly([[-8,-2.8],[-tail,0],[-8,2.8]],plume);ctx.strokeStyle='#e4ffff';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(-tail*.58,0);ctx.stroke();drawModel(meshes.missile,0,0,seeker?1.25:.8,0,.15,0,world*.01);orb(seeker?12:8,0,seeker?6:4.5,seeker?'#ff7765':'#ffe4b0',.78);if(seeker){ctx.strokeStyle='#ffc38a';ctx.globalAlpha=.6;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-17,-3);ctx.lineTo(-36,-1);ctx.moveTo(-17,3);ctx.lineTo(-36,1);ctx.stroke();}}ctx.restore()}
function drawPickup(d){const c=lootColors[d.type]||'#a0ffdf';ctx.save();ctx.translate(d.x,d.y+Math.sin(d.age*3)*5);orb(0,0,42,c,.25);ctx.strokeStyle=c;ctx.lineWidth=1.6;ctx.save();ctx.rotate(d.age*1.3);for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,0,25,i*TAU/3,i*TAU/3+1.3);ctx.stroke()}ctx.restore();ctx.fillStyle='#0b1d30';ctx.beginPath();ctx.arc(0,0,20,0,TAU);ctx.fill();glow(c,10);ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineWidth=2.3;
 if(d.type==='orb'){drawModel(meshes.weaponOrb,0,0,.7,.2,d.age,0,d.age);}
 else if(d.type==='speed'){for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-11+i*8,-8);ctx.lineTo(-5+i*8,0);ctx.lineTo(-11+i*8,8);ctx.stroke()}}
 else if(d.type==='companion'){for(const x of [-8,8]){poly([[x-5,-7],[x+6,0],[x-5,7]],c)}ctx.beginPath();ctx.arc(0,0,15,0,TAU);ctx.stroke()}
 else if(d.type==='shield'||d.type==='frontShield'){ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(12,-7);ctx.quadraticCurveTo(12,8,0,14);ctx.quadraticCurveTo(-12,8,-12,-7);ctx.closePath();ctx.stroke()}
 else if(d.type==='rescue'){ctx.beginPath();ctx.moveTo(0,12);ctx.bezierCurveTo(-24,-2,-13,-19,0,-7);ctx.bezierCurveTo(13,-19,24,-2,0,12);ctx.stroke();ctx.beginPath();ctx.moveTo(-12,1);ctx.lineTo(-5,1);ctx.lineTo(-2,-4);ctx.lineTo(2,6);ctx.lineTo(5,1);ctx.lineTo(12,1);ctx.stroke();}
 else if(d.type==='repair'){ctx.fillRect(-3,-12,6,24);ctx.fillRect(-12,-3,24,6)}
 else if(d.type==='nova'){for(let i=0;i<8;i++){const a=i*TAU/8;ctx.beginPath();ctx.moveTo(Math.cos(a)*6,Math.sin(a)*6);ctx.lineTo(Math.cos(a)*14,Math.sin(a)*14);ctx.stroke()}ctx.beginPath();ctx.arc(0,0,4,0,TAU);ctx.fill()}
 else if(d.type==='power'){for(const y of [-7,7]){ctx.fillRect(-12,y-3,23,6);ctx.fillStyle='#fff';ctx.fillRect(8,y-2,6,4);ctx.fillStyle=c}}
 else if(d.type==='helix'){for(const side of [-1,1]){ctx.beginPath();for(let x=-14;x<=14;x++){const y=Math.sin(x*.18)*8*side;x===-14?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.stroke()}}
 else if(d.type==='wave'){for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(-9+i*8,0,10,-1.1,1.1);ctx.stroke()}}
 else if(d.type==='missile'){ctx.rotate(-.6);poly([[0,-14],[5,6],[9,12],[0,9],[-9,12],[-5,6]],c)}
 else{for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(13,i*8);ctx.stroke()}}
 noGlow();ctx.font='bold 11px "DM Sans",sans-serif';ctx.textAlign='center';ctx.fillStyle='#f2fff9';ctx.fillText(({orb:'WEAPON ORB',companion:'WINGMATE',speed:'SPEED',power:'CANNONS',repair:'REPAIR',rescue:'RESCUE',shield:'SHIELD',frontShield:'FRONT GUARD',nova:'NOVA'})[d.type]||weaponNames[d.type],0,44);ctx.restore();
}
function organicVoice(e){return themeIndex()*8+(e.brood?4:e.satellite?5:e.type);}
function explode(x,y,c,size=1,organic=false,voice=1){
 window.flightAudio?.explosion(x,size,organic);if(organic)window.flightAudio?.alienCry?.(x,size,voice);
 if(organic&&level>=3&&voice<64&&voice%3===0){acidClouds.push({x,y,age:0,life:3.6,warning:.75,r:Math.min(64,38+size*9),seed:voice});if(acidClouds.length>6)acidClouds.shift();}
 const pieces=[];const count=Math.min(90,Math.floor(rand(20,35)+size*9+(organic?18:0))),bias=rand(0,TAU);for(let i=0;i<count;i++){const z=rand(-1,1),a=rand(0,TAU),r=Math.sqrt(1-z*z),v=rand(35,210)*Math.sqrt(size);pieces.push({x:0,y:0,z:0,vx:Math.cos(a)*r*v+Math.cos(bias)*v*.25,vy:Math.sin(a)*r*v+Math.sin(bias)*v*.25,vz:z*v,seed:rand(0,8),delay:rand(0,.16),radius:rand(5,22)*Math.sqrt(size),volume:i<7,debris:Math.random()<.32,fluid:organic&&i%6!==0})}
 if(organic){let skull=false;for(const piece of pieces){if(piece.fluid)continue;piece.fragment=skull?['bone','rib','spineChip','chitinChip'][Math.floor(piece.seed)%4]:'skull';skull=true;}}
 pieces.sort((a,b)=>b.vz-a.vz);const effect={x,y,c,size,organic,bloodGreen:voice%3===0,bloodKind:voice%3,age:0,life:rand(1.25,1.9)+size*.15,pieces};explosions.push(effect);if(!organic)burst(x,y,c,Math.floor(16*size));if(explosions.length>16)explosions.shift();return effect;
}
function explodeBoss(b){
 // Enlarge the complete projected volume, including its 3D fragments. Keep the
 // particle budget fixed: twice the diameter should not mean eight times the work.
 const final=level===sectors.length-1,e=explode(b.x,b.y,sectors[level].color,3.8,bossOrganic(),64+bossIndex());
 e.visualScale=final?2.8:2.2;e.life=final?3.45:2.9;e.bossBlast=true;
 e.detonations=Array.from({length:final?7:5},(_,i)=>({x:Math.cos(i*2.4)*Math.min(b.r,110)*(.18+i*.045),y:Math.sin(i*2.4)*Math.min(b.r,110)*(.15+i*.035),delay:i*.15,r:24+i*3,seed:i*1.73}));
 return e;
}
const bloodPalettes=[['#203c12','#395e1a','#82904c'],['#480c13','#781724','#ad5650'],['#55240b','#854018','#b97740']];
function drawExplosions(dt){for(const e of explosions){if(state!=='paused')e.age+=dt;const t=e.age/e.life;if(t>1)continue;ctx.save();ctx.translate(e.x,e.y);ctx.scale(e.visualScale||1,e.visualScale||1);const blood=bloodPalettes[e.bloodKind||0];
 if(e.bossBlast){
  const shock=Math.max(0,1-e.age/1.15);ctx.save();ctx.globalAlpha=shock*.58;ctx.strokeStyle=e.organic?blood[2]:'#ffca87';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,0,24+e.age*225,17+e.age*154,-.2,0,TAU);ctx.stroke();ctx.restore();
  for(const d of e.detonations){const age=e.age-d.delay;if(age<0||age>1.25)continue;const fade=Math.max(0,1-age/1.25);ctx.save();ctx.translate(d.x,d.y);drawSoftPlume(d,d.r*(.6+age*1.5),age,fade*.85);ctx.restore();if(age<.22)orb(d.x,d.y,d.r*(1+age*3),'#ffe8ba',(1-age/.22)*.65);}
 }
 if(e.organic&&e.age<.65){for(let j=0;j<9;j++){const a=j*2.4,r=(6+e.age*38)*(1+(j%3)*.3)*Math.sqrt(e.size);orb(Math.sin(a)*e.age*(55+j*9),Math.cos(a)*e.age*(35+j*7),r,blood[j%2],(1-e.age/.65)*.24);}}
 // A tilted expanding shock-front sits behind depth-sorted fire and debris.
 ctx.save();ctx.rotate(-.28);ctx.globalAlpha=e.organic?0:Math.max(0,.65-e.age*.7);ctx.strokeStyle=e.c;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,(20+e.age*210)*e.size,(7+e.age*70)*e.size,0,0,TAU);ctx.stroke();ctx.restore();
 const damp=(1-Math.exp(-e.age*1.3))/1.3;for(const p of e.pieces){p.x=p.vx*damp;p.y=p.vy*damp;p.z=p.vz*damp;}const ordered=e.pieces;
 for(const p of ordered){if(e.age<p.delay)continue;const f=360/(360+p.z),xx=p.x*f,yy=p.y*f,fade=Math.pow(1-t,1.2),rr=p.radius*f*(.35+Math.sin(Math.min(1,e.age)*Math.PI*.65)*1.4);
 ctx.save();ctx.translate(xx,yy);ctx.globalAlpha=fade;
 if(e.organic&&p.fluid){ctx.rotate(Math.atan2(p.vy,p.vx));const fluidShade=ctx.createRadialGradient(-rr*.12,-rr*.15,0,0,0,rr*.65);fluidShade.addColorStop(0,blood[1]);fluidShade.addColorStop(.55,blood[0]);fluidShade.addColorStop(1,'#120f12');ctx.fillStyle=fluidShade;
 // Unequal lobes and detached satellites replace repeated smooth oval splashes.
 const radius=rr*(.24+(p.seed%1)*.23),length=Math.min(28,Math.hypot(p.vx,p.vy)*.09)*(1-t);
 const outline=[];for(let j=0;j<12;j++){const a=j/12*TAU,r=radius*(.8+Math.sin(j*2.3+p.seed)*.2+Math.cos(j*4.1+p.seed)*.1);outline.push([Math.cos(a)*r-(Math.cos(a)<0?length*Math.pow(-Math.cos(a),7):0),Math.sin(a)*r]);}ctx.beginPath();ctx.moveTo((outline[11][0]+outline[0][0])/2,(outline[11][1]+outline[0][1])/2);for(let j=0;j<12;j++){const a=outline[j],b=outline[(j+1)%12];ctx.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2);}ctx.closePath();ctx.fill();
 ctx.fillStyle=blood[2];ctx.globalAlpha=fade*.45;ctx.beginPath();ctx.arc(radius*.12,-radius*.28,Math.max(.5,radius*.12),0,TAU);ctx.fill();ctx.globalAlpha=fade;ctx.fillStyle=blood[1];for(let j=0;j<3;j++){const a=p.seed+j*2.1;ctx.beginPath();ctx.arc(-length*(.7+j*.4),Math.sin(a)*radius*(1.1+j*.5),radius*(.11+j*.04),0,TAU);ctx.fill();}
 }else if(p.debris||e.organic){drawModel(meshes[e.organic?(p.fragment||'bone'):'shrapnel'],0,0,f*(.7+p.radius*.045),p.seed+e.age*3.4,p.seed*.3+e.age*5,e.age*2.3,e.age)}
 else if(p.volume){drawSoftPlume(p,rr,e.age,fade)}
 else {const g=ctx.createRadialGradient(-rr*.3,-rr*.35,rr*.05,0,0,rr);g.addColorStop(0,e.age<.35?'#fffce0':'#e8a36b');g.addColorStop(.3,e.age<.4?'#ffe49b':e.c);g.addColorStop(.68,e.age<.7?'#d66e32':'#473c42');g.addColorStop(1,'#0a121800');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,rr,0,TAU);ctx.fill()}
 ctx.restore();}
 if(e.bossBlast){for(const d of e.detonations){const age=e.age-d.delay;if(age<0||age>.72)continue;const fade=1-age/.72;ctx.save();ctx.translate(d.x,d.y);ctx.globalAlpha=fade*.75;drawSoftPlume(d,d.r*(.5+age),age*.65,fade*.8);ctx.restore();}}
 if(!e.organic&&e.age<.24)orb(-4,-5,(50+e.age*100)*e.size,'#ffefca',(1-e.age/.24)*.8);ctx.restore();}explosions=explosions.filter(e=>e.age<e.life);
}
function drawStructures(){for(const o of obstacles)drawTerrainObstacle(o);}

function drawSectorEnvironment(){
 const painting=art[sectors[level].background]||(themeIndex()===1?art.carrier:themeIndex()===2?art.abyss:null);
 if(imageReady(painting)){const iw=W*1.12,ih=Math.max(H*1.12,iw*painting.naturalHeight/painting.naturalWidth);drawPanorama(painting);return}
 if(themeIndex()===0){drawParallaxLandmarks();
 }else if(themeIndex()===1){
  // View across a carrier's cavernous reactor bay: distant machinery,
  // wall modules, service decks, then foreground pressure-door obstacles.
  const wall=ctx.createLinearGradient(0,0,0,H);wall.addColorStop(0,'#101821');wall.addColorStop(.5,'#202837');wall.addColorStop(1,'#12151e');ctx.fillStyle=wall;ctx.fillRect(0,0,W,H);
  for(let i=0;i<7;i++){const x=((i*310-world*.12)%2170+2170)%2170-340;
   ctx.fillStyle='#0b111c';ctx.fillRect(x,110,280,535);ctx.strokeStyle='#3f4c5b';ctx.lineWidth=5;ctx.strokeRect(x,110,280,535);
   const glow=ctx.createLinearGradient(x,0,x+260,0);glow.addColorStop(0,'#28323d');glow.addColorStop(.5,'#a65832');glow.addColorStop(1,'#1c2938');ctx.fillStyle=glow;ctx.fillRect(x+22,160,235,255);
   for(let k=0;k<6;k++){ctx.fillStyle='#14202d';ctx.fillRect(x+25+k*39,160,8,255);ctx.fillStyle='#eaa76c';ctx.fillRect(x+38+k*39,188,3,176)}
   ctx.fillStyle='#66737f';ctx.font='12px monospace';ctx.fillText('CORE / '+String(i+1).padStart(2,'0'),x+25,145);
   // Recessed service alcoves and cylindrical coolant manifolds.
   poly([[x+22,160],[x+44,179],[x+237,179],[x+257,160]],'#667078');poly([[x+22,160],[x+44,179],[x+44,396],[x+22,415]],'#3c4651');poly([[x+22,415],[x+44,396],[x+237,396],[x+257,415]],'#101621');
   for(let pipe=0;pipe<2;pipe++){const px=x+7+pipe*259;const metal=ctx.createLinearGradient(px,0,px+12,0);metal.addColorStop(0,'#19212c');metal.addColorStop(.4,'#78858b');metal.addColorStop(.6,'#445463');metal.addColorStop(1,'#121823');ctx.fillStyle=metal;ctx.fillRect(px,132,12,488);for(let yy=155;yy<610;yy+=83){ctx.fillStyle='#91a0a4';ctx.fillRect(px-2,yy,16,4)}}
   if(i%2===0){const cylinder=ctx.createLinearGradient(x+80,0,x+201,0);cylinder.addColorStop(0,'#18232c');cylinder.addColorStop(.35,'#687c88');cylinder.addColorStop(.6,'#354953');cylinder.addColorStop(1,'#0b1721');ctx.fillStyle=cylinder;ctx.fillRect(x+82,205,116,159);ctx.fillStyle='#829298';ctx.beginPath();ctx.ellipse(x+140,205,58,14,0,0,TAU);ctx.fill();ctx.fillStyle='#1a2731';ctx.beginPath();ctx.ellipse(x+140,364,58,14,0,0,TAU);ctx.fill();for(let j=0;j<4;j++){ctx.fillStyle='#14232c';ctx.fillRect(x+83,225+j*34,113,8);ctx.fillStyle='#83d1dc';ctx.fillRect(x+107,226+j*34,65,3)}}
   // Ventilation turbine, rings and twelve blades.
   ctx.save();ctx.translate(x+140,520);ctx.strokeStyle='#607080';ctx.lineWidth=8;ctx.beginPath();ctx.arc(0,0,66,0,TAU);ctx.stroke();ctx.strokeStyle='#202936';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,74,0,TAU);ctx.stroke();ctx.fillStyle='#101620';ctx.beginPath();ctx.arc(0,0,56,0,TAU);ctx.fill();ctx.rotate(world*.003);for(let k=0;k<12;k++){ctx.rotate(TAU/12);poly([[12,-4],[47,-13],[52,1],[16,8]],'#3e4d5e','#7a8186')}ctx.restore();
  }
  for(const y of [70,91,674,704]){ctx.strokeStyle='#0b1019';ctx.lineWidth=17;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();ctx.strokeStyle='#61737e';ctx.lineWidth=3;ctx.stroke()}
  for(let i=0;i<10;i++){const x=((i*190-world*.24)%1900+1900)%1900-220;poly([[x,0],[x+24,0],[x+103,113],[x+80,113]],'#45505b');poly([[x,H],[x+24,H],[x+103,646],[x+80,646]],'#394451');ctx.fillStyle='#182431';ctx.fillRect(x,105,150,12);ctx.fillRect(x,646,150,12);ctx.fillStyle='#efc389';ctx.fillRect(x+23,108,65,3)}
  orb(970,290,360,'#ef7928',.11);
 }else if(themeIndex()===2){
  // An eclipsed world, icy debris and broad aurora curtains define the abyss.
  orb(1060,240,230,'#8a85ff',.22);ctx.fillStyle='#050719';ctx.beginPath();ctx.arc(1080,230,168,0,TAU);ctx.fill();
  for(let j=0;j<6;j++){ctx.save();ctx.strokeStyle=['#557ee51c','#90bdf51d','#ab7ce51d'][j%3];ctx.lineWidth=45;ctx.beginPath();for(let x=0;x<=W;x+=24){const y=130+j*32+Math.sin(x*.004+j*.6+world*.0003)*65;x?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();ctx.restore()}
  for(let i=0;i<14;i++){const x=((i*173-world*(.08+i%3*.03))%(W+180)+W+180)%(W+180)-90,y=i%2?H-25-(i*17)%90:20+(i*23)%80;poly([[x-30,y],[x-8,y-65],[x+25,y-12],[x+12,y+48]],'#303652');poly([[x-8,y-65],[x+4,y],[x+12,y+48],[x+25,y-12]],'#596588')}
 }
}

function bossArmPoints(b,side){
 const a=b.armAttack,smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
 const pose=bossFlightPose(b),root=projectHull([20,side*64,0],pose.yaw,pose.roll,pose.pitch),points=[],startX=b.x-35+root.x*pose.depth,startY=b.y+root.y*pose.depth;
 // Muscle contraction travels down a persistent arm; the tip unfurls last.
 for(let i=0;i<=36;i++){const t=i/36,coil=t*Math.PI*1.6;
  const reach=!a?0:a.age<2.2?smooth((a.age-.9-t*.25)/.6):1-smooth((a.age-2.2-t*.12)/(.8-t*.12));
  const twist=b.age*.8-t*6+(a?Math.sin(a.age*2)*1.6*reach:0),wave=Math.sin(t*Math.PI)*reach*(18+12*t);
  const restX=startX-95*Math.sin(coil*.65),restY=startY+side*(48*Math.sin(coil)+35*t)+Math.sin(b.age*1.5-t*3)*t*5;
  const strikeX=startX+((a?.x??startX)-startX)*t,strikeY=startY+((a?.y??b.y)+side*56-startY)*t+Math.sin(t*Math.PI)*side*60;
  points.push({x:restX+(strikeX-restX)*reach,y:restY+(strikeY-restY)*reach+Math.cos(twist)*wave,z:Math.sin(twist)*wave,r:2+18*Math.pow(1-t,.85),twist});
 }return points;
}
function updateBossArms(b,dt){
 if(bossIndex()===0){b.armAttack=null;return;}
 if(b.pass&&b.pass.stage!=='rear'){b.armAttack=null;return;}
 if(bossIndex()!==0)return;b.armClock=(b.armClock??6)-dt;
 if(b.armClock<=0&&!b.armAttack){b.armAttack={age:0,x:Math.max(90,ship.x-30),y:ship.y};b.armClock=8;}
 if(!b.armAttack)return;b.armAttack.age+=dt;
 if(b.armAttack.age>=.9)for(const side of [-1,1])for(const p of bossArmPoints(b,side))if(Math.hypot(ship.x-p.x,ship.y-p.y)<p.r+15)damage();
 if(b.armAttack.age>3)b.armAttack=null;
}
function drawBossArms(b){if(bossIndex()!==0)return;
 for(const side of [-1,1]){const points=bossArmPoints(b,side);drawModel(meshes.armRoot,points[0].x,points[0].y,1,0,0,side*.3,b.age);
 b.armMeshes??={};const mesh=b.armMeshes[side]??(b.armMeshes[side]=createArmSurface(points.length));updateArmSurface(mesh,points);drawModel(mesh,points[0].x,points[0].y,1,0,0,0,b.age);}

}

function drawSnakeLink(front,back,width,age,hit){const dx=back.x-front.x,dy=back.y-front.y;ctx.save();ctx.translate((front.x+back.x)/2,(front.y+back.y)/2);ctx.rotate(Math.atan2(dy,dx));ctx.scale(Math.hypot(dx,dy)/40,width);drawModel(meshes.snakeBody,0,0,1,0,0,0,age,hit);ctx.restore()}

// Brisk axial rolls with a brief recovery; attitude changes never alter travel speed.
function organicSpin(age){const cycle=((age%3.6)+3.6)%3.6,t=clamp((cycle-.6)/.75,0,1),ease=t*t*(3-2*t);return{yaw:Math.sin(age*3.7)*.10+Math.sin(age*8.1)*.035,pitch:Math.sin(age*5.3)*.055+Math.sin(age*9.7)*.018,roll:ease*TAU+Math.sin(age*4.1)*.10+Math.sin(age*7.3)*.035,fan:1-organicTailTuck(age),tuck:organicTailTuck(age)}}

function drawWeatheredPanels(width,y,height,sector){
 ctx.save();ctx.beginPath();ctx.rect(0,y,width,height);ctx.clip();
 for(let i=0;i<80;i++){const xx=(i*37.13)%width,yy=y+(i*61.79)%height;ctx.strokeStyle=i%3?'#060c1628':'#c4d6d31b';ctx.lineWidth=i%5===0?2:.5;ctx.beginPath();ctx.moveTo(xx,yy);ctx.lineTo(xx+(i%7)-3,yy+7+i%19);ctx.stroke()}
 if(sector!==2){for(let yy=y+4;yy<y+height;yy+=68){ctx.strokeStyle='#080f1960';ctx.lineWidth=2;ctx.strokeRect(3,yy,width-6,60);ctx.fillStyle='#c4c8bd88';for(const xx of [5,width-8]){ctx.fillRect(xx,yy+4,2,2);ctx.fillRect(xx,yy+54,2,2)}}}
 ctx.restore();
}
function drawEnvironmentalMachinery(){
 if(themeIndex()===1){
  // Slowly revolving service turbines sit in the near ceiling/floor plane.
  for(let i=0;i<4;i++){const x=((i*470-world*.31)%1880+1880)%1880-150,y=i%2?H-28:30;ctx.save();ctx.translate(x,y);ctx.fillStyle='#14212be0';ctx.beginPath();ctx.arc(0,0,35,0,TAU);ctx.fill();ctx.strokeStyle='#6e777f';ctx.lineWidth=5;ctx.stroke();ctx.rotate(world*.012*(i%2?1:-1));for(let k=0;k<8;k++){ctx.rotate(TAU/8);poly([[7,-3],[28,-9],[31,2],[10,5]],'#465868','#8a999c')}ctx.restore();orb(x,y,50,'#ce8651',.045)}
 }else{
  for(let i=0;i<12;i++){const x=((i*151-world*.13)%W+W)%W,y=(i*91+Math.sin(world*.003+i)*14)%H;orb(x,y,3+i%3,'#99b5e7',.1)}
 }
}

// Shared rectangles keep the painted obstruction and physical collision in agreement.
function obstacleForms(o){const raw=o.shutters?(themeIndex()===0?rigidAsteroidPassage(o):shutterSolids(o)):o.parts?o.parts.map(p=>({...p,x:o.x+p.x})):[{x:o.x,y:0,w:o.w+30,h:o.gap-o.open/2+20,ceiling:true},{x:o.x,y:o.gap+o.open/2,w:o.w+30,h:H-o.gap-o.open/2,ceiling:false}];const axis=sectors[level].scrollAxis;return axis?raw.map(r=>({x:axis==='down'?r.y*W/H:(H-r.y-r.h)*W/H,y:axis==='down'?r.x*H/W:(W-r.x-r.w)*H/W,w:r.h*W/H,h:r.w*H/W,ceiling:r.ceiling,side:axis==='down'?(r.ceiling?'left':'right'):(r.ceiling?'right':'left')})):raw;}
function terrainProfile(r,t,seed){const k=themeIndex(),fromRoot=r.side?(r.side==='left'?t:1-t):(r.ceiling?t:1-t);if(k===0){const envelope=Math.pow(Math.max(.015,Math.sin(t*Math.PI)),.3+.18*(1+Math.sin(seed*2.7))),u=t*(7+Math.floor((Math.sin(seed)+1)*2)),cell=Math.floor(u),blend=u-cell,hash=n=>{const x=Math.sin(n*127.1+seed*93.7)*43758.5453;return x-Math.floor(x);},jag=.52+.44*(hash(cell)*(1-blend)+hash(cell+1)*blend);return Math.max(.08,envelope*jag);}if(k===1)return forgeObstacleProfile(fromRoot,seed);if(k===4)return .96-(.08+.05*Math.sin(seed))*Math.floor(fromRoot*(3+Math.floor(seed%3)))/3;const jag=k===2?.12:k===3?.055:.07;return Math.max(.13,(.97-(.52+.15*Math.sin(seed))*Math.pow(fromRoot,1.6+.5*Math.cos(seed)))*(.84+jag*Math.sin(t*(k===2?35:17)+seed*3)+.055*Math.sin(t*57+seed)));}

function terrainCenter(t,seed){if(themeIndex()===1||themeIndex()===4)return .5;return .5+Math.sin(t*9+seed*3)*Math.sin(t*Math.PI)*.10;}
function obstacleSolids(o){const key=time+':'+o.x+':'+level;if(o.solidCache?.key===key)return o.solidCache.value;const value=themeIndex()===0&&!o.navigation?asteroidSolids(o):obstacleForms(o).flatMap((r,index)=>Array.from({length:24},(_,i)=>{const t=(i+.5)/24,seed=(o.id||0)*1.7+index*.9,f=terrainProfile(r,t,seed),center=terrainCenter(t,seed);return r.side?{...r,x:r.x+i*r.w/24,y:r.y+r.h*(center-f/2),w:r.w/24,h:r.h*f}:{...r,x:r.x+r.w*(center-f/2),y:r.y+i*r.h/24,w:r.w*f,h:r.h/24};}));o.solidCache={key,value};return value;}

function enemyRouteX(e,x){for(const o of routeObstacles())for(const r of obstacleSolids(o)){const u=clamp((r.h/2+420-Math.abs(e.y-r.y-r.h/2))/290,0,1),edge=r.side==='left'?r.x+r.w+105:r.x-105,target=r.side==='left'?Math.max(x,edge):Math.min(x,edge);x+=(target-x)*passEase(u);}return clamp(x,90,W-90);}

function drawDetailedObstacle(o,img){const crop=img.solidCrop;
 for(const solid of obstacleSolids(o)){if(solid.h<=0)continue;ctx.save();ctx.translate(solid.x,solid.y+(solid.ceiling?solid.h:0));if(solid.ceiling)ctx.scale(1,-1);
  // A tight shadow separates the tangible foreground from distant scenic architecture.
  ctx.shadowColor='#02050ddd';ctx.shadowBlur=12;ctx.shadowOffsetX=4;ctx.drawImage(img,crop.x,crop.y,crop.w,crop.h,0,0,solid.w,solid.h);ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetX=0;
  // Restrained cap lighting identifies the exact surface facing the flight corridor.
  const color=themeIndex()===0?'#8af3de':themeIndex()===1?'#ffc37a':'#d4afff';ctx.strokeStyle=color;ctx.globalAlpha=.85;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(5,2);ctx.lineTo(solid.w-5,2);ctx.stroke();ctx.globalAlpha=1;
  for(const x of [7,solid.w-9]){orb(x,8,6,color,.4);ctx.fillStyle=color;ctx.fillRect(x-1,4,2,8)}
  if(themeIndex()!==2){ctx.fillStyle='#101a22';ctx.fillRect(solid.w*.36,7,solid.w*.28,14);ctx.strokeStyle=color;ctx.lineWidth=1.5;for(let i=0;i<2;i++){const x=solid.w*.41+i*10;ctx.beginPath();ctx.moveTo(x,18);ctx.lineTo(x+4,11);ctx.lineTo(x+8,18);ctx.stroke()}}
  ctx.restore();
 }
}

function drawSoftPlume(p,r,age,fade){
 // Overlapping translucent lobes retain depth and lighting without solid smoke facets.
 ctx.translate(0,-age*age*12);ctx.rotate(p.seed+age*.23);
 for(let j=0;j<5;j++){const a=p.seed+j*2.4,x=Math.cos(a)*r*.45,y=Math.sin(a)*r*.35,rr=r*(.7+j*.06),g=ctx.createRadialGradient(x-rr*.2,y-rr*.25,0,x,y,rr);
  const hot=age<.3,ember=age<.65;g.addColorStop(0,hot?'rgba(255,239,174,.75)':ember?'rgba(215,128,67,.48)':'rgba(134,139,151,.28)');g.addColorStop(.4,hot?'rgba(255,147,44,.62)':ember?'rgba(125,81,63,.4)':'rgba(74,81,94,.24)');g.addColorStop(1,'rgba(28,33,44,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,rr,0,TAU);ctx.fill();
 }
}
function createArmSurface(count){const faces=[],rings=Array.from({length:count},()=>Array.from({length:16},()=>[0,0,0]));
 for(let j=0;j<count-1;j++)for(let i=0;i<16;i++)faces.push({v:[rings[j][i],rings[j+1][i],rings[j+1][(i+1)%16],rings[j][(i+1)%16]],c:i<8?[40,44,37]:[58,61,47],em:0,flex:0});
 const cups=[];for(let j=2;j<count-2;j+=3){const ring=Array.from({length:10},()=>[0,0,0]),inner=Array.from({length:10},()=>[0,0,0]);for(let i=0;i<10;i++)faces.push({v:[ring[i],ring[(i+1)%10],inner[(i+1)%10],inner[i]],c:[97,103,83],em:0,flex:0,wet:.5});faces.push({v:inner,c:[26,31,25],em:0,flex:0,wet:.9});cups.push({j,ring,inner});}
 faces.skin=true;faces.dynamic=true;faces.rings=rings;faces.cups=cups;return faces;
}
function updateArmSurface(mesh,points){const root=points[0],frames=[];
 for(let j=0;j<points.length;j++){const p=points[j],before=points[Math.max(0,j-1)],after=points[Math.min(points.length-1,j+1)],dx=after.x-before.x,dy=after.y-before.y,len=Math.hypot(dx,dy)||1,n=[-dy/len,dx/len,0],axis=[dx/len,dy/len,0];frames.push({n,axis});
  for(let i=0;i<16;i++){const a=i/16*TAU+p.twist,rr=p.r;mesh.rings[j][i][0]=p.x-root.x+n[0]*Math.cos(a)*rr;mesh.rings[j][i][1]=p.y-root.y+n[1]*Math.cos(a)*rr;mesh.rings[j][i][2]=p.z+Math.sin(a)*rr;}}
 for(const cup of mesh.cups){const p=points[cup.j],{n,axis}=frames[cup.j],a=p.twist-Math.PI/2,rad=[n[0]*Math.cos(a),n[1]*Math.cos(a),Math.sin(a)],cross=[-n[0]*Math.sin(a),-n[1]*Math.sin(a),Math.cos(a)],center=[p.x-root.x+rad[0]*p.r,p.y-root.y+rad[1]*p.r,p.z+rad[2]*p.r];
  for(let i=0;i<10;i++){const angle=i/10*TAU;for(const [ring,scale,raise] of [[cup.ring,.36,1],[cup.inner,.2,.3]])for(let k=0;k<3;k++)ring[i][k]=center[k]+(axis[k]*Math.cos(angle)+cross[k]*Math.sin(angle))*p.r*scale+rad[k]*raise;}}
}

function drawWeaponOrb(){if(!weaponOrb.owned)return;const p=orbPosition(),dock=pilotMount(42),hit=weaponOrb.flash>0;ctx.save();ctx.lineCap='round';ctx.strokeStyle='#203847';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(dock.x,dock.y);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.strokeStyle='#95e5e7';ctx.lineWidth=3;ctx.stroke();ctx.restore();orb(p.x,p.y,hit?39:27,'#83e8ff',hit?.5:.22);drawModel(meshes.weaponOrb,p.x,p.y,1,pilotTurn.angle+.15,world*.025,flightPose.pitch,world*.01);if(hit){ctx.save();glow('#a4ffff',18);ctx.strokeStyle='#d5ffff';ctx.lineWidth=3;ctx.beginPath();const facing=shipDirection()===1?0:Math.PI;ctx.arc(p.x,p.y,29,facing-1.15,facing+1.15);ctx.stroke();noGlow();ctx.restore();}}
function drawOrbCharge(){if(!weaponOrb.owned)return;const p=orbPosition(),charge=weaponOrb.charge??2;ctx.save();ctx.lineWidth=3;for(let i=0;i<2;i++){const a=-Math.PI*.75+i*Math.PI;ctx.beginPath();ctx.strokeStyle='#355865';ctx.arc(p.x,p.y,34,a,a+Math.PI*.65);ctx.stroke();const fraction=clamp(charge-i,0,1);if(fraction){ctx.beginPath();ctx.strokeStyle='#8df6e9';ctx.arc(p.x,p.y,34,a,a+Math.PI*.65*fraction);ctx.stroke();}}ctx.restore();}


function passEase(t){t=clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);}
// Collision padding is in screen pixels; only the anatomical dimensions scale.
function chargeLaneHalfHeight(){const d=bossDesign(),s=Math.sin(.52);return d?Math.max(105,...d.bodyVolumes.map(v=>(Math.abs(v.center[0])*s+Math.hypot(v.center[1],v.center[2])+Math.hypot(v.radii[0]*s,Math.max(v.radii[1],v.radii[2])))*d.scale+18+24)):105;}
const bossPassProfiles={
 0:{first:7,wait:10,dash:1.9,turn:1.15,rear:3.3,left:225,curve:42},
 2:{first:20,wait:22,dash:2.35,turn:1.4,rear:3.6,left:235,curve:-48},
 3:{first:24,wait:25,dash:2.8,turn:1.6,rear:3.8,left:245,curve:32},
 5:{first:22,wait:20,dash:2.45,turn:1.35,rear:3.2,left:250,curve:-38}
};
function updateBossPass(b,dt){const profile=bossPassProfiles[bossIndex()];if(!profile)return false;
 b.passClock=(b.passClock??profile.first)-dt;
 if(!b.pass&&!b.breath&&!b.eyeAttack&&b.passClock<=0&&b.charge<=0&&!(b.vacuum>0)&&!(b.barrage>0)&&!hazards.length&&!b.rackShots&&!b.salvoWindup&&!b.recovery&&!(bossIndex()===0&&b.exposed>0)&&!b.pressureFollowup&&!b.sporePods?.length&&!acidClouds.some(h=>h.bossTrap)&&!b.broodWatch&&(!b.comboSteps?.length||b.comboPassPending)){
  const clearance=80,bodyHalf=chargeLaneHalfHeight(),room=H/2-clearance-bodyHalf;
  // Preserve the creature's size. Only reduce its path's curve to fit the arena;
  // future oversized designs keep patrolling/firing instead of sealing both exits.
  if(room<0){b.passClock=profile.wait;return false;}
  const curve=Math.sign(profile.curve)*Math.min(Math.abs(profile.curve),room),halfHeight=bodyHalf+Math.abs(curve);
  b.pass={stage:'warn',age:0,halfHeight,clearance,curve,y:clamp(ship.y,halfHeight+clearance,H-halfHeight-clearance),fromX:b.x,fromY:b.y,vx0:b.navVX||0,vy0:b.navVY||0};
  b.attack=null;b.fireHeading=null;b.rush=0;announce('HOSTILE CHARGE','EVADE ITS CHARGE · SPACE FLIPS YOUR SHIP');
 }
 const p=b.pass;if(!p)return false;p.age+=dt;
 const next=stage=>{if(stage==='dash'||stage==='return')window.flightAudio?.bossAttack?.('lunge',bossIndex(),b.x);p.stage=stage;p.age=0;p.fromX=b.x;p.fromY=b.y;};
 if(p.stage==='warn'){const u=clamp(p.age/1.55,0,1),brake=u-6*u*u*u+8*u*u*u*u-3*u*u*u*u*u;b.x=p.fromX+(p.vx0||0)*1.55*brake;b.y=p.fromY+(p.y-p.fromY)*passEase(u)+(p.vy0||0)*1.55*brake;if(p.age>=1.55)next('dash');}
 else if(p.stage==='dash'){const t=clamp(p.age/profile.dash,0,1),ease=passEase(t);b.x=p.fromX+(profile.left-p.fromX)*ease;b.y=p.y+(p.curve??profile.curve)*Math.pow(Math.sin(Math.PI*t),2);if(t===1)next('turn');}
 else if(p.stage==='turn'){b.turnYaw=Math.PI*passEase(p.age/profile.turn);if(p.age>=profile.turn){b.facing=1;b.shoot=0;b.special=1.1;b.recovery=0;next('rear');announce('HOSTILE BEHIND','FLIP · ATTACK THE HOSTILE BEHIND');}}
 else if(p.stage==='rear'){const t=clamp(p.age/profile.rear,0,1);b.x=p.fromX+70*Math.pow(Math.sin(Math.PI*t),2);b.y=p.fromY+Math.sin(t*Math.PI*2)*32*Math.pow(Math.sin(t*Math.PI),2);if(p.age>=profile.rear&&!bossPatternBusy(b)){p.y=clamp(ship.y,p.halfHeight+(p.clearance??80),H-p.halfHeight-(p.clearance??80));next('returnWarn');}}
 else if(p.stage==='returnWarn'){b.y=p.fromY+(p.y-p.fromY)*passEase(p.age/1.55);if(p.age>=1.55)next('return');}
 else if(p.stage==='return'){const t=clamp(p.age/profile.dash,0,1);b.x=p.fromX+(1090-p.fromX)*passEase(t);b.y=p.y-(p.curve??profile.curve)*Math.pow(Math.sin(Math.PI*t),2);if(t===1)next('resetTurn');}
 else if(p.stage==='resetTurn'){b.turnYaw=Math.PI*(1-passEase(p.age/profile.turn));if(p.age>=profile.turn){b.turnYaw=0;b.facing=-1;b.pass=null;b.passClock=profile.wait-bossCombatPhase(b)*1.5;b.special=3.5;b.shoot=1.6;b.navVX=b.navVY=0;}}
 return true;
}
function rotorContact(o,x,y,r=0){const cx=o.x+210,cy=380,dx=x-cx,dy=y-cy,a=(time-o.at)*o.spin,xx=dx*Math.cos(a)+dy*Math.sin(a),yy=-dx*Math.sin(a)+dy*Math.cos(a);return Math.hypot(dx,dy)<29+r||(Math.abs(xx)<155+r&&Math.abs(yy)<14+r);}
function drawRotorGate(o){const x=o.x+210,y=380,a=(time-o.at)*o.spin,c=sectors[level].color;ctx.save();ctx.translate(x,y);ctx.strokeStyle='#566a78';ctx.lineWidth=16;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(0,side*182);ctx.lineTo(0,side*290);ctx.stroke();}ctx.strokeStyle='#475966';ctx.lineWidth=8;ctx.beginPath();ctx.arc(0,0,182,0,TAU);ctx.stroke();ctx.strokeStyle=c;ctx.lineWidth=2;ctx.setLineDash([9,20]);ctx.stroke();ctx.setLineDash([]);ctx.rotate(a);drawModel(meshes.gateRotor,0,0,1,0,0,0,time);ctx.restore();}

// Two offset pressure doors create a moving S-shaped flight path, anchored in the scenery.
function shutterSolids(o){const t=time-o.at,parts=[];for(let i=0;i<2;i++){const center=380+(i===0?-1:1)*(45+Math.sin(t*.65+i*.8)*20),gap=330+Math.sin(t*.9+i)*12,x=o.x+i*250;parts.push({x,y:0,w:150,h:center-gap/2,ceiling:true},{x,y:center+gap/2,w:150,h:H-center-gap/2,ceiling:false});}return parts;}
function drawShutterPassage(o){const img=art[sectors[level].obstacleArt||['colonyObstacle','carrierObstacle','derelictObstacle'][themeIndex()]],c=sectors[level].color;
 // Crop a full-height structure behind a clipping edge: masonry no longer stretches as doors move.
 for(const r of shutterSolids(o)){ctx.save();ctx.beginPath();ctx.rect(r.x,r.y,r.w,r.h);ctx.clip();if(imageReady(img)&&img.solidCrop){const a=img.solidCrop;ctx.drawImage(img,a.x,a.y,a.w,a.h,r.x,r.ceiling?r.h-480:r.y,r.w,480);}else{ctx.fillStyle=sectors[level].fog;ctx.fillRect(r.x,r.y,r.w,r.h);}ctx.restore();const edge=r.ceiling?r.h:r.y;ctx.save();ctx.strokeStyle=c;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(r.x,edge);ctx.lineTo(r.x+r.w,edge);ctx.stroke();for(const side of [8,r.w-8]){ctx.fillStyle='#6c8089';ctx.fillRect(r.x+side-3,r.ceiling?0:edge,6,r.h);ctx.fillStyle='#bbc8c8';ctx.fillRect(r.x+side-1,r.ceiling?Math.max(0,edge-90):edge,2,Math.min(90,r.h));}ctx.fillStyle=c;ctx.font='10px monospace';ctx.fillText(themeIndex()===0?'TRANSIT LOCK':themeIndex()===1?'PRESSURE GATE':'LIVING SEAL',r.x+20,r.ceiling?edge-14:edge+22);ctx.restore();}
}

function bossOrganic(){return ![1,4].includes(bossIndex());}
function bossSuctionForce(b){if(!(b.vacuum>0)||bossIndex()!==3)return 0;const mouth=expansionMouth(b),dx=mouth.x-ship.x,dy=Math.abs(mouth.y-ship.y);const distance=Math.abs(dx);if(distance>900||dy>190)return 0;return Math.sign(dx)*(185+bossCombatPhase(b)*22)*clamp(distance/140,0,1)*clamp((900-distance)/450,0,1)*clamp((190-dy)/85,0,1)*Math.min(1,b.vacuum/.6);}
function expansionMouth(b){if(bossDesign())return bossMount(b,bossDesign().mouth);const p=bossFlightPose(b),v=rotateVertex((bossIndex()===5||bossIndex()===3)?[-99,-9,-4]:[-63,7,-9],p.yaw,p.roll,p.pitch,0,0);const scale=(bossIndex()===5?2.15:2.1)*p.depth;return{x:b.x+v[0]*scale,y:b.y+v[1]*scale};}
// Compatibility entry point used by encounter probes; all bosses share the drive.
function moveExpansionBoss(b,dt){moveBoss(b,dt);}
function spawnBossSporePods(b,count,acid=false){
 const phase=bossCombatPhase(b),mouth=expansionMouth(b),final=bossIndex()===5;b.sporePods=[];
 // One spore lands at the locked position, with space above/below to dodge; acid pods pursue the ship.
 // Both visibly leave the mouth and warn before their settled pools arm.
 for(let i=0;i<count;i++){const y=i%2?Math.min(H-100,b.lockY+155):Math.max(100,b.lockY-155),x=b.x<ship.x?W-(240+i*190):240+i*190;
  b.sporePods.push({age:-i*.22,fromX:mouth.x,fromY:mouth.y,x:mouth.x,y:mouth.y,toX:acid?clamp(ship.x+(i-(count-1)/2)*72,90,W-90):i===0?clamp(b.lockX??ship.x,90,W-90):x,toY:acid?clamp(ship.y,100,H-100):i===0?clamp(b.lockY??ship.y,100,H-100):y,trackOffset:(i-(count-1)/2)*72,flight:1.05,r:(final?60:48)+phase*4,visualScale:final?1.15:.95,acid});}
 b.muzzle=.16;
}
function updateBossSporePods(b,dt){
 for(const p of b.sporePods||[]){p.age+=dt;if(p.age<0)continue;if(!p.emitted){const mouth=expansionMouth(b);p.fromX=mouth.x;p.fromY=mouth.y;p.emitted=true;b.muzzle=.16;window.flightAudio?.bossAttack?.('fire',bossIndex(),mouth.x);}if(p.acid&&p.age<p.flight*.8){p.toX+=clamp(clamp(ship.x+p.trackOffset,90,W-90)-p.toX,-260*dt,260*dt);p.toY+=clamp(clamp(ship.y,100,H-100)-p.toY,-220*dt,220*dt);}const u=clamp(p.age/p.flight,0,1),e=passEase(u);p.x=p.fromX+(p.toX-p.fromX)*e;p.y=p.fromY+(p.toY-p.fromY)*e-Math.sin(u*Math.PI)*65;
  if(u>=1&&!p.landed){p.landed=true;acidClouds.push({x:p.toX,y:p.toY,age:0,warning:1.25,life:4.8,r:p.r,seed:p.toX,spore:!p.acid,bossTrap:true});}}
 if(b.sporePods)b.sporePods=b.sporePods.filter(p=>!p.landed);
}
function spawnBossGuardians(b){const phase=bossCombatPhase(b),count=3+(phase===2?1:0),hp=22+phase*5;for(let i=0;i<count;i++){const a=i*TAU/count,origin=encounterSocket(b,[48,Math.cos(a)*22,Math.sin(a)*24]);enemies.push({guardian:true,emergeX:origin.x,emergeY:origin.y,type:1,x:origin.x,y:origin.y,base:origin.y,age:0,phase:a,orbit:a,hp,max:hp,r:23,hit:0,shoot:3.2,speed:210,direction:ship.x>=b.x?1:-1});}b.hadGuards=true;b.broodWatch=true;}
function advanceMotherCombo(b,dt){
 if(b.broodWatch){if(enemies.some(e=>e.guardian&&e.hp>0))return;b.broodWatch=false;b.exposed=5;b.recovery=1.7;announce('BROOD SHROUD BROKEN','ATTACK THE EXPOSED QUEEN · CLAW DIVE NEXT');}
 if(b.comboPassPending||bossPatternBusy(b)||b.recovery>0)return;
 const step=b.comboSteps?.[0];if(!step)return;step.delay-=dt;if(b.pass?.stage!=='rear')holdBossSalvo(b);if(step.delay>0)return;b.comboSteps.shift();const phase=bossCombatPhase(b);
 if(step.kind==='claw'){b.passClock=0;b.comboPassPending=true;b.comboPassStarted=false;announce('QUEEN CLAWS UNFURLING','DODGE THE COMING DIVE');}
 else if(step.kind==='venom'){b.venom={age:0,clock:0,warning:1.1,duration:2.3+phase*.3};announce('VENOM SACS SWELLING','SIDESTEP THE TRACKING BURSTS');window.flightAudio?.breath?.('inhale',1.1);}
 else if(step.kind==='fire'){b.lockX=ship.x;b.lockY=clamp(ship.y,130,H-130);startBreath(b,'fire',1.6,{duration:2.15+phase*.2,sweep:phase===2?.12:0});announce('FURNACE LUNGS IGNITING','KEEP CLEAR OF ITS MOUTH');}
 else if(step.kind==='acid'){b.lockY=clamp(ship.y,210,H-210);spawnBossSporePods(b,3+Number(phase===2),true);announce('CORROSIVE EGGS RELEASED','AVOID THE ACID POOLS');}
}
function updateVenomTempest(b,dt){
 const v=b.venom;if(!v)return;v.age+=dt;
 if(v.age<v.warning){b.muzzle=.06+.12*v.age/v.warning;return;}
 if(v.age>=v.warning+v.duration){b.venom=null;b.recovery=1.7;b.exposed=2.2;return;}
 v.clock-=dt;if(v.clock>0)return;v.clock=.18;
 const m=expansionMouth(b),a=Math.atan2(ship.y-m.y,ship.x-m.x),phase=bossCombatPhase(b);
 // Each short burst re-aims at the pilot; released venom travels straight.
 for(const offset of [-.055,0,.055]){const angle=a+offset;hostile.push({x:m.x,y:m.y,vx:Math.cos(angle)*(660+phase*35),vy:Math.sin(angle)*(660+phase*35),r:7,scale:1.1,kind:'spore',venom:true,c:'#9cec58',launchAngle:angle});}
 b.muzzle=.2;window.flightAudio?.shot('organic',m.x,true);
}
function updateMotherSalvo(b,dt){
 const v=b.salvoWindup;if(!v)return;if((b.pass&&b.pass.stage!=='rear')||b.breath||b.venom||b.charge>0||b.vacuum>0){b.salvoWindup=null;return;}v.age+=dt;b.muzzle=.04+.1*clamp(v.age/v.warning,0,1);if(v.age<v.warning)return;
 const m=expansionMouth(b),phase=bossCombatPhase(b),speed=720+phase*35;v.heading=v.target?Math.atan2(v.target.y-m.y,v.target.x-m.x):v.heading;
 for(const offset of v.offsets){const angle=v.heading+offset;hostile.push({x:m.x,y:m.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:8+phase,scale:.9+phase*.06,bossShot:true,kind:'spore',c:'#9cec58',launchAngle:angle});}
 b.salvoWindup=null;b.muzzle=.22;window.flightAudio?.shot('organic',m.x,true);
}
function updateExpansionBoss(b,dt){
 const kind=bossIndex(),profile=bossEncounterProfile(sectors[level]),phase=bossCombatPhase(b),hadVacuum=b.vacuum>0;b.vacuum=Math.max(0,(b.vacuum||0)-dt);if(hadVacuum&&!b.vacuum){b.recovery=2.4;b.exposed=3;announce('MAW RECOVERING','ATTACK NOW · BONUS DAMAGE');}b.barrage=Math.max(0,(b.barrage||0)-dt);
 if(kind===5){updateVenomTempest(b,dt);updateMotherSalvo(b,dt);advanceMotherCombo(b,dt);}
 const sequencePending=b.comboPassPending||b.comboSteps?.length;
 const busy=bossPatternBusy(b)||b.recovery>0||b.broodWatch||(b.pass?.stage!=='rear'&&sequencePending);
 if(busy){if(!b.broodWatch&&!acidClouds.some(h=>h.bossTrap))holdBossSalvo(b);}else if(!sequencePending)b.special-=dt;
 if(b.special<=0&&!busy&&!sequencePending){
  b.charge=profile.warning;b.special=(profile.cooldown-phase*profile.phaseStep)*COMBAT_BALANCE.specialRest;b.lockY=clamp(ship.y,210,H-210);b.lockX=ship.x;b.specialCount=(b.specialCount||0)+1;b.specialFired=false;
  if(profile.power==='abyssal-maw'){b.specialMode=b.specialCount%2?'spores':'vacuum';announce(b.specialMode==='spores'?'MONARCH SPORE PODS OPENING':'FEEDING MAW OPENING',b.specialMode==='spores'?'WATCH THE PODS · KEEP THE OPEN CORRIDOR':'FLY BACKWARDS OR ESCAPE ABOVE / BELOW');window.flightAudio?.breath?.('inhale',b.charge);}
  else if(profile.power==='ion-sweep'){b.specialMode='sweep';b.beamAim=techAimPitch(b,{x:ship.x,y:ship.y});b.beamPrep=b.beamAim+(b.specialCount%2?1:-1)*(.18+phase*.025);announce('GYRO CANNON SWEEP CHARGING','KEEP CLEAR OF THE CANNON');window.flightAudio?.laserCharge();}
  else{b.specialMode='brood';announce('GUARDIAN BROOD EMERGING','BREAK THE SHROUD · DIVE AND VENOM STRIKES FOLLOW');window.flightAudio?.breath?.('inhale',b.charge);}
 }
 if(b.charge>0&&b.charge<=dt&&!b.specialFired){b.specialFired=true;b.shoot=3;
  if(kind===3&&b.specialMode==='spores'){spawnBossSporePods(b,2+phase);b.recovery=1.4;b.exposed=3.5;}
  else if(kind===3){b.vacuum=3.4+phase*.45;window.flightAudio?.breath?.('wind',b.vacuum);}
  else if(kind===4){const r=techLaserOrigin(b),warning=.95,duration=2.4+phase*.3;hazards.push({kind:'tech',x:r.x,startY:r.y,y:r.y,age:0,warning,life:warning+duration,width:72+phase*10,sweepFrom:b.beamPrep,sweepTo:2*(b.beamAim||0)-b.beamPrep,doubleSweep:phase===2});b.beamPrep=null;}
  else{spawnBossGuardians(b);b.comboSteps=[{kind:'claw',delay:1.1},{kind:b.specialCount%2?'venom':'acid',delay:1.2}];if(phase===2)b.comboSteps.push({kind:b.specialCount%2?'acid':'venom',delay:1.6});}
 }
 b.charge=Math.max(0,b.charge-dt);
 if(b.vacuum>0){const m=expansionMouth(b);if(Math.hypot(ship.x-m.x,ship.y-m.y)<55)damage();}
 // Deliberately different minor attacks occupy recovery gaps only. All angles
 // lock at launch: no ordinary round can home in after the player dodges.
 if(kind===4){
  const canFire=!(b.recovery>0)&&(!b.pass||b.pass.stage==='rear')&&!b.charge&&!hazards.some(h=>h.kind==='tech');
  if(!canFire)b.capacitorSalvo=null;
  if(canFire){
   b.shoot-=dt;
   if(!b.capacitorSalvo&&b.shoot<=0&&b.x>0&&b.x<W){
    b.capacitorSalvo={age:0,target:{x:ship.x,y:ship.y},fired:0,warning:.65};
    b.shoot=1.65*(sectors[level].salvoRestScale||1);
   }
   const volley=b.capacitorSalvo;
   if(volley){
    volley.age+=dt;
    // Lock the location when the capacitor lights. A short train breaks a
    // stationary guard, while a deliberate sidestep clears every round.
    if(volley.age<volley.warning)b.muzzle=.10+.07*Math.sin(volley.age*48)**2;
    if(volley.age>=volley.warning+volley.fired*.35&&volley.fired<7){
     const m=techLaserOrigin(b),angle=Math.atan2(volley.target.y-m.y,volley.target.x-m.x),speed=700+phase*30;
     hostile.push({x:m.x,y:m.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r:7,kind:'rocket',bossRound:true,regentShot:true,scale:.85,c:'#ccbaff',launchAngle:angle});
     volley.fired++;b.muzzle=.2;window.flightAudio?.shot('missile',m.x,true);
    }
    if(volley.fired===7)b.capacitorSalvo=null;
   }
  }
  return;
 }
 const canFire=!(b.recovery>0)&&(!b.pass||b.pass.stage==='rear')&&!b.charge&&!b.breath&&!b.vacuum&&!b.sporePods?.length&&!b.salvoWindup&&!b.venom;
 if(canFire){b.shoot-=dt;if(b.shoot<=0&&b.x>0&&b.x<W){const m=kind===4?techLaserOrigin(b):expansionMouth(b),a=Math.atan2(ship.y-m.y,ship.x-m.x),offsets=kind===3?((b.aimedVolley=(b.aimedVolley||0)+1)%2?[-.28,0,.28]:[-.32,-.16,0,.16,.32]):kind===4?[-.10,.10]:[-.28,-.09,.09,.28];
  if(kind===5){b.salvoWindup={age:0,warning:.5,heading:a,target:{x:ship.x,y:ship.y},offsets:(b.aimedVolley=(b.aimedVolley||0)+1)%2?[-.3,0,.3]:phase===0?[-.2,0,.2]:[-.4,-.2,0,.2,.4]};b.shoot=(.65-phase*.06)*COMBAT_BALANCE.salvoRest*(sectors[level].salvoRestScale||1);return;}
  for(const offset of offsets)hostile.push({x:m.x,y:m.y,vx:Math.cos(a+offset)*(kind===3?540:650),vy:Math.sin(a+offset)*(kind===3?540:650),r:kind===3?8:7,scale:kind===3?.9:.85,bossShot:kind!==4,kind:kind===4?'rocket':organicShotKind(),c:sectors[level].color,launchAngle:a+offset});b.shoot=(.72-phase*.07)*COMBAT_BALANCE.salvoRest*(sectors[level].salvoRestScale||1);b.muzzle=.16;kind===4?window.flightAudio?.shot('missile',b.x,true):window.flightAudio?.bossAttack?.('fire',kind,b.x);}}
}

function drawExpansionBoss(b){const k=bossIndex(),p=bossFlightPose(b),scale=k===3?2.1:k===4?2:2.15;if(k===5||k===3){animateDragonWings(b.age,k===3);animateAnatomicalSkin(meshes[k===3?'reefMonarch':'progenitor'],b.age);}drawModel(meshes[k===3?'reefMonarch':k===4?'stormRegent':'progenitor'],b.x,b.y,scale*p.depth,p.yaw,p.roll,p.pitch,b.age,b.hit);if(k===5||k===3)drawModel(meshes[k===3?'pteroWings':'dragonWings'],b.x,b.y,scale*p.depth,p.yaw,p.roll,p.pitch,b.age,b.hit);
 if(k===4){for(const side of [-1,1])drawModel(meshes.regentRing,b.x,b.y,1.8,p.yaw+side*.35,b.age*side*.8,p.pitch,b.age);for(const side of [-1,1]){const v=rotateVertex([-69,side*40,0],p.yaw,p.roll,p.pitch,0,0);drawModel(meshes.cannon,b.x+v[0]*scale,b.y+v[1]*scale,1.8,p.yaw,p.roll,p.pitch,b.age,b.hit);}return;}
 const m=expansionMouth(b);drawAnatomicalJaw(b);
 if(k===3&&(b.vacuum>0||b.charge>0)){ctx.save();ctx.strokeStyle='#90ebec';ctx.lineWidth=1.5;for(let i=0;i<28;i++){const t=((b.age*(b.vacuum>0?.7:.12)+i/28)%1),x=m.x+(Math.cos(bossFlightPose(b).yaw)>0?-1:1)*820*(1-t),spread=(1-t)*175,yy=m.y+Math.sin(i*2.4)*spread;ctx.globalAlpha=Math.sin(t*Math.PI)*.32;ctx.beginPath();ctx.moveTo(x-25,yy+Math.sin(i*2.4)*5);ctx.quadraticCurveTo(x,yy,x+24,yy-Math.sin(i*2.4)*7);ctx.stroke();}ctx.restore();}
}

// Campaign-wide world distance used to push later paintings to their capped
// image edge before the sector even began. Scenery now follows sector time,
// including checkpoint restores, and keeps travelling during long boss fights.
function sceneryDistance(){return state==='title'?world:Math.max(0,typeof sectorSceneTime==='function'?sectorSceneTime():time)*SCROLL_SPEED;}
function panoramaOffset(_span,vertical){return sceneryDistance()*(vertical?.36:themeIndex()===1?.28:.25);}
function sceneryPosition(x,y,depth,margin=40){const vertical=sectors[level].scrollAxis,distance=sceneryDistance()*depth,span=(vertical?H:W)+margin*2,position=(vertical?y:x)+(vertical==='up'?distance:-distance);const coordinate=((position+margin)%span+span)%span-margin;return vertical?{x,y:coordinate}:{x:coordinate,y};}
const panoramaSurfaces=new WeakMap();
function panoramaGeometry(img,vertical){
 let cached=panoramaSurfaces.get(img);if(!cached){cached={};panoramaSurfaces.set(img,cached);}const key=vertical?'vertical':'horizontal';if(cached[key])return cached[key];
 const aspect=img.naturalWidth/img.naturalHeight,iw=vertical?Math.max(W*1.065,H*1.12*aspect):Math.max(H*1.12*aspect,W),ih=iw/aspect,span=vertical?ih:iw,overlap=vertical?190:216;
 const surface=document.createElement('canvas'),ratio=Math.min(1,2560/Math.max(img.naturalWidth,img.naturalHeight));surface.width=Math.round(img.naturalWidth*ratio);surface.height=Math.round(img.naturalHeight*ratio);
 const c=surface.getContext('2d');c.drawImage(img,0,0,surface.width,surface.height);
 // Feather once in texture space, using a smooth opacity ramp. Every later
 // draw reuses this upright image; no filters, readback or per-frame surfaces.
 const feather=overlap*(vertical?surface.height/ih:surface.width/iw),mask=c.createLinearGradient(0,0,vertical?0:feather,vertical?feather:0);
 for(let i=0;i<=10;i++){const t=i/10,alpha=t*t*(3-2*t);mask.addColorStop(t,'rgba(255,255,255,'+alpha+')');}
 c.globalCompositeOperation='destination-in';c.fillStyle=mask;c.fillRect(0,0,surface.width,surface.height);c.globalCompositeOperation='source-over';
 cached[key]={iw,ih,span,overlap,step:span-overlap,surface};return cached[key];
}
function panoramaLayout(img){
 const vertical=sectors[level].scrollAxis,p=panoramaGeometry(img,!!vertical),travel=panoramaOffset(p.span,!!vertical),offset=vertical==='up'?p.ih-H-travel:p.overlap+travel,extent=vertical?H:W,first=Math.floor(offset/p.step)-1,last=Math.floor((offset+extent)/p.step),tiles=[];
 for(let i=first;i<=last;i++){const position=i*p.step-offset;if(position>extent||position+p.span<0)continue;tiles.push({index:i,position,mirror:false});}
 return{vertical,iw:p.iw,ih:p.ih,span:p.span,overlap:p.overlap,step:p.step,offset,tiles,x:vertical?-(p.iw-W)*.5-viewY:0,y:vertical?0:-(p.ih-H)*.5-viewY};
}
function drawPanorama(img){
 const vertical=sectors[level].scrollAxis,p=panoramaGeometry(img,!!vertical),travel=panoramaOffset(p.span,!!vertical),offset=vertical==='up'?p.ih-H-travel:p.overlap+travel,extent=vertical?H:W,first=Math.floor(offset/p.step)-1,last=Math.floor((offset+extent)/p.step),x=-(p.iw-W)*.5-viewY,y=-(p.ih-H)*.5-viewY;
 // Adjacent upright panoramas overlap. The incoming feather reveals the prior
 // image underneath, so long encounters never produce inverted architecture.
 // This hot path creates no arrays, canvases, gradients or image filters.
 for(let i=first;i<=last;i++){const position=i*p.step-offset;if(position>extent||position+p.span<0)continue;ctx.drawImage(p.surface,vertical?x:position,vertical?position:y,p.iw,p.ih);}
}

function drawNewAtmosphere(){const k=themeIndex(),c=sectors[level].color;ctx.save();for(let layer=0;layer<2;layer++){const speed=layer===0?.14:.32;for(let i=0;i<12;i++){const x=((i*177-world*speed)%(W+220)+W+220)%(W+220)-110,y=i%2?H-20-(i*39)%75:20+(i*23)%70;ctx.globalAlpha=layer===0?.17:.25;if(k===4){ctx.strokeStyle='#9da5bc';ctx.lineWidth=layer?5:2;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+25,90);ctx.stroke();}else{orb(x,y,layer?12:5,c,.2);ctx.strokeStyle=c;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+10,y-18,x-12,y-34,x+4,y-52);ctx.stroke();}}}ctx.restore();}
function drawExpansionObstacle(o){const img=art[sectors[level].theme+'Obstacle'],c=sectors[level].color;for(const r of obstacleSolids(o)){ctx.save();ctx.shadowColor='#02050ddd';ctx.shadowBlur=8;if(imageReady(img)&&img.solidCrop){const a=img.solidCrop;if(r.side){ctx.translate(r.side==='left'?r.x+r.w:r.x,r.y);ctx.rotate(r.side==='left'?Math.PI/2:-Math.PI/2);ctx.drawImage(img,a.x,a.y,a.w,a.h,r.side==='left'?0:-r.h,0,r.h,r.w);}else{ctx.translate(r.x,r.ceiling?r.y+r.h:r.y);if(r.ceiling)ctx.scale(1,-1);ctx.drawImage(img,a.x,a.y,a.w,a.h,0,0,r.w,r.h);}}else{ctx.fillStyle=sectors[level].fog;ctx.fillRect(r.x,r.y,r.w,r.h);}ctx.restore();ctx.save();ctx.strokeStyle=c;ctx.globalAlpha=.6;ctx.lineWidth=1.5;ctx.beginPath();if(r.side){const x=r.side==='left'?r.x+r.w:r.x;ctx.moveTo(x,r.y+5);ctx.lineTo(x,r.y+r.h-5);}else{const y=r.ceiling?r.y+r.h:r.y;ctx.moveTo(r.x+5,y);ctx.lineTo(r.x+r.w-5,y);}ctx.stroke();ctx.restore();}}
function scenePainting(){return art[sectors[level].background]||art[themeIndex()===0?'space':themeIndex()===1?'carrier':'abyss'];}
function drawParallaxLandmarks(){const img=scenePainting();if(!imageReady(img))return;if(sectors[level].scrollAxis){drawVerticalEdges(img,.22,.35);return;}ctx.save();for(let i=0;i<5;i++){const x=((i*397-world*.22)%(W+550)+W+550)%(W+550)-260,y=i%2?H+28:-28;drawScenicFragment(img,x,y,150+(i%3)*30,65+(i%2)*20,i,.38);}ctx.restore();}
function drawScenicFragment(img,x,y,w,h,seed,alpha){ctx.save();ctx.translate(x,y);const top=y<H/2;ctx.beginPath();ctx.moveTo(-w,-h);ctx.bezierCurveTo(-w*.7,-h*.4,-w*.4,-h*.9,0,-h*.6);ctx.bezierCurveTo(w*.4,-h*.85,w*.55,-h*.2,w,-h*.5);ctx.lineTo(w,h);ctx.bezierCurveTo(w*.5,h*.7,w*.3,h*.4,0,h*.8);ctx.bezierCurveTo(-w*.6,h*.5,-w*.8,h,-w,h*.6);ctx.closePath();ctx.clip();ctx.globalAlpha=alpha;const sw=img.naturalWidth*.16,sh=img.naturalHeight*.21;ctx.drawImage(img,(seed*.173% .8)*img.naturalWidth,top?0:img.naturalHeight-sh,sw,sh,-w,-h,w*2,h*2);ctx.fillStyle='#04101a';ctx.globalAlpha=.22;ctx.fillRect(-w,-h,w*2,h*2);ctx.restore();}
function drawNearField(){
 const vertical=sectors[level].scrollAxis,flow=vertical==='up'?1:-1;ctx.save();
 // Small dust glints close to the camera give speed and depth without adding
 // misleading solid scenery or obscuring the combat lane with image cut-outs.
 for(let i=0;i<18;i++){const edge=19+(i*17)%74,baseX=vertical?(i%2?W-edge:edge):(i*193.7)%W,baseY=vertical?(i*149.3)%H:(i%2?H-edge:edge),p=sceneryPosition(baseX,baseY,.78+(i%4)*.095,70),size=1.1+(i%3)*.45;ctx.globalAlpha=.13+(i%3)*.035;ctx.strokeStyle='#d2e8e8';ctx.lineWidth=size;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+(vertical?0:5+i%3),p.y+(vertical?flow*(5+i%3):0));ctx.stroke();}
 ctx.restore();
}

function drawVerticalEdges(img,speed,alpha){const dir=sectors[level].scrollAxis==='up'?1:-1;for(let i=0;i<5;i++){const y=((i*233+world*speed*dir)%(H+400)+H+400)%(H+400)-200,x=i%2?W+125:-125;drawScenicFragment(img,x,y,150,95,i,alpha);}}

function drawOrbitalObstacle(o){const parts=o.shutters?shutterSolids(o):o.parts.map(p=>({...p,x:o.x+p.x}));for(const r of parts){ctx.save();ctx.translate(r.x+r.w/2,r.y+r.h/2);ctx.scale(r.w/108,r.h/108);drawModel(meshes.orbitalRock,0,0,1,.2+(o.id%3)*.3,.1,0,time*.015,0);ctx.restore();}}

// Finite, advecting breath volumes: particles retain launch direction as the mouth moves.
function organicMouth(b){if(bossDesign())return bossMount(b,bossDesign().mouth);if(bossIndex()===0)return wardenMount(b,[-106,10,0]);if(bossIndex()>=3)return expansionMouth(b);const p=bossFlightPose(b),v=rotateVertex([-65,7,0],p.yaw,p.roll,p.pitch,0,0);return{x:b.x+(bossIndex()===0?-35:-20)+v[0]*2.3*p.depth,y:b.y+v[1]*2.3*p.depth};}
function startBreath(b,kind,warning=1.3,options={}){const m=organicMouth(b),target={x:ship.x,y:ship.y},angle=Math.atan2(target.y-m.y,target.x-m.x),index=bossIndex(),phase=bossCombatPhase(b),final=index===5;
 const coreScale=(final?1.32:index===2?1.16:1.06)+phase*.04,plumeScale=(final?1.9:index===2?1.4:1.16)+phase*.08,speed=kind==='water'?1100+phase*20:kind==='wind'?920:final?1000+phase*30:870;
 b.breath={kind,target,age:0,warning,duration:options.duration??2.4,sweep:options.sweep||0,baseAngle:angle,coreScale,plumeScale,speed,clock:0,puffs:[],angle:angle-(options.sweep||0),sounded:false};b.attack=null;b.fireHeading=null;window.flightAudio?.breath?.('inhale',warning);}
function breathCoreRadius(a,q){return (10+q.age*(a.kind==='water'?30:52))*(a.coreScale||1);}
function updateBreath(b,dt){const a=b.breath;if(!a)return;a.age+=dt;const m=organicMouth(b),active=a.age>=a.warning&&a.age<a.warning+a.duration;if(a.target){a.target.x=ship.x;a.target.y=ship.y;let desired=Math.atan2(ship.y-m.y,ship.x-m.x);if(active){a.committedAngle??=a.baseAngle;const turn=Math.atan2(Math.sin(desired-a.committedAngle),Math.cos(desired-a.committedAngle));desired=a.committedAngle+clamp(turn,-.18,.18);}const delta=Math.atan2(Math.sin(desired-a.baseAngle),Math.cos(desired-a.baseAngle));a.baseAngle+=clamp(delta,-dt*(active?COMBAT_BALANCE.breathTracking:2.4),dt*(active?COMBAT_BALANCE.breathTracking:2.4));}
 if(active&&!a.sounded){a.sounded=true;if(bossIndex()===0)window.flightAudio?.roar?.(b.x);window.flightAudio?.breath?.(a.kind,a.duration);}
 if(active){a.angle=a.baseAngle+a.sweep*(2*passEase((a.age-a.warning)/a.duration)-1);a.clock+=dt;let count=0;while(a.clock>=.025&&count++<8){a.clock-=.025;const phase=a.age*37+count*2.3,angle=a.angle+Math.sin(phase)*(a.kind==='water'?.018:.03),speed=Math.max(a.speed,Math.min(1550,a.target?Math.hypot(a.target.x-m.x,a.target.y-m.y)/.72:0));a.puffs.push({x:m.x,y:m.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,age:0,seed:phase});}}
 let windContact=false;for(const q of a.puffs){q.age+=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;const r=breathCoreRadius(a,q);if(q.age<.82&&Math.hypot(ship.x-q.x,ship.y-q.y)<r+12){if(a.kind==='wind')windContact=true;else damage();}}
 if(windContact){ship.x=clamp(ship.x+Math.cos(a.angle)*160*dt,30,W-30);ship.y=clamp(ship.y+Math.sin(a.angle)*160*dt,30,H-30);}a.puffs=a.puffs.filter(q=>q.age<.9&&q.x>-100&&q.x<W+100&&q.y>-100&&q.y<H+100).slice(-100);if(a.age>a.warning+a.duration+.9)b.breath=null;
}
function drawBreath(b){const a=b.breath;if(!a)return;const m=organicMouth(b),heading=a.baseAngle,scale=a.plumeScale||1,fire=a.kind==='fire',color=fire?'#ff9b45':'#9fe7ff';ctx.save();
 if(a.age<a.warning){const charge=a.age/a.warning;orb(m.x,m.y,(13+charge*22)*scale,color,.38);orb(m.x,m.y,(4+charge*7)*scale,fire?'#ffeeb7':'#d8fcff',.65);}
 else if(a.age<a.warning+a.duration){orb(m.x,m.y,(19+Math.sin(a.age*39)*3)*scale,color,.52);orb(m.x,m.y,9*scale,fire?'#fff2c7':'#e7ffff',.82);}
 ctx.setLineDash([]);for(const q of a.puffs){const t=q.age/.9,r=breathCoreRadius(a,q),outer=(10+q.age*(a.kind==='water'?30:52))*scale;ctx.globalAlpha=(1-t)*.7;
  if(a.kind==='wind'){
   const angle=Math.atan2(q.vy,q.vx);ctx.strokeStyle='#b7f5ff';ctx.lineWidth=5*scale;ctx.beginPath();ctx.ellipse(q.x,q.y,outer*.45,outer,angle,0,Math.PI*1.65);ctx.stroke();
   ctx.strokeStyle='#f1ffff';ctx.lineWidth=1.8*scale;ctx.beginPath();ctx.moveTo(q.x-q.vx*.04,q.y-q.vy*.04);ctx.lineTo(q.x,q.y);ctx.stroke();orb(q.x,q.y,outer*.8,'#80d8e9',(1-t)*.18);
  }
  else{const c=fire?(t<.2?'#fff0b3':t<.55?'#ff963c':'#df4c20'):'#71cbe8';ctx.save();ctx.translate(q.x,q.y);ctx.rotate(Math.atan2(q.vy,q.vx));ctx.globalAlpha=(1-t)*.84;const tail=35*scale,tip=49*scale,flame=ctx.createLinearGradient(-tail,0,tip,0);flame.addColorStop(0,fire?'#ffefac':'#e2faff');flame.addColorStop(.5,c);flame.addColorStop(1,'transparent');ctx.fillStyle=flame;ctx.beginPath();ctx.moveTo(-tail,0);ctx.bezierCurveTo(-tail*.55,-r*.7,tip*.4,-r,tip+Math.sin(q.seed)*12,0);ctx.bezierCurveTo(tip*.4,r*.8,-tail*.5,r*.6,-tail,0);ctx.fill();ctx.restore();orb(q.x,q.y,outer*1.35,c,(1-t)*.40);orb(q.x+Math.sin(q.seed)*r*.35,q.y+Math.cos(q.seed)*r*.35,r*.45,fire?'#ffe6a1':'#d2f6ff',(1-t)*.76);
   if(a.kind==='water'){ctx.strokeStyle='#cef6ff';ctx.lineWidth=2.5*scale;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(q.x-q.vx*.029,q.y-q.vy*.029);ctx.stroke();}}
 }ctx.restore();}

function techLaserOrigin(b){if(bossDesign()){const p=bossFlightPose(b),v=rotateVertex([-1,0,0],p.yaw,p.roll,p.pitch,0,0);return{...bossMount(b,bossDesign().mouth),angle:Math.atan2(v[1],v[0])};}const p=bossFlightPose(b),v=rotateVertex([-69,-40,0],p.yaw,p.roll,p.pitch,0,0),tip=rotateVertex([-28,0,0],p.yaw,p.roll,p.pitch,0,0);return{x:b.x+v[0]*2+tip[0]*1.8,y:b.y+v[1]*2+tip[1]*1.8,angle:Math.atan2(tip[1],tip[0])};}
function techAimPitch(b,target){
 const p=bossFlightPose(b),axis=rotateVertex([-1,0,0],p.yaw,p.roll,0,0,0);
 let pitch=b.beamPitch||0;
 for(let i=0;i<4;i++){const d=bossDesign()||{mouth:[-100,0,0],scale:2},tip=rotateVertex(d.mouth,p.yaw,p.roll,(b.flightPitch||0)+pitch,0,0),a=Math.atan2(target.y-b.y-tip[1]*d.scale,target.x-b.x-tip[0]*d.scale),delta=a-Math.atan2(axis[1],axis[0])-(b.flightPitch||0);pitch=Math.atan2(Math.sin(delta),Math.cos(delta));}
 return clamp(pitch,-.85,.85);
}
function techSweepWarningBounds(b,h,x){
 const pose=bossFlightPose(b),design=bossDesign(),span=Math.abs(b.beamPrep??h?.sweepFrom??.2),margin=(h?.width??(72+bossCombatPhase(b)*10))/2+20;let top=Infinity,bottom=-Infinity;
 // Include the rotated muzzle, not merely a fan around its current position.
 // Full beam thickness is warned even immediately beside the cannon barrel.
 for(const angle of [-span,span,b.beamPitch||0]){const pitch=(b.flightPitch||0)+angle,tip=rotateVertex(design.mouth,pose.yaw,pose.roll,pitch,0,0),axis=rotateVertex([-1,0,0],pose.yaw,pose.roll,pitch,0,0),mx=b.x+tip[0]*design.scale,my=b.y+tip[1]*design.scale,y=my+axis[1]/axis[0]*(x-mx);top=Math.min(top,y-margin);bottom=Math.max(bottom,y+margin);}
 return{top,bottom};
}
function techBeamContact(h,x,y){const a=h.angle??Math.PI,dx=x-h.x,dy=y-h.startY,along=dx*Math.cos(a)+dy*Math.sin(a),across=-dx*Math.sin(a)+dy*Math.cos(a);return along>=0&&Math.abs(across)<h.width*.5*(.5+.5*clamp(along/180,0,1))+12;}
function updateTechLaser(b,dt){
 const beam=hazards.find(h=>h.kind==='tech');let target=b.beamPrep||0;
 if(beam&&Number.isFinite(beam.sweepFrom)){const u=clamp((beam.age-beam.warning)/(beam.life-beam.warning),0,1),travel=beam.doubleSweep?(u<.5?passEase(u*2):1-passEase((u-.5)*2)):passEase(u);target=beam.sweepFrom+(beam.sweepTo-beam.sweepFrom)*travel;}
 b.beamPitch=(b.beamPitch||0)+(target-(b.beamPitch||0))*(1-Math.exp(-dt*6));
 for(const h of hazards){if(h.kind!=='tech')continue;const r=techLaserOrigin(b);h.x=r.x;h.startY=r.y;h.angle=r.angle;h.y=r.y-Math.tan(r.angle)*r.x;h.age+=dt;if(h.age>=h.warning&&!h.sounded){h.sounded=true;window.flightAudio?.laserBeam(h.life-h.warning);}if(h.age>=h.warning&&h.age<h.life&&techBeamContact(h,ship.x,ship.y))damage();}
 const had=hazards.length;hazards=hazards.filter(h=>h.age<h.life);if(had&&!hazards.length){b.recovery=2.3;b.exposed=Math.max(b.exposed||0,3.2);}
}


function terrainMesh(r,seed){if(themeIndex()===1||themeIndex()===4)return industrialTerrainMesh(r,seed);const faces=[],rows=24,sides=32,k=themeIndex(),color=k===0?[166,170,172]:k===1?[66,70,74]:k===2?[148,157,178]:k===3?[107,171,153]:k===4?[73,70,65]:[184,106,119];
 const point=(t,a)=>{const width=terrainProfile(r,t,seed),cross=Math.cos(a),depth=Math.sin(a),rough=1-.06*Math.sin(t*47+a*7+seed)*Math.sin(a*3+seed);return r.side?[t*r.w,(terrainCenter(t,seed)+cross*width*.5)*r.h,depth*Math.min(r.h,r.w)*.32*rough]:[(terrainCenter(t,seed)+cross*width*.5)*r.w,t*r.h,depth*Math.min(r.h,r.w)*.32*rough];};
 const rings=Array.from({length:rows+1},(_,i)=>Array.from({length:sides},(_,j)=>point(i/rows,j/sides*TAU)));
 for(let i=0;i<rows;i++)for(let j=0;j<sides;j++)faces.push({v:[rings[i][j],rings[i+1][j],rings[i+1][(j+1)%sides],rings[i][(j+1)%sides]],c:color,em:0,flex:0});faces.push({v:rings[0].slice().reverse(),c:color,em:0,flex:0},{v:rings[rows].slice(),c:color,em:0,flex:0});faces.rock=k!==1&&k!==4;return faces;}
function drawTerrainObstacle(o){if(themeIndex()===0){for(const [i,r] of obstacleForms(o).entries()){const a=asteroidSurface(o,r,i),p=asteroidPose(o,i);drawModel(a.mesh,r.x+r.w/2,r.y+r.h/2,1,p.yaw,p.roll,p.pitch,time);}return;}o.terrainMeshes??=[];for(const [index,r] of obstacleForms(o).entries()){if(r.w<=0||r.h<=0)continue;const seed=(o.id||0)*1.7+index*.9,key=r.w.toFixed(1)+':'+r.h.toFixed(1);let saved=o.terrainMeshes[index];if(!saved){const mesh=terrainMesh(r,seed),depth=Math.min(r.h,r.w);saved=o.terrainMeshes[index]={mesh,key,points:[...new Set(mesh.flatMap(f=>f.v))].map(v=>({v,x:v[0]/r.w,y:v[1]/r.h,z:v[2]/depth}))};}else if(saved.key!==key){const depth=Math.min(r.h,r.w);for(const p of saved.points){p.v[0]=p.x*r.w;p.v[1]=p.y*r.h;p.v[2]=p.z*depth;}saved.mesh.dynamic=true;saved.key=key;}drawModel(saved.mesh,r.x,r.y,1,0,0,0,0);}}

function organicFlightPose(b){return bossFlightPose(b);}
function bossEyeOrigin(b){if(bossIndex()===0)return wardenMount(b,[-79,-11,-25]);const k=bossIndex(),p=bossFlightPose(b),local=k===2?[-38,-18,-25]:[-57,-24,-22],scale=k===2?2.3:k===3?2.1:2.15,v=rotateVertex(local,p.yaw,p.roll,p.pitch,0,0);return{x:b.x+v[0]*scale*p.depth,y:b.y+v[1]*scale*p.depth};}
function updateEyeAttack(b,dt){b.eyeAttack=null;}

// Reuse the existing collision slices for this simulation pose. The envelope
// rejects distant shots before the narrow phase; it never replaces the slices.
function terrainShotBounds(o,solids){
 const cached=o.shotBounds;if(cached?.solids===solids)return cached;
 let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
 for(const r of solids){left=Math.min(left,r.x);top=Math.min(top,r.y);right=Math.max(right,r.x+r.w);bottom=Math.max(bottom,r.y+r.h);}
 return o.shotBounds={solids,left,top,right,bottom};
}
function shotTerrainHit(x,y,s){let first=2;const dx=s.x-x,dy=s.y-y,
 left=Math.min(x,s.x),right=Math.max(x,s.x),top=Math.min(y,s.y),bottom=Math.max(y,s.y);
 const parallelX=Math.abs(dx)<1e-8,parallelY=Math.abs(dy)<1e-8;
 for(const o of obstacles){
  const solids=obstacleSolids(o),bounds=terrainShotBounds(o,solids);
  if(right>=bounds.left&&left<=bounds.right&&bottom>=bounds.top&&top<=bounds.bottom){
   for(const r of solids){
    if(right<r.x||left>r.x+r.w||bottom<r.y||top>r.y+r.h)continue;
    let lo=0,hi=1;
    if(parallelX){if(x<r.x||x>r.x+r.w)continue;}
    else{const a=(r.x-x)/dx,b=(r.x+r.w-x)/dx;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}
    if(parallelY){if(y<r.y||y>r.y+r.h)continue;}
    else{const a=(r.y-y)/dy,b=(r.y+r.h-y)/dy;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}
    if(lo<=hi&&lo<first)first=lo;
   }
  }
  // Include the blade corners plus projectile radius, not just its long axis.
  if(o.rotor){const radius=Math.hypot(155+s.r,14+s.r),cx=o.x+210;
   if(right<cx-radius||left>cx+radius||bottom<380-radius||top>380+radius)continue;
   const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/5));
   for(let i=0;i<=steps;i++){const t=i/steps;if(t>=first)break;if(rotorContact(o,x+dx*t,y+dy*t,s.r)){first=t;break;}}
  }
 }
 return first<=1?{x:x+dx*first,y:y+dy*first}:null;
}
function terrainImpact(x,y,vx,vy){const angle=Math.atan2(-vy,-vx);for(let i=0;i<8;i++){const a=angle+rand(-1.3,1.3),speed=rand(65,210),life=rand(.12,.26);particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life,max:life,c:i<2?'#f2ffff':i%2?'#79cee3':'#ffce82',r:i<2?2.6:1.3,spark:true});}if(particles.length>900)particles.splice(0,particles.length-900);}
function updateAcidClouds(dt){for(const h of acidClouds){h.age+=dt;h.x-=SCROLL_SPEED*.24*dt;if(h.age>=h.warning&&h.age<h.life-.5&&Math.hypot(ship.x-h.x,ship.y-h.y)<h.r+12)damage();}acidClouds=acidClouds.filter(h=>h.age<h.life&&h.x>-100);}
function drawAcidClouds(){for(const h of acidClouds){const armed=h.age>=h.warning,fade=Math.min(1,(h.life-h.age)/.5);ctx.save();for(let j=0;j<9;j++){const a=j*2.4+h.age*.23,r=h.r*(.35+(j%3)*.07);orb(h.x+Math.cos(a)*h.r*.46,h.y+Math.sin(a)*h.r*.46,r,j%2?'#54792b':'#91a744',fade*(armed?.3:.12));}ctx.globalAlpha=fade*.7;ctx.strokeStyle=armed?'#bbdb72':'#d8c475';ctx.lineWidth=1.5;ctx.setLineDash(armed?[]:[4,7]);ctx.beginPath();for(let j=0;j<=48;j++){const a=j/48*TAU,r=h.r*(1+Math.sin(a*5+h.age*2)*.045);j?ctx.lineTo(h.x+Math.cos(a)*r,h.y+Math.sin(a)*r):ctx.moveTo(h.x+r,h.y);}ctx.closePath();ctx.stroke();ctx.setLineDash([]);ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillStyle='#e0ecc3';ctx.fillText(h.spore?(armed?'SPORES':'SPORES RIPENING'):(armed?'ACID':'ACID FORMING'),h.x,h.y-h.r-8);ctx.restore();}}

function wardenMount(b,point){const p=bossFlightPose(b),v=rotateVertex(point,p.yaw,p.roll,p.pitch,0,0),scale=1.95*p.depth;return{x:b.x+v[0]*scale,y:b.y+v[1]*scale};}
function wardenExpression(b){const blink=naturalBlink(b.age,.8),breath=b.breath,open=breath?(breath.age<breath.warning?clamp(breath.age/breath.warning,0,1):clamp(1-(breath.age-breath.warning-breath.duration)*4,0,1)):0;return{blink,jaw:Math.max(open,(b.roar||0)>0?Math.sin(Math.min(1,b.roar/1.3)*Math.PI)*.9:0,.08+.06*Math.sin(b.age*1.9)),inhale:breath&&breath.age<breath.warning?Math.sin(breath.age/breath.warning*Math.PI):0};}
function drawWardenCreature(b){const expression=wardenExpression(b),mesh=meshes.wardenCreature,p=bossFlightPose(b);for(const part of mesh.parts){const tail=part.name==='tail',limb=part.name.startsWith('limb'),side=part.name.endsWith(':-1')?-1:1,phase=b.age*1.7+(part.name.includes('1:')?1.4:0)+side*.5;for(const q of part.points){const v=q.rest;let x=v[0],y=v[1],z=v[2];if(part.name.startsWith('lid:')){const upper=Number(part.name.split(':')[2]);y-=upper*expression.blink*2.3;}else if(part.name==='throat'){y+=expression.jaw*7;}else if(part.name==='body'){const chest=Math.exp(-(((x+10)/45)**2));y*=1+chest*expression.inhale*.065;z*=1+chest*expression.inhale*.065;}else if(part.name.startsWith('wing')){const phase=b.age*3.5,fold=Math.max(0,Math.cos(phase))*.5;let dy=y,dz=z-side*65;if(Math.abs(z)>65){const a=side*fold;y=dy*Math.cos(a)-dz*Math.sin(a);z=side*65+dy*Math.sin(a)+dz*Math.cos(a);}const a=side*(-.2+Math.sin(phase)*.85);dy=y-part.pivot[1];dz=z-part.pivot[2];y=part.pivot[1]+dy*Math.cos(a)-dz*Math.sin(a);z=part.pivot[2]+dy*Math.sin(a)+dz*Math.cos(a);}else if(tail){const w=clamp((x-50)/130,0,1);y+=Math.sin(b.age*1.6-w*3)*w*w*20;z+=Math.cos(b.age*1.6-w*3)*w*w*26;}else if(limb){const a=Math.sin(phase)*.28,dy=y-part.pivot[1],dz=z-part.pivot[2];y=part.pivot[1]+dy*Math.cos(a)-dz*Math.sin(a);z=part.pivot[2]+dy*Math.sin(a)+dz*Math.cos(a);x+=Math.sin(phase-.7)*Math.abs(dz)*.1;}else if(part.name==='jaw'){const a=-.04-expression.jaw*.47,dx=x-part.pivot[0],dy=y-part.pivot[1];x=part.pivot[0]+dx*Math.cos(a)-dy*Math.sin(a);y=part.pivot[1]+dx*Math.sin(a)+dy*Math.cos(a);}q.v[0]=x;q.v[1]=y;q.v[2]=z;}}drawModel(mesh,b.x,b.y,1.95*p.depth,p.yaw,p.roll,p.pitch,b.age,b.hit);}

// Forge equipment uses three repeatable engineering profiles. Bands align with
// the existing 24 collision slices; its support always reaches the room edge.
// Each authored group advances its part seed by .9; keep those parts distinct.
function forgeObstacleVariant(seed){return Math.floor(Math.abs(seed)/.9+.001)%3;}
function forgeObstacleProfile(fromRoot,seed){const q=Math.min(23,Math.floor(clamp(fromRoot,0,1)*24)),kind=forgeObstacleVariant(seed);if(kind===0)return q<4?.96:q<15?.86:q<21?.70:.58;if(kind===1)return q<4?.96:q<14?.58:q<21?.84:.66;return q<5?.96:q<12?.78:q<20?.92:q<23?.76:.60;}
function forgeTerrainMesh(r,seed){
 const faces=[],components=[],cross=r.side?r.h:r.w,length=r.side?r.w:r.h,depth=Math.min(cross,length)*.22,kind=forgeObstacleVariant(seed);
 const steel=[74,86,90],edge=[102,113,112],dark=[28,42,48],black=[12,24,29],brass=[132,101,58],paint=[58,73,80],warm=[212,143,59],cool=[87,190,195];
 const point=(u,v,z)=>r.side?[r.side==='left'?v:length-v,u,z]:[u,r.ceiling?v:length-v,z];
 const face=(v,c,em=0)=>faces.push({v,c,em,flex:0});
 const finish=(name,start)=>components.push({name,start,end:faces.length});
 function box(u,v,w,h,c=steel,front=-depth-2,d=5,bevel=1.8){
  const start=faces.length,b=Math.min(w*.2,h*.2,bevel),xy=[[u-w/2+b,v-h/2],[u+w/2-b,v-h/2],[u+w/2,v-h/2+b],[u+w/2,v+h/2-b],[u+w/2-b,v+h/2],[u-w/2+b,v+h/2],[u-w/2,v+h/2-b],[u-w/2,v-h/2+b]],a=xy.map(p=>point(p[0],p[1],front)),z=xy.map(p=>point(p[0],p[1],front+d));
  face(a,c);face(z.slice().reverse(),dark);for(let i=0;i<8;i++){const j=(i+1)%8;face([a[i],a[j],z[j],z[i]],i%2?edge:dark);}finish('closed equipment panel',start);
 }
 function tube(path,radius,c=steel,sides=10){
  const start=faces.length,rings=[];
  for(let j=0;j<path.length;j++){
   const p=path[j],a=path[Math.max(0,j-1)],b=path[Math.min(path.length-1,j+1)],du=b[0]-a[0],dv=b[1]-a[1],len=Math.hypot(du,dv)||1,n=[-dv/len,du/len];
   rings.push(Array.from({length:sides},(_,i)=>{const t=i/sides*TAU;return point(p[0]+Math.cos(t)*radius*n[0],p[1]+Math.cos(t)*radius*n[1],p[2]+Math.sin(t)*radius);}));
  }
  face(rings[0].slice().reverse(),c);face(rings.at(-1),c);for(let j=0;j<rings.length-1;j++)for(let i=0;i<sides;i++){const k=(i+1)%sides;face([rings[j][i],rings[j][k],rings[j+1][k],rings[j+1][i]],i%4?c:edge);}finish('closed flanged pipe',start);
 }
 function light(u,v,w,h,c){const start=faces.length;box(u,v,w,h,c,-depth-7,1,.4);for(let i=start;i<faces.length;i++)faces[i].em=.5;}
 // A continuous eight-sided armored shell, not a pile of independent boxes.
 const rows=[];let previous=null;
 const row=(v,width)=>{const l=(cross-width)/2,rr=(cross+width)/2,b=Math.min(4,width*.05,depth*.24);return[[l+b,-depth],[rr-b,-depth],[rr,-depth+b],[rr,depth-b],[rr-b,depth],[l+b,depth],[l,depth-b],[l,-depth+b]].map(p=>point(p[0],v,p[1]));};
 for(let i=0;i<24;i++){
  const width=cross*forgeObstacleProfile((i+.5)/24,seed),v=i*length/24;
  if(previous===null)rows.push(row(v,width));else if(width!==previous){rows.push(row(v,previous));rows.push(row(v,width));}
  previous=width;
 }rows.push(row(length,previous));
 face(rows[0].slice().reverse(),dark);face(rows.at(-1),steel);
 for(let j=0;j<rows.length-1;j++)for(let i=0;i<8;i++){const k=(i+1)%8;face([rows[j][i],rows[j][k],rows[j+1][k],rows[j+1][i]],i===0?paint:i===7||i===1?edge:steel);}
 finish('closed anchored shell',0);
 // Root collar, bolted maintenance hatch and a inset control panel are shared
 // architectural language, while the three machines have different workings.
 box(cross*.5,length*.075,cross*.84,length*.10,dark,-depth-3,7);
 box(cross*.5,length*.085,cross*.71,length*.043,steel,-depth-6,3);
 for(const sign of [-1,1])for(const v of [.052,.10])box(cross*(.5+sign*.34),length*v,Math.max(2,cross*.025),Math.max(2,cross*.025),brass,-depth-8,1,.3);
 if(kind===0){
  // Pump station: a cylindrical pressure vessel, flanges and a return pipe.
  const u=cross*.49,rad=cross*.18;
  tube([[u,length*.20,-depth-2],[u,length*.68,-depth-2]],rad,steel,16);
  for(const v of [.22,.38,.63])tube([[u,length*(v-.012),-depth-2],[u,length*(v+.012),-depth-2]],rad*1.12,dark,16);
  tube([[cross*.27,length*.18,-depth-8],[cross*.25,length*.40,-depth-8],[cross*.28,length*.46,-depth-8],[cross*.29,length*.65,-depth-8]],cross*.037,brass,10);
  box(cross*.51,length*.83,cross*.44,length*.14,dark,-depth-3,5);
  for(let i=0;i<5;i++)box(cross*(.34+i*.08),length*.83,cross*.026,length*.10,edge,-depth-6,2,.4);
  light(cross*.68,length*.53,cross*.027,length*.063,cool);
 }else if(kind===1){
  // Service gantry: solid recessed web with diagonal load-bearing trusses and
  // a wide machinery head. Dark backing keeps the solid hit surface legible.
  box(cross*.5,length*.36,cross*.46,length*.36,black,-depth-3,4);
  for(const sign of [-1,1])tube([[cross*(.5+sign*.21),length*.18,-depth-7],[cross*(.5+sign*.21),length*.55,-depth-7]],cross*.029,edge,8);
  for(let i=0;i<3;i++)tube([[cross*(i%2?.69:.31),length*(.19+i*.12),-depth-8],[cross*(i%2?.31:.69),length*(.30+i*.12),-depth-8]],cross*.027,steel,8);
  box(cross*.5,length*.73,cross*.72,length*.19,dark,-depth-3,5);
  box(cross*.5,length*.73,cross*.62,length*.13,paint,-depth-6,4);
  for(let i=0;i<6;i++)box(cross*(.25+i*.10),length*.73,cross*.045,length*.11,edge,-depth-10,3,.5);
  light(cross*.5,length*.92,cross*.27,Math.max(2,length*.009),warm);
 }else{
  // Power housing: segmented switchgear around a separate cooling manifold.
  for(let i=0;i<3;i++){
   const v=length*(.27+i*.20),w=cross*(i===0?.62:.75);
   box(cross*.5,v,w,length*.16,dark,-depth-3,5);box(cross*.5,v,w*.87,length*.13,steel,-depth-6,3);
   for(let j=0;j<4;j++)box(cross*.45,v+length*(j-1.5)*.026,w*.52,length*.008,black,-depth-8,1,.3);
   light(cross*.72,v,cross*.025,length*.06,i===1?cool:warm);
  }
  tube([[cross*.35,length*.86,-depth-5],[cross*.35,length*.94,-depth-5],[cross*.65,length*.94,-depth-5],[cross*.65,length*.86,-depth-5]],cross*.032,brass,10);
 }
 // Small inset hazard tabs identify the collision tip without a neon outline.
 for(let i=0;i<4;i++)box(cross*(.34+i*.10),length*.985,cross*.042,Math.max(1.5,length*.012),i%2?dark:warm,-depth-4,2,.3);
 faces.industrial=true;faces.forgeVariant=kind;faces.components=components;return faces;
}

function industrialTerrainMesh(r,seed){if(themeIndex()===1)return forgeTerrainMesh(r,seed);const faces=[],w=r.w,h=r.h,depth=Math.min(w,h)*.22;
 function box(x,y,z,bw,bh,bd,c,em=0){const v=[[x,y,z],[x+bw,y,z],[x+bw,y+bh,z],[x,y+bh,z],[x,y,z+bd],[x+bw,y,z+bd],[x+bw,y+bh,z+bd],[x,y+bh,z+bd]];for(const ids of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]])faces.push({v:ids.map(i=>v[i]),c,em,flex:0});}
 // Layered equipment cabinets follow the same authored collision profile.
 for(let i=0;i<24;i++){const t=(i+.5)/24,f=terrainProfile(r,t,seed),shade=i%6===0?[115,119,112]:[77,85,86];if(r.side)box(i*w/24,h*(.5-f/2),-depth,w/24,h*f,depth*2,shade);else box(w*(.5-f/2),i*h/24,-depth,w*f,h/24,depth*2,shade);}
 for(let i=0;i<8;i++){const t=(i+.5)/8,f=terrainProfile(r,t,seed),x=r.side?t*w:w*.5,y=r.side?h*.5:t*h,span=(r.side?h:w)*f*.72;
 if(r.side){box(x-w*.04,y-span/2,-depth*1.04,w*.075,span,depth*.06,[37,47,50]);for(let j=0;j<4;j++)box(x-w*.033,y-span*.4+j*span*.24,-depth*1.08,w*.06,h*.006,depth*.06,[126,129,117]);box(x-w*.036,y-span*.46,-depth*1.10,w*.012,span*.12,depth*.04,[229,167,69],.35);}
 else{box(x-span/2,y-h*.04,-depth*1.04,span,h*.075,depth*.06,[37,47,50]);for(let j=0;j<4;j++)box(x-span*.4,y-h*.033+j*h*.018,-depth*1.08,span*.8,h*.006,depth*.06,[126,129,117]);box(x-span*.46,y-h*.036,-depth*1.10,span*.12,h*.012,depth*.04,[229,167,69],.35);}}
 if(r.y>0&&r.y+r.h<H&&!r.side){for(const f of [.32,.68]){box(w*f-w*.065,h*.82,-depth*1.12,w*.13,h*.12,depth*.18,[28,39,44]);box(w*f-w*.045,h*.89,-depth*1.15,w*.09,h*.025,depth*.04,[98,220,235],.8);}}
 faces.industrial=true;return faces;}

const asteroidSurfaces=new Map();
function asteroidSurface(o,r,index){const seed=(o.id||0)*1.7+index*.9,key=[seed,r.w,r.h,r.ceiling].join(':');let surface=asteroidSurfaces.get(key);if(!surface){const mesh=crateredAsteroid(r,seed),points=[...new Set(mesh.flatMap(f=>f.v))],ids=new Map(points.map((p,i)=>[p,i]));surface={mesh,points,faces:mesh.map(f=>f.v.map(v=>ids.get(v)))};asteroidSurfaces.set(key,surface);}return surface;}
function asteroidPose(o,index){const t=time-o.at,seed=(o.id||0)*.71+index*1.3;return{yaw:t*.23+seed,roll:t*.19+seed*.6,pitch:Math.sin(t*.31+seed)*.24};}
function asteroidSolids(o){const result=[];for(const [index,r] of obstacleForms(o).entries()){if(r.w<=0||r.h<=0)continue;const surface=asteroidSurface(o,r,index),stamp=Math.floor((time-o.at)*30);if(surface.collisionStamp===stamp){for(const q of surface.collision)result.push({...q,x:q.x+r.x,y:q.y+r.y});continue;}const first=result.length,p=asteroidPose(o,index),cy=Math.cos(p.yaw),sy=Math.sin(p.yaw),cr=Math.cos(p.roll),sr=Math.sin(p.roll),cp=Math.cos(p.pitch),sp=Math.sin(p.pitch),cx=r.w/2,yy=r.h/2;
 const points=surface.points.map(v=>{const x=v[0]*cy+v[2]*sy,z=-v[0]*sy+v[2]*cy,y=v[1]*cr-z*sr;return[x*cp-y*sp+cx,x*sp+y*cp+yy];});let minY=Infinity,maxY=-Infinity;for(const v of points){minY=Math.min(minY,v[1]);maxY=Math.max(maxY,v[1]);}const step=(maxY-minY)/48,lo=new Float64Array(48).fill(Infinity),hi=new Float64Array(48).fill(-Infinity);
 for(const face of surface.faces){let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;for(const id of face){const v=points[id];x0=Math.min(x0,v[0]);x1=Math.max(x1,v[0]);y0=Math.min(y0,v[1]);y1=Math.max(y1,v[1]);}for(let row=Math.max(0,Math.floor((y0-minY)/step));row<=Math.min(47,Math.floor((y1-minY)/step));row++){lo[row]=Math.min(lo[row],x0);hi[row]=Math.max(hi[row],x1);}}
 for(let i=0;i<48;i++)if(hi[i]>lo[i])result.push({x:lo[i],y:minY+i*step,w:hi[i]-lo[i],h:step,ceiling:r.ceiling});surface.collisionStamp=stamp;surface.collision=result.slice(first);for(let i=first;i<result.length;i++)result[i]={...result[i],x:result[i].x+r.x,y:result[i].y+r.y};}return result;}

function encounterSocket(b,point,scale=2.15){if(bossDesign())return bossMount(b,point);const p=bossFlightPose(b),v=rotateVertex(point,p.yaw,p.roll,p.pitch,0,0);return{x:b.x+v[0]*scale*p.depth,y:b.y+v[1]*scale*p.depth};}
function updateEncounter(b,dt){if(isTideEncounter())return;if(typeof isCapitalSiege==='function'&&isCapitalSiege(b))return;b.roar=Math.max(0,(b.roar||0)-dt);if(bossIndex()===0){b.roarClock=(b.roarClock??2)-dt;if(b.roarClock<=0&&!b.breath&&!b.pass){b.roar=1.3;b.roarClock=12;window.flightAudio?.roar?.(b.x);}}const k=bossIndex(),phase=bossCombatPhase(b);b.exposed=Math.max(0,(b.exposed||0)-dt);if(phase>(b.phaseSeen||0)){b.phaseSeen=phase;b.phaseNotice=true;}if(b.phaseNotice&&!bossPatternBusy(b)&&!b.recovery){b.phaseNotice=false;announce(phase===2?'HOSTILE ENRAGED':'HOSTILE ADAPTING','STRONGER PATTERNS · WATCH THE WINDUP');}
 if(k===1){b.generators??=[{hp:30,side:-1},{hp:30,side:1}];if(b.generators.every(n=>n.hp<=0)){if(!b.shieldBroken){b.shieldBroken=true;b.exposed=8;announce('SHIELD OFFLINE','EIGHT SECONDS TO ATTACK');}else if(b.exposed===0){for(const n of b.generators)n.hp=30;b.shieldBroken=false;}}}
 if(k===2){if(b.hadRush&&!(b.rush>0))b.exposed=3.5;b.hadRush=b.rush>0;}
 if(k===4){if(b.hadLaser&&!hazards.length)b.exposed=4;b.hadLaser=hazards.length>0;}
 if(k===5)b.hadGuards=enemies.some(e=>e.guardian&&e.hp>0);
}
// Exposed anatomy must be lined up with the gun, rather than granting a
// whole-body bonus to every stray round. Capital/tide encounters have their own nodes.
function bossWeakPoint(b){
 if(isTideEncounter()||typeof isCapitalSiege==='function'&&isCapitalSiege(b))return null;
 const k=bossIndex(),open=k===1?b.shieldBroken:b.exposed>0;
 if(!open||k===5&&enemies.some(e=>e.guardian&&e.hp>0))return null;
 const d=bossDesign(),p=k===4?(d?bossMount(b,[d.mouth[0]+20,d.mouth[1]-38,d.mouth[2]]):techLaserOrigin(b)):organicMouth(b);
 return {...p,r:k===4?18:28,multiplier:k===4?8:6.5};
}
function encounterDamage(b,s){
 if(isTideEncounter())return b.exposed>0?2.2:.65+.15*(b.tide?.pods.filter(p=>p.hp<=0).length||0);
 if(typeof isCapitalSiege==='function'&&isCapitalSiege(b))return 0;
 const weak=bossWeakPoint(b),dir=s.direction||Math.sign(s.vx||1);
 // Project the shot's lane through the visible mouth/vent. The outer collision
 // shell can sit a few pixels ahead of that anatomical socket during rotation.
 if(weak&&Math.abs(s.y-weak.y)<weak.r+(s.r||0)&&(weak.x-b.x)*dir<0)return weak.multiplier;
 return bossIndex()===4?.04:.25;
}
function drawBossWeakPoint(b){const p=bossWeakPoint(b);if(!p)return;ctx.save();const c=bossIndex()===4?'#ffe1a0':'#a6ffcd';orb(p.x,p.y,p.r,c,.3);ctx.strokeStyle=c;ctx.lineWidth=2;ctx.globalAlpha=.8;ctx.beginPath();ctx.arc(p.x,p.y,p.r+3,0,TAU);ctx.stroke();ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillStyle=c;ctx.fillText('EXPOSED',p.x,p.y-p.r-8);ctx.restore();}
function hitEncounterNode(s){if(isTideEncounter())return hitTideNode(s);if(typeof isCapitalSiege==='function'&&isCapitalSiege(boss))return hitCapitalSection(s);if(!boss||bossIndex()!==1)return false;for(const n of boss.generators||[]){if(n.hp<=0)continue;const p=encounterSocket(boss,[-18,n.side*57,-40]);if(Math.hypot(s.x-p.x,s.y-p.y)<20+s.r){n.hp-=s.damage;burst(p.x,p.y,n.hp<=0?'#ffba70':'#81dfff',n.hp<=0?12:3);return true;}}return false;}
// Only physical charge effects and released attacks; no projected paths or landing markers.
function drawBossPatternTelegraphs(b){
 ctx.save();
 for(const p of b.sporePods||[])if(p.emitted){orb(p.x,p.y,12*(p.visualScale||1),p.acid?'#bcc965':'#91dfb1',.6);drawModel(meshes.spore,p.x,p.y,p.visualScale||1.4,0,p.age*3,0,p.age);}
 if(b.capacitorSalvo&&b.capacitorSalvo.age<b.capacitorSalvo.warning){const v=b.capacitorSalvo,m=techLaserOrigin(b),q=clamp(v.age/v.warning,0,1);orb(m.x,m.y,14+q*20,'#d1baff',.35+q*.4);orb(m.x,m.y,4+q*7,'#fff2da',.7);}
 if(b.salvoWindup){const v=b.salvoWindup,m=expansionMouth(b),q=clamp(v.age/v.warning,0,1);orb(m.x,m.y,20+q*25,'#ffad5d',.35+q*.2);}
 if(bossIndex()===3&&b.vacuum>0){const m=expansionMouth(b);ctx.strokeStyle='#a0e6ce';ctx.lineWidth=1.5;for(let i=0;i<20;i++){const t=(b.age*.65+i/20)%1,x=m.x+(Math.cos(bossFlightPose(b).yaw)>0?-1:1)*820*(1-t),spread=(1-t)*178,yy=m.y+Math.sin(i*2.4)*spread;ctx.globalAlpha=Math.sin(t*Math.PI)*.33;ctx.beginPath();ctx.moveTo(x-19,yy);ctx.quadraticCurveTo(x,yy,x+26,yy-Math.sin(i*2.4)*10);ctx.stroke();}}
 ctx.restore();
}
function drawEncounterDefenses(b){if(isTideEncounter()){drawTideEncounter(b);return;}if(typeof isCapitalSiege==='function'&&isCapitalSiege(b)){drawCapitalSiege(b);return;}const k=bossIndex();drawBossPatternTelegraphs(b);drawBossWeakPoint(b);if(k===1){for(const n of b.generators||[]){const p=encounterSocket(b,[-18,n.side*57,-40]);if(n.hp>0){const pose=bossFlightPose(b);drawModel(meshes.weaponOrb,p.x,p.y,.75,pose.yaw,pose.roll,pose.pitch,b.age);healthBar(p.x,p.y-24,35,n.hp,30,'#98e5ff');}}}if((k===1&&!b.shieldBroken)||(k===5&&enemies.some(e=>e.guardian&&e.hp>0))){ctx.save();ctx.strokeStyle=k===1?'#77bfe8':'#b883c9';ctx.globalAlpha=.3;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(b.x,b.y,b.r*1.15,b.r*.9,0,0,TAU);ctx.stroke();ctx.restore();}}
function sectorCurrent(){if(sectors[level].stellar?.weather==='wind'&&!boss)return Math.sin(time*Math.PI/7)*24;return themeIndex()===2&&!boss?Math.sin(time*Math.PI/6)*65:0;}
function stormLane(){const cycle=Math.floor(time/14),phase=time%14;return themeIndex()===4&&time>10&&!boss&&phase<3.2?{x:W*(.28+(cycle%3)*.23),warning:phase<2,phase}:null;}
function drawSectorRule(){const wind=sectorCurrent();if(Math.abs(wind)>12){ctx.save();ctx.strokeStyle='#b4d5e5';ctx.globalAlpha=.14;ctx.lineWidth=1;for(let i=0;i<12;i++){const x=120+i*105,y=(i*137+world*.45)%H;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+Math.sign(wind)*30);ctx.stroke();}ctx.restore();}const lane=stormLane();if(lane){ctx.save();ctx.strokeStyle=lane.warning?'#c5a7e7':'#e8dfff';ctx.globalAlpha=lane.warning?.45:.85;ctx.lineWidth=lane.warning?2:7;ctx.setLineDash(lane.warning?[9,12]:[]);for(const side of lane.warning?[-1,1]:[0]){ctx.beginPath();for(let i=0;i<=20;i++){const x=lane.x+side*28+(lane.warning?0:Math.sin(i*7+time*35)*12),y=i*H/20;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}ctx.font='bold 11px sans-serif';ctx.fillStyle='#eee2ff';ctx.textAlign='center';ctx.fillText(lane.warning?'LIGHTNING BUILDING':'DISCHARGE',lane.x,60);ctx.restore();}}

function crateredAsteroid(r,seed){const faces=[],segments=40,rows=26,rx=r.w*.52,ry=Math.min(r.h*.5,r.w*.73),rz=Math.min(rx,ry)*(.74+.1*Math.sin(seed)),craters=[];
 for(let i=0;i<9;i++){const a=i*2.399+seed*1.7,z=-.82+i*.205,l=Math.sqrt(1-z*z);craters.push({x:Math.cos(a)*l,y:z,z:Math.sin(a)*l,size:.17+.065*(1+Math.sin(i*7+seed)),depth:.14+.08*(1+Math.cos(i*3+seed))});}
 const rings=Array.from({length:rows+1},(_,j)=>Array.from({length:segments},(_,i)=>{const lat=j/rows*Math.PI,lon=i/segments*TAU,x=j===0||j===rows?0:Math.sin(lat)*Math.cos(lon),y=Math.cos(lat),z=j===0||j===rows?0:Math.sin(lat)*Math.sin(lon);let radius=1+.10*Math.sin(x*5.1+y*3.7+seed)*Math.cos(z*4.3-y*2.9)+.045*Math.sin(x*13+z*9+seed)*Math.cos(y*11-z*5);
 for(const c of craters){const d=Math.sqrt(Math.max(0,2-2*(x*c.x+y*c.y+z*c.z)))/c.size;if(d<1.65){radius-=c.depth*Math.exp(-d*d*2.5);radius+=.055*Math.exp(-Math.pow((d-1)/.2,2));}}
 return[x*rx*radius,y*ry*radius,z*rz*radius];}));
 for(let j=0;j<rows;j++)for(let i=0;i<segments;i++){const next=(i+1)%segments;faces.push({v:[rings[j][i],rings[j+1][i],rings[j+1][next],rings[j][next]],uv:[[i/segments*3,j/rows*2],[i/segments*3,(j+1)/rows*2],[(i+1)/segments*3,(j+1)/rows*2],[(i+1)/segments*3,j/rows*2]],c:[188,190,184],em:0,flex:0});}faces.rock=true;return faces;}

function rigidAsteroidPassage(o){const parts=[],t=time-o.at;for(let i=0;i<2;i++){const center=380+(i===0?-1:1)*(45+Math.sin(t*.65+i*.8)*20),gap=330+Math.sin(t*.9+i)*12;parts.push({x:o.x+i*250,y:center-gap/2-190,w:180,h:190,ceiling:true},{x:o.x+i*250,y:center+gap/2,w:180,h:190,ceiling:false});}return parts;}

function drawDreamAtmosphere(){if(sectors[level].gravityWell)return;const c=['#72e4dc','#e6b35f','#b9a0ec'][level%3],distance=sceneryDistance();ctx.save();for(let i=0;i<14;i++){const p=sceneryPosition((i*137)%W,70+(i*83+Math.sin(distance*.001+i)*6)%(H-140),.32+(i%3)*.045,35);orb(p.x,p.y,2+i%3,c,.10);if(i%4===0){ctx.strokeStyle=c;ctx.globalAlpha=.08;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo(p.x-12,p.y+22,p.x-36,p.y+13);ctx.stroke();}}ctx.restore();}

function bossBodyHit(b,x,y,padding=0){
 const d=bossDesign();if(!d)return Math.hypot(b.x-x,b.y-y)<b.r+padding;
 const pose=bossFlightPose(b),scale=d.scale,key=[b.age,b.propulsionTime,b.propulsion,b.flightBank,b.actionLoad,b.attackDrive,pose.yaw,pose.roll,pose.pitch,padding].join(':');
 if(b.bodyHitKey!==key){b.bodyHitKey=key;b.bodyHitVolumes=d.bodyVolumes.map(({center:c,radii:r})=>{
  const local=bossLocalPoint(b,c),center=rotateVertex(local,pose.yaw,pose.roll,pose.pitch,0,0),axes=r.map((radius,i)=>{
   const lo=c.slice(),hi=c.slice();lo[i]-=.5;hi[i]+=.5;const a=bossLocalPoint(b,lo),z=bossLocalPoint(b,hi),v=z.map((q,j)=>(q-a[j])*(radius*scale+padding));return rotateVertex(v,pose.yaw,pose.roll,pose.pitch,0,0);
  });let xx=0,yy=0,xy=0;for(const a of axes){xx+=a[0]*a[0];yy+=a[1]*a[1];xy+=a[0]*a[1];}return{x:center[0]*scale,y:center[1]*scale,xx,yy,xy,det:xx*yy-xy*xy};
 });}return b.bodyHitVolumes.some(v=>{const dx=x-b.x-v.x,dy=y-b.y-v.y;return(v.yy*dx*dx-2*v.xy*dx*dy+v.xx*dy*dy)<=v.det;});
}


function drawAnatomicalJaw(b){const k=bossIndex(),mesh=meshes[k===2?'sovereignJaw':k===3?'monarchJaw':'motherJaw'];if(!mesh)return;const p=bossFlightPose(b),a=b.breath,opening=a?Math.min(clamp(a.age/Math.max(.1,a.warning),0,1),clamp((a.warning+a.duration+.7-a.age)/.7,0,1)):b.vacuum>0?clamp(b.vacuum/.7,0,1):b.charge>0?.1+clamp(1-b.charge/1.7,0,1)*.65:.09+.045*Math.sin(b.age*1.8),angle=-opening*.38,pivot=k===2?[-32,10,0]:[-51,-7,0];for(const f of mesh)for(let i=0;i<f.v.length;i++){const [x,y,z]=f.rest[i],dx=x-pivot[0],dy=y-pivot[1];f.v[i][0]=pivot[0]+dx*Math.cos(angle)-dy*Math.sin(angle);f.v[i][1]=pivot[1]+dx*Math.sin(angle)+dy*Math.cos(angle);f.v[i][2]=z;}drawModel(mesh,b.x+(k===2?-20:0),b.y,(k===2?2.3:k===3?2.1:2.15)*p.depth,p.yaw,p.roll,p.pitch,b.age,b.hit);}

// Retained navigation artwork. Atlas sampling and spherical lighting are baked
// once per destination; travel frames only transform cached canvases.
const planetDiskPixels=new Map(),planetDiskRequests=new Set();
let navigationSurface=null;const planetAtlasPixels=new Map(),planetSurfaces=new Map(),systemSurfaces=new Map(),planetCloseups=new Map();
function loadPlanetDisk(location){
 const id=location.surfaceDisk,file=PLANET_SURFACE_DISKS[id];if(!file||planetDiskPixels.has(id)||planetDiskRequests.has(id))return;
 planetDiskRequests.add(id);const image=new Image();image.decoding='async';image.onload=()=>{
  const surface=document.createElement('canvas');surface.width=image.naturalWidth;surface.height=image.naturalHeight;const c=surface.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
  while(planetDiskPixels.size>=8)planetDiskPixels.delete(planetDiskPixels.keys().next().value);
  planetDiskPixels.set(id,{data:c.getImageData(0,0,surface.width,surface.height).data,w:surface.width,h:surface.height});planetDiskRequests.delete(id);
  for(const world of Object.values(expedition.locations).filter(p=>p.surfaceDisk===id)){planetSurfaces.delete(world.destinationId);const old=planetCloseups.get(world.destinationId);if(old)old.cancelled=true;planetCloseups.delete(world.destinationId);}systemSurfaces.clear();
  planetSurface(location);const map=document.querySelector('#expeditionMap');if(map)map.navigationPainted=false;
  if(sectors.slice(level,level+2).some(s=>expedition.locations[s.id].destinationId===location.destinationId))preparePlanetCloseup(location);
  if(typeof surfaceDirty!=='undefined')surfaceDirty=true;
 };image.onerror=()=>{planetDiskRequests.delete(id);console.warn('Planet artwork unavailable:',id);};image.src='assets/'+file;
}
const planetAtlasRequests=new Set();
function loadPlanetAtlas(id,file){
 if(planetAtlasPixels.has(id)||planetAtlasRequests.has(id))return;planetAtlasRequests.add(id);
 const image=new Image();image.decoding='async';image.onload=()=>{
  const surface=document.createElement('canvas');surface.width=image.naturalWidth;surface.height=image.naturalHeight;const c=surface.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
  planetAtlasPixels.set(id,{data:c.getImageData(0,0,surface.width,surface.height).data,w:surface.width,h:surface.height/3});
  const locations=Object.values(expedition.locations).filter((p,i,a)=>p.surfaceAtlas===id&&a.findIndex(q=>q.destinationId===p.destinationId)===i);for(const p of locations){planetSurfaces.delete(p.destinationId);const job=planetCloseups.get(p.destinationId);if(job)job.cancelled=true;planetCloseups.delete(p.destinationId);}systemSurfaces.clear();navigationSurface=null;
  const map=document.querySelector('#expeditionMap');if(map)map.navigationPainted=false;
  let i=0;const warm=()=>{if(i<locations.length){const location=locations[i++];planetSurface(location);if(sectors.slice(level,level+2).some(s=>expedition.locations[s.id].destinationId===location.destinationId))preparePlanetCloseup(location);setTimeout(warm,30);}};setTimeout(warm,0);
 };image.src='assets/'+file;
}
function requestPlanetSurface(location){if(location.destinationKind==='star')return;if(location.surfaceDisk)loadPlanetDisk(location);else loadPlanetAtlas(location.surfaceAtlas||'original',PLANET_SURFACE_ATLASES[location.surfaceAtlas||'original']);}
// Bilinear atlas sampling prevents enlarged source texels becoming square tiles.
// Both globe sizes share the same projection/lighting so the detail swap is seamless.
function paintPlanetRows(location,pixels,size,from,to,diskSource=planetDiskPixels.get(location.surfaceDisk)){
 const rotation=location.surfaceRotation||0,cosSurface=Math.cos(rotation),sinSurface=Math.sin(rotation),coverage=location.surfaceCoverage??.5;
 const climate=location.climate,atlas=planetAtlasPixels.get(location.surfaceAtlas||'original'),band=location.surfaceBand??{temperate:0,ice:1,hot:2}[climate],radius=size/2-2;
 for(let y=from;y<to;y++)for(let x=0;x<size;x++){
  const nx=(x-(size-1)/2)/radius,ny=(y-(size-1)/2)/radius,rr=nx*nx+ny*ny;if(rr>1)continue;const nz=Math.sqrt(1-rr),light=Math.max(.065,-nx*.49-ny*.42+nz*.69),rim=Math.pow(1-nz,4);let red,green,blue;
  if(diskSource){
   // Dedicated hemisphere artwork uses the entire image, rather than magnifying
   // a small longitude slice of a shared atlas. Lighting remains sphere-based.
   const fx=clamp(((nx*cosSurface-ny*sinSurface)*coverage+.5)*(diskSource.w-1),0,diskSource.w-1),fy=clamp(((nx*sinSurface+ny*cosSurface)*coverage+.5)*(diskSource.h-1),0,diskSource.h-1),ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy,x1=Math.min(ix+1,diskSource.w-1),y1=Math.min(iy+1,diskSource.h-1),data=diskSource.data,k=(y*size+x)*4;
   const a=(iy*diskSource.w+ix)*4,b=(iy*diskSource.w+x1)*4,c=(y1*diskSource.w+ix)*4,d=(y1*diskSource.w+x1)*4;
   for(let channel=0;channel<3;channel++){const value=((data[a+channel]*(1-tx)+data[b+channel]*tx)*(1-ty)+(data[c+channel]*(1-tx)+data[d+channel]*tx)*ty)*light*(location.surfaceTint?.[channel]||1)+rim*(channel===0?17:channel===1?39:58);pixels.data[k+channel]=Math.min(255,value);}
  }else if(atlas&&band!==undefined){
   const u=((Math.atan2(nx,nz)/TAU+.5+(location.surfaceLongitude||0))%1+1)%1,v=.5+Math.asin(ny)/Math.PI,fx=u*atlas.w-.5,fy=clamp(v*atlas.h-.5,0,atlas.h-1),ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy,x0=(ix+atlas.w)%atlas.w,x1=(x0+1)%atlas.w,y0=iy+band*atlas.h,y1=Math.min(iy+1,atlas.h-1)+band*atlas.h;
   const a=(y0*atlas.w+x0)*4,b=(y0*atlas.w+x1)*4,c=(y1*atlas.w+x0)*4,d=(y1*atlas.w+x1)*4,data=atlas.data,k=(y*size+x)*4;
   for(let channel=0;channel<3;channel++){const top=data[a+channel]*(1-tx)+data[b+channel]*tx,bottom=data[c+channel]*(1-tx)+data[d+channel]*tx,value=(top*(1-ty)+bottom*ty)*light*(location.surfaceTint?.[channel]||1)+rim*(channel===0?17:channel===1?39:58);pixels.data[k+channel]=Math.min(255,value);}
  }else{
   const n=.5+.5*Math.sin(ny*35+Math.sin(nx*9)*2),color=climate==='gas'?[135+n*60,104+n*48,137+n*35]:climate==='hot'?[151,78,46]:climate==='ice'?[114,173,197]:climate==='plasma'?[255,185,59]:[45,105,117];[red,green,blue]=color;const k=(y*size+x)*4;pixels.data[k]=Math.min(255,red*light+rim*17);pixels.data[k+1]=Math.min(255,green*light+rim*39);pixels.data[k+2]=Math.min(255,blue*light+rim*58);
  }
  pixels.data[(y*size+x)*4+3]=Math.min(255,(1-Math.sqrt(rr))*radius*255);
 }
}
function planetSurface(location){
 const key=location.destinationId||location.climate;if(planetSurfaces.has(key))return planetSurfaces.get(key);requestPlanetSurface(location);
 const surface=document.createElement('canvas'),size=512;surface.width=surface.height=size;const c=surface.getContext('2d'),pixels=c.createImageData(size,size);if(!pixels?.data){planetSurfaces.set(key,null);return null;}
 paintPlanetRows(location,pixels,size,0,size);c.putImageData(pixels,0,0);while(planetSurfaces.size>=8)planetSurfaces.delete(planetSurfaces.keys().next().value);planetSurfaces.set(key,surface);return surface;
}
function preparePlanetCloseup(location){
 requestPlanetSurface(location);const key=location.destinationId||location.climate,existing=planetCloseups.get(key);if(existing)return existing.surface;
 if((!planetDiskPixels.has(location.surfaceDisk)&&!planetAtlasPixels.has(location.surfaceAtlas||'original'))||typeof setTimeout!=='function')return null;
 // Keep only the current/next large globes. Bake in short idle slices, never in
 // the animation loop, and display the small cached globe until fully complete.
 while(planetCloseups.size>=2){const oldest=planetCloseups.keys().next().value;planetCloseups.get(oldest).cancelled=true;planetCloseups.delete(oldest);}
 const diskSource=planetDiskPixels.get(location.surfaceDisk),job={surface:null,cancelled:false};planetCloseups.set(key,job);
 setTimeout(()=>{
  if(job.cancelled)return;const size=Math.min(1536,diskSource?.w||1536),surface=document.createElement('canvas');surface.width=surface.height=size;const c=surface.getContext('2d');let pixels=c.createImageData(size,size),row=0;if(!pixels?.data)return;
  const step=()=>{if(job.cancelled)return;const end=Math.min(size,row+16);paintPlanetRows(location,pixels,size,row,end,diskSource);row=end;if(row<size){setTimeout(step,4);return;}c.putImageData(pixels,0,0);pixels=null;job.surface=surface;};step();
 },0);return null;
}
let orbitRingTexture=null;
function planetaryRingTexture(){
 if(orbitRingTexture)return orbitRingTexture;
 const surface=document.createElement('canvas');surface.width=1024;surface.height=360;const c=surface.getContext('2d');c.translate(512,180);c.scale(1,.31);
 // A continuous translucent dust sheet with a major division, softer narrow
 // gaps, and irregular mineral density. Baked once, never striped per frame.
 for(let i=0;i<210;i++){const u=i/209,r=344+u*158,gap=Math.abs(u-.66)<.016?.06:Math.abs(u-.33)<.007?.38:1,edge=Math.min(1,u*24,(1-u)*20),density=(.59+.12*Math.sin(i*.37)+.07*Math.sin(i*1.73))*gap*edge;
 const tone=155+Math.round(Math.sin(i*.31)*15+Math.sin(i*.73)*6),g=c.createLinearGradient(-500,-180,500,140);g.addColorStop(0,`rgba(${tone+31},${tone+24},${tone+5},${density})`);g.addColorStop(.46,`rgba(${tone+20},${tone+18},${tone+6},${density})`);g.addColorStop(1,`rgba(${Math.round(tone*.45)},${Math.round(tone*.52)},${Math.round(tone*.57)},${density*.58})`);c.strokeStyle=g;c.lineWidth=1.5;c.beginPath();c.arc(0,0,r,0,TAU);c.stroke();
 }
 // Fine unresolved clumps break up the smooth bands without making a field
 // of individually large boulders at this planetary scale.
 for(let i=0;i<1900;i++){const a=i*2.399963,r=348+((i*79)%151),u=(r-344)/158;if(Math.abs(u-.66)<.018)continue;c.fillStyle=i%3?'#e2ddbc13':'#14232a20';c.fillRect(Math.cos(a)*r,Math.sin(a)*r,1.4,1.4);}
 orbitRingTexture=surface;return surface;
}
function drawNavigationPlanet(c,x,y,r,location,closeup=false){
 if(location.destinationKind==='star'){paintStellarDisc(c,x,y,r,location.stellarBody||systemFocus(expeditionSystem(location)));return;}
 c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.translate(x,y);c.rotate(location.ringTilt??-.23);
 const ring=front=>{if(!location.rings)return;const image=planetaryRingTexture(),scale=r/256;c.drawImage(image,0,front?180:0,1024,180,-512*scale,front?0:-180*scale,1024*scale,180*scale);};
 ring(false);const texture=(closeup?preparePlanetCloseup(location):null)||planetSurface(location);if(texture)c.drawImage(texture,-r,-r,r*2,r*2);else{c.fillStyle='#426b78';c.beginPath();c.arc(0,0,r,0,TAU);c.fill();}ring(true);
 c.strokeStyle='#b2eee658';c.lineWidth=Math.max(1,r*.009);c.beginPath();c.arc(0,0,r,Math.PI*.8,Math.PI*1.65);c.stroke();c.restore();
}
// Navigation and local scenery share the same named anomaly from content data.
function navigationAnomaly(location){const system=expeditionSystem(location);return system.destinations.find(d=>d.anomaly==='black-hole')||null;}
let blackHoleNavigationSurface=null;
function blackHoleNavigationArtwork(){
 if(blackHoleNavigationSurface)return blackHoleNavigationSurface;
 const surface=document.createElement('canvas');surface.width=768;surface.height=432;const c=surface.getContext('2d'),x=384,y=216;
 const halo=c.createRadialGradient(x,y,32,x,y,200);halo.addColorStop(0,'#ffe8ae00');halo.addColorStop(.28,'#efb27b44');halo.addColorStop(.55,'#ae645722');halo.addColorStop(1,'#65366c00');c.fillStyle=halo;c.fillRect(0,0,768,432);
 // Far side of the accretion disc bends over the event horizon. Near-side
 // material crosses in front, so this reads as a lensed disc, not a glowing dot.
 const disk=front=>{for(let i=0;i<45;i++){const r=62+i*2.35;c.strokeStyle=`rgba(${front?'255,204,141':'229,155,103'},${(.12+.17*(1-i/45))*(.65+.35*Math.sin(i*2.3)**2)})`;c.lineWidth=1.4;c.beginPath();c.ellipse(x,y,r,r*(front?.20:.53),-.13,front?0:Math.PI,front?Math.PI:Math.PI*2);c.stroke();}};
 disk(false);c.fillStyle='#010208';c.beginPath();c.arc(x,y,47,0,TAU);c.fill();c.strokeStyle='#ffe6b9c0';c.lineWidth=2;c.beginPath();c.arc(x,y,49,Math.PI*.16,Math.PI*1.85);c.stroke();disk(true);
 for(let i=0;i<20;i++){c.strokeStyle=`rgba(255,222,172,${.04*(1-i/20)})`;c.lineWidth=2;c.beginPath();c.ellipse(x,y+10,66+i*4,9+i*.45,-.13,0,TAU);c.stroke();}
 blackHoleNavigationSurface=surface;return surface;
}
function paintNavigationBlackHole(c,x,y,r,label=''){
 c.save();c.drawImage(blackHoleNavigationArtwork(),x-r*3.6,y-r*2.025,r*7.2,r*4.05);
 if(label){c.textAlign='center';c.font='11px monospace';c.lineWidth=3;c.strokeStyle='#03050a';c.strokeText(label+' · GRAVITATIONAL ANOMALY',x,y+r*1.65);c.fillStyle='#e9bb8c';c.fillText(label+' · GRAVITATIONAL ANOMALY',x,y+r*1.65);}c.restore();
}
function drawNavigationSun(c,x,y,r,star={}){
 if(star.id){paintStellarDisc(c,x,y,r*(star.radius||1),star);return;}
 const color=star.color||[255,190,95],size=r*(star.radius||1),rgb=(light,alpha)=>`rgba(${color.map(v=>Math.round(v+(255-v)*light)).join(',')},${alpha})`;
 const g=c.createRadialGradient(x,y,0,x,y,size*3.8);g.addColorStop(0,rgb(.94,1));g.addColorStop(.20,rgb(.7,1));g.addColorStop(.27,rgb(.2,1));g.addColorStop(.38,rgb(0,.5));g.addColorStop(.65,rgb(0,.14));g.addColorStop(1,rgb(0,0));c.fillStyle=g;c.fillRect(x-size*3.8,y-size*3.8,size*7.6,size*7.6);
 c.fillStyle=rgb(.65,1);c.beginPath();c.arc(x,y,size,0,TAU);c.fill();
}
const stellarSurfaces=new Map();
let stellarPhotosphere=null;
function requestStellarPhotosphere(){if(stellarPhotosphere)return stellarPhotosphere;const image=new Image();image.decoding='async';image.onload=()=>stellarSurfaces.clear();image.src='assets/stellar-photosphere-v1.webp';stellarPhotosphere=image;return image;}

function stellarSurface(star){
 const key=star.id||star.name;if(stellarSurfaces.has(key))return stellarSurfaces.get(key);
 const image=requestStellarPhotosphere();if(imageReady(image)){const c=document.createElement('canvas');c.width=c.height=1024;const g=c.getContext('2d');g.imageSmoothingQuality='high';g.translate(512,512);g.rotate(star.weather==='magnetic'?.65:star.weather==='wind'?1.7:0);g.filter=star.weather==='magnetic'?'hue-rotate(168deg) saturate(.5) brightness(1.35)':star.weather==='prominences'?'hue-rotate(-12deg) saturate(.85)':'none';g.drawImage(image,-512,-512,1024,1024);while(stellarSurfaces.size>=3)stellarSurfaces.delete(stellarSurfaces.keys().next().value);stellarSurfaces.set(key,c);return c;}
 const c=document.createElement('canvas');c.width=c.height=640;const g=c.getContext('2d'),color=star.color||[255,155,55],random=n=>{const v=Math.sin(n*127.1+(star.seed||1)*31.7)*43758.5453;return v-Math.floor(v);};
 g.save();g.beginPath();g.arc(320,320,310,0,TAU);g.clip();const base=g.createRadialGradient(218,198,20,320,320,325);base.addColorStop(0,`rgb(${color.map(v=>Math.min(255,v*1.1+25)).join(',')})`);base.addColorStop(.74,`rgb(${color.join(',')})`);base.addColorStop(1,`rgb(${color.map(v=>Math.round(v*.23)).join(',')})`);g.fillStyle=base;g.fillRect(0,0,640,640);
 for(let i=0;i<9000;i++){const x=random(i)*640,y=random(i+10000)*640,r=1+random(i+20000)*3;g.globalAlpha=.035+random(i+30000)*.10;g.fillStyle=i%3?'#fff3bb':'#4d1204';g.beginPath();g.ellipse(x,y,r*1.6,r,.2,0,TAU);g.fill();}
 for(let i=0;i<13;i++){const x=120+random(i+40000)*400,y=120+random(i+50000)*400;g.globalAlpha=.14;g.strokeStyle='#441209';g.lineWidth=3;g.beginPath();g.moveTo(x-20,y);g.bezierCurveTo(x-7,y-22,x+19,y+15,x+31,y-9);g.stroke();}g.restore();
 while(stellarSurfaces.size>=3)stellarSurfaces.delete(stellarSurfaces.keys().next().value);stellarSurfaces.set(key,c);return c;
}
function paintStellarDisc(c,x,y,r,star){
 const color=star.color||[255,155,55];c.save();const glow=c.createRadialGradient(x,y,r*.9,x,y,r*1.35);glow.addColorStop(0,`rgba(${color.join(',')},.38)`);glow.addColorStop(1,`rgba(${color.join(',')},0)`);c.fillStyle=glow;c.fillRect(x-r*1.35,y-r*1.35,r*2.7,r*2.7);c.drawImage(stellarSurface(star),x-r,y-r,r*2,r*2);
 for(let i=0;i<5;i++){const a=i*1.28+(star.seed||1),rr=r*.93;for(let strand=0;strand<3;strand++){c.strokeStyle=`rgba(${color.join(',')},${strand===0?.09:.24})`;c.lineWidth=Math.max(.6,r*(strand===0?.007:.0009));c.beginPath();c.moveTo(x+Math.cos(a-.055)*rr,y+Math.sin(a-.055)*rr);c.quadraticCurveTo(x+Math.cos(a+strand*.003)*r*(1.08+strand*.009),y+Math.sin(a+strand*.003)*r*(1.08+strand*.009),x+Math.cos(a+.055)*rr,y+Math.sin(a+.055)*rr);c.stroke();}}c.restore();
}
function stellarFlare(){
 const star=sectors[level].stellar;if(!star||star.weather!=='prominences'||boss||sectorBlend||time<8)return null;
 const cycle=Math.floor(time/12),phase=time%12;if(phase>3.1)return null;return{warning:phase<1.5,phase,top:cycle%2===1,height:phase<1.5?24:112*Math.sin(Math.PI*(phase-1.5)/1.6)};
}
function drawStellarBackdrop(definition){
 const star=definition.stellar,t=sectorSceneTime(),color=star.color.join(',');ctx.fillStyle='#0a070f';ctx.fillRect(0,0,W,H);
 // The distant black hole remains behind the same star throughout the encounter.
 paintNavigationBlackHole(ctx,W*.78,H*.19,36);
 paintStellarDisc(ctx,W*.45,H*2.2,W*.85,star);
 const haze=ctx.createLinearGradient(0,H*.2,0,H);haze.addColorStop(0,`rgba(${color},0)`);haze.addColorStop(1,`rgba(${color},.20)`);ctx.fillStyle=haze;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.strokeStyle=`rgba(${color},.18)`;ctx.lineWidth=1.2;
 for(let i=0;i<30;i++){const x=((i*119-t*(star.weather==='wind'?155:45))%(W+200)+W+200)%(W+200)-100,y=60+(i*97)%H;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+35,y+Math.sin(t+i)*9,x+65,y-6);ctx.stroke();}ctx.restore();drawHeatHaze();
 const flare=stellarFlare();if(flare){
  ctx.save();const y=flare.top?0:H,sign=flare.top?1:-1,high=flare.warning?30:flare.height;
  const curtain=ctx.createLinearGradient(0,y,0,y+sign*(high+25));curtain.addColorStop(0,`rgba(${color},${flare.warning?.25:.85})`);curtain.addColorStop(.55,`rgba(${color},${flare.warning?.10:.35})`);curtain.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=curtain;ctx.fillRect(0,flare.top?0:H-high-25,W,high+25);
  if(!flare.warning){ctx.globalCompositeOperation='screen';for(let i=0;i<56;i++){const x=i*27+Math.sin(i*2.3+t)*9,tip=high*(.7+.3*Math.sin(i*1.7+t*7)),bend=20*Math.sin(i+t*3);ctx.strokeStyle=`rgba(${color},${.12+.2*(.5+.5*Math.sin(i*3))})`;ctx.lineWidth=2+i%3;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x-bend,y+sign*tip*.35,x+bend,y+sign*tip*.75,x+12,y+sign*tip);ctx.stroke();}}
  ctx.globalCompositeOperation='source-over';ctx.fillStyle='#fbdcc0';ctx.font='12px monospace';ctx.textAlign='center';ctx.fillText(flare.warning?'CORONA BRIGHTENING · MOVE AWAY FROM THE '+(flare.top?'TOP':'BOTTOM')+' EDGE':'PROMINENCE SURGE',W/2,flare.top?35:H-25);ctx.restore();
 }
}
function systemOrbitLayout(system,seconds=0){
 return system.destinations.filter(d=>d.kind==='planet'||d.stellarBody).sort((a,b)=>a.orbit-b.orbit).map((d,i,a)=>{const radius=155+i*170/Math.max(1,a.length-1),phase=(d.orbitPhase??(-.7+i*2.35))+seconds*.14/Math.pow(Math.max(.4,d.orbit),.42);return {destination:d,radius,x:400+Math.cos(phase)*radius,y:272+Math.sin(phase)*radius*.59};});
}
function systemArtwork(system,selectedId){
 const key=system.id+':'+selectedId;if(systemSurfaces.has(key))return systemSurfaces.get(key);
 const surface=document.createElement('canvas');surface.width=800;surface.height=550;paintSystemChart(surface.getContext('2d'),system,selectedId,0);while(systemSurfaces.size>=4)systemSurfaces.delete(systemSurfaces.keys().next().value);systemSurfaces.set(key,surface);return surface;
}
function paintSystemChart(c,system,selectedId,seconds,selection=null,showAnomaly=true){
 const emphasis=id=>selection?(id===selectedId?selection.mix:id===selection.from?1-selection.mix:0):id===selectedId?1:0;
 const haze=c.createRadialGradient(400,270,0,400,270,360);haze.addColorStop(0,'#5b402336');haze.addColorStop(1,'#05132500');c.fillStyle=haze;c.fillRect(0,0,800,550);

 const layout=systemOrbitLayout(system,seconds);
 const anomaly=system.destinations.find(d=>d.anomaly==='black-hole');if(anomaly&&showAnomaly&&!system.centralBody)paintNavigationBlackHole(c,690,155,22,anomaly.name);
 for(const item of layout){const weight=emphasis(item.destination.id);c.strokeStyle=`rgba(180,211,218,${.43+weight*.25})`;c.lineWidth=1+weight*.5;c.beginPath();c.ellipse(400,272,item.radius,item.radius*.59,0,0,TAU);c.stroke();}
 if(system.centralBody)paintNavigationBlackHole(c,400,272,32);else drawNavigationSun(c,400,272,23,systemFocus(system));c.textAlign='center';c.fillStyle='#ffe4a7';c.font='bold 15px monospace';c.lineWidth=4;c.strokeStyle='#020914';c.strokeText(systemFocus(system).name,400,328);c.fillText(systemFocus(system).name,400,328);c.font='10px monospace';c.fillStyle='#b89b75';c.fillText(systemFocus(system).type||'SYSTEM STAR',400,346);
 for(const item of layout){const d=item.destination,location=expedition.locations[d.stages[0]]||{...d,destinationId:d.id};if(d.stellarBody)drawNavigationSun(c,item.x,item.y,22+8*emphasis(d.id),d.stellarBody);else drawNavigationPlanet(c,item.x,item.y,29+11*emphasis(d.id),location);c.font='bold 16px monospace';c.fillStyle=emphasis(d.id)>.5?'#deffef':d.climate==='hot'?'#edb085':d.climate==='ice'||d.climate==='gas'?'#bad9ee':'#b8dcbb';const labelY=item.y<155?item.y+62:item.y<272?item.y-57:item.y+52;c.lineWidth=4;c.strokeStyle='#020914d9';c.strokeText(d.name,item.x,labelY);c.fillText(d.name,item.x,labelY);c.font='12px monospace';c.fillStyle='#c0d1dc';c.strokeText(d.stellarBody?d.stellarBody.type:d.orbit+' AU · '+d.climate.toUpperCase(),item.x,labelY+17);c.fillText(d.stellarBody?d.stellarBody.type:d.orbit+' AU · '+d.climate.toUpperCase(),item.x,labelY+17);}
 c.fillStyle='#ddf5ee';c.font='bold 23px monospace';c.fillText(system.name+' SYSTEM',400,48);c.font='11px monospace';c.fillStyle='#8caebc';c.fillText((GALAXIES[system.galaxyId||GALAXY.id].name)+' / '+systemCensusLabel(system),400,73);c.fillStyle='#acb9be';c.fillText(system.centralBody?'UMBILICUS · THREE STELLAR CORONAS · NO PLANETS':'HOT INNER WORLDS  →  TEMPERATE  →  COLD OUTER WORLDS',400,layout.length>4?94:505);c.fillStyle='#7d929f';c.font='10px monospace';c.fillText('ORBITAL DISTANCES NOT TO SCALE',400,layout.length>4?112:526);
}
function navigationOrbitTime(){return sectorBlend?.age||0;}
function drawMovingSystemChart(system,selectedId,showAnomaly=true){
 let selection=null;if(sectorBlend?.origin&&selectedId===sectorBlend.destination?.destinationId){const u=sectorBlend.age/sectorBlend.duration,same=sectorBlend.origin.systemId===system.id;selection={from:same?sectorBlend.origin.destinationId:null,mix:navigationEase(same?(u-.34)/.16:(u-.62)/.10)};}
 ctx.save();ctx.translate(W/2-440,H*.52-272*1.1);ctx.scale(1.1,1.1);paintSystemChart(ctx,system,selectedId,navigationOrbitTime(),selection,showAnomaly);ctx.restore();
}
function navigationArtwork(){return systemArtwork(contentReleases[0].systems[0],contentReleases[0].systems[0].destinations[0].id);}
let navigationClock=0;
function navigationSeconds(){return navigationClock;}
function galaxyRotation(galaxy,seconds=navigationSeconds()){return (galaxy.seed||1)*.013+seconds*.022;}
function galaxySystemOffset(system,width,seconds=navigationSeconds()){
 const position=system.galacticPosition||[.70,.40],angle=galaxyRotation(GALAXIES[system.galaxyId],seconds),x=(position[0]-.5)*width,y=(position[1]-.5)*width;
 return {x:x*Math.cos(angle)-y*Math.sin(angle),y:(x*Math.sin(angle)+y*Math.cos(angle))*.625};
}
function paintRotatingGalaxy(c,galaxy,x,y,width,alpha=1,seconds=navigationSeconds()){
 c.save();c.globalAlpha*=alpha;c.globalCompositeOperation='screen';c.translate(x,y);c.scale(1,.625);c.rotate(galaxyRotation(galaxy,seconds));c.drawImage(galaxyArtwork(galaxy),-width/2,-width/2,width,width);c.restore();if(galaxy.centralBlackHole){c.save();c.globalAlpha*=alpha;paintNavigationBlackHole(c,x,y,width*.025);c.restore();}
}
function drawNavigationChart(){
 const map=document.querySelector('#expeditionMap');if(!map)return;
 const now=navigationSeconds();if(map.navigationPainted&&now-(map.navigationTime||0)<1/30)return;map.navigationPainted=true;map.navigationTime=now;
 const c=map.getContext('2d'),system=contentReleases[0].systems[0],galaxy=GALAXIES[system.galaxyId],width=800*.94,cx=400,cy=550*.49;
 c.setTransform(map.width/800,0,0,map.height/550,0,0);c.clearRect(0,0,800,550);paintRotatingGalaxy(c,galaxy,cx,cy,width,1,now);
 const point=galaxySystemOffset(system,width,now),x=cx+point.x,y=cy+point.y;c.strokeStyle='#a5f9dcb0';c.lineWidth=1;c.beginPath();c.arc(x,y,8+Math.sin(now*1.4)*1.5,0,TAU);c.stroke();c.fillStyle='#caffeb';c.beginPath();c.arc(x,y,2.5,0,TAU);c.fill();c.beginPath();c.moveTo(x+12,y);c.lineTo(x+35,y-22);c.lineTo(x+130,y-22);c.stroke();
 c.font='bold 14px monospace';c.fillText(system.name+' SYSTEM',x+38,y-29);c.textAlign='center';c.fillStyle='#e1f3ed';c.font='bold 22px monospace';c.fillText(galaxy.name,cx,46);c.font='12px monospace';c.fillStyle='#99babb';c.fillText('YOUR JOURNEY BEGINS IN THE OUTER ARM',cx,550-45);c.fillText(systemFocus(system).name+' · '+systemCensusLabel(system),cx,550-23);
}

let navigationStars=null;
function navigationStarCamera(){
 if(!sectorBlend?.destination)return{x:0,y:0,zoom:1};const u=sectorBlend.age/sectorBlend.duration,origin=sectorBlend.origin,destination=sectorBlend.destination;
 // Galaxy magnification is the reference scale. Depth attenuates each star's
 // parallax; its apparent point size is independent of the camera magnification.
 if(!origin){const p=navigationEase((u-.14)/.34),system=expeditionSystem(destination),offset=galaxySystemOffset(system,1000);return{x:offset.x*p*.65,y:offset.y*p*.65,zoom:Math.exp(p*Math.log(14))};}
 if(origin.galaxyId!==destination.galaxyId){const p=navigationEase((u-.18)/.57),outbound=1-navigationEase((u-.18)/.14),inbound=navigationEase((u-.58)/.17),heading=galaxyFlightHeading(destination);return{x:heading.x*W*.95*p,y:heading.y*H*p,zoom:Math.exp((outbound+inbound)*Math.log(14))};}
 const p=navigationEase(u);return{x:W*.15*p,y:H*.025*p,zoom:14};
}
function navigationStarLayers(){
 if(navigationStars)return navigationStars;
 const random=n=>{const q=Math.sin(n*127.1+19.3)*43758.5453;return q-Math.floor(q);};
 navigationStars=[.08,.28,.62].map((depth,layer)=>{
  const groups=Array.from({length:6},(_,i)=>({color:`rgba(${i%2?'240,221,196':'194,215,238'},${.22+Math.floor(i/2)*.18})`,points:[]}));
  for(let i=0;i<[310,150,72][layer];i++){const seed=i+layer*1000;groups[i%6].points.push({x:random(seed+1)*W,y:random(seed+900)*H,r:.3+random(seed+1700)*(.35+layer*.12)});}
  return{depth,groups};
 });return navigationStars;
}
function navigationStarProjection(star,depth,camera){
 const scale=1/(1-depth*(1-1/camera.zoom)),width=W*scale,height=H*scale,margin=6;
 // Wrapping happens outside the viewport, never across its visible interior.
 return{x:((star.x*scale-camera.x*depth*scale-(width-W)/2+margin)%width+width)%width-margin,y:((star.y*scale-camera.y*depth*scale-(height-H)/2+margin)%height+height)%height-margin,r:Math.min(1.35,star.r*(1+Math.log(scale)*.10))};
}
function drawNavigationStars(){
 const camera=navigationStarCamera();
 // Retained points and 18 batched paths: no enlarged bitmap, per-frame textures,
 // animated opacity, or star streaks. Far points stay small throughout the dive.
 for(const layer of navigationStarLayers())for(const group of layer.groups){
  ctx.fillStyle=group.color;ctx.beginPath();
  for(const star of group.points){const p=navigationStarProjection(star,layer.depth,camera);if(p.x>W+3||p.y>H+3)continue;ctx.moveTo(p.x+p.r,p.y);ctx.arc(p.x,p.y,p.r,0,TAU);}
  ctx.fill();
 }
 drawNavigationGalacticField();
}
const resolvedGalaxyStars=new Map();
function drawResolvedGalaxyStars(location,pose,alpha=1){
 const system=expeditionSystem(location),galaxy=expeditionGalaxy(location);let stars=resolvedGalaxyStars.get(system.id);
 if(!stars){const random=n=>{const v=Math.sin(n*127.1+galaxy.seed*31.7)*43758.5453;return v-Math.floor(v);},target=system.galacticPosition||[.7,.4];stars=[];
  for(let i=0;i<700;i++){const local=i>=350,r=Math.sqrt(random(i+2))*(local?.11:.45),angle=local?random(i+900)*TAU:i%(galaxy.arms||3)*TAU/(galaxy.arms||3)+r*16+(random(i+1800)-.5)*.5;stars.push({x:Math.cos(angle)*r+(local?target[0]-.5:0),y:Math.sin(angle)*r+(local?target[1]-.5:0),z:(random(i+2600)-.5)*.2,r:.32+random(i+3300)*.48});}
  while(resolvedGalaxyStars.size>=3)resolvedGalaxyStars.delete(resolvedGalaxyStars.keys().next().value);resolvedGalaxyStars.set(system.id,stars);
 }
 const angle=galaxyRotation(galaxy),co=Math.cos(angle),si=Math.sin(angle),magnification=pose.width/1000;
 ctx.save();ctx.globalAlpha*=alpha*.55;ctx.fillStyle='#b8cddd';ctx.beginPath();
 for(const star of stars){const depth=1/(1-star.z*(1-1/Math.max(1,magnification))),x=pose.gx+(star.x*co-star.y*si)*pose.width*depth,y=pose.gy+(star.x*si+star.y*co)*pose.width*.625*depth,r=Math.min(1.15,star.r*(1+Math.log(Math.max(1,magnification))*.12));if(x<-3||x>W+3||y<-3||y>H+3)continue;ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,TAU);}
 ctx.fill();ctx.restore();
}
function drawNavigationGalacticField(){
 if(!sectorBlend?.destination)return;const {origin,destination}=sectorBlend,u=sectorBlend.age/sectorBlend.duration;
 if(!origin){const p=galaxyApproachPose(expeditionSystem(destination),Math.max(0,(u-.14)/.34)),settle=navigationEase(u/.14);ctx.save();ctx.translate(W*.215*(1-settle),-H*.12*(1-settle));ctx.translate(W*.5,H*.52);ctx.scale(.77+.23*settle,.77+.23*settle);ctx.translate(-W*.5,-H*.52);drawResolvedGalaxyStars(destination,p);ctx.restore();return;}
 if(origin.galaxyId===destination.galaxyId){drawResolvedGalaxyStars(destination,galaxyApproachPose(expeditionSystem(destination),1));return;}
 if(u<.32){drawResolvedGalaxyStars(origin,galaxyApproachPose(expeditionSystem(origin),u<.18?1:1-(u-.18)/.14));return;}
 if(u<.58){const p=(u-.32)/.26,exit=navigationEase(p/.32),entry=navigationEase((p-.43)/.57),h=galaxyFlightHeading(destination);drawResolvedGalaxyStars(origin,{gx:W*.5-h.x*W*.3*exit,gy:H*.52-h.y*H*.3*exit,width:1000*Math.exp(-exit*2.6)},1-exit);drawResolvedGalaxyStars(destination,{gx:W*.5+h.x*W*.34*(1-entry),gy:H*.52+h.y*H*.34*(1-entry),width:24*Math.exp(entry*Math.log(1000/24))},entry);return;}
 drawResolvedGalaxyStars(destination,galaxyApproachPose(expeditionSystem(destination),Math.min(1,(u-.58)/.17)));
}
// One reversible camera: chart position → complete globe → curved horizon →
// local scenery. Departure uses the same path backwards, with the real outgoing
// scenery retained until the horizon is visible. No mid-flight planet swap.
function navigationEase(value){const t=clamp(value,0,1);return t*t*t*(t*(t*6-15)+10);}
function planetCameraPose(location,progress){
 const t=clamp(progress,0,1),ease=navigationEase(t),system=expeditionSystem(location),layout=systemOrbitLayout(system,navigationOrbitTime()),target=layout.find(p=>p.destination.id===location.destinationId)||{x:400,y:272};
 const r=44*Math.exp(ease*Math.log(W*1.45/44)),center=ease*ease;
 return {r,x:W*.5+(target.x-400)*1.1*(1-ease),y:H*.52+(target.y-272)*1.1*(1-ease)+r*.64*center,surface:clamp((t-.79)/.21,0,1)};
}
// Derive scene reveal from the same travel phase as the planet camera.
// Never expose a bright destination behind the galaxy before its arrival fade.
function navigationSurfaceReveal(blend){
 const u=clamp(blend.age/blend.duration,0,1);let approach;
 if(!blend.origin)approach=(u-.48)/.52;
 else if(blend.origin.galaxyId!==blend.destination.galaxyId)approach=(u-.75)/.25;
 else approach=.2+(u-.53)/.47*.8;
 return clamp(((approach-.2)/.8-.79)/.21,0,1);
}
function drawPlanetCamera(location,progress,scene=null){
 const p=planetCameraPose(location,progress),surface=p.surface*p.surface*(3-2*p.surface);
 ctx.save();ctx.globalAlpha*=1-surface;ctx.fillStyle='#020914';ctx.fillRect(0,0,W,H);
 drawNavigationStars();
 if(location.centralBlackHole){const t=navigationEase(progress);paintNavigationBlackHole(ctx,W*.5+(W*.78-W*.5)*t,H*.52+(H*.19-H*.52)*t,32+4*t);}
 const anomaly=navigationAnomaly(location);if(anomaly){const t=navigationEase(progress),near=location.anomaly==='black-hole';paintNavigationBlackHole(ctx,W*.5+319*(1-t)+(W*.712-W*.5)*t,H*.52-129*(1-t)+(H*.33-H*.52)*t,24+(near?W*.082-24:4)*t);}
 // Only the selected world is magnified. Its complete disc stays visible long
 // enough to recognize before the camera crosses the atmospheric limb.
 drawNavigationPlanet(ctx,p.x,p.y,p.r,location,true);
 if(progress>.5&&location.destinationKind!=='star'){const haze=ctx.createLinearGradient(0,0,0,H),color=location.climate==='hot'?'220,137,87':'151,211,232';haze.addColorStop(0,`rgba(${color},0)`);haze.addColorStop(.55,`rgba(${color},${.09*Math.sin(progress*Math.PI)})`);haze.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=haze;ctx.fillRect(0,0,W,H);}
 ctx.restore();
 if(scene&&surface>0){ctx.save();ctx.globalAlpha*=surface;const zoom=1+(1-surface)*.12;ctx.drawImage(scene,-W*(zoom-1)/2,-H*(zoom-1)/2,W*zoom,H*zoom);ctx.restore();}
}
function drawPlanetApproach(location,u){
 const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);},system=expeditionSystem(location),dive=clamp((u-.2)/.8,0,1);
 if(u<.2){ctx.save();ctx.fillStyle='#020914';ctx.fillRect(0,0,W,H);drawNavigationStars();drawMovingSystemChart(system,location.destinationId);ctx.restore();}
 else{drawPlanetCamera(location,dive);if(dive<.09){ctx.save();ctx.globalAlpha=1-smooth(dive/.09);drawMovingSystemChart(system,location.destinationId);ctx.restore();}}
 ctx.save();ctx.globalAlpha*=1-smooth((u-.87)/.10);ctx.fillStyle='#dcfff1';ctx.font='bold 27px monospace';ctx.fillText(u<.2?'ENTERING '+system.name+' SYSTEM':dive>.79?'ENTERING '+location.destinationName+(location.destinationKind==='star'?' CORONA':' ATMOSPHERE'):'DESCENDING TO '+location.destinationName,64,74);ctx.font='13px monospace';ctx.fillStyle='#9abcc6';ctx.fillText(u<.2?systemFocus(system).name+' · '+systemCensusLabel(system):(location.destinationKind==='star'?'STELLAR ORBIT → OUTER CORONA':'ORBIT → ATMOSPHERE → '+(sectors[level].stratum||'SURFACE')),65,102);ctx.restore();
}
function drawPlanetDeparture(location,u){
 const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
 // The last quarter holds a complete distant planet, then blends into its
 // exact location on the orbit map, instead of dissolving a cropped limb.
 const close=1-Math.min(1,u/.84);drawPlanetCamera(location,close,sectorBlend?.outgoing);
 if(u>.84){ctx.save();ctx.globalAlpha=smooth((u-.84)/.16);drawMovingSystemChart(expeditionSystem(location),location.destinationId);ctx.restore();}
 ctx.save();ctx.globalAlpha=smooth(u/.09);ctx.fillStyle='#e1fff0';ctx.font='bold 29px monospace';ctx.fillText((sectorBlend?.testing?'LEAVING ':'DEPARTING ')+location.destinationName,64,74);ctx.fillStyle='#afcbd1';ctx.font='14px monospace';ctx.fillText(location.destinationKind==='star'?'CORONA → STELLAR ORBIT':'SURFACE → ATMOSPHERE → ORBIT',65,106);ctx.restore();
}
function drawTransitRoute(location,origin,u){
 const system=expeditionSystem(location),layout=systemOrbitLayout(system,navigationOrbitTime()),from=layout.find(p=>p.destination.id===origin.destinationId),to=layout.find(p=>p.destination.id===location.destinationId);if(!to)return;
 const a=from||{x:90,y:440},b=to,mx=(a.x+b.x)/2,my=(a.y+b.y)/2,len=Math.hypot(mx-400,my-272)||1,cx=mx+(mx-400)/len*150,cy=my+(my-272)/len*150,progress=clamp((u-.24)/.30,0,1),smooth=progress*progress*(3-2*progress);
 const point=t=>({x:(1-t)**2*a.x+2*(1-t)*t*cx+t*t*b.x,y:(1-t)**2*a.y+2*(1-t)*t*cy+t*t*b.y});
 ctx.save();ctx.translate(W/2-440,H*.52-272*1.1);ctx.scale(1.1,1.1);ctx.setLineDash([4,8]);ctx.lineWidth=2;ctx.strokeStyle='#93b6b777';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(cx,cy,b.x,b.y);ctx.stroke();ctx.setLineDash([]);
 ctx.strokeStyle='#acffe0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a.x,a.y);for(let i=1;i<=40;i++){const p=point(smooth*i/40);ctx.lineTo(p.x,p.y);}ctx.stroke();const p=point(smooth);ctx.fillStyle='#dbfff1';ctx.beginPath();ctx.arc(p.x,p.y,4,0,TAU);ctx.fill();ctx.restore();
}
// Galaxies are release data, separate from stars and their planetary systems.
// Only three retained paintings are kept even as the campaign catalog grows.
const galaxySurfaces=new Map(),galaxyImages=new Map();
function galaxyImageFile(galaxy){return (galaxy.arms||3)<=2?'galaxy-barred-v1.webp':'galaxy-spiral-v1.webp';}
function requestGalaxyImage(galaxy){return requestSpaceImage(galaxyImageFile(galaxy));}
function requestSpaceImage(file){
 if(galaxyImages.has(file))return galaxyImages.get(file);
 const image=new Image();image.decoding='async';galaxyImages.set(file,image);image.onload=()=>{
  // Prepare transparency once per source, outside the animation loop. All
  // galaxy palettes and travel scenes share these retained photographic cutouts.
  const surface=document.createElement('canvas');surface.width=1280;surface.height=800;const c=surface.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0,1280,800);const pixels=c.getImageData(0,0,1280,800),data=pixels.data;
  for(let y=0;y<800;y++)for(let x=0;x<1280;x++){const k=(y*1280+x)*4,light=Math.max(data[k],data[k+1],data[k+2]),edge=Math.min(x/90,(1279-x)/90,y/70,(799-y)/70,1);data[k+3]=Math.round(255*clamp((light-3)/48,0,1)*navigationEase(edge));}
  c.putImageData(pixels,0,0);image.galaxyCutout=surface;galaxySurfaces.clear();const map=document.querySelector('#expeditionMap');if(map)map.navigationPainted=false;
 };image.onerror=()=>console.warn('Galaxy artwork unavailable:',file);image.src='assets/'+file;return image;
}
function galaxyArtwork(galaxy){
 if(galaxySurfaces.has(galaxy.id))return galaxySurfaces.get(galaxy.id);
 const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=800;const c=canvas.getContext('2d'),tint=galaxy.tint||[150,190,230],seed=galaxy.seed||1,image=requestGalaxyImage(galaxy);
 if(image.galaxyCutout){c.drawImage(image.galaxyCutout,0,0);c.globalCompositeOperation='source-atop';c.fillStyle=`rgba(${tint.join(',')},.10)`;c.fillRect(0,0,1280,800);c.globalCompositeOperation='source-over';while(galaxySurfaces.size>=3)galaxySurfaces.delete(galaxySurfaces.keys().next().value);galaxySurfaces.set(galaxy.id,canvas);return canvas;}
 c.scale(1.25,1.25);
 const mist=document.createElement('canvas');mist.width=mist.height=64;const m=mist.getContext('2d'),g=m.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,`rgba(${tint.join(',')},.38)`);g.addColorStop(.35,`rgba(${tint.join(',')},.14)`);g.addColorStop(1,`rgba(${tint.join(',')},0)`);m.fillStyle=g;m.fillRect(0,0,64,64);
 const random=n=>{const v=Math.sin(n*127.1+seed*31.7)*43758.5453;return v-Math.floor(v);};
 c.save();c.translate(512,320);c.rotate(-.2);c.scale(1,.58);
 const halo=c.createRadialGradient(0,0,0,0,0,460);halo.addColorStop(0,'#f8dfb45e');halo.addColorStop(.17,`rgba(${tint.join(',')},.18)`);halo.addColorStop(1,'#090d2000');c.fillStyle=halo;c.fillRect(-500,-500,1000,1000);
 for(let i=0;i<2400;i++){const r=Math.sqrt(random(i+2))*440,a=(i%(galaxy.arms||3))*TAU/(galaxy.arms||3)+r/440*(galaxy.twist||3)*.42*Math.PI+(random(i+7)-.5)*(.65+r/350)+Math.sin(r*.034+seed)*.09,x=Math.cos(a)*r,y=Math.sin(a)*r,w=10+random(i+14)*40;c.globalAlpha=(1-r/490)*.7;c.drawImage(mist,x-w/2,y-w/2,w,w);}
 for(let i=0;i<3200;i++){const r=Math.pow(random(i+40),.72)*450,a=(i%(galaxy.arms||3))*TAU/(galaxy.arms||3)+r/440*(galaxy.twist||3)*.42*Math.PI+(random(i+11)-.5)*1.05;c.globalAlpha=.2+random(i+19)*.65;c.fillStyle=i%5?'#d2dfee':'#fff2cc';const size=i%17?1:2.2;c.fillRect(Math.cos(a)*r,Math.sin(a)*r,size,size);}
 c.globalAlpha=1;const core=c.createRadialGradient(0,0,0,0,0,90);core.addColorStop(0,'#fff6dfe6');core.addColorStop(.18,'#ffeac588');core.addColorStop(1,'#eaca9c00');c.fillStyle=core;c.fillRect(-90,-90,180,180);c.restore();
 while(galaxySurfaces.size>=3)galaxySurfaces.delete(galaxySurfaces.keys().next().value);galaxySurfaces.set(galaxy.id,canvas);return canvas;
}
function galaxyApproachPose(system,progress){
 const t=navigationEase(progress),width=1000*Math.exp(t*Math.log(14)),offset=galaxySystemOffset(system,width);
 return {t,width,gx:W*.5-offset.x*t,gy:H*.52-offset.y*t,sx:W*.5+offset.x*(1-t),sy:H*.52+offset.y*(1-t),scale:Math.exp(Math.log(.09)*(1-navigationEase((t-.68)/.32)))};
}
function drawGalaxySystemApproach(location,progress){
 const system=expeditionSystem(location),galaxy=expeditionGalaxy(location),p=galaxyApproachPose(system,progress);
 paintRotatingGalaxy(ctx,galaxy,p.gx,p.gy,p.width,1-navigationEase((p.t-.48)/.38));
 drawUniversalLandmarks(location,p);
 const reveal=navigationEase((p.t-.67)/.33);ctx.save();ctx.globalAlpha=reveal;ctx.translate(p.sx,p.sy);ctx.scale(p.scale,p.scale);ctx.translate(-W*.5,-H*.52);drawMovingSystemChart(system,location.destinationId,false);ctx.restore();
 const anomaly=navigationAnomaly(location);if(anomaly&&!system.centralBody){const q=galacticLandmarkPose(location,p,[.022,-.013],.006),mix=reveal,x=q.x*(1-mix)+(p.sx+319*p.scale)*mix,y=q.y*(1-mix)+(p.sy-128.7*p.scale)*mix,r=Math.max(1.4,q.width)*(1-mix)+24.2*p.scale*mix;paintNavigationBlackHole(ctx,x,y,r,p.t>.5?anomaly.name:'');}
 if(p.t<.88){ctx.save();ctx.globalAlpha=1-navigationEase((p.t-.7)/.18);if(system.centralBody)paintNavigationBlackHole(ctx,p.sx,p.sy,5+p.t*8);else drawNavigationSun(ctx,p.sx,p.sy,1.8+p.t*2,systemFocus(system));if(p.t<.65){ctx.strokeStyle='#a5f9dc';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.sx,p.sy,7,0,TAU);ctx.stroke();ctx.fillStyle='#d6f7ec';ctx.font='13px monospace';ctx.fillText(system.name+' SYSTEM',p.sx+16,p.sy-11);}ctx.restore();}
}
function drawInitialGalaxyEntry(location,u){
 if(u>=.48){drawPlanetApproach(location,(u-.48)/.52);return;}
 ctx.save();ctx.fillStyle='#020610';ctx.fillRect(0,0,W,H);drawNavigationStars();const settle=navigationEase(u/.14);ctx.save();ctx.translate(W*.215*(1-settle),-H*.12*(1-settle));ctx.translate(W*.5,H*.52);const framing=.77+.23*settle;ctx.scale(framing,framing);ctx.translate(-W*.5,-H*.52);drawGalaxySystemApproach(location,Math.max(0,(u-.14)/.34));ctx.restore();
 ctx.fillStyle='#e1fff2';ctx.font='bold 27px monospace';ctx.fillText('ENTERING '+expeditionGalaxy(location).name,64,74);ctx.fillStyle='#afc2d5';ctx.font='14px monospace';ctx.fillText((location.centralBlackHole?'GALACTIC CORE → ':'OUTER ARM → ')+location.systemName+' SYSTEM → '+location.destinationName,65,105);ctx.restore();
}
function galaxyFlightHeading(destination){
 const galaxy=expeditionGalaxy(destination),headings=[{x:.65,y:-.76,label:'CLIMB · STARBOARD'},{x:-.72,y:.69,label:'DIVE · PORT'},{x:-.6,y:-.8,label:'CLIMB · PORT'},{x:.7,y:.71,label:'DIVE · STARBOARD'}];let route=0;for(const letter of galaxy.id)route=(Math.imul(route,31)+letter.charCodeAt(0))>>>0;return headings[route%headings.length];
}
let stellarClusterSurface=null;
function stellarClusterArtwork(){
 if(stellarClusterSurface)return stellarClusterSurface;const image=document.createElement('canvas');image.width=image.height=512;const c=image.getContext('2d'),random=n=>{const v=Math.sin(n*127.1+39.7)*43758.5453;return v-Math.floor(v);};
 const glow=c.createRadialGradient(256,256,0,256,256,210);glow.addColorStop(0,'#b0cbe743');glow.addColorStop(.35,'#547bae17');glow.addColorStop(1,'#182c5400');c.fillStyle=glow;c.fillRect(0,0,512,512);
 for(let i=0;i<1300;i++){const a=random(i+1)*TAU,r=Math.pow(random(i+1400),2.1)*220,x=256+Math.cos(a)*r,y=256+Math.sin(a)*r;c.fillStyle=i%6?'#c8dcf7':'#edc995';c.globalAlpha=.14+random(i+2800)*.7;c.beginPath();c.arc(x,y,.25+random(i+4000)*.6,0,TAU);c.fill();}stellarClusterSurface=image;return image;
}
function galacticLandmarkPose(location,camera,offset,size){
 const system=expeditionSystem(location),position=system.galacticPosition||[.7,.4],angle=galaxyRotation(expeditionGalaxy(location)),x=(position[0]-.5+offset[0])*camera.width,y=(position[1]-.5+offset[1])*camera.width;
 return{x:camera.gx+x*Math.cos(angle)-y*Math.sin(angle),y:camera.gy+(x*Math.sin(angle)+y*Math.cos(angle))*.625,width:camera.width*size};
}
function drawUniversalLandmarks(location,camera){
 const galaxy=expeditionGalaxy(location),remnant=requestSpaceImage('cosmic-remnant-v1.webp').galaxyCutout;
 // Objects occupy fixed positions near the destination's spiral arm. The same
 // galaxy camera enlarges and moves them past the window, without a screen-space
 // overlay or a dissolve behind the planetary orbit map.
 ctx.save();ctx.globalCompositeOperation='screen';
 if(remnant&&galaxy.seed%3!==0){const p=galacticLandmarkPose(location,camera,[.12,-.06],.065);ctx.globalAlpha=.76;ctx.save();ctx.translate(p.x,p.y);ctx.rotate((galaxy.seed%7-3)*.13);ctx.drawImage(remnant,-p.width/2,-p.width*.3125,p.width,p.width*.625);ctx.restore();}
 const cluster=galacticLandmarkPose(location,camera,[-.13,.065],.037);ctx.globalAlpha=.62;ctx.drawImage(stellarClusterArtwork(),cluster.x-cluster.width/2,cluster.y-cluster.width/2,cluster.width,cluster.width);
 if(galaxy.seed%4<2){const p=galacticLandmarkPose(location,camera,[.11,.10],.009),radius=p.width*(1+.06*Math.sin(navigationSeconds()*.9)),g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);g.addColorStop(0,'#f6f5e4');g.addColorStop(.035,'#d6eaffd9');g.addColorStop(.16,'#a9caff38');g.addColorStop(1,'#6b9dd000');ctx.globalAlpha=.7;ctx.fillStyle=g;ctx.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);}
 ctx.restore();
}

function galaxyTransitPhase(u){return u<.18?'planet':u<.32?'departure':u<.58?'crossing':u<.75?'arrival':'descent';}
function drawGalaxyTransit(origin,destination,u){
 const smooth=navigationEase,from=expeditionGalaxy(origin),to=expeditionGalaxy(destination),system=expeditionSystem(destination),phase=galaxyTransitPhase(u);
 if(phase==='planet'){drawPlanetDeparture(origin,u/.18);return;}
 if(phase==='descent'){drawPlanetApproach(destination,(u-.75)/.25);return;}
 const cx=W*.5,cy=H*.52,galaxy=(g,width,alpha,x=cx,y=cy)=>{if(alpha>0)paintRotatingGalaxy(ctx,g,x,y,width,alpha);};
 ctx.save();ctx.fillStyle='#020610';ctx.fillRect(0,0,W,H);drawNavigationStars();
 if(phase==='departure'){
  drawGalaxySystemApproach(origin,1-(u-.18)/.14);
 }else if(phase==='crossing'){
  const p=(u-.32)/.26,t=smooth(p),exit=smooth(p/.32),entry=smooth((p-.43)/.57),heading=galaxyFlightHeading(destination);
  // One continuous camera drives the entire star field. No stationary
  // secondary star layer fades over it during the intergalactic crossing.
  galaxy(from,1000*Math.exp(-exit*2.6),1-exit,cx-heading.x*W*.3*exit,cy-heading.y*H*.3*exit);
  const size=24*Math.exp(entry*Math.log(1000/24));galaxy(to,size,entry,cx+heading.x*W*.34*(1-entry),cy+heading.y*H*.34*(1-entry));

 }else{
  drawGalaxySystemApproach(destination,(u-.58)/.17);
 }
 ctx.fillStyle='#e1fff2';ctx.font='bold 27px monospace';ctx.fillText(phase==='departure'?'LEAVING '+from.name:phase==='crossing'?'INTERGALACTIC FLIGHT':'ENTERING '+to.name,64,74);ctx.fillStyle='#afc2d5';ctx.font='14px monospace';ctx.fillText(phase==='departure'?origin.systemName+' SYSTEM → INTERGALACTIC SPACE':phase==='crossing'?galaxyFlightHeading(destination).label+' · '+from.name+' → '+to.name:systemFocus(system).name+' · '+systemFocus(system).type+' · '+systemCensusLabel(system),65,105);
 ctx.restore();
}

function drawTravelViewport(u){
 const opacity=navigationEase(u/.045)*navigationEase((1-u)/.055);if(opacity<=0)return;
 ctx.save();ctx.globalAlpha=opacity;
 const edge=ctx.createLinearGradient(0,0,0,H);edge.addColorStop(0,'#05101a85');edge.addColorStop(.14,'#05101a00');edge.addColorStop(.83,'#05101a00');edge.addColorStop(1,'#05101ab0');ctx.fillStyle=edge;ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='#9ac6ce38';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,H*.18);ctx.lineTo(24,40);ctx.quadraticCurveTo(W*.5,-10,W-24,40);ctx.lineTo(W,H*.18);ctx.moveTo(0,H*.85);ctx.lineTo(36,H-28);ctx.quadraticCurveTo(W*.5,H-3,W-36,H-28);ctx.lineTo(W,H*.85);ctx.stroke();
 ctx.globalAlpha=opacity*.42;ctx.strokeStyle='#b2d8dc';ctx.lineWidth=1;
 for(const side of [-1,1])for(const vertical of [-1,1]){const x=side<0?24:W-24,y=vertical<0?26:H-26;ctx.beginPath();ctx.moveTo(x-side*34,y);ctx.lineTo(x,y);ctx.lineTo(x,y-vertical*24);ctx.stroke();}
 const x=W/2+(ship.x/W-.5)*12,y=H/2+(ship.y/H-.5)*9;ctx.globalAlpha=opacity*.20;ctx.beginPath();ctx.moveTo(x-15,y);ctx.lineTo(x-6,y);ctx.moveTo(x+6,y);ctx.lineTo(x+15,y);ctx.moveTo(x,y-15);ctx.lineTo(x,y-6);ctx.moveTo(x,y+6);ctx.lineTo(x,y+15);ctx.stroke();
 ctx.globalAlpha=opacity*.65;ctx.font='10px monospace';ctx.fillStyle='#acd0d5';ctx.fillText('COCKPIT VIEW / NAVIGATION GLASS',46,H-31);const intergalactic=sectorBlend?.origin&&sectorBlend.origin.galaxyId!==sectorBlend.destination?.galaxyId,turn=intergalactic&&u>.32&&u<.58?Math.sin(Math.PI*navigationEase((u-.32)/.26)):0,heading=intergalactic?galaxyFlightHeading(sectorBlend.destination):{x:0,y:0};ctx.textAlign='center';ctx.fillText(turn>.1?heading.label:'COURSE LOCKED',W/2,H-38);ctx.beginPath();ctx.moveTo(W/2-70,H-23);ctx.lineTo(W/2+70,H-23);ctx.stroke();ctx.fillStyle='#bcffe3';ctx.beginPath();ctx.arc(W/2+heading.x*turn*60,H-23+heading.y*turn*4,2.5,0,TAU);ctx.fill();ctx.textAlign='right';ctx.fillText('FIRST DESCENT · FLIGHT CAMERA',W-46,H-31);ctx.textAlign='center';ctx.globalAlpha=.8;ctx.font='12px monospace';ctx.fillStyle='#def5ef';ctx.fillText('SPACE / TAP TO SKIP',W/2,H-66);ctx.restore();
}
function drawPlanetTransit(location,u){
 const origin=sectorBlend?.origin;if(!origin){drawInitialGalaxyEntry(location,u);return;}if(origin.galaxyId!==location.galaxyId){drawGalaxyTransit(origin,location,u);return;}
 if(u<.34){drawPlanetDeparture(origin,u/.34);return;}
 if(u<.53){ctx.save();ctx.fillStyle='#020914';ctx.fillRect(0,0,W,H);drawNavigationStars();drawMovingSystemChart(expeditionSystem(location),location.destinationId);drawTransitRoute(location,origin,.24+(u-.34)/.19*.30);ctx.fillStyle='#dffff1';ctx.font='bold 27px monospace';ctx.fillText(origin.destinationName+'  →  '+location.destinationName,64,74);ctx.restore();return;}
 // Skip the redundant opening map: it is already on-screen from the route.
 drawPlanetApproach(location,.2+(u-.53)/.47*.8);
}
function drawDescentLabel(u){
 const s=sectors[level],location=expedition.locations[s.id];ctx.save();ctx.globalAlpha=Math.sin(Math.PI*u);ctx.fillStyle='#d9fff0';ctx.font='bold 27px monospace';ctx.fillText(location.destinationName+' / CONTINUING DESCENT',64,75);ctx.font='14px monospace';ctx.fillStyle='#b3c8d1';ctx.fillText('ENTERING '+(s.stratum||ENVIRONMENTS[s.environment]?.label||s.short),65,105);ctx.restore();
}
function planetarySkyVisible(definition,location){return !definition.ringsInPainting&&!!location?.rings&&['high-atmosphere','low-atmosphere','surface'].includes(definition.environment);}
function drawPlanetarySky(){
 const location=expedition.locations[sectors[level].id];if(state==='title'||!planetarySkyVisible(sectors[level],location))return;
 ctx.save();ctx.globalAlpha=.5;ctx.translate(W*.48,-430+viewY*.18);ctx.rotate((location.ringTilt??-.23)*.45);const drift=Math.sin(sectorSceneTime()*.015)*8;ctx.drawImage(planetaryRingTexture(),-2400+drift,-580,4800,1160);ctx.restore();
}
