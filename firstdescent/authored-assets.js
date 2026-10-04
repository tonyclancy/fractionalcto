import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/addons/GLTFLoader.js';
import { loadModelBuffer } from './model-download.js?v=20260920-download68';

// Curated assets retain authored proportions and joints. Shared geometry/textures,
// pooled per-instance animation and materials; never mutate a shared prototype.
export const AUTHORED_ASSETS=Object.freeze({
 'shellmaw':{radius:80,habitat:'air',role:'organic'},
 'vector-bastion':{radius:70,habitat:'air',role:'mechanical'},
 'rift-lantern':{radius:90,habitat:'water',role:'boss'},
 'thorn-skate':{radius:90,habitat:'air',role:'hunter'},
 'vesper-brood':{radius:100,habitat:'air',role:'carrier'},
 'needleling':{radius:75,habitat:'air',role:'escort'},
 'vesper-reaver':{radius:125,habitat:'air',role:'boss'}
});
// Enlarge the primary sensory organ in-place, including its own socket and
// protective membrane. These are edits to native anatomy, not added geometry.
export function prepareBossSensoryEyes(gltf,id){
 if(!['vesper-reaver','rift-lantern'].includes(id))return;
 const x=id==='vesper-reaver'?-37:-28,lids=[];gltf.scene.updateMatrixWorld(true);
 gltf.scene.traverse(n=>{if(/^Sensory[_ ]shutter/.test(n.name)&&Math.abs(n.position.x-x)<.01)lids.push(n);});
 const centers=lids.map(n=>new THREE.Vector3(n.position.x,n.position.y,n.position.z+Math.sign(n.position.z)*.2));
 gltf.scene.traverse(n=>{
  if(!n.isMesh||!(/Soft[_ ]tendon|Obsidian[_ ]lens|Amber[_ ]sensory[_ ]retina/.test(n.name)))return;
  const positions=n.geometry.attributes.position,point=new THREE.Vector3(),lens=/Obsidian[_ ]lens/.test(n.name),colors=lens?new Float32Array(positions.count*3):null,base=n.material.color,eyeColor=new THREE.Color(id==='rift-lantern'?'#dcefe9':'#f3e3cc');
  for(let i=0;i<positions.count;i++){
   point.fromBufferAttribute(positions,i);n.localToWorld(point);
   const center=centers.find(c=>point.distanceTo(c)<2.8);
   if(center){point.sub(center).multiplyScalar(3.0).add(center);n.worldToLocal(point);positions.setXYZ(i,point.x,point.y,point.z);}
   if(colors){const c=center?eyeColor:base;colors.set([c.r,c.g,c.b],i*3);}
  }
  if(colors){n.material=n.material.clone();n.material.color.set('#ffffff');n.material.vertexColors=true;n.material.userData.sensoryLens=true;n.material.roughness=.065;n.material.metalness=.22;n.material.bumpScale=0;n.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));}
  positions.needsUpdate=true;n.geometry.computeVertexNormals();n.geometry.computeBoundingSphere();
 });
 for(const lid of lids)for(const cover of lid.children){cover.scale.multiplyScalar(3.0);cover.userData.primarySensory=true;}
}
// Reflection and a refracted inner glow stay on the curved surface. Shared
// by native and generated pearls; no transparent sorting or screen-space decal.
export const pearlFinishGLSL=`
vec3 glassPearl(vec3 lit,vec3 n,vec3 view){
 n=normalize(n);view=normalize(view);
 vec3 r=reflect(-view,n),through=refract(-view,n,1.0/1.46);
 float facing=clamp(abs(dot(n,view)),0.0,1.0),edge=1.0-facing;
 float fresnel=.045+.955*pow(edge,5.0);
 // The dark body and refracted lower caustic keep volume under the clear glaze.
 // Reflections occupy curved patches, never a flat white stripe over the orb.
 float depth=pow(facing,.65),caustic=pow(max(0.0,dot(through,normalize(vec3(.3,-.65,-.8)))),18.0);
 vec3 body=mix(vec3(.013,.023,.047),vec3(.055,.135,.16),depth);
 body+=vec3(.18,.23,.19)*caustic*(.3+.7*edge);
 vec3 nacre=.5+.5*cos(vec3(.3,2.4,4.5)+edge*6.0);
 body+=nacre*.065*pow(edge,.7);
 float sky=smoothstep(-.35,.8,r.y);
 vec3 environment=mix(vec3(.045,.027,.075),vec3(.52,.69,.8),sky);
 float lamp=max(0.0,dot(r,normalize(vec3(-.43,.59,.8))));
 float bounce=max(0.0,dot(r,normalize(vec3(.55,-.56,.7))));
 vec3 reflection=environment*fresnel+vec3(.46,.6,.66)*pow(lamp,10.0)*.24;
 reflection+=vec3(3.2,3.15,3.0)*pow(lamp,100.0)+vec3(.3,.45,.47)*pow(bounce,32.0);
 return body*(1.0-fresnel*.6)+reflection+min(lit,vec3(1.0))*.07;
}
vec3 struckGlassPearl(vec3 lit,vec3 n,vec3 view,float impact,vec2 strike){
 n=normalize(n);view=normalize(view);float strength=clamp(impact,0.0,1.0);
 if(strength<.00001)return glassPearl(lit,n,view);
 // Undo the event's squared envelope: every confirmed hit starts one wave.
 float age=1.0-sqrt(strength),decay=pow(1.0-age,1.35);
 vec3 right=normalize(vec3(view.z,0.0,-view.x)),up=normalize(cross(view,right));
 vec3 contact=normalize(view+right*strike.x*.82+up*strike.y*.82);
 float cosine=clamp(dot(n,contact),-1.0,1.0),arc=acos(cosine);
 float radius=.07+1.55*pow(age,.7),width=.09+.035*age;
 float ring=exp(-pow((arc-radius)/width,2.0));
 float wave=sin((arc-radius)*22.0)*exp(-pow((arc-radius)/.23,2.0));
 vec3 tangent=normalize(contact-n*cosine+right*.0001);
 // Bend the existing reflected highlights through the curved glass. The
 // ripple is confined to the physical lens, never a floating screen ring.
 vec3 bent=normalize(n+tangent*wave*.075*decay);
 vec3 pearl=glassPearl(lit,bent,view);
 float glint=exp(-arc*arc/.035)*pow(1.0-age,7.0);
 float bloom=sin(min(age*7.0,1.0)*1.5707963)*decay;
 vec3 dispersion=vec3(exp(-pow((arc-radius-.04)/width,2.0)),ring,exp(-pow((arc-radius+.04)/width,2.0)));
 vec3 spectral=mix(vec3(ring),dispersion,.58)*vec3(.25,.36,.43);
 float echo=exp(-pow((arc-radius*.58)/.18,2.0))*sin(age*3.14159265)*decay;
 float rim=pow(1.0-clamp(abs(dot(n,view)),0.0,1.0),3.0);
 return pearl+vec3(.78,.86,.88)*glint+spectral*bloom+vec3(.07,.09,.15)*echo+vec3(.035,.065,.075)*rim*bloom;
}
vec3 whiteCoreImpact(vec3 lit,vec3 n,vec3 view,float impact){
 float facing=clamp(abs(dot(normalize(n),normalize(view))),0.0,1.0);
 // A short white reflection follows the curved surface while the darker
 // glass body, caustic and existing highlights retain their contrast.
 float sheen=.035+.15*pow(facing,2.0)+.065*pow(1.0-facing,3.0);
 return lit+vec3(clamp(impact,0.0,1.0)*sheen);
}`;
function shadeSensoryPearl(material){
 const impact=material.userData.pearlImpact={value:0},strike=material.userData.pearlStrike={value:new THREE.Vector2()};
 material.onBeforeCompile=shader=>{
  shader.uniforms.pearlImpact=impact;shader.uniforms.pearlStrike=strike;
  shader.fragmentShader=pearlFinishGLSL+'\nuniform float pearlImpact; uniform vec2 pearlStrike;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   float primary=step(.2,max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b)));
   vec3 pearl=struckGlassPearl(outgoingLight,normal,normalize(vViewPosition),pearlImpact,pearlStrike);
   outgoingLight=mix(outgoingLight,pearl,primary);
   #include <opaque_fragment>`);
 };
 material.customProgramCacheKey=()=> 'sensory-glass-impact209h';
}
export class AuthoredAssets {
 constructor(scene){this.scene=scene;this.assets=new Map();this.pending=new Map();this.loader=new GLTFLoader();this.pools=new Map();this.frame=0;this.errors=[];this.batches=new Map();this.batchedActors=0;}
 ready(ids){return ids.every(id=>!AUTHORED_ASSETS[id]||this.assets.has(id)||this.errors.includes(id));}
 async load(ids=Object.keys(AUTHORED_ASSETS)){
  await Promise.all([...new Set(ids)].filter(id=>AUTHORED_ASSETS[id]).map(id=>{
   if(this.ready([id]))return;
   if(this.pending.has(id))return this.pending.get(id);
   const task=(async()=>{
    try{const url=new URL(`assets/models/${id}.glb?v=20260919-polish67`,import.meta.url);const buffer=await loadModelBuffer(url);const gltf=await this.loader.parseAsync(buffer,new URL('.',url).href);prepareBossSensoryEyes(gltf,id);this.assets.set(id,gltf);}
    catch(error){this.errors.push(id);console.error('Authored model unavailable:',id,error);}
   })();
   this.pending.set(id,task);return task.finally(()=>this.pending.delete(id));
  }));return this;
 }
 begin(){this.flush();this.frame++;this.batchedActors=0;for(const pool of this.pools.values()){pool.used=0;for(const item of pool.items)item.root.visible=false;}}
 flush(){for(const batch of this.batches.values()){batch.count=0;batch.object.count=0;batch.object.visible=false;}for(const pool of this.pools.values())for(const item of pool.items){item.root.visible=false;if(item.root.parent===this.scene)this.scene.remove(item.root);}}
 acquire(id,age,opacity,hit,order,exposure,coreImpact=0,coreOpening=0,coreStrike=[0,0]){
  const source=this.assets.get(id);if(!source)return null;
  let pool=this.pools.get(id);if(!pool){pool={used:0,items:[]};this.pools.set(id,pool);}
  let item=pool.items[pool.used++];
  if(!item){
   const model=source.scene.clone(true),materials=new Map(),meshes=[],root=new THREE.Group();
   model.rotation.x=Math.PI; // glTF Y-up -> game Y-down, positive Z away.
   model.traverse(node=>{if(!node.isMesh)return;meshes.push(node);node.frustumCulled=false;
    const clone=m=>{if(materials.has(m))return materials.get(m);const copy=m.clone();copy.transparent=false;copy.forceSinglePass=true;if(copy.map)copy.color.multiplyScalar(1.32);if(copy.userData.sensoryLens)shadeSensoryPearl(copy);copy.userData.baseEmission=copy.emissive.clone();copy.userData.baseIntensity=copy.emissiveIntensity;materials.set(m,copy);return copy;};
    node.material=Array.isArray(node.material)?node.material.map(clone):clone(node.material);
   });
   root.add(model);root.matrixAutoUpdate=false;root.visible=false;
   const mixer=new THREE.AnimationMixer(model);for(const clip of source.animations)mixer.clipAction(clip).play();
   const sensoryLids=[];if(AUTHORED_ASSETS[id].role==='boss')model.traverse(node=>{if(/^Nictitating[_ ]cover/.test(node.name))sensoryLids.push({node,rest:node.position.clone(),scale:node.scale.clone()});});
   item={id,root,model,mixer,meshes,sensoryLids,materials:[...materials.values()],lastUsed:this.frame};pool.items.push(item);
  }
  item.lastUsed=this.frame;item.opacity=opacity;item.order=order;const elapsed=age-(item.age??age);if(item.age===undefined||elapsed<0||elapsed>.2)item.mixer.setTime(age);else item.mixer.update(elapsed);item.age=age;
  // The predator already has an eye beneath each nictitating membrane.
  // Close that same tissue across the eye; retract it into the brow to expose
  // the lens. Explicit rest transforms prevent pooled instances accumulating drift.
  for(const lid of item.sensoryLids){
   if(exposure===undefined){lid.node.position.copy(lid.rest);lid.node.scale.copy(lid.scale);continue;}
   const amount=Math.max(0,Math.min(1,exposure)),open=amount*amount*(3-2*amount)*(1-coreImpact*.23),side=Math.sign(lid.node.parent.position.z)||1;
   lid.node.position.copy(lid.rest);const size=lid.node.userData.primarySensory?3.0:1;lid.node.position.y=(open*1.4+.16*Math.sin(Math.PI*open)+open*.07*Math.sin(age*8.7+side*1.9))*size;lid.node.position.z=side*(.7-1.8*open)*size;
   lid.node.scale.copy(lid.scale);lid.node.scale.y*=1.65;
  }
  // A short neutral sheen preserves material detail while automatic fire hits.
  const flash=hit>0&&age%.12<.022?.25:0;
  item.sensoryActive=exposure>0&&item.sensoryLids.length>0;
  item.flash=Math.max(flash,coreImpact);for(const m of item.materials){m.transparent=opacity<.999;m.opacity=opacity;m.depthWrite=opacity>.96;m.emissive.copy(m.userData.baseEmission).addScalar(flash);const glint=m.userData.sensoryLens?coreOpening*.12+(exposure||0)*(.012+.105*Math.pow(.5+.5*Math.sin(age*4.4),3)):0;m.emissive.addScalar(glint);if(m.userData.pearlImpact)m.userData.pearlImpact.value=Math.max(0,Math.min(1,coreImpact));if(m.userData.pearlStrike)m.userData.pearlStrike.value.set(coreStrike[0],coreStrike[1]);m.emissiveIntensity=Math.max(m.userData.baseIntensity,flash||glint?1:0);}
  for(const node of item.meshes)node.renderOrder=order;
  return item;
 }
 // Independent joint animation, shared draw calls: upload each rigid part's
 // world transform to a bounded GPU instance batch. Fades/hit flashes keep the
 // ordinary material path so one actor never changes another actor's shading.
 submit(item){
  if(item.root.matrix.determinant()<0||item.opacity<.999||item.flash||item.sensoryActive||item.meshes.some(n=>n.isSkinnedMesh||Array.isArray(n.material))){item.root.visible=true;if(item.root.parent!==this.scene)this.scene.add(item.root);return;}
  item.root.updateMatrixWorld(true);
  for(let i=0;i<item.meshes.length;i++){
   const node=item.meshes[i],key=item.id+':'+i;
   let batch=this.batches.get(key);
   if(!batch){const material=node.material.clone(),object=new THREE.InstancedMesh(node.geometry,material,64);object.matrixAutoUpdate=false;object.instanceMatrix.setUsage(THREE.DynamicDrawUsage);object.frustumCulled=false;object.count=0;this.scene.add(object);batch={object,count:0,lastUsed:this.frame};this.batches.set(key,batch);}
   if(batch.count>=64){item.root.visible=true;if(item.root.parent!==this.scene)this.scene.add(item.root);return;}
  }
  for(let i=0;i<item.meshes.length;i++){
   const batch=this.batches.get(item.id+':'+i);batch.object.setMatrixAt(batch.count++,item.meshes[i].matrixWorld);batch.object.count=batch.count;batch.object.instanceMatrix.needsUpdate=true;batch.object.renderOrder=item.order;batch.object.visible=true;batch.lastUsed=this.frame;
  }
  item.root.visible=false;this.batchedActors++;
 }
 trim(){if(this.frame%300)return;for(const [key,b] of this.batches){if(this.frame-b.lastUsed>600){this.scene.remove(b.object);b.object.dispose();b.object.material.dispose();this.batches.delete(key);}}for(const pool of this.pools.values())while(pool.items.length&&this.frame-pool.items.at(-1).lastUsed>600){const item=pool.items.pop();this.scene.remove(item.root);item.mixer.stopAllAction();item.mixer.uncacheRoot(item.model);for(const m of item.materials)m.dispose();}}
 stats(){return {batches:this.batches.size,batchedActors:this.batchedActors,loaded:this.assets.size,pending:this.pending.size,instances:[...this.pools.values()].reduce((n,p)=>n+p.items.length,0),failed:this.errors};}
}
