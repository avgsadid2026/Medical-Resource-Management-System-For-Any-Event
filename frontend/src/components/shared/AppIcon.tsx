import type { ComponentType } from 'react';
import {
  LayoutDashboard,
  Megaphone,
  AlertTriangle,
  ClipboardList,
  Stethoscope,
  Users,
  UserRound,
  Truck,
  Wrench,
  Pill,
  BarChart3,
  ShieldAlert,
  Settings,
  UserCog,
  Sun,
  Moon,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Plus,
  PlusCircle,
  Trash2,
  Activity,
  HeartPulse,
  History,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Search,
  AlertCircle,
  Zap,
  Building2,
  Bed,
  BadgeCheck,
  Shield,
  SlidersHorizontal,
  ArrowRight,
  MapPin,
  Clock,
  Sparkles,
  type LucideProps,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  // Navigation & Core Dispatch
  grid_view: LayoutDashboard,
  dashboard: LayoutDashboard,
  campaign: Megaphone,
  notices: Megaphone,
  notice: Megaphone,
  warning: AlertTriangle,
  alerts: AlertTriangle,
  alert: AlertTriangle,
  crisis_alert: AlertTriangle,
  e911_emergency: AlertTriangle,
  emergency_share: AlertTriangle,
  emergency: AlertTriangle,
  assignment_late: ClipboardList,
  assignment: ClipboardList,
  incidents: ClipboardList,
  incident: ClipboardList,

  // Clinical & Patients
  stethoscope: Stethoscope,
  doctor: Stethoscope,
  doctors: Stethoscope,
  group: Users,
  users: Users,
  nurses: Users,
  nurse: Users,
  account_circle: UserRound,
  patients: UserRound,
  patient: UserRound,
  user: UserRound,
  vital_signs: Activity,
  activity: Activity,
  pulse: Activity,
  local_hospital: HeartPulse,
  hospital: HeartPulse,

  // Resources & Logistics
  airport_shuttle: Truck,
  ambulance: Truck,
  ambulances: Truck,
  local_shipping: Truck,
  build: Wrench,
  equipment: Wrench,
  wrench: Wrench,
  medication: Pill,
  medicines: Pill,
  medicine: Pill,
  pill: Pill,

  // Governance & Audit
  bar_chart: BarChart3,
  analytics: BarChart3,
  reports: BarChart3,
  policy: ShieldAlert,
  audit: ShieldAlert,
  audit_logs: ShieldAlert,
  settings: Settings,
  system_settings: Settings,
  manage_accounts: UserCog,
  users_roles: UserCog,

  // UI Utilities & Actions
  search: Search,
  bolt: Zap,
  zap: Zap,
  dispatch: Zap,
  check_circle: CheckCircle2,
  check: Check,
  done: Check,
  done_all: CheckCheck,
  history: History,
  badge: BadgeCheck,
  badge_check: BadgeCheck,
  notifications: Bell,
  notifications_active: Bell,
  mark_chat_unread: Bell,
  bell: Bell,
  add: Plus,
  plus: Plus,
  add_circle: PlusCircle,
  plus_circle: PlusCircle,
  delete: Trash2,
  trash: Trash2,
  close: X,
  x: X,
  menu: Menu,
  logout: LogOut,
  light_mode: Sun,
  sun: Sun,
  dark_mode: Moon,
  moon: Moon,
  expand_more: ChevronDown,
  chevron_down: ChevronDown,
  chevron_right: ChevronRight,
  schema: SlidersHorizontal,
  error: AlertCircle,
  building: Building2,
  bed: Bed,
  shield: Shield,
  arrow_right: ArrowRight,
  map_pin: MapPin,
  clock: Clock,
};

export interface AppIconProps extends LucideProps {
  name?: string;
  className?: string;
}

function getDefaultSemanticColor(name: string): string {
  const n = name.toLowerCase().trim();
  if (['warning', 'alerts', 'alert', 'crisis_alert', 'e911_emergency', 'emergency_share', 'emergency', 'error', 'battery_alert', 'report'].includes(n)) {
    return 'text-rose-500 dark:text-rose-400';
  }
  if (['check', 'done', 'done_all', 'check_circle', 'verified', 'verified_user', 'how_to_reg'].includes(n)) {
    return 'text-emerald-600 dark:text-emerald-400';
  }
  if (['sun', 'light_mode', 'notifications_active', 'mark_chat_unread', 'lock'].includes(n)) {
    return 'text-amber-500 dark:text-amber-400';
  }
  if (['moon', 'dark_mode'].includes(n)) {
    return 'text-blue-400';
  }
  if (['vital_signs', 'activity', 'pulse', 'stethoscope', 'doctor', 'doctors', 'local_hospital', 'hospital', 'nurses', 'nurse'].includes(n)) {
    return 'text-teal-600 dark:text-teal-400';
  }
  if (['search', 'settings', 'system_settings', 'close', 'x', 'menu', 'chevron_down', 'chevron_right', 'arrow_right', 'clock'].includes(n)) {
    return 'text-slate-500 dark:text-slate-400';
  }
  // Primary navigation / Core dispatch / Fleet / Logistics / Analytics
  return 'text-blue-600 dark:text-blue-400';
}

export function AppIcon({ name, className, size = 18, strokeWidth = 2, ...props }: AppIconProps) {
  if (!name) return null;
  const normalized = name.toLowerCase().trim();
  const IconComponent = ICON_MAP[normalized] || Sparkles;

  const hasExplicitColor = className ? /\btext-/.test(className) : false;
  const fallbackColor = hasExplicitColor ? '' : getDefaultSemanticColor(normalized);

  return (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      className={cn('shrink-0 select-none inline-block', fallbackColor, className)}
      {...props}
    />
  );
}
