import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import {
  ErrorBanner,
  GlassSelect,
  KpiCard,
  Modal,
  PageHeader,
  StatusBadge,
} from '@/components/shared/UiPrimitives';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest } from '@/lib/apiClient';
import { ROLE_LABELS } from '@/lib/permissions';
import type { UserRole } from '@/types/emrms';

interface UserAccount {
  id: string;
  email: string;
  staffCode: string | null;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface ActiveSessionRow {
  sidPreview: string;
  userId: string | null;
  userName: string;
  userRole: string;
  expire: string;
}

interface UsersPayload {
  users: UserAccount[];
  activeSessions: ActiveSessionRow[];
}

const ALL_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'MEDICAL_ADMIN',
  'DOCTOR',
  'NURSE',
  'DISPATCHER',
  'VOLUNTEER',
];

const RBAC_MATRIX: Array<{ role: UserRole; scope: string }> = [
  { role: 'SUPER_ADMIN', scope: 'Full system access, staff accounts, activity logs & security settings' },
  { role: 'MEDICAL_ADMIN', scope: 'Medical oversight, staff, reports, alerts & team accounts' },
  { role: 'DOCTOR', scope: 'Full patient medical records, vitals, clinical notes, beds & prescribing' },
  { role: 'NURSE', scope: 'Patient triage, vitals, medicine dispensing & controlled-med co-sign' },
  { role: 'DISPATCHER', scope: 'Alerts, ambulances, equipment & stations (patient records hidden)' },
  { role: 'VOLUNTEER', scope: 'Field incident reporting & station directory only (patient records hidden)' },
];

export function UserRoleManagementPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [actionError, setActionError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [staffCode, setStaffCode] = useState('');
  const [role, setRole] = useState<UserRole>('VOLUNTEER');
  const [password, setPassword] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['governance-users'],
    queryFn: async () => {
      const res = await apiRequest<UsersPayload>('/users');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('/users', {
        method: 'POST',
        body: {
          fullName,
          email,
          staffCode: staffCode.trim() || null,
          role,
          password,
        },
      });
    },
    onSuccess: () => {
      setActionError(null);
      setModalOpen(false);
      setFullName('');
      setEmail('');
      setStaffCode('');
      setRole('VOLUNTEER');
      setPassword('');
      void queryClient.invalidateQueries({ queryKey: ['governance-users'] });
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : 'Failed to create account.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; role?: UserRole; isActive?: boolean }) => {
      await apiRequest(`/users/${payload.id}`, {
        method: 'PATCH',
        body: {
          ...(payload.role !== undefined ? { role: payload.role } : {}),
          ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
        },
      });
    },
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['governance-users'] });
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : 'Failed to update account.');
    },
  });

  const revokeSessionsMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest(`/users/${userId}/sessions`, { method: 'DELETE' });
    },
    onSuccess: () => {
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['governance-users'] });
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : 'Failed to revoke sessions.');
    },
  });

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  const users = data?.users ?? [];
  const activeSessions = data?.activeSessions ?? [];
  const activeCount = users.filter((u) => u.isActive).length;
  const deactivatedCount = users.filter((u) => !u.isActive).length;

  const creatableRoles =
    currentUser?.role === 'SUPER_ADMIN'
      ? ALL_ROLES
      : ALL_ROLES.filter((r) => r !== 'SUPER_ADMIN');

  return (
    <div className="space-y-space-lg">
      <PageHeader
        breadcrumbs={['MEDIJIGS', 'GOVERNANCE & AUDIT', 'USER & ROLE MANAGEMENT']}
        title="User Accounts & Role Permissions"
        subtitle="Deactivating an account keeps past medical records intact and immediately signs the user out."
        actions={
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-primary text-on-primary font-label-md text-label-md font-semibold hover:opacity-90 transition-opacity"
          >
            <UserPlus className="w-4 h-4 text-white" />
            Add Account
          </button>
        }
      />

      <ErrorBanner
        message={actionError || (error instanceof Error ? error.message : null)}
      />

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <KpiCard
          label="Total Accounts"
          value={users.length}
          icon="groups"
          footerLeft="Access Levels"
          footerRight="6 Roles"
        />
        <KpiCard
          label="Active Accounts"
          value={activeCount}
          icon="how_to_reg"
          footerLeft="Authorized login"
          footerRight="Enabled"
        />
        <KpiCard
          label="Active Logins"
          value={activeSessions.length}
          icon="devices"
          footerLeft="Status"
          footerRight="Signed In"
        />
        <KpiCard
          label="Deactivated Accounts"
          value={deactivatedCount}
          icon="person_off"
          footerLeft="History preserved"
          footerRight="Paused"
        />
      </div>

      {/* Main 12-Col Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* 8-Col Staff Directory */}
        <section className="xl:col-span-8 bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant/30 bg-surface-container-low/70 flex items-center justify-between">
            <h2 className="font-headline text-[17px] font-bold text-on-surface">
              Staff &amp; Volunteer Accounts
            </h2>
            <span className="font-sans text-[11px] uppercase tracking-wider text-outline font-semibold bg-surface-container-low px-2.5 py-1 rounded-lg border border-outline-variant/40">
              History Preserved
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-[13px]">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-container-low/50 font-sans text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role Assignment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Access Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 font-sans text-[13px]">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                      Loading staff accounts...
                    </td>
                  </tr>
                ) : (
                  users.map((acct) => {
                    const isSelf = acct.id === currentUser?.id;
                    const lockedForMedicalAdmin =
                      currentUser?.role === 'MEDICAL_ADMIN' &&
                      acct.role === 'SUPER_ADMIN';

                    return (
                      <tr key={acct.id} className="hover:bg-surface-container-low/40">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-on-surface">
                            {acct.fullName}
                            {isSelf && (
                              <span className="ml-1.5 text-xs text-primary font-bold">
                                (You)
                              </span>
                            )}
                          </div>
                          <div className="font-label-sm text-label-sm text-on-surface-variant">
                            {acct.email}
                            {acct.staffCode ? ` • ${acct.staffCode}` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <GlassSelect
                            aria-label={`Role for ${acct.fullName}`}
                            value={acct.role}
                            disabled={
                              lockedForMedicalAdmin ||
                              isSelf ||
                              updateMutation.isPending
                            }
                            onChange={(e) =>
                              updateMutation.mutate({
                                id: acct.id,
                                role: e.target.value as UserRole,
                              })
                            }
                            className="py-1"
                          >
                            {(lockedForMedicalAdmin ? ALL_ROLES : creatableRoles).map(
                              (r) => (
                                <option key={r} value={r}>
                                  {ROLE_LABELS[r]}
                                </option>
                              )
                            )}
                          </GlassSelect>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge
                            status={acct.isActive ? 'OPERATIONAL' : 'OFFLINE'}
                          />
                        </td>
                        <td className="py-3 px-4 tabular-metrics text-on-surface-variant whitespace-nowrap">
                          {acct.lastLoginAt
                            ? new Date(acct.lastLoginAt).toLocaleString()
                            : 'Never'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                          {!lockedForMedicalAdmin && !isSelf && (
                            <button
                              type="button"
                              disabled={updateMutation.isPending}
                              onClick={() =>
                                updateMutation.mutate({
                                  id: acct.id,
                                  isActive: !acct.isActive,
                                })
                              }
                              className={
                                acct.isActive
                                  ? 'px-2.5 py-1 rounded border border-error/40 text-error font-label-sm text-label-sm font-semibold hover:bg-error-container/30'
                                  : 'px-2.5 py-1 rounded border border-primary/40 text-primary font-label-sm text-label-sm font-semibold hover:bg-surface-container-high'
                              }
                            >
                              {acct.isActive ? 'Deactivate' : 'Reactivate'}
                            </button>
                          )}
                          {!lockedForMedicalAdmin && (
                            <button
                              type="button"
                              disabled={revokeSessionsMutation.isPending}
                              onClick={() => revokeSessionsMutation.mutate(acct.id)}
                              className="px-2.5 py-1 rounded border border-outline-variant/50 text-on-surface-variant font-label-sm text-label-sm font-semibold hover:bg-surface-container-high"
                              title="Sign out this user from all active devices"
                            >
                              Sign Out Devices
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4-Col Right Sidebar: RBAC Summary + Active Sessions */}
        <div className="xl:col-span-4 space-y-space-md">
          <section className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 p-5 shadow-card">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-3">
              Role Permissions Overview
            </h2>
            <div className="space-y-2.5">
              {RBAC_MATRIX.map((item) => (
                <div
                  key={item.role}
                  className="p-2.5 rounded bg-surface-container-low border border-outline-variant/20"
                >
                  <div className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">
                    {ROLE_LABELS[item.role]}
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    {item.scope}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-headline-md text-headline-md text-on-surface">
                Active User Logins
              </h2>
              <span className="font-label-sm text-label-sm font-bold text-primary tabular-metrics">
                {activeSessions.length}
              </span>
            </div>
            {activeSessions.length === 0 ? (
              <p className="font-body-sm text-on-surface-variant">
                No active sessions recorded.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activeSessions.map((sess) => (
                  <div
                    key={`${sess.sidPreview}-${sess.expire}`}
                    className="p-2.5 rounded border border-outline-variant/20 bg-surface-container-low flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-label-md text-label-md font-semibold text-on-surface truncate">
                        {sess.userName}
                      </div>
                      <div className="font-label-sm text-label-sm text-outline truncate">
                        SID {sess.sidPreview} • Expires{' '}
                        {new Date(sess.expire).toLocaleTimeString()}
                      </div>
                    </div>
                    {sess.userId && (
                      <button
                        type="button"
                        onClick={() => revokeSessionsMutation.mutate(sess.userId!)}
                        className="px-2 py-1 rounded text-error hover:bg-error-container/30 font-label-sm text-label-sm font-semibold shrink-0"
                      >
                        Kill
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Provision Account Modal */}
      <Modal
        open={modalOpen}
        title="Provision New Staff / Volunteer Account"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g., Dr. Rafiqul Islam"
              className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-sm text-on-surface"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@baust-demo.edu.bd"
                className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-sm text-on-surface"
              />
            </div>
            <div>
              <label className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold mb-1">
                Staff / Volunteer Code
              </label>
              <input
                type="text"
                value={staffCode}
                onChange={(e) => setStaffCode(e.target.value)}
                placeholder="e.g., VOL-09"
                className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-sm text-on-surface"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold mb-1">
                Role
              </label>
              <GlassSelect
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full"
              >
                {creatableRoles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </GlassSelect>
            </div>
            <div>
              <label className="block font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold mb-1">
                Initial Password (min 8 chars)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-sm text-on-surface"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded border border-outline-variant/50 font-label-md text-label-md font-semibold text-on-surface-variant hover:bg-surface-container-high"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded bg-primary text-on-primary font-label-md text-label-md font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
