import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Search, Clock, UserCheck, Eye } from 'lucide-react';
import {
  ErrorBanner,
  GlassSelect,
  KpiCard,
  Modal,
  PageHeader,
} from '@/components/shared/UiPrimitives';
import { apiRequest, getExportUrl } from '@/lib/apiClient';
import { ROLE_LABELS } from '@/lib/permissions';
import type { UserRole } from '@/types/emrms';

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  beforeJson: unknown;
  afterJson: unknown;
  ipAddress: string | null;
  createdAt: string;
  actor: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
  } | null;
}

interface AuditLogsPayload {
  logs: AuditLogEntry[];
  stats: {
    totalEvents: number;
    activeSessionsCount: number;
    controlledMedCount: number;
  };
}

const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: 'All Activities' },
  { value: 'MedicalIncident', label: 'Medical Incidents' },
  { value: 'Patient', label: 'Patient Records' },
  { value: 'EmergencyAlert', label: 'Emergency Alerts' },
  { value: 'MedicineDispensation', label: 'Medicine Dispensing' },
  { value: 'MedicineBatch', label: 'Medicine Inventory' },
  { value: 'MedicalEquipment', label: 'Medical Equipment' },
  { value: 'AmbulanceDispatch', label: 'Ambulance Dispatches' },
  { value: 'User', label: 'Staff Accounts' },
  { value: 'SystemSetting', label: 'System Settings' },
];

const ENTITY_LABELS: Record<string, string> = {
  User: 'Staff Account',
  MedicalIncident: 'Medical Incident',
  Patient: 'Patient Record',
  EmergencyAlert: 'Emergency Alert',
  MedicineDispensation: 'Medicine Dispensed',
  MedicineBatch: 'Medicine Stock',
  MedicalEquipment: 'Medical Equipment',
  AmbulanceDispatch: 'Ambulance Dispatch',
  MedicalStation: 'Medical Station',
  StationBed: 'Station Bed',
  SystemSetting: 'System Setting',
  Notice: 'Campus Notice',
};

function formatActionLabel(action: string): string {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getActionBadgeStyle(action: string): string {
  const upper = action.toUpperCase();
  if (
    upper.includes('ALERT') ||
    upper.includes('CRITICAL') ||
    upper.includes('EMERGENCY') ||
    upper.includes('DEACTIVATE') ||
    upper.includes('DELETE')
  ) {
    return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/40';
  }
  if (
    upper.includes('CREATE') ||
    upper.includes('REGISTER') ||
    upper.includes('RESOLVE') ||
    upper.includes('DISCHARGE') ||
    upper.includes('DISPENSE') ||
    upper.includes('RESTOCK')
  ) {
    return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-400/40';
  }
  if (upper.includes('DISPATCH') || upper.includes('UPDATE') || upper.includes('ASSIGN')) {
    return 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-400/40';
  }
  return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-400/35';
}

function formatRelativeTime(isoDate: string): string {
  const diffSec = Math.max(
    0,
    Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000)
  );
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function formatReadableDetails(data: unknown): Array<{ key: string; value: string }> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  return Object.entries(data as Record<string, unknown>)
    .filter(
      ([k, v]) =>
        v !== null &&
        v !== undefined &&
        v !== '' &&
        !k.toLowerCase().endsWith('id') &&
        k !== 'passwordHash'
    )
    .slice(0, 8)
    .map(([k, v]) => ({
      key: k
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim(),
      value:
        typeof v === 'object'
          ? JSON.stringify(v)
          : String(v),
    }));
}

export function ActivityAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs', page, search, entityType],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (search.trim()) params.set('search', search.trim());
      if (entityType !== 'ALL') params.set('entityType', entityType);
      return apiRequest<AuditLogsPayload>(`/audit-logs?${params.toString()}`);
    },
  });

  const logs = data?.data.logs ?? [];
  const stats = data?.data.stats;
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumbs={['Governance & Audit', 'Activity Log']}
        title="Staff Activity & Audit History"
        subtitle="A clear, chronological timeline of medical actions, patient updates, dispatches, and system changes across the team."
        actions={
          <a
            href={getExportUrl('audit')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-sans text-[13px] font-semibold transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Download CSV</span>
          </a>
        }
      />

      <ErrorBanner message={error instanceof Error ? error.message : null} />

      {/* Friendly Summary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard
          label="Total Recorded Actions"
          value={stats?.totalEvents ?? 0}
          icon="history"
          footerLeft="Activity timeline"
          footerRight="All Staff"
        />
        <KpiCard
          label="Staff Currently Online"
          value={stats?.activeSessionsCount ?? 0}
          icon="group"
          footerLeft="Active sessions"
          footerRight="Logged In"
        />
        <KpiCard
          label="Medicine Co-Signs"
          value={stats?.controlledMedCount ?? 0}
          icon="verified_user"
          footerLeft="Dual-checked"
          footerRight="Verified"
        />
        <KpiCard
          label="History Protection"
          value="Safe"
          icon="check_circle"
          footerLeft="Tamper-proof"
          footerRight="Read-Only"
        />
      </div>

      {/* Simple Search & Category Filter */}
      <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 p-4 shadow-card flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by staff name, activity, or description..."
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low font-sans text-[13px] text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2.5">
          <label
            htmlFor="audit-entity-filter"
            className="font-sans text-[12px] text-on-surface-variant font-semibold shrink-0"
          >
            Category:
          </label>
          <GlassSelect
            id="audit-entity-filter"
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </GlassSelect>
        </div>
      </section>

      {/* Human-Friendly Activity Feed Table */}
      <section className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 shadow-card overflow-hidden">
        <div className="overflow-x-auto emrms-table-scroll">
          <table className="w-full text-left border-collapse font-sans text-[13px] min-w-[700px]">
            <thead>
              <tr className="border-b border-outline-variant/30 bg-surface-container-low/70 font-sans text-[11px] uppercase tracking-wider text-on-surface-variant font-semibold">
                <th className="py-3.5 px-4">When</th>
                <th className="py-3.5 px-4">Team Member</th>
                <th className="py-3.5 px-4">Activity</th>
                <th className="py-3.5 px-4">What Happened</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 font-sans text-[13px]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-on-surface-variant">
                    Loading recent team activity...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-on-surface-variant">
                    No activity found for this search or category.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actorName = log.actor?.fullName ?? 'Automated System';
                  const actorRole = log.actor
                    ? ROLE_LABELS[log.actor.role]
                    : 'System Process';
                  const initials = actorName
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  const friendlyCategory =
                    ENTITY_LABELS[log.entityType] ?? log.entityType;

                  return (
                    <tr key={log.id} className="hover:bg-surface-container-low/40">
                      {/* 1. Friendly Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-on-surface flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                          <span>{formatRelativeTime(log.createdAt)}</span>
                        </div>
                        <div className="font-sans text-[11.5px] text-outline mt-0.5 tabular-metrics">
                          {new Date(log.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          •{' '}
                          {new Date(log.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </td>

                      {/* 2. Staff Member */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center font-sans text-[11.5px] font-bold shrink-0 border border-primary/20">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-on-surface truncate">
                              {actorName}
                            </div>
                            <div className="font-sans text-[11px] text-outline truncate">
                              {actorRole}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Friendly Activity Badge & Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full border font-sans text-[11px] font-semibold ${getActionBadgeStyle(
                            log.action
                          )}`}
                        >
                          {formatActionLabel(log.action)}
                        </span>
                        <div className="font-sans text-[11.5px] text-on-surface-variant mt-1">
                          {friendlyCategory}
                        </div>
                      </td>

                      {/* 4. Clear Human Description */}
                      <td className="py-3.5 px-4 max-w-md">
                        <p className="text-on-surface leading-snug">
                          {log.summary}
                        </p>
                      </td>

                      {/* 5. Simple View Button */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-low hover:bg-surface-container-high text-primary font-sans text-[12px] font-semibold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-outline-variant/30 bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-2 font-sans text-[12px]">
            <span className="text-on-surface-variant tabular-metrics">
              Showing page <strong>{meta.page}</strong> of{' '}
              <strong>{meta.totalPages}</strong> ({meta.total} activities)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3.5 py-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest disabled:opacity-40 hover:bg-surface-container-high font-semibold transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3.5 py-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest disabled:opacity-40 hover:bg-surface-container-high font-semibold transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Human-Friendly Activity Details Modal */}
      <Modal
        open={Boolean(selectedLog)}
        title="Activity Summary"
        onClose={() => setSelectedLog(null)}
      >
        {selectedLog && (
          <div className="flex flex-col gap-4 font-sans text-[13px]">
            {/* Top Summary Banner */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/50 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span
                  className={`inline-flex px-2.5 py-0.5 rounded-full border font-sans text-[11px] font-semibold ${getActionBadgeStyle(
                    selectedLog.action
                  )}`}
                >
                  {formatActionLabel(selectedLog.action)}
                </span>
                <span className="font-sans text-[12px] text-outline tabular-metrics">
                  {new Date(selectedLog.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="font-headline text-[15px] font-bold text-on-surface leading-snug mt-0.5">
                {selectedLog.summary}
              </p>
            </div>

            {/* Who & Where Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40">
                <div className="text-[11px] uppercase tracking-wider text-outline font-semibold mb-1">
                  Performed By
                </div>
                <div className="font-semibold text-on-surface flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-primary shrink-0" />
                  <span>{selectedLog.actor?.fullName ?? 'Automated System'}</span>
                </div>
                <div className="text-[12px] text-on-surface-variant mt-0.5">
                  {selectedLog.actor
                    ? ROLE_LABELS[selectedLog.actor.role]
                    : 'System Process'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40">
                <div className="text-[11px] uppercase tracking-wider text-outline font-semibold mb-1">
                  Section / Category
                </div>
                <div className="font-semibold text-on-surface">
                  {ENTITY_LABELS[selectedLog.entityType] ?? selectedLog.entityType}
                </div>
                <div className="text-[12px] text-on-surface-variant mt-0.5">
                  {formatRelativeTime(selectedLog.createdAt)}
                </div>
              </div>
            </div>

            {/* Human-Readable Recorded Values (if present) */}
            {formatReadableDetails(selectedLog.afterJson).length > 0 && (
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/40">
                <div className="text-[11px] uppercase tracking-wider text-outline font-semibold mb-2.5">
                  Recorded Information
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {formatReadableDetails(selectedLog.afterJson).map((item) => (
                    <div
                      key={item.key}
                      className="flex flex-col p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30"
                    >
                      <span className="text-[11px] text-outline font-medium">
                        {item.key}
                      </span>
                      <span className="font-semibold text-on-surface truncate mt-0.5">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
