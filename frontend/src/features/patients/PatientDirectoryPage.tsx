import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Search } from 'lucide-react';
import {
  ErrorBanner,
  GlassSelect,
  Modal,
  PageHeader,
  StatusBadge,
  TriageBadge,
} from '@/components/shared/UiPrimitives';
import { apiRequest, ApiError } from '@/lib/apiClient';

interface PatientRow {
  id: string;
  recordCode: string;
  fullName: string;
  age: number;
  sex: string;
  bloodGroup: string | null;
  attendeeRole: string;
  institutionalId: string | null;
  allergiesNotes: string | null;
  incidents: Array<{
    incidentCode: string;
    triagePriority: string;
    status: string;
    chiefComplaint: string;
  }>;
  _count: { incidents: number };
}

export function PatientDirectoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('21');
  const [sex, setSex] = useState('MALE');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [attendeeRole, setAttendeeRole] = useState('STUDENT');
  const [institutionalId, setInstitutionalId] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [allergiesNotes, setAllergiesNotes] = useState('');

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients', search],
    queryFn: async () =>
      (
        await apiRequest<PatientRow[]>(
          `/patients?limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}`
        )
      ).data,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest('/patients', {
        method: 'POST',
        body: {
          fullName,
          age: Number(age),
          sex,
          bloodGroup: bloodGroup || null,
          attendeeRole,
          institutionalId: institutionalId || null,
          emergencyContactName: emergencyContactName || null,
          emergencyContactPhone: emergencyContactPhone || null,
          allergiesNotes: allergiesNotes || null,
        },
      }),
    onSuccess: () => {
      setOpen(false);
      setFullName('');
      setInstitutionalId('');
      setAllergiesNotes('');
      setErrorMsg(null);
      void queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (err) =>
      setErrorMsg(err instanceof ApiError ? err.message : 'Failed to register patient.'),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="flex flex-col gap-space-lg">
      <PageHeader
        breadcrumbs={['Clinical & Patients', 'Patient Records']}
        title="Patient EHR Directory"
        subtitle="Restricted clinical access (Medical Admin, Doctor, Nurse). Click any patient to open their full medical record."
        actions={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-on-primary rounded-xl font-sans text-[13px] font-semibold transition-all shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-white" />
            <span>Register Patient</span>
          </button>
        }
      />

      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/60 shadow-card">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient name, PT code, or student/staff ID..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-surface-container-low rounded-xl font-sans text-[13px] border border-outline-variant/60 outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 shadow-card overflow-hidden">
        <div className="overflow-x-auto emrms-table-scroll">
          <table className="w-full text-left font-sans text-[13px] min-w-[820px]">
            <thead>
              <tr className="bg-surface-container-low/70 text-on-surface-variant font-sans text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Record ID</th>
                <th className="py-3 px-3.5">Patient</th>
                <th className="py-3 px-3">Demographics</th>
                <th className="py-3 px-3">Latest Encounter</th>
                <th className="py-3 px-3">Allergy Flag</th>
                <th className="py-3 px-4 text-right">Dossier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-outline">
                    Loading patients...
                  </td>
                </tr>
              ) : (
                patients.map((p) => {
                  const latest = p.incidents[0];
                  return (
                    <tr key={p.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary">
                        {p.recordCode}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-on-surface">{p.fullName}</div>
                        <div className="font-sans text-[11px] text-outline font-medium">
                          {p.attendeeRole} {p.institutionalId ? `• ${p.institutionalId}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium">
                        {p.age}y • {p.sex} •{' '}
                        <span className="font-semibold text-primary">{p.bloodGroup ?? 'N/A'}</span>
                      </td>
                      <td className="py-3 px-3">
                        {latest ? (
                          <div className="flex items-center gap-2">
                            <TriageBadge priority={latest.triagePriority} />
                            <StatusBadge status={latest.status} />
                          </div>
                        ) : (
                          <span className="text-outline text-[12px]">No encounters</span>
                        )}
                      </td>
                      <td className="py-3 px-3 max-w-[200px] truncate">
                        {p.allergiesNotes && !p.allergiesNotes.toLowerCase().includes('none') ? (
                          <span className="text-error font-semibold text-[12px]">{p.allergiesNotes}</span>
                        ) : (
                          <span className="text-outline text-[12px]">None reported</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/patients/${p.id}`}
                          className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-on-primary rounded-xl font-sans text-[12px] font-semibold transition-all shadow-xs"
                        >
                          Open EHR →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} title="Register Patient (Simplified Field Intake)" onClose={() => setOpen(false)}>
        <ErrorBanner message={errorMsg} />
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 font-body-sm text-body-sm">
          <div>
            <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
              Patient Name *
            </label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g., Ahsan Habib"
              className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-md text-body-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
                Age *
              </label>
              <input
                type="number"
                required
                min={0}
                max={130}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
              />
            </div>
            <div>
              <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
                Gender *
              </label>
              <GlassSelect
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </GlassSelect>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
                Contact Name (Optional)
              </label>
              <input
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                placeholder="e.g., Parent / Friend"
                className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
              />
            </div>
            <div>
              <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
                Contact Phone (Optional)
              </label>
              <input
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                placeholder="e.g., +880 1712-345678"
                className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
              />
            </div>
          </div>

          <div>
            <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
              Common Health Issue / Concern
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {[
                'Allergy',
                'Food Poisoning',
                'Fever',
                'Headache',
                'Dehydration',
                'Minor Injury',
                'Other',
              ].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setAllergiesNotes(allergiesNotes ? `${allergiesNotes}, ${cat}` : cat)}
                  className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high rounded text-primary font-label-sm text-label-sm font-medium border border-outline-variant/30"
                >
                  + {cat}
                </button>
              ))}
            </div>
            <input
              value={allergiesNotes}
              onChange={(e) => setAllergiesNotes(e.target.value)}
              placeholder="Selected health issues or known allergies..."
              className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low"
            />
          </div>

          <details className="mt-1 p-2 rounded bg-surface-container-low border border-outline-variant/30">
            <summary className="font-label-sm text-label-sm font-semibold text-secondary cursor-pointer">
              Additional Details (Blood Group, ID, Attendee Role)
            </summary>
            <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-outline-variant/20">
              <div>
                <label className="block font-label-sm text-label-sm uppercase text-outline mb-1">
                  Blood Group
                </label>
                <input
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  placeholder="e.g., O+"
                  className="w-full px-2 py-1.5 rounded border border-outline-variant/50 bg-surface text-body-sm"
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm uppercase text-outline mb-1">
                  Student / Staff ID
                </label>
                <input
                  value={institutionalId}
                  onChange={(e) => setInstitutionalId(e.target.value)}
                  placeholder="e.g., 2021004"
                  className="w-full px-2 py-1.5 rounded border border-outline-variant/50 bg-surface text-body-sm"
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm uppercase text-outline mb-1">
                  Role
                </label>
                <GlassSelect
                  value={attendeeRole}
                  onChange={(e) => setAttendeeRole(e.target.value)}
                  className="w-full py-1.5"
                >
                  <option value="STUDENT">Student</option>
                  <option value="VOLUNTEER">Volunteer</option>
                  <option value="FACULTY">Faculty</option>
                  <option value="VISITOR">Visitor</option>
                </GlassSelect>
              </div>
            </div>
          </details>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="mt-2 py-2.5 bg-primary text-on-primary rounded font-label-md text-label-md font-semibold"
          >
            {createMutation.isPending ? 'Saving...' : 'Register Patient'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
