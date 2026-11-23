import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { apiRequest, setCsrfToken } from '@/lib/apiClient';
import type { AuthUser } from '@/types/emrms';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (
    identifier: string,
    password: string,
    rememberTerminal: boolean
  ) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await apiRequest<{ user: AuthUser; csrfToken: string }>(
        '/auth/me'
      );
      setCsrfToken(data.csrfToken);
      setUser(data.user);
    } catch {
      setUser(null);
      setCsrfToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (identifier: string, password: string, rememberTerminal: boolean) => {
      const { data } = await apiRequest<{ user: AuthUser; csrfToken: string }>(
        '/auth/login',
        {
          method: 'POST',
          body: { identifier, password, rememberTerminal },
          skipCsrf: true,
        }
      );
      setCsrfToken(data.csrfToken);
      setUser(data.user);
      return data.user;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      setCsrfToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
