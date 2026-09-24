// Decorative fauna are sampled from scene time and never enter game entities.
// Three different airborne/swimming families share a small, bounded draw budget.
const shoreWildlifeCaches=new Map();
const shoreWildlifeProfiles={
 air:{families:['bird','glider','moth'],colors:['#607779','#a1aca2','#788778'],ground:'moss-beetle'},
 storm:{families:['glider','bird','moth'],colors:['#878c89','#697b82','#a9a698'],ground:'moss-beetle'},
 desert:{families:['glider','moth','bird'],colors:['#9e927b','#8d8170','#686d66'],ground:'sand-beetle'},
 ice:{families:['glider','moth','ribbon'],colors:['#829ca8','#b8c8c8','#6c8d9b'],ground:'frost-beetle'},
 water:{families:['fish','ray','jelly'],colors:['#8da5a6','#638c93','#acc6c3'],ground:'crab'},
 cave:{families:['moth','ribbon','glider'],colors:['#8caaa1','#74908d','#adbaaf'],ground:'cave-beetle'},
 hot:{families:['moth','ribbon','glider'],colors:['#aa815d','#cc9d69','#7b7261'],ground:'ember-beetle'},
 forge:{families:['moth','glider','ribbon'],colors:['#a6977c','#74888a','#ba9874'],ground:'ember-beetle'},
 solar:{families:['ribbon','jelly','moth'],colors:['#dbbd8e','#e0cea4','#a99178'],ground:'ember-beetle'}
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
  const speed=family==='jelly'?18+r(4)*11:family==='bird'?43+r(4)*19:30+r(4)*22,period=(W+120)/speed+7+r(1)*9;
  const count=family==='fish'||family==='bird'?3+Math.floor(r(8)*2):family==='ray'||family==='glider'?1+Math.floor(r(8)*2):2+Math.floor(r(8)*2);
  birds.push({seed:s,period,phase:period*(.13+i*.3)+r(2)*3,direction:r(3)>.5?1:-1,speed,y:.22+i*.25+(r(5)-.5)*.09,slope:(r(6)-.5)*.035,size:family==='ray'||family==='glider'?11+r(7)*4:8.5+r(7)*3,count,color:profile.colors[i],family});
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
   crawlers.push({band,u,length,direction,seed:s,kind:profile.ground,size:1.45+r(34)*.38,phase:r(35)*period,period,life,inset:27+r(38)*7,color:habitat==='water'?(r(39)>.5?'#8ca69b':'#939ca5'):habitat==='hot'||habitat==='forge'||habitat==='solar'?'#97745b':habitat==='ice'?'#91a9ab':habitat==='desert'?'#a09676':'#809489'});accepted++;
  }
 }
 const cache={key,habitat,birds,crawlers};shoreWildlifeCaches.set(key,cache);while(shoreWildlifeCaches.size>2)shoreWildlifeCaches.delete(shoreWildlifeCaches.keys().next().value);return cache;
}
function sampleDistantBird(route,index,t,out){
 const age=((t+route.phase)%route.period+route.period)%route.period,indexSeed=route.seed+index*43;
 const lag=index*(.37+sceneryVariation(indexSeed,44)*.44),travel=age-lag,span=W+120;
 out.visible=travel>=0&&travel*route.speed<=span;
 if(!out.visible)return out;
 out.x=route.direction>0?-60+travel*route.speed:W+60-travel*route.speed;
 out.y=H*route.y+(index-1)*(11+sceneryVariation(indexSeed,45)*13)+travel*route.speed*route.slope;
 out.size=route.size*(.86+sceneryVariation(indexSeed,46)*.25);
 const beat=t*(4.4+sceneryVariation(indexSeed,47)*1.4)+index*1.7,cycle=((t+index*.7)%5.7+5.7)%5.7;
 const ramp=Math.max(0,Math.min(1,cycle/.3,(2.6-cycle)/.35)),flap=ramp*ramp*(3-2*ramp);
 out.wing=.17+(Math.sin(beat)*.85-.17)*flap;
 out.phase=t+index*.81+route.seed*.01;
 if(route.family==='jelly'||route.family==='moth')out.y+=Math.sin(out.phase*(route.family==='jelly'?.63:1.1))*7;
 out.alpha=.65+sceneryVariation(indexSeed,48)*.13;
 return out;
}
const distantWildlifePose={};
function drawDistantWildlife(){
 const cache=prepareShoreWildlife(),t=sectorSceneTime(),quality=window.flightEffectsQuality||1,limit=quality<.8?5:9;
 let drawn=0;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 // Round-robin individuals preserve the different families at lower quality.
 for(let i=0;i<4;i++)for(const route of cache.birds){
  if(i>=route.count||drawn>=limit)continue;const p=sampleDistantBird(route,i,t,distantWildlifePose);if(!p.visible)continue;drawn++;
  ctx.save();ctx.translate(p.x,p.y);ctx.scale(route.direction*p.size,p.size);ctx.globalAlpha=p.alpha;ctx.fillStyle=ctx.strokeStyle=route.color;
  drawWildlifeSilhouette(route.family,p);ctx.restore();
 }
 ctx.restore();
}
function drawWildlifeSilhouette(family,p){
 const wing=p.wing,phase=p.phase;ctx.lineWidth=.10;
 if(family==='fish'){
  const tail=Math.sin(phase*5)*.20;
  ctx.beginPath();ctx.ellipse(0,0,.90,.30,0,0,TAU);ctx.fill();ctx.beginPath();ctx.moveTo(-.7,0);ctx.lineTo(-1.3,-.39+tail);ctx.lineTo(-1.15,.41+tail);ctx.closePath();ctx.fill();
  ctx.globalAlpha*=.55;ctx.beginPath();ctx.moveTo(-.3,-.19);ctx.lineTo(-.14,-.57);ctx.lineTo(.24,-.20);ctx.closePath();ctx.fill();
 }else if(family==='jelly'){
  // Pulsing bell and trailing filaments; steady swimming momentum.
  const pulse=.83+Math.sin(phase*2.4)*.13;
  ctx.beginPath();ctx.moveTo(-.15,-.64*pulse);ctx.bezierCurveTo(1.15,-.57,1.15,.57,-.15,.64*pulse);ctx.quadraticCurveTo(-.38,0,-.15,-.64*pulse);ctx.fill();
  ctx.globalAlpha*=.65;for(let j=0;j<3;j++){const y=(j-1)*.33;ctx.beginPath();ctx.moveTo(-.20,y);ctx.bezierCurveTo(-.7,y+Math.sin(phase*2+j)*.18,-1.1,y-Math.sin(phase*1.8+j)*.18,-1.6,y*.9);ctx.stroke();}
 }else if(family==='moth'){
  const spread=.48+Math.abs(Math.sin(phase*7))*.43;
  for(let side=-1;side<=1;side+=2){ctx.beginPath();ctx.moveTo(.30,0);ctx.bezierCurveTo(.88,side*spread,0,side*1.05*spread,-.17,side*.58*spread);ctx.bezierCurveTo(-1,side*.88*spread,-.83,side*.03,.30,0);ctx.fill();}
  ctx.beginPath();ctx.ellipse(0,0,.54,.12,0,0,TAU);ctx.fill();
 }else if(family==='ribbon'){
  // Long flexible rays/plasma grazers are visually unlike birds or ships.
  const curl=Math.sin(phase*1.7)*.18;
  ctx.beginPath();ctx.moveTo(1,0);ctx.quadraticCurveTo(.22,-.47,-.42,-.17);ctx.quadraticCurveTo(-.80,curl,-1.37,.16+curl);ctx.quadraticCurveTo(-.38,.34,.31,.15);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(-.86,.16);ctx.quadraticCurveTo(-1.6,.12-curl,-2,.21+curl);ctx.stroke();
 }else if(family==='ray'||family==='glider'){
  const fold=Math.sin(phase*1.5)*.27;
  ctx.beginPath();ctx.moveTo(.9,0);ctx.quadraticCurveTo(.2,-.2,-.35,-.88-fold);ctx.quadraticCurveTo(-.67,-.48,-.53,0);ctx.quadraticCurveTo(-.67,.48,-.35,.88+fold);ctx.quadraticCurveTo(.2,.2,.9,0);ctx.fill();
  ctx.beginPath();ctx.moveTo(-.48,0);ctx.quadraticCurveTo(-1.3,fold*.45,-1.68,-.12);ctx.stroke();
 }else{
  ctx.beginPath();ctx.moveTo(-.42,0);ctx.quadraticCurveTo(-.72,-.20-wing*.45,-1.42,-wing);ctx.quadraticCurveTo(-.60,.13,-.11,.17);ctx.lineTo(.35,.05);ctx.quadraticCurveTo(.79,.02,1.24,-wing*.85);ctx.quadraticCurveTo(.73,-.18-wing*.26,.17,-.08);ctx.lineTo(.40,-.12);ctx.lineTo(.52,.01);ctx.lineTo(.22,.11);ctx.lineTo(-.35,.30);ctx.closePath();ctx.fill();
 }
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
  const crab=route.kind==='crab',hot=route.kind==='ember-beetle';
  // A soft, offset contact shadow seats the feet on the rock without a glow.
  ctx.fillStyle=hot?'#272724':'#183d42';ctx.globalAlpha=p.alpha*.32;ctx.beginPath();ctx.ellipse(1,2,crab?7:8,3.8,0,0,TAU);ctx.fill();ctx.globalAlpha=p.alpha;
  ctx.strokeStyle=route.color;ctx.lineWidth=.85;
  for(let side=-1;side<=1;side+=2)for(let leg=0;leg<3;leg++){
   const stride=Math.sin(p.stride+leg*2.2+(side<0?Math.PI:0)),root=-3.7+leg*3.1;
   ctx.beginPath();ctx.moveTo(root,side*2);ctx.lineTo(root-1.7+stride*.6,side*(4.5+stride*.35));ctx.lineTo(root-3+stride*1.1,side*(6.5+leg*.35));ctx.stroke();
  }
  ctx.fillStyle=route.color;ctx.beginPath();ctx.ellipse(0,0,crab?4.8:6,crab?3.5:2.65,0,0,TAU);ctx.fill();
  ctx.fillStyle=crab?'#a1b3a1':hot?'#a8794b':'#98a69a';ctx.globalAlpha=p.alpha*.55;ctx.beginPath();ctx.ellipse(-.6,-1,crab?3.2:4,1.2,-.12,0,TAU);ctx.fill();ctx.globalAlpha=p.alpha;
  ctx.strokeStyle=hot?'#b57d43':crab?'#a1b1a0':'#89988a';ctx.lineWidth=.65;
  if(crab){
   for(let side=-1;side<=1;side+=2){const claw=side*(4.3+Math.sin(p.stride*.32+side)*.4);ctx.beginPath();ctx.moveTo(2.6,side*2);ctx.lineTo(6.5,claw);ctx.lineTo(8.8,claw-side*1.3);ctx.moveTo(6.5,claw);ctx.lineTo(8.1,claw+side*.8);ctx.stroke();}
  }else{
   // Charred wing cases, amber segment seams and moving antennae.
   ctx.beginPath();ctx.moveTo(-4,0);ctx.lineTo(3,0);for(let seam=-3;seam<=1;seam+=2){ctx.moveTo(seam,-2.15);ctx.lineTo(seam+.8,2.15);}ctx.stroke();
   for(let side=-1;side<=1;side+=2){ctx.beginPath();ctx.moveTo(5,side*.8);ctx.quadraticCurveTo(8,side*2,9+Math.sin(p.stride*.4+side),side*3.6);ctx.stroke();}
  }
  ctx.restore();
 }
 ctx.restore();
}
