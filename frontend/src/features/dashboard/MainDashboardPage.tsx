import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Megaphone,
  AlertTriangle,
  PlusCircle,
  Truck,
  ClipboardList,
  History,
  BadgeCheck,
} from 'lucide-react';
import {
  ErrorBanner,
  GlassSelect,
  KpiCard,
  Modal,
  PageHeader,
  StatusBadge,
  TriageBadge,
} from '@/components/shared/UiPrimitives';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest, ApiError } from '@/lib/apiClient';
import { hasRole } from '@/lib/permissions';

interface DashboardSummary {
  mode: 'VOLUNTEER' | 'COMMAND';
  eventProfile: {
    eventName?: string;
    activeDay?: string;
    expectedAttendance?: number;
    ambientTempC?: number;
    advisoryLevel?: string;
  } | null;
  // Volunteer fields
  myReports?: Array<{
    id: string;
    incidentCode: string;
    triagePriority: string;
    status: string;
    category: string;
    locationText: string;
    station: { code: string; name: string } | null;
    createdAt: string;
  }>;
  // Staff command fields
  kpis?: {
    doctorsOnDuty: number;
    doctorsCodeRed?: number;
    doctorsTotal: number;
    nursesOnDuty: number;
    nursesIntercepting?: number;
    nursesTotal: number;
    activeIncidents: number;
    criticalIncidents: number;
    ambulancesStandby: number;
    ambulancesActive: number;
    ambulancesTotal: number;
    lowStockCount: number;
    lowStockNames: string[];
    equipmentReadinessPct: number;
    equipmentOperational: number;
    equipmentTotal: number;
    activeAlertCount: number;
  };
  activeAlerts?: Array<{
    id: string;
    severity: string;
    title: string;
    locationText: string;
    status: string;
    incident: { incidentCode: string } | null;
  }>;
  recentIncidents?: Array<{
    id: string;
    incidentCode: string;
    admittedAt: string;
    triagePriority: string;
    status: string;
    locationText: string;
    chiefComplaint: string;
    patient: { id: string; recordCode: string; fullName?: string; attendeeRole?: string } | null;
    leadDoctor: { fullName: string } | null;
    leadNurse: { fullName: string } | null;
  }>;
  recentNotices?: Array<{
    id: string;
    title: string;
    content: string;
    priority: string;
    targetRole?: string;
    isPublished?: boolean;
    createdAt: string;
    authorName?: string;
  }>;
  staffOverview?: Array<{
    id: string;
    name: string;
    roleLabel: string;
    station: string;
    ext: string;
  }>;
  recentLogs?: Array<{
    id: string;
    action: string;
    summary: string;
    createdAt: string;
    actor: { fullName: string; role: string } | null;
  }>;
}

export function MainDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [locationText, setLocationText] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [category, setCategory] = useState('HEAT');
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await apiRequest<DashboardSummary>('/dashboard/summary')).data,
    refetchInterval: 10000,
  });

  const reportMutation = useMutation({
    mutationFn: async () =>
      apiRequest('/incidents/report', {
        method: 'POST',
        body: { locationText, chiefComplaint, category },
      }),
    onSuccess: () => {
      setReportOpen(false);
      setLocationText('');
      setChiefComplaint('');
      setFormError(null);
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : 'Failed to submit report.');
    },
  });

  const handleVolunteerSubmit = (e: FormEvent) => {
    e.preventDefault();
    reportMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center font-sans text-[14px] text-on-surface-variant flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
        <span>Loading command dashboard...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorBanner
        message={
          error instanceof ApiError
            ? error.message
            : 'Unable to load dashboard data.'
        }
      />
    );
  }

  // ============================================================================
  // VOLUNTEER VIEW (Strictly Non-PHI — Quick Report + Own Submissions + Stations)
  // ============================================================================
  if (data.mode === 'VOLUNTEER') {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          breadcrumbs={['MEDIJIGS', 'Volunteer Field Portal']}
          title="Campus Medical Volunteer Hub"
          subtitle="Report field incidents quickly to dispatch medical staff. Patient medical records remain strictly private."
          actions={
            <div className="flex items-center gap-2.5">
              <Link
                to="/notices"
                className="flex items-center gap-1.5 px-3.5 py-2 bg-surface-container-low hover:bg-surface-container-high text-on-surface rounded-xl font-sans text-[13px] font-semibold border border-outline-variant/60 shadow-xs transition-colors"
              >
                <Megaphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Notice Board</span>
              </Link>
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-xl font-sans text-[13px] font-semibold shadow-sm transition-all"
              >
                <AlertTriangle className="w-4 h-4 text-white" />
                <span>Report Campus Incident</span>
              </button>
            </div>
          }
        />

        {/* Volunteer Notice Board Widget */}
        {(data.recentNotices ?? []).length > 0 && (
          <div className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 shadow-card p-5">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Megaphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="font-headline text-[16px] font-bold text-on-surface">
                  Campus Medical Notices &amp; Announcements
                </h2>
              </div>
              <Link
                to="/notices"
                className="font-sans text-[11.5px] px-3 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-primary font-semibold border border-outline-variant/40 transition-colors"
              >
                View Notice Board →
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              {(data.recentNotices ?? []).slice(0, 3).map((notice) => (
                <div
                  key={notice.id}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                    notice.priority === 'EMERGENCY'
                      ? 'border-error/40 bg-error/5'
                      : notice.priority === 'IMPORTANT'
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-outline-variant/40 bg-surface-container-low/60'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider ${
                          notice.priority === 'EMERGENCY'
                            ? 'bg-error text-on-error'
                            : notice.priority === 'IMPORTANT'
                            ? 'bg-amber-600 text-white'
                            : 'bg-surface-container-high text-on-surface'
                        }`}
                      >
                        {notice.priority}
                      </span>
                      <span className="font-headline text-[14px] font-bold text-on-surface truncate">
                        {notice.title}
                      </span>
                    </div>
                    <p className="font-sans text-[12.5px] text-on-surface-variant line-clamp-1">
                      {notice.content}
                    </p>
                  </div>
                  <span className="font-mono text-[11.5px] text-secondary shrink-0">
                    {new Date(notice.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 shadow-card overflow-hidden">
          <div className="p-5 border-b border-outline-variant/30 flex items-center justify-between">
            <h2 className="font-headline text-[16px] font-bold text-on-surface">
              My Submitted Incident Reports
            </h2>
            <span className="font-sans text-[12px] font-medium text-secondary bg-surface-container-low px-2.5 py-1 rounded-lg border border-outline-variant/40">
              {data.myReports?.length ?? 0} Reports
            </span>
          </div>
          <div className="overflow-x-auto emrms-table-scroll">
            <table className="w-full text-left font-sans text-[13px]">
              <thead>
                <tr className="bg-surface-container-low/70 text-on-surface-variant font-sans text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {(data.myReports ?? []).map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-primary">
                      {r.incidentCode}
                    </td>
                    <td className="py-3 px-4">{r.locationText}</td>
                    <td className="py-3 px-4">{r.category}</td>
                    <td className="py-3 px-4">
                      <TriageBadge priority={r.triagePriority} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Modal
          open={reportOpen}
          title="Report Campus Medical Incident"
          onClose={() => setReportOpen(false)}
        >
          <ErrorBanner message={formError} />
          <form onSubmit={handleVolunteerSubmit} className="flex flex-col gap-3.5">
            <div>
              <label className="block font-sans text-[11.5px] uppercase tracking-wider text-outline font-semibold mb-1">
                Exact Campus Location
              </label>
              <input
                required
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="e.g., Sports Field East Gate"
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low font-sans text-[13.5px] focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block font-sans text-[11.5px] uppercase tracking-wider text-outline font-semibold mb-1">
                Category
              </label>
              <GlassSelect
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full"
              >
                <option value="ALLERGY">Allergy</option>
                <option value="GI">Food Poisoning</option>
                <option value="RESPIRATORY">Fever</option>
                <option value="OTHER">Headache</option>
                <option value="HEAT">Dehydration</option>
                <option value="TRAUMA">Minor Injury</option>
                <option value="OTHER">Other</option>
              </GlassSelect>
            </div>
            <div>
              <label className="block font-sans text-[11.5px] uppercase tracking-wider text-outline font-semibold mb-1">
                Brief Situation Summary
              </label>
              <textarea
                required
                rows={3}
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="Describe what happened (avoid entering private medical history)..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low font-sans text-[13.5px] focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="submit"
              disabled={reportMutation.isPending}
              className="mt-2 py-2.5 px-4 bg-primary hover:bg-primary-hover text-on-primary rounded-xl font-sans text-[13px] font-semibold transition-all shadow-sm"
            >
              {reportMutation.isPending ? 'Submitting...' : 'Submit Incident Report'}
            </button>
          </form>
        </Modal>
      </div>
    );
  }

  // ============================================================================
  // STAFF COMMAND DASHBOARD (MediCare Pro Inspired Healthcare Aesthetic)
  // ============================================================================
  const kpis = data.kpis!;

  return (
    <div className="flex flex-col gap-5 w-full min-w-0">
      {/* Header Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 shadow-card">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse" />
            <span className="font-sans text-[11px] uppercase tracking-wider text-outline font-bold">
              Incident Command Overview
            </span>
          </div>
          <h1 className="font-headline text-[22px] sm:text-[25px] font-bold text-on-surface tracking-tight leading-snug">
            {data.eventProfile?.eventName || 'MEDIJIGS • Medical & Resource Management System For Any Event'}
          </h1>
          <p className="font-sans text-[13px] text-on-surface-variant flex flex-wrap items-center gap-2">
            <span className="font-semibold text-primary">
              {data.eventProfile?.activeDay || 'Event Day 2'}
            </span>
            <span>•</span>
            <span>
              Expected Crowd:{' '}
              <strong className="text-on-surface font-semibold">
                {(data.eventProfile?.expectedAttendance ?? 6420).toLocaleString()}
              </strong>
            </span>
            <span>•</span>
            <span>
              Ambient: {data.eventProfile?.ambientTempC ?? 33.4}°C (
              {data.eventProfile?.advisoryLevel ?? 'Heat Advisory Level 2'})
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/incidents')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-on-primary rounded-xl font-sans text-[13px] font-semibold shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Log Incident</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/ambulances')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-surface-container-low hover:bg-surface-container-high text-on-surface rounded-xl font-sans text-[13px] font-semibold border border-outline-variant/60 transition-colors shadow-xs"
          >
            <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Dispatch Fleet</span>
          </button>
          {hasRole(user?.role, ['SUPER_ADMIN', 'MEDICAL_ADMIN', 'DISPATCHER']) && (
            <button
              type="button"
              onClick={() => navigate('/alerts')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-error text-on-error rounded-xl font-sans text-[12px] font-bold uppercase tracking-wider shadow-sm hover:opacity-90 transition-opacity"
            >
              <Megaphone className="w-4 h-4 text-white" />
              <span>Alerts ({kpis.activeAlertCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* 7-Card KPI Strip (4 items per row on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0">
        <KpiCard
          label="Doctors On Duty"
          icon="stethoscope"
          value={kpis.doctorsOnDuty + (kpis.doctorsCodeRed ?? 0)}
          subValue={`/ ${kpis.doctorsTotal}`}
          footerLeft={kpis.doctorsCodeRed ? `${kpis.doctorsCodeRed} Code Red` : 'All Stable'}
          footerRight={`${kpis.doctorsOnDuty} On Duty`}
        />
        <KpiCard
          label="Nurses On Duty"
          icon="group"
          value={kpis.nursesOnDuty + (kpis.nursesIntercepting ?? 0)}
          subValue={`/ ${kpis.nursesTotal}`}
          footerLeft={kpis.nursesIntercepting ? `${kpis.nursesIntercepting} Intercepting` : 'Deployed'}
          footerRight={`${kpis.nursesOnDuty} On Duty`}
          className="sm:col-span-2"
        />
        <KpiCard
          label="Active Cases"
          icon="vital_signs"
          value={kpis.activeIncidents}
          footerLeft="Open"
          footerRight="Live"
        />
        <KpiCard
          label="Critical (P1)"
          icon="warning"
          value={kpis.criticalIncidents}
          critical
          footerLeft="Immediate"
          footerRight={`${kpis.activeAlertCount} Alerts`}
        />
        <KpiCard
          label="Ambulances"
          icon="airport_shuttle"
          value={kpis.ambulancesStandby}
          subValue={`/ ${kpis.ambulancesTotal}`}
          footerLeft="Standby"
          footerRight={`${kpis.ambulancesActive} Active`}
        />
        <KpiCard
          label="Stock Alerts"
          icon="medication"
          value={kpis.lowStockCount}
          critical={kpis.lowStockCount > 0}
          footerLeft="Below Par"
          footerRight={kpis.lowStockNames[0] ? kpis.lowStockNames[0].split(' ')[0] : 'OK'}
        />
        <KpiCard
          label="Equipment"
          icon="monitor_heart"
          value={`${kpis.equipmentReadinessPct}%`}
          footerLeft="Ready"
          footerRight={`${kpis.equipmentOperational} / ${kpis.equipmentTotal} Units`}
        />
      </div>

      {/* Active Alerts Ticker */}
      {(data.activeAlerts ?? []).length > 0 && (
        <div className="bg-rose-500/15 dark:bg-rose-500/15 backdrop-blur-2xl border border-rose-400/40 dark:border-rose-400/30 rounded-[18px] p-4 shadow-[0_8px_24px_-4px_rgba(225,29,72,0.12),inset_0_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.12)] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start md:items-center gap-3 min-w-0">
            <span className="px-2.5 py-1 bg-error text-on-error rounded-lg font-mono text-[10.5px] uppercase tracking-wider font-bold shrink-0">
              Live Alerts
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0 font-sans text-[13px]">
              {(data.activeAlerts ?? []).slice(0, 2).map((alert) => (
                <div key={alert.id} className="truncate">
                  <strong className="text-primary font-semibold">
                    {alert.incident?.incidentCode ?? alert.severity}:
                  </strong>{' '}
                  <span className="text-on-surface">{alert.title}</span>
                </div>
              ))}
            </div>
          </div>
          <Link
            to="/alerts"
            className="px-3.5 py-1.5 bg-surface-container-lowest hover:bg-surface-container-low text-on-surface rounded-xl font-sans text-[12px] font-semibold shrink-0 text-center border border-outline-variant/60 shadow-xs transition-colors"
          >
            Open Alert Queue →
          </Link>
        </div>
      )}

      {/* Main 12-Col Balanced Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 w-full min-w-0">
        {/* Left Column (7 cols): Recent Incidents + Audit & Activity Stream */}
        <div className="xl:col-span-7 flex flex-col gap-5 min-w-0">
          {/* Card 1: Recent Medical Incidents */}
          <div className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 shadow-card overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-outline-variant/30 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h2 className="font-headline text-[16px] font-bold text-on-surface leading-tight">
                    Recent Medical Incidents
                  </h2>
                  <p className="font-sans text-[12px] text-on-surface-variant leading-normal mt-0.5">
                    Live updates across event locations
                  </p>
                </div>
              </div>
              <Link
                to="/incidents"
                className="font-sans text-[11.5px] font-semibold px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-primary border border-outline-variant/40 transition-colors"
              >
                Manage All →
              </Link>
            </div>

            <div className="overflow-x-auto emrms-table-scroll">
              <table className="w-full text-left font-sans text-[13px] min-w-[620px]">
                <thead>
                  <tr className="bg-surface-container-low/70 text-on-surface-variant font-sans text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Incident</th>
                    <th className="py-3 px-3.5">Patient</th>
                    <th className="py-3 px-3">Triage</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3">Lead</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {(data.recentIncidents ?? []).map((inc) => (
                    <tr key={inc.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-[12px] font-bold text-primary whitespace-nowrap">
                        {inc.incidentCode}
                      </td>
                      <td className="py-3 px-3.5">
                        {inc.patient ? (
                          inc.patient.fullName ? (
                            <Link
                              to={`/patients/${inc.patient.id}`}
                              className="font-semibold text-primary hover:underline"
                            >
                              {inc.patient.fullName}
                            </Link>
                          ) : (
                            <span className="text-secondary font-mono text-[11.5px]">
                              {inc.patient.recordCode} (Restricted)
                            </span>
                          )
                        ) : (
                          <span className="text-outline italic text-[12px]">Unlinked Report</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <TriageBadge priority={inc.triagePriority} />
                      </td>
                      <td className="py-3 px-3 text-on-surface max-w-[160px] truncate">
                        {inc.locationText}
                      </td>
                      <td className="py-3 px-3 text-on-surface-variant whitespace-nowrap">
                        {inc.leadDoctor?.fullName ?? inc.leadNurse?.fullName ?? 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <StatusBadge status={inc.status} />
                      </td>
                    </tr>
                  ))}
                  {(data.recentIncidents ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-outline font-sans text-[13px]">
                        No active medical incidents reported.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 2: Recent Audit & Activity Stream */}
          <div className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 shadow-card p-5">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-headline text-[16px] font-bold text-on-surface leading-tight">
                    Recent Audit &amp; Activity Stream
                  </h3>
                  <p className="font-sans text-[12px] text-on-surface-variant leading-normal mt-0.5">
                    Operational audit trail &amp; system actions
                  </p>
                </div>
              </div>
              {hasRole(user?.role, ['SUPER_ADMIN', 'MEDICAL_ADMIN']) && (
                <Link
                  to="/audit-logs"
                  className="font-sans text-[11.5px] font-semibold px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-primary border border-outline-variant/40 transition-colors"
                >
                  Full Log →
                </Link>
              )}
            </div>
            <div className="flex flex-col gap-2.5 divide-y divide-outline-variant/15">
              {(data.recentLogs ?? []).map((log) => (
                <div key={log.id} className="pt-2.5 first:pt-0 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold text-primary uppercase tracking-wider bg-primary-container px-2 py-0.5 rounded-md">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-[11px] text-secondary">
                      {new Date(log.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="font-sans text-[13px] text-on-surface leading-snug">
                    {log.summary}
                  </p>
                  <span className="font-sans text-[11.5px] text-on-surface-variant">
                    By: <strong className="text-on-surface font-semibold">{log.actor?.fullName ?? 'System'}</strong>
                  </span>
                </div>
              ))}
              {(data.recentLogs ?? []).length === 0 && (
                <p className="text-outline font-sans text-[13px] py-4 text-center">
                  No activity logged yet today.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Notices + Staff On-Duty */}
        <div className="xl:col-span-5 flex flex-col gap-5 min-w-0">
          {/* Card 1: Recent Notices Widget */}
          <div className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 shadow-card p-5">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Megaphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="font-headline text-[16px] font-bold text-on-surface">
                  Campus Medical Notices
                </h3>
              </div>
              <Link
                to="/notices"
                className="font-sans text-[11.5px] font-semibold px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-primary border border-outline-variant/40 transition-colors"
              >
                Notice Board →
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              {(data.recentNotices ?? []).slice(0, 3).map((notice) => (
                <div
                  key={notice.id}
                  className={`p-3 rounded-xl border flex flex-col gap-1 transition-colors ${
                    notice.priority === 'EMERGENCY'
                      ? 'border-error/40 bg-error/5'
                      : notice.priority === 'IMPORTANT'
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-outline-variant/30 bg-surface-container-low/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider ${
                        notice.priority === 'EMERGENCY'
                          ? 'bg-error text-on-error'
                          : notice.priority === 'IMPORTANT'
                          ? 'bg-amber-600 text-white'
                          : 'bg-surface-container-high text-on-surface'
                      }`}
                    >
                      {notice.priority}
                    </span>
                    <span className="font-mono text-[11px] text-secondary">
                      {new Date(notice.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="font-headline text-[13.5px] font-bold text-on-surface truncate tracking-tight">
                    {notice.title}
                  </p>
                  <p className="font-sans text-[12.5px] text-on-surface-variant line-clamp-1 leading-normal">
                    {notice.content}
                  </p>
                </div>
              ))}
              {(data.recentNotices ?? []).length === 0 && (
                <p className="text-outline font-sans text-[13px] py-4 text-center">
                  No active notices.
                </p>
              )}
            </div>
          </div>

          {/* Card 2: Staff On-Duty Overview */}
          <div className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 shadow-card p-5">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <BadgeCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                <h3 className="font-headline text-[16px] font-bold text-on-surface">
                  Staff On-Duty Overview
                </h3>
              </div>
              <Link
                to="/doctors"
                className="font-sans text-[11.5px] font-semibold px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-primary border border-outline-variant/40 transition-colors"
              >
                Rosters →
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              {(data.staffOverview ?? []).map((member) => (
                <div
                  key={member.id}
                  className="bg-surface-container-low/70 p-3 rounded-xl border border-outline-variant/30 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-headline text-[13.5px] font-bold text-on-surface truncate">
                      {member.name}
                    </p>
                    <p className="font-sans text-[11.5px] text-on-surface-variant truncate">
                      {member.roleLabel}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-sans text-[12px] font-semibold text-primary">
                      {member.station}
                    </p>
                    <p className="font-mono text-[11px] text-secondary">
                      {member.ext}
                    </p>
                  </div>
                </div>
              ))}
              {(data.staffOverview ?? []).length === 0 && (
                <p className="text-outline font-sans text-[13px] py-4 text-center">
                  No staff members currently on duty.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
