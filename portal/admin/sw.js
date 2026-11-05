/* Vix Automations admin: shows phone notifications for new quotes, payments and messages. */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "New activity · Vix Automations", {
    body: d.body || "Tap to open your admin page.",
    icon: "/portal/admin/icon-192.png",
    badge: "/portal/admin/icon-192.png",
    data: { url: d.url || "/portal/admin/" },
    vibrate: [120, 60, 120],
  }));
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || "/portal/admin/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) if (list[i].url.indexOf("/portal/admin/") > -1 && "focus" in list[i]) return list[i].focus();
    return self.clients.openWindow(url);
  }));
});
