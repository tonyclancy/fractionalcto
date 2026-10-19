'use strict';
window.flightControlsUI=(()=>{
 const controls=window.flightControls,dialog=document.querySelector('#flightSettingsDialog');if(!controls||!dialog)return null;
 const section=document.createElement('details');section.className='control-options';
 section.innerHTML=`<summary>Keyboard &amp; controller</summary><p>Choose a key to change it. Escape cancels. Backspace clears an alternate key.</p><div class="control-bindings"></div><p class="settings-note" id="bindingMessage" role="status"></p><button type="button" id="resetBindings">RESTORE DEFAULT KEYS</button><p class="controller-guide">Controller: stick or D-pad to move · bottom face button to flip · left face button for nova · Menu to pause. In menus: bottom button to select, right button to go back.</p><p class="settings-note" id="controllerStatus"></p>`;
 dialog.insertBefore(section,dialog.querySelector('#settingsPauseNote'));
 const rows=section.querySelector('.control-bindings'),message=section.querySelector('#bindingMessage');let capture=null;
 for(const [action,label] of Object.entries(controls.labels)){
  const row=document.createElement('div');row.className='control-binding';const name=document.createElement('span');name.textContent=label;row.append(name);
  for(let slot=0;slot<2;slot++){
   const button=document.createElement('button');button.type='button';button.dataset.action=action;button.dataset.slot=slot;button.setAttribute('aria-label',label+(slot?' alternate key':' key'));
   button.onclick=()=>{capture={action,slot,button};refresh();message.textContent='Press a key for '+label.toLowerCase()+'.';};row.append(button);
  }
  rows.append(row);
 }
 function refresh(){
  const map=controls.bindings();for(const button of rows.querySelectorAll('button')){const active=capture?.button===button;button.textContent=active?'Press key…':controls.keyLabel(map[button.dataset.action][Number(button.dataset.slot)]);button.setAttribute('aria-pressed',String(active));}
  section.querySelector('#controllerStatus').textContent=controls.status()==='standard'?'Controller connected.':controls.status()==='unmapped'?'This controller has no standard browser mapping. Use keyboard or touch.':'Connect a controller and press a button to detect it.';
 }
 function cancelCapture(){if(!capture)return false;capture=null;message.textContent='Key change cancelled.';refresh();return true;}
 dialog.addEventListener('keydown',event=>{
  if(!capture)return;event.preventDefault();event.stopPropagation();if(event.repeat)return;
  if(event.key==='Escape'){cancelCapture();return;}
  if(event.ctrlKey||event.metaKey||event.altKey){message.textContent='Choose a key without Command, Control or Alt.';return;}
  const result=controls.bind(capture.action,capture.slot,event.key==='Backspace'&&capture.slot===1?null:controls.codeFor(event));
  if(!result.ok){message.textContent=result.message;return;}
  capture=null;message.textContent=controls.storageAvailable()?'Key saved.':'Key works now, but could not be saved on this device.';window.flightSettingsBridge.clearInput();refresh();refreshHints();
 });
 dialog.addEventListener('close',()=>{capture=null;refresh();});
 section.querySelector('#resetBindings').onclick=()=>{capture=null;controls.reset();window.flightSettingsBridge.clearInput();message.textContent=controls.storageAvailable()?'Default keys restored.':'Default keys restored for this session.';refresh();refreshHints();};
 section.addEventListener('toggle',refresh);
 function refreshHints(){
  const map=controls.bindings(),hint=document.querySelector('footer .controls');
  if(hint)hint.textContent=controls.lastInput()==='controller'?'STICK / D-PAD MOVE · BOTTOM BUTTON FLIP · LEFT BUTTON NOVA · MENU PAUSE':[['up','down','left','right'].map(a=>controls.keyLabel(map[a][0])).join(' / ')+' MOVE',controls.keyLabel(map.flip[0])+' FLIP',controls.keyLabel(map.nova[0])+' NOVA',controls.keyLabel(map.pause[0])+' / Esc PAUSE'].join('   ·   ');
  document.querySelector('#game')?.setAttribute('aria-label','Space shooter play area. '+Object.entries(controls.labels).map(([a,label])=>label+': '+map[a].filter(Boolean).map(controls.keyLabel).join(' or ')).join('. ')+'. Escape pauses. Weapons fire automatically.');
 }
 refresh();refreshHints();return {cancelCapture,refresh,refreshHints,isCapturing:()=>!!capture};
})();
