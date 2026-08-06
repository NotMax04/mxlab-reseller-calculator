const CACHE='mxlab-hub-v356';
const ASSETS=['./','./index.html','./styles.css','./app.js','./calculator.js','./inventory.js','./listing.js','./vinted-data.js','./vinted-price-ai.js','./video-frame-extractor.js','./media-store.js','./mxlab-ai.js','./seed-data.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./update.html'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE&&key.startsWith('mxlab-hub-')).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith(
    fetch(event.request,{cache:'no-store'}).then(response=>{
      if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
      return response;
    }).catch(async()=>{
      const cached=await caches.match(event.request);
      if(cached)return cached;
      if(event.request.mode==='navigate')return caches.match('./index.html');
      throw new Error('Risorsa non disponibile offline');
    })
  );
});
