// Scope-local, staged releases. No phone user data is stored or removed here.
const SCOPE=self.registration.scope;
const PREFIX='travel-planner-pwa:'+encodeURIComponent(SCOPE)+':';
const META=PREFIX+'metadata';
const BOOT=PREFIX+'v10';
const pointer=new URL('__active_release__',SCOPE).href;
async function active(){const m=await caches.open(META);const r=await m.match(pointer);return r?await r.text():BOOT;}
function validPath(path){return /^(?:index\.html|manifest\.webmanifest|sw\.js|icon\.svg|icon-192\.png|icon-512\.png|apple-touch-icon\.png|maps\/[a-f0-9]{64}\.(?:png|webp))$/.test(path);}
async function valid(response,hash){
 if(!response?.ok||!/^[a-f0-9]{64}$/.test(hash))return false;
 const digest=await crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer());
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')===hash;
}
async function pool(items,fn,limit=6){
 const ret=[];const executing=[];
 for(const item of items){
  const p=Promise.resolve().then(()=>fn(item));
  ret.push(p);
  if(limit<=items.length){
   const e=p.then(()=>executing.splice(executing.indexOf(e),1));
   executing.push(e);
   if(executing.length>=limit)await Promise.race(executing);
  }
 }
 return Promise.all(ret);
}
self.addEventListener('install',e=>e.waitUntil((async()=>{
 // Never overwrite a cache an existing worker/page is still using.
 const name=PREFIX+'install:'+crypto.randomUUID(),cache=await caches.open(name);
 try{
  const response=await fetch(new URL('publish.json',SCOPE),{cache:'no-store'});
  if(response.ok){
   const manifest=await response.json();
   if(!manifest.files?.['index.html'])throw Error('Invalid release');
   const previous=await caches.open(await active());
   await pool(Object.entries(manifest.files),async([path,hash])=>{
    if(!validPath(path))throw Error('Invalid asset');
    const url=new URL(path,SCOPE).href;let r=await previous.match(url);
    if(!await valid(r,hash))r=await fetch(url,{cache:'no-store'});
    if(!await valid(r,hash))throw Error('Incomplete release');
    await cache.put(url,r);
   });
  }else{
   // Compatibility package API has no publish marker. Read its actual map URLs.
   await pool(['index.html','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png'],async path=>{
    const url=new URL(path,SCOPE).href,r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Missing asset');await cache.put(url,r);
   });
   const html=await (await cache.match(new URL('index.html',SCOPE).href)).text();
   const paths=[...new Set(html.match(/maps\/[a-f0-9]{64}\.(?:png|webp)/g)||[])];
   await pool(paths,async path=>{const url=new URL(path,SCOPE).href,r=await fetch(url,{cache:'no-store'});if(!await valid(r,path.split('/')[1].split('.')[0]))throw Error('Map mismatch');await cache.put(url,r);});
  }
  const metadata=await caches.open(META),boot=await caches.open(BOOT);
  if(!await metadata.match(pointer)&&!await boot.match(new URL('index.html',SCOPE).href))await metadata.put(pointer,new Response(name));
  await self.skipWaiting();
 }catch(error){await caches.delete(name);throw error;}
})()));
// Retain previous scope caches during migration and while older pages are open.
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.href.startsWith(SCOPE)||u.pathname.endsWith('/publish.json')||e.request.cache==='no-store')return;
 e.respondWith((async()=>{
  const c=await caches.open(await active());
  const page=e.request.mode==='navigate'||u.pathname.endsWith('/index.html')||u.href===SCOPE;
  const saved=await c.match(page?new URL('index.html',SCOPE).href:e.request);
  if(saved)return saved;
  const r=await fetch(e.request);
  if(r.ok)await c.put(page?new URL('index.html',SCOPE).href:e.request,r.clone());
  return r;
 })());
});
self.addEventListener('message',e=>{
 if(e.data?.type!=='stage-release'&&e.data?.type!=='commit-release')return;
 e.waitUntil((async()=>{
  try{
   const manifest=e.data.manifest;
   if(!/^[a-f0-9]{32}$/.test(manifest.release)||!manifest.files||!manifest.files['index.html'])throw Error('Invalid release');
   const name=PREFIX+'release:'+manifest.release;
   if(e.data.type==='stage-release'){
    const dest=await caches.open(name),old=await caches.open(await active());
    const entries=Object.entries(manifest.files);
    await pool(entries,async([path,hash])=>{
     if(!validPath(path)||!/^[a-f0-9]{64}$/.test(hash))throw Error('Invalid asset');
     const url=new URL(path,SCOPE).href;
     let response=await old.match(url);
     if(!await valid(response,hash)){
      for(const key of (await caches.keys()).filter(key=>key.startsWith(PREFIX+'install:'))){
       const candidate=await (await caches.open(key)).match(url);
       if(await valid(candidate,hash)){response=candidate;break;}
      }
     }
     if(!await valid(response,hash)){response=await fetch(url,{cache:'no-store'});if(!await valid(response,hash))throw Error('Incomplete release');}
     await dest.put(url,response);
    });
   }else{
    const dest=await caches.open(name);
    for(const path of Object.keys(manifest.files))if(!await dest.match(new URL(path,SCOPE).href))throw Error('Release not staged');
    const previous=await active();
    const m=await caches.open(META);await m.put(pointer,new Response(name));
    // Keep a complete fallback; do not prune caches while another page is open.
    try{if((await self.clients.matchAll({type:'window',includeUncontrolled:true})).filter(client=>client.url.startsWith(SCOPE)).length<=1){
     const keys=await caches.keys();
     await Promise.all(keys.filter(key=>(key.startsWith(PREFIX+'release:')||key.startsWith(PREFIX+'install:'))&&key!==name&&key!==previous).map(key=>caches.delete(key)));
    }}catch{/* Cache cleanup must not turn a completed update into a failure. */}
   }
   e.ports[0]?.postMessage({ok:true});
  }catch(error){e.ports[0]?.postMessage({ok:false});}
 })());
});
