import {
  BedStatus,
  IncidentStatus,
  StationStatus,
  StationType,
  UserRole,
} from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { AppError } from '../../utils/AppError';
import { writeAuditLog } from '../../utils/audit';
import { canViewPhi } from '../../utils/serializers';

export const stationsRouter = Router();

const createStationSchema = z.object({
  code: z.string().trim().min(2),
  name: z.string().trim().min(2),
  sector: z.string().trim().min(2),
  locationDesc: z.string().trim().min(2),
  stationType: z.nativeEnum(StationType).default(StationType.FIELD_POST),
  capacity: z.coerce.number().int().min(0).default(4),
  status: z.nativeEnum(StationStatus).default(StationStatus.OPERATIONAL),
});

const createBedSchema = z.object({
  bedCode: z.string().trim().min(1),
  status: z.nativeEnum(BedStatus).default(BedStatus.AVAILABLE),
});

const updateBedSchema = z.object({
  status: z.nativeEnum(BedStatus),
});

stationsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const role = req.user!.role;

    // Volunteers receive only non-sensitive campus station directory
    if (role === UserRole.VOLUNTEER) {
      const stations = await prisma.medicalStation.findMany({
        where: { stationType: StationType.FIELD_POST },
        select: {
          id: true,
          code: true,
          name: true,
          sector: true,
          locationDesc: true,
          status: true,
        },
        orderBy: { code: 'asc' },
      });
      res.json({ success: true, data: stations });
      return;
    }

    const stations = await prisma.medicalStation.findMany({
      include: {
        beds: {
          include: {
            incidents: {
              where: { status: { not: IncidentStatus.DISCHARGED } },
              include: {
                patient: canViewPhi(role)
                  ? { select: { id: true, recordCode: true, fullName: true } }
                  : false,
                leadDoctor: { select: { id: true, fullName: true } },
              },
              take: 1,
            },
          },
          orderBy: { bedCode: 'asc' },
        },
        doctors: {
          select: { id: true, fullName: true, isStationLead: true, dutyStatus: true },
        },
        nurses: {
          select: { id: true, fullName: true, dutyStatus: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    res.json({ success: true, data: stations });
  } catch (err) {
    next(err);
  }
});

stationsRouter.post(
  '/',
  requireAuth,
  requireRole(UserRole.SUPER_ADMIN, UserRole.MEDICAL_ADMIN),
  validateBody(createStationSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createStationSchema>;
      const created = await prisma.medicalStation.create({ data: body });

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'STATION_CREATED',
        entityType: 'MedicalStation',
        entityId: created.id,
        summary: `Registered medical station ${created.code} — ${created.name}.`,
        ipAddress: req.ip,
      });

      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }
);

stationsRouter.patch(
  '/:id',
  requireAuth,
  requireRole(UserRole.SUPER_ADMIN, UserRole.MEDICAL_ADMIN, UserRole.DISPATCHER),
  validateBody(createStationSchema.partial()),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const updated = await prisma.medicalStation.update({
        where: { id },
        data: req.body,
      });

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'STATION_UPDATED',
        entityType: 'MedicalStation',
        entityId: updated.id,
        summary: `Updated station ${updated.code} (Status: ${updated.status}).`,
        ipAddress: req.ip,
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

stationsRouter.post(
  '/:id/beds',
  requireAuth,
  requireRole(UserRole.SUPER_ADMIN, UserRole.MEDICAL_ADMIN),
  validateBody(createBedSchema),
  async (req, res, next) => {
    try {
      const stationId = String(req.params.id);
      const body = req.body as z.infer<typeof createBedSchema>;
      const bed = await prisma.stationBed.create({
        data: {
          stationId,
          bedCode: body.bedCode,
          status: body.status,
        },
      });

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'BED_CREATED',
        entityType: 'StationBed',
        entityId: bed.id,
        summary: `Added bed ${bed.bedCode} to station.`,
        ipAddress: req.ip,
      });

      res.status(201).json({ success: true, data: bed });
    } catch (err) {
      next(err);
    }
  }
);

stationsRouter.patch(
  '/beds/:bedId',
  requireAuth,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.MEDICAL_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.DISPATCHER
  ),
  validateBody(updateBedSchema),
  async (req, res, next) => {
    try {
      const bedId = String(req.params.bedId);
      const { status } = req.body as z.infer<typeof updateBedSchema>;

      const activeIncident = await prisma.medicalIncident.findFirst({
        where: { bedId, status: { not: IncidentStatus.DISCHARGED } },
      });

      if (activeIncident && status !== BedStatus.OCCUPIED) {
        throw new AppError(
          409,
          'BED_HAS_ACTIVE_INCIDENT',
          `Bed is currently assigned to active incident ${activeIncident.incidentCode}. Discharge or transfer first.`
        );
      }

      const updated = await prisma.stationBed.update({
        where: { id: bedId },
        data: { status },
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);
