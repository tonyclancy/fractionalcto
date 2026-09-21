'use strict';
// Loaded after the game. QA scenes never authenticate or upload test discoveries.
if(!missionPreview){
 const sync=window.FirstDescentCloud.create({store:originStore,storage:runStorage,sessionStorage:window.firstDescentSessionStorage||runStorage,config:window.FIRST_DESCENT_CLOUD});window.collectionSync=sync;
 const dialog=document.createElement('dialog');dialog.className='collection-dialog';dialog.setAttribute('aria-labelledby','collectionTitle');
 dialog.innerHTML='<form method="dialog"><button class="collection-close" aria-label="Close cloud save">×</button></form><span class="eyebrow mint">FIRST DESCENT · YOUR COLLECTION</span><h2 id="collectionTitle">Keep your discoveries.</h2><p>Keep every crystal you earn. Sign in with the same email on another device to continue your collection.</p><p id="collectionStatus" role="status" aria-live="polite"></p><p id="collectionStorage"></p><form id="collectionEmailForm"><label for="collectionEmail">Email address</label><input id="collectionEmail" type="email" autocomplete="email" maxlength="254" required><button class="primary" type="submit">SEND SIGN-IN CODE</button><small>We’ll email a one-time code. No password needed.</small></form><form id="collectionCodeForm" hidden><label for="collectionCode">Code from your email</label><input id="collectionCode" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" minlength="6" maxlength="10" required><label class="collection-import"><input id="collectionImport" type="checkbox" checked> Add this device’s guest crystals to my account</label><button class="primary" type="submit">SIGN IN & SYNC</button><button id="collectionRestart" type="button">USE ANOTHER EMAIL / RESEND</button></form><div id="collectionSignedIn" hidden><p id="collectionEmailLabel"></p><button id="collectionSyncNow" class="primary">SYNC NOW</button><button id="collectionSignOut">SIGN OUT</button><small>Signing out keeps this player’s saved collection on this device. Guest play uses a separate collection.</small></div><p id="collectionError" role="alert"></p>';
 document.querySelector('.console').append(dialog);
 let awaitingEmail=null,busy=false;
 const find=id=>dialog.querySelector('#'+id);let launchers=[];
 window.refreshCollectionButtons=()=>{launchers=launchers.filter(b=>b.isConnected);for(const parent of [document.querySelector('.header-right'),document.querySelector('.intro')]){if(!parent||parent.querySelector('.collection-open'))continue;const button=document.createElement('button');button.type='button';button.className='collection-open';button.textContent='CRYSTAL SAVE';button.setAttribute('aria-label','Manage crystal cloud save');button.onclick=()=>{if(state==='playing')pause();dialog.showModal();draw();};parent.append(button);launchers.push(button);}draw();};
 function draw(){
  const s=sync.status(),signed=!!originStore.account();
  const descriptions={unconfigured:'Device save active. Cloud saving has not been connected yet.',guest:'Playing as a guest. Sign in to back up your collection.',pending:'Saved locally · waiting to sync.',syncing:'Syncing your crystal collection…',synced:'Your collection is synced across your signed-in devices.','signin-required':'Sign in again to sync. Your local collection is safe.'};
  find('collectionStatus').textContent=s.message||descriptions[s.phase];find('collectionStorage').textContent=originStore.snapshot().count+' crystals collected · '+(s.localDurable?'saved on this device':'device storage unavailable — keep this session open');
  find('collectionEmailLabel').textContent=s.email||'';
  find('collectionEmailForm').hidden=!s.configured||!!awaitingEmail||(signed&&s.phase!=='signin-required');
  find('collectionCodeForm').hidden=!s.configured||!awaitingEmail;
  find('collectionSignedIn').hidden=!signed;
  find('collectionImport').parentElement.hidden=signed;
  for(const button of dialog.querySelectorAll('button:not(.collection-close)'))button.disabled=busy;
  for(const b of launchers)b.textContent=s.phase==='synced'?'CRYSTALS SYNCED':signed?'CRYSTAL SAVE · '+(s.phase==='syncing'?'SYNCING':'PENDING'):'CRYSTAL SAVE';
 }
 async function action(work){if(busy)return;busy=true;find('collectionError').textContent='';draw();try{await work();}catch(error){find('collectionError').textContent=error.message||'Unable to connect. Your local crystals are safe.';}finally{busy=false;draw();}}
 find('collectionEmailForm').onsubmit=e=>{e.preventDefault();void action(async()=>{awaitingEmail=await sync.sendCode(find('collectionEmail').value);draw();find('collectionCode').focus();});};
 find('collectionCodeForm').onsubmit=e=>{e.preventDefault();void action(async()=>{await sync.verifyCode(awaitingEmail,find('collectionCode').value,{importGuest:find('collectionImport').checked});awaitingEmail=null;find('collectionCode').value='';updateOriginPresentation();});};
 find('collectionRestart').onclick=()=>{awaitingEmail=null;find('collectionCode').value='';draw();find('collectionEmail').focus();};
 find('collectionSyncNow').onclick=()=>void action(()=>sync.sync());
 find('collectionSignOut').onclick=()=>void action(async()=>{await sync.signOut();awaitingEmail=null;updateOriginPresentation();});
 // Typing a code/email must not trigger game hotkeys, scrolling or ship flips.
 for(const type of ['keydown','keyup','pointerdown','pointermove','pointerup'])dialog.addEventListener(type,e=>e.stopPropagation());
 sync.subscribe(()=>{draw();updateOriginPresentation();});window.refreshCollectionButtons();void sync.start();
 window.addEventListener('online',()=>void sync.sync());document.addEventListener('visibilitychange',()=>{if(!document.hidden)void sync.sync();});
 window.addEventListener('storage',e=>void sync.storageChanged(e.key));
}
