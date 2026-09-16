'use strict';
// Landscape viewport/scroll technique inspired by Playgama/hide-mobile-safari-tabs.
// The game remains in this document: no iframe reload and no third-party runtime.
window.safariImmersion=(()=>{
 const root=document.documentElement,panel=document.querySelector('.console');
 let active=false,locked=false,pending=null,raf=0,settle=0,holder,scroller,content,prompt,spacer,anchor,originalScroll=0;
 const standalone=()=>window.navigator.standalone||matchMedia('(display-mode: standalone)').matches;
 const eligible=()=>/iPhone|iPod/.test(window.navigator.userAgent)&&!standalone()&&!!window.visualViewport&&!(document.fullscreenEnabled||document.webkitFullscreenEnabled);
 const landscape=()=>window.innerWidth>window.innerHeight;
 function build(){
  if(holder)return;
  anchor=document.createComment('flight-console-home');panel.before(anchor);
  holder=document.createElement('div');holder.className='safari-holder';
  scroller=document.createElement('div');scroller.className='safari-scroller';
  content=document.createElement('div');content.className='safari-content';
  const track=document.createElement('div');track.className='safari-track';track.append(content);scroller.append(track);holder.append(scroller);
  spacer=document.createElement('div');spacer.className='safari-spacer';spacer.setAttribute('aria-hidden','true');
  prompt=document.createElement('div');prompt.className='safari-swipe';prompt.setAttribute('role','dialog');prompt.setAttribute('aria-label','Expand iPhone game');
  prompt.innerHTML='<div class="safari-swipe-card"><strong>MORE ROOM TO FLY</strong><p id="safariSwipeText">Swipe up here to hide Safari’s bars.</p><span>Your ship stays still during setup.</span><button type="button">PLAY WITH BROWSER BARS</button></div>';
  prompt.querySelector('button').onclick=()=>{const action=pending;pending=null;release();panel.classList.add('expanded');document.body.classList.add('game-expanded');window.flightImmersionChanged?.();action?.();};
  // Native document scrolling must receive the setup swipe; game listeners must not.
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])prompt.addEventListener(type,e=>e.stopPropagation());
  document.body.append(holder,spacer,prompt);
 }
 function complete(){const action=pending;pending=null;action?.();}
 function measure(){
  raf=0;if(!active)return;
  const viewport=window.visualViewport;
  root.style.setProperty('--safari-view-height',`${viewport.height}px`);
  const zoomed=Math.abs(viewport.scale-1)>.03;
  const collapsed=landscape()&&!zoomed&&viewport.height+viewport.offsetTop>=Math.min(screen.width,screen.height)-20;
  clearTimeout(settle);
  if(collapsed){
   // Wait for toolbar animation to settle before consuming the setup gesture.
   settle=setTimeout(()=>{if(!active)return;locked=true;root.classList.remove('safari-unlock');root.classList.add('safari-locked');content.append(panel);prompt.hidden=true;scroller.scrollTop=1;window.flightImmersionChanged?.();complete();},180);
  }else{
   if(locked){locked=false;window.flightImmersionInterrupted?.();}
   root.classList.remove('safari-locked');root.classList.add('safari-unlock');
   if(panel.parentNode!==document.body)document.body.append(panel);
   prompt.hidden=false;prompt.querySelector('p').textContent=landscape()?'Swipe up here to hide Safari’s bars.':'Rotate your iPhone to landscape, then swipe up.';
  }
 }
 function schedule(){if(active&&!raf)raf=requestAnimationFrame(measure);}
 function release(){
  active=false;locked=false;pending=null;clearTimeout(settle);if(raf)cancelAnimationFrame(raf);raf=0;
  root.classList.remove('safari-unlock','safari-locked');
  if(anchor){anchor.after(panel);prompt.hidden=true;window.scrollTo(0,originalScroll);}
 }
 function request(action){
  if(!eligible())return false;
  build();if(!active)originalScroll=window.scrollY;
  active=true;pending=action;panel.classList.add('expanded');document.body.classList.add('game-expanded');window.flightImmersionChanged?.();
  measure();return true;
 }
 for(const event of ['resize','orientationchange','scroll'])window.addEventListener(event,schedule,{passive:true});
 window.visualViewport?.addEventListener('resize',schedule,{passive:true});window.visualViewport?.addEventListener('scroll',schedule,{passive:true});
 return{request,release,eligible};
})();
