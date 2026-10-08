// Cosmos Rezervasyon — service worker
// Sürüm adı her güncellemede değiştirilir; eski önbellekler otomatik silinir.
const CACHE_NAME = "cosmos-rezervasyon-v4";
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

  // HER ŞEY İÇİN AĞ ÖNCE: internet varsa sayfa, logo ve ikonlar her açılışta GitHub'dan en güncel haliyle gelir
  // (tarayıcının HTTP önbelleği de atlanır). İnternet yoksa son kaydedilen kopya kullanılır.
  const isPage = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");
  event.respondWith(
    fetch(req.url, { cache: "no-store", credentials: "same-origin" })
      .then((res) => {
        if (isCacheable(res)) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(isPage ? "./index.html" : req, copy));
        }
        return res;
      })
      .catch(() =>
        isPage
          ? caches.match("./index.html").then((r) => r || caches.match("./"))
          : caches.match(req, { ignoreSearch: true })
      )
  );
});
