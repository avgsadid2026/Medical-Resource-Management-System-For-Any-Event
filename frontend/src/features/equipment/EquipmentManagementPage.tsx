import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
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

interface EquipmentRow {
  id: string;
  assetCode: string;
  name: string;
  model: string;
  serialNumber: string;
  category: string;
  status: string;
  batteryPct: number | null;
  lastInspectedAt: string | null;
  notes: string | null;
  station: { id: string; code: string; name: string } | null;
}

export function EquipmentManagementPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [assetCode, setAssetCode] = useState('');
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [category, setCategory] = useState('AED');
  const [stationId, setStationId] = useState('');
  const [batteryPct, setBatteryPct] = useState('100');

  const canRegister = hasRole(user?.role, [
    'SUPER_ADMIN',
    'MEDICAL_ADMIN',
    'DISPATCHER',
  ]);
  const canUpdate = hasRole(user?.role, [
    'SUPER_ADMIN',
    'MEDICAL_ADMIN',
    'NURSE',
    'DISPATCHER',
  ]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['equipment', search, categoryFilter],
    queryFn: async () => {
      const qs = new URLSearchParams({
        ...(search ? { search } : {}),
        ...(categoryFilter !== 'ALL' ? { category: categoryFilter } : {}),
      });
      return (await apiRequest<EquipmentRow[]>(`/equipment?${qs.toString()}`)).data;
    },
  });

  const { data: stations = [] } = useQuery({
    queryKey: ['stations'],
    queryFn: async () =>
      (await apiRequest<Array<{ id: string; code: string; name: string }>>('/stations'))
        .data,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest('/equipment', {
        method: 'POST',
        body: {
          assetCode,
          name,
          model,
          serialNumber,
          category,
          stationId: stationId || null,
          batteryPct: batteryPct ? Number(batteryPct) : null,
        },
      }),
    onSuccess: () => {
      setOpen(false);
      setAssetCode('');
      setName('');
      setModel('');
      setSerialNumber('');
      setErrorMsg(null);
      void queryClient.invalidateQueries({ queryKey: ['equipment'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) =>
      setErrorMsg(err instanceof ApiError ? err.message : 'Failed to register asset.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest(`/equipment/${id}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['equipment'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const lowBattery = items.filter((i) => i.batteryPct !== null && i.batteryPct < 25);

  return (
    <div className="flex flex-col gap-space-lg">
      <PageHeader
        breadcrumbs={['Resources & Logistics', 'Medical Equipment']}
        title="Medical Equipment & Asset Control"
        subtitle="Track AEDs, patient monitors, oxygen concentrators, suction units, battery checks, and manual inspections."
        actions={
          canRegister && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-on-primary rounded-xl font-sans text-[13px] font-semibold transition-all shadow-sm"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Register Equipment</span>
            </button>
          )
        }
      />

      <ErrorBanner message={errorMsg} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard label="Total Assets" value={items.length} icon="medical_services" />
        <KpiCard
          label="AED Units"
          value={items.filter((i) => i.category === 'AED').length}
          icon="monitor_heart"
        />
        <KpiCard
          label="Low Battery (<25%)"
          value={lowBattery.length}
          critical={lowBattery.length > 0}
          icon="battery_alert"
        />
        <KpiCard
          label="Operational"
          value={
            items.filter((i) => i.status === 'OPERATIONAL' || i.status === 'IN_USE').length
          }
          icon="check_circle"
        />
      </div>

      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/60 shadow-card flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search asset ID, model, serial number..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-surface-container-low rounded-xl font-sans text-[13px] border border-outline-variant/60 outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <GlassSelect
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-auto"
        >
          <option value="ALL">All Categories</option>
          <option value="AED">AED / Defibrillator</option>
          <option value="MONITOR">Monitor</option>
          <option value="OXYGEN">Oxygen</option>
          <option value="SUCTION">Suction</option>
          <option value="DIAGNOSTIC">Diagnostic</option>
          <option value="STRETCHER">Stretcher</option>
        </GlassSelect>
      </div>

      <div className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 shadow-card overflow-hidden">
        <div className="overflow-x-auto emrms-table-scroll">
          <table className="w-full text-left font-sans text-[13px] min-w-[860px]">
            <thead>
              <tr className="bg-surface-container-low/70 text-on-surface-variant font-sans text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Equipment &amp; Asset ID</th>
                <th className="py-3 px-3.5">Class</th>
                <th className="py-3 px-3">Station</th>
                <th className="py-3 px-3">Battery</th>
                <th className="py-3 px-3">Last Inspected</th>
                <th className="py-3 px-3">State</th>
                {canUpdate && <th className="py-3 px-4 text-right">Control</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-outline">
                    Loading hardware registry...
                  </td>
                </tr>
              ) : (
                items.map((eq) => (
                  <tr key={eq.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-on-surface">{eq.name}</div>
                      <div className="font-label-sm text-label-sm text-outline font-mono">
                        {eq.assetCode} • SN: {eq.serialNumber}
                      </div>
                    </td>
                    <td className="py-3 px-3">{eq.category}</td>
                    <td className="py-3 px-3">{eq.station?.name ?? 'Unassigned'}</td>
                    <td className="py-3 px-3 font-mono font-semibold">
                      {eq.batteryPct !== null ? (
                        <span className={eq.batteryPct < 25 ? 'text-error' : ''}>
                          {eq.batteryPct}%
                        </span>
                      ) : (
                        'Manual'
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-secondary">
                      {eq.lastInspectedAt
                        ? new Date(eq.lastInspectedAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Never'}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={eq.status} />
                    </td>
                    {canUpdate && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <GlassSelect
                            value={eq.status}
                            onChange={(e) =>
                              updateMutation.mutate({
                                id: eq.id,
                                data: { status: e.target.value },
                              })
                            }
                            className="py-1"
                          >
                            <option value="OPERATIONAL">OPERATIONAL</option>
                            <option value="IN_USE">IN USE</option>
                            <option value="LOW_BATTERY">LOW BATTERY</option>
                            <option value="MAINTENANCE">MAINTENANCE</option>
                          </GlassSelect>
                          <button
                            type="button"
                            onClick={() =>
                              updateMutation.mutate({
                                id: eq.id,
                                data: {
                                  markInspected: true,
                                  status: 'OPERATIONAL',
                                  batteryPct: eq.batteryPct !== null ? 100 : null,
                                },
                              })
                            }
                            className="px-2 py-1 bg-primary text-on-primary rounded font-label-sm text-label-sm font-semibold"
                          >
                            Pass Check
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} title="Register Medical Equipment" onClose={() => setOpen(false)}>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              placeholder="Asset Code (EQ-AED-09)"
              value={assetCode}
              onChange={(e) => setAssetCode(e.target.value)}
              className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
            <input
              required
              placeholder="Serial Number"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              placeholder="Device Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
            <input
              required
              placeholder="Model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <GlassSelect
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full"
            >
              <option value="AED">AED</option>
              <option value="MONITOR">Monitor</option>
              <option value="OXYGEN">Oxygen</option>
              <option value="SUCTION">Suction</option>
              <option value="DIAGNOSTIC">Diagnostic</option>
              <option value="STRETCHER">Stretcher</option>
            </GlassSelect>
            <input
              type="number"
              min={0}
              max={100}
              placeholder="Battery % (optional)"
              value={batteryPct}
              onChange={(e) => setBatteryPct(e.target.value)}
              className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
          </div>
          <GlassSelect
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            className="w-full"
          >
            <option value="">-- Assign Station --</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </GlassSelect>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="mt-2 py-2.5 bg-primary text-on-primary rounded font-label-md text-label-md font-semibold"
          >
            {createMutation.isPending ? 'Saving...' : 'Save Asset'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
