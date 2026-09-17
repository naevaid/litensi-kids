// ==========================================================================
// src/lib/apiClient.ts — Utility helper untuk hit endpoint Laravel
// - baseURL configurable via VITE_API_BASE_URL (default: http://127.0.0.1:8000)
// - semua request & response ada console.debug / console.log untuk debugging
// - auto-append user_id dari localStorage (simulasi auth sebelum Sanctum)
// ==========================================================================

export const API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

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
};
