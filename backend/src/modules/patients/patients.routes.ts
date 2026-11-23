import {
  AttendeeRole,
  ClinicalNoteType,
  PatientSex,
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

export const patientsRouter = Router();

// Strictly restricted to clinical & admin roles — Volunteers & Dispatchers get 403
const CLINICAL_ACCESS = [
  UserRole.SUPER_ADMIN,
  UserRole.MEDICAL_ADMIN,
  UserRole.DOCTOR,
  UserRole.NURSE,
];

const createPatientSchema = z.object({
  fullName: z.string().trim().min(2),
  age: z.coerce.number().int().min(0).max(130),
  sex: z.nativeEnum(PatientSex),
  bloodGroup: z.string().trim().max(10).optional().nullable(),
  attendeeRole: z.nativeEnum(AttendeeRole).default(AttendeeRole.STUDENT),
  institutionalId: z.string().trim().optional().nullable(),
  emergencyContactName: z.string().trim().optional().nullable(),
  emergencyContactPhone: z.string().trim().optional().nullable(),
  allergiesNotes: z.string().trim().optional().nullable(),
  medicalHistoryNotes: z.string().trim().optional().nullable(),
});

const vitalsSchema = z.object({
  incidentId: z.string().min(1),
  heartRate: z.coerce.number().int().min(1).max(300).optional().nullable(),
  bpSystolic: z.coerce.number().int().min(40).max(300).optional().nullable(),
  bpDiastolic: z.coerce.number().int().min(20).max(200).optional().nullable(),
  spo2: z.coerce.number().int().min(0).max(100).optional().nullable(),
  tempC: z.coerce.number().min(30).max(45).optional().nullable(),
  respRate: z.coerce.number().int().min(4).max(80).optional().nullable(),
  glucoseMgdl: z.coerce.number().int().min(10).max(900).optional().nullable(),
});

const noteSchema = z.object({
  incidentId: z.string().min(1),
  milestoneType: z.nativeEnum(ClinicalNoteType).default(ClinicalNoteType.ASSESSMENT),
  title: z.string().trim().min(2),
  notes: z.string().trim().min(2),
});

patientsRouter.use(requireAuth, requireRole(...CLINICAL_ACCESS));

patientsRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search ?? '').trim();

    const where = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { recordCode: { contains: search, mode: 'insensitive' as const } },
            { institutionalId: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        include: {
          incidents: {
            select: {
              id: true,
              incidentCode: true,
              triagePriority: true,
              status: true,
              chiefComplaint: true,
              admittedAt: true,
              station: { select: { name: true } },
            },
            orderBy: { admittedAt: 'desc' },
            take: 1,
          },
          _count: { select: { incidents: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.patient.count({ where }),
    ]);

    res.json({
      success: true,
      data: patients,
      meta: buildPaginationMeta(page, limit, total),
    });
  } catch (err) {
    next(err);
  }
});

patientsRouter.post(
  '/',
  validateBody(createPatientSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createPatientSchema>;
      const created = await prisma.patient.create({
        data: {
          recordCode: generateCode('PT'),
          ...body,
        },
      });

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'PATIENT_REGISTERED',
        entityType: 'Patient',
        entityId: created.id,
        summary: `Registered patient ${created.recordCode} (${created.fullName}).`,
        ipAddress: req.ip,
      });

      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }
);

patientsRouter.get('/:id', async (req, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: String(req.params.id) },
      include: {
        incidents: {
          include: {
            station: true,
            bed: true,
            leadDoctor: true,
            leadNurse: true,
            vitals: {
              include: { recordedBy: { select: { fullName: true } } },
              orderBy: { recordedAt: 'desc' },
            },
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
          orderBy: { admittedAt: 'desc' },
        },
      },
    });

    if (!patient) throw new AppError(404, 'PATIENT_NOT_FOUND', 'Patient record not found.');

    res.json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
});

patientsRouter.patch(
  '/:id',
  validateBody(createPatientSchema.partial()),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const updated = await prisma.patient.update({
        where: { id },
        data: req.body,
      });

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'PATIENT_UPDATED',
        entityType: 'Patient',
        entityId: updated.id,
        summary: `Updated patient dossier ${updated.recordCode}.`,
        ipAddress: req.ip,
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

patientsRouter.post(
  '/:id/vitals',
  validateBody(vitalsSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof vitalsSchema>;
      const vital = await prisma.patientVital.create({
        data: {
          incidentId: body.incidentId,
          recordedByUserId: req.user!.id,
          heartRate: body.heartRate ?? null,
          bpSystolic: body.bpSystolic ?? null,
          bpDiastolic: body.bpDiastolic ?? null,
          spo2: body.spo2 ?? null,
          tempC: body.tempC ?? null,
          respRate: body.respRate ?? null,
          glucoseMgdl: body.glucoseMgdl ?? null,
        },
      });

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'VITALS_LOGGED',
        entityType: 'MedicalIncident',
        entityId: body.incidentId,
        summary: `Logged vitals (HR: ${body.heartRate ?? '—'}, SpO2: ${body.spo2 ?? '—'}%, Temp: ${body.tempC ?? '—'}°C).`,
        ipAddress: req.ip,
      });

      res.status(201).json({ success: true, data: vital });
    } catch (err) {
      next(err);
    }
  }
);

patientsRouter.post(
  '/:id/notes',
  validateBody(noteSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof noteSchema>;
      const note = await prisma.clinicalNote.create({
        data: {
          incidentId: body.incidentId,
          authorUserId: req.user!.id,
          milestoneType: body.milestoneType,
          title: body.title,
          notes: body.notes,
        },
        include: { author: { select: { fullName: true, role: true } } },
      });

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'CLINICAL_NOTE_ADDED',
        entityType: 'MedicalIncident',
        entityId: body.incidentId,
        summary: `Added clinical note "${body.title}".`,
        ipAddress: req.ip,
      });

      res.status(201).json({ success: true, data: note });
    } catch (err) {
      next(err);
    }
  }
);
