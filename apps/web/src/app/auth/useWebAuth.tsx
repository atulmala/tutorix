import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useApolloClient, useLazyQuery } from '@apollo/client';
import { GET_CURRENT_USER } from '@tutorix/shared-graphql';
import {
  getAuthToken,
  removeAuthToken,
} from '@tutorix/shared-graphql/client/web/token-storage';
import type { WebUser } from '../types/web-user';

export type { WebUser };

type WebAuthContextValue = {
  user: WebUser | null;
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<WebUser | null>>;
  refreshUser: () => Promise<WebUser | null>;
  logout: () => Promise<void>;
  clearSession: () => Promise<void>;
};

const WebAuthContext = createContext<WebAuthContextValue | null>(null);

function isWebRole(role: string | null | undefined): boolean {
  const normalized = role != null ? String(role).toUpperCase() : '';
  return normalized === 'TUTOR' || normalized === 'STUDENT';
}

export function WebAuthProvider({ children }: { children: React.ReactNode }) {
  const apolloClient = useApolloClient();
  const [user, setUser] = useState<WebUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [fetchMe] = useLazyQuery(GET_CURRENT_USER, {
    fetchPolicy: 'network-only',
  });

  const clearSession = useCallback(async () => {
    await removeAuthToken();
    setUser(null);
    await apolloClient.clearStore();
  }, [apolloClient]);

  const refreshUser = useCallback(async (): Promise<WebUser | null> => {
    const token = await getAuthToken();
    if (!token) {
      setUser(null);
      return null;
    }
    const { data } = await fetchMe();
    const me = data?.me;
    if (!me || !isWebRole(me.role)) {
      await clearSession();
      return null;
    }
    const nextUser = me as WebUser;
    setUser(nextUser);
    return nextUser;
  }, [clearSession, fetchMe]);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        setUser(null);
        return;
      }
      await refreshUser();
    } catch {
      await clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession, refreshUser]);

  useEffect(() => {
    void bootstrap();
    // Session restore runs once on initial mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, loading, setUser, refreshUser, logout, clearSession }),
    [user, loading, refreshUser, logout, clearSession],
  );

  return (
    <WebAuthContext.Provider value={value}>{children}</WebAuthContext.Provider>
  );
}

export function useWebAuth(): WebAuthContextValue {
  const ctx = useContext(WebAuthContext);
  if (!ctx) {
    throw new Error('useWebAuth must be used within WebAuthProvider');
  }
  return ctx;
}
