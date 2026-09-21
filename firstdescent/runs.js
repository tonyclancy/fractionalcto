'use strict';
// Platform-neutral records. The storage adapter is replaceable in native wrappers.
// Client records are explicitly unverified; an online service must validate runs.
function createRunStore(storage){
 const key='neon-vanguard-runs-v1';let memory=[],loaded=false;
 const valid=r=>r&&r.schemaVersion===1&&typeof r.runId==='string'&&typeof r.ruleset==='string'&&typeof r.campaignVersion==='string'&&Number.isInteger(r.score)&&r.score>=0&&Number.isInteger(r.retries)&&r.retries>=0&&Number.isInteger(r.activeTicks)&&r.activeTicks>=0&&['defeat','victory'].includes(r.outcome)&&r.verification==='local-unverified';
 function read(){if(!loaded){loaded=true;try{const data=JSON.parse(storage?.getItem(key)||'null');if(Array.isArray(data))memory=data.filter(valid).slice(0,100);}catch{}}return memory.map(r=>({...r}));}
 function save(record){if(!valid(record))throw new Error('Invalid run record');memory=[{...record},...read().filter(r=>r.runId!==record.runId)].slice(0,100);try{storage?.setItem(key,JSON.stringify(memory));}catch{}return {...record};}
 function list(ruleset,campaignVersion){return read().filter(r=>r.ruleset===ruleset&&r.campaignVersion===campaignVersion&&r.scope!=='mission-resume').sort((a,b)=>(b.outcome==='victory')-(a.outcome==='victory')||b.score-a.score||a.retries-b.retries||a.activeTicks-b.activeTicks).slice(0,10);}
 return{save,list,exportJSON:()=>JSON.stringify(read(),null,2)};
}
let runStorage;try{runStorage=window.localStorage;}catch{}
const missionPreview=typeof document!=='undefined'&&document.documentElement?.hasAttribute?.('data-mission-preview');
const runStore=createRunStore(missionPreview?null:runStorage);
let flightRun=null,runSequence=0;
function beginFlightRun(){flightRun={schemaVersion:1,runId:window.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+(++runSequence)+'-'+Math.random().toString(36).slice(2),ruleset:GAME_RULESET,campaignId:CAMPAIGN_ID,campaignVersion:CAMPAIGN_VERSION,startedAt:new Date().toISOString(),activeTicks:0,retries:0,deaths:0,verification:'local-unverified'};}
function recordFlightRun(win){if(!flightRun)return;runStore.save({...flightRun,recordedAt:new Date().toISOString(),score,...expedition.locations[sectors[level].id],levelId:sectors[level].id,section:currentSection()+1,outcome:win?'victory':'defeat'});}
function showLocalScores(){
 const oldState=state;if(state==='playing')pause();
 const rows=runStore.list(GAME_RULESET,CAMPAIGN_VERSION);
 const description=rows.length?rows.map((r,i)=>`${i+1}. ${String(r.score).padStart(6,'0')} · ${r.outcome==='victory'?'CLEARED':'DEFEAT'} · ${r.retries} retries`).join('<br>'):'Complete a flight to set your first local score.';
 panel('FLIGHT<br><em>RECORDS</em>',description+'<br><small>Saved on this device · Online rankings coming later</small>','BACK',()=>{
  if(oldState==='title'){showTitleScreen();}
  else if(oldState==='playing'||oldState==='paused'){state='paused';panel('FLIGHT<br><em>PAUSED</em>','Ready when you are.','RESUME MISSION',pause);}
  else panel(oldState==='victory'?'SYSTEM<br><em>SECURED</em>':'SIGNAL<br><em>LOST</em>',oldState==='victory'?'Campaign complete.':`Resume section ${checkpoint.section+1} of 4.`,oldState==='victory'?'FLY AGAIN':'CONTINUE DESCENT',oldState==='victory'?start:retrySection);
 });
 $('#overlay').classList.add('records-view');
}

// Authored membership is pinned: future content must define another expedition.
const ORIGIN_EXPEDITION=Object.freeze({
 "id": "origin-signal-001",
 "version": 1,
 "title": "THE ORIGIN SIGNAL",
 "finalStage": "eventide-aureus-corona",
 "milestones": Object.freeze([{"target": 3, "name": "First Light", "title": "SIGNAL SCOUT", "memory": "The seeds share a heartbeat. The expedition left these memories deliberately."}, {"target": 6, "name": "Taking Root", "title": "PATHFINDER", "memory": "A second voice answers. The guardians carried the archive to keep it alive."}, {"target": 10, "name": "Awakening", "title": "SEED KEEPER", "memory": "The living map unfolds. Its first route points beyond the familiar stars."}, {"target": 15, "name": "Distant Voices", "title": "ECHO SEEKER", "memory": "The crew split the signal so no single disaster could erase their journey."}, {"target": 20, "name": "Constellation", "title": "STAR CARTOGRAPHER", "memory": "The fragments reveal a chain of shelters, each marked by a different sun."}, {"target": 30, "name": "Living Archive", "title": "MEMORY WARDEN", "memory": "These memories preserve entire worlds, not only the people who visited them."}, {"target": 40, "name": "Deep Signal", "title": "DEEP EXPLORER", "memory": "A pulse from the deep archive matches the oldest voice in your collection."}, {"target": 50, "name": "Resonance", "title": "RESONANT PILOT", "memory": "Separated voices fall into harmony. You can hear the expedition calling home."}, {"target": 60, "name": "Homeward", "title": "WAYFINDER", "memory": "The map turns inward. Its destination was hidden between the recorded routes."}, {"target": 70, "name": "The Last Watch", "title": "GUARDIAN KEEPER", "memory": "The final watch held the archive open while the others scattered its keys."}, {"target": 80, "name": "Near Origin", "title": "ORIGIN SEEKER", "memory": "The signal names Eventide. Only the last coordinates remain obscured."}, {"target": 90, "name": "The Beacon", "title": "BEACON BEARER", "memory": "The beacon is almost whole. Two final memories will reveal the route home."}, {"target": 92, "name": "Origin Restored", "title": "ORIGIN RESTORER", "memory": "The expedition\u2019s voices are reunited. Their route home shines across the stars."}].map(Object.freeze)),
 "systems": [
  {
   "id": "vesper-system",
   "name": "VESPER",
   "stages": [
    {
     "id": "verdant-reach",
     "name": "CAELUS",
     "kind": "seed"
    },
    {
     "id": "ember-forge",
     "name": "FERRUM",
     "kind": "core"
    },
    {
     "id": "pale-abyss",
     "name": "NACRE",
     "kind": "seed"
    }
   ],
   "discovery": "The signal is a memory, not a distress call."
  },
  {
   "id": "orison-system",
   "name": "ORISON",
   "stages": [
    {
     "id": "lumen-reef",
     "name": "THALASSA",
     "kind": "seed"
    },
    {
     "id": "tempest-citadel",
     "name": "VEYRA",
     "kind": "core"
    },
    {
     "id": "crimson-heart",
     "name": "CINDER",
     "kind": "seed"
    },
    {
     "id": "nivara-glacial-heart",
     "name": "NIVARA",
     "kind": "seed"
    }
   ],
   "discovery": "The expedition crossed these worlds before us."
  },
  {
   "id": "lyra-system",
   "name": "LYRA",
   "stages": [
    {
     "id": "lyra-aster-descent",
     "name": "ASTER",
     "kind": "seed"
    },
    {
     "id": "lyra-scoria-descent",
     "name": "SCORIA",
     "kind": "seed"
    },
    {
     "id": "lyra-pelagos-descent",
     "name": "PELAGOS",
     "kind": "seed"
    }
   ],
   "discovery": "Every guardian carries the same impossible pattern."
  },
  {
   "id": "solenne-system",
   "name": "SOLENNE",
   "stages": [
    {
     "id": "solenne-brass-descent",
     "name": "BRASS",
     "kind": "core"
    },
    {
     "id": "solenne-zephyr-descent",
     "name": "ZEPHYR",
     "kind": "seed"
    },
    {
     "id": "solenne-oriel-descent",
     "name": "ORIEL",
     "kind": "core"
    },
    {
     "id": "solenne-isolde-descent",
     "name": "ISOLDE",
     "kind": "seed"
    },
    {
     "id": "solenne-rime-descent",
     "name": "RIME",
     "kind": "seed"
    }
   ],
   "discovery": "The fragments answer one another across empty space."
  },
  {
   "id": "nereid-system",
   "name": "NEREID",
   "stages": [
    {
     "id": "nereid-thren-descent",
     "name": "THREN",
     "kind": "seed"
    },
    {
     "id": "nereid-mistral-descent",
     "name": "MISTRAL",
     "kind": "seed"
    },
    {
     "id": "nereid-sere-descent",
     "name": "SERE",
     "kind": "seed"
    },
    {
     "id": "nereid-brine-descent",
     "name": "BRINE",
     "kind": "seed"
    }
   ],
   "discovery": "The expedition called the pattern a map."
  },
  {
   "id": "umbra-system",
   "name": "UMBRA",
   "stages": [
    {
     "id": "umbra-cauter-descent",
     "name": "CAUTER",
     "kind": "core"
    },
    {
     "id": "umbra-caldera-descent",
     "name": "CALDERA",
     "kind": "seed"
    },
    {
     "id": "umbra-viridia-descent",
     "name": "VIRIDIA",
     "kind": "seed"
    },
    {
     "id": "umbra-morrow-descent",
     "name": "MORROW",
     "kind": "seed"
    },
    {
     "id": "umbra-boreas-descent",
     "name": "BOREAS",
     "kind": "core"
    },
    {
     "id": "umbra-hush-descent",
     "name": "HUSH",
     "kind": "seed"
    }
   ],
   "discovery": "The map was alive before the first stars."
  },
  {
   "id": "auric-system",
   "name": "AURIC",
   "stages": [
    {
     "id": "auric-gilt-descent",
     "name": "GILT",
     "kind": "seed"
    },
    {
     "id": "auric-hesper-descent",
     "name": "HESPER",
     "kind": "core"
    },
    {
     "id": "auric-floe-descent",
     "name": "FLOE",
     "kind": "seed"
    }
   ],
   "discovery": "Machines learned to preserve it. Creatures learned to inherit it."
  },
  {
   "id": "halcyon-system",
   "name": "HALCYON",
   "stages": [
    {
     "id": "halcyon-kiln-descent",
     "name": "KILN",
     "kind": "seed"
    },
    {
     "id": "halcyon-lacuna-descent",
     "name": "LACUNA",
     "kind": "seed"
    },
    {
     "id": "halcyon-cirrus-descent",
     "name": "CIRRUS",
     "kind": "seed"
    },
    {
     "id": "halcyon-nimbus-descent",
     "name": "NIMBUS",
     "kind": "core"
    },
    {
     "id": "halcyon-silex-descent",
     "name": "SILEX",
     "kind": "seed"
    }
   ],
   "discovery": "The guardians are scattered parts of a single archive."
  },
  {
   "id": "pyrrha-system",
   "name": "PYRRHA",
   "stages": [
    {
     "id": "pyrrha-sinter-descent",
     "name": "SINTER",
     "kind": "core"
    },
    {
     "id": "pyrrha-aureole-descent",
     "name": "AUREOLE",
     "kind": "seed"
    },
    {
     "id": "pyrrha-nerine-descent",
     "name": "NERINE",
     "kind": "seed"
    },
    {
     "id": "pyrrha-obscura-descent",
     "name": "OBSCURA",
     "kind": "seed"
    }
   ],
   "discovery": "Someone broke the archive to keep it safe."
  },
  {
   "id": "elysian-system",
   "name": "ELYSIAN",
   "stages": [
    {
     "id": "elysian-vulcanis-descent",
     "name": "VULCANIS",
     "kind": "seed"
    },
    {
     "id": "elysian-crucible-descent",
     "name": "CRUCIBLE",
     "kind": "seed"
    },
    {
     "id": "elysian-serein-descent",
     "name": "SEREIN",
     "kind": "seed"
    },
    {
     "id": "elysian-opaline-descent",
     "name": "OPALINE",
     "kind": "seed"
    },
    {
     "id": "elysian-vespera-descent",
     "name": "VESPERA",
     "kind": "core"
    },
    {
     "id": "elysian-terminus-descent",
     "name": "TERMINUS",
     "kind": "seed"
    }
   ],
   "discovery": "Our lost pilots found a way to listen."
  },
  {
   "id": "selen-system",
   "name": "SELEN",
   "stages": [
    {
     "id": "selen-eidolon-descent",
     "name": "EIDOLON",
     "kind": "seed"
    },
    {
     "id": "selen-flint-descent",
     "name": "FLINT",
     "kind": "core"
    },
    {
     "id": "selen-saphir-descent",
     "name": "SAPHIR",
     "kind": "seed"
    },
    {
     "id": "selen-hail-descent",
     "name": "HAIL",
     "kind": "seed"
    }
   ],
   "discovery": "Their voices survive inside the signal."
  },
  {
   "id": "rubra-system",
   "name": "RUBRA",
   "stages": [
    {
     "id": "rubra-furnace-descent",
     "name": "FURNACE",
     "kind": "seed"
    },
    {
     "id": "rubra-sirocco-descent",
     "name": "SIROCCO",
     "kind": "core"
    },
    {
     "id": "rubra-asterion-descent",
     "name": "ASTERION",
     "kind": "seed"
    }
   ],
   "discovery": "They reached a place where stars orbit darkness."
  },
  {
   "id": "talos-system",
   "name": "TALOS",
   "stages": [
    {
     "id": "talos-alloy-descent",
     "name": "ALLOY",
     "kind": "core"
    },
    {
     "id": "talos-fervor-descent",
     "name": "FERVOR",
     "kind": "seed"
    },
    {
     "id": "talos-beryl-descent",
     "name": "BERYL",
     "kind": "seed"
    },
    {
     "id": "talos-tethys-descent",
     "name": "TETHYS",
     "kind": "seed"
    },
    {
     "id": "talos-vortex-descent",
     "name": "VORTEX",
     "kind": "core"
    },
    {
     "id": "talos-shard-descent",
     "name": "SHARD",
     "kind": "seed"
    }
   ],
   "discovery": "There they found a door without a lock."
  },
  {
   "id": "aether-system",
   "name": "AETHER",
   "stages": [
    {
     "id": "aether-cresset-descent",
     "name": "CRESSET",
     "kind": "seed"
    },
    {
     "id": "aether-aerial-descent",
     "name": "AERIAL",
     "kind": "seed"
    },
    {
     "id": "aether-nympha-descent",
     "name": "NYMPHA",
     "kind": "seed"
    },
    {
     "id": "aether-aurelia-descent",
     "name": "AURELIA",
     "kind": "core"
    },
    {
     "id": "aether-hoarfrost-descent",
     "name": "HOARFROST",
     "kind": "seed"
    }
   ],
   "discovery": "The door opens only to a complete memory."
  },
  {
   "id": "cervus-system",
   "name": "CERVUS",
   "stages": [
    {
     "id": "cervus-fallow-descent",
     "name": "FALLOW",
     "kind": "seed"
    },
    {
     "id": "cervus-verdigris-descent",
     "name": "VERDIGRIS",
     "kind": "seed"
    },
    {
     "id": "cervus-marina-descent",
     "name": "MARINA",
     "kind": "seed"
    },
    {
     "id": "cervus-wintermere-descent",
     "name": "WINTERMERE",
     "kind": "seed"
    }
   ],
   "discovery": "The guardians are its living keys."
  },
  {
   "id": "argent-system",
   "name": "ARGENT",
   "stages": [
    {
     "id": "argent-smelt-descent",
     "name": "SMELT",
     "kind": "seed"
    },
    {
     "id": "argent-tempera-descent",
     "name": "TEMPERA",
     "kind": "core"
    },
    {
     "id": "argent-peregrine-descent",
     "name": "PEREGRINE",
     "kind": "seed"
    },
    {
     "id": "argent-littoral-descent",
     "name": "LITTORAL",
     "kind": "seed"
    },
    {
     "id": "argent-pallor-descent",
     "name": "PALLOR",
     "kind": "core"
    },
    {
     "id": "argent-glacier-descent",
     "name": "GLACIER",
     "kind": "seed"
    }
   ],
   "discovery": "The expedition could not bring every key home."
  },
  {
   "id": "saffron-system",
   "name": "SAFFRON",
   "stages": [
    {
     "id": "saffron-emberfall-descent",
     "name": "EMBERFALL",
     "kind": "seed"
    },
    {
     "id": "saffron-nimbusreach-descent",
     "name": "NIMBUSREACH",
     "kind": "core"
    },
    {
     "id": "saffron-stillwater-descent",
     "name": "STILLWATER",
     "kind": "seed"
    }
   ],
   "discovery": "They left their route for another pilot."
  },
  {
   "id": "virent-system",
   "name": "VIRENT",
   "stages": [
    {
     "id": "virent-carmine-descent",
     "name": "CARMINE",
     "kind": "seed"
    },
    {
     "id": "virent-lichen-descent",
     "name": "LICHEN",
     "kind": "seed"
    },
    {
     "id": "virent-cerulean-descent",
     "name": "CERULEAN",
     "kind": "seed"
    },
    {
     "id": "virent-halation-descent",
     "name": "HALATION",
     "kind": "core"
    },
    {
     "id": "virent-permafrost-descent",
     "name": "PERMAFROST",
     "kind": "seed"
    }
   ],
   "discovery": "The fragments now speak with one voice."
  },
  {
   "id": "noctis-system",
   "name": "NOCTIS",
   "stages": [
    {
     "id": "noctis-fumarole-descent",
     "name": "FUMAROLE",
     "kind": "seed"
    },
    {
     "id": "noctis-sable-descent",
     "name": "SABLE",
     "kind": "core"
    },
    {
     "id": "noctis-fathom-descent",
     "name": "FATHOM",
     "kind": "seed"
    },
    {
     "id": "noctis-rook-descent",
     "name": "ROOK",
     "kind": "seed"
    }
   ],
   "discovery": "Follow the stars into Eventide."
  },
  {
   "id": "meridian-system",
   "name": "MERIDIAN",
   "stages": [
    {
     "id": "meridian-dawnfire-descent",
     "name": "DAWNFIRE",
     "kind": "seed"
    },
    {
     "id": "meridian-aegis-descent",
     "name": "AEGIS",
     "kind": "core"
    },
    {
     "id": "meridian-lucent-descent",
     "name": "LUCENT",
     "kind": "seed"
    },
    {
     "id": "meridian-aquilon-descent",
     "name": "AQUILON",
     "kind": "seed"
    },
    {
     "id": "meridian-ophir-descent",
     "name": "OPHIR",
     "kind": "core"
    },
    {
     "id": "meridian-evernight-descent",
     "name": "EVERNIGHT",
     "kind": "seed"
    }
   ],
   "discovery": "The last guardian holds the way through."
  },
  {
   "id": "eventide-system",
   "name": "EVENTIDE",
   "stages": [
    {
     "id": "eventide-carmine-corona",
     "name": "CARMINE",
     "kind": "ember"
    },
    {
     "id": "eventide-fulgur-corona",
     "name": "FULGUR",
     "kind": "ember"
    },
    {
     "id": "eventide-aureus-corona",
     "name": "AUREUS",
     "kind": "ember"
    }
   ],
   "discovery": "The archive remembers. The Origin awaits."
  }
 ]
});
function originMilestoneProgress(definition,count){
 const milestones=definition.milestones||[],earned=milestones.filter(m=>count>=m.target),next=milestones.find(m=>count<m.target)||null,previous=earned.at(-1)||null,base=previous?.target||0;
 return Object.freeze({earned:Object.freeze(earned),next,previous,index:earned.length+1,count:next?count-base:0,total:next?next.target-base:0});
}
function createOriginStore(storage,definition=ORIGIN_EXPEDITION){
 const entries=definition.systems.flatMap(s=>s.stages),ids=new Set(entries.map(e=>e.id)),baseKey='first-descent-mission-'+definition.id;
 if(ids.size!==entries.length||!ids.has(definition.finalStage))throw Error('Invalid mission membership');
 const fragments=new Set(),listeners=new Set();let durable=!!storage,view,account=null;
 const key=()=>baseKey+(account?':player:'+account:'');
 function valid(values){const result=new Set(Array.isArray(values)?values.filter(id=>ids.has(id)):[]);if(result.has(definition.finalStage)&&result.size!==ids.size)result.delete(definition.finalStage);return result;}
 function read(k){try{const saved=JSON.parse(storage?.getItem(k)||'null');return saved?.schemaVersion===1?valid(saved.fragments):new Set();}catch{durable=false;return new Set();}}
 function persist(){
  // Another tab may have added discoveries since this store was loaded.
  for(const id of read(key()))fragments.add(id);
  try{if(!storage)throw Error('Session only');storage.setItem(key(),JSON.stringify({schemaVersion:1,fragments:[...fragments]}));durable=true;}catch{durable=false;}view=null;
 }
 for(const id of read(key()))fragments.add(id);
 function notify(){for(const listener of listeners){try{listener();}catch{ /* Saving must never interrupt gameplay. */ }}}
 function snapshot(){if(!view){const counts=definition.systems.map(s=>Object.freeze({id:s.id,count:s.stages.filter(e=>fragments.has(e.id)).length,total:s.stages.length}));view=Object.freeze({count:fragments.size,total:ids.size,complete:fragments.size===ids.size,unlocked:entries.every(e=>e.id===definition.finalStage||fragments.has(e.id)),next:entries.find(e=>!fragments.has(e.id))?.id||null,durable,milestone:originMilestoneProgress(definition,fragments.size),systems:Object.freeze(counts)});}return view;}
 function collect(id){if(!ids.has(id)||fragments.has(id)||id===definition.finalStage&&!snapshot().unlocked)return null;fragments.add(id);persist();notify();
  const system=definition.systems.find(s=>s.stages.some(e=>e.id===id)),completeSystem=system.stages.every(e=>fragments.has(e.id));
  return {entry:entries.find(e=>e.id===id),system,completeSystem,complete:snapshot().complete,milestone:(definition.milestones||[]).find(m=>m.target===fragments.size)||null};
 }
 function merge(values){const combined=valid([...fragments,...(Array.isArray(values)?values:[])]);const added=combined.size-fragments.size;for(const id of combined)fragments.add(id);persist();return added;}
 function useAccount(id,{importGuest=false}={}){
  if(id!==null&&!/^[a-zA-Z0-9-]{1,128}$/.test(id))throw Error('Invalid player ID');
  const guest=importGuest&&id&&!account?[...fragments]:[];account=id;fragments.clear();for(const value of read(key()))fragments.add(value);view=null;
  if(guest.length){merge(guest);if(durable){try{storage.setItem(baseKey,JSON.stringify({schemaVersion:1,fragments:[]}));}catch{ /* Retain the guest backup if storage fails. */ }}}
 }
 return{snapshot,collect,has:id=>fragments.has(id),merge,useAccount,account:()=>account,exportFragments:()=>[...fragments],missionId:definition.id,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)}};
}
// Local review pages use isolated memory; normal play always uses device storage.
const originStore=createOriginStore(missionPreview?null:runStorage);
