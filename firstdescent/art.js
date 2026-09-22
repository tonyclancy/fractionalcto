function isTideEncounter(){return typeof updateTideEncounter==='function'&&sectors[level]?.encounterDirector==='tide-knots';}
/* Painted scenery and sprite artwork, with procedural animation and combat effects. */
const art={},artFiles={"blackHole":"black-hole-frontier-v1.webp","orisonOcean":"orison-ocean-v1.webp","orisonGas":"orison-gas-quiet-v2.webp","orisonLightning":"orison-gas-lightning-v1.webp","orisonCinder":"orison-cinder-v1.webp","orisonIce":"orison-ice-v1.webp","reefObstacle":"obstacle-reef.webp","stormObstacle":"obstacle-storm.webp","coreObstacle":"obstacle-core.webp","colonyObstacle":"obstacle-colony.webp","carrierObstacle":"obstacle-carrier.webp","derelictObstacle":"obstacle-derelict.webp","space":"space-panorama.webp","carrier":"carrier-panorama.webp","abyss":"abyss-panorama.webp","reef":"reef-descent.webp","storm":"storm-ascent.webp","core":"core-panorama.webp"};
for(const a of Object.values(WORLD_ART))artFiles[a.background]=a.landscape;
artFiles.cloudDischarge='cloud-discharge-v1.webp';
const artCrops={"reefObstacle":{"x":62,"y":24,"w":920,"h":1485},"stormObstacle":{"x":141,"y":14,"w":748,"h":1502},"coreObstacle":{"x":51,"y":6,"w":964,"h":1519},"colonyObstacle":{"x":260,"y":5,"w":509,"h":1525},"carrierObstacle":{"x":230,"y":2,"w":559,"h":1526},"derelictObstacle":{"x":255,"y":4,"w":530,"h":1527}};
function loadArt(key){
 if(art[key]||!artFiles[key])return art[key];
 const img=new Image();img.decoding='async';img.onload=()=>{if(typeof surfaceDirty!=='undefined')surfaceDirty=true;if(key==='orisonLightning')prepareCloudLightning();};if(artCrops[key])img.solidCrop=artCrops[key];art[key]=img;img.src='assets/'+artFiles[key];if(key==='orisonGas')loadArt('orisonLightning');return img;
}
function trimSectorArt(current,next){
 const keep=new Set();for(const d of [current,next])if(d){keep.add(d.background||({verdant:'space',forge:'carrier',abyss:'abyss'}[d.theme]||d.theme));keep.add(d.obstacleArt||({verdant:'colonyObstacle',forge:'carrierObstacle',abyss:'derelictObstacle'}[d.theme]||d.theme+'Obstacle'));}
 if(keep.has('orisonGas'))keep.add('orisonLightning');else cloudLightningCache=null;
 if([current,next].some(d=>d&&backgroundEventKind(d)==='lightning'))keep.add('cloudDischarge');
 for(const key of Object.keys(art))if(!keep.has(key)){panoramaSurfaces.delete(art[key]);delete art[key];}
}
function prepareSectorArt(definition){
 const location=expedition.locations[definition.id];if(location){preparePlanetCloseup(location);galaxyArtwork(expeditionGalaxy(location));requestSpaceImage('cosmic-remnant-v1.webp');}
 const theme={verdant:'space',forge:'carrier',abyss:'abyss',reef:'reef',storm:'storm',core:'core'};
 loadArt(definition.background||theme[definition.theme]||'space');
 if(backgroundEventKind(definition)==='lightning')loadArt('cloudDischarge');
 loadArt(definition.obstacleArt||({verdant:'colonyObstacle',forge:'carrierObstacle',abyss:'derelictObstacle'}[definition.theme]||definition.theme+'Obstacle'));
}
// Warm the opening sector while the deep-space title is displayed.
loadArt(campaign[0].background||'space');
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
 drawBackgroundEvents();
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
 const x=(W-width)/2+Math.sin(t*.035)*12,y=(H-height)/2+Math.sin(t*.027)*7,cx=x+width*(well.artCenter||well.center)[0],cy=y+height*(well.artCenter||well.center)[1],radius=width*(well.artRadius||well.radius);
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
// Background events have quiet intervals, deterministic local clocks, and no
// gameplay objects. Only the current event's small geometry/sprites are retained.
// The storm uses the original painted lightning, revealed only in its cloud
// banks. Coordinates are in the 1536×1024 source image, never screen space.
const CLOUD_LIGHTNING_CELLS=Object.freeze([
 Object.freeze({x:18,y:660,w:252,h:212}),
 Object.freeze({x:1040,y:750,w:355,h:274}),
 Object.freeze({x:1364,y:808,w:172,h:216})
]);
let cloudLightningCache=null;
function prepareCloudLightning(){
 const img=art.orisonLightning;if(!imageReady(img))return null;
 if(cloudLightningCache?.image===img)return cloudLightningCache;
 const cells=CLOUD_LIGHTNING_CELLS.map(r=>{
  const surface=document.createElement('canvas');surface.width=r.w;surface.height=r.h;const c=surface.getContext('2d');
  c.drawImage(img,r.x,r.y,r.w,r.h,0,0,r.w,r.h);
  c.save();c.translate(r.w/2,r.h/2);c.scale(r.w/2,r.h/2);const mask=c.createRadialGradient(0,0,0,0,0,1);
  mask.addColorStop(0,'#fff');mask.addColorStop(.38,'#fff');mask.addColorStop(.7,'#ffffffb0');mask.addColorStop(1,'#fff0');
  c.globalCompositeOperation='destination-in';c.fillStyle=mask;c.fillRect(-1,-1,2,2);c.restore();
  return{...r,surface};
 });
 return cloudLightningCache={image:img,cells};
}
function cloudLightningIntensity(event,cell,tile){
 if(!event?.active)return 0;let light=0;
 for(let strike=0;strike<5;strike++){
  if(((strike+tile+(event.seed%3))%3+3)%3!==cell)continue;
  const age=event.age-(.25+strike*1.4);if(age<0||age>2.15)continue;
  const pulse=(start,length)=>{const u=(age-start)/length;return u<0||u>1?0:Math.sin(u*Math.PI)**2;};
  // A cloud-lit swell, a short return flash, then a soft fade. No hard vector
  // core, additive neon halo, or full-screen flash.
  light=Math.max(light,pulse(0,.68)*.96+pulse(.8,.42)*.68+pulse(.24,1.9)*.14);
 }
 return Math.min(1,light);
}
function drawCloudLightningTile(cache,event,tile,x,y,p){
 const sx=p.iw/1536,sy=p.ih/1024;
 ctx.save();ctx.globalCompositeOperation='source-over';
 for(let i=0;i<cache.cells.length;i++){
  const cell=cache.cells[i],alpha=cloudLightningIntensity(event,i,tile)*(boss?.7:1);if(alpha<.005)continue;
  const dx=x+cell.x*sx,dy=y+cell.y*sy,dw=cell.w*sx,dh=cell.h*sy;
  if(dx>W||dy>H||dx+dw<0||dy+dh<0)continue;
  ctx.globalAlpha=alpha;ctx.drawImage(cell.surface,dx,dy,dw,dh);
 }
 ctx.restore();
}
function drawWorldLightningTile(event,tile,x,y,p){
 const image=art.cloudDischarge;if(!imageReady(image))return;
 // A photographic discharge is lit inside the distant cloud layer. Coordinates
 // follow each scrolling panorama tile, rather than hovering over the action.
 const seed=sectors[level].worldIdentity.seed;
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(let cell=0;cell<3;cell++){
  const alpha=cloudLightningIntensity(event,cell,tile);if(alpha<.005)continue;
  const u=[.17,.53,.82][cell],v=.28+((seed>>>(cell*5))&7)*.055;
  const w=p.iw*(.36+(cell%2)*.06),h=w*.5,dx=x+p.iw*u-w*.5,dy=y+p.ih*v-h*.5;
  if(dx>W||dy>H||dx+w<0||dy+h<0)continue;
  ctx.globalAlpha=alpha*(boss?.7:1);ctx.drawImage(image,dx,dy,w,h);
 }
 ctx.restore();
}
let ambientEventCache=null;
function backgroundEventKind(s){
 if(s.stellar||s.gravityWell)return null;
 const biome=s.worldIdentity?.environmentId;
 if(s.backgroundEvents===false)return null;
 if(s.backgroundEvents?.kind)return s.backgroundEvents.kind;
 if(biome==='storm'||s.background==='orisonGas')return 'lightning';
 if(s.medium==='water')return 'bioluminescence';
 if(biome==='foundry')return 'machinery';
 if(biome==='magma')return 'eruption';
 if(biome==='glacier')return 'aurora';
 return null;
}
function backgroundEventAt(s,t){
 const kind=backgroundEventKind(s);if(!kind)return null;
 const seed=speciesHash('background-v1/'+s.id),period={lightning:14,bioluminescence:15,machinery:12,eruption:15,aurora:22}[kind];if(!period)return null;
 const cycle=Math.floor(Math.max(0,t)/period),eventSeed=speciesHash(seed+'/'+cycle),onset=2+(eventSeed%240)/100,age=t-cycle*period-onset,duration={lightning:8,bioluminescence:7,machinery:5,eruption:7,aurora:12}[kind];
 return {kind,seed:eventSeed,cycle,age,duration,active:age>=0&&age<duration};
}
function prepareBackgroundEvent(s,event){
 if(ambientEventCache?.id===s.id&&ambientEventCache.cycle===event.cycle&&ambientEventCache.kind===event.kind)return ambientEventCache;
 const unit=n=>(speciesHash(event.seed+'/'+n)%10000)/10000;
 const glow=document.createElement('canvas');glow.width=glow.height=96;const c=glow.getContext('2d'),g=c.createRadialGradient(48,48,0,48,48,48),colour={lightning:'184,165,229',bioluminescence:'83,219,182',machinery:'148,210,255',eruption:'247,107,46',aurora:'102,212,185'}[event.kind];
 g.addColorStop(0,`rgba(${colour},.75)`);g.addColorStop(.25,`rgba(${colour},.30)`);g.addColorStop(1,`rgba(${colour},0)`);c.fillStyle=g;c.fillRect(0,0,96,96);
 const paths=[];
 let curtain=null;
 if(event.kind==='aurora'){
  // Bake feathered vertical rays once. Broad solid strokes look like painted
  // ribbons when their intensity is raised, rather than light in the air.
  curtain=document.createElement('canvas');curtain.width=768;curtain.height=256;const sky=curtain.getContext('2d');
  for(let x=0;x<768;x+=2){const u=x/768,hem=178+Math.sin(u*9+unit(4)*TAU)*29+Math.sin(u*23)*9,ray=105+Math.sin(u*91)*18,g=sky.createLinearGradient(0,hem-ray,0,hem+22);
   g.addColorStop(0,'#9b75ca00');g.addColorStop(.25,'#917acc12');g.addColorStop(.72,'#70d9bf45');g.addColorStop(.87,'#98f6cfa0');g.addColorStop(1,'#6edba400');sky.fillStyle=g;sky.globalAlpha=Math.sin(Math.PI*u)**.65*(.7+.3*Math.sin(u*153)**2);sky.fillRect(x,hem-ray,2,ray+22);
  }
 }
 return ambientEventCache={id:s.id,cycle:event.cycle,kind:event.kind,glow,curtain,paths,x:W*(.22+unit(2)*.58),y:H*(event.kind==='lightning'?.65+unit(3)*.09:event.kind==='eruption'?.57:event.kind==='machinery'?.2+unit(3)*.62:.78),phase:unit(4)*TAU};
}
function backgroundEventPosition(s,event,a){
 // Spawn each episode in view, then drift with the scenery. Using the entire
 // level's scroll distance here could wrap a newly created event offscreen.
 const drift=Math.max(0,event.age)*SCROLL_SPEED*.055;
 return s.scrollAxis?{x:a.x,y:a.y+(s.scrollAxis==='up'?drift:-drift)}:{x:a.x-drift,y:a.y};
}
function drawBackgroundEvents(){
 if(sectorBlend?.destination)return;
 const s=sectors[level],t=sectorSceneTime(),event=backgroundEventAt(s,t);if(!event?.active||event.kind==='lightning')return;
 const a=prepareBackgroundEvent(s,event),age=event.age,u=age/event.duration,fade=Math.sin(Math.PI*u)**2,quality=(window.flightEffectsQuality||1)<1?.65:1,p=backgroundEventPosition(s,event,a);
 ctx.save();ctx.globalCompositeOperation='screen';const focus=boss?.7:1;
 if(event.kind==='bioluminescence'){
  // Distant colonies awaken in a travelling bloom, then go dark again.
  for(let i=0;i<Math.round(15*quality);i++){const x=p.x+(i-7)*36,y=p.y+Math.sin(i*1.7+a.phase)*34,local=clamp((age-i*.1)/(event.duration-1.4),0,1),alpha=Math.sin(local*Math.PI)**2;
   ctx.globalAlpha=alpha*.9*focus;ctx.drawImage(a.glow,x-44,y-29,88,58);ctx.fillStyle='#b5ffe8';ctx.globalAlpha=alpha*.85*focus;ctx.fillRect(x,y,3,2.5);}
 }else if(event.kind==='eruption'){
  ctx.globalAlpha=fade*.75*focus;ctx.drawImage(a.glow,p.x-200,p.y-135,400,240);
  for(let i=0;i<Math.round(9*quality);i++){const q=clamp((age-i*.13)/(event.duration-1.04),0,1),rise=Math.sin(q*Math.PI)*150,x=p.x+Math.sin(i*2.7+a.phase)*q*115,y=p.y-rise;ctx.globalAlpha=(1-q)*fade*.5*focus;ctx.drawImage(a.glow,x-32,y-48,64,96);ctx.globalAlpha=(1-q)*fade*.9*focus;ctx.fillStyle='#ffd0a0';ctx.fillRect(x,y,2,4);}
 }else if(event.kind==='machinery'){
  ctx.globalAlpha=fade*(.4+.15*Math.sin(age*9)**2)*focus;ctx.drawImage(a.glow,p.x-105,p.y-55,210,110);
  ctx.strokeStyle='#dff5ff';ctx.lineWidth=1.3;ctx.beginPath();for(let i=0;i<Math.round(7*quality);i++){const q=(age*.85+i*.17)%1,x=p.x+Math.sin(i*3.7)*q*52,y=p.y+q*q*78;ctx.moveTo(x,y);ctx.lineTo(x-2,y-7);}ctx.globalAlpha=fade*.85*focus;ctx.stroke();
 }else if(event.kind==='aurora'){
  for(let band=0;band<(quality<1?1:2);band++){ctx.globalAlpha=fade*(band?.48:.9)*focus;ctx.drawImage(a.curtain,-W*.05+Math.sin(age*.18+a.phase+band)*24,band*38-25+Math.sin(age*.3+band)*10,W*1.1,230+band*40);}
 }
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
  // Broken, branching light traces rather than closed cells/hoops. Bake once,
  // then drift one faint layer; the dark abyss has almost no surface light.
  if(!causticSurface){causticSurface=document.createElement('canvas');causticSurface.width=768;causticSurface.height=256;const c=causticSurface.getContext('2d');c.strokeStyle='#b7e4d1';c.lineWidth=1.1;c.lineCap='round';c.shadowColor='#8acdbb';c.shadowBlur=3;
   for(let i=0;i<28;i++){const x=36+(i*173)%680,y=35+(i*97)%180,length=28+(i*31)%85,bend=Math.sin(i*2.7)*15;c.globalAlpha=.28+(i%4)*.12;c.beginPath();c.moveTo(x-length*.5,y);c.bezierCurveTo(x-length*.22,y+bend,x+length*.18,y-bend*.7,x+length*.5,y+Math.sin(i)*8);if(i%3===0){c.moveTo(x,y+bend*.15);c.quadraticCurveTo(x+9,y-9,x+18,y-22);}c.stroke();}}
  ctx.globalAlpha=deep?.018:.045;const w=1100,h=220,dx=((t*9)%w+w)%w;
  for(let i=-1;i<2;i++)ctx.drawImage(causticSurface,i*w+dx,H*.70+Math.sin(t*.3)*8,w,h);
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
   ctx.globalAlpha=.10+(i%3)*.045;ctx.fillStyle='#b9dee0';ctx.fillRect(x,y,.7+(i%3)*.35,.7+(i%3)*.35);if(i%5===0){ctx.strokeStyle='#c6ece6';ctx.lineWidth=.65;ctx.beginPath();ctx.arc(x,y,r*.65,Math.PI*1.05,Math.PI*1.65);ctx.stroke();}
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
 for(const d of drops)if(!d.suppressed)trace(d,9,-1);
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
  ctx.globalAlpha=fade*(.16+p.effort*.18);ctx.strokeStyle='#c9f5ec';ctx.lineWidth=.85;
  for(let i=0;i<3;i++){const x=-length*(i/3+.1),y=Math.sin(p.seed+i*2.1+p.age*4)*width*.52,r=(1.3+i*.75)*(1+p.age*.5);ctx.beginPath();ctx.arc(x,y,r*.7,3.5+i*.22,5.1+i*.22);ctx.stroke();}
  ctx.restore();
 }ctx.restore();
}
// Software-projected solid geometry: yaw reveals the nose and side faces.
function projectHull(v,yaw,roll,pitch){let [x,y,z]=v;let xx=x*Math.cos(yaw)+z*Math.sin(yaw),zz=-x*Math.sin(yaw)+z*Math.cos(yaw);let yy=y*Math.cos(roll)-zz*Math.sin(roll);zz=y*Math.sin(roll)+zz*Math.cos(roll);const f=340/(340+zz);return{x:(xx*Math.cos(pitch)-yy*Math.sin(pitch))*f,y:(xx*Math.sin(pitch)+yy*Math.cos(pitch))*f,z:zz}}
function projectPilotHull(v,yaw,roll,pitch){const p=rotateVertex(v,yaw,roll,pitch,0,0),f=window.gpuModels?1:460/(460+p[2]);return{x:p[0]*f,y:p[1]*f,z:p[2]};}
function drawShip(x,y,scale=1,preview=false){
 const pose=pilotFlightPose(),yaw=preview?Math.sin(world*.004)*.12:pose.yaw,roll=preview?PILOT_SIDE_ROLL+Math.sin(world*.003)*.08:pose.roll,pitch=preview?-.06:pose.pitch,thrust=preview?.45:flightPose.thrust;
 const project=v=>projectPilotHull(v,yaw,roll,pitch);const tier=preview?2:power;
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 // Twin plumes originate inside the modeled nozzle recesses. Their brightness
 // stays steady; thrust changes their length smoothly instead of flashing.
 for(const side of [-1,1]){
  const engine=project([-42.3,side*19,0]),tip=project([-76-thrust*58-speedLevel*4,side*19,0]);
  const angle=Math.atan2(tip.y-engine.y,tip.x-engine.x),length=Math.hypot(tip.x-engine.x,tip.y-engine.y);
  ctx.save();ctx.translate(engine.x,engine.y);ctx.rotate(angle);ctx.globalCompositeOperation='lighter';
  const plume=ctx.createLinearGradient(0,0,length,0);plume.addColorStop(0,'#d7fbff');plume.addColorStop(.16,'#7bddffb8');plume.addColorStop(.58,'#258bcc55');plume.addColorStop(1,'#1674e000');
  ctx.fillStyle=plume;const width=3.1+thrust*1.5;ctx.beginPath();ctx.moveTo(0,-width);ctx.bezierCurveTo(length*.3,-width*.8,length*.7,-1,length,0);ctx.bezierCurveTo(length*.7,1,length*.3,width*.8,0,width);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#cdfbff66';ctx.lineWidth=.8;for(let i=1;i<4;i++){const d=i*length*.17;ctx.beginPath();ctx.moveTo(d-2,0);ctx.lineTo(d,1.8);ctx.lineTo(d+2,0);ctx.lineTo(d,-1.8);ctx.closePath();ctx.stroke();}ctx.restore();
 }
 drawModel(meshes[tier===3?'player3':tier===2?'player2':'player'],0,0,1,yaw,roll,pitch,world*.01);
 if(muzzleFlash>0&&!preview){const ports=tier===3?[[52,0,-2]]:[...[ -1,1].map(side=>[tier===2?45:44,side*(tier===2?27:8),-2])];for(const v of ports){const p=project(v);orb(p.x,p.y,5,'#bffff3',clamp(muzzleFlash/.07,0,1)*.38)}}
 ctx.restore();
}
// Protection is a slow field shimmer, never hull transparency: opaque depth
// keeps the model readable and prevents overlapping surfaces showing through.
function drawPilotProtection(){
 if(!(ship.inv>0))return;
 ctx.save();ctx.globalAlpha=clamp(ship.inv/.35,0,1)*(.20+.05*Math.sin(time*5));ctx.strokeStyle='#c0f3ff';ctx.lineWidth=1.4;
 ctx.beginPath();ctx.ellipse(ship.x,ship.y,57,45,0,0,TAU);ctx.stroke();ctx.restore();
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
 // Hovering and obstacle corrections must not trigger a new about-face.
 if(Math.hypot(vx,vy)<35){e.headingSpeed=0;return;}
 const target=Math.atan2(vy,vx),previous=e.travelHeading??target;
 const error=Math.atan2(Math.sin(target-previous),Math.cos(target-previous));
 const desired=clamp(error*4,-2.4,2.4);
 e.headingSpeed=(e.headingSpeed||0)+clamp(desired-(e.headingSpeed||0),-7*dt,7*dt);
 const step=e.headingSpeed*dt;
 e.travelHeading=previous+(step*error>=0&&Math.abs(step)>Math.abs(error)?error:step);
 // Facing bookkeeping has a deadband around a vertical heading.
 const horizontal=Math.cos(e.travelHeading);if(Math.abs(horizontal)>.22)e.direction=horizontal>0?1:-1;
 if(e.brood||e.elite){
  // Keep the dorsal/ventral orientation in world space. A screen-plane half
  // turn would invert the animal; turn its nose through depth instead.
  const targetYaw=e.direction===1?Math.PI:0;
  e.uprightYaw??=targetYaw;
  const yawError=Math.atan2(Math.sin(targetYaw-e.uprightYaw),Math.cos(targetYaw-e.uprightYaw));
  e.uprightYaw+=clamp(yawError*(1-Math.exp(-dt*6)),-3.6*dt,3.6*dt);
  e.travelYaw=e.uprightYaw;
  e.travelPitch=-Math.sin(e.travelHeading)*Math.cos(e.uprightYaw)*.42;
 }else{e.travelYaw=0;e.travelPitch=e.travelHeading-Math.PI;}
}

// Boss arrival clears the arena through visible flight, not an array reset.
function beginEnemyRetreat(){
 for(const e of enemies){
  if(e.hp<=0||e.sentry||e.retreat)continue;
  const heading=e.travelHeading??((e.direction||-1)>0?0:Math.PI);
  const vx=Math.cos(heading),vy=Math.sin(heading),vertical=Math.abs(vy)>Math.abs(vx);
  const speed=Math.max(100,Math.min(360,e.swimSpeed||e.speed||180));
  e.retreat={vx:vx*speed,vy:vy*speed,dx:vertical?0:Math.sign(vx),dy:vertical?Math.sign(vy):0,age:0,margin:Math.max(240,(e.r||30)*3)};
  e.travelHeading=heading;e.headingSpeed=0;e.shotWindup=null;e.muzzle=0;
  // Escorts leave on their own trajectories instead of snapping to a carrier.
  e.mother=null;
 }
}
function updateEnemyRetreat(e,dt){
 const r=e.retreat;r.age+=dt;e.age+=dt;
 const speed=sectors[level].medium==='water'?620:760,acceleration=1100*dt;
 r.vx+=clamp(r.dx*speed-r.vx,-acceleration,acceleration);
 r.vy+=clamp(r.dy*speed-r.vy,-acceleration,acceleration);
 e.x+=r.vx*dt;e.y+=r.vy*dt;
 steerVerticalEnemyFacing(e,r.vx,r.vy,dt);
 if(e.brood)e.broodRoll=(e.broodRoll||0)+dt*TAU/.75;
 e.stroke=Math.pow((1+Math.cos((e.age+(e.phase||0))*5))*.5,5);
 r.finished=e.x< -r.margin||e.x>W+r.margin||e.y< -r.margin||e.y>H+r.margin;
}
function enemyKinematics(e,dt){
 if(e.retreat){updateEnemyRetreat(e,dt);return;}
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
  const turnPhase=(e.age-(e.swoopStart??e.age))*.95;
  e.y+=e.verticalDirection*speed*(swoops&&e.swoopStart!=null?.65+1.1*Math.cos(turnPhase):1)*dt;
  const desired=enemyRouteX(e,e.baseX+Math.sin(e.age*(swoops?.95:.8)+e.phase)*(swoops?150:42));
  e.routeX+=clamp((desired-e.routeX)*(1-Math.exp(-dt*6)),-260*dt,260*dt);e.x=e.routeX;
  steerVerticalEnemyFacing(e,(e.x-oldX)/dt,(e.y-oldY)/dt,dt);e.depth=1;e.stroke=stroke;return;
 }
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
  // Brief readable wind-up, then a fast committed dash into the next position.
  const hover=!entry&&local<1.55?Math.sin(local/1.55*Math.PI):0;
  e.x=from[0]+(to[0]-from[0])*ease+hover*14;
  e.y=enemyRouteY(e,from[1]+(to[1]-from[1])*ease-hover*18);
  e.broodRoll=entry?0:(leg-1+ease)*TAU;
  e.travelPitch=clamp(-Math.atan2((e.y-oldY)/dt,Math.max(180,Math.abs(e.x-oldX)/dt))*.45,-.4,.4);
  e.depth=1;steerVerticalEnemyFacing(e,to[0]-from[0],to[1]-from[1],dt);
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
 if(!e.satellite&&(e.brood||e.elite))return{
  // A shallow three-quarter attitude reveals the hull's depth. Banking follows
  // the actual turn/climb; upright elites never accumulate a belly-up roll.
  age:age*(enemySpecies(e)?.genome?.appendageRate||1),yaw:(e.travelYaw||0)+Math.cos(e.travelYaw||0)*.20,
  pitch:clamp(pitch,-.4,.4),roll:clamp((organic?.12:.18)-(e.headingSpeed||0)*.075+(e.travelPitch||0)*.22+Math.sin(age*2.2)*.035,-.30,.30),scale:e.brood?1.4:1
 };
 return{age:age*(enemySpecies(e)?.genome?.appendageRate||1),yaw:e.travelYaw||0,pitch,roll:e.satellite?e.age*TAU/.75+(e.orbit||0):e.brood?(e.broodRoll||0):organic?activity.roll+clamp(-pitch*.45,-.18,.18):mechanicalFlightRoll(e)-(e.travelHeading==null?pitch*.65:0),scale:e.brood?1.4:e.satellite?.5:1};
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
 const native=nativeSpeciesMesh(e);if(native?.nativeAnatomy){const p=speciesFlightPose(e);drawNativePropulsion(e,native,p);drawModel(native,e.x,e.y,p.scale,p.yaw,p.roll,p.pitch,p.age,e.hit);drawEmitter(e);if(e.brood||e.elite||e.hp<e.max)healthBar(e.x,e.y-(e.brood?85:e.r+24),e.brood?100:64,e.hp,e.max,isOrganicEnemy(e)?'#9cffc3':'#ffb797');return;}
 if(e.brood){const p=speciesFlightPose(e);drawModel(meshes[e.escortProfile?.model||'broodMother'],e.x,e.y,p.scale,p.yaw,p.roll,p.pitch,p.age,e.hit,e.escortProfile&&(!e.escortProfile.organic||e.escortProfile.rig==='appendages')?null:'octopus');drawEmitter(e);healthBar(e.x,e.y-97,100,e.hp,e.max,'#b4f1b1');return}
 if(e.satellite){const a=e.age*TAU/.75+e.orbit;orb(e.x,e.y,23,'#80ffd5',.13);drawModel(meshes[e.escortProfile?.escort||'swarmlet'],e.x,e.y,e.escortProfile?.5:.82,e.travelYaw||0,a,e.travelPitch||0,e.age+e.phase,e.hit,e.escortProfile&&(!e.escortProfile.organic||e.escortProfile.rig==='appendages')?null:'squid');if(e.escortProfile)drawEmitter(e);if(e.hit>0)healthBar(e.x,e.y-30,32,e.hp,e.max,'#b4f1b1');return}

 const organic=isOrganicEnemy(e),pose=speciesFlightPose(e),{yaw,pitch,roll}=pose;
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

function arsenalSocket(b){const d=bossDesign();return d?bossMount(b,d.guns?.[0]||d.mouth):bossOrganic()?organicMouth(b):bossPort(b,-1);}
function beginBossArsenal(b){
 const profile=bossArsenal(sectors[level]);if(!profile)return false;
 b.arsenal={profile,age:0,fired:0,target:{x:ship.x,y:ship.y}};
 b.arsenalLastCycle=b.specialCount||0;b.special=bossEncounterProfile(sectors[level]).cooldown*COMBAT_BALANCE.specialRest;
 b.capacitorSalvo=null;holdBossSalvo(b);announce(profile.name,profile.hint);
 window.flightAudio?.bossAttack?.('charge',bossIndex(),b.x);return true;
}
function updateBossArsenal(b,dt){
 const a=b.arsenal;if(!a)return;const p=a.profile;a.age+=dt;holdBossSalvo(b);
 if(a.age>=p.warning+a.fired*p.interval&&a.fired<p.count){
  const m=arsenalSocket(b),aim=Math.atan2(a.target.y-m.y,a.target.x-m.x),side=a.fired%2?1:-1;
  const offset=p.id==='mine'?(a.fired-1)*.46:p.id==='ion'?side*.32:p.id==='scythe'?side*.27:side*.12,angle=aim+offset;
  hostile.push({x:m.x,y:m.y,vx:Math.cos(angle)*p.speed,vy:Math.sin(angle)*p.speed,r:p.radius,age:0,kind:'arsenal',arsenal:p.id,c:p.color,launchAngle:angle,side,baseSpeed:p.speed,gap:aim+Math.PI,life:p.id==='mine'?2.8:p.id==='chitin'?3.2:3.6,bossShot:true});
  a.fired++;b.muzzle=.15;window.flightAudio?.bossAttack?.('fire',bossIndex(),m.x);
 }
 if(a.fired===p.count&&a.age>p.warning+(p.count-1)*p.interval+.45){b.arsenal=null;b.recovery=2;b.exposed=Math.max(b.exposed||0,2.8);}
}
function steerArsenalRound(b,dt){
 if(b.age>=b.life){b.expired=true;return;}
 let angle=Math.atan2(b.vy,b.vx),speed=Math.hypot(b.vx,b.vy);
 if(b.arsenal==='scythe')angle+=b.side*.55*Math.max(0,1-b.age/1.1)*dt;
 if(b.arsenal==='pearl')speed=b.baseSpeed+(650-b.baseSpeed)*passEase(clamp((b.age-.65)/.45,0,1));
 if(b.arsenal==='chitin')angle+=b.side*2.35*passEase(clamp((b.age-.45)/.35,0,1))*dt;
 if(b.arsenal==='ion'&&!b.bounced&&((b.y<28&&b.vy<0)||(b.y>H-28&&b.vy>0))){angle=-angle;b.bounced=true;}
 if(b.arsenal==='mine'){
  speed=b.baseSpeed*Math.exp(-b.age*2.3);
  if(b.age>=2.15){
   // Five radial needles leave a wide, fixed escape opening. No late retargeting.
   for(let i=0;i<8;i++){const a=b.gap+i*TAU/8;if(i===0||i===1||i===7)continue;
    hostile.push({x:b.x,y:b.y,vx:Math.cos(a)*430,vy:Math.sin(a)*430,r:5,age:0,kind:'arsenal',arsenal:'needle',c:b.c,life:1.8,baseSpeed:430,side:1,bossShot:true});}
   burst(b.x,b.y,b.c,8);b.expired=true;return;
  }
 }
 b.vx=Math.cos(angle)*speed;b.vy=Math.sin(angle)*speed;
}
function drawArsenalRound(b){
 ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx));const t=b.age||0;ctx.strokeStyle=b.c;ctx.fillStyle=b.c;ctx.lineWidth=2;ctx.lineCap='round';
 if(b.arsenal==='scythe'||b.arsenal==='chitin'){
  // A solid curved cutting edge, with a darker back, readable at flight scale.
  ctx.rotate(b.side*t*(b.arsenal==='chitin'?5:2));ctx.beginPath();ctx.moveTo(-12,-13);ctx.quadraticCurveTo(19,-8,10,14);ctx.quadraticCurveTo(5,-2,-12,-13);ctx.fill();ctx.strokeStyle='#fff3d5';ctx.beginPath();ctx.moveTo(-12,-13);ctx.quadraticCurveTo(19,-8,10,14);ctx.stroke();
 }else if(b.arsenal==='mine'){
  const charge=clamp((t-1.25)/.9,0,1);orb(0,0,14+charge*4,b.c,.32);ctx.fillStyle='#352644';ctx.beginPath();ctx.arc(0,0,9,0,TAU);ctx.fill();
  for(let i=0;i<8;i++){const a=i*TAU/8+t*.45;ctx.beginPath();ctx.moveTo(Math.cos(a)*8,Math.sin(a)*8);ctx.lineTo(Math.cos(a)*(14+charge*4),Math.sin(a)*(14+charge*4));ctx.stroke();}orb(0,0,3+charge*4,'#f4e5ff',.5+charge*.4);
 }else if(b.arsenal==='pearl'){
  const compress=passEase(clamp((t-.4)/.35,0,1));orb(0,0,17-compress*4,b.c,.45);ctx.beginPath();ctx.ellipse(0,0,12-compress*3,12-compress*3,0,0,TAU);ctx.stroke();orb(-3,-3,4,'#eaffff',.9);
  if(t>.65){ctx.globalAlpha=.45;ctx.beginPath();ctx.moveTo(-12,-4);ctx.quadraticCurveTo(-36,-9,-50,-2);ctx.moveTo(-12,4);ctx.quadraticCurveTo(-36,9,-50,2);ctx.stroke();}
 }else{
  ctx.globalAlpha=.28;ctx.lineWidth=b.arsenal==='ion'?10:5;ctx.beginPath();ctx.moveTo(-30,0);ctx.lineTo(8,0);ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=2;ctx.strokeStyle='#ecf5ff';ctx.stroke();
 }
 ctx.restore();
}
function drawArsenalCharge(b){const a=b.arsenal;if(!a)return;const m=arsenalSocket(b),p=a.profile,q=clamp(a.age/p.warning,0,1);orb(m.x,m.y,12+q*22,p.color,.15+q*.3);ctx.save();ctx.strokeStyle=p.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(m.x,m.y,8+q*9,-Math.PI/2,-Math.PI/2+TAU*q);ctx.stroke();ctx.restore();}

function bossCombatPhase(b){const ratio=b.max>0?b.hp/b.max:1;return ratio<.28?2:ratio<.62?1:0;}
function bossPatternBusy(b){return !!(b.arsenal||bossIndex()===0&&b.exposed>0||b.venom||(b.pass&&b.pass.stage!=='rear')||b.breath||b.charge>0||b.rush>0||b.vacuum>0||b.barrage>0||b.rackShots>0||b.sporePods?.length||b.salvoWindup||hazards.length||acidClouds.some(h=>h.bossTrap));}
function holdBossSalvo(b){b.shoot=Math.max(b.shoot||0,.52);b.attack=null;b.fireHeading=null;}
function bossEncounterHint(b){if(isTideEncounter())return b.exposed>0?'MANTLE OPEN · BONUS DAMAGE':'BREAK TIDE KNOTS · ESCAPE THROUGH THE RING GAPS';const k=bossIndex(),phase=bossCombatPhase(b);if(b.arsenal)return b.arsenal.profile.hint;if(b.exposed>0)return 'ALIGN WITH THE GLOWING WEAK POINT · BONUS DAMAGE';if(b.pass)return 'DODGE THE CHARGE · FLIP TO FACE THE BOSS';if(k===0)return b.breath?.kind==='wind'?'WINGSTORM · CUT ACROSS THE PRESSURE':b.breath?'FIRE BREATH · WATCH ITS MOUTH':bossTechnique(sectors[level]).response;if(k===2)return 'PRESSURE SWEEPS · MOVE AHEAD OF THE STREAM';if(k===3)return b.vacuum>0?'FIGHT THE PULL · ESCAPE ABOVE OR BELOW':'SPORE TRAPS · KEEP THE CLEAR CORRIDOR';if(k===4)return b.capacitorSalvo?'CAPACITOR LOCK · SIDESTEP THE BURST':'ARMORED · BAIT THE SWEEP THEN AIM AT THE VENT';if(k===5)return b.broodWatch?'BREAK THE GUARDIAN BROOD':'BROOD → DIVE → VENOM TEMPEST'+(phase===2?' · ENRAGED':'');return '';}
function updateBossSpecial(b,dt){
 if(isTideEncounter()){updateTideEncounter(b,dt);return;}
 if(typeof isCapitalSiege==='function'&&isCapitalSiege(b)){updateCapitalSiege(b,dt);return;}
 if(b.arsenal){updateBossArsenal(b,dt);return;}
 // Intercept the frame in which the ordinary cooldown would expire, before
 // the legacy director consumes it and starts another elemental sequence.
 if(b.special<=dt&&b.specialCount>0&&b.arsenalLastCycle!==b.specialCount&&!bossPatternBusy(b)&&!(b.recovery>0)&&!b.pressureFollowup&&!b.broodWatch&&!b.comboSteps?.length&&!b.comboPassPending&&bossArsenal(sectors[level])){beginBossArsenal(b);return;}
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
let cannonBeamTextures=null;
function prepareCannonBeam(){
 if(cannonBeamTextures)return cannonBeamTextures;
 function texture(head){const canvas=document.createElement('canvas');canvas.width=head?192:8;canvas.height=128;const g=canvas.getContext('2d');
  for(let x=0;x<canvas.width;x++){const half=64*(head?.5+.5*x/(canvas.width-1):1),light=g.createLinearGradient(0,64-half,0,64+half);
   for(const [at,color] of [[0,'#498cff00'],[.13,'#498cff08'],[.24,'#599cff55'],[.27,'#74caffaa'],[.36,'#92ecffee'],[.44,'#e7ffff'],[.5,'#ffffff'],[.56,'#e7ffff'],[.64,'#92ecffee'],[.73,'#74caffaa'],[.76,'#599cff55'],[.87,'#498cff08'],[1,'#498cff00']])light.addColorStop(at,color);
   g.fillStyle=light;g.fillRect(x,0,1,128);
  }return canvas;
 }
 return cannonBeamTextures={head:texture(true),shaft:texture(false)};
}
function drawCannonBeam(h){
 const age=h.age-h.warning,w=h.width,length=Math.hypot(W,H)+300;
 ctx.save();ctx.translate(h.x,h.startY);ctx.rotate(h.angle??Math.PI);noGlow();
 if(age<0){
  // Charge remains at the physical emitter, never a projected attack lane.
  const q=clamp(h.age/h.warning,0,1);orb(0,0,12+q*32,'#74bfff',.22+q*.36);orb(0,0,3+q*10,'#e7ffff',.5+q*.35);
  ctx.strokeStyle='#c4f7ff';ctx.lineWidth=1.2;ctx.globalAlpha=.25+q*.5;ctx.beginPath();
  for(let i=0;i<3;i++){const a=h.age*4+i*TAU/3,r=28*(1-q)+13;ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);ctx.quadraticCurveTo(Math.cos(a+.6)*r*.5,Math.sin(a+.6)*r*.5,0,0);}ctx.stroke();ctx.restore();return;
 }
 const texture=prepareCannonBeam(),pulse=.94+.06*Math.sin(age*13),quality=(window.flightEffectsQuality||1)<1,steps=quality?28:48;
 // A soft luminous cross-section replaces the flat polygon. The bright shaft
 // keeps the existing collision width; its faint outer bloom is decorative.
 ctx.globalAlpha=pulse;ctx.drawImage(texture.head,0,-w,180,w*2);ctx.drawImage(texture.shaft,180,-w,length-180,w*2);
 ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
 for(let strand=0;strand<(quality?2:4);strand++){
  ctx.strokeStyle=strand%2?'#72cfff':'#edffff';ctx.globalAlpha=strand%2?.38:.55;ctx.lineWidth=strand%2?2.4:1.3;ctx.beginPath();
  let px=0,py=0;for(let i=0;i<=steps;i++){const x=i/steps*length,taper=.5+.5*clamp(x/180,0,1),r=w*taper*.34,y=r*(Math.sin(x*.022-age*11+strand*1.7)*.66+Math.sin(x*.051-age*17+strand)*.17);if(i)ctx.quadraticCurveTo(px,py,(px+x)*.5,(py+y)*.5);else ctx.moveTo(x,y);px=x;py=y;}ctx.lineTo(px,py);ctx.stroke();
 }
 // Compression fronts travel away from the muzzle inside the plasma column.
 ctx.strokeStyle='#c8faff';ctx.lineWidth=1.5;for(let i=0;i<5;i++){const x=((age*960+i*length/5)%length),r=w*(.5+.5*clamp(x/180,0,1))*.39;ctx.globalAlpha=.28*Math.sin(Math.PI*x/length);ctx.beginPath();ctx.ellipse(x,0,6,r,0,0,TAU);ctx.stroke();}
 orb(0,0,w*.82,'#458eff',.35);orb(9,0,w*.47,'#a4f2ff',.72);orb(3,0,w*.22,'#f4ffff',.96);
 // Short flared jets emerge from the opening, all on the firing side.
 ctx.strokeStyle='#e4ffff';ctx.lineWidth=2;ctx.globalAlpha=.7;ctx.beginPath();for(const side of [-1,1]){ctx.moveTo(0,side*5);ctx.bezierCurveTo(14,side*w*.25,33,side*w*.35,62,side*w*.23);}ctx.stroke();ctx.restore();
}
function drawHazards(){if(boss){drawBreath(boss);drawArsenalCharge(boss);}for(const h of hazards){if(boss){const p=h.kind==='tech'?techLaserOrigin(boss):bossLaserOrigin(boss);h.x=p.x;h.startY=p.y;h.angle=p.angle??Math.atan2(h.y-p.y,-p.x);}const armed=h.age>=h.warning,c=h.kind==='tech'?'#bdaaff':'#83ffd6';ctx.save();
 if(h.kind==='tech'){drawCannonBeam(h);ctx.restore();continue;}
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
 if(regent){
  // Capacitor ammunition is an electromagnetic lance, not another rocket.
  const tail=28+Math.min(1,age*12)*35;ctx.strokeStyle='#ab91ff';ctx.lineCap='round';ctx.globalAlpha=.25;ctx.lineWidth=12*scale;ctx.beginPath();ctx.moveTo(-tail,0);ctx.lineTo(9*scale,0);ctx.stroke();ctx.globalAlpha=1;ctx.strokeStyle='#eef2ff';ctx.lineWidth=3*scale;ctx.beginPath();ctx.moveTo(-17*scale,0);ctx.lineTo(10*scale,0);ctx.stroke();
  ctx.strokeStyle='#aaafff';ctx.lineWidth=1.3;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(-tail*.75,side*6*scale);ctx.quadraticCurveTo(-14,side*10*scale,6,side*3*scale);ctx.stroke();}ctx.restore();return;
 }
 const ignition=passEase(clamp(age/.12,0,1)),tail=(18+ignition*43)*scale,nozzle=-14.6*scale;
 const exhaust=ctx.createLinearGradient(-tail,0,nozzle,0);exhaust.addColorStop(0,'#f4692000');exhaust.addColorStop(.46,'#f7994655');exhaust.addColorStop(.82,'#ffd28dbb');exhaust.addColorStop(1,'#eafaff');
 ctx.fillStyle=exhaust;ctx.beginPath();ctx.moveTo(nozzle,-2*scale);ctx.bezierCurveTo(-30*scale,-4*scale,-tail*.82,-1,-tail,0);ctx.bezierCurveTo(-tail*.82,1,-30*scale,4*scale,nozzle,2*scale);ctx.fill();
 ctx.strokeStyle='#fff0c7';ctx.lineWidth=.8;ctx.globalAlpha=.7;for(let i=0;i<3;i++){const x=(-21-i*9)*scale,r=(2.4-i*.5)*scale;ctx.beginPath();ctx.moveTo(x-2*scale,0);ctx.lineTo(x,r);ctx.lineTo(x+2*scale,0);ctx.lineTo(x,-r);ctx.closePath();ctx.stroke();}ctx.globalAlpha=1;
 drawModel(meshes.bossMissile,0,0,scale,0,age*1.8,0,age);
 ctx.restore();
}
function drawHostile(b){if(b.arsenal){drawArsenalRound(b);return;}if(b.bossRound){drawBossMissile(b);return;}if(['fire','water','wind'].includes(b.kind)){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx));if(b.bossShot){const scale=b.scale||.9;ctx.scale(scale,scale);orb(0,0,13,b.kind==='fire'?'#ff752d':'#87ecff',.36);ctx.strokeStyle=b.kind==='fire'?'#ffd09a':'#daffff';ctx.lineWidth=2;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(-Math.min(28,8+(b.age||0)*280),side*5);ctx.quadraticCurveTo(-23,side*(12+Math.sin((b.age||0)*29)*2),-3,side*8);ctx.stroke();}}if(b.kind==='wind'){ctx.strokeStyle='#cbebeb';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.globalAlpha=.6-i*.15;ctx.beginPath();ctx.ellipse(-i*9,0,5,9+i*3,0,-1.4,1.4);ctx.stroke();}}else{for(let i=4;i>=0;i--)orb(-i*7,Math.sin((b.age||0)*25+i)*i,Math.max(3,12-i*2),b.kind==='fire'?(i>1?'#e55c2b':'#ffe09b'):'#83dfff',.65-i*.09);}ctx.globalCompositeOperation='lighter';if(b.kind==='wind'){orb(0,0,6,'#ecffff',.75);}else{const hot=b.kind==='fire'?'#fff4ca':'#eaffff';orb(0,0,9,hot,.95);ctx.strokeStyle=hot;ctx.lineWidth=3.2;ctx.beginPath();ctx.moveTo(-19,0);ctx.quadraticCurveTo(-7,-1,5,0);ctx.stroke();}ctx.restore();return;}if(b.kind==='energy'){orb(b.x,b.y,24,b.c,.35);orb(b.x,b.y,12,b.c,.95);orb(b.x-3,b.y-3,5,'#ffffff',.8);return}const angle=Math.atan2(b.vy,b.vx);ctx.save();ctx.translate(b.x,b.y);ctx.rotate(angle);if(b.kind==='spore'||b.kind==='seed'){orb(0,0,15*(b.scale||1),'#65f7ae',.35);drawModel(meshes.spore,0,0,b.scale||1,0,Math.sin(world*.03)*.3,0,world*.01);ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#83ffb8';ctx.lineWidth=2.8;ctx.beginPath();ctx.moveTo(-7,0);ctx.quadraticCurveTo(-20,Math.sin(world*.07+b.x)*6,-36,0);ctx.stroke();ctx.strokeStyle='#e5ffc3';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(-18,0);ctx.stroke();orb(5,0,3.5*(b.scale||1),'#f1ffd0',.92);}else{const seeker=b.kind==='seeker',tail=seeker?48:35,plume=ctx.createLinearGradient(-tail,0,-7,0);plume.addColorStop(0,'rgba(255,99,42,0)');plume.addColorStop(.45,'rgba(255,153,73,.55)');plume.addColorStop(1,'#d6ffff');orb(-11,0,seeker?17:13,'#ffb76e',.32);poly([[-8,-2.8],[-tail,0],[-8,2.8]],plume);ctx.strokeStyle='#e4ffff';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(-tail*.58,0);ctx.stroke();drawModel(meshes.missile,0,0,seeker?1.25:.8,0,.15,0,world*.01);orb(seeker?12:8,0,seeker?6:4.5,seeker?'#ff7765':'#ffe4b0',.78);if(seeker){ctx.strokeStyle='#ffc38a';ctx.globalAlpha=.6;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-17,-3);ctx.lineTo(-36,-1);ctx.moveTo(-17,3);ctx.lineTo(-36,1);ctx.stroke();}}ctx.restore()}
function drawPickup(d){if(d.fade===0||d.x< -30)return;const c=lootColors[d.type]||'#a0ffdf',fade=d.fade??1;ctx.save();ctx.translate(d.x,d.y+Math.sin(d.age*3)*5);orb(0,0,42,c,.25*fade);ctx.globalAlpha=fade;ctx.strokeStyle=c;ctx.lineWidth=1.6;ctx.save();ctx.rotate(d.age*1.3);for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,0,25,i*TAU/3,i*TAU/3+1.3);ctx.stroke()}ctx.restore();ctx.fillStyle='#0b1d30';ctx.beginPath();ctx.arc(0,0,20,0,TAU);ctx.fill();glow(c,10);ctx.strokeStyle=c;ctx.fillStyle=c;ctx.lineWidth=2.3;
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
// Seed and launch velocity stay fixed for each particle. Retain its original
// silhouette coefficients for its lifetime instead of rebuilding them per frame.
function prepareFluidOutline(p){
 if(p.fluidOutline)return p.fluidOutline;
 const shape=new Float64Array(36);
 for(let j=0;j<12;j++){const a=j/12*TAU,c=Math.cos(a),r=.8+Math.sin(j*2.3+p.seed)*.2+Math.cos(j*4.1+p.seed)*.1;shape[j*3]=c*r;shape[j*3+1]=Math.sin(a)*r;shape[j*3+2]=c<0?Math.pow(-c,7):0;}
 p.fluidAngle=Math.atan2(p.vy,p.vx);p.fluidStretch=Math.min(28,Math.hypot(p.vx,p.vy)*.09);
 return p.fluidOutline=shape;
}
function traceFluidOutline(p,radius,length){
 const q=prepareFluidOutline(p);let ax=radius*q[33]-length*q[35],ay=radius*q[34],bx=radius*q[0]-length*q[2],by=radius*q[1];
 ctx.beginPath();ctx.moveTo((ax+bx)/2,(ay+by)/2);
 for(let j=0;j<12;j++){const a=j*3,b=((j+1)%12)*3;ax=radius*q[a]-length*q[a+2];ay=radius*q[a+1];bx=radius*q[b]-length*q[b+2];by=radius*q[b+1];ctx.quadraticCurveTo(ax,ay,(ax+bx)/2,(ay+by)/2);}
 ctx.closePath();ctx.fill();
}
function explode(x,y,c,size=1,organic=false,voice=1){
 window.flightAudio?.explosion(x,size,organic);if(organic)window.flightAudio?.alienCry?.(x,size,voice);
 if(organic&&level>=3&&voice<64&&voice%3===0){acidClouds.push({x,y,age:0,life:3.6,warning:.75,r:Math.min(64,38+size*9),seed:voice});if(acidClouds.length>6)acidClouds.shift();}
 const pieces=[];const count=Math.min(90,Math.floor(rand(20,35)+size*9+(organic?18:0))),bias=rand(0,TAU);for(let i=0;i<count;i++){const z=rand(-1,1),a=rand(0,TAU),r=Math.sqrt(1-z*z),v=rand(35,210)*Math.sqrt(size);pieces.push({x:0,y:0,z:0,vx:Math.cos(a)*r*v+Math.cos(bias)*v*.25,vy:Math.sin(a)*r*v+Math.sin(bias)*v*.25,vz:z*v,seed:rand(0,8),delay:rand(0,.16),radius:rand(5,22)*Math.sqrt(size),volume:i<7,debris:Math.random()<.32,fluid:organic&&i%6!==0})}
 if(organic){let skull=false;for(const piece of pieces){if(piece.fluid){prepareFluidOutline(piece);continue;}piece.fragment=skull?['bone','rib','spineChip','chitinChip'][Math.floor(piece.seed)%4]:'skull';skull=true;}}
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
 if(e.organic&&p.fluid){prepareFluidOutline(p);ctx.rotate(p.fluidAngle);const fluidShade=ctx.createRadialGradient(-rr*.12,-rr*.15,0,0,0,rr*.65);fluidShade.addColorStop(0,blood[1]);fluidShade.addColorStop(.55,blood[0]);fluidShade.addColorStop(1,'#120f12');ctx.fillStyle=fluidShade;
 // Unequal lobes and detached satellites replace repeated smooth oval splashes.
 const radius=rr*(.24+(p.seed%1)*.23),length=p.fluidStretch*(1-t);
 traceFluidOutline(p,radius,length);
 ctx.fillStyle=blood[2];ctx.globalAlpha=fade*.45;ctx.beginPath();ctx.arc(radius*.12,-radius*.28,Math.max(.5,radius*.12),0,TAU);ctx.fill();ctx.globalAlpha=fade;ctx.fillStyle=blood[1];for(let j=0;j<3;j++){const a=p.seed+j*2.1;ctx.beginPath();ctx.arc(-length*(.7+j*.4),Math.sin(a)*radius*(1.1+j*.5),radius*(.11+j*.04),0,TAU);ctx.fill();}
 }else if(p.debris||e.organic){drawModel(meshes[e.organic?(p.fragment||'bone'):'shrapnel'],0,0,f*(.7+p.radius*.045),p.seed+e.age*3.4,p.seed*.3+e.age*5,e.age*2.3,e.age)}
 else if(p.volume){drawSoftPlume(p,rr,e.age,fade)}
 else {const g=ctx.createRadialGradient(-rr*.3,-rr*.35,rr*.05,0,0,rr);g.addColorStop(0,e.age<.35?'#fffce0':'#e8a36b');g.addColorStop(.3,e.age<.4?'#ffe49b':e.c);g.addColorStop(.68,e.age<.7?'#d66e32':'#473c42');g.addColorStop(1,'#0a121800');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,rr,0,TAU);ctx.fill()}
 ctx.restore();}
 if(e.bossBlast){for(const d of e.detonations){const age=e.age-d.delay;if(age<0||age>.72)continue;const fade=1-age/.72;ctx.save();ctx.translate(d.x,d.y);ctx.globalAlpha=fade*.75;drawSoftPlume(d,d.r*(.5+age),age*.65,fade*.8);ctx.restore();}}
 if(!e.organic&&e.age<.24)orb(-4,-5,(50+e.age*100)*e.size,'#ffefca',(1-e.age/.24)*.8);ctx.restore();}explosions=explosions.filter(e=>e.age<e.life);
}
function drawStructures(){terrainEmitters.length=0;for(const o of obstacles)drawTerrainObstacle(o);}

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
function obstacleBaseForms(o){return o.shutters?(themeIndex()===0?rigidAsteroidPassage(o):shutterSolids(o)):o.parts?o.parts.map(p=>({...p,x:o.x+p.x})):[{x:o.x,y:0,w:o.w+30,h:o.gap-o.open/2+20,ceiling:true},{x:o.x,y:o.gap+o.open/2,w:o.w+30,h:H-o.gap-o.open/2,ceiling:false}];}
function obstacleForms(o){const raw=obstacleBaseForms(o);if(themeIndex()===0&&!o.navigation)for(const [i,r] of raw.entries()){const d=asteroidDrift(o,i);r.x+=d.x;r.y+=d.y;}const axis=sectors[level].scrollAxis;return axis?raw.map(r=>({x:axis==='down'?r.y*W/H:(H-r.y-r.h)*W/H,y:axis==='down'?r.x*H/W:(W-r.x-r.w)*H/W,w:r.h*W/H,h:r.w*H/W,ceiling:r.ceiling,side:axis==='down'?(r.ceiling?'left':'right'):(r.ceiling?'right':'left')})):raw;}
function terrainProfile(r,t,seed){const k=themeIndex(),fromRoot=r.side?(r.side==='left'?t:1-t):(r.ceiling?t:1-t);if(k===0){const envelope=Math.pow(Math.max(.015,Math.sin(t*Math.PI)),.3+.18*(1+Math.sin(seed*2.7))),u=t*(7+Math.floor((Math.sin(seed)+1)*2)),cell=Math.floor(u),blend=u-cell,hash=n=>{const x=Math.sin(n*127.1+seed*93.7)*43758.5453;return x-Math.floor(x);},jag=.52+.44*(hash(cell)*(1-blend)+hash(cell+1)*blend);return Math.max(.08,envelope*jag);}if(k===1)return forgeObstacleProfile(fromRoot,seed);if(k===4)return stormTerrainProfile(fromRoot,seed);const u=t*7,cell=Math.floor(u),blend=u-cell,hash=n=>{const v=Math.sin(n*127.1+seed*93.7)*43758.5453;return v-Math.floor(v);},strata=hash(cell)*(1-blend)+hash(cell+1)*blend;return Math.max(.13,(.97-(.52+.15*Math.sin(seed))*Math.pow(fromRoot,1.6+.5*Math.cos(seed)))*(.84+strata*.12)*(1-.75*Math.pow(clamp((fromRoot-.78)/.22,0,1),1.2)));}

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
 if(!b.arsenal&&!b.pass&&!b.breath&&!b.eyeAttack&&b.passClock<=0&&b.charge<=0&&!(b.vacuum>0)&&!(b.barrage>0)&&!hazards.length&&!b.rackShots&&!b.salvoWindup&&!b.recovery&&!(bossIndex()===0&&b.exposed>0)&&!b.pressureFollowup&&!b.sporePods?.length&&!acidClouds.some(h=>h.bossTrap)&&!b.broodWatch&&(!b.comboSteps?.length||b.comboPassPending)){
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
// Stone and ice are fixed formations. Foundry gates translate as rigid pistons;
// their hidden roots stay beyond the viewport instead of stretching the mesh.
function shutterSolids(o){const mechanical=themeIndex()===1,t=mechanical?time-(o.at||0):0,parts=[];for(let i=0;i<2;i++){const center=380+(i===0?-1:1)*(45+Math.sin(t*.65+i*.8)*20),gap=330+Math.sin(t*.9+i)*12,x=o.x+i*250,top=center-gap/2,bottom=center+gap/2;parts.push({x,y:mechanical?top-320:0,w:150,h:mechanical?320:top,ceiling:true},{x,y:bottom,w:150,h:mechanical?320:H-bottom,ceiling:false});}return parts;}
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
// Authored water regions use normalized painting coordinates. Only artwork
// inspected for visible surface water opts in; underwater, lava and cloud-only
// scenes must never inherit ripples merely because they share an encounter.
const SCENIC_WATER=freezeContent({
 'world:saffron-stillwater':{color:'#c9dbe5',pools:[[[.34,.579],[.53,.578],[.67,.602],[.63,.626],[.41,.626]],[[.60,.636],[.77,.641],[.86,.668],[.74,.682],[.61,.660]]],falls:[]},
 'world:caelus':{color:'#c4dcdb',pools:[[[.575,.469],[.624,.468],[.656,.498],[.669,.530],[.62,.534],[.582,.513]],[[.492,.668],[.545,.684],[.582,.711],[.565,.736],[.523,.716],[.495,.694]],[[.758,.577],[.798,.592],[.820,.630],[.773,.614]]],falls:[{path:[[.076,.354,.003],[.082,.386,.005],[.088,.421,.007],[.094,.458,.010],[.099,.489,.012]]},{path:[[.371,.545,.004],[.373,.570,.005],[.376,.597,.007],[.381,.626,.010]]},{path:[[.861,.624,.003],[.863,.661,.004],[.857,.702,.006],[.850,.730,.009]]}]},
 'world:lyra-aster':{color:'#eadcc3',pools:[[[.398,.431],[.601,.438],[.678,.471],[.551,.5],[.4,.486]],[[.457,.535],[.629,.523],[.668,.574],[.541,.598],[.48,.59]],[[.656,.754],[.707,.743],[.807,.768],[.791,.81],[.693,.794]]],falls:[]},
 'world:solenne-zephyr':{color:'#dfd7bd',pools:[[[.223,.505],[.344,.49],[.501,.483],[.54,.51],[.465,.535],[.315,.536]],[[.469,.636],[.517,.637],[.529,.66],[.493,.695],[.444,.702],[.438,.678]]],falls:[{path:[[.426,.800,.0025],[.426,.829,.003],[.420,.849,.004],[.418,.866,.005]]},{path:[[.512,.807,.003],[.514,.833,.004],[.518,.851,.005],[.527,.877,.005],[.530,.909,.008]]},{path:[[.632,.715,.002],[.627,.747,.003],[.620,.783,.005],[.616,.804,.007]]}]}
});
let scenicWaterCache=null,scenicMistSprite=null;
function scenicWaterContains(polygon,x,y){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function prepareScenicWater(key){
 const definition=SCENIC_WATER[key];if(!definition)return null;
 if(scenicWaterCache?.key===key)return scenicWaterCache;
 const strokes=[];let seed=931;const unit=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(const polygon of definition.pools){const xs=polygon.map(p=>p[0]),ys=polygon.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);let count=0;
  for(let trial=0;trial<180&&count<20;trial++){const x=minX+unit()*(maxX-minX),y=minY+unit()*(maxY-minY),length=.002+unit()*.006;
   if(!scenicWaterContains(polygon,x-length-.001,y-.002)||!scenicWaterContains(polygon,x+length+.001,y+.002))continue;
   strokes.push({x,y,length,phase:unit()*TAU,rate:.45+unit()*.55});count++;
  }
 }
 if(definition.falls.length&&!scenicMistSprite){
  scenicMistSprite=document.createElement('canvas');scenicMistSprite.width=scenicMistSprite.height=64;const g=scenicMistSprite.getContext('2d'),fade=g.createRadialGradient(32,32,0,32,32,32);fade.addColorStop(0,'#e1e8e7');fade.addColorStop(.45,'#dae4e280');fade.addColorStop(1,'#dae4e200');g.fillStyle=fade;g.fillRect(0,0,64,64);
 }
 return scenicWaterCache={key,definition,strokes};
}
function drawScenicWaterTile(water,t,x,y,p,vertical){
 ctx.save();ctx.translate(x,y);ctx.strokeStyle=water.definition.color;ctx.lineCap='round';ctx.lineWidth=.7;ctx.globalAlpha=.20;ctx.beginPath();
 const stride=(window.flightEffectsQuality||1)<1?2:1;
 for(let i=0;i<water.strokes.length;i+=stride){const s=water.strokes[i],a=t*s.rate+s.phase,xx=(s.x+Math.sin(a*.43)*.0006)*p.iw,yy=(s.y+Math.sin(a)*.0006)*p.ih;
  const edge=clamp((vertical?yy:xx)/p.overlap,0,1),length=s.length*p.iw*(.25+.75*Math.sin(a*.5)**2)*edge*edge*(3-2*edge);
  ctx.moveTo(xx-length,yy);ctx.quadraticCurveTo(xx,yy+Math.sin(a)*.35,xx+length,yy);
 }ctx.stroke();
 ctx.restore();
 for(const fall of water.definition.falls)drawScenicCascade(fall,t,x,y,p,vertical,stride);
}
// Interpolate an authored channel: x/y center and half-width are all in source
// image coordinates. The same channel supplies the clip and flowing filaments.
function scenicCascadePoint(fall,u,out){const n=fall.path.length-1,f=clamp(u,0,1)*n,j=Math.min(n-1,Math.floor(f)),a=fall.path[j],b=fall.path[j+1],v=f-j;for(let k=0;k<3;k++)out[k]=a[k]+(b[k]-a[k])*v;return out;}
const cascadePoint=[0,0,0];
function drawScenicCascade(fall,t,x,y,p,vertical,stride){
 const first=fall.path[0],last=fall.path.at(-1),edge=clamp((vertical?first[1]*p.ih:first[0]*p.iw)/p.overlap,0,1),feather=edge*edge*(3-2*edge);
 if(y+last[1]*p.ih<0||y+first[1]*p.ih>H)return;
 ctx.save();ctx.translate(x,y);ctx.beginPath();
 for(let i=0;i<fall.path.length;i++){const q=fall.path[i],xx=(q[0]-q[2])*p.iw,yy=q[1]*p.ih;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}
 for(let i=fall.path.length-1;i>=0;i--){const q=fall.path[i];ctx.lineTo((q[0]+q[2])*p.iw,q[1]*p.ih);}ctx.closePath();ctx.clip();
 ctx.lineCap='round';ctx.strokeStyle='#dce9e7';
 // Long, overlapping ribbons form a continuous current, rather than isolated
 // rain drops. The closed channel prevents any stroke above the waterfall lip.
 for(let pass=0;pass<2;pass++){
  ctx.lineWidth=pass?1.25:3.8;ctx.globalAlpha=(pass?.38:.15)*feather;ctx.beginPath();
  for(let i=0;i<18;i+=stride){const start=((t*.38+i*.137)%1.3)-.3,length=.23+(i%3)*.035;
   let begun=false;for(let j=0;j<=8;j++){const u=start+j*length/8;if(u<0||u>1)continue;const q=scenicCascadePoint(fall,u,cascadePoint),lane=Math.sin(i*8.17)*.67+Math.sin(u*13+i*2.3+t*.7)*.09,xx=(q[0]+q[2]*lane)*p.iw,yy=q[1]*p.ih;
    if(begun)ctx.lineTo(xx,yy);else{ctx.moveTo(xx,yy);begun=true;}
   }
  }ctx.stroke();
 }ctx.restore();
 // Retained soft spray at the foot; no per-frame canvas or gradient creation.
 if(scenicMistSprite){ctx.save();for(let i=0;i<3;i++){const age=(t*.24+i/3)%1,r=last[2]*p.iw*(.7+age*.9),xx=x+last[0]*p.iw+Math.sin(i*4.1+t*.5)*r*.45,yy=y+last[1]*p.ih-age*r*.3;ctx.globalAlpha=.14*Math.sin(age*Math.PI)*feather;ctx.drawImage(scenicMistSprite,xx-r,yy-r*.55,r*2,r*1.1);}ctx.restore();}
}

// Authored lava channels in source-image coordinates. Width is relative to the
// image width, so both rivers and falling lava follow the painted rock channels.
const SCENIC_LAVA=freezeContent({
 'world:ferrum':[[[.612,.176,.018],[.612,.221,.019],[.612,.276,.021]],[[.578,.187,.004],[.578,.273,.005]],[[.646,.187,.004],[.646,.274,.005]],[[.230,.510,.004],[.230,.575,.004],[.230,.641,.005]],[[.354,.498,.003],[.354,.568,.003],[.354,.635,.005]],[[.542,.677,.004],[.542,.724,.005],[.542,.764,.006]],[[.920,.726,.006],[.918,.776,.008],[.916,.839,.012]]],
 'world:cinder':[[[.709,.294,.012],[.711,.344,.014],[.713,.386,.014],[.715,.427,.017]],[[.727,.464,.006],[.730,.49,.006],[.731,.516,.01]],[[.725,.198,.002],[.724,.237,.002],[.724,.273,.003]]],
 'world:lyra-scoria':[[[.432,.845,.007],[.432,.908,.009],[.434,.980,.010]],[[.792,.594,.006],[.793,.647,.008],[.792,.695,.009]]],
 'world:umbra-caldera':[[[.842,.709,.019],[.835,.79,.022],[.836,.869,.021],[.830,.922,.024]],[[.376,.69,.007],[.374,.747,.008],[.373,.798,.01]]],
 'world:halcyon-kiln':[[[.141,.11,.009],[.142,.221,.011],[.141,.34,.014],[.146,.436,.013]],[[.835,.647,.009],[.834,.75,.011],[.835,.82,.012]],[[.939,.158,.006],[.938,.31,.007],[.937,.445,.008],[.936,.544,.012]],[[.219,.276,.003],[.219,.36,.003],[.220,.466,.004]]],
 'world:elysian-vulcanis':[[[.922,.315,.010],[.924,.414,.011],[.923,.523,.01],[.921,.607,.012]],[[.511,.772,.012],[.513,.83,.013],[.51,.908,.015]]],
 'world:rubra-furnace':[[[.821,.538,.008],[.819,.597,.01],[.818,.66,.013]],[[.293,.940,.009],[.326,.965,.013],[.348,.996,.014]]],
 'world:aether-cresset':[[[.789,.691,.006],[.789,.745,.009],[.789,.805,.011],[.779,.852,.012]],[[.773,.127,.006],[.774,.204,.007],[.774,.266,.008]]],
 'world:argent-smelt':[[[.914,.24,.01],[.91,.331,.012],[.91,.413,.011],[.904,.497,.014]],[[.676,.763,.006],[.677,.83,.008],[.677,.916,.009]]],
 'world:virent-carmine':[[[.802,.905,.007],[.804,.944,.009],[.804,.996,.011]],[[.716,.394,.004],[.715,.466,.005],[.714,.515,.006]]],
 'world:noctis-fumarole':[[[.624,.864,.009],[.627,.902,.013],[.625,.947,.016]],[[.925,.737,.012],[.916,.781,.013],[.906,.813,.013]]]
});
// Authored furnace vents: x, foot y, width and height in painting coordinates.
// They belong to the scenery, never to the player's collision/particle layer.
const SCENIC_LAVA_FIRES=freezeContent({
 'world:ferrum':[[.460,.594,.011,.027],[.562,.611,.010,.026],[.630,.622,.013,.035],[.650,.828,.020,.065],[.701,.828,.013,.040],[.730,.800,.015,.048]]
});
let scenicLavaCache=null,scenicLavaSteam=null,scenicLavaDrop=null,scenicLavaFire=null;
function prepareLavaFire(){
 if(scenicLavaFire)return scenicLavaFire;
 const sprite=document.createElement('canvas');sprite.width=64;sprite.height=96*12;
 const c=sprite.getContext('2d');
 for(let frame=0;frame<12;frame++){
  c.save();c.translate(0,frame*96);const phase=frame/12*TAU;
  for(let tongue=0;tongue<3;tongue++){
   const base=16+tongue*16,top=(tongue===1?14:32)+Math.sin(phase+tongue*2)*9,tip=base+Math.sin(phase+tongue*2.3)*7;
   const g=c.createLinearGradient(0,94,0,top);g.addColorStop(0,'#ff651bc0');g.addColorStop(.3,'#ffc85afa');g.addColorStop(.67,'#ffe6aacc');g.addColorStop(1,'#ffb63800');
   c.fillStyle=g;c.beginPath();c.moveTo(base-11,94);c.bezierCurveTo(base-18,65,tip-5,top+32,tip,top);c.bezierCurveTo(tip+4,top+32,base+17,66,base+11,94);c.closePath();c.fill();
  }c.restore();
 }
 return scenicLavaFire=sprite;
}
function prepareLavaDrop(){
 if(scenicLavaDrop)return scenicLavaDrop;
 const sprite=document.createElement('canvas');sprite.width=24;sprite.height=64;
 const c=sprite.getContext('2d'),g=c.createRadialGradient(12,45,0,12,40,23);
 g.addColorStop(0,'#fff4bf');g.addColorStop(.23,'#ffd263e0');g.addColorStop(.5,'#ff801c65');g.addColorStop(1,'#ee500000');
 c.fillStyle=g;c.beginPath();c.moveTo(12,2);c.bezierCurveTo(11,30,1,34,3,47);c.bezierCurveTo(5,64,22,60,21,46);c.bezierCurveTo(20,35,13,28,12,2);c.fill();
 return scenicLavaDrop=sprite;
}
function prepareLavaSteam(){
 if(scenicLavaSteam)return scenicLavaSteam;
 const sprite=document.createElement('canvas');sprite.width=96;sprite.height=96;
 const brush=sprite.getContext('2d');
 // Overlapping wisps, prepared once; no hard circular outlines or live blur.
 for(const [x,y,r] of [[40,66,23],[52,50,25],[36,31,24],[59,26,19]]){
  const g=brush.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#d4c7b650');g.addColorStop(.45,'#c5b9a92e');g.addColorStop(1,'#b7aea000');brush.fillStyle=g;brush.fillRect(0,0,96,96);
 }
 return scenicLavaSteam=sprite;
}
function prepareScenicLava(key,img){
 const paths=SCENIC_LAVA[key];if(!paths||!imageReady(img))return null;
 if(scenicLavaCache?.key===key)return scenicLavaCache;
 const aspect=img.naturalHeight/img.naturalWidth,channels=paths.map(path=>{
  const left=[],right=[];for(let i=0;i<path.length;i++){const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)],p=path[i],dx=b[0]-a[0],dy=(b[1]-a[1])*aspect,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len/aspect;left.push([p[0]+nx*p[2],p[1]+ny*p[2]]);right.push([p[0]-nx*p[2],p[1]-ny*p[2]]);}
  const channel={path,dripPoint:{},polygon:left.concat(right.reverse()).map(p=>p.map(v=>clamp(v,0,1)))};
  prepareLavaTexture(channel,img);return channel;
 });const fires=SCENIC_LAVA_FIRES[key]||[];return scenicLavaCache={key,channels,aspect,steam:prepareLavaSteam(),drop:prepareLavaDrop(),fires,fireSprite:fires.length?prepareLavaFire():null};
}
function prepareLavaTexture(channel,img){
 const nw=img.naturalWidth,nh=img.naturalHeight,path=channel.path;
 const minX=Math.floor(Math.min(...channel.polygon.map(p=>p[0]))*nw),minY=Math.floor(Math.min(...channel.polygon.map(p=>p[1]))*nh),maxX=Math.ceil(Math.max(...channel.polygon.map(p=>p[0]))*nw),maxY=Math.ceil(Math.max(...channel.polygon.map(p=>p[1]))*nh);
 const sprite=document.createElement('canvas');sprite.width=maxX-minX;sprite.height=maxY-minY;const c=sprite.getContext('2d',{willReadFrequently:true});c.drawImage(img,minX,minY,sprite.width,sprite.height,0,0,sprite.width,sprite.height);const pixels=c.getImageData(0,0,sprite.width,sprite.height);
 if(!pixels?.data)return;const data=pixels.data;
 // Retain the painted molten texture, masking away cool rock and softly
 // feathering the banks. No synthetic dark chunks or outlined streaks.
 for(let y=0;y<sprite.height;y++)for(let x=0;x<sprite.width;x++){
  const px=x+minX,py=y+minY,k=(y*sprite.width+x)*4;let strength=0;
  for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=(b[0]-a[0])*nw,dy=(b[1]-a[1])*nh,u=clamp(((px-a[0]*nw)*dx+(py-a[1]*nh)*dy)/(dx*dx+dy*dy||1),0,1),distance=Math.hypot(px-a[0]*nw-dx*u,py-a[1]*nh-dy*u),width=(a[2]+(b[2]-a[2])*u)*nw;strength=Math.max(strength,navigationEase((1-distance/width)/.65));}
  const warm=clamp((data[k]-data[k+2]-18)/65,0,1)*clamp((data[k]-165)/75,0,1),ends=navigationEase(Math.min(y,sprite.height-1-y)/Math.max(2,sprite.height*.13));data[k+3]=Math.round(data[k+3]*warm*strength*ends);
 }
 c.putImageData(pixels,0,0);channel.sprite=sprite;channel.box=[minX/nw,minY/nh,sprite.width/nw,sprite.height/nh];channel.sourceHeight=nh;
 // Bake flowing light/dark ripples into the real molten texture. Previously
 // the whole crop drifted only 0.3 source pixels/second: effectively still.
 // Fixed spatial masks keep the banks still; only the light travels downhill.
 const frameCount=16,atlas=document.createElement('canvas');atlas.width=sprite.width;atlas.height=sprite.height*frameCount;
 const brush=atlas.getContext('2d'),frame=brush.createImageData(sprite.width,sprite.height),waves=new Float32Array(data.length);
 for(let yy=0;yy<sprite.height;yy++)for(let xx=0;xx<sprite.width;xx++){
  const k=(yy*sprite.width+xx)*4;if(!data[k+3])continue;
  const grain=Math.sin(xx*.73+yy*.065)*.55+Math.sin(xx*.23-yy*.041)*.3,phase=yy*.105+grain,fine=yy*.21+xx*.31;
  waves[k]=Math.sin(phase);waves[k+1]=Math.cos(phase);waves[k+2]=Math.sin(fine);waves[k+3]=Math.cos(fine);
 }
 for(let f=0;f<frameCount;f++){
  const phase=f/frameCount*TAU,sn=Math.sin(phase),cs=Math.cos(phase),sn2=Math.sin(phase*2),cs2=Math.cos(phase*2);
  for(let k=0;k<data.length;k+=4){
   if(!data[k+3])continue;
   const wave=waves[k]*cs-waves[k+1]*sn,fine=waves[k+2]*cs2-waves[k+3]*sn2;
   const brightness=.99+wave*.16+fine*.03;
   frame.data[k]=Math.min(255,data[k]*brightness+Math.max(0,wave)*22);
   frame.data[k+1]=Math.min(255,data[k+1]*brightness+Math.max(0,wave)*12);
   frame.data[k+2]=Math.min(255,data[k+2]*brightness);
   frame.data[k+3]=data[k+3];
  }
  brush.putImageData(frame,0,f*sprite.height);
 }
 channel.flowAtlas=atlas;channel.flowFrames=frameCount;
}
function lavaDripPoint(path,progress,out={}){
 // Gravity accelerates a bead from the actual lip down the painted channel.
 const first=path[0],last=path.at(-1),yy=first[1]+(last[1]-first[1])*progress**1.55;
 let i=1;while(i<path.length-1&&path[i][1]<yy)i++;
 const a=path[i-1],b=path[i],u=clamp((yy-a[1])/(b[1]-a[1]||1),0,1);
 out.x=a[0]+(b[0]-a[0])*u;out.y=yy;out.width=a[2]+(b[2]-a[2])*u;return out;
}
function drawScenicLavaTile(lava,t,x,y,p,vertical){
 const layers=(window.flightEffectsQuality||1)<1?1:2;
 ctx.save();ctx.translate(x,y);ctx.globalCompositeOperation='source-over';
 for(const channel of lava.channels){
  if(!channel.sprite)continue;const first=channel.path[0],box=channel.box,edge=clamp((vertical?first[1]*p.ih:first[0]*p.iw)/p.overlap,0,1),feather=edge*edge*(3-2*edge);
  ctx.save();ctx.beginPath();for(let i=0;i<channel.polygon.length;i++){const q=channel.polygon[i];i?ctx.lineTo(q[0]*p.iw,q[1]*p.ih):ctx.moveTo(q[0]*p.iw,q[1]*p.ih);}ctx.closePath();ctx.clip();
  const clock=((t/2.8)%1+1)%1*channel.flowFrames,frame=Math.floor(clock),mix=clock-frame;
  for(let layer=0;layer<layers;layer++){
   ctx.globalAlpha=.82*(layers===1?1:layer?mix:1-mix)*feather;
   ctx.drawImage(channel.flowAtlas,0,((frame+layer)%channel.flowFrames)*channel.sprite.height,channel.sprite.width,channel.sprite.height,box[0]*p.iw,box[1]*p.ih,box[2]*p.iw,box[3]*p.ih);
  }
  // Sparse beads shed from the lip, never rain from above it. Shallow rivers
  // retain the flowing texture but do not acquire falling droplets.
  const last=channel.path.at(-1);
  if(last[1]-first[1]>Math.abs(last[0]-first[0])/lava.aspect*2){
   ctx.globalCompositeOperation='screen';
   for(let drip=0;drip<layers;drip++){
    const age=((t/2.4+first[0]*7+drip*.5)%1+1)%1,q=lavaDripPoint(channel.path,age,channel.dripPoint),width=Math.max(.8,q.width*p.iw*.21),height=width*(2.5+age*3);
    ctx.globalAlpha=.85*Math.sin(Math.PI*age)**.5*feather;
    ctx.drawImage(lava.drop,(q.x+q.width*(drip?.55:-.45))*p.iw-width*.5,Math.max(first[1]*p.ih,q.y*p.ih-height),width,height);
   }
  }ctx.restore();
 }
 // Steam rises from each mapped flow's landing, behind the encounter. Its
 // source and drift share the painting's transform, including vertical scroll.
 ctx.globalCompositeOperation='source-over';
 for(let i=0;i<lava.channels.length;i++){
  const end=lava.channels[i].path.at(-1),edge=clamp((vertical?end[1]*p.ih:end[0]*p.iw)/p.overlap,0,1),width=clamp(end[2]*3,.018,.05)*p.iw;
  for(let puff=0;puff<layers;puff++){
   const age=((t*.06+i*.37+puff/layers)%1+1)%1,fade=Math.sin(Math.PI*age)**2,drift=Math.sin(age*2.4+i)*width*.23;
   const size=width*(.65+age*.85),height=size*1.25;
   ctx.globalAlpha=.34*fade*edge*edge*(3-2*edge);
   ctx.drawImage(lava.steam,end[0]*p.iw+drift-size*.5,end[1]*p.ih-age*width*.9-height*.75,size,height);
  }
 }
 if(lava.fireSprite){
  ctx.globalCompositeOperation='screen';
  for(let i=0;i<lava.fires.length;i+=layers===1?2:1){
   const vent=lava.fires[i],edge=clamp((vertical?vent[1]*p.ih:vent[0]*p.iw)/p.overlap,0,1),phase=t*9+i*2.37,frame=((Math.floor(phase)%12)+12)%12;
   const intensity=.68+.22*Math.sin(t*1.6+i*2)**2,width=vent[2]*p.iw,height=vent[3]*p.ih;
   ctx.globalAlpha=intensity*edge*edge*(3-2*edge);
   ctx.drawImage(lava.fireSprite,0,frame*96,64,96,vent[0]*p.iw-width*.5,vent[1]*p.ih-height,width,height);
  }
 }
 ctx.restore();
}

// Vents are authored against the painting, from chimney mouth to dispersal.
// Reuse real plume detail from that painting, with soft edges baked once.
const SCENIC_PLUMES=freezeContent({
 'world:selen-saphir':[
  {path:[[.400,.331,.002],[.395,.258,.006],[.387,.180,.011],[.395,.091,.017]],sample:[.382,.17,.020,.090],period:8.4},
  {path:[[.738,.526,.002],[.739,.438,.005],[.733,.349,.009],[.737,.263,.013]],sample:[.725,.334,.022,.095],period:10.2},
  {path:[[.224,.145,.003],[.226,.094,.009],[.215,.015,.021]],sample:[.214,.015,.031,.085],period:7.8}],
 'world:umbra-morrow':[
  {path:[[.157,.255,.003],[.155,.184,.010],[.150,.111,.020],[.148,.018,.030]],sample:[.129,.025,.041,.085],period:8.1},
  {path:[[.423,.766,.003],[.423,.656,.012],[.417,.556,.019],[.421,.466,.026]],sample:[.401,.54,.036,.098],period:9},
  {path:[[.266,.418,.002],[.262,.324,.008],[.267,.243,.013],[.257,.128,.019]],sample:[.250,.172,.025,.092],period:10.8},
  {path:[[.785,.901,.003],[.791,.789,.012],[.797,.679,.018],[.785,.590,.023]],sample:[.782,.665,.029,.088],period:11.2}],
 'world:noctis-fathom':[
  {path:[[.256,.229,.004],[.248,.173,.013],[.247,.092,.021],[.250,.008,.028]],sample:[.234,.061,.036,.090],period:10.6},
  {path:[[.117,.276,.003],[.113,.201,.008],[.108,.119,.014],[.106,.021,.019]],sample:[.101,.09,.025,.088],period:11.3},
  {path:[[.838,.349,.002],[.833,.296,.007],[.843,.230,.012],[.851,.160,.017]],sample:[.832,.231,.021,.063],period:8.8},
  {path:[[.478,.430,.002],[.478,.395,.004],[.481,.347,.008],[.482,.304,.010]],sample:[.470,.335,.021,.062],period:7.4},
  {path:[[.363,.509,.002],[.363,.465,.005],[.358,.406,.009],[.362,.355,.014]],sample:[.349,.413,.025,.064],period:8.5},
  {path:[[.710,.537,.002],[.709,.488,.005],[.706,.441,.009],[.701,.384,.013]],sample:[.700,.446,.019,.060],period:9.7}]
});
let scenicPlumeCache=null;
function prepareScenicPlumes(key,img){
 const definitions=SCENIC_PLUMES[key];if(!definitions||!imageReady(img))return null;
 if(scenicPlumeCache?.key===key&&scenicPlumeCache.image===img)return scenicPlumeCache;
 const clouds=definitions.map(definition=>{
  const sprite=document.createElement('canvas');sprite.width=64;sprite.height=128;const g=sprite.getContext('2d'),s=definition.sample;
  g.drawImage(img,s[0]*img.naturalWidth,s[1]*img.naturalHeight,s[2]*img.naturalWidth,s[3]*img.naturalHeight,0,0,64,128);
  g.globalCompositeOperation='destination-in';g.save();g.scale(1,2);const mask=g.createRadialGradient(32,32,2,32,32,32);mask.addColorStop(0,'#fff');mask.addColorStop(.42,'#ffffffc0');mask.addColorStop(1,'#ffffff00');g.fillStyle=mask;g.fillRect(0,0,64,64);g.restore();
  return{...definition,sprite};
 });
 return scenicPlumeCache={key,image:img,clouds};
}
function drawScenicPlumeTile(plumes,t,x,y,p,vertical){
 const count=(window.flightEffectsQuality||1)<1?9:15;
 ctx.save();ctx.translate(x,y);
 for(let j=0;j<plumes.clouds.length;j++){
  const cloud=plumes.clouds[j],root=cloud.path[0],top=cloud.path.at(-1);
  if(x+(root[0]+.07)*p.iw<0||x+(root[0]-.07)*p.iw>W||y+root[1]*p.ih<0||y+top[1]*p.ih>H)continue;
  ctx.save();ctx.beginPath();
  for(let i=0;i<cloud.path.length;i++){const q=cloud.path[i];i?ctx.lineTo((q[0]-q[2]*2)*p.iw,q[1]*p.ih):ctx.moveTo((q[0]-q[2]*2)*p.iw,q[1]*p.ih);}
  for(let i=cloud.path.length-1;i>=0;i--){const q=cloud.path[i];ctx.lineTo((q[0]+q[2]*2)*p.iw,q[1]*p.ih);}ctx.closePath();ctx.clip();
  for(let i=0;i<count;i++){
   const u=((t/cloud.period+i/count+j*.217)%1+1)%1;
   scenicCascadePoint(cloud,u,cascadePoint);
   const q=cascadePoint,sway=Math.sin(u*11-t*.37+j*2)*q[2]*.38*u,xx=(q[0]+sway)*p.iw,yy=q[1]*p.ih;
   const edge=clamp((vertical?yy:xx)/p.overlap,0,1),life=Math.min(1,u*12)*Math.min(1,(1-u)*5),width=q[2]*p.iw*2.8,height=Math.abs(root[1]-top[1])*p.ih*.28;
   ctx.globalAlpha=life*edge*edge*(3-2*edge)*.48*(15/count);
   ctx.drawImage(cloud.sprite,xx-width*.5,yy-height*.5,width,height);
  }
  // Tiny mineral flecks rise in the current, rather than screen-wide bubbles.
  ctx.fillStyle='#c1deda';ctx.beginPath();
  for(let i=0;i<6;i++){
   const u=((t/(cloud.period*.76)+i/6+j*.13)%1+1)%1;
   scenicCascadePoint(cloud,u,cascadePoint);const q=cascadePoint,xx=(q[0]+Math.sin(i*2.4+u*9)*q[2]*1.3)*p.iw,yy=q[1]*p.ih;
   const edge=clamp((vertical?yy:xx)/p.overlap,0,1);ctx.globalAlpha=Math.sin(u*Math.PI)*edge*.15;
   ctx.fillRect(xx,yy,.8,.8);
  }
  ctx.restore();
 }
 ctx.restore();
}
function drawPanorama(img){
 const vertical=sectors[level].scrollAxis,p=panoramaGeometry(img,!!vertical),travel=panoramaOffset(p.span,!!vertical),offset=vertical==='up'?p.ih-H-travel:p.overlap+travel,extent=vertical?H:W,first=Math.floor(offset/p.step)-1,last=Math.floor((offset+extent)/p.step),x=-(p.iw-W)*.5-viewY,y=-(p.ih-H)*.5-viewY;
 // Adjacent upright panoramas overlap. The incoming feather reveals the prior
 // image underneath, so long encounters never produce inverted architecture.
 // This hot path creates no arrays, canvases, gradients or image filters.
 const stage=sectors[level],event=backgroundEventKind(stage)==='lightning'?backgroundEventAt(stage,sectorSceneTime()):null,lightning=event?.active&&stage.background==='orisonGas'?prepareCloudLightning():null;
 const water=prepareScenicWater(stage.background),lava=prepareScenicLava(stage.background,img),plumes=prepareScenicPlumes(stage.background,img),waterTime=sectorSceneTime();
 for(let i=first;i<=last;i++){const position=i*p.step-offset;if(position>extent||position+p.span<0)continue;const px=vertical?x:position,py=vertical?position:y;ctx.drawImage(p.surface,px,py,p.iw,p.ih);if(water)drawScenicWaterTile(water,waterTime,px,py,p,!!vertical);if(lava)drawScenicLavaTile(lava,waterTime,px,py,p,!!vertical);if(plumes)drawScenicPlumeTile(plumes,waterTime,px,py,p,!!vertical);if(lightning)drawCloudLightningTile(lightning,event,i,px,py,p);else if(event?.active)drawWorldLightningTile(event,i,px,py,p);}
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


function terrainAppearance(definition=sectors[level]){
 const world=definition.worldIdentity||{},biome=world.biome||definition.environment||'',seed=world.seed||0;
 const kind=/ice|glacier/i.test(biome)?'ice':definition.medium==='water'?'reef':/magma|solar|core/.test(biome)||world.habitat==='hot'?'basalt':/storm/.test(biome)?'storm':'stone';
 const colors={ice:[195,216,221],reef:[160,187,169],basalt:[175,145,125],storm:[113,126,135],stone:[185,174,152]};
 const base=colors[kind].map((n,i)=>Math.round(n*(.90+((seed>>>(i*5))&15)/100)));
 return{kind,base,seed,metal:kind==='basalt'?[106,88,68]:kind==='storm'?[100,116,125]:[91,107,111],accent:world.accent||[184,136,78]};
}
function terrainMesh(r,seed){if(themeIndex()===1||themeIndex()===4)return industrialTerrainMesh(r,seed);const faces=[],rows=40,sides=24,style=terrainAppearance(),color=style.base;
 const point=(t,a,offset=0)=>{const width=terrainProfile(r,t,seed),cross=Math.cos(a),depth=Math.sin(a),rough=1-.07*Math.sin(t*13+a*3+seed+style.seed%17)*Math.sin(a*2+seed),relief=Math.min(r.h,r.w)*.32*(.72+width*.28)*rough+offset;return r.side?[t*r.w,(terrainCenter(t,seed)+cross*width*.5)*r.h,depth*relief]:[(terrainCenter(t,seed)+cross*width*.5)*r.w,t*r.h,depth*relief];};
 const rings=Array.from({length:rows+1},(_,i)=>Array.from({length:sides},(_,j)=>point(i/rows,j/sides*TAU)));
 for(let i=0;i<rows;i++)for(let j=0;j<sides;j++){
  faces.push({v:[rings[i][j],rings[i+1][j],rings[i+1][(j+1)%sides],rings[i][(j+1)%sides]],c:color,em:0,flex:0});
 }faces.push({v:rings[0].slice().reverse(),c:color,em:0,flex:0},{v:rings[rows].slice(),c:color,em:0,flex:0});
 // Surface fractures follow the solid, rather than detached spikes or a tiled
 // rock pattern. Small mineral seams change with the world's geology.
 for(let k=0;k<(style.kind==='ice'?0:5);k++){
  const start=.04+k*.13,angle=Math.PI*(1.12+((k*7+style.seed%13)%11)/14),dark=style.kind==='ice'?[88,122,137]:style.kind==='basalt'?[192,83,33]:color.map(n=>Math.round(n*.65));
  for(let j=0;j<8;j++){const t=start+j*.035,next=t+.035,a=angle+Math.sin(j*1.3+k)*.11,b=angle+Math.sin((j+1)*1.3+k)*.11;
   faces.push({v:[point(t,a-.006,1),point(next,b-.006,1),point(next,b+.006,1),point(t,a+.006,1)],c:dark,em:style.kind==='basalt'?.28:0,flex:0});
  }
 }
 faces.rock=true;faces.terrainMaterial=style.kind;faces.terrainUV={width:r.w,height:r.h,side:!!r.side,flip:r.side?r.side==='right':!r.ceiling,seed};faces.terrainWorld=style.seed;addTerrainVents(faces,r,seed,[point(.29,Math.PI*1.44,3),point(.66,Math.PI*1.57,3)]);return faces;}
function drawTerrainObstacle(o){if(themeIndex()===0){for(const [i,r] of obstacleForms(o).entries()){const a=asteroidSurface(o,r,i),p=asteroidPose(o,i);drawModel(a.mesh,r.x+r.w/2,r.y+r.h/2,1,p.yaw,p.roll,p.pitch,time);queueTerrainEmitters(a.mesh,r,p);}return;}o.terrainMeshes??=[];for(const [index,r] of obstacleForms(o).entries()){if(r.w<=0||r.h<=0)continue;const seed=(o.id||0)*1.7+index*.9,key=r.w.toFixed(1)+':'+r.h.toFixed(1);let saved=o.terrainMeshes[index];if(!saved){const mesh=terrainMesh(r,seed),depth=Math.min(r.h,r.w);saved=o.terrainMeshes[index]={mesh,key,points:[...new Set(mesh.flatMap(f=>f.v))].map(v=>({v,x:v[0]/r.w,y:v[1]/r.h,z:v[2]/depth}))};}else if(saved.key!==key){const depth=Math.min(r.h,r.w);for(const p of saved.points){p.v[0]=p.x*r.w;p.v[1]=p.y*r.h;p.v[2]=p.z*depth;}saved.mesh.dynamic=true;saved.key=key;}drawModel(saved.mesh,r.x,r.y,1,0,0,0,0);queueTerrainEmitters(saved.mesh,r);}}

// Scenery activity is attached to retained meshes. Only a bounded list of
// visible sockets is projected each frame; no simulated particle population.
const terrainEmitters=[];
function terrainActivity(definition=sectors[level]){
 const style=terrainAppearance(definition);
 return definition.medium==='water'?'bubbles':definition.theme==='forge'?'forge':style.kind==='basalt'||definition.stellar?'vent':style.kind==='ice'?'frost':style.kind==='storm'?'cloud':'dust';
}
function addTerrainVents(faces,r,seed,points){
 const kind=terrainActivity(),cross=r.side?r.h:r.w,rad=Math.max(1.2,Math.min(8,cross*.037,(r.side?r.w:r.h)*.022)),metal=faces.industrial||faces.stormArchitecture;
 faces.ports=[];
 for(const [index,anchor] of points.entries()){
  const start=faces.length,[x,y,z]=anchor,radius=rad*(index?.8:1),rim=metal?[122,109,84]:faces.terrainMaterial==='ice'?[103,156,169]:faces.terrainMaterial==='basalt'?[139,84,49]:[102,138,123];
  const ring=(rr,zz)=>Array.from({length:8},(_,i)=>{const a=i/8*TAU,irregular=metal?1:1+.09*Math.sin(i*4+seed);return[x+Math.cos(a)*rr*irregular,y+Math.sin(a)*rr*.68*irregular,zz];});
  const rings=[ring(radius,z+2),ring(radius,z-3),ring(radius*.57,z-3),ring(radius*.57,z+.5)];
  for(let k=0;k<3;k++)for(let i=0;i<8;i++)faces.push({v:[rings[k][i],rings[k][(i+1)%8],rings[k+1][(i+1)%8],rings[k+1][i]],c:k===1?rim:rim.map(n=>n*.58),em:0,flex:0,textureWeight:0});
  faces.push({v:rings[0].slice().reverse(),c:rim,em:0,flex:0,textureWeight:0},{v:rings[3].slice(),c:kind==='vent'?[164,67,23]:[23,38,41],em:kind==='vent'?.35:0,flex:0,textureWeight:0});
  if(faces.components)faces.components.push({start,end:faces.length,name:'closed pressure outlet'});
  // Mineral accretions grow around natural fissures; storm castings have
  // small bronze reinforcing bosses. These remain inside the solid envelope.
  if(!faces.industrial)for(let j=0;j<3;j++){
   const a=seed+j*2.4,cx=x+Math.cos(a)*radius*1.65,cy=y+Math.sin(a)*radius*1.5,rr=radius*(.25+.07*j),zz=z+3,peak=[cx+rr*.2,cy-rr*.3,z-(kind==='bubbles'?5:3)-j];
   const ring=[[cx-rr,cy-rr,zz],[cx+rr,cy-rr,zz],[cx+rr,cy+rr,zz],[cx-rr,cy+rr,zz]],c=faces.stormArchitecture?[147,129,94]:faces.terrainMaterial==='ice'?[145,192,208]:kind==='vent'?[96,66,43]:[127,157,121];
   for(let n=0;n<4;n++)faces.push({v:[ring[n],ring[(n+1)%4],peak],c,em:0,flex:0});faces.push({v:ring.slice().reverse(),c,em:0,flex:0});
  }
  faces.ports.push({point:[x,y,z-3],width:r.w,height:r.h,kind,seed:seed*7+index*3.1,excitedUntil:-1});
 }
}
function queueTerrainEmitters(mesh,r,pose){
 if(r.x+r.w<-130||r.x>W+130||r.y+r.h<-130||r.y>H+130)return;
 for(const port of mesh.ports||[]){if(terrainEmitters.length>=32)break;
  if(pose){const p=rotateVertex(port.point,pose.yaw,pose.roll,pose.pitch,0,0);port.x=r.x+r.w/2+p[0];port.y=r.y+r.h/2+p[1];}
  else{port.x=r.x+port.point[0]*r.w/port.width;port.y=r.y+port.point[1]*r.h/port.height;}
  if(port.x<-90||port.x>W+90||port.y<-70||port.y>H+130)continue;
  terrainEmitters.push(port);
 }
}
function reactTerrainImpact(x,y){let nearest=null,distance=82;for(const port of terrainEmitters){const d=Math.hypot(port.x-x,port.y-y);if(d<distance){nearest=port;distance=d;}}if(nearest)nearest.excitedUntil=time+1.15;}
let terrainBubbleSprite=null;
function prepareTerrainBubble(){if(terrainBubbleSprite)return terrainBubbleSprite;const sprite=document.createElement('canvas');sprite.width=sprite.height=24;const c=sprite.getContext('2d');c.fillStyle='#163b5328';c.beginPath();c.arc(12,12,7,0,TAU);c.fill();c.strokeStyle='#bce7edcc';c.lineWidth=1.1;c.beginPath();c.arc(12,12,7,.85,4.8);c.stroke();c.strokeStyle='#ebffffe0';c.beginPath();c.arc(10.5,10.5,4.8,3.65,4.8);c.stroke();return terrainBubbleSprite=sprite;}
function terrainEmitterStrength(port,at=time,pilot=ship){const near=!port.triggerOnly&&Math.hypot(port.x-pilot.x,port.y-pilot.y)<100;return at<port.excitedUntil?1:near?.65:0;}
function drawTerrainEffects(){
 const quality=window.flightEffectsQuality||1,limit=quality<.8?14:24;let drawn=0;ctx.save();
 for(const port of terrainEmitters){if(drawn++>=limit)break;const strength=terrainEmitterStrength(port),t=time+port.seed;if(port.triggerOnly&&!strength)continue;
  const cycle=(t%5.7+5.7)%5.7,burst=cycle<1.35||strength>0;
  if(port.kind==='bubbles'){
   const sprite=prepareTerrainBubble(),count=quality<.8?5:9;
   for(let i=0;i<count;i++){const age=((t*.28+i/count)%1+1)%1,life=age*3.6,r=(4.3+(i%3)*1.1)*(1+age*.45),x=port.x+Math.sin(life*2.4+i)*life*2.3,y=port.y-life*27;ctx.globalAlpha=Math.sin(age*Math.PI)*(.64+strength*.28);ctx.drawImage(sprite,x-r,y-r,r*2,r*2);}
  }else if(port.kind==='vent'||port.kind==='forge'||port.kind==='cloud'){
   const steam=prepareLavaSteam(),count=quality<.8?3:5;
   for(let i=0;i<count;i++){const age=((t*.22+i/count)%1+1)%1,size=18+age*(port.kind==='cloud'?74:47),rise=age*92,x=port.x+Math.sin(age*4+port.seed)*age*14,y=port.y-rise;ctx.globalAlpha=Math.min(.95,Math.sin(age*Math.PI)*(port.kind==='cloud'?.75:1.2)*(1+strength*.4));ctx.drawImage(steam,x-size/2,y-size*.7,size,size);}
   if(port.kind==='forge'&&burst){ctx.strokeStyle='#ffd397';ctx.lineWidth=1.1;for(let i=0;i<5;i++){const age=((t*1.2+i*.17)%1+1)%1,a=port.seed+i*2.4,v=22+(i%3)*12,x=port.x+Math.cos(a)*age*v,y=port.y-Math.abs(Math.sin(a))*age*v+age*age*36;ctx.globalAlpha=(1-age)*.85;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(a)*3,y+2);ctx.stroke();}}
   if(port.kind==='vent'&&burst){ctx.fillStyle='#ffc07a';for(let i=0;i<3;i++){const age=((t*.7+i/3)%1+1)%1;ctx.globalAlpha=(1-age)*.75;ctx.fillRect(port.x+Math.sin(i*3+age*2)*age*14,port.y-age*52,1.4,1.4);}}
  }else{
   ctx.fillStyle=port.kind==='frost'?'#c5e3e9':'#c4b092';for(let i=0;i<(quality<.8?3:6);i++){const age=((t*.34+i/6)%1+1)%1;ctx.globalAlpha=Math.sin(age*Math.PI)*(.27+strength*.3);ctx.fillRect(port.x+Math.sin(i*2.4)*age*30-age*12,port.y+age*(port.kind==='frost'?32:18),1.3+i%2,1.3);}
  }
 }
 ctx.restore();
}

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
 const style=terrainAppearance(),steel=style.metal,edge=steel.map(n=>n+30),dark=steel.map(n=>Math.round(n*.39)),black=[17,23,26],brass=[151,115,70],paint=steel.map(n=>Math.round(n*.76)),warm=[224,157,67],cool=[104,178,191];
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
 const row=(v,width)=>{const l=(cross-width)/2,rr=(cross+width)/2,b=Math.min(11,width*.09,depth*.48);return[[l+b,-depth],[rr-b,-depth],[rr,-depth+b],[rr,depth-b],[rr-b,depth],[l+b,depth],[l,depth-b],[l,-depth+b]].map(p=>point(p[0],v,p[1]));};
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
 // Riveted service plates and raised edge rails provide physical relief. Keep
 // every fitting inset from the collision envelope, including stepped bands.
 for(let i=0;i<4;i++){
  const t=.19+i*.18,v=t*length,half=length*.018,width=cross*Math.min(forgeObstacleProfile(t-.025,seed),forgeObstacleProfile(t+.025,seed));
  for(const side of [-1,1]){
   const u=cross*.5+side*width*.38;
   box(u,v,width*.095,half*2,dark,-depth-3,3,1);
   box(u,v,width*.055,half*1.6,edge,-depth-6,3,1);
   for(const dy of [-1,1])box(u,v+dy*half*.62,Math.max(1.5,width*.023),Math.max(1.5,width*.023),brass,-depth-9,2,1);
  }
 }
 // Heat-exchanger foot: layered cap and recessed cooling passages, backed by
 // opaque steel so the readable solid edge never suggests a fly-through gap.
 const tipWidth=cross*Math.min(forgeObstacleProfile(.93,seed),forgeObstacleProfile(.98,seed))*.85;
 box(cross*.5,length*.956,tipWidth,length*.033,dark,-depth-3,5,3);
 for(let i=0;i<7;i++)box(cross*.5+(i-3)*tipWidth*.11,length*.956,tipWidth*.065,length*.025,steel,-depth-6,3,.8);
 // Small inset hazard tabs identify the collision tip without a neon outline.
 for(let i=0;i<4;i++)box(cross*(.34+i*.10),length*.985,cross*.042,Math.max(1.5,length*.012),i%2?dark:warm,-depth-4,2,.3);
 for(const f of faces){f.textureWeight=.16;const center=f.v.reduce((a,p)=>a+p[r.side?0:1],0)/f.v.length/(r.side?r.w:r.h),wear=.93+.06*Math.sin(center*19+style.seed%53);if(!f.em)f.c=f.c.map(n=>Math.round(n*wear));}
 faces.industrial=true;faces.terrainMaterial='foundry';faces.terrainWorld=style.seed;faces.forgeVariant=kind;faces.components=components;addTerrainVents(faces,r,seed,[point(cross*.51,length*.85,-depth-12)]);return faces;
}

// Storm ruins share the background's carved flying-buttress language. Their
// taper is also the collision envelope: the empty corners are truly empty.
function stormTerrainProfile(t,seed){
 const variants=[[.96,.90,.74,.63,.64,.42,.12],[.96,.86,.82,.69,.47,.32,.10],[.96,.94,.76,.78,.61,.30,.08]],v=variants[forgeObstacleVariant(seed)],u=clamp(t,0,1)*6,i=Math.min(5,Math.floor(u));return v[i]+(v[i+1]-v[i])*(u-i);
}
function industrialTerrainMesh(r,seed){
 if(themeIndex()===1)return forgeTerrainMesh(r,seed);
 const faces=[],cross=r.side?r.h:r.w,length=r.side?r.w:r.h,depth=Math.min(cross,length)*.36,style=terrainAppearance(),solar=!!sectors[level].stellar,rows=24,sides=16;
 const color=solar?[130,100,74]:[151,139,117],bronze=solar?[154,110,61]:[132,115,83];
 const point=(u,t,z)=>r.side?[r.side==='left'?t*length:(1-t)*length,u,z]:[u,r.ceiling?t*length:(1-t)*length,z];
 function surface(t,a,out=0){const width=stormTerrainProfile(t,seed),flute=1-.40*Math.pow(Math.sin(a*3+seed*.23),2),d=depth*(.35+width*.65)*flute+out;return point(cross*(.5+Math.cos(a)*width*.5),t,Math.sin(a)*d);}
 const rings=Array.from({length:rows+1},(_,i)=>Array.from({length:sides},(_,j)=>surface(i/rows,j/sides*TAU)));
 for(let i=0;i<rows;i++)for(let j=0;j<sides;j++)faces.push({v:[rings[i][j],rings[i+1][j],rings[i+1][(j+1)%sides],rings[i][(j+1)%sides]],c:color,em:0,flex:0});
 faces.push({v:rings[0].slice().reverse(),c:color,em:0,flex:0},{v:rings.at(-1).slice(),c:bronze,em:0,flex:0});
 // Raised longitudinal ribs follow the mass in depth. They converge into the
 // narrow nose instead of decorating a flat front with repeated vent symbols.
 for(const angle of [Math.PI*1.20,Math.PI*1.50,Math.PI*1.80]){
  for(let i=1;i<23;i++){const t=i/24,next=(i+1)/24,half=.075+(1-t)*.025;
   const a=surface(t,angle-half,1),b=surface(next,angle-half,1),c=surface(next,angle+half,1),d=surface(t,angle+half,1),e=surface(t,angle,depth*.18),f=surface(next,angle,depth*.18);
   faces.push({v:[a,b,f,e],c:bronze,em:0,flex:0},{v:[e,f,c,d],c:bronze.map(n=>n*.72),em:0,flex:0});
  }
 }
 // A few narrow collar seams divide the load-bearing stone, with variation
 // between structures; no repeated disks, screens or rectangular cabinets.
 for(const t of [.12,.82])for(let j=8;j<16;j++){
  const a=j/sides*TAU,b=(j+1)/sides*TAU;
  faces.push({v:[surface(t-.010+Math.sin(a*2)*.03,a,2),surface(t+.010+Math.sin(a*2)*.03,a,2),surface(t+.010+Math.sin(b*2)*.03,b,2),surface(t-.010+Math.sin(b*2)*.03,b,2)],c:bronze.map(n=>n*.54),em:0,flex:0});
 }
 // Small sheltered amber apertures, recessed beneath the central rib.
 for(const t of [.24,.27,.30]){
  const a=Math.PI*1.43,b=Math.PI*1.46;
  faces.push({v:[surface(t,a,2),surface(t+.014,a,2),surface(t+.014,b,2),surface(t,b,2)],c:solar?[242,134,47]:[227,188,114],em:.24,flex:0});
 }
 faces.rock=true;faces.terrainMaterial=solar?'basalt':'storm';faces.terrainWorld=style.seed;faces.stormArchitecture=true;addTerrainVents(faces,r,seed,[surface(.36,Math.PI*1.43,5),surface(.65,Math.PI*1.57,5)]);return faces;
}

const asteroidSurfaces=new Map();
function asteroidSurface(o,r,index){const worldStyle=asteroidWorld(),seed=(o.id||0)*1.7+index*.9+worldStyle.seed*.031,key=[seed,r.w,r.h,r.ceiling,sectors[level].worldIdentity?.seed||0].join(':');let surface=asteroidSurfaces.get(key);if(!surface){const mesh=crateredAsteroid(r,seed,(speciesHash(String(worldStyle.seed)+":"+(o.id||0))+index)%5);const front=mesh.reduce((a,b)=>a.v[0][2]<b.v[0][2]?a:b),p=front.v[0].slice();mesh.ports=[{point:p,width:r.w,height:r.h,kind:'dust',seed,triggerOnly:true,excitedUntil:-1}];const points=[...new Set(mesh.flatMap(f=>f.v))],ids=new Map(points.map((p,i)=>[p,i]));surface={mesh,points,faces:mesh.map(f=>f.v.map(v=>ids.get(v)))};asteroidSurfaces.set(key,surface);}return surface;}
// Stable per-world geology and individual motion; reference meshes are shared and retained.
const asteroidWorlds=new Map();
function asteroidWorld(){const id=sectors[level].worldIdentity?.seed||level+1;if(asteroidWorlds.has(id))return asteroidWorlds.get(id);const n=speciesHash(String(id)),kind=n%4,environment=terrainAppearance(),colors=[[171,166,154],[143,155,163],[174,133,102],[183,203,211]],profile={seed:n%997,kind,color:colors[kind].map((c,i)=>Math.round(c*.35+environment.base[i]*.65)),craters:[13,9,11,8][kind],relief:[.12,.075,.17,.055][kind],stretch:.72+(n%31)/100,textureScale:1.5+(n%5)*.45,roughness:[.98,.83,.94,.88][kind]};asteroidWorlds.set(id,profile);return profile;}
function asteroidDynamicsProfile(){const biome=sectors[level].worldIdentity?.biome||'orbital';return /ice|glacier/i.test(biome)?{speed:.68,rebound:.36,drag:.035}:biome==='garden'?{speed:.78,rebound:.24,drag:.025}:biome==='sky'?{speed:1.08,rebound:.48,drag:.018}:biome==='corona'?{speed:1.18,rebound:.60,drag:.01}:{speed:1,rebound:.72,drag:0};}
function asteroidMotion(o,index){const seed=(o.id||0)*.71+index*1.3+asteroidWorld().seed*.017,fraction=n=>{const v=Math.sin(seed*9.73+n*37.1)*43758.5453;return v-Math.floor(v);},speed=asteroidDynamicsProfile().speed,sign=fraction(4)<.5?-1:1;return{seed,spin:(1.15+fraction(1)*1.65)*(.9+speed*.1),vx:-(70+fraction(2)*80)*speed,vy:(fraction(3)-.5)*24*speed,x:(fraction(5)-.5)*22,y:(fraction(6)-.5)*10,sign};}
function asteroidFreeDrift(o,index,t){const m=asteroidMotion(o,index),drag=asteroidDynamicsProfile().drag,travel=drag?-Math.expm1(-drag*t)/drag:t;return{x:m.x+m.vx*travel,y:m.y+m.vy*travel};}
function asteroidDrift(o,index){const state=o.asteroidDynamics?.bodies[index];return state?{x:state.x,y:state.y}:asteroidFreeDrift(o,index,Math.max(0,time-(o.at||0)));}
function asteroidPose(o,index,at=time){
 const m=asteroidMotion(o,index),t=at-(o.at||0),impact=o.asteroidDynamics?.bodies[index]?.angle||0;
 // One fixed spin axis through the body's centre of mass. Two simultaneous
 // Euler ramps made the old shapes rock around like a suspended mobile.
 const ax=Math.sin(m.seed*2.3)*.65,ay=Math.cos(m.seed*1.7)*.65,az=m.sign*(.65+.25*Math.cos(m.seed)),length=Math.hypot(ax,ay,az),x=ax/length,y=ay/length,z=az/length,a=t*m.spin+m.seed+impact,c=Math.cos(a),q=1-c,v=Math.sin(a);
 const m32=z*y*q+x*v,m31=z*x*q-y*v,m33=c+z*z*q,m12=x*y*q-z*v,m22=c+y*y*q;
 return{roll:Math.asin(clamp(m32,-1,1)),yaw:Math.atan2(-m31,m33),pitch:Math.atan2(-m12,m22)};
}

// Remove a loose cluster only once its actual moving bodies have left. Do not
// clamp bodies to invisible anchors or delete them at the old spawn rectangle.
function obstacleStillVisible(o){if(themeIndex()!==0)return o.x+o.w>-30;return obstacleBaseForms(o).some((r,i)=>{const body=o.asteroidDynamics?.bodies[i],d=asteroidDrift(o,i),radius=body?.radius||Math.max(r.w,r.h)*.65;return r.x+r.w/2+d.x+radius>-40;});}
// Fixed-step local cluster dynamics. Only loose rocks participate; anchored
// formations and machinery retain their material-specific movement rules.
function updateAsteroidDynamics(o){
 if(themeIndex()!==0||o.navigation)return;
 const target=Math.floor(Math.max(0,time-(o.at||0))*60),forms=obstacleBaseForms(o),profile=asteroidDynamicsProfile();
 let simulation=o.asteroidDynamics;
 if(!simulation||simulation.tick>target||simulation.level!==level){simulation=o.asteroidDynamics={tick:0,level,contacts:0,lastContacts:new Map(),bodies:forms.map((r,i)=>{const d=asteroidMotion(o,i),surface=asteroidSurface(o,r,i);return{x:d.x,y:d.y,vx:d.vx,vy:d.vy,angle:0,spin:0,mass:r.w*r.h,ports:surface.mesh.ports,points:surface.points,radius:Math.max(...surface.points.map(v=>Math.hypot(...v)))};})};}
 const bodies=simulation.bodies,dt=1/60,decay=Math.exp(-profile.drag*dt),travel=profile.drag?(1-decay)/profile.drag:dt;
 while(simulation.tick<target){
  const t=++simulation.tick/60;
  for(const b of bodies){b.x+=b.vx*travel;b.y+=b.vy*travel;b.angle+=b.spin*travel;b.vx*=decay;b.vy*=decay;b.spin*=decay;}

  for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
   const a=bodies[i],b=bodies[j],ra=forms[i],rb=forms[j],dx=rb.x+rb.w/2+b.x-ra.x-ra.w/2-a.x,dy=rb.y+rb.h/2+b.y-ra.y-ra.h/2-a.y,d=Math.hypot(dx,dy);
   if(d>a.radius+b.radius||d<.001)continue;
   const nx=dx/d,ny=dy/d,pa=asteroidPose(o,i,(o.at||0)+t),pb=asteroidPose(o,j,(o.at||0)+t);
   const support=(body,p,x,y)=>{const cy=Math.cos(p.yaw),sy=Math.sin(p.yaw),cr=Math.cos(p.roll),sr=Math.sin(p.roll),cp=Math.cos(p.pitch),sp=Math.sin(p.pitch),u=x*cp+y*sp,w=-x*sp+y*cp,nx=u*cy+w*sy*sr,ny=w*cr,nz=u*sy-w*cy*sr;let extent=-Infinity;for(const v of body.points)extent=Math.max(extent,v[0]*nx+v[1]*ny+v[2]*nz);return extent;};
   const overlap=support(a,pa,nx,ny)+support(b,pb,-nx,-ny)-d;if(overlap<=0)continue;
   const shareA=b.mass/(a.mass+b.mass),shareB=1-shareA,separation=Math.min(overlap+.2,12);a.x-=nx*separation*shareA;a.y-=ny*separation*shareA;b.x+=nx*separation*shareB;b.y+=ny*separation*shareB;
   const approach=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
   if(approach<0){const pair=i*bodies.length+j,fresh=approach < -8&&simulation.tick-(simulation.lastContacts.get(pair)??-100)>36,impulse=-(1+(fresh?profile.rebound:0))*approach;a.vx-=nx*impulse*shareA;a.vy-=ny*impulse*shareA;b.vx+=nx*impulse*shareB;b.vy+=ny*impulse*shareB;if(fresh){simulation.lastContacts.set(pair,simulation.tick);const turn=clamp(approach*.009,-.8,.8);a.spin=clamp(a.spin+turn*shareA,-1.2,1.2);b.spin=clamp(b.spin-turn*shareB,-1.2,1.2);simulation.contacts++;for(const body of [a,b])for(const port of body.ports||[])port.excitedUntil=(o.at||0)+t+.7;}}
  }
 }
 o.solidCache=null;
}
function asteroidSolids(o){const result=[];for(const [index,r] of obstacleForms(o).entries()){if(r.w<=0||r.h<=0)continue;const surface=asteroidSurface(o,r,index),stamp=Math.floor((time-(o.at||0))*60)+':'+(o.asteroidDynamics?.bodies[index]?.angle||0);if(surface.collisionStamp===stamp){for(const q of surface.collision)result.push({...q,x:q.x+r.x,y:q.y+r.y});continue;}const first=result.length,p=asteroidPose(o,index),cy=Math.cos(p.yaw),sy=Math.sin(p.yaw),cr=Math.cos(p.roll),sr=Math.sin(p.roll),cp=Math.cos(p.pitch),sp=Math.sin(p.pitch),cx=r.w/2,yy=r.h/2;
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
function stormLane(){
 const scene=sectors[level];
 // A shared art/encounter theme does not imply the same environmental hazard:
 // stellar magnetic scenes reuse the storm family but have no cloud corridor.
 if(scene.worldIdentity?.biome!=='storm'||scene.medium!=='air'||scene.stellar||!['up','down'].includes(scene.scrollAxis)||boss||bossDefeated||sectorBlend)return null;
 const cycle=Math.floor(time/14),phase=time%14;return time>10&&phase<3.2?{x:W*(.28+(cycle%3)*.23),warning:phase<2,phase}:null;
}
function drawSectorRule(){const wind=sectorCurrent();if(Math.abs(wind)>12){ctx.save();ctx.strokeStyle='#b4d5e5';ctx.globalAlpha=.14;ctx.lineWidth=1;for(let i=0;i<12;i++){const x=120+i*105,y=(i*137+world*.45)%H;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+Math.sign(wind)*30);ctx.stroke();}ctx.restore();}const lane=stormLane();if(lane){ctx.save();ctx.strokeStyle=lane.warning?'#c5a7e7':'#e8dfff';ctx.globalAlpha=lane.warning?.45:.85;ctx.lineWidth=lane.warning?2:7;ctx.setLineDash(lane.warning?[9,12]:[]);for(const side of lane.warning?[-1,1]:[0]){ctx.beginPath();for(let i=0;i<=20;i++){const x=lane.x+side*28+(lane.warning?0:Math.sin(i*7+time*35)*12),y=i*H/20;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}ctx.font='bold 11px sans-serif';ctx.fillStyle='#eee2ff';ctx.textAlign='center';ctx.fillText(lane.warning?'LIGHTNING BUILDING':'DISCHARGE',lane.x,60);ctx.restore();}}

// NASA VTAD reference meshes; conversion and credits: design/asteroids116.md.
const ASTEROID_REFERENCE_MESHES={"eros":{"p":[8539,-4978,-579,9243,-4788,-26,8653,-5071,16,9143,-4725,-630,8937,-4554,-1191,9418,-4206,-615,9217,-4078,-1179,9862,-3732,-60,9645,-4244,600,9618,-4310,-43,9872,-3637,583,8616,-4999,628,7924,-4968,1211,7967,-5087,643,8550,-4865,1211,-9248,-1990,699,-9682,-1779,208,-9315,-2065,217,-9613,-1702,700,-9633,-1803,-315,-9290,-2105,-294,-9908,-1462,179,-9934,-1006,-368,-9889,-1498,-347,-10000,-1000,148,-9946,-959,636,-9903,-463,135,-10000,-1000,148,-9871,-430,594,7985,-5129,50,7286,-5106,647,7297,-5156,66,6592,-5110,69,7222,-5084,-488,6553,-4985,-461,5215,-4411,-463,5829,-4504,-1005,5867,-4723,-458,5178,-4214,-1012,5926,-4765,1191,5255,-4628,605,5895,-4906,632,5313,-4486,1147,4150,-3912,1074,3392,-3674,513,4132,-4063,546,3490,-3529,1006,3483,-3714,-22,4075,-3859,-496,4125,-4045,0,3402,-3561,-527,1176,-2593,-229,1915,-3039,-663,2004,-3141,-153,1126,-2646,-719,1980,-2910,500,1251,-2267,284,36,-2216,289,-799,-2383,862,-799,-2380,488,67,-2026,860,-811,-2590,34,-35,-2559,-735,-6,-2489,-207,-1108,-2306,-689,-2709,-2246,-180,-2202,-2242,-679,-2212,-2280,-175,-2722,-2198,-661,-2202,-2249,304,-2684,-2172,834,-2704,-2262,309,-2156,-2156,805,-4750,-2357,369,-5614,-2327,962,-5580,-2516,431,-4755,-2241,919,-5540,-2230,-516,-4740,-2286,-142,-5558,-2432,-79,-4718,-2162,-598,-7698,-2534,82,-7026,-2532,-415,-7018,-2640,23,-7727,-2563,-347,-7096,-2363,981,-7711,-2517,536,-7055,-2576,499,-7723,-2309,990,-8516,-2346,-805,-8549,-2383,-309,-9202,-2107,-815,-8545,-2356,161,-8503,-2263,613,9981,-2189,-41,9937,-2916,563,10000,-3007,-60,9900,-2117,556,9482,-3580,-1224,9807,-2966,-634,9681,-3674,-642,9556,-2881,-1205,9333,-96,530,9388,-1076,1078,9722,-1110,566,8990,-107,1020,9729,-2175,-584,9880,-1171,-45,9703,-1212,-661,8543,797,988,8876,907,472,7952,1296,-1370,8988,785,-776,8597,514,-1263,8212,1623,-855,5627,1773,-1054,6718,1487,-1533,5398,1423,-1659,6940,1782,-955,8207,1854,440,7256,2384,1050,7992,1636,969,7121,2611,448,3515,2790,-684,4970,2804,112,4617,2388,-563,3825,2948,45,3397,2649,-2053,4415,2108,-1201,4330,1997,-1882,3407,2672,-1369,2847,2842,195,2632,2823,-564,2583,2841,-1289,1851,2885,-394,1141,3012,496,1936,2764,370,1159,3194,-197,1821,2918,-1132,1139,3255,-904,-60,4434,187,-844,4749,983,-92,4233,850,-816,5045,309,570,3808,-686,586,3756,21,-36,4498,-567,-1654,4281,1426,-2418,4457,788,-2442,4125,1320,-1633,4719,920,-1666,4978,-514,-1626,4948,273,-777,5156,-521,-3531,4192,771,-4731,3689,122,-4641,3649,678,-3583,4290,184,-4747,3704,-524,-3570,3874,-1151,-4625,3450,-1099,-3586,4155,-510,-5807,3123,620,-7074,2722,87,-7031,2685,614,-5888,3190,94,-5877,3180,-499,-6955,2540,1111,-8184,2047,625,-8048,1948,1100,-9127,1000,-330,-8035,1742,-911,-8905,904,-807,-8179,1883,-406,-9470,385,1040,-9092,1186,622,-9607,354,611,-8937,1186,1059,-9578,236,-340,-9367,199,-807,1675,-2027,2208,1107,-1858,1656,1858,-2333,1587,972,-1737,2380,1260,-1980,915,95,-1862,1528,4763,-3901,1540,4753,-4176,1100,4144,-3524,1471,4687,-4313,16,4715,-4312,570,4098,-3096,1940,3385,-3151,1431,3250,-2756,1936,4604,-3909,-1015,4637,-4155,-483,4007,-3643,-1043,-175,3947,1454,-1025,3920,2026,-308,3693,2059,-891,4366,1556,1121,2805,1181,324,3212,1950,1117,2693,1850,431,3372,1300,4261,2348,2292,3130,2413,1567,3071,2176,2260,4137,2802,1533,4869,2317,2262,5112,2938,1709,6878,1948,1701,5688,2037,2310,6416,1385,2247,6043,2566,1755,7589,1234,1597,8144,552,1536,9356,-1959,1580,8710,-1167,2037,9040,-1972,2034,9051,-1061,1547,9498,-2647,1616,9256,-3102,2091,9510,-3285,1647,9227,-2551,2036,9514,-4086,1200,8965,-4407,1705,9117,-4588,1198,9339,-3902,1706,8476,-4680,1713,7921,-4517,2126,7915,-4757,1683,8369,-4414,2104,7292,-4486,2133,6602,-4658,1649,7263,-4773,1685,6632,-4381,2133,5954,-4530,1657,6007,-4179,2111,363,-390,3194,-281,571,3522,-404,-410,3193,518,510,3494,2912,-125,3179,1850,-718,3086,2566,-1065,3001,2133,121,3455,1886,1964,3139,695,1440,3442,1598,1274,3478,913,2145,3118,2819,1876,3098,2063,2224,2422,238,-1123,2758,139,-1765,2262,1028,-1118,2822,1722,-1407,2657,1146,-438,3196,3722,-437,3414,3417,-1298,2973,5630,-268,3498,4530,-751,3545,5235,-1184,3547,4933,213,3467,2423,-1792,2515,3282,-2080,2475,4814,-2846,2633,4787,-3492,1982,4109,-2441,2578,3719,1759,3021,4538,1518,2967,6024,600,2905,5307,1168,2897,6279,-2937,3267,5472,-3265,2687,6097,-3642,2744,5610,-2500,3273,6946,-1391,3502,5900,-1679,3634,6571,-2207,3602,6302,-808,3560,8210,-441,1971,7376,-530,2898,7836,-1158,2641,7705,154,2093,8407,-1699,2653,7526,-3609,3066,6744,-3921,2712,7378,-4085,2624,6934,-3335,3205,8534,-2742,2846,7806,-3042,3304,8320,-3312,2998,8080,-2381,3167,8757,-3523,2615,9098,-3705,2165,8912,-2966,2492,7943,-4224,2540,8276,-4263,2429,8774,-2268,2499,8986,-2590,2350,-4629,-903,2703,-5524,-270,3007,-5554,-960,2682,-4572,-235,3148,-1640,-310,3230,-2426,-906,2672,-1746,-967,2614,-2326,-210,3179,-4722,-1924,1554,-5576,-1496,2152,-5603,-1940,1552,-4679,-1448,2143,-1865,-1510,1983,-2610,-1899,1466,-2019,-1897,1391,-2522,-1441,2057,-1415,1681,3441,-2224,692,3584,-1527,641,3602,-2105,1695,3451,-4494,588,3383,-5477,1240,3164,-5501,460,3294,-4417,1455,3259,-2557,2997,2307,-3412,3406,1757,-3421,2886,2266,-2483,3570,1792,-1177,3308,2391,-1733,3753,1874,-1848,3184,2347,-4377,2672,2141,-5615,2622,1525,-5558,2258,2009,-4380,3027,1567,-910,605,3586,-1026,-371,3214,-1527,641,3602,-1149,-1080,2614,-1281,-1623,1957,-1469,-1944,1355,-1646,-2176,793,-1705,-2261,302,-1730,-2347,-166,-1695,-2073,-1228,-1715,-2256,-685,-2182,-2041,-1193,-680,2484,3004,-803,1640,3427,-1305,2551,2929,-1983,2525,2961,-2697,2428,2940,-3783,-189,3177,-4494,588,3383,-3688,678,3427,-3919,-1418,2144,-3858,-851,2697,-3977,-2171,880,-3952,-1911,1552,-3973,-2294,334,-3970,-2266,-173,-4691,-2006,-1087,-3975,-2174,-632,-3977,-1963,-1100,-2824,1667,3400,-3500,2309,2858,-3589,1591,3350,-5525,1842,2641,-6804,1895,2021,-6675,1483,2538,-6901,2270,1588,-7971,1720,1616,-7444,607,2782,-8378,493,2290,-8258,243,2563,-7615,995,2431,-7378,82,2872,-8185,-165,2654,-6479,-987,2609,-7150,-1365,1903,-6461,-1472,2086,-7242,-1013,2477,-6452,-2299,947,-7122,-2003,1553,-6460,-1942,1537,-9559,-374,1430,-9761,-386,1030,-9279,284,1479,-9639,-843,1483,-9780,-899,1074,-9262,-1552,1499,-9740,-1318,1146,-9462,-1599,1142,-9533,-1247,1504,-7726,-1939,1482,-8431,-2096,1044,-8324,-1859,1460,-8096,-627,2583,-8848,-471,2309,-8731,-894,2257,-8185,-165,2654,-8848,-78,2238,-9054,169,1872,-9302,-302,1846,-8806,182,2152,-8274,-1577,1829,-8966,-1465,1814,-8676,-1580,1673,-8491,-1284,2108,-1823,4064,-1662,-1245,3735,-2170,-1999,3472,-2100,-1031,4358,-1770,-105,4381,-1297,-332,4172,-1850,-843,4792,-1257,-4520,3114,-1502,-3574,2890,-1904,-4455,2680,-1859,-3548,3407,-1536,-6794,2271,-1383,-5533,2369,-1789,-6587,1968,-1688,-5664,2747,-1465,975,3198,-2078,1812,2925,-1814,1767,2829,-2346,1093,3265,-1571,4213,1798,-2565,5196,1169,-2404,1712,2594,-2859,2495,2574,-2467,2415,2298,-2941,5014,856,-3102,6455,1119,-2147,6193,694,-2716,8146,-1326,-2013,8881,-2121,-1562,8309,-2122,-1961,8716,-1289,-1624,7647,56,-2065,8466,-452,-1674,7912,-549,-2038,8123,301,-1706,650,2228,-3113,1630,1859,-3289,835,3000,-2593,2878,-117,-3568,3776,322,-3400,3667,-437,-3560,2972,760,-3474,2030,-812,-3480,2768,-1025,-3474,2164,43,-3634,-764,-377,-3403,348,359,-3517,219,-487,-3440,-660,542,-3464,78,-1122,-3013,1235,-628,-3484,1129,-1302,-3059,1952,-1481,-2985,2694,-1731,-2976,-12,-2243,-1217,1072,-2233,-1847,1077,-2574,-1249,-41,-2000,-1853,3533,-1264,-3491,3425,-1990,-3054,2601,-2730,-1743,3360,-2571,-2442,3306,-3042,-1773,2644,-2287,-2370,1887,-2449,-1775,1907,-2030,-2394,4673,-141,-3303,5992,175,-2973,5738,-376,-3069,4831,354,-3273,7579,-747,-2297,7873,-1411,-2370,7329,-318,-2309,3055,1472,-3345,4035,1419,-3125,3894,908,-3339,3159,2072,-3082,4708,-3084,-2513,5466,-2760,-3006,5307,-3346,-2508,4828,-2474,-3061,4621,-3579,-1783,5232,-3799,-1744,2361,1705,-3393,5396,-1034,-3313,6662,-558,-2748,6264,-1247,-3121,6412,-4344,-1717,6962,-4011,-2297,7003,-4508,-1715,6411,-3820,-2337,5807,-4117,-1752,5865,-3582,-2422,8280,-3989,-2064,8854,-3874,-1717,8582,-4250,-1689,8422,-3673,-2147,8130,-4487,-1711,8371,-4820,-1158,9093,-2773,-1757,9498,-2132,-1160,7806,-3073,-2639,8202,-2638,-2455,8178,-3135,-2429,7771,-2607,-2679,6853,-2073,-3028,7505,-1500,-2594,7646,-2140,-2678,6942,-1405,-2869,7658,-3612,-2539,7948,-4079,-2169,7504,-4113,-2231,8050,-3625,-2376,6613,-3398,-2751,7294,-3033,-2828,7154,-3540,-2655,6809,-3009,-2938,5876,-2077,-3243,7078,-2570,-2959,6386,-2649,-3117,6613,-3398,-2751,6049,-3094,-2884,-1680,-1451,-2467,-936,-1017,-2998,-1090,-1496,-2476,-1542,-940,-2966,-3316,-1323,-2398,-2648,-797,-2878,-2718,-1347,-2406,-3275,-748,-2858,-3950,-741,-2836,-3222,-78,-3181,-3275,-748,-2858,-3929,-57,-3103,-1385,-295,-3361,-1271,637,-3388,-2463,727,-3235,-1640,1626,-2953,-1800,696,-3281,-2336,1591,-2922,-3165,734,-3181,-3891,707,-3100,-1443,2705,-2563,-2154,2522,-2451,-3678,2151,-2295,-4498,2037,-2290,-892,2686,-2681,-1120,1592,-3057,-6407,1522,-2019,-5415,1204,-2544,-6268,1051,-2398,-5462,1814,-2180,-2182,-1833,-1850,-1704,-1858,-1878,-2158,-1394,-2430,-3332,-1832,-1826,-2733,-2070,-1174,-3320,-2083,-1154,-2736,-1804,-1821,-4664,-1756,-1728,-3976,-1786,-1788,-6242,-1478,-2041,-5473,-1741,-1570,-6295,-1844,-1471,-5432,-1288,-2076,-4623,648,-2923,-5366,532,-2610,-4573,1335,-2702,-6151,-216,-2658,-5402,-748,-2514,-6186,-895,-2445,-5385,-114,-2813,-7689,-1743,-1905,-7014,-2042,-1434,-7719,-2152,-1376,-6989,-1637,-1992,-6944,-424,-2523,-6964,-1084,-2390,-7059,834,-2235,-6197,455,-2650,-6975,231,-2396,-7851,760,-1807,-7622,574,-2023,-7215,1203,-1938,-7730,1615,-1284,-8514,910,-1194,-9014,-2001,-1324,-8254,-1800,-1808,-8405,-2154,-1360,-8715,-1705,-1747,-9056,292,-1209,-9031,-280,-1557,-9433,-320,-1226,-8626,312,-1519,-9557,-873,-1254,-9301,-1246,-1541,-9556,-1378,-1280,-9278,-808,-1635,-9767,-1480,-852,-9364,-1735,-1312,-9563,-1829,-842,-8221,189,-1897,-8127,916,-1530,-9278,-808,-1635,-8507,-424,-1982,-8836,-996,-1958,-8101,-1439,-2096,-7665,-1246,-2236,7884,-5080,-522,7745,-4896,-1084,9217,-4078,-1179,9418,-4206,-615,9618,-4310,-43,9514,-4086,1200,9715,-3466,1168,9645,-4244,600,9103,-4575,569,-9109,-1893,1133,-9886,-1409,690,-9826,-457,-366,-9934,-1006,-368,-9781,-977,-856,-9686,-428,-848,-9781,-977,-856,-9946,-959,636,-9780,-899,1074,7260,-4980,1208,6593,-5066,644,6593,-4913,1195,7123,-4859,-1039,6494,-4755,-1011,5897,-4871,56,5268,-4541,44,2397,-3298,545,2477,-3139,988,2539,-3296,-78,2683,-3282,-573,3318,-3348,-1071,2612,-3039,-1096,1885,-2801,-1172,1986,-2673,1001,-1093,-2074,-1226,-3287,-2178,-646,-3258,-2269,-184,-3259,-2181,862,-3254,-2271,315,-6397,-2593,477,-6346,-2660,-36,-6338,-2421,-473,-6335,-2123,-895,-5512,-1998,-974,-7747,-2424,-801,-7036,-2327,-857,9738,-2782,1131,9651,-2033,1096,9558,-123,-57,9322,-1261,-1192,9000,-373,-1195,9406,-230,-689,9138,947,-113,8340,1820,-229,7118,2051,-360,5875,2172,-477,6145,2682,319,6283,2821,1031,5222,3106,913,4109,3078,814,3068,2697,923,2025,2538,1098,2560,2779,-1965,518,3566,663,469,3792,-1364,-2460,4749,225,-1692,4556,-1184,-2538,4699,-534,-2568,4268,-1189,-3448,3896,1281,-4516,3504,1198,-5695,2959,1100,-5776,2993,-1047,-7044,2664,-478,-6959,2494,-1000,-8261,2030,124,-9173,1089,177,-9606,253,167,2378,-2798,1521,2321,-2410,1978,-472,-1841,2007,-702,-2124,1492,5358,-4244,1596,5398,-3900,2068,-523,3227,2554,158,2907,2547,1072,2536,2504,2069,2355,1764,7112,707,2190,8582,-202,1456,9339,-3902,1706,8762,-4209,2167,9098,-3705,2165,1351,410,3396,518,510,3494,1351,410,3396,-281,571,3522,-158,1577,3427,3318,826,3472,2133,121,3455,2912,-125,3179,2466,1057,3503,-5,2352,3080,-530,-1144,2618,4530,-751,3545,4246,-1605,3090,3722,-437,3414,4137,537,3442,5235,-1184,3547,4928,-2050,3223,5900,-1679,3634,6727,7,2943,6571,-2207,3602,7224,-2699,3493,7539,-1954,3354,7224,-2699,3493,8064,-3846,2860,7806,-3042,3304,8320,-3312,2998,8757,-3523,2615,8459,-4012,2547,-6496,-369,2950,-3133,-859,2722,-3044,-166,3195,-3203,-1420,2145,-3238,-1883,1522,-2947,718,3548,-2224,692,3584,-2947,718,3548,-6550,965,2990,-6512,295,3100,-6512,295,3100,-5501,460,3294,-910,605,3586,-3688,678,3427,-4397,2160,2765,-8779,973,1529,-7842,1384,2077,-8607,702,1966,-7326,-469,2783,-7378,82,2872,-7927,-1094,2330,-7764,-1539,1971,-9639,-843,1483,-9251,-1149,1869,-9359,-741,1868,-9359,-741,1868,-8860,-1697,1422,-8848,-471,2309,-2678,3776,-1673,-2782,3157,-2027,262,3721,-1879,-621,3699,-2284,3,3463,-2385,3318,2492,-2656,7616,960,-1859,7250,545,-2264,494,1234,-3308,1537,999,-3524,-527,1501,-3196,-295,2563,-2850,4496,-777,-3457,4294,-1499,-3428,1388,176,-3622,2287,909,-3567,-28,-1586,-2436,1129,-1302,-3059,1071,-1838,-2479,78,-1122,-3013,-936,-1017,-2998,2694,-1731,-2976,1952,-1481,-2985,-1115,-1878,-1882,4151,-2230,-3100,4151,-2230,-3100,4067,-2830,-2506,3425,-1990,-3054,4011,-3300,-1778,6964,14,-2487,8040,-2130,-2341,7381,-950,-2500,7097,-769,-2571,5031,-1770,-3423,4828,-2474,-3061,5466,-2760,-3006,7590,-4561,-1693,8422,-3673,-2147,9051,-3414,-1761,8854,-3874,-1717,8527,-3232,-2135,8402,-2404,-2084,7658,-3612,-2539,8050,-3625,-2376,7154,-3540,-2655,6049,-3094,-2884,-2060,-885,-2943,-2060,-885,-2943,-1542,-940,-2966,-1929,-208,-3282,-2557,-130,-3215,-2648,-797,-2878,-3957,-1292,-2356,-3950,-741,-2836,-4641,-1274,-2271,-4648,-732,-2729,-4648,-732,-2729,-4629,-48,-2909,-3061,1478,-2782,-3812,1435,-2797,-2908,2293,-2328,-5402,-748,-2514,-6186,-895,-2445,-6964,-1084,-2390,-7833,-669,-2335,-7665,-1246,-2236,-7716,75,-2205,-7428,1480,-1627,-9557,-873,-1254,-9077,-1484,-1673,-8353,-1237,-2090,-8353,-1237,-2090,-8836,-996,-1958],"uv":[7140,8660,7317,8911,7339,8695,7111,8877,6903,8821,7058,9102,6817,9015,2817,564,3066,249,2748,284,3101,551,7543,8685,7734,8453,7544,8469,7745,8663,7520,1575,7363,1415,7364,1565,7529,1423,7193,1434,7203,1579,7357,1283,7142,1121,7177,1302,7352,1104,3084,9840,2885,9590,2853,9834,3086,9597,7350,8475,7543,8247,7354,8252,7355,8024,7173,8227,7178,8004,7159,7503,6965,7726,7169,7757,6948,7469,7732,7794,7542,7553,7541,7790,7738,7564,7753,7086,7550,6763,7544,7090,7760,6785,7334,6795,7138,7029,7336,7078,7127,6738,7293,5710,7091,6086,7303,6147,7069,5697,7586,6106,7562,5695,7530,5190,7722,4813,7567,4826,7779,5188,7360,4836,7057,5179,7289,5182,7042,4706,7248,4018,7043,4239,7259,4230,7044,4018,7465,4225,7680,4007,7455,4011,7684,4232,7438,3164,7658,2820,7447,2836,7663,3155,7069,2870,7232,3178,7252,2853,7042,3195,7318,2104,7143,2327,7297,2332,7178,2094,7635,2291,7466,2099,7458,2316,7628,2080,7040,1829,7197,1826,7042,1606,7346,1826,7495,1830,2959,1166,3140,852,2889,862,3183,1157,2317,768,2659,934,2561,647,2430,1040,3276,1862,3445,1533,3236,1514,3463,1885,2747,1228,3025,1514,2819,1559,3470,2200,3290,2189,2771,2510,2929,2190,2741,2221,2948,2490,2784,3241,2667,2869,2544,3282,2875,2841,3297,2508,3496,2782,3467,2493,3340,2857,3020,4026,3265,3498,3000,3607,3282,3892,2526,4105,2758,3665,2519,3707,2767,4081,3371,4251,3088,4353,2817,4388,3172,4648,3515,4916,3468,4596,3249,4934,2890,4674,2986,4955,3332,5521,3521,5788,3538,5522,3328,5787,3071,5233,3308,5223,3112,5518,3703,6031,3482,6256,3679,6289,3503,6008,3103,5992,3314,5997,3131,5771,3452,6619,3206,7052,3407,7041,3257,6612,2978,7034,2789,6608,2753,7004,3024,6609,3355,7507,3099,7962,3289,7978,3156,7504,2940,7479,3477,8001,3229,8443,3409,8447,2811,8901,2659,8388,2618,8842,2853,8427,3305,9236,3171,8888,3126,9256,3342,8869,2745,9238,2548,9168,8377,5862,8146,5601,8088,5977,8460,5527,7841,5669,8065,5179,7938,7309,7746,7332,7960,7033,7339,7312,7543,7329,8202,6968,7977,6696,8226,6597,6931,7226,7148,7271,6914,6973,3751,5533,3925,5829,3972,5580,3720,5792,3784,4906,4023,5292,4053,4916,3775,5240,4103,3617,3916,4094,4209,4075,3796,3715,4048,3403,3770,3393,3744,2785,4025,3106,4042,2777,3756,3097,3723,2473,3693,2195,3625,1205,3871,1557,3842,1219,3648,1560,3614,923,3847,730,3617,647,3821,970,7839,9117,7963,8830,7769,8881,8062,9051,7924,8638,8074,8450,7905,8449,8087,8607,8078,8237,7899,8010,7900,8233,8087,8010,7907,7789,8104,7784,9084,5159,9453,4830,9026,4844,9480,5154,9395,6175,9059,5801,8980,6129,9455,5833,4659,4533,5026,5029,5034,4594,4657,4978,4597,4123,4317,4491,8721,5166,8377,5173,8792,5495,8708,5815,9124,5484,9390,6537,8973,6501,4896,2579,5416,2857,5359,2427,4912,2961,8605,6148,8580,6532,8513,7228,8163,7275,8565,6907,4513,3742,4465,3392,4437,2700,4430,3059,8731,7801,8454,7521,8400,7785,8824,7509,4786,1810,5284,1996,5154,1572,4862,2193,3902,1882,4354,2015,4261,1704,3968,2160,4174,1397,8534,8300,8346,8030,8298,8257,8628,8071,4298,953,4733,919,4477,714,4499,1176,4210,559,3934,439,4081,812,8248,8456,8208,8570,4077,1125,3992,970,8556,3147,8798,2764,8499,2787,8877,3140,8999,4333,8629,4043,8623,4329,8989,4047,7944,3157,8208,2806,7923,2816,8245,3154,8268,4313,7971,4020,7962,4271,8287,4035,4963,6009,5397,6439,5460,6094,4932,6317,5106,7541,4611,7809,4924,8005,4742,7342,4194,6414,3886,6680,4152,6745,3921,6345,4170,5886,3925,6077,4185,6139,4080,7122,3757,7553,3989,7610,3829,7064,9437,4573,9007,4587,9418,4322,8617,4585,8253,4567,7957,4507,7689,4451,7476,4438,7269,4440,6798,4452,7042,4446,6810,4246,4570,5683,4986,5732,4532,5942,4530,6220,4519,6514,8932,3453,9223,3131,9299,3450,8276,3458,8598,3455,7670,3470,7964,3464,7440,3482,7232,3493,6836,3211,7040,3497,6830,3499,4883,6634,4470,6845,4824,6973,4287,7694,3890,8114,4155,8179,3674,8055,3612,8499,4275,8671,3932,8974,4090,9027,4048,8606,4468,8823,4232,9158,8431,2436,8110,2224,8166,2474,8349,2154,7649,2515,7864,2259,7900,2496,3478,9551,3282,9577,3500,9245,3512,9770,3307,9811,7815,1513,7707,1316,7687,1453,7848,1373,7833,2052,7648,1836,7811,1848,8426,1800,8350,1484,8216,1596,8593,1708,3900,9292,3694,9245,3684,9476,3841,9185,7972,1836,7942,1594,7901,1704,8095,1729,2682,6029,2512,5831,2446,6084,2739,5784,2899,5524,2717,5571,2927,5756,2561,6991,2356,6666,2353,7001,2581,6629,2534,7881,2355,7422,2360,7848,2546,7431,2548,5029,2631,4690,2426,4705,2739,4986,2263,3742,2262,3316,2211,4708,2365,4418,2157,4425,1972,3337,2421,2898,2161,2918,2159,1872,2281,1445,2049,1583,2379,1745,2349,2357,2470,2033,2271,2144,2546,2289,1972,5075,1886,4674,2336,5066,1238,3966,1557,3685,1242,3599,1597,4052,814,4226,835,3864,1206,4282,797,5560,1176,5085,786,5095,1214,5532,405,5133,803,4611,406,4591,407,4158,422,3757,6809,5171,6533,5633,6831,5667,6518,5147,882,3492,488,3365,6587,6315,6263,6595,6592,6631,6271,6280,6562,5993,6249,5957,1555,3272,1940,2889,1708,2851,1758,3313,2109,2187,2000,1937,2160,2360,1873,4111,2007,3760,1790,3736,2110,4141,6264,7173,5975,7427,6288,7430,5934,7147,6611,7195,6633,7444,1878,4386,1390,2824,1888,2509,1541,2474,6696,7922,6438,8110,6715,8140,6395,7891,6664,7689,6338,7664,6494,8618,6578,8874,6675,8721,6382,8703,6712,8538,6939,8609,2175,1186,2531,1315,1512,1425,1777,1471,1659,1289,1621,1604,1453,2057,1851,2017,1707,1791,1695,2215,6247,8379,6485,8482,6475,8315,6297,8545,951,1648,1325,1596,1122,1418,1155,1756,1151,2379,1380,1829,1124,2025,6152,7943,6061,7692,6215,4442,5917,4730,6211,4686,5920,4482,6227,3768,5926,4027,6223,4012,5928,3772,752,7136,1004,6706,662,6812,1081,7022,829,5851,1248,5799,1316,6320,1696,5963,1283,6032,1695,6242,1356,6621,1403,6928,2134,5889,2093,6158,2052,6749,2065,7068,2120,5684,1672,5751,2138,7844,1815,7505,1890,7856,2095,7454,6522,4244,6511,4443,6220,4244,6537,3768,6822,4016,6829,3772,6530,4013,6559,3226,6543,3506,6413,2579,6612,2898,6678,2576,6336,2904,1466,7244,1541,7583,1754,7156,1356,8034,962,7837,1070,8212,1259,7687,6575,2038,6746,2306,6811,2062,6490,2291,1447,8402,1187,8584,1962,8188,1629,7926,1714,8275,2156,8498,2014,8451,2160,8185,2496,8303,2454,8707,6878,1644,6654,1847,6851,1839,6690,1688,2389,9029,2141,9168,2311,9322,2234,8875,6755,1212,6714,1414,6846,1377,6583,1302,7006,1338,6872,1508,7028,1467,2031,8752,2309,8567,2024,9414,1877,9007,1770,9298,6479,1859,6345,2002,7162,8443,6966,8399,2195,532,2463,386,7314,9141,3386,273,3378,584,7580,9156,7545,8912,7667,1604,7537,1287,2671,9537,2612,9785,2384,9696,2467,9454,6940,1165,7552,1113,7745,1152,7729,8236,7541,8023,7727,8018,6976,8189,6980,7972,7349,7783,7344,7538,7573,6336,7765,6346,7321,6377,7114,6423,6898,6675,6882,6359,6857,6035,7813,6074,6793,4706,7043,3781,7239,3787,7677,3767,7447,3780,7456,2540,7278,2559,7106,2568,6919,2572,6871,2885,7024,2077,6976,2316,3389,877,3408,1174,3081,1856,2610,1627,2681,1929,2882,1879,3115,2177,3120,2480,3073,2817,3016,3190,3307,3130,3521,3079,3526,3404,3536,3755,3648,4143,3764,4541,2566,4405,3538,5221,2842,5271,3290,6236,2886,5994,3068,6243,2835,6263,3650,6632,3605,7030,3550,7511,2727,7451,2899,7937,2702,7914,3050,8445,3002,8913,2946,9271,8012,6261,8252,6181,8245,4924,7996,4839,7918,7560,8127,7547,4223,5640,4291,5351,4333,4938,4037,4506,4025,2443,3662,1905,3666,341,8144,8755,8267,8953,9495,5496,5491,5060,5477,4630,5495,5467,5001,5435,5010,3753,5528,4207,5540,3764,5039,4170,4619,5392,8631,4847,9377,6892,8967,6870,5487,3305,4971,3350,9294,7214,8904,7198,9196,7536,4421,2339,9061,7853,8910,8149,4666,1453,4965,1191,8422,8497,8775,8397,8623,8614,8456,8802,8299,8645,8700,2389,8630,3750,8976,3751,8298,3749,7977,3757,5313,6792,9396,4038,9365,3747,4436,8271,4693,8448,8966,2336,9112,2733,5489,5785,5218,7155,4392,7215,3542,8910,3824,8561,3748,8961,8581,2076,8793,2003,8244,1908,8050,2007,7919,1219,7999,1454,8098,1322,3728,9677,7797,1659,3991,9451,2618,6308,2381,6366,2662,5336,2503,5627,2454,5401,2318,4129,2576,2546,2363,2576,1564,5080,1531,4636,1635,5506,2076,5455,1277,3213,951,3127,1180,4621,1567,4332,6217,5130,5894,5581,6220,5600,5909,5146,429,5648,5938,6238,5919,5923,6506,4690,578,2988,5914,6858,6252,6899,5925,6550,6596,6932,2143,2546,1884,1669,1979,2196,1953,2324,1031,2778,667,2634,761,2295,6728,8347,1672,966,2054,939,1916,737,1818,1140,1979,1475,1313,1233,1490,1104,6201,8171,841,1958,5922,4269,513,6214,469,5955,873,6109,933,6403,581,6506,6238,3507,5942,3498,6266,3229,5978,3214,855,7467,1170,7344,1701,6543,1719,6845,2058,6453,6052,2904,6129,2589,6221,2276,1579,8807,1316,8914,1833,8589,2338,8217,2203,9560,6703,1540,1527,9182,6440,1737,6472,1511],"i":[0,1,2,3,1,0,4,5,3,6,5,4,7,8,9,7,10,8,11,12,13,14,12,11,15,16,17,18,16,15,17,19,20,16,19,17,21,22,23,24,22,21,25,26,27,28,26,25,29,30,31,13,30,29,32,33,31,34,33,32,35,36,37,35,38,36,39,40,41,42,40,39,43,44,45,46,44,43,47,48,49,47,50,48,51,52,53,51,54,52,55,51,53,56,51,55,57,58,59,57,60,58,61,62,63,64,62,61,65,66,67,68,66,65,69,70,71,72,70,69,73,74,75,76,74,73,77,78,79,77,80,78,81,82,83,84,82,81,85,86,87,85,88,86,20,89,90,20,91,89,86,92,81,93,92,86,94,95,96,94,97,95,98,99,100,101,99,98,102,103,104,102,105,103,106,107,94,108,107,106,102,109,105,110,109,102,111,112,113,111,114,112,115,116,117,115,118,116,119,120,121,122,120,119,123,124,125,126,124,123,127,128,129,127,130,128,131,123,132,131,126,123,133,123,130,133,132,123,134,135,136,137,135,134,138,137,134,139,137,138,140,141,142,143,141,140,144,140,145,146,140,144,147,148,149,150,148,147,143,151,152,143,153,151,154,155,156,154,157,155,158,159,160,161,159,158,162,163,164,162,165,163,155,166,165,155,158,166,167,168,169,167,164,168,170,171,172,173,171,170,174,175,176,177,175,174,178,172,179,170,172,178,180,181,182,183,181,180,184,185,60,181,185,184,186,43,187,186,188,43,45,189,190,45,49,189,191,192,188,191,193,192,48,194,195,48,196,194,197,198,199,197,200,198,201,202,203,204,202,201,205,206,207,208,206,205,209,208,205,210,208,209,211,212,213,214,212,211,109,215,216,121,215,109,217,218,219,220,218,217,221,222,223,221,224,222,225,226,227,225,228,226,229,230,231,232,230,229,233,234,235,233,236,234,236,237,234,236,238,237,239,240,241,242,240,239,243,244,245,243,246,244,247,248,249,247,250,248,207,247,251,207,252,247,183,253,254,255,253,183,244,255,256,244,257,255,258,245,259,258,243,245,260,261,262,260,263,261,259,264,265,259,245,264,266,191,267,266,268,191,209,269,270,209,205,269,271,263,260,271,272,263,273,274,275,273,276,274,277,278,279,277,280,278,281,282,283,281,284,282,218,283,285,281,283,218,286,287,288,286,289,287,290,291,292,290,293,291,222,294,295,222,296,294,232,297,230,298,297,232,224,299,300,219,299,224,301,302,303,304,302,301,305,306,307,305,308,306,309,310,311,312,310,309,313,314,315,313,316,314,317,318,319,317,320,318,321,322,323,324,322,321,325,326,327,328,326,325,329,330,331,198,330,329,332,333,334,332,335,333,336,305,337,336,338,305,339,313,340,339,307,313,341,72,342,341,315,72,343,67,344,343,69,67,66,345,346,347,345,66,348,317,349,348,350,317,351,325,352,331,325,351,353,354,304,355,354,353,356,301,312,357,301,356,358,309,76,359,309,358,78,360,73,78,361,360,362,363,80,362,364,363,365,366,367,352,366,365,368,369,370,334,369,368,371,169,372,371,167,169,373,374,375,373,376,374,377,375,378,373,375,377,379,380,381,379,382,380,383,384,85,385,384,383,386,174,387,388,174,386,389,387,390,386,387,389,391,392,393,394,392,391,395,396,88,395,397,396,398,399,400,401,399,398,402,403,404,405,403,402,406,407,408,409,407,406,410,411,412,410,413,411,413,414,415,416,414,413,417,418,419,417,420,418,421,422,423,424,422,421,425,426,427,425,428,426,429,117,430,429,129,117,431,432,433,431,427,432,434,435,436,430,435,434,437,438,439,437,440,438,441,442,443,441,444,442,445,431,446,447,431,445,448,449,450,451,449,448,452,448,453,454,448,452,455,456,457,458,456,455,459,460,461,457,460,459,462,453,463,452,453,462,464,465,466,467,465,464,463,468,469,453,468,463,470,471,472,473,471,470,474,473,470,475,473,474,476,477,478,479,477,476,480,437,481,480,443,437,482,443,480,482,441,443,483,484,485,483,486,484,487,488,489,490,488,487,491,489,492,487,489,491,493,486,483,433,486,493,494,495,496,478,495,494,497,498,499,500,498,497,501,500,497,502,500,501,503,504,505,506,504,503,507,4,508,507,505,4,509,510,101,438,510,509,511,512,513,514,512,511,515,516,517,518,516,515,519,520,521,519,522,520,523,524,525,526,524,523,527,528,529,527,515,528,502,530,500,531,530,502,532,533,534,535,533,532,536,537,538,539,537,536,540,541,542,543,541,540,544,458,455,545,458,544,546,547,548,549,547,546,543,550,541,551,550,543,412,552,553,412,411,552,419,554,555,419,418,554,547,556,557,552,556,547,558,559,560,558,561,559,562,532,563,564,532,562,565,566,567,565,568,566,569,364,362,569,570,364,571,572,573,571,574,572,559,575,576,559,577,575,578,579,580,578,581,579,582,583,584,582,585,583,586,580,587,586,578,580,588,589,590,588,560,589,591,588,592,593,588,591,172,594,595,171,594,172,596,597,598,599,597,596,600,601,602,600,603,601,604,605,606,604,607,605,608,609,610,608,606,609,603,591,611,612,591,603,613,614,615,601,614,613,616,582,597,616,617,582,618,2,29,0,2,618,619,0,618,619,508,0,508,3,0,4,3,508,620,100,621,98,100,620,621,7,9,100,7,621,3,622,1,5,622,3,10,623,8,10,624,623,625,227,626,625,225,227,622,626,1,622,625,626,2,13,29,2,11,13,1,11,2,1,626,11,626,14,11,626,227,14,627,18,15,393,18,627,393,628,18,392,628,393,18,21,16,628,21,18,16,23,19,21,23,16,19,608,610,23,608,19,20,610,91,19,610,20,27,629,630,26,629,27,629,631,630,629,632,631,22,608,23,22,633,608,628,24,21,634,24,628,392,634,628,635,634,392,390,28,25,387,28,390,13,636,30,12,636,13,636,637,30,636,638,637,30,32,31,30,637,32,34,639,33,640,639,34,33,619,618,639,619,33,33,29,31,33,618,29,37,640,34,37,36,640,641,34,32,641,37,34,642,37,641,642,35,37,40,641,41,40,642,641,637,641,32,41,641,637,638,41,637,39,41,638,46,643,44,644,643,46,44,645,47,643,645,44,44,49,45,44,47,49,645,50,47,645,646,50,646,647,50,646,648,647,50,196,48,50,647,196,54,649,52,54,466,649,52,648,646,52,649,648,53,646,645,53,52,646,643,53,645,55,53,643,644,55,643,650,55,644,650,56,55,184,56,650,63,59,61,57,59,63,56,63,51,56,57,63,184,57,56,184,60,57,64,464,62,651,464,64,62,466,54,62,464,466,51,62,54,63,62,51,652,65,653,652,68,65,652,566,68,567,566,652,68,347,66,566,347,68,71,654,655,70,654,71,653,71,655,65,71,653,69,65,67,71,65,69,75,383,656,74,383,75,657,75,656,79,75,657,79,73,75,78,73,79,658,79,657,658,77,79,659,77,658,659,660,77,660,80,77,660,362,80,661,82,84,661,662,82,662,658,82,662,659,658,82,657,83,82,658,657,87,81,83,86,81,87,656,83,657,656,87,83,656,85,87,383,85,656,90,661,84,90,89,661,81,90,84,92,90,81,92,20,90,17,20,92,88,93,86,396,93,88,396,15,93,627,15,396,93,17,92,15,17,93,97,663,95,97,664,663,95,624,10,95,663,624,96,10,7,96,95,10,101,106,99,510,106,101,99,94,96,106,94,99,100,96,7,99,96,100,104,664,97,104,103,664,107,97,94,107,104,97,665,104,107,665,102,104,510,108,106,666,108,510,667,108,666,667,668,108,668,107,108,668,665,107,669,102,665,669,110,102,670,110,669,670,119,110,110,121,109,119,121,110,114,669,112,114,670,669,112,665,668,112,669,665,113,668,667,113,112,668,115,671,118,672,671,115,118,670,114,671,670,118,116,114,111,118,114,116,671,119,670,671,122,119,672,122,671,673,122,672,122,674,120,673,674,122,126,675,124,676,675,126,124,674,673,675,674,124,125,673,672,124,673,125,130,125,128,130,123,125,128,672,115,125,672,128,129,115,117,129,128,115,131,134,136,132,134,131,677,136,678,131,136,677,676,131,677,676,126,131,679,130,127,679,133,130,426,133,679,426,138,133,133,134,132,138,134,133,137,680,135,145,680,137,135,204,201,680,204,135,136,201,678,135,201,136,426,139,138,428,139,426,681,139,428,681,144,139,139,145,137,144,145,139,142,200,197,141,200,142,680,197,204,142,197,680,145,142,680,140,142,145,414,144,681,414,146,144,416,146,414,416,153,146,146,143,140,153,143,146,200,150,147,141,150,200,141,152,150,143,152,141,150,682,148,152,682,150,151,416,683,151,153,416,684,683,685,684,151,683,682,151,684,152,151,682,686,156,687,686,154,156,149,154,686,148,154,149,148,157,154,148,682,157,155,161,158,157,161,155,157,684,161,682,684,157,161,685,159,684,685,161,688,164,167,688,162,164,687,162,688,687,156,162,156,165,162,156,155,165,166,160,689,158,160,166,690,689,691,166,689,690,163,166,690,165,166,163,168,163,692,164,163,168,175,692,693,168,692,175,169,175,177,169,168,175,693,173,170,692,173,693,692,690,173,163,690,692,173,691,171,690,691,173,176,693,694,175,693,176,28,694,26,176,694,28,387,176,28,174,176,387,178,632,629,178,179,632,694,629,26,694,178,629,694,170,178,693,170,694,182,184,650,181,184,182,695,650,644,182,650,695,696,182,695,180,182,696,181,254,185,183,254,181,185,697,698,254,697,185,60,698,58,60,185,698,699,187,42,186,187,699,700,186,699,700,267,186,267,188,186,267,191,188,190,642,40,190,189,642,42,190,40,187,190,42,187,45,190,43,45,187,193,695,192,193,696,695,192,644,46,695,644,192,188,46,43,188,192,46,195,38,35,195,194,38,189,35,642,189,195,35,49,195,189,49,48,195,199,329,701,199,198,329,202,701,702,199,701,202,204,199,202,197,199,204,203,702,703,202,702,203,704,703,252,203,703,704,678,203,704,201,203,678,208,677,206,208,676,677,206,678,704,677,678,206,206,252,207,206,704,252,214,209,212,214,210,209,674,210,214,675,210,674,210,676,208,675,676,210,215,213,705,211,213,215,121,211,215,120,211,121,120,214,211,674,214,120,216,705,284,215,705,216,706,284,281,216,284,706,105,216,706,109,216,105,103,217,664,103,220,217,103,706,220,105,706,103,220,281,218,706,281,220,663,223,624,663,221,223,664,221,663,664,217,221,217,224,221,217,219,224,624,707,623,624,223,707,223,295,707,223,222,295,228,708,226,228,709,708,14,231,12,229,231,14,227,229,14,227,226,229,226,232,229,226,708,232,235,638,636,235,234,638,12,235,636,231,235,12,230,235,231,230,233,235,238,699,237,238,700,699,237,42,39,699,42,237,234,39,638,234,237,39,710,239,257,710,242,239,249,711,712,249,248,711,248,713,711,248,714,713,715,716,717,715,718,716,718,712,716,718,249,712,246,257,244,246,710,257,252,250,247,252,703,250,703,719,250,703,702,719,250,714,248,250,719,714,251,249,718,251,247,249,269,718,715,269,251,718,269,207,251,205,207,269,255,239,253,257,239,255,253,241,720,239,241,253,254,720,697,253,720,254,256,183,180,256,255,183,264,180,696,264,256,180,245,256,264,245,244,256,721,259,722,721,258,259,263,723,261,263,724,723,724,717,723,724,715,717,725,722,726,725,721,722,727,726,276,727,725,726,280,262,278,280,260,262,265,696,193,265,264,696,268,193,191,268,265,193,722,265,268,722,259,265,274,267,700,274,266,267,276,266,274,276,726,266,726,268,266,726,722,268,270,715,724,270,269,715,272,724,263,272,270,724,212,270,272,212,209,270,728,260,280,728,271,260,705,271,728,705,213,271,213,272,271,213,212,272,275,700,238,275,274,700,287,238,236,287,275,238,289,275,287,289,273,275,729,276,273,729,727,276,730,273,289,730,729,273,731,279,732,731,277,279,284,728,282,284,705,728,282,280,277,282,728,280,283,277,731,283,282,277,285,731,293,285,283,731,299,293,290,299,285,293,219,285,299,218,285,219,288,236,233,288,287,236,297,233,230,297,288,233,733,288,297,733,286,288,293,732,291,293,731,732,734,289,286,734,730,289,735,286,733,735,734,286,296,292,294,296,290,292,736,733,737,736,735,733,709,737,708,709,736,737,708,298,232,708,737,298,737,297,298,737,733,297,300,290,296,300,299,290,224,296,222,224,300,296,303,738,379,302,738,303,303,381,310,303,379,381,312,303,310,301,303,312,308,739,306,308,740,739,306,741,316,306,739,741,307,316,313,307,306,316,310,385,311,310,381,385,311,383,74,311,385,383,76,311,74,309,311,76,316,742,314,316,741,742,70,742,654,314,742,70,72,314,70,315,314,72,320,743,318,320,365,743,744,740,308,744,745,740,338,308,305,338,744,308,323,746,747,322,746,323,302,748,738,749,748,302,304,749,302,354,749,304,328,686,326,149,686,328,326,687,335,686,687,326,327,335,332,326,335,327,198,147,330,200,147,198,330,149,328,147,149,330,331,328,325,330,328,331,335,688,333,335,687,688,333,167,371,333,688,167,334,371,369,333,371,334,240,337,241,240,336,337,714,750,713,714,349,750,349,319,750,349,317,319,720,340,697,720,339,340,241,339,720,241,337,339,337,307,339,337,305,307,698,342,58,698,341,342,697,341,698,697,340,341,340,315,341,340,313,315,59,344,61,343,344,59,58,343,59,342,343,58,342,69,343,342,72,69,346,651,64,345,651,346,344,64,61,346,64,344,67,346,344,66,346,67,719,349,714,719,348,349,702,348,719,702,701,348,701,350,348,701,329,350,320,352,365,351,352,320,350,320,317,350,351,320,350,331,351,329,331,350,740,355,353,745,355,740,743,367,751,365,367,743,751,324,321,367,324,751,739,356,741,739,357,356,740,357,739,740,353,357,357,304,301,353,304,357,654,359,358,742,359,654,742,356,359,741,356,742,359,312,309,356,312,359,361,655,360,361,653,655,655,358,360,654,358,655,360,76,73,358,76,360,363,567,652,364,567,363,361,652,653,363,652,361,80,361,78,80,363,361,352,327,366,325,327,352,366,332,752,327,332,366,367,752,324,366,752,367,322,370,746,368,370,322,324,368,322,752,368,324,752,334,368,332,334,752,372,177,753,372,169,177,754,753,755,754,372,753,369,372,754,369,371,372,746,376,373,370,376,746,370,754,376,370,369,754,376,755,374,376,754,755,756,401,398,757,401,756,738,757,756,748,757,738,747,373,377,746,373,747,379,756,382,738,756,379,382,398,758,756,398,382,380,758,759,382,758,380,381,384,385,381,380,384,384,759,395,380,759,384,384,88,85,384,395,88,404,388,386,403,388,404,755,388,403,755,753,388,753,174,388,753,177,174,394,635,392,760,635,394,761,760,394,762,760,761,763,386,389,404,386,763,764,393,627,391,393,764,408,391,764,407,391,408,407,394,391,761,394,407,759,397,395,759,406,397,406,764,397,406,408,764,397,627,396,397,764,627,378,402,765,375,402,378,765,404,763,402,404,765,400,762,761,399,762,400,375,405,402,375,374,405,374,403,405,374,755,403,759,409,406,758,409,759,758,400,409,398,400,758,409,761,407,400,761,409,766,412,767,766,410,412,685,410,766,685,683,410,683,413,410,683,416,413,415,681,768,415,414,681,769,768,770,415,768,769,411,415,769,413,415,411,160,420,417,160,159,420,159,766,420,159,685,766,420,767,418,420,766,767,691,424,421,689,424,691,689,417,424,160,417,689,424,419,422,424,417,419,447,427,431,447,425,427,770,425,447,770,768,425,768,428,425,768,681,428,484,430,434,484,429,430,486,429,484,486,771,429,771,129,429,771,127,129,427,679,432,427,426,679,432,127,771,679,127,432,433,771,486,432,771,433,117,435,430,117,116,435,435,111,772,116,111,435,436,772,773,435,772,436,443,440,437,443,442,440,442,666,440,442,667,666,438,666,510,440,666,438,773,444,441,773,772,444,772,113,444,772,111,113,444,667,442,444,113,667,774,446,775,445,446,774,776,445,774,777,445,776,777,447,445,770,447,777,450,476,778,449,476,450,468,778,779,450,778,468,453,450,468,448,450,453,460,454,452,780,454,460,780,781,454,775,781,780,454,451,448,781,451,454,458,774,456,776,774,458,456,775,780,774,775,456,457,780,460,456,780,457,782,783,784,785,783,782,534,785,782,533,785,534,786,457,459,455,457,786,475,787,473,788,787,475,784,788,475,783,788,784,461,452,462,460,452,461,651,467,464,789,467,651,789,782,467,534,782,789,467,784,465,782,784,467,469,779,790,468,779,469,471,791,792,793,791,471,473,793,471,787,793,473,472,792,794,471,792,472,647,794,196,472,794,647,648,472,647,648,470,472,649,470,648,474,470,649,466,474,649,465,474,466,465,475,474,784,475,465,479,436,477,434,436,479,477,773,795,436,773,477,478,795,495,477,795,478,481,439,796,481,437,439,516,796,517,516,481,796,797,481,516,797,480,481,798,480,797,482,480,798,495,482,798,795,482,495,795,441,482,773,441,795,485,434,479,485,484,434,449,479,476,485,479,449,451,485,449,483,485,451,792,490,487,791,490,792,790,799,800,779,799,790,800,527,801,799,527,800,194,492,38,491,492,194,196,491,194,794,491,196,794,487,491,792,487,794,781,483,451,493,483,781,775,493,781,446,493,775,446,433,493,431,433,446,799,496,527,494,496,799,779,494,799,778,494,779,778,478,494,476,478,778,499,521,802,498,521,499,639,802,619,499,802,639,640,499,639,497,499,640,36,497,640,501,497,36,38,501,36,492,501,38,492,502,501,489,502,492,803,804,805,806,804,803,805,98,620,804,98,805,505,6,4,504,6,505,802,508,619,802,507,508,521,507,802,521,520,507,520,505,507,520,503,505,804,101,98,509,101,804,806,509,804,807,509,806,807,438,509,439,438,807,514,796,512,517,796,514,796,807,512,796,439,807,513,807,806,512,807,513,527,518,515,496,518,527,496,798,518,495,798,496,518,797,516,798,797,518,808,513,809,511,513,808,809,806,803,513,806,809,522,503,520,522,506,503,525,511,808,524,511,525,498,519,521,810,519,498,500,810,498,530,810,500,528,517,514,515,517,528,524,514,511,528,514,524,526,528,524,529,528,526,489,531,502,488,531,489,801,529,811,527,529,801,811,526,523,529,526,811,564,535,532,812,535,564,813,544,814,815,544,813,814,455,786,544,455,814,542,816,817,541,816,542,817,815,813,816,815,817,538,812,564,537,812,538,818,539,536,819,539,818,820,819,818,821,819,820,822,543,540,823,543,822,815,545,544,548,545,815,548,557,545,547,557,548,545,776,458,557,776,545,816,548,815,546,548,816,541,546,816,550,546,541,824,546,550,824,549,546,823,551,543,575,551,823,577,551,575,577,825,551,825,550,551,825,824,550,553,547,549,553,552,547,826,549,824,826,553,549,767,553,826,767,412,553,418,826,554,418,767,826,554,824,825,554,826,824,555,825,577,555,554,825,552,769,556,411,769,552,556,770,777,769,770,556,557,777,776,556,777,557,423,561,558,423,422,561,422,555,561,422,419,555,561,577,559,561,555,577,563,534,789,532,534,563,345,789,651,563,789,345,347,563,345,562,563,347,536,568,565,536,538,568,568,564,562,538,564,568,568,347,566,568,562,347,569,818,570,820,818,569,570,536,565,818,536,570,364,565,567,570,565,364,572,820,569,574,820,572,660,569,362,572,569,660,573,660,659,573,572,660,576,823,581,576,575,823,589,581,578,589,576,581,560,576,589,560,559,576,581,822,579,581,823,822,827,820,574,827,821,820,828,574,571,828,827,574,585,573,583,585,571,573,583,659,662,583,573,659,584,662,661,584,583,662,829,571,585,829,828,571,617,585,582,617,829,585,830,587,831,830,586,587,590,578,586,590,589,578,832,586,830,832,590,586,592,590,832,592,588,590,612,593,591,833,593,612,833,558,593,423,558,833,593,560,588,593,558,560,171,421,594,691,421,171,594,423,833,421,423,594,595,833,612,594,833,595,598,582,584,597,582,598,89,584,661,598,584,89,91,598,89,91,596,598,179,602,632,179,600,602,172,600,179,172,595,600,595,603,600,595,612,603,633,606,608,633,604,606,632,834,631,632,602,834,602,613,834,602,601,613,606,835,609,606,605,835,609,599,596,835,599,609,610,596,91,610,609,596,611,592,832,591,592,611,614,832,830,611,832,614,601,611,614,603,611,601,615,830,836,614,830,615,835,837,599,838,837,835,605,838,835,607,838,605,599,616,597,837,616,599,617,616,837,830,831,836]},"bennu":{"p":[-165,-8651,-70,825,-8995,-70,325,-8879,776,-638,-8530,746,-1084,-8273,-70,-628,-8370,-871,315,-8701,-900,1819,-8922,-70,1527,-8750,904,808,-8711,1610,-165,-8811,1887,-1120,-8554,1580,-1762,-8235,849,-1975,-8075,-70,-1710,-7941,-959,-1070,-8091,-1635,-165,-8228,-1905,777,-8436,-1698,1506,-8642,-1032,2764,-8607,-70,2524,-8299,850,2032,-8097,1633,1344,-8014,2229,530,-8276,2667,-404,-8500,2809,-1299,-8265,2510,-2007,-7918,1923,-2506,-7749,1193,-2765,-7677,362,-2766,-7689,-503,-2466,-7616,-1312,-1948,-7681,-2002,-1232,-7773,-2499,-383,-7726,-2702,495,-7837,-2667,1334,-8003,-2359,2030,-8114,-1773,2528,-8325,-992,3624,-8104,-70,3431,-7934,891,2960,-7650,1727,2325,-7439,2409,1593,-7423,2960,757,-7534,3356,-165,-7839,3602,-1128,-7940,3517,-2005,-7849,3109,-2687,-7586,2445,-3182,-7403,1667,-3479,-7287,815,-3588,-7268,-70,-3480,-7283,-956,-3139,-7285,-1783,-2587,-7268,-2486,-1884,-7317,-3043,-1044,-7202,-3341,-165,-7134,-3433,732,-7353,-3407,1597,-7488,-3114,2366,-7606,-2594,3012,-7817,-1900,3362,-7749,-1012,3624,-8104,-70,4407,-7518,-70,4184,-7266,851,3431,-7934,891,3798,-7065,1687,2960,-7650,1727,3323,-7035,2455,2325,-7439,2409,2651,-6840,3044,1593,-7423,2960,1949,-6876,3576,1161,-6985,3994,757,-7534,3356,301,-7300,4350,-165,-7839,3602,-640,-7468,4443,-1128,-7940,3517,-1564,-7423,4224,-2005,-7849,3109,-2404,-7342,3799,-2919,-7206,3331,-3090,-7153,3170,-2687,-7586,2445,-3202,-7053,2967,-3590,-6904,2410,-3182,-7403,1667,-4040,-6951,1652,-3479,-7287,815,-4273,-6873,801,-3588,-7268,-70,-4335,-6802,-70,-4288,-6877,-944,-3480,-7283,-956,-4055,-6953,-1797,-3139,-7285,-1783,-3577,-6871,-2541,-2587,-7268,-2486,-2980,-6863,-3187,-1884,-7317,-3043,-2244,-6777,-3660,-1445,-6751,-3998,-1044,-7202,-3341,-593,-6655,-4131,-165,-7134,-3433,-165,-7134,-3433,-593,-6655,-4131,270,-6776,-4196,732,-7353,-3407,1123,-6778,-4020,1597,-7488,-3114,1952,-6898,-3723,2708,-7009,-3251,2366,-7606,-2594,3341,-7075,-2609,3012,-7817,-1900,3869,-7224,-1861,3362,-7749,-1012,4193,-7288,-994,5107,-6862,-70,4860,-6593,838,4557,-6507,1695,4076,-6366,2454,3493,-6255,3114,2876,-6297,3731,2145,-6282,4207,1347,-6283,4560,511,-6492,4901,-403,-6918,5226,-1333,-6811,5036,-2224,-6797,4735,-2727,-7092,4049,-2869,-6892,4139,-2891,-7013,3878,-3040,-6837,3980,-3053,-6931,3705,-3191,-6765,3799,-3187,-6725,3940,-3336,-6878,3059,-3466,-6832,2877,-3326,-6989,2777,-3835,-6551,2586,-3856,-6470,2879,-3970,-6406,2683,-4508,-6200,2013,-4885,-6337,1229,-5110,-6445,374,-5128,-6455,-516,-4968,-6430,-1391,-4744,-6583,-2269,-4195,-6423,-2988,-3610,-6446,-3663,-2867,-6330,-4150,-2089,-6324,-4560,-1250,-6287,-4808,-387,-6404,-5002,-387,-6404,-5002,493,-6316,-4907,1351,-6327,-4719,2169,-6361,-4394,2918,-6388,-3924,3538,-6336,-3294,4088,-6383,-2601,4606,-6600,-1856,4916,-6696,-990,5590,-5974,-70,5586,-6061,838,5220,-5860,1672,4862,-5857,2483,4297,-5715,3161,3714,-5692,3798,3053,-5678,4346,2341,-5722,4832,1543,-5705,5163,717,-5824,5471,-165,-6193,5846,-1086,-6135,5733,-1947,-5971,5393,-2793,-6007,5069,-3025,-6737,4252,-3270,-6316,4386,-3387,-6096,4447,-3413,-6195,4340,-3567,-6099,4308,-3516,-5905,4525,-3690,-5917,4384,-3803,-6405,3678,-3948,-6271,3783,-3917,-6339,3482,-4301,-5984,3479,-4438,-5853,3579,-4384,-5881,3258,-4242,-6128,2879,-4367,-5976,2970,-5066,-5682,2417,-4113,-6275,2786,-5417,-5721,1631,-5704,-5838,805,-5791,-5850,-70,-5776,-5903,-957,-5619,-5954,-1837,-5227,-5876,-2639,-4715,-5808,-3361,-4133,-5811,-4024,-3428,-5745,-4545,-2662,-5682,-4952,-1895,-5806,-5378,-1061,-5979,-5721,-165,-5871,-5706,-165,-5871,-5706,700,-5713,-5509,1537,-5696,-5289,2352,-5752,-4995,3066,-5692,-4502,3699,-5646,-3919,4296,-5705,-3300,4785,-5749,-2583,5252,-5924,-1826,5561,-6043,-975,6053,-5174,-70,6071,-5255,803,5936,-5315,1674,5551,-5236,2467,5021,-5105,3160,4480,-5067,3816,3893,-5077,4426,3260,-5135,4997,2563,-5226,5513,1726,-5091,5724,903,-5106,5956,58,-5347,6289,-842,-5446,6360,-1709,-5343,6105,-2547,-5322,5808,-3261,-5149,5268,-3968,-5142,4777,-4230,-5985,3985,-4621,-5166,4217,-4534,-5773,3369,-4651,-5728,3175,-5130,-5107,3522,-5550,-5070,2781,-5923,-5107,2018,-6176,-5132,1203,-6429,-5278,367,-6379,-5211,-504,-6335,-5279,-1378,-6148,-5328,-2241,-5845,-5398,-3083,-5251,-5251,-3753,-4600,-5138,-4337,-3921,-5080,-4860,-3226,-5104,-5353,-2502,-5221,-5839,-1682,-5243,-6136,-832,-5365,-6410,-832,-5365,-6410,52,-5190,-6265,901,-5112,-6089,1719,-5086,-5849,2479,-5030,-5474,3212,-5042,-5062,3822,-4953,-4480,4420,-4978,-3903,4950,-5021,-3255,5473,-5163,-2574,5861,-5256,-1794,6057,-5257,-942,6631,-4535,-70,6694,-4634,811,6425,-4548,1651,6104,-4517,2459,5705,-4513,3227,5119,-4403,3861,4543,-4376,4475,3955,-4420,5082,3290,-4459,5613,2567,-4520,6084,1758,-4516,6387,908,-4475,6536,53,-4535,6694,-840,-4745,6920,-1703,-4642,6653,-2527,-4585,6332,-3289,-4519,5901,-3974,-4440,5371,-4706,-4526,4917,-5330,-4548,4317,-5792,-4482,3580,-6189,-4454,2819,-6530,-4475,2035,-6884,-4603,1236,-6895,-4516,361,-6971,-4578,-506,-6916,-4616,-1382,-6729,-4637,-2244,-6491,-4726,-3111,-5932,-4612,-3814,-5313,-4523,-4440,-4650,-4459,-4994,-3944,-4404,-5470,-3258,-4466,-5980,-2545,-4627,-6522,-1713,-4671,-6836,-840,-4732,-7055,-840,-4732,-7055,56,-4620,-6939,911,-4508,-6705,1728,-4449,-6430,2495,-4392,-6063,3267,-4442,-5721,3878,-4321,-5124,4491,-4313,-4563,5098,-4381,-3985,5673,-4491,-3351,6109,-4543,-2605,6329,-4484,-1768,6547,-4519,-933,7278,-3920,-70,7404,-4043,847,6927,-3823,1671,6711,-3867,2530,6367,-3898,3353,5815,-3835,4050,5149,-3725,4625,4548,-3729,5235,3887,-3739,5781,3165,-3752,6252,2435,-3861,6768,1576,-3818,6969,708,-3796,7093,-165,-3815,7173,-1059,-3925,7285,-1916,-3858,7021,-2761,-3866,6765,-3521,-3804,6312,-4194,-3720,5751,-4935,-3791,5305,-5546,-3780,4686,-6126,-3807,4033,-6652,-3856,3326,-7035,-3867,2528,-7447,-3978,1723,-7391,-3829,805,-7474,-3851,-70,-7512,-3909,-961,-7416,-3945,-1854,-7198,-3976,-2732,-6803,-3961,-3547,-6205,-3862,-4229,-5586,-3811,-4862,-4889,-3740,-5389,-4205,-3731,-5908,-3524,-3797,-6452,-2793,-3907,-6985,-1958,-3948,-7325,-1074,-3979,-7539,-165,-3941,-7527,-165,-3941,-7527,718,-3852,-7321,1554,-3772,-7025,2362,-3746,-6718,3160,-3774,-6397,3877,-3746,-5915,4499,-3683,-5319,5104,-3681,-4722,5758,-3785,-4149,6276,-3833,-3444,6627,-3818,-2639,6935,-3844,-1815,7281,-3968,-973,7806,-3176,-70,7904,-3256,854,7618,-3189,1734,7262,-3140,2571,6952,-3176,3423,6383,-3108,4129,5767,-3050,4769,5160,-3039,5395,4522,-3052,5991,3782,-3029,6453,3079,-3114,7015,2253,-3121,7353,1371,-3075,7485,496,-3071,7598,-387,-3112,7702,-1275,-3119,7639,-2108,-3035,7302,-3003,-3135,7211,-3740,-3056,6694,-4426,-3001,6147,-5134,-3026,5655,-5763,-3026,5057,-6360,-3046,4420,-6864,-3053,3700,-7435,-3152,2995,-7794,-3182,2165,-8051,-3214,1293,-8045,-3157,379,-7976,-3118,-516,-7973,-3165,-1418,-7911,-3237,-2341,-7690,-3286,-3246,-7137,-3205,-4000,-6505,-3126,-4666,-5821,-3055,-5248,-5107,-2992,-5757,-4455,-3019,-6327,-3800,-3109,-6946,-3057,-3191,-7485,-2211,-3220,-7838,-1320,-3251,-8084,-393,-3188,-8031,-393,-3188,-8031,504,-3104,-7825,1367,-3064,-7606,2202,-3044,-7334,3022,-3057,-7033,3837,-3100,-6697,4533,-3069,-6151,5180,-3052,-5557,5780,-3053,-4918,6301,-3051,-4213,6836,-3108,-3503,7314,-3176,-2733,7639,-3209,-1881,7763,-3186,-977,8212,-2349,-70,8395,-2440,874,8419,-2515,1851,7852,-2396,2674,7498,-2403,3539,6895,-2339,4258,6317,-2317,4963,5725,-2320,5648,5055,-2316,6253,4324,-2311,6782,3588,-2350,7331,2700,-2295,7555,1863,-2334,7922,950,-2282,7949,58,-2276,8003,-845,-2329,8125,-1749,-2336,8025,-2608,-2303,7719,-3443,-2296,7382,-4156,-2233,6819,-4918,-2258,6382,-5613,-2268,5838,-6233,-2265,5203,-6794,-2263,4512,-7351,-2293,3805,-7922,-2364,3072,-8266,-2379,2214,-8481,-2385,1314,-8562,-2378,392,-8480,-2343,-528,-8479,-2377,-1453,-8432,-2435,-2402,-8167,-2450,-3312,-7815,-2478,-4203,-7096,-2386,-4864,-6353,-2309,-5444,-5623,-2260,-5981,-4910,-2242,-6504,-4268,-2312,-7159,-3521,-2360,-7703,-2686,-2387,-8108,-1803,-2421,-8435,-866,-2403,-8513,-866,-2403,-8513,66,-2358,-8406,979,-2347,-8291,1856,-2315,-8025,2695,-2287,-7681,3583,-2344,-7459,4435,-2388,-7101,5060,-2314,-6396,5727,-2315,-5786,6290,-2298,-5078,6797,-2291,-4334,7336,-2334,-3598,7826,-2388,-2806,8157,-2414,-1930,8122,-2335,-983,8790,-1548,-70,8868,-1581,892,8688,-1576,1838,8326,-1551,2729,8131,-1599,3689,7473,-1542,4420,6777,-1492,5072,6129,-1474,5722,5420,-1453,6289,4707,-1450,6838,3972,-1465,7371,3181,-1483,7834,2282,-1452,8014,1425,-1480,8338,509,-1447,8317,-391,-1458,8395,-1308,-1485,8444,-2237,-1510,8385,-3099,-1488,8037,-3902,-1464,7583,-4624,-1434,7026,-5365,-1443,6531,-6000,-1431,5903,-6695,-1459,5329,-7339,-1485,4676,-7991,-1532,3987,-8333,-1514,3112,-8685,-1527,2245,-8946,-1542,1340,-9042,-1541,401,-8971,-1520,-538,-9051,-1562,-1497,-8897,-1571,-2443,-8692,-1596,-3393,-8186,-1569,-4223,-7656,-1564,-5025,-6868,-1500,-5607,-6113,-1461,-6155,-5360,-1435,-6659,-4698,-1467,-7289,-3967,-1501,-7865,-3139,-1515,-8291,-2254,-1522,-8592,-1359,-1572,-8972,-401,-1542,-8918,-401,-1542,-8918,534,-1513,-8773,1439,-1486,-8539,2332,-1482,-8312,3256,-1519,-8145,4209,-1577,-7950,4874,-1514,-7219,5551,-1495,-6579,6268,-1518,-5994,6672,-1457,-5128,7199,-1462,-4390,7722,-1487,-3633,8232,-1528,-2838,8590,-1553,-1957,8714,-1543,-1015,9484,-681,-70,9534,-694,947,9251,-679,1927,8689,-641,2795,8208,-626,3642,7876,-644,4561,7104,-609,5192,6423,-596,5839,5703,-585,6420,4989,-585,6995,4272,-599,7590,3461,-604,8049,2544,-586,8236,1674,-596,8554,761,-598,8712,-165,-599,8784,-1096,-599,8752,-2075,-632,8889,-2977,-619,8549,-3879,-623,8240,-4752,-631,7852,-5362,-592,7052,-5970,-573,6347,-6615,-574,5711,-7338,-596,5122,-7968,-611,4419,-8601,-637,3675,-8870,-625,2747,-9206,-635,1844,-9341,-633,890,-9327,-623,-70,-9413,-639,-1038,-9322,-644,-2008,-9157,-655,-2979,-8832,-659,-3913,-8228,-639,-4704,-7583,-626,-5437,-6792,-598,-6008,-6087,-592,-6618,-5350,-590,-7177,-4619,-600,-7755,-3835,-613,-8286,-2977,-622,-8699,-2087,-641,-9095,-1136,-647,-9296,-165,-631,-9207,-165,-631,-9207,792,-629,-9148,1739,-626,-8993,2685,-632,-8804,3674,-658,-8667,4541,-655,-8198,5275,-638,-7534,5980,-633,-6878,6504,-609,-6055,6864,-573,-5150,7591,-606,-4532,8120,-617,-3745,8693,-644,-2939,8742,-616,-1953,9113,-642,-1041,9940,320,-70,10000,320,998,9638,320,2011,9080,320,2926,8475,320,3762,8028,320,4647,7282,320,5321,6626,320,6025,5851,320,6588,5110,320,7166,4377,320,7778,3539,320,8231,2640,320,8540,1716,320,8753,779,320,8882,-165,320,9137,-1142,320,9201,-2134,320,9164,-3054,320,8782,-4066,320,8665,-4973,320,8237,-5610,320,7396,-6199,320,6599,-6836,320,5907,-7516,320,5247,-8209,320,4558,-8963,320,3839,-9395,320,2923,-9710,320,1955,-9849,320,945,-9916,320,-70,-9993,320,-1101,-10000,320,-2158,-9798,320,-3196,-9361,320,-4157,-8741,320,-5012,-7976,320,-5732,-7124,320,-6315,-6312,320,-6872,-5520,320,-7412,-4726,320,-7940,-3977,320,-8615,-3052,320,-8937,-2052,320,-8920,-1108,320,-9014,-165,320,-9192,-165,320,-9192,811,320,-9329,1837,320,-9471,2889,320,-9458,3865,320,-9107,4728,320,-8526,5510,320,-7866,6170,320,-7094,6748,320,-6283,7233,320,-5431,7852,320,-4688,8491,320,-3917,9077,320,-3068,9378,320,-2094,9676,320,-1103,9538,1325,-70,9613,1342,955,9188,1309,1910,8827,1297,2839,8407,1290,3731,8008,1299,4636,7399,1292,5413,6678,1278,6079,5897,1261,6646,5120,1254,7187,4258,1236,7565,3403,1226,7910,2598,1247,8407,1717,1259,8758,803,1283,9115,-165,1305,9368,-1169,1321,9471,-2180,1328,9394,-3156,1324,9110,-4189,1351,8956,-5125,1355,8513,-5866,1330,7764,-6497,1303,6945,-7095,1287,6150,-7819,1303,5478,-8417,1311,4684,-8817,1302,3770,-9073,1289,2813,-9469,1307,1902,-9510,1292,908,-9582,1294,-70,-9706,1314,-1070,-9623,1322,-2074,-9356,1320,-3046,-8915,1310,-3951,-8458,1312,-4842,-7950,1320,-5715,-7228,1308,-6417,-6506,1306,-7099,-5737,1307,-7727,-4873,1300,-8209,-3968,1293,-8596,-2977,1263,-8699,-1995,1229,-8643,-1079,1224,-8738,-165,1227,-8816,-165,1227,-8816,773,1249,-8965,1783,1293,-9214,2773,1306,-9087,3708,1305,-8738,4529,1290,-8166,5310,1284,-7578,5936,1264,-6823,6610,1267,-6155,7127,1255,-5353,7776,1272,-4644,8417,1296,-3882,8985,1320,-3037,9297,1324,-2076,9457,1322,-1078,9040,2240,-70,8975,2237,902,8686,2204,1834,8542,2235,2798,8229,2250,3726,7623,2211,4502,7022,2196,5253,6336,2178,5916,5532,2134,6421,4787,2128,6960,3997,2121,7421,3193,2130,7861,2332,2129,8179,1452,2145,8472,550,2197,8827,-407,2228,8998,-1379,2234,8962,-2361,2257,8889,-3295,2247,8574,-4229,2265,8258,-5064,2253,7732,-5824,2238,7113,-6447,2200,6354,-7279,2260,5813,-7811,2244,4987,-8315,2246,4152,-8643,2225,3233,-9006,2242,2334,-9141,2225,1371,-9153,2201,407,-9285,2233,-555,-9287,2257,-1536,-9136,2270,-2510,-8870,2281,-3465,-8359,2254,-4315,-7846,2253,-5152,-7069,2193,-5771,-6471,2213,-6525,-5802,2235,-7231,-5034,2248,-7834,-4112,2212,-8163,-3180,2183,-8406,-2230,2143,-8497,-1294,2101,-8476,-391,2101,-8543,-391,2101,-8543,521,2120,-8607,1464,2161,-8681,2433,2204,-8656,3338,2201,-8334,4233,2217,-7979,4939,2173,-7305,5678,2179,-6727,6282,2159,-6004,6903,2167,-5307,7433,2166,-4532,7957,2184,-3741,8472,2221,-2916,9017,2290,-2050,9025,2249,-1049,8697,3154,-70,8466,3086,880,8270,3072,1811,8248,3170,2809,7699,3098,3626,7076,3030,4361,6504,3024,5103,5855,3017,5772,5067,2961,6266,4303,2942,6751,3506,2925,7162,2721,2957,7614,1874,2977,7954,992,3013,8243,74,3103,8581,-881,3093,8541,-1820,3073,8365,-2825,3176,8409,-3753,3185,8088,-4617,3175,7620,-5398,3152,7029,-5990,3065,6231,-6766,3125,5662,-7311,3105,4869,-7916,3152,4116,-8210,3104,3188,-8429,3072,2260,-8612,3065,1335,-8590,3017,393,-8659,3042,-537,-8677,3086,-1487,-8521,3103,-2426,-8329,3152,-3380,-7936,3162,-4268,-7373,3138,-5057,-6752,3124,-5793,-6082,3122,-6481,-5380,3147,-7149,-4511,3103,-7574,-3608,3063,-7894,-2677,3015,-8078,-1744,2959,-8131,-839,2942,-8191,-839,2942,-8191,62,2962,-8268,975,2985,-8270,1887,2996,-8145,2801,3024,-7962,3669,3031,-7615,4527,3068,-7230,5237,3043,-6611,5966,3071,-6024,6631,3093,-5352,7125,3065,-4540,7617,3072,-3730,8043,3091,-2876,8474,3152,-2000,8662,3161,-1044,8315,4057,-70,8139,3992,880,8035,4023,1832,7803,4045,2767,7262,3952,3570,6601,3839,4260,6016,3825,4968,5341,3799,5584,4584,3747,6077,3821,3720,6527,3043,3717,6937,2226,3713,7264,1406,3789,7655,527,3870,7961,-400,3934,8128,-1340,3944,8077,-2272,3959,7924,-3186,3979,7668,-4027,3954,7228,-4886,4005,6821,-5609,3981,6200,-6251,3956,5504,-6747,3893,4698,-7252,3899,3922,-7644,3895,3084,-7807,3819,2167,-7859,3740,1256,-8055,3792,380,-8065,3796,-521,-7998,3810,-1422,-7865,3846,-2325,-7644,3893,-3224,-7145,3836,-3999,-6659,3838,-4772,-6147,3882,-5543,-5608,3979,-6339,-4898,4013,-6978,-3950,3869,-7215,-3051,3798,-7453,-2178,3797,-7708,-1278,3763,-7795,-383,3683,-7696,-383,3683,-7696,495,3714,-7733,1371,3717,-7628,2250,3747,-7477,3159,3837,-7329,4019,3887,-6993,4752,3862,-6431,5390,3821,-5770,6085,3875,-5170,6653,3884,-4441,7185,3918,-3674,7523,3894,-2803,7802,3897,-1915,8157,4002,-1023,7561,4729,-70,7474,4703,855,7450,4798,1802,7230,4839,2729,6779,4797,3566,6138,4684,4268,5500,4645,4939,4711,4518,5422,3950,4458,5879,3203,4462,6334,2411,4464,6705,1609,4549,7108,737,4580,7334,-165,4631,7481,-1091,4696,7534,-2018,4737,7431,-2875,4670,7055,-3691,4636,6627,-4466,4629,6142,-5277,4729,5691,-5847,4652,4952,-6296,4560,4149,-6744,4554,3373,-7105,4557,2556,-7277,4497,1678,-7416,4486,808,-7552,4542,-70,-7496,4535,-959,-7359,4545,-1839,-7142,4576,-2710,-6790,4585,-3539,-6281,4544,-4277,-5774,4578,-5022,-5228,4667,-5769,-4589,4766,-6466,-3700,4643,-6783,-2815,4562,-7031,-1927,4506,-7195,-1038,4443,-7238,-165,4403,-7216,-165,4403,-7216,698,4400,-7159,1563,4431,-7059,2427,4480,-6883,3285,4551,-6626,4140,4655,-6298,4900,4695,-5781,5528,4671,-5106,6044,4622,-4345,6501,4603,-3558,6946,4650,-2759,7275,4687,-1899,7446,4689,-992,6742,5265,-70,6803,5355,825,6703,5404,1725,6592,5558,2659,6128,5501,3465,5458,5336,4111,4861,5345,4786,4091,5221,5254,3344,5187,5707,2607,5256,6183,1764,5182,6411,926,5213,6654,58,5305,6864,-834,5302,6840,-1713,5291,6686,-2603,5385,6539,-3385,5306,6084,-4143,5306,5618,-4855,5332,5083,-5409,5261,4383,-5826,5153,3602,-6253,5164,2853,-6576,5170,2053,-6782,5162,1215,-6936,5199,364,-6979,5230,-507,-6880,5233,-1375,-6652,5221,-2218,-6342,5234,-3036,-5902,5219,-3793,-5425,5265,-4534,-4861,5321,-5225,-4203,5378,-5842,-3404,5331,-6259,-2598,5378,-6668,-1696,5255,-6763,-815,5178,-6795,-815,5178,-6795,50,5115,-6738,896,5076,-6610,1748,5132,-6493,2573,5160,-6235,3402,5255,-5939,4160,5302,-5482,4847,5337,-4915,5387,5293,-4204,5884,5306,-3469,6269,5304,-2669,6477,5239,-1807,6617,5212,-942,5973,5758,-70,6037,5867,798,6017,6021,1696,5905,6232,2626,5420,6167,3409,4798,6069,4081,4067,5930,4614,3310,5835,5065,2574,5883,5533,1773,5904,5880,921,5873,6069,54,5876,6173,-828,5945,6215,-1684,5876,5997,-2574,6045,5879,-3183,6059,5593,-3394,6084,5515,-3572,6070,5378,-4087,5999,4941,-4215,5947,4758,-4592,5772,4189,-5019,5612,3439,-5559,5740,2789,-5963,5812,2035,-6143,5748,1197,-6284,5768,356,-6331,5810,-500,-6284,5885,-1368,-6032,5866,-2200,-5660,5841,-2983,-5170,5797,-3693,-4688,5900,-4425,-4063,5939,-5044,-3360,5997,-5589,-2599,6116,-6085,-1716,6032,-6279,-821,5903,-6300,-821,5903,-6300,52,5827,-6252,907,5790,-6126,1747,5801,-5933,2559,5824,-5635,3344,5889,-5256,4055,5930,-4746,4592,5834,-4050,5084,5822,-3342,5486,5827,-2581,5698,5737,-1747,5880,5738,-917,5361,6387,-70,5459,6571,818,5321,6630,1706,5153,6870,2633,4578,6728,3363,3914,6622,3993,3177,6540,4514,2388,6477,4925,1586,6541,5307,713,6461,5453,-165,6523,5576,-1050,6516,5503,-1923,6556,5326,-2613,6161,5648,-2650,6272,5412,-3020,6171,5458,-3206,6125,5485,-3268,6338,5142,-3096,6426,4987,-3290,6414,5028,-3427,6218,5272,-3825,6448,4501,-3699,6583,4559,-3700,6637,4424,-4178,6074,4166,-4043,6209,4069,-4285,5985,3957,-4155,6130,3865,-4016,6258,3764,-4517,6175,3076,-5001,6245,2384,-5354,6283,1610,-5603,6345,788,-5679,6348,-70,-5716,6483,-947,-5506,6476,-1801,-5150,6447,-2603,-4633,6352,-3304,-4109,6422,-4002,-3448,6427,-4574,-2730,6506,-5089,-1926,6569,-5476,-1070,6687,-5778,-165,6535,-5728,-165,6535,-5728,717,6482,-5618,1547,6348,-5313,2362,6386,-5008,3095,6368,-4538,3753,6380,-3975,4268,6322,-3282,4661,6259,-2523,4967,6243,-1734,5164,6237,-912,4623,6828,-70,4653,6959,801,4527,7101,1684,4281,7351,2578,3701,7276,3295,3000,7204,3885,2168,6978,4247,1360,7011,4607,500,7049,4825,-385,6969,4813,-1270,7072,4760,-2081,6929,4399,-2556,6579,4786,-2721,6486,4932,-2749,6585,4687,-2397,6694,4656,-2586,6684,4547,-2782,6697,4452,-2953,6620,4594,-3488,6753,3673,-3331,6861,3542,-3478,6807,3381,-3618,6682,3483,-3753,6546,3580,-4004,6732,2707,-4440,6730,1979,-4765,6771,1194,-4982,6870,362,-5061,6996,-510,-4902,6991,-1374,-4620,7046,-2211,-4144,7007,-2954,-3556,6987,-3608,-2857,6946,-4135,-2091,6959,-4562,-1272,7068,-4906,-392,7206,-5119,-392,7206,-5119,512,7156,-5050,1382,7094,-4812,2163,6951,-4375,2897,6976,-3897,3462,6852,-3229,3877,6708,-2478,4259,6759,-1728,4460,6714,-908,3915,7295,-70,3939,7487,799,3760,7652,1672,3385,7821,2502,2730,7701,3134,1946,7504,3570,1130,7461,3900,274,7484,4088,-601,7454,4070,-1448,7416,3869,-2202,7255,3444,-2268,6910,4284,-2835,6887,3961,-2909,7316,2967,-3488,7331,2336,-3910,7309,1591,-4157,7264,775,-4339,7451,-70,-4288,7535,-945,-4014,7535,-1780,-3553,7488,-2527,-2990,7556,-3202,-2269,7513,-3705,-1477,7575,-4098,-614,7666,-4335,-614,7666,-4335,293,7816,-4417,1177,7732,-4186,1951,7523,-3720,2628,7442,-3162,3153,7333,-2475,3554,7303,-1723,3746,7155,-899,3228,7853,-70,3182,8007,824,2897,8160,1693,2302,8029,2387,1557,7926,2901,724,7922,3236,-165,7825,3310,-1039,7804,3184,-1840,7736,2823,-2564,7851,2323,-3127,7922,1637,-3405,7736,795,-3547,7803,-70,-3473,7916,-955,-3127,7906,-1776,-2600,7964,-2500,-1899,8014,-3067,-1068,8045,-3431,-165,8089,-3572,-165,8089,-3572,758,8215,-3503,1576,8012,-3074,2256,7898,-2484,2738,7744,-1741,3031,7645,-924,3228,7853,-70,2446,8245,-70,3182,8007,824,2348,8391,790,2897,8160,1693,1956,8490,1576,2302,8029,2387,1277,8307,2129,1557,7926,2901,724,7922,3236,474,8195,2441,-165,7825,3310,-380,8251,2524,-1039,7804,3184,-1216,8288,2322,-1840,7736,2823,-1922,8205,1834,-2564,7851,2323,-3127,7922,1637,-2490,8383,1186,-3405,7736,795,-2740,8254,358,-3547,7803,-70,-2748,8277,-500,-3473,7916,-955,-2466,8261,-1312,-3127,7906,-1776,-2600,7964,-2500,-1938,8252,-1990,-1899,8014,-3067,-1238,8427,-2509,-1068,8045,-3431,-385,8405,-2722,-165,8089,-3572,500,8534,-2687,758,8215,-3503,1576,8012,-3074,1298,8425,-2301,2256,7898,-2484,1924,8361,-1692,2738,7744,-1741,2302,8239,-915,3031,7645,-924,1652,8768,-70,1397,8689,829,725,8558,1465,-165,8520,1693,-1050,8544,1459,-1718,8667,825,-1971,8730,-70,-1722,8667,-967,-1071,8725,-1635,-165,8742,-1882,750,8810,-1650,1399,8701,-971,753,8937,-70,286,8767,708,-616,8788,709,-1080,8922,-70,-624,8939,-863,297,8995,-868,-165,8892,-70,-4125,-6169,3072,-3668,-6560,3583,-3791,-6447,3531,-3773,-6475,3378,-3372,-6836,3368,-3486,-6747,3169,-3750,-6551,3082,-3629,-6598,3271,-3759,-6507,3228,-3223,-6970,3260,-3066,-7025,3431,-3216,-6921,3395,-3636,-6410,3826,-3766,-6243,3914,-3788,-6332,3800,-3449,-6355,4102,-3600,-6251,4064,-3473,-6448,3990,-2736,-7170,3767,-2895,-7054,3738,-2571,-7239,3933,-3304,-6472,4147,-3429,-6269,4217,-3152,-6538,4326,-2586,-7342,3663,-2753,-7277,3498,-2901,-7097,3599,-3997,-6338,2982,-3981,-6366,2830,-4212,-6079,3697,-4355,-5957,3803,-3454,-6938,2591,-3588,-6763,2686,-3353,-6727,3635,-3340,-6631,3908,-3497,-6579,3738,-3523,-6707,3479,-3504,-6724,3323,-3908,-6103,4017,-4088,-6125,3883,-3862,-5922,4241,-4040,-5942,4107,-3733,-6090,4155,-3710,-6721,2496,-4262,-6039,3172,-4502,-5840,3067,-3178,-6669,4072,-3208,-6869,3530,-3210,-7006,3111,-3723,-6620,2784,-3735,-6582,2932,-3893,-6424,3187,-4057,-6194,3582,-4033,-6278,3287,-4071,-6048,4003,-4079,-6174,3739,-4012,-6302,3132,-3458,-6879,2732,-3606,-6675,2977,-2909,-7148,3463,-2880,-6952,4008,-3714,-6007,4273,-3484,-6512,3863,-2577,-7284,3795,-3165,-6605,4200,-4174,-6136,3389,-4043,-6233,3433,-3713,-6662,2637,-3473,-6782,3020,-3510,-6641,3608,-3201,-6821,3667,-3751,-6169,4036,-4089,6099,4673,-3696,6526,4691,-3563,6698,4604,-3546,6734,4302,-3203,6803,4288,-3012,6825,4113,-3176,6816,3974,-3311,6492,4914,-3653,6371,4918,-3516,6532,4824,-3836,6368,4787,-2682,6370,5165,-2854,6278,5317,-2617,6792,4309,-2427,6797,4415,-2460,6912,4182,-2812,6803,4212,-3003,6791,4243,-3900,6360,3969,-3766,6499,3874,-4085,6189,4393,-3935,6329,4285,-3226,6182,5368,-3378,6738,4438,-3365,6690,4561,-4336,5882,4564,-4310,5933,4260,-4457,5817,4370,-2244,6828,4538,-3954,6167,4853,-3960,6228,4727,-3791,6210,5012,-3133,6569,4752,-3167,6684,4519,-3346,6627,4674,-3479,6391,5060,-3611,6217,5145,-3749,6057,5240,-3915,6021,5085,-2778,6053,5787,-2979,6051,5685,-2795,6104,5665,-2812,6156,5544,-2645,6890,4066,-3007,6897,3831,-3892,6417,3680,-4428,5863,4062,-2971,6680,4479,-2984,6726,4356,-2835,6222,5435,-2887,6377,5072,-2906,6450,4955,-2925,6521,4837,-3952,6313,4444,-3970,6297,4604,-2254,6863,4407,-3658,6622,4091,-3511,6731,3980,-3627,6627,3773,-3341,6806,3834,-3177,6902,3698,-3358,6768,4134,-4205,6024,4472,-3326,6554,4790,-2634,6851,4193,-2940,6573,4717,-3921,6353,4132,-3810,6519,4208,-3061,6292,5230,-2869,6325,5192,-3245,6256,5252,-2601,6739,4429],"uv":[2897,8250,3301,8250,3097,8595,2703,8583,2521,8250,2707,7923,3093,7911,3707,8250,3588,8648,3294,8936,2897,9049,2507,8924,2244,8625,2157,8250,2266,7886,2527,7611,2897,7500,3282,7585,3579,7857,4093,8250,3995,8625,3794,8945,3513,9189,3181,9368,2799,9426,2433,9304,2144,9064,1940,8766,1835,8426,1834,8073,1957,7742,2168,7460,2461,7257,2807,7174,3166,7189,3509,7315,3793,7554,3997,7873,4444,8250,4365,8642,4173,8984,3914,9262,3615,9488,3273,9649,2897,9750,2503,9715,2145,9549,1866,9277,1664,8959,1543,8611,1498,8250,1542,7888,1682,7550,1907,7263,2194,7035,2538,6913,2897,6876,3263,6886,3617,7006,3931,7219,4195,7502,4338,7865,6755,6431,6755,6211,6487,6117,6420,6367,6220,6042,6085,6261,5951,6031,5750,6182,5683,5957,5414,6176,5413,5971,5144,6012,5077,6217,4874,6130,4739,6332,4604,6192,4402,6369,4335,6176,4066,6335,4066,6146,3866,6095,3796,6075,3729,6237,3731,6037,3527,5982,3393,6168,3260,5999,3058,6125,2991,5970,2723,6118,2723,5943,2455,5971,2388,6123,2187,6000,2052,6124,1918,5969,1717,6118,1649,5966,1380,6136,1380,5934,1111,5924,1044,6093,842,5888,707,6068,8772,6068,8907,5888,8637,5934,8435,6150,8367,5934,8098,6200,8098,5979,7829,6021,7762,6244,7560,6045,7426,6323,7292,6101,7090,6298,7023,6125,6755,5966,6526,5865,6296,5833,6066,5780,5836,5738,5605,5754,5375,5749,5144,5749,4913,5827,4681,5987,4450,5947,4219,5942,4025,6052,4006,5977,3963,6022,3947,5956,3901,5992,3887,5929,3910,5914,3722,5972,3658,5954,3664,6013,3527,5849,3588,5819,3527,5795,3297,5718,3068,5769,2838,5810,2608,5813,2378,5804,2148,5861,1919,5801,1688,5810,1457,5766,1226,5764,996,5750,764,5794,8829,5794,8598,5761,8367,5765,8136,5778,7906,5788,7675,5769,7445,5786,7215,5868,6985,5904,6755,5633,6554,5666,6354,5591,6152,5590,5951,5536,5749,5528,5547,5523,5346,5539,5144,5533,4942,5577,4739,5715,4537,5694,4334,5632,4132,5645,3989,5919,3958,5761,3944,5679,3924,5716,3891,5680,3930,5608,3880,5612,3750,5794,3743,5744,3696,5770,3633,5637,3630,5588,3580,5598,3527,5691,3527,5634,3326,5524,3527,5746,3125,5539,2924,5582,2723,5587,2522,5607,2321,5626,2120,5597,1919,5571,1717,5572,1515,5548,1314,5524,1111,5571,909,5635,707,5595,8772,5595,8569,5536,8367,5529,8165,5550,7963,5528,7761,5510,7560,5533,7358,5549,7158,5614,6957,5659,6755,5334,6577,5364,6398,5387,6219,5357,6040,5308,5861,5294,5681,5297,5502,5319,5323,5353,5144,5303,4964,5308,4784,5398,4604,5435,4424,5397,4245,5389,4064,5324,3885,5322,3729,5637,3706,5331,3579,5558,3527,5541,3527,5309,3348,5295,3169,5309,2991,5318,2812,5373,2633,5347,2455,5373,2276,5392,2097,5418,1918,5363,1740,5320,1560,5299,1381,5307,1201,5351,1021,5360,841,5405,8906,5405,8727,5340,8547,5310,8367,5301,8188,5280,8008,5284,7828,5251,7649,5260,7470,5276,7292,5330,7113,5365,6934,5365,6755,5094,6591,5132,6427,5099,6263,5088,6098,5086,5934,5045,5770,5035,5605,5052,5440,5066,5275,5089,5111,5087,4946,5072,4780,5095,4616,5173,4450,5135,4285,5113,4120,5088,3955,5059,3791,5091,3627,5099,3461,5075,3297,5064,3133,5072,2969,5120,2805,5087,2641,5110,2477,5125,2312,5133,2148,5166,1984,5123,1819,5090,1655,5066,1490,5046,1325,5069,1160,5129,995,5145,830,5168,8895,5168,8730,5126,8565,5084,8400,5062,8236,5041,8071,5060,7906,5014,7741,5011,7576,5037,7413,5078,7248,5098,7084,5075,6919,5089,6755,4864,6601,4910,6446,4828,6291,4844,6136,4856,5981,4832,5827,4791,5671,4793,5516,4796,5361,4801,5205,4842,5050,4826,4895,4818,4739,4825,4584,4866,4428,4841,4273,4844,4118,4821,3962,4789,3807,4816,3652,4812,3497,4822,3342,4840,3187,4845,3033,4886,2878,4830,2723,4838,2568,4860,2413,4874,2258,4885,2104,4879,1949,4843,1794,4824,1639,4797,1484,4793,1328,4818,1173,4860,1018,4875,862,4886,707,4872,8772,4872,8616,4839,8461,4809,8305,4799,8151,4810,7995,4799,7839,4776,7684,4775,7530,4814,7375,4832,7220,4826,7065,4836,6910,4882,6755,4586,6609,4616,6463,4590,6317,4572,6170,4586,6023,4560,5877,4539,5731,4534,5584,4539,5438,4531,5290,4562,5143,4565,4996,4548,4849,4546,4702,4562,4556,4564,4408,4533,4262,4570,4115,4541,3968,4520,3822,4529,3675,4530,3528,4537,3381,4540,3235,4577,3089,4588,2943,4600,2796,4579,2650,4564,2503,4582,2357,4609,2210,4627,2064,4596,1918,4567,1771,4540,1625,4517,1478,4527,1331,4561,1184,4591,1037,4602,890,4614,743,4590,8808,4590,8661,4559,8514,4544,8367,4536,8221,4541,8074,4557,7927,4546,7780,4539,7634,4540,7487,4539,7341,4560,7195,4586,7048,4598,6902,4589,6755,4276,6614,4310,6473,4338,6332,4294,6190,4296,6049,4272,5908,4264,5766,4265,5625,4264,5484,4262,5342,4277,5200,4256,5058,4271,4916,4251,4775,4249,4633,4268,4491,4271,4349,4259,4207,4256,4065,4233,3924,4242,3783,4246,3641,4245,3499,4244,3358,4255,3217,4282,3076,4287,2935,4290,2793,4287,2652,4274,2511,4287,2370,4308,2229,4314,2087,4324,1946,4290,1805,4261,1664,4243,1522,4236,1380,4262,1238,4280,1097,4290,955,4303,813,4296,8878,4296,8736,4279,8594,4275,8452,4263,8310,4253,8169,4274,8028,4291,7886,4263,7744,4263,7602,4257,7461,4254,7320,4270,7179,4291,7038,4300,6896,4271,6755,3976,6619,3988,6483,3987,6347,3977,6209,3995,6073,3974,5937,3955,5801,3949,5664,3941,5527,3940,5390,3945,5253,3952,5116,3940,4979,3951,4842,3938,4705,3943,4568,3953,4431,3962,4293,3954,4156,3945,4019,3933,3883,3937,3746,3932,3610,3943,3473,3953,3337,3970,3200,3963,3063,3968,2927,3974,2791,3974,2655,3966,2519,3982,2382,3985,2246,3994,2110,3984,1973,3982,1837,3958,1700,3944,1564,3934,1426,3946,1289,3959,1152,3964,1015,3966,878,3985,741,3974,8806,3974,8669,3963,8531,3953,8394,3952,8257,3965,8121,3987,7984,3963,7847,3957,7711,3965,7573,3942,7436,3944,7300,3953,7164,3969,7028,3978,6892,3974,6755,3652,6621,3657,6487,3651,6354,3637,6220,3631,6085,3638,5951,3625,5817,3620,5683,3616,5548,3616,5413,3621,5278,3623,5144,3616,5009,3620,4874,3620,4739,3621,4604,3621,4469,3633,4334,3628,4200,3630,4065,3633,3930,3618,3795,3611,3661,3612,3527,3620,3393,3626,3259,3635,3125,3630,2991,3634,2857,3633,2723,3630,2589,3636,2455,3638,2321,3642,2187,3643,2053,3636,1919,3631,1785,3621,1650,3618,1516,3617,1381,3621,1246,3626,1111,3630,976,3637,841,3639,707,3633,8772,3633,8637,3632,8502,3631,8367,3633,8233,3643,8098,3642,7963,3636,7829,3633,7694,3625,7559,3611,7425,3623,7291,3628,7157,3638,7023,3627,6889,3637,6755,3277,6621,3277,6487,3277,6353,3277,6219,3277,6085,3277,5951,3277,5816,3277,5682,3277,5548,3277,5413,3277,5278,3277,5143,3277,5009,3277,4874,3277,4739,3277,4604,3277,4469,3277,4334,3277,4200,3277,4066,3277,3930,3277,3795,3277,3661,3277,3527,3277,3393,3277,3260,3277,3125,3277,2991,3277,2857,3277,2723,3277,2589,3277,2454,3277,2320,3277,2186,3277,2052,3277,1918,3277,1784,3277,1650,3277,1516,3277,1381,3277,1245,3277,1111,3277,976,3277,841,3277,707,3277,8772,3277,8637,3277,8502,3277,8368,3277,8233,3277,8098,3277,7964,3277,7830,3277,7695,3277,7560,3277,7426,3277,7292,3277,7158,3277,7024,3277,6890,3277,6755,2900,6621,2894,6488,2907,6354,2911,6220,2914,6085,2910,5950,2913,5816,2918,5682,2924,5547,2927,5413,2934,5279,2938,5144,2930,5009,2925,4874,2916,4739,2908,4604,2902,4470,2899,4335,2901,4201,2891,4067,2889,3932,2899,3797,2909,3662,2915,3528,2909,3394,2906,3259,2909,3125,2914,2991,2907,2857,2913,2723,2912,2589,2905,2455,2902,2321,2902,2187,2906,2053,2906,1918,2902,1783,2907,1649,2908,1514,2907,1380,2910,1245,2913,1111,2924,976,2937,842,2938,707,2937,8772,2937,8637,2929,8502,2912,8367,2908,8232,2908,8097,2914,7963,2916,7829,2923,7695,2922,7560,2927,7426,2920,7292,2911,7158,2902,7024,2901,6889,2902,6755,2558,6619,2559,6483,2571,6347,2560,6210,2554,6074,2569,5937,2574,5800,2581,5664,2598,5527,2600,5390,2603,5253,2599,5116,2599,4979,2594,4842,2574,4705,2563,4568,2560,4431,2552,4293,2555,4156,2549,4019,2553,3883,2559,3745,2573,3610,2550,3473,2557,3336,2556,3200,2564,3064,2557,2927,2564,2791,2572,2655,2561,2518,2552,2382,2547,2246,2543,2109,2553,1973,2553,1837,2576,1700,2568,1563,2560,1426,2555,1289,2568,1152,2579,1015,2594,878,2610,741,2610,8806,2610,8669,2603,8532,2588,8395,2571,8257,2573,8120,2566,7983,2583,7847,2581,7710,2588,7574,2585,7437,2586,7300,2579,7164,2565,7028,2539,6892,2554,6755,2216,6615,2241,6474,2247,6332,2210,6191,2237,6050,2262,5909,2264,5766,2267,5625,2288,5483,2295,5342,2302,5200,2290,5059,2282,4917,2269,4775,2235,4633,2239,4490,2246,4349,2208,4207,2204,4066,2208,3924,2216,3781,2249,3641,2227,3499,2234,3358,2217,3217,2234,3076,2247,2934,2249,2793,2267,2652,2258,2511,2241,2370,2235,2229,2217,2087,2213,1946,2222,1805,2227,1663,2228,1522,2219,1380,2235,1239,2250,1097,2268,955,2289,813,2295,8878,2295,8736,2288,8594,2279,8452,2275,8310,2265,8168,2262,8027,2248,7886,2257,7745,2247,7603,2238,7461,2249,7320,2246,7178,2240,7037,2216,6896,2213,6755,1878,6609,1902,6463,1890,6316,1882,6170,1917,6025,1959,5877,1965,5730,1974,5583,1994,5437,2004,5290,2005,5144,2007,4997,1978,4849,1948,4702,1924,4555,1920,4408,1914,4261,1907,4114,1916,3968,1897,3821,1906,3675,1915,3528,1939,3381,1937,3235,1938,3088,1967,2942,1996,2796,1977,2650,1976,2504,1970,2357,1957,2211,1939,2065,1961,1918,1960,1772,1943,1624,1907,1478,1894,1332,1948,1185,1975,1037,1975,890,1988,743,2018,8808,2018,8661,2006,8514,2005,8367,1994,8221,1960,8074,1941,7927,1951,7780,1966,7634,1946,7487,1943,7341,1930,7194,1939,7048,1938,6902,1899,6755,1626,6601,1636,6446,1600,6291,1585,6136,1601,5982,1643,5826,1658,5671,1705,5516,1728,5360,1726,5205,1725,5050,1694,4895,1682,4739,1663,4584,1639,4428,1623,4273,1648,4117,1661,3962,1663,3808,1626,3652,1655,3496,1689,3342,1692,3187,1690,3032,1713,2878,1717,2723,1696,2568,1699,2413,1695,2259,1683,2104,1680,1949,1695,1795,1683,1639,1649,1483,1612,1329,1658,1174,1689,1018,1710,862,1733,707,1748,8772,1748,8616,1749,8461,1738,8305,1719,8150,1693,7995,1654,7840,1639,7685,1648,7529,1666,7374,1673,7219,1656,7065,1642,6910,1641,6755,1425,6591,1392,6427,1373,6263,1316,6098,1337,5935,1399,5769,1396,5605,1442,5440,1455,5275,1429,5110,1456,4946,1445,4780,1410,4615,1412,4450,1416,4285,1380,4120,1410,3956,1410,3791,1401,3626,1427,3462,1467,3298,1463,3133,1461,2969,1464,2805,1450,2641,1439,2476,1437,2312,1442,2148,1437,1984,1443,1820,1425,1655,1404,1490,1383,1326,1401,1160,1383,995,1429,830,1458,8895,1458,8730,1482,8565,1496,8400,1475,8235,1465,8071,1429,7906,1412,7742,1399,7577,1415,7413,1410,7248,1411,7084,1435,6919,1445,6755,1241,6577,1200,6398,1142,6219,1064,6040,1088,5861,1125,5682,1177,5503,1212,5323,1194,5143,1186,4964,1198,4784,1197,4604,1171,4424,1197,4245,1133,4111,1128,4066,1119,4022,1124,3887,1151,3843,1170,3706,1236,3526,1296,3348,1248,3170,1221,2991,1245,2812,1237,2633,1221,2455,1194,2276,1200,2097,1210,1919,1226,1739,1188,1560,1173,1380,1151,1200,1107,1021,1138,841,1187,8906,1187,8727,1215,8547,1229,8367,1225,8187,1216,8008,1192,7829,1177,7650,1212,7471,1217,7292,1215,7113,1249,6934,1249,6755,1005,6554,937,6353,915,6152,825,5951,878,5750,917,5548,948,5346,972,5143,948,4941,978,4739,954,4537,957,4335,942,4220,1090,4193,1048,4127,1086,4096,1103,4050,1024,4065,991,4033,995,4035,1069,3872,983,3902,932,3884,912,3766,1123,3773,1072,3716,1156,3722,1102,3728,1054,3526,1085,3326,1058,3125,1044,2924,1021,2723,1020,2522,969,2321,972,2119,983,1919,1019,1717,992,1515,990,1313,961,1111,937,908,893,707,950,8772,950,8569,970,8367,1020,8164,1006,7963,1012,7761,1008,7560,1030,7359,1053,7158,1059,6957,1062,6755,840,6526,791,6296,738,6066,645,5836,672,5605,700,5375,784,5144,772,4912,757,4681,787,4450,749,4219,803,4152,933,4133,968,4100,931,4173,890,4119,894,4066,889,4047,918,3807,868,3815,828,3757,848,3749,895,3742,946,3527,876,3297,877,3067,862,2838,824,2608,777,2378,779,2148,759,1918,773,1688,781,1457,796,1227,791,995,751,764,699,8829,699,8598,718,8367,741,8136,794,7905,785,7675,831,7445,885,7216,866,6985,883,6755,665,6487,594,6219,532,5951,469,5682,513,5413,587,5144,603,4874,595,4604,606,4335,620,4065,681,4162,809,3988,818,3796,658,3527,652,3259,660,2991,677,2723,607,2455,576,2186,576,1918,593,1649,568,1380,584,1111,561,841,527,8907,527,8637,470,8367,502,8097,580,7829,610,7560,651,7292,662,7024,718,6755,456,6420,399,6085,342,5750,391,5413,429,5076,431,4739,467,4402,475,4065,500,3729,457,3394,431,3058,500,2723,475,2388,433,2052,437,1716,415,1380,396,1044,385,707,368,8772,368,8435,321,8098,397,7762,440,7426,498,7090,535,7987,8310,7667,8310,7968,8675,7627,8661,7851,9030,7467,8983,7609,9314,7190,9208,7304,9524,6964,9661,6862,9336,6601,9691,6513,9370,6243,9639,6171,9287,5916,9492,5883,9088,5621,9288,5391,9007,5651,8823,5277,8663,5549,8485,5219,8310,5545,8134,5249,7949,5661,7803,5390,7613,5606,7317,5877,7526,5892,7086,6162,7314,6232,6937,6511,7227,6601,6879,6872,7241,6978,6908,7312,7083,7198,7399,7590,7324,7454,7647,7786,7627,7608,7965,7906,7961,7343,8310,7239,8677,6964,8937,6601,9030,6239,8935,5966,8675,5863,8310,5965,7944,6231,7671,6601,7570,6974,7664,7240,7942,6976,8310,6785,8628,6416,8628,6227,8310,6413,7986,6790,7984,6601,8310,3584,5706,3758,5853,3727,5810,3702,5821,3776,5956,3715,5923,3649,5849,3708,5867,3676,5833,3786,6006,3851,6027,3813,5988,3805,5797,3796,5734,3773,5767,3883,5776,3849,5737,3862,5811,3981,6081,3941,6038,4045,6107,3918,5820,3904,5744,3973,5844,4001,6145,3934,6121,3917,6054,3586,5769,3557,5780,3685,5673,3681,5627,3596,5994,3593,5929,3827,5915,3875,5879,3816,5860,3766,5908,3741,5914,3787,5682,3736,5690,3829,5614,3779,5621,3839,5677,3527,5913,3582,5658,3527,5583,3932,5893,3838,5968,3759,6020,3591,5875,3620,5861,3645,5802,3690,5716,3640,5747,3758,5661,3714,5708,3614,5756,3628,5972,3653,5896,3892,6073,3985,5999,3860,5646,3839,5835,4023,6124,3953,5869,3637,5694,3666,5730,3559,5891,3687,5936,3792,5883,3863,5950,3818,5706,3852,1113,3920,953,3932,889,3894,876,3958,850,3972,841,3918,845,4016,966,3956,1012,3968,951,3908,1013,4164,1012,4145,1046,4084,854,4140,852,4104,809,4028,850,3992,854,3781,1015,3789,964,3814,1080,3823,1027,4081,1082,3944,874,3963,892,3798,1194,3759,1175,3753,1219,4195,840,3897,1088,3880,1065,3944,1072,4031,937,3995,894,3981,916,4003,1004,3990,1069,3977,1129,3932,1143,4200,1130,4155,1131,4187,1111,4173,1092,4046,817,3931,814,3735,994,3711,1201,4030,896,4011,878,4159,1067,4114,1009,4098,982,4081,955,3843,1033,3862,1039,4179,827,3843,917,3853,877,3798,916,3863,849,3873,813,3905,863,3806,1141,3999,943,4065,832,4065,936,3803,1018,3833,956,4097,1041,4130,1029,4066,1054,4102,873],"i":[0,1,2,0,2,3,0,3,4,0,4,5,0,5,6,0,6,1,1,7,8,1,8,2,2,8,9,2,9,10,2,10,3,3,10,11,3,11,12,3,12,4,4,12,13,4,13,14,4,14,5,5,14,15,5,15,16,5,16,6,6,16,17,6,17,18,6,18,1,1,18,7,7,19,20,7,20,8,8,20,21,8,21,22,8,22,9,9,22,23,9,23,10,10,23,24,10,24,25,10,25,11,11,25,26,11,26,12,12,26,27,12,27,28,12,28,13,13,28,29,13,29,30,13,30,14,14,30,31,14,31,15,15,31,32,15,32,33,15,33,16,16,33,34,16,34,17,17,34,35,17,35,36,17,36,18,18,36,37,18,37,7,7,37,19,19,38,39,19,39,20,20,39,40,20,40,21,21,40,41,21,41,22,22,41,42,22,42,43,22,43,23,23,43,44,23,44,24,24,44,45,24,45,25,25,45,46,25,46,26,26,46,47,26,47,48,26,48,27,27,48,49,27,49,28,28,49,50,28,50,29,29,50,51,29,51,30,30,51,52,30,52,53,30,53,31,31,53,54,31,54,32,32,54,55,32,55,33,33,55,56,33,56,34,34,56,57,34,57,58,34,58,35,35,58,59,35,59,36,36,59,60,36,60,37,37,60,61,37,61,19,19,61,38,62,63,64,62,64,65,65,64,66,65,66,67,67,66,68,67,68,69,69,68,70,69,70,71,71,70,72,71,72,73,71,73,74,74,73,75,74,75,76,76,75,77,76,77,78,78,77,79,78,79,80,80,79,81,80,82,83,80,83,84,84,83,85,84,86,87,87,86,88,87,88,89,89,88,90,89,90,91,91,90,92,91,92,93,91,93,94,94,93,95,94,95,96,96,95,97,96,97,98,98,97,99,98,99,100,100,99,101,100,101,102,100,102,103,103,102,104,103,104,105,106,107,108,106,108,109,109,108,110,109,110,111,111,110,112,111,112,113,111,113,114,114,113,115,114,115,116,116,115,117,116,117,118,118,117,119,118,119,62,62,119,63,63,120,121,63,121,64,64,121,122,64,122,66,66,122,123,66,123,68,68,123,124,68,124,70,70,124,125,70,125,72,72,125,126,72,126,73,73,126,127,73,127,128,73,128,75,75,128,129,75,129,77,77,129,130,77,130,79,79,130,131,79,131,81,132,131,133,134,135,136,137,135,138,139,140,141,142,143,144,142,144,145,86,145,88,88,145,146,88,146,90,90,146,147,90,147,92,92,147,148,92,148,93,93,148,149,93,149,95,95,149,150,95,150,97,97,150,151,97,151,152,97,152,99,99,152,153,99,153,101,101,153,154,101,154,102,102,154,155,102,155,104,104,155,156,107,157,108,108,157,158,108,158,110,110,158,159,110,159,160,110,160,112,112,160,161,112,161,113,113,161,162,113,162,115,115,162,163,115,163,117,117,163,164,117,164,119,119,164,165,119,165,63,63,165,120,120,166,167,120,167,121,121,167,168,121,168,122,122,168,169,122,169,123,123,169,170,123,170,124,124,170,171,124,171,125,125,171,172,125,172,126,126,172,173,126,173,127,127,173,174,127,174,175,127,175,128,128,175,176,128,176,129,129,176,177,129,177,130,130,177,178,130,178,131,131,178,179,131,179,180,181,179,182,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,195,145,145,195,197,145,197,146,146,197,198,146,198,147,147,198,199,147,199,148,148,199,200,148,200,149,149,200,201,149,201,150,150,201,202,150,202,151,151,202,203,151,203,204,151,204,152,152,204,205,152,205,153,153,205,206,153,206,154,154,206,207,154,207,155,155,207,208,155,208,156,156,208,209,157,210,158,158,210,211,158,211,159,159,211,212,159,212,213,159,213,160,160,213,214,160,214,161,161,214,215,161,215,162,162,215,216,162,216,163,163,216,217,163,217,164,164,217,218,164,218,165,165,218,219,165,219,120,120,219,166,166,220,221,166,221,167,167,221,222,167,222,168,168,222,223,168,223,169,169,223,224,169,224,170,170,224,225,170,225,171,171,225,226,171,226,172,172,226,227,172,227,173,173,227,228,173,228,174,174,228,229,174,229,230,174,230,175,175,230,231,175,231,176,176,231,232,176,232,177,177,232,233,177,233,178,178,233,234,178,234,179,179,234,235,179,235,185,185,235,236,185,236,186,237,236,238,239,238,240,240,238,241,240,241,242,240,242,195,195,242,243,195,243,197,197,243,244,197,244,198,198,244,245,198,245,199,199,245,246,199,246,200,200,246,247,200,247,201,201,247,248,201,248,202,202,248,249,202,249,203,203,249,250,203,250,251,203,251,204,204,251,252,204,252,205,205,252,253,205,253,206,206,253,254,206,254,207,207,254,255,207,255,208,208,255,256,208,256,209,210,257,258,210,258,211,211,258,259,211,259,212,212,259,260,212,260,261,212,261,213,213,261,262,213,262,214,214,262,263,214,263,215,215,263,264,215,264,216,216,264,265,216,265,217,217,265,266,217,266,218,218,266,267,218,267,219,219,267,268,219,268,166,166,268,220,220,269,270,220,270,221,221,270,271,221,271,222,222,271,272,222,272,223,223,272,273,223,273,224,224,273,274,224,274,225,225,274,275,225,275,226,226,275,276,226,276,227,227,276,277,227,277,228,228,277,278,228,278,229,229,278,279,229,279,230,230,279,280,230,280,231,231,280,281,231,281,282,231,282,232,232,282,283,232,283,233,233,283,284,233,284,234,234,284,285,234,285,235,235,285,286,235,286,236,236,286,287,236,287,238,238,287,288,238,288,241,241,288,289,241,289,242,242,289,290,242,290,243,243,290,291,243,291,244,244,291,292,244,292,245,245,292,293,245,293,294,245,294,246,246,294,295,246,295,247,247,295,296,247,296,248,248,296,297,248,297,249,249,297,298,249,298,250,250,298,299,250,299,251,251,299,300,251,300,252,252,300,301,252,301,253,253,301,302,253,302,254,254,302,303,254,303,255,255,303,304,255,304,256,256,304,305,257,306,307,257,307,258,258,307,308,258,308,259,259,308,309,259,309,260,260,309,310,260,310,261,261,310,311,261,311,262,262,311,312,262,312,263,263,312,313,263,313,264,264,313,314,264,314,265,265,314,315,265,315,266,266,315,316,266,316,267,267,316,317,267,317,268,268,317,318,268,318,220,220,318,269,269,319,320,269,320,270,270,320,321,270,321,271,271,321,322,271,322,272,272,322,323,272,323,273,273,323,324,273,324,274,274,324,325,274,325,275,275,325,326,275,326,276,276,326,327,276,327,277,277,327,328,277,328,278,278,328,329,278,329,279,279,329,330,279,330,280,280,330,331,280,331,281,281,331,332,281,332,282,282,332,333,282,333,283,283,333,334,283,334,284,284,334,335,284,335,285,285,335,336,285,336,337,285,337,286,286,337,338,286,338,287,287,338,339,287,339,288,288,339,340,288,340,289,289,340,341,289,341,290,290,341,342,290,342,291,291,342,343,291,343,292,292,343,344,292,344,293,293,344,345,293,345,294,294,345,346,294,346,295,295,346,347,295,347,296,296,347,348,296,348,297,297,348,349,297,349,298,298,349,350,298,350,299,299,350,351,299,351,300,300,351,352,300,352,301,301,352,353,301,353,354,301,354,302,302,354,355,302,355,303,303,355,356,303,356,304,304,356,357,304,357,305,305,357,358,306,359,307,307,359,360,307,360,308,308,360,361,308,361,309,309,361,362,309,362,310,310,362,363,310,363,311,311,363,364,311,364,312,312,364,365,312,365,313,313,365,366,313,366,314,314,366,367,314,367,315,315,367,368,315,368,316,316,368,369,316,369,317,317,369,370,317,370,318,318,370,371,318,371,269,269,371,319,319,372,373,319,373,320,320,373,374,320,374,321,321,374,375,321,375,322,322,375,376,322,376,323,323,376,377,323,377,324,324,377,378,324,378,325,325,378,379,325,379,326,326,379,380,326,380,327,327,380,381,327,381,328,328,381,382,328,382,329,329,382,383,329,383,330,330,383,384,330,384,331,331,384,385,331,385,332,332,385,386,332,386,333,333,386,387,333,387,334,334,387,388,334,388,335,335,388,389,335,389,336,336,389,390,336,390,391,336,391,337,337,391,392,337,392,338,338,392,393,338,393,339,339,393,394,339,394,340,340,394,395,340,395,341,341,395,396,341,396,342,342,396,397,342,397,343,343,397,398,343,398,344,344,398,399,344,399,345,345,399,400,345,400,346,346,400,401,346,401,347,347,401,402,347,402,348,348,402,403,348,403,349,349,403,404,349,404,350,350,404,405,350,405,351,351,405,406,351,406,352,352,406,407,352,407,353,353,407,408,353,408,409,353,409,354,354,409,410,354,410,355,355,410,411,355,411,356,356,411,412,356,412,357,357,412,413,357,413,358,359,414,415,359,415,360,360,415,416,360,416,361,361,416,417,361,417,362,362,417,418,362,418,363,363,418,419,363,419,364,364,419,420,364,420,365,365,420,421,365,421,366,366,421,422,366,422,367,367,422,423,367,423,368,368,423,424,368,424,369,369,424,425,369,425,370,370,425,426,370,426,371,371,426,427,371,427,319,319,427,372,372,428,429,372,429,373,373,429,430,373,430,374,374,430,431,374,431,375,375,431,432,375,432,376,376,432,433,376,433,377,377,433,434,377,434,378,378,434,435,378,435,379,379,435,436,379,436,380,380,436,437,380,437,381,381,437,438,381,438,382,382,438,439,382,439,383,383,439,440,383,440,384,384,440,441,384,441,385,385,441,442,385,442,386,386,442,443,386,443,387,387,443,444,387,444,388,388,444,445,388,445,389,389,445,446,389,446,390,390,446,447,390,447,391,391,447,448,391,448,392,392,448,449,392,449,393,393,449,450,393,450,394,394,450,451,394,451,395,395,451,452,395,452,396,396,452,453,396,453,397,397,453,454,397,454,398,398,454,455,398,455,399,399,455,456,399,456,457,399,457,400,400,457,458,400,458,401,401,458,459,401,459,402,402,459,460,402,460,403,403,460,461,403,461,404,404,461,462,404,462,405,405,462,463,405,463,406,406,463,464,406,464,407,407,464,465,407,465,408,408,465,466,408,466,409,409,466,467,409,467,410,410,467,468,410,468,411,411,468,469,411,469,412,412,469,470,412,470,413,414,471,472,414,472,415,415,472,473,415,473,416,416,473,474,416,474,417,417,474,475,417,475,418,418,475,476,418,476,419,419,476,477,419,477,420,420,477,478,420,478,421,421,478,479,421,479,422,422,479,480,422,480,423,423,480,481,423,481,424,424,481,482,424,482,425,425,482,483,425,483,426,426,483,484,426,484,427,427,484,485,427,485,372,372,485,428,428,486,487,428,487,429,429,487,488,429,488,430,430,488,489,430,489,431,431,489,490,431,490,432,432,490,491,432,491,433,433,491,492,433,492,434,434,492,493,434,493,435,435,493,494,435,494,436,436,494,495,436,495,437,437,495,496,437,496,438,438,496,497,438,497,439,439,497,498,439,498,440,440,498,499,440,499,441,441,499,500,441,500,442,442,500,501,442,501,443,443,501,502,443,502,444,444,502,503,444,503,445,445,503,504,445,504,446,446,504,505,446,505,447,447,505,506,447,506,448,448,506,507,448,507,449,449,507,508,449,508,450,450,508,509,450,509,451,451,509,510,451,510,452,452,510,511,452,511,453,453,511,512,453,512,454,454,512,513,454,513,455,455,513,514,455,514,456,456,514,515,456,515,516,456,516,457,457,516,517,457,517,458,458,517,518,458,518,459,459,518,519,459,519,460,460,519,520,460,520,461,461,520,521,461,521,462,462,521,522,462,522,463,463,522,523,463,523,464,464,523,524,464,524,465,465,524,525,465,525,466,466,525,526,466,526,467,467,526,527,467,527,468,468,527,528,468,528,469,469,528,529,469,529,470,470,529,530,471,531,472,472,531,532,472,532,473,473,532,533,473,533,474,474,533,534,474,534,475,475,534,535,475,535,476,476,535,536,476,536,477,477,536,537,477,537,478,478,537,538,478,538,479,479,538,539,479,539,480,480,539,540,480,540,481,481,540,541,481,541,482,482,541,542,482,542,483,483,542,543,483,543,484,484,543,544,484,544,485,485,544,545,485,545,428,428,545,486,486,546,547,486,547,487,487,547,548,487,548,488,488,548,549,488,549,489,489,549,550,489,550,490,490,550,551,490,551,491,491,551,552,491,552,492,492,552,553,492,553,493,493,553,554,493,554,494,494,554,555,494,555,495,495,555,556,495,556,496,496,556,557,496,557,497,497,557,558,497,558,498,498,558,559,498,559,499,499,559,560,499,560,500,500,560,561,500,561,501,501,561,562,501,562,502,502,562,563,502,563,503,503,563,564,503,564,504,504,564,565,504,565,505,505,565,566,505,566,506,506,566,567,506,567,507,507,567,568,507,568,508,508,568,569,508,569,509,509,569,570,509,570,510,510,570,571,510,571,511,511,571,572,511,572,512,512,572,573,512,573,513,513,573,574,513,574,514,514,574,575,514,575,515,515,575,576,515,576,516,516,576,577,516,577,517,517,577,578,517,578,518,518,578,579,518,579,519,519,579,580,519,580,520,520,580,581,520,581,521,521,581,582,521,582,522,522,582,583,522,583,523,523,583,584,523,584,524,524,584,585,524,585,525,525,585,586,525,586,526,526,586,587,526,587,527,527,587,588,527,588,528,528,588,589,528,589,529,529,589,590,529,590,530,530,590,591,531,592,532,532,592,593,532,593,533,533,593,594,533,594,534,534,594,595,534,595,535,535,595,596,535,596,536,536,596,597,536,597,537,537,597,598,537,598,538,538,598,599,538,599,539,539,599,600,539,600,540,540,600,601,540,601,541,541,601,602,541,602,542,542,602,603,542,603,543,543,603,604,543,604,544,544,604,605,544,605,545,545,605,606,545,606,486,486,606,546,546,607,547,547,607,608,547,608,548,548,608,609,548,609,549,549,609,610,549,610,550,550,610,611,550,611,551,551,611,612,551,612,552,552,612,613,552,613,553,553,613,614,553,614,554,554,614,615,554,615,555,555,615,616,555,616,556,556,616,617,556,617,557,557,617,618,557,618,558,558,618,619,558,619,559,559,619,620,559,620,560,560,620,621,560,621,561,561,621,622,561,622,562,562,622,623,562,623,563,563,623,624,563,624,564,564,624,625,564,625,565,565,625,626,565,626,566,566,626,627,566,627,567,567,627,628,567,628,568,568,628,629,568,629,569,569,629,630,569,630,570,570,630,631,570,631,571,571,631,632,571,632,572,572,632,633,572,633,573,573,633,634,573,634,574,574,634,635,574,635,575,575,635,636,575,636,576,576,636,637,576,637,577,577,637,638,577,638,578,578,638,639,578,639,579,579,639,640,579,640,580,580,640,641,580,641,581,581,641,642,581,642,582,582,642,643,582,643,583,583,643,644,583,644,584,584,644,645,584,645,585,585,645,646,585,646,586,586,646,647,586,647,587,587,647,648,587,648,588,588,648,649,588,649,589,589,649,650,589,650,590,590,650,651,590,651,591,591,651,652,592,653,593,593,653,654,593,654,594,594,654,655,594,655,595,595,655,656,595,656,596,596,656,657,596,657,597,597,657,658,597,658,598,598,658,659,598,659,599,599,659,660,599,660,600,600,660,661,600,661,601,601,661,662,601,662,602,602,662,663,602,663,603,603,663,664,603,664,604,604,664,665,604,665,605,605,665,666,605,666,606,606,666,667,606,667,546,546,667,607,607,668,608,608,668,669,608,669,609,609,669,670,609,670,610,610,670,671,610,671,611,611,671,672,611,672,612,612,672,673,612,673,613,613,673,674,613,674,614,614,674,675,614,675,615,615,675,676,615,676,616,616,676,677,616,677,617,617,677,678,617,678,618,618,678,679,618,679,619,619,679,680,619,680,620,620,680,681,620,681,621,621,681,682,621,682,622,622,682,683,622,683,623,623,683,684,623,684,624,624,684,685,624,685,625,625,685,686,625,686,626,626,686,687,626,687,627,627,687,688,627,688,628,628,688,689,628,689,629,629,689,690,629,690,630,630,690,691,630,691,631,631,691,692,631,692,632,632,692,693,632,693,633,633,693,694,633,694,634,634,694,695,634,695,635,635,695,696,635,696,636,636,696,697,636,697,637,637,697,698,637,698,638,638,698,699,638,699,639,639,699,700,639,700,640,640,700,701,640,701,641,641,701,702,641,702,642,642,702,703,642,703,643,643,703,704,643,704,644,644,704,705,644,705,645,645,705,706,645,706,646,646,706,707,646,707,647,647,707,708,647,708,648,648,708,709,648,709,649,649,709,710,649,710,650,650,710,711,650,711,651,651,711,712,651,712,652,652,712,713,653,714,654,654,714,715,654,715,655,655,715,716,655,716,656,656,716,717,656,717,657,657,717,718,657,718,658,658,718,719,658,719,659,659,719,720,659,720,660,660,720,721,660,721,661,661,721,722,661,722,662,662,722,723,662,723,663,663,723,724,663,724,664,664,724,725,664,725,665,665,725,726,665,726,666,666,726,727,666,727,667,667,727,728,667,728,607,607,728,668,668,729,669,669,729,730,669,730,670,670,730,731,670,731,671,671,731,732,671,732,672,672,732,733,672,733,673,673,733,734,673,734,674,674,734,735,674,735,675,675,735,736,675,736,676,676,736,737,676,737,677,677,737,738,677,738,678,678,738,739,678,739,679,679,739,740,679,740,680,680,740,741,680,741,681,681,741,742,681,742,682,682,742,743,682,743,683,683,743,744,683,744,684,684,744,745,684,745,685,685,745,746,685,746,686,686,746,747,686,747,687,687,747,748,687,748,688,688,748,749,688,749,689,689,749,750,689,750,690,690,750,751,690,751,691,691,751,752,691,752,692,692,752,753,692,753,693,693,753,754,693,754,694,694,754,755,694,755,695,695,755,756,695,756,696,696,756,757,696,757,697,697,757,758,697,758,698,698,758,759,698,759,699,699,759,760,699,760,700,700,760,761,700,761,701,701,761,762,701,762,702,702,762,763,702,763,703,703,763,764,703,764,704,704,764,765,704,765,705,705,765,766,705,766,706,706,766,767,706,767,707,707,767,768,707,768,708,708,768,769,708,769,709,709,769,770,709,770,710,710,770,771,710,771,711,711,771,772,711,772,712,712,772,773,712,773,713,714,774,775,714,775,715,715,775,776,715,776,716,716,776,777,716,777,717,717,777,778,717,778,718,718,778,779,718,779,719,719,779,780,719,780,720,720,780,781,720,781,721,721,781,782,721,782,722,722,782,783,722,783,723,723,783,784,723,784,724,724,784,785,724,785,725,725,785,786,725,786,726,726,786,787,726,787,727,727,787,788,727,788,728,728,788,668,668,788,729,729,789,730,730,789,790,730,790,731,731,790,791,731,791,732,732,791,792,732,792,733,733,792,793,733,793,734,734,793,794,734,794,735,735,794,795,735,795,736,736,795,796,736,796,737,737,796,797,737,797,738,738,797,798,738,798,739,739,798,799,739,799,740,740,799,800,740,800,741,741,800,801,741,801,742,742,801,802,742,802,743,743,802,803,743,803,744,744,803,804,744,804,745,745,804,805,745,805,746,746,805,806,746,806,747,747,806,807,747,807,748,748,807,808,748,808,749,749,808,809,749,809,750,750,809,810,750,810,751,751,810,811,751,811,752,752,811,812,752,812,753,753,812,813,753,813,754,754,813,814,754,814,755,755,814,815,755,815,756,756,815,816,756,816,757,757,816,817,757,817,758,758,817,759,759,817,818,759,818,760,760,818,819,760,819,761,761,819,820,761,820,762,762,820,821,762,821,763,763,821,822,763,822,764,764,822,823,764,823,765,765,823,824,765,824,766,766,824,825,766,825,767,767,825,826,767,826,768,768,826,827,768,827,769,769,827,828,769,828,770,770,828,829,770,829,771,771,829,830,771,830,772,772,830,831,772,831,773,774,832,833,774,833,775,775,833,834,775,834,776,776,834,835,776,835,777,777,835,836,777,836,778,778,836,837,778,837,779,779,837,838,779,838,780,780,838,839,780,839,781,781,839,840,781,840,782,782,840,841,782,841,783,783,841,842,783,842,784,784,842,843,784,843,785,785,843,844,785,844,786,786,844,845,786,845,787,787,845,846,787,846,788,788,846,729,729,846,789,789,847,790,790,847,848,790,848,791,791,848,849,791,849,792,792,849,850,792,850,793,793,850,851,793,851,794,794,851,852,794,852,795,795,852,853,795,853,796,796,853,854,796,854,797,797,854,855,797,855,798,798,855,856,798,856,799,799,856,857,799,857,800,800,857,858,800,858,801,801,858,859,801,859,802,802,859,860,802,860,803,803,860,861,803,861,804,804,861,862,804,862,805,805,862,863,805,863,806,806,863,864,806,864,807,807,864,865,807,865,808,808,865,866,808,866,809,809,866,867,809,867,810,810,867,868,810,868,811,811,868,869,811,869,812,812,869,870,812,870,813,813,870,871,813,871,814,814,871,872,814,872,815,815,872,873,815,873,816,816,873,874,816,874,817,817,874,818,818,874,875,818,875,819,819,875,876,819,876,820,820,876,877,820,877,821,821,877,878,821,878,822,822,878,879,822,879,823,823,879,880,823,880,824,824,880,881,824,881,825,825,881,882,825,882,826,826,882,883,826,883,827,827,883,884,827,884,828,828,884,885,828,885,829,829,885,886,829,886,830,830,886,887,830,887,831,831,887,888,832,889,833,833,889,890,833,890,834,834,890,891,834,891,835,835,891,892,835,892,836,836,892,893,836,893,837,837,893,894,837,894,838,838,894,895,838,895,839,839,895,896,839,896,840,840,896,897,840,897,841,841,897,898,841,898,842,842,898,899,842,899,843,843,899,900,843,900,844,844,900,901,844,901,845,845,901,902,845,902,846,846,902,789,789,902,847,847,903,848,848,903,904,848,904,849,849,904,905,849,905,850,850,905,906,850,906,851,851,906,907,851,907,852,852,907,908,852,908,853,853,908,909,853,909,854,854,909,910,854,910,855,855,910,911,855,911,856,856,911,912,856,912,857,857,912,913,857,913,858,858,913,914,858,914,859,859,914,915,859,915,860,860,915,916,860,916,861,861,916,917,861,917,862,862,917,918,862,918,863,863,918,919,863,919,864,864,919,920,864,920,865,865,920,866,866,920,921,866,921,867,867,921,922,867,922,868,868,922,923,868,923,869,869,923,924,869,924,870,870,924,925,870,925,871,871,925,926,871,926,872,872,926,927,872,927,873,873,927,928,873,928,874,874,928,929,874,929,875,875,929,930,875,930,876,876,930,931,876,931,877,877,931,932,877,932,878,878,932,933,878,933,879,879,933,934,879,934,880,880,934,935,880,935,881,881,935,936,881,936,882,882,936,937,882,937,883,883,937,884,884,937,938,884,938,885,885,938,939,885,939,886,886,939,940,886,940,887,887,940,941,887,941,888,888,941,942,889,943,890,890,943,944,890,944,891,891,944,945,891,945,892,892,945,946,892,946,893,893,946,947,893,947,894,894,947,948,894,948,895,895,948,949,895,949,896,896,949,950,896,950,897,897,950,951,897,951,898,898,951,952,898,952,899,899,952,953,899,953,900,900,953,954,900,954,901,901,954,955,901,955,902,902,955,847,847,955,903,903,956,904,904,956,957,904,957,905,905,957,958,905,958,906,906,958,959,906,959,907,907,959,960,907,960,908,908,960,961,908,961,909,909,961,962,909,962,910,910,962,963,910,963,911,911,963,964,911,964,912,912,964,965,912,965,913,913,965,966,913,966,914,914,966,967,914,967,915,915,967,968,915,968,916,916,968,969,916,969,917,917,969,970,917,970,918,918,970,971,918,971,919,919,971,972,919,972,920,920,972,921,921,972,973,921,973,922,922,973,974,922,974,923,923,974,975,923,975,924,924,975,976,924,976,925,925,976,977,925,977,926,926,977,978,926,978,927,927,978,979,927,979,928,928,979,980,928,980,929,929,980,981,929,981,930,930,981,982,930,982,931,931,982,983,931,983,932,932,983,984,932,984,933,933,984,985,933,985,934,934,985,986,934,986,935,935,986,987,935,987,936,936,987,988,936,988,937,937,988,938,938,988,989,938,989,939,939,989,990,939,990,940,940,990,991,940,991,941,941,991,992,941,992,942,943,993,994,943,994,944,944,994,995,944,995,945,945,995,996,945,996,946,946,996,997,946,997,947,947,997,998,947,998,948,948,998,999,948,999,949,949,999,1000,949,1000,950,950,1000,1001,950,1001,951,951,1001,1002,951,1002,952,952,1002,1003,952,1003,953,953,1003,1004,953,1004,954,954,1004,1005,954,1005,955,955,1005,903,903,1005,956,956,1006,957,957,1006,1007,957,1007,958,958,1007,1008,958,1008,959,959,1008,1009,959,1009,960,960,1009,1010,960,1010,961,961,1010,1011,961,1011,962,962,1011,1012,962,1012,963,963,1012,1013,963,1013,964,964,1013,1014,964,1014,965,965,1014,1015,965,1015,966,966,1015,1016,966,1016,967,967,1016,1017,967,1017,968,968,1017,969,969,1017,1018,969,1018,970,970,1018,1019,970,1019,971,971,1019,1020,971,1020,972,972,1021,1022,972,1022,973,973,1022,1023,973,1024,974,974,1024,1025,974,1026,975,975,1026,1027,975,1027,976,976,1027,1028,976,1028,977,977,1028,1029,977,1029,978,978,1029,1030,978,1030,979,979,1030,1031,979,1031,980,980,1031,981,981,1031,1032,981,1032,982,982,1032,1033,982,1033,983,983,1033,1034,983,1034,984,984,1034,1035,984,1035,985,985,1035,1036,985,1036,986,986,1036,1037,986,1037,987,987,1037,1038,987,1038,988,988,1038,1039,988,1039,989,989,1039,1040,989,1040,990,990,1040,1041,990,1041,991,991,1041,1042,991,1042,992,993,1043,994,994,1043,1044,994,1044,995,995,1044,1045,995,1045,996,996,1045,1046,996,1046,997,997,1046,1047,997,1047,998,998,1047,1048,998,1048,999,999,1048,1049,999,1049,1000,1000,1049,1050,1000,1050,1001,1001,1050,1051,1001,1051,1002,1002,1051,1052,1002,1052,1003,1003,1052,1053,1003,1053,1004,1004,1053,1054,1004,1054,1005,1005,1054,956,956,1054,1006,1006,1055,1007,1007,1055,1056,1007,1056,1008,1008,1056,1057,1008,1057,1009,1009,1057,1058,1009,1058,1010,1010,1058,1059,1010,1059,1011,1011,1059,1060,1011,1060,1012,1012,1060,1061,1012,1061,1013,1013,1061,1062,1013,1062,1014,1014,1062,1015,1015,1062,1063,1015,1063,1016,1016,1063,1064,1016,1064,1017,1017,1064,1065,1017,1065,1018,1018,1065,1066,1018,1066,1019,1019,1066,1067,1019,1067,1020,1068,1067,1069,1021,1070,1071,1072,1073,1074,1022,1075,1023,1076,1077,1078,1079,1080,1081,1082,1083,1027,1027,1083,1084,1027,1084,1028,1028,1084,1085,1028,1085,1029,1029,1085,1086,1029,1086,1030,1030,1086,1087,1030,1087,1031,1031,1087,1088,1031,1088,1032,1032,1088,1089,1032,1089,1033,1033,1089,1090,1033,1090,1034,1034,1090,1091,1034,1091,1035,1035,1091,1036,1036,1091,1092,1036,1092,1037,1037,1092,1093,1037,1093,1038,1038,1093,1094,1038,1094,1039,1039,1094,1095,1039,1095,1040,1040,1095,1096,1040,1096,1041,1041,1096,1097,1041,1097,1042,1042,1097,1098,1043,1099,1044,1044,1099,1100,1044,1100,1045,1045,1100,1046,1046,1100,1101,1046,1101,1047,1047,1101,1102,1047,1102,1048,1048,1102,1103,1048,1103,1049,1049,1103,1104,1049,1104,1050,1050,1104,1105,1050,1105,1051,1051,1105,1106,1051,1106,1052,1052,1106,1107,1052,1107,1053,1053,1107,1108,1053,1108,1054,1054,1108,1006,1006,1108,1055,1055,1109,1056,1056,1109,1110,1056,1110,1057,1057,1110,1111,1057,1111,1058,1058,1111,1112,1058,1112,1059,1059,1112,1113,1059,1113,1060,1060,1113,1114,1060,1114,1061,1061,1114,1115,1061,1115,1062,1062,1115,1063,1063,1115,1116,1063,1116,1064,1064,1116,1117,1064,1117,1065,1065,1117,1118,1065,1118,1066,1066,1118,1119,1066,1119,1067,1067,1119,1120,1067,1121,1122,1123,1124,1125,1123,1126,1127,1128,1129,1130,1128,1131,1132,1132,1131,1084,1084,1130,1133,1084,1133,1085,1085,1133,1134,1085,1134,1086,1086,1134,1135,1086,1135,1087,1087,1135,1136,1087,1136,1088,1088,1136,1137,1088,1137,1089,1089,1137,1138,1089,1138,1090,1090,1138,1139,1090,1139,1091,1091,1139,1092,1092,1139,1140,1092,1140,1093,1093,1140,1141,1093,1141,1094,1094,1141,1142,1094,1142,1095,1095,1142,1143,1095,1143,1096,1096,1143,1144,1096,1144,1097,1097,1144,1145,1097,1145,1098,1099,1146,1147,1099,1147,1100,1100,1147,1101,1101,1147,1148,1101,1148,1102,1102,1148,1149,1102,1149,1103,1103,1149,1150,1103,1150,1104,1104,1150,1151,1104,1151,1105,1105,1151,1152,1105,1152,1106,1106,1152,1153,1106,1153,1107,1107,1153,1154,1107,1154,1108,1108,1154,1055,1055,1154,1109,1109,1155,1110,1110,1155,1156,1110,1156,1111,1111,1156,1157,1111,1157,1112,1112,1157,1158,1112,1158,1113,1113,1158,1159,1113,1159,1114,1114,1159,1160,1114,1160,1115,1115,1160,1116,1116,1160,1161,1116,1161,1117,1117,1161,1162,1117,1162,1118,1118,1162,1163,1118,1163,1119,1119,1163,1164,1119,1164,1120,1120,1164,1165,1120,1165,1166,1167,1165,1168,1129,1168,1130,1130,1168,1133,1133,1168,1169,1133,1169,1134,1134,1169,1170,1134,1170,1135,1135,1170,1171,1135,1171,1136,1136,1171,1172,1136,1172,1137,1137,1172,1173,1137,1173,1138,1138,1173,1174,1138,1174,1139,1139,1174,1140,1140,1174,1175,1140,1175,1141,1141,1175,1176,1141,1176,1142,1142,1176,1177,1142,1177,1143,1143,1177,1178,1143,1178,1144,1144,1178,1179,1144,1179,1145,1146,1180,1181,1146,1181,1147,1147,1181,1148,1148,1181,1182,1148,1182,1149,1149,1182,1183,1149,1183,1150,1150,1183,1184,1150,1184,1151,1151,1184,1185,1151,1185,1152,1152,1185,1186,1152,1186,1153,1153,1186,1187,1153,1187,1154,1154,1187,1109,1109,1187,1155,1155,1188,1156,1156,1188,1189,1156,1189,1157,1157,1189,1190,1157,1190,1158,1158,1190,1191,1158,1191,1159,1159,1191,1160,1160,1191,1192,1160,1192,1161,1161,1192,1193,1161,1193,1162,1162,1193,1194,1162,1194,1163,1163,1194,1195,1163,1195,1164,1164,1195,1165,1165,1195,1196,1165,1196,1168,1168,1196,1197,1168,1197,1169,1169,1197,1198,1169,1198,1170,1170,1198,1199,1170,1199,1171,1171,1199,1172,1172,1199,1200,1172,1200,1173,1173,1200,1201,1173,1201,1174,1174,1201,1202,1174,1202,1175,1175,1202,1203,1175,1203,1176,1176,1203,1177,1177,1203,1204,1177,1204,1178,1178,1204,1205,1178,1205,1179,1179,1205,1206,1180,1207,1181,1181,1207,1208,1181,1208,1182,1182,1208,1183,1183,1208,1209,1183,1209,1184,1184,1209,1210,1184,1210,1185,1185,1210,1211,1185,1211,1186,1186,1211,1212,1186,1212,1187,1187,1212,1155,1155,1212,1188,1213,1214,1215,1215,1214,1216,1215,1216,1217,1217,1216,1218,1217,1218,1219,1219,1218,1220,1219,1220,1221,1221,1220,1222,1222,1220,1223,1222,1223,1224,1224,1223,1225,1224,1225,1226,1226,1225,1227,1226,1227,1228,1228,1227,1229,1228,1229,1230,1230,1229,1231,1231,1229,1232,1231,1232,1233,1233,1232,1234,1233,1234,1235,1235,1234,1236,1235,1236,1237,1237,1236,1238,1237,1238,1239,1239,1238,1240,1240,1238,1241,1240,1241,1242,1242,1241,1243,1242,1243,1244,1244,1243,1245,1244,1245,1246,1246,1245,1247,1246,1247,1248,1248,1247,1249,1249,1247,1250,1249,1250,1251,1251,1250,1252,1251,1252,1253,1253,1252,1254,1253,1254,1255,1255,1254,1213,1213,1254,1214,1214,1256,1216,1216,1256,1257,1216,1257,1218,1218,1257,1220,1220,1257,1258,1220,1258,1223,1223,1258,1259,1223,1259,1225,1225,1259,1227,1227,1259,1260,1227,1260,1229,1229,1260,1261,1229,1261,1232,1232,1261,1234,1234,1261,1262,1234,1262,1236,1236,1262,1238,1238,1262,1263,1238,1263,1241,1241,1263,1264,1241,1264,1243,1243,1264,1245,1245,1264,1265,1245,1265,1247,1247,1265,1266,1247,1266,1250,1250,1266,1252,1252,1266,1267,1252,1267,1254,1254,1267,1214,1214,1267,1256,1256,1268,1257,1257,1268,1258,1258,1268,1269,1258,1269,1259,1259,1269,1260,1260,1269,1270,1260,1270,1261,1261,1270,1262,1262,1270,1271,1262,1271,1263,1263,1271,1264,1264,1271,1272,1264,1272,1265,1265,1272,1266,1266,1272,1273,1266,1273,1267,1267,1273,1256,1256,1273,1268,1268,1274,1269,1269,1274,1270,1270,1274,1271,1271,1274,1272,1272,1274,1273,1273,1274,1268,193,1275,194,1276,1277,1278,139,1279,1280,1281,1282,1283,1284,1285,1286,82,1285,83,1287,1288,1289,1290,1291,1292,1293,134,1294,1295,131,132,1296,181,1297,1298,179,181,80,1299,1300,1293,1301,1300,1302,1275,196,143,1302,1303,1304,237,1305,237,238,1305,1306,1307,86,84,1306,86,1292,1291,1287,1308,1309,1310,1279,1308,1311,1312,1282,1280,188,1288,1313,1314,237,1304,1315,236,1316,1317,1315,1313,86,1318,145,86,1307,1318,194,1319,192,1320,240,195,1299,1293,1300,1295,132,1293,1321,1296,1309,1298,181,1296,1279,1322,1308,137,1309,1308,1323,139,85,1284,1279,139,1324,1325,143,1281,1326,143,189,188,1327,189,1328,1326,1313,1315,1316,1314,1313,1329,192,239,240,1320,192,240,190,1304,191,188,1330,1327,1326,1328,1331,1275,1319,194,1312,1311,1282,1282,1276,1278,141,140,1332,1307,1333,1324,1300,1301,1334,1285,1322,1286,1335,133,135,135,1321,138,1317,1336,1315,181,183,1297,187,1287,1289,1337,1287,1310,133,131,180,133,180,135,1293,1294,1301,1301,136,1285,1338,1295,1293,81,131,1295,180,1298,1339,180,179,1298,1337,1292,1287,1296,1292,1309,182,179,185,182,185,184,1293,132,134,1335,135,134,80,1300,82,1300,1334,82,80,81,1299,1338,1293,1299,143,1326,1302,1326,1331,1302,1327,1304,1340,189,1327,1341,1278,189,1326,1282,1278,1283,142,1324,143,1307,1324,1342,1305,238,191,1304,1305,191,1275,1340,1319,1319,1340,192,192,191,239,191,238,239,1280,1282,1333,139,1280,1343,85,139,141,84,85,141,84,141,1306,141,1332,1306,1310,1287,1276,1308,1310,1344,1297,184,1291,1290,1297,1291,135,180,1321,180,1339,1321,1285,136,1322,1322,136,1345,1323,1284,139,83,1285,1284,1311,1308,1344,1311,1276,1282,139,1343,140,140,1333,1307,136,137,1345,136,135,137,188,1314,1330,188,1313,1314,1291,1317,1346,1291,184,1317,189,1341,1328,1328,1340,1275,1276,187,1277,1276,1287,187,186,236,1315,1336,186,1315,1287,1291,1288,1288,1291,1346,1316,236,237,1313,1316,1329,1318,1307,1342,1318,142,145,144,143,1303,144,196,145,1325,1281,143,1333,1282,1281,1340,190,192,1340,1304,190,194,1320,195,194,192,1320,196,193,195,196,1275,193,132,1335,134,132,133,1335,81,1338,1299,81,1295,1338,1294,134,136,1294,136,1301,1334,1301,1285,1334,1285,82,1309,1337,1310,1309,1292,1337,183,182,184,183,184,1297,1296,1290,1292,1296,1297,1290,1339,1298,1296,1339,1296,1321,1345,137,1308,1322,1345,1308,1286,1322,1279,1284,1286,1279,1344,1310,1276,1311,1344,1276,138,1321,1309,137,138,1309,1279,1312,1280,1279,1311,1312,1343,1280,1333,1343,1333,140,83,1323,85,83,1284,1323,1332,140,1307,1332,1307,1306,1303,1302,196,144,1303,196,1342,1324,142,1318,1342,142,1324,1333,1325,1333,1281,1325,1283,1278,1326,1281,1283,1326,1331,1328,1275,1331,1275,1302,1330,1314,1304,1330,1304,1327,1341,1327,1340,1341,1340,1328,1277,187,189,1277,189,1278,1329,1316,237,1314,1329,237,1317,184,1336,184,186,1336,1346,1317,1313,1288,1346,1313,1289,1288,188,187,1289,188,1024,1347,1025,1348,1077,1076,1349,1350,1078,1351,1352,1353,1074,1073,1354,1355,1356,1357,1069,1067,1358,1069,1358,1359,1360,1361,1362,1363,1352,1364,1365,1366,1083,1367,1368,1080,1022,1369,1075,1070,1369,1071,1349,1370,1350,1371,1370,1349,1372,1373,1374,974,1372,1374,1067,1120,1375,1124,1361,1125,1376,1357,1377,1355,1357,1378,1379,1380,1381,1382,1354,1356,1383,1382,1378,973,1384,1385,972,1386,1387,1388,1389,1387,1390,1165,1167,1363,1390,1167,1353,1167,1391,1167,1168,1391,1083,1392,1084,1366,1392,1083,1393,1081,1027,1373,1081,1393,1127,1394,1380,1395,1351,1380,1387,1389,1070,1069,1359,1396,1397,1398,1073,1073,1399,1379,1367,1400,1368,1401,1400,1367,1375,1120,1402,1402,1120,1166,1403,1404,1366,1405,1132,1366,1378,1357,1376,1384,1378,1385,1406,1353,1407,1408,1353,1404,1372,1409,1373,1079,1081,1373,1347,1401,1367,1347,1409,1372,1080,1365,1083,1080,1083,1082,1350,1408,1404,1350,1404,1403,1405,1128,1132,1406,1407,1128,1075,1072,1382,1075,1382,1383,1356,1410,1381,1356,1349,1348,1386,1388,1387,1020,1067,1068,1358,1067,1122,1358,1122,1397,1395,1363,1364,1360,1362,1411,1399,1412,1379,1122,1121,1123,1377,1357,1401,1357,1076,1401,1080,1413,1365,1414,1366,1365,1078,1350,1414,1076,1078,1414,1404,1405,1366,1404,1128,1405,1068,1069,1389,1389,1069,1396,1415,1397,1073,1416,1397,1415,1354,1073,1379,1354,1410,1356,1070,1415,1369,1369,1415,1417,1404,1406,1128,1404,1353,1406,1363,1167,1352,1352,1167,1353,1380,1351,1370,1370,1351,1350,1379,1127,1380,1412,1127,1379,1374,1373,1026,974,1374,1026,1025,1347,1372,974,1025,1372,1367,1079,1373,1367,1080,1079,1126,1360,1363,1126,1418,1360,1124,1375,1361,1067,1375,1124,1067,1124,1121,1121,1124,1123,1368,1076,1414,1368,1413,1080,1357,1348,1076,1356,1348,1357,1384,1383,1378,1075,1383,1384,1024,1376,1347,1378,1376,1024,1417,1415,1072,1415,1073,1072,1394,1395,1380,1126,1363,1395,1381,1371,1349,1356,1381,1349,1073,1398,1399,1122,1123,1399,1385,1378,1024,973,1385,1024,1023,1075,1384,973,1023,1384,1382,1355,1378,1382,1356,1355,1359,1416,1415,1359,1415,1070,972,1387,1021,1387,1070,1021,972,1020,1386,1020,1068,1386,1411,1362,1390,1362,1165,1390,1166,1165,1362,1361,1166,1362,1125,1418,1126,1123,1125,1126,1350,1351,1408,1351,1353,1408,1391,1168,1407,1353,1391,1407,1128,1407,1129,1407,1168,1129,1128,1130,1131,1131,1130,1084,1414,1403,1366,1350,1403,1414,1366,1132,1392,1392,1132,1084,1347,1367,1409,1409,1367,1373,1026,1393,1027,1373,1393,1026,1081,1082,1027,1080,1082,1081,1381,1380,1371,1380,1370,1371,1364,1352,1351,1395,1364,1351,1399,1123,1412,1123,1127,1412,1127,1126,1394,1126,1395,1394,1386,1068,1388,1068,1389,1388,1071,1369,1022,1021,1071,1022,1359,1358,1416,1358,1397,1416,1396,1359,1070,1389,1396,1070,1397,1122,1398,1398,1122,1399,1354,1379,1410,1410,1379,1381,1075,1417,1072,1369,1417,1075,1382,1074,1354,1072,1074,1382,1401,1076,1400,1400,1076,1368,1368,1414,1413,1413,1414,1365,1347,1377,1401,1376,1377,1347,1348,1349,1077,1077,1349,1078,1125,1361,1418,1418,1361,1360,1363,1411,1390,1360,1411,1363,1361,1402,1166,1375,1402,1361]}};
function crateredAsteroid(r,seed,variant=speciesHash(String(seed))%5){
 // Compact rubble, fractured, flattened and blocky bodies dominate. Eros is
 // an occasional elongated member, never the default for an entire cluster.
 const style=asteroidWorld(),family=variant===4?'eros':'bennu',source=ASTEROID_REFERENCE_MESHES[family],size=Math.min(r.w*.55,r.h*.65),forms=[[1,.93,.89],[.95,1.05,.83],[1.12,.70,.86],[.91,.87,1.10],[.76,1.08,1.14]],stretch=forms[variant].map((v,k)=>v*(.96+.06*Math.sin(seed*2.1+k*1.9))),points=[],pigments=[],craters=[];
 // Large impact bowls are geometry, so their rims silhouette and catch light.
 // Unequal sizes and broken rims avoid the uniform dimples of the old spheres.
 for(let i=0;i<7;i++){const a=seed*.7+i*2.399963,z=-.78+i*.26,l=Math.sqrt(1-z*z);craters.push({n:[Math.cos(a)*l,z,Math.sin(a)*l],radius:i<2?.46:i<4?.32:.22,depth:i<2?.24:.14,phase:a});}
 for(let i=0;i<source.p.length;i+=3){const p=source.p.slice(i,i+3).map(v=>v/10000);if(variant===1||variant===3){
  // Shallow fracture planes break the compact outline without deforming in flight.
  for(let j=0;j<7;j++){const a=seed+j*2.399,b=.65*Math.sin(j*1.8+seed),n=[Math.cos(a)*Math.cos(b),Math.sin(b),Math.sin(a)*Math.cos(b)],d=p.reduce((v,x,k)=>v+x*n[k],0),limit=.75+.13*Math.sin(j*4.1+seed);if(d>limit)for(let k=0;k<3;k++)p[k]-=n[k]*(d-limit);}
 }
 const len=Math.hypot(...p),n=p.map(v=>v/len);let cut=0,rim=0;
 for(const c of craters){const d=Math.sqrt(Math.max(0,2-2*n.reduce((v,x,k)=>v+x*c.n[k],0)))/c.radius;if(d<1.35){const bowl=Math.pow(Math.max(0,1-d*d),2),lip=Math.exp(-Math.pow((d-.94)/.16,2))*(.65+.35*Math.sin(n[0]*23+n[1]*19+c.phase));cut+=c.depth*bowl;rim+=.075*lip;}}
 const fracture=.036*(Math.abs(Math.sin(n[0]*12+n[1]*5+seed))*Math.abs(Math.cos(n[2]*11-n[1]*7))-.4),radius=Math.max(.6,1-cut+rim+fracture);
 points.push(p.map((v,k)=>v*radius*size*stretch[k]));pigments.push(clamp(1-cut*1.2+rim*1.8,.65,1.15));}

 // Solid-volume centroid, not the middle of the bounding box: all poses rotate
 // about the mass, so asymmetric bodies do not orbit an invisible attachment.
 let volume=0;const center=[0,0,0];
 for(let i=0;i<source.i.length;i+=3){const a=points[source.i[i]],b=points[source.i[i+1]],c=points[source.i[i+2]],v=a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]);volume+=v;for(let k=0;k<3;k++)center[k]+=(a[k]+b[k]+c[k])*v/4;}
 if(Math.abs(volume)>1e-6)for(const p of points)for(let k=0;k<3;k++)p[k]-=center[k]/volume;
 const color=style.color.map(c=>Math.round(137+(c-165)*.16)),faces=[];
 for(let i=0;i<source.i.length;i+=3){const ids=source.i.slice(i,i+3);faces.push({v:ids.map(n=>points[n]),uv:ids.map(n=>[source.uv[n*2]/10000,source.uv[n*2+1]/10000]),c:color,vertexColors:ids.map(n=>color.map(c=>c*pigments[n])),em:0,flex:0});}
 faces.rock=true;faces.asteroidFinish=style;faces.asteroidReference=family;faces.asteroidVariant=variant;faces.impactBasins=craters.length;return faces;
}


function rigidAsteroidPassage(o){const parts=[],t=0;for(let i=0;i<2;i++){const center=380+(i===0?-1:1)*(45+Math.sin(t*.65+i*.8)*20),gap=330+Math.sin(t*.9+i)*12;parts.push({x:o.x+i*250,y:center-gap/2-190,w:180,h:190,ceiling:true},{x:o.x+i*250,y:center+gap/2,w:180,h:190,ceiling:false});}return parts;}

function drawDreamAtmosphere(){if(sectors[level].gravityWell)return;const c=['#72e4dc','#e6b35f','#b9a0ec'][level%3],distance=sceneryDistance();ctx.save();for(let i=0;i<14;i++){const p=sceneryPosition((i*137)%W,70+(i*83+Math.sin(distance*.001+i)*6)%(H-140),.32+(i%3)*.045,35);orb(p.x,p.y,2+i%3,c,.10);if(i%4===0){ctx.strokeStyle=c;ctx.globalAlpha=.08;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo(p.x-12,p.y+22,p.x-36,p.y+13);ctx.stroke();}}ctx.restore();}

function bossBodyHit(b,x,y,padding=0){
 const d=bossDesign();if(!d)return Math.hypot(b.x-x,b.y-y)<b.r+padding;
 const pose=bossFlightPose(b),scale=d.scale,key=[b.age,b.propulsionTime,b.propulsion,b.flightBank,b.actionLoad,b.attackDrive,pose.yaw,pose.roll,pose.pitch,scale].join(':');
 // Mixed weapon radii share the pose without repeatedly rebuilding all volumes.
 // Keep this cache on the actor, bounded even if future weapons vary their size.
 let cache=b.bodyProjectionCache;
 if(!cache||cache.design!==d){cache=b.bodyProjectionCache={design:d,key,byPadding:new Map()};}
 else if(cache.key!==key){cache.key=key;cache.byPadding.clear();}
 let volumes=cache.byPadding.get(padding);
 if(!volumes){volumes=d.bodyVolumes.map(({center:c,radii:r})=>{
  const local=bossLocalPoint(b,c),center=rotateVertex(local,pose.yaw,pose.roll,pose.pitch,0,0),axes=r.map((radius,i)=>{
   const lo=c.slice(),hi=c.slice();lo[i]-=.5;hi[i]+=.5;const a=bossLocalPoint(b,lo),z=bossLocalPoint(b,hi),v=z.map((q,j)=>(q-a[j])*(radius*scale+padding));return rotateVertex(v,pose.yaw,pose.roll,pose.pitch,0,0);
  });let xx=0,yy=0,xy=0;for(const a of axes){xx+=a[0]*a[0];yy+=a[1]*a[1];xy+=a[0]*a[1];}return{x:center[0]*scale,y:center[1]*scale,xx,yy,xy,det:xx*yy-xy*xy};
 });if(cache.byPadding.size>=8)cache.byPadding.clear();cache.byPadding.set(padding,volumes);}
 b.bodyHitVolumes=volumes;return volumes.some(v=>{const dx=x-b.x-v.x,dy=y-b.y-v.y;return(v.yy*dx*dx-2*v.xy*dx*dy+v.xx*dy*dy)<=v.det;});
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
 // The corona fills this view. The central black hole belongs to the distant
 // system view and is occluded by the stellar atmosphere here; painting it after
 // the panorama incorrectly puts an opaque disc in front of nearby plasma.
 const painting=art[definition.background];if(imageReady(painting))drawPanorama(painting);else paintStellarDisc(ctx,W*.45,H*2.2,W*.85,star);
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
function projectGalaxyPoint(x,y,angle){const co=Math.cos(angle),si=Math.sin(angle);return{x:x*co-y*.625*si,y:x*si+y*.625*co};}
function galaxySystemOffset(system,width,seconds=navigationSeconds()){
 const position=system.galacticPosition||[.70,.40];return projectGalaxyPoint((position[0]-.5)*width,(position[1]-.5)*width,galaxyRotation(GALAXIES[system.galaxyId],seconds));
}
const galaxyCreditLines=new WeakMap();
function drawGalaxyObservationCredit(c,galaxy,alpha){
 if(!galaxy.observation||alpha<.15)return;
 c.save();c.globalAlpha=Math.min(1,alpha);c.font='11px sans-serif';c.fillStyle='#a5bbc6';
 let lines=galaxyCreditLines.get(galaxy);if(!lines){const words=(galaxy.reference+' — '+galaxy.credit).split(' ');lines=[];let line='';
 for(const word of words){const next=line?line+' '+word:word;if(next.length>155){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);galaxyCreditLines.set(galaxy,lines);}
 const y=H-24-lines.length*14;for(let i=0;i<lines.length;i++)c.fillText(lines[i],38,y+i*14);c.restore();
}
function paintRotatingGalaxy(c,galaxy,x,y,width,alpha=1,seconds=navigationSeconds()){
 const artwork=galaxyArtwork(galaxy);
 if(artwork){c.save();c.globalAlpha*=alpha*spaceArtworkReveal(artwork.photoReadyAt);c.globalCompositeOperation='screen';c.translate(x,y);c.rotate(galaxyRotation(galaxy,seconds));c.drawImage(artwork,-width/2,-width*.3125,width,width*.625);c.restore();}
 if(galaxy.centralBlackHole){c.save();c.globalAlpha*=alpha;paintNavigationBlackHole(c,x,y,width*.025);c.restore();}
 if(artwork&&c===ctx)drawGalaxyObservationCredit(c,galaxy,alpha);
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
function navigationStarCamera(blend=sectorBlend){
 if(!blend?.destination)return{x:0,y:0,zoom:1};const u=blend.age/blend.duration,origin=blend.origin,destination=blend.destination;
 // Galaxy magnification is the reference scale. Depth attenuates each star's
 // parallax; its apparent point size is independent of the camera magnification.
 if(!origin){const p=navigationEase((u-.14)/.34),system=expeditionSystem(destination),offset=galaxySystemOffset(system,1000);return{x:offset.x*p*.65,y:offset.y*p*.65,zoom:Math.exp(p*Math.log(14))};}
 if(origin.galaxyId!==destination.galaxyId){const p=navigationEase((u-.18)/.57),outbound=1-navigationEase((u-.18)/.14),inbound=navigationEase((u-.58)/.17),heading=galaxyFlightHeading(destination),flight=galaxyCrossingPose(destination,(u-.32)/.26);return{x:heading.x*W*.95*p,y:heading.y*H*p,zoom:Math.exp((outbound+inbound)*Math.log(14)),flight};}
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
// Artwork, resolved galaxy stars and flight stars share this route. The
// vanishing point follows the arriving galaxy rather than an unrelated wobble.
function galaxyCrossingPose(destination,progress){
 const p=clamp(progress,0,1),heading=galaxyFlightHeading(destination),exit=navigationEase(p/.32),entry=navigationEase((p-.43)/.57);
 const outgoing={gx:W*.5-heading.x*W*.3*exit,gy:H*.52-heading.y*H*.3*exit,width:1000*Math.exp(-exit*2.6),alpha:1-exit};
 const incoming={gx:W*.5+heading.x*W*.34*(1-entry),gy:H*.52+heading.y*H*.34*(1-entry),width:24*Math.exp(entry*Math.log(1000/24)),alpha:entry};
 const up=.24,down=.64,speed=navigationEase(p/up)*(1-navigationEase((p-down)/(1-down)));
 const integral=t=>{t=clamp(t,0,1);return t*t*t*t*(2.5+t*(-3+t));};
 const distance=8*(up*integral(p/up)+Math.max(0,p-up)-(1-down)*integral((p-down)/(1-down)));
 const turn=navigationEase(p/.43);
 return{p,speed,distance,outgoing,incoming,x:W*.5+(incoming.gx-W*.5)*turn,y:H*.52+(incoming.gy-H*.52)*turn,label:p<up?'ACCELERATING':p<down?'LIGHT-SPEED TRANSIT':'DECELERATING'};
}
function navigationStarProjection(star,depth,camera,out={}){
 const scale=1/(1-depth*(1-1/camera.zoom)),width=W*scale,height=H*scale,margin=6;
 let x=((star.x*scale-camera.x*depth*scale-(width-W)/2+margin)%width+width)%width-margin,y=((star.y*scale-camera.y*depth*scale-(height-H)/2+margin)%height+height)%height-margin;
 out.alpha=1;out.cycle=0;
 if(camera.flight){
  const f=camera.flight,z0=.8+((star.x*.017+star.y*.031+depth*7)%1)*3,raw=z0-f.distance*(.55+depth),z=.16+((raw-.16)%4+4)%4;
  out.cycle=Math.floor((raw-.16)/4);
  // The exact same points accelerate out of their departure positions. Keep
  // accumulated depth after braking so arrival never swaps back to old stars.
  const magnification=z0/z,edge=Math.min(x+margin,width-margin-x,y+margin,height-margin-y);
  x=f.x+(x-f.x)*magnification;y=f.y+(y-f.y)*magnification;
  out.alpha=navigationEase((z-.16)/.30)*(out.cycle<0?navigationEase((4.16-z)/.35):1);
  // Recycled, distant points can expose a wrapped tile edge inside the view.
  // Hide that seam locally instead of crossfading an entire replacement field.
  if(magnification<1)out.alpha*=1-(1-navigationEase(edge/32))*navigationEase((1-magnification)/.2);
 }
 out.x=x;out.y=y;out.r=Math.min(1.35,star.r*(1+Math.log(scale)*.10));return out;
}
function navigationWarpState(blend=sectorBlend){
 if(!blend?.origin||!blend.destination||blend.origin.galaxyId===blend.destination.galaxyId)return null;
 const p=(blend.age/blend.duration-.32)/.26;if(p<=1e-9||p>=1-1e-9)return null;
 return galaxyCrossingPose(blend.destination,p);
}
function navigationWarpProjection(star,depth,warp,out={},camera=navigationStarCamera(),previous=null,tail={}){
 navigationStarProjection(star,depth,camera,out);
 navigationStarProjection(star,depth,previous||{...camera,flight:{...camera.flight,distance:Math.max(0,warp.distance-warp.speed*.14)}},tail);
 const dx=tail.x-out.x,dy=tail.y-out.y,limit=out.cycle===tail.cycle?Math.min(1,180/Math.max(1,Math.hypot(dx,dy))):0;
 out.tx=out.x+dx*limit;out.ty=out.y+dy*limit;return out;
}
function drawNavigationStars(){
 const camera=navigationStarCamera(),warp=navigationWarpState(),previous=warp?navigationStarCamera({...sectorBlend,age:Math.max(0,sectorBlend.age-.065*warp.speed)}):null,p={},tail={};ctx.save();ctx.lineCap='round';
 // A single retained field throughout the journey. Motion-blur tails sample
 // the same projection at an earlier camera time, including the course turn.
 for(const layer of navigationStarLayers())for(const group of layer.groups){
  ctx.fillStyle=group.color;ctx.strokeStyle=group.color;ctx.lineWidth=.7+layer.depth;
  if(warp){ctx.beginPath();for(const star of group.points){
   navigationWarpProjection(star,layer.depth,warp,p,camera,previous,tail);
   if(p.alpha<.08||p.x<-190||p.x>W+190||p.y<-190||p.y>H+190)continue;
   ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+(p.tx-p.x)*p.alpha,p.y+(p.ty-p.y)*p.alpha);
  }ctx.stroke();}
  ctx.beginPath();for(const star of group.points){navigationStarProjection(star,layer.depth,camera,p);if(p.x<-3||p.x>W+3||p.y<-3||p.y>H+3)continue;const r=p.r*p.alpha;ctx.moveTo(p.x+r,p.y);ctx.arc(p.x,p.y,r,0,TAU);}ctx.fill();
 }
 ctx.restore();drawNavigationGalacticField();
}
// A morphology-aware distribution is used both while artwork loads and when
// the camera resolves the distant glow into individual stars. It is seeded,
// bounded and built once per galaxy, never regenerated each frame.
function galaxyStarPoint(galaxy,i,random){
 const type=galaxy.morphology||'spiral',u=random(i+2),v=random(i+900),j=random(i+1800);let r,a,x,y;
 if(type==='ring'||type==='collisional-ring'){r=i%9? .31+(u-.5)*.07:Math.pow(u,1.6)*.075;a=v*TAU;return{x:Math.cos(a)*r,y:Math.sin(a)*r};}
 if(type==='elliptical'||type==='active'){r=Math.pow(u,1.8)*.46;a=v*TAU;return{x:Math.cos(a)*r,y:Math.sin(a)*r*.84};}
 if(type==='edge-on'||type==='lenticular'||type==='starburst'){x=(u-.5)*.87;y=(v-.5)*(.04+.15*(1-Math.abs(x)*2));if(type==='starburst'&&i%5===0){x=(u-.5)*.22;y=(v-.5)*.7;}return{x,y};}
 if(type==='polar-ring'){a=v*TAU;r=.3+(u-.5)*.05;return i%3?{x:Math.cos(a)*r*.28,y:Math.sin(a)*r}:{x:(u-.5)*.62,y:(v-.5)*.065};}
 if(type==='irregular'||type==='interacting'){const lobes=type==='interacting'?2:5,lobe=i%lobes,angle=lobe*2.399;return{x:Math.cos(angle)*.16+(u-.5)*.30,y:Math.sin(angle)*.19+(v-.5)*.25};}
 if(type==='tidal'){if(i%3===0)return{x:-.15+u*.52,y:-.18+u*.58+(v-.5)*.035};return{x:-.16+(u-.5)*.26,y:-.18+(v-.5)*.22};}
 if(type==='dust-lane'){r=Math.pow(u,1.3)*.43;a=v*TAU;return{x:Math.cos(a)*r,y:Math.sin(a)*r*.72};}
 r=Math.sqrt(u)*.44;a=i%(galaxy.arms||3)*TAU/(galaxy.arms||3)+r*(galaxy.twist||3)*5+(j-.5)*(type==='flocculent'?1.9:.55);
 x=Math.cos(a)*r;y=Math.sin(a)*r;if(type==='barred'&&i%3===0){x=(u-.5)*.42;y=(v-.5)*.055;}return{x,y};
}
const resolvedGalaxyStars=new Map();
function drawResolvedGalaxyStars(location,pose,alpha=1){
 const system=expeditionSystem(location),galaxy=expeditionGalaxy(location);let stars=resolvedGalaxyStars.get(system.id);
 if(!stars){const random=n=>{const v=Math.sin(n*127.1+galaxy.seed*31.7)*43758.5453;return v-Math.floor(v);},target=system.galacticPosition||[.7,.4];stars=[];
  for(let i=0;i<700;i++){const local=i>=350,r=Math.sqrt(random(i+2))*.11,angle=random(i+900)*TAU,p=local?{x:Math.cos(angle)*r+target[0]-.5,y:Math.sin(angle)*r+target[1]-.5}:galaxyStarPoint(galaxy,i,random);stars.push({...p,z:(random(i+2600)-.5)*.2,r:.32+random(i+3300)*.48});}
  while(resolvedGalaxyStars.size>=3)resolvedGalaxyStars.delete(resolvedGalaxyStars.keys().next().value);resolvedGalaxyStars.set(system.id,stars);
 }
 const angle=galaxyRotation(galaxy),co=Math.cos(angle),si=Math.sin(angle),magnification=pose.width/1000;
 ctx.save();ctx.globalAlpha*=alpha*.55;ctx.fillStyle='#b8cddd';ctx.beginPath();
 for(const star of stars){const depth=1/(1-star.z*(1-1/Math.max(1,magnification))),x=pose.gx+(star.x*co-star.y*.625*si)*pose.width*depth,y=pose.gy+(star.x*si+star.y*.625*co)*pose.width*depth,r=Math.min(1.15,star.r*(1+Math.log(Math.max(1,magnification))*.12));if(x<-3||x>W+3||y<-3||y>H+3)continue;ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,TAU);}
 ctx.fill();ctx.restore();
}
function drawNavigationGalacticField(){
 if(!sectorBlend?.destination)return;const {origin,destination}=sectorBlend,u=sectorBlend.age/sectorBlend.duration;
 if(!origin){const p=galaxyApproachPose(expeditionSystem(destination),Math.max(0,(u-.14)/.34)),settle=navigationEase(u/.14);ctx.save();ctx.translate(W*.215*(1-settle),-H*.12*(1-settle));ctx.translate(W*.5,H*.52);ctx.scale(.77+.23*settle,.77+.23*settle);ctx.translate(-W*.5,-H*.52);drawResolvedGalaxyStars(destination,p);ctx.restore();return;}
 if(origin.galaxyId===destination.galaxyId){drawResolvedGalaxyStars(destination,galaxyApproachPose(expeditionSystem(destination),1));return;}
 if(u<.32){drawResolvedGalaxyStars(origin,galaxyApproachPose(expeditionSystem(origin),u<.18?1:1-(u-.18)/.14));return;}
 if(u<.58){const route=galaxyCrossingPose(destination,(u-.32)/.26);drawResolvedGalaxyStars(origin,route.outgoing,route.outgoing.alpha);drawResolvedGalaxyStars(destination,route.incoming,route.incoming.alpha);return;}
 drawResolvedGalaxyStars(destination,galaxyApproachPose(expeditionSystem(destination),Math.min(1,(u-.58)/.17)));
}
// One reversible camera: chart position → complete globe → curved horizon →
// local scenery. Departure uses the same path backwards, with the real outgoing
// scenery retained until the horizon is visible. No mid-flight planet swap.
function navigationEase(value){const t=clamp(value,0,1);return t*t*t*(t*(t*6-15)+10);}
function planetSurfaceBlend(progress){return clamp((progress-.64)/.32,0,1);}
function planetCameraPose(location,progress){
 const t=clamp(progress,0,1),ease=navigationEase(t),system=expeditionSystem(location),layout=systemOrbitLayout(system,navigationOrbitTime()),target=layout.find(p=>p.destination.id===location.destinationId)||{x:400,y:272};
 // Let the globe fill the window, then blend before the extreme texture zoom.
 const r=44*Math.exp(ease*Math.log(H*.68/44)),center=ease*ease;
 return {r,x:W*.5+(target.x-400)*1.1*(1-ease),y:H*.52+(target.y-272)*1.1*(1-ease)+r*.10*center,surface:planetSurfaceBlend(t)};
}
// Derive scene reveal from the same travel phase as the planet camera.
// Never expose a bright destination behind the galaxy before its arrival fade.
function navigationSurfaceReveal(blend){
 const u=clamp(blend.age/blend.duration,0,1);let approach;
 if(!blend.origin)approach=(u-.48)/.52;
 else if(blend.origin.galaxyId!==blend.destination.galaxyId)approach=(u-.75)/.25;
 else approach=.2+(u-.53)/.47*.8;
 return planetSurfaceBlend((approach-.2)/.8);
}
function drawPlanetCamera(location,progress,scene=null){
 const p=planetCameraPose(location,progress),surface=p.surface*p.surface*(3-2*p.surface);
 ctx.save();ctx.globalAlpha*=1-surface;ctx.fillStyle='#020914';ctx.fillRect(0,0,W,H);
 drawNavigationStars();
 if(location.centralBlackHole){const t=navigationEase(progress);paintNavigationBlackHole(ctx,W*.5+(W*.78-W*.5)*t,H*.52+(H*.19-H*.52)*t,32+4*t);}
 const anomaly=navigationAnomaly(location);if(anomaly){const t=navigationEase(progress),near=location.anomaly==='black-hole';paintNavigationBlackHole(ctx,W*.5+319*(1-t)+(W*.712-W*.5)*t,H*.52-129*(1-t)+(H*.33-H*.52)*t,24+(near?W*.082-24:4)*t);}
 // Only the selected world is magnified. Its complete disc stays visible long
 // enough to recognize before the landscape takes over at the limit of the texture detail.
 drawNavigationPlanet(ctx,p.x,p.y,p.r,location,true);
 if(progress>.5&&location.destinationKind!=='star'){const haze=ctx.createLinearGradient(0,0,0,H),color=location.climate==='hot'?'220,137,87':'151,211,232';haze.addColorStop(0,`rgba(${color},0)`);haze.addColorStop(.55,`rgba(${color},${.09*Math.sin(progress*Math.PI)})`);haze.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=haze;ctx.fillRect(0,0,W,H);}
 ctx.restore();
 if(scene&&surface>0){ctx.save();ctx.globalAlpha*=surface;const zoom=1+(1-surface)*.035;ctx.drawImage(scene,-W*(zoom-1)/2,-H*(zoom-1)/2,W*zoom,H*zoom);ctx.restore();}
}
function drawPlanetApproach(location,u){
 const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);},system=expeditionSystem(location),dive=clamp((u-.2)/.8,0,1);
 if(u<.2){ctx.save();ctx.fillStyle='#020914';ctx.fillRect(0,0,W,H);drawNavigationStars();drawMovingSystemChart(system,location.destinationId);ctx.restore();}
 else{drawPlanetCamera(location,dive);if(dive<.09){ctx.save();ctx.globalAlpha=1-smooth(dive/.09);drawMovingSystemChart(system,location.destinationId);ctx.restore();}}
 ctx.save();ctx.globalAlpha*=1-smooth((u-.87)/.10);ctx.fillStyle='#dcfff1';ctx.font='bold 27px monospace';ctx.fillText(u<.2?'ENTERING '+system.name+' SYSTEM':dive>.64?'ENTERING '+location.destinationName+(location.destinationKind==='star'?' CORONA':' ATMOSPHERE'):'DESCENDING TO '+location.destinationName,64,74);ctx.font='13px monospace';ctx.fillStyle='#9abcc6';ctx.fillText(u<.2?systemFocus(system).name+' · '+systemCensusLabel(system):(location.destinationKind==='star'?'STELLAR ORBIT → OUTER CORONA':'ORBIT → ATMOSPHERE → '+(sectors[level].stratum||'SURFACE')),65,102);ctx.restore();
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
function galaxyImageFile(galaxy){return galaxy.artwork||'galaxy-spiral-v1.webp';}
function galaxyThumbnailFile(galaxy){return galaxy.thumbnail||galaxyImageFile(galaxy);}
function requestGalaxyImage(galaxy){return requestSpaceImage(galaxyImageFile(galaxy),galaxy.contentBounds);}
// Feather around the observation itself, including narrow/letterboxed sources.
// Multiplying the axis fades avoids the old rectangular minimum-distance mask.
function spacePhotoMask(x,y,bounds){
 const nx=Math.abs((x-bounds[0])/(bounds[2]-1)*2-1),ny=Math.abs((y-bounds[1])/(bounds[3]-1)*2-1);
 const radial=1-navigationEase((Math.hypot(nx,ny)-.57)/.43);
 return radial*navigationEase((1-nx)/.24)*navigationEase((1-ny)/.24);
}
function spaceArtworkReveal(readyAt){return readyAt===undefined?1:navigationEase((navigationSeconds()-readyAt)/1.2);}
function galaxyThumbnailMask(galaxy){const b=galaxy.contentBounds||[0,0,1280,800];return '--galaxy-rx:'+b[2]/1280*50+'%;--galaxy-ry:'+b[3]/800*50+'%;';}
function requestSpaceImage(file,bounds=[0,0,1280,800]){
 if(galaxyImages.has(file)){const image=galaxyImages.get(file);galaxyImages.delete(file);galaxyImages.set(file,image);return image;}
 // Previous/current/next galaxy plus the shared remnant. Atlas thumbnails never
 // enter this decoded-image cache. Ignore late loads after their eviction.
 while(galaxyImages.size>=4){const key=galaxyImages.keys().next().value,old=galaxyImages.get(key);old.onload=null;old.galaxyCutout=null;galaxyImages.delete(key);}
 const image=new Image();image.decoding='async';galaxyImages.set(file,image);image.onload=()=>{
  if(galaxyImages.get(file)!==image)return;
  // Prepare transparency once per source, outside the animation loop. All
  // galaxy palettes and travel scenes share these retained photographic cutouts.
  const surface=document.createElement('canvas');surface.width=1280;surface.height=800;const c=surface.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0,1280,800);const pixels=c.getImageData(0,0,1280,800),data=pixels.data;
  for(let y=0;y<800;y++)for(let x=0;x<1280;x++){const k=(y*1280+x)*4,light=Math.max(data[k],data[k+1],data[k+2]);data[k+3]=Math.round(data[k+3]*clamp((light-3)/48,0,1)*spacePhotoMask(x,y,bounds));}
  c.putImageData(pixels,0,0);image.galaxyCutout=surface;image.spaceReadyAt=navigationSeconds();const map=document.querySelector('#expeditionMap');if(map)map.navigationPainted=false;
 };image.onerror=()=>console.warn('Galaxy artwork unavailable:',file);image.src='assets/'+file;return image;
}
function galaxyArtwork(galaxy){
 const existing=galaxySurfaces.get(galaxy.id);if(existing)return existing;
 const image=requestGalaxyImage(galaxy);if(!image.galaxyCutout)return null;
 // Use only the final artwork. While loading, the existing starfield remains
 // visible; never substitute a different procedural galaxy on the title screen.
 const surface=image.galaxyCutout;surface.photoReadyAt=image.spaceReadyAt;
 while(galaxySurfaces.size>=3)galaxySurfaces.delete(galaxySurfaces.keys().next().value);
 galaxySurfaces.set(galaxy.id,surface);return surface;
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
 const projected=projectGalaxyPoint(x,y,angle);return{x:camera.gx+projected.x,y:camera.gy+projected.y,width:camera.width*size};
}
function galacticLandmarkVisibility(camera){
 // Resolved gradually inside the galaxy; gone before the orbital chart takes
 // over. Reversing this same camera also makes departure continuous.
 return navigationEase(camera.t/.2)*(1-navigationEase((camera.t-.70)/.30));
}
function drawUniversalLandmarks(location,camera){
 const galaxy=expeditionGalaxy(location),remnantImage=requestSpaceImage('cosmic-remnant-v1.webp'),remnant=remnantImage.galaxyCutout,envelope=galacticLandmarkVisibility(camera);
 if(envelope<=0)return;
 // Objects occupy fixed positions near the destination's spiral arm. The same
 // galaxy camera enlarges and moves them past the window, without a screen-space
 // overlay or a dissolve behind the planetary orbit map.
 ctx.save();ctx.globalCompositeOperation='screen';
 if(remnant&&galaxy.seed%3!==0){const p=galacticLandmarkPose(location,camera,[.12,-.06],.065);ctx.globalAlpha=.76*envelope*spaceArtworkReveal(remnantImage.spaceReadyAt);ctx.save();ctx.translate(p.x,p.y);ctx.rotate((galaxy.seed%7-3)*.13);ctx.drawImage(remnant,-p.width/2,-p.width*.3125,p.width,p.width*.625);ctx.restore();}
 const cluster=galacticLandmarkPose(location,camera,[-.13,.065],.037);ctx.globalAlpha=.62*envelope;ctx.drawImage(stellarClusterArtwork(),cluster.x-cluster.width/2,cluster.y-cluster.width/2,cluster.width,cluster.width);
 if(galaxy.seed%4<2){const p=galacticLandmarkPose(location,camera,[.11,.10],.009),radius=p.width*(1+.06*Math.sin(navigationSeconds()*.9)),g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);g.addColorStop(0,'#f6f5e4');g.addColorStop(.035,'#d6eaffd9');g.addColorStop(.16,'#a9caff38');g.addColorStop(1,'#6b9dd000');ctx.globalAlpha=.7*envelope;ctx.fillStyle=g;ctx.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);}
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
  const route=galaxyCrossingPose(destination,(u-.32)/.26);
  for(const [g,pose] of [[from,route.outgoing],[to,route.incoming]])galaxy(g,pose.width,pose.alpha,pose.gx,pose.gy);

 }else{
  drawGalaxySystemApproach(destination,(u-.58)/.17);
 }
 ctx.fillStyle='#e1fff2';ctx.font='bold 27px monospace';ctx.fillText(phase==='departure'?'LEAVING '+from.name:phase==='crossing'?(navigationWarpState()?.label||'INTERGALACTIC FLIGHT'):'ENTERING '+to.name,64,74);ctx.fillStyle='#afc2d5';ctx.font='14px monospace';ctx.fillText(phase==='departure'?origin.systemName+' SYSTEM → INTERGALACTIC SPACE':phase==='crossing'?galaxyFlightHeading(destination).label+' · '+from.name+' → '+to.name:systemFocus(system).name+' · '+systemFocus(system).type+' · '+systemCensusLabel(system),65,105);
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
