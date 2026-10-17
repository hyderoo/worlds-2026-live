// Worlds 2026 Live service worker: push notifications + a light offline cache.
// Offline mode only shows the last data you loaded. It never invents anything and the app says when data may be old.
const V = "w26-v2";
const STATIC = `${V}-static`;
const PAGES = `${V}-pages`;
const MAX_PAGES = 30;

self.addEventListener("install", (e) => { e.waitUntil(caches.open(PAGES).then((c) => c.addAll(["/today", "/matches"]).catch(() => undefined)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => !k.startsWith(V)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

async function trim(name) {
  const c = await caches.open(name);
  const ks = await c.keys();
  if (ks.length > MAX_PAGES) await Promise.all(ks.slice(0, ks.length - MAX_PAGES).map((k) => c.delete(k)));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;
  if (p.startsWith("/api/") && p !== "/api/public/snapshot") return;
  if (p.startsWith("/admin") || p.startsWith("/card/")) return;

  // Static assets: cache first.
  if (p.startsWith("/_next/static/") || p.startsWith("/logos/") || /\.(png|ico|svg|woff2?)$/.test(p)) {
    event.respondWith(caches.open(STATIC).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  // Pages and the public snapshot: network first, last good copy when offline.
  if (req.mode === "navigate" || p === "/api/public/snapshot") {
    event.respondWith((async () => {
      const c = await caches.open(PAGES);
      try {
        const res = await fetch(req);
        if (res.ok) { c.put(req, res.clone()); trim(PAGES); }
        return res;
      } catch {
        const hit = (await c.match(req)) || (req.mode === "navigate" ? (await c.match("/today")) || (await c.match("/matches")) : undefined);
        if (hit) {
          if (p !== "/api/public/snapshot") return hit;
          const h = new Headers(hit.headers); h.set("x-w26-offline", "1");
          return new Response(hit.body, { status: hit.status, headers: h });
        }
        return new Response("Offline and nothing saved for this page yet.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
      }
    })());
  }
});

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { /* ignore */ }
  event.waitUntil(self.registration.showNotification(d.title || "Worlds 2026", { body: d.body || "", tag: d.tag, icon: "/icon-192.png", badge: "/icon-192.png", data: { url: d.url || "/" } }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontained: true }).then((cs) => { for (const c of cs) { if ("focus" in c) { c.navigate(url); return c.focus(); } } return self.clients.openWindow(url); }));
});
