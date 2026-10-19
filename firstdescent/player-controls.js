'use strict';
window.flightControls=(()=>{
 const storageKey='first-descent-controls-v1';
 const defaults={up:['KeyW','ArrowUp'],down:['KeyS','ArrowDown'],left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight'],flip:['Space',null],nova:['KeyX',null],pause:['KeyP',null]};
 const labels={up:'Move up',down:'Move down',left:'Move left',right:'Move right',flip:'Flip ship',nova:'Nova',pause:'Pause'};
 const canonical={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',flip:' ',nova:'x',pause:'p'};
 const copy=value=>Object.fromEntries(Object.entries(value).map(([k,v])=>[k,[...v]]));
 const allowed=code=>typeof code==='string'&&/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|BracketLeft|BracketRight|Minus|Equal|Semicolon|Quote|Backslash|Comma|Period|Slash|Backquote)$/.test(code);
 let bindings=copy(defaults),saved=true;const held=new Set();
 try{
  const data=JSON.parse(window.localStorage?.getItem(storageKey)||'null'),used=new Set();
  if(data&&Object.keys(defaults).every(action=>Array.isArray(data[action])&&data[action].length===2&&allowed(data[action][0])&&data[action].every(code=>code===null||allowed(code)&&!used.has(code)&&!!used.add(code))))bindings=Object.fromEntries(Object.keys(defaults).map(action=>[action,[...data[action]]]));
 }catch{ /* An invalid map falls back to fully usable defaults. */ }
 function save(){try{if(!window.localStorage)throw Error('Storage unavailable');window.localStorage.setItem(storageKey,JSON.stringify(bindings));saved=true;}catch{saved=false;}}
 function bind(action,slot,code){
  if(!Object.hasOwn(defaults,action)||![0,1].includes(slot)||!(allowed(code)||slot===1&&code===null))return {ok:false,message:'Use a letter, number, arrow, Space or punctuation key. Escape, Enter and Tab stay available for menus.'};
  for(const [other,slots] of Object.entries(bindings))for(let i=0;i<2;i++)if(code&&slots[i]===code&&(other!==action||i!==slot))return {ok:false,message:'Already used for '+labels[other].toLowerCase()+'. Choose another key.'};
  bindings[action][slot]=code;held.clear();save();return {ok:true};
 }
 function reset(){bindings=copy(defaults);held.clear();save();}
 function codeFor(event){
  if(event.code)return event.code;
  const key=event.key||'';if(/^[a-z]$/i.test(key))return 'Key'+key.toUpperCase();if(/^\d$/.test(key))return 'Digit'+key;
  return key===' '?'Space':key;
 }
 function actionFor(event){const code=codeFor(event);if(code==='Escape')return 'pause';return Object.keys(bindings).find(action=>bindings[action].includes(code))||null;}
 function down(event){const action=actionFor(event);if(action)held.add(codeFor(event));return action;}
 function up(event){const action=actionFor(event);held.delete(codeFor(event));return action;}
 function isHeld(action){return action==='pause'&&held.has('Escape')||bindings[action]?.some(code=>held.has(code))||false;}
 function keyLabel(code){return ({Space:'Space',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',BracketLeft:'[',BracketRight:']',Minus:'−',Equal:'=',Semicolon:';',Quote:"'",Backslash:'\\',Comma:',',Period:'.',Slash:'/',Backquote:'`'})[code]||code?.replace(/^(Key|Digit)/,'')||'—';}
 function hint(action){
  if(lastInput==='controller')return {flip:'Bottom button',travel:'Bottom button',nova:'Left face button',pause:'Menu button'}[action]||'Stick / D-pad';
  if(lastInput==='touch')return {flip:'Double tap',travel:'Tap',nova:'Nova button',pause:'Pinch'}[action]||'Drag';
  return keyLabel(bindings[action==='travel'?'flip':action]?.[0]);
 }

 let padId=null,armed=false,previous={},repeatAt={},lastInput='keyboard';
 const movement={x:0,y:0};let padStatus='none';
 const empty=(disconnected=false)=>({x:0,y:0,pressed:{},disconnected,connected:padId!==null});
 function resetPad(){armed=false;previous={};repeatAt={};movement.x=movement.y=0;}
 function poll(pads,now=0,active=true){
  const list=Array.from(pads||[]).filter(p=>p&&p.connected!==false),identity=p=>p.index+':'+p.id;
  const current=list.find(p=>identity(p)===padId&&p.mapping==='standard');
  const lost=padId!==null&&!current;
  const pad=current||list.find(p=>p.mapping==='standard');
  if(!pad){padId=null;padStatus=list.length?'unmapped':'none';resetPad();return empty(lost);}
  const id=identity(pad);if(id!==padId){padId=id;resetPad();}
  padStatus='standard';if(!active){resetPad();return empty(lost);}
  const button=i=>pad.buttons?.[i]?.pressed===true||(pad.buttons?.[i]?.value||0)>.5;
  let x=Number.isFinite(pad.axes?.[0])?Math.max(-1,Math.min(1,pad.axes[0])):0,y=Number.isFinite(pad.axes?.[1])?Math.max(-1,Math.min(1,pad.axes[1])):0;
  const radius=Math.hypot(x,y),dead=.2,scale=radius>dead?(Math.min(1,radius)-dead)/(1-dead)/radius:0;x*=scale;y*=scale;
  const dpadX=Number(button(15))-Number(button(14)),dpadY=Number(button(13))-Number(button(12));if(dpadX||dpadY){x=dpadX;y=dpadY;const n=Math.max(1,Math.hypot(x,y));x/=n;y/=n;}
  const values={confirm:button(0),flip:button(0)||button(4),nova:button(2),pause:button(9),back:button(1),up:button(12)||y<-.55,down:button(13)||y>.55,left:button(14)||x<-.55,right:button(15)||x>.55};
  if(!armed){if(Math.hypot(x,y)<.05&&!Object.values(values).some(Boolean))armed=true;return empty(lost);}
  const pressed={};for(const [name,on] of Object.entries(values)){
   if(on&&!previous[name]){pressed[name]=true;repeatAt[name]=now+360;}
   else if(on&&['up','down','left','right'].includes(name)&&now>=repeatAt[name]){pressed[name]=true;repeatAt[name]=now+140;}
  }
  previous=values;movement.x=x;movement.y=y;if(x||y||Object.values(pressed).some(Boolean))lastInput='controller';
  return {x,y,pressed,disconnected:lost,connected:true};
 }
 return {bindings:()=>copy(bindings),labels,canonical,bind,reset,codeFor,keyLabel,hint,actionFor,down,up,isHeld,clearKeyboard:()=>held.clear(),storageAvailable:()=>saved,poll,resetPad,movement:()=>movement,status:()=>padStatus,lastInput:()=>lastInput,useKeyboard(){lastInput='keyboard';},useTouch(){lastInput='touch';}};
})();
