import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Megaphone } from 'lucide-react';
import {
  ErrorBanner,
  GlassSelect,
  KpiCard,
  Modal,
  PageHeader,
  StatusBadge,
} from '@/components/shared/UiPrimitives';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest, ApiError } from '@/lib/apiClient';
import { hasRole } from '@/lib/permissions';

interface AlertItem {
  id: string;
  severity: 'P1_CRITICAL' | 'P2_URGENT' | 'BROADCAST';
  title: string;
  locationText: string;
  description: string | null;
  status: 'ACTIVE' | 'INTERCEPTING' | 'ON_SCENE' | 'RESOLVED';
  createdAt: string;
  incident: { id: string; incidentCode: string; triagePriority: string } | null;
  createdBy: { fullName: string; role: string } | null;
  acknowledgedBy: { fullName: string; role: string } | null;
}

export function EmergencyAlertsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString());
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [severity, setSeverity] = useState<'P1_CRITICAL' | 'P2_URGENT' | 'BROADCAST'>(
    'P1_CRITICAL'
  );
  const [title, setTitle] = useState('');
  const [locationText, setLocationText] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts', statusFilter],
    queryFn: async () =>
      (await apiRequest<AlertItem[]>(`/alerts?status=${statusFilter}`)).data,
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest('/alerts', {
        method: 'POST',
        body: { severity, title, locationText, description },
      }),
    onSuccess: () => {
      setModalOpen(false);
      setTitle('');
      setLocationText('');
      setDescription('');
      setErrorMsg(null);
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
      void queryClient.invalidateQueries({ queryKey: ['nav-alert-count'] });
    },
    onError: (err) =>
      setErrorMsg(err instanceof ApiError ? err.message : 'Failed to create alert.'),
  });

  const ackMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/alerts/${id}/acknowledge`, { method: 'PATCH' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
      void queryClient.invalidateQueries({ queryKey: ['nav-alert-count'] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/alerts/${id}/resolve`, { method: 'PATCH' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
      void queryClient.invalidateQueries({ queryKey: ['nav-alert-count'] });
    },
  });

  const unresolved = alerts.filter((a) => a.status !== 'RESOLVED');
  const p1Unresolved = unresolved.filter((a) => a.severity === 'P1_CRITICAL');
  const canBroadcast = hasRole(user?.role, [
    'SUPER_ADMIN',
    'MEDICAL_ADMIN',
    'DISPATCHER',
  ]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="flex flex-col gap-space-lg">
      {/* Priority Banner */}
      {p1Unresolved.length > 0 && (
        <div className="bg-rose-600/85 dark:bg-rose-600/75 backdrop-blur-2xl text-on-error p-4 sm:p-5 rounded-2xl border border-rose-300/50 dark:border-rose-400/40 shadow-[0_12px_32px_-4px_rgba(225,29,72,0.28),inset_0_1px_1px_rgba(255,255,255,0.35)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-white/90 backdrop-blur-md text-rose-600 flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <span className="font-mono text-[10.5px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md font-bold">
                Priority Alert Queue
              </span>
              <h2 className="font-headline text-[18px] sm:text-[20px] font-bold mt-1 tracking-tight">
                {p1Unresolved.length} UNRESOLVED CRITICAL P1 ALERT(S) ACTIVE
              </h2>
            </div>
          </div>
          <div className="font-mono text-[12px] font-bold bg-white/15 px-3 py-1.5 rounded-xl border border-white/20 shrink-0">
            SYSTEM CLOCK: {clock}
          </div>
        </div>
      )}

      <PageHeader
        breadcrumbs={['Core Dispatch', 'Emergency Alerts']}
        title="Emergency Alerts & Command Queue"
        subtitle="Real-time emergency alerts, response tracking, and target response times."
        actions={
          canBroadcast && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-error text-on-error rounded-xl font-sans text-[12px] font-bold uppercase tracking-wider shadow-sm hover:opacity-90 transition-opacity"
            >
              <Megaphone className="w-4 h-4 text-white" />
              <span>Trigger Alert / Broadcast</span>
            </button>
          )
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard
          label="Active P1 Critical"
          value={p1Unresolved.length}
          critical={p1Unresolved.length > 0}
          icon="e911_emergency"
        />
        <KpiCard
          label="Total Unresolved"
          value={unresolved.length}
          icon="notifications_active"
        />
        <KpiCard
          label="Resolved Alerts"
          value={alerts.filter((a) => a.status === 'RESOLVED').length}
          icon="check_circle"
        />
        <KpiCard label="Auto-Refresh" value="5s" subValue="Auto Sync" icon="sync" />
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 p-1.5 bg-surface-container-low rounded-xl border border-outline-variant/60 w-fit flex-wrap">
        {['ALL', 'ACTIVE', 'INTERCEPTING', 'ON_SCENE', 'RESOLVED'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg font-sans text-[11.5px] font-semibold uppercase tracking-wider transition-colors ${
              statusFilter === st
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-on-surface-variant font-sans text-[13px]">Loading alerts...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {alerts.map((alert) => {
            const isCritical =
              alert.severity === 'P1_CRITICAL' && alert.status !== 'RESOLVED';
            return (
              <div
                key={alert.id}
                className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 shadow-card hover:shadow-soft transition-all duration-200 overflow-hidden flex flex-col justify-between"
              >
                <div
                  className={`px-4 py-2.5 flex items-center justify-between ${
                    isCritical
                      ? 'bg-error text-on-error'
                      : 'bg-surface-container-low/80 text-on-surface border-b border-outline-variant/30'
                  }`}
                >
                  <span className="font-mono text-[11px] uppercase tracking-wider font-bold">
                    {alert.severity.replace('_', ' ')}
                    {alert.incident ? ` • ${alert.incident.incidentCode}` : ''}
                  </span>
                  <span className="font-mono text-[11.5px]">
                    {new Date(alert.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-headline text-[16px] font-bold text-on-surface">
                        {alert.title}
                      </h3>
                      <p className="font-sans text-[12.5px] text-on-surface-variant mt-0.5">
                        Location: <strong className="text-on-surface">{alert.locationText}</strong>
                      </p>
                    </div>
                    <StatusBadge status={alert.status} />
                  </div>

                  {alert.description && (
                    <p className="font-sans text-[13px] text-on-surface-variant bg-surface-container-low/70 p-3 rounded-xl border border-outline-variant/30">
                      {alert.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-outline-variant/30">
                    <span className="font-sans text-[11.5px] text-outline">
                      {alert.acknowledgedBy
                        ? `Ack by: ${alert.acknowledgedBy.fullName}`
                        : `By: ${alert.createdBy?.fullName ?? 'System'}`}
                    </span>
                    <div className="flex items-center gap-2">
                      {alert.status === 'ACTIVE' && (
                        <button
                          type="button"
                          onClick={() => ackMutation.mutate(alert.id)}
                          className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-on-primary rounded-xl font-sans text-[11.5px] font-semibold uppercase tracking-wider shadow-xs transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                      {alert.status !== 'RESOLVED' && (
                        <button
                          type="button"
                          onClick={() => resolveMutation.mutate(alert.id)}
                          className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl font-sans text-[11.5px] font-semibold uppercase tracking-wider transition-colors"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Triage SLA Reference Matrix */}
      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-surface-container-low border-b border-outline-variant/20">
          <h3 className="font-headline-md text-headline-md text-on-surface">
            Event Triage &amp; Escalation Protocol Matrix
          </h3>
        </div>
        <div className="overflow-x-auto emrms-table-scroll">
          <table className="w-full text-left font-body-sm text-body-sm min-w-[600px]">
            <thead>
              <tr className="bg-surface-container-low text-outline font-label-sm text-label-sm uppercase">
                <th className="py-2.5 px-4">Tier</th>
                <th className="py-2.5 px-4">Examples</th>
                <th className="py-2.5 px-4">Primary Response</th>
                <th className="py-2.5 px-4 text-right">Target Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              <tr>
                <td className="py-2.5 px-4 font-bold text-error">P1 Immediate</td>
                <td className="py-2.5 px-4">Anaphylaxis, Cardiac Arrest, Unconscious Syncope</td>
                <td className="py-2.5 px-4">Nearest Doctor + ALS Ambulance + AED</td>
                <td className="py-2.5 px-4 text-right font-mono font-bold">≤ 2m 00s</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold">P2 Urgent</td>
                <td className="py-2.5 px-4">Heat Exhaustion, Lacerations, Fractures</td>
                <td className="py-2.5 px-4">Field Nurse + Station Bed Assignment</td>
                <td className="py-2.5 px-4 text-right font-mono font-bold">≤ 6m 00s</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold">P3 Minor</td>
                <td className="py-2.5 px-4">Minor Sprains, Headaches, Mild Dehydration</td>
                <td className="py-2.5 px-4">Station Walk-In First Aid</td>
                <td className="py-2.5 px-4 text-right font-mono font-bold">≤ 15m 00s</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        title="Trigger Emergency Alert / Broadcast"
        onClose={() => setModalOpen(false)}
      >
        <ErrorBanner message={errorMsg} />
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block font-label-sm text-label-sm uppercase text-outline mb-1">
              Severity
            </label>
            <GlassSelect
              value={severity}
              onChange={(e) => setSeverity(e.target.value as typeof severity)}
              className="w-full"
            >
              <option value="P1_CRITICAL">P1 Critical</option>
              <option value="P2_URGENT">P2 Urgent</option>
              <option value="BROADCAST">Command Broadcast</option>
            </GlassSelect>
          </div>
          <div>
            <label className="block font-label-sm text-label-sm uppercase text-outline mb-1">
              Alert Title
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Heat Syncope at Main Stage"
              className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
          </div>
          <div>
            <label className="block font-label-sm text-label-sm uppercase text-outline mb-1">
              Campus Location
            </label>
            <input
              required
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="e.g., Main Stage Front Barrier"
              className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
          </div>
          <div>
            <label className="block font-label-sm text-label-sm uppercase text-outline mb-1">
              Instructions / Details
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="mt-2 py-2.5 bg-error text-on-error rounded font-label-md text-label-md font-bold uppercase"
          >
            {createMutation.isPending ? 'Broadcasting...' : 'Publish Alert'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
