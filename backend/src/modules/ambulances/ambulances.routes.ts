import {
  AmbulanceStatus,
  AmbulanceTier,
  DispatchPriority,
  DispatchStatus,
  UserRole,
} from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { AppError } from '../../utils/AppError';
import { writeAuditLog } from '../../utils/audit';

export const ambulancesRouter = Router();

const STAFF_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.MEDICAL_ADMIN,
  UserRole.DOCTOR,
  UserRole.NURSE,
  UserRole.DISPATCHER,
];

const ambulanceSchema = z.object({
  callsign: z.string().trim().min(2),
  plateNumber: z.string().trim().min(2),
  tier: z.nativeEnum(AmbulanceTier),
  driverName: z.string().trim().min(2),
  paramedicLead: z.string().trim().min(2),
  stationId: z.string().optional().nullable(),
  status: z.nativeEnum(AmbulanceStatus).default(AmbulanceStatus.STANDBY),
  fuelPct: z.coerce.number().int().min(0).max(100).optional().nullable(),
  equipmentSummary: z.string().trim().optional().nullable(),
});

const dispatchSchema = z.object({
  ambulanceId: z.string().min(1),
  incidentId: z.string().optional().nullable(),
  destinationHospital: z.string().trim().min(2),
  priority: z.nativeEnum(DispatchPriority).default(DispatchPriority.URGENT),
  etaMinutes: z.coerce.number().int().min(0).optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

const updateDispatchSchema = z.object({
  status: z.nativeEnum(DispatchStatus),
  etaMinutes: z.coerce.number().int().min(0).optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

ambulancesRouter.use(requireAuth, requireRole(...STAFF_ROLES));

ambulancesRouter.get('/', async (_req, res, next) => {
  try {
    const [ambulances, dispatches] = await Promise.all([
      prisma.ambulance.findMany({
        include: {
          station: { select: { id: true, code: true, name: true } },
          dispatches: {
            where: {
              status: { in: [DispatchStatus.DISPATCHED, DispatchStatus.EN_ROUTE, DispatchStatus.ARRIVED] },
            },
            include: {
              incident: { select: { id: true, incidentCode: true, triagePriority: true } },
            },
            orderBy: { dispatchedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { callsign: 'asc' },
      }),
      prisma.ambulanceDispatch.findMany({
        include: {
          ambulance: { select: { id: true, callsign: true, tier: true } },
          incident: { select: { id: true, incidentCode: true, triagePriority: true } },
          dispatchedBy: { select: { fullName: true } },
        },
        orderBy: { dispatchedAt: 'desc' },
        take: 15,
      }),
    ]);

    res.json({ success: true, data: { ambulances, dispatches } });
  } catch (err) {
    next(err);
  }
});

ambulancesRouter.post(
  '/',
  requireRole(UserRole.SUPER_ADMIN, UserRole.MEDICAL_ADMIN, UserRole.DISPATCHER),
  validateBody(ambulanceSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof ambulanceSchema>;
      const created = await prisma.ambulance.create({
        data: { ...body, stationId: body.stationId || null },
        include: { station: { select: { id: true, code: true, name: true } } },
      });

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'AMBULANCE_REGISTERED',
        entityType: 'Ambulance',
        entityId: created.id,
        summary: `Registered ambulance unit ${created.callsign} (${created.plateNumber}).`,
        ipAddress: req.ip,
      });

      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }
);

ambulancesRouter.patch(
  '/:id',
  requireRole(UserRole.SUPER_ADMIN, UserRole.MEDICAL_ADMIN, UserRole.DISPATCHER),
  validateBody(ambulanceSchema.partial()),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const updated = await prisma.ambulance.update({
        where: { id },
        data: {
          ...req.body,
          ...(req.body.stationId !== undefined
            ? { stationId: req.body.stationId || null }
            : {}),
        },
      });
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// Transactional ambulance dispatch
ambulancesRouter.post(
  '/dispatches',
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.MEDICAL_ADMIN,
    UserRole.DOCTOR,
    UserRole.DISPATCHER
  ),
  validateBody(dispatchSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof dispatchSchema>;
      const actor = req.user!;

      const dispatch = await prisma.$transaction(async (tx) => {
        const amb = await tx.ambulance.findUnique({ where: { id: body.ambulanceId } });
        if (!amb) throw new AppError(404, 'AMBULANCE_NOT_FOUND', 'Ambulance unit not found.');
        if (amb.status !== AmbulanceStatus.STANDBY) {
          throw new AppError(
            409,
            'AMBULANCE_UNAVAILABLE',
            `Unit ${amb.callsign} is currently ${amb.status} and cannot be dispatched.`
          );
        }

        await tx.ambulance.update({
          where: { id: amb.id },
          data: { status: AmbulanceStatus.EN_ROUTE },
        });

        const created = await tx.ambulanceDispatch.create({
          data: {
            ambulanceId: amb.id,
            incidentId: body.incidentId || null,
            dispatchedByUserId: actor.id,
            destinationHospital: body.destinationHospital,
            priority: body.priority,
            etaMinutes: body.etaMinutes ?? null,
            status: DispatchStatus.EN_ROUTE,
            notes: body.notes || null,
          },
          include: {
            ambulance: { select: { callsign: true } },
            incident: { select: { incidentCode: true } },
          },
        });

        await writeAuditLog(
          {
            actorUserId: actor.id,
            action: 'AMBULANCE_DISPATCHED',
            entityType: 'AmbulanceDispatch',
            entityId: created.id,
            summary: `Dispatched ${amb.callsign} to ${body.destinationHospital} (${body.priority}).`,
            ipAddress: req.ip,
          },
          tx
        );

        return created;
      });

      res.status(201).json({ success: true, data: dispatch });
    } catch (err) {
      next(err);
    }
  }
);

ambulancesRouter.patch(
  '/dispatches/:id',
  requireRole(UserRole.SUPER_ADMIN, UserRole.MEDICAL_ADMIN, UserRole.DISPATCHER),
  validateBody(updateDispatchSchema),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const body = req.body as z.infer<typeof updateDispatchSchema>;

      const updated = await prisma.$transaction(async (tx) => {
        const existing = await tx.ambulanceDispatch.findUnique({ where: { id } });
        if (!existing) throw new AppError(404, 'DISPATCH_NOT_FOUND', 'Dispatch record not found.');

        const isDone =
          body.status === DispatchStatus.COMPLETED ||
          body.status === DispatchStatus.CANCELLED;

        const saved = await tx.ambulanceDispatch.update({
          where: { id },
          data: {
            status: body.status,
            etaMinutes: body.etaMinutes !== undefined ? body.etaMinutes : existing.etaMinutes,
            notes: body.notes !== undefined ? body.notes : existing.notes,
            completedAt: isDone ? new Date() : null,
          },
        });

        if (isDone) {
          await tx.ambulance.update({
            where: { id: existing.ambulanceId },
            data: { status: AmbulanceStatus.STANDBY },
          });
        }

        await writeAuditLog(
          {
            actorUserId: req.user!.id,
            action: 'AMBULANCE_DISPATCH_UPDATED',
            entityType: 'AmbulanceDispatch',
            entityId: saved.id,
            summary: `Updated ambulance dispatch status to ${saved.status}.`,
            ipAddress: req.ip,
          },
          tx
        );

        return saved;
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);
