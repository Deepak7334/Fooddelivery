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

// The Firebase SDK automatically handles background messages when the backend sends a standard 'notification' payload with 'webpush' options.
