import { UserRole } from '@prisma/client';
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    role?: UserRole;
    csrfToken?: string;
  }
}

export interface AuthUser {
  id: string;
  email: string;
  staffCode: string | null;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
