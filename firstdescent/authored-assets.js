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
  const positions=n.geometry.attributes.position,point=new THREE.Vector3(),lens=/Obsidian[_ ]lens/.test(n.name),colors=lens?new Float32Array(positions.count*3):null,base=n.material.color,eyeColor=new THREE.Color(id==='rift-lantern'?'#76bfa6':'#ceb076'),pupilColor=new THREE.Color('#172122');
  for(let i=0;i<positions.count;i++){
   point.fromBufferAttribute(positions,i);n.localToWorld(point);
   const center=centers.find(c=>point.distanceTo(c)<2.8),pupil=center&&Math.abs(point.x-center.x)<.27;
   if(center){point.sub(center).multiplyScalar(2.4).add(center);n.worldToLocal(point);positions.setXYZ(i,point.x,point.y,point.z);}
   if(colors){const c=center?(pupil?pupilColor:eyeColor):base;colors.set([c.r,c.g,c.b],i*3);}
  }
  if(colors){n.material=n.material.clone();n.material.color.set('#ffffff');n.material.vertexColors=true;n.material.userData.sensoryLens=true;n.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));}
  positions.needsUpdate=true;n.geometry.computeVertexNormals();n.geometry.computeBoundingSphere();
 });
 for(const lid of lids)for(const cover of lid.children){cover.scale.multiplyScalar(2.4);cover.userData.primarySensory=true;}
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
 acquire(id,age,opacity,hit,order,exposure,coreImpact=0,coreOpening=0){
  const source=this.assets.get(id);if(!source)return null;
  let pool=this.pools.get(id);if(!pool){pool={used:0,items:[]};this.pools.set(id,pool);}
  let item=pool.items[pool.used++];
  if(!item){
   const model=source.scene.clone(true),materials=new Map(),meshes=[],root=new THREE.Group();
   model.rotation.x=Math.PI; // glTF Y-up -> game Y-down, positive Z away.
   model.traverse(node=>{if(!node.isMesh)return;meshes.push(node);node.frustumCulled=false;
    const clone=m=>{if(materials.has(m))return materials.get(m);const copy=m.clone();copy.transparent=false;copy.forceSinglePass=true;if(copy.map)copy.color.multiplyScalar(1.32);copy.userData.baseEmission=copy.emissive.clone();copy.userData.baseIntensity=copy.emissiveIntensity;materials.set(m,copy);return copy;};
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
   lid.node.position.copy(lid.rest);const size=lid.node.userData.primarySensory?2.4:1;lid.node.position.y=(open*1.4+.16*Math.sin(Math.PI*open)+open*.07*Math.sin(age*8.7+side*1.9))*size;lid.node.position.z=side*(.7-1.8*open)*size;
   lid.node.scale.copy(lid.scale);lid.node.scale.y*=1.65;
  }
  // A short warm sheen preserves material detail while automatic fire hits.
  const flash=hit>0&&age%.12<.022?.25:0;
  item.sensoryActive=exposure>0&&item.sensoryLids.length>0;
  item.flash=Math.max(flash,coreImpact);for(const m of item.materials){m.transparent=opacity<.999;m.opacity=opacity;m.depthWrite=opacity>.96;m.emissive.copy(m.userData.baseEmission).addScalar(flash);const glint=m.userData.sensoryLens?coreOpening*.12+coreImpact*.38+(exposure||0)*(.012+.105*Math.pow(.5+.5*Math.sin(age*4.4),3)):0;m.emissive.r+=glint;m.emissive.g+=glint*.75;m.emissive.b+=glint*.5;m.emissiveIntensity=Math.max(m.userData.baseIntensity,flash||glint?1:0);}
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
