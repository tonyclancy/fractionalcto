'use strict';
window.flightCreditsUI=(()=>{
 const bridge=window.flightSettingsBridge;if(!bridge)return null;
 const dialog=document.createElement('dialog');dialog.className='flight-credits';dialog.setAttribute('aria-labelledby','creditsHeading');
 const heading=document.createElement('h2');heading.id='creditsHeading';heading.textContent='Credits';
 const close=document.createElement('button');close.type='button';close.className='credits-close';close.textContent='BACK TO GAME';
 const body=document.createElement('div');body.className='credits-content';
 dialog.append(heading,close,body);(document.querySelector('.console')||document.body).append(dialog);
 let returnFocus=null,loaded=false,pending=false;
 function node(tag,text,parent=body){const el=document.createElement(tag);el.textContent=text;parent.append(el);return el;}
 function link(label,url,parent){const parsed=new URL(url,location.href);if(parsed.protocol!=='https:')return node('span',label,parent);const a=node('a',label,parent);a.href=parsed.href;a.target='_blank';a.rel='noopener noreferrer';return a;}
 async function load(){
  if(loaded||pending)return;pending=true;body.setAttribute('aria-busy','true');body.replaceChildren();node('p','Loading the credits…');
  try{
   const response=await fetch('credits.json');if(!response.ok)throw Error('Unavailable');const data=await response.json();
   if(data.schemaVersion!==1||!Array.isArray(data.galaxies)||!Array.isArray(data.notices))throw Error('Invalid credits');
   body.replaceChildren();node('p',data.intro);node('h3','The real universe');node('p',data.adaptations);
   for(const g of data.galaxies){const item=node('section','');item.className='credits-entry';node('h4',g.name,item);link(g.reference,g.source,item);node('p',g.credit,item);if(g.license)link('CC BY 4.0',g.license,item);else node('p','Original game artwork · observation reference only',item);}
   node('h3','Software, fonts and asteroid models');
   for(const n of data.notices){const item=node('details','');node('summary',n.title,item);node('p',n.note,item);link('Source',n.source,item);node('pre',n.text,item);}
   loaded=true;
  }catch{body.replaceChildren();node('p','The credits could not be loaded. You can retry without leaving the game.');const retry=node('button','RETRY');retry.type='button';retry.onclick=load;}
  finally{pending=false;body.setAttribute('aria-busy','false');}
 }
 function open(){if(dialog.open)return;returnFocus=document.activeElement;bridge.prepare();dialog.showModal();close.focus();void load();}
 close.onclick=()=>dialog.close();
 dialog.addEventListener('keydown',event=>event.stopPropagation());dialog.addEventListener('keyup',event=>event.stopPropagation());
 dialog.addEventListener('close',()=>{bridge.clearInput();if(returnFocus?.isConnected)returnFocus.focus();});
 document.addEventListener('click',event=>{if(event.target?.closest?.('[data-flight-credits]'))open();});
 return {open,isOpen:()=>dialog.open};
})();
