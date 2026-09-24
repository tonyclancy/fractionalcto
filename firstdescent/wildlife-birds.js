// Small, articulated birds. The wings are jointed in three dimensions before
// projection, so a bank reveals different surfaces instead of scaling an icon.
function wildlifeBirdPose(family,p){
 const swift=family==='swift',soarer=family==='soarer',span=swift?1.65:soarer?2.12:1.86;
 const beat=p.flapAngle??Math.sin(p.phase*(swift?11:soarer?5.8:8.1))*.9;
 const bank=p.bank||0,elevation=.43,cb=Math.cos(bank),sb=Math.sin(bank);
 const project=(x,y,z)=>({x:x+z*.12,y:(y*cb-z*sb)*.9+(z*cb+y*sb)*elevation});
 function wing(side){
  const a=beat+(side<0?.07:0),outer=a*.78+Math.sin((p.beatPhase||p.phase*8)-.65)*.18*(p.flapActivity??1);
  const joint=(x,d)=>{const angle=d<.55?a:outer,reach=span*d;return project(x,-Math.sin(angle)*reach,side*(.12+Math.cos(angle)*reach));};
  return {side,points:[project(.12,-.09,side*.14),joint(.23,.43),joint(swift?-.20:-.33,.78),joint(swift?-1.21:-1.02,1),joint(swift?-1.11:-1.30,.77),joint(-.73,.43),project(-.52,.02,side*.12)],angle:a};
 }
 return {far:wing(-1),near:wing(1),span,beat,swift,soarer};
}
function drawBirdWildlife(family,p,route){
 if(!['gull','swift','soarer','bird'].includes(family))return false;
 const pose=wildlifeBirdPose(family,p),pale=family==='gull'||route.habitat==='ice';
 const colors=pale?['#cbd6cd','#536e78','#273f4e']:family==='swift'?['#839796','#354e5c','#19313f']:['#a4aa95','#4f6266','#2d424c'];
 ctx.save();ctx.lineJoin='round';
 function wing(w,far){
  const a=w.points,lighting=Math.max(0,Math.min(1,.5+w.angle*.42+(p.bank||0)*.3));
  const grad=ctx.createLinearGradient(a[0].x,a[0].y-.2,a[3].x,a[3].y+.25);
  grad.addColorStop(0,far?colors[1]:colors[0]);grad.addColorStop(.58,colors[1]);grad.addColorStop(1,colors[2]);
  ctx.beginPath();ctx.moveTo(a[0].x,a[0].y);ctx.quadraticCurveTo(a[1].x+.10,a[1].y,a[2].x,a[2].y);ctx.quadraticCurveTo(a[2].x-.21,a[2].y,a[3].x,a[3].y);
  // Separated primary tips break the outer silhouette with soft feather arcs.
  for(let f=1;f<=6;f++){const u=f/6,v=(f-.46)/6;ctx.quadraticCurveTo(a[3].x+(a[4].x-a[3].x)*v-.07,a[3].y+(a[4].y-a[3].y)*v+.055,a[3].x+(a[4].x-a[3].x)*u,a[3].y+(a[4].y-a[3].y)*u);}
  ctx.quadraticCurveTo(a[5].x-.1,a[5].y,a[6].x,a[6].y);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  // Overlapping primaries follow the articulated wrist, with asymmetric tips.
  const wrist=a[2],tip=a[3],heel=a[4];ctx.fillStyle=far?colors[2]:colors[1];
  for(let f=0;f<5;f++){
   const u=(f+.35)/5,root={x:wrist.x+(heel.x-wrist.x)*u,y:wrist.y+(heel.y-wrist.y)*u};
   const end={x:tip.x+(heel.x-tip.x)*u-.09*(1-u),y:tip.y+(heel.y-tip.y)*u+.04*Math.sin(f*2)};
   ctx.beginPath();ctx.moveTo(root.x,root.y);ctx.quadraticCurveTo((root.x+end.x)/2-.09,(root.y+end.y)/2,end.x,end.y);ctx.lineTo(end.x+.07,end.y-.03);ctx.lineTo(root.x+.13,root.y-.03);ctx.closePath();ctx.fill();
  }
  ctx.globalAlpha*=.15+lighting*.12;ctx.strokeStyle=colors[0];ctx.lineWidth=.042;ctx.beginPath();ctx.moveTo(a[0].x,a[0].y);ctx.quadraticCurveTo(a[1].x,a[1].y,a[2].x,a[2].y);ctx.stroke();ctx.globalAlpha/=.15+lighting*.12;
 }
 wing(pose.far,true);
 // Tapered tail, not the long ray-like filament previously used in air worlds.
 const tail=p.bank*.14;ctx.fillStyle=colors[2];ctx.beginPath();ctx.moveTo(-.56,-.10);ctx.lineTo(-1.23,-.23+tail);ctx.lineTo(pose.swift?-1.00:-1.28,tail);ctx.lineTo(-1.21,.23+tail);ctx.lineTo(-.52,.13);ctx.closePath();ctx.fill();
 const body=ctx.createLinearGradient(0,-.29,0,.31);body.addColorStop(0,colors[0]);body.addColorStop(.36,colors[1]);body.addColorStop(.72,pale?'#b6c4bf':'#80918d');body.addColorStop(1,colors[2]);ctx.fillStyle=body;
 ctx.beginPath();ctx.moveTo(-.81,0);ctx.bezierCurveTo(-.55,-.32,.18,-.30,.49,-.10);ctx.bezierCurveTo(.70,-.26,.84,-.25,.88,-.11);ctx.bezierCurveTo(.95,.07,.70,.13,.48,.14);ctx.bezierCurveTo(.03,.40,-.48,.28,-.81,0);ctx.fill();
 wing(pose.near,false);
 // Head and beak remain legible at normal scene scale.
 ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(.71,-.09,.19,.15,-.15,0,TAU);ctx.fill();ctx.fillStyle=pale?'#a59a6e':'#728480';ctx.beginPath();ctx.moveTo(.86,-.12);ctx.lineTo(1.10,-.025);ctx.lineTo(.85,.035);ctx.closePath();ctx.fill();ctx.fillStyle='#243d47';ctx.beginPath();ctx.ellipse(.765,-.115,.033,.032,0,0,TAU);ctx.fill();
 ctx.restore();return true;
}
