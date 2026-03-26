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
      if (data?.needsProfileFetch && !sessionStorage.getItem('profileFetchAttempted')) {
        sessionStorage.setItem('profileFetchAttempted', '1');
        window.location.href = `/api/auth/fetch-profile?return=${encodeURIComponent(window.location.href)}`;
        return;
      }

      setUser(data || null);
    } catch {
      // network error — keep current state
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    // Clear IAP session cookie
    window.location.href = '/_gcp_iap/clear_login_cookie';
  };

  // Auth is handled by IAP — login is a no-op
  const login = () => {};

  return { user, authLoading, login, logout };
}
