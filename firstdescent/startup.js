'use strict';
// Keep the static menu visible, but never offer inactive launch buttons.
(() => {
 const main=document.querySelector('main'),panel=document.getElementById('startupStatus');
 const title=panel.querySelector('strong'),message=panel.querySelector('p'),retry=panel.querySelector('a');
 const rendererURL=new URL('renderer3d.js'+new URL(document.currentScript.src).search,document.currentScript.src).href;
 let status='loading';window.flightStartupPending=true;
 main.inert=true;main.setAttribute('aria-busy','true');panel.hidden=false;
 retry.hidden=true;
 retry.onclick=event=>{event.preventDefault();location.reload();};
 const slow=setTimeout(()=>{
  if(status!=='loading')return;
  message.textContent='Still preparing the game. You can wait, or retry if the connection was interrupted.';
  retry.hidden=false;
 },12000);
 function stopListening(){clearTimeout(slow);window.removeEventListener('error',onError,true);window.removeEventListener('game-render-error',onRenderError);}
 function fail(error){
  if(status!=='loading')return;
  status='failed';stopListening();
  console.error('First Descent startup interrupted',error);
  window.flightSettingsBridge?.prepare();window.flightAudio?.setMusicActive(false);window.flightAudio?.clear();
  title.textContent='The game couldn’t start.';
  message.textContent='A required game file or graphics component could not load. Reload to try again. Reloading does not erase saved progress.';
  retry.hidden=false;retry.focus();
 }
 function onError(event){
  // Image/audio failures have their own fallbacks. A script execution failure
  // cannot be treated as a successful load merely because its load event fires.
  if(event.target===window||event.target?.tagName==='SCRIPT')fail(event.error||new Error(event.message||('A required script could not load: '+(event.target?.src||'unknown script'))));
 }
 function onRenderError(event){fail(event.detail);}
 window.addEventListener('error',onError,true);window.addEventListener('game-render-error',onRenderError);
 if(document.documentElement?.getAttribute?.('data-flight-edition')==='demo'&&!window.flightDemo){fail(new Error('The demo configuration could not load.'));return;}
 import(rendererURL).then(()=>{
  if(status!=='loading')return;
  status='ready';window.flightStartupPending=false;stopListening();main.inert=false;main.removeAttribute('aria-busy');panel.hidden=true;
  if(document.activeElement===retry)document.getElementById('launch')?.focus();
 },fail);
})();
