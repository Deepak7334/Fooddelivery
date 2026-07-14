// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
// Note: You must replace this with your actual config details if hardcoding,
// but for flexibility, we often use URL params or build steps.
// Since it's a static file, we will extract it from the query parameters if needed, 
// or you can just rely on the default sender ID if that's how your project is setup.
// To make it simple and secure, we'll initialize it dynamically via a fetch or use hardcoded if preferred.

firebase.initializeApp({
  apiKey: 'AIzaSyBzdxPJ0DSp5NMLhocfsWJeXJ_dFFaxMy8',
  authDomain: 'jdkart-f119a.firebaseapp.com',
  projectId: 'jdkart-f119a',
  storageBucket: 'jdkart-f119a.firebasestorage.app',
  messagingSenderId: '331203442565',
  appId: '1:331203442565:web:879dd9b9b2ce8ae884b6ec',
});

const messaging = firebase.messaging();

// The Firebase SDK automatically handles background messages when the backend sends a standard 'notification' payload.
// However, to ensure it forcibly wakes up the lock screen on Android PWAs with vibration, we intercept it here.
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'JDkart Update';
  const notificationOptions = {
    body: payload.notification.body || '',
    icon: '/favicon.svg', // Update to your 192x192 PWA icon if available
    badge: '/favicon.svg',
    vibrate: [200, 100, 200, 100, 200, 100, 200], // Aggressive vibration to wake user
    requireInteraction: true, // Forces notification to stay until dismissed
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  event.notification.close();

  // URL to open
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If so, just focus it.
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, then open the target URL in a new window/tab.
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
