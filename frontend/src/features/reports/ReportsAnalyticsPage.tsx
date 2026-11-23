import { useQuery } from '@tanstack/react-query';
import { Download, FileCheck, Printer } from 'lucide-react';
import {
  ErrorBanner,
  KpiCard,
  PageHeader,
  StatusBadge,
} from '@/components/shared/UiPrimitives';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest, getExportUrl } from '@/lib/apiClient';
import { hasRole } from '@/lib/permissions';

interface ReportsOverviewData {
  summary: {
    totalEncounters: number;
    discharged: number;
    resolutionRatePct: number;
    ambulanceTransfers: number;
    totalMedicineUnitsDispensed: number;
    controlledMedDualVerifiedCount: number;
  };
  triageDistribution: {
    P1_IMMEDIATE: number;
    P2_URGENT: number;
    P3_MINOR: number;
    UNTRIAGED: number;
  };
  categoryBreakdown: Array<{
    category: string;
    count: number;
    pct: number;
  }>;
  hourlySurge: Array<{
    hour: string;
    count: number;
  }>;
  stationMatrix: Array<{
    id: string;
    code: string;
    name: string;
    totalIntake: number;
    doctors: number;
    nurses: number;
    occupiedBeds: number;
    totalBeds: number;
    status: string;
  }>;
  topMedicines: Array<{
    name: string;
    units: number;
  }>;
}

export function ReportsAnalyticsPage() {
  const { user } = useAuth();
  const canExportIncidents = hasRole(user?.role, [
    'SUPER_ADMIN',
    'MEDICAL_ADMIN',
    'DOCTOR',
  ]);
  const canExportAudit = hasRole(user?.role, ['SUPER_ADMIN', 'MEDICAL_ADMIN']);

  const { data, isLoading, error } = useQuery({
    queryKey: ['reports-overview'],
    queryFn: async () => {
      const res = await apiRequest<ReportsOverviewData>('/reports/overview');
      return res.data;
    },
  });

  const maxHourly = Math.max(
    1,
    ...(data?.hourlySurge.map((h) => h.count) ?? [1])
  );
  const maxMedUnits = Math.max(
    1,
    ...(data?.topMedicines.map((m) => m.units) ?? [1])
  );

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={['MEDIJIGS', 'GOVERNANCE & AUDIT', 'REPORTS & ANALYTICS']}
        title="Reports & Operational Analytics"
        subtitle="Live summaries across patient care, triage priorities, incident activity, and medicine usage."
        actions={
          <div className="flex items-center flex-wrap gap-2.5">
            {canExportIncidents && (
              <a
                href={getExportUrl('incidents')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-sans text-[12.5px] font-semibold transition-all shadow-sm"
              >
                <Download className="w-4 h-4 text-white" />
                Export Incidents CSV
              </a>
            )}
            {canExportAudit && (
              <a
                href={getExportUrl('audit')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-sans text-[12.5px] font-semibold transition-colors shadow-xs"
              >
                <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Export Audit CSV
              </a>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-sans text-[12.5px] font-semibold transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4 text-slate-500 dark:text-slate-300" />
              Print Briefing
            </button>
          </div>
        }
      />

      <ErrorBanner
        message={
          error instanceof Error ? error.message : null
        }
      />

      {isLoading || !data ? (
        <div className="p-12 text-center bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 text-on-surface-variant font-sans text-[14px]">
          Loading live reports and analytics...
        </div>
      ) : (
        <>
          {/* Top KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              label="Total Medical Encounters"
              value={data.summary.totalEncounters}
              icon="assignment"
              footerLeft="Discharged on site"
              footerRight={`${data.summary.discharged} cases`}
            />
            <KpiCard
              label="On-Site Resolution Rate"
              value={`${data.summary.resolutionRatePct}%`}
              icon="verified"
              progressPct={data.summary.resolutionRatePct}
              footerLeft="Target benchmark"
              footerRight=">= 80%"
            />
            <KpiCard
              label="Ambulance Dispatches"
              value={data.summary.ambulanceTransfers}
              icon="airport_shuttle"
              footerLeft="Hospital transfers & pickups"
              footerRight="Logged"
            />
            <KpiCard
              label="Medicine Units Dispensed"
              value={data.summary.totalMedicineUnitsDispensed}
              icon="medication"
              footerLeft="Controlled dual-verified"
              footerRight={`${data.summary.controlledMedDualVerifiedCount} rx`}
            />
          </div>

          {/* Triage Acuity Distribution */}
          <section className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-headline text-[17px] font-bold text-on-surface">
                  Triage Acuity Breakdown
                </h2>
                <p className="font-sans text-[12.5px] text-on-surface-variant mt-0.5">
                  Priority distribution across all recorded event incidents
                </p>
              </div>
              <span className="font-sans text-[11px] uppercase tracking-wider text-outline font-bold bg-surface-container-low px-2.5 py-1 rounded-lg border border-outline-variant/40">
                {data.summary.totalEncounters} Total Encounters
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl border border-error/30 bg-error-container/20">
                <div className="font-sans text-[11px] uppercase tracking-wider text-error font-bold">
                  P1 Immediate (Critical)
                </div>
                <div className="font-headline text-[28px] font-bold text-error tabular-metrics mt-1">
                  {data.triageDistribution.P1_IMMEDIATE}
                </div>
                <div className="font-sans text-[11.5px] text-on-surface-variant mt-1">
                  Immediate trauma / code red
                </div>
              </div>
              <div className="p-4 rounded-2xl border border-amber-300/80 bg-amber-50/80">
                <div className="font-sans text-[11px] uppercase tracking-wider text-amber-900 font-bold">
                  P2 Urgent
                </div>
                <div className="font-headline text-[28px] font-bold text-amber-900 tabular-metrics mt-1">
                  {data.triageDistribution.P2_URGENT}
                </div>
                <div className="font-sans text-[11.5px] text-amber-900/80 mt-1">
                  Prompt physician intervention
                </div>
              </div>
              <div className="p-4 rounded-2xl border border-emerald-300/80 bg-emerald-50/80">
                <div className="font-sans text-[11px] uppercase tracking-wider text-emerald-900 font-bold">
                  P3 Minor
                </div>
                <div className="font-headline text-[28px] font-bold text-emerald-900 tabular-metrics mt-1">
                  {data.triageDistribution.P3_MINOR}
                </div>
                <div className="font-sans text-[11.5px] text-emerald-900/80 mt-1">
                  First-aid, hydration, abrasions
                </div>
              </div>
              <div className="p-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low">
                <div className="font-sans text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                  Untriaged Queue
                </div>
                <div className="font-headline text-[28px] font-bold text-on-surface tabular-metrics mt-1">
                  {data.triageDistribution.UNTRIAGED}
                </div>
                <div className="font-sans text-[11.5px] text-on-surface-variant mt-1">
                  Awaiting clinical triage
                </div>
              </div>
            </div>
          </section>

          {/* Charts Grid: Hourly Surge + Categories & Top Medicines */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Hourly Surge Bar Chart */}
            <section className="xl:col-span-7 bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 p-5 shadow-card flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-headline text-[17px] font-bold text-on-surface">
                    Hourly Incident Surge (08:00 – 20:00)
                  </h2>
                  <p className="font-sans text-[12.5px] text-on-surface-variant mt-0.5">
                    Case intake velocity by hour of admission
                  </p>
                </div>
                <span className="font-sans text-[11px] text-primary uppercase font-bold bg-primary-container px-2.5 py-1 rounded-lg">
                  Peak: {maxHourly} / hr
                </span>
              </div>
              <div className="flex-1 flex items-end gap-2 pt-6 pb-2 min-h-[220px] border-b border-outline-variant/30">
                {data.hourlySurge.map((bucket) => {
                  const pct = Math.round((bucket.count / maxHourly) * 100);
                  return (
                    <div
                      key={bucket.hour}
                      className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full group"
                    >
                      <span className="font-sans text-[11px] text-on-surface-variant tabular-metrics font-semibold group-hover:text-primary transition-colors">
                        {bucket.count > 0 ? bucket.count : ''}
                      </span>
                      <div className="w-full max-w-[36px] bg-surface-container-low rounded-t-lg h-36 flex items-end overflow-hidden border border-outline-variant/30">
                        <div
                          className="w-full bg-primary group-hover:bg-primary-hover rounded-t-lg transition-all shadow-xs"
                          style={{
                            height: bucket.count > 0 ? `${Math.max(14, pct)}%` : '0%',
                          }}
                          title={`${bucket.hour}: ${bucket.count} encounter(s)`}
                        />
                      </div>
                      <span className="font-sans text-[11px] text-outline tabular-metrics font-medium">
                        {bucket.hour}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Right Column: Category Breakdown & Top Medicines */}
            <div className="xl:col-span-5 space-y-5">
              <section className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 p-5 shadow-card">
                <h2 className="font-headline text-[17px] font-bold text-on-surface mb-3">
                  Incident Category Breakdown
                </h2>
                {data.categoryBreakdown.length === 0 ? (
                  <p className="font-sans text-[13px] text-on-surface-variant">
                    No incident categories recorded yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.categoryBreakdown.map((item, idx) => {
                      const colors = [
                        'bg-primary',
                        'bg-blue-600',
                        'bg-emerald-600',
                        'bg-amber-600',
                        'bg-rose-600',
                        'bg-slate-600',
                      ];
                      const color = colors[idx % colors.length];
                      return (
                        <div key={item.category} className="space-y-1">
                          <div className="flex items-center justify-between font-sans text-[12.5px]">
                            <span className="text-on-surface font-semibold">
                              {item.category.replace(/_/g, ' ')}
                            </span>
                            <span className="text-on-surface-variant tabular-metrics font-medium">
                              {item.count} ({item.pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                            <div
                              className={`h-full ${color} rounded-full transition-all`}
                              style={{ width: `${item.pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 p-5 shadow-card">
                <h2 className="font-headline text-[17px] font-bold text-on-surface mb-3">
                  Top Consumed Medicines
                </h2>
                {data.topMedicines.length === 0 ? (
                  <p className="font-sans text-[13px] text-on-surface-variant">
                    No medicine dispensations recorded yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.topMedicines.map((med) => (
                      <div key={med.name} className="space-y-1">
                        <div className="flex items-center justify-between font-sans text-[12.5px]">
                          <span className="text-on-surface font-semibold truncate pr-2">
                            {med.name}
                          </span>
                          <span className="text-primary font-bold tabular-metrics shrink-0">
                            {med.units} units
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{
                              width: `${Math.round((med.units / maxMedUnits) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>

          {/* Station Operational Performance Matrix */}
          <section className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/40 bg-surface-container-low/60 flex items-center justify-between">
              <div>
                <h2 className="font-headline text-[17px] font-bold text-on-surface">
                  Station Operational Performance Matrix
                </h2>
                <p className="font-sans text-[12.5px] text-on-surface-variant mt-0.5">
                  Field post case intake, staffing ratios, and live bed occupancy
                </p>
              </div>
              <span className="font-sans text-[11px] uppercase tracking-wider text-outline font-bold bg-surface-container-low px-2.5 py-1 rounded-lg border border-outline-variant/40">
                {data.stationMatrix.length} Field Posts
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-[13px]">
                <thead>
                  <tr className="border-b border-outline-variant/30 bg-surface-container-low/30 font-sans text-[11px] uppercase tracking-wider text-outline font-semibold">
                    <th className="py-3 px-4">Station</th>
                    <th className="py-3 px-4">Total Intake</th>
                    <th className="py-3 px-4">Doctors</th>
                    <th className="py-3 px-4">Nurses</th>
                    <th className="py-3 px-4">Bed Utilization</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {data.stationMatrix.map((st) => {
                    const bedPct =
                      st.totalBeds > 0
                        ? Math.round((st.occupiedBeds / st.totalBeds) * 100)
                        : 0;
                    return (
                      <tr key={st.id} className="hover:bg-surface-container-low/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-on-surface">
                            {st.code} — {st.name}
                          </div>
                        </td>
                        <td className="py-3 px-4 tabular-metrics font-bold text-on-surface">
                          {st.totalIntake} cases
                        </td>
                        <td className="py-3 px-4 tabular-metrics">{st.doctors}</td>
                        <td className="py-3 px-4 tabular-metrics">{st.nurses}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="tabular-metrics font-medium text-[12px]">
                              {st.occupiedBeds}/{st.totalBeds}
                            </span>
                            <div className="w-20 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                              <div
                                className={
                                  bedPct >= 80
                                    ? 'h-full bg-error rounded-full'
                                    : 'h-full bg-primary rounded-full'
                                }
                                style={{ width: `${bedPct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={st.status} />
                        </td>
                      </tr>
                    );
                  })}
                  {data.stationMatrix.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-on-surface-variant font-sans text-[13px]"
                      >
                        No field medical stations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
