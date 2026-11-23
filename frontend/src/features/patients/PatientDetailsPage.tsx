import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Stethoscope, AlertTriangle } from 'lucide-react';
import {
  ErrorBanner,
  GlassSelect,
  Modal,
  StatusBadge,
  TriageBadge,
} from '@/components/shared/UiPrimitives';
import { apiRequest, ApiError } from '@/lib/apiClient';

interface PatientDetail {
  id: string;
  recordCode: string;
  fullName: string;
  age: number;
  sex: string;
  bloodGroup: string | null;
  attendeeRole: string;
  institutionalId: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  allergiesNotes: string | null;
  medicalHistoryNotes: string | null;
  incidents: Array<{
    id: string;
    incidentCode: string;
    triagePriority: string;
    status: string;
    chiefComplaint: string;
    hpiNotes: string | null;
    gcsScore: number | null;
    locationText: string;
    admittedAt: string;
    dischargeChecklistJson: Array<{
      key: string;
      label: string;
      completed: boolean;
    }> | null;
    station: { code: string; name: string } | null;
    bed: { bedCode: string } | null;
    leadDoctor: { fullName: string } | null;
    leadNurse: { fullName: string } | null;
    vitals: Array<{
      id: string;
      heartRate: number | null;
      bpSystolic: number | null;
      bpDiastolic: number | null;
      spo2: number | null;
      tempC: string | number | null;
      respRate: number | null;
      glucoseMgdl: number | null;
      recordedAt: string;
    }>;
    clinicalNotes: Array<{
      id: string;
      milestoneType: string;
      title: string;
      notes: string;
      createdAt: string;
      author: { fullName: string; role: string } | null;
    }>;
    dispensations: Array<{
      id: string;
      quantityDispensed: number;
      doseRoute: string;
      dispensedAt: string;
      batch: { medicine: { name: string; unitLabel: string } };
      administeredBy: { fullName: string } | null;
      verifiedBy: { fullName: string } | null;
    }>;
  }>;
}

export function PatientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [vitalsOpen, setVitalsOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Vitals form
  const [heartRate, setHeartRate] = useState('88');
  const [bpSystolic, setBpSystolic] = useState('120');
  const [bpDiastolic, setBpDiastolic] = useState('80');
  const [spo2, setSpo2] = useState('98');
  const [tempC, setTempC] = useState('37.0');
  const [respRate, setRespRate] = useState('18');
  const [glucoseMgdl, setGlucoseMgdl] = useState('');

  // Doctor's Observation form
  const [docObservation, setDocObservation] = useState('');
  const [docTreatment, setDocTreatment] = useState('');
  const [docRecommendation, setDocRecommendation] = useState('');
  const [docReferral, setDocReferral] = useState('Ambulatory Clearance / Discharge');

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: async () => (await apiRequest<PatientDetail>(`/patients/${id}`)).data,
    enabled: Boolean(id),
  });

  const activeIncident = patient?.incidents[0] ?? null;

  const vitalsMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/patients/${id}/vitals`, {
        method: 'POST',
        body: {
          incidentId: activeIncident!.id,
          heartRate: heartRate ? Number(heartRate) : null,
          bpSystolic: bpSystolic ? Number(bpSystolic) : null,
          bpDiastolic: bpDiastolic ? Number(bpDiastolic) : null,
          spo2: spo2 ? Number(spo2) : null,
          tempC: tempC ? Number(tempC) : null,
          respRate: respRate ? Number(respRate) : null,
          glucoseMgdl: glucoseMgdl ? Number(glucoseMgdl) : null,
        },
      }),
    onSuccess: () => {
      setVitalsOpen(false);
      setErrorMsg(null);
      void queryClient.invalidateQueries({ queryKey: ['patient', id] });
    },
    onError: (err) =>
      setErrorMsg(err instanceof ApiError ? err.message : 'Failed to log vitals.'),
  });

  const noteMutation = useMutation({
    mutationFn: () => {
      const fullNote = [
        `Clinical Observation: ${docObservation.trim()}`,
        `Initial Treatment / First Aid: ${docTreatment.trim()}`,
        `Medical Recommendation: ${docRecommendation.trim() || 'Hydration and rest'}`,
        `Referral Decision: ${docReferral}`,
      ].join('\n\n');

      return apiRequest(`/patients/${id}/notes`, {
        method: 'POST',
        body: {
          incidentId: activeIncident!.id,
          milestoneType: 'ASSESSMENT',
          title: `Doctor Observation (${docReferral})`,
          notes: fullNote,
        },
      });
    },
    onSuccess: () => {
      setNoteOpen(false);
      setDocObservation('');
      setDocTreatment('');
      setDocRecommendation('');
      setErrorMsg(null);
      void queryClient.invalidateQueries({ queryKey: ['patient', id] });
    },
    onError: (err) =>
      setErrorMsg(err instanceof ApiError ? err.message : 'Failed to save doctor observation.'),
  });

  const checklistMutation = useMutation({
    mutationFn: (updatedList: Array<{ key: string; label: string; completed: boolean }>) =>
      apiRequest(`/incidents/${activeIncident!.id}`, {
        method: 'PATCH',
        body: { dischargeChecklistJson: updatedList },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patient', id] });
    },
  });

  if (isLoading) return <div className="p-6 text-outline">Loading patient EHR...</div>;
  if (!patient) return <ErrorBanner message="Patient dossier not found." />;

  const latestVital = activeIncident?.vitals[0];
  const checklist = activeIncident?.dischargeChecklistJson ?? [];

  const toggleChecklist = (key: string) => {
    const next = checklist.map((item) =>
      item.key === key ? { ...item, completed: !item.completed } : item
    );
    checklistMutation.mutate(next);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-outline-variant/40">
        <div className="flex items-center gap-2 font-sans text-[11.5px] uppercase tracking-wider text-outline font-semibold">
          <Link to="/patients" className="hover:text-primary transition-colors">
            Patient Records
          </Link>
          <span className="text-outline-variant">/</span>
          <span className="text-primary font-bold">
            {patient.recordCode} // {patient.fullName}
          </span>
        </div>
        {activeIncident && (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setVitalsOpen(true)}
              className="px-4 py-2 bg-surface-container-low hover:bg-surface-container-high text-primary border border-outline-variant/60 rounded-xl font-sans text-[13px] font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Record Vitals</span>
            </button>
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-xl font-sans text-[13px] font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Stethoscope className="w-4 h-4 text-white" />
              <span>Doctor Observation</span>
            </button>
          </div>
        )}
      </div>

      <ErrorBanner message={errorMsg} />

      {/* Masthead */}
      <section className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 shadow-card p-6 relative overflow-hidden">
        {activeIncident?.triagePriority === 'P1_IMMEDIATE' && (
          <div className="absolute top-0 left-0 w-2 h-full bg-error" />
        )}
        <div className="flex flex-col gap-3.5 pl-1">
          <div className="flex flex-wrap items-center gap-2.5">
            {activeIncident && <TriageBadge priority={activeIncident.triagePriority} />}
            {activeIncident && <StatusBadge status={activeIncident.status} />}
            <span className="font-sans text-[12px] text-secondary font-mono">
              Record: <strong>{patient.recordCode}</strong>
            </span>
            {activeIncident && (
              <span className="font-sans text-[12px] text-secondary font-mono">
                • Incident: <strong>{activeIncident.incidentCode}</strong>
              </span>
            )}
          </div>

          <div className="flex items-baseline flex-wrap gap-3">
            <h1 className="font-headline text-[26px] sm:text-[30px] font-bold text-on-surface tracking-tight">
              {patient.fullName}
            </h1>
            <span className="font-sans text-[14px] text-secondary">
              {patient.age}y • {patient.sex} •{' '}
              <strong className="bg-primary-container text-primary px-2 py-0.5 rounded-lg font-bold">
                {patient.bloodGroup ?? 'N/A'}
              </strong>{' '}
              • {patient.attendeeRole}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-outline-variant/30">
            <div>
              <span className="font-sans text-[11px] uppercase tracking-wider text-outline font-semibold block">
                Emergency Contact
              </span>
              <span className="font-sans text-[13.5px] font-semibold text-on-surface">
                {patient.emergencyContactPhone ?? 'Not recorded'}
              </span>
              <span className="block font-sans text-[12px] text-secondary">
                {patient.emergencyContactName ?? '—'}
              </span>
            </div>
            <div>
              <span className="font-sans text-[11px] uppercase tracking-wider text-outline font-semibold block">
                Care Location
              </span>
              <span className="font-sans text-[13.5px] font-semibold text-on-surface">
                {activeIncident?.locationText || 'On-Scene / Field Response'}
              </span>
              <span className="block font-sans text-[12px] text-secondary">
                Ambulatory Field Care
              </span>
            </div>
            <div>
              <span className="font-sans text-[11px] uppercase tracking-wider text-outline font-semibold block">
                Assigned Team
              </span>
              <span className="font-sans text-[13.5px] font-semibold text-on-surface">
                {activeIncident?.leadDoctor?.fullName ?? 'Unassigned MD'}
              </span>
              <span className="block font-sans text-[12px] text-secondary">
                {activeIncident?.leadNurse?.fullName ?? 'Unassigned RN'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Essential Vital Signs Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          {
            label: 'Blood Pressure',
            val:
              latestVital?.bpSystolic && latestVital?.bpDiastolic
                ? `${latestVital.bpSystolic}/${latestVital.bpDiastolic}`
                : '—',
            unit: 'mmHg',
            warn: (latestVital?.bpSystolic ?? 0) >= 140 || (latestVital?.bpDiastolic ?? 0) >= 90,
            path: 'M0 14 C 25 11, 55 15, 100 12',
          },
          {
            label: 'Body Temperature',
            val: latestVital?.tempC ? `${latestVital.tempC}°` : '—',
            unit: '°C',
            warn: Number(latestVital?.tempC ?? 0) >= 38.0,
            path: 'M0 8 L40 7 L75 10 L100 12',
          },
          {
            label: 'Pulse Rate',
            val: latestVital?.heartRate ?? '—',
            unit: 'BPM',
            warn: (latestVital?.heartRate ?? 0) > 100 || (latestVital?.heartRate ?? 999) < 55,
            path: 'M0 12 H20 L25 4 L30 20 L35 2 L40 16 L45 12 H100',
          },
          {
            label: 'Oxygen Saturation',
            val: latestVital?.spo2 ? `${latestVital.spo2}%` : '—',
            unit: 'SpO2',
            warn: latestVital?.spo2 !== null && latestVital?.spo2 !== undefined && latestVital.spo2 < 94,
            path: 'M0 18 L30 15 L65 10 L100 6',
          },
        ].map((v) => (
          <div
            key={v.label}
            className={`bg-surface-container-lowest p-4 sm:p-5 rounded-[20px] border shadow-card hover:shadow-soft hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between ${
              v.warn ? 'border-error/40 bg-error-container/10' : 'border-outline-variant/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-sans text-[11.5px] uppercase tracking-wider text-outline font-semibold">
                {v.label}
              </span>
              {v.warn && (
                <span className="px-2 py-0.5 rounded-full bg-error text-on-error font-mono text-[10px] font-bold">
                  ALERT
                </span>
              )}
            </div>
            <div className="my-2 flex items-baseline gap-1">
              <span className="font-headline text-[26px] sm:text-[28px] font-bold text-primary tabular-metrics">
                {v.val}
              </span>
              <span className="font-sans text-[12.5px] text-secondary font-medium">{v.unit}</span>
            </div>
            <svg
              className={`w-full h-5 ${v.warn ? 'text-error' : 'text-primary/40'}`}
              fill="none"
              viewBox="0 0 100 24"
              preserveAspectRatio="none"
            >
              <path d={v.path} stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        ))}
      </section>

      {/* Split 2-Col EHR Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        <div className="lg:col-span-7 flex flex-col gap-space-lg">
          {/* HPI */}
          {activeIncident && (
            <div className="bg-surface-container-lowest p-space-md rounded-lg border border-outline-variant/30 shadow-sm">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
                Chief Complaint &amp; History of Present Illness (HPI)
              </h2>
              <div className="p-3 bg-surface-container-low rounded mb-3">
                <p className="font-body-md text-body-md font-semibold text-on-surface">
                  {activeIncident.chiefComplaint}
                </p>
                {activeIncident.hpiNotes && (
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    {activeIncident.hpiNotes}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 font-body-sm text-body-sm">
                <div className="p-2.5 bg-surface rounded">
                  <span className="font-label-sm text-label-sm uppercase text-outline block">
                    Incident Location
                  </span>
                  <span className="font-medium text-on-surface">
                    {activeIncident.locationText}
                  </span>
                </div>
                <div className="p-2.5 bg-surface rounded">
                  <span className="font-label-sm text-label-sm uppercase text-outline block">
                    Glasgow Coma Scale (GCS)
                  </span>
                  <span className="font-medium text-on-surface">
                    {activeIncident.gcsScore ? `${activeIncident.gcsScore} / 15` : 'Not recorded'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Clinical Milestones */}
          <div className="bg-surface-container-lowest p-space-md rounded-lg border border-outline-variant/30 shadow-sm">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-3">
              Clinical Milestones &amp; Notes
            </h2>
            <div className="flex flex-col gap-3 pl-4 border-l-2 border-surface-container-high">
              {(activeIncident?.clinicalNotes ?? []).map((n) => (
                <div key={n.id} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-label-md text-label-md font-bold text-primary">
                      {n.title}
                    </span>
                    <span className="font-label-sm text-label-sm bg-surface-container-low px-2 py-0.5 rounded text-secondary">
                      {n.milestoneType.replace('_', ' ')} •{' '}
                      {new Date(n.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {n.notes}
                  </p>
                  <span className="font-label-sm text-label-sm text-outline">
                    Author: {n.author?.fullName ?? 'System'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Administered Medications */}
          <div className="bg-surface-container-lowest p-space-md rounded-lg border border-outline-variant/30 shadow-sm">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-3">
              Administered Medications &amp; Fluids
            </h2>
            <div className="overflow-x-auto emrms-table-scroll">
              <table className="w-full text-left font-body-sm text-body-sm">
                <thead>
                  <tr className="bg-surface-container-low text-outline font-label-sm text-label-sm uppercase">
                    <th className="py-2 px-3">Medication</th>
                    <th className="py-2 px-3">Dose &amp; Route</th>
                    <th className="py-2 px-3">By / Verifier</th>
                    <th className="py-2 px-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {(activeIncident?.dispensations ?? []).map((d) => (
                    <tr key={d.id}>
                      <td className="py-2.5 px-3 font-semibold text-primary">
                        {d.batch.medicine.name} ({d.quantityDispensed}{' '}
                        {d.batch.medicine.unitLabel})
                      </td>
                      <td className="py-2.5 px-3">{d.doseRoute}</td>
                      <td className="py-2.5 px-3 text-secondary">
                        {d.administeredBy?.fullName ?? '—'}
                        {d.verifiedBy ? ` • Verified: ${d.verifiedBy.fullName}` : ''}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-secondary">
                        {new Date(d.dispensedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                  {(activeIncident?.dispensations ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-outline">
                        No medications dispensed yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Allergies + Discharge Checklist */}
        <div className="lg:col-span-5 flex flex-col gap-space-lg">
          <div className="bg-surface-container-lowest p-space-md rounded-lg border border-error/40 shadow-sm">
            <div className="flex items-center gap-2 text-error mb-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <h2 className="font-headline-md text-headline-md text-error">
                Allergies &amp; Medical History
              </h2>
            </div>
            <div className="space-y-2.5">
              <div className="p-3 bg-error-container/30 rounded">
                <span className="font-label-sm text-label-sm uppercase font-bold text-error block">
                  Known Allergies
                </span>
                <p className="font-body-sm text-body-sm text-on-surface mt-0.5">
                  {patient.allergiesNotes || 'No known allergies recorded.'}
                </p>
              </div>
              <div className="p-3 bg-surface-container-low rounded">
                <span className="font-label-sm text-label-sm uppercase font-semibold text-outline block">
                  Past Medical History
                </span>
                <p className="font-body-sm text-body-sm text-on-surface mt-0.5">
                  {patient.medicalHistoryNotes || 'No prior history recorded.'}
                </p>
              </div>
            </div>
          </div>

          {checklist.length > 0 && (
            <div className="bg-surface-container-lowest p-space-md rounded-lg border border-outline-variant/30 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-headline-md text-headline-md text-on-surface">
                  Discharge Protocol Checklist
                </h2>
                <span className="font-label-sm text-label-sm font-semibold text-secondary uppercase">
                  {checklist.filter((c) => c.completed).length} / {checklist.length}{' '}
                  Complete
                </span>
              </div>
              <div className="space-y-2">
                {checklist.map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-3 p-2.5 bg-surface-container-low rounded cursor-pointer hover:bg-surface-container"
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleChecklist(item.key)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="font-body-sm text-body-sm text-on-surface">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record Basic Vitals Modal */}
      <Modal open={vitalsOpen} title="Record Basic Vital Signs" onClose={() => setVitalsOpen(false)}>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            vitalsMutation.mutate();
          }}
          className="flex flex-col gap-3 font-body-sm text-body-sm"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
                BP Systolic (mmHg)
              </label>
              <input
                type="number"
                min={40}
                max={280}
                value={bpSystolic}
                onChange={(e) => setBpSystolic(e.target.value)}
                placeholder="e.g., 120"
                className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-md text-body-md"
              />
            </div>
            <div>
              <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
                BP Diastolic (mmHg)
              </label>
              <input
                type="number"
                min={20}
                max={180}
                value={bpDiastolic}
                onChange={(e) => setBpDiastolic(e.target.value)}
                placeholder="e.g., 80"
                className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-md text-body-md"
              />
            </div>
            <div>
              <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
                Body Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                min={32}
                max={44}
                value={tempC}
                onChange={(e) => setTempC(e.target.value)}
                placeholder="e.g., 37.0"
                className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-md text-body-md"
              />
            </div>
            <div>
              <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
                Pulse Rate (BPM)
              </label>
              <input
                type="number"
                min={30}
                max={250}
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                placeholder="e.g., 80"
                className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-md text-body-md"
              />
            </div>
            <div className="col-span-2">
              <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
                Oxygen Saturation (SpO2 %)
              </label>
              <input
                type="number"
                min={50}
                max={100}
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
                placeholder="e.g., 98"
                className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-md text-body-md"
              />
            </div>
          </div>

          <details className="p-2 rounded bg-surface-container-low border border-outline-variant/30">
            <summary className="font-label-sm text-label-sm text-secondary cursor-pointer font-semibold">
              Optional Secondary Readings (Respiratory Rate, Glucose)
            </summary>
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-outline-variant/20">
              <div>
                <label className="block font-label-sm text-label-sm uppercase text-outline mb-1">
                  Resp. Rate (rpm)
                </label>
                <input
                  type="number"
                  value={respRate}
                  onChange={(e) => setRespRate(e.target.value)}
                  placeholder="e.g., 18"
                  className="w-full px-2 py-1.5 rounded border border-outline-variant/50 bg-surface text-body-sm"
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm uppercase text-outline mb-1">
                  Blood Glucose (mg/dL)
                </label>
                <input
                  type="number"
                  value={glucoseMgdl}
                  onChange={(e) => setGlucoseMgdl(e.target.value)}
                  placeholder="e.g., 100"
                  className="w-full px-2 py-1.5 rounded border border-outline-variant/50 bg-surface text-body-sm"
                />
              </div>
            </div>
          </details>

          <button
            type="submit"
            disabled={vitalsMutation.isPending}
            className="mt-2 py-2.5 bg-primary text-on-primary rounded font-label-md text-label-md font-semibold"
          >
            {vitalsMutation.isPending ? 'Saving...' : 'Save Vital Signs'}
          </button>
        </form>
      </Modal>

      {/* Doctor's Observation & Treatment Modal */}
      <Modal open={noteOpen} title="Doctor's Clinical Observation & Treatment" onClose={() => setNoteOpen(false)}>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            noteMutation.mutate();
          }}
          className="flex flex-col gap-3 font-body-sm text-body-sm"
        >
          <div>
            <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
              Short Clinical Observation *
            </label>
            <textarea
              required
              rows={2}
              value={docObservation}
              onChange={(e) => setDocObservation(e.target.value)}
              placeholder="e.g., Alert, oriented x3. Mild dehydration secondary to heat exposure..."
              className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-md text-body-md"
            />
          </div>

          <div>
            <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
              Initial Treatment / First Aid *
            </label>
            <textarea
              required
              rows={2}
              value={docTreatment}
              onChange={(e) => setDocTreatment(e.target.value)}
              placeholder="e.g., Provided oral electrolyte fluid, cooled in shaded area, rested for 15 mins..."
              className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-md text-body-md"
            />
          </div>

          <div>
            <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
              Medical Recommendation
            </label>
            <input
              value={docRecommendation}
              onChange={(e) => setDocRecommendation(e.target.value)}
              placeholder="e.g., Adequate hydration, avoid direct sunlight for rest of event day..."
              className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-md text-body-md"
            />
          </div>

          <div>
            <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
              Referral Decision *
            </label>
            <GlassSelect
              value={docReferral}
              onChange={(e) => setDocReferral(e.target.value)}
              className="w-full"
            >
              <option value="Ambulatory Clearance / Discharge">Ambulatory Clearance / Discharge</option>
              <option value="External Hospital Transfer via Ambulance">External Hospital Transfer via Ambulance</option>
              <option value="On-Site Rest & Observation">On-Site Rest &amp; Observation</option>
              <option value="Follow-up with Campus Health Center">Follow-up with Campus Health Center</option>
            </GlassSelect>
          </div>

          <button
            type="submit"
            disabled={noteMutation.isPending}
            className="mt-2 py-2.5 bg-primary text-on-primary rounded font-label-md text-label-md font-semibold"
          >
            {noteMutation.isPending ? 'Saving...' : 'Record Clinical Observation'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
