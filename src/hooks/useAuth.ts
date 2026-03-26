import { useState, useEffect, useCallback } from 'react';

export interface AuthUser {
  email: string;
  name: string;
  picture?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      if (data?.email) {
        console.log('[auth] authenticated as', data.email);
      } else {
        console.log('[auth] not authenticated');
      }
      setUser(data || null);
    } catch (err) {
      console.error('[auth] /api/auth/me fetch failed:', err);
      // network error — keep current state
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    console.log('[auth] logging out');
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    // Clear IAP session cookie
    window.location.href = '/_gcp_iap/clear_login_cookie';
  };

  return { user, authLoading, logout };
}
