import {
  AlertStatus,
  AmbulanceStatus,
  DoctorDutyStatus,
  EquipmentStatus,
  IncidentStatus,
  NurseDutyStatus,
  StationType,
  TriagePriority,
  UserRole,
} from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { requireAuth } from '../../middleware/auth';
import { sanitizeIncidentForRole } from '../../utils/serializers';

export const dashboardRouter = Router();

function normalizeEventProfile(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = { ...(raw as Record<string, unknown>) };
  if (
    typeof obj.eventName === 'string' &&
    (/baust\s*cse\s*fest/i.test(obj.eventName) || /emrms/i.test(obj.eventName))
  ) {
    obj.eventName = 'Medical & Resource Management System For Any Event';
  }
  return obj;
}

dashboardRouter.get('/summary', requireAuth, async (req, res, next) => {
  try {
    const role = req.user!.role;

    // Volunteer gets a strictly non-PHI minimal dashboard payload
    if (role === UserRole.VOLUNTEER) {
      const [myReports, eventSetting, noticesSetting] = await Promise.all([
        prisma.medicalIncident.findMany({
          where: { reportedByUserId: req.user!.id },
          include: { station: { select: { id: true, code: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.systemSetting.findUnique({ where: { key: 'event.profile' } }),
        prisma.systemSetting.findUnique({ where: { key: 'notices.board' } }),
      ]);

      const publishedNotices =
        Array.isArray(noticesSetting?.valueJson)
          ? (noticesSetting.valueJson as Array<Record<string, unknown>>)
              .filter((n) => n.isPublished)
              .slice(0, 5)
          : [];

      res.json({
        success: true,
        data: {
          mode: 'VOLUNTEER',
          eventProfile: normalizeEventProfile(eventSetting?.valueJson),
          myReports: myReports.map((inc) => sanitizeIncidentForRole(inc, role)),
          recentNotices: publishedNotices,
          stations: [],
        },
      });
      return;
    }

    const [
      doctorsTotal,
      doctorsOnDuty,
      doctorsCodeRed,
      nursesTotal,
      nursesOnDuty,
      nursesIntercepting,
      activeIncidents,
      criticalIncidents,
      ambulancesTotal,
      ambulancesStandby,
      ambulancesActive,
      equipmentTotal,
      equipmentOperational,
      medicinesWithBatches,
      recentIncidents,
      activeP1Alerts,
      staffDoctors,
      staffNurses,
      recentAuditLogs,
      eventSetting,
      noticesSetting,
    ] = await Promise.all([
      prisma.doctor.count(),
      prisma.doctor.count({
        where: { dutyStatus: DoctorDutyStatus.ON_DUTY },
      }),
      prisma.doctor.count({
        where: { dutyStatus: DoctorDutyStatus.CODE_RED },
      }),
      prisma.nurse.count(),
      prisma.nurse.count({
        where: { dutyStatus: NurseDutyStatus.ON_DUTY },
      }),
      prisma.nurse.count({
        where: { dutyStatus: NurseDutyStatus.INTERCEPTING },
      }),
      prisma.medicalIncident.count({
        where: { status: { not: IncidentStatus.DISCHARGED } },
      }),
      prisma.medicalIncident.count({
        where: {
          status: { not: IncidentStatus.DISCHARGED },
          triagePriority: TriagePriority.P1_IMMEDIATE,
        },
      }),
      prisma.ambulance.count(),
      prisma.ambulance.count({ where: { status: AmbulanceStatus.STANDBY } }),
      prisma.ambulance.count({
        where: {
          status: {
            in: [
              AmbulanceStatus.EN_ROUTE,
              AmbulanceStatus.ON_SCENE,
              AmbulanceStatus.RETURNING,
            ],
          },
        },
      }),
      prisma.medicalEquipment.count(),
      prisma.medicalEquipment.count({
        where: { status: { in: [EquipmentStatus.OPERATIONAL, EquipmentStatus.IN_USE] } },
      }),
      prisma.medicine.findMany({
        include: { batches: { select: { quantity: true } } },
      }),
      prisma.medicalIncident.findMany({
        include: {
          patient: true,
          station: { select: { id: true, code: true, name: true } },
          bed: { select: { id: true, bedCode: true } },
          leadDoctor: { select: { id: true, fullName: true } },
          leadNurse: { select: { id: true, fullName: true } },
        },
        orderBy: { admittedAt: 'desc' },
        take: 8,
      }),
      prisma.emergencyAlert.findMany({
        where: { status: { not: AlertStatus.RESOLVED } },
        include: {
          incident: { select: { id: true, incidentCode: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.doctor.findMany({
        take: 4,
        orderBy: { fullName: 'asc' },
      }),
      prisma.nurse.findMany({
        take: 3,
        orderBy: { fullName: 'asc' },
      }),
      prisma.auditLog.findMany({
        include: { actor: { select: { fullName: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      prisma.systemSetting.findUnique({ where: { key: 'event.profile' } }),
      prisma.systemSetting.findUnique({ where: { key: 'notices.board' } }),
    ]);

    const lowStockMedicines = medicinesWithBatches.filter((m) => {
      const totalQty = m.batches.reduce((sum, b) => sum + b.quantity, 0);
      return totalQty < m.minParLevel;
    });

    const equipmentReadinessPct =
      equipmentTotal > 0 ? Math.round((equipmentOperational / equipmentTotal) * 100) : 100;

    const publishedNotices =
      Array.isArray(noticesSetting?.valueJson)
        ? (noticesSetting.valueJson as Array<Record<string, unknown>>)
            .filter((n) => n.isPublished)
            .slice(0, 5)
        : [];

    res.json({
      success: true,
      data: {
        mode: 'COMMAND',
        eventProfile: normalizeEventProfile(eventSetting?.valueJson),
        kpis: {
          doctorsOnDuty,
          doctorsCodeRed,
          doctorsTotal,
          nursesOnDuty,
          nursesIntercepting,
          nursesTotal,
          activeIncidents,
          criticalIncidents,
          ambulancesStandby,
          ambulancesActive,
          ambulancesTotal,
          lowStockCount: lowStockMedicines.length,
          lowStockNames: lowStockMedicines.slice(0, 3).map((m) => m.name),
          equipmentReadinessPct,
          equipmentOperational,
          equipmentTotal,
          activeAlertCount: activeP1Alerts.length,
        },
        activeAlerts: activeP1Alerts,
        recentNotices: publishedNotices,
        recentIncidents: recentIncidents.map((inc) => sanitizeIncidentForRole(inc, role)),
        stations: [],
        staffOverview: [
          ...staffDoctors.map((d) => ({
            id: d.id,
            name: d.fullName,
            roleLabel: d.specialization,
            station: 'Field Medical Team',
            ext: d.phoneExt ? `Ext. ${d.phoneExt}` : d.radioChannel ?? '—',
          })),
          ...staffNurses.map((n) => ({
            id: n.id,
            name: n.fullName,
            roleLabel: n.specialty,
            station: 'Field Medical Team',
            ext: n.vhfCallsign ?? '—',
          })),
        ],
        recentLogs: recentAuditLogs,
      },
    });
  } catch (err) {
    next(err);
  }
});
