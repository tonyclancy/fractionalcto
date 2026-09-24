// Decorative fauna are sampled from scene time and never enter game entities.
// Three different airborne/swimming families share a small, bounded draw budget.
const shoreWildlifeCaches=new Map();
const shoreWildlifeProfiles={
 air:{families:['gull','swift','soarer'],colors:['#9eaead','#6f8588','#869792'],ground:'moss-beetle'},
 storm:{families:['soarer','gull','swift'],colors:['#8e9997','#a7b6b4','#70858b'],ground:'moss-beetle'},
 desert:{families:['soarer','swift','moth'],colors:['#948c79','#7e8681','#9c9581'],ground:'sand-beetle'},
 ice:{families:['gull','swift','soarer'],colors:['#b2c2c4','#8ba5af','#9baeb5'],ground:'frost-beetle'},
 water:{families:['fish','ray','jelly'],colors:['#87a9ad','#5d8790','#a4c1c6'],ground:'crab'},
 cave:{families:['bat','moth','firefly'],colors:['#71958e','#8ea79c','#b2c3a3'],ground:'cave-beetle'},
 hot:{families:['beetle','moth','firefly'],colors:['#8b7763','#aa9174','#c0a076'],ground:'ember-beetle'},
 forge:{families:['moth','beetle','firefly'],colors:['#99a69c','#7e9194','#afab87'],ground:'ember-beetle'},
 solar:{families:['plasma-ribbon','plasma-drifter','plasma-mote'],colors:['#bcab8a','#c4b99d','#a49780'],ground:'ember-beetle'}
};
function shoreWildlifeHabitat(stage){
 const biome=stage.worldIdentity?.biome||'';
 if(stage.stellar||/corona/i.test(biome))return 'solar';
 if(stage.medium==='water')return 'water';
 if(stage.theme==='forge')return 'forge';
 if(/magma/i.test(biome))return 'hot';
 if(/ice|glacier/i.test(biome))return 'ice';
 if(/cave/i.test(biome))return 'cave';
 if(/desert/i.test(biome))return 'desert';
 return stage.theme==='storm'?'storm':'air';
}
function prepareShoreWildlife(stage=sectors[level]){
 const key=stage.id+':'+W+':'+H,existing=shoreWildlifeCaches.get(key);if(existing)return existing;
 const habitat=shoreWildlifeHabitat(stage),profile=shoreWildlifeProfiles[habitat],seed=stage.worldIdentity?.seed||371,birds=[],crawlers=[];
 for(let i=0;i<3;i++){
  const s=seed+i*219,r=n=>sceneryVariation(s,n),family=profile.families[i];
  const avian=['gull','swift','soarer'].includes(family),school=family==='fish',direction=r(3)>.5?1:-1;
  const depth=.27+r(49)*.20,axis=stage.scrollAxis||null,cameraVX=axis?0:-SCROLL_SPEED*depth,cameraVY=axis?SCROLL_SPEED*depth*(axis==='up'?1:-1):0;
  const ownSpeed=family==='jelly'?19+r(4)*9:avian?92+r(4)*25+(direction<0?28:-28):school?30+r(4)*13:25+r(4)*17;
  // Animal propulsion is separate from camera translation. A co-directional
  // course must still cross the screen, rather than cancel into a static icon.
  const speed=!axis&&direction>0?Math.max(ownSpeed,-cameraVX+24):ownSpeed,slope=(r(6)-.5)*.025,screenVX=direction*speed+cameraVX,screenVY=speed*slope+cameraVY;
  const count=school?5:family==='gull'||family==='swift'?5:family==='ray'||family==='soarer'?2:3,y=.22+i*.25+(r(5)-.5)*.09;
  // Clip a straight course through the midground to off-screen boundaries.
  // Vertical worlds can enter above/below while swimming independently across.
  // Recycling waits for the trailing animal to leave, so nothing wraps in view.
  const cx=W*(.35+r(50)*.30),cy=H*y,margin=90;
  const backwards=Math.min((screenVX>0?cx+margin:W+margin-cx)/Math.abs(screenVX),Math.abs(screenVY)>.001?(screenVY>0?cy+margin:H+margin-cy)/Math.abs(screenVY):Infinity);
  const forwards=Math.min((screenVX>0?W+margin-cx:cx+margin)/Math.abs(screenVX),Math.abs(screenVY)>.001?(screenVY>0?H+margin-cy:cy+margin)/Math.abs(screenVY):Infinity);
  const duration=backwards+forwards,period=duration+(count-1)*(school?.50:.65)+.35+1.8+r(1)*1.8;
  birds.push({seed:s,period,phase:period*(.13+i*.3)+r(2),direction,speed,y,slope,depth,axis,cameraVX,cameraVY,screenVX,screenVY,startX:cx-backwards*screenVX,startY:cy-backwards*screenVY,duration,size:family==='ray'?17+r(7)*3:family==='soarer'?9.1+r(7)*1.7:family==='jelly'?14+r(7)*3:avian?7.8+r(7)*1.5:school?13+r(7)*3:10+r(7)*3,count,color:profile.colors[i],family,habitat,avian,school});
 }
 for(const band of prepareSceneryBorders(stage).layers){
  // Patrol an entire solid patch. Loops close on themselves, so a crab never
  // expires or fades while the ledge carrying it remains on screen.
  for(let i=0,accepted=0;i<64&&accepted<2;i++){
   const s=seed+band.edge*283+i*73,r=n=>sceneryVariation(s,n),u=r(31)*SCENERY_BORDER_PERIOD,length=100+r(32)*116,direction=r(33)>.5?1:-1;
   let clear=true;
   for(let d=-24;d<=length+24;d+=3)if(sceneryBorderExtent(band,u+direction*d,u+direction*d,0)<72){clear=false;break;}
   for(const other of crawlers)if(other.band===band){const d=Math.abs(other.u-u)%SCENERY_BORDER_PERIOD;if(Math.min(d,SCENERY_BORDER_PERIOD-d)<130)clear=false;}
   if(!clear)continue;
   const route={band,u,length,direction,seed:s,kind:profile.ground,habitat,size:1.45+r(34)*.38,color:habitat==='water'?(r(39)>.5?'#8ca69b':'#939ca5'):habitat==='ice'?'#91a9ab':habitat==='desert'?'#a09676':'#809489'};
   prepareCrawlerPatrol(route,r);
   if(typeof prepareCrawlerModel==='function'){const rig=prepareCrawlerModel(route);window.gpuModels?.prepare?.([rig.mesh]);}
   crawlers.push(route);accepted++;
  }
 }
 const cache={key,habitat,birds,crawlers};shoreWildlifeCaches.set(key,cache);while(shoreWildlifeCaches.size>2)shoreWildlifeCaches.delete(shoreWildlifeCaches.keys().next().value);return cache;
}
// A flock follows a shared curved course; each individual trails that course
// with an offset and its own articulation clock. Routes never reset on screen.
function sampleDistantBird(route,index,t,out){
 const age=((t+route.phase)%route.period+route.period)%route.period,seed=route.seed+index*43,r=n=>sceneryVariation(seed,n);
 const lag=index*(route.school?.50:.65)+r(44)*.35,travel=age-lag;
 out.visible=travel>=0&&travel<=route.duration;if(!out.visible)return out;
 const shared=travel+route.seed*.03,archRate=route.avian?.19:route.school?.28:.17,archSize=route.avian?28:route.school?15:12;
 const arch=Math.sin(shared*archRate)*archSize,derivative=Math.cos(shared*archRate)*archSize*archRate;
 const spread=route.school?10:14,rank=Math.ceil(index/2),side=index%2?1:-1;
 const separation=index?side*rank*spread:0,individual=route.avian?2.2:route.school?2.6:4;
 out.x=route.startX+travel*route.screenVX;
 out.y=route.startY+travel*route.screenVY+separation+arch+Math.sin(t*.71+seed)*individual;
 out.depth=route.depth;out.cameraX=travel*route.cameraVX;out.cameraY=travel*route.cameraVY;out.birthTime=t-travel;
 // Heading follows propulsion, not the apparent slope caused by the camera.
 out.heading=Math.atan((route.speed*route.slope+derivative+Math.cos(t*.71+seed)*individual*.71)/route.speed);
 if(route.family==='jelly')out.heading=-1.05+Math.sin(t+seed)*.06;
 out.size=route.size*(.82+r(46)*.27);
 out.phase=t+index*.81+route.seed*.01;
 out.bank=Math.sin(shared*archRate+.55)*.24+Math.sin(t*.53+seed)*.07;
 const cycle=((t+seed*.017)%4.2+4.2)%4.2,active=Math.max(0,Math.min(1,cycle/.20,(3.1-cycle)/.28));
 out.flapActivity=active*active*(3-2*active);
 out.beatPhase=t*(route.family==='swift'?16.5:route.family==='soarer'?7.5:12.5)*(1+r(47)*.16)+seed;
 out.flapAngle=.14+Math.sin(out.beatPhase)*1.00*out.flapActivity;
 out.wing=out.flapAngle;
 out.alpha=route.avian?.95:.78+r(48)*.10;
 return out;
}
const distantWildlifePose={};
function drawDistantWildlife(){
 const cache=prepareShoreWildlife(),t=sectorSceneTime(),quality=window.flightEffectsQuality||1,limit=quality<.8?6:12;
 let drawn=0;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 for(let i=0;i<5;i++)for(const route of cache.birds){
  if(i>=route.count||drawn>=limit)continue;const p=sampleDistantBird(route,i,t,distantWildlifePose);if(!p.visible)continue;drawn++;
  ctx.save();ctx.translate(p.x,p.y);ctx.scale(route.direction,1);ctx.rotate(p.heading);ctx.scale(p.size,p.size);ctx.globalAlpha=p.alpha;
  drawWildlifeSilhouette(route.family,p,route);ctx.restore();
 }
 ctx.restore();
}
function drawWildlifeSilhouette(family,p,route){
 if(drawBirdWildlife(family,p,route))return;
 if(drawAquaticWildlife(family,p,route))return;
 drawSmallWildlife(family,p,route);
}
// Surface coordinates are independent of scrolling: u runs along the rock,
// inset runs inward from its lip. Feet animate from distance, never from time.
function crawlerSurfaceDepth(route,u,inset){return sceneryBorderExtent(route.band,u,u,0)-inset;}
function prepareCrawlerPatrol(route,r){
 const stops=[.12,.88,.60,.95,.15,.36];
 route.points=stops.map((fraction,i)=>({u:route.u+route.direction*route.length*fraction,inset:29+r(51+i)*12}));
 route.segments=[];route.period=0;route.totalDistance=0;
 const pace=route.kind==='ember-beetle'?82+r(62)*38:route.kind==='crab'?55+r(62)*24:63+r(62)*27;
 for(let i=0;i<route.points.length;i++){
  const a=route.points[i],b=route.points[(i+1)%route.points.length];
  let length=0,previousDepth=crawlerSurfaceDepth(route,a.u,a.inset);const arc=[0];
  for(let j=1;j<=24;j++){const q=j/24,u=a.u+(b.u-a.u)*q,inset=a.inset+(b.inset-a.inset)*q,depth=crawlerSurfaceDepth(route,u,inset);length+=Math.hypot((b.u-a.u)/24,depth-previousDepth);arc.push(length);previousDepth=depth;}
  const pause=.28+r(70+i)*.13,duration=Math.max(.36,length/pace/.85);
  route.segments.push({a,b,length,arc,pause,duration,start:route.period,distance:route.totalDistance});
  route.period+=pause+duration;route.totalDistance+=length;
 }
 route.life=route.period;route.phase=r(35)*route.period;route.inset=route.points[0].inset;
}
function crawlerPatrolAngle(route,segment,q,vertical){
 const u=segment.a.u+(segment.b.u-segment.a.u)*q,du=segment.b.u-segment.a.u,di=segment.b.inset-segment.a.inset;
 const slope=(sceneryBorderExtent(route.band,u+7,u+7,0)-sceneryBorderExtent(route.band,u-7,u-7,0))/14;
 const dc=(slope*du-di)*(route.band.edge?-1:1);
 return vertical?Math.atan2(du,dc):Math.atan2(dc,du);
}
function sampleCrawlerPatrol(route,t,out){
 const clock=t+route.phase,cycle=Math.floor(clock/route.period),age=clock-cycle*route.period;
 let index=route.segments.length-1;
 for(let i=0;i<route.segments.length;i++){const s=route.segments[i];if(age<s.start+s.pause+s.duration){index=i;break;}}
 const segment=route.segments[index],local=age-segment.start,rest=local<segment.pause;
 const x=rest?0:clamp((local-segment.pause)/segment.duration,0,1),r=.15;
 const progress=x<r?.5*x*x/r/(1-r):x>1-r?1-.5*(1-x)*(1-x)/r/(1-r):(x-.5*r)/(1-r);
 const derivative=rest?0:(x<r?x/r:x>1-r?(1-x)/r:1)/(1-r);
 // Arc-length lookup keeps the pace steady as the rocky contour steepens.
 const wanted=segment.length*progress;let k=0;
 while(k<23&&segment.arc[k+1]<wanted)k++;
 const fraction=(k+(wanted-segment.arc[k])/Math.max(.0001,segment.arc[k+1]-segment.arc[k]))/24;
 out.u=segment.a.u+(segment.b.u-segment.a.u)*fraction;
 out.inset=segment.a.inset+(segment.b.inset-segment.a.inset)*fraction;
 out.distance=cycle*route.totalDistance+segment.distance+wanted;
 out.speed=segment.length*derivative/segment.duration;out.motion=clamp(out.speed/85,0,1);
 out.stride=out.distance/(route.size*(route.kind==='crab'?1.50:1.85)/(.60*Math.PI));
 out.time=t;out.segmentIndex=index;out.fraction=fraction;out.rest=rest;out.turn=rest?clamp(local/segment.pause,0,1):1;
 return out;
}
function sampleShoreCrawler(route,t,offset,vertical,out){
 sampleCrawlerPatrol(route,t,out);
 const u=out.u,period=SCENERY_BORDER_PERIOD,span=vertical?H:W;
 let along=((u+offset)%period+period)%period;if(along>span+35)along-=period;
 out.visible=along>-35&&along<span+35;if(!out.visible)return out;
 const h=sceneryBorderExtent(route.band,u,u,0),cross=route.band.edge?(vertical?W:H)-h+out.inset:h-out.inset;
 out.x=vertical?cross:along;out.y=vertical?along:cross;out.h=h;out.alpha=1;
 const segment=route.segments[out.segmentIndex];
 if(out.rest){
  const previous=route.segments[(out.segmentIndex+route.segments.length-1)%route.segments.length];
  const incoming=crawlerPatrolAngle(route,previous,1,vertical),outgoing=crawlerPatrolAngle(route,segment,0,vertical),delta=Math.atan2(Math.sin(outgoing-incoming),Math.cos(outgoing-incoming));
  out.angle=incoming+delta*out.turn*out.turn*(3-2*out.turn);
 }else out.angle=crawlerPatrolAngle(route,segment,out.fraction,vertical);
 return out;
}
const shoreWildlifePose={};
function drawShoreWildlife(){
 const cache=prepareShoreWildlife(),t=sectorSceneTime(),offset=sceneryBorderOffset(),vertical=!!sectors[level].scrollAxis;
 if(!cache.crawlers.length)return;
 let drawn=0;ctx.save();
 for(const route of cache.crawlers){
  if(drawn>=4)break;
  const p=sampleShoreCrawler(route,t,offset,vertical,shoreWildlifePose);if(!p.visible)continue;drawn++;
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.scale(route.size,route.size);ctx.globalAlpha=1;
  drawCrawlerContactShadow(route,p);
  drawModel(animateCrawlerModel(route,p),0,0,1,0,.14,0,p.time,0);
  ctx.restore();
 }
 ctx.restore();
 // Terrain is already composited. A separate depth pass seats the feet on its
 // visible surface; the subsequent front mist/cloud pass can cover the animal.
 if(drawn)window.gpuModels?.flush?.(ctx);
}
