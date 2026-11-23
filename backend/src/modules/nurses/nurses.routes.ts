import { NurseDutyStatus, UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { writeAuditLog } from '../../utils/audit';

export const nursesRouter = Router();

const STAFF_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.MEDICAL_ADMIN,
  UserRole.DOCTOR,
  UserRole.NURSE,
  UserRole.DISPATCHER,
];

const nurseSchema = z.object({
  fullName: z.string().trim().min(2),
  bnmcNumber: z.string().trim().min(2),
  specialty: z.string().trim().min(2),
  stationId: z.string().optional().nullable(),
  vhfCallsign: z.string().trim().optional().nullable(),
  isRapidResponder: z.boolean().optional().default(false),
  dutyStatus: z.nativeEnum(NurseDutyStatus).default(NurseDutyStatus.ON_DUTY),
});

nursesRouter.use(requireAuth, requireRole(...STAFF_ROLES));

nursesRouter.get('/', async (req, res, next) => {
  try {
    const search = String(req.query.search ?? '').trim();
    const stationId = req.query.stationId ? String(req.query.stationId) : undefined;
    const dutyStatus = req.query.dutyStatus ? String(req.query.dutyStatus) : undefined;

    const nurses = await prisma.nurse.findMany({
      where: {
        ...(stationId && stationId !== 'ALL' ? { stationId } : {}),
        ...(dutyStatus && dutyStatus !== 'ALL'
          ? { dutyStatus: dutyStatus as NurseDutyStatus }
          : {}),
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { bnmcNumber: { contains: search, mode: 'insensitive' } },
                { specialty: { contains: search, mode: 'insensitive' } },
                { vhfCallsign: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        station: { select: { id: true, code: true, name: true } },
        _count: { select: { leadIncidents: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    res.json({ success: true, data: nurses });
  } catch (err) {
    next(err);
  }
});

nursesRouter.post(
  '/',
  requireRole(UserRole.SUPER_ADMIN, UserRole.MEDICAL_ADMIN),
  validateBody(nurseSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof nurseSchema>;
      const created = await prisma.nurse.create({
        data: {
          ...body,
          stationId: body.stationId || null,
          vhfCallsign: body.vhfCallsign || null,
        },
        include: { station: { select: { id: true, code: true, name: true } } },
      });

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'NURSE_REGISTERED',
        entityType: 'Nurse',
        entityId: created.id,
        summary: `Registered nurse ${created.fullName} (BNMC ${created.bnmcNumber}).`,
        ipAddress: req.ip,
      });

      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }
);

nursesRouter.patch(
  '/:id',
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.MEDICAL_ADMIN,
    UserRole.NURSE,
    UserRole.DISPATCHER
  ),
  validateBody(nurseSchema.partial()),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const body = req.body as Partial<z.infer<typeof nurseSchema>>;
      const updated = await prisma.nurse.update({
        where: { id },
        data: {
          ...body,
          ...(body.stationId !== undefined ? { stationId: body.stationId || null } : {}),
          ...(body.vhfCallsign !== undefined ? { vhfCallsign: body.vhfCallsign || null } : {}),
        },
        include: { station: { select: { id: true, code: true, name: true } } },
      });

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'NURSE_UPDATED',
        entityType: 'Nurse',
        entityId: updated.id,
        summary: `Updated nurse ${updated.fullName} (Status: ${updated.dutyStatus}).`,
        ipAddress: req.ip,
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);
