// Module: firebaseApp.ts
// Fungsi: Inisialisasi Firebase SDK untuk frontend web parental
// Digunakan untuk: FCM Push Notification (getToken, onMessage, dll)
// Patuhi aturan ZERO HARDCODE — semua konfigurasi dari env VITE_ (build-time inject Vite)

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, type Messaging } from 'firebase/messaging';

// Konfigurasi Firebase Web App dari env VITE_ (dijamin ada setelah Vite build)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
} as const;

// Inisialisasi Firebase App (hanya sekali per browser session)
export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);

// Inisialisasi Firebase Messaging instance untuk FCM Web Push
export const firebaseMessaging: Messaging = getMessaging(firebaseApp);

// Default export untuk kompatibilitas lazy-import
export default firebaseApp;
