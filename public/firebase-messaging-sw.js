/* ==========================================================================
   Service Worker FCM Web Push Notification (Background Handler)
   File Location: /public/firebase-messaging-sw.js (scope = /)
   --------------------------------------------------------------------------
   PERHATIAN ATURAN ZERO HARDCODE:
   - File ini adalah PUBLIC STATIC FILE (di-copy mentah oleh Vite ke dist)
   - TIDAK BISA mengakses import.meta.env (Vite TIDAK inject env ke public files)
   - MAKA KITA TIDAK menggunakan importScripts Firebase SDK (yang butuh config hardcode)
   - SOLUSI: Gunakan NATIVE Push Event dari browser Notification API
   - Token FCM terasosiasi ke SW ini KETIKA frontend call getToken() dengan
     options { vapidKey, serviceWorkerRegistration } object SW registration
     yang didaftarkan dari App.tsx useEffect (lihat src/App.tsx)
   --------------------------------------------------------------------------
   Handler:
   1. push event : Tampilkan notifikasi jika halaman di-background
   2. notificationclick event : Tutup notif → navigate ke click_url atau /dashboard
   3. install/activate : skipWaiting & claim agar langsung aktif tanpa reload
   ========================================================================== */

'use strict';

// Nama cache (untuk future use, saat ini hanya skipWaiting & claim saja)
const SW_VERSION = 'litensi-fcm-v1';
const DEFAULT_NOTIFICATION_ICON = '/logo/litensilogo.png';
const DEFAULT_NOTIFICATION_BADGE = '/logo/litensilogo.png';
const DEFAULT_CLICK_URL = '/dashboard';

// ---------------------------------------------------------------------------
// Event: INSTALL (SW pertama kali terinstall di browser user)
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  console.log('[FCM SW] Installing version:', SW_VERSION);
  // Skip waiting → SW baru langsung aktif tanpa menunggu tab lama ditutup
  event.waitUntil(Promise.resolve(self.skipWaiting()));
});

// ---------------------------------------------------------------------------
// Event: ACTIVATE (SW diaktifkan dan mulai menangani request)
// ---------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  console.log('[FCM SW] Activating version:', SW_VERSION);
  // Claim semua tab yang terbuka agar SW langsung meng-control tanpa reload
  event.waitUntil(Promise.resolve(self.clients.claim()));
});

// ---------------------------------------------------------------------------
// Event: PUSH (FCM mengirim payload ke SW ketika halaman tidak aktif)
// Payload bisa dari FCM HTTP v1 API backend (FcmPushService::pushToWeb)
//   - payload.notification = { title, body, icon, image }
//   - payload.data = { click_url, ...custom_fields }
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  const rawPayload = event.data?.text() || '{}';
  let payload = {};
  try {
    payload = JSON.parse(rawPayload);
  } catch (e) {
    console.warn('[FCM SW] Gagal parse payload JSON push:', e, 'Raw text:', rawPayload);
    payload = {};
  }

  // Ambil nilai dari payload dengan fallback ke default
  const notification = payload.notification ?? {};
  const data = payload.data ?? {};

  const title = (notification.title || payload.title || 'Litensi Kids').trim();
  const body = (notification.body || payload.body || 'Ada notifikasi baru untuk Anda.').trim();
  const icon = notification.icon || notification.image || payload.icon || DEFAULT_NOTIFICATION_ICON;
  const badge = notification.badge || payload.badge || DEFAULT_NOTIFICATION_BADGE;
  const tag = payload.collapseKey || payload.tag || undefined;

  const options = {
    body: body,
    icon: icon,
    badge: badge,
    tag: tag,
    renotify: Boolean(tag),
    requireInteraction: true, // User harus klik close / notifikasi tidak auto-dismiss
    silent: false,
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
    // Field data disimpan ke notifikasi agar bisa diakses di event notificationclick
    data: {
      click_url: data.click_url || payload.click_url || DEFAULT_CLICK_URL,
      ...data,
    },
  };

  console.log('[FCM SW] Show notification:', { title, bodyLength: body.length, click_url: options.data.click_url });
  event.waitUntil(self.registration.showNotification(title, options));
});

// ---------------------------------------------------------------------------
// Event: NOTIFICATION CLICK (User mengklik notifikasi di tray browser)
// ---------------------------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  const notif = event.notification;
  notif.close();

  const data = notif.data || {};
  const clickUrl = data.click_url || DEFAULT_CLICK_URL;

  console.log('[FCM SW] Notification clicked → navigate to:', clickUrl);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Cari tab client yang sudah terbuka dengan URL matching → focus aja
        for (const client of clientList) {
          if (client && 'url' in client && typeof client.url === 'string') {
            // Jika URL client sama persis / origin sama, focus ke tab itu
            try {
              const clientUrl = new URL(client.url, self.location.origin);
              const targetUrl = new URL(clickUrl, self.location.origin);
              if (clientUrl.origin === targetUrl.origin) {
                if ('focus' in client) return client.focus().then(() => {
                  // Jika support navigate, navigate ke URL target
                  if ('navigate' in client) return client.navigate(targetUrl.toString()).catch(() => {});
                });
              }
            } catch (_) {
              // ignore URL parse error
            }
          }
        }
        // Tidak ada tab yang matching → buka tab baru
        if (self.clients.openWindow) {
          return self.clients.openWindow(clickUrl);
        }
        return Promise.resolve();
      })
      .catch((e) => {
        console.error('[FCM SW] notificationclick error:', e);
        // Fallback: coba buka tab baru langsung
        if (self.clients.openWindow) return self.clients.openWindow(clickUrl);
        return Promise.resolve();
      })
  );
});

// End SW file
