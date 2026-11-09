const CACHE='urinamotion-3d-v1';
const CORE=[
 './','./index.html','./styles.css','./app.js','./manifest.webmanifest',
 './icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png','./icons/maskable-512.png',
 './assets/capsula.webp','./assets/rim.webp','./assets/glomerulo.webp','./assets/nefron.webp',
 './assets/agua.webp','./assets/glicose.webp','./assets/sodio.webp','./assets/ureia.webp',
 './assets/hemacia.webp','./assets/albumina.webp','./assets/reabsorcao.webp',
 './assets/ureter.webp','./assets/bexiga_vazia.webp','./assets/bexiga_cheia.webp','./assets/ondas.webp'
];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('urinamotion-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(res=>{
  if(res.ok){const clone=res.clone();caches.open(CACHE).then(c=>c.put(event.request,clone)).catch(()=>{});}return res;
 }).catch(()=>caches.match('./index.html'))));
});
