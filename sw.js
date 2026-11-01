// Keeps the app shell available on a poor signal. The network always wins, so a new version
// shows on the next open. Requests to the API are never cached, health data stays off the disk.
const CACHE = "zdravie-shell-v1";
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
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request.mode === "navigate" ? "./" : request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request.mode === "navigate" ? "./" : request)),
  );
});
