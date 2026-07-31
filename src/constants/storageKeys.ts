export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  AUTH_TOKEN_EXPIRES_AT: 'auth_token_expires_at',
  ACTIVE_MEMBERSHIP_ID: 'active_membership_id',
  THEME_MODE: 'theme_mode',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
