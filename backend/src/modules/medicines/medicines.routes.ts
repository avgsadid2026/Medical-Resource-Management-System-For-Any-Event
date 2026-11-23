import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { AppError } from '../../utils/AppError';
import { writeAuditLog } from '../../utils/audit';

export const medicinesRouter = Router();

const STAFF_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.MEDICAL_ADMIN,
  UserRole.DOCTOR,
  UserRole.NURSE,
  UserRole.DISPATCHER,
];

const createMedicineSchema = z.object({
  skuCode: z.string().trim().min(2),
  name: z.string().trim().min(2),
  genericName: z.string().trim().min(2),
  category: z.string().trim().min(2),
  storageRequirement: z.string().trim().min(2),
  isControlled: z.boolean().default(false),
  unitLabel: z.string().trim().min(1),
  minParLevel: z.coerce.number().int().min(0),
});

const createBatchSchema = z.object({
  medicineId: z.string().min(1),
  stationId: z.string().min(1),
  batchNumber: z.string().trim().min(2),
  quantity: z.coerce.number().int().min(1),
  maxQuantity: z.coerce.number().int().min(1),
  expiryDate: z.string().min(4),
});

const dispenseSchema = z.object({
  incidentId: z.string().min(1),
  batchId: z.string().min(1),
  quantityDispensed: z.coerce.number().int().min(1),
  doseRoute: z.string().trim().min(2),
  verifiedByUserId: z.string().optional().nullable(),
});

medicinesRouter.use(requireAuth, requireRole(...STAFF_ROLES));

medicinesRouter.get('/', async (req, res, next) => {
  try {
    const search = String(req.query.search ?? '').trim();
    const category = req.query.category ? String(req.query.category) : undefined;
    const stationId = req.query.stationId ? String(req.query.stationId) : undefined;

    const medicines = await prisma.medicine.findMany({
      where: {
        ...(category && category !== 'ALL' ? { category } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { genericName: { contains: search, mode: 'insensitive' } },
                { skuCode: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        batches: {
          where: stationId && stationId !== 'ALL' ? { stationId } : {},
          include: {
            station: { select: { id: true, code: true, name: true, stationType: true } },
          },
          orderBy: { expiryDate: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Also include recent dispensation count & verifiers list for UI
    const [totalDispensations, verifiers] = await Promise.all([
      prisma.medicineDispensation.count(),
      prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: [UserRole.MEDICAL_ADMIN, UserRole.DOCTOR, UserRole.NURSE] },
        },
        select: { id: true, fullName: true, role: true },
        orderBy: { fullName: 'asc' },
      }),
    ]);

    const enriched = medicines.map((m) => {
      const totalQuantity = m.batches.reduce((sum, b) => sum + b.quantity, 0);
      const totalMax = m.batches.reduce((sum, b) => sum + b.maxQuantity, 0);
      const stockStatus =
        totalQuantity === 0 || totalQuantity < Math.ceil(m.minParLevel * 0.6)
          ? 'CRITICAL'
          : totalQuantity < m.minParLevel
          ? 'LOW'
          : 'OPTIMAL';
      return {
        ...m,
        totalQuantity,
        totalMax,
        stockStatus,
      };
    });

    res.json({
      success: true,
      data: {
        medicines: enriched,
        totalDispensations,
        verifiers,
      },
    });
  } catch (err) {
    next(err);
  }
});

medicinesRouter.post(
  '/',
  requireRole(UserRole.SUPER_ADMIN, UserRole.MEDICAL_ADMIN, UserRole.DISPATCHER),
  validateBody(createMedicineSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createMedicineSchema>;
      const created = await prisma.medicine.create({ data: body });

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'MEDICINE_SKU_CREATED',
        entityType: 'Medicine',
        entityId: created.id,
        summary: `Added medicine SKU ${created.skuCode} (${created.name}).`,
        ipAddress: req.ip,
      });

      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }
);

medicinesRouter.post(
  '/batches',
  requireRole(UserRole.SUPER_ADMIN, UserRole.MEDICAL_ADMIN, UserRole.DISPATCHER),
  validateBody(createBatchSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createBatchSchema>;
      const expiry = new Date(body.expiryDate);
      if (Number.isNaN(expiry.getTime())) {
        throw new AppError(400, 'INVALID_DATE', 'Invalid expiryDate format.');
      }

      const batch = await prisma.medicineBatch.upsert({
        where: {
          medicineId_stationId_batchNumber: {
            medicineId: body.medicineId,
            stationId: body.stationId,
            batchNumber: body.batchNumber,
          },
        },
        update: {
          quantity: { increment: body.quantity },
          maxQuantity: Math.max(body.maxQuantity, body.quantity),
          expiryDate: expiry,
        },
        create: {
          medicineId: body.medicineId,
          stationId: body.stationId,
          batchNumber: body.batchNumber,
          quantity: body.quantity,
          maxQuantity: Math.max(body.maxQuantity, body.quantity),
          expiryDate: expiry,
        },
        include: {
          medicine: { select: { name: true, unitLabel: true } },
          station: { select: { code: true, name: true } },
        },
      });

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'MEDICINE_BATCH_RESTOCKED',
        entityType: 'MedicineBatch',
        entityId: batch.id,
        summary: `Restocked +${body.quantity} ${batch.medicine.unitLabel} of ${batch.medicine.name} (Batch ${batch.batchNumber}) at ${batch.station.code}.`,
        ipAddress: req.ip,
      });

      res.status(201).json({ success: true, data: batch });
    } catch (err) {
      next(err);
    }
  }
);

// Transactional medicine dispensation with atomic stock check & controlled-drug dual-verification
medicinesRouter.post(
  '/dispense',
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.MEDICAL_ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE
  ),
  validateBody(dispenseSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof dispenseSchema>;
      const actor = req.user!;

      const dispensation = await prisma.$transaction(async (tx) => {
        const batch = await tx.medicineBatch.findUnique({
          where: { id: body.batchId },
          include: { medicine: true },
        });
        if (!batch) throw new AppError(404, 'BATCH_NOT_FOUND', 'Medicine batch not found.');

        const incident = await tx.medicalIncident.findUnique({
          where: { id: body.incidentId },
        });
        if (!incident) throw new AppError(404, 'INCIDENT_NOT_FOUND', 'Target incident not found.');

        if (batch.medicine.isControlled) {
          if (!body.verifiedByUserId) {
            throw new AppError(
              400,
              'DUAL_VERIFICATION_REQUIRED',
              `${batch.medicine.name} is a controlled medication and requires a second staff verifier.`
            );
          }
          if (body.verifiedByUserId === actor.id) {
            throw new AppError(
              400,
              'DISTINCT_VERIFIER_REQUIRED',
              'Controlled medication verifier must be a different staff member than the administrator.'
            );
          }
        }

        // Atomic conditional update prevents negative stock under concurrent requests
        const updatedBatch = await tx.medicineBatch.updateMany({
          where: {
            id: batch.id,
            quantity: { gte: body.quantityDispensed },
          },
          data: {
            quantity: { decrement: body.quantityDispensed },
          },
        });

        if (updatedBatch.count === 0) {
          throw new AppError(
            409,
            'INSUFFICIENT_STOCK',
            `Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.quantity}.`
          );
        }

        const record = await tx.medicineDispensation.create({
          data: {
            incidentId: body.incidentId,
            batchId: batch.id,
            quantityDispensed: body.quantityDispensed,
            doseRoute: body.doseRoute,
            administeredByUserId: actor.id,
            verifiedByUserId: body.verifiedByUserId || null,
          },
          include: {
            batch: { include: { medicine: true } },
            administeredBy: { select: { fullName: true } },
            verifiedBy: { select: { fullName: true } },
          },
        });

        await writeAuditLog(
          {
            actorUserId: actor.id,
            action: batch.medicine.isControlled
              ? 'CONTROLLED_MED_DISPENSED'
              : 'MEDICINE_DISPENSED',
            entityType: 'MedicineDispensation',
            entityId: record.id,
            summary: `Dispensed ${body.quantityDispensed} ${batch.medicine.unitLabel} of ${batch.medicine.name} (${body.doseRoute}) for ${incident.incidentCode}.`,
            ipAddress: req.ip,
          },
          tx
        );

        return record;
      });

      res.status(201).json({ success: true, data: dispensation });
    } catch (err) {
      next(err);
    }
  }
);
