/* First Descent fauna. Closed anatomical surfaces and local skeletal motion.
 * Coordinates are model space: the mouth points towards -X, Y is down, and
 * paired appendages lie on either side of Z. No model is an image billboard. */
var alienBossDesigns={},buildAlienBosses,animateAlienBoss,alienBossPoint;
(function(){
 const TAU=Math.PI*2,cl=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
 const add=(a,b)=>a.map((v,k)=>v+b[k]),sub=(a,b)=>a.map((v,k)=>v-b[k]);
 const mul=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((n,v,k)=>n+v*b[k],0);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const unit=a=>mul(a,1/(Math.hypot(...a)||1));
 const tint=(a,n)=>a.map(v=>Math.round(cl(v*n,0,255)));
 const cat=(a,b,c,d,t)=>.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
 function sample(points,u){const i=Math.min(points.length-2,Math.floor(u)),t=u-i,a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];return b.map((v,k)=>cat(a[k],v,c[k],d[k],t));}
 function rotate(v,p,axis,angle){const x=sub(v,p),c=Math.cos(angle),s=Math.sin(angle),a=unit(axis),cr=cross(a,x),dp=dot(a,x);return x.map((n,k)=>p[k]+n*c+cr[k]*s+a[k]*dp*(1-c));}
 function creator(kind,name,material,scale,mouth,bodyVolumes){
  const mesh=[],parts=[];mesh.skin=true;mesh.dynamic=true;mesh.alienMaterial=material;
  const d={kind,name,mesh,parts,scale,mouth,bodyVolumes,mouthOpening:0};
  function face(v,c,uv,options={}){mesh.push({v,c,uv:uv||v.map(p=>[p[0]/75,p[1]/75]),em:options.em||0,flex:0,textureWeight:options.textureWeight===undefined?1:options.textureWeight,wet:options.wet||0});}
  function part(name,rig,options,build){const start=mesh.length;build();const seen=new Set(),vertices=[];for(let i=start;i<mesh.length;i++)for(const v of mesh[i].v)if(!seen.has(v)){seen.add(v);vertices.push(v);}const rest=vertices.map(v=>v.slice());parts.push({name,rig,...options,vertices,rest});}
  // A single watertight longitudinal loft; varying cross sections create the
  // actual skull, thorax and abdomen instead of intersecting sphere chains.
  function loft(profile,color,options={}){
   const steps=(profile.length-1)*(options.steps||4),sides=options.sides||28,rings=[];
   for(let j=0;j<=steps;j++){const p=sample(profile,j/steps*(profile.length-1)),ring=[];for(let k=0;k<sides;k++){const a=k/sides*TAU,cc=Math.cos(a),ss=Math.sin(a),ridge=1+(options.ridge||0)*Math.cos(a*3),ex=options.exponent||1;ring.push([p[0],p[1]+Math.sign(cc)*Math.pow(Math.abs(cc),ex)*Math.max(.1,p[3])*ridge,p[2]+Math.sign(ss)*Math.pow(Math.abs(ss),ex)*Math.max(.1,p[4])]);}rings.push(ring);}
   for(let j=0;j<steps;j++)for(let k=0;k<sides;k++)face([rings[j][k],rings[j][(k+1)%sides],rings[j+1][(k+1)%sides],rings[j+1][k]],color,[[j/steps*2,k/sides],[j/steps*2,(k+1)/sides],[(j+1)/steps*2,(k+1)/sides],[(j+1)/steps*2,k/sides]],options);
   face(rings[0].slice().reverse(),color,rings[0].map(v=>[v[1]/60,v[2]/60]),options);face(rings[steps],color,rings[steps].map(v=>[v[1]/60,v[2]/60]),options);
   return rings;
  }
  // Parallel-transport frames keep curved tendons smooth through arbitrary
  // bends. Radius is authored at every joint, including the thick muscle root.
  function tube(profile,color,options={}){
   const steps=(profile.length-1)*(options.steps||4),sides=options.sides||10,path=[];for(let j=0;j<=steps;j++)path.push(sample(profile,j/steps*(profile.length-1)));
   let normal=null;const rings=[];
   for(let j=0;j<=steps;j++){const p=path[j],t=unit(sub(path[Math.min(steps,j+1)].slice(0,3),path[Math.max(0,j-1)].slice(0,3)));if(!normal)normal=unit(cross(t,Math.abs(t[2])<.8?[0,0,1]:[0,1,0]));else normal=unit(sub(normal,mul(t,dot(normal,t))));const bi=unit(cross(t,normal)),ring=[];for(let k=0;k<sides;k++){const a=k/sides*TAU,r=Math.max(.08,p[3]),rr=Math.max(.08,p[4]===undefined?r:p[4]);ring.push(p.slice(0,3).map((v,i)=>v+normal[i]*Math.cos(a)*r+bi[i]*Math.sin(a)*rr));}rings.push(ring);}
   for(let j=0;j<steps;j++)for(let k=0;k<sides;k++)face([rings[j][k],rings[j][(k+1)%sides],rings[j+1][(k+1)%sides],rings[j+1][k]],color,[[j/steps,k/sides],[j/steps,(k+1)/sides],[(j+1)/steps,(k+1)/sides],[(j+1)/steps,k/sides]],options);
   face(rings[0].slice().reverse(),color,null,options);face(rings[steps],color,null,options);return rings;
  }
  // Closed, thin curved sheet, with a real edge and a shaded reverse surface.
  function sheet(point,color,nu=22,nv=10,thickness=.7,options={}){
   const grids=[[],[]];for(let s=0;s<2;s++)for(let i=0;i<=nu;i++){const row=[];for(let j=0;j<=nv;j++){const p=point(i/nu,j/nv);row.push([p[0],p[1]+(s?1:-1)*thickness,p[2]]);}grids[s].push(row);}
   for(let s=0;s<2;s++)for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const v=[grids[s][i][j],grids[s][i+1][j],grids[s][i+1][j+1],grids[s][i][j+1]],uv=[[i/nu,j/nv],[(i+1)/nu,j/nv],[(i+1)/nu,(j+1)/nv],[i/nu,(j+1)/nv]];face(s?v:v.slice().reverse(),s?color:tint(color,1.04),s?uv:uv.slice().reverse(),options);}
   for(let i=0;i<nu;i++)for(const j of [0,nv])face([grids[0][i][j],grids[1][i][j],grids[1][i+1][j],grids[0][i+1][j]],color,null,options);
   for(let j=0;j<nv;j++)for(const i of [0,nu])face([grids[0][i][j],grids[0][i][j+1],grids[1][i][j+1],grids[1][i][j]],color,null,options);
  }
  // Carapace panels follow an anatomical cross section. Their raised lip casts
  // a narrow shadow over the next panel rather than resembling added pebbles.
  function armor(x0,x1,cy,ry,rz,color,options={}){
   const n=options.n||7,m=options.m||22,a0=options.a0===undefined?.38:options.a0,a1=options.a1===undefined?TAU-.38:options.a1,grids=[[],[]];
   for(let s=0;s<2;s++)for(let i=0;i<=n;i++){const t=i/n,x=mix(x0,x1,t),edge=Math.sin(t*Math.PI)*1.5+(i===n?2:0),row=[];for(let j=0;j<=m;j++){const a=mix(a0,a1,j/m),r=(s?-.4:1.1)+edge,shape=1+.025*Math.cos(a*5);row.push([x+(1-Math.cos(a))*1.4,cy+(ry*(1-t*.085)+r)*Math.cos(a)*shape,(rz*(1-t*.07)+r)*Math.sin(a)]);}grids[s].push(row);}
   for(let s=0;s<2;s++)for(let i=0;i<n;i++)for(let j=0;j<m;j++){let v=[grids[s][i][j],grids[s][i][j+1],grids[s][i+1][j+1],grids[s][i+1][j]],uv=[[i/n,j/m],[i/n,(j+1)/m],[(i+1)/n,(j+1)/m],[(i+1)/n,j/m]];if(s){v.reverse();uv.reverse();}face(v,color,uv);}
   for(let i=0;i<n;i++)for(const j of [0,m])face([grids[0][i][j],grids[1][i][j],grids[1][i+1][j],grids[0][i+1][j]],tint(color,.78));
   for(let j=0;j<m;j++)for(const i of [0,n])face([grids[0][i][j],grids[0][i][j+1],grids[1][i][j+1],grids[1][i][j]],tint(color,.82));
  }
  function lens(center,radii,color,options={}){const [x,y,z]=center,[rx,ry,rz]=radii;loft([[x-rx,y,z,.1,.1],[x-rx*.65,y,z,ry*.76,rz*.76],[x,y,z,ry,rz],[x+rx*.65,y,z,ry*.76,rz*.76],[x+rx,y,z,.1,.1]],color,{steps:2,sides:16,textureWeight:0,...options});}
  function sensePit(x,y,z,side,skin,size=2.7){
   part('sensory pit','blink',{pivot:[x,y,z],phase:Math.abs(x)*.013},()=>{
    lens([x,y,z],[size*1.5,size*.62,.5],[17,24,26],{wet:.5});lens([x-.2,y,z+side*.45],[size*.63,size*.35,.34],[176,141,66],{em:.04,wet:1});
   });
   tube([[x-5,y-1.2,z-side*.5,1.2],[x-1,y-3,z-side*.3,1.5],[x+5,y-2,z-side*1.2,1.2]],skin,{steps:3,sides:8});
  }
  d.tools={face,part,loft,tube,sheet,armor,lens,sensePit};return d;
 }

 function warden(){
  const d=creator(0,'CHITIN WARDEN','chitin',1.95,[-99,7,0],[{center:[-11,2,0],radii:[81,35,31]},{center:[-70,0,0],radii:[31,23,24]},{center:[57,7,0],radii:[49,25,24]}]),{part,loft,tube,sheet,armor,lens,sensePit}=d.tools;
  const shell=[199,215,205],edge=[169,186,177],joint=[145,158,147],membrane=[204,198,176];
  part('thorax and abdomen','fixed',{},()=>{
   loft([[-76,2,0,14,16],[-54,0,0,24,23],[-26,0,0,33,29],[2,3,0,32,32],[26,7,0,29,27],[56,8,0,23,22],[81,8,0,14,16],[100,8,0,2,3]],joint,{steps:4,sides:32,ridge:.035});
   armor(-39,-7,0,33,30,shell,{n:8,m:24});armor(-7,18,4,31,30,shell,{n:6,m:24});
   for(let i=0;i<5;i++){const x=20+i*14;armor(x,x+17,8,28-i*4,26-i*3.5,tint(shell,1-i*.017),{n:4,m:20});}
   // A flattened cephalic shield grows from the thorax, ending in two ridges.
   loft([[-92,-6,0,5,9],[-83,-8,0,15,19],[-67,-9,0,20,24],[-44,-5,0,23,25],[-30,-1,0,19,21]],shell,{steps:4,sides:28,exponent:.82});
   for(const side of [-1,1]){
    tube([[-88,-10,side*12,2],[-72,-25,side*17,3],[-48,-25,side*21,3],[-26,-22,side*21,1.4]],edge,{steps:4,sides:9});
    tube([[-24,22,side*16,2.5],[2,28,side*21,3],[29,28,side*19,1.2]],edge,{steps:4,sides:8});
    for(let i=0;i<4;i++)lens([15+i*16,9,side*(29-i*3.7)],[4.8,2.2,.7],[58,75,65],{wet:.2});
   }
   lens([-91,7,0],[2.7,11,13],[11,15,16],{wet:.85});
  });
  for(const side of [-1,1])sensePit(-73,-12,side*23,side,shell,2.9);
  for(const up of [-1,1])part('divided mandible','jaw',{pivot:[-57,up*6,0],axis:[0,0,1],direction:-up,amount:.43},()=>{
   for(const side of [-1,1]){
    tube([[-55,up*11,side*17,7,5],[-74,up*16,side*19,6,4.5],[-95,up*11,side*12,4,3],[-105,up*3,side*5,.4,.8]],edge,{steps:4,sides:12});
    for(let i=0;i<4;i++){const x=-76-i*6; tube([[x,up*(14-i),side*(16-i*2),1.7],[x-3,up*(8-i),side*(14-i*2),.25]],tint(edge,1.16),{steps:2,sides:7});}
   }
  });
  for(const side of [-1,1])for(let i=0;i<3;i++){
   const root=[-23+i*28,15,side*23],elbow=[-35+i*34,33,side*42],knee=[-53+i*40,55,side*45];
   part('walking appendage','leg',{pivot:root,knee:elbow,side,index:i},()=>{
    tube([[...root,7,6],[...elbow,5,4],[...knee,3,3],[-62+i*42,57,side*35,.65,1]],edge,{steps:4,sides:10});
    tube([[...root,3],[elbow[0]-3,elbow[1]-4,elbow[2],2.3],[knee[0]-2,knee[1]-3,knee[2],.7]],tint(shell,1.04),{steps:3,sides:7});
   });
  }
  for(const side of [-1,1])for(let pair=0;pair<2;pair++){
   const root=[-17+pair*30,-13,side*22],length=pair?96:124;
   part(pair?'hind flight membrane':'fore flight membrane','wing',{pivot:root,side,pair,amplitude:pair?.68:.84,frequency:8.4},()=>{
    const point=(u,v)=>{const z=side*(22+u*length),chord=Math.pow(1-u,.48)*(45+Math.sin(u*Math.PI)*49),center=-3+pair*28+u*(pair?33:-17),x=center+(v-.48)*chord,y=-13+Math.sin(u*Math.PI)*5+Math.sin(v*Math.PI)*Math.sin(u*Math.PI)*4;return[x,y,z];};
    sheet(point,membrane,22,10,.45);
    for(const vv of [0,.27,.62,1]){const pts=[];for(let i=0;i<=5;i++){const p=point(i/5,vv);pts.push([...p,mix(2.7,.35,i/5)]);}tube(pts,edge,{steps:2,sides:7});}
    for(let i=2;i<7;i++){const u=i/8,pts=[];for(let j=0;j<3;j++)pts.push([...point(u,j/2),.45]);tube(pts,tint(edge,.85),{steps:2,sides:6});}
   });
  }
  for(const side of [-1,1])part('palp','feeler',{pivot:[-79,-18,side*14],side,index:0},()=>tube([[-79,-18,side*14,2],[-101,-29,side*20,1.7],[-120,-18,side*25,.7],[-128,-10,side*22,.15]],edge,{steps:4,sides:8}));
  return d;
 }

 function sovereign(){
  const d=creator(2,'ABYSS SOVEREIGN','flesh',2.15,[-86,5,0],[{center:[-6,0,0],radii:[81,28,34]},{center:[51,3,0],radii:[56,16,24]}]),{part,loft,tube,sheet,lens,sensePit}=d.tools;
  const skin=[176,194,218],ridge=[161,182,200],fin=[177,201,213],gill=[115,133,158];
  part('continuous mantle','fixed',{},()=>{
   loft([[-86,3,0,8,17],[-76,0,0,18,27],[-49,-2,0,26,35],[-15,0,0,28,36],[23,1,0,24,30],[59,2,0,16,21],[91,3,0,6,9],[114,3,0,.6,1.2]],skin,{steps:5,sides:36,exponent:.92});
   lens([-85,6,0],[1.6,6,15],[15,21,36],{wet:.9});
   for(const side of [-1,1]){
    tube([[-71,-13,side*21,1.4],[-44,-20,side*29,2.2],[-9,-24,side*26,1.8],[24,-19,side*22,.9],[72,-8,side*11,.3]],ridge,{steps:4,sides:8});
    for(let i=0;i<8;i++){const x=-25+i*9,z=side*(35-i*1.6);tube([[x,-7,z,1.7],[x+4,3,z+side*.7,2],[x+2,13,z-side*3,1.4]],gill,{steps:3,sides:8});}
    for(let i=0;i<6;i++)lens([-53+i*11,-15,side*(29-i*.65)],[1.4,.9,.5],[126,191,182],{em:.025,wet:.7});
   }
  });
  for(const side of [-1,1])sensePit(-67,-7,side*30,side,skin,2.3);
  for(const up of [-1,1])part('pressure siphon lip','jaw',{pivot:[-62,up*7,0],axis:[0,0,1],direction:-up,amount:.22},()=>{
   loft([[-88,up*6+5,0,1.5,13],[-80,up*9+4,0,3,22],[-69,up*8+3,0,3.8,24],[-61,up*7,0,2,18]],tint(skin,.9),{steps:3,sides:24});
  });
  for(const side of [-1,1]){
   part('mantle fin','undulate',{pivot:[0,0,side*24],side,span:99,amplitude:19,frequency:3.8,phase:side*.3},()=>{
    const point=(u,v)=>{const x=-72+u*175,width=(Math.pow(Math.sin(Math.PI*u),.7)*88+4)*(1+.1*Math.sin(u*8)),z=side*(18+v*width),y=4+Math.sin(u*Math.PI)*6+Math.sin(v*Math.PI)*5;return[x,y,z];};
    sheet(point,fin,30,12,.6);
    for(let i=1;i<14;i++){const u=i/14,pts=[];for(let j=0;j<=4;j++)pts.push([...point(u,j/4),mix(1.45,.22,j/4)]);tube(pts,ridge,{steps:2,sides:6});}
   });
   part('barbel','feeler',{pivot:[-69,10,side*22],side,index:1},()=>tube([[-69,10,side*22,2.3],[-91,24,side*34,1.5],[-106,43,side*41,.9],[-92,58,side*39,.22]],ridge,{steps:5,sides:8}));
   part('tail vane','tail',{pivot:[66,3,0],side,amount:10},()=>{
    tube([[71,3,side*7,4],[99,5,side*20,3],[130,0,side*39,1.8],[152,9,side*43,.25]],ridge,{steps:4,sides:9});
    sheet((u,v)=>[71+u*78,4+Math.sin(u*Math.PI)*3,side*(7+u*36-v*Math.sin(u*Math.PI)*23)],fin,18,7,.4);
   });
  }
  return d;
 }

 function monarch(){
  const d=creator(3,'REEF MONARCH','flesh',2.05,[-92,18,0],[{center:[5,-5,2],radii:[61,48,43]},{center:[-59,17,0],radii:[42,26,29]}]),{part,loft,tube,sheet,lens,sensePit,face}=d.tools;
  const skin=[180,207,194],shell=[218,210,190],rim=[167,173,151],fin=[163,192,179];
  part('muscular mantle','fixed',{},()=>{
   loft([[-92,17,0,7,17],[-74,15,0,22,28],[-51,9,0,31,34],[-23,6,0,37,38],[12,2,0,33,34],[44,5,0,23,27],[66,9,0,9,13],[76,9,0,1,2]],skin,{steps:4,sides:32});
   lens([-92,18,0],[2.1,7,14],[16,27,28],{wet:.7});
   for(const side of [-1,1]){tube([[-81,6,side*19,2],[-64,-2,side*27,3],[-39,-5,side*32,2]],rim,{steps:4,sides:9});for(let i=0;i<7;i++)tube([[-68+i*8,20,side*(27+i*.7),1.5],[-64+i*8,28,side*(23+i*.7),1.5],[-58+i*8,31,side*(16+i*.7),.6]],tint(skin,.78),{steps:3,sides:8});}
  });
  // The shell has a single asymmetrical vaulted volume with overlapping
  // growth chambers; fine sutures follow the curved surface, not a flat decal.
  part('chambered dorsal shell','shell',{},()=>{
   const prof=[[-42,-7,5,20,25],[-21,-12,4,43,43],[8,-15,3,49,46],[35,-13,1,42,38],[58,-8,-1,25,23],[70,-4,-2,2,4]];
   loft(prof,shell,{steps:5,sides:36,exponent:.88,ridge:.022});
   for(let i=0;i<12;i++){
    const u=.18+i*.405,p=sample(prof,u),x=p[0],ry=p[3]+1,rz=p[4]+1,pts=[];
    for(let j=0;j<=16;j++){const a=.55+j/16*(TAU-1.1);pts.push([x+Math.sin(a*2)*2,p[1]+ry*Math.cos(a),p[2]+rz*Math.sin(a),mix(1.45,.9,i/12)]);}tube(pts,rim,{steps:1,sides:7});
   }
   // The eccentric root whorl is part of the carapace, not an oversized eye.
   const pts=[];for(let i=0;i<=32;i++){const t=i/32,a=t*Math.PI*3.4,r=3+t*23;pts.push([19+Math.cos(a)*r,-22+Math.sin(a)*r,-42+Math.abs(Math.sin(a))*3,1.2+t*.65]);}tube(pts,rim,{steps:1,sides:8});
   for(let i=0;i<7;i++){const x=-10+i*8; tube([[x,-56+i*1.5,-2,1.5],[x+7,-60+i*1.9,-2,2],[x+14,-51+i*2,-1,.5]],tint(shell,1.04),{steps:3,sides:8});}
  });
  for(const side of [-1,1])sensePit(-67,3,side*28,side,skin,2.6);
  for(const up of [-1,1])part('feeding lip','jaw',{pivot:[-64,14,0],axis:[0,0,1],direction:-up,amount:.36},()=>{
   loft([[-94,18+up*6,0,1.5,13],[-86,18+up*10,0,3,21],[-72,16+up*12,0,4.5,25],[-59,14+up*6,0,2,20]],tint(skin,.88),{steps:3,sides:22});
   for(let i=0;i<5;i++)tube([[-90,18+up*6,(i-2)*5,1],[-96,18+up*3,(i-2)*4,.3]],tint(shell,.9),{steps:2,sides:7});
  });
  for(const side of [-1,1]){
   part('scalloped swimming mantle','undulate',{pivot:[-8,20,side*26],side,span:75,amplitude:17,frequency:3,phase:side*.45},()=>{
    const point=(u,v)=>{const x=-54+u*133,width=12+Math.pow(Math.sin(u*Math.PI),.8)*65+(1-v)*0,edge=1+Math.sin(u*Math.PI*5)*.075;return[x,23+Math.sin(u*Math.PI)*11+Math.sin(v*Math.PI)*6,side*(20+v*width*edge)];};
    sheet(point,fin,28,10,1.1);
    for(let i=1;i<11;i++){const pts=[];for(let j=0;j<=4;j++)pts.push([...point(i/11,j/4),mix(2.3,.4,j/4)]);tube(pts,rim,{steps:2,sides:7});}
   });
   part('feeding arm','feedingArm',{pivot:[-67,29,side*16],side,index:2},()=>{
    // Bind the arm straight, then curve it at a constant section along its
    // length. The feeding strike uncoils muscle instead of scaling a sprite.
    tube([[-67,29,side*16,5.3],[-91,29,side*16,4.6],[-118,29,side*16,3.5],[-143,29,side*16,2.2],[-161,29,side*16,.45]],skin,{steps:6,sides:11});
    for(let i=0;i<8;i++)lens([-77-i*10,31,side*19],[1.8,1.1,.7],tint(rim,.83),{wet:.65,steps:1,sides:8});
   });
  }
  return d;
 }

 function mother(){
  const d=creator(5,'BROOD MOTHER','chitin',1.9,[-113,5,0],[{center:[5,1,0],radii:[102,39,34]},{center:[-78,-1,0],radii:[37,26,28]},{center:[89,8,0],radii:[44,22,25]}]),{part,loft,tube,sheet,armor,lens,sensePit}=d.tools;
  const chitin=[214,199,191],cuticle=[174,155,148],limb=[196,181,173],membrane=[211,176,156];
  part('queen axial body','fixed',{},()=>{
   loft([[-109,0,0,8,16],[-91,-4,0,23,25],[-66,-3,0,29,29],[-38,0,0,37,34],[-7,3,0,38,37],[25,7,0,35,33],[58,9,0,31,28],[90,8,0,23,23],[118,8,0,11,15],[136,7,0,1,2]],cuticle,{steps:3,sides:32,ridge:.02});
   armor(-83,-49,-5,26,27,chitin,{n:5,m:20});armor(-52,-24,0,35,32,chitin,{n:5,m:20});
   for(let i=0;i<6;i++){const x=-20+i*24;armor(x,x+27,7,37-i*4.4,35-i*3.8,tint(chitin,1-i*.02),{n:4,m:18});}
   // Ridged forehead protects a deep central intake rather than a reptile face.
   loft([[-115,-7,0,2,10],[-103,-14,0,10,22],[-84,-15,0,15,28],[-61,-12,0,21,26]],chitin,{steps:4,sides:28,exponent:.73});
   lens([-110,6,0],[2.2,13,16],[13,17,20],{wet:.85});
   for(const side of [-1,1]){
    tube([[-108,-13,side*13,2.5],[-87,-27,side*23,4],[-61,-26,side*25,2.6],[-30,-28,side*23,.6]],limb,{steps:4,sides:10});
    for(let i=0;i<6;i++){const x=2+i*19,z=side*(35-i*3.2);lens([x,10,z],[7,4.8,1.4],[180,99,64],{em:.07,wet:.4});tube([[x-8,5,z-side,1.7],[x-2,2,z,2],[x+8,4,z-side,1.2]],limb,{steps:3,sides:8});}
   }
  });
  for(const side of [-1,1]){sensePit(-88,-12,side*27,side,chitin,2.3);sensePit(-78,-17,side*29,side,chitin,1.65);}
  for(const up of [-1,1])part('split furnace jaw','jaw',{pivot:[-79,up*7,0],axis:[0,0,1],direction:-up,amount:.47},()=>{
   for(const side of [-1,1]){
    tube([[-77,up*14,side*21,8,6],[-98,up*18,side*19,6,4],[-117,up*10,side*12,4,3],[-121,up*1,side*6,.8,.7]],limb,{steps:4,sides:12});
    for(let i=0;i<5;i++)tube([[-92-i*5,up*(15-i),side*(18-i*2),2],[-95-i*5,up*(7-i),side*(15-i*2),.25]],tint(chitin,1.1),{steps:2,sides:7});
   }
  });
  // Four paired joint chains paddle in a travelling metachronal rhythm.
  for(const side of [-1,1])for(let i=0;i<4;i++){
   const root=[-44+i*37,17,side*(26-i*1.4)],elbow=[-60+i*40,35,side*(53-i*2)],knee=[-80+i*48,63,side*(67-i*2)];
   part('brood limb','leg',{pivot:root,knee:elbow,side,index:i,amplitude:1.25},()=>{
    tube([[...root,9,7],[...elbow,6.5,5],[...knee,4,3.8],[-77+i*48,79,side*(54-i*2),1.4,1],[-64+i*46,76,side*(45-i*2),.2,.4]],limb,{steps:4,sides:11});
    tube([[root[0]-4,root[1]-4,root[2],3],[elbow[0]-3,elbow[1]-4,elbow[2],3],[knee[0]-4,knee[1]-2,knee[2],1]],chitin,{steps:3,sides:8});
   });
  }
  for(const side of [-1,1]){
   part('abdomen propulsion vane','undulate',{pivot:[51,15,side*23],side,span:88,amplitude:22,frequency:3.4,phase:side*.5},()=>{
    const point=(u,v)=>{const width=8+Math.pow(Math.sin(u*Math.PI),.74)*88;return[22+u*119,17+Math.sin(u*Math.PI)*5+Math.sin(v*Math.PI)*5,side*(19+width*v)];};
    sheet(point,membrane,24,9,.7);
    for(let i=1;i<11;i++){const pts=[];for(let j=0;j<=4;j++)pts.push([...point(i/11,j/4),mix(2.5,.4,j/4)]);tube(pts,limb,{steps:2,sides:7});}
   });
   part('olfactory palp','feeler',{pivot:[-93,-21,side*13],side,index:3},()=>tube([[-93,-21,side*13,3.1],[-115,-36,side*24,2.4],[-128,-19,side*39,1.2],[-134,-5,side*44,.25]],cuticle,{steps:4,sides:9}));
  }
  return d;
 }

 function build(){for(const d of [warden(),sovereign(),monarch(),mother()]){delete d.tools;d.triangles=d.mesh.reduce((n,f)=>n+f.v.length-2,0);d.vertexCount=new Set(d.mesh.flatMap(f=>f.v)).size;alienBossDesigns[d.kind]=d;meshes['alienBoss'+d.kind]=d.mesh;}return alienBossDesigns;}
 function opening(b){const a=b.breath;let n=.05+.025*Math.sin((b.age||0)*1.6);if(a){n=Math.min(cl(a.age/Math.max(.1,a.warning),0,1),cl((a.warning+a.duration+.7-a.age)/.7,0,1));}else if(b.vacuum>0)n=cl(b.vacuum/.6,0,1);else if(b.charge>0)n=.12+cl(1-b.charge/1.7,0,1)*.7;if(b.roar>0)n=Math.max(n,Math.sin(cl(b.roar/1.3,0,1)*Math.PI)*.95);return n;}
 buildAlienBosses=window.buildAlienBosses=build;
 function rotationMatrix(axis,angle){const [x,y,z]=unit(axis),c=Math.cos(angle),sn=Math.sin(angle),a=1-c;return[c+x*x*a,x*y*a-z*sn,x*z*a+y*sn,y*x*a+z*sn,c+y*y*a,y*z*a-x*sn,z*x*a-y*sn,z*y*a+x*sn,c+z*z*a];}
 function applyRotation(v,p,m){const x=v[0]-p[0],y=v[1]-p[1],z=v[2]-p[2];v[0]=p[0]+m[0]*x+m[1]*y+m[2]*z;v[1]=p[1]+m[3]*x+m[4]*y+m[5]*z;v[2]=p[2]+m[6]*x+m[7]*y+m[8]*z;}
 // Anatomical motion has a stable head and a flexible posterior. Each
 // cross-section rotates on a circular centreline; radii never inflate. The
 // same mapping is exported for collision volumes and attached weapon sockets.
 const spineScratch={},socketSpine={};
 function spineState(kind,b,s){
  const flight=Number.isFinite(b.propulsionTime)?b.propulsionTime:(b.age||0),thrust=cl(Number.isFinite(b.propulsion)?b.propulsion:.3,0,1),attack=cl(b.attackDrive||0,0,1),load=cl(b.actionLoad||0,0,1),bank=cl(b.flightBank||0,-1,1);
  const phase=flight*(kind===2?2.4:kind===5?2.9:2.1),strength=kind===2?.0018:kind===5?.00115:kind===3?.0007:.00085;
  s.ky=(Math.sin(phase)*(.38+thrust*.55)-load*.35+attack*.18)*strength;
  s.kz=(Math.cos(phase-.8)*(.4+thrust*.6)+bank*.42)*strength;
  s.twist=(Math.sin(phase-1.2)*(.07+thrust*.1)+bank*.13)*(kind===3?.32:1);
  const curvature=Math.hypot(s.ky,s.kz);s.k=Math.min(.00195,curvature);s.dy=curvature?s.ky/curvature:0;s.dz=curvature?s.kz/curvature:0;
  // A hard shell is moved as one piece about its muscular attachment, so its
  // chambered plates never become rubber while the animal swims beneath it.
  const a=s.k*48;s.shellCos=Math.cos(a);s.shellSin=Math.sin(a);s.shellRoll=s.twist*.36;
  return s;
 }
 function spineBend(v,s,rigidShell=false){
  const x=v[0]+45;if(x<=0&&!rigidShell)return;
  const angle=s.k*(rigidShell?48:x),c=rigidShell?s.shellCos:Math.cos(angle),sn=rigidShell?s.shellSin:Math.sin(angle),roll=rigidShell?s.shellRoll:s.twist*cl(x/180,0,1),cr=Math.cos(roll),sr=Math.sin(roll),y=v[1]*cr-v[2]*sr,z=v[1]*sr+v[2]*cr,along=y*s.dy+z*s.dz;
  if(rigidShell){v[0]=-45+x*c-along*sn;v[1]=y+s.dy*(x*sn+along*(c-1));v[2]=z+s.dz*(x*sn+along*(c-1));}
  else{const bend=s.k?(1-c)/s.k:0;v[0]=-45+(s.k?sn/s.k:x)-along*sn;v[1]=y+s.dy*(bend+along*(c-1));v[2]=z+s.dz*(bend+along*(c-1));}
 }
 alienBossPoint=window.alienBossPoint=function(kind,b,local){
  const v=[local[0],local[1],local[2]];spineBend(v,spineState(kind,b,socketSpine));return v;
 };
 // Smooth, asymmetric power/recovery stroke. The fast phase pushes against
 // the air; recovery feathers the outer membrane to reduce drag.
 function flightStroke(t){return Math.sin(t)+.27*Math.sin(2*t)-.07*Math.sin(3*t);}
 animateAlienBoss=window.animateAlienBoss=function(kind,b){
  const d=alienBossDesigns[kind];if(!d)return null;
  const age=b.age||0,jaw=opening(b),flight=Number.isFinite(b.propulsionTime)?b.propulsionTime:age,thrust=cl(Number.isFinite(b.propulsion)?b.propulsion:.3,0,1),climb=cl(-(b.flightVY||0)/420,-1,1),surge=cl((b.flightVX||0)/600,-1,1),attack=cl(b.attackDrive||0,0,1),load=cl(b.actionLoad||0,0,1),bank=cl(b.flightBank||0,-1,1);
  const pass=b.pass,turning=pass&&['turn','rear','reset'].includes(pass.stage)?Math.sin(cl((pass.age||0)/1.4,0,1)*Math.PI):0;
  const spine=spineState(kind,b,spineScratch);d.mouthOpening=jaw;
  // Every pose starts at its bind coordinates, including the flexible body.
  // All arrays are retained; there are no per-vertex temporary allocations.
  for(const p of d.parts){
   const phase=flight*(p.frequency||3.6)+(p.index||0)*1.32+(p.side||0)*.32,beat=flight*(p.frequency||1)+(p.pair||0)*1.0;
   let matrix=null,second=null;
   if(p.rig==='jaw')matrix=rotationMatrix(p.axis,p.direction*jaw*p.amount);
   if(p.rig==='wing')matrix=rotationMatrix([1,0,0],p.side*(-.12-climb*.13+flightStroke(beat)*p.amplitude*(.72+thrust*.68)));
   if(p.rig==='leg'){
    const rake=turning*.22+load*.35,stroke=flightStroke(phase);
    matrix=rotationMatrix([1,0,0],p.side*(.07+thrust*.12+stroke*(.17+thrust*.25)+rake-attack*.24));
    second=rotationMatrix([0,0,1],Math.sin(phase+.7)*(.18+thrust*.31)-climb*.12-attack*.63+rake*.6);
   }
   const bt=(age+(p.phase||0))%6.7,blink=bt<.25?Math.sin(bt/.25*Math.PI):0;
   for(let i=0;i<p.vertices.length;i++){
    const r=p.rest[i],v=p.vertices[i];v[0]=r[0];v[1]=r[1];v[2]=r[2];
    if(p.rig==='jaw')applyRotation(v,p.pivot,matrix);
    else if(p.rig==='wing'){
     applyRotation(v,p.pivot,matrix);
     const span=cl(Math.abs(r[2]-p.pivot[2])/115,0,1),recovery=Math.max(0,Math.cos(beat)),fold=p.side*(recovery*(.27+thrust*.2)+attack*.13)*span,cf=Math.cos(fold),sf=Math.sin(fold),x=v[0]-p.pivot[0],z=v[2]-p.pivot[2];
     v[0]=p.pivot[0]+x*cf+z*sf;v[2]=p.pivot[2]+z*cf-x*sf;
     // Elastic trailing-edge lag follows the downstroke without changing span.
     v[1]+=Math.sin(beat-.55)*span*span*(4+thrust*7);
    }else if(p.rig==='undulate'){
     const span=cl((Math.abs(r[2])-Math.abs(p.pivot[2]))/p.span,0,1),wave=flight*p.frequency-r[0]*.047+(p.phase||0),stroke=flightStroke(wave),angle=(stroke*(.4+thrust*.48)+climb*.13+p.side*bank*.14+load*.2-attack*.3)*span,ca=Math.cos(angle),sa=Math.sin(angle),y=r[1]-p.pivot[1],z=r[2]-p.pivot[2];
     // A rotation of each fin ray gives the membrane a real power stroke.
     v[1]=p.pivot[1]+y*ca-p.side*z*sa;v[2]=p.pivot[2]+p.side*y*sa+z*ca;
     v[0]+=Math.sin(wave-.8)*(3+thrust*5)*span*span;
     const sweep=p.side*(attack*.45-load*.17)*span,cf=Math.cos(sweep),sf=Math.sin(sweep),xx=v[0]-p.pivot[0],zz=v[2]-p.pivot[2];
     v[0]=p.pivot[0]+xx*cf+zz*sf;v[2]=p.pivot[2]+zz*cf-xx*sf;
    }else if(p.rig==='leg'){
     const weight=cl((r[1]-p.knee[1]+4)/23,0,1),bend=(Math.sin(phase-.9)*(.34+thrust*.46)+attack*.54-load*.35)*(p.amplitude||1)*weight,cb=Math.cos(bend),sb=Math.sin(bend),x=r[0]-p.knee[0],y=r[1]-p.knee[1];
     v[0]=p.knee[0]+x*cb-y*sb;v[1]=p.knee[1]+x*sb+y*cb;applyRotation(v,p.pivot,matrix);applyRotation(v,p.pivot,second);
    }else if(p.rig==='tail'){
     const q=cl((r[0]-p.pivot[0])/90,0,1),a=Math.sin(flight*2.7-q*3)*(.23+thrust*.35)*q,ca=Math.cos(a),sa=Math.sin(a),x=r[0]-p.pivot[0],y=r[1]-p.pivot[1];
     v[0]=p.pivot[0]+x*ca-y*sa;v[1]=p.pivot[1]+x*sa+y*ca;
    }else if(p.rig==='feedingArm'){
     const length=Math.max(0,p.pivot[0]-r[0]),reach=cl(load*.55+attack*.9+jaw*.7,0,1),curvature=.039*(1-reach)+.0045*reach+Math.sin(flight*2.3+p.side*.7)*.0018,angle=length*curvature,c=Math.cos(angle),sn=Math.sin(angle),y=r[1]-p.pivot[1],z=r[2]-p.pivot[2],spread=.13+p.side*bank*.06+reach*.26,cs=Math.cos(spread),ss=p.side*Math.sin(spread),cx=-sn/curvature-y*sn,cy=(1-c)/curvature+y*c;
     v[0]=p.pivot[0]+cx;v[1]=p.pivot[1]+cy*cs-z*ss;v[2]=p.pivot[2]+cy*ss+z*cs;
    }else if(p.rig==='feeler'){
     const q=cl(Math.hypot(r[0]-p.pivot[0],r[1]-p.pivot[1],r[2]-p.pivot[2])/75,0,1),w=q*q,sensoryPhase=age*2.1+(p.index||0)*.86+(p.side||0)*.22;
     v[0]+=(Math.sin(sensoryPhase-q*2)*(4+load*3)-surge*4)*w;v[1]+=(Math.sin(sensoryPhase-q*3)*8+climb*4-load*9)*w;v[2]+=Math.cos(sensoryPhase-q*2)*w*(7+load*5);
    }else if(p.rig==='blink')v[1]=p.pivot[1]+(r[1]-p.pivot[1])*(1-blink*.93);
    spineBend(v,spine,p.rig==='shell');
   }
  }
  return d;
 };

 build();
})();
