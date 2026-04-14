// src/contexts/AuthContext.tsx

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authAPI } from '../services/api';
import { tokenStorage } from '../lib/apiClient';
import type { User, LoginRequest } from '../types';

interface AuthContextType {
  user:            User | null;
  isLoading:       boolean;
  isAuthenticated: boolean;
  isAdmin:         boolean;
  login:           (payload: LoginRequest) => Promise<void>;
  logout:          () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = tokenStorage.get();
    if (!token) { setIsLoading(false); return; }

    authAPI.me(token)
      .then(setUser)
      .catch(() => tokenStorage.clear())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (payload: LoginRequest) => {
    const data = await authAPI.login(payload);
    // Save token FIRST so me() request has it
    tokenStorage.set(data.access_token);
    // Pass token explicitly to avoid race condition with localStorage
    const me = await authAPI.me(data.access_token);
    setUser(me);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}