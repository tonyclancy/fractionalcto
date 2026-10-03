'use strict';
// Deliberate pilot stages. A biome is not an automatic license to add hazards.
const WORLD_BEHAVIORS=Object.freeze({
 'crimson-heart':{kind:'eruption',title:'READ THE FISSURES',detail:'Glowing cracks warn before an eruption. Fly above or between them.'},
 'ember-forge':{kind:'machine',title:'SHUT DOWN THE HEAT EXCHANGER',detail:'Shoot the amber core. Cut its jet and disrupt nearby weapons.'},
 'pale-abyss':{kind:'ice',title:'BREAK A PATH',detail:'Shoot the ice crest. Stay clear of the marked falling fragments.'},
 'nereid-sere-descent':{kind:'current',title:'RIDE THE CURRENT',detail:'Water pulls left. The calm pocket behind the rock gives shelter.'}
});
const NO_WORLD_TARGETS=Object.freeze([]);
const BEHAVIOR_OUTLINES={ice:[[-64,0],[58,0],[52,-95],[35,-205],[15,-175],[-5,-190],[-22,-130],[-34,-154],[-48,-70]],current:[[-64,0],[58,0],[58,-70],[38,-124],[4,-145],[-34,-116],[-58,-68]]};
let worldBehavior=null;
const behaviorMeshes=new Map();
function worldBehaviorProfile(){return typeof storyActive==='function'&&storyActive()?null:WORLD_BEHAVIORS[sectors[level].id]||null;}
function resetWorldBehavior(){worldBehavior=null;}
function worldBehaviorVisible(){return worldBehavior&&!sectorBlend&&state!=='title'&&worldBehavior.node;}
function worldBehaviorTask(){const m=worldBehavior;if(!m?.node||boss||bossDefeated)return null;
 if(m.node.broken)return {title:m.kind==='ice'?'PASSAGE OPEN':'HEAT EXCHANGER OFFLINE',detail:m.kind==='ice'?'Ice cleared · watch the last falling fragments':'Jet stopped · nearby enemy weapons disrupted'};
 return m.profile;
}
function behaviorSeat(at,x){
 const band=prepareSceneryBorders().layers[1],offset=sceneryBorderOffset((at+sectorIntroLead)*SCROLL_SPEED);
 // Sink a broad foot into the lowest surface across the whole base. It cannot float.
 let h=Infinity;for(let u=-64;u<=64;u+=8)h=Math.min(h,sceneryBorderExtent(band,x+u,x+u,offset));
 return H-h+14;
}
function beginWorldBehavior(at,index){const m=worldBehavior,kind=m.kind,distance=(at+sectorIntroLead)*SCROLL_SPEED;let seat=null;
 // Find a real shore socket with a reachable target and, for reefs, an open lee.
 for(let x=W-100;x>=W*.5;x-=24){const base=behaviorSeat(at,x),y=base-(kind==='ice'?112:kind==='machine'?90:62);
  if((kind==='ice'||kind==='machine')&&sceneryBorderContact(x,y,45,40,distance))continue;
  if(kind==='current'&&[-225,-150,-90].some(dx=>[-110,-60].some(dy=>sceneryBorderContact(x+dx,base+dy,24,20,distance))))continue;
  seat={x,base,y};break;
 }
 if(!seat){m.node=null;m.targets=NO_WORLD_TARGETS;return;}
 const {x,base,y}=seat;
 m.node={at,index,originX:x,x,oldX:x,base,y,r:kind==='ice'?57:34,hp:kind==='ice'?42:36,depth:1,worldTarget:true,broken:false,phase:-1,cycle:-1,breakAt:-1};
 m.targets=[m.node];
 behaviorMesh(kind);behaviorMesh('rubble');if(kind==='machine')behaviorMesh('machine-off');
}
function worldBehaviorPhase(n){const elapsed=Math.max(0,time-n.at),cycle=Math.floor(elapsed/5.8),age=elapsed-cycle*5.8;
 return {cycle,age,warning:age<1.65,active:age>=1.65&&age<3.35};
}
function behaviorLane(n){const machine=worldBehavior?.kind==='machine';return {x:n.x,y1:Math.max(145,n.base-(machine?365:300)),y2:n.base-(machine?130:16),r:24};}
function behaviorSheltered(x,y,n){return x>n.x-265&&x<n.x-64&&y>n.base-143&&y<n.base-22;}
function worldBehaviorFlow(x,y){const m=worldBehavior,n=m?.node;
 if(!n||m.kind!=='current'||boss||bossDefeated||sectorBlend||state!=='playing')return 0;
 const p=worldBehaviorPhase(n);if(!p.active||behaviorSheltered(x,y,n))return 0;
 return -92*Math.sin((p.age-1.65)/1.7*Math.PI);
}
function worldBehaviorTargets(){const m=worldBehavior;return m?.node&&!m.node.broken&&(m.kind==='ice'||m.kind==='machine')&&!boss&&!bossDefeated?m.targets:NO_WORLD_TARGETS;}
function hitWorldBehavior(s,n){if(n.broken||s.seen.has(n))return;s.seen.add(n);s.spent=true;n.hp-=s.damage;window.flightAudio?.impact?.(n.x,'armor');
 if(n.hp>0)return;n.hp=0;n.broken=true;n.breakAt=time;
 window.flightAudio?.worldCue?.(worldBehavior.kind==='ice'?'fracture':'shutdown',n.x);
 if(worldBehavior.kind==='machine')for(const e of enemies)if(Math.hypot(e.x-n.x,e.y-n.y)<520){e.relayJammedUntil=time+4;e.shotWindup=null;}
}
function worldBehaviorNova(){for(const n of worldBehaviorTargets())hitWorldBehavior({damage:50,seen:new Set()},n);}
function updateWorldBehavior(dt,oldX=ship.x,oldY=ship.y){
 if(state!=='playing'||sectorBlend)return;
 const profile=worldBehaviorProfile();if(!profile){worldBehavior=null;return;}
 if(!worldBehavior||worldBehavior.id!==sectors[level].id)worldBehavior={id:sectors[level].id,profile,kind:profile.kind,node:null,index:-1};
 const m=worldBehavior;
 // Retry starts a fresh readable warning; no checkpoint rewards can be farmed.
 const index=Math.floor((time-7)/18);
 if(!boss&&!bossDefeated&&time<flightBossTime()-7&&index>=0&&index>m.index){m.index=index;beginWorldBehavior(time,index);}
 const n=m.node;if(!n)return;n.oldX=n.x;n.x=n.originX-(time-n.at)*SCROLL_SPEED;n.contactOldX=n.oldX;n.contactOldY=n.y;
 if(n.x< -280){m.node=null;return;}if(boss||bossDefeated)return;
 const p=worldBehaviorPhase(n),phase=n.broken?3:p.warning?0:p.active?1:2;
 if(phase!==n.phase||p.cycle!==n.cycle){n.phase=phase;n.cycle=p.cycle;if(!n.broken&&n.x>0){const cue=m.kind==='current'?'current':p.warning?'warning':p.active?(m.kind==='eruption'?'eruption':'vent'):null;if(cue&&m.kind!=='ice')window.flightAudio?.worldCue?.(cue,n.x);}}
 // Solid ice/reef silhouettes and contact use the same projected outline.
 if((m.kind==='ice'&&!n.broken)||m.kind==='current'){
  const steps=Math.max(1,Math.ceil((Math.hypot(ship.x-oldX,ship.y-oldY)+Math.abs(n.x-n.oldX))/8));
  for(let i=0;i<=steps;i++){const t=i/steps,x=oldX+(ship.x-oldX)*t,y=oldY+(ship.y-oldY)*t,cx=n.oldX+(n.x-n.oldX)*t;if(behaviorSolid(x-cx,y-n.base,m.kind,22)){damage('terrain');break;}}
 }
 if(!n.broken&&(m.kind==='eruption'||m.kind==='machine')&&p.active){const l=behaviorLane(n);
  if(pilotHullContactTime(l.x,l.y1,l.x,l.y2,l.r,oldX+n.x-n.oldX,oldY)<=1)damage('environment');
  // The same visible hazard hurts invaders. One strike per pulse, no bonus score.
  for(const e of enemies)if(e.hp>0&&e.worldPulse!==n.at+':'+p.cycle&&Math.abs(e.x-l.x)<l.r+e.r&&e.y>l.y1&&e.y<l.y2){e.worldPulse=n.at+':'+p.cycle;e.hp-=18;e.hit=.16;if(e.hp<=0)explode(e.x,e.y,'#ffc389',24,isOrganicEnemy(e));}
 }
 if(m.kind==='ice'&&n.broken){const age=time-n.breakAt;
  if(age>=1.1&&age<2.4)for(const q of behaviorShards(n,age)){if(pilotHullContactTime(q.x,q.y-360*dt,q.x,q.y,9,oldX,oldY)<=1)damage('environment');}
 }
}
function behaviorOutline(kind){return BEHAVIOR_OUTLINES[kind==='ice'?'ice':'current'];}
function behaviorSolid(x,y,kind,pad=0){
 const poly=behaviorOutline(kind);let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const [ax,ay]=poly[j],[bx,by]=poly[i],dx=bx-ax,dy=by-ay,t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy),0,1);
  if(Math.hypot(x-ax-t*dx,y-ay-t*dy)<=pad)return true;
  if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
 }return inside;
}
function worldBehaviorTerrainTime(x,y,s){const m=worldBehavior,n=m?.node;
 if(!n||boss||bossDefeated||sectorBlend||!(m.kind==='current'||m.kind==='ice'&&!n.broken&&!s.seen))return Infinity;
 const pad=s.r||0;if(Math.max(x,s.x)<n.x-64-pad||Math.min(x,s.x)>n.x+58+pad||Math.max(y,s.y)<n.base-(m.kind==='ice'?205:145)-pad||Math.min(y,s.y)>n.base+pad)return Infinity;
 const steps=Math.max(1,Math.ceil(Math.hypot(s.x-x,s.y-y)/5));
 for(let i=0;i<=steps;i++){const t=i/steps;if(behaviorSolid(x+(s.x-x)*t-n.x,y+(s.y-y)*t-n.base,m.kind,s.r||0))return t;}
 return Infinity;
}
function worldBehaviorShotTime(n,x,y,endX,endY,r){
 if(worldBehavior?.kind!=='ice')return segmentCircleTime(x,y,endX-x-(n.x-(n.contactOldX??n.x)),endY-y,n.contactOldX??n.x,n.y,n.r+r+7);
 const dx=endX-x,dy=endY-y,move=n.x-(n.contactOldX??n.x),steps=Math.max(1,Math.ceil((Math.hypot(dx,dy)+Math.abs(move))/5));
 for(let i=0;i<=steps;i++){const t=i/steps;if(behaviorSolid(x+dx*t-(n.contactOldX??n.x)-move*t,y+dy*t-n.base,'ice',r))return t;}
 return Infinity;
}
function behaviorShards(n,age){return [-1,1].map(side=>({x:n.x+side*105,y:n.base-275+Math.max(0,age-1.1)*360,side}));}
function behaviorMesh(kind){if(behaviorMeshes.has(kind))return behaviorMeshes.get(kind);const m=meshBuilder();
 if(kind.startsWith('machine')){
  for(const x of [-23,23])m.tube([[x,88,12],[x,0,12]],9,[76,69,53],0,0,8,1);
  m.tube([[0,-20,10],[0,-48,10]],12,[118,133,127],0,0,10,1);
  for(const side of [-1,1])for(let i=0;i<4;i++)m.wedge([side*27,-23+i*14,0],[side*48,-21+i*14,0],[side*46,-14+i*14,0],23,[95,110,102]);
  m.ellipsoid(0,0,0,43,36,25,[69,76,74],0,12,8);m.ellipsoid(0,0,-24,24,21,8,kind==='machine-off'?[63,117,106]:[255,177,66],kind==='machine-off'?.05:.65,12,8);
  for(let i=0;i<5;i++)m.tube([[-30,-25+i*12,-30],[-18,-25+i*12,-31]],3,[145,168,161],0,0,6,1);
 }else if(kind==='ice'||kind==='current'){
  const ice=kind==='ice',outline=behaviorOutline(kind),cy=ice?-88:-58,color=ice?[171,220,233]:[101,135,126];
  // Concentric relief rings share the collision silhouette; the front has depth,
  // mineral facets and rounded weathering instead of a flat triangular plate.
  const rings=[1,.76,.36].map((scale,j)=>outline.map(([x,y])=>[x*scale,cy+(y-cy)*scale,j===0?12:-j*9]));
  for(let ring=0;ring<2;ring++)for(let i=0;i<outline.length;i++){const next=(i+1)%outline.length,light=.78+(i%4)*.055+ring*.06;m.faces.push({v:[rings[ring][i],rings[ring][next],rings[ring+1][next],rings[ring+1][i]],c:color.map(v=>v*light),em:0,flex:0});}
  m.faces.push({v:rings[2].slice(),c:color,em:ice?.08:0,flex:0});
  if(!ice)for(let i=0;i<8;i++){const x=-30+i*7,y=-25-Math.sin(i*1.7)*10;m.ellipsoid(x,y,-23,5,4+i%3,3,[119+i*5,137,111],0,7,4);}
 }else{
  m.wedge([-64,0,14],[58,0,14],[35,-30,0],46,[57,74,77]);
  m.wedge([-64,0,-3],[35,-30,-3],[-34,-22,-3],35,[77,94,95]);
 }
 if(kind.startsWith('machine'))m.faces.industrial=true;else{m.faces.rock=true;m.faces.terrainMaterial=kind==='ice'?'ice':kind==='eruption'?'basalt':'stone';m.faces.terrainRelief=true;if(kind==='ice')for(const f of m.faces){f.em=.10;f.textureWeight=.62;f.uv=f.v.map(v=>[.06+(v[0]+64)/128*.88,.04+(v[1]+205)/205*.90]);}}
 behaviorMeshes.set(kind,m.faces);return m.faces;
}
function drawWorldBehavior(){const m=worldBehavior,n=m?.node;if(!worldBehaviorVisible())return;
 const p=worldBehaviorPhase(n),kind=m.kind,l=behaviorLane(n),t=time;if(boss||bossDefeated){p.active=p.warning=false;}
 ctx.save();
 if(kind==='current'){
  // Streams visibly split around the rock; the lee pocket has no moving streaks.
  ctx.fillStyle='#70e9d315';ctx.beginPath();ctx.roundRect(n.x-265,n.base-143,201,121,24);ctx.fill();
  ctx.strokeStyle='#9df3dd';ctx.lineWidth=2;ctx.setLineDash([5,9]);ctx.beginPath();ctx.roundRect(n.x-265,n.base-143,201,121,24);ctx.stroke();ctx.setLineDash([]);
  ctx.globalAlpha=p.active?.65:.23;ctx.strokeStyle='#b1eee9';ctx.lineWidth=1.6;
  for(let i=0;i<30;i++){const y=95+i*19,x=((i*191-t*(p.active?190:35))%W+W)%W;if(behaviorSheltered(x,y,n)||Math.abs(x-n.x)<88&&y>n.base-175)continue;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+34,y);ctx.moveTo(x+7,y-4);ctx.lineTo(x,y);ctx.lineTo(x+7,y+4);ctx.stroke();}ctx.globalAlpha=1;
 }
 if(kind==='machine'){drawModel(behaviorMesh('rubble'),n.x,n.base,1,0,0,0,t);drawModel(behaviorMesh(n.broken?'machine-off':'machine'),n.x,n.y,1,0,0,0,t);}
 else drawModel(behaviorMesh(n.broken?'rubble':kind),n.x,n.base,1,0,0,0,t);
 window.gpuModels?.flush(ctx);
 if(kind==='eruption'||kind==='machine'){
  const hot=!n.broken&&p.active,warn=!n.broken&&p.warning;
  // Fractured incandescent seam, seated in stone; no stretching fire sprites.
  ctx.strokeStyle=n.broken?'#79b8b0':hot?'#fff2ad':warn?'#f6b16c':'#844e30';ctx.lineWidth=hot?5:3;ctx.beginPath();ctx.moveTo(n.x-43,n.base-10);ctx.lineTo(n.x-20,n.base-24);ctx.lineTo(n.x+3,n.base-13);ctx.lineTo(n.x+23,n.base-29);ctx.lineTo(n.x+46,n.base-16);ctx.stroke();
  if(warn){ctx.fillStyle='#ffb96d19';ctx.fillRect(l.x-l.r,l.y1,l.r*2,l.y2-l.y1);ctx.setLineDash([7,9]);ctx.strokeStyle='#ffd297';ctx.lineWidth=2;ctx.strokeRect(l.x-l.r,l.y1,l.r*2,l.y2-l.y1);ctx.setLineDash([]);}
  if(hot){const g=ctx.createLinearGradient(0,l.y2,0,l.y1);g.addColorStop(0,'#fff3bd');g.addColorStop(.55,kind==='eruption'?'#fb8b41bb':'#d9eef2b0');g.addColorStop(1,'#ffc68715');ctx.fillStyle=g;
   for(let layer=2;layer>=0;layer--){ctx.globalAlpha=layer===0?.82:.16;ctx.beginPath();for(let side=-1;side<=1;side+=2)for(let j=0;j<=18;j++){const k=side===-1?j:18-j,u=k/18,w=l.r*(1+layer*.30)+Math.sin(t*(13+layer)+k*1.7)*3;const x=l.x+side*w,y=l.y2-u*(l.y2-l.y1);j===0&&side===-1?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.closePath();ctx.fill();}ctx.globalAlpha=1;
   for(let i=0;i<16;i++){const u=((t-n.at)*(1.5+i%3*.21)+i*.137)%1,x=l.x+Math.sin(i*7+u*6)*18,y=l.y2-u*(l.y2-l.y1);ctx.globalAlpha=1-u;ctx.fillStyle=i%3?'#ffd497':'#ffffff';ctx.beginPath();ctx.ellipse(x,y,2+i%3,5+i%4,0,0,TAU);ctx.fill();}ctx.globalAlpha=1;
  }
  if(n.broken){ctx.fillStyle='#9bf3d6';ctx.beginPath();ctx.arc(n.x,n.y,13,0,TAU);ctx.fill();for(const e of enemies)if(e.relayJammedUntil>time){ctx.strokeStyle='#9bf3d677';ctx.beginPath();ctx.moveTo(n.x,n.y);ctx.lineTo(e.x,e.y);ctx.stroke();}}
 }
 if(kind==='ice'){
  if(!n.broken){ctx.strokeStyle='#e5ffff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(n.x+22,n.base-191);ctx.lineTo(n.x-12,n.base-151);ctx.lineTo(n.x+18,n.base-115);ctx.lineTo(n.x-22,n.base-62);ctx.stroke();}
  else{const age=t-n.breakAt;for(const q of behaviorShards(n,age)){if(age<1.1){ctx.fillStyle='#c4f4ff';ctx.beginPath();ctx.moveTo(q.x-8,q.y-12);ctx.lineTo(q.x+9,q.y+1);ctx.lineTo(q.x-4,q.y+16);ctx.closePath();ctx.fill();ctx.setLineDash([6,9]);ctx.strokeStyle='#d8f9ff';ctx.beginPath();ctx.moveTo(q.x,n.base-275);ctx.lineTo(q.x,n.base);ctx.stroke();ctx.setLineDash([]);}else if(age<2.4){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.side*age*4);ctx.fillStyle='#b7effa';ctx.beginPath();ctx.moveTo(-8,-14);ctx.lineTo(10,0);ctx.lineTo(-5,17);ctx.closePath();ctx.fill();ctx.restore();}}}
 }
 const label=kind==='current'?'CALM WATER':n.broken?(kind==='ice'?'PATH OPEN':'OFFLINE'):kind==='ice'?'BREAK ICE':kind==='machine'?'SHOOT CORE':p.warning?'ERUPTION WARNING':p.active?'ERUPTING':'';
 if(label){const x=kind==='current'?n.x-165:n.x,y=kind==='current'?n.base-153:kind==='ice'?n.base-226:kind==='machine'?n.y-55:l.y1-20;ctx.font='bold 15px system-ui';ctx.textAlign='center';const width=ctx.measureText(label).width+22;ctx.fillStyle='#07131fe8';ctx.fillRect(x-width/2,y-16,width,25);ctx.fillStyle=n.broken||kind==='current'?'#a2f5da':'#ecf7f8';ctx.fillText(label,x,y+2);}
 ctx.restore();
}
