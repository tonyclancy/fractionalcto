import * as THREE from './vendor/three.module.min.js';
import { AuthoredAssets, AUTHORED_ASSETS, pearlFinishGLSL } from './authored-assets.js?v=20261004-pressure212b';
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
  portal:{sky:0x9cbccc,ground:0x30271d,ambient:.85,key:0xe3f9ff,power:4.4,from:[-520,550,600],rim:0x6ddce8,edge:1.3,fill:0xffad72,bounce:.95,below:[250,-350,400]},
  space:{sky:0x8d9cae,ground:0x1c2334,ambient:.7,key:0xffe6ce,power:3.9,from:[-550,300,450],rim:0x708fae,edge:.8,fill:0xa0a6ba,bounce:.25,below:[400,-250,450]}
 };
 let environmentName=null;
 function setEnvironment(name){if(!environmentLights[name])name='daylight';if(environmentName===name)return;environmentName=name;const p=environmentLights[name];ambient.color.setHex(p.sky);ambient.groundColor.setHex(p.ground);ambient.intensity=p.ambient;key.color.setHex(p.key);key.intensity=p.power;key.position.set(...p.from);rim.color.setHex(p.rim);rim.intensity=p.edge;fill.color.setHex(p.fill);fill.intensity=p.bounce;fill.position.set(...p.below);}
 const transitColorA=new THREE.Color(),transitColorB=new THREE.Color();
 function setEnvironmentBlend(from,to,amount){
  const t=Math.max(0,Math.min(1,amount));if(t===0)return setEnvironment(from);if(t===1)return setEnvironment(to);
  const a=environmentLights[from]||environmentLights.daylight,b=environmentLights[to]||environmentLights.daylight;environmentName='transit';
  const color=(target,x,y)=>target.lerpColors(transitColorA.setHex(x),transitColorB.setHex(y),t),mix=(x,y)=>x+(y-x)*t;
  color(ambient.color,a.sky,b.sky);color(ambient.groundColor,a.ground,b.ground);ambient.intensity=mix(a.ambient,b.ambient);
  color(key.color,a.key,b.key);key.intensity=mix(a.power,b.power);key.position.set(...a.from.map((v,i)=>mix(v,b.from[i])));
  color(rim.color,a.rim,b.rim);rim.intensity=mix(a.edge,b.edge);color(fill.color,a.fill,b.fill);fill.intensity=mix(a.bounce,b.bounce);fill.position.set(...a.below.map((v,i)=>mix(v,b.below[i])));
 }
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
 const geoCache=new Map(),slots=[],preparedWorlds=new Map();
 function isPrepared(faces){for(const models of preparedWorlds.values())if(models.has(faces))return true;return false;}
 let renderFrame=0,disposedGeometry=0;let used=0,batch=0,frames=0,peakTriangles=0,pending=0,frameDrawCalls=0,frameTriangles=0,pendingStart=0,frameCompositePixels=0,framePasses=0,frameCopyRegions=0,frameBoundingPixels=0;
 let clipLeft=1440,clipTop=760,clipRight=0,clipBottom=0;
 const boundCenter=new THREE.Vector3();
 // Occupancy along each axis finds safe empty bands between objects. This
 // reduces canvas copies without changing any draw order or depth boundary.
 let occupiedRows=0,occupiedColumns=0;
 const copyRegions=new Float64Array(16),candidateRegions=new Float64Array(16);
 function resetClip(){clipLeft=1440;clipTop=760;clipRight=clipBottom=0;occupiedRows=occupiedColumns=0;}
 function includeRect(left,top,right,bottom){
  clipLeft=Math.min(clipLeft,left);clipTop=Math.min(clipTop,top);clipRight=Math.max(clipRight,right);clipBottom=Math.max(clipBottom,bottom);
  for(let i=Math.max(0,Math.floor(top/48));i<=Math.min(15,Math.floor((bottom-1)/48));i++)occupiedRows|=1<<i;
  for(let i=Math.max(0,Math.floor(left/96));i<=Math.min(14,Math.floor((right-1)/96));i++)occupiedColumns|=1<<i;
 }
 function splitCopyRegions(){
  const area=(clipRight-clipLeft)*(clipBottom-clipTop);let best=area,count=1;
  copyRegions[0]=clipLeft;copyRegions[1]=clipTop;copyRegions[2]=clipRight;copyRegions[3]=clipBottom;
  for(let axis=0;axis<2;axis++){
   const mask=axis?occupiedColumns:occupiedRows,step=axis?96:48,limit=axis?15:16;
   let n=0,total=0;
   for(let i=0;i<limit;i++)if(mask&(1<<i)){
    const start=i;while(i+1<limit&&(mask&(1<<(i+1))))i++;
    if(n===4){n=5;break;}
    const k=n++*4,left=axis?Math.max(clipLeft,start*step):clipLeft,top=axis?clipTop:Math.max(clipTop,start*step),right=axis?Math.min(clipRight,(i+1)*step):clipRight,bottom=axis?clipBottom:Math.min(clipBottom,(i+1)*step);
    candidateRegions[k]=left;candidateRegions[k+1]=top;candidateRegions[k+2]=right;candidateRegions[k+3]=bottom;total+=(right-left)*(bottom-top);
   }
   // Extra drawImage calls must save substantial pixels to justify their cost.
   if(n>1&&n<=4&&total<area*.75&&total<best){best=total;count=n;copyRegions.set(candidateRegions);}
  }
  return count;
 }
 function includeDrawBounds(data,faces,matrix){
  // CPU-final meshes may opt into bounds refreshed alongside vertex uploads.
  // Unknown/GPU-deformed motion retains its conservative full viewport.
  if(faces.dynamic&&(!faces.cpuBounds||!data.motionBounds)){includeRect(0,0,1440,760);return true;}
  if(faces.cpuBounds&&data.motionBounds){
   const q=data.motionBounds,e=matrix.elements;boundCenter.set(q.cx,q.cy,q.cz).applyMatrix4(matrix);
   const rx=Math.abs(e[0])*q.hx+Math.abs(e[4])*q.hy+Math.abs(e[8])*q.hz+3,ry=Math.abs(e[1])*q.hx+Math.abs(e[5])*q.hy+Math.abs(e[9])*q.hz+3,x=720+boundCenter.x,y=380-boundCenter.y;
   if(x+rx<0||x-rx>1440||y+ry<0||y-ry>760)return false;
   includeRect(Math.max(0,Math.floor(x-rx)),Math.max(0,Math.floor(y-ry)),Math.min(1440,Math.ceil(x+rx)),Math.min(760,Math.ceil(y+ry)));return true;
  }
  const sphere=data.geometry.boundingSphere,e=matrix.elements;boundCenter.copy(sphere.center).applyMatrix4(matrix);
  const rx=sphere.radius*Math.hypot(e[0],e[4],e[8])+3,ry=sphere.radius*Math.hypot(e[1],e[5],e[9])+3,x=720+boundCenter.x,y=380-boundCenter.y;
  if(x+rx<0||x-rx>1440||y+ry<0||y-ry>760)return false;
  includeRect(Math.max(0,Math.floor(x-rx)),Math.max(0,Math.floor(y-ry)),Math.min(1440,Math.ceil(x+rx)),Math.min(760,Math.ceil(y+ry)));return true;
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
 for(const f of faces){const ids=f.v.map((v,vi)=>{const vertexColor=f.vertexColors?.[vi]||f.c;let pointKey=pointKeys.get(v);if(pointKey===undefined){pointKey=v.map(n=>n.toFixed(4)).join(',');pointKeys.set(v,pointKey);}const key=pointKey+'|'+vertexColor.join(',')+'|'+f.em+'|'+f.flex+'|'+(f.wet||0)+'|'+(f.textureWeight??1)+'|'+(f.blink||'')+'|'+(f.joints?.[vi]||f.joint||'')+'|'+(f.smoothGroup||'')+'|'+(f.growth?.[vi]||'')+(f.uv?'|'+f.uv[vi].join(','):'');if(lookup.has(key))return lookup.get(key);const i=positions.length/3;positions.push(...v);sources.push(v);const normalPoint=faces.border&&Math.abs(v[faces.border.axis]-faces.border.period)<.001?v.map((n,i)=>i===faces.border.axis?'0.0000':n.toFixed(4)).join(','):pointKey;const normalKey=normalPoint+'|'+(f.smoothGroup||'');if(!faces.industrial||f.smoothGroup){if(!normalGroups.has(normalKey))normalGroups.set(normalKey,[]);normalGroups.get(normalKey).push(i);}const colorKey=vertexColor.join(',');let color=linearColors.get(colorKey);if(!color){color=new THREE.Color(`rgb(${vertexColor.map(n=>Math.round(Math.max(0,Math.min(255,n)))).join(',')})`);linearColors.set(colorKey,color);}colors.push(color.r,color.g,color.b);foliage.push(...(f.growth?.[vi]||[0,0]));glow.push(f.em||0);flex.push(f.flex||0);wet.push(f.wet||0);textureWeight.push(f.textureWeight??1);faunaJoints.push(...(f.joints?.[vi]||f.joint||[0,0,0,0]));blinkData.push(...(f.blink?[f.blink[0],f.blink[1],1]:[0,0,0]));if(f.uv){uv.push(...f.uv[vi]);}else if(faces.border&&faces.terrainMaterial==='ice'){const a=v[faces.border.axis]/faces.border.period*Math.PI*2;uv.push(.5+.46*Math.sin(a),.5+.46*Math.sin(v[1-faces.border.axis]/210));}else if(faces.terrainMaterial==='ice'&&faces.terrainUV){const f=faces.terrainUV,x=v[0]/f.width,y=v[1]/f.height,u=f.side?y:x,t=f.side?x:y,offset=(Math.sin(f.seed*17.3)*.5+.5)*.18;uv.push(.04+offset+u*.70,.04+(f.flip?1-t:t)*.92);}else if(faces.terrainMaterial==='ice')uv.push(v[0]/300,v[1]/300);else if(faces.rock)uv.push(v[0]/160,v[1]/160);else uv.push(v[0]/38,v[1]/38);lookup.set(key,i);return i});for(let i=1;i<ids.length-1;i++)indices.push(ids[0],ids[i],ids[i+1]);if(f.flex)organic=true}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('glow',new THREE.Float32BufferAttribute(glow,1));g.setAttribute('flex',new THREE.Float32BufferAttribute(flex,1));g.setAttribute('wet',new THREE.Float32BufferAttribute(wet,1));g.setAttribute('textureWeight',new THREE.Float32BufferAttribute(textureWeight,1));g.setAttribute('blinkData',new THREE.Float32BufferAttribute(blinkData,3));g.setAttribute('foliage',new THREE.Float32BufferAttribute(foliage,2));g.setAttribute('faunaJoint',new THREE.Float32BufferAttribute(faunaJoints,4));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);if(faces.dynamic)g.attributes.position.setUsage(THREE.DynamicDrawUsage);const smoothGroups=(faces.alienMaterial||faces.rock||faces.industrial)?[...normalGroups.values()].filter(g=>g.length>1):[];smoothNormals(g,smoothGroups);if(faces.dynamic)g.attributes.normal.setUsage(THREE.DynamicDrawUsage);g.computeBoundingSphere();if(organic||faces.fauna)g.boundingSphere.radius+=90;if(faces.foliage)g.boundingSphere.radius+=8;const value={geometry:g,organic,sources,smoothGroups,lastUsed:renderFrame};if(faces.cpuBounds){g.computeBoundingBox();const lo=g.boundingBox.min,hi=g.boundingBox.max;value.motionBounds={cx:(lo.x+hi.x)/2,cy:(lo.y+hi.y)/2,cz:(lo.z+hi.z)/2,hx:(hi.x-lo.x)/2,hy:(hi.y-lo.y)/2,hz:(hi.z-lo.z)/2};}geoCache.set(faces,value);return value}
 function material(organic){const m=new THREE.MeshStandardMaterial({vertexColors:true,metalness:organic?0:.64,roughness:organic?.76:.34,map:organic?skinColor:null,side:THREE.DoubleSide,bumpMap:organic?skinTexture:metalTexture,bumpScale:organic?1.1:.3,transparent:true,forceSinglePass:true});
 // A draw hook runs before Three compiles a newly selected program. Keep
 // uniforms on the material itself so first-frame and cached variants read
 // the same current state, instead of whichever shader compiled most recently.
 const modelUniforms=m.userData.modelUniforms={coreOpening:{value:0},coreImpact:{value:0},coreStrike:{value:new THREE.Vector2()},coreExposure:{value:0},motionTime:{value:0},rigKind:{value:0},hitFlash:{value:0},organicSurface:{value:organic?1:0},alienSurface:{value:0},pilotSurface:{value:0},terrainSurface:{value:0},terrainGrowth:{value:0},terrainBorder:{value:0},terrainNeutral:{value:0},sceneryLight:{value:0}};
 m.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vTerrainNormal=normal;');shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','if(foliage.x>0.0){float w=foliage.x*foliage.x;transformed.x+=sin(motionTime*1.3+foliage.y+foliage.x*2.0)*w*5.5;transformed.z+=cos(motionTime*1.1+foliage.y)*w*2.1;}\n#include <project_vertex>');Object.assign(shader.uniforms,modelUniforms);m.userData.shader=shader;
 shader.vertexShader='attribute vec2 foliage; varying vec3 vTerrainNormal; attribute vec4 faunaJoint; attribute vec3 blinkData; float blinkPulse(float x){return x<0.0||x>.26?0.0:x<.065?sin(x/.065*1.57079633):cos((x-.065)/.195*1.57079633);} attribute float textureWeight; varying float vTextureWeight; attribute float glow; attribute float flex; attribute float wet; varying float vWet; varying vec3 vSkinPosition; varying float vGlow; uniform float motionTime; uniform float rigKind;\n'+shader.vertexShader;
 shader.vertexShader=`
 uniform float coreExposure;
 uniform float coreImpact;
 varying float vCoreTissue;
 vec3 speciesJoint(vec3 p,vec4 j,float t){
  if(j.w<.5)return p;vec3 v=p-j.xyz;float side=j.z<0.0?-1.0:1.0;float w=min(1.0,length(v)/35.0),a=0.0;int axis=0;
  if(j.w>15.5){float a=side*t*1.6,c=cos(a),sn=sin(a);return j.xyz+vec3(v.x*c-v.y*sn,v.x*sn+v.y*c,v.z);}
  if(j.w>14.5){float e=coreExposure*coreExposure*(3.0-2.0*coreExposure);return p+j.xyz*e;}
  if(j.w>13.5)return p-vec3(0.0,0.0,side*coreImpact*.24);
  if(j.w>12.5){float pulse=1.0+coreExposure*.055*sin(t*4.1+j.x*.27)-coreImpact*.22,flutter=coreExposure*(sin(t*9.1+v.x*.31+j.y*.17)*.065+sin(t*6.7+v.x*.53+v.z*.21)*.025);return j.xyz+vec3(v.x,v.y*(pulse+flutter),v.z*(pulse-flutter*.55));}
  if(j.w>11.5){float e=coreExposure*coreExposure*(3.0-2.0*coreExposure),breath=.975+.025*sin(t*3.0+p.x*.13)+.14*sin(3.14159265*e);float curl=sin(3.14159265*e)*length(j.xy)*.16;return p+j.xyz*e*breath+vec3(0.0,0.0,sign(p.z)*curl);}
  if(j.w>9.5){float a=(j.w<10.5?1.0:-1.0)*side*coreExposure*1.12;mat2 turn=mat2(cos(a),sin(a),-sin(a),cos(a));v.yz=turn*v.yz;return j.xyz+v;}
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
 vCoreTissue=step(12.5,faunaJoint.w)*(1.0-step(14.5,faunaJoint.w));vTextureWeight=textureWeight;vGlow=glow;vWet=wet;vSkinPosition=position;
 if(faunaJoint.w>.5)transformed=speciesJoint(transformed,faunaJoint,motionTime);
 else if(rigKind>2.5){float span=max(0.0,abs(position.y)-12.0);float drive=1.0+.65*pow((1.0+cos(motionTime*3.2))*.5,5.0);transformed.z+=sin(motionTime*3.2-position.x*.055)*span*.44*drive;}
 else if(rigKind>0.5){float phase=motionTime*(rigKind<1.5?4.8:3.8);
 if(position.x<23.0){float weight=smoothstep(-22.0,-4.0,position.x)*(1.0-smoothstep(10.0,23.0,position.x));float contraction=pow((1.0+cos(phase+(position.x+20.0)*.045))*.5,4.0);float extension=pow((1.0+cos(phase-.3))*.5,5.0)*(1.0-smoothstep(4.0,23.0,position.x));transformed.x+=weight*contraction*4.0-extension*9.0;transformed.yz*=(1.0-.22*weight*contraction)*(1.0-extension*.045);}
 else{float along=max(0.0,position.x-23.0)/67.0;float arm=atan(position.z,position.y);float lag=phase-along*3.5+arm*.18;float cycle=mod(mod(motionTime,3.6)+3.6,3.6);float tuck=smoothstep(.35,.6,cycle)*(1.0-smoothstep(1.35,1.8,cycle));float root=smoothstep(0.0,.4,along);float jet=pow((1.0+cos(phase))*.5,5.0);float release=sin(lag-.65)+.32*sin(2.0*lag-1.3);float bundle=(1.0+root*(-.46*pow((1.0+cos(lag))*.5,3.0)+.20*max(0.0,sin(lag-.7))+(1.0-tuck)*.30))*(1.0-.75*tuck*root);float drive=1.0+jet*.7;float curl=release*along*along*32.0*drive*(1.0-.9*tuck);transformed.x+=root*along*(jet*9.0-max(0.0,release)*24.0);transformed.y=position.y*bundle+cos(arm+.8+root*.48*sin(phase-along*1.8)+tuck*along*3.0)*curl;transformed.z=position.z*bundle+sin(arm+.8+root*.48*sin(phase-along*1.8)+tuck*along*3.0)*curl;}}
 else if(flex>0.0){float cycle=mod(mod(motionTime,3.6)+3.6,3.6);float tuck=smoothstep(.35,.6,cycle)*(1.0-smoothstep(1.35,1.8,cycle));float root=clamp((position.x-10.0)/45.0,0.0,1.0);transformed.yz*=1.0-.75*tuck*root;float drive=1.0+.75*pow((1.0+cos(motionTime*2.0))*.5,5.0);float bend=max(0.0,position.x-10.0)*flex*drive*(1.0-.9*tuck);transformed.y+=sin(motionTime*3.0-position.x*.07)*bend*.23;transformed.z+=cos(motionTime*2.4-position.x*.06)*bend*.22;}`);
 shader.fragmentShader=pearlFinishGLSL+`uniform float coreOpening; uniform float motionTime; uniform float coreImpact; uniform vec2 coreStrike; varying float vCoreTissue; varying vec3 vTerrainNormal; uniform float sceneryLight; uniform float terrainSurface; uniform float terrainGrowth; uniform float terrainBorder; uniform float terrainNeutral; varying float vTextureWeight; varying float vGlow; varying float vWet; varying vec3 vSkinPosition; uniform float alienSurface; uniform float pilotSurface; uniform float hitFlash; uniform float organicSurface;
 float skinHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
 float skinNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(skinHash(i),skinHash(i+vec3(1,0,0)),f.x),mix(skinHash(i+vec3(0,1,0)),skinHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(skinHash(i+vec3(0,0,1)),skinHash(i+vec3(1,0,1)),f.x),mix(skinHash(i+vec3(0,1,1)),skinHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
 `+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>', `vec3 terrainTexel=vec3(1.0);
 #ifdef USE_MAP
 if(terrainSurface>0.5){
  vec3 blend=pow(abs(normalize(vTerrainNormal)),vec3(4.0));blend/=max(dot(blend,vec3(1.0)),.0001);
  vec3 p=vSkinPosition/(terrainBorder>0.5?576.0:terrainSurface<1.5?230.0:300.0);
  terrainTexel=texture2D(map,p.yz).rgb*blend.x+texture2D(map,p.xz).rgb*blend.y+texture2D(map,p.xy).rgb*blend.z;
  // Foundry map supplies weathering; the alloy owns its colour. Otherwise
  // brown texels, brown pigment and orange light compound into muddy bronze.
  if(terrainSurface<1.5){float metalValue=dot(terrainTexel,vec3(.2126,.7152,.0722));terrainTexel=mix(vec3(metalValue),terrainTexel,.12);}
  terrainTexel=mix(terrainTexel,vec3(dot(terrainTexel,vec3(.2126,.7152,.0722))),terrainNeutral);
  diffuseColor.rgb*=mix(vec3(1.0),terrainBorder>0.5?clamp(vec3(.16)+terrainTexel*2.6,vec3(.18),vec3(1.25)):clamp(vec3(.42)+terrainTexel*2.5,vec3(.36),vec3(1.45)),vTextureWeight);
 }else{
 #include <map_fragment>
 }
 #endif
 if(terrainSurface>0.5){}else if(organicSurface>5.5&&organicSurface<6.5){float relief=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=vec3(clamp(.12+pow(max(relief,0.0),.62)*1.75,.12,1.08));}else if(organicSurface>4.5&&organicSurface<5.5){float relief=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=vec3(.78+relief*.65);}else if(alienSurface>0.5){float relief=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(vec3(1.0),vec3(clamp(.32+relief*2.9,.28,1.35)),vTextureWeight);}`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 if(terrainSurface>0.5){if(terrainGrowth>.5){float growthPatch=smoothstep(.44,.69,skinNoise(vSkinPosition*.047)+skinNoise(vSkinPosition*.18)*.19);diffuseColor.rgb*=mix(vec3(1.0),vec3(.62,.78,.46),growthPatch*.36*vTextureWeight);float pore=1.0-smoothstep(.16,.29,skinNoise(vSkinPosition*.58));float crust=skinNoise(vSkinPosition*.17);diffuseColor.rgb*=1.0-pore*.40*vTextureWeight;diffuseColor.rgb*=.89+crust*.22;}}else if(pilotSurface>0.5){diffuseColor.rgb*=.96+skinNoise(vSkinPosition*.15)*.04;}else if(alienSurface>0.5){float dermalPatch=skinNoise(vSkinPosition*.075);float pore=skinNoise(vSkinPosition*1.3);float fold=skinNoise(vSkinPosition*.38);float vein=1.0-smoothstep(.012,.05,abs(fold-.48));vec3 pigment=mix(vec3(.56,.70,.87),vec3(1.20,1.05,.78),smoothstep(.23,.76,dermalPatch));float scaleEdge=1.0-smoothstep(.06,.18,abs(sin(vSkinPosition.x*.72+sin(vSkinPosition.y*.9)*.7)*sin(vSkinPosition.z*.72+sin(vSkinPosition.y*.65)*.6)));pigment*=.83+pore*.25-vein*.12-scaleEdge*(alienSurface<1.5?.18:.07);diffuseColor.rgb*=mix(vec3(1.0),pigment,vTextureWeight*(1.0-min(vWet,1.0)*.8));}else if(organicSurface>3.5){
 vec3 p=vSkinPosition;float broad=skinNoise(p*.027);
 if(organicSurface<4.5){diffuseColor.rgb*=.96+broad*.08;}
 else{diffuseColor.rgb*=.93+broad*.12;}
 }else if(organicSurface>1.5){float strata=skinNoise(vSkinPosition*.12)+skinNoise(vSkinPosition*.6)*.3;float mineral=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(mineral*.98,mineral,mineral*1.03),organicSurface>2.5?.18:.7)*(organicSurface>2.5?(.92+strata*.12):(.7+strata*.5));}else if(organicSurface>0.5){float skinPatch=skinNoise(vSkinPosition*.085);float detail=skinNoise(vSkinPosition*.48);float vein=1.0-smoothstep(.015,.075,abs(detail-.49));vec3 dermis=mix(vec3(.48,.39,.43),vec3(1.14,1.08,.86),smoothstep(.2,.78,skinPatch));dermis*=1.0-vein*.3;dermis*=.83+skinNoise(vSkinPosition*1.4)*.3;diffuseColor.rgb*=mix(dermis,vec3(1.0),min(vWet,1.0));}else{float wear=skinNoise(vSkinPosition*.7);float panel=step(.94,fract(vSkinPosition.x*.09))+step(.94,fract(vSkinPosition.y*.09));diffuseColor.rgb*=mix(1.0,clamp(.7+wear*.4-panel*.25,.3,1.1),vTextureWeight);}
 `);
 shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 if(alienSurface>0.5)roughnessFactor=mix((alienSurface<1.5?.58:.49)+skinNoise(vSkinPosition*.24)*.18,.17,min(vWet,1.0));else if(organicSurface>1.5)roughnessFactor=roughness;else if(organicSurface>0.5)roughnessFactor=mix(.68+skinNoise(vSkinPosition*.2)*.2,.13,min(vWet,1.0));
 `);
 shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
 if(vWet>1.5&&vWet<2.5){metalnessFactor=.18;roughnessFactor=.065;}`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`if(vWet>1.5&&vWet<2.5){}else if(terrainSurface>0.5){
 #ifdef USE_BUMPMAP
 float terrainHeight=dot(terrainTexel,vec3(.2126,.7152,.0722))*bumpScale*vTextureWeight;
 normal=perturbNormalArb(-vViewPosition,normal,vec2(dFdx(terrainHeight),dFdy(terrainHeight)),faceDirection);
 #endif
 }else{
 #include <normal_fragment_maps>
 }`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance += vGlow * diffuseColor.rgb * 1.8; if(terrainBorder>0.5)totalEmissiveRadiance += diffuseColor.rgb * .20;');
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
 float organBreath=pow(.5+.5*sin(motionTime*4.4),3.0);
 float organSheen=pow(max(0.0,sin(vSkinPosition.x*.08+vSkinPosition.y*.03-motionTime*1.3)),18.0);
 outgoingLight+=vCoreTissue*(vec3(.018,.009,.006)+organBreath*vec3(.16,.085,.055)+organSheen*vec3(.065,.047,.035)+coreOpening*(outgoingLight*.3+vec3(.11,.065,.03)));
 if(vWet>1.5&&vWet<2.5)outgoingLight=struckGlassPearl(outgoingLight,normal,normalize(vViewPosition),coreImpact,coreStrike);
 else outgoingLight=whiteCoreImpact(outgoingLight,normal,normalize(vViewPosition),coreImpact*vCoreTissue*.45);
 if(vWet>2.5){
  float current=pow(.5+.5*sin(motionTime*5.0+vSkinPosition.y*1.1),5.0);
  float discharge=coreImpact*(.24+.44*pow(.5+.5*sin(vSkinPosition.y*3.8+motionTime*27.0),3.0));
  outgoingLight+=vec3(.035,.16,.2)*current+vec3(.48,.73,.8)*discharge;
 }
 outgoingLight*=1.0+hitFlash*.10;
 outgoingLight+=hitFlash*impactRim*(vec3(.12,.19,.21)+diffuseColor.rgb*.16);
 #include <opaque_fragment>`);};return m}
 const affine=new THREE.Matrix4(),local=new THREE.Matrix4(),rotation=new THREE.Matrix4(),scaleMatrix=new THREE.Matrix4(),euler=new THREE.Euler(0,0,0,'ZXY');
 const instanceGroups=new Map(),instanceMatrix=new THREE.Matrix4();let frameInstancedObjects=0;
 function queueRigidInstance(faces,data,context,x,y,scale,yaw,roll,pitch){
  const a=context.getTransform();if(a.a*a.d-a.b*a.c<0||scale<0)return false; // Three instancing does not support reflected matrices.
  let group=instanceGroups.get(faces);
  if(!group){const object=new THREE.InstancedMesh(data.geometry,material(false),128);object.instanceMatrix.setUsage(THREE.DynamicDrawUsage);object.frustumCulled=false;object.matrixAutoUpdate=false;object.visible=false;scene.add(object);group={object,count:0,lastUsed:renderFrame};instanceGroups.set(faces,group);}
  group.lastUsed=renderFrame;
  if(group.count===128)return false; // Overflow keeps the ordinary draw path.
  if(group.object.geometry!==data.geometry)group.object.geometry=data.geometry;
  const pr=window.flightRenderScale||1,zScale=Math.sqrt(Math.abs(a.a*a.d-a.b*a.c))/pr;
  affine.set(a.a/pr,a.c/pr,0,a.e/pr-720,-a.b/pr,-a.d/pr,0,380-a.f/pr,0,0,-zScale,0,0,0,0,1);local.makeTranslation(x,y,0);euler.set(roll,yaw,pitch,'ZXY');rotation.makeRotationFromEuler(euler);scaleMatrix.makeScale(scale,scale,scale);instanceMatrix.copy(affine).multiply(local).multiply(rotation).multiply(scaleMatrix);
  if(!includeDrawBounds(data,faces,instanceMatrix))return true;
  group.object.setMatrixAt(group.count++,instanceMatrix);group.object.count=group.count;group.object.renderOrder=batch;group.object.visible=true;group.object.instanceMatrix.needsUpdate=true;frameInstancedObjects++;pending++;return true;
 }
 function trimInstances(){for(const [faces,group] of instanceGroups){if(renderFrame-group.lastUsed>600&&!isPrepared(faces)){scene.remove(group.object);group.object.dispose();group.object.material.dispose();instanceGroups.delete(faces);}}}
 function resetInstances(){for(const group of instanceGroups.values()){group.count=0;group.object.count=0;group.object.visible=false;}}
 const authored=new AuthoredAssets(scene);
 if(document.documentElement?.hasAttribute?.('data-model-gallery'))await authored.load();
 window.authoredModels=authored;
 function drawAuthored(faces,context,x,y,scale,yaw,roll,pitch,age,hit){
  if(!faces.authoredAsset||!authored.assets.has(faces.authoredAsset))return false;
  const a=context.getTransform(),pr=window.flightRenderScale||1,zScale=Math.sqrt(Math.abs(a.a*a.d-a.b*a.c))/pr;
  affine.set(a.a/pr,a.c/pr,0,a.e/pr-720,-a.b/pr,-a.d/pr,0,380-a.f/pr,0,0,-zScale,0,0,0,0,1);
  local.makeTranslation(x,y,0);euler.set(roll,yaw,pitch,'ZXY');rotation.makeRotationFromEuler(euler);scaleMatrix.makeScale(scale,scale,scale);
  instanceMatrix.copy(affine).multiply(local).multiply(rotation).multiply(scaleMatrix);
  const bounds={geometry:{boundingSphere:{center:authoredCenter,radius:AUTHORED_ASSETS[faces.authoredAsset].radius}}};
  if(!includeDrawBounds(bounds,{},instanceMatrix))return true;
  const item=authored.acquire(faces.authoredAsset,age,context.globalAlpha,hit,batch,faces.coreExposure,faces.coreImpact,faces.coreOpening,faces.coreStrike);
  item.root.matrix.copy(instanceMatrix);authored.submit(item);pending++;return true;
 }
 // Retained 3D combustion volumes share the hull's depth buffer. The box never
 // pulses in size: rising density, vortices and combustion temperature evolve
 // inside it. Scar plates are attached in the same 3D pass, not canvas stickers.
 const damageVolumes=new Map();let damageBox=null;
 const damageVector=new THREE.Vector3(),damageInverse=new THREE.Matrix4(),damageMatrix=new THREE.Matrix4(),damagePlacement=new THREE.Matrix4(),damageRotation=new THREE.Matrix4();
 const fireVertex=`varying vec3 localPoint;void main(){localPoint=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
 const fireFragment=`
 precision highp float;
 varying vec3 localPoint;
 uniform vec3 rayDirection;
 uniform mat4 projectionMatrix,modelViewMatrix;
 uniform float fireTime,fireSeed,fireLean,fireKind;
 float hash3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
 float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float turbulence(vec3 p){return noise3(p)*.59+noise3(p*2.07+11.7)*.28+noise3(p*4.13-3.1)*.13;}
 void main(){
  vec3 rd=normalize(rayDirection),ro=localPoint-rd*3.0;
  vec3 safeDir=sign(rd)*max(abs(rd),vec3(.00001));
  safeDir+=vec3(equal(safeDir,vec3(0.0)))*.00001;
  vec3 a=(-vec3(.5)-ro)/safeDir,b=(vec3(.5)-ro)/safeDir;
  vec3 lo=min(a,b),hi=max(a,b);float enter=max(max(lo.x,lo.y),lo.z),leave=min(min(hi.x,hi.y),hi.z);
  if(leave<=enter)discard;
  float stepSize=(leave-enter)/36.0,t=enter+stepSize*.5,first=-1.0;
  vec4 sum=vec4(0.0);
  for(int i=0;i<36;i++){
   vec3 p=ro+rd*t;float height=p.y+.5,h=height/.73;
   vec3 flow=p*vec3(7.8,5.8,7.8)+vec3(fireSeed,-fireTime*2.7,fireSeed*.71);
   float curl=noise3(flow*.62+vec3(0,0,fireTime*.22))-.5;
   flow.xz+=vec2(curl,-curl)*1.7;
   float n=turbulence(flow);
   vec2 axis=vec2(fireLean*h*.48+sin(h*5.0-fireTime*1.8+fireSeed)*h*.045,cos(h*7.0-fireTime*1.3+fireSeed)*h*.07);
   float radius=.38-h*.12,rad=length((p.xz-axis)*vec2(fireKind==1.0?.64:1.0,1.12));
   float envelope=1.0-smoothstep(radius*.52,radius,rad);
   float tongues=max(0.0,(n-(.34+h*.20))*4.2);
   float density=tongues*envelope*smoothstep(0.0,.035,height)*(1.0-smoothstep(.67,.91,height));
   float heat=clamp((n-.36)*1.8+envelope*.10-h*.08,0.0,1.0);
   vec3 color=mix(vec3(.65,.035,.002),vec3(1.55,.32,.008),smoothstep(.08,.46,heat));
   color=mix(color,vec3(1.9,1.15,.19),smoothstep(.46,.77,heat));
   color=mix(color,vec3(2.3,2.1,1.6),smoothstep(.79,1.0,heat));
   if(fireKind==3.0)color=mix(color,vec3(.15,.38,1.35),clamp((1.0-h)*heat*.8,0.0,.7));
   float smoke=max(0.0,1.0-length(p.xz-axis)/(.18+height*.2)+(n-.57)*2.5)*smoothstep(.4,.8,height)*(1.0-smoothstep(.84,1.0,height))*.35;
   float alpha=1.0-exp(-(density*7.0+smoke*2.0)*stepSize);
   vec3 emission=mix(vec3(.12,.105,.09),color,density/(density+smoke+.0001));
   if(first<0.0&&alpha>.012)first=t;
   sum.rgb+=(1.0-sum.a)*emission*alpha;sum.a+=(1.0-sum.a)*alpha;
   if(sum.a>.985)break;t+=stepSize;
  }
  if(sum.a<.008||first<0.0)discard;
  // Test actual emitting density against hull depth, not the empty box face.
  vec4 depthPoint=projectionMatrix*modelViewMatrix*vec4(ro+rd*first,1.0);
  gl_FragDepth=depthPoint.z/depthPoint.w*.5+.5;
  gl_FragColor=vec4(sum.rgb/max(sum.a,.001),sum.a);
 }`;
 function hideDamageVolumes(){for(const item of damageVolumes.values()){item.fire.visible=false;item.scar.visible=false;}}
 function drawDamageVolume(context,spec){
  let item=damageVolumes.get(spec.id);
  if(!item){
   damageBox??=new THREE.BoxGeometry(1,1,1);damageBox.computeBoundingSphere();
   const mat=new THREE.ShaderMaterial({vertexShader:fireVertex,fragmentShader:fireFragment,uniforms:{rayDirection:{value:new THREE.Vector3()},fireTime:{value:0},fireSeed:{value:0},fireLean:{value:0},fireKind:{value:0}},side:THREE.BackSide,transparent:true,depthTest:true,depthWrite:false,toneMapped:false});
   const fire=new THREE.Mesh(damageBox,mat),scar=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial({transparent:true,depthTest:true,depthWrite:false,side:THREE.DoubleSide,roughness:.82,metalness:.2,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,alphaTest:.025}));
   fire.matrixAutoUpdate=scar.matrixAutoUpdate=false;fire.frustumCulled=scar.frustumCulled=false;fire.visible=scar.visible=false;scene.add(fire,scar);scar.material.onBeforeCompile=shader=>{shader.vertexShader='varying vec2 damageUV;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n damageUV=uv;');shader.fragmentShader='varying vec2 damageUV;\n'+shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n if(any(lessThan(damageUV,vec2(0.0)))||any(greaterThan(damageUV,vec2(1.0))))discard;');};scar.material.customProgramCacheKey=()=> 'capital-surface-damage187';item={fire,scar,texture:null,surfaceMesh:null};damageVolumes.set(spec.id,item);
  }
  const a=context.getTransform(),pr=window.flightRenderScale||1,zScale=Math.sqrt(Math.abs(a.a*a.d-a.b*a.c))/pr;
  affine.set(a.a/pr,a.c/pr,0,a.e/pr-720,-a.b/pr,-a.d/pr,0,380-a.f/pr,0,0,-zScale,0,0,0,0,1);
  local.makeTranslation(spec.x,spec.y,0);euler.set(spec.roll,spec.yaw,spec.pitch,'ZXY');rotation.makeRotationFromEuler(euler);scaleMatrix.makeScale(spec.scale,spec.scale,spec.scale);
  damageMatrix.copy(affine).multiply(local).multiply(rotation).multiply(scaleMatrix);
  if(spec.scar){
   if(!item.texture){item.texture=new THREE.CanvasTexture(spec.scar);item.texture.colorSpace=THREE.SRGBColorSpace;item.scar.material.map=item.texture;item.scar.material.needsUpdate=true;}
   if(item.surfaceMesh!==spec.surfaceMesh){
    item.scar.geometry.dispose();const g=geometry(spec.surfaceMesh).geometry.clone(),position=g.attributes.position,uv=new Float32Array(position.count*2),c=spec.surfaceCenter;
    const cylinder=spec.id==='reactor'||spec.id==='core';
    for(let i=0;i<position.count;i++){
     const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
     uv[i*2]=(x-c[0])/spec.span[0]+.5;
     // Cylindrical housings carry the texture around their actual shell. Pods
     // use surface projection onto their armor, ribs and folded wreck fragments.
     uv[i*2+1]=cylinder?Math.atan2(y-c[1],-(z-c[2]))/2.9+.5:.5-(y-c[1])/spec.span[1];
    }
    g.setAttribute('uv',new THREE.BufferAttribute(uv,2));item.scar.geometry=g;item.surfaceMesh=spec.surfaceMesh;
   }
   item.scar.matrix.copy(damageMatrix);
   item.scar.material.opacity=Math.min(1,spec.severity*2);item.scar.renderOrder=batch+1;item.scar.visible=includeDrawBounds({geometry:item.scar.geometry},{},item.scar.matrix);if(item.scar.visible)pending++;

  }
  // The root uses the full hull transform, including depth. Buoyancy stays up;
  // yaw rotates the 3D density field so a bank cannot reveal a flat flame card.
  damageVector.set(...spec.mount).applyMatrix4(rotation).multiplyScalar(spec.scale); // rotation still holds the hull rotation
  const w=spec.width*1.45,h=spec.height*1.5,d=w*.72;
  damagePlacement.makeTranslation(spec.x+damageVector.x,spec.y+damageVector.y-h*.5,damageVector.z);damageRotation.makeRotationY(spec.yaw);scaleMatrix.makeScale(w,-h,d);
  item.fire.matrix.copy(affine).multiply(damagePlacement).multiply(damageRotation).multiply(scaleMatrix);
  damageInverse.copy(item.fire.matrix).invert();item.fire.material.uniforms.rayDirection.value.set(0,0,-1).transformDirection(damageInverse);
  const u=item.fire.material.uniforms;u.fireTime.value=spec.age*spec.speed;u.fireSeed.value=spec.seed;u.fireLean.value=spec.lean;u.fireKind.value=spec.kind;
  item.fire.renderOrder=batch+2;item.fire.visible=includeDrawBounds({geometry:damageBox},{},item.fire.matrix);if(item.fire.visible)pending++;
 }
 const authoredCenter=new THREE.Vector3();
 let pixelRatio=1;
 window.gpuModels={supportsStamps:true,authoredReady:id=>authored.assets.has(id),drawDamageVolume,loadAssets:ids=>authored.load(ids),assetsReady:ids=>authored.ready(ids),setEnvironment,setEnvironmentBlend,prepareTerrain(faces){geometry(faces);if(faces.terrainRelief&&faces.terrainMaterial!=='ice')terrainMap(faces.terrainMaterial);if(faces.asteroidReference)asteroidMaps(faces.asteroidReference);if(faces.terrainMaterial==='ice')getGlacierTexture();},modelRadius(faces){if(AUTHORED_ASSETS[faces.authoredAsset])return AUTHORED_ASSETS[faces.authoredAsset].radius;const sphere=geometry(faces).geometry.boundingSphere;return sphere.center.length()+sphere.radius;},prepare(faces,worldId){let retained;if(worldId!==undefined){retained=preparedWorlds.get(worldId)||new Set();preparedWorlds.delete(worldId);preparedWorlds.set(worldId,retained);while(preparedWorlds.size>2)preparedWorlds.delete(preparedWorlds.keys().next().value);}for(const f of faces)if(f&&!authored.assets?.has(f.authoredAsset)){retained?.add(f);if(!geoCache.has(f))geometry(f);}},begin(){hideDamageVolumes();authored.begin();authored.trim();renderFrame++;if(renderFrame%120===0){trimInstances();for(const [faces,data] of geoCache){if(renderFrame-data.lastUsed>600&&!isPrepared(faces)){data.geometry.dispose();geoCache.delete(faces);disposedGeometry++;}}}const ratio=window.flightRenderScale||1;if(Math.abs(ratio-pixelRatio)>.02){pixelRatio=ratio;renderer.setPixelRatio(ratio);}used=0;batch=0;pending=0;pendingStart=0;frameDrawCalls=frameTriangles=frameCompositePixels=framePasses=frameCopyRegions=frameBoundingPixels=0;resetClip();resetInstances();frameInstancedObjects=0;for(const s of slots)s.object.visible=false},draw(faces,context,x,y,scale,yaw,roll,pitch,age,hit,rig){if(drawAuthored(faces,context,x,y,scale,yaw,roll,pitch,age,hit))return;const data=geometry(faces);if(faces.instanceSafe&&!rig&&!hit&&context.globalAlpha>=.999&&queueRigidInstance(faces,data,context,x,y,scale,yaw,roll,pitch))return;let s=slots[used];if(!s){const normalMaterial=material(data.organic);s={object:new THREE.Mesh(data.geometry,normalMaterial),normalMaterial,faces};s.object.matrixAutoUpdate=false;s.object.frustumCulled=false;scene.add(s.object);slots.push(s);s.object.onBeforeRender=()=>{const u=s.object.material.userData.modelUniforms;if(u){u.sceneryLight.value=s.faces.terrainRelief?(environmentName==='hot'?3:environmentName==='foundry'?2:1):0;u.terrainGrowth.value=s.faces.terrainMaterial==='reef'?1:0;u.terrainBorder.value=s.faces.border?1:0;u.terrainNeutral.value=s.faces.terrainNeutral||0;u.terrainSurface.value=s.faces.terrainRelief&&s.faces.terrainMaterial!=='ice'?(s.faces.terrainMaterial==='foundry'?1:s.faces.terrainMaterial==='basalt'?3:2):0;u.organicSurface.value=s.surfaceKind;u.alienSurface.value=s.alienKind||0;u.pilotSurface.value=s.faces.pilotHull?1:0;u.coreExposure.value=s.exposure;u.coreImpact.value=s.coreImpact;u.coreStrike.value.set(s.strikeX,s.strikeY);u.coreOpening.value=s.coreOpening;u.motionTime.value=s.age;u.rigKind.value=s.rig==='squid'?1:s.rig==='octopus'?2:s.rig==='ray'?3:0;u.hitFlash.value=s.hit>0&&(s.age%.12)<.022?Math.sin((s.age%.12)/.022*Math.PI):0}};}if(s.object.geometry!==data.geometry){s.object.geometry=data.geometry;}s.faces=faces;s.object.frustumCulled=!faces.dynamic;
 // A pooled slot can change from terrain to a creature or atlas every frame.
 // Select its material first, then reset every surface property by texture identity.
 const organic=data.organic||rig==='squid'||rig==='octopus';s.surfaceKind=faces.asteroidReference?7:faces.asteroidFinish?6:faces.rock?(faces.terrainMaterial==='ice'?4:faces.terrainMaterial==='storm'?5:faces.terrainMaterial?3:2):organic?1:0;s.alienKind=faces.alienMaterial==='chitin'?1:faces.alienMaterial==='flesh'?2:0;
 if(faces.painted!==undefined){if(!bossAtlasTexture){bossAtlasTexture=new THREE.TextureLoader().load('assets/boss-atlas-v2.png');bossAtlasTexture.colorSpace=THREE.SRGBColorSpace;bossAtlasTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}if(!s.paintMaterial)s.paintMaterial=new THREE.MeshBasicMaterial({map:bossAtlasTexture,transparent:true,alphaTest:.04,side:THREE.DoubleSide,toneMapped:false});s.object.material=s.paintMaterial;s.paintMaterial.color.setRGB(hit>0?1.2:1,hit>0?1.2:1,hit>0?1.2:1);}
 else{const m=s.normalMaterial;s.object.material=m;if(faces.terrainMaterial==='ice')getGlacierTexture();const terrain=faces.terrainRelief&&faces.terrainMaterial!=='ice'?terrainMap(faces.terrainMaterial):null;const reference=faces.asteroidReference?asteroidMaps(faces.asteroidReference):null;const map=terrain|| (reference?reference.color:faces.alienMaterial?alienTextures[faces.alienMaterial]:faces.terrainMaterial==='ice'?glacierTexture:faces.rock?rockTexture:organic?skinColor:faces.industrial?industrialColor:null),bump=terrain|| (reference?(reference.normal?null:reference.color):faces.terrainMaterial==='ice'?glacierTexture:faces.terrainMaterial==='storm'?rockTexture:faces.alienMaterial?alienTextures[faces.alienMaterial]:faces.rock?rockTexture:organic?skinTexture:faces.pilotHull?null:faces.portalMachinery?industrialColor:faces.capitalSurface||faces.industrial?industrialColor:metalTexture);const normal=reference?.normal||null;if(m.map!==map||m.bumpMap!==bump||m.normalMap!==normal){const programChanged=!!m.map!==!!map||!!m.bumpMap!==!!bump||!!m.normalMap!==!!normal;m.map=map;m.bumpMap=bump;m.normalMap=normal;if(programChanged)m.needsUpdate=true;}m.metalness=faces.portalMachinery?.55:faces.rock||organic?0:faces.pilotHull?.32:faces.capitalSurface?.58:faces.industrial?.3:.64;m.roughness=faces.portalMachinery?.32:faces.asteroidFinish?faces.asteroidFinish.roughness:faces.terrainMaterial==='foundry'?.66:faces.terrainMaterial==='ice'?.72:faces.terrainMaterial==='reef'?.64:faces.rock?.98:faces.pilotHull?.57:faces.alienMaterial==='chitin'?.53:organic?.76:faces.capitalSurface?.46:faces.industrial?.8:.34;m.bumpScale=faces.portalMachinery?.08:terrain?(faces.industrial?1.4:1.8):reference?.normal?0:reference?.75:faces.asteroidFinish?1.15:faces.alienMaterial==='chitin'?.95:faces.alienMaterial==='flesh'?.23:['ice','storm'].includes(faces.terrainMaterial)?.65:faces.rock?1.7:organic?1.1:.3;}
 const a=context.getTransform(),pr=window.flightRenderScale||1,zScale=Math.sqrt(Math.abs(a.a*a.d-a.b*a.c))/pr;affine.set(a.a/pr,a.c/pr,0,a.e/pr-720,-a.b/pr,-a.d/pr,0,380-a.f/pr,0,0,-zScale,0,0,0,0,1);local.makeTranslation(x,y,0);euler.set(roll,yaw,pitch,'ZXY');rotation.makeRotationFromEuler(euler);scaleMatrix.makeScale(scale,scale,scale);s.object.matrix.copy(affine).multiply(local).multiply(rotation).multiply(scaleMatrix);s.object.visible=includeDrawBounds(data,faces,s.object.matrix);s.object.material.opacity=context.globalAlpha;s.object.material.depthWrite=faces.painted===undefined&&context.globalAlpha>.96;s.object.renderOrder=batch;s.age=age;s.hit=hit;s.rig=rig;s.exposure=faces.coreExposure||0;s.coreImpact=faces.coreImpact||0;s.strikeX=faces.coreStrike?.[0]||0;s.strikeY=faces.coreStrike?.[1]||0;s.coreOpening=faces.coreOpening||0;
 used++;if(s.object.visible)pending++},flush(context,capture=false){if(!pending){pendingStart=used;return;}pending=0;const width=clipRight-clipLeft,height=clipBottom-clipTop;renderer.setScissor(clipLeft,760-clipBottom,width,height);renderer.setScissorTest(true);renderer.render(scene,camera);renderer.setScissorTest(false);framePasses++;frameBoundingPixels+=width*height;let stamp;
 if(capture){const image=document.createElement('canvas'),sx=surface.width/1440,sy=surface.height/760;image.width=Math.ceil(width*sx);image.height=Math.ceil(height*sy);image.getContext('2d').drawImage(surface,clipLeft*sx,clipTop*sy,width*sx,height*sy,0,0,image.width,image.height);stamp={image,x:clipLeft,y:clipTop,w:width,h:height};}
frameDrawCalls+=renderer.info.render.calls;frameTriangles+=renderer.info.render.triangles;peakTriangles=Math.max(peakTriangles,frameTriangles);context.save();context.setTransform(1,0,0,1,0,0);context.globalAlpha=1;context.globalCompositeOperation='source-over';const regionCount=splitCopyRegions();frameCopyRegions+=regionCount;for(let i=0;i<regionCount;i++){const k=i*4,x=copyRegions[k],y=copyRegions[k+1],w=copyRegions[k+2]-x,h=copyRegions[k+3]-y;frameCompositePixels+=w*h;context.drawImage(surface,x*surface.width/1440,y*surface.height/760,w*surface.width/1440,h*surface.height/760,x*context.canvas.width/1440,y*context.canvas.height/760,w*context.canvas.width/1440,h*context.canvas.height/760);}context.restore();for(let i=pendingStart;i<used;i++)slots[i].object.visible=false;pendingStart=used;hideDamageVolumes();authored.flush();resetClip();resetInstances();batch++;frames++;return stamp},stats(){return{authored:authored.stats(),engine:'Three.js',version:THREE.REVISION,webgl:true,drawCalls:frameDrawCalls,triangles:frameTriangles,instancedObjects:frameInstancedObjects,instanceGroups:instanceGroups.size,compositePasses:framePasses,copyRegions:frameCopyRegions,boundingPixels:frameBoundingPixels,compositePixels:frameCompositePixels,compositeCoverage:framePasses?+(frameCompositePixels/(framePasses*1440*760)).toFixed(3):0,pooledObjects:slots.length,damageVolumes:damageVolumes.size,peakTriangles,frames,renderFrames:renderFrame,preparedWorlds:preparedWorlds.size,geometryCache:geoCache.size,disposedGeometry,gpuGeometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,shaderPrograms:renderer.info.programs?.length||0}}};
}
// Fetch together, execute classic scripts in dependency order.
if(!document.documentElement.hasAttribute('data-model-gallery'))await Promise.all(['audio.js','models.js','boss-creatures.js','boss-machines.js','capital-ship.js','levels.js','runs.js','art.js','wildlife-birds.js','wildlife-aquatic.js','wildlife-small-life.js','wildlife-crawlers.js','shore-wildlife.js','tide-encounter.js','ferrum-mission.js','story-campaign.js','world-behaviors.js','opening-tactics.js','game.js','cloud-config.js','collection-sync.js','collection-ui.js'].map(src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.async=false;s.src=src+new URL(import.meta.url).search;s.onload=resolve;s.onerror=reject;document.body.append(s)})));
