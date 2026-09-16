'use strict';
// Platform-neutral records. The storage adapter is replaceable in native wrappers.
// Client records are explicitly unverified; an online service must validate runs.
function createRunStore(storage){
 const key='neon-vanguard-runs-v1';let memory=[],loaded=false;
 const valid=r=>r&&r.schemaVersion===1&&typeof r.runId==='string'&&typeof r.ruleset==='string'&&typeof r.campaignVersion==='string'&&Number.isInteger(r.score)&&r.score>=0&&Number.isInteger(r.retries)&&r.retries>=0&&Number.isInteger(r.activeTicks)&&r.activeTicks>=0&&['defeat','victory'].includes(r.outcome)&&r.verification==='local-unverified';
 function read(){if(!loaded){loaded=true;try{const data=JSON.parse(storage?.getItem(key)||'null');if(Array.isArray(data))memory=data.filter(valid).slice(0,100);}catch{}}return memory.map(r=>({...r}));}
 function save(record){if(!valid(record))throw new Error('Invalid run record');memory=[{...record},...read().filter(r=>r.runId!==record.runId)].slice(0,100);try{storage?.setItem(key,JSON.stringify(memory));}catch{}return {...record};}
 function list(ruleset,campaignVersion){return read().filter(r=>r.ruleset===ruleset&&r.campaignVersion===campaignVersion).sort((a,b)=>(b.outcome==='victory')-(a.outcome==='victory')||b.score-a.score||a.retries-b.retries||a.activeTicks-b.activeTicks).slice(0,10);}
 return{save,list,exportJSON:()=>JSON.stringify(read(),null,2)};
}
let runStorage;try{runStorage=window.localStorage;}catch{}
const runStore=createRunStore(runStorage);
let flightRun=null,runSequence=0;
function beginFlightRun(){flightRun={schemaVersion:1,runId:window.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+(++runSequence)+'-'+Math.random().toString(36).slice(2),ruleset:GAME_RULESET,campaignId:CAMPAIGN_ID,campaignVersion:CAMPAIGN_VERSION,startedAt:new Date().toISOString(),activeTicks:0,retries:0,deaths:0,verification:'local-unverified'};}
function recordFlightRun(win){if(!flightRun)return;runStore.save({...flightRun,recordedAt:new Date().toISOString(),score,levelId:sectors[level].id,section:currentSection()+1,outcome:win?'victory':'defeat'});}
function showLocalScores(){
 const oldState=state;if(state==='playing')pause();
 const rows=runStore.list(GAME_RULESET,CAMPAIGN_VERSION);
 const description=rows.length?rows.map((r,i)=>`${i+1}. ${String(r.score).padStart(6,'0')} · ${r.outcome==='victory'?'CLEARED':'DEFEAT'} · ${r.retries} retries`).join('<br>'):'Complete a flight to set your first local score.';
 panel('FLIGHT<br><em>RECORDS</em>',description+'<br><small>Saved on this device · Online rankings coming later</small>','BACK',()=>{
  if(oldState==='title'){showTitleScreen();}
  else if(oldState==='playing'||oldState==='paused'){state='paused';panel('FLIGHT<br><em>PAUSED</em>','Ready when you are.','RESUME MISSION',pause);}
  else panel(oldState==='victory'?'GALAXY<br><em>SECURED</em>':'SIGNAL<br><em>LOST</em>',oldState==='victory'?'Campaign complete.':`Resume section ${checkpoint.section+1} of 4.`,oldState==='victory'?'FLY AGAIN':'RETRY SECTION',oldState==='victory'?start:retrySection);
 });
 $('#overlay').classList.add('records-view');
}
