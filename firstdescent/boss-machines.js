/* First Descent's alien machines. Closed, articulated hulls; no sprite surfaces.
   Local -X is forward. Parts keep their original vertices and only rigidly move. */
const machineBossDesigns = {};
(function buildMachineBosses() {
  const TAU = Math.PI * 2;
  const metal = { hull:[73,82,87], edge:[133,142,141], dark:[27,35,40], recess:[10,17,21], brass:[143,116,74], light:[186,190,179], hot:[247,135,60], cold:[93,192,204] };
  const shade = (c,n) => c.map(v => Math.max(0,Math.min(255,Math.round(v*n))));
  function builder() {
    const faces=[], parts=[];
    function face(v,c,em=0){faces.push({v,c,em,flex:0});}
    // A cut corner, solid plate. The raised bevel leaves a dark panel joint.
    function plate(points,z0,z1,c,bevel=1.1) {
      const cx=points.reduce((n,p)=>n+p[0],0)/points.length,cy=points.reduce((n,p)=>n+p[1],0)/points.length;
      const bottom=points.map(p=>[p[0],p[1],z1]);
      const outer=points.map(p=>[p[0],p[1],z0+bevel]);
      const top=points.map(p=>{const l=Math.hypot(p[0]-cx,p[1]-cy)||1,s=Math.max(.65,1-bevel/l);return[cx+(p[0]-cx)*s,cy+(p[1]-cy)*s,z0];});
      face(top,c);face(bottom.slice().reverse(),shade(c,.7));
      for(let i=0;i<points.length;i++){const j=(i+1)%points.length;face([top[i],top[j],outer[j],outer[i]],shade(c,1.17));face([outer[i],outer[j],bottom[j],bottom[i]],shade(c,.68));}
    }
    function box(x,y,z,w,h,d,c,bevel=.8) {
      const q=Math.min(w,h)*.13;
      plate([[x-w/2+q,y-h/2],[x+w/2-q,y-h/2],[x+w/2,y-h/2+q],[x+w/2,y+h/2-q],[x+w/2-q,y+h/2],[x-w/2+q,y+h/2],[x-w/2,y+h/2-q],[x-w/2,y-h/2+q]],z-d/2,z+d/2,c,bevel);
    }
    // Watertight axial loft. Dimensions vary by station, never by frame.
    function hull(stations,c,sides=8) {
      const rings=stations.map(p=>Array.from({length:sides},(_,i)=>{const a=TAU*(i+.5)/sides;return[p.x,p.y+Math.cos(a)*p.ry,p.z+Math.sin(a)*p.rz];}));
      face(rings[0].slice().reverse(),shade(c,.8));face(rings[rings.length-1],shade(c,.7));
      for(let k=0;k<rings.length-1;k++)for(let i=0;i<sides;i++){const j=(i+1)%sides;face([rings[k][i],rings[k+1][i],rings[k+1][j],rings[k][j]],shade(c,.91+.12*Math.sin(i*1.7+k*.9)));}
    }
    function cylinder(x0,x1,y,z,r0,r1,c,sides=12,em=0) {
      const a=[],b=[];for(let i=0;i<sides;i++){const t=i/sides*TAU;a.push([x0,y+Math.cos(t)*r0,z+Math.sin(t)*r0]);b.push([x1,y+Math.cos(t)*r1,z+Math.sin(t)*r1]);}
      face(a.slice().reverse(),c,em);face(b,c,em);for(let i=0;i<sides;i++){const j=(i+1)%sides;face([a[i],a[j],b[j],b[i]],c,em);}
    }
    // Open, deep gun bore; walls + lip + a dark blind end, rather than a painted dot.
    function barrel(x0,x1,y,z,outer,inner,c,sides=16,blind=true) {
      const r=[];for(const [x,size] of [[x0,outer],[x1,outer*.94],[x0,inner],[x1+1.5,inner*.9]])r.push(Array.from({length:sides},(_,i)=>[x,y+Math.cos(i/sides*TAU)*size,z+Math.sin(i/sides*TAU)*size]));
      for(let i=0;i<sides;i++){const j=(i+1)%sides;face([r[0][i],r[1][i],r[1][j],r[0][j]],c);face([r[0][j],r[2][j],r[2][i],r[0][i]],shade(c,1.35));face([r[2][i],r[2][j],r[3][j],r[3][i]],metal.recess);face([r[1][i],r[3][i],r[3][j],r[1][j]],metal.dark);}
      if(blind)face(r[3],metal.recess);
    }
    function line(a,b,r,c,sides=6,em=0) {
      const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],l=Math.hypot(dx,dy,dz)||1,d=[dx/l,dy/l,dz/l],n=Math.abs(d[2])>.8?[1,0,0]:[0,0,1];
      let u=[d[1]*n[2]-d[2]*n[1],d[2]*n[0]-d[0]*n[2],d[0]*n[1]-d[1]*n[0]],ul=Math.hypot(...u);u=u.map(v=>v/ul);const v=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]];
      const rings=[a,b].map(p=>Array.from({length:sides},(_,i)=>{const t=i/sides*TAU;return p.map((q,k)=>q+r*(u[k]*Math.cos(t)+v[k]*Math.sin(t)));}));
      face(rings[0].slice().reverse(),c,em);face(rings[1],c,em);for(let i=0;i<sides;i++){const j=(i+1)%sides;face([rings[0][i],rings[0][j],rings[1][j],rings[1][i]],c,em);}
    }
    function rivet(x,y,z,r=.9){box(x,y,z,r*2,r*2,.65,metal.edge,.2);}
    function part(name,start,pivot=[0,0,0],axis='x',speed=0) {
      const vertices=[],seen=new Set();for(let i=start;i<faces.length;i++)for(const v of faces[i].v)if(!seen.has(v)){seen.add(v);vertices.push({v,rest:v.slice()});}
      const rig={name,vertices,pivot,axis,speed};parts.push(rig);return rig;
    }
    function ring(cx,ry,rz,width,depth,c,segments=56,tilt=0) {
      const turn=p=>[cx+p[0],p[1]*Math.cos(tilt)-p[2]*Math.sin(tilt),p[1]*Math.sin(tilt)+p[2]*Math.cos(tilt)];
      // The ring lies in a oblique X/Y plane, with genuinely thick side walls.
      const rows=[];for(const [rad,zz] of [[1,-depth/2],[1,depth/2],[(ry-width)/ry,-depth/2],[(ry-width)/ry,depth/2]])rows.push(Array.from({length:segments},(_,i)=>{const a=i/segments*TAU;return turn([Math.cos(a)*ry*rad,Math.sin(a)*rz*rad,zz]);}));
      for(let i=0;i<segments;i++){const j=(i+1)%segments,tint=shade(c,.91+.08*Math.sin(i*.9));face([rows[0][i],rows[0][j],rows[1][j],rows[1][i]],tint);face([rows[2][j],rows[2][i],rows[3][i],rows[3][j]],metal.dark);face([rows[0][j],rows[0][i],rows[2][i],rows[2][j]],shade(c,1.13));face([rows[1][i],rows[1][j],rows[3][j],rows[3][i]],tint);}
      return turn;
    }
    function finish(){faces.dynamic=true;faces.industrial=true;faces.parts=parts;return faces;}
    return {faces,parts,face,plate,box,hull,cylinder,barrel,line,rivet,part,ring,finish};
  }
  function buildCathedral() {
    const m=builder();
    m.hull([{x:-83,y:0,z:2,ry:14,rz:14},{x:-59,y:0,z:0,ry:30,rz:24},{x:9,y:0,z:0,ry:35,rz:29},{x:65,y:1,z:1,ry:28,rz:23},{x:85,y:1,z:1,ry:19,rz:18}],metal.dark,10);
    // Interleaved armor follows the wedge. No sphere forms the silhouette.
    m.plate([[-81,-11],[-57,-28],[-7,-34],[17,-21],[2,-5],[-48,-5]],-24,-13,metal.hull,2.2);
    m.plate([[-79,10],[-45,25],[4,32],[29,19],[7,6],[-48,5]],-25,-12,shade(metal.hull,.94),2);
    m.plate([[-60,-3],[-31,-12],[6,-11],[24,-2],[9,9],[-34,9]],-33,-23,metal.edge,1.5);
    m.plate([[11,-29],[52,-30],[78,-17],[69,2],[35,9],[19,-4]],-28,-10,metal.hull,2.2);
    m.plate([[23,13],[61,8],[85,17],[72,36],[41,40],[15,27]],-26,-8,shade(metal.hull,.88),2);
    // Black recessed sensor slot with a thin amber receiving strip, under a brow.
    m.box(-48,-3,-34,35,7,2.3,metal.recess,.3);m.box(-48,-3,-35.7,27,1.2,.4,metal.hot,.15);
    m.plate([[-72,-9],[-26,-13],[-23,-8],[-64,-5]],-37,-32,metal.hull,.5);
    for(let i=0;i<3;i++)m.box(-54+i*10,-3,-36,2.5,4,.7,metal.dark,.2);
    // A long dorsal service boom and a compact lower engine give deliberate asymmetry.
    m.plate([[-28,-26],[12,-48],[71,-52],[95,-39],[76,-25],[17,-22]],-13,8,metal.hull,2);
    m.plate([[8,24],[31,47],[71,46],[89,31],[63,24]],-11,10,shade(metal.hull,.86),1.5);
    for(const side of [-1,1]) {
      const yy=side*35;
      m.hull([{x:-50,y:yy,z:-11,ry:11,rz:12},{x:39,y:yy,z:-9,ry:13,rz:13},{x:83,y:yy,z:-6,ry:10,rz:11}],metal.dark,8);
      m.box(-30,yy,-20,37,17,16,metal.hull,1.5);
      const start=m.faces.length;
      m.barrel(-116,-45,yy,-17,6.9,3.7,metal.edge,16);
      for(let i=0;i<6;i++){const x=-50-i*8;m.barrel(x-1,x+1,yy,-17,8.3,7.2,i<2?metal.dark:metal.hull,12,false);}
      for(const offset of [-1,1])m.line([-49,yy+offset*7,-17],[-105,yy+offset*7,-17],1.6,metal.dark);
      const cannon=m.part('cannon'+side,start,[-43,yy,-17],'cannon',side);
      cannon.gun=[-116,yy,-17];cannon.gunRest=cannon.gun.slice();
      m.plate([[-45,yy-13],[-12,yy-13],[3,yy],[-15,yy+13],[-48,yy+11]],-29,-16,metal.hull,1.2);
      // Hinged breech shields open to expose the gun's feed mechanism. The
      // hinge remains inside the fixed armored socket throughout its stroke.
      const breechStart=m.faces.length;
      m.plate([[-39,yy-10],[-12,yy-10],[-3,yy],[-14,yy+9],[-39,yy+9]],-34,-29,metal.edge,.9);
      m.line([-36,yy-8,-35],[-14,yy-8,-35],.9,metal.brass);
      const breech=m.part('breechShield'+side,breechStart,[-39,yy,-29],'hinge',side);
      breech.hinge=[0,1,0];breech.stroke=-.6;
      m.line([-41,yy-12,-29],[-41,yy+12,-29],2.2,metal.dark,8);
      // Side-facing turbopumps make rotation readable from the side camera.
      // Their swept blades turn inside stationary recessed shrouds.
      const shroudStart=m.faces.length;
      m.ring(48,14,14,2.5,5,metal.dark,32,0);
      const shifted=new Set();for(let i=shroudStart;i<m.faces.length;i++)for(const v of m.faces[i].v)if(!shifted.has(v)){shifted.add(v);v[1]+=yy;v[2]-=26;}
      const rotorStart=m.faces.length;
      for(let j=0;j<7;j++){
        const a=j*TAU/7,points=[[3,a],[11.6,a+.15],[11.6,a+.52],[4,a+.34]].map(([r,t])=>[48+Math.cos(t)*r,yy+Math.sin(t)*r]);
        m.plate(points,-29,-27,j%2?metal.edge:metal.brass,.35);
      }
      m.box(48,yy,-29.5,5.5,5.5,3,metal.dark,.7);
      m.part('turbopump'+side,rotorStart,[48,yy,-28],'z',side*2.35);
      m.line([33,yy,-31],[63,yy,-31],1.05,metal.hull);
      m.line([48,yy-15,-31],[48,yy+15,-31],1.05,metal.hull);
      // The shield generators visibly plug into articulated outboard sockets.
      m.line([7,side*29,-13],[-18,side*54,-29],5.5,metal.hull,8);
      m.box(-18,side*55,-35,22,21,9,metal.dark,1);
      m.box(-18,side*57,-40,17,17,3.5,metal.brass,.8);
      for(const x of [-25,-11])m.rivet(x,side*57,-42,.7);
      // The complete exhaust well vectors about its hull attachment, including
      // the ceramic core and cooling shutters. Nothing detaches during a turn.
      const driveStart=m.faces.length;
      m.barrel(96,76,side*35,-4,12,8.2,metal.dark,16);
      m.cylinder(79,80,side*35,-4,7.5,7.5,metal.hot,16,.65);
      for(let j=0;j<6;j++){const a=j/6*TAU;const yy2=side*35+Math.cos(a)*12.5,zz=-4+Math.sin(a)*12.5;m.line([76,yy2,zz],[93,yy2,zz],1.7,metal.edge);}
      for(let i=0;i<5;i++)m.box(78,side*35+(i-2)*3.6,-16,20,2,3,metal.dark,.3);
      const drive=m.part('exhaust'+side,driveStart,[76,side*35,-4],'vector',side);
      drive.drive={center:[96,side*35,-4],axis:[1,0,0],radius:8.2};drive.outletRest=drive.drive.center.slice();
      // Heat exchanger fins, recessed grilles, clamped feed pipes.
      m.box(41,side*23,-30,31,13,3,metal.recess,.5);
      for(let i=0;i<8;i++)m.box(28+i*3.7,side*23,-32,1.1,11,3,metal.edge,.2);
      m.line([8,side*15,-30],[20,side*18,-34],1.4,metal.brass);
      m.line([20,side*18,-34],[67,side*17,-29],1.4,metal.brass);
      for(let i=0;i<7;i++){const x=-47+i*18;m.rivet(x,side*(i<3?20:25),-29,.8);}
    }
    // Alien etched panel seams: controlled short lines, service fasteners and exposed cable runs.
    for(let i=0;i<7;i++){const x=8+i*8;m.box(x,-40,-17,3,12,2,shade(metal.brass,.75),.4);m.rivet(x,-44,-19,.6);}
    for(let i=0;i<5;i++){m.box(22+i*9,22,-28,5,2,1,metal.cold,.2);m.box(20+i*9,16,-28,2,3,1,metal.dark,.2);}
    m.box(48,-7,-34,28,12,7,metal.dark,1.1);
    for(let i=0;i<4;i++)m.box(39+i*6,-7,-38,2.6,8,1,metal.brass,.4);
    m.line([23,-2,-31],[31,-9,-37],2,metal.dark);m.line([31,-9,-37],[66,-10,-27],2,metal.dark);
    const mesh=m.finish();
    machineBossDesigns[1]={mesh,drives:m.parts.filter(p=>p.drive).map(p=>p.drive),scale:2.02,mouth:[-116,0,-17],guns:m.parts.filter(p=>p.gun).map(p=>p.gun),sockets:[[-18,-57,-40],[-18,57,-40]],bodyVolumes:[{center:[6,0,0],radii:[88,39,32]},{center:[7,-38,0],radii:[83,17,17]},{center:[26,35,0],radii:[66,15,15]}]};
  }
  function buildRegent() {
    const m=builder();
    m.hull([{x:-57,y:0,z:0,ry:22,rz:22},{x:-30,y:0,z:0,ry:31,rz:31},{x:20,y:0,z:0,ry:33,rz:33},{x:50,y:0,z:0,ry:23,rz:23}],metal.dark,12);
    // Six wedge-cut armor blocks expose the dark reactor underneath.
    for(let k=0;k<6;k++) {
      const a=k*TAU/6,y=Math.cos(a),z=Math.sin(a),r=32;
      const start=m.faces.length;
      m.plate([[-39,-11],[-16,-16],[26,-13],[43,-3],[30,10],[-20,12]],-8,5,k%2?metal.hull:shade(metal.hull,1.12),1.5);
      const transformed=new Set();for(let i=start;i<m.faces.length;i++)for(const p of m.faces[i].v){if(transformed.has(p))continue;transformed.add(p);const yy=p[1],zz=p[2];p[1]=y*(r+zz)+z*yy;p[2]=z*(r+zz)-y*yy;}
      m.line([-28,y*34,z*34],[23,y*37,z*37],1.05,metal.brass);
      m.line([-21,y*31,z*31],[14,y*34,z*34],.7,metal.cold,6,.35);
      const vane=m.part('heatVane'+k,start,[-36,y*32,z*32],'hinge',k);
      vane.hinge=[0,-z,y];vane.stroke=-.48;
      // Fixed hinge pins make the opening armored heat vanes intelligible.
      m.line([-36,y*32-z*9,z*32+y*9],[-36,y*32+z*9,z*32-y*9],2,metal.dark,8);
      m.cylinder(36,50,y*18,z*18,4.1,4.1,metal.brass,10);
      m.cylinder(49,51,y*18,z*18,2.5,2.5,metal.cold,10,.4);
    }
    // A single large axial induction cannon. Its bore belongs to the body and always points forward.
    m.cylinder(-66,-37,0,0,19,24,metal.dark,16);
    m.barrel(-113,-50,0,0,12.5,8.3,metal.edge,20);
    for(let i=0;i<6;i++){const x=-60-i*7;m.barrel(x-1.2,x+1.2,0,0,15.5-i*.32,12.8,metal.hull,16,false);}
    for(let k=0;k<8;k++){const a=k*TAU/8,y=Math.cos(a),z=Math.sin(a);m.line([-42,y*21,z*21],[-95,y*14,z*14],2.2,metal.dark,8);m.line([-47,y*19,z*19],[-89,y*13,z*13],.8,metal.cold,6,.2);}
    m.cylinder(-65,-64,0,0,7.5,7.5,metal.cold,16,.4);
    // Eight overlapping iris leaves retract into the cannon's muzzle collar.
    // Charging opens an actual aperture; no detached cannon is added on top.
    for(let k=0;k<8;k++){
      const a=k*TAU/8,start=m.faces.length,shape=[[1.2,a-.35],[8.4,a-.41],[9.1,a+.35],[2.2,a+.72]];
      const front=shape.map(([r,t])=>[-114.4,Math.cos(t)*r,Math.sin(t)*r]),back=front.map(p=>[p[0]+1.8,p[1],p[2]]);
      m.face(front,metal.brass);m.face(back.slice().reverse(),metal.dark);
      for(let i=0;i<4;i++)m.face([front[i],front[(i+1)%4],back[(i+1)%4],back[i]],metal.edge);
      const iris=m.part('irisLeaf'+k,start,[-113,Math.cos(a)*7,Math.sin(a)*7],'iris',k);
      iris.radial=[Math.cos(a),Math.sin(a)];
    }
    // An exposed flywheel drives the gyroscopes through a recessed side hub.
    const reactorShroud=m.faces.length;m.ring(4,22,22,3,5,metal.dark,40,0);
    const shroudSeen=new Set();for(let i=reactorShroud;i<m.faces.length;i++)for(const p of m.faces[i].v)if(!shroudSeen.has(p)){shroudSeen.add(p);p[2]-=42;}
    const reactorStart=m.faces.length;
    for(let k=0;k<9;k++){
      const a=k*TAU/9,points=[[6,a],[18.7,a+.2],[18.7,a+.48],[6,a+.24]].map(([r,t])=>[4+Math.cos(t)*r,Math.sin(t)*r]);
      m.plate(points,-45,-42,k%3===0?metal.cold:metal.brass,.6);
    }
    m.box(4,0,-45,9,9,4,metal.dark,1.2);m.box(4,0,-47,4,4,1,metal.cold,.5);
    m.part('reactorFlywheel',reactorStart,[4,0,-43],'z',1.25);
    for(const side of [-1,1])m.line([4,side*23,-46],[4,side*7,-46],1.5,metal.hull,8);
    // Concentric precision gimbals have real cross sections, inset tracks and bearing blocks.
    const ringSpecs=[{name:'outerGimbal',rx:77,ry:70,width:6.2,depth:7,tilt:.59,speed:.63,color:metal.hull},{name:'innerGimbal',rx:62,ry:55,width:4.6,depth:5.4,tilt:-.72,speed:-.87,color:metal.brass}];
    for(const spec of ringSpecs){
      const start=m.faces.length,turn=m.ring(20,spec.rx,spec.ry,spec.width,spec.depth,spec.color,64,spec.tilt);
      for(let i=0;i<16;i++){
        const a=i/16*TAU,rad=spec.rx-2.8,x=Math.cos(a)*rad,y=Math.sin(a)*(spec.ry-2.8);
        // Alternating ceramic rail tiles and small bearing covers stay attached to the rotating ring.
        const p=turn([x,y,-spec.depth/2-1.5]);
        m.box(p[0],p[1],p[2],i%4===0?7:3.2,i%4===0?7:3.2,2,i%4===0?metal.dark:metal.edge,.3);
        if(i%4===0){const q=turn([Math.cos(a)*(spec.rx-3),Math.sin(a)*(spec.ry-3),-spec.depth/2-3]);m.box(q[0],q[1],q[2],2.5,2.5,1,metal.cold,.3);}
      }
      m.part(spec.name,start,[20,0,0],'x',spec.speed);
      // Each ring rotates around a real pair of bearings on the shared axle.
      for(const side of [-1,1]){
        const x=20+side*spec.rx;
        m.cylinder(x-3,x+3,0,0,6,6,metal.dark,12);
        m.line([x,0,0],[20+side*36,0,0],3.2,metal.edge,8);
      }
    }
    // Four separate vectoring drives make its ability to hover physically legible.
    for(let k=0;k<4;k++){
      const a=Math.PI/4+k*TAU/4,yy=Math.cos(a)*45,zz=Math.sin(a)*45;
      m.line([27,yy*.58,zz*.58],[53,yy,zz],4,metal.hull,8);
      const driveStart=m.faces.length;
      m.hull([{x:42,y:yy,z:zz,ry:8,rz:9},{x:69,y:yy,z:zz,ry:10,rz:10},{x:81,y:yy,z:zz,ry:8,rz:8}],metal.hull,8);
      m.barrel(87,70,yy,zz,8.1,5.5,metal.dark,12);m.cylinder(73,74,yy,zz,5,5,metal.cold,12,.7);
      m.line([42,yy-5,zz-7],[74,yy-5,zz-7],1.1,metal.edge);
      for(let j=0;j<4;j++)m.box(78,yy+(j-1.5)*3,zz-9,17,1.5,2,metal.edge,.2);
      const drive=m.part('vectorDrive'+k,driveStart,[53,yy,zz],'vector',k);
      drive.drive={center:[87,yy,zz],axis:[1,0,0],radius:5.5};drive.outletRest=drive.drive.center.slice();
    }
    // Close-range detail: overlapping shell seams, fastening pads and heat sinks.
    for(let side of [-1,1])for(let i=0;i<7;i++){const x=-26+i*8;m.box(x,side*18,-29,3.5,9,4,metal.dark,.5);m.box(x,side*18,-32,1.4,7,1,metal.edge,.2);m.rivet(x,side*27,-24,.65);}
    m.plate([[-26,-10],[18,-14],[35,-3],[19,12],[-20,8]],-38,-30,metal.hull,1.2);
    m.box(3,-1,-40,24,5,2,metal.recess,.4);m.box(3,-1,-41.3,16,1.2,.6,metal.cold,.2);
    for(let i=0;i<4;i++)m.box(-9+i*7,10,-37,3,2,1,metal.brass,.2);
    const mesh=m.finish();
    machineBossDesigns[4]={mesh,drives:m.parts.filter(p=>p.drive).map(p=>p.drive),scale:1.95,mouth:[-113,0,0],guns:[[-113,0,0]],sockets:[],bodyVolumes:[{center:[0,0,0],radii:[62,36,35]}]};
  }
  buildCathedral();buildRegent();
})();
function animateMachineBoss(kind,b) {
  if(kind===1&&b.capitalDesign?.mesh?.capitalHull&&typeof animateCapitalHull==='function'){animateCapitalHull(b);return;}
  const design=machineBossDesigns[kind];if(!design)return;
  const age=b.age||0,phase=Number.isFinite(b.propulsionTime)?b.propulsionTime:age;
  const clamp=(v,a,c)=>Math.max(a,Math.min(c,v)),thrust=clamp(Number.isFinite(b.propulsion)?b.propulsion:.3,0,1);
  const vertical=clamp((b.flightVY||0)/420,-1,1),lateral=clamp((b.flightVX||0)/600,-1,1);
  const attack=clamp(Number.isFinite(b.attackDrive)?b.attackDrive:(b.charge>0?.45+.55*(1-clamp(b.charge/1.7,0,1)):b.barrage>0?1:0),0,1);
  const load=clamp(Number.isFinite(b.actionLoad)?b.actionLoad:thrust,0,1),muzzle=clamp((b.muzzle||0)/.16,0,1);
  for(const part of design.mesh.parts){
    let angle=0,shift=0,azimuth=0;
    if(part.axis==='x')angle=phase*part.speed-vertical*.14;
    if(part.axis==='z')angle=phase*part.speed;
    if(part.axis==='recoil')shift=clamp((b.muzzle||0)/.16,0,1)*4.5;
    if(part.axis==='cannon'){angle=phase*part.speed*.8;shift=muzzle*4.5;}
    if(part.axis==='hinge')angle=part.stroke*(.08+attack*.82+load*.1);
    if(part.axis==='iris')angle=attack*.82;
    if(part.axis==='shutter')angle=Math.sin(phase*2.1+part.speed)*(.08+thrust*.1);
    if(part.axis==='vector'){
      // Aim the complete nozzle against the climb. A small countersteer across
      // paired drives makes thrust changes legible without a wandering gun.
      angle=-vertical*.29+Math.sin(phase*1.2+part.speed*1.57)*(.02+thrust*.025);
      azimuth=lateral*.13+Math.sin(phase*.73+part.speed*2)*.025;
    }
    const cs=Math.cos(angle),sn=Math.sin(angle),ca=Math.cos(azimuth),sa=Math.sin(azimuth),p=part.pivot;
    for(const point of part.vertices){const r=point.rest,x=r[0]-p[0],y=r[1]-p[1],z=r[2]-p[2];
      if(part.axis==='x'||part.axis==='shutter'||part.axis==='cannon'){point.v[0]=r[0]+shift;point.v[1]=p[1]+y*cs-z*sn;point.v[2]=p[2]+y*sn+z*cs;}
      else if(part.axis==='z'){point.v[0]=p[0]+x*cs-y*sn;point.v[1]=p[1]+x*sn+y*cs;point.v[2]=r[2];}
      else if(part.axis==='hinge'){
        const a=part.hinge,dot=x*a[0]+y*a[1]+z*a[2],ic=1-cs;
        point.v[0]=p[0]+x*cs+(a[1]*z-a[2]*y)*sn+a[0]*dot*ic;
        point.v[1]=p[1]+y*cs+(a[2]*x-a[0]*z)*sn+a[1]*dot*ic;
        point.v[2]=p[2]+z*cs+(a[0]*y-a[1]*x)*sn+a[2]*dot*ic;
      }
      else if(part.axis==='iris'){point.v[0]=r[0];point.v[1]=p[1]+y*cs-z*sn+part.radial[0]*attack*2.5;point.v[2]=p[2]+y*sn+z*cs+part.radial[1]*attack*2.5;}
      else if(part.axis==='vector'){
        const tx=x*cs-y*sn,ty=x*sn+y*cs;
        point.v[0]=p[0]+tx*ca-z*sa;point.v[1]=p[1]+ty;point.v[2]=p[2]+tx*sa+z*ca;
      }else {point.v[0]=r[0]+shift;point.v[1]=r[1];point.v[2]=r[2];}
    }
    if(part.drive){
      // Rendering reads these sockets after articulation, so the plumes stay
      // attached to the moving nozzle instead of lagging behind the hull.
      const r=part.outletRest,x=r[0]-p[0],y=r[1]-p[1],z=r[2]-p[2],tx=x*cs-y*sn,d=part.drive;
      d.center[0]=p[0]+tx*ca-z*sa;d.center[1]=p[1]+x*sn+y*cs;d.center[2]=p[2]+tx*sa+z*ca;
      d.axis[0]=cs*ca;d.axis[1]=sn;d.axis[2]=cs*sa;
    }
    if(part.gun){part.gun[0]=part.gunRest[0]+shift;part.gun[1]=part.gunRest[1];part.gun[2]=part.gunRest[2];}
  }
  if(kind===1)design.mouth[0]=-116+muzzle*4.5;
}
