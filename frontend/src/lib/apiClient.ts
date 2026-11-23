import type { ApiMeta, ApiResponse } from '@/types/emrms';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

let csrfTokenCache: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfTokenCache = token;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function ensureCsrfToken(): Promise<string | null> {
  if (csrfTokenCache) return csrfTokenCache;
  try {
    const res = await fetch(`${API_BASE}/auth/csrf-token`, {
      credentials: 'include',
    });
    const json = (await res.json()) as ApiResponse<{ csrfToken: string }>;
    if (json.success && json.data?.csrfToken) {
      csrfTokenCache = json.data.csrfToken;
      return csrfTokenCache;
    }
  } catch {
    // Will surface on actual request
  }
  return null;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  skipCsrf?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<{ data: T; meta?: ApiMeta }> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (method !== 'GET' && !options.skipCsrf) {
    const token = await ensureCsrfToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) {
      throw new ApiError(res.status, 'HTTP_ERROR', `Request failed (${res.status}).`);
    }
    return { data: (await res.text()) as unknown as T };
  }

  const json = (await res.json()) as ApiResponse<T>;

  if (!res.ok || !json.success) {
    if (json.error?.code === 'CSRF_INVALID') {
      csrfTokenCache = null;
    }
    throw new ApiError(
      res.status,
      json.error?.code || 'REQUEST_FAILED',
      json.error?.message || `Request failed with status ${res.status}`,
      json.error?.details
    );
  }

  return { data: json.data, meta: json.meta };
}

export function getExportUrl(type: 'incidents' | 'audit'): string {
  return `${API_BASE}/reports/export/csv?type=${type}`;
}
