import { AlertSeverity, AlertStatus, UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { AppError } from '../../utils/AppError';
import { writeAuditLog } from '../../utils/audit';

export const alertsRouter = Router();

const STAFF_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.MEDICAL_ADMIN,
  UserRole.DOCTOR,
  UserRole.NURSE,
  UserRole.DISPATCHER,
];

const createAlertSchema = z.object({
  incidentId: z.string().optional().nullable(),
  severity: z.nativeEnum(AlertSeverity).default(AlertSeverity.P1_CRITICAL),
  title: z.string().trim().min(3),
  locationText: z.string().trim().min(2),
  description: z.string().trim().optional().nullable(),
});

alertsRouter.use(requireAuth, requireRole(...STAFF_ROLES));

alertsRouter.get('/', async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const severity = req.query.severity ? String(req.query.severity) : undefined;

    const alerts = await prisma.emergencyAlert.findMany({
      where: {
        ...(status && status !== 'ALL' ? { status: status as AlertStatus } : {}),
        ...(severity && severity !== 'ALL'
          ? { severity: severity as AlertSeverity }
          : {}),
      },
      include: {
        incident: {
          select: {
            id: true,
            incidentCode: true,
            triagePriority: true,
            status: true,
          },
        },
        createdBy: { select: { fullName: true, role: true } },
        acknowledgedBy: { select: { fullName: true, role: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ success: true, data: alerts });
  } catch (err) {
    next(err);
  }
});

alertsRouter.post(
  '/',
  requireRole(UserRole.SUPER_ADMIN, UserRole.MEDICAL_ADMIN, UserRole.DISPATCHER),
  validateBody(createAlertSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createAlertSchema>;
      const created = await prisma.emergencyAlert.create({
        data: {
          incidentId: body.incidentId || null,
          createdByUserId: req.user!.id,
          severity: body.severity,
          title: body.title,
          locationText: body.locationText,
          description: body.description || null,
          status: AlertStatus.ACTIVE,
        },
      });

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'EMERGENCY_ALERT_CREATED',
        entityType: 'EmergencyAlert',
        entityId: created.id,
        summary: `Triggered ${created.severity} alert: ${created.title}.`,
        ipAddress: req.ip,
      });

      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }
);

alertsRouter.patch('/:id/acknowledge', async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.emergencyAlert.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'ALERT_NOT_FOUND', 'Emergency alert not found.');

    const updated = await prisma.emergencyAlert.update({
      where: { id },
      data: {
        status: AlertStatus.INTERCEPTING,
        acknowledgedByUserId: req.user!.id,
        acknowledgedAt: new Date(),
      },
    });

    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'EMERGENCY_ALERT_ACKNOWLEDGED',
      entityType: 'EmergencyAlert',
      entityId: updated.id,
      summary: `Acknowledged alert "${updated.title}".`,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

alertsRouter.patch('/:id/resolve', async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.emergencyAlert.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'ALERT_NOT_FOUND', 'Emergency alert not found.');

    const updated = await prisma.emergencyAlert.update({
      where: { id },
      data: {
        status: AlertStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });

    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'EMERGENCY_ALERT_RESOLVED',
      entityType: 'EmergencyAlert',
      entityId: updated.id,
      summary: `Resolved alert "${updated.title}".`,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});
