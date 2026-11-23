import { StationType, UserRole } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { writeAuditLog } from '../../utils/audit';
import { canViewPhi } from '../../utils/serializers';

export const reportsRouter = Router();

const REPORT_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.MEDICAL_ADMIN,
  UserRole.DOCTOR,
  UserRole.NURSE,
  UserRole.DISPATCHER,
];

reportsRouter.use(requireAuth, requireRole(...REPORT_ROLES));

reportsRouter.get('/overview', async (_req, res, next) => {
  try {
    const [
      incidents,
      stations,
      dispatchesTotal,
      dispensations,
      controlledDispensations,
    ] = await Promise.all([
      prisma.medicalIncident.findMany({
        select: {
          id: true,
          triagePriority: true,
          status: true,
          category: true,
          stationId: true,
          admittedAt: true,
          dischargedAt: true,
        },
      }),
      prisma.medicalStation.findMany({
        where: { stationType: StationType.FIELD_POST },
        include: {
          _count: {
            select: { incidents: true, doctors: true, nurses: true, beds: true },
          },
          beds: { select: { status: true } },
        },
        orderBy: { code: 'asc' },
      }),
      prisma.ambulanceDispatch.count(),
      prisma.medicineDispensation.findMany({
        include: { batch: { include: { medicine: { select: { name: true, unitLabel: true } } } } },
      }),
      prisma.medicineDispensation.count({
        where: { verifiedByUserId: { not: null } },
      }),
    ]);

    const totalEncounters = incidents.length;
    const discharged = incidents.filter((i) => i.status === 'DISCHARGED').length;

    const triageCounts = {
      P1_IMMEDIATE: incidents.filter((i) => i.triagePriority === 'P1_IMMEDIATE').length,
      P2_URGENT: incidents.filter((i) => i.triagePriority === 'P2_URGENT').length,
      P3_MINOR: incidents.filter((i) => i.triagePriority === 'P3_MINOR').length,
      UNTRIAGED: incidents.filter((i) => i.triagePriority === 'UNTRIAGED').length,
    };

    const categoryMap = new Map<string, number>();
    for (const inc of incidents) {
      categoryMap.set(inc.category, (categoryMap.get(inc.category) ?? 0) + 1);
    }

    // Hourly distribution (08h–20h)
    const hourBuckets: Record<number, number> = {};
    for (let h = 8; h <= 20; h++) hourBuckets[h] = 0;
    for (const inc of incidents) {
      const hr = new Date(inc.admittedAt).getHours();
      const clamped = Math.max(8, Math.min(20, hr));
      hourBuckets[clamped] = (hourBuckets[clamped] ?? 0) + 1;
    }

    const totalDoses = dispensations.reduce((sum, d) => sum + d.quantityDispensed, 0);

    const medConsumptionMap = new Map<string, number>();
    for (const d of dispensations) {
      const name = d.batch.medicine.name;
      medConsumptionMap.set(name, (medConsumptionMap.get(name) ?? 0) + d.quantityDispensed);
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalEncounters,
          discharged,
          resolutionRatePct:
            totalEncounters > 0 ? Math.round((discharged / totalEncounters) * 100) : 0,
          ambulanceTransfers: dispatchesTotal,
          totalMedicineUnitsDispensed: totalDoses,
          controlledMedDualVerifiedCount: controlledDispensations,
        },
        triageDistribution: triageCounts,
        categoryBreakdown: Array.from(categoryMap.entries()).map(([category, count]) => ({
          category,
          count,
          pct: totalEncounters > 0 ? Math.round((count / totalEncounters) * 100) : 0,
        })),
        hourlySurge: Object.entries(hourBuckets).map(([hour, count]) => ({
          hour: `${String(hour).padStart(2, '0')}h`,
          count,
        })),
        stationMatrix: stations.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          totalIntake: s._count.incidents,
          doctors: s._count.doctors,
          nurses: s._count.nurses,
          occupiedBeds: s.beds.filter((b) => b.status === 'OCCUPIED').length,
          totalBeds: s._count.beds,
          status: s.status,
        })),
        topMedicines: Array.from(medConsumptionMap.entries())
          .map(([name, units]) => ({ name, units }))
          .sort((a, b) => b.units - a.units)
          .slice(0, 6),
      },
    });
  } catch (err) {
    next(err);
  }
});

function csvEscape(val: unknown): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

reportsRouter.get(
  '/export/csv',
  requireRole(UserRole.SUPER_ADMIN, UserRole.MEDICAL_ADMIN, UserRole.DOCTOR),
  async (req, res, next) => {
    try {
      const type = String(req.query.type ?? 'incidents');

      if (type === 'audit' && (req.user!.role === UserRole.SUPER_ADMIN || req.user!.role === UserRole.MEDICAL_ADMIN)) {
        const logs = await prisma.auditLog.findMany({
          include: { actor: { select: { fullName: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          take: 500,
        });

        const header = 'Timestamp,Actor,Role,Action,EntityType,EntityID,Summary,IP';
        const rows = logs.map((l) =>
          [
            l.createdAt.toISOString(),
            l.actor?.fullName ?? 'System',
            l.actor?.role ?? 'SYSTEM',
            l.action,
            l.entityType,
            l.entityId,
            l.summary,
            l.ipAddress ?? '',
          ]
            .map(csvEscape)
            .join(',')
        );

        await writeAuditLog({
          actorUserId: req.user!.id,
          action: 'REPORT_EXPORTED',
          entityType: 'AuditLog',
          entityId: 'csv-export',
          summary: `Exported ${logs.length} audit log records to CSV.`,
          ipAddress: req.ip,
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="medijigs-audit-logs.csv"');
        res.send([header, ...rows].join('\n'));
        return;
      }

      const incidents = await prisma.medicalIncident.findMany({
        include: {
          patient: canViewPhi(req.user!.role)
            ? { select: { recordCode: true, fullName: true, age: true, sex: true } }
            : false,
          station: { select: { code: true, name: true } },
          leadDoctor: { select: { fullName: true } },
        },
        orderBy: { admittedAt: 'desc' },
        take: 500,
      });

      const header =
        'IncidentCode,AdmittedAt,PatientCode,PatientName,Category,Priority,Status,Station,LeadDoctor,Location,ChiefComplaint';
      const rows = incidents.map((i) =>
        [
          i.incidentCode,
          i.admittedAt.toISOString(),
          i.patient?.recordCode ?? 'Unlinked',
          i.patient?.fullName ?? 'Unlinked',
          i.category,
          i.triagePriority,
          i.status,
          i.station ? `${i.station.code} ${i.station.name}` : 'Unassigned',
          i.leadDoctor?.fullName ?? 'Unassigned',
          i.locationText,
          i.chiefComplaint,
        ]
          .map(csvEscape)
          .join(',')
      );

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'REPORT_EXPORTED',
        entityType: 'MedicalIncident',
        entityId: 'csv-export',
        summary: `Exported ${incidents.length} medical incidents to CSV.`,
        ipAddress: req.ip,
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="medijigs-incidents-report.csv"');
      res.send([header, ...rows].join('\n'));
    } catch (err) {
      next(err);
    }
  }
);
