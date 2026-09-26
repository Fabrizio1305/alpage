// Service worker : le jeu est copié dans le téléphone au premier lancement, puis servi
// uniquement depuis cette copie (aucune requête réseau pour jouer). Quand une nouvelle
// version est publiée, le navigateur détecte que ce fichier a changé, télécharge tous les
// fichiers en bloc dans un nouveau cache, puis bascule : jamais de mélange de versions.
//
// RÈGLE : toute modification d'un fichier servi exige d'incrémenter CACHE ci-dessous,
// sinon les téléphones gardent l'ancienne version.

const CACHE = 'alpage-v7';
const FICHIERS = [
  './',
  './index.html',
  './manifest.json',
  './src/ui/style.css',
  './src/ui/app.js',
  './src/ui/storage.js',
  './src/ui/i18n.js',
  './src/ui/worker.js',
  './src/engine/index.js',
  './src/engine/rules.js',
  './src/engine/random.js',
  './src/engine/solver.js',
  './src/engine/generator.js',
  './src/engine/daily.js',
  './src/engine/game.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

// `cache: 'reload'` : GitHub Pages autorise le navigateur à garder chaque fichier 10 minutes ;
// sans cette option, une version publiée peu après la précédente se remplirait d'anciens fichiers.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FICHIERS.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
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
    caches.match(request, { ignoreSearch: true }).then((enCache) => enCache || fetch(request)),
  );
});
