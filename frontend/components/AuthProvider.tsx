'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { AuthResponse, User } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (auth: AuthResponse) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const existing = authStorage.readUser();
    if (!existing) {
      setLoading(false);
      return;
    }

    setUser(existing);
    api.me().then(setUser).catch(() => authStorage.clear()).finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    signIn(auth) {
      authStorage.save(auth);
      setUser(auth.user);
    },
    async signOut() {
      try { await api.logout(); } catch {}
      authStorage.clear();
      setUser(null);
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
