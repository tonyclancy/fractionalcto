// Background animals use articulated anatomy at the scene's own scale. These
// routines draw only; they never create combat entities, lights or collisions.
function sampleAquaticArticulation(family,phase,bank=0,out={}){
 const t=phase||0;
 out.bank=Math.max(-.65,Math.min(.65,bank||0));
 if(family==='fish'){
  out.beat=t*10.4;
  out.tail=Math.sin(out.beat)*.34;
  out.fin=Math.sin(t*13.1+.7)*.19;
 }else if(family==='ray'){
  out.beat=t*6.6;
  out.farWing=Math.sin(out.beat-.7)*.38;
  out.nearWing=Math.sin(out.beat+.5)*.43;
  out.tail=Math.sin(t*4.3-1.4)*.24;
 }else if(family==='jelly'){
  // A short squeeze followed by a longer refill reads as muscular propulsion.
  const cycle=((t*1.12)%1+1)%1;
  out.squeeze=cycle<.28?Math.sin(cycle/.28*Math.PI*.5):Math.pow(Math.cos((cycle-.28)/.72*Math.PI*.5),2);
  out.radius=.72-out.squeeze*.18;
  out.depth=.90+out.squeeze*.16;
  out.beat=t*7.0;
 }
 return out;
}
const aquaticArticulation={};
function drawAquaticWildlife(family,p,route){
 if(family!=='fish'&&family!=='ray'&&family!=='jelly')return false;
 const a=sampleAquaticArticulation(family,p.phase,p.bank,aquaticArticulation),alpha=ctx.globalAlpha;
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 if(family==='fish')drawWildlifeFish(a,route,alpha);
 else if(family==='ray')drawWildlifeRay(a,route,alpha);
 else drawWildlifeJelly(a,p.phase,route,alpha);
 ctx.restore();return true;
}
function aquaticFishSpine(x,a){
 // The head stays stable; the travelling bend grows down the muscular tail.
 const f=Math.max(0,(.45-x)/1.8);
 return Math.sin(a.beat+(.65-x)*2.6)*f*f*.22;
}
function drawWildlifeFish(a,route,alpha){
 const seed=(route?.seed||0)%3,colors=seed===0?['#547b7b','#9ebbb2','#31545e']:seed===1?['#3e7180','#a6c3be','#284c60']:['#687f72','#c2cab0','#375866'];
 const tailY=aquaticFishSpine(-1.14,a),tailTip=aquaticFishSpine(-1.70,a),belly=.27*(1-Math.abs(a.bank)*.22);
 // Far pectoral and translucent dorsal/anal fins sit behind the body.
 ctx.fillStyle='#497880';ctx.globalAlpha=alpha*.58;ctx.beginPath();ctx.moveTo(.18,-.02);ctx.quadraticCurveTo(-.06,-.57-a.fin,-.54,-.43);ctx.lineTo(-.29,.02);ctx.closePath();ctx.fill();
 ctx.fillStyle=colors[0];ctx.globalAlpha=alpha*.76;ctx.beginPath();ctx.moveTo(-.55,-.16);ctx.quadraticCurveTo(-.65,-.49,-.26,-.53);ctx.lineTo(.06,-.20);ctx.closePath();ctx.moveTo(-.65,.13);ctx.lineTo(-.39,.43);ctx.lineTo(-.17,.21);ctx.closePath();ctx.fill();
 // The caudal peduncle joins a forked, flexing tail, not a detached triangle.
 const tailShade=ctx.createLinearGradient(-1.75,tailTip-.38,-.98,tailY+.28);tailShade.addColorStop(0,'#426975');tailShade.addColorStop(.5,'#82a69f');tailShade.addColorStop(1,'#355a68');
 ctx.fillStyle=tailShade;ctx.globalAlpha=alpha*.93;ctx.beginPath();ctx.moveTo(-.97,tailY-.09);ctx.quadraticCurveTo(-1.34,tailY-.19,-1.71,tailTip-.40);ctx.quadraticCurveTo(-1.70,tailTip-.11,-1.47,tailTip+.01);ctx.quadraticCurveTo(-1.64,tailTip+.17,-1.67,tailTip+.40);ctx.quadraticCurveTo(-1.28,tailY+.19,-.97,tailY+.08);ctx.closePath();ctx.fill();
 const shade=ctx.createLinearGradient(0,-.33,0,.35);shade.addColorStop(0,colors[0]);shade.addColorStop(.36,colors[1]);shade.addColorStop(.62,'#7faaa7');shade.addColorStop(1,colors[2]);
 ctx.fillStyle=shade;ctx.globalAlpha=alpha;ctx.beginPath();ctx.moveTo(.91,.01);ctx.bezierCurveTo(.70,-.22,.26,-.39,-.22,-.28);
 for(let i=0;i<=8;i++){const x=-.22-i*.1125,thick=.24*(1-i/10);ctx.lineTo(x,aquaticFishSpine(x,a)-thick);}
 for(let i=8;i>=0;i--){const x=-.22-i*.1125,thick=belly*(1-i/10);ctx.lineTo(x,aquaticFishSpine(x,a)+thick);}
 ctx.bezierCurveTo(.15,.31,.64,.23,.91,.01);ctx.closePath();ctx.fill();
 // A muted lateral stripe, gill cover and narrow flank reflection give volume.
 ctx.strokeStyle='#325461';ctx.globalAlpha=alpha*.43;ctx.lineWidth=.045;ctx.beginPath();ctx.moveTo(.50,.055);ctx.quadraticCurveTo(-.11,.06,-.85,aquaticFishSpine(-.85,a)+.03);ctx.moveTo(.35,-.20);ctx.quadraticCurveTo(.17,-.02,.33,.20);ctx.stroke();
 ctx.strokeStyle='#c3d6c6';ctx.globalAlpha=alpha*.49;ctx.lineWidth=.035;ctx.beginPath();ctx.moveTo(.53,-.12);ctx.quadraticCurveTo(.08,-.21,-.46,-.14);ctx.stroke();
 // Near pectoral sweeps back independently from the tail; fine rays stay soft.
 ctx.fillStyle='#a4beb1';ctx.globalAlpha=alpha*.68;ctx.beginPath();ctx.moveTo(.25,.045);ctx.quadraticCurveTo(-.03,.20+a.fin,-.38,.21+a.fin);ctx.quadraticCurveTo(-.18,.035,.25,.045);ctx.fill();
 ctx.strokeStyle='#526f74';ctx.globalAlpha=alpha*.55;ctx.lineWidth=.025;ctx.beginPath();for(let i=0;i<3;i++){ctx.moveTo(-1.02,tailY);ctx.lineTo(-1.61,tailTip+(i-1)*.27);}ctx.moveTo(.19,.06);ctx.lineTo(-.24,.15+a.fin*.7);ctx.stroke();
 ctx.fillStyle='#1b3b43';ctx.globalAlpha=alpha*.92;ctx.beginPath();ctx.ellipse(.59,-.07,.055,.062,-.1,0,TAU);ctx.fill();ctx.fillStyle='#c4d4bc';ctx.globalAlpha=alpha*.63;ctx.beginPath();ctx.ellipse(.60,-.09,.016,.019,0,0,TAU);ctx.fill();
}
function drawWildlifeRay(a,route,alpha){
 const bank=a.bank,far=-1.04-a.farWing+bank*.23,near=1.07+a.nearWing+bank*.21;
 // The tail is a thin tapered continuation, with a delayed lateral wave.
 ctx.fillStyle='#426e75';ctx.globalAlpha=alpha*.9;ctx.beginPath();ctx.moveTo(-.56,-.075);ctx.bezierCurveTo(-1.18,-.12,-1.55,a.tail-.10,-2.13,a.tail*.67);ctx.bezierCurveTo(-1.58,a.tail+.02,-1.08,.08,-.56,.075);ctx.closePath();ctx.fill();
 const farShade=ctx.createLinearGradient(.1,far,.1,.1);farShade.addColorStop(0,'#486a74');farShade.addColorStop(.5,'#638b8d');farShade.addColorStop(1,'#304f5e');
 ctx.fillStyle=farShade;ctx.globalAlpha=alpha*.86;ctx.beginPath();ctx.moveTo(.73,-.05);ctx.bezierCurveTo(.45,-.34,.11,far*.90,-.39,far);ctx.bezierCurveTo(-.44,far*.71,-.18,far*.50,-.78,-.10);ctx.quadraticCurveTo(-.01,-.25,.73,-.05);ctx.fill();
 const nearShade=ctx.createLinearGradient(.2,-.12,-.1,near);nearShade.addColorStop(0,'#789e99');nearShade.addColorStop(.43,'#6b9694');nearShade.addColorStop(.73,'#496f79');nearShade.addColorStop(1,'#2f5264');
 ctx.fillStyle=nearShade;ctx.globalAlpha=alpha;ctx.beginPath();ctx.moveTo(.77,.01);ctx.bezierCurveTo(.44,.32,.05,near*.86,-.42,near);ctx.bezierCurveTo(-.42,near*.69,-.20,near*.42,-.79,.13);ctx.quadraticCurveTo(-.10,-.18,.77,.01);ctx.fill();
 // Rolled wing edges occasionally reveal a subdued pale underside.
 if(a.nearWing<-.05){ctx.fillStyle='#a0b8ac';ctx.globalAlpha=alpha*.55;ctx.beginPath();ctx.moveTo(-.42,near);ctx.quadraticCurveTo(-.09,near*.81,.33,.41);ctx.quadraticCurveTo(.04,near*.87,-.42,near);ctx.fill();}
 const body=ctx.createLinearGradient(0,-.27,0,.28);body.addColorStop(0,'#436c73');body.addColorStop(.42,'#89aaa0');body.addColorStop(1,'#3c616d');ctx.fillStyle=body;ctx.globalAlpha=alpha;ctx.beginPath();ctx.moveTo(.86,0);ctx.bezierCurveTo(.62,-.24,.03,-.31,-.61,-.17);ctx.quadraticCurveTo(-.91,0,-.60,.16);ctx.bezierCurveTo(-.07,.28,.60,.24,.86,0);ctx.fill();
 // Fine pigment flecks follow the mantle, rather than making a graphic outline.
 ctx.fillStyle='#afc2b6';ctx.globalAlpha=alpha*.22;ctx.beginPath();for(let i=0;i<9;i++){const x=.35-(i%3)*.24,y=(Math.floor(i/3)-1)*.12;ctx.ellipse(x,y,.033+(i%2)*.012,.025,0,0,TAU);}ctx.fill();
 ctx.strokeStyle='#294b5b';ctx.globalAlpha=alpha*.31;ctx.lineWidth=.028;ctx.beginPath();ctx.moveTo(.27,-.19);ctx.quadraticCurveTo(-.06,far*.43,-.34,far*.78);ctx.moveTo(.27,.19);ctx.quadraticCurveTo(-.03,near*.40,-.35,near*.76);ctx.stroke();
 ctx.fillStyle='#244451';ctx.globalAlpha=alpha*.91;ctx.beginPath();ctx.ellipse(.48,-.12,.048,.029,-.2,0,TAU);ctx.ellipse(.49,.105,.050,.033,.2,0,TAU);ctx.fill();
}
function drawWildlifeJelly(a,phase,route,alpha){
 const r=a.radius,depth=a.depth,seed=(route?.seed||0)%5;
 // Eight filaments carry a travelling bend away from the bell. Root motion
 // responds to each squeeze; the thin tips lag progressively behind it.
 ctx.strokeStyle='#8bb9b7';ctx.globalAlpha=alpha*.67;
 for(let j=0;j<8;j++){
  const root=(j/7-.5)*r*1.70,len=1.35+(j%3)*.24,frequency=4.2+j*.09;
  ctx.lineWidth=.025+(j%3)*.009;ctx.beginPath();ctx.moveTo(-.14,root);
  for(let k=1;k<=8;k++){
   const f=k/8,x=-.14-f*len,wave=Math.sin(phase*frequency-f*5.1+j*.92+seed)*(.035+f*.13);
   ctx.lineTo(x,root*(1-f*.23)+wave+Math.sin(a.beat-f*4)*a.squeeze*f*.09);
  }
  ctx.stroke();
 }
 // Three thicker oral arms are translucent folded tissue between the filaments.
 for(let j=0;j<3;j++){
  const root=(j-1)*r*.35,bend=Math.sin(phase*4.4-j*1.5)*.11,end=Math.sin(phase*4.4-j*1.5-2)*.18;
  ctx.fillStyle=j===1?'#b5c6b0':'#729eab';ctx.globalAlpha=alpha*.34;ctx.beginPath();ctx.moveTo(-.02,root-.08);ctx.bezierCurveTo(-.43,root+bend-.17,-.82,root+end-.10,-1.30,root+end);ctx.bezierCurveTo(-.76,root+end+.10,-.35,root+bend+.16,-.02,root+.08);ctx.closePath();ctx.fill();
 }
 // A domed, layered membrane leaves the environment visible through the bell.
 const glass=ctx.createRadialGradient(.40,-r*.29,.06,.31,0,depth*.89);glass.addColorStop(0,'rgba(189,215,204,.57)');glass.addColorStop(.39,'rgba(123,178,182,.37)');glass.addColorStop(.74,'rgba(72,130,151,.18)');glass.addColorStop(1,'rgba(146,198,197,.53)');
 ctx.globalAlpha=alpha;ctx.fillStyle=glass;ctx.beginPath();ctx.moveTo(-.13,-r);ctx.bezierCurveTo(depth*.63,-r*1.05,depth,-r*.56,depth,0);ctx.bezierCurveTo(depth,r*.56,depth*.63,r*1.05,-.13,r);ctx.quadraticCurveTo(.01,0,-.13,-r);ctx.closePath();ctx.fill();
 // Soft internal stomach lobes and radial canals are visible inside the dome.
 ctx.fillStyle='#b0bdaa';ctx.globalAlpha=alpha*.37;ctx.beginPath();for(let j=0;j<4;j++){const angle=j*TAU/4+.28;ctx.ellipse(.36+Math.cos(angle)*.13,Math.sin(angle)*r*.34,.11,.15,angle,0,TAU);}ctx.fill();
 ctx.strokeStyle='#bad1bd';ctx.globalAlpha=alpha*.31;ctx.lineWidth=.023;ctx.beginPath();for(let j=0;j<5;j++){const y=(j-2)*r*.39;ctx.moveTo(.63,0);ctx.quadraticCurveTo(.25,y*.52,-.12,y);}ctx.stroke();
 // The skirt is a scalloped physical lip with individual trailing lobes.
 ctx.fillStyle='#88b4b5';ctx.globalAlpha=alpha*.61;ctx.beginPath();ctx.moveTo(-.13,-r);for(let j=0;j<7;j++){const y0=-r+j*r*2/7,y1=y0+r*2/7;ctx.quadraticCurveTo(-.31-a.squeeze*.07,(y0+y1)*.5,-.13,y1);}ctx.quadraticCurveTo(.03,0,-.13,-r);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#c2d8c9';ctx.globalAlpha=alpha*.43;ctx.lineWidth=.042;ctx.beginPath();ctx.moveTo(.04,-r*.88);ctx.bezierCurveTo(.49,-r*.85,.79,-r*.48,.85,-r*.14);ctx.stroke();
}
