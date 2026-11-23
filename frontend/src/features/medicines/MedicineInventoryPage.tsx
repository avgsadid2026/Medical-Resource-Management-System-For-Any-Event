import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Syringe, PlusSquare, Search } from 'lucide-react';
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

interface MedicineItem {
  id: string;
  skuCode: string;
  name: string;
  genericName: string;
  category: string;
  storageRequirement: string;
  isControlled: boolean;
  unitLabel: string;
  minParLevel: number;
  totalQuantity: number;
  totalMax: number;
  stockStatus: 'CRITICAL' | 'LOW' | 'OPTIMAL';
  batches: Array<{
    id: string;
    batchNumber: string;
    quantity: number;
    maxQuantity: number;
    expiryDate: string;
    station: { id: string; code: string; name: string };
  }>;
}

interface MedicinesPayload {
  medicines: MedicineItem[];
  totalDispensations: number;
  verifiers: Array<{ id: string; fullName: string; role: string }>;
}

export function MedicineInventoryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [skuModalOpen, setSkuModalOpen] = useState(false);
  const [restockOpen, setRestockOpen] = useState(false);
  const [dispenseOpen, setDispenseOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // SKU Form
  const [skuCode, setSkuCode] = useState('');
  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [category, setCategory] = useState('Hydration & Electrolytes');
  const [storageRequirement, setStorageRequirement] = useState('Ambient < 25 C');
  const [unitLabel, setUnitLabel] = useState('units');
  const [minParLevel, setMinParLevel] = useState('20');
  const [isControlled, setIsControlled] = useState(false);

  // Restock Form
  const [restockMedId, setRestockMedId] = useState('');
  const [restockStationId, setRestockStationId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState('50');
  const [expiryDate, setExpiryDate] = useState('2027-12-31');

  // Dispense Form
  const [dispenseIncidentId, setDispenseIncidentId] = useState('');
  const [dispenseBatchId, setDispenseBatchId] = useState('');
  const [dispenseQty, setDispenseQty] = useState('1');
  const [doseRoute, setDoseRoute] = useState('Oral / IV per protocol');
  const [verifiedByUserId, setVerifiedByUserId] = useState('');

  const canManageStock = hasRole(user?.role, [
    'SUPER_ADMIN',
    'MEDICAL_ADMIN',
    'DISPATCHER',
  ]);
  const canDispense = hasRole(user?.role, [
    'SUPER_ADMIN',
    'MEDICAL_ADMIN',
    'DOCTOR',
    'NURSE',
  ]);

  const { data, isLoading } = useQuery({
    queryKey: ['medicines', search],
    queryFn: async () =>
      (
        await apiRequest<MedicinesPayload>(
          `/medicines${search ? `?search=${encodeURIComponent(search)}` : ''}`
        )
      ).data,
  });

  const { data: stations = [] } = useQuery({
    queryKey: ['stations'],
    queryFn: async () =>
      (await apiRequest<Array<{ id: string; code: string; name: string }>>('/stations'))
        .data,
  });

  const { data: openIncidents = [] } = useQuery({
    queryKey: ['open-incidents-for-meds'],
    queryFn: async () =>
      (
        await apiRequest<Array<{ id: string; incidentCode: string; chiefComplaint?: string }>>(
          '/incidents?limit=50'
        )
      ).data,
    enabled: canDispense,
  });

  const createSkuMutation = useMutation({
    mutationFn: () =>
      apiRequest('/medicines', {
        method: 'POST',
        body: {
          skuCode,
          name,
          genericName,
          category,
          storageRequirement,
          unitLabel,
          minParLevel: Number(minParLevel),
          isControlled,
        },
      }),
    onSuccess: () => {
      setSkuModalOpen(false);
      setSkuCode('');
      setName('');
      setGenericName('');
      setErrorMsg(null);
      void queryClient.invalidateQueries({ queryKey: ['medicines'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) =>
      setErrorMsg(err instanceof ApiError ? err.message : 'Failed to create SKU.'),
  });

  const restockMutation = useMutation({
    mutationFn: () =>
      apiRequest('/medicines/batches', {
        method: 'POST',
        body: {
          medicineId: restockMedId,
          stationId: restockStationId,
          batchNumber,
          quantity: Number(quantity),
          maxQuantity: Number(quantity),
          expiryDate,
        },
      }),
    onSuccess: () => {
      setRestockOpen(false);
      setBatchNumber('');
      setErrorMsg(null);
      void queryClient.invalidateQueries({ queryKey: ['medicines'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) =>
      setErrorMsg(err instanceof ApiError ? err.message : 'Failed to restock batch.'),
  });

  const dispenseMutation = useMutation({
    mutationFn: () =>
      apiRequest('/medicines/dispense', {
        method: 'POST',
        body: {
          incidentId: dispenseIncidentId,
          batchId: dispenseBatchId,
          quantityDispensed: Number(dispenseQty),
          doseRoute,
          verifiedByUserId: verifiedByUserId || null,
        },
      }),
    onSuccess: () => {
      setDispenseOpen(false);
      setErrorMsg(null);
      void queryClient.invalidateQueries({ queryKey: ['medicines'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) =>
      setErrorMsg(err instanceof ApiError ? err.message : 'Dispensation failed.'),
  });

  const medicines = data?.medicines ?? [];
  const allBatches = medicines.flatMap((m) =>
    m.batches
      .filter((b) => b.quantity > 0)
      .map((b) => ({
        id: b.id,
        label: `${m.name} (${b.batchNumber} @ ${b.station.code} — ${b.quantity} ${m.unitLabel} left)${
          m.isControlled ? ' [CONTROLLED]' : ''
        }`,
        isControlled: m.isControlled,
      }))
  );
  const selectedBatchMeta = allBatches.find((b) => b.id === dispenseBatchId);

  return (
    <div className="flex flex-col gap-space-lg">
      <PageHeader
        breadcrumbs={['Resources & Logistics', 'Medicine Inventory']}
        title="Medicine & Pharmaceutical Inventory"
        subtitle="Formulary stock levels across Central Depot and field stations, with transactional dispensation & dual-user verification for controlled drugs."
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            {canDispense && (
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setDispenseBatchId(allBatches[0]?.id ?? '');
                  setDispenseIncidentId(openIncidents[0]?.id ?? '');
                  setDispenseOpen(true);
                }}
                className="px-4 py-2.5 bg-surface-container-low hover:bg-surface-container-high text-primary border border-outline-variant/60 rounded-xl font-sans text-[13px] font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Syringe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Dispense Medicine</span>
              </button>
            )}
            {canManageStock && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setRestockMedId(medicines[0]?.id ?? '');
                    setRestockStationId(stations[0]?.id ?? '');
                    setRestockOpen(true);
                  }}
                  className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 hover:bg-surface-container-low text-on-surface rounded-xl font-sans text-[13px] font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <PlusSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Restock Batch</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setSkuModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-on-primary rounded-xl font-sans text-[13px] font-semibold shadow-sm transition-all"
                >
                  + Add SKU
                </button>
              </>
            )}
          </div>
        }
      />

      <ErrorBanner message={errorMsg} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard label="Total SKUs" value={medicines.length} icon="inventory_2" />
        <KpiCard
          label="Low / Critical Stock"
          value={medicines.filter((m) => m.stockStatus !== 'OPTIMAL').length}
          critical={medicines.some((m) => m.stockStatus === 'CRITICAL')}
          icon="report"
        />
        <KpiCard
          label="Controlled Items"
          value={medicines.filter((m) => m.isControlled).length}
          icon="lock"
        />
        <KpiCard
          label="Total Dispensations"
          value={data?.totalDispensations ?? 0}
          icon="local_hospital"
        />
      </div>

      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/60 shadow-card">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medication name, generic form, or SKU..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-surface-container-low rounded-xl font-sans text-[13px] border border-outline-variant/60 outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 shadow-card overflow-hidden">
        <div className="overflow-x-auto emrms-table-scroll">
          <table className="w-full text-left font-sans text-[13px] min-w-[860px]">
            <thead>
              <tr className="bg-surface-container-low/70 text-on-surface-variant font-sans text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Medication &amp; SKU</th>
                <th className="py-3 px-3.5">Category</th>
                <th className="py-3 px-3">Total Stock</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Storage</th>
                <th className="py-3 px-4">Active Batches</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-outline">
                    Loading formulary...
                  </td>
                </tr>
              ) : (
                medicines.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-container-low/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-on-surface">{m.name}</span>
                        {m.isControlled && (
                          <span className="px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">
                            CONTROLLED
                          </span>
                        )}
                      </div>
                      <span className="font-label-sm text-label-sm text-outline font-mono">
                        {m.skuCode} • {m.genericName}
                      </span>
                    </td>
                    <td className="py-3 px-3">{m.category}</td>
                    <td className="py-3 px-3 font-mono">
                      <span
                        className={`font-bold ${
                          m.stockStatus === 'CRITICAL' ? 'text-error' : 'text-on-surface'
                        }`}
                      >
                        {m.totalQuantity}
                      </span>{' '}
                      <span className="text-secondary">
                        / {m.totalMax || m.minParLevel} {m.unitLabel}
                      </span>
                      <div className="font-label-sm text-label-sm text-outline">
                        Min Par: {m.minParLevel}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={m.stockStatus} />
                    </td>
                    <td className="py-3 px-3 text-secondary">{m.storageRequirement}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        {m.batches.map((b) => (
                          <span
                            key={b.id}
                            className="font-label-sm text-label-sm font-mono bg-surface-container-low px-2 py-0.5 rounded w-fit"
                          >
                            {b.batchNumber} ({b.station.code}): {b.quantity} • Exp{' '}
                            {new Date(b.expiryDate).toLocaleDateString()}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Medicine SKU Modal */}
      <Modal open={skuModalOpen} title="Add Medicine SKU" onClose={() => setSkuModalOpen(false)}>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            createSkuMutation.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              placeholder="SKU Code (e.g., MED-IBU-400)"
              value={skuCode}
              onChange={(e) => setSkuCode(e.target.value)}
              className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
            <input
              required
              placeholder="Unit Label (tabs/bags/vials)"
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
              className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
          </div>
          <input
            required
            placeholder="Medicine Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
          />
          <input
            required
            placeholder="Generic Name & Strength"
            value={genericName}
            onChange={(e) => setGenericName(e.target.value)}
            className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              placeholder="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
            <input
              required
              type="number"
              min={0}
              placeholder="Min Par Level"
              value={minParLevel}
              onChange={(e) => setMinParLevel(e.target.value)}
              className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
          </div>
          <input
            required
            placeholder="Storage Requirement"
            value={storageRequirement}
            onChange={(e) => setStorageRequirement(e.target.value)}
            className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
          />
          <label className="flex items-center gap-2 font-body-sm text-body-sm">
            <input
              type="checkbox"
              checked={isControlled}
              onChange={(e) => setIsControlled(e.target.checked)}
              className="accent-primary"
            />
            <span>Controlled Medicine (requires second staff verifier to dispense)</span>
          </label>
          <button
            type="submit"
            disabled={createSkuMutation.isPending}
            className="mt-2 py-2.5 bg-primary text-on-primary rounded font-label-md text-label-md font-semibold"
          >
            {createSkuMutation.isPending ? 'Saving...' : 'Create SKU'}
          </button>
        </form>
      </Modal>

      {/* Restock Batch Modal */}
      <Modal open={restockOpen} title="Register / Restock Medicine Batch" onClose={() => setRestockOpen(false)}>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            restockMutation.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <GlassSelect
            required
            value={restockMedId}
            onChange={(e) => setRestockMedId(e.target.value)}
            className="w-full"
          >
            {medicines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.skuCode})
              </option>
            ))}
          </GlassSelect>
          <GlassSelect
            required
            value={restockStationId}
            onChange={(e) => setRestockStationId(e.target.value)}
            className="w-full"
          >
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </GlassSelect>
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              placeholder="Batch # (e.g., B-2026-01)"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
            <input
              required
              type="number"
              min={1}
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
          </div>
          <input
            required
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
          />
          <button
            type="submit"
            disabled={restockMutation.isPending}
            className="mt-2 py-2.5 bg-primary text-on-primary rounded font-label-md text-label-md font-semibold"
          >
            {restockMutation.isPending ? 'Saving...' : 'Save Restock Batch'}
          </button>
        </form>
      </Modal>

      {/* Transactional Dispense Modal */}
      <Modal
        open={dispenseOpen}
        title="Dispense Medicine (PostgreSQL Transaction)"
        onClose={() => setDispenseOpen(false)}
      >
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            dispenseMutation.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <div>
            <label className="block font-label-sm text-label-sm uppercase text-outline mb-1">
              Target Incident
            </label>
            <GlassSelect
              required
              value={dispenseIncidentId}
              onChange={(e) => setDispenseIncidentId(e.target.value)}
              className="w-full"
            >
              {openIncidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.incidentCode} — {inc.chiefComplaint ?? 'Incident'}
                </option>
              ))}
            </GlassSelect>
          </div>
          <div>
            <label className="block font-label-sm text-label-sm uppercase text-outline mb-1">
              Medicine Batch
            </label>
            <GlassSelect
              required
              value={dispenseBatchId}
              onChange={(e) => setDispenseBatchId(e.target.value)}
              className="w-full"
            >
              {allBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </GlassSelect>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-label-sm text-label-sm uppercase text-outline mb-1">
                Quantity
              </label>
              <input
                required
                type="number"
                min={1}
                value={dispenseQty}
                onChange={(e) => setDispenseQty(e.target.value)}
                className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
              />
            </div>
            <div>
              <label className="block font-label-sm text-label-sm uppercase text-outline mb-1">
                Dose &amp; Route
              </label>
              <input
                required
                value={doseRoute}
                onChange={(e) => setDoseRoute(e.target.value)}
                className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
              />
            </div>
          </div>

          {selectedBatchMeta?.isControlled && (
            <div className="p-3 rounded bg-error-container/30 border border-error/30">
              <label className="block font-label-sm text-label-sm uppercase font-bold text-error mb-1">
                Second Staff Verifier Required (Controlled Drug)
              </label>
              <GlassSelect
                required
                value={verifiedByUserId}
                onChange={(e) => setVerifiedByUserId(e.target.value)}
                className="w-full border-error/40"
              >
                <option value="">-- Select Distinct Verifier --</option>
                {(data?.verifiers ?? [])
                  .filter((v) => v.id !== user?.id)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.fullName} ({v.role})
                    </option>
                  ))}
              </GlassSelect>
            </div>
          )}

          <button
            type="submit"
            disabled={dispenseMutation.isPending}
            className="mt-2 py-2.5 bg-primary text-on-primary rounded font-label-md text-label-md font-semibold"
          >
            {dispenseMutation.isPending ? 'Dispensing...' : 'Confirm Dispensation'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
