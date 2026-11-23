import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function issueCsrfToken(req: Request): string {
  const token = crypto.randomBytes(32).toString('hex');
  req.session.csrfToken = token;
  return token;
}

export function ensureCsrfToken(req: Request): string {
  if (!req.session.csrfToken) {
    return issueCsrfToken(req);
  }
  return req.session.csrfToken;
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Synchronizer Token CSRF protection.
 * Requires matching X-CSRF-Token header on all state-changing requests
 * except initial POST /api/v1/auth/login (which regenerates the session
 * and immediately issues a fresh CSRF token tied to the new session).
 */
export function csrfProtection(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  // Login creates/regenerates the session and issues a fresh CSRF token
  if (req.path === '/api/v1/auth/login' && req.method === 'POST') {
    next();
    return;
  }

  const sessionToken = req.session?.csrfToken;
  const headerToken = req.get('x-csrf-token');

  if (!sessionToken || !headerToken || !safeCompare(sessionToken, headerToken)) {
    next(
      new AppError(
        403,
        'CSRF_INVALID',
        'Missing or invalid CSRF security token. Please refresh and try again.'
      )
    );
    return;
  }

  next();
}
