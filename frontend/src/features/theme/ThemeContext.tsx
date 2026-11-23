import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'emrms_theme';

function applyThemeToDom(next: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;
  const isDark = next === 'dark';

  root.classList.toggle('dark', isDark);
  root.setAttribute('data-theme', next);
  root.style.colorScheme = next;

  if (body) {
    body.classList.toggle('dark', isDark);
    body.setAttribute('data-theme', next);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
    } catch {
      // ignore
    }
    return 'light';
  });

  useLayoutEffect(() => {
    applyThemeToDom(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const executePremiumThemeSwitch = (next: Theme) => {
    if (typeof document === 'undefined') {
      setThemeState(next);
      return;
    }

    const root = document.documentElement;
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const docWithVT = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };

    // Use hardware-accelerated GPU View Transitions API when supported (1 single paint pass + 120fps GPU blend)
    if (docWithVT.startViewTransition && !prefersReducedMotion) {
      root.classList.add('emrms-vt-active');
      const transition = docWithVT.startViewTransition(() => {
        flushSync(() => {
          applyThemeToDom(next);
          setThemeState(next);
        });
      });
      transition.finished.finally(() => {
        root.classList.remove('emrms-vt-active');
      });
      return;
    }

    // Fallback for browsers without View Transitions API
    root.classList.add('emrms-theme-switching');
    applyThemeToDom(next);
    setThemeState(next);
    window.setTimeout(() => {
      root.classList.remove('emrms-theme-switching');
    }, 240);
  };

  const setTheme = (next: Theme) => {
    if (next === theme) return;
    executePremiumThemeSwitch(next);
  };

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    executePremiumThemeSwitch(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
