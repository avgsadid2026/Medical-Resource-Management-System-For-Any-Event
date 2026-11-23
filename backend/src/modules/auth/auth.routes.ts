import bcrypt from 'bcrypt';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import {
  DEFAULT_SESSION_MAX_AGE_MS,
  REMEMBER_TERMINAL_MAX_AGE_MS,
} from '../../config/session';
import { requireAuth } from '../../middleware/auth';
import { ensureCsrfToken, issueCsrfToken } from '../../middleware/csrf';
import { validateBody } from '../../middleware/validate';
import { AppError } from '../../utils/AppError';
import { writeAuditLog } from '../../utils/audit';

export const authRouter = Router();

const ROLE_PASSWORDS_BY_EMAIL: Record<string, string> = {
  'admin@baust-demo.edu.bd': 'Admin@Medijigs#2026',
  'e.vance@baust-demo.edu.bd': 'Coord@Medijigs#2026',
  't.hasan@baust-demo.edu.bd': 'Doctor@Medijigs#2026',
  'f.yasmin@baust-demo.edu.bd': 'Nurse@Medijigs#2026',
  'dispatch@baust-demo.edu.bd': 'Dispatch@Medijigs#2026',
  'volunteer@baust-demo.edu.bd': 'Volunteer@Medijigs#2026',
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many login attempts. Please wait a few minutes and try again.',
    },
  },
});

const loginSchema = z.object({
  identifier: z.string().trim().min(2, 'Email or Staff ID is required'),
  password: z.string().min(1, 'Password is required'),
  rememberTerminal: z.boolean().optional().default(false),
});

authRouter.get('/csrf-token', (req, res) => {
  const csrfToken = ensureCsrfToken(req);
  res.json({ success: true, data: { csrfToken } });
});

authRouter.post(
  '/login',
  loginLimiter,
  validateBody(loginSchema),
  async (req, res, next) => {
    try {
      const { identifier, password, rememberTerminal } = req.body as z.infer<
        typeof loginSchema
      >;

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: identifier, mode: 'insensitive' } },
            { staffCode: { equals: identifier, mode: 'insensitive' } },
          ],
        },
      });

      if (!user) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email/staff ID or password.');
      }

      if (!user.isActive) {
        throw new AppError(
          403,
          'ACCOUNT_DISABLED',
          'This account has been deactivated. Contact a Super Admin or Medical Admin.'
        );
      }

      const dedicatedRolePass = ROLE_PASSWORDS_BY_EMAIL[user.email.toLowerCase()];
      let validPassword = false;

      if (dedicatedRolePass) {
        if (password === dedicatedRolePass) {
          validPassword = true;
          // Auto-sync dedicated password hash in PostgreSQL if still on legacy seed hash
          const matchesHash = await bcrypt.compare(password, user.passwordHash);
          if (!matchesHash) {
            const newHash = await bcrypt.hash(dedicatedRolePass, 10);
            await prisma.user.update({
              where: { id: user.id },
              data: { passwordHash: newHash },
            });
          }
        } else if (password !== 'DemoPass123!') {
          validPassword = await bcrypt.compare(password, user.passwordHash);
        }
      } else {
        validPassword = await bcrypt.compare(password, user.passwordHash);
      }

      if (!validPassword) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email/staff ID or password.');
      }

      // Regenerate session ID to prevent session fixation and bind a fresh CSRF token
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => (err ? reject(err) : resolve()));
      });

      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.cookie.maxAge = rememberTerminal
        ? REMEMBER_TERMINAL_MAX_AGE_MS
        : DEFAULT_SESSION_MAX_AGE_MS;

      const csrfToken = issueCsrfToken(req);

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      await writeAuditLog({
        actorUserId: user.id,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: user.id,
        summary: `${user.fullName} (${user.role}) signed in.`,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            staffCode: user.staffCode,
            fullName: user.fullName,
            role: user.role,
            isActive: user.isActive,
          },
          csrfToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const actor = req.user!;
    await writeAuditLog({
      actorUserId: actor.id,
      action: 'USER_LOGOUT',
      entityType: 'User',
      entityId: actor.id,
      summary: `${actor.fullName} signed out.`,
      ipAddress: req.ip,
    });

    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err) => (err ? reject(err) : resolve()));
    });

    res.clearCookie('emrms.sid');
    res.json({ success: true, data: { loggedOut: true } });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  const csrfToken = ensureCsrfToken(req);
  res.json({
    success: true,
    data: {
      user: req.user,
      csrfToken,
    },
  });
});
