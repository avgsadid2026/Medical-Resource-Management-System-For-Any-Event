import {
  BedStatus,
  ClinicalNoteType,
  IncidentCategory,
  IncidentStatus,
  Prisma,
  TriagePriority,
  UserRole,
} from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { AppError } from '../../utils/AppError';
import { writeAuditLog } from '../../utils/audit';
import {
  buildPaginationMeta,
  generateCode,
  parsePagination,
} from '../../utils/pagination';
import { canViewPhi, sanitizeIncidentForRole } from '../../utils/serializers';

export const incidentsRouter = Router();

const reportIncidentSchema = z.object({
  locationText: z.string().trim().min(3, 'Location is required'),
  chiefComplaint: z.string().trim().min(3, 'Brief description is required'),
  category: z.nativeEnum(IncidentCategory).default(IncidentCategory.OTHER),
  triagePriority: z
    .nativeEnum(TriagePriority)
    .optional()
    .default(TriagePriority.UNTRIAGED),
  stationId: z.string().optional().nullable(),
});

const createIncidentSchema = z.object({
  patientId: z.string().optional().nullable(),
  stationId: z.string().optional().nullable(),
  bedId: z.string().optional().nullable(),
  leadDoctorId: z.string().optional().nullable(),
  leadNurseId: z.string().optional().nullable(),
  triagePriority: z.nativeEnum(TriagePriority).default(TriagePriority.P2_URGENT),
  status: z.nativeEnum(IncidentStatus).default(IncidentStatus.TRIAGE),
  category: z.nativeEnum(IncidentCategory).default(IncidentCategory.OTHER),
  chiefComplaint: z.string().trim().min(3),
  hpiNotes: z.string().optional().nullable(),
  gcsScore: z.coerce.number().int().min(3).max(15).optional().nullable(),
  locationText: z.string().trim().min(2),
});

const updateIncidentSchema = z.object({
  patientId: z.string().optional().nullable(),
  stationId: z.string().optional().nullable(),
  leadDoctorId: z.string().optional().nullable(),
  leadNurseId: z.string().optional().nullable(),
  triagePriority: z.nativeEnum(TriagePriority).optional(),
  status: z.nativeEnum(IncidentStatus).optional(),
  category: z.nativeEnum(IncidentCategory).optional(),
  chiefComplaint: z.string().trim().min(3).optional(),
  hpiNotes: z.string().optional().nullable(),
  gcsScore: z.coerce.number().int().min(3).max(15).optional().nullable(),
  locationText: z.string().trim().min(2).optional(),
  dischargeChecklistJson: z.any().optional(),
});

const assignBedSchema = z.object({
  bedId: z.string().min(1, 'bedId is required'),
});

// Volunteer (and all roles) quick incident report — creates non-PHI reported ticket
incidentsRouter.post(
  '/report',
  requireAuth,
  validateBody(reportIncidentSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof reportIncidentSchema>;
      const actor = req.user!;

      // Volunteers always submit as UNTRIAGED + REPORTED until clinical staff triages
      const priority =
        actor.role === UserRole.VOLUNTEER
          ? TriagePriority.UNTRIAGED
          : body.triagePriority;

      const incident = await prisma.$transaction(async (tx) => {
        const created = await tx.medicalIncident.create({
          data: {
            incidentCode: generateCode('INC'),
            patientId: null,
            stationId: body.stationId || null,
            reportedByUserId: actor.id,
            triagePriority: priority,
            status: IncidentStatus.REPORTED,
            category: body.category,
            chiefComplaint: body.chiefComplaint,
            locationText: body.locationText,
          },
          include: {
            station: { select: { id: true, code: true, name: true } },
          },
        });

        await tx.clinicalNote.create({
          data: {
            incidentId: created.id,
            authorUserId: actor.id,
            milestoneType: ClinicalNoteType.REPORTED,
            title: 'Incident Reported',
            notes: `${body.chiefComplaint} (Location: ${body.locationText})`,
          },
        });

        await writeAuditLog(
          {
            actorUserId: actor.id,
            action: 'INCIDENT_REPORTED',
            entityType: 'MedicalIncident',
            entityId: created.id,
            summary: `Reported incident ${created.incidentCode} at ${created.locationText}.`,
            ipAddress: req.ip,
          },
          tx
        );

        return created;
      });

      res.status(201).json({
        success: true,
        data: sanitizeIncidentForRole(incident, actor.role),
      });
    } catch (err) {
      next(err);
    }
  }
);

// Volunteer's own submitted reports (strictly non-PHI)
incidentsRouter.get('/my-reports', requireAuth, async (req, res, next) => {
  try {
    const reports = await prisma.medicalIncident.findMany({
      where: { reportedByUserId: req.user!.id },
      include: { station: { select: { id: true, code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: reports.map((r) => sanitizeIncidentForRole(r, UserRole.VOLUNTEER)),
    });
  } catch (err) {
    next(err);
  }
});

// List incidents (Staff only; Volunteers redirected to /my-reports behavior)
incidentsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const role = req.user!.role;
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search ?? '').trim();
    const status = req.query.status ? String(req.query.status) : undefined;
    const priority = req.query.priority ? String(req.query.priority) : undefined;
    const stationId = req.query.stationId ? String(req.query.stationId) : undefined;
    const category = req.query.category ? String(req.query.category) : undefined;

    const where: Prisma.MedicalIncidentWhereInput = {};
    if (role === UserRole.VOLUNTEER) {
      where.reportedByUserId = req.user!.id;
    }
    if (status && status !== 'ALL') where.status = status as IncidentStatus;
    if (priority && priority !== 'ALL') where.triagePriority = priority as TriagePriority;
    if (stationId && stationId !== 'ALL') where.stationId = stationId;
    if (category && category !== 'ALL') where.category = category as IncidentCategory;
    if (search) {
      where.OR = [
        { incidentCode: { contains: search, mode: 'insensitive' } },
        { chiefComplaint: { contains: search, mode: 'insensitive' } },
        { locationText: { contains: search, mode: 'insensitive' } },
        ...(canViewPhi(role)
          ? [{ patient: { fullName: { contains: search, mode: 'insensitive' as const } } }]
          : []),
      ];
    }

    const [items, total] = await Promise.all([
      prisma.medicalIncident.findMany({
        where,
        include: {
          patient: true,
          station: { select: { id: true, code: true, name: true } },
          bed: { select: { id: true, bedCode: true, status: true } },
          leadDoctor: { select: { id: true, fullName: true } },
          leadNurse: { select: { id: true, fullName: true } },
          vitals: { orderBy: { recordedAt: 'desc' }, take: 1 },
        },
        orderBy: { admittedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.medicalIncident.count({ where }),
    ]);

    res.json({
      success: true,
      data: items.map((inc) => sanitizeIncidentForRole(inc, role)),
      meta: buildPaginationMeta(page, limit, total),
    });
  } catch (err) {
    next(err);
  }
});

// Clinical & Admin full incident creation (supports transactional initial bed assignment)
incidentsRouter.post(
  '/',
  requireAuth,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.MEDICAL_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE
  ),
  validateBody(createIncidentSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createIncidentSchema>;
      const actor = req.user!;

      const incident = await prisma.$transaction(async (tx) => {
        let resolvedStationId = body.stationId || null;
        let resolvedBedId: string | null = null;

        if (body.bedId) {
          const bed = await tx.stationBed.findUnique({ where: { id: body.bedId } });
          if (!bed) throw new AppError(404, 'BED_NOT_FOUND', 'Selected bed not found.');
          if (bed.status !== BedStatus.AVAILABLE) {
            throw new AppError(
              409,
              'BED_NOT_AVAILABLE',
              `Bed ${bed.bedCode} is currently ${bed.status}.`
            );
          }
          resolvedStationId = bed.stationId;
          resolvedBedId = bed.id;

          if (body.status !== IncidentStatus.DISCHARGED) {
            await tx.stationBed.update({
              where: { id: bed.id },
              data: { status: BedStatus.OCCUPIED },
            });
          }
        }

        const created = await tx.medicalIncident.create({
          data: {
            incidentCode: generateCode('INC'),
            patientId: body.patientId || null,
            stationId: resolvedStationId,
            bedId: resolvedBedId,
            leadDoctorId: body.leadDoctorId || null,
            leadNurseId: body.leadNurseId || null,
            reportedByUserId: actor.id,
            triagePriority: body.triagePriority,
            status: body.status,
            category: body.category,
            chiefComplaint: body.chiefComplaint,
            hpiNotes: body.hpiNotes || null,
            gcsScore: body.gcsScore ?? null,
            locationText: body.locationText,
            dischargedAt: body.status === IncidentStatus.DISCHARGED ? new Date() : null,
          },
          include: {
            patient: true,
            station: { select: { id: true, code: true, name: true } },
            bed: { select: { id: true, bedCode: true, status: true } },
            leadDoctor: { select: { id: true, fullName: true } },
            leadNurse: { select: { id: true, fullName: true } },
          },
        });

        await tx.clinicalNote.create({
          data: {
            incidentId: created.id,
            authorUserId: actor.id,
            milestoneType: ClinicalNoteType.FIELD_RESPONSE,
            title: 'Incident Logged & Triaged',
            notes: `${created.chiefComplaint} (${created.triagePriority})`,
          },
        });

        await writeAuditLog(
          {
            actorUserId: actor.id,
            action: 'INCIDENT_CREATED',
            entityType: 'MedicalIncident',
            entityId: created.id,
            summary: `Logged incident ${created.incidentCode} (${created.triagePriority}).`,
            ipAddress: req.ip,
          },
          tx
        );

        return created;
      });

      res.status(201).json({ success: true, data: incident });
    } catch (err) {
      next(err);
    }
  }
);

// Single incident detail
incidentsRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const incident = await prisma.medicalIncident.findUnique({
      where: { id: String(req.params.id) },
      include: {
        patient: true,
        station: true,
        bed: true,
        leadDoctor: true,
        leadNurse: true,
        vitals: { orderBy: { recordedAt: 'desc' } },
        clinicalNotes: {
          include: { author: { select: { fullName: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
        dispensations: {
          include: {
            batch: { include: { medicine: true } },
            administeredBy: { select: { fullName: true } },
            verifiedBy: { select: { fullName: true } },
          },
          orderBy: { dispensedAt: 'desc' },
        },
      },
    });

    if (!incident) {
      throw new AppError(404, 'INCIDENT_NOT_FOUND', 'Incident not found.');
    }

    if (
      req.user!.role === UserRole.VOLUNTEER &&
      incident.reportedByUserId !== req.user!.id
    ) {
      throw new AppError(403, 'FORBIDDEN', 'Volunteers can only view their own reported incidents.');
    }

    res.json({
      success: true,
      data: sanitizeIncidentForRole(incident, req.user!.role),
    });
  } catch (err) {
    next(err);
  }
});

// Update incident (Clinical, Admin, or Dispatcher for station routing)
incidentsRouter.patch(
  '/:id',
  requireAuth,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.MEDICAL_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.DISPATCHER
  ),
  validateBody(updateIncidentSchema),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const body = req.body as z.infer<typeof updateIncidentSchema>;
      const actor = req.user!;

      const existing = await prisma.medicalIncident.findUnique({ where: { id } });
      if (!existing) throw new AppError(404, 'INCIDENT_NOT_FOUND', 'Incident not found.');

      // Dispatchers may only update routing (stationId, status) — not clinical HPI/GCS/checklist
      const updateData: Prisma.MedicalIncidentUncheckedUpdateInput =
        actor.role === UserRole.DISPATCHER
          ? {
              stationId: body.stationId !== undefined ? body.stationId : existing.stationId,
              status: body.status ?? existing.status,
            }
          : {
              patientId: body.patientId !== undefined ? body.patientId : existing.patientId,
              stationId: body.stationId !== undefined ? body.stationId : existing.stationId,
              leadDoctorId: body.leadDoctorId !== undefined ? body.leadDoctorId : existing.leadDoctorId,
              leadNurseId: body.leadNurseId !== undefined ? body.leadNurseId : existing.leadNurseId,
              triagePriority: body.triagePriority ?? existing.triagePriority,
              status: body.status ?? existing.status,
              category: body.category ?? existing.category,
              chiefComplaint: body.chiefComplaint ?? existing.chiefComplaint,
              hpiNotes: body.hpiNotes !== undefined ? body.hpiNotes : existing.hpiNotes,
              gcsScore: body.gcsScore !== undefined ? body.gcsScore : existing.gcsScore,
              locationText: body.locationText ?? existing.locationText,
              dischargeChecklistJson:
                body.dischargeChecklistJson !== undefined
                  ? body.dischargeChecklistJson
                  : (existing.dischargeChecklistJson as Prisma.InputJsonValue | undefined),
            };

      const updated = await prisma.medicalIncident.update({
        where: { id },
        data: updateData,
        include: {
          patient: true,
          station: { select: { id: true, code: true, name: true } },
          bed: { select: { id: true, bedCode: true, status: true } },
          leadDoctor: { select: { id: true, fullName: true } },
          leadNurse: { select: { id: true, fullName: true } },
        },
      });

      await writeAuditLog({
        actorUserId: actor.id,
        action: 'INCIDENT_UPDATED',
        entityType: 'MedicalIncident',
        entityId: updated.id,
        summary: `Updated incident ${updated.incidentCode} (Status: ${updated.status}, Priority: ${updated.triagePriority}).`,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        data: sanitizeIncidentForRole(updated, actor.role),
      });
    } catch (err) {
      next(err);
    }
  }
);

// Transactional bed allocation (prevents race conditions via PostgreSQL transaction + partial unique index)
incidentsRouter.post(
  '/:id/assign-bed',
  requireAuth,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.MEDICAL_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.DISPATCHER
  ),
  validateBody(assignBedSchema),
  async (req, res, next) => {
    try {
      const incidentId = String(req.params.id);
      const { bedId } = req.body as z.infer<typeof assignBedSchema>;
      const actor = req.user!;

      const updated = await prisma.$transaction(async (tx) => {
        const incident = await tx.medicalIncident.findUnique({ where: { id: incidentId } });
        if (!incident) throw new AppError(404, 'INCIDENT_NOT_FOUND', 'Incident not found.');
        if (incident.status === IncidentStatus.DISCHARGED) {
          throw new AppError(400, 'INCIDENT_DISCHARGED', 'Cannot assign a bed to a discharged incident.');
        }

        const newBed = await tx.stationBed.findUnique({ where: { id: bedId } });
        if (!newBed) throw new AppError(404, 'BED_NOT_FOUND', 'Target bed not found.');
        if (newBed.status !== BedStatus.AVAILABLE && incident.bedId !== newBed.id) {
          throw new AppError(
            409,
            'BED_ALREADY_OCCUPIED',
            `Bed ${newBed.bedCode} is not available (${newBed.status}).`
          );
        }

        // Release old bed if moving beds
        if (incident.bedId && incident.bedId !== newBed.id) {
          await tx.stationBed.update({
            where: { id: incident.bedId },
            data: { status: BedStatus.AVAILABLE },
          });
        }

        // Occupy new bed and sync incident.stationId with newBed.stationId
        await tx.stationBed.update({
          where: { id: newBed.id },
          data: { status: BedStatus.OCCUPIED },
        });

        const saved = await tx.medicalIncident.update({
          where: { id: incidentId },
          data: {
            bedId: newBed.id,
            stationId: newBed.stationId,
            status:
              incident.status === IncidentStatus.REPORTED
                ? IncidentStatus.TRIAGE
                : incident.status,
          },
          include: {
            station: { select: { id: true, code: true, name: true } },
            bed: { select: { id: true, bedCode: true, status: true } },
          },
        });

        await tx.clinicalNote.create({
          data: {
            incidentId,
            authorUserId: actor.id,
            milestoneType: ClinicalNoteType.STATION_TRANSFER,
            title: `Assigned Bed ${newBed.bedCode}`,
            notes: `Patient placed in ${saved.station?.name ?? 'Station'} — Bed ${newBed.bedCode}.`,
          },
        });

        await writeAuditLog(
          {
            actorUserId: actor.id,
            action: 'BED_ASSIGNED',
            entityType: 'MedicalIncident',
            entityId: incidentId,
            summary: `Assigned bed ${newBed.bedCode} to ${saved.incidentCode}.`,
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

// Transactional discharge (Doctor / Medical Admin / Super Admin) — frees bed atomically
incidentsRouter.post(
  '/:id/discharge',
  requireAuth,
  requireRole(UserRole.SUPER_ADMIN, UserRole.MEDICAL_ADMIN, UserRole.DOCTOR),
  async (req, res, next) => {
    try {
      const incidentId = String(req.params.id);
      const actor = req.user!;

      const updated = await prisma.$transaction(async (tx) => {
        const incident = await tx.medicalIncident.findUnique({ where: { id: incidentId } });
        if (!incident) throw new AppError(404, 'INCIDENT_NOT_FOUND', 'Incident not found.');
        if (incident.status === IncidentStatus.DISCHARGED) {
          throw new AppError(400, 'ALREADY_DISCHARGED', 'Incident is already discharged.');
        }

        if (incident.bedId) {
          await tx.stationBed.update({
            where: { id: incident.bedId },
            data: { status: BedStatus.AVAILABLE },
          });
        }

        const saved = await tx.medicalIncident.update({
          where: { id: incidentId },
          data: {
            status: IncidentStatus.DISCHARGED,
            dischargedAt: new Date(),
          },
        });

        await tx.clinicalNote.create({
          data: {
            incidentId,
            authorUserId: actor.id,
            milestoneType: ClinicalNoteType.DISCHARGE,
            title: 'Patient Discharged',
            notes: `Cleared and discharged by ${actor.fullName}. Bed released.`,
          },
        });

        await writeAuditLog(
          {
            actorUserId: actor.id,
            action: 'INCIDENT_DISCHARGED',
            entityType: 'MedicalIncident',
            entityId: incidentId,
            summary: `Discharged incident ${saved.incidentCode} and released bed.`,
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
