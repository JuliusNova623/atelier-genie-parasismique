/* Service worker : tout le site est mis en cache à l'installation → 100 % hors ligne.
   VERSION est remplacée à chaque déploiement (commit) par le workflow : nouveau cache, ancien supprimé. */
const VERSION = '__VERSION__';
const CACHE = 'apq-cache-' + VERSION;

const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'pwa.js',
  'js/app.js',
  'js/base.js',
  'js/calc.js',
  'js/compl.js',
  'js/cours.js',
  'js/ex-e2021.js',
  'js/ex-e2022.js',
  'js/ex-e2024.js',
  'js/ex-td1.js',
  'js/ex-td2.js',
  'js/ex-td3.js',
  'js/ex-td4.js',
  'js/ex-td5.js',
  'js/prov.js',
  'js/qcm.js',
  'katex/katex.min.js',
  'katex/katex.min.css',
  'katex/fonts/KaTeX_AMS-Regular.woff2',
  'katex/fonts/KaTeX_Caligraphic-Bold.woff2',
  'katex/fonts/KaTeX_Caligraphic-Regular.woff2',
  'katex/fonts/KaTeX_Fraktur-Bold.woff2',
  'katex/fonts/KaTeX_Fraktur-Regular.woff2',
  'katex/fonts/KaTeX_Main-Bold.woff2',
  'katex/fonts/KaTeX_Main-BoldItalic.woff2',
  'katex/fonts/KaTeX_Main-Italic.woff2',
  'katex/fonts/KaTeX_Main-Regular.woff2',
  'katex/fonts/KaTeX_Math-BoldItalic.woff2',
  'katex/fonts/KaTeX_Math-Italic.woff2',
  'katex/fonts/KaTeX_SansSerif-Bold.woff2',
  'katex/fonts/KaTeX_SansSerif-Italic.woff2',
  'katex/fonts/KaTeX_SansSerif-Regular.woff2',
  'katex/fonts/KaTeX_Script-Regular.woff2',
  'katex/fonts/KaTeX_Size1-Regular.woff2',
  'katex/fonts/KaTeX_Size2-Regular.woff2',
  'katex/fonts/KaTeX_Size3-Regular.woff2',
  'katex/fonts/KaTeX_Size4-Regular.woff2',
  'katex/fonts/KaTeX_Typewriter-Regular.woff2',
  'fonts/FiraCode-400-greek.woff2',
  'fonts/FiraCode-400-latin-ext.woff2',
  'fonts/FiraCode-400-latin.woff2',
  'fonts/FiraCode-500-greek.woff2',
  'fonts/FiraCode-500-latin-ext.woff2',
  'fonts/FiraCode-500-latin.woff2',
  'fonts/FiraCode-600-greek.woff2',
  'fonts/FiraCode-600-latin-ext.woff2',
  'fonts/FiraCode-600-latin.woff2',
  'fonts/FiraSans-400-greek.woff2',
  'fonts/FiraSans-400-latin-ext.woff2',
  'fonts/FiraSans-400-latin.woff2',
  'fonts/FiraSans-400i-greek.woff2',
  'fonts/FiraSans-400i-latin-ext.woff2',
  'fonts/FiraSans-400i-latin.woff2',
  'fonts/FiraSans-500-greek.woff2',
  'fonts/FiraSans-500-latin-ext.woff2',
  'fonts/FiraSans-500-latin.woff2',
  'fonts/FiraSans-600-greek.woff2',
  'fonts/FiraSans-600-latin-ext.woff2',
  'fonts/FiraSans-600-latin.woff2',
  'fonts/FiraSansExtraCondensed-500-greek.woff2',
  'fonts/FiraSansExtraCondensed-500-latin-ext.woff2',
  'fonts/FiraSansExtraCondensed-500-latin.woff2',
  'fonts/FiraSansExtraCondensed-600-greek.woff2',
  'fonts/FiraSansExtraCondensed-600-latin-ext.woff2',
  'fonts/FiraSansExtraCondensed-600-latin.woff2',
  'fonts/FiraSansExtraCondensed-700-greek.woff2',
  'fonts/FiraSansExtraCondensed-700-latin-ext.woff2',
  'fonts/FiraSansExtraCondensed-700-latin.woff2',
  'fonts/fira.css',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('apq-cache-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error())),
    ),
  );
});
