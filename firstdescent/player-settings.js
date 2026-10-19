'use strict';
// Preferences are local and independent of campaign/account saves.
window.flightSettings=(()=>{
 const key='first-descent-player-settings-v1';
 const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 const defaults={musicVolume:1,effectsVolume:1,effectsEnabled:true,shake:reduced?0:1,reduceFlashes:reduced};
 const numeric=['musicVolume','effectsVolume','shake'],boolean=['effectsEnabled','reduceFlashes'];
 function valid(input){
  const out={};if(!input||typeof input!=='object'||Array.isArray(input))return out;
  for(const name of numeric)if(typeof input[name]==='number'&&Number.isFinite(input[name]))out[name]=Math.max(0,Math.min(1,input[name]));
  for(const name of boolean)if(typeof input[name]==='boolean')out[name]=input[name];
  return out;
 }
 let values={...defaults},saved=true;
 try{values={...values,...valid(JSON.parse(window.localStorage?.getItem(key)||'null'))};}catch{ /* Broken/unavailable storage must not prevent play. */ }
 function update(patch){
  const next={...values,...valid(patch)};
  if(Object.keys(next).every(k=>next[k]===values[k]))return snapshot();
  values=next;
  try{if(!window.localStorage)throw Error('Storage unavailable');window.localStorage.setItem(key,JSON.stringify(values));saved=true;}catch{saved=false;}
  return snapshot();
 }
 function snapshot(){return {...values};}
 // A hit owns one decaying response. Never derive flashing from animation age:
 // sustained fire must not turn the entire actor into a periodic strobe.
 function hitFeedback(seconds){return values.reduceFlashes?0:Math.max(0,Math.min(1,(Number.isFinite(seconds)?seconds:0)/.12));}
 return {snapshot,get:name=>values[name],update,hitFeedback,storageAvailable:()=>saved};
})();
