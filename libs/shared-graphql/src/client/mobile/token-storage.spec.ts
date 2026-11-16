const mockKeychain = new Map<string, string>();
const mockAsyncStorage = new Map<string, string>();

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AfterFirstUnlockThisDeviceOnly' },
  getGenericPassword: jest.fn(async ({ service }: { service: string }) => {
    const password = mockKeychain.get(service);
    return password ? { username: 'access_token', password, service } : false;
  }),
  setGenericPassword: jest.fn(
    async (_username: string, password: string, { service }: { service: string }) => {
      mockKeychain.set(service, password);
      return { service, storage: 'mock' };
    },
  ),
  resetGenericPassword: jest.fn(async ({ service }: { service: string }) => {
    mockKeychain.delete(service);
    return true;
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockAsyncStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockAsyncStorage.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockAsyncStorage.delete(key);
    }),
  },
}));

import * as Keychain from 'react-native-keychain';
import {
  AUTH_TOKEN_KEYCHAIN_SERVICE,
  LEGACY_AUTH_TOKEN_STORAGE_KEY,
  getAuthToken,
  removeAuthToken,
  resetAuthTokenCacheForTests,
  setAuthToken,
} from './token-storage';

describe('mobile token storage', () => {
  beforeEach(() => {
    mockKeychain.clear();
    mockAsyncStorage.clear();
    resetAuthTokenCacheForTests();
    jest.clearAllMocks();
  });

  it('returns null when nothing is stored', async () => {
    expect(await getAuthToken()).toBeNull();
  });

  it('writes the token to the keychain, not AsyncStorage', async () => {
    await setAuthToken('jwt-1');
    expect(mockKeychain.get(AUTH_TOKEN_KEYCHAIN_SERVICE)).toBe('jwt-1');
    expect(mockAsyncStorage.size).toBe(0);
    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'access_token',
      'jwt-1',
      expect.objectContaining({
        service: AUTH_TOKEN_KEYCHAIN_SERVICE,
        accessible: 'AfterFirstUnlockThisDeviceOnly',
      }),
    );
  });

  it('reads the token back from the keychain after a restart', async () => {
    await setAuthToken('jwt-2');
    resetAuthTokenCacheForTests();
    expect(await getAuthToken()).toBe('jwt-2');
  });

  it('caches the token in memory after the first read', async () => {
    mockKeychain.set(AUTH_TOKEN_KEYCHAIN_SERVICE, 'jwt-3');
    await getAuthToken();
    await getAuthToken();
    expect(Keychain.getGenericPassword).toHaveBeenCalledTimes(1);
  });

  it('moves a legacy AsyncStorage token into the keychain', async () => {
    mockAsyncStorage.set(LEGACY_AUTH_TOKEN_STORAGE_KEY, 'legacy-jwt');
    expect(await getAuthToken()).toBe('legacy-jwt');
    expect(mockKeychain.get(AUTH_TOKEN_KEYCHAIN_SERVICE)).toBe('legacy-jwt');
    expect(mockAsyncStorage.has(LEGACY_AUTH_TOKEN_STORAGE_KEY)).toBe(false);
  });

  it('keeps the legacy token when the keychain write fails', async () => {
    mockAsyncStorage.set(LEGACY_AUTH_TOKEN_STORAGE_KEY, 'legacy-jwt');
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    (Keychain.setGenericPassword as jest.Mock).mockRejectedValueOnce(
      new Error('keystore unavailable'),
    );
    expect(await getAuthToken()).toBe('legacy-jwt');
    expect(mockAsyncStorage.get(LEGACY_AUTH_TOKEN_STORAGE_KEY)).toBe('legacy-jwt');
  });

  it('removes the token from the keychain and any legacy copy', async () => {
    await setAuthToken('jwt-4');
    mockAsyncStorage.set(LEGACY_AUTH_TOKEN_STORAGE_KEY, 'stale');
    await removeAuthToken();
    expect(await getAuthToken()).toBeNull();
    resetAuthTokenCacheForTests();
    expect(await getAuthToken()).toBeNull();
    expect(mockAsyncStorage.size).toBe(0);
  });
});
