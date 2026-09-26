// Service worker : le jeu est copié dans le téléphone au premier lancement, puis servi
// depuis cette copie. À chaque lancement en ligne, la copie est rafraîchie en arrière-plan
// (seules requêtes réseau du jeu : vers sa propre adresse). Hors ligne, tout marche.

const CACHE = 'alpage-v1';
const FICHIERS = [
  './',
  './index.html',
  './manifest.json',
  './src/ui/style.css',
  './src/ui/app.js',
  './src/ui/storage.js',
  './src/engine/index.js',
  './src/engine/rules.js',
  './src/engine/random.js',
  './src/engine/solver.js',
  './src/engine/generator.js',
  './src/engine/daily.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const enCache = await cache.match(request, { ignoreSearch: true });
      const rafraichi = fetch(request)
        .then((reponse) => {
          if (reponse.ok) cache.put(request, reponse.clone());
          return reponse;
        })
        .catch(() => enCache);
      return enCache || rafraichi;
    }),
  );
});
