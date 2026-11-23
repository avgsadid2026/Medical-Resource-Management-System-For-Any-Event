import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Sun, Moon } from 'lucide-react';
import { ErrorBanner, PageHeader } from '@/components/shared/UiPrimitives';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/features/theme/ThemeContext';
import { apiRequest } from '@/lib/apiClient';

interface SettingRecord {
  id: string;
  key: string;
  category: string;
  valueJson: Record<string, unknown>;
  updatedAt: string;
  updatedBy: { fullName: string } | null;
}

export function SystemSettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Event profile fields
  const [eventName, setEventName] = useState('');
  const [activeDay, setActiveDay] = useState('');
  const [expectedAttendance, setExpectedAttendance] = useState(0);
  const [ambientTempC, setAmbientTempC] = useState(0);
  const [advisory, setAdvisory] = useState('');

  // Triage SLAs
  const [p1TargetSec, setP1TargetSec] = useState(180);
  const [p2TargetSec, setP2TargetSec] = useState(420);
  const [p3TargetSec, setP3TargetSec] = useState(900);

  // Polling & Session settings (Super Admin only)
  const [alertsIntervalSec, setAlertsIntervalSec] = useState(10);
  const [dashboardIntervalSec, setDashboardIntervalSec] = useState(15);
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState(8);

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const res = await apiRequest<SettingRecord[]>('/settings');
      return res.data;
    },
  });

  useEffect(() => {
    if (!settings) return;
    const findVal = (key: string) =>
      settings.find((s) => s.key === key)?.valueJson ?? {};

    const ev = findVal('event.profile');
    if (typeof ev.eventName === 'string') setEventName(ev.eventName);
    if (typeof ev.activeDay === 'string') setActiveDay(ev.activeDay);
    if (typeof ev.expectedAttendance === 'number')
      setExpectedAttendance(ev.expectedAttendance);
    if (typeof ev.ambientTempC === 'number') setAmbientTempC(ev.ambientTempC);
    if (typeof ev.advisoryLevel === 'string') setAdvisory(ev.advisoryLevel);
    else if (typeof ev.advisory === 'string') setAdvisory(ev.advisory);

    const sla = findVal('triage.slas');
    if (typeof sla.p1TargetSec === 'number') setP1TargetSec(sla.p1TargetSec);
    if (typeof sla.p2TargetSec === 'number') setP2TargetSec(sla.p2TargetSec);
    if (typeof sla.p3TargetSec === 'number') setP3TargetSec(sla.p3TargetSec);

    const pol = findVal('telemetry.polling');
    if (typeof pol.alertsIntervalSec === 'number')
      setAlertsIntervalSec(pol.alertsIntervalSec);
    if (typeof pol.dashboardIntervalSec === 'number')
      setDashboardIntervalSec(pol.dashboardIntervalSec);
    if (typeof pol.sessionTimeoutHours === 'number')
      setSessionTimeoutHours(pol.sessionTimeoutHours);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      key: string;
      category: string;
      valueJson: Record<string, unknown>;
    }) => {
      await apiRequest(`/settings/${encodeURIComponent(payload.key)}`, {
        method: 'PATCH',
        body: {
          category: payload.category,
          valueJson: payload.valueJson,
        },
      });
    },
    onSuccess: (_data, variables) => {
      setActionError(null);
      setSavedNotice(`Saved "${variables.key}" configuration and recorded audit log.`);
      void queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      if (variables.key === 'event.profile') {
        void queryClient.invalidateQueries({ queryKey: ['event-profile'] });
        void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      }
    },
    onError: (err) => {
      setSavedNotice(null);
      setActionError(err instanceof Error ? err.message : 'Failed to save setting.');
    },
  });

  const handleSaveEvent = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = eventName.trim();
    if (!trimmedName) {
      setSavedNotice(null);
      setActionError('Event name is required and cannot be empty.');
      return;
    }
    setEventName(trimmedName);
    saveMutation.mutate({
      key: 'event.profile',
      category: 'event',
      valueJson: {
        eventName: trimmedName,
        activeDay: activeDay.trim(),
        expectedAttendance,
        ambientTempC,
        advisoryLevel: advisory.trim(),
      },
    });
  };

  const handleSaveSlas = (e: FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      key: 'triage.slas',
      category: 'clinical',
      valueJson: {
        p1TargetSec,
        p2TargetSec,
        p3TargetSec,
      },
    });
  };

  const handleSavePolling = (e: FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      key: 'telemetry.polling',
      category: 'system',
      valueJson: {
        alertsIntervalSec,
        dashboardIntervalSec,
        sessionTimeoutHours,
      },
    });
  };

  return (
    <div className="space-y-space-lg">
      <PageHeader
        breadcrumbs={['MEDIJIGS', 'GOVERNANCE & AUDIT', 'SYSTEM SETTINGS']}
        title="System Configuration & Event Parameters"
        subtitle="Manage event details, emergency response targets, and auto-refresh & session settings."
      />

      <ErrorBanner
        message={actionError || (error instanceof Error ? error.message : null)}
      />

      {savedNotice && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 font-body-sm text-body-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{savedNotice}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 shadow-card text-on-surface-variant">
          Loading system configuration...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Appearance & Interface Theme */}
          <section className="col-span-1 lg:col-span-2 bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 p-5 sm:p-6 shadow-card space-y-4">
            <div className="border-b border-outline-variant/30 pb-3 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-headline text-[17px] font-bold text-on-surface">
                  Interface Theme &amp; Appearance
                </h2>
                <p className="font-sans text-[12.5px] text-on-surface-variant mt-0.5">
                  Select your preferred appearance. Your theme choice is saved automatically on this device.
                </p>
              </div>
              <span className="font-sans text-[11px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-lg bg-surface-container-low border border-outline-variant/50 text-on-surface-variant">
                Active: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all ${
                  theme === 'light'
                    ? 'border-primary ring-2 ring-primary/20 bg-primary-container/20'
                    : 'border-outline-variant/60 bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-sans text-[14px] font-bold text-on-surface">Light Mode</span>
                    {theme === 'light' && (
                      <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary font-sans text-[10px] font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="font-sans text-[12px] text-on-surface-variant mt-0.5">
                    Clean crisp white surfaces with deep navy typography and high-definition clinical contrast.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all ${
                  theme === 'dark'
                    ? 'border-primary ring-2 ring-primary/20 bg-primary-container/20'
                    : 'border-outline-variant/60 bg-surface-container-low hover:bg-surface-container'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-950 text-blue-400 border border-blue-800/40 flex items-center justify-center shrink-0">
                  <Moon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-sans text-[14px] font-bold text-on-surface">Dark Mode</span>
                    {theme === 'dark' && (
                      <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary font-sans text-[10px] font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="font-sans text-[12px] text-on-surface-variant mt-0.5">
                    Deep charcoal and navy surfaces with soft cyan/blue highlights for reduced eye fatigue.
                  </p>
                </div>
              </button>
            </div>
          </section>

          {/* Event Profile */}
          <form
            onSubmit={handleSaveEvent}
            className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 p-5 sm:p-6 shadow-card space-y-4"
          >
            <div className="border-b border-outline-variant/30 pb-3">
              <h2 className="font-headline text-[17px] font-bold text-on-surface">
                Active Event Profile
              </h2>
              <p className="font-sans text-[12px] text-on-surface-variant mt-0.5">
                Basic event information displayed across the dashboard and reports.
              </p>
            </div>
            <div>
              <label className="block font-sans text-[11px] uppercase tracking-wider text-outline font-semibold mb-1">
                Event Name
              </label>
              <input
                type="text"
                required
                maxLength={120}
                placeholder="Enter active event name"
                value={eventName}
                onChange={(e) => {
                  setEventName(e.target.value);
                  if (actionError) setActionError(null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low font-sans text-[13px] outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-sans text-[11px] uppercase tracking-wider text-outline font-semibold mb-1">
                  Active Day
                </label>
                <input
                  type="text"
                  value={activeDay}
                  onChange={(e) => setActiveDay(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-low font-sans text-[13px] outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm uppercase text-on-surface-variant font-semibold mb-1">
                  Attendance
                </label>
                <input
                  type="number"
                  min={0}
                  value={expectedAttendance}
                  onChange={(e) => setExpectedAttendance(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-sm tabular-metrics"
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm uppercase text-on-surface-variant font-semibold mb-1">
                  Ambient °C
                </label>
                <input
                  type="number"
                  step="any"
                  value={ambientTempC}
                  onChange={(e) => setAmbientTempC(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-sm tabular-metrics"
                />
              </div>
            </div>
            <div>
              <label className="block font-label-sm text-label-sm uppercase text-on-surface-variant font-semibold mb-1">
                Campus Health Advisory
              </label>
              <input
                type="text"
                value={advisory}
                onChange={(e) => setAdvisory(e.target.value)}
                className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-sm"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="px-4 py-2 rounded bg-primary text-on-primary font-label-md text-label-md font-semibold hover:opacity-90 disabled:opacity-50"
              >
                Save Event Profile
              </button>
            </div>
          </form>

          {/* Clinical Triage SLA Targets */}
          <form
            onSubmit={handleSaveSlas}
            className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 p-5 sm:p-6 shadow-card space-y-4"
          >
            <div className="border-b border-outline-variant/20 pb-3">
              <h2 className="font-headline-md text-headline-md text-on-surface">
                Emergency Response Time Targets
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Target response time in seconds for each priority level.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block font-label-sm text-label-sm uppercase text-error font-bold mb-1">
                  P1 Immediate (Critical) Target Seconds
                </label>
                <input
                  type="number"
                  min={30}
                  value={p1TargetSec}
                  onChange={(e) => setP1TargetSec(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-sm tabular-metrics"
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm uppercase text-amber-900 font-bold mb-1">
                  P2 Urgent Target Seconds
                </label>
                <input
                  type="number"
                  min={60}
                  value={p2TargetSec}
                  onChange={(e) => setP2TargetSec(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-sm tabular-metrics"
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm uppercase text-emerald-900 font-bold mb-1">
                  P3 Minor Target Seconds
                </label>
                <input
                  type="number"
                  min={60}
                  value={p3TargetSec}
                  onChange={(e) => setP3TargetSec(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-sm tabular-metrics"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="px-4 py-2 rounded bg-primary text-on-primary font-label-md text-label-md font-semibold hover:opacity-90 disabled:opacity-50"
              >
                Save Response Targets
              </button>
            </div>
          </form>

          {/* Polling & Session Settings (Super Admin Only) */}
          <form
            onSubmit={handleSavePolling}
            className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 p-5 sm:p-6 shadow-card space-y-4"
          >
            <div className="border-b border-outline-variant/20 pb-3 flex items-center justify-between">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">
                  Auto-Refresh &amp; Session Security
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Control how often screens refresh and when inactive logins expire.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded bg-surface-container-high font-label-sm text-label-sm uppercase font-bold text-outline">
                Super Admin Only
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-label-sm text-label-sm uppercase text-on-surface-variant font-semibold mb-1">
                  Alert Refresh (sec)
                </label>
                <input
                  type="number"
                  min={5}
                  disabled={!isSuperAdmin}
                  value={alertsIntervalSec}
                  onChange={(e) => setAlertsIntervalSec(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-sm tabular-metrics disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm uppercase text-on-surface-variant font-semibold mb-1">
                  Dashboard Refresh (sec)
                </label>
                <input
                  type="number"
                  min={5}
                  disabled={!isSuperAdmin}
                  value={dashboardIntervalSec}
                  onChange={(e) => setDashboardIntervalSec(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-sm tabular-metrics disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm uppercase text-on-surface-variant font-semibold mb-1">
                  Login Timeout (hrs)
                </label>
                <input
                  type="number"
                  min={1}
                  max={72}
                  disabled={!isSuperAdmin}
                  value={sessionTimeoutHours}
                  onChange={(e) => setSessionTimeoutHours(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-sm tabular-metrics disabled:opacity-60"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!isSuperAdmin || saveMutation.isPending}
                className="px-4 py-2 rounded bg-primary text-on-primary font-label-md text-label-md font-semibold hover:opacity-90 disabled:opacity-40"
              >
                Save Security Settings
              </button>
            </div>
          </form>

          {/* Multi-Event Readiness Card */}
          <section className="bg-surface-container-lowest rounded-[20px] border border-outline-variant/60 p-5 sm:p-6 shadow-card space-y-3">
            <div className="border-b border-outline-variant/20 pb-3 flex items-center justify-between">
              <h2 className="font-headline-md text-headline-md text-on-surface">
                About MEDIJIGS Platform
              </h2>
              <span className="px-2 py-0.5 rounded bg-secondary-fixed text-primary font-label-sm text-label-sm uppercase font-bold">
                Version 1.0
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              MEDIJIGS (Medical &amp; Resource Management System For Any Event) helps medical teams coordinate incidents, patient care, staff, medicines, and ambulances from one place.
            </p>
            <ul className="space-y-2 font-body-sm text-body-sm text-on-surface-variant list-disc pl-5">
              <li>
                Ready for any event: works for campus festivals, sports tournaments, conferences, and public gatherings.
              </li>
              <li>
                Demo notice: currently uses sample event records for demonstration and training purposes.
              </li>
              <li>
                Planned upgrades: live ambulance GPS tracking, SMS emergency alerts, and cold-storage temperature monitoring.
              </li>
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
