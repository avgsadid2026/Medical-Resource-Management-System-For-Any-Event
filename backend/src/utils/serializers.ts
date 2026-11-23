import { UserRole } from '@prisma/client';

const CLINICAL_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.MEDICAL_ADMIN,
  UserRole.DOCTOR,
  UserRole.NURSE,
];

export function canViewPhi(role: UserRole): boolean {
  return CLINICAL_ROLES.includes(role);
}

/**
 * Strips sensitive patient medical information (PHI) for VOLUNTEER and DISPATCHER roles.
 */
export function sanitizeIncidentForRole<T extends Record<string, unknown>>(
  incident: T,
  role: UserRole
): Record<string, unknown> {
  if (canViewPhi(role)) {
    return incident;
  }

  // Volunteer sees strictly non-sensitive report tracking fields
  if (role === UserRole.VOLUNTEER) {
    return {
      id: incident.id,
      incidentCode: incident.incidentCode,
      triagePriority: incident.triagePriority,
      status: incident.status,
      category: incident.category,
      locationText: incident.locationText,
      station: incident.station
        ? {
            id: (incident.station as Record<string, unknown>).id,
            code: (incident.station as Record<string, unknown>).code,
            name: (incident.station as Record<string, unknown>).name,
          }
        : null,
      admittedAt: incident.admittedAt,
      createdAt: incident.createdAt,
    };
  }

  // Dispatcher sees operational routing data without clinical HPI, allergies, vitals, or history
  const {
    hpiNotes: _hpi,
    gcsScore: _gcs,
    dischargeChecklistJson: _dc,
    vitals: _vitals,
    clinicalNotes: _notes,
    dispensations: _disp,
    patient,
    ...safeRest
  } = incident;

  return {
    ...safeRest,
    patient: patient
      ? {
          id: (patient as Record<string, unknown>).id,
          recordCode: (patient as Record<string, unknown>).recordCode,
          attendeeRole: (patient as Record<string, unknown>).attendeeRole,
        }
      : null,
  };
}
