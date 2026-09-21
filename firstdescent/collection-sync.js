'use strict';
// Small REST adapter: no cloud SDK on the rendering path. Auth and collection
// requests are independent of frames; the local collection is the durable queue.
window.FirstDescentCloud={create(options){
 const {store,storage,config={},fetch:send=globalThis.fetch,now=Date.now,
  later=setTimeout,cancel=clearTimeout,online=()=>globalThis.navigator?.onLine!==false,
  visible=()=>!globalThis.document?.hidden,locks=globalThis.navigator?.locks}=options;
 let url='';try{const u=new URL(config.url);if(u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/')url=u.origin;}catch{}
 const configured=!!(url&&/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey||''));
 const sessionKey='first-descent-session-v1:'+url,sessionStorage=options.sessionStorage||storage;
 let session=null,epoch=0,inflight=null,timer=null,failures=0,disposed=false,authBusy=false;
 let info={configured,phase:configured?'guest':'unconfigured',email:null,lastSync:null,message:''};
 const listeners=new Set(),emit=patch=>{info={...info,...patch};for(const fn of listeners)fn({...info})};
 const valid=s=>s&&typeof s.access_token==='string'&&typeof s.refresh_token==='string'&&Number.isFinite(s.expires_at)&&/^[a-zA-Z0-9-]{1,128}$/.test(s.user?.id||'');
 const normalize=s=>({access_token:s?.access_token,refresh_token:s?.refresh_token,user:{id:s?.user?.id,email:s?.user?.email},expires_at:s?.expires_at||Math.floor(now()/1000)+(s?.expires_in||3600)});
 const current=e=>!disposed&&e===epoch;
 async function readSession(){try{const s=JSON.parse(await sessionStorage?.getItem(sessionKey)||'null');return valid(s)?s:null;}catch{return null;}}
 async function saveSession(s){try{if(!sessionStorage)throw Error();await sessionStorage.setItem(sessionKey,JSON.stringify(s));return true;}catch{emit({message:'Sign-in lasts for this session. Device storage is unavailable.'});return false;}}
 function clearTimer(){if(timer!==null)cancel(timer);timer=null;}
 function schedule(delay=750){clearTimer();if(!configured||!session||disposed||!online()||!visible())return;timer=later(()=>{timer=null;void sync();},delay);}
 async function request(path,body,token){
  const controller=new AbortController(),timeout=later(()=>controller.abort(),12000);
  try{const response=await send(url+path,{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:controller.signal,credentials:'omit',cache:'no-store'});
   const data=await response.json().catch(()=>null);if(!response.ok){const error=Error(response.status===429?'Too many attempts. Please wait before trying again.':response.status===401||response.status===403?'Please sign in again.':'The cloud service could not complete this request.');error.status=response.status;throw error;}return data;
  }finally{cancel(timeout);}
 }
 async function refresh(e,force=false){
  const action=async()=>{
   if(!current(e)||!session)return;
   const saved=await readSession();if(!current(e))return;
   // Another tab may already have rotated the refresh token. Never adopt a
   // different player's credentials into this player's in-flight sync.
   if(saved&&saved.user.id===session.user.id&&saved.refresh_token!==session.refresh_token)session=saved;
   if(!force&&session.expires_at>now()/1000+60)return;
   const userId=session.user.id,result=normalize(await request('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token}));
   if(!current(e))return;if(!valid(result)||result.user.id!==userId)throw Error('Sign-in could not be renewed.');
   session=result;await saveSession(session);
  };
  if(locks?.request)return locks.request(sessionKey,action);return action();
 }
 function failed(error,e){if(!current(e))return;const auth=[400,401,403].includes(error.status);emit({phase:auth?'signin-required':'pending',message:auth?'Sign in again to sync. Your crystals remain saved on this device.':'Waiting to sync. Your crystals remain on this device.'});if(!auth)schedule(Math.min(300000,2000*2**Math.min(failures++,7)));}
 function sync(){
  if(inflight)return inflight;if(!configured||!session||disposed)return Promise.resolve();
  if(!online()||!visible()){emit({phase:'pending',message:'Crystals will sync when you are back online.'});return Promise.resolve();}
  clearTimer();const e=epoch;
  inflight=(async()=>{try{
   emit({phase:'syncing',message:''});await refresh(e);if(!current(e))return;
   const owner=session.user.id;if(store.account()!==owner)return;
   let result;
   try{result=await request('/rest/v1/rpc/fd_merge_crystals',{p_mission:store.missionId,p_fragments:store.exportFragments()},session.access_token);}
   catch(error){if(error.status!==401)throw error;await refresh(e,true);if(!current(e))return;result=await request('/rest/v1/rpc/fd_merge_crystals',{p_mission:store.missionId,p_fragments:store.exportFragments()},session.access_token);}
   if(!current(e)||store.account()!==owner)return;
   if(result?.missionId!==store.missionId||!Array.isArray(result.fragments)||result.fragments.some(id=>typeof id!=='string'))throw Error('Invalid collection response');
   store.merge(result.fragments);failures=0;
   // A boss can be defeated while the upload is in flight. Its local save is
   // never overwritten, and a follow-up sends anything absent from the reply.
   const saved=new Set(result.fragments),pending=store.exportFragments().some(id=>!saved.has(id));
   emit({phase:pending?'pending':'synced',lastSync:now(),message:''});if(pending)schedule();
  }catch(error){failed(error,e);}finally{inflight=null;}})();return inflight;
 }
 async function start(){if(!configured)return;const e=epoch,s=await readSession();if(!current(e))return;if(s){session=s;store.useAccount(s.user.id);emit({email:s.user.email||null,phase:'pending'});await sync();}}
 async function sendCode(email){
  if(!configured)throw Error('Cloud saving is not connected yet.');
  email=email.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw Error('Enter a valid email address.');
  if(authBusy)throw Error('Please wait for the current sign-in request.');authBusy=true;
  try{await request('/auth/v1/otp',{email,create_user:true});return email;}finally{authBusy=false;}
 }
 async function verifyCode(email,token,{importGuest=true}={}){
  if(!configured||authBusy)throw Error('Sign-in is unavailable.');if(!/^\d{6,10}$/.test(token))throw Error('Enter the code from your email.');
  const e=++epoch;clearTimer();authBusy=true;
  try{const result=normalize(await request('/auth/v1/verify',{email:email.trim().toLowerCase(),token,type:'email'}));if(!current(e))return;
   if(!valid(result))throw Error('Invalid sign-in response');
   session=result;store.useAccount(result.user.id,{importGuest});await saveSession(result);emit({email:result.user.email||email,phase:'pending',lastSync:null});
  }finally{authBusy=false;}
  // Let any stale operation finish before starting this account's upload.
  if(inflight)await inflight;if(current(e))await sync();
 }
 async function signOut(){
  if(store.snapshot().count&&!store.snapshot().durable&&info.phase!=='synced')throw Error('Device storage is unavailable. Sync your crystals before signing out.');
  const old=session;++epoch;clearTimer();session=null;
  // A null tombstone works with browser and native storage adapters alike.
  const cleared=await saveSession(null);store.useAccount(null);emit({email:null,phase:'guest',lastSync:null,message:cleared?'':'Signed out for this session. This browser could not clear the saved sign-in.'});
  if(old&&online())try{await request('/auth/v1/logout?scope=local',{},old.access_token);}catch{ /* Local logout is immediate even offline. */ }
 }
 async function storageChanged(key){
  if(key===sessionKey){const s=await readSession();if(s?.user.id===session?.user.id){if(s)session=s;return;}
   ++epoch;clearTimer();session=s;store.useAccount(s?.user.id||null);emit({email:s?.user.email||null,phase:s?'pending':'guest',lastSync:null});if(inflight)await inflight;if(s)await sync();
  }else if(key?.startsWith('first-descent-mission-')){store.merge([]);schedule();}
 }
 const unsubscribe=store.subscribe(()=>{if(session){emit({phase:'pending'});schedule();}});
 return{start,sync,sendCode,verifyCode,signOut,storageChanged,sessionKey,
  status:()=>({...info,localDurable:store.snapshot().durable}),subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},
  dispose(){disposed=true;++epoch;clearTimer();unsubscribe();listeners.clear();}};
}};
