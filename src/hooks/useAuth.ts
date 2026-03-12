import { useState, useEffect, useCallback, useRef } from 'react';

export interface AuthUser {
  email: string;
  name: string;
  picture?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const userRef = useRef<AuthUser | null>(null);

  const setUserAndRef = (u: AuthUser | null) => {
    userRef.current = u;
    setUser(u);
  };

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('office_auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/auth/me', { headers, credentials: 'include' });
      const data = await res.json();
      setUserAndRef(data || null);
    } catch {
      // network error — keep current state
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        if (event.data.token) {
          localStorage.setItem('office_auth_token', event.data.token);
        }
        checkAuth();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'office_auth_success' || e.key === 'office_auth_token') {
        checkAuth();
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);
    checkAuth();

    // Poll until logged in (uses ref to avoid recreating interval on user state changes)
    const interval = setInterval(() => {
      if (!userRef.current) checkAuth();
    }, 3000);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [checkAuth]);

  const login = async () => {
    try {
      const origin = window.location.origin;
      const res = await fetch(
        `/api/auth/google/url?origin=${encodeURIComponent(origin)}`,
        { credentials: 'include' }
      );
      const { url } = await res.json();
      window.open(url, 'google_oauth', 'width=600,height=700');
    } catch (err) {
      console.error('Login failed', err);
    }
  };

  const logout = async () => {
    const token = localStorage.getItem('office_auth_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    await fetch('/api/auth/logout', { method: 'POST', headers, credentials: 'include' });
    localStorage.removeItem('office_auth_token');
    setUserAndRef(null);
    window.location.search = '';
  };

  return { user, authLoading, login, logout };
}
