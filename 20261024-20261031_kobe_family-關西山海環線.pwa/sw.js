const SCOPE=self.registration.scope;
const PREFIX='travel-planner-pwa:'+encodeURIComponent(SCOPE)+':';
const C=PREFIX+'v9';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin||!url.href.startsWith(SCOPE))return;
  e.respondWith(caches.open(C).then(async cache=>{
    const isPage=e.request.mode==='navigate'||url.pathname.endsWith('/index.html');
    if(isPage){
      const fresh=fetch(new Request(e.request,{cache:'no-cache'}));
      // Cache writes consume the complete response body. Never make rendering
      // wait for that download; retain background work through event lifetime.
      e.waitUntil(fresh.then(response=>response&&response.status===200?cache.put(e.request,response.clone()):null).catch(()=>{}));
      const saved=(await cache.match(e.request))||(await cache.match(new URL('index.html',SCOPE).href));
      const usable=fresh.then(response=>response&&response.status===200?response:saved||response).catch(()=>saved||Response.error());
      if(!saved)return usable;
      let timer;
      try{return await Promise.race([usable,new Promise(resolve=>{timer=setTimeout(()=>resolve(saved),1500)})])}
      finally{clearTimeout(timer)}
    }
    const saved=await cache.match(e.request);if(saved)return saved;
    try{const response=await fetch(e.request);if(response&&response.status===200)try{await cache.put(e.request,response.clone())}catch{}return response}
    catch{return(await cache.match(e.request))||Response.error()}
  }));
});