import { DoctorDutyStatus, UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { writeAuditLog } from '../../utils/audit';

export const doctorsRouter = Router();

const STAFF_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.MEDICAL_ADMIN,
  UserRole.DOCTOR,
  UserRole.NURSE,
  UserRole.DISPATCHER,
];

const doctorSchema = z.object({
  fullName: z.string().trim().min(2),
  bmdcNumber: z.string().trim().min(2),
  specialization: z.string().trim().min(2),
  stationId: z.string().optional().nullable(),
  isStationLead: z.boolean().optional().default(false),
  radioChannel: z.string().trim().optional().nullable(),
  phoneExt: z.string().trim().optional().nullable(),
  dutyStatus: z.nativeEnum(DoctorDutyStatus).default(DoctorDutyStatus.ON_DUTY),
});

doctorsRouter.use(requireAuth, requireRole(...STAFF_ROLES));

doctorsRouter.get('/', async (req, res, next) => {
  try {
    const search = String(req.query.search ?? '').trim();
    const stationId = req.query.stationId ? String(req.query.stationId) : undefined;
    const dutyStatus = req.query.dutyStatus ? String(req.query.dutyStatus) : undefined;

    const doctors = await prisma.doctor.findMany({
      where: {
        ...(stationId && stationId !== 'ALL' ? { stationId } : {}),
        ...(dutyStatus && dutyStatus !== 'ALL'
          ? { dutyStatus: dutyStatus as DoctorDutyStatus }
          : {}),
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { bmdcNumber: { contains: search, mode: 'insensitive' } },
                { specialization: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        station: { select: { id: true, code: true, name: true } },
        _count: { select: { leadIncidents: true } },
      },
      orderBy: [{ isStationLead: 'desc' }, { fullName: 'asc' }],
    });

    res.json({ success: true, data: doctors });
  } catch (err) {
    next(err);
  }
});

doctorsRouter.post(
  '/',
  requireRole(UserRole.SUPER_ADMIN, UserRole.MEDICAL_ADMIN),
  validateBody(doctorSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof doctorSchema>;
      const created = await prisma.$transaction(async (tx) => {
        // Safely hand off station lead flag to respect uq_single_lead_doctor_per_station
        if (body.isStationLead && body.stationId) {
          await tx.doctor.updateMany({
            where: { stationId: body.stationId, isStationLead: true },
            data: { isStationLead: false },
          });
        }

        const doc = await tx.doctor.create({
          data: {
            fullName: body.fullName,
            bmdcNumber: body.bmdcNumber,
            specialization: body.specialization,
            stationId: body.stationId || null,
            isStationLead: body.isStationLead,
            radioChannel: body.radioChannel || null,
            phoneExt: body.phoneExt || null,
            dutyStatus: body.dutyStatus,
          },
          include: { station: { select: { id: true, code: true, name: true } } },
        });

        await writeAuditLog(
          {
            actorUserId: req.user!.id,
            action: 'DOCTOR_REGISTERED',
            entityType: 'Doctor',
            entityId: doc.id,
            summary: `Registered physician ${doc.fullName} (BMDC ${doc.bmdcNumber}).`,
            ipAddress: req.ip,
          },
          tx
        );

        return doc;
      });

      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }
);

doctorsRouter.patch(
  '/:id',
  requireRole(UserRole.SUPER_ADMIN, UserRole.MEDICAL_ADMIN, UserRole.DISPATCHER),
  validateBody(doctorSchema.partial()),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const body = req.body as Partial<z.infer<typeof doctorSchema>>;

      const updated = await prisma.$transaction(async (tx) => {
        const existing = await tx.doctor.findUniqueOrThrow({ where: { id } });
        const targetStationId =
          body.stationId !== undefined ? body.stationId : existing.stationId;
        const targetIsLead =
          body.isStationLead !== undefined ? body.isStationLead : existing.isStationLead;

        if (targetIsLead && targetStationId) {
          await tx.doctor.updateMany({
            where: {
              stationId: targetStationId,
              isStationLead: true,
              NOT: { id },
            },
            data: { isStationLead: false },
          });
        }

        const doc = await tx.doctor.update({
          where: { id },
          data: {
            ...body,
            stationId: targetStationId || null,
          },
          include: { station: { select: { id: true, code: true, name: true } } },
        });

        await writeAuditLog(
          {
            actorUserId: req.user!.id,
            action: 'DOCTOR_UPDATED',
            entityType: 'Doctor',
            entityId: doc.id,
            summary: `Updated physician ${doc.fullName} (Status: ${doc.dutyStatus}).`,
            ipAddress: req.ip,
          },
          tx
        );

        return doc;
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);
