import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, SlidersHorizontal, Search } from 'lucide-react';
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

interface IncidentRow {
  id: string;
  incidentCode: string;
  admittedAt: string;
  triagePriority: string;
  status: string;
  category: string;
  chiefComplaint?: string;
  locationText: string;
  patient: { id: string; recordCode: string; fullName?: string; age?: number; sex?: string } | null;
  leadDoctor: { id: string; fullName: string } | null;
  leadNurse: { id: string; fullName: string } | null;
}

export function IncidentManagementPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Create form state
  const [patientId, setPatientId] = useState('');
  const [leadDoctorId, setLeadDoctorId] = useState('');
  const [triagePriority, setTriagePriority] = useState('P2_URGENT');
  const [category, setCategory] = useState('HEAT');
  const [locationText, setLocationText] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');

  const isVolunteer = user?.role === 'VOLUNTEER';
  const canFullCreate = hasRole(user?.role, [
    'SUPER_ADMIN',
    'MEDICAL_ADMIN',
    'DOCTOR',
    'NURSE',
  ]);
  const canDischarge = hasRole(user?.role, [
    'SUPER_ADMIN',
    'MEDICAL_ADMIN',
    'DOCTOR',
  ]);

  const { data: incidentsRes, isLoading } = useQuery({
    queryKey: ['incidents', search, statusFilter, priorityFilter],
    queryFn: () => {
      const qs = new URLSearchParams({
        limit: '50',
        ...(search ? { search } : {}),
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        ...(priorityFilter !== 'ALL' ? { priority: priorityFilter } : {}),
      });
      return apiRequest<IncidentRow[]>(`/incidents?${qs.toString()}`);
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients-select'],
    queryFn: async () =>
      (await apiRequest<Array<{ id: string; recordCode: string; fullName: string }>>('/patients?limit=100')).data,
    enabled: canFullCreate,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors-select'],
    queryFn: async () =>
      (await apiRequest<Array<{ id: string; fullName: string }>>('/doctors')).data,
    enabled: canFullCreate,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!canFullCreate) {
        return apiRequest('/incidents/report', {
          method: 'POST',
          body: { locationText, chiefComplaint, category },
        });
      }
      return apiRequest('/incidents', {
        method: 'POST',
        body: {
          patientId: patientId || null,
          leadDoctorId: leadDoctorId || null,
          triagePriority,
          category,
          locationText,
          chiefComplaint,
        },
      });
    },
    onSuccess: () => {
      setCreateOpen(false);
      setLocationText('');
      setChiefComplaint('');
      setErrorMsg(null);
      void queryClient.invalidateQueries({ queryKey: ['incidents'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) =>
      setErrorMsg(err instanceof ApiError ? err.message : 'Failed to log incident.'),
  });

  const dischargeMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/incidents/${id}/discharge`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['incidents'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) =>
      setErrorMsg(err instanceof ApiError ? err.message : 'Discharge failed.'),
  });

  const incidents = incidentsRes?.data ?? [];

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="flex flex-col gap-space-lg">
      <PageHeader
        breadcrumbs={['Core Dispatch', 'Incident Management']}
        title={
          isVolunteer
            ? 'My Campus Incident Reports'
            : 'Medical Incident Management & Clinical Triage'
        }
        subtitle={
          isVolunteer
            ? 'Submit new field incidents and track non-sensitive response status.'
            : 'Manage field triage intake, clinical assessments, hospital transfer dispatch, and discharge workflows.'
        }
        actions={
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setCreateOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-on-primary rounded-xl font-sans text-[13px] font-semibold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>{isVolunteer ? 'Report Incident' : 'Log New Incident'}</span>
          </button>
        }
      />

      {/* Simplified Medical Incident Workflow Banner */}
      <div className="p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/60 shadow-card flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-primary">
            Standard Medical Workflow
          </span>
        </div>
        <div className="flex items-center flex-wrap gap-1.5 font-sans text-[11.5px] text-on-surface">
          <span className="px-2.5 py-1 rounded-lg bg-surface-container-high font-medium">1. Incident Report</span>
          <span className="text-outline">→</span>
          <span className="px-2.5 py-1 rounded-lg bg-surface-container-high font-medium">2. Medical Assessment</span>
          <span className="text-outline">→</span>
          <span className="px-2.5 py-1 rounded-lg bg-surface-container-high font-medium">3. Basic Vitals</span>
          <span className="text-outline">→</span>
          <span className="px-2.5 py-1 rounded-lg bg-surface-container-high font-medium">4. First Aid / Treatment</span>
          <span className="text-outline">→</span>
          <span className="px-2.5 py-1 rounded-lg bg-surface-container-high font-medium">5. Ambulance Dispatch</span>
          <span className="text-outline">→</span>
          <span className="px-2.5 py-1 rounded-lg bg-surface-container-high font-medium">6. Hospital Transfer</span>
          <span className="text-outline">→</span>
          <span className="px-2.5 py-1 rounded-lg bg-surface-container-high font-medium">7. Incident Closure</span>
        </div>
      </div>

      <ErrorBanner message={errorMsg} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard label="Total Shown" value={incidents.length} icon="assignment" />
        <KpiCard
          label="Active / Open"
          value={incidents.filter((i) => i.status !== 'DISCHARGED').length}
          icon="vital_signs"
        />
        <KpiCard
          label="P1 Critical"
          value={
            incidents.filter(
              (i) => i.triagePriority === 'P1_IMMEDIATE' && i.status !== 'DISCHARGED'
            ).length
          }
          critical
          icon="crisis_alert"
        />
        <KpiCard
          label="Discharged"
          value={incidents.filter((i) => i.status === 'DISCHARGED').length}
          icon="check_circle"
        />
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/60 shadow-card flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search incident code, location, complaint..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-surface-container-low rounded-xl font-sans text-[13px] border border-outline-variant/60 outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <GlassSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="REPORTED">Reported</option>
            <option value="TRIAGE">Triage</option>
            <option value="OBSERVATION">Observation</option>
            <option value="ESCALATED">Escalated</option>
            <option value="DISCHARGED">Discharged</option>
          </GlassSelect>
          <GlassSelect
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="ALL">All Priorities</option>
            <option value="P1_IMMEDIATE">P1 Critical</option>
            <option value="P2_URGENT">P2 Urgent</option>
            <option value="P3_MINOR">P3 Minor</option>
            <option value="UNTRIAGED">Untriaged</option>
          </GlassSelect>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 shadow-card overflow-hidden">
        <div className="overflow-x-auto emrms-table-scroll">
          <table className="w-full text-left font-sans text-[13px] min-w-[920px]">
            <thead>
              <tr className="bg-surface-container-low/70 text-on-surface-variant font-sans text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Incident</th>
                {!isVolunteer && <th className="py-3 px-3.5">Patient</th>}
                <th className="py-3 px-3">Summary / Location</th>
                <th className="py-3 px-3">Priority</th>
                {!isVolunteer && <th className="py-3 px-3">Lead</th>}
                <th className="py-3 px-3">Status</th>
                {!isVolunteer && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-outline">
                    Loading incidents...
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-surface-container-low/50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-primary">{inc.incidentCode}</div>
                      <div className="font-label-sm text-label-sm text-outline font-mono">
                        {new Date(inc.admittedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    {!isVolunteer && (
                      <td className="py-3 px-3">
                        {inc.patient ? (
                          inc.patient.fullName ? (
                            <Link
                              to={`/patients/${inc.patient.id}`}
                              className="font-semibold text-primary hover:underline block"
                            >
                              {inc.patient.fullName}
                              <span className="block font-label-sm text-label-sm text-outline font-mono">
                                {inc.patient.recordCode}
                              </span>
                            </Link>
                          ) : (
                            <span className="font-mono text-secondary">
                              {inc.patient.recordCode}
                            </span>
                          )
                        ) : (
                          <span className="text-outline italic">Unlinked</span>
                        )}
                      </td>
                    )}
                    <td className="py-3 px-3 max-w-[260px]">
                      {inc.chiefComplaint && (
                        <div className="font-medium text-on-surface truncate">
                          {inc.chiefComplaint}
                        </div>
                      )}
                      <div className="font-label-sm text-label-sm text-outline truncate">
                        {inc.locationText} • {inc.category}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <TriageBadge priority={inc.triagePriority} />
                    </td>
                    {!isVolunteer && (
                      <td className="py-3 px-3 whitespace-nowrap">
                        {inc.leadDoctor?.fullName ?? inc.leadNurse?.fullName ?? '—'}
                      </td>
                    )}
                    <td className="py-3 px-3">
                      <StatusBadge status={inc.status} />
                    </td>
                    {!isVolunteer && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {inc.patient && (
                            <Link
                              to={`/patients/${inc.patient.id}`}
                              className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-primary font-sans text-[12px] font-semibold transition-colors"
                            >
                              Vitals / EHR
                            </Link>
                          )}
                          <Link
                            to="/ambulances"
                            className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-sans text-[12px] font-semibold transition-colors"
                          >
                            Ambulance
                          </Link>
                          {canDischarge && inc.status !== 'DISCHARGED' && (
                            <button
                              type="button"
                              onClick={() => dischargeMutation.mutate(inc.id)}
                              className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-sans text-[12px] font-semibold shadow-xs transition-colors"
                            >
                              Discharge
                            </button>
                          )}
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

      {/* Create / Report Modal */}
      <Modal
        open={createOpen}
        title={isVolunteer ? 'Report Field Incident' : 'Log New Medical Incident'}
        onClose={() => setCreateOpen(false)}
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-3.5">
          {canFullCreate && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-sans text-[11px] uppercase tracking-wider text-outline font-semibold mb-1">
                  Patient (Optional)
                </label>
                <GlassSelect
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full"
                >
                  <option value="">-- Unlinked / Register Later --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.recordCode} — {p.fullName}
                    </option>
                  ))}
                </GlassSelect>
              </div>
              <div>
                <label className="block font-sans text-[11px] uppercase tracking-wider text-outline font-semibold mb-1">
                  Triage Priority
                </label>
                <GlassSelect
                  value={triagePriority}
                  onChange={(e) => setTriagePriority(e.target.value)}
                  className="w-full"
                >
                  <option value="P1_IMMEDIATE">P1 Immediate (Critical)</option>
                  <option value="P2_URGENT">P2 Urgent</option>
                  <option value="P3_MINOR">P3 Minor</option>
                  <option value="UNTRIAGED">Untriaged</option>
                </GlassSelect>
              </div>
            </div>
          )}

          <div>
            <label className="block font-sans text-[11px] uppercase tracking-wider text-outline font-semibold mb-1">
              Common Health Issue / Category
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

          {canFullCreate && (
            <div>
              <label className="block font-sans text-[11px] uppercase tracking-wider text-outline font-semibold mb-1">
                Assigned Doctor
              </label>
              <GlassSelect
                value={leadDoctorId}
                onChange={(e) => setLeadDoctorId(e.target.value)}
                className="w-full"
              >
                <option value="">-- Unassigned --</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName}
                  </option>
                ))}
              </GlassSelect>
            </div>
          )}

          <div>
            <label className="block font-sans text-[11px] uppercase tracking-wider text-outline font-semibold mb-1">
              Campus Location
            </label>
            <input
              required
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="e.g., Main Auditorium Stage Left"
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low font-sans text-[13px] outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block font-sans text-[11px] uppercase tracking-wider text-outline font-semibold mb-1">
              Chief Complaint / Situation
            </label>
            <textarea
              required
              rows={3}
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low font-sans text-[13px] outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="mt-2 py-2.5 bg-primary hover:bg-primary-hover text-on-primary rounded-xl font-sans text-[13px] font-semibold shadow-sm transition-all"
          >
            {createMutation.isPending ? 'Saving...' : 'Save Incident'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
