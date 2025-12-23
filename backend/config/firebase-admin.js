/**
 * Firebase Admin SDK Configuration
 *
 * Initializes Firebase Admin for server-side operations like:
 * - Sending push notifications via FCM
 * - Verifying Firebase Auth tokens (if not using client SDK)
 *
 * Uses service account credentials from:
 * 1. FIREBASE_SERVICE_ACCOUNT environment variable (JSON string)
 * 2. ./firebase-service-account.json file (fallback)
 */

const admin = require('firebase-admin');
const path = require('path');

let firebaseAdmin = null;

const initializeFirebaseAdmin = () => {
  if (firebaseAdmin) {
    return firebaseAdmin;
  }

  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      firebaseAdmin = admin;
      return firebaseAdmin;
    }

    let serviceAccount;

    // Try environment variable first (for production/CI)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('[Firebase Admin] Using service account from environment variable');
      } catch (parseError) {
        console.error('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT env var:', parseError.message);
      }
    }

    // Fall back to local file
    if (!serviceAccount) {
      const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
      try {
        serviceAccount = require(serviceAccountPath);
        console.log('[Firebase Admin] Using service account from file');
      } catch (fileError) {
        console.error('[Firebase Admin] Failed to load service account file:', fileError.message);
        console.warn('[Firebase Admin] Push notifications will not be available');
        return null;
      }
    }

    // Initialize Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    firebaseAdmin = admin;
    console.log('[Firebase Admin] Initialized successfully');
    return firebaseAdmin;
  } catch (error) {
    console.error('[Firebase Admin] Initialization error:', error.message);
    return null;
  }
};

// Initialize on module load
const instance = initializeFirebaseAdmin();

module.exports = {
  admin: instance,
  messaging: instance?.messaging() || null,
  initializeFirebaseAdmin,
};
