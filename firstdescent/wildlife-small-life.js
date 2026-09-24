// Small habitat life. These are articulated canvas drawings, not game actors.
// Local flight space is one body unit; crawlers retain their small pixel scale.
function smallLifeColor(hex,amount){
 const value=parseInt((hex||'#8b968b').replace('#',''),16),channel=shift=>Math.max(0,Math.min(255,((value>>shift)&255)+amount));
 return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}
function smallLifeShade(color,x0,y0,x1,y1,light=38,dark=-38){
 const gradient=ctx.createLinearGradient(x0,y0,x1,y1);
 gradient.addColorStop(0,smallLifeColor(color,light));gradient.addColorStop(.38,color);gradient.addColorStop(1,smallLifeColor(color,dark));return gradient;
}
function smallLifeOval(x,y,rx,ry,angle=0){ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,Math.PI*2);ctx.fill();}
function drawSmallWildlife(family,p,route){
 if(!['moth','firefly','beetle','bat','plasma','plasma-ribbon','plasma-drifter','plasma-mote'].includes(family))return false;
 const phase=p.phase||0,hot=route.habitat==='hot'||route.habitat==='forge',color=hot?'#64594e':route.color||'#8b968b';
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 if(family.startsWith('plasma'))drawSmallPlasma(family,phase,color,p.bank||0);
 else if(family==='bat')drawSmallBat(p,color);
 else drawSmallInsect(family,phase,color,hot,p.bank||0);
 ctx.restore();return true;
}
function drawSmallInsect(family,phase,color,hot,bank){
 const beetle=family==='beetle',firefly=family==='firefly';
 const beat=phase*(beetle?17.7:firefly?24.3:11.6)+Math.sin(phase*2.13)*.28;
 const spread=.20+.80*(.5+.5*Math.sin(beat)),bodyRock=Math.sin(beat+.7)*.035;
 ctx.rotate(bodyRock+bank*.10);
 // Hind legs trail the abdomen and flex independently of the wing stroke.
 ctx.strokeStyle=smallLifeColor(color,-39);ctx.lineWidth=.045;
 ctx.beginPath();
 for(let side=-1;side<=1;side+=2)for(let leg=0;leg<3;leg++){
  const root=.13-leg*.22,flex=Math.sin(phase*4.1+leg*1.2+side)*.065;
  ctx.moveTo(root,side*.12);ctx.lineTo(root-.12,side*(.28+flex));ctx.lineTo(root-.41+flex,side*(.37+flex));
 }
 ctx.stroke();
 const alpha=ctx.globalAlpha;
 for(let side=-1;side<=1;side+=2){
  const opening=Math.max(.15,spread+side*bank*.45),tipY=side*opening;
  ctx.fillStyle=smallLifeShade(color,.1,0,-.3,tipY,beetle||firefly?65:43,beetle||firefly?-3:-38);
  ctx.globalAlpha=alpha*(beetle||firefly?.51:.94);
  ctx.beginPath();ctx.moveTo(.32,side*.05);
  if(beetle||firefly){
   ctx.bezierCurveTo(.74,tipY*.65,.58,tipY*1.3,.04,tipY*1.22);
   ctx.bezierCurveTo(-.44,tipY*1.22,-.48,tipY*.48,.05,side*.03);
  }else{
   // Forewing pointed at the shoulder, scalloped hindwing behind it.
   ctx.bezierCurveTo(.75,tipY*.39,.50,tipY*1.30,-.20,tipY*1.12);
   ctx.quadraticCurveTo(-.30,tipY*.93,-.19,tipY*.70);
   ctx.bezierCurveTo(-.73,tipY*1.08,-1.04,tipY*.60,-.65,tipY*.22);
   ctx.quadraticCurveTo(-.33,tipY*.11,.32,side*.05);
  }
  ctx.closePath();ctx.fill();
  ctx.globalAlpha=alpha*.50;ctx.strokeStyle=smallLifeColor(color,-35);ctx.lineWidth=.025;
  ctx.beginPath();ctx.moveTo(.22,side*.07);ctx.quadraticCurveTo(.05,tipY*.52,.13,tipY*1.04);
  ctx.moveTo(.05,side*.09);ctx.lineTo(-.40,tipY*.58);ctx.moveTo(.08,tipY*.46);ctx.lineTo(.40,tipY*.67);ctx.stroke();
  if(!beetle&&!firefly){
   // A soft band follows each moving wing instead of a solid icon silhouette.
   ctx.strokeStyle=smallLifeColor(color,hot?8:-18);ctx.lineWidth=.083;
   ctx.beginPath();ctx.moveTo(.35,tipY*.70);ctx.quadraticCurveTo(-.02,tipY*.78,-.43,tipY*.46);ctx.stroke();
  }
 }
 ctx.globalAlpha=alpha;
 ctx.fillStyle=smallLifeShade(color,-.3,-.2,0,.24,18,-49);smallLifeOval(-.22,0,beetle?.60:.51,beetle?.23:.145);
 if(beetle){
  // Rigid charred wing cases splay to expose the beating flight wings.
  for(let side=-1;side<=1;side+=2){
   ctx.save();ctx.translate(.07,side*.10);ctx.rotate(side*(.53+spread*.12));
   ctx.fillStyle=smallLifeShade(color,-.3,-.15,-.2,.18,24,-46);smallLifeOval(-.31,0,.47,.16,-side*.05);ctx.restore();
  }
 }
 ctx.fillStyle=smallLifeShade(color,.1,-.21,.27,.21,32,-52);smallLifeOval(.16,0,.25,beetle?.21:.17);
 ctx.fillStyle=smallLifeShade(color,.38,-.13,.5,.13,17,-50);smallLifeOval(.45,0,.17,.13);
 ctx.strokeStyle=hot?'#907057':smallLifeColor(color,-22);ctx.lineWidth=.028;ctx.beginPath();
 for(let segment=0;segment<3;segment++){
  const x=-.25-segment*.14;ctx.moveTo(x,-.11);ctx.quadraticCurveTo(x+.055,0,x,.11);
 }
 ctx.stroke();
 if(firefly){
  // A shaded amber organ, deliberately no bloom or projectile-like light trail.
  ctx.fillStyle=smallLifeShade(hot?'#a87745':'#b3a66b',-.63,-.1,-.57,.13,26,-25);smallLifeOval(-.58,0,.16,.10);
 }
 ctx.strokeStyle=smallLifeColor(color,5);ctx.lineWidth=.025;ctx.beginPath();
 for(let side=-1;side<=1;side+=2){
  const twitch=Math.sin(phase*2.8+side)*.035;
  ctx.moveTo(.49,side*.065);ctx.quadraticCurveTo(.69,side*.14,.78,side*(.24+twitch));
 }
 ctx.stroke();
 ctx.fillStyle='#172322';ctx.beginPath();ctx.arc(.48,-.09,.039,0,Math.PI*2);ctx.arc(.48,.09,.039,0,Math.PI*2);ctx.fill();
}
function drawSmallBat(p,color){
 const phase=p.phase||0,beat=phase*8.7+Math.sin(phase*.79)*.22,stroke=Math.sin(beat),bank=p.bank||0;
 ctx.rotate(Math.cos(beat)*.042);
 const membrane=smallLifeColor(color,-26),alpha=ctx.globalAlpha;
 for(let side=-1;side<=1;side+=2){
  const span=Math.max(.24,.87+stroke*.67+side*bank*.7),tip=side*span;
  ctx.fillStyle=smallLifeShade(membrane,.17,0,-.68,tip,27,-29);ctx.globalAlpha=alpha*.90;
  ctx.beginPath();ctx.moveTo(.27,side*.10);ctx.lineTo(.09,tip*.59);ctx.lineTo(-.58,tip*1.30);
  // The scalloped trailing edge joins long fingers, narrow wrist and hind foot.
  ctx.quadraticCurveTo(-.48,tip*.80,-.94,tip*.91);ctx.quadraticCurveTo(-.58,tip*.54,-1.05,tip*.45);
  ctx.quadraticCurveTo(-.65,tip*.34,-.64,side*.12);ctx.lineTo(-.22,side*.07);ctx.closePath();ctx.fill();
  ctx.globalAlpha=alpha*.72;ctx.strokeStyle=smallLifeColor(color,13);ctx.lineWidth=.031;
  ctx.beginPath();ctx.moveTo(.27,side*.10);ctx.lineTo(.09,tip*.59);ctx.lineTo(-.58,tip*1.30);
  ctx.moveTo(.09,tip*.59);ctx.lineTo(-.94,tip*.91);ctx.moveTo(.09,tip*.59);ctx.lineTo(-1.05,tip*.45);ctx.stroke();
 }
 ctx.globalAlpha=alpha;ctx.fillStyle=smallLifeShade(color,-.2,-.2,.1,.25,22,-45);smallLifeOval(-.20,0,.51,.19);
 ctx.fillStyle=smallLifeColor(color,-15);ctx.beginPath();ctx.moveTo(-.56,-.13);ctx.lineTo(-.94,0);ctx.lineTo(-.56,.13);ctx.closePath();ctx.fill();
 ctx.fillStyle=smallLifeShade(color,.2,-.2,.4,.18,28,-46);smallLifeOval(.28,0,.23,.18);
 ctx.beginPath();ctx.moveTo(.28,-.13);ctx.lineTo(.14,-.36);ctx.quadraticCurveTo(.43,-.31,.42,-.08);ctx.moveTo(.28,.13);ctx.lineTo(.14,.33);ctx.quadraticCurveTo(.43,.30,.42,.08);ctx.fill();
 ctx.fillStyle=smallLifeColor(color,-26);smallLifeOval(.46,0,.10,.09);
 ctx.fillStyle='#172322';ctx.beginPath();ctx.arc(.36,-.10,.03,0,Math.PI*2);ctx.arc(.36,.10,.03,0,Math.PI*2);ctx.fill();
}
function drawSmallPlasma(family,phase,color,bank){
 const alpha=ctx.globalAlpha,drifter=family==='plasma-drifter',mote=family==='plasma-mote';
 const wave=Math.sin(phase*2.3),pulse=.92+Math.sin(phase*2.9)*.09;
 ctx.rotate(bank*.15+Math.sin(phase*.77)*.04);
 if(mote){
  // An asymmetrical, six-limbed cinder organism: a compact body, no comet tail.
  for(let side=-1;side<=1;side+=2){
   ctx.globalAlpha=alpha*.64;ctx.strokeStyle=smallLifeColor(color,-24);ctx.lineWidth=.09;ctx.beginPath();
   for(let leg=0;leg<3;leg++){
    const x=.25-leg*.32,sway=Math.sin(phase*3.7+leg*1.9+side)*.12;
    ctx.moveTo(x,side*.14);ctx.bezierCurveTo(x+.22,side*.47,x-.31+sway,side*.71,x-.47,side*(.53+sway));
   }
   ctx.stroke();
  }
  ctx.globalAlpha=alpha;ctx.fillStyle=smallLifeShade(color,0,-.28,0,.31,16,-55);smallLifeOval(0,0,.57,.28*pulse);
  ctx.fillStyle=smallLifeColor(color,19);smallLifeOval(.24,-.035,.16,.10);
  ctx.strokeStyle=smallLifeColor(color,-31);ctx.lineWidth=.042;ctx.beginPath();ctx.moveTo(-.34,-.16);ctx.quadraticCurveTo(-.10,.04,-.34,.16);ctx.moveTo(-.04,-.23);ctx.quadraticCurveTo(.10,0,-.04,.23);ctx.stroke();
  return;
 }
 for(let side=-1;side<=1;side+=2){
  const spread=(drifter?.91:.42)+(drifter?.24:.16)*Math.sin(phase*(drifter?2.6:3.1)+side*.63);
  ctx.globalAlpha=alpha*.52;ctx.fillStyle=smallLifeShade(color,.3,0,-.4,side*spread,24,-32);
  ctx.beginPath();ctx.moveTo(.58,side*.05);
  if(drifter){
   ctx.bezierCurveTo(.58,side*spread,-.48,side*(spread+.20),-.81,side*.49);
   ctx.bezierCurveTo(-.40,side*.35,-.96,side*.24,-.44,side*.04);
  }else{
   ctx.bezierCurveTo(.15,side*spread,-.95,side*(spread+.11),-1.43,side*.04+wave*.15);
   ctx.quadraticCurveTo(-.63,side*.25-wave*.1,-.34,side*.025);
  }
  ctx.closePath();ctx.fill();
  ctx.globalAlpha=alpha*.4;ctx.strokeStyle=smallLifeColor(color,31);ctx.lineWidth=.025;
  ctx.beginPath();ctx.moveTo(.42,side*.05);ctx.quadraticCurveTo(-.15,side*spread*.68,drifter?-.66:-1.24,side*.11+wave*.07);ctx.stroke();
 }
 ctx.globalAlpha=alpha;ctx.fillStyle=smallLifeShade(color,.13,-.20,-.2,.22,21,-51);
 ctx.beginPath();ctx.moveTo(.80,0);ctx.bezierCurveTo(.68,-.28,-.39,-.23,-.74,-.05);
 ctx.bezierCurveTo(-1.12,wave*.12,-1.38,.24+wave*.20,-1.68,.03+wave*.20);
 ctx.bezierCurveTo(-1.18,.39+wave*.12,-.73,.18,-.40,.18);ctx.bezierCurveTo(.04,.24,.68,.23,.80,0);ctx.fill();
 ctx.globalAlpha=alpha*.46;ctx.strokeStyle=smallLifeColor(color,37);ctx.lineWidth=.045;
 ctx.beginPath();ctx.moveTo(.54,-.09);ctx.bezierCurveTo(.1,-.18,-.39,-.04,-.77,.08);ctx.stroke();
 ctx.globalAlpha=alpha*.76;ctx.fillStyle=smallLifeColor(color,-29);smallLifeOval(.30,0,drifter?.26:.18,.105);
 ctx.globalAlpha=alpha;
}
function drawCrawlerWildlife(route,p){
 const crab=route.kind==='crab',hot=route.kind==='ember-beetle',color=hot?'#655344':route.color||'#809489';
 const stride=p.stride||0,alpha=ctx.globalAlpha;
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 ctx.globalAlpha=alpha*.22;ctx.fillStyle='#102825';smallLifeOval(.6,2.0,crab?7.2:7.4,3.3);ctx.globalAlpha=alpha;
 ctx.strokeStyle=smallLifeColor(color,-16);ctx.lineWidth=.73;ctx.beginPath();
 for(let side=-1;side<=1;side+=2)for(let leg=0;leg<(crab?4:3);leg++){
  const gait=Math.sin(stride+leg*1.9+(side<0?Math.PI:0)),root=crab?2.6-leg*1.7:2.6-leg*2.6;
  const reach=(crab?5.2:4.4)+.5*Math.cos(leg),lift=Math.max(0,gait)*.7;
  ctx.moveTo(root,side*1.8);ctx.lineTo(root-1.2+gait*.8,side*(reach-lift));ctx.lineTo(root-2.5+gait*1.4,side*(reach+2.2-lift));
 }
 ctx.stroke();
 if(crab){
  ctx.fillStyle=smallLifeShade(color,-1,-3.2,1,3.6,35,-48);
  ctx.beginPath();ctx.moveTo(3.6,-2.9);ctx.bezierCurveTo(1.4,-4.4,-4.4,-3.6,-5.0,-1.3);ctx.lineTo(-4.7,2.0);
  ctx.bezierCurveTo(-1.8,4.0,1.6,3.9,3.6,2.8);ctx.quadraticCurveTo(5,0,3.6,-2.9);ctx.fill();
  ctx.strokeStyle=smallLifeColor(color,26);ctx.lineWidth=.40;ctx.beginPath();ctx.moveTo(-3.8,-2);ctx.quadraticCurveTo(-.1,-3.2,3,-1.9);ctx.moveTo(-2.5,1);ctx.quadraticCurveTo(0,1.8,2,1);ctx.stroke();
  for(let side=-1;side<=1;side+=2){
   const flex=Math.sin(stride*.38+side)*.45,clawY=side*(4.4+flex),clawX=6.6+Math.cos(stride*.23+side)*.5;
   ctx.strokeStyle=smallLifeColor(color,-7);ctx.lineWidth=1.0;ctx.beginPath();ctx.moveTo(2.8,side*2.2);ctx.lineTo(4.6,side*4.8);ctx.lineTo(clawX,clawY);ctx.stroke();
   ctx.fillStyle=smallLifeShade(color,clawX,clawY-1.3,clawX+.6,clawY+1.5,31,-31);smallLifeOval(clawX+.7,clawY,1.7,1.08,-side*.24);
   ctx.strokeStyle=smallLifeColor(color,13);ctx.lineWidth=.76;ctx.beginPath();ctx.moveTo(clawX+1.1,clawY-side*.45);ctx.lineTo(clawX+2.8,clawY-side*(.6+flex*.3));ctx.lineTo(clawX+2.4,clawY+side*.05);
   ctx.moveTo(clawX+1.3,clawY+side*.6);ctx.lineTo(clawX+2.8,clawY+side*(.8+flex*.5));ctx.stroke();
  }
  ctx.strokeStyle=smallLifeColor(color,-13);ctx.lineWidth=.62;ctx.beginPath();ctx.moveTo(3.6,-1.5);ctx.lineTo(5.0,-2.0);ctx.moveTo(3.6,1.5);ctx.lineTo(5,2);ctx.stroke();
  ctx.fillStyle='#142c29';ctx.beginPath();ctx.arc(5,-2,.52,0,Math.PI*2);ctx.arc(5,2,.52,0,Math.PI*2);ctx.fill();
 }else{
  ctx.fillStyle=smallLifeShade(color,-2,-2.9,-1,3,35,-45);smallLifeOval(-1.9,0,4.65,2.85);
  ctx.fillStyle=smallLifeShade(color,1,-2,2,2.2,22,-47);smallLifeOval(2.3,0,2.05,2.04);
  ctx.fillStyle=smallLifeShade(color,4,-1.3,5,1.6,16,-42);smallLifeOval(4.7,0,1.65,1.45);
  ctx.strokeStyle=hot?'#9a7452':smallLifeColor(color,-27);ctx.lineWidth=.38;ctx.beginPath();ctx.moveTo(-5.8,0);ctx.quadraticCurveTo(-1.8,-.3,1.7,0);
  for(let ridge=0;ridge<3;ridge++){const x=-4.7+ridge*1.45;ctx.moveTo(x,-2.15);ctx.quadraticCurveTo(x+.45,-1.2,x+.20,-.45);ctx.moveTo(x,.45);ctx.quadraticCurveTo(x+.45,1.2,x,2.15);}
  ctx.stroke();
  ctx.strokeStyle=smallLifeColor(color,9);ctx.lineWidth=.50;ctx.beginPath();
  for(let side=-1;side<=1;side+=2){const twitch=Math.sin(stride*.29+side)*.65;ctx.moveTo(5.6,side*.8);ctx.quadraticCurveTo(7.8,side*1.7,8.8+twitch,side*(3.2+twitch*.4));}ctx.stroke();
  ctx.fillStyle='#182624';ctx.beginPath();ctx.arc(5.1,-1.0,.40,0,Math.PI*2);ctx.arc(5.1,1.0,.40,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();return true;
}
