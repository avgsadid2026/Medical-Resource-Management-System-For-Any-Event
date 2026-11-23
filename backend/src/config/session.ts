import connectPgSimple from 'connect-pg-simple';
import session from 'express-session';
import { Pool } from 'pg';
import { env } from './env';

/**
 * Shared PostgreSQL connection pool for connect-pg-simple.
 *
 * Coexistence with Prisma:
 * - Prisma owns the `user_sessions` DDL/migration via `model UserSession` in schema.prisma.
 * - connect-pg-simple runs with `createTableIfMissing: false` so it never creates a duplicate
 *   session table or conflicts with Prisma migrations.
 * - Runtime session read/write/pruning is managed automatically by connect-pg-simple.
 */
export const sessionPool = new Pool({
  connectionString: env.DATABASE_URL,
});

const PgSessionStore = connectPgSimple(session);

export const DEFAULT_SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours
export const REMEMBER_TERMINAL_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

export function createSessionMiddleware() {
  return session({
    name: 'emrms.sid',
    store: new PgSessionStore({
      pool: sessionPool,
      tableName: 'user_sessions',
      createTableIfMissing: false,
      pruneSessionInterval: 60 * 15, // prune expired sessions every 15 minutes
    }),
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: DEFAULT_SESSION_MAX_AGE_MS,
    },
  });
}
