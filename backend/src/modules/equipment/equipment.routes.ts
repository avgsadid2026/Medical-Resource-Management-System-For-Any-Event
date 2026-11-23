import { EquipmentCategory, EquipmentStatus, UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { writeAuditLog } from '../../utils/audit';

export const equipmentRouter = Router();

const STAFF_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.MEDICAL_ADMIN,
  UserRole.DOCTOR,
  UserRole.NURSE,
  UserRole.DISPATCHER,
];

const equipmentSchema = z.object({
  assetCode: z.string().trim().min(2),
  name: z.string().trim().min(2),
  model: z.string().trim().min(1),
  serialNumber: z.string().trim().min(2),
  category: z.nativeEnum(EquipmentCategory),
  stationId: z.string().optional().nullable(),
  status: z.nativeEnum(EquipmentStatus).default(EquipmentStatus.OPERATIONAL),
  batteryPct: z.coerce.number().int().min(0).max(100).optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

equipmentRouter.use(requireAuth, requireRole(...STAFF_ROLES));

equipmentRouter.get('/', async (req, res, next) => {
  try {
    const search = String(req.query.search ?? '').trim();
    const category = req.query.category ? String(req.query.category) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const stationId = req.query.stationId ? String(req.query.stationId) : undefined;

    const items = await prisma.medicalEquipment.findMany({
      where: {
        ...(category && category !== 'ALL' ? { category: category as EquipmentCategory } : {}),
        ...(status && status !== 'ALL' ? { status: status as EquipmentStatus } : {}),
        ...(stationId && stationId !== 'ALL' ? { stationId } : {}),
        ...(search
          ? {
              OR: [
                { assetCode: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
                { model: { contains: search, mode: 'insensitive' } },
                { serialNumber: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        station: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ status: 'asc' }, { assetCode: 'asc' }],
    });

    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

equipmentRouter.post(
  '/',
  requireRole(UserRole.SUPER_ADMIN, UserRole.MEDICAL_ADMIN, UserRole.DISPATCHER),
  validateBody(equipmentSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof equipmentSchema>;
      const created = await prisma.medicalEquipment.create({
        data: {
          ...body,
          stationId: body.stationId || null,
          batteryPct: body.batteryPct ?? null,
          lastInspectedAt: new Date(),
        },
        include: { station: { select: { id: true, code: true, name: true } } },
      });

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'EQUIPMENT_REGISTERED',
        entityType: 'MedicalEquipment',
        entityId: created.id,
        summary: `Registered biomedical asset ${created.assetCode} (${created.name}).`,
        ipAddress: req.ip,
      });

      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  }
);

equipmentRouter.patch(
  '/:id',
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.MEDICAL_ADMIN,
    UserRole.NURSE,
    UserRole.DISPATCHER
  ),
  validateBody(
    equipmentSchema.partial().extend({
      markInspected: z.boolean().optional(),
    })
  ),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const { markInspected, ...rest } = req.body;
      const updated = await prisma.medicalEquipment.update({
        where: { id },
        data: {
          ...rest,
          ...(rest.stationId !== undefined ? { stationId: rest.stationId || null } : {}),
          ...(markInspected ? { lastInspectedAt: new Date() } : {}),
        },
        include: { station: { select: { id: true, code: true, name: true } } },
      });

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: markInspected ? 'EQUIPMENT_INSPECTED' : 'EQUIPMENT_UPDATED',
        entityType: 'MedicalEquipment',
        entityId: updated.id,
        summary: `Updated asset ${updated.assetCode} (Status: ${updated.status}, Battery: ${updated.batteryPct ?? 'N/A'}%).`,
        ipAddress: req.ip,
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);
