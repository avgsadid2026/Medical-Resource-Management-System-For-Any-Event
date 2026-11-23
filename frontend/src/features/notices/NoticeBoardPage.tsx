import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCheck,
  PlusCircle,
  Check,
  Trash2,
  Search,
  AlertTriangle,
  BellRing,
  Megaphone,
  Pencil,
  EyeOff,
  Eye,
  RotateCcw,
  Clock,
  Users,
} from 'lucide-react';
import {
  ErrorBanner,
  GlassSelect,
  KpiCard,
  Modal,
  PageHeader,
} from '@/components/shared/UiPrimitives';
import { useAuth } from '@/features/auth/AuthContext';
import { apiRequest, ApiError } from '@/lib/apiClient';
import { hasRole, ROLE_LABELS } from '@/lib/permissions';
import type { UserRole } from '@/types/emrms';
import { cn } from '@/lib/utils';

export interface NoticeItem {
  id: string;
  title: string;
  content: string;
  priority: 'NORMAL' | 'IMPORTANT' | 'EMERGENCY';
  targetRole: 'ALL' | 'DOCTOR' | 'NURSE' | 'VOLUNTEER' | 'ADMIN';
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorRole: string;
}

const TARGET_ROLE_LABELS: Record<NoticeItem['targetRole'], string> = {
  ALL: 'All Team',
  DOCTOR: 'Doctors',
  NURSE: 'Nurses',
  VOLUNTEER: 'Volunteers',
  ADMIN: 'Command Staff',
};

function formatAuthorRole(rawRole: string): string {
  if (rawRole in ROLE_LABELS) {
    return ROLE_LABELS[rawRole as UserRole];
  }
  return rawRole
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRelativeNoticeTime(iso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function NoticeBoardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'EMERGENCY' | 'IMPORTANT' | 'NORMAL'>('ALL');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeNotice, setActiveNotice] = useState<NoticeItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'IMPORTANT' | 'EMERGENCY'>('NORMAL');
  const [targetRole, setTargetRole] = useState<'ALL' | 'DOCTOR' | 'NURSE' | 'VOLUNTEER' | 'ADMIN'>('ALL');
  const [isPublished, setIsPublished] = useState(true);

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

  const canManage = hasRole(user?.role, ['SUPER_ADMIN', 'MEDICAL_ADMIN']);

  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: async () => (await apiRequest<NoticeItem[]>('/notices')).data,
    refetchInterval: 8000,
  });

  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      window.dispatchEvent(new Event('emrms_notices_read_updated'));
      return next;
    });
  };

  const markAsUnread = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      window.dispatchEvent(new Event('emrms_notices_read_updated'));
      return next;
    });
  };

  const markAllAsRead = () => {
    const allIds = notices.map((n) => n.id);
    const next = new Set(allIds);
    setReadIds(next);
    localStorage.setItem(storageKey, JSON.stringify(allIds));
    window.dispatchEvent(new Event('emrms_notices_read_updated'));
  };

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest('/notices', {
        method: 'POST',
        body: { title, content, priority, targetRole, isPublished },
      }),
    onSuccess: () => {
      setCreateOpen(false);
      setTitle('');
      setContent('');
      setPriority('NORMAL');
      setErrorMsg(null);
      void queryClient.invalidateQueries({ queryKey: ['notices'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) =>
      setErrorMsg(err instanceof ApiError ? err.message : 'Failed to publish notice.'),
  });

  const editMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/notices/${activeNotice!.id}`, {
        method: 'PATCH',
        body: { title, content, priority, targetRole, isPublished },
      }),
    onSuccess: () => {
      setEditOpen(false);
      setActiveNotice(null);
      setErrorMsg(null);
      void queryClient.invalidateQueries({ queryKey: ['notices'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (err) =>
      setErrorMsg(err instanceof ApiError ? err.message : 'Failed to update notice.'),
  });

  const togglePublishMutation = useMutation({
    mutationFn: (notice: NoticeItem) =>
      apiRequest(`/notices/${notice.id}`, {
        method: 'PATCH',
        body: { isPublished: !notice.isPublished },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notices'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/notices/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notices'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const handleOpenCreate = () => {
    setTitle('');
    setContent('');
    setPriority('NORMAL');
    setTargetRole('ALL');
    setIsPublished(true);
    setCreateOpen(true);
  };

  const handleOpenEdit = (n: NoticeItem) => {
    setActiveNotice(n);
    setTitle(n.title);
    setContent(n.content);
    setPriority(n.priority);
    setTargetRole(n.targetRole);
    setIsPublished(n.isPublished);
    setEditOpen(true);
  };

  const unreadNotices = notices.filter((n) => n.isPublished && !readIds.has(n.id));
  const emergencyCount = notices.filter((n) => n.priority === 'EMERGENCY').length;
  const unreadEmergencyCount = unreadNotices.filter((n) => n.priority === 'EMERGENCY').length;

  const filteredNotices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notices
      .filter((n) => {
        if (filter === 'UNREAD' && readIds.has(n.id)) return false;
        if (
          (filter === 'EMERGENCY' || filter === 'IMPORTANT' || filter === 'NORMAL') &&
          n.priority !== filter
        ) {
          return false;
        }
        if (q) {
          const hay = `${n.title} ${n.content} ${n.authorName} ${n.priority}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Always sort unread notices first, then by creation date descending
        const aRead = readIds.has(a.id) ? 1 : 0;
        const bRead = readIds.has(b.id) ? 1 : 0;
        if (aRead !== bRead) return aRead - bRead;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [notices, filter, search, readIds]);

  const unreadFiltered = filteredNotices.filter((n) => !readIds.has(n.id));
  const readFiltered = filteredNotices.filter((n) => readIds.has(n.id));

  const renderNoticeCard = (notice: NoticeItem) => {
    const isEmergency = notice.priority === 'EMERGENCY';
    const isImportant = notice.priority === 'IMPORTANT';
    const isRead = readIds.has(notice.id);

    const initials = (notice.authorName || 'System')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    // Priority styling differs markedly between UNREAD (active attention) vs READ (acknowledged & calm)
    const cardToneClass = !isRead
      ? isEmergency
        ? 'lg:col-span-2 border-rose-400/65 dark:border-rose-500/45 ring-1 ring-rose-500/20 shadow-[0_12px_32px_-6px_rgba(225,29,72,0.14)]'
        : isImportant
        ? 'border-amber-400/65 dark:border-amber-500/40 ring-1 ring-amber-500/15 shadow-[0_10px_28px_-6px_rgba(217,119,6,0.12)]'
        : 'border-blue-400/55 dark:border-blue-400/35 ring-1 ring-blue-500/10'
      : 'border-outline-variant/50 opacity-90 hover:opacity-100';

    const priorityBadgeClass = !isRead
      ? isEmergency
        ? 'bg-rose-600 text-white shadow-xs'
        : isImportant
        ? 'bg-amber-500 text-white shadow-xs'
        : 'bg-blue-600 text-white shadow-xs'
      : isEmergency
      ? 'bg-rose-500/10 text-rose-700/80 dark:text-rose-300/80 border border-rose-400/30'
      : isImportant
      ? 'bg-amber-500/10 text-amber-800/80 dark:text-amber-300/80 border border-amber-400/30'
      : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-400/25';

    const iconBoxClass = !isRead
      ? isEmergency
        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-400/40'
        : isImportant
        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-400/40'
        : 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-400/40'
      : 'bg-surface-container-low text-slate-400 dark:text-slate-500 border-outline-variant/40';

    return (
      <article
        key={notice.id}
        className={cn(
          'bg-surface-container-lowest rounded-[22px] border p-5 relative overflow-hidden flex flex-col justify-between gap-4 transition-transform duration-200 hover:-translate-y-0.5',
          cardToneClass
        )}
      >
        {/* Top Accent Strip — ONLY prominent when UNREAD */}
        {!isRead && (
          <div
            className={cn(
              'absolute top-0 left-0 w-1.5 h-full',
              isEmergency
                ? 'bg-rose-500'
                : isImportant
                ? 'bg-amber-500'
                : 'bg-blue-500'
            )}
          />
        )}

        {/* Top Section: Header Badges + Title + Message */}
        <div className={cn('flex flex-col gap-3', !isRead && 'pl-1.5')}>
          {/* Meta Header Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Priority Icon Well */}
              <div
                className={cn(
                  'w-8 h-8 rounded-xl border flex items-center justify-center shrink-0',
                  iconBoxClass
                )}
              >
                {isEmergency ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : isImportant ? (
                  <BellRing className="w-4 h-4" />
                ) : (
                  <Megaphone className="w-4 h-4" />
                )}
              </div>

              {/* Priority Pill */}
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-sans text-[10.5px] font-bold uppercase tracking-wider',
                  priorityBadgeClass
                )}
              >
                {!isRead && isEmergency && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
                {notice.priority === 'NORMAL' ? 'GENERAL' : notice.priority}
              </span>

              {/* Unread vs Read Pill */}
              {!isRead ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-sans text-[10.5px] font-bold bg-primary/15 dark:bg-blue-500/25 text-primary dark:text-blue-200 border border-primary/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-blue-400 animate-pulse" />
                  NEW
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-sans text-[10.5px] font-semibold bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30">
                  <Check className="w-3 h-3" />
                  Acknowledged
                </span>
              )}

              {/* Target Audience Pill */}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-sans text-[10.5px] font-medium bg-surface-container-low text-on-surface-variant border border-outline-variant/40">
                <Users className="w-3 h-3 text-outline" />
                {TARGET_ROLE_LABELS[notice.targetRole] ?? notice.targetRole}
              </span>

              {!notice.isPublished && (
                <span className="px-2.5 py-0.5 rounded-full font-sans text-[10.5px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-400/40">
                  Draft
                </span>
              )}
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-1 font-sans text-[11.5px] text-outline shrink-0 tabular-metrics">
              <Clock className="w-3.5 h-3.5 text-outline/80" />
              <span className="font-medium text-on-surface-variant">
                {formatRelativeNoticeTime(notice.createdAt)}
              </span>
              <span>•</span>
              <span>
                {new Date(notice.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Notice Title & Body */}
          <div className="space-y-1.5">
            <h3
              className={cn(
                'font-headline text-[16.5px] sm:text-[17.5px] tracking-tight leading-snug',
                !isRead
                  ? 'font-bold text-on-surface'
                  : 'font-semibold text-on-surface/75'
              )}
            >
              {notice.title}
            </h3>

            <p
              className={cn(
                'font-sans text-[13.5px] whitespace-pre-line leading-relaxed',
                !isRead ? 'text-on-surface/90' : 'text-on-surface-variant'
              )}
            >
              {notice.content}
            </p>
          </div>
        </div>

        {/* Bottom Footer: Author Identity + Quick Actions */}
        <div
          className={cn(
            'pt-3 border-t border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3',
            !isRead && 'pl-1.5'
          )}
        >
          {/* Author Avatar & Role */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center font-sans text-[11px] font-bold shrink-0 border',
                !isRead
                  ? 'bg-primary/12 text-primary border-primary/25'
                  : 'bg-surface-container-low text-on-surface-variant border-outline-variant/50'
              )}
            >
              {initials}
            </div>
            <div className="min-w-0 font-sans text-[12px] truncate">
              <span className="font-semibold text-on-surface">
                {notice.authorName}
              </span>
              <span className="text-outline mx-1.5">•</span>
              <span className="text-on-surface-variant">
                {formatAuthorRole(notice.authorRole)}
              </span>
            </div>
          </div>

          {/* Actions Row */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {!isRead ? (
              <button
                type="button"
                onClick={() => markAsRead(notice.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-sans text-[12px] font-semibold shadow-xs transition-colors"
                title="Acknowledge and mark this notice as read"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark as Read</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => markAsUnread(notice.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline-variant/40 font-sans text-[11.5px] font-medium transition-colors"
                title="Move back to unread"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Mark Unread</span>
              </button>
            )}

            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => togglePublishMutation.mutate(notice)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-sans text-[11.5px] font-semibold border transition-colors',
                    notice.isPublished
                      ? 'bg-surface-container-low text-on-surface-variant border-outline-variant/40 hover:bg-surface-container-high'
                      : 'bg-primary text-on-primary border-primary'
                  )}
                  title={notice.isPublished ? 'Unpublish notice' : 'Publish notice'}
                >
                  {notice.isPublished ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Unpublish</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Publish</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(notice)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-sans text-[11.5px] font-semibold bg-surface-container-low hover:bg-surface-container-high text-on-surface border border-outline-variant/40 transition-colors"
                  title="Edit notice"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete notice "${notice.title}"?`)) {
                      deleteMutation.mutate(notice.id);
                    }
                  }}
                  className="p-1.5 text-rose-500 hover:bg-rose-500/15 rounded-xl border border-transparent hover:border-rose-400/30 transition-colors"
                  title="Delete Notice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumbs={['Core Dispatch', 'Notice Board']}
        title="Campus Medical Notice Board"
        subtitle="Real-time team announcements, emergency dispatch briefings, and shift coordination updates."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {unreadNotices.length > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-surface-container-lowest hover:bg-surface-container-high text-on-surface rounded-xl font-sans text-[13px] font-semibold border border-outline-variant/60 transition-colors shadow-xs"
                title="Mark all active announcements as read"
              >
                <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Acknowledge All ({unreadNotices.length})</span>
              </button>
            )}

            {canManage && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-on-primary rounded-xl font-sans text-[13px] font-semibold shadow-sm transition-all"
              >
                <PlusCircle className="w-4 h-4 text-white" />
                <span>Post Notice</span>
              </button>
            )}
          </div>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
        <KpiCard
          label="Total Notices"
          value={notices.length}
          icon="campaign"
          footerLeft="In-App Board"
          footerRight="All Roles"
        />
        <KpiCard
          label="Unread Notices"
          value={unreadNotices.length}
          critical={unreadEmergencyCount > 0}
          icon="mark_chat_unread"
          footerLeft={
            unreadEmergencyCount > 0
              ? `${unreadEmergencyCount} Emergency Unread`
              : 'Up to date'
          }
          footerRight={unreadNotices.length > 0 ? 'Needs Review' : 'All Read'}
        />
        <KpiCard
          label="Emergency Dispatches"
          value={emergencyCount}
          critical={unreadEmergencyCount > 0}
          icon="e911_emergency"
          footerLeft={
            unreadEmergencyCount > 0 ? 'Active Unread' : 'All Acknowledged'
          }
          footerRight={`${unreadEmergencyCount} Pending`}
        />
        <KpiCard
          label="Acknowledged"
          value={notices.filter((n) => readIds.has(n.id)).length}
          icon="done_all"
          footerLeft="Read by you"
          footerRight="Archived"
        />
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-surface-container-lowest p-3.5 sm:p-4 rounded-2xl border border-outline-variant/60 shadow-card flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Filter Pill Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl border border-outline-variant/50 flex-wrap">
          {(
            [
              ['ALL', `All (${notices.length})`],
              ['UNREAD', `Unread (${unreadNotices.length})`],
              ['EMERGENCY', 'Emergency'],
              ['IMPORTANT', 'Important'],
              ['NORMAL', 'General'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'px-3 py-1.5 rounded-lg font-sans text-[12px] font-semibold transition-all',
                filter === key
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Keyword Search */}
        <div className="relative flex-1 lg:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notices or author..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low font-sans text-[12.5px] text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <ErrorBanner message={errorMsg} />

      {/* Notices Feed — Grouped by Unread vs Acknowledged in a Balanced 2-Column Bento Grid */}
      {isLoading ? (
        <div className="p-10 text-center text-outline bg-surface-container-lowest rounded-[22px] border border-outline-variant/60 font-sans text-[13.5px]">
          Loading campus medical notices...
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="p-10 text-center text-outline bg-surface-container-lowest rounded-[22px] border border-outline-variant/60 font-sans text-[13.5px]">
          No notices match your current filter or search.
        </div>
      ) : filter === 'ALL' && unreadFiltered.length > 0 && readFiltered.length > 0 ? (
        <div className="flex flex-col gap-6">
          {/* Unread Section */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <h2 className="font-headline text-[14px] uppercase tracking-wider font-bold text-on-surface">
                  New &amp; Unread Announcements ({unreadFiltered.length})
                </h2>
              </div>
              <span className="font-sans text-[12px] text-on-surface-variant">
                Requires your acknowledgement
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {unreadFiltered.map(renderNoticeCard)}
            </div>
          </section>

          {/* Read / Acknowledged Section */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1 pt-2 border-t border-outline-variant/30">
              <div className="flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="font-headline text-[13.5px] uppercase tracking-wider font-bold text-on-surface-variant">
                  Acknowledged &amp; Read History ({readFiltered.length})
                </h2>
              </div>
              <span className="font-sans text-[12px] text-outline">
                Muted priority styling
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {readFiltered.map(renderNoticeCard)}
            </div>
          </section>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredNotices.map(renderNoticeCard)}
        </div>
      )}

      {/* Create Notice Modal */}
      <Modal open={createOpen} title="Publish New In-App Notice" onClose={() => setCreateOpen(false)}>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="flex flex-col gap-3 font-body-sm text-body-sm"
        >
          <div>
            <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
              Notice Title *
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Emergency: Medical Team Required at Main Stage"
              className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-md text-body-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
                Priority Level *
              </label>
              <GlassSelect
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'NORMAL' | 'IMPORTANT' | 'EMERGENCY')}
                className="w-full"
              >
                <option value="NORMAL">Normal</option>
                <option value="IMPORTANT">Important</option>
                <option value="EMERGENCY">Emergency</option>
              </GlassSelect>
            </div>

            <div>
              <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
                Target Role
              </label>
              <GlassSelect
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as 'ALL' | 'DOCTOR' | 'NURSE' | 'VOLUNTEER' | 'ADMIN')}
                className="w-full"
              >
                <option value="ALL">All Roles</option>
                <option value="DOCTOR">Doctors</option>
                <option value="NURSE">Nurses</option>
                <option value="VOLUNTEER">Volunteers</option>
                <option value="ADMIN">Command Staff</option>
              </GlassSelect>
            </div>
          </div>

          <div>
            <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
              Announcement Message *
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Provide clear details and instructions for the team..."
              className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-md text-body-md"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="font-label-sm text-label-sm text-on-surface">
              Publish immediately on the Notice Board
            </span>
          </label>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="mt-2 py-2.5 bg-primary text-on-primary rounded font-label-md text-label-md font-semibold"
          >
            {createMutation.isPending ? 'Publishing...' : 'Publish Notice'}
          </button>
        </form>
      </Modal>

      {/* Edit Notice Modal */}
      <Modal open={editOpen} title="Edit In-App Notice" onClose={() => setEditOpen(false)}>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            editMutation.mutate();
          }}
          className="flex flex-col gap-3 font-body-sm text-body-sm"
        >
          <div>
            <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
              Notice Title *
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-md text-body-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
                Priority Level *
              </label>
              <GlassSelect
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'NORMAL' | 'IMPORTANT' | 'EMERGENCY')}
                className="w-full"
              >
                <option value="NORMAL">Normal</option>
                <option value="IMPORTANT">Important</option>
                <option value="EMERGENCY">Emergency</option>
              </GlassSelect>
            </div>

            <div>
              <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
                Target Role
              </label>
              <GlassSelect
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as 'ALL' | 'DOCTOR' | 'NURSE' | 'VOLUNTEER' | 'ADMIN')}
                className="w-full"
              >
                <option value="ALL">All Roles</option>
                <option value="DOCTOR">Doctors</option>
                <option value="NURSE">Nurses</option>
                <option value="VOLUNTEER">Volunteers</option>
                <option value="ADMIN">Command Staff</option>
              </GlassSelect>
            </div>
          </div>

          <div>
            <label className="block font-label-sm text-label-sm uppercase text-outline mb-1 font-semibold">
              Announcement Message *
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 rounded border border-outline-variant/50 bg-surface-container-low font-body-md text-body-md"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="font-label-sm text-label-sm text-on-surface">
              Published on Notice Board
            </span>
          </label>

          <button
            type="submit"
            disabled={editMutation.isPending}
            className="mt-2 py-2.5 bg-primary text-on-primary rounded font-label-md text-label-md font-semibold"
          >
            {editMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
