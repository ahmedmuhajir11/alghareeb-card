self.addEventListener("push", function (event) {
  if (!event.data) return;
  const data = event.data.json();
  const title = data.title || "الغريب كارد";
  const options = {
    body: data.body || "",
    icon: "/logo.png",
    badge: "/logo.png",
    dir: "rtl",
    lang: "ar",
    tag: data.tag || data.url || "alghareeb-notification",
    renotify: true,
    requireInteraction: false,
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
