import bcrypt from 'bcrypt';
import { Prisma, UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { AppError } from '../../utils/AppError';
import { writeAuditLog } from '../../utils/audit';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination';

export const auditLogsRouter = Router();
export const usersRouter = Router();
export const settingsRouter = Router();

const GOVERNANCE_ROLES = [UserRole.SUPER_ADMIN, UserRole.MEDICAL_ADMIN];

// ============================================================================
// 1. ACTIVITY & AUDIT LOGS (Strictly Read-Only — Append-Only Table)
// ============================================================================
auditLogsRouter.use(requireAuth, requireRole(...GOVERNANCE_ROLES));

auditLogsRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search ?? '').trim();
    const action = req.query.action ? String(req.query.action) : undefined;
    const entityType = req.query.entityType ? String(req.query.entityType) : undefined;

    const where: Prisma.AuditLogWhereInput = {};
    if (action && action !== 'ALL') where.action = action;
    if (entityType && entityType !== 'ALL') where.entityType = entityType;
    if (search) {
      where.OR = [
        { summary: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
        { actor: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [logs, total, activeSessionsCount, controlledMedCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: { select: { id: true, fullName: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
      prisma.userSession.count({ where: { expire: { gt: new Date() } } }),
      prisma.auditLog.count({ where: { action: 'CONTROLLED_MED_DISPENSED' } }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        stats: {
          totalEvents: total,
          activeSessionsCount,
          controlledMedCount,
        },
      },
      meta: buildPaginationMeta(page, limit, total),
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 2. USER & ROLE MANAGEMENT (Soft Deactivation + Remote Session Revocation)
// ============================================================================
const createUserSchema = z.object({
  email: z.string().trim().email(),
  staffCode: z.string().trim().optional().nullable(),
  fullName: z.string().trim().min(2),
  role: z.nativeEnum(UserRole),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  staffCode: z.string().trim().optional().nullable(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
  newPassword: z.string().min(8).optional(),
});

usersRouter.use(requireAuth, requireRole(...GOVERNANCE_ROLES));

usersRouter.get('/', async (_req, res, next) => {
  try {
    const [users, sessions] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          staffCode: true,
          fullName: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
      }),
      prisma.userSession.findMany({
        where: { expire: { gt: new Date() } },
        orderBy: { expire: 'desc' },
      }),
    ]);

    const activeSessions = sessions.map((s) => {
      const sessObj = (s.sess ?? {}) as { userId?: string; role?: string };
      const owner = users.find((u) => u.id === sessObj.userId);
      return {
        sidPreview: `${s.sid.slice(0, 8)}...`,
        userId: sessObj.userId ?? null,
        userName: owner?.fullName ?? 'Anonymous / Pre-Login',
        userRole: owner?.role ?? sessObj.role ?? 'UNKNOWN',
        expire: s.expire,
      };
    });

    res.json({ success: true, data: { users, activeSessions } });
  } catch (err) {
    next(err);
  }
});

usersRouter.post('/', validateBody(createUserSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createUserSchema>;
    const actor = req.user!;

    if (actor.role === UserRole.MEDICAL_ADMIN && body.role === UserRole.SUPER_ADMIN) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Medical Admin cannot provision Super Admin accounts.'
      );
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const created = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        staffCode: body.staffCode || null,
        fullName: body.fullName,
        role: body.role,
        passwordHash,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        staffCode: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await writeAuditLog({
      actorUserId: actor.id,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: created.id,
      summary: `Provisioned user ${created.fullName} (${created.role}).`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

usersRouter.patch('/:id', validateBody(updateUserSchema), async (req, res, next) => {
  try {
    const targetId = String(req.params.id);
    const body = req.body as z.infer<typeof updateUserSchema>;
    const actor = req.user!;

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw new AppError(404, 'USER_NOT_FOUND', 'User account not found.');

    if (
      actor.role === UserRole.MEDICAL_ADMIN &&
      (target.role === UserRole.SUPER_ADMIN || body.role === UserRole.SUPER_ADMIN)
    ) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Medical Admin cannot modify or elevate Super Admin accounts.'
      );
    }

    if (targetId === actor.id && body.isActive === false) {
      throw new AppError(400, 'SELF_DEACTIVATE_BLOCKED', 'You cannot deactivate your own active account.');
    }

    const updateData: Prisma.UserUpdateInput = {
      ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
      ...(body.staffCode !== undefined ? { staffCode: body.staffCode || null } : {}),
      ...(body.role !== undefined ? { role: body.role } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.newPassword
        ? { passwordHash: await bcrypt.hash(body.newPassword, 12) }
        : {}),
    };

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: updateData,
      select: {
        id: true,
        email: true,
        staffCode: true,
        fullName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
      },
    });

    // If deactivated, also revoke all active sessions for this user immediately
    if (body.isActive === false) {
      await prisma.$executeRaw`
        DELETE FROM "user_sessions"
        WHERE sess->>'userId' = ${targetId}
      `;
    }

    await writeAuditLog({
      actorUserId: actor.id,
      action: body.isActive === false ? 'USER_DEACTIVATED' : 'USER_UPDATED',
      entityType: 'User',
      entityId: updated.id,
      summary: `Updated account ${updated.fullName} (Role: ${updated.role}, Active: ${updated.isActive}).`,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// Remote session revocation (deletes matching PostgreSQL user_sessions rows)
usersRouter.delete('/:id/sessions', async (req, res, next) => {
  try {
    const targetId = String(req.params.id);
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw new AppError(404, 'USER_NOT_FOUND', 'User account not found.');

    if (
      req.user!.role === UserRole.MEDICAL_ADMIN &&
      target.role === UserRole.SUPER_ADMIN
    ) {
      throw new AppError(403, 'FORBIDDEN', 'Medical Admin cannot terminate Super Admin sessions.');
    }

    const removedCount = await prisma.$executeRaw`
      DELETE FROM "user_sessions"
      WHERE sess->>'userId' = ${targetId}
    `;

    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'SESSIONS_REVOKED',
      entityType: 'User',
      entityId: target.id,
      summary: `Revoked ${removedCount} active session(s) for ${target.fullName}.`,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: { revokedCount: Number(removedCount) } });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 3. SYSTEM SETTINGS
// ============================================================================
const updateSettingSchema = z.object({
  category: z.string().trim().min(1).optional(),
  valueJson: z.record(z.any()),
});

settingsRouter.use(requireAuth);

function normalizeEventProfile(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = { ...(raw as Record<string, unknown>) };
  if (
    typeof obj.eventName === 'string' &&
    (/baust\s*cse\s*fest/i.test(obj.eventName) || /emrms/i.test(obj.eventName))
  ) {
    obj.eventName = 'Medical & Resource Management System For Any Event';
  }
  return obj;
}

// Read-only active event profile accessible to all authenticated roles (for global header)
settingsRouter.get('/event-profile', async (_req, res, next) => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'event.profile' },
      select: { key: true, valueJson: true, updatedAt: true },
    });
    res.json({
      success: true,
      data: normalizeEventProfile(setting?.valueJson),
    });
  } catch (err) {
    next(err);
  }
});

settingsRouter.use(requireRole(...GOVERNANCE_ROLES));

settingsRouter.get('/', async (_req, res, next) => {
  try {
    const settings = await prisma.systemSetting.findMany({
      include: { updatedBy: { select: { fullName: true } } },
      orderBy: { key: 'asc' },
    });
    const normalized = settings.map((s) =>
      s.key === 'event.profile'
        ? { ...s, valueJson: normalizeEventProfile(s.valueJson) ?? s.valueJson }
        : s
    );
    res.json({ success: true, data: normalized });
  } catch (err) {
    next(err);
  }
});

settingsRouter.patch(
  '/:key',
  validateBody(updateSettingSchema),
  async (req, res, next) => {
    try {
      const key = String(req.params.key);
      const body = req.body as z.infer<typeof updateSettingSchema>;

      if (key === 'telemetry.polling' && req.user!.role !== UserRole.SUPER_ADMIN) {
        throw new AppError(
          403,
          'FORBIDDEN',
          'Only Super Admin can modify system polling and session timeout settings.'
        );
      }

      let nextValueJson: Record<string, unknown> = { ...body.valueJson };

      if (key === 'event.profile') {
        const rawName = nextValueJson.eventName;
        if (typeof rawName !== 'string' || rawName.trim().length === 0) {
          throw new AppError(
            400,
            'INVALID_EVENT_NAME',
            'Event name is required and cannot be empty.'
          );
        }
        if (rawName.trim().length > 120) {
          throw new AppError(
            400,
            'INVALID_EVENT_NAME',
            'Event name must be 120 characters or fewer.'
          );
        }

        const existing = await prisma.systemSetting.findUnique({
          where: { key },
          select: { valueJson: true },
        });
        const existingObj =
          existing?.valueJson && typeof existing.valueJson === 'object' && !Array.isArray(existing.valueJson)
            ? (existing.valueJson as Record<string, unknown>)
            : {};

        nextValueJson = {
          ...existingObj,
          ...nextValueJson,
          eventName: rawName.trim(),
        };
      }

      const saved = await prisma.systemSetting.upsert({
        where: { key },
        update: {
          valueJson: nextValueJson as Prisma.InputJsonValue,
          updatedByUserId: req.user!.id,
        },
        create: {
          key,
          category: body.category ?? 'system',
          valueJson: nextValueJson as Prisma.InputJsonValue,
          updatedByUserId: req.user!.id,
        },
      });

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'SETTING_UPDATED',
        entityType: 'SystemSetting',
        entityId: key,
        summary: `Updated system configuration "${key}".`,
        afterJson: nextValueJson as Prisma.InputJsonValue,
        ipAddress: req.ip,
      });

      res.json({ success: true, data: saved });
    } catch (err) {
      next(err);
    }
  }
);
