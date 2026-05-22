import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useApolloClient, useLazyQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import { GET_CURRENT_USER } from '@tutorix/shared-graphql';
import { LOGIN } from '@tutorix/shared-graphql';
import {
  getAuthToken,
  getRefreshToken,
  removeAuthToken,
  setAuthTokens,
} from '@tutorix/shared-graphql/client/web/token-storage';

export type AdminUser = {
  id: number;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
};

type AdminAuthContextValue = {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

const LOGOUT_WITH_TOKEN = gql`
  mutation AdminLogout($refreshToken: String!) {
    logout(refreshToken: $refreshToken)
  }
`;

function isAdminRole(role: string | null | undefined): boolean {
  return role === 'ADMIN';
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const apolloClient = useApolloClient();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [fetchMe] = useLazyQuery(GET_CURRENT_USER, {
    fetchPolicy: 'network-only',
  });
  const [loginMutation] = useMutation(LOGIN);
  const [logoutMutation] = useMutation(LOGOUT_WITH_TOKEN);

  const clearSession = useCallback(async () => {
    await removeAuthToken();
    setUser(null);
    await apolloClient.clearStore();
  }, [apolloClient]);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        setUser(null);
        return;
      }
      const { data } = await fetchMe();
      const me = data?.me;
      if (!me || !isAdminRole(me.role)) {
        await clearSession();
        return;
      }
      setUser(me as AdminUser);
    } catch {
      await clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession, fetchMe]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await loginMutation({
        variables: {
          input: {
            loginId: email.trim(),
            password,
            platform: 'web',
          },
        },
      });

      const payload = data?.login;
      if (!payload?.accessToken) {
        throw new Error('Login failed. Please try again.');
      }

      await setAuthTokens(payload.accessToken, payload.refreshToken);

      if (!isAdminRole(payload.user?.role)) {
        await clearSession();
        throw new Error('Admin access only. This account cannot use the admin console.');
      }

      setUser(payload.user as AdminUser);
    },
    [clearSession, loginMutation],
  );

  const logout = useCallback(async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await logoutMutation({ variables: { refreshToken } });
      }
    } catch {
      // Clear local session even if server logout fails
    } finally {
      await clearSession();
    }
  }, [clearSession, logoutMutation]);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  );

  return (
    <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return ctx;
}
