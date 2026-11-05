// Keeps the app shell available on a poor signal. The network wins when it answers in time, so a
// new version shows on the next open, and a slow signal falls back to the saved page. API requests
// do not pass through here, the page keeps its own copy of the last data in IndexedDB.
const CACHE = "zdravie-shell-v2";
const NETWORK_WAIT_MS = 2500;
const SHELL = ["./", "manifest.webmanifest", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;
  const key = request.mode === "navigate" ? "./" : request;
  const network = fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(key, copy));
    }
    return response;
  });
  const slow = new Promise((resolve) => setTimeout(resolve, NETWORK_WAIT_MS)).then(() => caches.match(key));
  event.respondWith(
    Promise.race([network.catch(() => caches.match(key)), slow.then((cached) => cached ?? network)])
      .then((response) => response ?? network),
  );
});
