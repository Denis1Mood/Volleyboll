self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Волейбол";
  const options = {
    body: data.body || "Новое уведомление",
    icon: "/icon.png",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
