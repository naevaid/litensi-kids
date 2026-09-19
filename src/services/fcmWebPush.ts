// Module: fcmWebPush.ts
// Fungsi: Integrasi FCM Web Push Notification untuk Dashboard Parental
// Alur: Minta izin browser → Dapatkan token FCM → Kirim ke endpoint POST /profil/web-fcm-token
//       Pasang listener foreground push (onMessage) untuk tampilkan Toast saat halaman aktif
// Catatan: Background push TIDAK di-handle disini (diproses oleh public/firebase-messaging-sw.js Service Worker)

import { getToken, onMessage, type Messaging } from 'firebase/messaging';
import { firebaseMessaging } from './firebaseApp';
import { api } from '../lib/apiClient';

// -----------------------------------------------------------------------------
// Tipe data payload push notification FCM (foreground)
// -----------------------------------------------------------------------------
export interface FcmPushPayload {
  notification?: {
    title?: string;
    body?: string;
    image?: string;
    icon?: string;
  };
  data?: Record<string, string>;
  fcmOptions?: {
    link?: string;
  };
  from?: string;
  collapseKey?: string;
}

// -----------------------------------------------------------------------------
// 1. Request Notification Permission ke Browser User
//    Return true jika diizinkan (granted), false jika ditolak / tidak didukung
// -----------------------------------------------------------------------------
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof (window as any).Notification === 'undefined') {
    console.warn('[FCM] Browser tidak mendukung Notification API');
    return false;
  }
  try {
    const currentPerm = (window as any).Notification.permission as 'granted' | 'denied' | 'default';
    if (currentPerm === 'granted') return true;
    if (currentPerm === 'denied') {
      console.warn('[FCM] Notification permission sudah pernah DENIED. User harus enable manual di browser settings.');
      return false;
    }
    const result = await (window as any).Notification.requestPermission() as 'granted' | 'denied' | 'default';
    return result === 'granted';
  } catch (e: any) {
    console.error('[FCM] requestPermission error:', e);
    return false;
  }
}

// -----------------------------------------------------------------------------
// 2. Dapatkan token FCM Web Push via Firebase getToken()
//    Opsional: Pass serviceWorkerRegistration object yang sudah di-register App.tsx
//              agar token terasosiasi dengan custom SW kita (bukan default firebase SW)
// -----------------------------------------------------------------------------
export async function getFcmWebToken(swReg?: ServiceWorkerRegistration): Promise<string | null> {
  try {
    const vapidKey = import.meta.env.VITE_FCM_VAPID_PUBLIC_KEY as string | undefined;
    if (!vapidKey || vapidKey.trim() === '') {
      console.error('[FCM] VITE_FCM_VAPID_PUBLIC_KEY TIDAK ADA di env build! Vite tidak inject env dengan benar.');
      return null;
    }
    const opts: any = { vapidKey: vapidKey.trim() };
    if (swReg) opts.serviceWorkerRegistration = swReg;
    const token = await getToken(firebaseMessaging as Messaging, opts);
    if (!token) {
      console.warn('[FCM] getToken return empty / null.');
      return null;
    }
    return token;
  } catch (e: any) {
    console.error('[FCM] getToken() error (periksa VAPID key / Service Worker scope):', e);
    return null;
  }
}

// -----------------------------------------------------------------------------
// 3. Kirim token FCM ke Backend Laravel endpoint POST /profil/web-fcm-token
//    apiClient OTOMATIS inject flat field user_id dari localStorage session (authRequired=true default)
// CATATAN (G11 GUARD): JANGAN PERNAH kirim request jika USER BELUM LOGIN (guest landing/login page).
//   Server akan return 401 Unauthorized wajar, tapi ini membanjiri console user dengan error merah
//   padahal bukan bug. Supress dengan early return.
// -----------------------------------------------------------------------------
export async function sendFcmTokenToBackend(token: string): Promise<{
  ok: boolean;
  message?: string;
  data?: any;
}> {
  if (!token || token.trim() === '') {
    return { ok: false, message: 'Token FCM kosong' };
  }
  // (G11 GUARD) JIKA USER BELUM LOGIN = SKIP KIRIM. TIDAK PERLU ERROR CONSOLE.
  //   User akan auto register token setelah login success via LoginPage useEffect / Dashboard mount.
  try {
    // import api DAN getSessionUser JANGAN circular, api sudah punya isLoggedIn via session internal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sess = (api as any).getSessionUser ? (api as any).getSessionUser() : null;
    if (!sess || !sess.id) {
      console.debug('[FCM] sendFcmTokenToBackend: SKIP (user belum login / session invalid — register token otomatis setelah login berhasil)');
      return { ok: false, message: 'User belum login — token register ditunda setelah login sukses' };
    }
  } catch (_) { /* ignore check sess guard */ }
  try {
    const res = await api.post<any>(
      '/profil/web-fcm-token',
      { web_fcm_token: token.trim() },
      { authRequired: true }
    );
    return {
      ok: !!res.ok,
      message: res.message || (res.ok ? 'Token FCM Web Push berhasil disimpan' : 'Gagal simpan token FCM'),
      data: res.data,
    };
  } catch (e: any) {
    // (G11 SUPPRESS) 401 = session expired / belum login = BUKAN BUG. Hanya debug log.
    const status = Number(e?.status ?? e?.response?.status ?? 0);
    if (status === 401) {
      console.debug('[FCM] POST /profil/web-fcm-token → 401 (session user invalid — akan register ulang setelah login berhasil):', e?.message ?? '');
    } else {
      console.error('[FCM] POST /profil/web-fcm-token exception:', e);
    }
    return { ok: false, message: e?.message || 'Network error saat kirim token FCM' };
  }
}

// -----------------------------------------------------------------------------
// 4. Gabung 3 step di atas: Request Permission → Get Token → Send ke Backend
//    Dipanggil dari App.tsx saat user klik banner "Aktifkan Notifikasi" atau
//    otomatis saat permission sudah granted (refresh token setiap mount)
// -----------------------------------------------------------------------------
export async function requestPermissionAndRegisterToken(swReg?: ServiceWorkerRegistration): Promise<{
  ok: boolean;
  message?: string;
  token?: string;
}> {
  const permOk = await requestNotificationPermission();
  if (!permOk) {
    return { ok: false, message: 'Izin notifikasi ditolak atau tidak didukung browser' };
  }
  const token = await getFcmWebToken(swReg);
  if (!token) {
    return { ok: false, message: 'Gagal dapatkan token FCM dari Firebase (cek VAPID key / SW scope)' };
  }
  const saved = await sendFcmTokenToBackend(token);
  return {
    ok: saved.ok,
    message: saved.message,
    token: saved.ok ? token : undefined,
  };
}

// -----------------------------------------------------------------------------
// 5. Subscribe Listener Foreground Push (onMessage Firebase)
//    Saat halaman web sedang AKTIF di-focus → trigger callback yang di-passing
//    Return unsub function untuk cleanup useEffect React.
//    CATATAN: JANGAN panggil useToast disini (module non-React),
//             callback dijalankan dari dalam React component App.tsx yang punya akses useToast
// -----------------------------------------------------------------------------
export function subscribeForegroundPushNotifications(
  onPushReceived: (payload: FcmPushPayload) => void
): () => void {
  if (!firebaseMessaging) {
    console.warn('[FCM] firebaseMessaging belum diinisialisasi → skip foreground listener');
    return () => {};
  }
  try {
    return onMessage(firebaseMessaging as Messaging, (payload: any) => {
      console.log('[FCM] Foreground push diterima (onMessage):', payload);
      onPushReceived(payload as FcmPushPayload);
    });
  } catch (e: any) {
    console.error('[FCM] onMessage subscribe error:', e);
    return () => {};
  }
}

// Default export
export default {
  requestNotificationPermission,
  getFcmWebToken,
  sendFcmTokenToBackend,
  requestPermissionAndRegisterToken,
  subscribeForegroundPushNotifications,
};
