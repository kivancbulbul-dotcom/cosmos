// Cosmos Rezervasyon — service worker
// Sürüm adı her güncellemede değiştirilir; eski önbellekler otomatik silinir.
const CACHE_NAME = "cosmos-rezervasyon-v3";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./logo.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(CORE_ASSETS.map((u) => cache.add(new Request(u, { cache: "reload" })).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isCacheable(response) {
  return response && response.ok && response.type === "basic";
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Yalnızca kendi alan adımızdaki dosyalarla ilgilen; dış istekleri hiç önbelleğe alma.
  if (url.origin !== self.location.origin) return;

  const isPage = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");

  if (isPage) {
    // Sayfa için AĞ ÖNCE: güncel (güvenlik düzeltmeli) sürüm hemen gelir; çevrimdışıysa önbellekten.
    event.respondWith(
      // cache:"no-store" → tarayıcının HTTP önbelleğini (GitHub Pages 10 dk) atla, her açılışta en son sürümü al.
      fetch(req.url, { cache: "no-store", credentials: "same-origin" })
        .then((res) => {
          if (isCacheable(res)) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put("./index.html", copy));
          }
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Görseller ve manifest için: önbellekten hızlı sun, arka planda güncelle.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (isCacheable(res)) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
