import { STORAGE_KEYS } from '../../constants/storageKeys';
import type { AuthTokens } from '../../models/auth';
import {
  secureStorage,
  type SecureStorage,
} from '../storage/secureStorage';

export interface StoredAuthSession {
  tokens: AuthTokens;
  activeMembershipId: string | null;
}

export interface AuthSessionStorage {
  read(): Promise<StoredAuthSession | null>;
  saveTokens(tokens: AuthTokens): Promise<void>;
  saveActiveMembershipId(id: string | null): Promise<void>;
  clear(): Promise<void>;
}

export function createAuthSessionStorage(
  storage: SecureStorage,
): AuthSessionStorage {
  return {
    async read() {
      const [accessToken, refreshToken, expiresAt, activeMembershipId] =
        await Promise.all([
          storage.getItem(STORAGE_KEYS.AUTH_TOKEN),
          storage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
          storage.getItem(STORAGE_KEYS.AUTH_TOKEN_EXPIRES_AT),
          storage.getItem(STORAGE_KEYS.ACTIVE_MEMBERSHIP_ID),
        ]);

      if (!accessToken || !refreshToken || !expiresAt) {
        return null;
      }

      return {
        activeMembershipId,
        tokens: { accessToken, expiresAt, refreshToken },
      };
    },

    async saveTokens(tokens) {
      const results = await Promise.allSettled([
        storage.setItem(STORAGE_KEYS.AUTH_TOKEN, tokens.accessToken),
        storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
        storage.setItem(
          STORAGE_KEYS.AUTH_TOKEN_EXPIRES_AT,
          tokens.expiresAt,
        ),
      ]);
      const failed = results.find(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected',
      );
      if (failed) {
        await Promise.allSettled([
          storage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
          storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
          storage.removeItem(STORAGE_KEYS.AUTH_TOKEN_EXPIRES_AT),
        ]);
        throw failed.reason;
      }
    },

    async saveActiveMembershipId(id) {
      if (id) {
        await storage.setItem(STORAGE_KEYS.ACTIVE_MEMBERSHIP_ID, id);
      } else {
        await storage.removeItem(STORAGE_KEYS.ACTIVE_MEMBERSHIP_ID);
      }
    },

    async clear() {
      await Promise.all([
        storage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
        storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
        storage.removeItem(STORAGE_KEYS.AUTH_TOKEN_EXPIRES_AT),
        storage.removeItem(STORAGE_KEYS.ACTIVE_MEMBERSHIP_ID),
      ]);
    },
  };
}

export const authSessionStorage = createAuthSessionStorage(secureStorage);
