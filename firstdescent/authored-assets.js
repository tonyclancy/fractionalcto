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
 constructor(scene){this.scene=scene;this.assets=new Map();this.pools=new Map();this.frame=0;this.errors=[];}
 async load(){const loader=new GLTFLoader();await Promise.all(Object.keys(AUTHORED_ASSETS).map(async id=>{
  try{const gltf=await loader.loadAsync(new URL(`assets/models/${id}.glb`,import.meta.url).href);this.assets.set(id,gltf);}
  catch(error){this.errors.push(id);console.error('Authored model unavailable:',id,error);}
 }));return this;}
 begin(){this.frame++;for(const pool of this.pools.values()){pool.used=0;for(const item of pool.items)item.root.visible=false;}}
 flush(){for(const pool of this.pools.values())for(const item of pool.items)item.root.visible=false;}
 acquire(id,age,opacity,hit,order){
  const source=this.assets.get(id);if(!source)return null;
  let pool=this.pools.get(id);if(!pool){pool={used:0,items:[]};this.pools.set(id,pool);}
  let item=pool.items[pool.used++];
  if(!item){
   const model=source.scene.clone(true),materials=new Map(),root=new THREE.Group();
   model.rotation.x=Math.PI; // glTF Y-up -> game Y-down, positive Z away.
   model.traverse(node=>{if(!node.isMesh)return;node.frustumCulled=false;
    const clone=m=>{if(materials.has(m))return materials.get(m);const copy=m.clone();copy.transparent=true;copy.forceSinglePass=true;if(copy.map)copy.color.multiplyScalar(1.32);copy.userData.baseEmission=copy.emissive.clone();copy.userData.baseIntensity=copy.emissiveIntensity;materials.set(m,copy);return copy;};
    node.material=Array.isArray(node.material)?node.material.map(clone):clone(node.material);
   });
   root.add(model);root.matrixAutoUpdate=false;root.visible=false;this.scene.add(root);
   const mixer=new THREE.AnimationMixer(model);for(const clip of source.animations)mixer.clipAction(clip).play();
   item={root,model,mixer,materials:[...materials.values()],lastUsed:this.frame};pool.items.push(item);
  }
  item.lastUsed=this.frame;item.mixer.setTime(age);
  // A short warm sheen preserves material detail while automatic fire hits.
  const flash=hit>0&&age%.12<.022?.25:0;
  for(const m of item.materials){m.opacity=opacity;m.depthWrite=opacity>.96;m.emissive.copy(m.userData.baseEmission).addScalar(flash);m.emissiveIntensity=Math.max(m.userData.baseIntensity,flash?1:0);}
  item.model.traverse(node=>{if(node.isMesh)node.renderOrder=order;});
  return item;
 }
 trim(){if(this.frame%300)return;for(const pool of this.pools.values())while(pool.items.length&&this.frame-pool.items.at(-1).lastUsed>600){const item=pool.items.pop();this.scene.remove(item.root);item.mixer.stopAllAction();item.mixer.uncacheRoot(item.model);for(const m of item.materials)m.dispose();}}
 stats(){return {loaded:this.assets.size,instances:[...this.pools.values()].reduce((n,p)=>n+p.items.length,0),failed:this.errors};}
}
