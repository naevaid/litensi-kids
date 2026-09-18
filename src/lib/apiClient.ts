// ==========================================================================
// src/lib/apiClient.ts — Utility helper untuk hit endpoint Laravel
// --------------------------------------------------------------------------
// 🔥 PERBAIKAN BUG PRODUCTION 2026-09-18:
//    SEBELUMNYA: VITE_API_BASE_URL undefined di VPS → fallback hardcode
//                http://127.0.0.1:8000 di production (gagal konek DB / API)
//    SESUDAHNYA: Otomatis detect via Vite import.meta.env.PROD (no hardcode!)
//                PRODUCTION → BASE URL = "" (relative same-origin via Nginx)
//                DEV MODE   → BASE URL = http://127.0.0.1:8000 (Laravel local)
//                Bisa di-OVERRIDE kapan saja via env VITE_API_BASE_URL
// ==========================================================================

const VITE_ENV = (import.meta as any).env ?? {};
const IS_PROD_MODE: boolean = Boolean(
  VITE_ENV.PROD === true
  || VITE_ENV.MODE === 'production'
  || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production')
);
const DEFAULT_DEV_BASE: string = 'http://127.0.0.1:8000';
const DEFAULT_PROD_BASE: string = ''; // = relative same domain origin (parental.naeva.id)
const ENV_OVERRIDE: string | undefined = (typeof VITE_ENV.VITE_API_BASE_URL === 'string' && VITE_ENV.VITE_API_BASE_URL.trim() !== '')
  ? VITE_ENV.VITE_API_BASE_URL.trim()
  : undefined;

export const API_BASE_URL: string = ENV_OVERRIDE ?? (IS_PROD_MODE ? DEFAULT_PROD_BASE : DEFAULT_DEV_BASE);

// ==========================================================================
// DEBUG LOG: Cetak BASE_URL setiap import module (untuk verifikasi production env)
// ==========================================================================
const isProdUrl = (u: string): boolean => (u === '' || u.startsWith('/'));
console.log(
  '%c[apiClient] init API_BASE_URL =',
  'color:#8b5cf6;font-weight:700',
  JSON.stringify(API_BASE_URL),
  `(mode: ${isProdUrl(API_BASE_URL) ? 'PRODUCTION SAME-ORIGIN (relative /api/v1/*)' : 'DEV LOCALHOST http://127.0.0.1:8000'})`,
  '| PROD flag =',
  IS_PROD_MODE,
  '| DEV flag =',
  !IS_PROD_MODE,
  '| ENV VITE_API_BASE_URL override =',
  ENV_OVERRIDE ? JSON.stringify(ENV_OVERRIDE) : '(tidak diset / fallback logic)'
);

const API_PREFIX = '/api/v1';

// --------------------------------------------------------------------------
// Ambil user login info (simulasi session: ganti dengan Sanctum nanti)
// --------------------------------------------------------------------------
export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  active_plan?: string;
  active_plan_label?: string;
  children_count?: number;
  devices_count?: number;
  expires_at?: string;
  status?: string;
}

const SESSION_KEY = 'litensi_session_user';

export function getSessionUser(): SessionUser | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch (e) {
    console.warn('[apiClient] gagal parse session user', e);
    return null;
  }
}

export function setSessionUser(user: SessionUser | null): void {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    console.debug('[apiClient] setSessionUser disimpan:', user);
  } else {
    localStorage.removeItem(SESSION_KEY);
    console.debug('[apiClient] session user dihapus');
  }
}

// --------------------------------------------------------------------------
// Core request helper
// --------------------------------------------------------------------------
interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
  authRequired?: boolean; // jika true, otomatis inject user_id ke params
  skipUserParam?: boolean; // jika tidak mau tambah user_id meskipun authRequired
}

function appendQueryParams(url: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) return url;
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '') return;
    usp.append(k, String(v));
  });
  const qs = usp.toString();
  return qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<{
  ok: boolean;
  status: number;
  data: T;
  raw: Response;
  message?: string;
}> {
  const {
    method = 'GET',
    headers,
    body,
    params,
    authRequired = true,
    skipUserParam = false,
    ...rest
  } = options;

  // Inject user_id ke params (GET) atau body (POST/PUT) jika login session ada
  const session = getSessionUser();
  const userId = session?.id;

  let finalParams = { ...(params || {}) };
  let finalBody = body;

  if (authRequired && !skipUserParam && userId) {
    if (method === 'GET') {
      finalParams = { user_id: userId, ...finalParams };
    } else if (body && typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        parsed.user_id = parsed.user_id ?? userId;
        finalBody = JSON.stringify(parsed);
      } catch {
        // biarkan
      }
    } else if (body && body instanceof FormData) {
      if (!body.has('user_id')) body.append('user_id', String(userId));
      finalBody = body;
    }
  }

  const url = `${API_BASE_URL}${API_PREFIX}${endpoint}`;
  const finalUrl = appendQueryParams(url, finalParams);

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string>),
  };

  // Jika body bukan FormData, set Content-Type JSON
  if (
    method !== 'GET' &&
    finalBody &&
    !(finalBody instanceof FormData) &&
    !finalHeaders['Content-Type']
  ) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  // ----- DEBUG LOG (wajib ada) -----
  console.groupCollapsed(
    `%c[API] ${method} ${endpoint}`,
    'color:#3b82f6;font-weight:600'
  );
  console.debug('full url   :', finalUrl);
  console.debug('method     :', method);
  console.debug('headers    :', finalHeaders);
  if (method !== 'GET') console.debug('body       :', finalBody);
  console.debug('params     :', finalParams);
  console.debug('session uid:', userId);
  console.groupEnd();

  // ----- EXECUTE -----
  const t0 = performance.now();
  let raw: Response;
  try {
    raw = await fetch(finalUrl, {
      method,
      headers: finalHeaders,
      body: method === 'GET' ? undefined : (finalBody as BodyInit | undefined),
      ...rest,
    });
  } catch (err: any) {
    const ms = (performance.now() - t0).toFixed(0);
    console.groupCollapsed(
      `%c[API] ❌ NETWORK ERROR ${method} ${endpoint} (${ms}ms)`,
      'color:#ef4444;font-weight:700'
    );
    console.error('error:', err);
    console.groupEnd();
    return {
      ok: false,
      status: 0,
      data: {} as T,
      raw: undefined as any,
      message: err?.message || 'Tidak dapat terhubung ke server',
    };
  }

  const ms = (performance.now() - t0).toFixed(0);
  let data: any = null;
  const text = await raw.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  const ok = raw.ok && (data?.success ?? raw.ok);

  // ----- DEBUG LOG RESPONSE -----
  const color = ok ? '#22c55e' : raw.ok ? '#f59e0b' : '#ef4444';
  const icon = ok ? '✅' : raw.ok ? '⚠️' : '❌';
  console.groupCollapsed(
    `%c[API] ${icon} ${method} ${endpoint} → ${raw.status} (${ms}ms)`,
    `color:${color};font-weight:700`
  );
  console.debug('status:', raw.status, raw.statusText);
  console.debug('response payload:', data);
  if (!ok) console.debug('RAW TEXT BODY:', text);
  console.groupEnd();

  return {
    ok: !!ok,
    status: raw.status,
    data: (data?.data ?? data ?? {}) as T,
    raw,
    message:
      data?.message ||
      (ok ? undefined : raw.statusText || `HTTP ${raw.status}`),
  };
}

// Shortcut helpers
export const api = {
  get: <T = any>(endpoint: string, params?: Record<string, any>, opts?: Partial<RequestOptions>) =>
    apiClient<T>(endpoint, { method: 'GET', params, ...opts }),

  post: <T = any>(endpoint: string, body?: any, opts?: Partial<RequestOptions>) =>
    apiClient<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
      ...opts,
    }),

  put: <T = any>(endpoint: string, body?: any, opts?: Partial<RequestOptions>) =>
    apiClient<T>(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
      ...opts,
    }),

  patch: <T = any>(endpoint: string, body?: any, opts?: Partial<RequestOptions>) =>
    apiClient<T>(endpoint, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body || {}),
      ...opts,
    }),

  del: <T = any>(endpoint: string, opts?: Partial<RequestOptions>) =>
    apiClient<T>(endpoint, { method: 'DELETE', ...opts }),

  /**
   * Profile Module — Endpoint halaman Profil Saya
   * (Backend: API/ProfilController.php)
   */
  profile: {
    /** Update data profil: name, email, phone, pin_master (4-6 digit numeric) */
    update: <T = any>(payload: {
      name: string;
      email: string;
      phone?: string | null;
      pin_master?: string | null;
    }) =>
      api.post<T>('/profil/update', payload),

    /**
     * Upload foto profil (Client sudah compress sebelumnya via compressImageClient).
     * Backend: Kompres ULANG ke 800x800 JPEG q85 + hapus foto lama lokal jika ada.
     */
    uploadPhoto: <T = any>(file: Blob | File, filename: string = 'photo.jpg') => {
      const fd = new FormData();
      fd.append('photo', file, filename);
      return api.post<T>('/profil/foto', fd);
    },

    /** Hapus foto profil user → kembali ke avatar default */
    deletePhoto: <T = any>() => api.post<T>('/profil/foto/hapus', {}),
  },
};

// ==========================================================================
// Helper: Compress gambar CLIENT-SIDE via HTML5 Canvas (sebelum upload ke server)
// Tujuan: Kurangi size upload (hemat bandwidth).
// Server tetap KOMPRES ULANG (Intervention 800x800 q85) — ini lapisan pertama saja.
// ==========================================================================
export async function compressImageClient(
  file: File,
  opts: { maxWidth?: number; maxHeight?: number; quality?: number; mime?: string } = {}
): Promise<{ blob: Blob; width: number; height: number; originalSizeKB: number; compressedSizeKB: number }> {
  const maxWidth = opts.maxWidth ?? 1280;
  const maxHeight = opts.maxHeight ?? 1280;
  const quality = opts.quality ?? 0.85;
  const mime = opts.mime ?? 'image/jpeg';

  const originalSizeKB = Math.round(file.size / 1024);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal baca file gambar'));
    reader.onload = (evt) => {
      const img = new Image();
      img.onerror = () => reject(new Error('File bukan gambar yang valid'));
      img.onload = () => {
        // Scale down preserve aspect ratio (no upscale)
        let { width, height } = img;
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        // Draw ke Canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Browser tidak support Canvas 2D'));
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Gagal generate blob canvas'));
              return;
            }
            resolve({
              blob,
              width,
              height,
              originalSizeKB,
              compressedSizeKB: Math.round(blob.size / 1024),
            });
          },
          mime,
          quality
        );
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ==========================================================================
// Helper: Mapper snake_case Laravel DB → camelCase TypeScript (khusus User object)
// ==========================================================================
export function mapDbUserToTsUser(dbUser: Record<string, any>): import('../types').User {
  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    avatarUrl: dbUser.avatar_url ?? dbUser.avatarUrl,
    activePlan: dbUser.active_plan ?? dbUser.activePlan,
    activePlanLabel: dbUser.active_plan_label ?? dbUser.activePlanLabel,
    childrenCount: Number(dbUser.children_count ?? dbUser.childrenCount ?? 0),
    devicesCount: Number(dbUser.devices_count ?? dbUser.devicesCount ?? 0),
    expiresAt: dbUser.expires_at ?? dbUser.expiresAt,
    status: dbUser.status,
    phone: dbUser.phone,
    lastActive: dbUser.last_active ?? dbUser.lastActive,
    pinMasterExists: Boolean(dbUser.pin_master_exists ?? dbUser.pinMasterExists),
    pinMaster: null, // NEVER kirim actual pin value, client tidak butuh
  };
}
