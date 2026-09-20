import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/addons/GLTFLoader.js';

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
export class AuthoredAssets {
 constructor(scene){this.scene=scene;this.assets=new Map();this.pools=new Map();this.frame=0;this.errors=[];this.batches=new Map();this.batchedActors=0;}
 async load(){const loader=new GLTFLoader();await Promise.all(Object.keys(AUTHORED_ASSETS).map(async id=>{
  try{const gltf=await loader.loadAsync(new URL(`assets/models/${id}.glb?v=20260919-polish67`,import.meta.url).href);this.assets.set(id,gltf);}
  catch(error){this.errors.push(id);console.error('Authored model unavailable:',id,error);}
 }));return this;}
 begin(){this.flush();this.frame++;this.batchedActors=0;for(const pool of this.pools.values()){pool.used=0;for(const item of pool.items)item.root.visible=false;}}
 flush(){for(const batch of this.batches.values()){batch.count=0;batch.object.count=0;batch.object.visible=false;}for(const pool of this.pools.values())for(const item of pool.items){item.root.visible=false;if(item.root.parent===this.scene)this.scene.remove(item.root);}}
 acquire(id,age,opacity,hit,order){
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
   item={id,root,model,mixer,meshes,materials:[...materials.values()],lastUsed:this.frame};pool.items.push(item);
  }
  item.lastUsed=this.frame;item.opacity=opacity;item.order=order;const elapsed=age-(item.age??age);if(item.age===undefined||elapsed<0||elapsed>.2)item.mixer.setTime(age);else item.mixer.update(elapsed);item.age=age;
  // A short warm sheen preserves material detail while automatic fire hits.
  const flash=hit>0&&age%.12<.022?.25:0;
  item.flash=flash;for(const m of item.materials){m.transparent=opacity<.999;m.opacity=opacity;m.depthWrite=opacity>.96;m.emissive.copy(m.userData.baseEmission).addScalar(flash);m.emissiveIntensity=Math.max(m.userData.baseIntensity,flash?1:0);}
  for(const node of item.meshes)node.renderOrder=order;
  return item;
 }
 // Independent joint animation, shared draw calls: upload each rigid part's
 // world transform to a bounded GPU instance batch. Fades/hit flashes keep the
 // ordinary material path so one actor never changes another actor's shading.
 submit(item){
  if(item.root.matrix.determinant()<0||item.opacity<.999||item.flash||item.meshes.some(n=>n.isSkinnedMesh||Array.isArray(n.material))){item.root.visible=true;if(item.root.parent!==this.scene)this.scene.add(item.root);return;}
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
 stats(){return {batches:this.batches.size,batchedActors:this.batchedActors,loaded:this.assets.size,instances:[...this.pools.values()].reduce((n,p)=>n+p.items.length,0),failed:this.errors};}
}
