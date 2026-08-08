import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApolloClient } from '@apollo/client';
import { GET_REGISTRATION_SETTINGS } from '@tutorix/shared-graphql';
import { APP_VERSION } from '../config';
import {
  getRemoteConfigString,
  initializeRemoteConfig,
  refreshRemoteConfig,
} from '../../lib/remote-config';
import { isVersionLessThan } from '../../lib/semver';

const OPTIONAL_UPDATE_DISMISSED_KEY = 'tutorix.optional_update_dismissed_version';

const DEFAULT_REGISTRATION_FLAGS: RegistrationFlags = {
  tutorEnabled: true,
  studentEnabled: true,
  disabledMessage:
    'Registration for this role is temporarily unavailable. Please try again later.',
};

export type UpdateMode = 'none' | 'optional' | 'force';

export type UpdatePolicy = {
  mode: UpdateMode;
  installedVersion: string;
  minSupportedVersion: string;
  latestVersion: string;
  storeUrl: string;
  forceMessage: string;
  optionalMessage: string;
};

export type RegistrationFlags = {
  tutorEnabled: boolean;
  studentEnabled: boolean;
  disabledMessage: string;
};

type FeatureFlagsContextValue = {
  ready: boolean;
  updatePolicy: UpdatePolicy;
  registration: RegistrationFlags;
  dismissOptionalUpdate: () => Promise<void>;
  refresh: () => Promise<void>;
};

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

function readUpdatePolicy(dismissedLatest: string | null): UpdatePolicy {
  const minSupportedVersion = getRemoteConfigString('min_supported_version');
  const latestVersion = getRemoteConfigString('latest_version');
  const storeUrl =
    Platform.OS === 'ios'
      ? getRemoteConfigString('ios_store_url')
      : getRemoteConfigString('android_store_url');
  const forceMessage = getRemoteConfigString('force_update_message');
  const optionalMessage = getRemoteConfigString('optional_update_message');

  let mode: UpdateMode = 'none';
  if (isVersionLessThan(APP_VERSION, minSupportedVersion)) {
    mode = 'force';
  } else if (
    isVersionLessThan(APP_VERSION, latestVersion) &&
    dismissedLatest !== latestVersion
  ) {
    mode = 'optional';
  }

  return {
    mode,
    installedVersion: APP_VERSION,
    minSupportedVersion,
    latestVersion,
    storeUrl,
    forceMessage,
    optionalMessage,
  };
}

type RegistrationSettingsQueryData = {
  registrationSettings: {
    tutorRegistrationEnabled: boolean;
    studentRegistrationEnabled: boolean;
    disabledMessage: string;
  };
};

export const FeatureFlagsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const apolloClient = useApolloClient();
  const [ready, setReady] = useState(false);
  const [dismissedLatest, setDismissedLatest] = useState<string | null>(null);
  const [updatePolicy, setUpdatePolicy] = useState<UpdatePolicy>(() =>
    readUpdatePolicy(null),
  );
  const [registration, setRegistration] = useState<RegistrationFlags>(
    DEFAULT_REGISTRATION_FLAGS,
  );

  const fetchRegistrationFlags = useCallback(async (): Promise<RegistrationFlags> => {
    try {
      const { data } = await apolloClient.query<RegistrationSettingsQueryData>({
        query: GET_REGISTRATION_SETTINGS,
        fetchPolicy: 'network-only',
      });
      const settings = data?.registrationSettings;
      if (!settings) {
        return DEFAULT_REGISTRATION_FLAGS;
      }
      return {
        tutorEnabled: settings.tutorRegistrationEnabled,
        studentEnabled: settings.studentRegistrationEnabled,
        disabledMessage:
          settings.disabledMessage?.trim() ||
          DEFAULT_REGISTRATION_FLAGS.disabledMessage,
      };
    } catch (error) {
      console.warn(
        '[feature-flags] registrationSettings query failed; fail-open defaults',
        error,
      );
      return DEFAULT_REGISTRATION_FLAGS;
    }
  }, [apolloClient]);

  const syncAll = useCallback(
    async (dismissed: string | null) => {
      setUpdatePolicy(readUpdatePolicy(dismissed));
      const flags = await fetchRegistrationFlags();
      setRegistration(flags);
    },
    [fetchRegistrationFlags],
  );

  const refresh = useCallback(async () => {
    await refreshRemoteConfig();
    await syncAll(dismissedLatest);
  }, [dismissedLatest, syncAll]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(OPTIONAL_UPDATE_DISMISSED_KEY);
        if (!cancelled) {
          setDismissedLatest(stored);
        }
        await initializeRemoteConfig();
        if (!cancelled) {
          await syncAll(stored);
          setReady(true);
        }
      } catch (error) {
        console.warn('[feature-flags] init failed; using defaults', error);
        if (!cancelled) {
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [syncAll]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active' && ready) {
        void refresh();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [ready, refresh]);

  const dismissOptionalUpdate = useCallback(async () => {
    const latest = getRemoteConfigString('latest_version');
    await AsyncStorage.setItem(OPTIONAL_UPDATE_DISMISSED_KEY, latest);
    setDismissedLatest(latest);
    setUpdatePolicy(readUpdatePolicy(latest));
  }, []);

  const value = useMemo<FeatureFlagsContextValue>(
    () => ({
      ready,
      updatePolicy,
      registration,
      dismissOptionalUpdate,
      refresh,
    }),
    [ready, updatePolicy, registration, dismissOptionalUpdate, refresh],
  );

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

function useFeatureFlags(): FeatureFlagsContextValue {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) {
    throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  }
  return ctx;
}

export function useUpdatePolicy(): UpdatePolicy & {
  ready: boolean;
  dismissOptionalUpdate: () => Promise<void>;
} {
  const { ready, updatePolicy, dismissOptionalUpdate } = useFeatureFlags();
  return { ...updatePolicy, ready, dismissOptionalUpdate };
}

export function useRegistrationFlags(): RegistrationFlags & { ready: boolean } {
  const { ready, registration } = useFeatureFlags();
  return { ...registration, ready };
}
