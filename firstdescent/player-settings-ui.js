'use strict';
window.flightSettingsUI=(()=>{
 if(!window.flightSettings||!window.flightSettingsBridge)return null;
 const bridge=window.flightSettingsBridge,dialog=document.createElement('dialog');
 dialog.className='flight-settings';dialog.id='flightSettingsDialog';dialog.setAttribute('aria-labelledby','settingsHeading');
 dialog.innerHTML=`<h2 id="settingsHeading">Make yourself comfortable</h2>
 <p>Sound and screen effects, set your way.</p>
 <fieldset><legend>SOUND</legend>
 <div class="setting-row"><label for="settingsMusicEnabled">Music</label><input id="settingsMusicEnabled" type="checkbox"></div>
 <div class="setting-row"><label for="settingsMusicVolume">Music volume</label><output for="settingsMusicVolume" id="settingsMusicValue"></output><input id="settingsMusicVolume" type="range" min="0" max="100" step="5"></div>
 <div class="setting-row"><label for="settingsEffectsEnabled">Sound effects</label><input id="settingsEffectsEnabled" type="checkbox"></div>
 <div class="setting-row"><label for="settingsEffectsVolume">Effects volume</label><output for="settingsEffectsVolume" id="settingsEffectsValue"></output><input id="settingsEffectsVolume" type="range" min="0" max="100" step="5"></div>
 </fieldset><fieldset><legend>SCREEN COMFORT</legend>
 <div class="setting-row"><label for="settingsShake">Screen shake</label><output for="settingsShake" id="settingsShakeValue"></output><input id="settingsShake" type="range" min="0" max="100" step="25"></div>
 <div class="setting-row"><label for="settingsFlashes">Reduce screen & body flashes</label><input id="settingsFlashes" type="checkbox"></div>
 </fieldset><p class="settings-note" id="settingsPauseNote"></p><p class="settings-note settings-storage" id="settingsStorageNote" role="status" hidden>Settings work now, but this browser could not save them.</p><button id="settingsDone" type="button">DONE</button>`;
 (document.querySelector('.console')||document.body).append(dialog);
 const find=id=>dialog.querySelector('#'+id);
 function sync(){
  const prefs=window.flightSettings.snapshot(),audio=window.flightAudio?.status();
  for(const [id,name,output] of [['settingsMusicVolume','musicVolume','settingsMusicValue'],['settingsEffectsVolume','effectsVolume','settingsEffectsValue'],['settingsShake','shake','settingsShakeValue']]){
   const value=Math.round(prefs[name]*100);find(id).value=value;find(output).textContent=value+'%';
  }
  find('settingsMusicEnabled').checked=audio?.musicEnabled!==false;
  find('settingsEffectsEnabled').checked=prefs.effectsEnabled;
  find('settingsFlashes').checked=prefs.reduceFlashes;
  find('settingsStorageNote').hidden=window.flightSettings.storageAvailable();
 }
 function changed(patch){window.flightSettings.update(patch);bridge.apply();sync();}
 for(const [id,key] of [['settingsMusicVolume','musicVolume'],['settingsEffectsVolume','effectsVolume'],['settingsShake','shake']])find(id).addEventListener('input',event=>changed({[key]:Number(event.target.value)/100}));
 find('settingsFlashes').addEventListener('change',event=>changed({reduceFlashes:event.target.checked}));
 find('settingsEffectsEnabled').addEventListener('change',event=>changed({effectsEnabled:event.target.checked}));
 find('settingsMusicEnabled').addEventListener('change',event=>{bridge.music(event.target.checked);sync();});
 let returnFocus=null;
 function open(){
  if(dialog.open)return;
  bridge.prepare();returnFocus=document.activeElement;sync();window.flightControlsUI?.refresh();
  find('settingsPauseNote').textContent=bridge.isPaused()?'Your mission stays paused until you choose Resume.':'Settings are saved on this device.';
  dialog.showModal();find('settingsDone').focus();
 }
 function close(){dialog.close();}
 find('settingsDone').addEventListener('click',close);
 dialog.addEventListener('keydown',event=>event.stopPropagation());
 dialog.addEventListener('keyup',event=>event.stopPropagation());
 dialog.addEventListener('close',()=>{bridge.clearInput();if(returnFocus?.isConnected)returnFocus.focus();});
 let button=document.querySelector('#settings');
 if(!button){const header=document.querySelector('.header-right');if(header){button=document.createElement('button');button.id='settings';button.textContent='SETTINGS';header.append(button);}}
 if(button)button.onclick=open;
 return {open,isOpen:()=>dialog.open};
})();
