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

interface DoctorRow {
  id: string;
  bmdcNumber: string;
  fullName: string;
  specialization: string;
  isStationLead: boolean;
  radioChannel: string | null;
  phoneExt: string | null;
  dutyStatus: string;
  station: { id: string; code: string; name: string } | null;
  _count: { leadIncidents: number };
}

export function DoctorManagementPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [bmdcNumber, setBmdcNumber] = useState('');
  const [specialization, setSpecialization] = useState('Emergency Medicine');
  const [stationId, setStationId] = useState('');
  const [radioChannel, setRadioChannel] = useState('MED-CH1');
  const [phoneExt, setPhoneExt] = useState('');
  const [isStationLead, setIsStationLead] = useState(false);

  const canCreate = hasRole(user?.role, ['SUPER_ADMIN', 'MEDICAL_ADMIN']);
  const canUpdate = hasRole(user?.role, ['SUPER_ADMIN', 'MEDICAL_ADMIN', 'DISPATCHER']);

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors', search, statusFilter],
    queryFn: async () => {
      const qs = new URLSearchParams({
        ...(search ? { search } : {}),
        ...(statusFilter !== 'ALL' ? { dutyStatus: statusFilter } : {}),
      });
      return (await apiRequest<DoctorRow[]>(`/doctors?${qs.toString()}`)).data;
    },
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
      apiRequest('/doctors', {
        method: 'POST',
        body: {
          fullName,
          bmdcNumber,
          specialization,
          stationId: stationId || null,
          radioChannel: radioChannel || null,
          phoneExt: phoneExt || null,
          isStationLead,
        },
      }),
    onSuccess: () => {
      setOpen(false);
      setFullName('');
      setBmdcNumber('');
      setPhoneExt('');
      setIsStationLead(false);
      setErrorMsg(null);
      void queryClient.invalidateQueries({ queryKey: ['doctors'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) =>
      setErrorMsg(err instanceof ApiError ? err.message : 'Failed to register doctor.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest(`/doctors/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['doctors'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) =>
      setErrorMsg(err instanceof ApiError ? err.message : 'Update failed.'),
  });

  const fieldStations = stations.filter((s) => s.stationType !== 'CENTRAL_DEPOT');

  return (
    <div className="flex flex-col gap-space-lg">
      <PageHeader
        breadcrumbs={['Clinical Workforce', 'Doctor Management']}
        title="Doctor Management & Clinical Duty Roster"
        subtitle="Manage attending physicians, station assignments, lead doctor designations, and live duty status."
        actions={
          canCreate && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-on-primary rounded-xl font-sans text-[13px] font-semibold transition-all shadow-sm"
            >
              <UserPlus className="w-4 h-4 text-white" />
              <span>Register Physician</span>
            </button>
          )
        }
      />

      <ErrorBanner message={errorMsg} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard label="Total Physicians" value={doctors.length} icon="badge" />
        <KpiCard
          label="Active On-Duty"
          value={doctors.filter((d) => d.dutyStatus === 'ON_DUTY').length}
          icon="stethoscope"
        />
        <KpiCard
          label="Code Red Responding"
          value={doctors.filter((d) => d.dutyStatus === 'CODE_RED').length}
          critical={doctors.some((d) => d.dutyStatus === 'CODE_RED')}
          icon="ecg_heart"
        />
        <KpiCard
          label="Station Leads"
          value={doctors.filter((d) => d.isStationLead).length}
          icon="verified_user"
        />
      </div>

      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/60 shadow-card flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search physician name, BMDC #, specialization..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-surface-container-low rounded-xl font-sans text-[13px] border border-outline-variant/60 outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <GlassSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto"
        >
          <option value="ALL">All Duty States</option>
          <option value="ON_DUTY">On Duty</option>
          <option value="CODE_RED">Code Red</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="STANDBY">Standby</option>
          <option value="OFF_DUTY">Off Duty</option>
        </GlassSelect>
      </div>

      <div className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 shadow-card overflow-hidden">
        <div className="overflow-x-auto emrms-table-scroll">
          <table className="w-full text-left font-sans text-[13px] min-w-[820px]">
            <thead>
              <tr className="bg-surface-container-low/70 text-on-surface-variant font-sans text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Physician</th>
                <th className="py-3 px-3">Specialization</th>
                <th className="py-3 px-3">Station Post</th>
                <th className="py-3 px-3">Radio / Ext</th>
                <th className="py-3 px-3">Cases</th>
                <th className="py-3 px-3">Duty Status</th>
                {canUpdate && <th className="py-3 px-4 text-right">Quick Update</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-outline">
                    Loading roster...
                  </td>
                </tr>
              ) : (
                doctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-on-surface">
                          {doc.fullName}
                        </span>
                        {doc.isStationLead && (
                          <span className="bg-primary text-on-primary font-label-sm text-label-sm px-1.5 py-0.5 rounded font-bold uppercase">
                            LEAD
                          </span>
                        )}
                      </div>
                      <span className="font-label-sm text-label-sm text-outline font-mono">
                        BMDC #{doc.bmdcNumber}
                      </span>
                    </td>
                    <td className="py-3 px-3">{doc.specialization}</td>
                    <td className="py-3 px-3">
                      {canUpdate ? (
                        <GlassSelect
                          value={doc.station?.id ?? ''}
                          onChange={(e) =>
                            updateMutation.mutate({
                              id: doc.id,
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
                        doc.station?.name ?? 'Unassigned'
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-secondary">
                      {doc.radioChannel ?? '—'} {doc.phoneExt ? `/ ${doc.phoneExt}` : ''}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold">
                      {doc._count.leadIncidents}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={doc.dutyStatus} />
                    </td>
                    {canUpdate && (
                      <td className="py-3 px-4 text-right">
                        <GlassSelect
                          value={doc.dutyStatus}
                          onChange={(e) =>
                            updateMutation.mutate({
                              id: doc.id,
                              data: { dutyStatus: e.target.value },
                            })
                          }
                          className="py-1"
                        >
                          <option value="ON_DUTY">ON DUTY</option>
                          <option value="CODE_RED">CODE RED</option>
                          <option value="IN_TRANSIT">IN TRANSIT</option>
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

      <Modal open={open} title="Register Attending Physician" onClose={() => setOpen(false)}>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <input
            required
            placeholder="Full Name (e.g., Dr. Hasan Mahmud)"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              placeholder="BMDC Number (e.g., A-72011)"
              value={bmdcNumber}
              onChange={(e) => setBmdcNumber(e.target.value)}
              className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
            <input
              required
              placeholder="Specialization"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
          </div>
          <GlassSelect
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            className="w-full"
          >
            <option value="">-- Assign Station (Optional) --</option>
            {fieldStations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </GlassSelect>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Radio Channel (MED-CH1)"
              value={radioChannel}
              onChange={(e) => setRadioChannel(e.target.value)}
              className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
            <input
              placeholder="Phone Ext (e.g., 408)"
              value={phoneExt}
              onChange={(e) => setPhoneExt(e.target.value)}
              className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
          </div>
          <label className="flex items-center gap-2 font-body-sm text-body-sm">
            <input
              type="checkbox"
              checked={isStationLead}
              onChange={(e) => setIsStationLead(e.target.checked)}
              className="accent-primary"
            />
            <span>Designate as Station Lead Doctor</span>
          </label>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="mt-2 py-2.5 bg-primary text-on-primary rounded font-label-md text-label-md font-semibold"
          >
            {createMutation.isPending ? 'Saving...' : 'Save Physician'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
