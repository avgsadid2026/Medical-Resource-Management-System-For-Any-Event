import {
  useState,
  useRef,
  useEffect,
  type FormEvent,
  type MouseEvent,
  type KeyboardEvent,
} from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from 'framer-motion';
import { useAuth } from './AuthContext';
import { ApiError } from '@/lib/apiClient';

const ROLE_OPTIONS = [
  {
    label: 'Super Admin',
    email: 'admin@baust-demo.edu.bd',
    icon: 'admin_panel_settings',
  },
  {
    label: 'Medical Admin',
    email: 'e.vance@baust-demo.edu.bd',
    icon: 'verified_user',
  },
  {
    label: 'Doctor',
    email: 't.hasan@baust-demo.edu.bd',
    icon: 'stethoscope',
  },
  {
    label: 'Nurse',
    email: 'f.yasmin@baust-demo.edu.bd',
    icon: 'clinical_notes',
  },
  {
    label: 'Dispatcher',
    email: 'dispatch@baust-demo.edu.bd',
    icon: 'local_shipping',
  },
  {
    label: 'Volunteer',
    email: 'volunteer@baust-demo.edu.bd',
    icon: 'volunteer_activism',
  },
];

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('e.vance@baust-demo.edu.bd');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberTerminal, setRememberTerminal] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const selectedRoleIndex = ROLE_OPTIONS.findIndex(
    (r) => r.email.toLowerCase() === identifier.toLowerCase()
  );
  const selectedRole =
    selectedRoleIndex >= 0 ? ROLE_OPTIONS[selectedRoleIndex] : null;

  const handleRoleSelect = (email: string) => {
    if (!email) return;
    setIdentifier(email);
    setPassword('');
    setError(null);
  };

  const handleSelectOption = (role: (typeof ROLE_OPTIONS)[number]) => {
    handleRoleSelect(role.email);
    setIsDropdownOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Scroll active option into view when navigating via keyboard
  useEffect(() => {
    if (isDropdownOpen && highlightedIndex >= 0 && listboxRef.current) {
      const activeOption = listboxRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (activeOption) {
        activeOption.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isDropdownOpen]);

  const handleDropdownKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isDropdownOpen) {
        setIsDropdownOpen(true);
        setHighlightedIndex(selectedRoleIndex >= 0 ? selectedRoleIndex : 0);
      } else {
        setHighlightedIndex((prev) => (prev + 1) % ROLE_OPTIONS.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isDropdownOpen) {
        setIsDropdownOpen(true);
        setHighlightedIndex(
          selectedRoleIndex >= 0 ? selectedRoleIndex : ROLE_OPTIONS.length - 1
        );
      } else {
        setHighlightedIndex((prev) =>
          prev <= 0 ? ROLE_OPTIONS.length - 1 : prev - 1
        );
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isDropdownOpen) {
        setIsDropdownOpen(true);
        setHighlightedIndex(selectedRoleIndex >= 0 ? selectedRoleIndex : 0);
      } else {
        if (highlightedIndex >= 0 && highlightedIndex < ROLE_OPTIONS.length) {
          handleSelectOption(ROLE_OPTIONS[highlightedIndex]);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsDropdownOpen(false);
    } else if (e.key === 'Tab') {
      setIsDropdownOpen(false);
    }
  };

  // Animation & 3D tilt controls
  const cardRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsTouchDevice(
        !window.matchMedia('(hover: hover) and (pointer: fine)').matches
      );
    }
  }, []);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 140, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-6, 6]);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || isTouchDevice || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mousePosX = e.clientX - rect.left;
    const mousePosY = e.clientY - rect.top;

    const xPct = mousePosX / width - 0.5;
    const yPct = mousePosY / height - 0.5;

    mouseX.set(xPct);
    mouseY.set(yPct);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(identifier, password, rememberTerminal);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to connect to MEDIJIGS server.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-[#07060c] text-slate-100"
      style={{ perspective: 1200 }}
    >
      {/* 1. Animated Ambient Gradient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Soft floating purple radial orb (top-left) */}
        <motion.div
          className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full blur-[110px] opacity-40 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(168, 85, 247, 0.45) 0%, rgba(139, 92, 246, 0.18) 45%, transparent 70%)',
          }}
          animate={
            prefersReducedMotion
              ? {}
              : {
                  x: [0, 35, 0],
                  y: [0, 25, 0],
                  scale: [1, 1.06, 1],
                }
          }
          transition={{ repeat: Infinity, duration: 13, ease: 'easeInOut' }}
        />

        {/* Soft floating indigo radial orb (bottom-right) */}
        <motion.div
          className="absolute -bottom-36 -right-36 w-[460px] h-[460px] rounded-full blur-[120px] opacity-35 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(99, 102, 241, 0.42) 0%, rgba(168, 85, 247, 0.16) 45%, transparent 70%)',
          }}
          animate={
            prefersReducedMotion
              ? {}
              : {
                  x: [0, -40, 0],
                  y: [0, -30, 0],
                  scale: [1, 1.08, 1],
                }
          }
          transition={{ repeat: Infinity, duration: 16, ease: 'easeInOut', delay: 1 }}
        />

        {/* Subtle center ambient breathing glow */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[620px] rounded-full blur-[140px] opacity-20 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(217, 70, 239, 0.28) 0%, rgba(99, 102, 241, 0.1) 50%, transparent 70%)',
          }}
          animate={
            prefersReducedMotion
              ? {}
              : {
                  opacity: [0.16, 0.26, 0.16],
                }
          }
          transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut' }}
        />

        {/* Subtle cyber/command matrix grid */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #a855f7 1px, transparent 1px), linear-gradient(to bottom, #a855f7 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Very subtle noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* 2. 3D Tilt Login Card Container */}
      <main className="w-full max-w-[440px] mx-auto relative z-10">
        <motion.div
          ref={cardRef}
          initial={
            prefersReducedMotion
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: 22, scale: 0.98 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          style={
            prefersReducedMotion || isTouchDevice
              ? {}
              : {
                  rotateX,
                  rotateY,
                  transformStyle: 'preserve-3d',
                }
          }
          className="relative rounded-2xl p-[1px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(147,51,234,0.3),0_0_40px_-10px_rgba(99,102,241,0.22)]"
        >
          {/* Traveling Light Beam & Glowing Border */}
          {!prefersReducedMotion && (
            <motion.div
              aria-hidden="true"
              className="absolute -inset-[150%] pointer-events-none opacity-80"
              style={{
                background:
                  'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 275deg, rgba(168, 85, 247, 0.85) 320deg, rgba(236, 72, 153, 0.95) 350deg, transparent 360deg)',
              }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
            />
          )}

          {/* Static subtle border fallback */}
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-2xl border border-purple-500/25 pointer-events-none"
          />

          {/* Card Inner Surface */}
          <div className="relative rounded-[15px] bg-white/[0.065] backdrop-blur-2xl p-5 sm:p-6 flex flex-col gap-4 border border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)]">
            {/* Brand & Project Identity Header */}
            <div className="flex items-start gap-3">
              <div className="relative shrink-0 mt-0.5">
                <div
                  aria-hidden="true"
                  className="absolute -inset-1 rounded-xl bg-purple-600/30 blur-md pointer-events-none"
                />
                <img
                  src="/emrms-logo.svg"
                  alt="MEDIJIGS Logo"
                  className="relative w-9 h-9 object-contain drop-shadow"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="font-headline-md text-[16px] sm:text-[17.5px] font-bold text-white tracking-tight leading-snug">
                  MEDIJIGS
                </h1>
                <span className="text-[12px] font-medium text-purple-300/85 tracking-wide mt-0.5 leading-snug">
                  Medical &amp; Resource Management System For Any Event
                </span>
              </div>
            </div>

            {/* Custom Role Selector Dropdown */}
            <div ref={dropdownRef} className="relative flex flex-col gap-1 w-full">
              <label
                id="role-selector-label"
                htmlFor="role-selector"
                className="font-label-sm text-[10.5px] text-slate-300 uppercase tracking-wider font-semibold"
              >
                SELECT A ROLE
              </label>

              {/* Dropdown Trigger */}
              <button
                type="button"
                id="role-selector"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
                aria-controls="role-listbox"
                aria-labelledby="role-selector-label"
                aria-activedescendant={
                  isDropdownOpen && highlightedIndex >= 0
                    ? `role-option-${highlightedIndex}`
                    : undefined
                }
                onClick={() => {
                  const nextState = !isDropdownOpen;
                  setIsDropdownOpen(nextState);
                  if (nextState) {
                    setHighlightedIndex(
                      selectedRoleIndex >= 0 ? selectedRoleIndex : 0
                    );
                  }
                }}
                onKeyDown={handleDropdownKeyDown}
                className={`w-full h-[41px] px-3 rounded-lg flex items-center justify-between text-left transition-all duration-200 outline-none select-none ${
                  isDropdownOpen
                    ? 'bg-[#150f28] border border-purple-400/60 ring-2 ring-purple-500/20 shadow-[0_0_14px_rgba(168,85,247,0.2)]'
                    : 'bg-white/[0.035] border border-white/10 hover:border-purple-500/30 hover:bg-white/[0.05] focus-visible:border-purple-400 focus-visible:ring-2 focus-visible:ring-purple-500/20'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span
                    aria-hidden="true"
                    className={`material-symbols-outlined text-[17px] shrink-0 ${
                      selectedRole ? 'text-purple-300' : 'text-purple-300/60'
                    }`}
                  >
                    {selectedRole ? selectedRole.icon : 'manage_accounts'}
                  </span>
                  <span
                    className={`text-sm truncate ${
                      selectedRole ? 'text-white font-medium' : 'text-slate-400'
                    }`}
                  >
                    {selectedRole ? selectedRole.label : 'Choose your role'}
                  </span>
                </div>
                <span
                  aria-hidden="true"
                  className={`material-symbols-outlined text-[18px] text-slate-400 shrink-0 transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180 text-purple-300' : ''
                  }`}
                >
                  expand_more
                </span>
              </button>

              {/* Animated Custom Dropdown Menu */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.ul
                    ref={listboxRef}
                    id="role-listbox"
                    role="listbox"
                    aria-labelledby="role-selector-label"
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute top-full left-0 right-0 mt-1.5 z-50 p-1 rounded-xl bg-[#120d26]/80 border border-white/20 shadow-[0_12px_28px_rgba(0,0,0,0.65),0_0_16px_rgba(147,51,234,0.18),inset_0_1px_1px_rgba(255,255,255,0.18)] max-h-[220px] overflow-y-auto outline-none focus:outline-none backdrop-blur-2xl space-y-0.5"
                  >
                    {ROLE_OPTIONS.map((profile, idx) => {
                      const isSelected = selectedRole?.email === profile.email;
                      const isHighlighted = highlightedIndex === idx;

                      return (
                        <li
                          key={profile.email}
                          id={`role-option-${idx}`}
                          role="option"
                          aria-selected={isSelected}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          onClick={() => handleSelectOption(profile)}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-sm transition-colors duration-150 select-none ${
                            isSelected
                              ? 'bg-purple-500/15 text-purple-200 font-medium'
                              : isHighlighted
                              ? 'bg-white/[0.08] text-white'
                              : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <span
                              aria-hidden="true"
                              className={`material-symbols-outlined text-[16px] shrink-0 ${
                                isSelected
                                  ? 'text-purple-300'
                                  : isHighlighted
                                  ? 'text-purple-300'
                                  : 'text-slate-400'
                              }`}
                            >
                              {profile.icon}
                            </span>
                            <span className="truncate">{profile.label}</span>
                          </div>
                          {isSelected && (
                            <span
                              aria-hidden="true"
                              className="material-symbols-outlined text-[16px] text-purple-300 shrink-0 ml-2"
                            >
                              check
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            {/* Error Message Banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 font-body-sm text-xs flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[15px] text-rose-400 shrink-0">
                  error
                </span>
                <span>{error}</span>
              </motion.div>
            )}

            {/* 3. Login Form with Smooth Input Highlights */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {/* Identifier Field */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="med-id"
                  className="font-label-sm text-[10.5px] text-slate-300 uppercase tracking-wider font-semibold"
                >
                  Staff Email or Institutional ID
                </label>
                <div className="relative flex items-center rounded-xl bg-white/[0.03] border border-white/10 hover:border-purple-500/30 focus-within:border-purple-400 focus-within:bg-black/40 focus-within:ring-2 focus-within:ring-purple-500/25 focus-within:shadow-[0_0_16px_rgba(168,85,247,0.22)] transition-all duration-200">
                  <span className="absolute left-3 material-symbols-outlined text-[16px] text-purple-300/60 pointer-events-none">
                    badge
                  </span>
                  <input
                    id="med-id"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.vance@baust-demo.edu.bd"
                    className="w-full bg-transparent text-white font-body-md text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="security-pin"
                  className="font-label-sm text-[10.5px] text-slate-300 uppercase tracking-wider font-semibold"
                >
                  Password
                </label>
                <div className="relative flex items-center rounded-xl bg-white/[0.03] border border-white/10 hover:border-purple-500/30 focus-within:border-purple-400 focus-within:bg-black/40 focus-within:ring-2 focus-within:ring-purple-500/25 focus-within:shadow-[0_0_16px_rgba(168,85,247,0.22)] transition-all duration-200">
                  <span className="absolute left-3 material-symbols-outlined text-[16px] text-purple-300/60 pointer-events-none">
                    key
                  </span>
                  <input
                    id="security-pin"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password for selected role"
                    autoComplete="current-password"
                    className="w-full bg-transparent text-white font-body-md text-xs sm:text-sm pl-9 pr-10 py-2 rounded-xl outline-none placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 p-1 text-purple-300/60 hover:text-white transition-colors cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Remember Terminal Checkbox */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberTerminal}
                    onChange={(e) => setRememberTerminal(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-purple-500 cursor-pointer"
                  />
                  <span className="font-body-sm text-[11.5px] text-slate-300">
                    Remember terminal for 12 hours
                  </span>
                </label>
                <span className="font-label-sm text-[9.5px] font-semibold text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded-full">
                  PROTECTED SESSION
                </span>
              </div>

              {/* 4. Animated Submit Button with Light Sweep */}
              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={prefersReducedMotion ? {} : { scale: 1.01 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.985 }}
                className="relative w-full overflow-hidden text-white font-medium py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-purple-950/50 border border-purple-400/40 mt-1 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                style={{
                  background:
                    'linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #9333ea 100%)',
                }}
              >
                {/* Subtle animated light sweep */}
                {!prefersReducedMotion && !submitting && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute top-0 bottom-0 w-28 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 pointer-events-none"
                    animate={{ x: ['-140%', '360%'] }}
                    transition={{
                      repeat: Infinity,
                      duration: 3.5,
                      ease: 'easeInOut',
                      repeatDelay: 1,
                    }}
                  />
                )}
                <span className="relative z-10 font-semibold tracking-wide">
                  {submitting
                    ? 'Authenticating Session...'
                    : 'Authenticate & Access Command Console'}
                </span>
                <span
                  className="material-symbols-outlined text-[15px] relative z-10"
                  aria-hidden="true"
                >
                  arrow_forward
                </span>
              </motion.button>
            </form>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
