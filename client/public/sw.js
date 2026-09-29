// ElderCare AI — Service Worker for Instant Web Push Notifications & Incoming Calls
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'ElderCare AI Alert', body: event.data.text() };
    }
  }

  const title = data.title || '📞 Incoming Call';
  const options = {
    body: data.body || 'A call has been placed to you. Tap to answer.',
    icon: data.icon || '/vite.svg',
    badge: data.badge || '/vite.svg',
    tag: data.tag || 'eldercare-call',
    renotify: true,
    requireInteraction: true,
    vibrate: data.vibrate || [400, 200, 400, 200, 800],
    data: data.data || {},
    actions: data.actions || [
      { action: 'answer', title: '🟢 Answer Call' },
      { action: 'decline', title: '🔴 Decline' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const callData = event.notification.data || {};
  const joinUrl = callData.joinUrl || '/calls';

  if (event.action === 'decline') {
    // Notify server of decline if endpoint available
    return;
  }

  // Answer call: Open or focus the call join URL
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open on this domain, focus and navigate it
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(joinUrl);
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(joinUrl);
      }
    })
  );
});
