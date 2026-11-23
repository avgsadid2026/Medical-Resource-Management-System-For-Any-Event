import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Menu,
  X,
  Bell,
  AlertTriangle,
  Megaphone,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest } from '@/lib/apiClient';
import { NAV_ITEMS, ROLE_LABELS, hasRole } from '@/lib/permissions';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { AppIcon } from '@/components/shared/AppIcon';
import { cn } from '@/lib/utils';

const SECTIONS = [
  'CORE DISPATCH',
  'CLINICAL & PATIENTS',
  'RESOURCES & LOGISTICS',
  'GOVERNANCE & AUDIT',
] as const;

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inAppToast, setInAppToast] = useState<{ id: string; title: string; priority: string } | null>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const storageKey = user ? `emrms_read_notices_${user.id}` : 'emrms_read_notices_guest';

  // In-app read tracking per user
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    const handleReadSync = () => {
      try {
        const raw = localStorage.getItem(storageKey);
        setReadIds(raw ? new Set(JSON.parse(raw)) : new Set());
      } catch {
        setReadIds(new Set());
      }
    };
    handleReadSync();
    window.addEventListener('emrms_notices_read_updated', handleReadSync);
    window.addEventListener('storage', handleReadSync);
    return () => {
      window.removeEventListener('emrms_notices_read_updated', handleReadSync);
      window.removeEventListener('storage', handleReadSync);
    };
  }, [storageKey]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBellOpen(false);
    };
    if (bellOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [bellOpen]);

  const { data: alertsCount } = useQuery({
    queryKey: ['nav-alert-count'],
    queryFn: async () => {
      if (!user || user.role === 'VOLUNTEER') return 0;
      const { data } = await apiRequest<Array<{ status: string }>>('/alerts');
      return data.filter((a) => a.status !== 'RESOLVED').length;
    },
    enabled: Boolean(user && user.role !== 'VOLUNTEER'),
    refetchInterval: 10000,
  });

  const { data: notices = [] } = useQuery({
    queryKey: ['layout-notices'],
    queryFn: async () => {
      const { data } = await apiRequest<Array<{ id: string; title: string; priority: string; isPublished: boolean; content: string }>>('/notices');
      return data;
    },
    enabled: Boolean(user),
    refetchInterval: 12000,
  });

  const publishedNotices = notices.filter((n) => n.isPublished);
  const unreadNotices = publishedNotices.filter((n) => !readIds.has(n.id));
  const unreadCount = unreadNotices.length;
  const hasUnreadEmergency = unreadNotices.some((n) => n.priority === 'EMERGENCY');

  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      window.dispatchEvent(new Event('emrms_notices_read_updated'));
      return next;
    });
  };

  const markAllAsRead = () => {
    const allIds = publishedNotices.map((n) => n.id);
    const next = new Set([...Array.from(readIds), ...allIds]);
    setReadIds(next);
    localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
    window.dispatchEvent(new Event('emrms_notices_read_updated'));
  };

  // Watch for new notices to trigger in-app toast
  useEffect(() => {
    if (notices.length === 0) return;
    const latest = notices[0];
    if (!latest.isPublished) return;
    const seenId = localStorage.getItem('emrms_toast_seen_id');
    if (seenId !== latest.id) {
      localStorage.setItem('emrms_toast_seen_id', latest.id);
      if (latest.priority === 'EMERGENCY' || latest.priority === 'IMPORTANT') {
        setInAppToast({ id: latest.id, title: latest.title, priority: latest.priority });
        const timer = setTimeout(() => setInAppToast(null), 8000);
        return () => clearTimeout(timer);
      }
    }
  }, [notices]);

  const { data: eventProfile } = useQuery({
    queryKey: ['event-profile'],
    queryFn: async () => {
      const { data } = await apiRequest<{ eventName?: string } | null>(
        '/settings/event-profile'
      );
      return data;
    },
    enabled: Boolean(user),
  });

  const activeEventName =
    typeof eventProfile?.eventName === 'string' && eventProfile.eventName.trim()
      ? eventProfile.eventName.trim()
      : 'Unassigned Event';
  const canEditEvent = hasRole(user?.role, ['SUPER_ADMIN', 'MEDICAL_ADMIN']);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="emrms-glass-sidebar flex flex-col h-full justify-between text-slate-800 dark:text-slate-100">
      <div className="flex flex-col overflow-y-auto">
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md flex items-center justify-center shrink-0 overflow-hidden shadow-inner border border-slate-200/90 dark:border-slate-700 p-1">
              <img
                src="/emrms-logo.svg"
                alt="MEDIJIGS Logo"
                className="w-full h-full object-contain"
                width="36"
                height="36"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-headline text-[18px] font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                MEDIJIGS
              </span>
              <span className="font-sans text-[11px] text-slate-500 dark:text-slate-400 italic font-medium mt-1 leading-none">
                The Whole Engine
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Event Cadence Pill */}
        <div className="px-4 pt-3 pb-1">
          <div className="emrms-glass-subpanel px-3 py-1.5 rounded-xl flex items-center justify-between gap-2">
            <span className="font-sans text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold shrink-0">
              EVENT
            </span>
            {canEditEvent ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/settings');
                }}
                title={`${activeEventName} — Click to edit in Settings`}
                className="font-sans text-[11.5px] text-slate-800 dark:text-slate-100 font-semibold bg-white/90 dark:bg-slate-900/85 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700 px-2 py-0.5 rounded-lg truncate max-w-[170px] transition-colors text-right shadow-2xs"
              >
                {activeEventName}
              </button>
            ) : (
              <span
                title={activeEventName}
                className="font-sans text-[11.5px] text-slate-800 dark:text-slate-100 font-semibold bg-white/90 dark:bg-slate-900/85 border border-slate-200/90 dark:border-slate-700 px-2 py-0.5 rounded-lg truncate max-w-[170px]"
              >
                {activeEventName}
              </span>
            )}
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex flex-col px-3 py-2 gap-0.5">
          {SECTIONS.map((section) => {
            const visibleItems = NAV_ITEMS.filter(
              (item) =>
                item.section === section && hasRole(user?.role, item.allowedRoles)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section} className="mb-1.5">
                <div className="px-3 pt-3 pb-1 font-sans text-[10.5px] text-slate-400 dark:text-slate-400 uppercase tracking-wider font-bold">
                  {section}
                </div>
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200',
                        isActive
                          ? 'bg-blue-500/15 text-blue-700 border border-blue-400/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.75)] dark:bg-blue-500/25 dark:text-white dark:border-blue-400/40 dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] backdrop-blur-md font-bold'
                          : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white font-medium'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <AppIcon
                            name={item.icon}
                            size={18}
                            className={cn(
                              'shrink-0 transition-colors',
                              isActive
                                ? 'text-blue-600 dark:text-blue-400'
                                : item.showAlertBadge && (alertsCount ?? 0) > 0
                                ? 'text-rose-500 animate-pulse'
                                : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-white'
                            )}
                          />
                          <span className="font-sans text-[13.5px] truncate">
                            {item.label}
                          </span>
                        </div>
                        {item.showAlertBadge && (alertsCount ?? 0) > 0 && (
                          <span className="bg-error text-white font-mono text-[10.5px] px-1.5 py-0.5 rounded-full font-bold shrink-0">
                            {alertsCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer Status */}
      <div className="emrms-glass-footer p-4 flex flex-col gap-3">
        {user && (
          <div className="md:hidden flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70 dark:border-slate-700/60">
            <div className="min-w-0">
              <p className="font-sans text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                {user.fullName}
              </p>
              <p className="font-sans text-[10.5px] text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">
                {ROLE_LABELS[user.role]}
              </p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-sans text-[11.5px] font-bold shrink-0">
              {user.fullName
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.75)]" />
            <span className="font-sans text-[11.5px] text-slate-700 dark:text-slate-200 uppercase tracking-wider font-semibold">
              Live System
            </span>
          </div>
          <span className="font-mono text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-200/75 dark:bg-slate-800/85 px-2 py-0.5 rounded-md border border-slate-300/80 dark:border-slate-700">
            v1.0
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen text-on-surface selection:bg-primary/20 overflow-x-hidden">
      {/* Zero-Cost GPU Ambient Refractive Mesh Behind Entire Application */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-90 dark:opacity-100"
        style={{
          backgroundImage:
            'radial-gradient(520px circle at 8% 10%, rgba(56, 189, 248, 0.16), transparent 70%), radial-gradient(580px circle at 92% 22%, rgba(59, 130, 246, 0.15), transparent 72%), radial-gradient(540px circle at 38% 92%, rgba(20, 184, 166, 0.12), transparent 70%)',
        }}
      />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 h-full w-72 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-72 max-w-[82vw] h-full shadow-2xl">{sidebarContent}</div>
          <div
            className="flex-1 bg-slate-900/35 dark:bg-black/55 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Main Content Shell */}
      <div className="relative z-10 lg:pl-72 flex flex-col min-h-screen min-w-0">
        {/* Top Bar */}
        <header className="emrms-glass-topbar sticky top-0 h-16 z-30 flex items-center justify-between px-3 sm:px-4 lg:px-6 gap-2">
          <div className="flex items-center gap-2.5 min-w-0 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            </button>
            <span className="sm:hidden font-headline text-[15px] font-bold text-slate-900 dark:text-white tracking-tight">
              MEDIJIGS
            </span>
            <div className="emrms-glass-subpanel hidden sm:flex items-center gap-2 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span className="font-sans text-[11.5px] font-bold text-slate-800 dark:text-white uppercase tracking-wider truncate">
                Campus Medical Command
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* In-App Notification Bell with Unread Badge & Dropdown */}
            <div className="relative" ref={bellRef}>
              <button
                type="button"
                onClick={() => setBellOpen((prev) => !prev)}
                className={cn(
                  'relative p-2 rounded-xl transition-all flex items-center justify-center border shrink-0',
                  hasUnreadEmergency
                    ? 'bg-error/15 text-error hover:bg-error/25 border-error/50 shadow-sm animate-pulse'
                    : unreadCount > 0
                    ? 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/30'
                    : 'text-on-surface-variant hover:bg-surface-container-low border-outline-variant/50'
                )}
                title={
                  hasUnreadEmergency
                    ? `EMERGENCY ALERT: ${unreadCount} unread notices`
                    : unreadCount > 0
                    ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                    : 'No unread notifications'
                }
                aria-label="In-App Notifications"
                aria-expanded={bellOpen}
              >
                {hasUnreadEmergency ? (
                  <AlertTriangle className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-rose-500 animate-pulse" />
                ) : (
                  <Bell
                    className={cn(
                      'w-4.5 h-4.5 sm:w-5 sm:h-5 transition-colors',
                      unreadCount > 0
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-500 dark:text-slate-400'
                    )}
                  />
                )}
                {unreadCount > 0 && (
                  <span
                    className={cn(
                      'absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 flex items-center justify-center rounded-full text-[9.5px] font-bold font-mono shadow-sm',
                      hasUnreadEmergency
                        ? 'bg-error text-on-error ring-2 ring-error/40'
                        : 'bg-primary text-on-primary'
                    )}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown — Viewport-anchored on mobile so it never clips off-screen */}
              {bellOpen && (
                <div className="emrms-glass-popover fixed inset-x-3 top-[4.25rem] sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-96 rounded-[20px] z-50 overflow-hidden animate-fade-in">
                  <div className="px-4 py-3 border-b border-outline-variant/40 flex items-center justify-between gap-2 bg-white/40 dark:bg-slate-900/45">
                    <div className="flex items-center gap-2 min-w-0">
                      <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="font-headline text-[14px] font-bold text-on-surface truncate">
                        Notifications
                      </span>
                      {unreadCount > 0 ? (
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[11px] font-bold font-mono shrink-0',
                            hasUnreadEmergency
                              ? 'bg-error/20 text-error'
                              : 'bg-primary/15 text-primary'
                          )}
                        >
                          {unreadCount} unread
                        </span>
                      ) : (
                        <span className="text-[11px] text-on-surface-variant font-medium shrink-0">
                          All caught up
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="font-sans text-[11.5px] text-primary hover:underline font-semibold shrink-0"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[65vh] sm:max-h-80 overflow-y-auto divide-y divide-outline-variant/20">
                    {publishedNotices.length === 0 ? (
                      <div className="py-8 text-center text-on-surface-variant font-sans text-[13px]">
                        No active notices published
                      </div>
                    ) : (
                      publishedNotices.slice(0, 6).map((notice) => {
                        const isUnread = !readIds.has(notice.id);
                        const isEmergency = notice.priority === 'EMERGENCY';
                        const isImportant = notice.priority === 'IMPORTANT';

                        return (
                          <div
                            key={notice.id}
                            onClick={() => {
                              markAsRead(notice.id);
                              setBellOpen(false);
                              navigate('/notices');
                            }}
                            className={cn(
                              'p-3 cursor-pointer transition-colors flex items-start gap-2.5 hover:bg-white/45 dark:hover:bg-white/[0.06]',
                              isUnread
                                ? isEmergency
                                  ? 'bg-error/15 border-l-4 border-error'
                                  : isImportant
                                  ? 'bg-amber-500/15 border-l-4 border-amber-500'
                                  : 'bg-primary/10 border-l-4 border-primary'
                                : 'border-l-4 border-transparent'
                            )}
                          >
                            <div className="mt-1 shrink-0">
                              {isUnread && isEmergency ? (
                                <span className="w-2.5 h-2.5 rounded-full bg-error inline-block animate-pulse ring-2 ring-error/30" />
                              ) : isUnread ? (
                                <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-outline-variant/60 inline-block" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span
                                  className={cn(
                                    'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-sans',
                                    isUnread
                                      ? isEmergency
                                        ? 'bg-rose-600 text-white'
                                        : isImportant
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-blue-600 text-white'
                                      : isEmergency
                                      ? 'bg-rose-500/12 text-rose-700/80 dark:text-rose-300/75 border border-rose-400/25'
                                      : isImportant
                                      ? 'bg-amber-500/12 text-amber-800/80 dark:text-amber-300/75 border border-amber-400/25'
                                      : 'bg-surface-container-high text-on-surface-variant'
                                  )}
                                >
                                  {notice.priority === 'NORMAL' ? 'GENERAL' : notice.priority}
                                </span>
                                {isUnread ? (
                                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider font-mono">
                                    NEW
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium text-outline">
                                    Read
                                  </span>
                                )}
                              </div>
                              <p
                                className={cn(
                                  'font-headline text-[13.5px] truncate',
                                  isUnread
                                    ? 'font-bold text-on-surface'
                                    : 'font-semibold text-on-surface/75'
                                )}
                              >
                                {notice.title}
                              </p>
                              <p className="font-sans text-[12px] text-on-surface-variant line-clamp-1 mt-0.5">
                                {notice.content}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="p-2 border-t border-outline-variant/30 bg-white/35 dark:bg-slate-900/45 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setBellOpen(false);
                        navigate('/notices');
                      }}
                      className="w-full py-2 px-3 text-center font-sans text-[12.5px] font-semibold text-primary hover:bg-surface-container-high rounded-xl transition-colors"
                    >
                      Open Notice Board →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Compact Light / Dark Mode Toggle */}
            <ThemeToggle />

            <button
              type="button"
              onClick={() => navigate('/notices')}
              className="flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 bg-surface-container-low hover:bg-surface-container-high text-on-surface rounded-xl font-sans text-[12.5px] font-semibold transition-colors border border-outline-variant/50 shadow-xs shrink-0"
              title="Open Notice Board & Announcements"
            >
              <Megaphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Notice Board</span>
            </button>

            {user &&
              hasRole(user.role, ['SUPER_ADMIN', 'MEDICAL_ADMIN', 'DISPATCHER']) && (
                <button
                  type="button"
                  onClick={() => navigate('/alerts')}
                  className="flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 bg-error text-on-error rounded-xl font-sans text-[11.5px] font-bold uppercase tracking-wider shadow-sm hover:opacity-90 transition-opacity shrink-0"
                  title="Emergency Alerts"
                >
                  <AlertTriangle className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-white" />
                  <span className="hidden sm:inline">Alerts</span>
                </button>
              )}

            <div className="h-5 w-px bg-outline-variant/60 hidden md:block" />

            {user && (
              <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                <div className="hidden md:flex flex-col text-right">
                  <span className="font-sans text-[13px] text-on-surface font-semibold leading-tight">
                    {user.fullName}
                  </span>
                  <span className="font-sans text-[10.5px] text-on-surface-variant leading-none uppercase tracking-wide mt-0.5">
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>
                <div
                  title={`${user.fullName} (${ROLE_LABELS[user.role]})`}
                  className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-sans text-[11.5px] font-bold shadow-xs shrink-0"
                >
                  {user.fullName
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-1.5 rounded-xl text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors shrink-0"
                >
                  <LogOut className="w-4.5 h-4.5 text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 transition-colors" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Global In-App Notification Banner */}
        {inAppToast && (
          <div
            className={cn(
              'px-4 py-2.5 flex items-center justify-between gap-3 shadow-md border-b animate-fade-in',
              inAppToast.priority === 'EMERGENCY'
                ? 'bg-error text-on-error border-error-container'
                : 'bg-primary text-on-primary border-primary/20'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {inAppToast.priority === 'EMERGENCY' ? (
                <AlertTriangle className="w-4.5 h-4.5 text-white" />
              ) : (
                <Bell className="w-4.5 h-4.5 text-white" />
              )}
              <span className="font-sans text-[10.5px] font-bold uppercase tracking-wider bg-black/20 px-1.5 py-0.5 rounded font-mono">
                {inAppToast.priority}
              </span>
              <span className="font-sans text-[13px] font-medium truncate">
                {inAppToast.title}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  markAsRead(inAppToast.id);
                  setInAppToast(null);
                  navigate('/notices');
                }}
                className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg font-sans text-[11.5px] font-semibold transition-colors"
              >
                View Notice →
              </button>
              <button
                type="button"
                onClick={() => {
                  markAsRead(inAppToast.id);
                  setInAppToast(null);
                }}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4 text-white/80 hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        )}

        {/* Page Viewport */}
        <main className="flex-1 w-full px-3 sm:px-5 lg:px-8 py-4 sm:py-6 max-w-[1600px] mx-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
