/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { clientsClaim } from "workbox-core";

declare let self: ServiceWorkerGlobalScope;

// Çevrimdışı: derleme çıktısı önbelleğe alınır, yeni sürüm hemen devreye girer
self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Sunucudan gelen push → bildirim
self.addEventListener("push", (e) => {
  const d = (e.data?.json() ?? {}) as { title?: string; body?: string; tag?: string; url?: string };
  e.waitUntil(
    self.registration.showNotification(d.title ?? "Bilge", {
      body: d.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: d.tag,
      data: d,
    }),
  );
});

// Bildirime dokununca uygulamayı öne getir
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      const c = cs[0];
      return c ? c.focus() : self.clients.openWindow("/");
    }),
  );
});
