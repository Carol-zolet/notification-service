import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { config } from '../config';

const TOKEN_KEY = 'auth_token';
const EMAIL_KEY = 'auth_email';

interface AuthContextType {
  token: string | null;
  email: string | null;
  isAuthenticated: boolean;
  requestCode: (email: string) => Promise<{ ok: boolean; error?: string }>;
  verifyCode: (email: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [email, setEmail] = useState<string | null>(() => sessionStorage.getItem(EMAIL_KEY));

  const requestCode = useCallback(async (email: string) => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/auth/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Erro ao pedir código' };
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: 'Erro de conexão ao pedir código' };
    }
  }, []);

  const verifyCode = useCallback(async (emailInput: string, code: string) => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, code }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Código inválido' };

      sessionStorage.setItem(TOKEN_KEY, data.token);
      sessionStorage.setItem(EMAIL_KEY, data.email);
      setToken(data.token);
      setEmail(data.email);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: 'Erro de conexão ao verificar código' };
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EMAIL_KEY);
    setToken(null);
    setEmail(null);
  }, []);

  // Fetch que já inclui o header Authorization automaticamente.
  // Se a resposta vier 401 (token expirado/inválido), desloga sozinho.
  const authFetch = useCallback(
    async (input: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers || {});
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const res = await fetch(input, { ...init, headers });
      if (res.status === 401) {
        logout();
      }
      return res;
    },
    [token, logout]
  );

  return (
    <AuthContext.Provider
      value={{ token, email, isAuthenticated: !!token, requestCode, verifyCode, logout, authFetch }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return ctx;
}
