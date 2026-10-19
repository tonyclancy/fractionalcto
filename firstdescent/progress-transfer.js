'use strict';
// Explicit, portable progress only. Never export storage wholesale or include credentials.
window.FirstDescentProgressTransfer={maxBytes:65536,create({campaign,exploration,engineer,campaignDefinition,explorationDefinition}){
 const limit=65536,plans=new WeakMap();
 function owners(){const values=[campaign.account(),exploration.account()];if(values[0]!==values[1])throw Error('The active player is changing. Try again in a moment.');return values;}
 const fail=()=>{throw Error('This is not a compatible First Descent progress backup.');};
 function collection(value,definition){
  if(!value||value.id!==definition.id||!Array.isArray(value.fragments))return fail();
  const ids=definition.systems.flatMap(s=>s.stages.map(e=>e.id)),known=new Set(ids),list=value.fragments;
  if(list.length>ids.length||list.some(id=>typeof id!=='string'||!known.has(id))||new Set(list).size!==list.length)return fail();
  if(list.includes(definition.finalStage)&&list.length!==ids.length)return fail();
  return {id:definition.id,fragments:ids.filter(id=>list.includes(id))};
 }
 function decode(text){
  if(typeof text!=='string'||text.length>limit||new TextEncoder().encode(text).length>limit)return fail();
  let data;try{data=JSON.parse(text);}catch{return fail();}
  if(!data||data.format!=='first-descent-progress'||data.schemaVersion!==1||typeof data.engineer!=='boolean')return fail();
  return {campaign:collection(data.campaign,campaignDefinition),exploration:collection(data.exploration,explorationDefinition),engineer:data.engineer};
 }
 function exportJSON(){owners();return JSON.stringify({format:'first-descent-progress',schemaVersion:1,createdAt:new Date().toISOString(),campaign:{id:campaignDefinition.id,fragments:campaign.exportFragments()},exploration:{id:explorationDefinition.id,fragments:exploration.exportFragments()},engineer:!!engineer.snapshot().unlocked},null,2)+'\n';}
 function preview(text){
  const data=decode(text),ticket=Object.freeze({missions:data.campaign.fragments.length,discoveries:data.exploration.fragments.length,newMissions:data.campaign.fragments.filter(id=>!campaign.has(id)).length,newDiscoveries:data.exploration.fragments.filter(id=>!exploration.has(id)).length,recoveryKit:data.engineer&&!engineer.snapshot().unlocked,signedIn:owners().some(Boolean)});
  plans.set(ticket,{data,owners:owners()});return ticket;
 }
 function apply(ticket){
  const plan=plans.get(ticket);if(!plan)throw Error('Choose a backup and review it before importing.');
  plans.delete(ticket);
  if(owners().some((id,i)=>id!==plan.owners[i]))throw Error('The active player changed. Choose the backup again before importing.');
  // Additive merges keep all existing progress, including anything earned after preview.
  const missions=campaign.merge(plan.data.campaign.fragments),discoveries=exploration.merge(plan.data.exploration.fragments);
  if(plan.data.engineer)engineer.unlock();
  return {missions,discoveries,durable:campaign.snapshot().durable&&exploration.snapshot().durable&&(!plan.data.engineer||engineer.snapshot().durable)};
 }
 return {exportJSON,preview,apply,cancel:ticket=>plans.delete(ticket)};
}};
