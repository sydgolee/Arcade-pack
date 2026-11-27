const V='arcade-v1.4.0',FILES=["./","index.html","dungeon.html","wallmaze.html","fleet.html","cowboy.html","gangster.html","billiards.html","scores.html","trophies.html","settings.html","about.html","privacy.html","404.html","runner.js","arcade.js","net.js","cup.js","shell.js","site.css","manifest.webmanifest","og.png","fonts/fonts.css","fonts/press-start-2p-latin-400-normal.woff2","fonts/vt323-latin-400-normal.woff2","icons/icon-192.png","icons/icon-512.png","icons/icon-180.png"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
// network first, but fall back to the offline copy after 3 s on a slow connection. Only our own game files are cached.
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==location.origin||u.pathname.includes('/api/'))return;
 e.respondWith(new Promise(resolve=>{
  let done=false;const cached=()=>caches.match(e.request,{ignoreSearch:true});
  const t=setTimeout(()=>cached().then(r=>{if(r&&!done){done=true;resolve(r)}}),3000);
  fetch(e.request).then(r=>{clearTimeout(t);if(r.ok){const c=r.clone();caches.open(V).then(x=>x.put(e.request,c))}if(!done){done=true;resolve(r)}})
   .catch(()=>{clearTimeout(t);cached().then(r=>{if(!done){done=true;resolve(r||new Response('Offline',{status:503}))}})});
 }));
});
