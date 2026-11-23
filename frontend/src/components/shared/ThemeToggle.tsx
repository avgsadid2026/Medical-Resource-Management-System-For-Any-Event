import { Sun, Moon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '@/features/theme/ThemeContext';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={
        isDark
          ? 'Active: Dark Mode (Click for Light Mode)'
          : 'Active: Light Mode (Click for Dark Mode)'
      }
      className={cn(
        'group relative flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl font-sans text-[12.5px] font-semibold border transition-transform duration-150 active:scale-95 shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/30 select-none cursor-pointer overflow-hidden shrink-0',
        isDark
          ? 'bg-slate-800/80 hover:bg-slate-700/85 text-blue-300 border-slate-700 hover:border-blue-400/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]'
          : 'bg-white/75 hover:bg-white text-slate-700 border-slate-200/90 hover:border-slate-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.85)]',
        className
      )}
    >
      <span className="relative w-4 h-4 flex items-center justify-center shrink-0">
        <AnimatePresence mode="popLayout" initial={false}>
          {isDark ? (
            <motion.span
              key="moon"
              initial={{ rotate: -65, scale: 0.4, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 65, scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              className="flex items-center justify-center"
            >
              <Moon className="w-4 h-4 text-blue-400 shrink-0" />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ rotate: 65, scale: 0.4, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -65, scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              className="flex items-center justify-center"
            >
              <Sun className="w-4 h-4 text-amber-500 shrink-0" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className="hidden sm:inline font-sans text-[12px] tracking-tight">
        {isDark ? 'Dark' : 'Light'}
      </span>
    </button>
  );
}
