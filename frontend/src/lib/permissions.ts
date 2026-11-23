import type { UserRole } from '@/types/emrms';

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  MEDICAL_ADMIN: 'Medical Admin / CMO',
  DOCTOR: 'On-Duty Physician',
  NURSE: 'Triage Lead Nurse',
  DISPATCHER: 'Dispatcher / Logistics',
  VOLUNTEER: 'Campus Volunteer',
};

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  section:
    | 'CORE DISPATCH'
    | 'CLINICAL & PATIENTS'
    | 'RESOURCES & LOGISTICS'
    | 'GOVERNANCE & AUDIT';
  allowedRoles: UserRole[];
  showAlertBadge?: boolean;
}

const ALL_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'MEDICAL_ADMIN',
  'DOCTOR',
  'NURSE',
  'DISPATCHER',
  'VOLUNTEER',
];

const STAFF_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'MEDICAL_ADMIN',
  'DOCTOR',
  'NURSE',
  'DISPATCHER',
];

const CLINICAL_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'MEDICAL_ADMIN',
  'DOCTOR',
  'NURSE',
];

const GOVERNANCE_ROLES: UserRole[] = ['SUPER_ADMIN', 'MEDICAL_ADMIN'];

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Main Dashboard',
    path: '/dashboard',
    icon: 'grid_view',
    section: 'CORE DISPATCH',
    allowedRoles: ALL_ROLES,
  },
  {
    label: 'Notice Board',
    path: '/notices',
    icon: 'campaign',
    section: 'CORE DISPATCH',
    allowedRoles: ALL_ROLES,
  },
  {
    label: 'Emergency Alerts',
    path: '/alerts',
    icon: 'warning',
    section: 'CORE DISPATCH',
    allowedRoles: STAFF_ROLES,
    showAlertBadge: true,
  },
  {
    label: 'Incident Management',
    path: '/incidents',
    icon: 'assignment_late',
    section: 'CORE DISPATCH',
    allowedRoles: ALL_ROLES,
  },
  {
    label: 'Doctor Management',
    path: '/doctors',
    icon: 'stethoscope',
    section: 'CLINICAL & PATIENTS',
    allowedRoles: STAFF_ROLES,
  },
  {
    label: 'Nurse Management',
    path: '/nurses',
    icon: 'group',
    section: 'CLINICAL & PATIENTS',
    allowedRoles: STAFF_ROLES,
  },
  {
    label: 'Patient Records',
    path: '/patients',
    icon: 'account_circle',
    section: 'CLINICAL & PATIENTS',
    allowedRoles: CLINICAL_ROLES,
  },
  {
    label: 'Medicine Inventory',
    path: '/medicines',
    icon: 'medication',
    section: 'RESOURCES & LOGISTICS',
    allowedRoles: STAFF_ROLES,
  },
  {
    label: 'Medical Equipment',
    path: '/equipment',
    icon: 'medical_services',
    section: 'RESOURCES & LOGISTICS',
    allowedRoles: STAFF_ROLES,
  },
  {
    label: 'Ambulance Fleet',
    path: '/ambulances',
    icon: 'airport_shuttle',
    section: 'RESOURCES & LOGISTICS',
    allowedRoles: STAFF_ROLES,
  },
  {
    label: 'Reports & Analytics',
    path: '/reports',
    icon: 'analytics',
    section: 'GOVERNANCE & AUDIT',
    allowedRoles: STAFF_ROLES,
  },
  {
    label: 'Activity & Audit Logs',
    path: '/audit-logs',
    icon: 'history',
    section: 'GOVERNANCE & AUDIT',
    allowedRoles: GOVERNANCE_ROLES,
  },
  {
    label: 'User & Roles',
    path: '/users',
    icon: 'admin_panel_settings',
    section: 'GOVERNANCE & AUDIT',
    allowedRoles: GOVERNANCE_ROLES,
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: 'tune',
    section: 'GOVERNANCE & AUDIT',
    allowedRoles: GOVERNANCE_ROLES,
  },
];

export function hasRole(role: UserRole | undefined, allowed: UserRole[]): boolean {
  if (!role) return false;
  return allowed.includes(role);
}
