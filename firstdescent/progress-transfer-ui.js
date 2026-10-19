'use strict';
window.FirstDescentProgressUI={mount(dialog,{transfer,changed,sync}){
 const section=document.createElement('details');section.className='progress-transfer';
 section.innerHTML='<summary>Back up or move your progress</summary><p>Keep a copy of completed missions, discoveries and the recovery kit. Import adds to your current progress. Campaign checkpoints and settings are not included in backups.</p><div class="progress-file-actions"><button type="button" data-export>EXPORT BACKUP</button><button type="button" data-choose>CHOOSE BACKUP</button></div><input type="file" accept="application/json,.json" data-file hidden><div data-preview hidden><p data-summary></p><button type="button" data-apply>ADD THIS PROGRESS</button><button type="button" data-cancel>CANCEL</button></div><p data-message role="status" aria-live="polite"></p>';
 dialog.append(section);
 const find=name=>section.querySelector('[data-'+name+']'),native=window.flightProgressFiles;let pending=null,busy=false,generation=0,focusAfter=null;
 function discard(){if(pending)transfer.cancel(pending);pending=null;find('preview').hidden=true;}
 function message(text){find('message').textContent=text;}
 async function action(task){if(busy)return;busy=true;for(const b of section.querySelectorAll('button'))b.disabled=true;try{await task();}catch(error){message(error.message||'The operation could not be completed. Keep your backup and try again.');}finally{busy=false;for(const b of section.querySelectorAll('button'))b.disabled=false;if(focusAfter&&dialog.open)focusAfter.focus();focusAfter=null;}}
 function preview(text){discard();pending=transfer.preview(text);find('summary').textContent=`${pending.missions}/6 missions · ${pending.discoveries} discoveries. Adds ${pending.newMissions} missions and ${pending.newDiscoveries} discoveries${pending.recoveryKit?' plus the recovery kit':''}. `+(pending.signedIn?'Adds to the signed-in player and will sync when available.':'Existing progress stays intact.');find('preview').hidden=false;message('Review the backup, then choose Add this progress.');focusAfter=find('apply');}
 find('export').onclick=()=>action(async()=>{
  const text=transfer.exportJSON();
  if(native){const result=await native.save(text);message(result.cancelled?'Export cancelled.':'Backup saved. Keep it somewhere safe.');return;}
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='First Descent progress.json';section.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);message('Backup download requested. Check your browser’s downloads.');
 });
 find('choose').onclick=()=>{
  if(busy)return;discard();message('');const current=++generation;
  if(native)void action(async()=>{const result=await native.open();if(current!==generation)return;if(result.cancelled){message('Import cancelled.');return;}preview(result.text);});
  else {find('file').value='';find('file').click();message('Choose a JSON backup using your browser’s file picker.');}
 };
 find('file').onchange=()=>action(async()=>{const file=find('file').files?.[0],current=generation;if(!file)return;if(file.size>window.FirstDescentProgressTransfer.maxBytes)throw Error('This file is too large to be a progress backup.');const text=await file.text();if(current===generation)preview(text);});
 find('apply').onclick=()=>action(async()=>{const recovery=pending?.recoveryKit;let result;try{result=transfer.apply(pending);}finally{discard();}changed();message(result.durable?`Progress saved. Added ${result.missions} missions and ${result.discoveries} discoveries.${recovery?' Recovery kit restored.':''}`:'Progress added for this session, but could not all be saved. Keep your backup and try again when device storage is available.');void sync();});
 find('cancel').onclick=()=>{if(busy)return;discard();message('Import cancelled. Your progress is unchanged.');find('choose').focus();};
 dialog.addEventListener('close',()=>{generation++;discard();message('');});
 return {discard};
}};
