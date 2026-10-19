'use strict';
// Loaded only by the dedicated demo entry point, before the game scripts.
// This is a public sample, not a client-side licensing or DRM mechanism.
(() => {
 const prefix='first-descent-demo-v1:';
 let storage=null;
 try{const local=window.localStorage;if(local)storage={getItem:key=>local.getItem(prefix+key),setItem:(key,value)=>local.setItem(prefix+key,value),removeItem:key=>local.removeItem(prefix+key)};}catch{}
 const mission='verdant-reach';
 function allowed(target,mode){return mode==='story'&&campaign[target]?.id===mission;}
 function title(){
  const saved=savedCampaignCheckpoint(),completed=storyStore.has(mission);
  const copy=$('.introcopy');if(copy)copy.textContent='The expedition is missing. Follow its first signal through the skies of Caelus.';
  $('#launch').innerHTML=(saved?'CONTINUE DEMO':completed?'REPLAY DEMO':'PLAY FIRST MISSION')+' <span aria-hidden="true">↗</span>';
  $('#campaignCaption').textContent=saved?'RESUME CAELUS · SECTION '+(saved.checkpoint.section+1)+'/4':'FREE DEMO · ONE COMPLETE MISSION · NO ACCOUNT';
  for(const id of ['#universe','#mission','#atlas'])if($(id)){$(id).hidden=true;$(id).style.display='none';}
  const route=$('#routeCount');if(route)route.textContent='BEYOND THE DEMO · FULL CAMPAIGN IN DEVELOPMENT';
  const edition=$('.edition');if(edition)edition.textContent='FIRST DESCENT · DEMO';
  const footer=$('.footer-note');if(footer)footer.textContent='CAELUS DEMO · MOVEMENT, NOVAS, POWER-UPS AND THE FIRST GUARDIAN';
 }
 function menuKeys(event){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();showTitleScreen();}}
 function brief(){
  if(state!=='title')return;
  campaignBriefView=null;campaignPrologue=null;atlasOpen=false;
  const saved=savedCampaignCheckpoint(),overlay=$('#overlay');overlay.className='overlay story-transmission';overlay.onclick=null;overlay.onkeydown=menuKeys;
  overlay.innerHTML=`<section class="transmission-card" aria-labelledby="demoTitle"><span class="eyebrow mint">FREE DEMO · CAELUS</span><h2 id="demoTitle">Find the first signal.</h2><p class="transmission-task">Fly through the alien skies. Break through the guardian’s defenses and recover the expedition’s coordinates.</p><p class="transmission-service">${saved?'Section '+(saved.checkpoint.section+1)+'/4 '+(saved.durable?'saved on this device.':'available in this session only.')+' Your equipment returns.':'Weapons fire automatically. Move to dodge, flip to face threats, and use a nova when surrounded.'}</p><div class="transmission-actions"><button id="demoLaunch" class="primary">${saved?'RESUME MISSION':'LAUNCH TO CAELUS'} ↗</button><button id="storyBack" class="transmission-secondary">Back</button></div><details class="brief-details"><summary>About the full campaign</summary><p>Six missions across three solar systems. Rescue an engineer, reconnect lost relays and defend the gate that brings five stranded carriers home.</p><p>The full game is in development. Demo progress is separate from the full campaign. If device saving is unavailable, keep this tab open.</p></details></section>`;
  $('#demoLaunch').onclick=()=>beginStory(0);$('#storyBack').onclick=showTitleScreen;$('#demoLaunch').focus({preventScroll:true});
 }
 function complete(){
  if(!storyMission?.complete)return;
  state='victory';recordFlightRun(true);atlasOpen=false;keys.clear();pointer=null;touchContacts.clear();annTimer=0;
  $('#announcement').style.opacity=0;$('#pause').hidden=true;$('#bossbar').hidden=true;$('#touchControls').classList.remove('active');$('#originRecoveryPanel').hidden=true;
  window.flightAudio?.clear();window.flightAudio?.setBossApproach?.(0);window.flightAudio?.setRescueCelebration?.(true);window.flightAudio?.setMusicActive(true);
  const overlay=$('#overlay');overlay.className='overlay story-transmission';overlay.onclick=null;overlay.onkeydown=menuKeys;
  overlay.innerHTML=`<section class="transmission-card settled" aria-labelledby="demoCompleteTitle"><span class="eyebrow mint">CAELUS SECURED · DEMO COMPLETE</span><h2 id="demoCompleteTitle">The signal leads onward.</h2><p class="transmission-task">You defeated the guardian. The recovered coordinates reveal a distress call from the Foundry.</p><p class="transmission-service">SCORE ${String(score).padStart(6,'0')} · FIRST MISSION COMPLETE</p><details class="brief-details"><summary>The rescue continues in the full campaign</summary><p>Find the engineer. Locate the five missing carriers. Restore their route home across six missions and three solar systems.</p><p>Full game in development. Thank you for playing the demo.</p></details><div class="transmission-actions"><button id="demoReplay" class="primary">FLY AGAIN ↗</button><button id="demoMenu" class="transmission-secondary">Main menu</button></div></section>`;
  $('#demoReplay').onclick=()=>{if(state!=='victory')return;beginStory(0);};$('#demoMenu').onclick=showTitleScreen;$('#demoReplay').focus({preventScroll:true});updateHUD();
 }
 window.flightDemo=Object.freeze({storage,allowed,title,brief,complete});
})();
