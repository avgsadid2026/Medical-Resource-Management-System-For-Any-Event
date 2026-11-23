import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Search } from 'lucide-react';
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

interface NurseRow {
  id: string;
  bnmcNumber: string;
  fullName: string;
  specialty: string;
  vhfCallsign: string | null;
  isRapidResponder: boolean;
  dutyStatus: string;
  station: { id: string; code: string; name: string } | null;
  _count: { leadIncidents: number };
}

export function NurseManagementPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [bnmcNumber, setBnmcNumber] = useState('');
  const [specialty, setSpecialty] = useState('Triage & Vitals');
  const [stationId, setStationId] = useState('');
  const [vhfCallsign, setVhfCallsign] = useState('');
  const [isRapidResponder, setIsRapidResponder] = useState(false);

  const canCreate = hasRole(user?.role, ['SUPER_ADMIN', 'MEDICAL_ADMIN']);
  const canUpdate = hasRole(user?.role, [
    'SUPER_ADMIN',
    'MEDICAL_ADMIN',
    'NURSE',
    'DISPATCHER',
  ]);

  const { data: nurses = [], isLoading } = useQuery({
    queryKey: ['nurses', search],
    queryFn: async () =>
      (
        await apiRequest<NurseRow[]>(
          `/nurses${search ? `?search=${encodeURIComponent(search)}` : ''}`
        )
      ).data,
  });

  const { data: stations = [] } = useQuery({
    queryKey: ['stations'],
    queryFn: async () =>
      (
        await apiRequest<Array<{ id: string; code: string; name: string; stationType?: string }>>(
          '/stations'
        )
      ).data,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest('/nurses', {
        method: 'POST',
        body: {
          fullName,
          bnmcNumber,
          specialty,
          stationId: stationId || null,
          vhfCallsign: vhfCallsign || null,
          isRapidResponder,
        },
      }),
    onSuccess: () => {
      setOpen(false);
      setFullName('');
      setBnmcNumber('');
      setVhfCallsign('');
      setErrorMsg(null);
      void queryClient.invalidateQueries({ queryKey: ['nurses'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) =>
      setErrorMsg(err instanceof ApiError ? err.message : 'Failed to register nurse.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest(`/nurses/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['nurses'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const fieldStations = stations.filter((s) => s.stationType !== 'CENTRAL_DEPOT');

  return (
    <div className="flex flex-col gap-space-lg">
      <PageHeader
        breadcrumbs={['Clinical Workforce', 'Nurse Management']}
        title="Nurse Management & Field Triage Roster"
        subtitle="Track nursing deployments, VHF radio callsigns, rapid field responders, and station coverage."
        actions={
          canCreate && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-on-primary rounded-xl font-sans text-[13px] font-semibold transition-all shadow-sm"
            >
              <UserPlus className="w-4 h-4 text-white" />
              <span>Register Nurse</span>
            </button>
          )
        }
      />

      <ErrorBanner message={errorMsg} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard label="Total Nurses" value={nurses.length} icon="groups" />
        <KpiCard
          label="Active On-Duty"
          value={nurses.filter((n) => n.dutyStatus === 'ON_DUTY').length}
          icon="check_circle"
        />
        <KpiCard
          label="Rapid Responders"
          value={nurses.filter((n) => n.isRapidResponder).length}
          icon="emergency"
        />
        <KpiCard
          label="Intercepting"
          value={nurses.filter((n) => n.dutyStatus === 'INTERCEPTING').length}
          critical={nurses.some((n) => n.dutyStatus === 'INTERCEPTING')}
          icon="directions_run"
        />
      </div>

      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/60 shadow-card">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nurse name, BNMC #, specialty, callsign..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-surface-container-low rounded-xl font-sans text-[13px] border border-outline-variant/60 outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 shadow-card overflow-hidden">
        <div className="overflow-x-auto emrms-table-scroll">
          <table className="w-full text-left font-sans text-[13px] min-w-[800px]">
            <thead>
              <tr className="bg-surface-container-low/70 text-on-surface-variant font-sans text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Nurse Profile</th>
                <th className="py-3 px-3.5">Specialty</th>
                <th className="py-3 px-3">Assigned Station</th>
                <th className="py-3 px-3">VHF Radio</th>
                <th className="py-3 px-3">Status</th>
                {canUpdate && <th className="py-3 px-4 text-right">Update Status</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-outline">
                    Loading nurses...
                  </td>
                </tr>
              ) : (
                nurses.map((n) => (
                  <tr key={n.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-on-surface">
                          {n.fullName}
                        </span>
                        {n.isRapidResponder && (
                          <span className="px-1.5 py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm font-bold uppercase">
                            RAPID
                          </span>
                        )}
                      </div>
                      <span className="font-label-sm text-label-sm text-outline font-mono">
                        BNMC #{n.bnmcNumber}
                      </span>
                    </td>
                    <td className="py-3 px-3">{n.specialty}</td>
                    <td className="py-3 px-3">
                      {canUpdate ? (
                        <GlassSelect
                          value={n.station?.id ?? ''}
                          onChange={(e) =>
                            updateMutation.mutate({
                              id: n.id,
                              data: { stationId: e.target.value || null },
                            })
                          }
                          className="py-1"
                        >
                          <option value="">Unassigned</option>
                          {fieldStations.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.code} — {s.name}
                            </option>
                          ))}
                        </GlassSelect>
                      ) : (
                        n.station?.name ?? 'Unassigned'
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold">
                      {n.vhfCallsign ?? '—'}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={n.dutyStatus} />
                    </td>
                    {canUpdate && (
                      <td className="py-3 px-4 text-right">
                        <GlassSelect
                          value={n.dutyStatus}
                          onChange={(e) =>
                            updateMutation.mutate({
                              id: n.id,
                              data: { dutyStatus: e.target.value },
                            })
                          }
                          className="py-1"
                        >
                          <option value="ON_DUTY">ON DUTY</option>
                          <option value="INTERCEPTING">INTERCEPTING</option>
                          <option value="STANDBY">STANDBY</option>
                          <option value="OFF_DUTY">OFF DUTY</option>
                        </GlassSelect>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} title="Register Clinical Nurse" onClose={() => setOpen(false)}>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <input
            required
            placeholder="Full Name (e.g., Tasnim Akter, RN)"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              placeholder="BNMC License #"
              value={bnmcNumber}
              onChange={(e) => setBnmcNumber(e.target.value)}
              className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
            <input
              placeholder="VHF Callsign (e.g., RN-07)"
              value={vhfCallsign}
              onChange={(e) => setVhfCallsign(e.target.value)}
              className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
          </div>
          <input
            required
            placeholder="Clinical Specialty"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
          />
          <GlassSelect
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            className="w-full"
          >
            <option value="">-- Assign Station --</option>
            {fieldStations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </GlassSelect>
          <label className="flex items-center gap-2 font-body-sm text-body-sm">
            <input
              type="checkbox"
              checked={isRapidResponder}
              onChange={(e) => setIsRapidResponder(e.target.checked)}
              className="accent-primary"
            />
            <span>Rapid Field Responder Unit</span>
          </label>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="mt-2 py-2.5 bg-primary text-on-primary rounded font-label-md text-label-md font-semibold"
          >
            {createMutation.isPending ? 'Saving...' : 'Save Nurse'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
