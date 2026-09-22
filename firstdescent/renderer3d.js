import * as THREE from './vendor/three.module.min.js';
import { AuthoredAssets, AUTHORED_ASSETS } from './authored-assets.js?v=20260920-download68';
// One retained GPU renderer, cached indexed meshes, smooth normals and pooled objects.
const surface=document.createElement('canvas');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas:surface,alpha:true,antialias:true,powerPreference:'high-performance',premultipliedAlpha:true});}catch(error){console.warn('WebGL unavailable; using compatibility renderer.',error)}
if(renderer){
 surface.addEventListener('webglcontextlost',event=>{event.preventDefault();window.dispatchEvent(new CustomEvent('game-render-error',{detail:new Error('The graphics context was lost.')}))});
 renderer.setSize(1440,760,false);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.setClearColor(0x000000,0);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-720,720,380,-380,1,4000);camera.position.z=1200;
 const ambient=new THREE.HemisphereLight(0xb7e9ff,0x25213d,2);scene.add(ambient);
 const key=new THREE.DirectionalLight(0xffe6c4,3.4);key.position.set(-400,500,700);scene.add(key);
 const rim=new THREE.DirectionalLight(0x65cfff,2.8);rim.position.set(400,-100,-400);scene.add(rim);
 const fill=new THREE.DirectionalLight(0xbe88ff,.7);fill.position.set(500,-300,600);scene.add(fill);
 // Strong directional light and restrained ambient illumination reveal form.
 // Four retained lights, no shadow maps or extra per-object passes. Profiles are
 // static within a scene so movement cannot produce brightness flicker.
 const environmentLights={
  daylight:{sky:0xcadbe7,ground:0x454137,ambient:1.05,key:0xffe8c8,power:3.7,from:[-500,600,500],rim:0xa1bbcf,edge:.65,fill:0xd9c6a0,bounce:.28,below:[350,-280,450]},
  foundry:{sky:0xd1bd9f,ground:0x2e231c,ambient:1.05,key:0xffedcc,power:4.3,from:[-480,430,380],rim:0xd8863d,edge:.7,fill:0xff983e,bounce:.85,below:[150,-500,280]},
  underwater:{sky:0x76bdc9,ground:0x162c3a,ambient:.85,key:0xbce7e4,power:3.6,from:[-180,680,330],rim:0x49839a,edge:.6,fill:0x6da3af,bounce:.3,below:[450,-200,380]},
  ice:{sky:0xb6cad9,ground:0x293b51,ambient:.95,key:0xe7f3ff,power:3.7,from:[-420,650,430],rim:0x8aafc8,edge:.75,fill:0xabc6d8,bounce:.35,below:[300,-350,420]},
  hot:{sky:0xb69480,ground:0x392318,ambient:.7,key:0xffd9b2,power:3.25,from:[-500,500,420],rim:0xed7631,edge:.55,fill:0xff7025,bounce:1.5,below:[100,-550,300]},
  storm:{sky:0xb7b9c7,ground:0x30333f,ambient:1.1,key:0xffe0b6,power:3.35,from:[450,560,400],rim:0x8da4c2,edge:.55,fill:0xb1b9c8,bounce:.3,below:[-450,-200,380]},
  cavern:{sky:0x768a88,ground:0x202a28,ambient:.85,key:0xc2d9c8,power:3.4,from:[-280,550,330],rim:0x729489,edge:.65,fill:0x819c95,bounce:.3,below:[350,-200,380]},
  space:{sky:0x8d9cae,ground:0x1c2334,ambient:.7,key:0xffe6ce,power:3.9,from:[-550,300,450],rim:0x708fae,edge:.8,fill:0xa0a6ba,bounce:.25,below:[400,-250,450]}
 };
 let environmentName=null;
 function setEnvironment(name){if(!environmentLights[name])name='daylight';if(environmentName===name)return;environmentName=name;const p=environmentLights[name];ambient.color.setHex(p.sky);ambient.groundColor.setHex(p.ground);ambient.intensity=p.ambient;key.color.setHex(p.key);key.intensity=p.power;key.position.set(...p.from);rim.color.setHex(p.rim);rim.intensity=p.edge;fill.color.setHex(p.fill);fill.intensity=p.bounce;fill.position.set(...p.below);}
 // Three shared, lazy material maps cover the anchored scenery families.
 const terrainTextures={};
 function terrainMap(kind){const name=kind==='foundry'?'foundry':kind==='basalt'?'basalt':'mineral';if(terrainTextures[name])return terrainTextures[name];const t=new THREE.TextureLoader().load('assets/terrain-'+name+'-v123.webp',t=>renderer.initTexture?.(t));t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return terrainTextures[name]=t;}
 let glacierTexture=null;
 function getGlacierTexture(){if(!glacierTexture){glacierTexture=new THREE.TextureLoader().load('assets/terrain-glacier-v1.webp',t=>renderer.initTexture?.(t));glacierTexture.colorSpace=THREE.SRGBColorSpace;glacierTexture.wrapS=glacierTexture.wrapT=THREE.ClampToEdgeWrapping;glacierTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}return glacierTexture;}
 let bossAtlasTexture=null; // Legacy artwork loads only when a compatibility model requests it.
 const rockTexture=new THREE.TextureLoader().load('assets/asteroid-stone-v2.webp');rockTexture.colorSpace=THREE.SRGBColorSpace;rockTexture.wrapS=rockTexture.wrapT=THREE.RepeatWrapping;rockTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 // Reference surface maps retain their original UV islands; never tile or lift
 // them with the old generic-rock correction. Load only the requested family.
 const asteroidTextures={};
 function asteroidMaps(name){if(asteroidTextures[name])return asteroidTextures[name];const load=(suffix,color)=>{const t=new THREE.TextureLoader().load('assets/asteroid-'+name+'-'+suffix+'-v1.webp',t=>renderer.initTexture?.(t));t.flipY=false;if(color)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;};return asteroidTextures[name]={color:load('color',true),normal:name==='eros'?load('normal',false):null};}
 const alienTextures={};for(const [name,file] of Object.entries({chitin:'alien-chitin-v3.webp',flesh:'alien-flesh-v3.webp'})){const t=new THREE.TextureLoader().load('assets/'+file);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());alienTextures[name]=t;}
 function smoothNormals(g,groups){g.computeVertexNormals();const n=g.attributes.normal.array;for(const group of groups){let x=0,y=0,z=0;for(const i of group){x+=n[i*3];y+=n[i*3+1];z+=n[i*3+2];}const len=Math.hypot(x,y,z)||1;for(const i of group){n[i*3]=x/len;n[i*3+1]=y/len;n[i*3+2]=z/len;}}g.attributes.normal.needsUpdate=true;}
 const geoCache=new Map(),slots=[];let renderFrame=0,disposedGeometry=0;let used=0,batch=0,frames=0,peakTriangles=0,pending=0,frameDrawCalls=0,frameTriangles=0,pendingStart=0,frameCompositePixels=0,framePasses=0;
 let clipLeft=1440,clipTop=760,clipRight=0,clipBottom=0;
 const boundCenter=new THREE.Vector3();
 function resetClip(){clipLeft=1440;clipTop=760;clipRight=clipBottom=0;}
 function includeDrawBounds(data,faces,matrix){
  // CPU-final meshes may opt into bounds refreshed alongside vertex uploads.
  // Unknown/GPU-deformed motion retains its conservative full viewport.
  if(faces.dynamic&&(!faces.cpuBounds||!data.motionBounds)){clipLeft=clipTop=0;clipRight=1440;clipBottom=760;return true;}
  if(faces.cpuBounds&&data.motionBounds){
   const q=data.motionBounds,e=matrix.elements;boundCenter.set(q.cx,q.cy,q.cz).applyMatrix4(matrix);
   const rx=Math.abs(e[0])*q.hx+Math.abs(e[4])*q.hy+Math.abs(e[8])*q.hz+3,ry=Math.abs(e[1])*q.hx+Math.abs(e[5])*q.hy+Math.abs(e[9])*q.hz+3,x=720+boundCenter.x,y=380-boundCenter.y;
   if(x+rx<0||x-rx>1440||y+ry<0||y-ry>760)return false;
   clipLeft=Math.min(clipLeft,Math.max(0,Math.floor(x-rx)));clipTop=Math.min(clipTop,Math.max(0,Math.floor(y-ry)));clipRight=Math.max(clipRight,Math.min(1440,Math.ceil(x+rx)));clipBottom=Math.max(clipBottom,Math.min(760,Math.ceil(y+ry)));return true;
  }
  const sphere=data.geometry.boundingSphere,e=matrix.elements;boundCenter.copy(sphere.center).applyMatrix4(matrix);
  const rx=sphere.radius*Math.hypot(e[0],e[4],e[8])+3,ry=sphere.radius*Math.hypot(e[1],e[5],e[9])+3,x=720+boundCenter.x,y=380-boundCenter.y;
  if(x+rx<0||x-rx>1440||y+ry<0||y-ry>760)return false;
  clipLeft=Math.min(clipLeft,Math.max(0,Math.floor(x-rx)));clipTop=Math.min(clipTop,Math.max(0,Math.floor(y-ry)));clipRight=Math.max(clipRight,Math.min(1440,Math.ceil(x+rx)));clipBottom=Math.max(clipBottom,Math.min(760,Math.ceil(y+ry)));return true;
 }
 function makeTexture(organic){const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d'),data=c.createImageData(128,128);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const hash=((x*73856093)^(y*19349663))>>>0,grain=(hash%37)-18;const groove=organic?(Math.sin(x*.23+Math.sin(y*.14)*2)*Math.cos(y*.31)*18+(hash%17===0?-48:0)):(x%32<2||y%48<2?-35:0);const value=128+grain*.35+groove;const k=(y*128+x)*4;data.data[k]=data.data[k+1]=data.data[k+2]=value;data.data[k+3]=255}c.putImageData(data,0,0);const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t}
 const metalTexture=makeTexture(false),skinTexture=makeTexture(true);
 // One retained finish for painted machinery: fine abrasion and broad soot
 // mottling enrich the hull without repeating a prominent square panel image.
 const industrialCanvas=document.createElement('canvas');industrialCanvas.width=industrialCanvas.height=256;const industrialBrush=industrialCanvas.getContext('2d'),industrialData=industrialBrush.createImageData(256,256);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const hash=((x*73856093)^(y*19349663))>>>0,grain=(hash%23)-11,soot=Math.pow(Math.max(0,Math.sin(x*.024+Math.sin(y*.043)*1.3)*Math.cos(y*.029-x*.012)),2),scratch=hash%317===0?25:0,value=232+grain*.6-soot*30-scratch,k=(y*256+x)*4;industrialData.data[k]=value*.98;industrialData.data[k+1]=value;industrialData.data[k+2]=value*.99;industrialData.data[k+3]=255;}
 industrialBrush.putImageData(industrialData,0,0);const industrialColor=new THREE.CanvasTexture(industrialCanvas);industrialColor.colorSpace=THREE.SRGBColorSpace;industrialColor.wrapS=industrialColor.wrapT=THREE.RepeatWrapping;industrialColor.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const skinCanvas=document.createElement('canvas');skinCanvas.width=skinCanvas.height=256;const skinBrush=skinCanvas.getContext('2d'),skinData=skinBrush.createImageData(256,256);for(let y=0;y<256;y++)for(let x=0;x<256;x++){const fine=Math.sin(x*1.71+y*2.33)*Math.cos(y*1.93-x*.79),mottle=Math.sin(x*.071+Math.sin(y*.043)*2)*Math.cos(y*.089+Math.sin(x*.061)),freckle=Math.pow(Math.max(0,Math.sin(x*.41+y*.23)*Math.cos(y*.39-x*.12)),12),v=221+mottle*18+fine*5-freckle*42,k=(y*256+x)*4;skinData.data[k]=v;skinData.data[k+1]=v*.97;skinData.data[k+2]=v*.94;skinData.data[k+3]=255}skinBrush.putImageData(skinData,0,0);const skinColor=new THREE.CanvasTexture(skinCanvas);skinColor.colorSpace=THREE.SRGBColorSpace;skinColor.wrapS=skinColor.wrapT=THREE.RepeatWrapping;
 function geometry(faces){if(geoCache.has(faces)){const cached=geoCache.get(faces);cached.lastUsed=renderFrame;if(faces.dynamic&&(!(faces.alienMaterial||faces.capitalHull)||cached.uploadFrame!==renderFrame)){cached.uploadFrame=renderFrame;const a=cached.geometry.attributes.position;const positions=a.array;const bounds=cached.motionBounds;let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;for(let i=0;i<cached.sources.length;i++){const v=cached.sources[i],j=i*3;positions[j]=v[0];positions[j+1]=v[1];positions[j+2]=v[2];if(bounds){minX=Math.min(minX,v[0]);minY=Math.min(minY,v[1]);minZ=Math.min(minZ,v[2]);maxX=Math.max(maxX,v[0]);maxY=Math.max(maxY,v[1]);maxZ=Math.max(maxZ,v[2]);}}if(bounds){bounds.cx=(minX+maxX)/2;bounds.cy=(minY+maxY)/2;bounds.cz=(minZ+maxZ)/2;bounds.hx=(maxX-minX)/2;bounds.hy=(maxY-minY)/2;bounds.hz=(maxZ-minZ)/2;}a.needsUpdate=true;cached.normalFrame=(cached.normalFrame||0)+1;if(faces.painted===undefined&&cached.normalFrame%((window.flightEffectsQuality||1)<1?4:3)===0)smoothNormals(cached.geometry,cached.smoothGroups||[])}return cached}const sources=[],positions=[],colors=[],glow=[],flex=[],wet=[],textureWeight=[],blinkData=[],faunaJoints=[],foliage=[],uv=[],indices=[],lookup=new Map(),normalGroups=new Map(),pointKeys=new Map(),linearColors=new Map();let organic=!!faces.skin;
 for(const f of faces){const ids=f.v.map((v,vi)=>{const vertexColor=f.vertexColors?.[vi]||f.c;let pointKey=pointKeys.get(v);if(pointKey===undefined){pointKey=v.map(n=>n.toFixed(4)).join(',');pointKeys.set(v,pointKey);}const key=pointKey+'|'+vertexColor.join(',')+'|'+f.em+'|'+f.flex+'|'+(f.wet||0)+'|'+(f.textureWeight??1)+'|'+(f.blink||'')+'|'+(f.joint||'')+'|'+(f.smoothGroup||'')+'|'+(f.growth?.[vi]||'')+(f.uv?'|'+f.uv[vi].join(','):'');if(lookup.has(key))return lookup.get(key);const i=positions.length/3;positions.push(...v);sources.push(v);const normalKey=pointKey+'|'+(f.smoothGroup||'');if(!faces.industrial||f.smoothGroup){if(!normalGroups.has(normalKey))normalGroups.set(normalKey,[]);normalGroups.get(normalKey).push(i);}const colorKey=vertexColor.join(',');let color=linearColors.get(colorKey);if(!color){color=new THREE.Color(`rgb(${vertexColor.map(n=>Math.round(Math.max(0,Math.min(255,n)))).join(',')})`);linearColors.set(colorKey,color);}colors.push(color.r,color.g,color.b);foliage.push(...(f.growth?.[vi]||[0,0]));glow.push(f.em||0);flex.push(f.flex||0);wet.push(f.wet||0);textureWeight.push(f.textureWeight??1);faunaJoints.push(...(f.joint||[0,0,0,0]));blinkData.push(...(f.blink?[f.blink[0],f.blink[1],1]:[0,0,0]));if(f.uv){uv.push(...f.uv[vi]);}else if(faces.terrainMaterial==='ice'&&faces.terrainUV){const f=faces.terrainUV,x=v[0]/f.width,y=v[1]/f.height,u=f.side?y:x,t=f.side?x:y,offset=(Math.sin(f.seed*17.3)*.5+.5)*.18;uv.push(.04+offset+u*.70,.04+(f.flip?1-t:t)*.92);}else if(faces.terrainMaterial==='ice')uv.push(v[0]/300,v[1]/300);else if(faces.rock)uv.push(v[0]/160,v[1]/160);else uv.push(v[0]/38,v[1]/38);lookup.set(key,i);return i});for(let i=1;i<ids.length-1;i++)indices.push(ids[0],ids[i],ids[i+1]);if(f.flex)organic=true}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('glow',new THREE.Float32BufferAttribute(glow,1));g.setAttribute('flex',new THREE.Float32BufferAttribute(flex,1));g.setAttribute('wet',new THREE.Float32BufferAttribute(wet,1));g.setAttribute('textureWeight',new THREE.Float32BufferAttribute(textureWeight,1));g.setAttribute('blinkData',new THREE.Float32BufferAttribute(blinkData,3));g.setAttribute('foliage',new THREE.Float32BufferAttribute(foliage,2));g.setAttribute('faunaJoint',new THREE.Float32BufferAttribute(faunaJoints,4));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);if(faces.dynamic)g.attributes.position.setUsage(THREE.DynamicDrawUsage);const smoothGroups=(faces.alienMaterial||faces.rock||faces.industrial)?[...normalGroups.values()].filter(g=>g.length>1):[];smoothNormals(g,smoothGroups);if(faces.dynamic)g.attributes.normal.setUsage(THREE.DynamicDrawUsage);g.computeBoundingSphere();if(organic||faces.fauna)g.boundingSphere.radius+=90;if(faces.foliage)g.boundingSphere.radius+=4;const value={geometry:g,organic,sources,smoothGroups,lastUsed:renderFrame};if(faces.cpuBounds){g.computeBoundingBox();const lo=g.boundingBox.min,hi=g.boundingBox.max;value.motionBounds={cx:(lo.x+hi.x)/2,cy:(lo.y+hi.y)/2,cz:(lo.z+hi.z)/2,hx:(hi.x-lo.x)/2,hy:(hi.y-lo.y)/2,hz:(hi.z-lo.z)/2};}geoCache.set(faces,value);return value}
 function material(organic){const m=new THREE.MeshStandardMaterial({vertexColors:true,metalness:organic?0:.64,roughness:organic?.76:.34,map:organic?skinColor:null,side:THREE.DoubleSide,bumpMap:organic?skinTexture:metalTexture,bumpScale:organic?1.1:.3,transparent:true,forceSinglePass:true});
 // A draw hook runs before Three compiles a newly selected program. Keep
 // uniforms on the material itself so first-frame and cached variants read
 // the same current state, instead of whichever shader compiled most recently.
 const modelUniforms=m.userData.modelUniforms={motionTime:{value:0},rigKind:{value:0},hitFlash:{value:0},organicSurface:{value:organic?1:0},alienSurface:{value:0},pilotSurface:{value:0},terrainSurface:{value:0},terrainGrowth:{value:0},sceneryLight:{value:0}};
 m.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vTerrainNormal=normal;');shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','if(foliage.x>0.0){float w=foliage.x*foliage.x;transformed.x+=sin(motionTime*1.3+foliage.y+foliage.x*2.0)*w*2.4;transformed.z+=cos(motionTime*1.1+foliage.y)*w*1.2;}\n#include <project_vertex>');Object.assign(shader.uniforms,modelUniforms);m.userData.shader=shader;
 shader.vertexShader='attribute vec2 foliage; varying vec3 vTerrainNormal; attribute vec4 faunaJoint; attribute vec3 blinkData; float blinkPulse(float x){return x<0.0||x>.26?0.0:x<.065?sin(x/.065*1.57079633):cos((x-.065)/.195*1.57079633);} attribute float textureWeight; varying float vTextureWeight; attribute float glow; attribute float flex; attribute float wet; varying float vWet; varying vec3 vSkinPosition; varying float vGlow; uniform float motionTime; uniform float rigKind;\n'+shader.vertexShader;
 shader.vertexShader=`
 vec3 speciesJoint(vec3 p,vec4 j,float t){
  if(j.w<.5)return p;vec3 v=p-j.xyz;float side=j.z<0.0?-1.0:1.0;float w=min(1.0,length(v)/35.0),a=0.0;int axis=0;
  if(j.w>8.5){
   float along=max(0.0,(v.x-12.0)/55.0),u=min(1.0,along),bend=u*u*(3.0-2.0*u);if(bend==0.0)return p;
   float phase=t*6.8+atan(j.z,j.y)*1.7+j.x*.07,lag=phase-along*5.2;
   float cycle=mod(t,3.6),tuck=smoothstep(.35,.60,cycle)*(1.0-smoothstep(1.35,1.80,cycle));
   float jet=pow((1.0+cos(t*4.8))*.5,4.0),gather=bend*(.26*jet+.58*tuck),free=1.0-.78*tuck;
   float twist=bend*sin(lag*.73)*.75,c=cos(twist),sn=sin(twist),amplitude=bend*(11.0+5.0*u)*free;
   return j.xyz+vec3(v.x-bend*(3.0+3.0*sin(lag)),v.y*c-v.z*sn-p.y*gather+amplitude*sin(lag),v.y*sn+v.z*c-p.z*gather+amplitude*cos(lag*.91+.8));
  }
  if(j.w<1.5||(j.w>2.5&&j.w<3.5)||j.w>7.5){axis=1;a=j.w>7.5?t*18.0:side*sin(t*(j.w<1.5?14.0:5.0)+j.x*.03)*(j.w<1.5?.62:.38);}
  else if(j.w>3.5&&j.w<4.5){axis=2;a=sin(t*6.0-max(0.0,v.x)*.045)*min(1.0,max(0.0,v.x)/85.0)*.27;}
  else if(j.w>4.5&&j.w<5.5){float pulse=pow((1.0+cos(t*4.8))*.5,4.0),f=min(1.0,abs(v.x)/45.0);return j.xyz+vec3(v.x+3.0*pulse*f,v.yz*(1.0-.14*pulse*f));}
  else if(j.w>5.5&&j.w<6.5)a=.08+pow((1.0+sin(t*3.0))*.5,3.0)*.32;
  else if(j.w>6.5){axis=2;float u=clamp((length(v)-12.0)/23.0,0.0,1.0),bend=u*u*(3.0-2.0*u);if(bend==0.0)return p;a=sin(t*9.0-bend*3.0+j.x*.09+j.z*.07)*bend*.34;}
  else a=sin(t*9.0+j.x*.09+j.z*.07)*w*.28;
  mat2 turn=mat2(cos(a),sin(a),-sin(a),cos(a));
  if(axis==1)v.yz=turn*v.yz;else if(axis==2)v.xz=turn*v.xz;else v.xy=turn*v.xy;return j.xyz+v;
 }
 `+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
 if(faunaJoint.w>.5)objectNormal=normalize(speciesJoint(position+objectNormal*.01,faunaJoint,motionTime)-speciesJoint(position,faunaJoint,motionTime));
 `);
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 if(blinkData.z>.5){float t=mod(motionTime*1.55+blinkData.y*1.73,17.3);float b=max(max(blinkPulse(t-2.1),blinkPulse(t-6.7)),max(max(blinkPulse(t-10.2),blinkPulse(t-10.57)),blinkPulse(t-15.4)));transformed.y=blinkData.x+(transformed.y-blinkData.x)*(1.0-.97*b);}
 vTextureWeight=textureWeight;vGlow=glow;vWet=wet;vSkinPosition=position;
 if(faunaJoint.w>.5)transformed=speciesJoint(transformed,faunaJoint,motionTime);
 else if(rigKind>2.5){float span=max(0.0,abs(position.y)-12.0);float drive=1.0+.65*pow((1.0+cos(motionTime*3.2))*.5,5.0);transformed.z+=sin(motionTime*3.2-position.x*.055)*span*.44*drive;}
 else if(rigKind>0.5){float phase=motionTime*(rigKind<1.5?4.8:3.8);
 if(position.x<23.0){float weight=smoothstep(-22.0,-4.0,position.x)*(1.0-smoothstep(10.0,23.0,position.x));float contraction=pow((1.0+cos(phase+(position.x+20.0)*.045))*.5,4.0);float extension=pow((1.0+cos(phase-.3))*.5,5.0)*(1.0-smoothstep(4.0,23.0,position.x));transformed.x+=weight*contraction*4.0-extension*9.0;transformed.yz*=(1.0-.22*weight*contraction)*(1.0-extension*.045);}
 else{float along=max(0.0,position.x-23.0)/67.0;float arm=atan(position.z,position.y);float lag=phase-along*3.5+arm*.18;float cycle=mod(mod(motionTime,3.6)+3.6,3.6);float tuck=smoothstep(.35,.6,cycle)*(1.0-smoothstep(1.35,1.8,cycle));float root=smoothstep(0.0,.4,along);float jet=pow((1.0+cos(phase))*.5,5.0);float release=sin(lag-.65)+.32*sin(2.0*lag-1.3);float bundle=(1.0+root*(-.46*pow((1.0+cos(lag))*.5,3.0)+.20*max(0.0,sin(lag-.7))+(1.0-tuck)*.30))*(1.0-.75*tuck*root);float drive=1.0+jet*.7;float curl=release*along*along*32.0*drive*(1.0-.9*tuck);transformed.x+=root*along*(jet*9.0-max(0.0,release)*24.0);transformed.y=position.y*bundle+cos(arm+.8+root*.48*sin(phase-along*1.8)+tuck*along*3.0)*curl;transformed.z=position.z*bundle+sin(arm+.8+root*.48*sin(phase-along*1.8)+tuck*along*3.0)*curl;}}
 else if(flex>0.0){float cycle=mod(mod(motionTime,3.6)+3.6,3.6);float tuck=smoothstep(.35,.6,cycle)*(1.0-smoothstep(1.35,1.8,cycle));float root=clamp((position.x-10.0)/45.0,0.0,1.0);transformed.yz*=1.0-.75*tuck*root;float drive=1.0+.75*pow((1.0+cos(motionTime*2.0))*.5,5.0);float bend=max(0.0,position.x-10.0)*flex*drive*(1.0-.9*tuck);transformed.y+=sin(motionTime*3.0-position.x*.07)*bend*.23;transformed.z+=cos(motionTime*2.4-position.x*.06)*bend*.22;}`);
 shader.fragmentShader=`varying vec3 vTerrainNormal; uniform float sceneryLight; uniform float terrainSurface; uniform float terrainGrowth; varying float vTextureWeight; varying float vGlow; varying float vWet; varying vec3 vSkinPosition; uniform float alienSurface; uniform float pilotSurface; uniform float hitFlash; uniform float organicSurface;
 float skinHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
 float skinNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(skinHash(i),skinHash(i+vec3(1,0,0)),f.x),mix(skinHash(i+vec3(0,1,0)),skinHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(skinHash(i+vec3(0,0,1)),skinHash(i+vec3(1,0,1)),f.x),mix(skinHash(i+vec3(0,1,1)),skinHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
 `+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>', `vec3 terrainTexel=vec3(1.0);
 #ifdef USE_MAP
 if(terrainSurface>0.5){
  vec3 blend=pow(abs(normalize(vTerrainNormal)),vec3(4.0));blend/=max(dot(blend,vec3(1.0)),.0001);
  vec3 p=vSkinPosition/(terrainSurface<1.5?230.0:300.0);
  terrainTexel=texture2D(map,p.yz).rgb*blend.x+texture2D(map,p.xz).rgb*blend.y+texture2D(map,p.xy).rgb*blend.z;
  diffuseColor.rgb*=mix(vec3(1.0),clamp(vec3(.42)+terrainTexel*2.5,vec3(.36),vec3(1.45)),vTextureWeight);
 }else{
 #include <map_fragment>
 }
 #endif
 if(terrainSurface>0.5){}else if(organicSurface>5.5&&organicSurface<6.5){float relief=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=vec3(clamp(.12+pow(max(relief,0.0),.62)*1.75,.12,1.08));}else if(organicSurface>4.5&&organicSurface<5.5){float relief=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=vec3(.78+relief*.65);}else if(alienSurface>0.5){float relief=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(vec3(1.0),vec3(clamp(.32+relief*2.9,.28,1.35)),vTextureWeight);}`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 if(terrainSurface>0.5){if(terrainGrowth>.5){float growthPatch=smoothstep(.44,.69,skinNoise(vSkinPosition*.047)+skinNoise(vSkinPosition*.18)*.19);diffuseColor.rgb*=mix(vec3(1.0),vec3(.54,.72,.39),growthPatch*.78*vTextureWeight);}}else if(pilotSurface>0.5){diffuseColor.rgb*=.96+skinNoise(vSkinPosition*.15)*.04;}else if(alienSurface>0.5){float dermalPatch=skinNoise(vSkinPosition*.075);float pore=skinNoise(vSkinPosition*1.3);float fold=skinNoise(vSkinPosition*.38);float vein=1.0-smoothstep(.012,.05,abs(fold-.48));vec3 pigment=mix(vec3(.56,.70,.87),vec3(1.20,1.05,.78),smoothstep(.23,.76,dermalPatch));float scaleEdge=1.0-smoothstep(.06,.18,abs(sin(vSkinPosition.x*.72+sin(vSkinPosition.y*.9)*.7)*sin(vSkinPosition.z*.72+sin(vSkinPosition.y*.65)*.6)));pigment*=.83+pore*.25-vein*.12-scaleEdge*(alienSurface<1.5?.18:.07);diffuseColor.rgb*=mix(vec3(1.0),pigment,vTextureWeight*(1.0-vWet*.8));}else if(organicSurface>3.5){
 vec3 p=vSkinPosition;float broad=skinNoise(p*.027);
 if(organicSurface<4.5){diffuseColor.rgb*=.96+broad*.08;}
 else{diffuseColor.rgb*=.93+broad*.12;}
 }else if(organicSurface>1.5){float strata=skinNoise(vSkinPosition*.12)+skinNoise(vSkinPosition*.6)*.3;float mineral=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(mineral*.98,mineral,mineral*1.03),organicSurface>2.5?.18:.7)*(organicSurface>2.5?(.92+strata*.12):(.7+strata*.5));}else if(organicSurface>0.5){float skinPatch=skinNoise(vSkinPosition*.085);float detail=skinNoise(vSkinPosition*.48);float vein=1.0-smoothstep(.015,.075,abs(detail-.49));vec3 dermis=mix(vec3(.48,.39,.43),vec3(1.14,1.08,.86),smoothstep(.2,.78,skinPatch));dermis*=1.0-vein*.3;dermis*=.83+skinNoise(vSkinPosition*1.4)*.3;diffuseColor.rgb*=mix(dermis,vec3(1.0),vWet);}else{float wear=skinNoise(vSkinPosition*.7);float panel=step(.94,fract(vSkinPosition.x*.09))+step(.94,fract(vSkinPosition.y*.09));diffuseColor.rgb*=mix(1.0,clamp(.7+wear*.4-panel*.25,.3,1.1),vTextureWeight);}
 `);
 shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 if(alienSurface>0.5)roughnessFactor=mix((alienSurface<1.5?.58:.49)+skinNoise(vSkinPosition*.24)*.18,.17,vWet);else if(organicSurface>1.5)roughnessFactor=roughness;else if(organicSurface>0.5)roughnessFactor=mix(.68+skinNoise(vSkinPosition*.2)*.2,.13,vWet);
 `);
 shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`if(terrainSurface>0.5){
 #ifdef USE_BUMPMAP
 float terrainHeight=dot(terrainTexel,vec3(.2126,.7152,.0722))*bumpScale*vTextureWeight;
 normal=perturbNormalArb(-vViewPosition,normal,vec2(dFdx(terrainHeight),dFdy(terrainHeight)),faceDirection);
 #endif
 }else{
 #include <normal_fragment_maps>
 }`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance += vGlow * diffuseColor.rgb * 1.8;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
 // Broad fixed light pools respond to position and the shaded surface normal.
 // No clock pulse: stationary scenery retains exactly the same illumination.
 if(sceneryLight>0.5){
  bool warm=sceneryLight>1.5;
  vec3 lamp=vec3(-340.0,warm?-470.0:530.0,-800.0);
  vec3 ray=lamp+vViewPosition;
  float pool=exp(-dot(ray.xy,ray.xy)/360000.0);
  float facing=max(0.0,dot(normal,normalize(ray)));
  vec3 tint=warm?vec3(1.0,.48,.18):vec3(.55,.82,1.0);
  outgoingLight*=.88+.12*pool;
  outgoingLight+=diffuseColor.rgb*tint*facing*pool*(sceneryLight>2.5?1.1:.72);
 }
 // Brief impact sheen preserves albedo, skin pores and light/shadow contrast.
 // A glancing surface catches the flash; the whole creature never becomes a
 // flat white mask while sustained automatic fire keeps registering hits.
 float impactRim=pow(1.0-clamp(abs(dot(normal,normalize(vViewPosition))),0.0,1.0),3.0);
 outgoingLight*=1.0+hitFlash*.10;
 outgoingLight+=hitFlash*impactRim*(vec3(.12,.19,.21)+diffuseColor.rgb*.16);
 #include <opaque_fragment>`);};return m}
 const affine=new THREE.Matrix4(),local=new THREE.Matrix4(),rotation=new THREE.Matrix4(),scaleMatrix=new THREE.Matrix4(),euler=new THREE.Euler(0,0,0,'ZXY');
 const instanceGroups=new Map(),instanceMatrix=new THREE.Matrix4();let frameInstancedObjects=0;
 function queueRigidInstance(faces,data,context,x,y,scale,yaw,roll,pitch){
  const a=context.getTransform();if(a.a*a.d-a.b*a.c<0||scale<0)return false; // Three instancing does not support reflected matrices.
  let group=instanceGroups.get(faces);
  if(!group){const object=new THREE.InstancedMesh(data.geometry,material(false),128);object.instanceMatrix.setUsage(THREE.DynamicDrawUsage);object.frustumCulled=false;object.matrixAutoUpdate=false;object.visible=false;scene.add(object);group={object,count:0};instanceGroups.set(faces,group);}
  if(group.count===128)return false; // Overflow keeps the ordinary draw path.
  if(group.object.geometry!==data.geometry)group.object.geometry=data.geometry;
  const pr=window.flightRenderScale||1,zScale=Math.sqrt(Math.abs(a.a*a.d-a.b*a.c))/pr;
  affine.set(a.a/pr,a.c/pr,0,a.e/pr-720,-a.b/pr,-a.d/pr,0,380-a.f/pr,0,0,-zScale,0,0,0,0,1);local.makeTranslation(x,y,0);euler.set(roll,yaw,pitch,'ZXY');rotation.makeRotationFromEuler(euler);scaleMatrix.makeScale(scale,scale,scale);instanceMatrix.copy(affine).multiply(local).multiply(rotation).multiply(scaleMatrix);
  if(!includeDrawBounds(data,faces,instanceMatrix))return true;
  group.object.setMatrixAt(group.count++,instanceMatrix);group.object.count=group.count;group.object.renderOrder=batch;group.object.visible=true;group.object.instanceMatrix.needsUpdate=true;frameInstancedObjects++;pending++;return true;
 }
 function resetInstances(){for(const group of instanceGroups.values()){group.count=0;group.object.count=0;group.object.visible=false;}}
 const authored=new AuthoredAssets(scene);
 await authored.load();
 window.authoredModels=authored;
 function drawAuthored(faces,context,x,y,scale,yaw,roll,pitch,age,hit){
  if(!faces.authoredAsset||!authored.assets.has(faces.authoredAsset))return false;
  const a=context.getTransform(),pr=window.flightRenderScale||1,zScale=Math.sqrt(Math.abs(a.a*a.d-a.b*a.c))/pr;
  affine.set(a.a/pr,a.c/pr,0,a.e/pr-720,-a.b/pr,-a.d/pr,0,380-a.f/pr,0,0,-zScale,0,0,0,0,1);
  local.makeTranslation(x,y,0);euler.set(roll,yaw,pitch,'ZXY');rotation.makeRotationFromEuler(euler);scaleMatrix.makeScale(scale,scale,scale);
  instanceMatrix.copy(affine).multiply(local).multiply(rotation).multiply(scaleMatrix);
  const bounds={geometry:{boundingSphere:{center:authoredCenter,radius:AUTHORED_ASSETS[faces.authoredAsset].radius}}};
  if(!includeDrawBounds(bounds,{},instanceMatrix))return true;
  const item=authored.acquire(faces.authoredAsset,age,context.globalAlpha,hit,batch);
  item.root.matrix.copy(instanceMatrix);authored.submit(item);pending++;return true;
 }
 const authoredCenter=new THREE.Vector3();
 let pixelRatio=1;
 window.gpuModels={setEnvironment,prepareTerrain(faces){geometry(faces);if(faces.terrainRelief&&faces.terrainMaterial!=='ice')terrainMap(faces.terrainMaterial);if(faces.asteroidReference)asteroidMaps(faces.asteroidReference);if(faces.terrainMaterial==='ice')getGlacierTexture();},modelRadius(faces){if(AUTHORED_ASSETS[faces.authoredAsset])return AUTHORED_ASSETS[faces.authoredAsset].radius;const sphere=geometry(faces).geometry.boundingSphere;return sphere.center.length()+sphere.radius;},prepare(faces){for(const f of faces)if(f&&!authored.assets?.has(f.authoredAsset))geometry(f);},begin(){authored.begin();authored.trim();renderFrame++;if(renderFrame%120===0){for(const [faces,data] of geoCache){if(renderFrame-data.lastUsed>600){data.geometry.dispose();geoCache.delete(faces);disposedGeometry++;}}}const ratio=window.flightRenderScale||1;if(Math.abs(ratio-pixelRatio)>.02){pixelRatio=ratio;renderer.setPixelRatio(ratio);}used=0;batch=0;pending=0;pendingStart=0;frameDrawCalls=frameTriangles=frameCompositePixels=framePasses=0;resetClip();resetInstances();frameInstancedObjects=0;for(const s of slots)s.object.visible=false},draw(faces,context,x,y,scale,yaw,roll,pitch,age,hit,rig){if(drawAuthored(faces,context,x,y,scale,yaw,roll,pitch,age,hit))return;const data=geometry(faces);if(faces.instanceSafe&&!rig&&!hit&&context.globalAlpha>=.999&&queueRigidInstance(faces,data,context,x,y,scale,yaw,roll,pitch))return;let s=slots[used];if(!s){const normalMaterial=material(data.organic);s={object:new THREE.Mesh(data.geometry,normalMaterial),normalMaterial,faces};s.object.matrixAutoUpdate=false;s.object.frustumCulled=false;scene.add(s.object);slots.push(s);s.object.onBeforeRender=()=>{const u=s.object.material.userData.modelUniforms;if(u){u.sceneryLight.value=s.faces.terrainRelief?(environmentName==='hot'?3:environmentName==='foundry'?2:1):0;u.terrainGrowth.value=s.faces.terrainMaterial==='reef'?1:0;u.terrainSurface.value=s.faces.terrainRelief&&s.faces.terrainMaterial!=='ice'?(s.faces.terrainMaterial==='foundry'?1:s.faces.terrainMaterial==='basalt'?3:2):0;u.organicSurface.value=s.surfaceKind;u.alienSurface.value=s.alienKind||0;u.pilotSurface.value=s.faces.pilotHull?1:0;u.motionTime.value=s.age;u.rigKind.value=s.rig==='squid'?1:s.rig==='octopus'?2:s.rig==='ray'?3:0;u.hitFlash.value=s.hit>0&&(s.age%.12)<.022?Math.sin((s.age%.12)/.022*Math.PI):0}};}if(s.object.geometry!==data.geometry){s.object.geometry=data.geometry;}s.faces=faces;s.object.frustumCulled=!faces.dynamic;
 // A pooled slot can change from terrain to a creature or atlas every frame.
 // Select its material first, then reset every surface property by texture identity.
 const organic=data.organic||rig==='squid'||rig==='octopus';s.surfaceKind=faces.asteroidReference?7:faces.asteroidFinish?6:faces.rock?(faces.terrainMaterial==='ice'?4:faces.terrainMaterial==='storm'?5:faces.terrainMaterial?3:2):organic?1:0;s.alienKind=faces.alienMaterial==='chitin'?1:faces.alienMaterial==='flesh'?2:0;
 if(faces.painted!==undefined){if(!bossAtlasTexture){bossAtlasTexture=new THREE.TextureLoader().load('assets/boss-atlas-v2.png');bossAtlasTexture.colorSpace=THREE.SRGBColorSpace;bossAtlasTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}if(!s.paintMaterial)s.paintMaterial=new THREE.MeshBasicMaterial({map:bossAtlasTexture,transparent:true,alphaTest:.04,side:THREE.DoubleSide,toneMapped:false});s.object.material=s.paintMaterial;s.paintMaterial.color.setRGB(hit>0?1.2:1,hit>0?1.2:1,hit>0?1.2:1);}
 else{const m=s.normalMaterial;s.object.material=m;if(faces.terrainMaterial==='ice')getGlacierTexture();const terrain=faces.terrainRelief&&faces.terrainMaterial!=='ice'?terrainMap(faces.terrainMaterial):null;const reference=faces.asteroidReference?asteroidMaps(faces.asteroidReference):null;const map=terrain|| (reference?reference.color:faces.alienMaterial?alienTextures[faces.alienMaterial]:faces.terrainMaterial==='ice'?glacierTexture:faces.rock?rockTexture:organic?skinColor:faces.industrial?industrialColor:null),bump=terrain|| (reference?(reference.normal?null:reference.color):faces.terrainMaterial==='ice'?glacierTexture:faces.terrainMaterial==='storm'?rockTexture:faces.alienMaterial?alienTextures[faces.alienMaterial]:faces.rock?rockTexture:organic?skinTexture:faces.pilotHull?null:faces.capitalSurface||faces.industrial?industrialColor:metalTexture);const normal=reference?.normal||null;if(m.map!==map||m.bumpMap!==bump||m.normalMap!==normal){const programChanged=!!m.map!==!!map||!!m.bumpMap!==!!bump||!!m.normalMap!==!!normal;m.map=map;m.bumpMap=bump;m.normalMap=normal;if(programChanged)m.needsUpdate=true;}m.metalness=faces.rock||organic?0:faces.pilotHull?.32:faces.capitalSurface?.58:faces.industrial?.3:.64;m.roughness=faces.asteroidFinish?faces.asteroidFinish.roughness:faces.terrainMaterial==='foundry'?.66:faces.terrainMaterial==='ice'?.72:faces.terrainMaterial==='reef'?.64:faces.rock?.98:faces.pilotHull?.57:faces.alienMaterial==='chitin'?.53:organic?.76:faces.capitalSurface?.46:faces.industrial?.8:.34;m.bumpScale=terrain?(faces.industrial?1.4:1.8):reference?.normal?0:reference?.75:faces.asteroidFinish?1.15:faces.alienMaterial==='chitin'?.95:faces.alienMaterial==='flesh'?.23:['ice','storm'].includes(faces.terrainMaterial)?.65:faces.rock?1.7:organic?1.1:.3;}
 const a=context.getTransform(),pr=window.flightRenderScale||1,zScale=Math.sqrt(Math.abs(a.a*a.d-a.b*a.c))/pr;affine.set(a.a/pr,a.c/pr,0,a.e/pr-720,-a.b/pr,-a.d/pr,0,380-a.f/pr,0,0,-zScale,0,0,0,0,1);local.makeTranslation(x,y,0);euler.set(roll,yaw,pitch,'ZXY');rotation.makeRotationFromEuler(euler);scaleMatrix.makeScale(scale,scale,scale);s.object.matrix.copy(affine).multiply(local).multiply(rotation).multiply(scaleMatrix);s.object.visible=includeDrawBounds(data,faces,s.object.matrix);s.object.material.opacity=context.globalAlpha;s.object.material.depthWrite=faces.painted===undefined&&context.globalAlpha>.96;s.object.renderOrder=batch;s.age=age;s.hit=hit;s.rig=rig;
 used++;if(s.object.visible)pending++},flush(context){if(!pending){pendingStart=used;return;}pending=0;const width=clipRight-clipLeft,height=clipBottom-clipTop;renderer.setScissor(clipLeft,760-clipBottom,width,height);renderer.setScissorTest(true);renderer.render(scene,camera);renderer.setScissorTest(false);framePasses++;frameCompositePixels+=width*height;frameDrawCalls+=renderer.info.render.calls;frameTriangles+=renderer.info.render.triangles;peakTriangles=Math.max(peakTriangles,frameTriangles);context.save();context.setTransform(1,0,0,1,0,0);context.globalAlpha=1;context.globalCompositeOperation='source-over';context.drawImage(surface,clipLeft*surface.width/1440,clipTop*surface.height/760,width*surface.width/1440,height*surface.height/760,clipLeft*context.canvas.width/1440,clipTop*context.canvas.height/760,width*context.canvas.width/1440,height*context.canvas.height/760);context.restore();for(let i=pendingStart;i<used;i++)slots[i].object.visible=false;pendingStart=used;authored.flush();resetClip();resetInstances();batch++;frames++},stats(){return{authored:authored.stats(),engine:'Three.js',version:THREE.REVISION,webgl:true,drawCalls:frameDrawCalls,triangles:frameTriangles,instancedObjects:frameInstancedObjects,instanceGroups:instanceGroups.size,compositePasses:framePasses,compositePixels:frameCompositePixels,compositeCoverage:framePasses?+(frameCompositePixels/(framePasses*1440*760)).toFixed(3):0,pooledObjects:slots.length,peakTriangles,frames,renderFrames:renderFrame,geometryCache:geoCache.size,disposedGeometry,gpuGeometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,shaderPrograms:renderer.info.programs?.length||0}}};
}
// Fetch together, execute classic scripts in dependency order.
if(!document.documentElement.hasAttribute('data-model-gallery'))await Promise.all(['audio.js','models.js','boss-creatures.js','boss-machines.js','capital-ship.js','levels.js','runs.js','art.js','tide-encounter.js','game.js','cloud-config.js','collection-sync.js','collection-ui.js'].map(src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.async=false;s.src=src+new URL(import.meta.url).search;s.onload=resolve;s.onerror=reject;document.body.append(s)})));
