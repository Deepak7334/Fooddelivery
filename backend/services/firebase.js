const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Ensure that we only initialize if we have the required env variables
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  try {
    // Handle potential escaped newlines in the private key string from .env
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      console.log('✅ Firebase Admin SDK Initialized');
    }
  } catch (error) {
    console.error('❌ Firebase Admin SDK Initialization Error:', error);
  }
} else {
  console.warn('⚠️ Firebase environment variables are missing. Push notifications will not work.');
}

module.exports = { getAuth, getApps };
