import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmergencyAlertsPage } from '@/features/alerts/EmergencyAlertsPage';
import { AmbulanceFleetPage } from '@/features/ambulances/AmbulanceFleetPage';
import { ActivityAuditLogsPage } from '@/features/audit-logs/ActivityAuditLogsPage';
import { useAuth } from '@/features/auth/AuthContext';
import { LoginPage } from '@/features/auth/LoginPage';
import { MainDashboardPage } from '@/features/dashboard/MainDashboardPage';
import { DoctorManagementPage } from '@/features/doctors/DoctorManagementPage';
import { EquipmentManagementPage } from '@/features/equipment/EquipmentManagementPage';
import { IncidentManagementPage } from '@/features/incidents/IncidentManagementPage';
import { MedicineInventoryPage } from '@/features/medicines/MedicineInventoryPage';
import { NurseManagementPage } from '@/features/nurses/NurseManagementPage';
import { NoticeBoardPage } from '@/features/notices/NoticeBoardPage';
import { PatientDetailsPage } from '@/features/patients/PatientDetailsPage';
import { PatientDirectoryPage } from '@/features/patients/PatientDirectoryPage';
import { ReportsAnalyticsPage } from '@/features/reports/ReportsAnalyticsPage';
import { SystemSettingsPage } from '@/features/settings/SystemSettingsPage';
import { UserRoleManagementPage } from '@/features/users/UserRoleManagementPage';
import { hasRole, ROLE_LABELS } from '@/lib/permissions';
import type { UserRole } from '@/types/emrms';

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

function ProtectedShell() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/emrms-logo.svg"
            alt="MEDIJIGS Logo"
            className="w-10 h-10 object-contain"
          />
          <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
            Verifying Command Session...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardLayout />;
}

function RoleGuard({
  allowed,
  children,
}: {
  allowed: UserRole[];
  children: ReactNode;
}) {
  const { user } = useAuth();

  if (!user || !hasRole(user.role, allowed)) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-surface-container-lowest border border-error/30 rounded-lg p-space-lg shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-error">
          <ShieldAlert className="w-6 h-6 shrink-0" />
          <h1 className="font-headline-md text-headline-md">
            403 — Role Access Restricted
          </h1>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Your current role (
          <strong className="text-on-surface">
            {user ? ROLE_LABELS[user.role] : 'Guest'}
          </strong>
          ) does not have permission to view this clinical or governance module.
        </p>
        <p className="font-body-sm text-body-sm text-outline">
          Patient medical records (PHI) are strictly restricted to authorized
          clinical personnel and medical administrators.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedShell />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<MainDashboardPage />} />
        <Route path="/notices" element={<NoticeBoardPage />} />
        <Route path="/incidents" element={<IncidentManagementPage />} />
        <Route path="/stations" element={<Navigate to="/dashboard" replace />} />

        <Route
          path="/alerts"
          element={
            <RoleGuard allowed={STAFF_ROLES}>
              <EmergencyAlertsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/doctors"
          element={
            <RoleGuard allowed={STAFF_ROLES}>
              <DoctorManagementPage />
            </RoleGuard>
          }
        />
        <Route
          path="/nurses"
          element={
            <RoleGuard allowed={STAFF_ROLES}>
              <NurseManagementPage />
            </RoleGuard>
          }
        />
        <Route
          path="/patients"
          element={
            <RoleGuard allowed={CLINICAL_ROLES}>
              <PatientDirectoryPage />
            </RoleGuard>
          }
        />
        <Route
          path="/patients/:id"
          element={
            <RoleGuard allowed={CLINICAL_ROLES}>
              <PatientDetailsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/medicines"
          element={
            <RoleGuard allowed={STAFF_ROLES}>
              <MedicineInventoryPage />
            </RoleGuard>
          }
        />
        <Route
          path="/equipment"
          element={
            <RoleGuard allowed={STAFF_ROLES}>
              <EquipmentManagementPage />
            </RoleGuard>
          }
        />
        <Route
          path="/ambulances"
          element={
            <RoleGuard allowed={STAFF_ROLES}>
              <AmbulanceFleetPage />
            </RoleGuard>
          }
        />
        <Route
          path="/reports"
          element={
            <RoleGuard allowed={STAFF_ROLES}>
              <ReportsAnalyticsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <RoleGuard allowed={GOVERNANCE_ROLES}>
              <ActivityAuditLogsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/users"
          element={
            <RoleGuard allowed={GOVERNANCE_ROLES}>
              <UserRoleManagementPage />
            </RoleGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <RoleGuard allowed={GOVERNANCE_ROLES}>
              <SystemSettingsPage />
            </RoleGuard>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
