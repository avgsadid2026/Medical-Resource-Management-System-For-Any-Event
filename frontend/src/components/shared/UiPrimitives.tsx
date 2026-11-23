import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, AlertCircle, ChevronDown, Check } from 'lucide-react';
import { AppIcon } from '@/components/shared/AppIcon';
import { cn } from '@/lib/utils';

export function PageHeader({
  breadcrumbs,
  title,
  subtitle,
  actions,
}: {
  breadcrumbs: string[];
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-space-md p-5 sm:p-6 mb-2 rounded-[22px] bg-surface-container-lowest border border-white/80 dark:border-white/15 shadow-card">
      {/* Subtle diagonal glass specular reflection */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-white/10 to-transparent dark:from-white/[0.07] dark:via-transparent dark:to-transparent"
      />
      <div className="relative z-10 flex flex-col gap-1 max-w-3xl min-w-0">
        <div className="flex items-center flex-wrap gap-1.5 font-sans text-[11px] uppercase tracking-wider text-outline font-semibold">
          {breadcrumbs.map((crumb, idx) => (
            <span key={crumb} className="flex items-center gap-1.5">
              {idx > 0 && <span className="text-outline-variant">/</span>}
              <span
                className={
                  idx === breadcrumbs.length - 1
                    ? 'text-primary font-bold px-2 py-0.5 rounded-md bg-primary/10 dark:bg-primary/20'
                    : 'font-medium'
                }
              >
                {crumb}
              </span>
            </span>
          ))}
        </div>
        <h1 className="font-headline text-[23px] sm:text-[27px] font-bold text-on-surface tracking-tight leading-tight mt-0.5">
          {title}
        </h1>
        {subtitle && (
          <p className="font-sans text-[13.5px] text-on-surface-variant leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="relative z-10 flex items-center flex-wrap gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

function getKpiIconAccent(iconName?: string, isCritical?: boolean) {
  if (isCritical) {
    return {
      container:
        'bg-rose-500/15 border-rose-300/70 text-rose-600 dark:bg-rose-500/20 dark:border-rose-400/30 dark:text-rose-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]',
      icon: 'text-rose-600 dark:text-rose-300',
    };
  }
  const name = (iconName ?? '').toLowerCase();
  if (
    [
      'crisis_alert',
      'e911_emergency',
      'emergency',
      'ecg_heart',
      'battery_alert',
      'report',
      'error',
    ].includes(name)
  ) {
    return {
      container:
        'bg-rose-500/15 border-rose-300/70 text-rose-600 dark:bg-rose-500/20 dark:border-rose-400/30 dark:text-rose-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]',
      icon: 'text-rose-600 dark:text-rose-300',
    };
  }
  if (
    [
      'warning',
      'notifications_active',
      'mark_chat_unread',
      'directions_run',
      'lock',
      'schedule',
    ].includes(name)
  ) {
    return {
      container:
        'bg-amber-500/15 border-amber-300/70 text-amber-600 dark:bg-amber-500/20 dark:border-amber-400/30 dark:text-amber-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]',
      icon: 'text-amber-600 dark:text-amber-300',
    };
  }
  if (
    ['check_circle', 'verified', 'verified_user', 'how_to_reg', 'done_all'].includes(
      name
    )
  ) {
    return {
      container:
        'bg-emerald-500/15 border-emerald-300/70 text-emerald-600 dark:bg-emerald-500/20 dark:border-emerald-400/30 dark:text-emerald-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]',
      icon: 'text-emerald-600 dark:text-emerald-300',
    };
  }
  if (
    [
      'stethoscope',
      'doctor',
      'doctors',
      'vital_signs',
      'local_hospital',
      'activity',
      'pulse',
    ].includes(name)
  ) {
    return {
      container:
        'bg-teal-500/15 border-teal-300/70 text-teal-600 dark:bg-teal-500/20 dark:border-teal-400/30 dark:text-teal-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]',
      icon: 'text-teal-600 dark:text-teal-300',
    };
  }
  // Default blue for logistics, fleet, equipment, inventory, reports
  return {
    container:
      'bg-blue-500/15 border-blue-300/70 text-blue-600 dark:bg-blue-500/20 dark:border-blue-400/30 dark:text-blue-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]',
    icon: 'text-blue-600 dark:text-blue-300',
  };
}

export function KpiCard({
  label,
  value,
  subValue,
  footerLeft,
  footerRight,
  icon,
  critical = false,
  progressPct,
  className,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  footerLeft?: string;
  footerRight?: string;
  icon?: string;
  critical?: boolean;
  progressPct?: number;
  className?: string;
}) {
  const accent = getKpiIconAccent(icon, critical);

  return (
    <div
      className={cn(
        'relative bg-surface-container-lowest p-4 sm:p-5 rounded-[20px] border shadow-card hover:shadow-soft hover:-translate-y-0.5 transition-transform duration-200 ease-out flex flex-col justify-between min-w-0 overflow-hidden',
        critical
          ? 'border-rose-400/50 dark:border-rose-500/40 ring-1 ring-rose-500/20'
          : 'border-white/80 dark:border-white/15',
        className
      )}
    >
      {/* Top specular glass glint */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent',
          critical
            ? 'from-rose-500/15 via-rose-500/5 dark:from-rose-500/20'
            : 'from-white/55 via-white/10 dark:from-white/[0.08] dark:via-transparent'
        )}
      />
      <div className="relative z-10 flex items-center justify-between gap-2 mb-3 min-w-0">
        <span
          className={cn(
            'font-sans text-[11.5px] uppercase tracking-wider font-semibold truncate min-w-0',
            critical ? 'text-error' : 'text-outline'
          )}
          title={label}
        >
          {label}
        </span>
        {icon && (
          <div
            className={cn(
              'w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-colors',
              accent.container
            )}
          >
            <AppIcon name={icon} size={20} className={accent.icon} />
          </div>
        )}
      </div>
      <div className="relative z-10 my-1.5 flex items-baseline flex-wrap gap-1.5 min-w-0">
        <span
          className={cn(
            'font-headline text-[26px] sm:text-[30px] tracking-tight font-bold tabular-nums leading-none truncate',
            critical ? 'text-error' : 'text-on-surface'
          )}
        >
          {value}
        </span>
        {subValue && (
          <span className="font-sans text-[13px] font-medium text-secondary truncate">
            {subValue}
          </span>
        )}
      </div>
      {progressPct !== undefined && (
        <div className="relative z-10 w-full h-1.5 bg-surface-container-high/70 backdrop-blur-xs rounded-full overflow-hidden my-2">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              critical ? 'bg-error' : 'bg-primary'
            )}
            style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
          />
        </div>
      )}
      {(footerLeft || footerRight) && (
        <div className="relative z-10 pt-2.5 mt-2 border-t border-outline-variant/40 flex items-center justify-between gap-2 font-sans text-[11.5px] text-on-surface-variant min-w-0">
          <span className="truncate min-w-0">{footerLeft}</span>
          <span
            className={cn(
              'font-semibold truncate max-w-[55%]',
              critical ? 'text-error' : 'text-primary'
            )}
          >
            {footerRight}
          </span>
        </div>
      )}
    </div>
  );
}

export function TriageBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    P1_IMMEDIATE: {
      label: 'P1 CRITICAL',
      cls: 'bg-rose-600/85 dark:bg-rose-500/80 text-white border border-rose-300/50 font-bold shadow-xs',
    },
    P2_URGENT: {
      label: 'P2 URGENT',
      cls: 'bg-amber-500/20 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-400/60 dark:border-amber-400/40 font-semibold',
    },
    P3_MINOR: {
      label: 'P3 MINOR',
      cls: 'bg-emerald-500/20 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border border-emerald-400/60 dark:border-emerald-400/40 font-semibold',
    },
    UNTRIAGED: {
      label: 'UNTRIAGED',
      cls: 'bg-surface-container-high/70 text-on-surface-variant border border-white/60 dark:border-white/15 font-semibold',
    },
  };
  const cfg = map[priority] ?? {
    label: priority,
    cls: 'bg-surface-container-high/70 text-on-surface',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full font-sans text-[10.5px] uppercase tracking-wider whitespace-nowrap',
        cfg.cls
      )}
    >
      {cfg.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const isDanger = [
    'CODE_RED',
    'ESCALATED',
    'CRITICAL',
    'P1_CRITICAL',
    'ACTIVE',
    'INTERCEPTING',
    'LOW_BATTERY',
    'FULL',
    'HIGH_LOAD',
    'EN_ROUTE',
  ].includes(status);

  const isPositive = [
    'OPERATIONAL',
    'ON_DUTY',
    'AVAILABLE',
    'OPTIMAL',
    'STANDBY',
    'DISCHARGED',
    'RESOLVED',
    'COMPLETED',
  ].includes(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-sans text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap',
        isDanger
          ? 'bg-rose-500/20 dark:bg-rose-500/25 text-rose-800 dark:text-rose-200 border border-rose-400/50 dark:border-rose-400/35'
          : isPositive
          ? 'bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-900 dark:text-emerald-200 border border-emerald-400/55 dark:border-emerald-400/35'
          : 'bg-surface-container-low text-on-surface-variant border border-white/70 dark:border-white/15'
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          isDanger
            ? 'bg-error shadow-[0_0_6px_rgba(239,68,68,0.8)]'
            : isPositive
            ? 'bg-emerald-600 dark:bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.7)]'
            : 'bg-outline'
        )}
      />
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 dark:bg-black/65 backdrop-blur-md p-4">
      <div className="emrms-glass-popover w-full max-w-lg rounded-[24px] overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 bg-surface-container-low/60 border-b border-white/60 dark:border-white/10 flex items-center justify-between">
          <h2 className="font-headline text-[17px] font-bold text-on-surface">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white transition-colors" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-space-md p-3.5 rounded-2xl bg-rose-500/15 dark:bg-rose-950/60 backdrop-blur-xl text-on-error-container border border-rose-400/50 dark:border-rose-500/40 font-sans text-[13px] flex items-center gap-2.5 shadow-xs">
      <AlertCircle className="w-4.5 h-4.5 text-error shrink-0" />
      <span>{message}</span>
    </div>
  );
}

interface ParsedOption {
  value: string;
  label: string;
  disabled?: boolean;
}

function extractOptionsFromChildren(children: ReactNode): ParsedOption[] {
  const result: ParsedOption[] = [];
  const walk = (nodes: ReactNode) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;
      const el = child as ReactElement<{
        value?: string | number;
        disabled?: boolean;
        children?: ReactNode;
      }>;
      if (el.type === 'option') {
        const rawVal = el.props.value !== undefined ? String(el.props.value) : '';
        const rawLabel =
          typeof el.props.children === 'string' || typeof el.props.children === 'number'
            ? String(el.props.children)
            : Children.toArray(el.props.children)
                .map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : ''))
                .join('');
        result.push({
          value: rawVal,
          label: rawLabel.trim() || rawVal,
          disabled: el.props.disabled,
        });
      } else if (el.props?.children) {
        walk(el.props.children);
      }
    });
  };
  walk(children);
  return result;
}

function getOptionStatusDot(val: string): string | null {
  const upper = val.toUpperCase();
  if (
    [
      'P1_CRITICAL',
      'P1_IMMEDIATE',
      'CODE_RED',
      'EMERGENCY',
      'ESCALATED',
      'LOW_BATTERY',
    ].includes(upper)
  ) {
    return 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.75)]';
  }
  if (
    [
      'P2_URGENT',
      'URGENT',
      'IMPORTANT',
      'TRIAGE',
      'INTERCEPTING',
      'IN_TRANSIT',
      'IN_USE',
      'MAINTENANCE',
    ].includes(upper)
  ) {
    return 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.7)]';
  }
  if (
    [
      'ON_DUTY',
      'OPERATIONAL',
      'P3_MINOR',
      'DISCHARGED',
      'STANDBY',
      'NORMAL',
      'STANDARD',
    ].includes(upper)
  ) {
    return 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]';
  }
  return null;
}

export function GlassSelect({
  value,
  onChange,
  children,
  className,
  id,
  disabled = false,
  required = false,
  'aria-label': ariaLabel,
}: {
  value?: string | number;
  onChange?: (e: {
    target: { value: string };
    currentTarget: { value: string };
  }) => void;
  children?: ReactNode;
  className?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  'aria-label'?: string;
}) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const listboxId = `${selectId}-listbox`;

  const options = extractOptionsFromChildren(children);
  const strValue = value !== undefined && value !== null ? String(value) : '';
  const selectedIndex = options.findIndex((o) => o.value === strValue);
  const selectedOption =
    selectedIndex >= 0 ? options[selectedIndex] : options[0] ?? null;

  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(
    selectedIndex >= 0 ? selectedIndex : 0
  );
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    openUpward: boolean;
  } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const isCompact =
    Boolean(className) &&
    (/\bpy-1\b/.test(className!) || /\bpy-1\.5\b/.test(className!));
  const isFullWidth = Boolean(className) && /\bw-full\b/.test(className!);
  const isErrorBorder =
    Boolean(className) && /\bborder-error\b/.test(className!);

  const updateMenuPosition = () => {
    if (!triggerRef.current || typeof window === 'undefined') return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const menuWidth = Math.min(
      Math.max(rect.width, isCompact ? 185 : 210),
      viewportW - 24
    );
    let left = rect.left;
    if (left + menuWidth > viewportW - 12) {
      left = Math.max(12, viewportW - menuWidth - 12);
    }

    const spaceBelow = viewportH - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < 230 && spaceAbove > spaceBelow;

    if (openUpward) {
      setCoords({
        bottom: viewportH - rect.top + 6,
        left,
        width: menuWidth,
        openUpward: true,
      });
    } else {
      setCoords({
        top: rect.bottom + 6,
        left,
        width: menuWidth,
        openUpward: false,
      });
    }
  };

  const handleOpen = () => {
    if (disabled) return;
    updateMenuPosition();
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const handleSelect = (opt: ParsedOption) => {
    if (opt.disabled) return;
    const syntheticEvent = {
      target: { value: opt.value },
      currentTarget: { value: opt.value },
    };
    onChange?.(syntheticEvent);
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleScrollOrResize = (e: Event) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) {
        return;
      }
      updateMenuPosition();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open]);

  useEffect(() => {
    if (open && highlightedIndex >= 0 && menuRef.current) {
      const item = menuRef.current.children[highlightedIndex] as
        | HTMLElement
        | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, highlightedIndex]);

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        handleOpen();
      } else if (options.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % options.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        handleOpen();
      } else if (options.length > 0) {
        setHighlightedIndex((prev) =>
          prev <= 0 ? options.length - 1 : prev - 1
        );
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) {
        handleOpen();
      } else if (options[highlightedIndex]) {
        handleSelect(options[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const selectedDot = selectedOption
    ? getOptionStatusDot(selectedOption.value)
    : null;

  return (
    <div
      className={cn(
        'relative inline-flex',
        isFullWidth ? 'w-full' : 'w-auto',
        className?.includes(' sm:w-auto') && 'w-full sm:w-auto'
      )}
    >
      {/* Hidden input for native form required validation */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required={required}
          value={strValue}
          onChange={() => {}}
          className="sr-only pointer-events-none"
        />
      )}

      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : handleOpen())}
        onKeyDown={handleKeyDown}
        className={cn(
          'group/select w-full flex items-center justify-between gap-2.5 text-left font-sans transition-all duration-150 select-none outline-none cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed',
          isCompact
            ? 'px-2.5 py-1.5 rounded-xl text-[12px] font-semibold min-w-[132px]'
            : 'px-3.5 py-2.5 rounded-xl text-[13px] font-medium min-w-[155px]',
          isErrorBorder
            ? 'border border-error/50 bg-rose-500/10 dark:bg-rose-950/40 text-on-surface'
            : open
            ? 'border border-primary/60 dark:border-blue-400/60 bg-white/95 dark:bg-slate-800/90 text-on-surface ring-3 ring-primary/15 dark:ring-blue-500/20 shadow-sm'
            : 'border border-slate-200/90 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/65 hover:bg-white/95 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 text-on-surface shadow-[inset_0_1px_1px_rgba(255,255,255,0.85),0_1px_2px_rgba(15,23,42,0.03)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_1px_3px_rgba(0,0,0,0.25)] focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/15'
        )}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          {selectedDot && (
            <span
              className={cn('w-2 h-2 rounded-full shrink-0', selectedDot)}
            />
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : 'Select...'}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 shrink-0 transition-transform duration-200',
            open
              ? 'rotate-180 text-primary dark:text-blue-400'
              : 'text-slate-400 group-hover/select:text-slate-600 dark:text-slate-400 dark:group-hover/select:text-slate-200'
          )}
        />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && coords && (
              <motion.ul
                ref={menuRef}
                id={listboxId}
                role="listbox"
                aria-labelledby={selectId}
                initial={{
                  opacity: 0,
                  y: coords.openUpward ? 6 : -6,
                  scale: 0.98,
                }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{
                  opacity: 0,
                  y: coords.openUpward ? 6 : -6,
                  scale: 0.98,
                }}
                transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'fixed',
                  top: coords.top,
                  bottom: coords.bottom,
                  left: coords.left,
                  width: coords.width,
                }}
                className="emrms-glass-popover z-[100] p-1.5 rounded-2xl max-h-64 overflow-y-auto outline-none space-y-0.5 font-sans"
              >
                {options.map((opt, idx) => {
                  const isSelected = opt.value === strValue;
                  const isHighlighted = idx === highlightedIndex;
                  const dot = getOptionStatusDot(opt.value);

                  return (
                    <li
                      key={`${opt.value}-${idx}`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => handleSelect(opt)}
                      className={cn(
                        'flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[12.5px] cursor-pointer transition-colors duration-100 select-none',
                        opt.disabled && 'opacity-45 cursor-not-allowed',
                        isSelected
                          ? 'bg-primary/12 dark:bg-blue-500/25 text-primary dark:text-blue-200 font-semibold'
                          : isHighlighted
                          ? 'bg-slate-200/70 dark:bg-white/[0.08] text-on-surface font-medium'
                          : 'text-on-surface-variant hover:bg-slate-200/50 dark:hover:bg-white/[0.05] hover:text-on-surface'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {dot && (
                          <span
                            className={cn('w-2 h-2 rounded-full shrink-0', dot)}
                          />
                        )}
                        <span className="truncate">{opt.label}</span>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-primary dark:text-blue-300 shrink-0" />
                      )}
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
