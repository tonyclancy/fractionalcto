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
  const speed=family==='jelly'?19+r(4)*9:avian?92+r(4)*25+(direction<0?28:-28):school?30+r(4)*13:25+r(4)*17,period=(W+180)/speed+5+r(1)*7;
  const count=school?5:family==='gull'||family==='swift'?5:family==='ray'||family==='soarer'?2:3;
  birds.push({seed:s,period,phase:period*(.13+i*.3)+r(2)*3,direction,speed,y:.22+i*.25+(r(5)-.5)*.09,slope:(r(6)-.5)*.025,size:family==='ray'?17+r(7)*3:family==='soarer'?9.1+r(7)*1.7:family==='jelly'?14+r(7)*3:avian?7.8+r(7)*1.5:school?13+r(7)*3:10+r(7)*3,count,color:profile.colors[i],family,habitat,avian,school});
 }
 for(const band of prepareSceneryBorders(stage).layers){
  // Wider body/feet clearance and complete patrol validation keep animals
  // attached to real rock, including the lip of an irregular opening.
  for(let i=0,accepted=0;i<28&&accepted<4;i++){
   const s=seed+band.edge*283+i*73,r=n=>sceneryVariation(s,n),u=r(31)*SCENERY_BORDER_PERIOD,length=42+r(32)*46,direction=r(33)>.5?1:-1;
   let clear=true;
   for(let d=-23;d<=length+23;d+=4)if(sceneryBorderExtent(band,u+direction*d,u+direction*d,0)<62){clear=false;break;}
   for(const other of crawlers)if(other.band===band&&Math.abs(other.u-u)<130)clear=false;
   if(!clear)continue;
   const life=19+r(37)*10,period=life+7+r(36)*9;
   crawlers.push({band,u,length,direction,seed:s,kind:profile.ground,habitat,size:1.45+r(34)*.38,phase:r(35)*period,period,life,inset:27+r(38)*7,color:habitat==='water'?(r(39)>.5?'#8ca69b':'#939ca5'):habitat==='hot'||habitat==='forge'||habitat==='solar'?'#97745b':habitat==='ice'?'#91a9ab':habitat==='desert'?'#a09676':'#809489'});accepted++;
  }
 }
 const cache={key,habitat,birds,crawlers};shoreWildlifeCaches.set(key,cache);while(shoreWildlifeCaches.size>2)shoreWildlifeCaches.delete(shoreWildlifeCaches.keys().next().value);return cache;
}
// A flock follows a shared curved course; each individual trails that course
// with an offset and its own articulation clock. Routes never reset on screen.
function sampleDistantBird(route,index,t,out){
 const age=((t+route.phase)%route.period+route.period)%route.period,seed=route.seed+index*43,r=n=>sceneryVariation(seed,n);
 const lag=index*(route.school?.50:.65)+r(44)*.35,travel=age-lag,span=W+180;
 out.visible=travel>=0&&travel*route.speed<=span;if(!out.visible)return out;
 const shared=travel+route.seed*.03,archRate=route.avian?.19:route.school?.28:.17,archSize=route.avian?28:route.school?15:12;
 const arch=Math.sin(shared*archRate)*archSize,derivative=Math.cos(shared*archRate)*archSize*archRate;
 const spread=route.school?10:14,rank=Math.ceil(index/2),side=index%2?1:-1;
 const separation=index?side*rank*spread:0,individual=route.avian?2.2:route.school?2.6:4;
 out.x=route.direction>0?-90+travel*route.speed:W+90-travel*route.speed;
 out.y=H*route.y+separation+travel*route.speed*route.slope+arch+Math.sin(t*.71+seed)*individual;
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
function sampleShoreCrawler(route,t,offset,vertical,out){
 const age=((t+route.phase)%route.period+route.period)%route.period;
 out.visible=age<route.life;if(!out.visible)return out;
 const progress=age/route.life,u=route.u+route.direction*route.length*progress,period=SCENERY_BORDER_PERIOD,span=vertical?H:W;
 let along=((u+offset)%period+period)%period;if(along>span+30)along-=period;
 out.visible=along>-25&&along<span+25;if(!out.visible)return out;
 const h=sceneryBorderExtent(route.band,u,u,0);if(h<route.inset+20){out.visible=false;return out;}
 const cross=route.band.edge?(vertical?W:H)-h+route.inset:h-route.inset;
 const h0=sceneryBorderExtent(route.band,u-7,u-7,0),h1=sceneryBorderExtent(route.band,u+7,u+7,0),slope=(h1-h0)*(route.band.edge?-1:1);
 out.x=vertical?cross:along;out.y=vertical?along:cross;out.u=u;out.h=h;
 out.angle=vertical?Math.atan2(14,slope):Math.atan2(slope,14);
 out.alpha=Math.min(1,age/.8,(route.life-age)/1.1)*.86;
 out.stride=age*(route.kind==='crab'?8.5:13)+route.seed;
 return out;
}
const shoreWildlifePose={};
function drawShoreWildlife(){
 const cache=prepareShoreWildlife(),t=sectorSceneTime(),offset=sceneryBorderOffset(),vertical=!!sectors[level].scrollAxis,quality=window.flightEffectsQuality||1;
 if(!cache.crawlers.length)return;
 let drawn=0;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 for(let i=0;i<cache.crawlers.length;i++){
  if(drawn>=(quality<.8?2:4))break;const route=cache.crawlers[i],p=sampleShoreCrawler(route,t,offset,vertical,shoreWildlifePose);if(!p.visible||p.alpha<.015)continue;drawn++;
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.scale(route.direction*route.size,route.size);ctx.globalAlpha=p.alpha;
  drawCrawlerWildlife(route,p);
  ctx.restore();
 }
 ctx.restore();
}
