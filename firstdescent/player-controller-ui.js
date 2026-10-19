'use strict';
// Standard Gamepad layout; keep device sampling separate from game/menu actions.
window.pollFlightController=(()=>{
 let previousStatus='',previousInput='';
 function visible(element){return !element.disabled&&!element.hidden&&element.getClientRects().length>0&&getComputedStyle(element).visibility!=='hidden';}
 function menu(event){
  const dialog=document.querySelector('dialog[open]');
  if(window.flightControlsUI?.isCapturing()){if(event.back)window.flightControlsUI.cancelCapture();return;}
  if(event.back||event.pause){
   if(dialog){dialog.close();return;}
   if(state==='paused'){pause();window.flightControls.resetPad();return;}
   const back=['#storyBack','#atlasBack','#prologueBack','#demoMenu'].map(selector=>document.querySelector(selector)).find(element=>element&&visible(element));
   if(back){back.click();return;}
   if(state==='title'&&(atlasOpen||campaignBriefVisible()||campaignPrologueVisible())){showTitleScreen();return;}
  }
  const root=dialog||document,items=Array.from(root.querySelectorAll('button,a[href],input,select,summary')).filter(visible);
  if(!items.length)return;
  let focus=document.activeElement,index=items.indexOf(focus);
  if(index<0){focus=items.find(element=>element.matches('.primary'))||items[0];index=items.indexOf(focus);focus.focus();}
  const horizontal=Number(!!event.right)-Number(!!event.left);
  if(horizontal&&focus.matches('input[type="range"]')){
   const step=Number(focus.step)||1,value=Math.max(Number(focus.min),Math.min(Number(focus.max),Number(focus.value)+horizontal*step));
   focus.value=value;focus.dispatchEvent(new Event('input',{bubbles:true}));
  }else{
   const direction=Number(!!event.down)-Number(!!event.up)||horizontal;
   if(direction){focus=items[(index+direction+items.length)%items.length];focus.focus();focus.scrollIntoView({block:'nearest',inline:'nearest'});}
  }
  if(event.confirm){focus.click();window.flightControls.resetPad();}
 }
 return function pollFlightController(now){
  const controls=window.flightControls;if(!controls)return;
  let pads=[];try{pads=window.flightNativeInput?window.flightNativeInput.sample(now):window.navigator?.getGamepads?.()||[];}catch{ /* Browser policy or unsupported host; keyboard/touch remain available. */ }
  const input=controls.poll(pads,now,window.flightNativeInput?.active()!==false&&!document.hidden&&(document.hasFocus?.()??true));
  if(input.disconnected&&state==='playing'&&controls.lastInput()==='controller'){
   pause();const note=document.createElement('p');note.className='launch-caption';note.textContent='Controller disconnected. Reconnect it or resume with keyboard or touch.';$('#overlay').append(note);
  }
  if(controls.status()!==previousStatus){previousStatus=controls.status();window.flightControlsUI?.refresh();}
  if(controls.lastInput()!==previousInput){previousInput=controls.lastInput();window.flightControlsUI?.refreshHints();}
  if(window.flightNativeInput?.active()===false||!input.connected||document.hidden||document.hasFocus?.()===false)return;
  const pressed=input.pressed;
  if(state==='playing'&&!document.querySelector('dialog[open]')){
   if(input.x||input.y)pointer=null;
   if(pressed.pause){pause();controls.resetPad();return;}
   if(pressed.flip){if(!skipSectorTravel())flipShip();}
   if(pressed.nova)nova();
  }else if(Object.values(pressed).some(Boolean))menu(pressed);
 };
})();
