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

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico', // Replace with your app logo
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If so, just focus it.
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, then open the target URL in a new window/tab.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
