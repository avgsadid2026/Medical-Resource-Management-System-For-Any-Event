import type { ApiMeta, ApiResponse } from '@/types/emrms';
import { handleDemoFallbackRequest } from '@/lib/demoFallbackEngine';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

let csrfTokenCache: string | null = null;
let useCloudDemoMode = false;

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
  if (useCloudDemoMode) return 'medijigs-cloud-csrf-token';
  if (csrfTokenCache) return csrfTokenCache;
  try {
    const res = await fetch(`${API_BASE}/auth/csrf-token`, {
      credentials: 'include',
    });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      useCloudDemoMode = true;
      return 'medijigs-cloud-csrf-token';
    }
    const json = (await res.json()) as ApiResponse<{ csrfToken: string }>;
    if (json.success && json.data?.csrfToken) {
      csrfTokenCache = json.data.csrfToken;
      return csrfTokenCache;
    }
  } catch {
    useCloudDemoMode = true;
    return 'medijigs-cloud-csrf-token';
  }
  return null;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  skipCsrf?: boolean;
}

function invokeFallback<T>(path: string, method: string, body?: unknown): { data: T; meta?: ApiMeta } {
  try {
    return handleDemoFallbackRequest<T>(path, method, body);
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHENTICATED') {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Not authenticated.');
    }
    throw err;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<{ data: T; meta?: ApiMeta }> {
  const method = options.method ?? 'GET';

  if (useCloudDemoMode) {
    return invokeFallback<T>(path, method, options.body);
  }

  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (method !== 'GET' && !options.skipCsrf) {
    const token = await ensureCsrfToken();
    if (useCloudDemoMode) {
      return invokeFallback<T>(path, method, options.body);
    }
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    // Network unreachable (static host without backend) -> activate cloud demo fallback
    useCloudDemoMode = true;
    return invokeFallback<T>(path, method, options.body);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    // Static hosts (Netlify / GitHub Pages) return text/html or 404 for /api/v1/*
    useCloudDemoMode = true;
    return invokeFallback<T>(path, method, options.body);
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
