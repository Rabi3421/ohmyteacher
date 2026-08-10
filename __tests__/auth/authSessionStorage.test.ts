import { STORAGE_KEYS } from '../../src/constants/storageKeys';
import { createAuthSessionStorage } from '../../src/services/auth/authSessionStorage';
import type { SecureStorage } from '../../src/services/storage/secureStorage';

function setupStorage() {
  const values = new Map<string, string>();
  const storage: SecureStorage = {
    clear: jest.fn(async () => values.clear()),
    getItem: jest.fn(async key => values.get(key) ?? null),
    removeItem: jest.fn(async key => {
      values.delete(key);
    }),
    setItem: jest.fn(async (key, value) => {
      values.set(key, value);
    }),
  };
  return { authStorage: createAuthSessionStorage(storage), storage, values };
}

const tokens = {
  accessToken: 'access-token',
  expiresAt: '2099-01-01T00:00:00Z',
  refreshToken: 'refresh-token',
};

describe('auth session secure storage', () => {
  it('persists and restores both tokens through the storage abstraction', async () => {
    const { authStorage } = setupStorage();
    await authStorage.saveTokens(tokens);
    expect(await authStorage.read()).toEqual({
      activeMembershipId: null,
      tokens,
    });
  });

  it('does not return a partial credential set', async () => {
    const { authStorage, values } = setupStorage();
    values.set(STORAGE_KEYS.AUTH_TOKEN, 'access-only');
    expect(await authStorage.read()).toBeNull();
  });

  it('cleans every token key after a partial persistence failure', async () => {
    const { authStorage, storage, values } = setupStorage();
    const setItem = storage.setItem as jest.MockedFunction<
      SecureStorage['setItem']
    >;
    setItem.mockImplementation(async (key, value) => {
      if (key === STORAGE_KEYS.REFRESH_TOKEN) throw new Error('Keychain failed');
      values.set(key, value);
    });

    await expect(authStorage.saveTokens(tokens)).rejects.toThrow(
      'Keychain failed',
    );
    expect(values.has(STORAGE_KEYS.AUTH_TOKEN)).toBe(false);
    expect(values.has(STORAGE_KEYS.REFRESH_TOKEN)).toBe(false);
    expect(values.has(STORAGE_KEYS.AUTH_TOKEN_EXPIRES_AT)).toBe(false);
  });

  it('stores and clears the active membership independently', async () => {
    const { authStorage, values } = setupStorage();
    await authStorage.saveActiveMembershipId('membership-1');
    expect(values.get(STORAGE_KEYS.ACTIVE_MEMBERSHIP_ID)).toBe('membership-1');
    await authStorage.saveActiveMembershipId(null);
    expect(values.has(STORAGE_KEYS.ACTIVE_MEMBERSHIP_ID)).toBe(false);
  });
});
