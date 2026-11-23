import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Zap } from 'lucide-react';
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

interface AmbulancePayload {
  ambulances: Array<{
    id: string;
    callsign: string;
    plateNumber: string;
    tier: string;
    driverName: string;
    paramedicLead: string;
    status: string;
    fuelPct: number | null;
    equipmentSummary: string | null;
    station: { code: string; name: string } | null;
    dispatches: Array<{
      id: string;
      destinationHospital: string;
      priority: string;
      etaMinutes: number | null;
      status: string;
      incident: { incidentCode: string } | null;
    }>;
  }>;
  dispatches: Array<{
    id: string;
    destinationHospital: string;
    priority: string;
    etaMinutes: number | null;
    status: string;
    dispatchedAt: string;
    ambulance: { callsign: string; tier: string };
    incident: { incidentCode: string } | null;
    dispatchedBy: { fullName: string } | null;
  }>;
}

export function AmbulanceFleetPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [unitOpen, setUnitOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Register Unit form
  const [callsign, setCallsign] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [tier, setTier] = useState('BLS');
  const [driverName, setDriverName] = useState('');
  const [paramedicLead, setParamedicLead] = useState('');

  // Dispatch form
  const [ambulanceId, setAmbulanceId] = useState('');
  const [incidentId, setIncidentId] = useState('');
  const [destinationHospital, setDestinationHospital] = useState(
    'Saidpur CMH Emergency Dept (Demo)'
  );
  const [priority, setPriority] = useState('CODE_RED');
  const [etaMinutes, setEtaMinutes] = useState('8');

  const canManage = hasRole(user?.role, [
    'SUPER_ADMIN',
    'MEDICAL_ADMIN',
    'DISPATCHER',
  ]);
  const canDispatch = hasRole(user?.role, [
    'SUPER_ADMIN',
    'MEDICAL_ADMIN',
    'DOCTOR',
    'DISPATCHER',
  ]);

  const { data, isLoading } = useQuery({
    queryKey: ['ambulances'],
    queryFn: async () => (await apiRequest<AmbulancePayload>('/ambulances')).data,
    refetchInterval: 10000,
  });

  const { data: openIncidents = [] } = useQuery({
    queryKey: ['incidents-for-dispatch'],
    queryFn: async () =>
      (await apiRequest<Array<{ id: string; incidentCode: string }>>('/incidents?limit=50'))
        .data,
    enabled: canDispatch,
  });

  const createUnitMutation = useMutation({
    mutationFn: () =>
      apiRequest('/ambulances', {
        method: 'POST',
        body: { callsign, plateNumber, tier, driverName, paramedicLead, fuelPct: 100 },
      }),
    onSuccess: () => {
      setUnitOpen(false);
      setCallsign('');
      setPlateNumber('');
      setDriverName('');
      setParamedicLead('');
      setErrorMsg(null);
      void queryClient.invalidateQueries({ queryKey: ['ambulances'] });
    },
    onError: (err) =>
      setErrorMsg(err instanceof ApiError ? err.message : 'Failed to register ambulance.'),
  });

  const dispatchMutation = useMutation({
    mutationFn: () =>
      apiRequest('/ambulances/dispatches', {
        method: 'POST',
        body: {
          ambulanceId,
          incidentId: incidentId || null,
          destinationHospital,
          priority,
          etaMinutes: etaMinutes ? Number(etaMinutes) : null,
        },
      }),
    onSuccess: () => {
      setDispatchOpen(false);
      setErrorMsg(null);
      void queryClient.invalidateQueries({ queryKey: ['ambulances'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) =>
      setErrorMsg(err instanceof ApiError ? err.message : 'Dispatch failed.'),
  });

  const updateDispatchMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ARRIVED' | 'COMPLETED' }) =>
      apiRequest(`/ambulances/dispatches/${id}`, {
        method: 'PATCH',
        body: { status },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ambulances'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const completeDispatchMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/ambulances/dispatches/${id}`, {
        method: 'PATCH',
        body: { status: 'COMPLETED' },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ambulances'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const ambulances = data?.ambulances ?? [];
  const dispatches = data?.dispatches ?? [];
  const standbyUnits = ambulances.filter((a) => a.status === 'STANDBY');

  return (
    <div className="flex flex-col gap-space-lg">
      <PageHeader
        breadcrumbs={['Resources & Logistics', 'Ambulance Fleet']}
        title="Ambulance Fleet & Rapid Transit Command"
        subtitle="Manage standby ambulances, crew assignments, and patient transfer dispatches."
        actions={
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                type="button"
                onClick={() => setUnitOpen(true)}
                className="px-3.5 py-2 bg-surface-container-lowest border border-outline-variant/60 hover:bg-surface-container-high rounded-xl font-sans text-[13px] font-semibold transition-colors shadow-sm"
              >
                + Register Unit
              </button>
            )}
            {canDispatch && (
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setAmbulanceId(standbyUnits[0]?.id ?? '');
                  setDispatchOpen(true);
                }}
                className="px-4 py-2 bg-primary text-on-primary rounded-xl font-sans text-[13px] font-semibold flex items-center gap-1.5 shadow-sm hover:bg-primary/95 transition-all"
              >
                <Zap className="w-4 h-4 text-white" />
                <span>Dispatch Ambulance</span>
              </button>
            )}
          </div>
        }
      />

      <ErrorBanner message={errorMsg} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard
          label="Total Ambulances"
          value={ambulances.length}
          icon="airport_shuttle"
          footerLeft="University Fleet"
          footerRight="All Units"
        />
        <KpiCard
          label="Available Ambulances"
          value={standbyUnits.length}
          icon="check_circle"
          footerLeft="Standby Ready"
          footerRight="Campus Bays"
        />
        <KpiCard
          label="On Duty / Dispatched"
          value={ambulances.filter((a) => a.status !== 'STANDBY').length}
          critical={ambulances.some((a) => a.status === 'EN_ROUTE')}
          icon="emergency_share"
          footerLeft="In Mission"
          footerRight="Active Transit"
        />
        <KpiCard
          label="Hospital Dispatches"
          value={dispatches.length}
          icon="local_hospital"
          footerLeft="Transfers"
          footerRight="External Care"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        <div className="xl:col-span-8 bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 shadow-card overflow-hidden">
          <div className="px-5 py-4 bg-surface-container-low/70 border-b border-outline-variant/40 flex items-center justify-between">
            <span className="font-sans text-[13px] font-bold text-on-surface uppercase tracking-wider">Active Fleet Ledger</span>
            <span className="font-sans text-[12px] text-on-surface-variant font-medium">Auto-synced</span>
          </div>
          <div className="overflow-x-auto emrms-table-scroll">
            <table className="w-full text-left font-sans text-[13px] min-w-[700px]">
              <thead>
                <tr className="bg-surface-container-low/40 text-on-surface-variant font-sans text-[11px] uppercase tracking-wider font-semibold border-b border-outline-variant/40">
                  <th className="py-3 px-5">Unit &amp; Plate</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4">Crew</th>
                  <th className="py-3 px-4">Fuel</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Mission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-outline font-sans text-[13px]">
                      Loading fleet...
                    </td>
                  </tr>
                ) : (
                  ambulances.map((amb) => {
                    const activeMission = amb.dispatches[0];
                    return (
                      <tr key={amb.id} className="hover:bg-surface-container-low/40 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="font-semibold text-on-surface">{amb.callsign}</div>
                          <div className="font-sans text-[11px] text-outline font-mono">
                            {amb.plateNumber}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-on-surface">{amb.tier.replace('_', ' ')}</td>
                        <td className="py-3.5 px-4">
                          <div className="text-on-surface">D: {amb.driverName}</div>
                          <div className="font-sans text-[11px] text-secondary font-medium">
                            Lead: {amb.paramedicLead}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[12px] font-semibold text-on-surface">{amb.fuelPct ?? '—'}%</td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={amb.status} />
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          {activeMission ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-sans text-[12px] font-bold text-error">
                                {activeMission.destinationHospital}
                              </span>
                              {canManage && (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {activeMission.status !== 'ARRIVED' ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateDispatchMutation.mutate({
                                          id: activeMission.id,
                                          status: 'ARRIVED',
                                        })
                                      }
                                      className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg font-sans text-[11px] font-semibold border border-outline-variant/40 transition-colors"
                                      title="Mark ambulance arrived at destination hospital"
                                    >
                                      Mark Arrived
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      completeDispatchMutation.mutate(activeMission.id)
                                    }
                                    className="px-2.5 py-1 bg-primary text-on-primary rounded-lg font-sans text-[11px] font-semibold shadow-sm hover:bg-primary/95 transition-all"
                                    title="Complete patient transfer and return unit to standby"
                                  >
                                    Transfer Done
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-outline font-sans text-[12px]">
                              {amb.station?.code ?? 'Standby Bay'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-4 bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 shadow-card p-5 flex flex-col gap-3.5">
          <h3 className="font-heading text-[16px] font-bold text-on-surface">
            Recent Transfer Dispatches
          </h3>
          {dispatches.map((d) => (
            <div
              key={d.id}
              className="p-3.5 rounded-xl bg-surface-container-low/70 border border-outline-variant/40 flex flex-col gap-1.5 hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-sans text-[13px] font-bold text-primary">
                  {d.ambulance.callsign}
                  {d.incident ? ` • ${d.incident.incidentCode}` : ''}
                </span>
                <StatusBadge status={d.status} />
              </div>
              <p className="font-sans text-[13px] text-on-surface">
                Destination: {d.destinationHospital}
              </p>
              <div className="flex items-center justify-between font-sans text-[11px] text-outline font-medium">
                <span>
                  {d.priority} {d.etaMinutes ? `• ETA ${d.etaMinutes}m` : ''}
                </span>
                <span>{new Date(d.dispatchedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Register Unit Modal */}
      <Modal open={unitOpen} title="Register Ambulance Unit" onClose={() => setUnitOpen(false)}>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            createUnitMutation.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              placeholder="Callsign (MED-AMB-05)"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
            <input
              required
              placeholder="Plate Number"
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value)}
              className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
          </div>
          <GlassSelect
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="w-full"
          >
            <option value="ALS_ICU">ALS ICU</option>
            <option value="BLS">Basic Life Support (BLS)</option>
            <option value="FIELD_4X4">Field 4x4 Evac</option>
            <option value="MUTUAL_AID">Mutual Aid</option>
          </GlassSelect>
          <input
            required
            placeholder="Driver Name"
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
            className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
          />
          <input
            required
            placeholder="Paramedic Lead"
            value={paramedicLead}
            onChange={(e) => setParamedicLead(e.target.value)}
            className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
          />
          <button
            type="submit"
            disabled={createUnitMutation.isPending}
            className="mt-2 py-2.5 bg-primary text-on-primary rounded font-label-md text-label-md font-semibold"
          >
            Save Unit
          </button>
        </form>
      </Modal>

      {/* Dispatch Modal */}
      <Modal open={dispatchOpen} title="Dispatch Standby Ambulance" onClose={() => setDispatchOpen(false)}>
        {standbyUnits.length === 0 ? (
          <p className="text-error font-body-md">No standby ambulances available right now.</p>
        ) : (
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              dispatchMutation.mutate();
            }}
            className="flex flex-col gap-3"
          >
            <GlassSelect
              required
              value={ambulanceId}
              onChange={(e) => setAmbulanceId(e.target.value)}
              className="w-full"
            >
              {standbyUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.callsign} ({u.tier})
                </option>
              ))}
            </GlassSelect>
            <GlassSelect
              value={incidentId}
              onChange={(e) => setIncidentId(e.target.value)}
              className="w-full"
            >
              <option value="">-- Optional Linked Incident --</option>
              {openIncidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.incidentCode}
                </option>
              ))}
            </GlassSelect>
            <input
              required
              placeholder="Destination Hospital"
              value={destinationHospital}
              onChange={(e) => setDestinationHospital(e.target.value)}
              className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
            <div className="grid grid-cols-2 gap-2">
              <GlassSelect
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full"
              >
                <option value="CODE_RED">Code Red</option>
                <option value="URGENT">Urgent</option>
                <option value="STANDARD">Standard</option>
              </GlassSelect>
              <input
                type="number"
                min={0}
                placeholder="ETA (mins)"
                value={etaMinutes}
                onChange={(e) => setEtaMinutes(e.target.value)}
                className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
              />
            </div>
            <button
              type="submit"
              disabled={dispatchMutation.isPending}
              className="mt-2 py-2.5 bg-error text-on-error rounded font-label-md text-label-md font-bold uppercase"
            >
              {dispatchMutation.isPending ? 'Dispatching...' : 'Authorize Dispatch'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
