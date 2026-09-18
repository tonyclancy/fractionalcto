/* Solid, lit meshes. All visible surfaces rotate in three dimensions. */
const meshes={};
// Irregular, repeatable blinks: quick closure, relaxed reopening, occasional double blink.
function naturalBlink(age,seed=0){
 const t=((age*1.55+seed*1.73)%17.3+17.3)%17.3;
 const pulse=x=>x<0||x>.26?0:x<.065?Math.sin(x/.065*Math.PI/2):Math.cos((x-.065)/.195*Math.PI/2);
 return Math.max(pulse(t-2.1),pulse(t-6.7),pulse(t-10.2),pulse(t-10.57),pulse(t-15.4));
}
function meshBuilder(){const faces=[];
 const face=(v,c,em=0,flex=0)=>faces.push({v,c,em,flex});
 function ellipsoid(cx,cy,cz,rx,ry,rz,c,em=0,segments=28,rings=18){const primitive={center:[cx,cy,cz],radii:[rx,ry,rz],color:c};for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const p=(u,v)=>{const a=u/segments*Math.PI*2,b=v/rings*Math.PI;return[cx+rx*Math.cos(b),cy+ry*Math.sin(b)*Math.cos(a),cz+rz*Math.sin(b)*Math.sin(a)]};face([p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1)],c,em);faces[faces.length-1].primitive=primitive;}}
 function wedge(a,b,c,thick,color){face([a,b,c],color);const back=[a,b,c].map(v=>[v[0],v[1],v[2]+thick]);face(back.slice().reverse(),color);for(let i=0;i<3;i++)face([[a,b,c][i],[a,b,c][(i+1)%3],back[(i+1)%3],back[i]],color)}
 function tube(points,r,color,flex=0,em=0,segments=12,steps=3){
 const path=[];for(let j=0;j<points.length-1;j++)for(let k=0;k<steps;k++){const t=k/steps,p0=points[Math.max(0,j-1)],p1=points[j],p2=points[j+1],p3=points[Math.min(points.length-1,j+2)];path.push(p1.map((v,i)=>.5*((2*v)+(-p0[i]+p2[i])*t+(2*p0[i]-5*v+4*p2[i]-p3[i])*t*t+(-p0[i]+3*v-3*p2[i]+p3[i])*t*t*t)))}path.push(points[points.length-1]);
 const rings=path.map((p,j)=>{const prev=path[Math.max(0,j-1)],next=path[Math.min(path.length-1,j+1)],t=next.map((v,i)=>v-prev[i]),len=Math.hypot(...t)||1,d=t.map(v=>v/len),axis=Math.abs(d[2])<.9?[0,0,1]:[0,1,0];let u=[d[1]*axis[2]-d[2]*axis[1],d[2]*axis[0]-d[0]*axis[2],d[0]*axis[1]-d[1]*axis[0]],ul=Math.hypot(...u)||1;u=u.map(v=>v/ul);const v=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]],rr=r*(1-j/path.length*.85);return Array.from({length:segments},(_,i)=>{const a=i/segments*Math.PI*2;return p.map((n,k)=>n+rr*(u[k]*Math.cos(a)+v[k]*Math.sin(a)))})});for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++)face([rings[j][i],rings[j][(i+1)%segments],rings[j+1][(i+1)%segments],rings[j+1][i]],color,em,flex);face(rings[0].slice().reverse(),color,em,flex);face(rings[rings.length-1],color,em,flex);
 }
 return{faces,ellipsoid,wedge,tube};
}
function buildModels(){
 let m=meshBuilder();m.ellipsoid(0,0,0,49,12,11,[132,167,184]);m.ellipsoid(9,-7,-7,21,6,7,[35,117,146]);m.ellipsoid(9,-8,-11,15,3,3,[94,237,240],.55);
 for(const side of [-1,1]){m.wedge([15,side*7,-2],[-40,side*39,1],[-26,side*8,-4],7,[102,137,163]);m.wedge([-22,side*6,-3],[-42,side*18,-19],[-38,side*5,-4],3,[142,174,188]);m.tube([[-35,side*17,0],[-23,side*18,0],[9,side*17,0]],5,[63,86,115]);m.ellipsoid(-36,side*17,0,3,4,4,[85,232,255],.9)}meshes.player=m.faces;
 const guns=meshBuilder();for(const side of [-1,1]){guns.ellipsoid(-1,side*26,0,28,5,5,[129,155,171],0,12,7);guns.tube([[-13,side*26,-3],[18,side*26,-3],[42,side*26,-3]],3,[58,99,121]);guns.ellipsoid(43,side*26,-3,2,3,3,[153,255,230],.9,10,6)}meshes.player2=meshes.player.concat(guns.faces);
 const lance=meshBuilder();lance.ellipsoid(30,0,0,23,7,7,[126,113,173],0,12,7);lance.ellipsoid(52,0,0,3,4,4,[208,165,255],.9,10,6);meshes.player3=meshes.player2.concat(lance.faces);
 m=meshBuilder();m.ellipsoid(0,0,0,49,13,13,[144,39,58]);m.ellipsoid(-20,-4,-9,17,6,6,[255,151,65],.6);for(const side of [-1,1]){m.wedge([-37,side*8,0],[28,side*39,6],[23,side*7,-3],8,[126,32,49]);m.wedge([5,side*8,0],[40,side*27,-20],[27,side*5,-3],4,[178,60,71]);m.tube([[30,side*16,0],[48,side*16,0]],7,[58,63,79]);m.ellipsoid(49,side*16,0,3,5,5,[255,111,56],.85)}meshes.fighter=m.faces;
 m=meshBuilder();m.ellipsoid(-9,0,0,34,25,23,[37,129,108]);m.ellipsoid(-22,-8,-17,13,12,9,[131,177,75]);m.ellipsoid(-25,-8,-24,8,8,4,[190,255,93],.65);m.ellipsoid(-26,-8,-27,2,7,1,[14,33,26]);for(let i=0;i<6;i++){const a=i/6*Math.PI*2,y=Math.cos(a),z=Math.sin(a);m.tube([[0,y*19,z*18],[24,y*27,z*26],[46,y*32,z*28],[72,y*22,z*30],[90,y*34,z*17]],5,[44,134+i*6,104],1);m.tube([[-22,y*17,z*17],[0,y*24,z*22],[20,y*18,z*19]],3,[102,176,133]);}meshes.squid=m.faces;
 m=meshBuilder();m.ellipsoid(5,0,0,45,24,21,[139,110,65]);for(const side of [-1,1]){m.ellipsoid(13,side*19,0,34,9,13,[90,88,74]);m.tube([[5,side*20,-13],[-24,side*20,-13],[-55,side*20,-13]],5,[126,145,145]);m.ellipsoid(-56,side*20,-13,2,4,4,[255,191,99],.7);m.ellipsoid(39,side*15,1,6,7,9,[253,142,63],.8)}for(let i=0;i<5;i++)m.tube([[-26+i*12,-21,-12],[-26+i*12,21,-12]],2,[184,159,95]);m.ellipsoid(-12,-4,-23,12,7,4,[242,182,84],.65);meshes.gunship=m.faces;
 m=meshBuilder();m.ellipsoid(-5,0,0,34,16,16,[105,69,153]);m.ellipsoid(-24,-5,-12,9,5,5,[240,148,255],.75);for(const side of [-1,1]){m.wedge([-20,side*8,0],[34,side*50,8],[23,side*13,-4],4,[123,72,158]);m.tube([[-12,side*10,0],[-36,side*24,-7],[-43,side*37,-4],[-16,side*33,0]],4,[180,145,198],.45);m.tube([[10,side*9,2],[35,side*15,5],[62,side*12,8],[83,side*29,2]],5,[123,80,166],1)}meshes.manta=m.faces;
}
buildModels();
// Gather before the roll; hold tightly through it, then reopen over 450 ms.
function organicTailTuck(age){
 const cycle=((age%3.6)+3.6)%3.6,smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
 return smooth((cycle-.35)/.25)*(1-smooth((cycle-1.35)/.45));
}
function rotateVertex(v,yaw,roll,pitch,age,flex){let [x,y,z]=v;if(flex){const tuck=organicTailTuck(age),root=Math.max(0,Math.min(1,(x-10)/45)),gather=1-.75*tuck*root;y*=gather;z*=gather;const drive=1+.75*Math.pow((1+Math.cos(age*2))*.5,5),bend=Math.max(0,x-10)*flex*(1-.9*tuck);y+=Math.sin(age*3-x*.07)*bend*.23*drive;z+=Math.cos(age*2.4-x*.06)*bend*.22*drive}const a=x*Math.cos(yaw)+z*Math.sin(yaw),b=-x*Math.sin(yaw)+z*Math.cos(yaw),c=y*Math.cos(roll)-b*Math.sin(roll),d=y*Math.sin(roll)+b*Math.cos(roll);return[a*Math.cos(pitch)-c*Math.sin(pitch),a*Math.sin(pitch)+c*Math.cos(pitch),d]}
function drawModel(mesh,x,y,scale,yaw,roll,pitch,age,hit=0,rig=null){
 if(mesh.fauna)rig=mesh.organicRig;
 if(window.gpuModels){window.gpuModels.draw(mesh,ctx,x,y,scale,yaw,roll,pitch,age,hit,rig);return;}
 const faces=mesh.map(f=>{const v=f.v.map(p=>{let q=f.blink?[p[0],f.blink[0]+(p[1]-f.blink[0])*(1-.97*naturalBlink(age,f.blink[1])),p[2]]:p;if(f.joint)q=faunaJointVertex(q,age,f.joint);if(rig==='ray')q=rayVertex(q,age);if(!f.joint&&(rig==='squid'||rig==='octopus'))q=organicVertex(q,age,rig);return rotateVertex(q,yaw,roll,pitch,age,(rig==='squid'||rig==='octopus'||rig==='ray')?0:f.flex)});return{...f,v,z:v.reduce((a,p)=>a+p[2],0)/v.length}}).sort((a,b)=>b.z-a.z);
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.lineJoin='round';
 for(const f of faces){const [a,b,c]=f.v,u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);let normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...normal)||1;normal=normal.map(n=>n/len);const diffuse=Math.abs(normal[0]*-.3+normal[1]*-.6+normal[2]*-.74),spec=Math.pow(Math.abs(normal[2]*-.85+normal[1]*-.45),18)*.42;const light=.3+diffuse*.64+spec+f.em*.6;const pulse=hit>0&&((age% .12)<.022)?.55:0;const color=`rgb(${f.c.map(n=>{const base=Math.min(255,n*light+spec*110);return Math.round(base+(255-base)*pulse)}).join(',')})`;ctx.beginPath();f.v.forEach((p,i)=>{const perspective=460/(460+p[2]);i?ctx.lineTo(p[0]*perspective,p[1]*perspective):ctx.moveTo(p[0]*perspective,p[1]*perspective)});ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=.45;ctx.stroke();}
 ctx.restore();
}
// Individually modeled armor ribs, vents, chitin ridges and luminous organs.
function enrichEnemies(){for(const name of ['fighter','gunship','squid','manta']){const m=meshBuilder(),organic=name==='squid'||name==='manta';
 for(let i=0;i<6;i++){const x=-23+i*9;
 if(organic){for(const side of [-1,1]){m.tube([[x,side*9,-16],[x+4,side*17,-18],[x+8,side*20,-9]],1.4,[175,190,144]);m.ellipsoid(x,side*9,-18,2,2,2,name==='squid'?[126,239,151]:[202,137,251],.6,7,5)}}
 else{m.tube([[x,-9,-11],[x,-4,-15],[x,7,-13]],.8,[192,163,135]);for(const side of [-1,1]){m.ellipsoid(x,side*11,-10,1.2,1.2,1.2,[206,206,176],0,6,4);m.wedge([x,side*18,-5],[x+5,side*18,-5],[x+5,side*22,-5],1,[42,46,56])}}}
 if(organic)for(const side of [-1,1])for(let i=0;i<3;i++)m.wedge([-15+i*13,side*12,-3],[-6+i*13,side*(28+i*3),-6],[0+i*13,side*12,2],3,[182,161,185]);meshes[name]=meshes[name].concat(m.faces);
 }
 const head=meshBuilder();head.ellipsoid(0,0,0,42,30,27,[45,103,81]);head.ellipsoid(-27,0,-8,19,23,22,[38,44,49]);
 for(const side of [-1,1]){head.ellipsoid(-21,side*20,-19,13,9,8,[98,154,103]);head.ellipsoid(-26,side*20,-25,7,5,4,[180,255,111],.9);for(let i=0;i<6;i++){const x=-42+i*8;head.wedge([x,side*15,-24],[x-2,side*3,-23],[x+5,side*15,-21],4,[228,220,180])}for(let i=0;i<5;i++)head.wedge([-5+i*9,side*19,0],[9+i*9,side*44,5],[14+i*9,side*15,-2],5,[133,154,117]);}meshes.hiveHead=head.faces;
 const tentacles=meshBuilder();for(let i=0;i<8;i++){const a=i/8*Math.PI*2,yy=Math.cos(a),zz=Math.sin(a),points=[];for(let j=0;j<12;j++)points.push([12+j*10,yy*(22+j*3)+Math.sin(j*.65+i)*j*2,zz*(23+j*3)]);tentacles.tube(points,7,[58,132+i*5,112],1.8);for(let j=2;j<9;j+=2){const start=tentacles.faces.length;tentacles.ellipsoid(points[j][0],points[j][1],points[j][2]-3,3,3,2,[161,195,146],.1,7,5);for(let k=start;k<tentacles.faces.length;k++)tentacles.faces[k].flex=1.8}}meshes.hiveTendrils=tentacles.faces;
 const vertebra=meshBuilder();vertebra.ellipsoid(0,0,0,18,23,20,[78,52,115],0,12,8);for(const side of [-1,1]){vertebra.tube([[-12,side*7,-18],[0,side*19,-19],[10,side*11,-15]],3,[172,156,190]);vertebra.wedge([-8,side*16,0],[4,side*37,2],[11,side*16,2],4,[191,173,198]);}vertebra.ellipsoid(0,0,-21,7,6,3,[222,133,255],.8,10,6);meshes.vertebra=vertebra.faces;
 const serpent=meshBuilder();serpent.ellipsoid(0,0,0,36,23,24,[124,103,157]);for(const side of [-1,1]){serpent.ellipsoid(-16,side*13,-19,11,7,6,[240,149,255],.9);serpent.tube([[-26,side*12,-15],[-42,side*17,-16],[-49,side*5,-14]],4,[213,202,192]);serpent.wedge([0,side*15,0],[35,side*41,-7],[20,side*9,3],7,[171,155,191]);for(let i=0;i<4;i++)serpent.wedge([-30+i*7,side*10,-21],[-34+i*7,side*2,-23],[-25+i*7,side*10,-21],3,[233,224,199]);}meshes.serpentHead=serpent.faces;
}
enrichEnemies();
function buildMotionParts(){
 const rotor=meshBuilder();rotor.ellipsoid(0,0,0,5,8,8,[109,136,154],0,10,6);for(let i=0;i<4;i++){const a=i*Math.PI/2,turn=v=>[v[0],v[1]*Math.cos(a)-v[2]*Math.sin(a),v[1]*Math.sin(a)+v[2]*Math.cos(a)];rotor.wedge(turn([-7,7,-2]),turn([1,38,2]),turn([8,13,5]),2,[174,77,91]);rotor.tube([turn([0,27,2]),turn([1,35,2])],1.5,[255,177,113],0,.7)}meshes.rotor=rotor.faces;
 const fragment=meshBuilder();fragment.wedge([-7,-4,-3],[8,-2,-2],[2,6,0],5,[122,141,158]);fragment.tube([[-4,-3,-4],[5,-2,-3]],1,[229,153,68]);meshes.shrapnel=fragment.faces;
 const bone=meshBuilder();bone.ellipsoid(0,0,0,8,2,2,[224,210,171],0,8,5);for(const side of [-1,1])bone.ellipsoid(side*6,0,0,2,3,3,[225,221,193],0,8,5);meshes.bone=bone.faces;
 for(const [name,color,em] of [['hotCloud',[255,135,35],.75],['emberCloud',[167,63,22],.15],['smokeCloud',[66,65,75],0]]){const cloud=meshBuilder();cloud.ellipsoid(0,0,0,10,10,10,color,em,10,7);for(const f of cloud.faces){for(const v of f.v){const n=1+.2*Math.sin(v[0]*.63+v[1]*.71)*Math.cos(v[2]*.57);v[0]*=n;v[1]*=n;v[2]*=n}const center=f.v.reduce((n,v)=>n+v[1],0)/4;f.c=color.map((c,i)=>Math.max(0,Math.min(255,c+(name==='hotCloud'?35:-12)*Math.sin(center*.65+i))))}meshes[name]=cloud.faces;}
}
buildMotionParts();
function buildOctopus(){const m=meshBuilder();m.ellipsoid(-13,0,0,30,24,23,[109,66,132]);for(const side of [-1,1]){m.ellipsoid(-29,side*11,-15,9,7,7,[163,135,161]);m.ellipsoid(-34,side*11,-20,5,5,3,[219,221,139],.45);m.ellipsoid(-35,side*11,-22,1.2,4,1,[21,24,35]);}for(let i=0;i<8;i++){const a=i*Math.PI/4,y=Math.cos(a),z=Math.sin(a),points=[];for(let j=0;j<10;j++)points.push([4+j*8,y*(17+j*3.4)+Math.sin(j*.55)*8,z*(17+j*2.8)]);m.tube(points,5.5,[135+i*3,83,149],1);for(let j=2;j<8;j+=2)m.ellipsoid(points[j][0],points[j][1]-1,points[j][2]-3,2.4,2,1.5,[205,165,183],0,6,4)}meshes.octopus=m.faces;}buildOctopus();
function buildWeapons(){let m=meshBuilder();m.ellipsoid(0,0,0,15,7,7,[85,105,122],0,12,7);m.tube([[5,0,0],[-10,0,0],[-27,0,0]],5,[124,144,153]);m.ellipsoid(-27,0,0,1.5,4,4,[23,35,42],0,10,6);m.ellipsoid(-28,0,0,1,2,2,[255,177,89],.7,8,5);meshes.cannon=m.faces;
 m=meshBuilder();m.ellipsoid(3,0,0,15,10,9,[114,78,125],0,12,8);m.tube([[8,0,0],[-3,0,0],[-17,-2,0],[-27,0,0]],7,[152,101,140]);for(let i=0;i<4;i++)m.ellipsoid(-4-i*5,0,0,2,7-i*.5,7-i*.5,[179,128,150],0,10,6);m.ellipsoid(-28,0,0,2,4.5,4.5,[35,26,46],0,10,6);meshes.siphon=m.faces;
 m=meshBuilder();m.ellipsoid(1,0,0,13,3.2,3.2,[194,209,210],0,12,6);m.ellipsoid(11,0,0,4,3,3,[199,92,67],0,10,6);for(const side of [-1,1])m.wedge([-8,side*2,0],[-13,side*8,0],[-1,side*2,0],1,[102,130,148]);m.wedge([-10,0,-2],[-13,0,-8],[-1,0,-2],1,[102,130,148]);meshes.missile=m.faces;
 m=meshBuilder();m.ellipsoid(0,0,0,8,5,5,[115,171,96],.12,10,7);m.ellipsoid(3,-2,-3,3,2,2,[201,242,122],.4,8,5);for(let i=0;i<4;i++){const a=i*Math.PI/2;m.tube([[-5,Math.cos(a)*3,Math.sin(a)*3],[-12,Math.cos(a)*6,Math.sin(a)*5],[-20,Math.cos(a)*3,Math.sin(a)*3]],1.2,[172,91,155],.6)}meshes.spore=m.faces;}
buildWeapons();
function buildShieldAndBone(){let m=meshBuilder();m.ellipsoid(0,0,0,8,13,8,[109,150,174],0,12,8);for(const side of [-1,1]){m.tube([[0,side*8,0],[8,side*22,0],[4,side*37,0]],5,[128,166,189]);m.ellipsoid(4,side*33,-3,3,5,3,[118,246,245],.85,8,6)}m.ellipsoid(-4,0,-7,4,7,3,[102,247,249],.75,10,6);meshes.frontShield=m.faces;
 m=meshBuilder();m.tube([[-12,5,0],[-9,-3,-1],[-2,-8,0],[7,-6,1],[12,1,0]],2.6,[224,205,174]);m.wedge([-12,5,-1],[-15,8,-1],[-11,7,0],2,[172,137,115]);meshes.rib=m.faces;
 m=meshBuilder();m.ellipsoid(0,0,0,5,6,4,[210,198,171],0,10,7);for(const side of [-1,1]){m.wedge([side*2,0,0],[side*11,-4,1],[side*7,4,0],3,[221,212,185]);}m.ellipsoid(0,0,-4,2,2.6,1,[101,85,72],0,8,5);m.wedge([-2,-3,1],[0,-13,2],[3,-3,2],3,[230,217,186]);meshes.spineChip=m.faces;
 m=meshBuilder();m.ellipsoid(0,0,0,8,7,3,[199,194,164],0,10,6);m.ellipsoid(-3,-1,-3,2,2,1,[52,60,52],0,7,5);m.ellipsoid(3,-1,-3,2,2,1,[52,60,52],0,7,5);for(let i=0;i<3;i++)m.wedge([-5+i*4,4,-1],[-7+i*4,10,-2],[-2+i*4,5,-1],2,[235,222,186]);meshes.skull=m.faces;
 // Shell fragments have ridges, not paired eye sockets or teeth.
 m=meshBuilder();m.wedge([-10,-5,-2],[9,-7,1],[5,9,-1],3,[152,157,119]);m.tube([[-8,-3,-3],[-1,-1,-5],[5,6,-2]],1.2,[209,201,157]);meshes.chitinChip=m.faces;
}buildShieldAndBone();
function refineBossSurfaces(){
 const shell=meshBuilder();for(let row=0;row<5;row++){const x=-5+row*8;for(let j=0;j<7;j++){const angle=(j/6)*Math.PI+.25,y=Math.cos(angle)*24,z=Math.sin(angle)*-25;shell.ellipsoid(x,y,z,7,5,3,[69+row*7,124+row*4,99],0,16,10);if(j%2===0)shell.ellipsoid(x-2,y-1,z-3,2,1.5,1,[149,230,128],.5,10,7)}}for(const side of [-1,1])shell.tube([[-12,side*23,-12],[-29,side*32,-16],[-48,side*25,-19],[-53,side*10,-21]],4,[213,211,169]);meshes.hiveHead=meshes.hiveHead.concat(shell.faces);
 const skull=meshBuilder();for(const side of [-1,1]){skull.tube([[18,side*16,-8],[1,side*23,-16],[-20,side*17,-23]],3,[205,194,219]);skull.tube([[0,side*12,-20],[-15,side*18,-24],[-30,side*11,-22]],1,[200,119,248],0,.7);for(let j=0;j<4;j++)skull.ellipsoid(1+j*7,side*7,-21+j,4,3,2,[147,128,167],0,14,9)}meshes.serpentHead=meshes.serpentHead.concat(skull.faces);
}refineBossSurfaces();
function addAnimalAnatomy(){
 for(const [name,color,eyeX,eyeY,eyeZ,size] of [['squid',[86,139,105],-26,-10,-23,8],['octopus',[139,103,143],-30,-11,-20,7],['hiveHead',[86,130,84],-25,-20,-25,10],['serpentHead',[135,116,143],-17,-13,-21,9]]){
 const m=meshBuilder();
 // Fleshy orbital rims surround an iris and dark vertical pupil, with a corneal highlight.
 m.ellipsoid(eyeX,eyeY,eyeZ,size*1.45,size*1.2,size*.64,color,0,24,16);
 m.ellipsoid(eyeX-1,eyeY,eyeZ-size*.5,size*.97,size*.9,size*.4,[184,179,130],0,24,16);
 m.ellipsoid(eyeX-2,eyeY,eyeZ-size*.83,size*.63,size*.74,size*.18,[112,148,71],0,20,14);
 m.ellipsoid(eyeX-2,eyeY,eyeZ-size*.99,size*.17,size*.63,size*.08,[9,18,21],0,16,12);
 m.ellipsoid(eyeX-4,eyeY-3,eyeZ-size*1.06,size*.14,size*.13,size*.05,[228,243,229],.15,12,8);
 const lid=[];for(let j=0;j<9;j++){const a=Math.PI+j*Math.PI/8;lid.push([eyeX+Math.cos(a)*size*1.12,eyeY+Math.sin(a)*size*.95,eyeZ-size*.48])}m.tube(lid,1.4,color);
 // Cheek folds and gill slits follow the mantle instead of sitting as armor plates.
 for(let j=0;j<4;j++){const x=-5+j*6;m.tube([[x,-9,-22],[x+2,0,-24],[x+1,10,-20]],1.2,color.map(c=>Math.round(c*.72)));}
 if(name==='hiveHead'||name==='serpentHead'){m.ellipsoid(-27,17,-12,19,8,15,color,0,28,18);m.ellipsoid(-23,-27,-10,20,6,15,color,0,28,18);m.tube([[-38,9,-22],[-26,14,-25],[-10,11,-23]],2,color.map(c=>Math.round(c*.65)));}
 meshes[name]=meshes[name].concat(m.faces);meshes[name].skin=true;
 }
 for(const name of ['hiveTendrils','vertebra','siphon','spore'])meshes[name].skin=true;
}addAnimalAnatomy();
// Layered armor and exposed machinery make the silhouettes readable at combat scale.
function detailStarships(){
 const p=meshBuilder();
 p.wedge([51,0,-5],[3,-11,-12],[3,11,-12],5,[185,208,219]);
 p.ellipsoid(4,-5,-14,19,7,5,[18,46,65],0,24,14);
 p.ellipsoid(7,-6,-18,13,4,2,[61,166,202],.18,20,12);
 p.tube([[-12,-8,-17],[0,-11,-18],[19,-8,-15]],1.1,[209,223,225]);
 p.tube([[3,-11,-17],[4,-5,-20],[5,1,-17]],.9,[154,181,194]);
 for(const side of [-1,1]){
  p.wedge([24,side*10,-7],[-28,side*33,-5],[-35,side*20,-10],4,[172,193,205]);
  p.wedge([-8,side*17,-11],[-27,side*29,-9],[-30,side*22,-12],1,[35,65,85]);
  p.tube([[-34,side*17,-5],[-19,side*17,-7],[14,side*13,-7]],1.2,[88,222,240],0,.35);
  p.ellipsoid(-30,side*18,-5,16,6,6,[62,82,105],0,20,12);
  p.ellipsoid(-43,side*18,-5,3,5,5,[17,29,44],0,16,10);
  p.ellipsoid(-45,side*18,-5,1.5,3,3,[107,237,255],.9,12,8);
  for(let i=0;i<4;i++)p.tube([[-30+i*5,side*19,-11],[-28+i*5,side*24,-9]],.8,[23,39,54]);
  p.tube([[0,side*10,-8],[20,side*10,-8],[39,side*10,-8]],2,[57,78,98]);
 }
 for(const name of ['player','player2','player3'])meshes[name]=meshes[name].concat(p.faces);
 for(const name of ['fighter','gunship']){
  const m=meshBuilder(),heavy=name==='gunship',armor=heavy?[77,83,92]:[77,34,46];
  for(const side of [-1,1]){
   m.wedge([-49,side*22,-4],[22,side*36,-2],[10,side*12,-13],8,armor);
   m.wedge([-48,side*22,-8],[-9,side*25,-12],[-22,side*15,-13],3,[151,71,65]);
   m.tube([[-44,side*23,-9],[-21,side*27,-12],[13,side*30,-7]],1.3,[246,89,49],0,.3);
   m.ellipsoid(22,side*23,-4,18,9,9,[39,45,58],0,20,12);
   m.ellipsoid(38,side*23,-4,3,6,6,[255,116,42],.65,16,10);
   for(let i=0;i<4;i++)m.wedge([i*7-13,side*15,-14],[i*7-9,side*15,-14],[i*7-11,side*23,-11],2,[29,30,39]);
  }
  m.wedge([-39,-7,-14],[-9,-12,-17],[-6,9,-17],4,[32,35,44]);
  m.tube([[-33,-6,-19],[-23,-4,-20],[-12,-7,-20]],1.8,[255,64,35],0,.75);
  m.wedge([16,-4,-14],[38,-6,-27],[32,6,-14],4,armor);
  meshes[name]=meshes[name].concat(m.faces);
 }
}detailStarships();

// A translucent-looking deep-space ray is unique to the final sector.
meshes.abyssRay=meshes.manta.map(f=>({...f,c:f.c.map((v,i)=>Math.min(255,v+(i===2?35:i===0?-15:15)))}));meshes.abyssRay.skin=true;

function buildAlienDetails(){
 const arm=meshBuilder();arm.ellipsoid(0,0,0,14,12,10,[126,66,130],0,16,10);arm.ellipsoid(0,-5,-9,5,4,2,[208,146,170],0,12,8);arm.ellipsoid(0,-5,-11,2.8,2.3,1,[67,29,75],0,10,6);meshes.reachingArm=arm.faces;meshes.reachingArm.skin=true;
 for(const name of ['squid','octopus','abyssRay']){const m=meshBuilder();
  // Asymmetric sensory stalks, luminous vesicles and split feeding fronds.
  for(let i=0;i<3;i++){const x=-10+i*11,y=-18-i*3,z=-12;m.tube([[x,y,z],[x-9,y-12,z-7],[x-5,y-22,z-11]],2,[109,91,143]);m.ellipsoid(x-5,y-22,z-11,4,5,4,[164,205,103],.15,14,10);m.ellipsoid(x-7,y-22,z-14,1,3,1,[15,20,33],0,10,7)}
  for(let i=0;i<4;i++){m.ellipsoid(i*9-2,10,-23,5,4,4,[77,160,165],.15,14,10);m.ellipsoid(i*9-3,9,-26,2,2,1,[159,246,192],.5,10,7)}
  for(const side of [-1,1])m.tube([[-28,side*8,-8],[-45,side*13,-12],[-51,side*26,-13],[-37,side*29,-16]],2.2,[171,122,162]);
  meshes[name]=meshes[name].concat(m.faces);meshes[name].skin=true;
 }
}buildAlienDetails();

// Permanent muscular attachment collars for the bosses' extending arms.
{const m=meshBuilder();m.ellipsoid(0,0,0,24,23,16,[111,67,121],0,20,14);m.ellipsoid(-9,0,-10,16,17,8,[157,95,148],0,18,12);for(const side of [-1,1])m.tube([[9,side*16,-8],[-3,side*18,-14],[-14,side*10,-13]],2,[195,135,175]);meshes.armRoot=m.faces;meshes.armRoot.skin=true;}
// Continuous reptilian trunk: open-ended muscle tube with overlapping keeled scales.
function buildSerpentSkin(){
 const m=meshBuilder(),color=[81,109,104],rings=9,sides=24;
 for(let j=0;j<rings;j++)for(let k=0;k<sides;k++){
  const vertex=(n,a)=>{const x=-21+n*42/rings,theta=a/sides*Math.PI*2,r=16.5+.5*Math.cos(x*.1);return[x,Math.cos(theta)*r,Math.sin(theta)*r*.86]};
  m.faces.push({v:[vertex(j,k),vertex(j+1,k),vertex(j+1,k+1),vertex(j,k+1)],c:color.map(n=>Math.round(n)),em:0,flex:0});
 }
 for(let row=0;row<5;row++)for(let k=0;k<9;k++){
  const x=-18+row*8+(k%2)*3,a=Math.PI+(k+.5)/9*Math.PI,y=Math.cos(a)*16.8,z=Math.sin(a)*14.7;
  // Each diamond has a raised central keel, catching light like a real scale.
  const along=[x-5,y,z],tip=[x+6,y,z],up=[x,y+Math.sin(a)*4,z-Math.cos(a)*3],down=[x,y-Math.sin(a)*4,z+Math.cos(a)*3],peak=[x,y*1.06,z*1.08];
  for(const edge of [[along,up],[up,tip],[tip,down],[down,along]])m.faces.push({v:[edge[0],edge[1],peak],c:[88+row*3,121+k*2,111+k],em:0,flex:0});
 }
 for(let i=0;i<5;i++){const x=-18+i*8;m.tube([[x,10,-10],[x,16,-3],[x,15,7]],1.1,[149,158,127]);m.wedge([x-4,-15,0],[x+1,-24,1],[x+6,-15,0],2,[110,126,109]);}
 meshes.snakeBody=m.faces;meshes.snakeBody.skin=true;
 const h=meshBuilder();h.ellipsoid(-2,0,0,29,16,15,[75,112,102],0,28,18);h.ellipsoid(-24,3,-1,18,10,11,[91,127,109],0,24,16);h.ellipsoid(-23,11,0,20,5,10,[151,157,127],0,24,14);
 h.tube([[-42,6,-7],[-24,8,-11],[-6,7,-14]],1.2,[25,39,37]);
 for(const side of [-1,1]){h.ellipsoid(-8,-7,side*12,9,7,5,[56,86,81],0,20,12);h.ellipsoid(-11,-7,side*16,5,4,2,[198,164,78],0,18,12);h.ellipsoid(-12,-7,side*18,1,3,1,[12,22,22],0,12,8);h.tube([[-21,-11,side*12],[-9,-15,side*15],[1,-10,side*14]],2.5,[116,141,117]);h.ellipsoid(-34,-1,side*8,2,1.4,1,[17,32,31],0,10,7);for(let j=0;j<3;j++)h.wedge([-31+j*7,7,side*9],[-29+j*7,12,side*9],[-27+j*7,7,side*9],1,[222,214,178]);}
 for(let j=0;j<4;j++)h.tube([[j*6-1,-12,-7],[j*6+3,-16,0],[j*6-1,-12,7]],1.6,[129,148,120]);meshes.snakeHead=h.faces;meshes.snakeHead.skin=true;
}buildSerpentSkin();
function fleshAlienSurfaces(){
 const names=['squid','octopus','abyssRay','hiveHead','serpentHead','snakeHead'];
 for(const name of names){
  const original=meshes[name];
  meshes[name]=original.map(f=>{const flesh=Math.max(...f.c)<190&&f.em<.3;return{...f,wet:f.wet||(f.em>.35||Math.max(...f.c)<45?.9:0),v:f.v.map(([x,y,z])=>{const ripple=flesh?Math.sin(x*.32+Math.sin(y*.19))*Math.cos(z*.26-y*.13)*.65:0;return[x+ripple*.3,y+ripple*.65,z+ripple]})}});meshes[name].skin=true;
 }
 for(const name of ['squid','octopus','abyssRay','hiveHead']){
  const m=meshBuilder(),bossSkin=name==='hiveHead',skin=bossSkin?[86,112,77]:name==='octopus'?[122,86,114]:[77,126,113];
  // Slit-like breathing openings, tucked into fleshy lips rather than painted stripes.
  for(let i=0;i<4;i++){const x=-5+i*6,z=bossSkin?-28:-25,y=5+i*.5;let start=m.faces.length;m.ellipsoid(x,y,z,1.6,7-i*.5,1.2,[29,33,39],0,14,10);for(let j=start;j<m.faces.length;j++)m.faces[j].wet=.85;m.tube([[x-2,y-7,z],[x-3,y,z-1],[x-2,y+7,z]],1.5,skin);m.tube([[x+2,y-6,z],[x+3,y,z],[x+2,y+6,z]],.9,[158,115,126]);}
  // A folded, asymmetric sensory membrane sweeps from the mantle.
  const edge=[];for(let i=0;i<12;i++){const x=-11+i*4,y=-21-Math.sin(i/11*Math.PI)*(12+Math.sin(i*1.8)*4),z=-8-Math.sin(i*.7)*4;edge.push([x,y,z]);if(i){const root=[x,-15,0],prev=edge[i-1];m.faces.push({v:[[x-4,-15,0],prev,[x,y,z],root],c:[118+i*2,88+i,111],em:0,flex:0,wet:.35});m.tube([root,[x,y,z]],.65,[183,129,143]);}}m.tube(edge,1.1,skin);
  // Branching capillaries embedded in the cheek and irregular mantle folds.
  for(let i=0;i<3;i++){const x=-18+i*11;m.tube([[x,12,-19],[x+3,5,-24],[x+1,-4,-23]],.45,[103,62,82]);m.tube([[x+3,5,-24],[x+7,1,-23],[x+8,-3,-22]],.3,[117,74,95]);m.tube([[x,-13,-16],[x+4,-10,-21],[x+7,-2,-24]],1.05,skin.map(v=>Math.round(v*1.18)));}
  // A single off-centre wet sensory organ with an iris and a deep slit.
  let start=m.faces.length;m.ellipsoid(8,-5,-25,7,5,3,[105,146,132],0,22,14);m.ellipsoid(7,-5,-28,3,3,1,[193,153,73],0,18,12);m.ellipsoid(7,-5,-29,1,2.5,.6,[12,22,26],0,14,10);for(let j=start;j<m.faces.length;j++)m.faces[j].wet=1;
  meshes[name]=meshes[name].concat(m.faces);meshes[name].skin=true;
 }
}fleshAlienSurfaces();
function buildSectorBosses(){
 const m=meshBuilder();m.ellipsoid(5,0,0,76,35,29,[73,83,94],0,32,20);
 for(const side of [-1,1]){
  m.wedge([-62,side*18,-6],[67,side*65,4],[46,side*12,-26],18,[85,96,108]);
  m.wedge([-50,side*21,-25],[32,side*46,-26],[50,side*16,-31],7,[135,139,139]);
  m.ellipsoid(40,side*47,3,43,13,15,[40,51,65],0,24,14);m.ellipsoid(80,side*47,3,4,9,10,[255,155,67],.8,20,12);
  m.tube([[-20,side*42,-18],[-55,side*42,-18],[-85,side*42,-18]],7,[83,107,119]);m.ellipsoid(-85,side*42,-18,2,5,5,[16,27,33],0,14,10);
  for(let i=0;i<7;i++){const x=-35+i*13;m.tube([[x,side*19,-28],[x+2,side*32,-27],[x+6,side*38,-20]],1,[194,179,150]);m.wedge([x,side*25,-29],[x+7,side*25,-29],[x+7,side*31,-27],2,[32,42,55]);}
  m.tube([[20,side*18,-20],[32,side*29,-36],[50,side*25,-48]],4,[117,126,131]);
 }
 // A recessed reactor iris surrounded by mechanical teeth, cabling and an armored bridge.
 m.ellipsoid(-10,0,-30,29,27,7,[20,29,39],0,28,18);m.ellipsoid(-10,0,-37,17,17,3,[253,155,63],.65,28,18);
 for(let i=0;i<16;i++){const a=i/16*Math.PI*2,x=-10+Math.cos(a)*25,y=Math.sin(a)*25;m.wedge([x,y,-37],[x+Math.cos(a)*10,y+Math.sin(a)*10,-32],[x-Math.sin(a)*6,y+Math.cos(a)*6,-38],4,[147,151,145]);}
 m.ellipsoid(39,-7,-33,24,12,10,[66,85,103],0,24,14);for(let i=0;i<5;i++)m.ellipsoid(24+i*7,-8,-42,2,3,1,[114,215,240],.6,10,6);meshes.cathedral=m.faces;
 const s=meshBuilder();
 for(const side of [-1,1]){
  s.tube([[12,side*9,-6],[19,side*25,-12],[7,side*37,-16],[-17,side*41,-14]],5,[135,135,151]);
  s.tube([[3,side*13,-4],[-14,side*24,-12],[-32,side*23,-14],[-43,side*13,-12]],3,[200,188,159]);
  for(let i=0;i<7;i++){const x=i*6+2,reach=26+Math.sin(i/6*Math.PI)*21;s.wedge([x,side*12,4],[x+15,side*reach,-4],[x+9,side*12,-8],1.5,[111+i*4,95,147]);s.tube([[x+2,side*13,-7],[x+15,side*reach,-5]],.8,[181,161,185]);}
 }
 s.ellipsoid(11,-3,-20,13,9,6,[102,78,143],0,24,14);for(let i=0;i<3;i++){s.ellipsoid(i*7+1,-4,-26,3,4,2,[212,163,99],0,18,12);s.ellipsoid(i*7,-4,-28,1,3,1,[13,19,25],0,12,8)}
 meshes.sovereign=meshes.snakeHead.concat(s.faces);meshes.sovereign.skin=true;
}buildSectorBosses();

// An independent brood-sac species: ribbed carapace, radial petals and egg chambers.
{
 const m=meshBuilder();
 m.ellipsoid(0,0,0,38,35,32,[111,53,44],0,32,22);
 m.ellipsoid(-23,0,0,20,24,24,[166,123,83],0,28,18);
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,fin=meshBuilder();
  fin.ellipsoid(14,40,0,27,13,5,[163,104,66],0,24,14);
  fin.tube([[-16,25,0],[0,38,0],[22,55,0],[43,59,0]],3.4,[223,179,113],.3);
  for(const f of fin.faces){f.v=f.v.map(([x,y,z])=>[x,y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)]);m.faces.push(f)}
  const y=Math.cos(a),z=Math.sin(a);
  m.tube([[-26,y*19,z*19],[-10,y*35,z*32],[12,y*36,z*33],[31,y*22,z*21]],3,[202,162,107]);
  m.ellipsoid(8,y*30,z*29,10,7,7,[70,205,186],.45,20,14);
 }
 for(const side of [-1,1])for(const y of [-11,11]){
  m.ellipsoid(-27,y,side*21,8,7,5,[233,202,114],.2,20,14);
  m.ellipsoid(-30,y,side*25,3,4,2,[12,30,31],0,16,12);
 }
 m.tube([[28,0,0],[46,0,0],[59,5,0]],8,[127,67,51],.3);
 meshes.broodMother=m.faces;meshes.broodMother.skin=true;
 const pod=meshBuilder();pod.ellipsoid(0,0,0,22,15,14,[173,116,67],0,26,18);
 pod.ellipsoid(-14,0,-9,8,9,7,[91,245,215],.65,20,14);
 pod.ellipsoid(-18,0,-14,2,6,2,[12,40,37],0,16,10);
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2,y=Math.cos(a),z=Math.sin(a);
  pod.tube([[-11,y*10,z*10],[5,y*17,z*17],[23,y*20,z*20],[37,y*13,z*13]],2.8,[228,184,112],.5);
  pod.ellipsoid(4,y*12,z*12,6,4,4,[75,220,197],.35,16,10);
 }
 meshes.swarmlet=pod.faces;meshes.swarmlet.skin=true;
}

// Sector-specific silhouettes retain the detailed hulls, skin and eye materials.
{
 const interceptor=meshBuilder(),barge=meshBuilder(),ray=meshBuilder(),medusa=meshBuilder();
 for(const side of [-1,1]){
  interceptor.wedge([-28,side*16,-7],[35,side*53,3],[44,side*27,-12],7,[90,111,124]);
  interceptor.tube([[30,side*34,-4],[49,side*34,-4],[58,side*27,-5]],6,[55,69,78]);
  for(let i=0;i<6;i++){interceptor.tube([[-10+i*7,side*15,-17],[-7+i*7,side*28,-16]],1.3,[197,150,76]);barge.ellipsoid(-25+i*11,side*26,-9,5,10,10,[82,98,111],0,16,10);}
  barge.tube([[35,side*26,-13],[3,side*27,-20],[-43,side*27,-18],[-62,side*20,-16]],4,[198,161,99]);
  for(let i=0;i<8;i++){const x=-16+i*8;ray.tube([[x,side*8,-6],[x+16,side*(26+Math.sin(i*.4)*18),-9],[x+28,side*16,-4]],1.8,[147,183,209],.6);ray.ellipsoid(x,side*12,-14,2.5,3.5,2,[91,225,243],.55,12,8);}
 }
 meshes.forgeInterceptor=meshes.fighter.concat(interceptor.faces);meshes.forgeBarge=meshes.gunship.concat(barge.faces);
 meshes.abyssRay=meshes.abyssRay.concat(ray.faces);meshes.abyssRay.skin=true;
 medusa.ellipsoid(-4,0,0,30,34,27,[117,123,157],0,32,22);
 for(let i=0;i<9;i++){
  const a=i*Math.PI*2/9,y=Math.cos(a),z=Math.sin(a),points=[];
  for(let j=0;j<8;j++)points.push([10+j*9,y*(22+Math.sin(j*.5)*15),z*(20+Math.sin(j*.6)*12)]);
  medusa.tube(points,4.2,[137+i*3,134,181],1);
  medusa.tube([[-24,y*12,z*12],[-12,y*34,z*27],[8,y*33,z*28],[22,y*18,z*18]],2.6,[202,198,216]);
  medusa.ellipsoid(-19,y*21,z*20,7,5,5,[91,226,245],.45,18,12);
  medusa.ellipsoid(-25,y*21,z*20,2,3,3,[14,24,45],0,12,8);
 }
 meshes.abyssMedusa=medusa.faces;meshes.abyssMedusa.skin=true;
 const alienArmor=meshBuilder();for(const side of [-1,1])for(let i=0;i<4;i++)alienArmor.tube([[-20+i*16,side*18,-12],[-10+i*16,side*32,-28],[5+i*16,side*22,-36]],3,[190,189,205]);
 meshes.riftSkimmer=meshes.forgeInterceptor.concat(alienArmor.faces);meshes.riftBastion=meshes.forgeBarge.concat(alienArmor.faces);
}
const sectorEnemyModels=[['fighter','squid','gunship','octopus'],['forgeInterceptor','squid','forgeBarge','octopus'],['riftSkimmer','abyssRay','riftBastion','abyssMedusa']];

// Void Sovereign: a continuous armored leviathan, with broad swimming membranes.
{
 const m=meshBuilder();
 m.ellipsoid(12,0,0,78,37,32,[47,48,77],0,40,26);
 m.ellipsoid(-35,0,-2,34,31,29,[78,74,107],0,36,24);
 for(const side of [-1,1]){
  const surface=(u,v)=>{const x=-4+u*107,reach=Math.sin(u*Math.PI)*66;return[x,side*(23+v*reach),-4+Math.sin(v*Math.PI)*12+Math.sin(u*Math.PI*2)*v*8]};
  for(let u=0;u<28;u++)for(let v=0;v<12;v++)m.faces.push({v:[surface(u/28,v/12),surface((u+1)/28,v/12),surface((u+1)/28,(v+1)/12),surface(u/28,(v+1)/12)],c:[89+v*2,72+v,121+v*2],flex:.18,em:0});
  for(let rib=0;rib<9;rib++){const u=(rib+1)/10;m.tube([surface(u,0),surface(u,.35),surface(u,.7),surface(u,1)],1.3,[162,135,185],.2);}
  for(let i=0;i<4;i++){const x=-33+i*12,y=side*(16+i*2),z=-24;m.ellipsoid(x,y,z,7-i*.6,5,4,[160,146,99],0,24,16);let first=m.faces.length;m.ellipsoid(x-1,y,z-3,4,3,2,[98,239,222],.4,20,14);m.ellipsoid(x-2,y,z-5,1.1,2.7,.6,[5,15,28],0,16,12);for(let n=first;n<m.faces.length;n++)m.faces[n].wet=1;}
  for(let i=0;i<3;i++)m.tube([[55,side*(14+i*7),0],[84,side*(24+i*10),-7],[112,side*(34+i*12),-4],[140,side*(22+i*11),8]],4.5-i*.6,[105,84,141],.7);
 }
 for(let row=0;row<7;row++){const x=-18+row*13;for(let band=0;band<5;band++){const a=(band-2)*.42;m.ellipsoid(x,Math.sin(a)*29,-Math.cos(a)*29,10,7,3.5,[92+row*3,89+band*4,128+row*2],0,20,14);if(band%2===0)m.tube([[x-5,Math.sin(a)*29,-Math.cos(a)*32],[x+3,Math.sin(a)*30,-Math.cos(a)*33]],.8,[90,206,200],0,.25);}}
 meshes.voidLeviathan=m.faces;meshes.voidLeviathan.skin=true;
}
const bossWeaponSpecs=[
 {rootX:-35,scale:1.9,mount:[0,0,0],length:48,color:[84,138,105],light:[137,255,205]},
 {rootX:0,scale:2.15,mount:[-58,0,-10],length:44,color:[95,114,129],light:[255,192,104]},
 {rootX:-20,scale:2.3,mount:[-53,0,-10],length:35,color:[106,85,135],light:[199,156,255]}
];
const bossLaserMeshes=bossWeaponSpecs.map((spec,sector)=>{
 const barrel=meshBuilder(),iris=meshBuilder(),core=meshBuilder(),[cx,cy,cz]=spec.mount,tip=cx-spec.length;
 const ring=(x,r,n)=>[x,cy+Math.cos(n/32*Math.PI*2)*r,cz+Math.sin(n/32*Math.PI*2)*r];
 for(let j=0;j<8;j++){const x=cx-j*spec.length/8,x2=cx-(j+1)*spec.length/8,r=(sector===0?22:15)-j*.55+(sector===1?(j%2)*1.8:Math.sin(j)*.7),r2=(sector===0?22:15)-(j+1)*.55;
  for(let n=0;n<32;n++){barrel.faces.push({v:[ring(x,r,n),ring(x,r,n+1),ring(x2,r2,n+1),ring(x2,r2,n)],c:spec.color,em:0,flex:0});barrel.faces.push({v:[ring(x2,sector===0?13:8,n),ring(x2,sector===0?13:8,n+1),ring(x,sector===0?13:8,n+1),ring(x,sector===0?13:8,n)],c:[20,27,36],em:0,flex:0});}
 }
 for(let n=0;n<32;n++)barrel.faces.push({v:[ring(tip,sector===0?17.6:10.6,n),ring(tip,sector===0?17.6:10.6,n+1),ring(tip,sector===0?13:8,n+1),ring(tip,sector===0?13:8,n)],c:sector===1?[190,182,156]:[176,171,156],em:0,flex:0});
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3,y=Math.cos(a),z=Math.sin(a);
  barrel.tube([[cx+15,cy+y*21,cz+z*21],[cx+3,cy+y*20,cz+z*20],[tip+9,cy+y*13,cz+z*13]],sector===1?2.2:3,spec.color);
  barrel.ellipsoid(cx+2,cy+y*15,cz+z*15,7,3,3,spec.light,.25,16,10);
  const petal=meshBuilder();petal.ellipsoid(0,0,0,3,6,5,sector===1?[137,148,153]:spec.color,0,18,12);
  for(const f of petal.faces){f.v=f.v.map(([x,v,w])=>[tip+1+x,cy+y*(4+v)-z*w,cz+z*(4+v)+y*w]);for(const v of f.v){v.rest=v.slice();v.axis=[y,z];}iris.faces.push(f);}
 }
 core.ellipsoid(tip+4,cy,cz,6,11,11,spec.light,.85,28,18);
 for(const f of core.faces)for(const v of f.v)v.rest=v.slice();
 barrel.faces.skin=sector!==1;iris.faces.skin=sector!==1;iris.faces.dynamic=true;core.faces.dynamic=true;
 return{barrel:barrel.faces,iris:iris.faces,core:core.faces,tip:[tip,cy,cz],center:[tip+4,cy,cz]};
});

// Visible paired launchers: armored rack sockets and soft seed-producing glands.
{
 const rack=meshBuilder(),gland=meshBuilder();
 for(const side of [-1,1]){
 rack.ellipsoid(-12,side*35,-24,23,12,13,[84,98,111],0,24,16);
 for(let i=0;i<3;i++){const y=side*35+(i-1)*7;rack.tube([[-8,y,-30],[-22,y,-30],[-30,y,-30]],3.8,[159,151,127]);rack.ellipsoid(-31,y,-30,1.8,2.6,2.6,[21,24,29],0,16,10);}
 gland.ellipsoid(-13,side*30,-22,20,13,12,[98,75,126],0,28,18);gland.tube([[2,side*28,-24],[-12,side*35,-26],[-28,side*35,-24]],7,[141,109,157],.15);gland.ellipsoid(-28,side*35,-24,4,6,6,[161,222,178],.5,20,14);
 }
 meshes.bossRacks=rack.faces;meshes.sporeGlands=gland.faces;meshes.sporeGlands.skin=true;
}

// Abyss lantern scarab: a plated shell and paired folding flight membranes.
{
 const body=meshBuilder(),wing=meshBuilder(),engine=meshBuilder();
 body.ellipsoid(0,0,0,35,20,23,[66,81,111],0,36,24);
 for(let i=0;i<6;i++){body.ellipsoid(-23+i*10,0,-15,8,22-i,11,[116+i*6,112+i*3,146],0,24,16);body.tube([[-25+i*10,-18,-16],[-24+i*10,0,-27],[-25+i*10,18,-16]],1.2,[119,227,212],0,.35);}
 for(const side of [-1,1]){body.ellipsoid(-29,side*11,-14,8,6,5,[159,234,162],.45,20,14);body.ellipsoid(-33,side*11,-17,2,4,2,[8,18,26],0,16,12);body.tube([[-26,side*16,0],[-42,side*24,-4],[-49,side*17,-8]],2,[178,175,157]);}
 for(let i=0;i<18;i++)for(let j=0;j<9;j++){const v=(u,t)=>[-12+u*55,8+t*Math.sin(u*Math.PI)*46,-3+Math.sin(t*Math.PI)*5];wing.faces.push({v:[v(i/18,j/9),v((i+1)/18,j/9),v((i+1)/18,(j+1)/9),v(i/18,(j+1)/9)],c:[112+j*5,127+j*4,168+j*3],em:.1,flex:.15});}
 for(let i=1;i<9;i++){const u=i/10;wing.tube([[-12+u*55,8,-3],[-12+u*55,8+Math.sin(u*Math.PI)*23,2],[-12+u*55,8+Math.sin(u*Math.PI)*46,-3]],.9,[188,198,208],.15);}
 engine.ellipsoid(0,0,0,17,6,6,[117,126,139],0,20,12);engine.ellipsoid(17,0,0,2,4,4,[255,185,92],.85,16,10);
 meshes.lanternScarab=body.faces;meshes.lanternScarab.skin=true;meshes.scarabWing=wing.faces;meshes.scarabWing.skin=true;meshes.vectorEngine=engine.faces;
 sectorEnemyModels[2][3]='lanternScarab';
}

{
 const m=meshBuilder();m.ellipsoid(0,0,0,18,18,18,[74,126,148],0,28,18);m.ellipsoid(0,0,-14,11,11,7,[128,245,245],.7,24,16);
 for(let i=0;i<4;i++){const a=i*Math.PI/2,y=Math.cos(a),z=Math.sin(a);m.tube([[-11,y*16,z*16],[0,y*20,z*20],[16,y*12,z*12],[24,y*7,z*7]],3,[187,203,201]);m.ellipsoid(24,y*7,z*7,2,3,3,[167,255,232],.8,12,8);}
 meshes.weaponOrb=m.faces;
}

// Mantle extends into the power stroke; the tail root stays anchored.
function organicVertex(p,age,rig){
 const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)},phase=age*(rig==='squid'?4.8:3.8);
 if(p[0]<23){const weight=smooth(-22,-4,p[0])*(1-smooth(10,23,p[0])),contraction=Math.pow((1+Math.cos(phase+(p[0]+20)*.045))*.5,4),squeeze=1-.22*weight*contraction;const extension=Math.pow((1+Math.cos(phase-.3))*.5,5)*(1-smooth(4,23,p[0]));return[p[0]+weight*contraction*4-extension*9,p[1]*squeeze*(1-extension*.045),p[2]*squeeze*(1-extension*.045)];}
 const along=Math.max(0,p[0]-23)/67,arm=Math.atan2(p[2],p[1]),lag=phase-along*3.5+arm*.18,root=smooth(0,.4,along),jet=Math.pow((1+Math.cos(phase))*.5,5),release=Math.sin(lag-.65)+.32*Math.sin(2*lag-1.3),drive=1+jet*.7,tuck=organicTailTuck(age),bundle=(1+root*(-.46*Math.pow((1+Math.cos(lag))*.5,3)+.20*Math.max(0,Math.sin(lag-.7))+(1-tuck)*.30))*(1-.75*tuck*root),curl=release*along*along*32*drive*(1-.9*tuck);
 // A travelling recoil reaches the tips after the mantle contracts.
 return[p[0]+root*along*(jet*9-Math.max(0,release)*24),p[1]*bundle+Math.cos(arm+.8+root*.48*Math.sin(phase-along*1.8)+tuck*along*3)*curl,p[2]*bundle+Math.sin(arm+.8+root*.48*Math.sin(phase-along*1.8)+tuck*along*3)*curl];
}

function rayVertex(p,age){const span=Math.max(0,Math.abs(p[1])-12),wave=age*3.2-p[0]*.055,drive=1+.65*Math.pow((1+Math.cos(age*3.2))*.5,5);return[p[0],p[1],p[2]+Math.sin(wave)*span*.44*drive];}
// Boss surface relief stays attached to the body while it turns.
{
 for(const name of ['hiveHead','voidLeviathan']){const m=meshBuilder(),large=name==='voidLeviathan';for(let i=0;i<14;i++){const x=-12+i*(large?6:3),y=Math.sin(i*2.4)*18,z=-Math.sqrt(Math.max(20,(large?31:27)**2-y*y));m.tube([[x-4,y-3,z],[x,y,z-2],[x+5,y+4,z+1]],.8,[38,42,52]);m.ellipsoid(x,y,z-1,2.4,1.7,1.1,[155,139,120],0,12,8);}for(const side of [-1,1])m.tube([[-15,side*21,-17],[-28,side*30,-21],[-44,side*29,-23],[-51,side*18,-25]],3.8,[191,188,155]);meshes[name]=meshes[name].concat(m.faces);meshes[name].skin=true;}
 const m=meshBuilder();for(let i=0;i<9;i++){const x=-28+i*9;for(const side of [-1,1]){m.tube([[x,side*16,-30],[x+2,side*25,-26]],1.5,[51,57,61]);m.ellipsoid(x,side*22,-31,1.5,1.5,1,[172,146,108],0,10,6);}}for(const side of [-1,1])m.wedge([-35,side*20,-18],[-64,side*47,-8],[9,side*35,-17],5,[89,96,101]);meshes.cathedral=meshes.cathedral.concat(m.faces);
 const gun=meshBuilder();gun.ellipsoid(0,0,0,34,24,22,[82,93,104],0,24,16);for(const side of [-1,1])gun.tube([[10,side*12,-12],[-20,side*12,-12],[-45,side*12,-12]],5,[159,151,123]);gun.ellipsoid(-12,-7,-22,8,4,3,[255,129,79],.65,16,10);meshes.sentry=gun.faces;
}
// Continuous ray membranes connect the ribs; the flight rig carries a wave to each tip.
{
 const m=meshBuilder();for(const side of [-1,1]){const point=(u,v)=>[-24+u*75,side*(10+Math.sin(u*Math.PI)*v*46),4+Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*5];for(let i=0;i<28;i++)for(let j=0;j<12;j++)m.faces.push({v:[point(i/28,j/12),point((i+1)/28,j/12),point((i+1)/28,(j+1)/12),point(i/28,(j+1)/12)],c:[68+j*3,96+j*3,135+j*3],em:0,flex:0});}meshes.abyssRay=meshes.abyssRay.concat(m.faces);meshes.abyssRay.skin=true;
}

{
 const m=meshBuilder();m.ellipsoid(7,0,0,23,26,25,[56,79,66],0,32,20);for(const side of [-1,1]){m.tube([[18,side*22,-9],[0,side*27,-12],[-26,side*24,-15],[-48,side*19,-14]],4,[139,154,117]);m.ellipsoid(-12,side*20,-17,16,7,8,[83,173,129],.25,24,16);}meshes.laserSocket=m.faces;meshes.laserSocket.skin=true;
}

{
 const m=meshBuilder();m.ellipsoid(0,0,0,29,29,16,[71,88,104],0,28,18);m.ellipsoid(0,0,-16,15,15,5,[112,240,216],.6,20,14);for(const side of [-1,1]){m.wedge([side*23,-13,0],[side*155,-10,0],[side*155,12,0],10,[90,113,128]);m.wedge([side*23,-13,0],[side*155,12,0],[side*23,13,0],10,[106,126,137]);for(let i=0;i<6;i++){const x=side*(35+i*20);m.tube([[x,-12,-3],[x+side*8,12,-3]],2,[211,161,86]);}m.ellipsoid(side*151,0,-4,4,11,3,[255,141,86],.65,12,8);}meshes.gateRotor=m.faces;
}

// Expedition fauna and machinery: separate silhouettes, shared portable mesh pipeline.
function buildExpeditionModels(){
 function eye(m,x,y,z,r,color){const begin=m.faces.length;m.ellipsoid(x,y,z,r*1.3,r*1.15,r*.6,color,0,28,18);m.ellipsoid(x-1,y,z-r*.45,r,r*.88,r*.38,[204,191,129],0,32,20);m.ellipsoid(x-2,y,z-r*.76,r*.57,r*.72,r*.13,[91,163,142],.12,28,18);m.ellipsoid(x-2,y,z-r*.9,r*.15,r*.63,r*.06,[8,16,22],0,20,14);m.ellipsoid(x-r*.3,y-r*.27,z-r*.98,r*.13,r*.12,r*.04,[230,250,255],.25,12,8);for(let i=begin;i<m.faces.length;i++)m.faces[i].wet=1;}
 for(const [name,kind] of [['reefGlider',0],['reefCrab',1],['coreMoth',2],['corePolyp',3]]){const m=meshBuilder(),c=kind<2?[73,136,143]:[149,69,100];m.ellipsoid(0,0,0,kind===1?35:29,19,20,c,0,32,20);
  for(const side of [-1,1]){m.tube([[-20,side*12,-10],[-9,side*21,-16],[18,side*19,-14],[37,side*9,-8]],3,c.map(v=>v+35),.15);for(let j=0;j<5;j++){const x=-12+j*9;m.tube([[x,side*13,0],[x+13,side*(30+Math.sin(j)*10),-3],[x+29,side*(23+j*3),2]],2.2,c,.7);}
   if(kind===0||kind===2){for(let j=0;j<8;j++){const x=-20+j*6;m.wedge([x,side*12,0],[x+18,side*(43+Math.sin(j/7*Math.PI)*23),-4],[x+7,side*15,2],.8,c.map(v=>v+20));}}
  }eye(m,-17,-7,-19,8,c);for(let j=0;j<7;j++)m.ellipsoid(-10+j*7,8,-20,2,3,1,[102,235,209],.35,10,7);meshes[name]=m.faces;meshes[name].skin=true;
 }
 for(const [name,heavy] of [['stormRaptor',false],['stormCarrier',true]]){const m=meshBuilder();m.ellipsoid(7,0,0,heavy?49:39,heavy?25:12,16,[66,83,112],0,28,18);for(const side of [-1,1]){m.wedge([-56,side*17,-3],[43,side*(heavy?49:35),4],[17,side*7,-12],11,[97,108,137]);m.tube([[-45,side*19,-8],[8,side*22,-16],[40,side*31,-5]],2,[159,171,185]);m.ellipsoid(35,side*27,0,19,7,8,[41,54,78],0,20,14);m.ellipsoid(52,side*27,0,2,4,5,[174,153,255],.8,16,10);for(let i=0;i<6;i++)m.tube([[-22+i*10,side*12,-16],[-20+i*10,side*23,-12]],.8,[31,46,61]);}eye(m,-21,-3,-17,6,[51,68,84]);meshes[name]=m.faces;}
 // The reef monarch has a chambered shell, asymmetric huge eye, fins and feeding mouth.
 let m=meshBuilder();m.ellipsoid(14,0,0,59,58,43,[56,113,120],0,48,30);for(let i=0;i<16;i++){const a=i/16*Math.PI*2;m.tube([[14+Math.cos(a)*48,Math.sin(a)*48,-19],[14+Math.cos(a)*35,Math.sin(a)*35,-38],[14+Math.cos(a)*18,Math.sin(a)*18,-45]],2.3,[144,168,152]);}m.ellipsoid(-33,4,-4,35,33,33,[85,137,139],0,40,26);eye(m,-31,-18,-28,19,[91,148,151]);for(const side of [-1,1]){m.tube([[-23,side*23,3],[12,side*72,8],[73,side*64,3],[109,side*32,8]],8,[76,145,146],.7);m.tube([[-54,side*15,0],[-72,side*32,-6],[-39,side*45,-10]],5,[172,185,149],.6);}meshes.reefMonarch=m.faces;meshes.reefMonarch.skin=true;
 m=meshBuilder();m.ellipsoid(0,0,0,56,45,30,[42,57,83],0,36,24);for(const side of [-1,1]){m.wedge([-45,side*26,-8],[57,side*85,0],[72,side*24,-24],15,[98,112,135]);for(let i=0;i<6;i++){m.tube([[-22+i*14,side*20,-28],[-12+i*14,side*42,-22]],2,[168,177,183]);m.ellipsoid(37,side*(45+i*3),-4,24,3,4,[61,74,100],0,16,10);}m.tube([[-38,side*40,0],[-75,side*40,0]],8,[105,123,145]);}m.ellipsoid(-15,0,-31,27,27,9,[28,39,64],0,32,22);m.ellipsoid(-15,0,-40,19,19,4,[151,149,255],.6,32,22);meshes.stormRegent=m.faces;
 m=meshBuilder();for(let i=0;i<24;i++){const a=i/24*Math.PI*2,b=(i+1)/24*Math.PI*2;m.tube([[0,Math.cos(a)*70,Math.sin(a)*70],[0,Math.cos(b)*70,Math.sin(b)*70]],3,[145,157,176]);if(i%3===0)m.ellipsoid(0,Math.cos(a)*70,Math.sin(a)*70,8,6,6,[158,133,255],.65,16,10);}meshes.regentRing=m.faces;
 m=meshBuilder();m.ellipsoid(10,0,0,75,48,42,[119,47,76],0,48,30);m.ellipsoid(-33,1,-5,43,39,33,[157,76,99],0,40,26);for(const side of [-1,1]){for(let i=0;i<6;i++){const x=-3+i*13;m.tube([[x,side*12,-39],[x+8,side*34,-28],[x+3,side*49,-2]],3,[189,128,124]);m.ellipsoid(x,side*22,-33,5,7,4,[223,147,115],.15,16,12);}m.tube([[41,side*17,0],[79,side*47,-6],[130,side*24,3],[156,side*57,5]],9,[138,55,92],.8);eye(m,-33,side*19,-31,13,[153,79,105]);}meshes.progenitor=m.faces;meshes.progenitor.skin=true;
 // Articulated jaws, with a real dark cavity and interleaved teeth.
 m=meshBuilder();m.ellipsoid(0,0,0,7,25,21,[15,12,24],0,36,24);for(let i=0;i<20;i++){const a=i/20*Math.PI*2,y=Math.cos(a),z=Math.sin(a);m.tube([[0,y*26,z*23],[-7,y*28,z*24],[-15,y*23,z*20]],3,[143,84,98]);m.wedge([-15,y*22,z*19],[-24,y*14,z*12],[-13,y*17,z*18],2,[226,211,172]);}meshes.feedingMaw=m.faces;meshes.feedingMaw.skin=true;
 m=meshBuilder();eye(m,0,0,0,13,[102,141,119]);meshes.bossEye=m.faces;meshes.bossEye.skin=true;
 m=meshBuilder();m.ellipsoid(0,0,0,17,14,5,[91,131,108],0,32,20);meshes.bossLid=m.faces;meshes.bossLid.skin=true;
}
buildExpeditionModels();

// Secondary anatomy and armor break up broad surfaces at boss scale.
{
 const m=meshBuilder();for(const side of [-1,1]){for(let row=0;row<3;row++)for(let i=0;i<5;i++){const x=-15+i*14,y=side*(24+row*12),z=-31+row*2;m.wedge([x,y,z],[x+10,y+side*5,z],[x+10,y+side*12,z+2],2,[75+row*13,92+row*11,119+row*8]);m.tube([[x+2,y+side*4,z-1],[x+8,y+side*7,z-1]],.7,[180,166,131]);}for(let i=0;i<6;i++)m.ellipsoid(-33+i*13,side*19,-31,2.5,2,2,[96,204,234],.5,12,8);m.tube([[-45,side*25,-24],[-33,side*39,-29],[1,side*47,-25],[37,side*63,-18]],2.3,[52,67,82]);m.tube([[-42,side*25,-27],[-28,side*37,-31],[5,side*43,-27],[38,side*57,-21]],.8,[213,173,102]);}
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2;m.ellipsoid(-15+Math.cos(a)*29,Math.sin(a)*29,-36,3,3,3,[131,151,173],0,12,8);}meshes.stormRegent=meshes.stormRegent.concat(m.faces);
 for(const f of meshes.regentRing)for(const v of f.v){const [x,y,z]=v;v[0]=y;v[1]=z;v[2]=x-25;}
 for(const [name,color,rows] of [['reefMonarch',[79,142,148],9],['progenitor',[140,70,96],12]]){const skin=meshBuilder();for(let i=0;i<rows;i++){const x=-5+i*6;for(const side of [-1,1]){skin.tube([[x,side*8,-42],[x+3,side*19,-40],[x-1,side*33,-32]],.9,color.map(v=>v*.75));skin.tube([[x+2,side*15,-42],[x+9,side*19,-40]],.55,color.map(v=>v*.6));if(i%2===0)skin.ellipsoid(x,side*32,-31,4,3,2,color,0,14,10);}}
 for(const side of [-1,1]){skin.tube([[-53,side*18,-25],[-45,side*32,-28],[-26,side*37,-23],[-8,side*29,-27]],4,color);skin.tube([[-46,side*30,-26],[-36,side*47,-20],[-13,side*52,-16]],3,[196,181,148]);}meshes[name]=meshes[name].concat(skin.faces);meshes[name].skin=true;}
}

// Craggy mineral volumes for the orbital approach; no unsupported city towers.
{
 const m=meshBuilder();m.ellipsoid(0,0,0,50,50,35,[102,114,121],0,40,28);
 for(const f of m.faces){for(const v of f.v){const n=1+.095*Math.sin(v[0]*.19+v[1]*.12)*Math.cos(v[2]*.23)+.045*Math.sin(v[0]*.6-v[1]*.45);for(let k=0;k<3;k++)v[k]*=n;}const [x,y,z]=f.v[0],grain=Math.sin(x*.28+y*.31+z*.2)*.14;f.c=[80,88,91];}
 meshes.orbitalRock=m.faces;meshes.orbitalRock.rock=true;
}

// Closed anatomical lofts replace chains of intersecting spherical primitives.
// profile: longitudinal position, vertical radius, lateral radius, vertical centre.
function anatomicalLoft(m,profile,color){
 const steps=(profile.length-1)*5,segments=32;
 const at=(u,a)=>{const i=Math.min(profile.length-2,Math.floor(u)),t=u-i,p=profile[i],q=profile[i+1],before=profile[Math.max(0,i-1)],after=profile[Math.min(profile.length-1,i+2)],sample=k=>.5*(2*p[k]+(-before[k]+q[k])*t+(2*before[k]-5*p[k]+4*q[k]-after[k])*t*t+(-before[k]+3*p[k]-3*q[k]+after[k])*t*t*t),ry=Math.max(.15,sample(1)),rz=Math.max(.15,sample(2)),cy=sample(3),x=p[0]+(q[0]-p[0])*t,c=Math.cos(a),sn=Math.sin(a);return[x,cy+Math.sign(c)*Math.pow(Math.abs(c),.76)*ry,sn*rz];};
 for(let i=0;i<steps;i++)for(let j=0;j<segments;j++){const a=j/segments*Math.PI*2,b=(j+1)/segments*Math.PI*2,u=i/5,v=(i+1)/5,shade=1+.025*Math.sin(i*.7+j*.6);m.faces.push({v:[at(u,a),at(v,a),at(v,b),at(u,b)],c:color.map(n=>Math.round(n)),em:0,flex:0});}
 for(const [u,reverse] of [[0,true],[profile.length-1,false]]){const ring=Array.from({length:segments},(_,j)=>at(u,j/segments*Math.PI*2));m.faces.push({v:reverse?ring.reverse():ring,c:color.map(n=>Math.round(n)),em:0,flex:0});}
}
function recessedEye(m,x,y,z,side,skin,size=3.2){
 const begin=m.faces.length;
 // A small dark cornea sits below the supraorbital ridge, not on a stalk.
 m.ellipsoid(x,y,z,size*1.35,size*.65,1.1,[18,23,21],0,20,12);
 m.ellipsoid(x-.2,y,z+side*.7,size*.58,size*.45,.65,[108,103,68],0,18,12);
 m.ellipsoid(x-.4,y,z+side*1.2,size*.18,size*.4,.25,[7,12,12],0,12,8);
 m.tube([[x-5,y-1,z-side*.6],[x-2,y-3,z],[x+4,y-2,z-side*.5],[x+7,y+1,z-side*2]],1.7,skin);
 m.tube([[x-4,y+1.4,z],[x,y+2,z],[x+5,y+1.4,z-side]],.8,skin.map(n=>n*.7));
 for(let i=begin;i<m.faces.length;i++){const f=m.faces[i];f.eyeCenter=[x,y,z];f.rest=f.v.map(v=>v.slice());}
}
function animateAnatomicalSkin(mesh,age){const blink=naturalBlink(age,1.4);for(const f of mesh)if(f.eyeCenter)for(let i=0;i<f.v.length;i++){const q=f.rest[i];f.v[i][0]=q[0];f.v[i][1]=f.eyeCenter[1]+(q[1]-f.eyeCenter[1])*(1-blink*.92);f.v[i][2]=q[2];}mesh.dynamic=true;}
// A wyvern silhouette: continuous neck, long jaw, flight muscles and finger-supported membranes.
function buildDragonBoss(reef=false){
 const m=meshBuilder(),skin=reef?[49,87,96]:[81,58,58],bone=reef?[74,108,111]:[101,84,76];
 anatomicalLoft(m,[[-108,2,3,-12],[-100,5,8,-14],[-81,7,12,-17],[-65,14,18,-20],[-45,15,18,-16],[-25,18,20,-6],[5,26,25,1],[38,23,21,4],[61,8,11,5]],skin);
 // Jawline, cheek tendon and nostril recesses follow the skull surface.
 for(const side of [-1,1]){
 recessedEye(m,-61,-25,side*17,side,skin,reef?3:3.5);
 m.tube([[-104,-8,side*5],[-83,-8,side*11],[-62,-7,side*17],[-47,-13,side*16]],.9,[22,25,25]);
 m.tube([[-77,-5,side*10],[-59,0,side*17],[-40,5,side*18]],2.2,skin.map(n=>n*.78));
 m.ellipsoid(-97,-17,side*7,2.1,.75,.5,[21,28,28],0,12,8);
 for(let i=0;i<5;i++)m.tube([[-97+i*7,-8,side*(7+i*1.5)],[-96+i*7,-4,side*(7+i*1.5)]],.8,[151,145,122]);
 }
 for(const side of [-1,1]){
 m.tube([[-47,-27,side*11],[-36,-37,side*15],[-17,-35,side*17]],3.5,skin);
 m.tube([[31,12,side*12],[46,33,side*15],[25,42,side*18]],8,skin);
 for(let i=0;i<3;i++)m.tube([[25,41,side*(13+i*4)],[12,45,side*(14+i*4)],[8,39,side*(15+i*4)]],2.5,bone);
 }
 m.tube([[45,2,0],[72,7,0],[100,2,1],[128,15,2],[155,8,1]],14,skin,.6);
 if(reef)m.wedge([-68,-28,-2],[-34,-45,0],[-13,-16,2],3,skin);
 if(!reef)for(const [x,y] of [[-22,-24],[-6,-25],[10,-23],[26,-19],[42,-13],[56,-5]])m.wedge([x-7,y+5,-1],[x+4,y-9,0],[x+14,y+7,1],2,skin.map(n=>Math.round(n*1.08)));
 // Overlapping flank scales, aligned with the musculature rather than disconnected lumps.
 for(let row=0;row<5;row++)for(let i=0;i<12;i++){const x=-30+i*7+row%2*3,y=-15+row*7,z=-23*Math.sqrt(Math.max(.1,1-y*y/900));m.tube([[x-2,y-1,z],[x,y,z-.2],[x+3,y-1,z]],.23,skin.map(n=>Math.round(n*.85)));}
 if(!reef)for(const f of m.faces){f.v=f.v.map(v=>{const q=v.slice(),weight=Math.max(0,1-Math.abs(q[0]-2)/67);q[1]+=weight*(q[1]>0?5:-3);q[2]*=1+weight*.2;return q;});if(f.eyeCenter)f.rest=f.v.map(v=>v.slice());}
 meshes[reef?'reefMonarch':'progenitor']=m.faces;m.faces.skin=true;
 const jaw=meshBuilder();anatomicalLoft(jaw,[[-106,1,3,-6],[-96,2.5,7,-5],[-74,4,12,-3],[-51,5,16,-7]],skin.map(n=>Math.round(n*.84)));jaw.faces.skin=true;jaw.faces.dynamic=true;for(const f of jaw.faces)f.rest=f.v.map(v=>v.slice());meshes[reef?'monarchJaw':'motherJaw']=jaw.faces;
 const w=meshBuilder();
 for(const side of [-1,1]){
 const root=[-5,side*13,2],elbow=[0,side*58,5],wrist=[-29,side*91,9];
 w.tube([root,elbow,wrist],5.5,skin);
 const tips=[[-55,side*119,6],[5,side*128,12],[56,side*106,14],[83,side*65,10]];
 for(let n=0;n<tips.length;n++){
 const tip=tips[n],end=n===tips.length-1?[44,side*17,3]:tips[n+1];w.tube([wrist,tip],2.5,bone);
 // Curved, tessellated membrane between each pair of supporting fingers.
 const point=(u,v)=>{const edge=tip.map((a,j)=>a*(1-v)+end[j]*v),inset=Math.sin(v*Math.PI)*u*u*.09;return wrist.map((a,j)=>a*(1-u+inset)+edge[j]*(u-inset)+(j===2?Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*7:0));};
 for(let a=0;a<16;a++)for(let b=0;b<12;b++)w.faces.push({v:[point(a/16,b/12),point((a+1)/16,b/12),point((a+1)/16,(b+1)/12),point(a/16,(b+1)/12)],c:reef?[43+b,78+b,88+b]:[82+b,53+b,53+b],em:0,flex:0});
 }
 }
 meshes[reef?'pteroWings':'dragonWings']=w.faces;w.faces.skin=true;w.faces.dynamic=true;
 for(const f of w.faces){f.v=f.v.map(([x,y,z])=>[x,z,y]);f.rest=f.v.map(v=>v.slice());}
}
function animateDragonWings(age,reef=false){
 const rate=reef?2.9:1.9,phase=age*rate,beat=Math.sin(phase),stroke=-.12+beat*.78;
 for(const f of meshes[reef?'pteroWings':'dragonWings'])for(let i=0;i<f.v.length;i++){
 const [x,y,z]=f.rest[i],side=Math.sign(z)||1,span=Math.max(0,Math.abs(z)-13),elbow=Math.max(0,span-45),fold=Math.max(0,Math.cos(phase-.45))*.3;
 const wristAngle=stroke+fold,inner=Math.min(span,45),outer=Math.max(0,span-45);
 f.v[i][0]=x+elbow*fold*.5;
 f.v[i][1]=y+inner*Math.sin(stroke)+outer*Math.sin(wristAngle)+Math.sin(phase-span*.018)*outer*.05;
 f.v[i][2]=side*(13+inner*Math.cos(stroke)+outer*Math.cos(wristAngle));
 }
}
buildDragonBoss();buildDragonBoss(true);

// Continuous sculpted surfaces for the opening bosses; details sit within the skin/hull.
function buildOpeningBosses(){
 function loft(m,profile,color,organic=true){
 const sample=(u,a)=>{const k=Math.min(profile.length-2,Math.floor(u)),t=u-k,p=profile[k],q=profile[k+1],smooth=t*t*(3-2*t),x=p[0]+(q[0]-p[0])*t,ry=p[1]+(q[1]-p[1])*smooth,rz=p[2]+(q[2]-p[2])*smooth,cy=p[3]+(q[3]-p[3])*smooth,wrinkle=organic?1+.012*Math.sin(a*13+x*.21):1;return[x,cy+Math.cos(a)*ry*wrinkle,Math.sin(a)*rz*wrinkle];};
 const rows=(profile.length-1)*8;for(let i=0;i<rows;i++)for(let j=0;j<48;j++){const u=i/8,v=(i+1)/8,a=j/48*Math.PI*2,b=(j+1)/48*Math.PI*2;m.faces.push({v:[sample(u,a),sample(v,a),sample(v,b),sample(u,b)],c:color.map(n=>Math.round(n)),em:0,flex:0});}
 }
 function eye(m,x,y,z,size,c){m.ellipsoid(x,y,z,size*1.4,size*.8,size*.42,c,0,24,16);m.ellipsoid(x-1,y,z-size*.26,size,size*.59,size*.26,[152,160,103],0,28,18);m.ellipsoid(x-2,y,z-size*.48,size*.32,size*.5,size*.06,[5,12,15],0,24,16);m.ellipsoid(x-3,y-size*.18,z-size*.55,size*.12,size*.1,size*.04,[194,222,209],.1,12,8);}
 let m=meshBuilder(),c=[54,81,72];loft(m,[[-60,3,4,5],[-48,20,17,3],[-28,29,27,0],[3,38,33,0],[38,33,29,0],[69,15,17,2],[91,1,2,4]],c);
 eye(m,-35,-15,-22,7,c);eye(m,-35,15,-22,6,c);
 for(const side of [-1,1]){for(let i=0;i<7;i++){const x=-8+i*8;m.tube([[x,side*18,-27],[x+3,side*25,-24],[x+5,side*31,-18]],.7,[30,48,46]);}
 m.tube([[-51,side*12,-5],[-46,side*23,-17],[-23,side*30,-19]],4,c);
 for(let n=0;n<3;n++)m.tube([[44,side*(15+n*5),4],[75,side*(24+n*5),5],[112,side*(18+n*5),8],[137,side*(24+n*4),6]],5-n*.8,c,.55);}
 meshes.hiveHead=m.faces;meshes.hiveHead.skin=true;meshes.hiveTendrils=[];
 m=meshBuilder();c=[61,69,88];anatomicalLoft(m,[[-68,2,4,5],[-56,8,13,2],[-34,19,22,0],[2,29,28,0],[41,22,21,1],[77,10,12,3],[118,1,2,8]],c);for(const side of [-1,1]){recessedEye(m,-36,-9,side*21,side,c,2.7);m.tube([[-64,7,side*5],[-48,9,side*15],[-29,6,side*21]],.8,[24,29,34]);}
 for(const side of [-1,1])for(let n=0;n<4;n++){const x=-23+n*5;m.tube([[x,-4,side*25],[x+2,3,side*26],[x+1,10,side*24]],.65,[27,33,40]);}
 meshes.voidLeviathan=m.faces;meshes.voidLeviathan.skin=true;
 const lower=meshBuilder();anatomicalLoft(lower,[[-67,1,3,8],[-55,2,10,10],[-32,4,18,10]],c.map(n=>Math.round(n*.87)));lower.faces.skin=true;lower.faces.dynamic=true;for(const f of lower.faces)f.rest=f.v.map(v=>v.slice());meshes.sovereignJaw=lower.faces;
 const fins=meshBuilder();for(const side of [-1,1]){const point=(u,v)=>{const span=Math.sin(u*Math.PI)*65;return[-39+u*142,side*(14+span*v),4+Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*7];};for(let i=0;i<36;i++)for(let j=0;j<18;j++)fins.faces.push({v:[point(i/36,j/18),point((i+1)/36,j/18),point((i+1)/36,(j+1)/18),point(i/36,(j+1)/18)],c:[65,78,96],em:0,flex:0});for(let i=1;i<12;i++){const u=i/12;fins.tube([point(u,0),point(u,.5),point(u,1)],.65,[87,102,117]);}}
 meshes.sovereignFins=fins.faces;meshes.sovereignFins.skin=true;meshes.sovereignFins.dynamic=true;for(const f of fins.faces){f.v=f.v.map(([x,y,z])=>[x,z,y]);f.rest=f.v.map(v=>v.slice());}
 m=meshBuilder();loft(m,[[-70,5,12,0],[-58,25,24,0],[-28,37,34,0],[30,39,34,0],[63,26,27,0],[80,9,13,0]],[65,74,82],false);
 for(const side of [-1,1]){loft(m,[[-48,9,14,side*47],[-34,16,19,side*47],[47,16,19,side*47],[69,8,13,side*47]],[47,56,65],false);for(let i=0;i<12;i++){const x=-27+i*6;m.tube([[x,side*34,-25],[x,side*44,-30],[x,side*57,-22]],1.25,[93,102,106]);}m.tube([[-68,side*23,-14],[-33,side*28,-30],[29,side*29,-31],[55,side*20,-24]],3,[91,100,106]);for(let i=0;i<6;i++)m.ellipsoid(-25+i*10,side*22,-33,2.5,1,1,[190,130,64],.25,10,6);}
 for(let i=0;i<8;i++){const x=-33+i*10;m.tube([[x,-15,-33],[x,15,-33]],.6,[25,32,40]);m.ellipsoid(x,-1,-35,3,5,1,[33,42,50],0,10,8);}
 meshes.cathedral=m.faces;
}
buildOpeningBosses();


for(const f of meshes.armRoot)f.c=[43,49,38];

// A closed, volumetric predator. Its articulated parts share real skin geometry;
// no atlas plane or camera-facing artwork is used for the Warden.
function buildWardenCreature(){
 const all=[],parts=[];
 function part(name,pivot,build){const m=meshBuilder();build(m);const points=new Map();for(const f of m.faces){f.v=f.v.map(v=>{const key=v.map(n=>n.toFixed(5)).join(',');if(!points.has(key))points.set(key,{v,rest:v.slice()});return points.get(key).v;});all.push(f);}parts.push({name,pivot,points:[...points.values()]});}
 const hide=[77,91,81],armor=[102,115,98],dark=[38,48,43],ivory=[148,145,124];
 part('body',[0,0,0],m=>{
 anatomicalLoft(m,[[-109,2,4,1],[-99,5,9,-2],[-82,8,14,-5],[-61,16,21,-4],[-38,19,22,-1],[-12,27,29,0],[22,25,26,2],[54,15,17,3],[77,5,7,3]],hide);
 for(const [x,y] of [[-25,-20],[-8,-25],[9,-24],[26,-20],[42,-13]])m.wedge([x-7,y+4,0],[x+4,y-8,0],[x+14,y+6,0],2.5,armor);
 for(const side of [-1,1]){
 m.tube([[-91,-8,side*11],[-74,-17,side*18],[-54,-17,side*20],[-31,-23,side*22]],2.2,armor);
 recessedEye(m,-70,-12,side*20,side,hide,3.4);
 for(let i=0;i<7;i++){const x=-100+i*6;m.tube([[x,5,side*9],[x-1,9,side*8]],.9,ivory);}
 for(let i=0;i<9;i++){const x=-28+i*10;m.tube([[x,-7,side*24],[x+6,3,side*28],[x+12,12,side*22]],.45,[61,76,64]);}
 }
 });
 // Actual eyelid volumes slide over the eyes; their depth follows the skull.
 for(const side of [-1,1])for(const upper of [-1,1])part('lid:'+side+':'+upper,[-70,-12,side*20],m=>{m.ellipsoid(-70,-12+upper*3,side*21.5,4.3,1.5,1.1,hide,0,18,10);});
 part('throat',[-70,8,0],m=>{anatomicalLoft(m,[[-102,1,3,5],[-83,3,10,6],[-61,5,14,6]],[31,27,26]);});
 part('jaw',[-54,7,0],m=>{anatomicalLoft(m,[[-107,1,3,7],[-95,2.5,8,9],[-75,4,13,10],[-52,6,17,7]],[79,88,70]);for(const side of [-1,1])for(let i=0;i<6;i++)m.tube([[-99+i*7,11,side*9],[-98+i*7,5,side*8]],.9,ivory);});
 part('tail',[50,0,0],m=>{anatomicalLoft(m,[[49,14,17,3],[75,12,13,4],[103,8,9,7],[132,5,6,4],[160,2.7,3,-7],[186,.2,.2,-14]],hide);for(const [x,y] of [[68,-6],[89,0],[110,2],[131,3]])m.wedge([x-4,y+3,0],[x+5,y-5,0],[x+13,y+3,0],1.2,armor);});
 for(const side of [-1,1])for(let i=1;i<2;i++){const root=[-12+i*43,10,side*20];part('limb'+i+':'+side,root,m=>{m.tube([root,[root[0]+6,34,side*39],[root[0]+34,49,side*58],[root[0]+59,35,side*71]],8-i,hide);m.tube([[root[0]+32,47,side*55],[root[0]+57,53,side*66],[root[0]+79,39,side*76]],3,ivory);m.ellipsoid(root[0]+7,29,side*34,12,16,9,armor,0,16,10);});}
 for(const side of [-1,1])part('wing:'+side,[-12,0,side*20],m=>{
 const root=[-12,0,side*20],edge=[[-30,-8,side*62],[-24,-4,side*126],[26,12,side*116],[76,23,side*86],[42,8,side*24]],outline=[root,...edge];
 for(let j=0;j<outline.length;j++){const a=outline[j],b=outline[(j+1)%outline.length];m.faces.push({v:[[a[0],a[1]-1,a[2]],[b[0],b[1]-1,b[2]],[b[0],b[1]+1,b[2]],[a[0],a[1]+1,a[2]]],c:[71,104,95],em:0,flex:0});}
 for(let panel=0;panel<edge.length-1;panel++)for(const sign of [-1,1]){
 const point=(u,v)=>{const a=edge[panel],b=edge[panel+1],edgePoint=a.map((n,k)=>n*(1-v)+b[k]*v),scallop=Math.sin(v*Math.PI)*u*u*.09;return root.map((n,k)=>n+(edgePoint[k]-n)*(u-scallop)+(k===1?sign*.5+Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*5:0));};
 for(let i=0;i<10;i++)for(let j=0;j<8;j++){let vertices=[point(i/10,j/8),point((i+1)/10,j/8),point((i+1)/10,(j+1)/8),point(i/10,(j+1)/8)];if(sign<0)vertices.reverse();m.faces.push({v:vertices,c:sign<0?[82,104,89]:[71,87,77],em:0,flex:0});}
 }
 m.tube([root,edge[0],edge[1]],5,armor);for(let j=2;j<edge.length;j++)m.tube([root,[edge[j][0]*.5,edge[j][1]*.5,side*60],edge[j]],1.6,armor);
 for(let j=0;j<4;j++){const t=(j+1)/5;m.tube([[root[0]+t*40,5,side*(22+t*65)],[25+t*28,14,side*(85+t*15)],[50+t*19,19,side*(99-t*10)]],.65,[138,169,128]);}
 });
 all.skin=true;all.dynamic=true;all.parts=parts;meshes.wardenCreature=all;
}
buildWardenCreature();


meshes.cathedral.industrial=true;meshes.stormRegent.industrial=true;

function animateSovereignFins(age){for(const f of meshes.sovereignFins)for(let i=0;i<f.v.length;i++){const [x,y,z]=f.rest[i],side=Math.sign(z)||1,span=Math.max(0,Math.abs(z)-14),wave=Math.sin(age*2.1-x*.036);f.v[i][0]=x;f.v[i][1]=y+wave*span*.55;f.v[i][2]=side*(14+span*(1-Math.abs(wave)*.08));}}

// Tag complete eye apertures once; instances animate in the vertex shader, never
// by mutating a shared enemy mesh. Primitive colours identify authored pupils.
(function prepareOrganicBlinks(){
 const pupils=new Set(['14,33,26','21,24,35','9,18,21','15,20,33','12,22,22','12,22,26','12,30,31','12,40,37','14,24,45','5,15,28','8,18,26','8,16,22','5,12,15']);
 for(const mesh of Object.values(meshes)){
  if(!mesh.skin||mesh.dynamic)continue;
  const primitives=[...new Set(mesh.map(f=>f.primitive).filter(Boolean))];
  const eyes=primitives.filter(p=>pupils.has(p.color.join(',')));
  for(const f of mesh){const p=f.primitive;if(!p)continue;
   const eye=eyes.find(e=>Math.abs(p.center[1]-e.center[1])<2 && Math.hypot(p.center[0]-e.center[0],p.center[2]-e.center[2])<12 && Math.max(...p.radii)<16);
   if(eye)f.blink=[eye.center[1],eye.center[0]*.013+eye.center[1]*.021];
  }
 }
})();

// Depth-specific command creatures and escort craft, sharing retained base geometry.
(function buildEscortLeaders(){
 const specs=[['forgeMarshal','forgeBarge',false,[117,151,165]],['abyssShepherd','abyssRay',true,[57,154,177]],['reefHerald','reefCrab',true,[180,125,88]],['stormConductor','stormCarrier',false,[109,126,179]],['coreHarvester','corePolyp',true,[153,69,112]]];
 for(const [name,base,organic,color] of specs){
  const m=meshBuilder();
  for(const side of [-1,1]){
   if(organic){m.tube([[-5,side*16,-10],[12,side*36,-17],[43,side*45,-14],[64,side*27,-8]],3.5,color,1);m.wedge([0,side*15,-6],[27,side*43,-12],[48,side*20,-7],2,color);}
   else{m.wedge([-18,side*15,-5],[8,side*39,-12],[43,side*20,-2],6,color);m.tube([[14,side*24,-12],[41,side*24,-12]],3,[45,64,83]);m.ellipsoid(43,side*24,-12,2,3,3,[113,232,255],.5,10,6);}
  }
  meshes[name]=meshes[base].concat(m.faces);meshes[name].skin=organic;
 }
})();

// A new furnace-dwelling species: narrow jaw, plated thorax, four hinged
// flight membranes and ventral claws. No standard enemy faces are reused.
(function buildFurnaceMantis(){
 function creature(small){const m=meshBuilder(),shell=small?[138,112,60]:[91,104,78],rim=[167,146,89],hide=[65,77,63];
  m.ellipsoid(5,0,0,small?24:42,small?9:18,small?8:17,hide,0,24,14);
  for(let i=0;i<4;i++){const x=-9+i*12;m.wedge([x-10,-13,-9],[x+13,0,-23+i],[x-10,13,-9],12,i%2?shell:rim);}
  m.ellipsoid(-31,0,0,19,10,10,shell,0,24,14);
  for(const side of [-1,1]){
   m.tube([[-36,side*5,-4],[-55,side*13,-7],[-66,side*6,-6]],3,rim);
   m.tube([[-33,side*7,2],[-45,side*18,3],[-58,side*12,1]],1.8,hide);
   const start=m.faces.length;
   m.ellipsoid(-35,side*6,-9,4.7,3.7,3.2,[186,130,54],.1,16,10);
   m.ellipsoid(-37,side*6,-11.5,1.1,2.8,1.1,[9,18,21],0,12,8);
   for(let j=start;j<m.faces.length;j++)m.faces[j].blink=[side*6,side*.17];
   for(let i=0;i<(small?1:2);i++){
    const x=i*25,start=m.faces.length;
    m.wedge([x-10,side*10,0],[x+14,side*(small?30:54),-7],[x+43,side*19,2],2,[114+i*20,91,55]);
    m.tube([[x-10,side*10,0],[x+14,side*(small?30:54),-7],[x+43,side*19,2]],1.5,rim,1);
    for(let j=start;j<m.faces.length;j++)m.faces[j].flex=1;
    m.tube([[x,side*9,6],[x+3,side*20,23],[x+21,side*13,29]],2.2,hide,.6);
   }
  }
  m.tube([[33,0,0],[56,0,5],[72,0,1]],5,shell,.5);
  m.faces.skin=true;return m.faces;
 }
 meshes.furnaceMantis=creature(false);meshes.emberMite=creature(true);
 const d=meshBuilder();d.ellipsoid(0,0,0,19,6,7,[103,131,153],0,18,10);d.ellipsoid(6,-2,-6,8,3,3,[49,195,212],.25,14,8);
 for(const side of [-1,1]){d.wedge([10,side*3,0],[-16,side*16,3],[-10,side*4,-3],3,[119,107,170]);d.tube([[-15,side*6,2],[9,side*6,2],[21,side*6,2]],1.5,[166,191,202]);}
 meshes.wingmate=d.faces;
})();

// Concept-led fauna. Closed lofts, layered shells and locally rigged appendages.
// Reference sheets and species/habitat notes live in design/fauna/.
const faunaCatalog={};
let buildFaunaMesh;
// Joint modes: flap, claw, fin, spine, bell, jaw, feeler, turbine.
// Matched by speciesJoint in the GPU shader; all pivots remain fixed.
function faunaJointVertex(p,age,joint){
 if(!joint||!joint[3])return p;const [px,py,pz,mode]=joint,x=p[0]-px,y=p[1]-py,z=p[2]-pz,side=pz<0?-1:1,w=Math.min(1,Math.hypot(x,y,z)/35);
 let a,axis='xy';
 if(mode===1||mode===3||mode===8){axis='yz';a=mode===8?age*18:side*Math.sin(age*(mode===1?14:5)+px*.03)*(mode===1?.62:.38);}
 else if(mode===4){a=Math.sin(age*6-Math.max(0,x)*.045)*Math.min(1,Math.max(0,x)/85)*.27;axis='xz';}
 else if(mode===5){const pulse=Math.pow((1+Math.cos(age*4.8))*.5,4),falloff=Math.min(1,Math.abs(x)/45);return[px+x+3*pulse*falloff,py+y*(1-.14*pulse*falloff),pz+z*(1-.14*pulse*falloff)];}
 else if(mode===6)a=.08+Math.pow((1+Math.sin(age*3))*.5,3)*.32;
 else if(mode===7){a=Math.sin(age*9-w*3+px*.09+pz*.07)*w*.34;axis='xz';}
 else a=Math.sin(age*9+px*.09+pz*.07)*w*.28;
 const c=Math.cos(a),sn=Math.sin(a);
 if(axis==='yz')return[p[0],py+y*c-z*sn,pz+y*sn+z*c];
 if(axis==='xz')return[px+x*c-z*sn,p[1],pz+x*sn+z*c];
 return[px+x*c-y*sn,py+x*sn+y*c,p[2]];
}
(function buildConceptFauna(){
 const tint=(c,n)=>c.map(v=>Math.max(0,Math.min(255,Math.round(v*n))));
 function build(spec){
  const m=meshBuilder(),skin=spec.color,accent=spec.accent,small=spec.small||1,air=spec.habitat==='air',tentacles=spec.form==='tendril',crab=spec.form==='crab',winged=spec.form==='moth'||air,ray=spec.form==='ray',head=-28;
  function mark(start,joint){for(let i=start;i<m.faces.length;i++)m.faces[i].joint=joint;}
  function tube(points,r,c,joint){const start=m.faces.length;m.tube(points,r,c,0,0,spec.planet?6:8,2);if(joint)mark(start,joint);}
  function loft(profile,color,sides=20){const rings=[];for(let j=0;j<profile.length-1;j++)for(let k=0;k<(spec.planet?3:4);k++){const t=k/(spec.planet?3:4),q=profile[j].map((v,i)=>{const a=profile[Math.max(0,j-1)][i],b=v,c=profile[j+1][i],d=profile[Math.min(profile.length-1,j+2)][i];return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)}),ring=[];for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,relief=1+.022*Math.cos(a*5+q[0]*.2);ring.push([q[0],q[1]+Math.cos(a)*q[3]*relief,q[2]+Math.sin(a)*q[4]*relief]);}rings.push(ring);}const q=profile.at(-1);rings.push(Array.from({length:sides},(_,i)=>[q[0],q[1]+Math.cos(i/sides*Math.PI*2)*q[3],q[2]+Math.sin(i/sides*Math.PI*2)*q[4]]));
   for(let j=0;j<rings.length-1;j++)for(let i=0;i<sides;i++)m.faces.push({v:[rings[j][i],rings[j][(i+1)%sides],rings[j+1][(i+1)%sides],rings[j+1][i]],c:tint(color,.92+.08*Math.sin(j*.72+i*.48)),em:0,flex:0});m.faces.push({v:rings[0].slice().reverse(),c:color,em:0,flex:0},{v:rings.at(-1),c:color,em:0,flex:0});
  }
  const thick=(crab?23:ray?10:tentacles?17:spec.form==='scarab'?20:12)*(spec.girth||1);
  const bodyShape=spec.bodyPlan,profile=bodyShape==='lance'?[[-52,0,0,1,2],[-31,-2,0,7,8],[-8,-2,0,12,12],[17,1,0,9,10],[49,3,0,2,3],[61,3,0,.3,.5]]:bodyShape==='shield'?[[-40,0,0,2,3],[-27,-2,0,12,15],[-13,-3,0,25,26],[8,1,0,24,24],[28,3,0,10,11],[43,4,0,.4,.5]]:bodyShape==='hammer'?[[-43,0,0,3,8],[-32,-1,0,10,30],[-24,-2,0,13,29],[-12,0,0,10,13],[19,2,0,12,14],[43,3,0,1,2]]:null;
  if(profile)loft(profile,skin,24);else loft([[-41,0,0,2,3],[-32,-1,0,8,10],[-19,-2,0,thick*.8,thick],[0,0,0,thick,thick],[22,2,0,thick*.7,thick*.8],[39,3,0,5,7],[49,3,0,.3,.5]],tint(skin,.72));
  // One continuous cephalothorax shield; segmentation belongs to the tapering abdomen.
  if(!ray&&!tentacles&&!profile){
   loft([[-31,-2,0,5,8],[-22,-3,0,thick*.8,thick*.95],[-8,-3,0,thick*1.07,thick*1.15],[9,-1,0,thick,thick*1.1],[18,1,0,thick*.65,thick*.8]],skin,24);
   for(let i=0;i<4;i++){const x=12+i*7,r=thick*(.74-i*.14);loft([[x,2,0,r*.87,r],[x+2,1,0,r,r*1.08],[x+7,2,0,r*.84,r*.9],[x+8,2,0,r*.7,r*.74]],tint(skin,.9-i*.055),16);}
  }
  if(tentacles&&!profile)loft([[-39,0,0,2,3],[-29,-1,0,7,9],[-12,-3,0,thick*.98,thick],[6,-2,0,thick,thick*.93],[23,0,0,10,12],[32,0,0,3,4]],skin,24);
  if(crab||spec.form==='scarab'||spec.id==='broodMother'||spec.id==='coreHarvester')for(let plate=0;plate<4;plate++){
   const x=-23+plate*10,r=thick*(.9-Math.abs(plate-1.5)*.05),rings=[];
   for(let j=0;j<4;j++)rings.push(Array.from({length:15},(_,k)=>{const a=.35+k/14*5.58;return[x+j*3,-2+Math.cos(a)*(r+Math.sin(j/3*Math.PI)*1.2),Math.sin(a)*(r*1.12+Math.sin(j/3*Math.PI)*1.2)];}));
   const back=rings.map(row=>row.map(v=>[v[0],-2+(v[1]+2)*.965,v[2]*.965]));
   for(let j=0;j<3;j++)for(let k=0;k<14;k++){m.faces.push({v:[rings[j][k],rings[j][k+1],rings[j+1][k+1],rings[j+1][k]],c:tint(skin,.82+plate*.035),em:0,flex:0},{v:[back[j][k],back[j+1][k],back[j+1][k+1],back[j][k+1]],c:skin,em:0,flex:0});}
   for(let j=0;j<3;j++)for(const k of [0,14])m.faces.push({v:[rings[j][k],back[j][k],back[j+1][k],rings[j+1][k]],c:skin,em:0,flex:0});
   for(let k=0;k<14;k++)for(const j of [0,3])m.faces.push({v:[rings[j][k],rings[j][k+1],back[j][k+1],back[j][k]],c:skin,em:0,flex:0});
   tube(rings[3],.45,tint(accent,.75));
  }
  // Deep, small eyes under a brow; synchronized eyelid motion on both renderers.
  for(const side of [-1,1])for(let eye=0;eye<(spec.eyePairs||1);eye++){const x=-30+eye*6,y=-5-eye*3,z=side*((bodyShape==='hammer'?29:bodyShape==='shield'?14:9)+eye*2);
   m.ellipsoid(x,y,z,5,3.8,2.2,tint(skin,.3),0,14,8);
   let start=m.faces.length;m.ellipsoid(x-.8,y,z+side*1.7,2.1,1.5,1.15,[64,47,25],.03,14,8);m.ellipsoid(x-1.2,y,z+side*2.7,.65,1.1,.3,[4,10,11],0,12,8);
   for(let i=start;i<m.faces.length;i++){m.faces[i].blink=[y,Math.abs(z)*.19];m.faces[i].textureWeight=0;m.faces[i].wet=.9;}
   tube([[-36,-7,side*7],[-30,-10,side*10],[-23,-8,side*13]],1.5,tint(skin,1.18));
   // Gill seams and restrained luminous organs, never giant glowing eyeballs.
   for(let j=0;j<5;j++){const x=-15+j*7,z=side*(thick*(1-j*.06)+.9);tube([[x,-4,z],[x+2,2,z+side*.5],[x+1,7,z-side*1.8]],.65,tint(accent,.6));}
  }
  function fin(side,pair,flight){const start=m.faces.length,root=[-11+pair*20,-3,side*9],point=(u,v,back)=>{const span=(flight?64:58)*(spec.span||1)*Math.pow(.70,pair),chord=Math.sin(u*Math.PI*.92)*(flight?31:48)*(spec.chord||1)+3;return[root[0]+u*(24+(spec.wingSweep||0))+(v-.48)*chord,root[1]+Math.sin(u*Math.PI)*4+Math.sin(v*Math.PI)*u*3+(back?.3:-.3),side*(9+u*span*(1+(spec.planet?.16:.035)*Math.sin(v*(spec.wingNotches||3)*Math.PI)))];};
   for(let back=0;back<2;back++)for(let i=0;i<12;i++)for(let j=0;j<6;j++){const v=[point(i/12,j/6,back),point((i+1)/12,j/6,back),point((i+1)/12,(j+1)/6,back),point(i/12,(j+1)/6,back)];m.faces.push({v:back?v:v.reverse(),c:tint(accent,.52+j*.038),em:0,flex:0});}
   for(let i=0;i<12;i++)for(const edge of [0,1])m.faces.push({v:[point(i/12,edge,0),point((i+1)/12,edge,0),point((i+1)/12,edge,1),point(i/12,edge,1)],c:skin,em:0,flex:0});
   for(let j=0;j<5;j++)tube(Array.from({length:5},(_,i)=>point(i/4,j/4,0)),.58,tint(skin,1.15));
   mark(start,[...root,flight?1:3]);
  }
  if(winged||ray||spec.form==='herald')for(const side of [-1,1])for(let pair=0;pair<(spec.finPairs||(winged?2:1));pair++)fin(side,pair,air);
  if(tentacles||spec.form==='herald')for(let i=0;i<(spec.arms||6);i++){const a=i/(spec.arms||6)*Math.PI*2,y=Math.cos(a),z=Math.sin(a);tube([[21,y*10,z*10],[39,y*17,z*16],[62,y*22,z*20],[82,y*16,z*24],[95,y*24,z*15]],2.6,tint(skin,1+i*.04));for(let j=0;j<4;j++)m.ellipsoid(35+j*12,y*(15+j*2),z*(15+j*2)-.7,1.3,1,.8,tint(accent,.65),0,8,5);}
  if(crab||winged||spec.form==='scarab')for(const side of [-1,1])for(let i=0;i<(spec.legPairs||3);i++){const root=[-12+i*13,7,side*10],elbow=[-22+i*16,15,side*25],tip=[-30+i*20,27,side*32],joint=[...root,2];tube([root,elbow,tip,[tip[0]-5,tip[1]+4,tip[2]-side*5]],crab?2.5:1.5,tint(skin,.83),joint);const start=m.faces.length;m.ellipsoid(...elbow,2.1,2.1,2.1,accent,0,10,6);mark(start,joint);}
  if(!ray)for(const side of [-1,1])tube([[-31,-8,side*6],[-44,-17,side*12],[-53,-15,side*21],[-58,-8,side*24]],.75,accent,[-31,-8,side*6,3]);
  if(ray){for(const side of [-1,1])tube([[30,0,side*5],[51,1,side*8],[73,3,side*15],[89,8,side*20]],1.7,skin,[30,0,side*5,3]);}
  if(crab||spec.form==='scarab'||spec.form==='herald')for(let i=0;i<5;i++){
   const x=-19+i*10,r=thick*(1-Math.abs(i-1.5)*.13);
   for(const side of [-1,1])tube([[x,-r*.6,side*r*.75],[x+4,-r*.94,side*r*.55],[x+10,-r*1.08,side*r*.1]],1.1,tint(accent,.7));
  }
  // Species-specific anatomy: grasping mantis forelegs, crab pincers and brood armor.
  if(spec.graspers||spec.id==='furnaceMantis'||spec.id==='coreHarvester')for(const side of [-1,1]){
   const root=[-20,4,side*9],joint=[...root,2];
   tube([root,[-34,13,side*20],[-14,33,side*30],[-40,25,side*29]],2.1,skin,joint);
   for(let j=0;j<5;j++)tube([[-17-j*4,30-j*.7,side*29],[-20-j*4,24-j*.5,side*29]],.6,accent,joint);
  }
  if(crab)for(const side of [-1,1]){
   const joint=[-20,6,side*13,2];tube([[-20,6,side*13],[-36,12,side*26],[-46,5,side*29]],3.6,skin,joint);
   tube([[-46,5,side*29],[-58,0,side*30],[-62,-7,side*25]],2.4,accent,joint);
   tube([[-46,5,side*29],[-57,10,side*29],[-63,3,side*26]],2.4,skin,joint);
  }
  if(spec.id==='broodMother'||spec.id==='coreHarvester')for(const side of [-1,1])for(let i=0;i<5;i++){
   const x=-3+i*8; tube([[x,-9,side*9],[x+4,-19,side*14],[x+11,-11,side*19]],1.7,accent);
  }
  // Distinct inherited structures alter the silhouette, with their own joints.
  if(spec.crest)for(let i=0;i<spec.crest;i++){
   const x=-12+i*9,r=thick*(1-i*.09);tube([[x,-r,0],[x+3,-r-6,-1],[x+9,-r-13-(i%2)*4,0]],2.8,accent);
  }
  if(spec.sails)for(const side of [-1,1]){
   const root=[8,0,side*8],start=m.faces.length;
   m.wedge(root,[25,-25,side*39],[45,4,side*14],1,accent);mark(start,[...root,3]);
  }
  if(spec.forked)for(const side of [-1,1])tube([[32,2,side*3],[51,-3,side*13],[70,-8,side*20]],2.2,accent,[32,2,side*3,3]);
  if(bodyShape==='ribbon')for(const side of [-1,1]){
   const root=[24,2,side*7],joint=[...root,3];tube([root,[48,side*7,side*14],[74,-side*16,side*21],[104,-side*23,side*14],[125,side*8,side*11]],2.8,skin,joint);
   for(let i=0;i<5;i++){const start=m.faces.length,x=37+i*15;m.wedge([x,0,side*12],[x+10,-side*(21+i*3),side*18],[x+16,1,side*13],1.5,accent);mark(start,joint);}
  }
  if(bodyShape==='petal')for(let i=0;i<6;i++){
   const a=i*Math.PI/3,root=[7,Math.cos(a)*9,Math.sin(a)*9],tip=[28,Math.cos(a)*36,Math.sin(a)*36],start=m.faces.length;
   m.wedge(root,tip,[51,Math.cos(a)*14,Math.sin(a)*14],2,skin);tube([root,tip,[51,Math.cos(a)*14,Math.sin(a)*14]],.8,accent);mark(start,[...root,3]);
  }
  if(bodyShape==='keel')for(const side of [-1,1]){const root=[-5,side*7,0],start=m.faces.length;m.wedge([-30,side*8,0],[7,side*40,-1],[42,side*9,0],2,accent);mark(start,[...root,3]);}
  // Fine embedded speckles follow the body rather than floating sphere ornaments.
  for(let i=0;i<18;i++){const x=-18+i*2.9,a=i*2.399,r=thick*(1-Math.max(0,x)*.012),y=Math.cos(a)*r,z=Math.sin(a)*r; m.ellipsoid(x,y,z,1.6,.65,.65,tint(accent,.65),0,8,4);}
  for(const f of m.faces){if(spec.length){f.v=f.v.map(p=>[p[0]*spec.length,p[1],p[2]]);if(f.joint)f.joint=[f.joint[0]*spec.length,...f.joint.slice(1)];}if(small!==1){f.v=f.v.map(p=>p.map(v=>v*small));if(f.joint)f.joint=f.joint.map((v,i)=>i<3?v*small:v);if(f.blink)f.blink=[f.blink[0]*small,f.blink[1]];}f.textureWeight=f.textureWeight??.72;}
  m.faces.skin=true;m.faces.alienMaterial=tentacles?'flesh':'chitin';m.faces.fauna=true;m.faces.organicRig=tentacles?(spec.id==='squid'?'squid':'octopus'):'anatomical';return m.faces;
 }
 const specs=[
 ['squid','Needlewing','air','tendril',[51,160,113],[198,181,89]],['octopus','Ribbonwing','air','tendril',[156,65,104],[220,150,119]],['broodMother','Rust Broodcarrier','air','moth',[163,94,44],[222,170,88]],['swarmlet','Dart Larva','air','moth',[162,107,63],[225,175,91],.42],
 ['furnaceMantis','Furnace Mantis','air','moth',[62,83,73],[224,120,49]],['emberMite','Ember Mite','air','moth',[151,77,44],[235,152,57],.45],
 ['abyssRay','Abyss Ray','water','ray',[44,134,168],[102,193,195]],['lanternScarab','Lantern Scarab','water','scarab',[76,120,173],[201,170,77]],['abyssShepherd','Abyss Shepherd','water','tendril',[53,120,152],[146,185,169]],
 ['reefCrab','Reef Crab','water','crab',[184,109,60],[215,171,112]],['reefGlider','Reef Glider','water','ray',[193,75,56],[223,137,93]],['reefHerald','Reef Herald','water','herald',[143,76,95],[218,153,98]],
 ['stormMoth','Storm Moth','air','moth',[83,101,180],[170,163,211]],['stormPolyp','Storm Ribbonwing','air','tendril',[129,80,159],[188,155,207]],['coreMoth','Core Moth','air','moth',[164,58,46],[231,147,55]],['corePolyp','Core Ribbonwing','air','tendril',[159,65,70],[224,133,72]],['coreHarvester','Core Harvester','air','moth',[103,77,66],[227,139,64]]
 ];buildFaunaMesh=build;for(const [id,name,habitat,form,color,accent,small]of specs){const spec={id,name,habitat,form,color,accent,small};meshes[id]=build(spec);faunaCatalog[id]={...spec,triangles:meshes[id].reduce((n,f)=>n+f.v.length-2,0)};}
})();

function isOrganicEnemy(e){const id=e.satellite?e.escortProfile?.escort:e.escortProfile?.model;const name=id||(typeof sectors!=='undefined'?sectors[level]?.models[e.type]:null);return !!faunaCatalog[name]||e.type===1||e.type===3;}

// Species anatomy is selected by an authored blueprint, never by a shared body
// with different colours. Helpers supply surfaces/joints, not a default animal.
const SPECIES_BLUEPRINTS=Object.freeze({
 wyvern:{name:'Razorwing',habitats:['air'],gait:'swoop',propulsion:'wings'},
 moth:{name:'Veil moth',habitats:['air'],gait:'flutter',propulsion:'wings'},
 wasp:{name:'Lance wasp',habitats:['air'],gait:'dart',propulsion:'wings'},
 skyworm:{name:'Jet wyrm',habitats:['air'],gait:'undulate',propulsion:'jets'},
 manta:{name:'Crown skate',habitats:['water'],gait:'glide',propulsion:'fins'},
 eel:{name:'Saw eel',habitats:['water'],gait:'undulate',propulsion:'tail'},
 nautilus:{name:'Spiral hunter',habitats:['water'],gait:'jet',propulsion:'siphon'},
 crab:{name:'Vault crab',habitats:['air','water'],gait:'scuttle',propulsion:'vents'},
 jelly:{name:'Bell drifter',habitats:['air','water'],gait:'hover',propulsion:'bell'},
 squid:{name:'Harpoon squid',habitats:['air','water'],gait:'jet',propulsion:'siphon'},
 urchin:{name:'Thorn reactor',habitats:['air','water'],gait:'orbit',propulsion:'vents'},
 trilobite:{name:'Ironback',habitats:['air','water'],gait:'row',propulsion:'paddles'}
});
function buildSpeciesAnatomy(spec){
 if(spec.genome)return buildDevelopedOrganism(spec);
 const m=meshBuilder(),skin=spec.color,accent=spec.accent,dark=skin.map(v=>Math.round(v*.24)),light=skin.map(v=>Math.min(244,Math.round(v*1.2+10))),air=spec.habitat==='air',variant=spec.variant||0;
 const tag=(start,joint)=>{if(joint)for(let i=start;i<m.faces.length;i++)m.faces[i].joint=joint;};
 const ell=(p,r,c=skin,joint=null)=>{const start=m.faces.length;m.ellipsoid(...p,...r,c,0,Math.max(...r)<=3?10:16,Math.max(...r)<=3?6:10);tag(start,joint);};
 const tube=(points,r,c=skin,joint=null)=>{const start=m.faces.length;m.tube(points,r,c,0,0,7,3);tag(start,joint);};
 const blade=(a,b,c,width,color=skin,joint=null)=>{const start=m.faces.length;m.wedge(a,b,c,width,color);tag(start,joint);};
 // Closed cross sections produce a continuous, tapered animal body.
 const body=(profile,joint=null)=>{const start=m.faces.length,sections=profile.flatMap((q,j)=>j===profile.length-1?[q]:Array.from({length:3},(_,k)=>q.map((v,i)=>{const t=k/3,a=profile[Math.max(0,j-1)][i],b=v,c=profile[j+1][i],d=profile[Math.min(profile.length-1,j+2)][i],n=.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);return i>1?Math.max(.3,n):n;}))),rings=sections.map(([x,y,ry,rz])=>Array.from({length:20},(_,i)=>{const a=i*Math.PI/10;return[x,y+Math.cos(a)*ry,Math.sin(a)*rz];}));for(let j=0;j<rings.length-1;j++)for(let i=0;i<20;i++)m.faces.push({v:[rings[j][i],rings[j][(i+1)%20],rings[j+1][(i+1)%20],rings[j+1][i]],c:skin,em:0,flex:0});m.faces.push({v:rings[0].slice().reverse(),c:dark,em:0,flex:0},{v:rings.at(-1),c:skin,em:0,flex:0});tag(start,joint);};
 const eye=(x,y,z,r=3)=>{ell([x,y,z],[r*1.6,r*1.2,r*.7],dark);const start=m.faces.length;ell([x-.5,y,z+Math.sign(z)*.4],[r,r*.85,r],accent);ell([x-1,y,z+Math.sign(z)*1.1],[r*.25,r*.68,r*.7],[5,13,17]);for(let i=start;i<m.faces.length;i++){m.faces[i].blink=[y,variant*.3+x*.09];m.faces[i].wet=1;m.faces[i].textureWeight=0;}};
 // Curved double-sided membranes with sealed edges and attached skeletal ribs.
 const wing=(root,tip,rear,joint)=>{const start=m.faces.length,point=(u,v,b)=>{const e=tip.map((n,i)=>n*(1-v)+rear[i]*v+(i===0?Math.sin(v*Math.PI)*11:0));return root.map((n,i)=>n+(e[i]-n)*u+(i===1?Math.sin(Math.PI*u)*Math.sin(Math.PI*v)*6+(b?.45:-.45):0));};for(let back=0;back<2;back++)for(let i=0;i<8;i++)for(let j=0;j<6;j++){const v=[point(i/8,j/6,back),point((i+1)/8,j/6,back),point((i+1)/8,(j+1)/6,back),point(i/8,(j+1)/6,back)];m.faces.push({v:back?v.reverse():v,c:skin.map((n,k)=>Math.round(n*.78+accent[k]*(.16+.10*Math.sin(j*.6)))),em:0,flex:0});}for(let i=0;i<8;i++)for(const edge of [0,1])m.faces.push({v:[point(i/8,edge,0),point((i+1)/8,edge,0),point((i+1)/8,edge,1),point(i/8,edge,1)],c:skin,em:0,flex:0});for(let j=0;j<4;j++)tube([root,point(.5,j/3,0),point(1,j/3,0)],.7,light);tag(start,joint);};
 const arm=(root,points,r=2)=>tube([root,...points],r,skin,[...root,7]);
 let muzzle=[-40,0,0],ports=[];
 switch(spec.anatomy){
 case 'wyvern':
  body([[-46,-5,1,2],[-32,-4,7,8],[-15,0,10,11],[7,1,12,12],[26,2,6,6],[57,4,.4,.5]]);
  for(const side of [-1,1]){const root=[-4,-2,side*8];wing(root,[-40,-8,side*(58+variant*3)],[39,6,side*36],[...root,1]);arm([18,7,side*6],[[29,18,side*12],[9,24,side*18]],1.7);eye(-31,-7,side*7,2.3);for(let i=0;i<3;i++)blade([-5+i*11,-10,0],[i*11,-23-i*2,0],[7+i*11,-8,0],2,accent);}
  tube([[27,2,0],[44,5,3],[73,0,5],[91,-9,6]],2.1,skin,[27,2,0,4]);muzzle=[-46,-5,0];break;
 case 'moth':
  body([[-28,0,2,3],[-19,0,9,10],[4,1,8,8],[25,2,4,5],[38,2,.5,1]]);
  for(const side of [-1,1]){const root=[-12,0,side*5];wing(root,[-46,-2,side*50],[16,4,side*63],[...root,1]);wing([4,1,side*5],[13,1,side*48],[42,3,side*36],[4,1,side*5,1]);arm([-20,-5,side*4],[[-36,-19,side*13],[-45,-23,side*27]],.85);eye(-21,-4,side*7,3);for(let i=0;i<3;i++)arm([-8+i*9,5,side*5],[[i*8,16,side*13],[i*10-9,21,side*18]],.9);}
  muzzle=[-28,1,0];break;
 case 'wasp':
  ell([-28,-1,0],[12,10,11]);ell([-8,0,0],[13,8,9]);tube([[3,0,0],[17,1,0]],3,dark);body([[15,1,3,3],[23,2,12,13],[34,3,11,12],[47,4,4,5],[67,5,.4,.5]]);
  for(const side of [-1,1]){for(let i=0;i<2;i++){const root=[-12+i*9,-3,side*5];wing(root,[-4+i*11,-6,side*65],[24+i*11,-3,side*46],[...root,1]);}for(let i=0;i<3;i++)arm([-18+i*11,6,side*6],[[-21+i*13,20,side*16],[-29+i*12,28,side*20]],1);eye(-30,-3,side*9,3.2);blade([-34,4,side*4],[-47,10,side*8],[-39,-1,side*4],2,accent);}
  for(let i=0;i<4;i++)tube([[21+i*5,-8,0],[23+i*5,-2,-11],[23+i*5,8,0]],1.1,accent);muzzle=[-41,1,0];break;
 case 'skyworm':case 'eel':{
  const joint=[-32,0,0,4];body([[-49,0,1,2],[-36,0,9,10],[-20,1,12,12],[1,2,10,10],[24,3,8,7],[48,2,5,4],[76,1,2,2],[97,-2,.3,.5]],joint);
  for(const side of [-1,1]){eye(-35,-4,side*8,2.7);wing([-21,4,side*8],[-5,17,side*32],[21,5,side*20],[-21,4,side*8,3]);for(let i=0;i<6;i++)blade([-18+i*15,-10+i,0],[-12+i*15,-23+i,0],[-3+i*15,-8+i,0],1.4,accent,joint);}
  wing([56,2,0],[88,-27,1],[94,27,-1],[56,2,0,4]);ports=air?[[21,8,-9],[21,8,9]]:[];muzzle=[-49,0,0];break;}
 case 'manta':
  body([[-34,0,2,5],[-19,-1,10,18],[3,0,11,21],[24,2,7,14],[40,3,1,2]]);
  for(const side of [-1,1]){const root=[-17,0,side*9];wing(root,[-19,-2,side*(70+variant*3)],[43,5,side*45],[...root,3]);arm([-30,1,side*9],[[-42,6,side*13],[-44,-2,side*18]],2.6);eye(-22,-8,side*11,2.5);}
  tube([[31,2,0],[53,4,2],[79,1,5],[99,5,9]],1.7,skin,[31,2,0,4]);muzzle=[-34,4,0];break;
 case 'nautilus':{
  // A real coiled shell in the side-view plane with individual chamber sutures.
  const points=Array.from({length:49},(_,i)=>{const a=i/48*Math.PI*4.6,r=4+i*.58;return[8+Math.cos(a)*r,Math.sin(a)*r,0];});tube(points,7,skin);
  for(let i=6;i<47;i+=3){const p=points[i];tube([[p[0],p[1]-4,-5],[p[0],p[1],-8],[p[0],p[1]+4,-5]],.85,accent);}
  ell([-23,7,0],[14,9,12],light);for(const side of [-1,1]){eye(-29,2,side*9,2.6);for(let i=0;i<3;i++)arm([-29,9,side*(3+i*3)],[[-44,14+i*4,side*12],[-57,9+i*7,side*17],[-68,3+i*6,side*13]],1.6);}
  ports=[[19,22,0]];muzzle=[-36,7,0];break;}
 case 'crab':
  body([[-31,0,3,5],[-23,-1,15,20],[-5,-3,18,26],[13,0,13,22],[26,2,2,5]]);
  for(const side of [-1,1]){for(let i=0;i<4;i++)arm([-18+i*11,4,side*15],[[-28+i*17,9,side*31],[-35+i*18,27,side*40]],2);const root=[-21,6,side*14];tube([root,[-41,12,side*25],[-55,4,side*29]],3.5,skin,[...root,2]);for(const jaw of [-1,1])tube([[-55,4,side*29],[-66,4+jaw*7,side*29],[-74,4+jaw*2,side*29]],2.3,accent,[-55,4,side*29,2]);tube([[-21,-10,side*9],[-28,-18,side*15]],1.7,light);eye(-28,-18,side*15,2.7);}
  for(let i=0;i<4;i++)tube([[-19+i*10,-9,-19],[-16+i*10,-19,0],[-19+i*10,-9,19]],1.3,accent);ports=air?[[18,6,-17],[18,6,17]]:[];muzzle=[-32,6,0];break;
 case 'jelly':{
  body([[-33,0,.6,.6],[-29,0,12,12],[-19,0,25,25],[-3,0,30,30],[13,0,27,27],[18,0,17,17]],[18,0,0,5]);
  for(let i=0;i<8;i++){const a=i*Math.PI/4,root=[13,Math.cos(a)*22,Math.sin(a)*22];arm(root,[[37,root[1]*.9,root[2]*.9],[60,root[1]*1.15,root[2]*.9],[84,root[1]*.7,root[2]*1.1]],1.1);tube([[-27,Math.cos(a)*10,Math.sin(a)*10],[-12,Math.cos(a)*27,Math.sin(a)*27],[12,Math.cos(a)*26,Math.sin(a)*26]],.8,accent,[18,0,0,5]);}
  for(const side of [-1,1])eye(-24,-4,side*16,2.8);ports=[[18,0,0]];muzzle=[-33,0,0];break;}
 case 'squid':
  body([[-39,0,2,3],[-30,0,10,12],[-10,0,17,18],[12,0,16,15],[28,1,8,8],[38,1,1,2]]);
  for(const side of [-1,1]){wing([6,0,side*12],[28,-2,side*35],[39,2,side*9],[6,0,side*12,3]);eye(-29,-4,side*9,3.3);}
  for(let i=0;i<6;i++){const a=i*Math.PI/3,root=[23,Math.cos(a)*7,Math.sin(a)*7];arm(root,[[43,root[1]*1.8,root[2]*2],[70,root[1]*2.4,root[2]*2.7],[100,root[1]*1.8,root[2]*3]],i<2?2.5:1.5);}
  ports=[[21,6,0]];muzzle=[-40,2,0];break;
 case 'urchin':
  ell([0,0,0],[23,25,25]);for(let i=0;i<12;i++){const a=i*Math.PI*2/12,y=Math.cos(a),z=Math.sin(a),root=[4,y*19,z*19];tube([root,[13,y*34,z*34],[37,y*(41+variant),z*(41+variant)]],2.2,accent,[...root,7]);}
  for(let i=0;i<4;i++)ell([-17-i*3,Math.cos(i*Math.PI/2)*8,Math.sin(i*Math.PI/2)*8],[5,4,4],dark);
  for(const side of [-1,1])eye(-19,-7,side*12,3);ports=[[24,0,0]];muzzle=[-28,0,0];break;
 case 'trilobite':
  for(let i=0;i<7;i++){const x=-26+i*10,r=16-Math.abs(i-2)*2;body([[x,0,r*.65,r],[x+4,-2,r,r*1.1],[x+10,0,r*.7,r*.88]],[-25,0,0,4]);for(const side of [-1,1])wing([x,4,side*r*.7],[x-9,12,side*(29-i)],[x+12,9,side*(27-i)],[x,4,side*r*.7,air?1:3]);}
  ell([-33,0,0],[9,8,13],light);for(const side of [-1,1]){eye(-35,-3,side*11,2.8);arm([-37,-4,side*6],[[-50,-13,side*13],[-58,-8,side*21]],.8);}muzzle=[-42,1,0];break;
 default:throw Error('Unknown anatomy blueprint '+spec.anatomy);
 }
 // Heritable secondary anatomy changes the silhouette, not just its paint.
 const sensory=spec.sensory||'barbels',surface=spec.integument||'ridges';
 for(const side of [-1,1]){
  const root=[muzzle[0]+8,-4,side*5];
  if(sensory==='antlers')for(let i=0;i<2;i++){tube([root,[root[0]-8,-18-i*5,side*(13+i*4)],[root[0]+3,-31-i*4,side*(21+i*6)]],1.2,light,[...root,7]);}
  else if(sensory==='barbels')arm(root,[[root[0]-11,6,side*13],[root[0]-23,-2,side*20],[root[0]-27,8,side*22]],.65);
  else for(let i=0;i<3;i++)eye(root[0]+i*5,-9-i*1.4,side*(9+i*1.4),1.15);
 }
 if(surface==='quills')for(let i=0;i<5;i++)tube([[-15+i*9,-10,0],[-10+i*9,-21-i*1.4,2],[i*9,-26-i*1.4,5]],.85,accent,[-15+i*9,-10,0,7]);
 else if(surface==='pores')for(let i=0;i<5;i++)for(const side of [-1,1])ell([-18+i*8,-4,side*11],[2,1.8,.8],dark);
 else for(let i=0;i<4;i++)tube([[-14+i*8,-5,-10],[-11+i*8,-12,0],[-14+i*8,-5,10]],.6,light);
 if(spec.caste==='boss'){
  const root=[muzzle[0]+12,muzzle[1]+4,0];
  for(const side of [-1,1]){
   tube([[root[0],root[1],side*7],[muzzle[0]-6,root[1]+6,side*12],[muzzle[0]-15,root[1]-2,side*7]],2.8,light,[...root,6]);
   for(let i=0;i<3;i++){const x=-18+i*16;blade([x,-10,side*6],[x+7,-29-i*3,side*12],[x+18,-8,side*8],3,accent);}
   arm([-18,-8,side*12],[[-30,-27,side*24],[-46,-36,side*31],[-61,-25,side*42]],1.1);
  }
 }
 // Recessed native mouth and propulsion outlets stay part of this mesh.
 ell(muzzle,[1.1,3.2,3.2],dark);tube([[muzzle[0]+1,muzzle[1]-3,muzzle[2]-2],[muzzle[0]-1,muzzle[1],muzzle[2]-3],[muzzle[0]+1,muzzle[1]+3,muzzle[2]-2]],.7,light);
 for(const p of ports){ell(p,[3,4,4],dark);const start=m.faces.length;ell([p[0]+2,p[1],p[2]],[1,2.4,2.4],accent);for(let i=start;i<m.faces.length;i++)m.faces[i].em=.4;}
 const scale=spec.small||1,stretch=spec.length||1,transform=p=>[p[0]*stretch*scale,p[1]*scale,p[2]*scale];
 for(const f of m.faces){f.v=f.v.map(transform);if(f.joint)f.joint=[...transform(f.joint),f.joint[3]];if(f.blink)f.blink=[f.blink[0]*scale,f.blink[1]];f.textureWeight=f.textureWeight??.72;}
 Object.assign(m.faces,{skin:true,fauna:true,organicRig:'anatomical',alienMaterial:['jelly','squid','eel'].includes(spec.anatomy)?'flesh':'chitin',nativeAnatomy:true,anatomy:spec.anatomy,muzzle:transform(muzzle),ports:ports.map(transform)});return m.faces;
}

// Planet genomes are small immutable recipes. Geometry is generated only when
// visited and shared by every member of a species, with a bounded LRU cache.
const planetSpecies=new Map(),planetSpeciesMeshes=new Map();
function speciesHash(value){let n=2166136261;for(const c of value)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
function registerPlanetSpecies(spec){
 if(planetSpecies.has(spec.id))throw Error('Duplicate species '+spec.id);
 planetSpecies.set(spec.id,spec);if(spec.organic)faunaCatalog[spec.id]=spec;
 Object.defineProperty(meshes,spec.id,{enumerable:false,get(){
  if(planetSpeciesMeshes.has(spec.id)){const value=planetSpeciesMeshes.get(spec.id);planetSpeciesMeshes.delete(spec.id);planetSpeciesMeshes.set(spec.id,value);return value;}
  const value=spec.organic?(spec.anatomy?buildSpeciesAnatomy(spec):buildFaunaMesh(spec)):buildPlanetMachine(spec);
  while(planetSpeciesMeshes.size>=12)planetSpeciesMeshes.delete(planetSpeciesMeshes.keys().next().value);
  planetSpeciesMeshes.set(spec.id,value);return value;
 }});
}
function buildPlanetMachine(spec){
 if(spec.genome)return buildDevelopedMachine(spec);
 const m=meshBuilder(),c=spec.color,a=spec.accent,dark=[28,39,48],steel=[143,165,174],plan=spec.machinePlan||'dart',heavy=spec.heavy?1.18:1,ports=[];
 const plate=(x,y,z,l,w)=>{const rings=[[-1,.08,.8],[-.45,.64,3],[.2,1,5],[.85,.84,4],[1,.5,2]].map(([u,width,height])=>Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return[x+l*u,y+Math.cos(a)*w*width,z+Math.sin(a)*height];}));for(let j=0;j<rings.length-1;j++)for(let i=0;i<8;i++)m.faces.push({v:[rings[j][i],rings[j][(i+1)%8],rings[j+1][(i+1)%8],rings[j+1][i]],c:c.map(v=>Math.round(v*(.75+.055*(i%4)))),em:0,flex:0});m.faces.push({v:rings[0].slice().reverse(),c:dark,em:0,flex:0},{v:rings.at(-1),c:dark,em:0,flex:0});for(const side of [-1,1])m.tube([[x-l*.4,y+side*w*.5,z-2],[x+l*.2,y+side*w*.85,z-4],[x+l*.75,y+side*w*.68,z-3]],.65,steel,0,0,5,1);};
 const engine=(x,y,z,r=5)=>{ports.push([x+12,y,z]);m.tube([[x-18,y,z],[x,y,z],[x+12,y,z]],r,dark,0,0,12,2);for(let k=0;k<3;k++)m.tube([[x-9+k*5,y-r,z-r*.7],[x-9+k*5,y,z-r-1],[x-9+k*5,y+r,z-r*.7]],.7,steel,0,0,6,1);m.ellipsoid(x+12,y,z,1.2,r*.75,r*.75,a,.9,12,6);};
 if(plan==='outrigger'){
  plate(-10,0,-8,39,11);for(const side of [-1,1]){m.tube([[-18,0,0],[2,side*31,-2],[30,side*31,-2]],3,steel);plate(0,side*32,-7,22,9);engine(28,side*32,0,7);}
 }else if(plan==='crescent'){
  for(const side of [-1,1]){m.tube([[22,0,0],[13,side*18,-4],[-7,side*34,-4],[-35,side*42,0]],7,c,0,0,12,3);plate(-13,side*30,-7,22,9);engine(24,side*9,0,6);}m.ellipsoid(0,0,0,15,13,9,c,0,16,10);
 }else if(plan==='trident'){
  for(const side of [-1,0,1]){plate(-10-side*side*10,side*23,-5,33,6);m.tube([[15,0,0],[20,side*23,0]],3,steel);engine(25,side*23,0,5);}
 }else if(plan==='halo'){
  const points=Array.from({length:25},(_,i)=>[6+Math.cos(i/24*Math.PI*2)*31,Math.sin(i/24*Math.PI*2)*31,0]);m.tube(points,5,c,0,0,10,1);for(const side of [-1,1]){m.tube([[-15,0,0],[7,side*29,0]],2,steel);engine(18,side*23,0,5);}plate(-16,0,-6,27,8);
 }else if(plan==='prism'){
  for(const side of [-1,1]){plate(12,side*33,0,20,8);m.tube([[-26,0,-5],[6,side*33,0],[38,0,4]],3,steel);engine(24,side*33,0,6);}plate(-12,0,-8,37,13);
  m.wedge([-20,0,-8],[18,-32,-19],[18,32,-19],5,c);
 }else if(plan==='gyroscope'){
  for(const z of [-12,12]){const pts=Array.from({length:33},(_,i)=>[4+Math.cos(i*Math.PI/16)*30,Math.sin(i*Math.PI/16)*38,z]);m.tube(pts,3,c,0,0,8,1);}plate(-12,0,-4,29,10);engine(27,0,0,10);
  for(const side of [-1,1])m.tube([[3,0,0],[3,side*37,0]],2,steel);
 }else if(plan==='citadel'){
  for(const side of [-1,1]){plate(0,side*14,-10,25,16);plate(7,side*25,2,20,9);engine(29,side*18,0,8);}m.tube([[-35,0,0],[32,0,0]],9,dark);for(let i=0;i<4;i++)m.tube([[-18+i*11,-25,-10],[-18+i*11,0,-14],[-18+i*11,25,-10]],1.5,steel);
 }else{
  plate(-13,0,-5,47,9);for(const side of [-1,1]){m.wedge([12,side*7,-3],[36,side*39,-2],[42,side*6,1],4,c);engine(34,side*11,0,5);}
 }
 for(const side of [-1,1]){
  if(spec.armor==='cage')m.tube([[-21,side*9,-8],[-10,side*24,-20],[17,side*26,-17],[30,side*10,-5]],1.4,steel,0,0,6,2);
  else if(spec.armor==='fins')for(let i=0;i<3;i++)m.wedge([-4+i*11,side*9,-7],[12+i*11,side*24,-15],[17+i*11,side*8,-6],2,c);
  else for(let i=0;i<4;i++)m.tube([[-8+i*9,side*6,-10],[-3+i*9,side*16,-11],[2+i*9,side*17,-3]],1.5,steel,0,0,6,1);
 }
 // Embedded cockpit, armored seams, radiator slots and paired muzzle bores.
 m.ellipsoid(-20,-1,-10,9,4,3,a,.25,14,8);
 for(const side of [-1,1]){m.tube([[-17,side*7,-7],[-40,side*7,-7]],2.1,steel,0,0,8,1);m.ellipsoid(-40,side*7,-7,.5,1.4,1.4,dark,0,8,5);for(let k=0;k<5;k++)m.tube([[-5+k*5,side*5,-11],[-5+k*5,side*10,-9]],.65,a,0,0,5,1);}
 for(const p of ports){const start=m.faces.length;for(let i=0;i<3;i++){const a=i*Math.PI*2/3,q=(x,r,t)=>[x,p[1]+Math.cos(a+t)*r,p[2]+Math.sin(a+t)*r];m.wedge(q(p[0]+1,2,0),q(p[0]+2,6,.3),q(p[0]+3,6,-.3),1,steel);}for(let i=start;i<m.faces.length;i++)m.faces[i].joint=[...p,8];}
 const transform=p=>[p[0]*(spec.length||1)*heavy,p[1]*(spec.girth||1)*heavy,p[2]*heavy];
 for(const f of m.faces){f.v=f.v.map(transform);if(f.joint)f.joint=[...transform(f.joint),f.joint[3]];}
 Object.assign(m.faces,{industrial:true,nativeAnatomy:true,anatomy:plan,muzzle:transform([-40,-7,-7]),ports:ports.map(transform)});return m.faces;
}
// Boss castes reserve an anatomy unused by that planet's regular roster.
// Combat contracts (attacks, HP, weak points) are supplied by the level, not DNA.
function buildSpeciesBoss(spec,base){
 const mesh=spec.organic?buildSpeciesAnatomy(spec):buildPlanetMachine(spec),scale=spec.organic?2.8:3.8;
 const volumes={wyvern:[[-1,0,0],[30,13,14]],moth:[[0,0,0],[28,12,12]],wasp:[[0,0,0],[36,12,14]],skyworm:[[8,1,0],[50,13,13]],eel:[[8,1,0],[50,13,13]],manta:[[0,0,0],[29,12,24]],nautilus:[[5,0,0],[35,35,13]],crab:[[-2,0,0],[27,20,28]],jelly:[[-6,0,0],[28,30,30]],squid:[[0,0,0],[33,19,20]],urchin:[[0,0,0],[25,27,27]],trilobite:[[3,0,0],[38,18,20]]};
 const [center,radii]=spec.organic?volumes[spec.anatomy]:[[0,0,0],[38,29,15]];
 return{...base,mesh,parts:null,procedural:true,anatomy:spec.anatomy,habitat:spec.habitat,scale,mouth:mesh.muzzle,guns:spec.organic?null:[mesh.muzzle,[mesh.muzzle[0],-mesh.muzzle[1],mesh.muzzle[2]]],drives:spec.organic?null:mesh.ports.map(p=>({center:p,axis:[1,0,0],radius:4})),bodyVolumes:mesh.bodyVolumes||[{center,radii}]};
}
function enemySpecies(e,definition=sectors[level]){return planetSpecies.get(e.satellite?e.escortProfile?.escort:e.escortProfile?.model||definition.models[e.type]);}

// Rigid opaque repeats share an instanced GPU draw. Animated, translucent or
// hit-flashing models always keep the normal per-object path.
for(const name of ['missile','shrapnel','bone','rib','spineChip','chitinChip','skull'])meshes[name].instanceSafe=true;

// Developmental grammar v2. A planet supplies an inherited developmental program;
// castes vary its organs and proportions. Geometry is built from anatomical
// stations and attachment sockets, rather than selecting a finished animal.
function developSpeciesGenome(planetId,systemId,habitat,role,boss=false,climate='temperate',recipe=null){
 const hash=speciesHash('development-v2/'+systemId+'/'+planetId),seed=speciesHash(hash+'/'+role+'/'+boss);
 let state=seed;const rnd=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;},pick=a=>a[Math.floor(rnd()*a.length)];
 const clades=['lancet','shield','crown','ribbon','mantle','centipede','chalice','hammer','vault','fork'];
 const clade=recipe?.organicArchitecture||clades[hash%clades.length],bodyLength=58+rnd()*45+(clade==='ribbon'?28:0),girth=clade==='shield'||clade==='vault'?20+rnd()*8:clade==='ribbon'?8+rnd()*6:12+rnd()*9;
 const protection=climate==='plasma'?'stellar':climate==='hot'?'thermal':climate==='ice'||climate==='gas'?'cryo':'none';
 const genome={version:2,seed,lineage:hash,clade,habitat,role,boss,protection,bodyLength,girth,depth:girth*(.65+rnd()*.8),arch:(rnd()-.5)*22,
  head:['blade','hood','hammer','split','crowned'][(hash>>>5)%5],headSize:.75+rnd()*.65,neck:5+rnd()*16,
  stations:5+(hash>>>10)%4,segmentation:2+(hash>>>14)%6,armPairs:1+(hash>>>18)%4+(boss?1:0),
  limbs:['scythes','feelers','paddles','claws'][(hash>>>9)%4],reach:23+rnd()*42,finPairs:1+(hash>>>12)%3,
  wingSpan:32+rnd()*44,wingSweep:-24+rnd()*52,wingNotches:2+(hash>>>20)%5,eyePairs:1+(hash>>>23)%3,
  tail:['whip','fork','fan','stinger'][(hash>>>16)%4],tailLength:22+rnd()*55,
  crest:['plates','sail','horns','gills'][(hash>>>7)%4],crestHeight:7+rnd()*16,
  pattern:['bands','freckles','reticulate','marble'][(hash>>>25)%4],patternScale:.15+rnd()*.18,
  finPhase:rnd()*6.28,appendageRate:.76+rnd()*.7,armor:['scutes','ribs','smooth'][(hash>>>3)%3],
  machineFrame:recipe?.machineArchitecture||['catamaran','radial','blade','arc','casket','fork','delta','spindle'][(hash+role*3)%8],
  modules:2+(hash>>>15)%4,engineSpread:17+rnd()*29,nose:22+rnd()*34,moduleSweep:-22+rnd()*38,
  plating:['faceted','lamellar','skeletal'][(hash>>>8)%3]};
 genome.locomotion=habitat==='water'?(['chalice','mantle','vault'].includes(clade)?'siphon':'fins'):(['chalice','vault','mantle'].includes(clade)?'jets':'wings');
 if(recipe)genome.designId=recipe.id;
 if(habitat==='air'&&genome.limbs==='paddles')genome.limbs='claws';
 if(clade==='hammer')genome.head='hammer';if(clade==='mantle'||clade==='chalice')genome.neck=3;
 if(clade==='centipede'){genome.armPairs=5+(boss?1:0);genome.girth*=.7;}
 if(clade==='ribbon'){genome.finPairs=1;genome.armPairs=1;genome.tailLength*=1.4;}
 if(protection!=='none'){genome.girth*=protection==='stellar'?1.3:1.16;genome.depth*=1.15;genome.armor='scutes';}
 if(boss){genome.bodyLength*=1.15;genome.headSize*=1.2;genome.reach*=1.2;genome.crestHeight*=1.4;genome.finPairs=Math.min(3,genome.finPairs+1);}
 return genome;
}
function buildDevelopedOrganism(spec){
 const g=spec.genome,m=meshBuilder(),skin=spec.color,accent=spec.accent,dark=skin.map(v=>Math.round(v*.20)),light=skin.map(v=>Math.min(240,Math.round(v*1.15+12))),ports=[],volumes=[];
 const mark=(start,j)=>{for(let i=start;i<m.faces.length;i++){if(j)m.faces[i].joint=j;m.faces[i].textureWeight=.8;}};
 const tube=(pts,r,c=skin,j)=>{const start=m.faces.length;m.tube(pts,r,c,0,0,7,3);mark(start,j);};
 const ell=(p,r,c=skin,j)=>{const start=m.faces.length;m.ellipsoid(...p,...r,c,0,12,8);mark(start,j);};
 const lerp=(a,b,t)=>a+(b-a)*t,L=g.bodyLength,R=g.girth,D=g.depth;
 const center=u=>[lerp(-L*.34,L*.57,u),Math.sin(u*Math.PI)*g.arch+(g.clade==='ribbon'?Math.sin(u*Math.PI*2)*7:0),0];
 const thickness=u=>{
  const taper=.25+.75*Math.pow(Math.sin(Math.PI*(.12+u*.82)),.7),waist=g.clade==='crown'||g.clade==='fork'?1-.42*Math.exp(-Math.pow((u-.48)*8,2)):1;
  const mantle=g.clade==='chalice'?.5+Math.sin(u*Math.PI*.86)*.85:g.clade==='mantle'?1.35-.8*u:g.clade==='vault'?1.25-.45*Math.abs(u-.5):1;
  return taper*waist*mantle*(g.clade==='centipede'? .78+.22*Math.cos(u*g.segmentation*Math.PI*2):1);
 };
 const surface=(u,a,extra=0)=>{const p=center(u),r=thickness(u);return[p[0],p[1]+Math.cos(a)*(R*r+extra),Math.sin(a)*(D*r+extra)];};
 // Closed, gently ridged shell loft. Pattern colors are continuous in model space.
 function loft(sections,c=skin,joint=null,sides=18){const start=m.faces.length,rings=[];
  for(let k=0;k<sections.length-1;k++)for(let q=0;q<3;q++){const t=q/3,prev=sections[Math.max(0,k-1)],a=sections[k],b=sections[k+1],next=sections[Math.min(sections.length-1,k+2)];const p=a.map((v,i)=>.5*(2*v+(-prev[i]+b[i])*t+(2*prev[i]-5*v+4*b[i]-next[i])*t*t+(-prev[i]+3*v-3*b[i]+next[i])*t*t*t));rings.push(Array.from({length:sides},(_,i)=>{const a=i/sides*Math.PI*2,ridge=1+.028*Math.cos(a*(3+g.segmentation)+p[0]*.09);return[p[0],p[1]+Math.cos(a)*Math.max(.25,p[3])*ridge,p[2]+Math.sin(a)*Math.max(.25,p[4])*ridge];}));}
  const end=sections.at(-1);rings.push(Array.from({length:sides},(_,i)=>[end[0],end[1]+Math.cos(i/sides*Math.PI*2)*end[3],end[2]+Math.sin(i/sides*Math.PI*2)*end[4]]));
  for(let k=0;k<rings.length-1;k++)for(let i=0;i<sides;i++)m.faces.push({v:[rings[k][i],rings[k][(i+1)%sides],rings[k+1][(i+1)%sides],rings[k+1][i]],c,em:0,flex:0});
  m.faces.push({v:rings[0].slice().reverse(),c,em:0,flex:0},{v:rings.at(-1),c,em:0,flex:0});mark(start,joint);
 }
 const bodySections=Array.from({length:g.stations},(_,i)=>{const u=i/(g.stations-1),p=center(u),r=thickness(u);return[...p,R*r,D*r];});
 bodySections[0][3]*=.65;bodySections[0][4]*=.65;bodySections.at(-1)[3]*=.45;bodySections.at(-1)[4]*=.45;loft(bodySections);
 volumes.push({center:center(.45),radii:[L*.47,R*1.15+Math.abs(g.arch)*.4,D*1.15]});
 // The neck carries a separately constructed skull, with recessed eyes and jaws.
 const root=center(0),hx=root[0]-g.neck,hr=R*.59*g.headSize,hd=D*.64*g.headSize,headY=root[1]-hr*.15;
 tube([root,[hx+8,headY,0],[hx,headY,0]],Math.min(hr,hd)*.72,skin);
 const nose=hx-(g.head==='blade'?28:g.head==='hood'?15:20),headWidth=g.head==='hammer'?hd*1.9:hd;
 loft([[nose,headY,0,1,headWidth*(g.head==='hammer'?.8:.17)],[hx-12,headY-2,0,hr*.7,headWidth],[hx,headY,0,hr,hd],[hx+10,headY+2,0,hr*.5,hd*.55]]);
 volumes.push({center:[hx-5,headY,0],radii:[22,hr*1.05,headWidth]});
 const muzzle=[nose-1,headY+2,0];ell(muzzle,[1.3,Math.max(2.4,hr*.28),Math.max(2.4,hd*.3)],dark);
 for(const side of [-1,1]){
  const jaw=[hx-8,headY+hr*.52,side*hd*.55],joint=[...jaw,6];
  tube([jaw,[nose+3,headY+hr*.75,side*hd*.8],[nose-7,headY+2,side*hd*.2]],Math.max(1.2,hr*.14),light,joint);
  for(let tooth=0;tooth<(g.boss?4:2);tooth++){const x=hx-12-tooth*4;tube([[x,headY+hr*.6,side*hd*.55],[x-2,headY+hr*.15,side*hd*.45]],.65,accent,joint);}
  for(let i=0;i<g.eyePairs;i++){
   const p=[hx-9+i*6,headY-hr*(.34+i*.14),side*headWidth*(.82-i*.07)],r=Math.max(1.5,hr*(i===0?.23:.13));ell(p,[r*1.5,r*1.25,r*.6],dark);
   const start=m.faces.length;ell([p[0]-.4,p[1],p[2]+side*.6],[r,r*.8,r*.62],accent);ell([p[0]-.6,p[1],p[2]+side*r*.62],[r*.2,r*.65,r*.18],[3,10,13]);
   for(let k=start;k<m.faces.length;k++){m.faces[k].blink=[p[1],g.finPhase+i*.12];m.faces[k].wet=1;m.faces[k].textureWeight=0;}
   tube([[p[0]-r*1.4,p[1]-r*.4,p[2]],[p[0],p[1]-r*1.3,p[2]+side*.6],[p[0]+r*1.3,p[1]-r*.5,p[2]]],.75,light);
  }
 }
 // Membranes are attached to anatomical sockets, with different skeletons,
 // scallops and swept trailing edges on each planet.
 function membrane(root,tip,trail,mode){const start=m.faces.length;
  const point=(u,v,back)=>root.map((n,i)=>n+(lerp(tip[i],trail[i],v)-n)*u+(i===0?Math.sin(v*Math.PI*g.wingNotches)*u*u*3:0)+(i===1?Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*5+(back?.28:-.28):0));
  for(let b=0;b<2;b++)for(let i=0;i<8;i++)for(let k=0;k<6;k++){const v=[point(i/8,k/6,b),point((i+1)/8,k/6,b),point((i+1)/8,(k+1)/6,b),point(i/8,(k+1)/6,b)];m.faces.push({v:b?v.reverse():v,c:skin.map((n,z)=>Math.round(n*.7+accent[z]*.24)),em:0,flex:0,textureWeight:.55});}
  for(const edge of [0,1])for(let i=0;i<8;i++)m.faces.push({v:[point(i/8,edge,0),point((i+1)/8,edge,0),point((i+1)/8,edge,1),point(i/8,edge,1)],c:skin,em:0,flex:0});
  for(let k=0;k<4;k++)tube([root,point(.4,k/3,0),point(.8,k/3,0),point(1,k/3,0)],.55,light);
  mark(start,[...root,mode]);
 }
 const winged=g.locomotion==='wings',finned=g.locomotion==='fins';
 if(winged||finned)for(let pair=0;pair<g.finPairs;pair++)for(const side of [-1,1]){
  const u=.22+pair*.22,p=surface(u,side*Math.PI/2),span=g.wingSpan*(1-pair*.17),sweep=g.wingSweep;
  membrane(p,[p[0]+sweep-18,p[1]-4,side*(Math.abs(p[2])+span)],[p[0]+25+pair*5,p[1]+8,side*(Math.abs(p[2])+span*.64)],winged?1:3);
 }
 for(let pair=0;pair<g.armPairs;pair++)for(const side of [-1,1]){
  const u=.12+pair*.65/Math.max(1,g.armPairs-1),p=surface(u,side*Math.PI*.64),reach=g.reach*(.9+pair*.09),joint=[...p,g.limbs==='claws'?2:7],out=side*(Math.abs(p[2])+reach*.65);
  let points=[p,[p[0]-reach*.25,p[1]+reach*.3,side*(Math.abs(p[2])+reach*.32)],[p[0]+reach*.1,p[1]+reach*.72,out],[p[0]-reach*.35,p[1]+reach*.9,out*1.04]];
  if(g.limbs==='feelers'||g.locomotion==='siphon')points=[p,[p[0]+reach*.3,p[1]+10,out*.7],[p[0]+reach*.8,p[1]+reach*.3,out],[p[0]+reach*1.3,p[1]+reach*.1,out*.75]];
  tube(points,g.limbs==='feelers'?1:1.8,skin,joint);const tip=points.at(-1);
  if(g.limbs==='claws')for(const branch of [-1,1])tube([points[2],[tip[0]-8,tip[1]+branch*7,tip[2]],[tip[0]-14,tip[1]+branch*2,tip[2]]],1.5,light,joint);
  if(g.limbs==='paddles')membrane(points[1],[tip[0]-12,tip[1]+6,tip[2]],[tip[0]+18,tip[1]+3,tip[2]],3);
  if(g.limbs==='scythes')tube([tip,[tip[0]-10,tip[1]-5,tip[2]],[tip[0]-14,tip[1]-18,tip[2]]],1.5,accent,joint);
 }
 // Armored dorsal structures follow actual trunk sections rather than ornaments
 // pasted to a universal sphere. A swimming/jetting caste grows a different tail.
 const dorsalCount=g.crest==='sail'?Math.min(4,g.segmentation):g.segmentation;
 for(let i=0;i<dorsalCount;i++){
  const u=.08+i*.78/Math.max(1,dorsalCount-1),p=surface(u,Math.PI),h=g.crestHeight*(.7+.3*Math.sin(u*Math.PI));
  if(g.crest==='horns')for(const side of [-1,1])tube([[p[0],p[1]+2,side*D*.35],[p[0]+6,p[1]-h*.7,side*D*.55],[p[0]+15,p[1]-h,side*D*.38]],1.5,light);
  else if(g.crest==='sail')membrane(p,[p[0]-3,p[1]-h*1.6,0],[p[0]+L/g.segmentation,p[1]-h*.3,0],3);
  else if(g.crest==='plates'){const end=surface(Math.min(.99,u+.11),Math.PI);loft([[p[0]-4,p[1]+4,0,1,D*.55],[p[0]+3,p[1]+1,0,h*.4,D*.85],[end[0]+4,end[1]+4,0,1,D*.6]],light,null,12);}
  else for(const side of [-1,1])tube([surface(u,side*1.7),surface(u+.02,side*2.2,2),surface(u+.04,side*2.7,3)],.7,accent);
 }
 const tail=center(1),tailJoint=[...tail,4],length=g.tailLength;
 if(g.tail==='fork')for(const side of [-1,1])tube([tail,[tail[0]+length*.35,tail[1],side*8],[tail[0]+length,tail[1]-side*8,side*23]],2,skin,tailJoint);
 else if(g.tail==='fan')for(const side of [-1,1])membrane(tail,[tail[0]+length*.65,tail[1]-18,side*27],[tail[0]+length,tail[1]+12,side*16],3);
 else tube([tail,[tail[0]+length*.35,tail[1]+7,4],[tail[0]+length*.7,tail[1]-5,8],[tail[0]+length,tail[1]-16,2]],g.tail==='stinger'?2.8:1.3,skin,tailJoint);
 if(!winged&&!finned||g.habitat==='air'&&g.boss){for(const side of [-1,1]){const p=surface(.8,side*Math.PI/2);tube([p,[p[0]+10,p[1],p[2]],[p[0]+16,p[1],p[2]]],4,dark);ports.push([p[0]+17,p[1],p[2]]);}}
 // Environmental protection grows from the shell, with overlapping scutes
 // on hot worlds, insulating pale mantle plates in cold climates, and a
 // refractory facial shield plus extra mantle layers in stellar coronas.
 if(g.protection!=='none'){
  const plateColor=g.protection==='cryo'?skin.map((v,i)=>Math.round(v*.45+[157,189,192][i]*.55)):g.protection==='stellar'?skin.map((v,i)=>Math.round(v*.45+[163,137,85][i]*.55)):skin.map(v=>Math.round(v*.7));
  const count=g.protection==='stellar'?6:4;
  for(let k=0;k<count;k++){
   const u=.05+k*.78/count,p=center(u),r=thickness(u),w=L/count*.7,thick=g.protection==='cryo'?4:6;
   // A closed upper mantle plate hugs the existing body with no floating joints.
   const start=m.faces.length;
   for(let j=0;j<10;j++){
    const a=Math.PI*.52+j/10*Math.PI*.96,b=Math.PI*.52+(j+1)/10*Math.PI*.96;
    const v=(x,t,extra)=>[x,p[1]+Math.cos(t)*(R*r+extra),Math.sin(t)*(D*r+extra)];
    const p0=v(p[0]-w*.3,a,1),p1=v(p[0]-w*.3,b,1),p2=v(p[0]+w,b,1),p3=v(p[0]+w,a,1),q0=v(p[0]-w*.1,a,thick),q1=v(p[0]-w*.1,b,thick),q2=v(p[0]+w*.85,b,thick),q3=v(p[0]+w*.85,a,thick);
    for(const vertices of [[p0,p1,q1,q0],[q0,q1,q2,q3],[p3,q3,q2,p2],[p0,q0,q3,p3],[p1,p2,q2,q1],[p0,p3,p2,p1]])m.faces.push({v:vertices,c:plateColor,em:0,flex:0,textureWeight:1});
   }
   if(g.protection!=='cryo')for(const side of [-1,1])tube([surface(u,side*1.7,2),surface(u+.02,side*2.0,4),surface(u+.04,side*2.3,3)],1.2,dark);
  }
  if(g.protection==='stellar')for(const side of [-1,1])tube([[hx+5,headY-hr*.6,side*hd*.7],[hx-9,headY-hr*1.2,side*headWidth*.8],[nose+3,headY-hr*.4,side*headWidth*.8]],4,plateColor);
 }
 // Pattern is baked once into vertex colors, using continuous model coordinates.
 for(const f of m.faces){if(f.textureWeight===0)continue;const p=f.v[0],x=p[0]*g.patternScale,y=p[1]*g.patternScale,z=p[2]*g.patternScale;
  const field=g.pattern==='bands'?Math.sin(x+Math.sin(y)*.5):g.pattern==='freckles'?Math.sin(x*2.3)*Math.sin(y*2.7)*Math.cos(z*2):g.pattern==='reticulate'?Math.cos(x+Math.sin(z))*Math.cos(y):Math.sin(x*.7+Math.sin(y*.6+z));
  const blend=Math.max(0,field-.25)*.35;f.c=f.c.map((v,i)=>Math.round(v*(1-blend)+accent[i]*blend));
 }
 const small=spec.small||1;
 for(const f of m.faces){f.v=f.v.map(p=>p.map(n=>n*small));if(f.joint)f.joint=[...f.joint.slice(0,3).map(n=>n*small),f.joint[3]];if(f.blink)f.blink=[f.blink[0]*small,f.blink[1]];}
 Object.assign(m.faces,{skin:true,fauna:true,organicRig:'anatomical',alienMaterial:g.armor==='smooth'?'flesh':'chitin',nativeAnatomy:true,anatomy:g.clade,development:g,muzzle:muzzle.map(n=>n*small),ports:ports.map(p=>p.map(n=>n*small)),bodyVolumes:volumes.map(v=>({center:v.center.map(n=>n*small),radii:v.radii.map(n=>n*small)}))});return m.faces;
}
function buildDevelopedMachine(spec){
 const g=spec.genome,m=meshBuilder(),c=spec.color,accent=spec.accent,steel=[130,151,164],dark=[24,33,43],ports=[],scale=spec.small||1;
 const tube=(p,r,col=steel)=>m.tube(p,r,col,0,0,7,2);
 function pod(p,length,width,height,color=c){const sections=[[-1,.12],[-.68,.65],[-.28,1],[.62,.91],[1,.6]],rings=sections.map(([u,w])=>Array.from({length:8},(_,i)=>[p[0]+length*u,p[1]+Math.cos(i*Math.PI/4)*width*w,p[2]+Math.sin(i*Math.PI/4)*height*w]));
  for(let j=0;j<4;j++)for(let i=0;i<8;i++)m.faces.push({v:[rings[j][i],rings[j][(i+1)%8],rings[j+1][(i+1)%8],rings[j+1][i]],c:color.map(v=>Math.round(v*(.75+.07*(i%4)))),em:0,flex:0});m.faces.push({v:rings[0].slice().reverse(),c:dark,em:0,flex:0},{v:rings.at(-1),c:dark,em:0,flex:0});
  for(const side of [-1,1])tube([[p[0]-length*.6,p[1]+side*width*.56,p[2]+height*.6],[p[0],p[1]+side*width*.9,p[2]+height*.7],[p[0]+length*.7,p[1]+side*width*.8,p[2]+height*.55]],.55,steel);
 }
 function engine(p,r){tube([[p[0]-12,p[1],p[2]],p,[p[0]+8,p[1],p[2]]],r,dark);const port=[p[0]+9,p[1],p[2]];ports.push(port);m.ellipsoid(...port,1,r*.7,r*.7,accent,.65,10,6);const start=m.faces.length;for(let i=0;i<4;i++){const a=i*Math.PI/2;m.wedge([port[0]+1,port[1],port[2]],[port[0]+2,port[1]+Math.cos(a)*r,port[2]+Math.sin(a)*r],[port[0]+2,port[1]+Math.cos(a+.4)*r,port[2]+Math.sin(a+.4)*r],.7,steel);}for(let i=start;i<m.faces.length;i++)m.faces[i].joint=[...port,8];}
 const n=g.modules,spread=g.engineSpread,frame=g.machineFrame;
 let muzzle=[-g.nose-20,0,3];
 if(frame==='radial'||frame==='arc'){
  const count=frame==='arc'?n+2:n+1;
  for(let i=0;i<count;i++){const a=(frame==='arc'?.6:0)+i/(frame==='arc'?count-1:count)*(frame==='arc'?Math.PI*1.6:Math.PI*2),p=[g.moduleSweep+Math.sin(a)*10,Math.cos(a)*spread,Math.sin(a)*spread];tube([[-15,0,0],p,[p[0]+18,p[1],p[2]]],2.2);pod(p,15,5,6);engine([p[0]+17,p[1],p[2]],4.5);}
  pod([-8,0,0],g.nose,8,11);
 }else if(frame==='catamaran'||frame==='fork'){
  for(const side of [-1,1]){const p=[g.moduleSweep,side*spread,side*3];tube([[-g.nose*.3,0,0],[10,side*spread,0]],3);pod(p,g.nose*(frame==='fork'?1.2:.8),8+g.modules,7);engine([p[0]+g.nose,p[1],p[2]],6);}
  pod([-8,0,0],g.nose*.68,8,9);
 }else if(frame==='delta'||frame==='blade'){
  pod([-10,0,0],g.nose+12,9,7);for(const side of [-1,1]){m.wedge([-g.nose*.4,side*4,1],[g.moduleSweep,side*(spread+16),-4],[g.nose,side*9,6],frame==='blade'?3:7,c);pod([18,side*spread*.6,-4],18,5,5);engine([35,side*spread*.6,-4],5);}
 }else if(frame==='casket'){
  pod([0,0,0],g.nose*.8,spread*.78,11);for(let i=0;i<n;i++)pod([-8+i*9,(i%2?1:-1)*spread*.65,8],14,9,7);for(const side of [-1,1])engine([g.nose*.8,side*spread*.6,0],7);
 }else{
  pod([-4,0,0],g.nose+9,7,9);for(let i=0;i<n;i++){const x=-g.nose*.4+i*14;for(const side of [-1,1]){pod([x,side*(9+i*2),0],11,6+i,5);m.wedge([x,side*5,0],[x+4,side*spread,-7],[x+16,side*5,0],2,c);}}engine([g.nose+5,0,0],9);
 }
 // Sensor arrays, multi-stage barrels and cooling furniture are physical parts.
 tube([[-12,0,3],[muzzle[0]+12,0,3],muzzle],2.4,dark);for(let i=0;i<3;i++)pod([muzzle[0]+4+i*5,0,3],1.5,3.4,3.4,steel);
 for(let i=0;i<g.modules;i++){const x=-12+i*9;pod([x,-4,11],3,4,2,accent);}
 const thermal=g.protection,armorColor=thermal==='cryo'?[144,179,192]:thermal==='stellar'?[176,154,101]:thermal==='thermal'?[82,72,61]:c;
 const plates=thermal==='stellar'?6:thermal==='thermal'?4:thermal==='cryo'?3:2;
 for(const side of [-1,1])for(let i=0;i<plates;i++){
  const x=-g.nose*.4+i*(g.nose*.95/plates),y=side*(8+spread*.16);
  pod([x,y,10+(i%2)*2],7,thermal==='cryo'?9:7,thermal==='stellar'?6:4,armorColor);
  if(thermal==='thermal'||thermal==='stellar')for(let vent=0;vent<3;vent++)tube([[x-3+vent*2,y-3,16],[x-3+vent*2,y+3,16]],.55,dark);
  if(thermal==='cryo')tube([[x-5,y,15],[x,y+side*5,16],[x+5,y,15]],.8,accent);
 }
 if(thermal==='stellar'){for(const side of [-1,1]){m.wedge([muzzle[0]+5,side*3,7],[-g.nose*.55,side*(spread*.7+9),11],[-g.nose*.4,side*4,17],6,armorColor);tube([[5,side*14,-3],[20,side*(spread+10),-5],[35,side*18,-3]],2,steel);}}
 for(const f of m.faces){f.v=f.v.map(p=>p.map(v=>v*scale));if(f.joint)f.joint=[...f.joint.slice(0,3).map(n=>n*scale),f.joint[3]];}
 Object.assign(m.faces,{industrial:true,nativeAnatomy:true,anatomy:frame,development:g,muzzle:muzzle.map(v=>v*scale),ports:ports.map(p=>p.map(v=>v*scale)),bodyVolumes:[{center:[0,0,0],radii:[(g.nose+10)*scale,(spread*.8+10)*scale,20*scale]}]});return m.faces;
}
