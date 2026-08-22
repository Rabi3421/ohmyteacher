import type { EnvironmentName } from './env';

export const API_PREFIX = '/ohmyteacher/api/v0';
export const DEFAULT_API_TIMEOUT_MS = 15_000;

/** Origin of the deployed OhMyTeacher backend. */
export const DEPLOYED_API_ORIGIN = 'https://ohmyteacher.ebatuaa.com';

export type ApiPlatform = 'android' | 'ios';
export type ApiTarget =
  | 'auto'
  | 'local'
  | 'android-emulator'
  | 'ios-simulator'
  | 'physical-device'
  | 'remote'
  | 'test';

export interface ApiRuntimeConfig {
  target?: ApiTarget;
  physicalDeviceBaseUrl?: string;
  remoteBaseUrl?: string;
  testBaseUrl?: string;
  timeoutMs?: number;
  enableLogging?: boolean;
}

export interface CreateApiConfigurationInput extends ApiRuntimeConfig {
  environment: EnvironmentName;
  platform: ApiPlatform;
}

export interface ApiConfiguration {
  baseUrl: string;
  timeoutMs: number;
  target: Exclude<ApiTarget, 'auto' | 'local'>;
  enableLogging: boolean;
}

type RuntimeGlobal = typeof globalThis & {
  __OHMYTEACHER_API_CONFIG__?: ApiRuntimeConfig;
};

export function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error('API base URL must use http:// or https://.');
  }

  return trimmed.replace(/\/+$/, '');
}

function urlWithPrefix(origin: string): string {
  return normalizeBaseUrl(`${origin}${API_PREFIX}`);
}

export function getInjectedApiRuntimeConfig(): ApiRuntimeConfig {
  return (globalThis as RuntimeGlobal).__OHMYTEACHER_API_CONFIG__ ?? {};
}

export function createApiConfiguration({
  environment,
  platform,
  target = 'auto',
  physicalDeviceBaseUrl,
  remoteBaseUrl = urlWithPrefix(DEPLOYED_API_ORIGIN),
  testBaseUrl = urlWithPrefix('http://127.0.0.1:8000'),
  timeoutMs = DEFAULT_API_TIMEOUT_MS,
  enableLogging,
}: CreateApiConfigurationInput): ApiConfiguration {
  // `auto` points at the deployed backend. Local development against a
  // machine-hosted server uses the platform-aware `local` target.
  const platformLocalTarget: Exclude<ApiTarget, 'auto' | 'local'> =
    platform === 'android' ? 'android-emulator' : 'ios-simulator';
  const selectedTarget: Exclude<ApiTarget, 'auto' | 'local'> =
    target === 'auto'
      ? environment === 'test'
        ? 'test'
        : 'remote'
      : target === 'local'
        ? platformLocalTarget
        : target;

  const urls: Record<
    Exclude<ApiTarget, 'auto' | 'local'>,
    string | undefined
  > = {
    'android-emulator': urlWithPrefix('http://10.0.2.2:8000'),
    'ios-simulator': urlWithPrefix('http://127.0.0.1:8000'),
    'physical-device': physicalDeviceBaseUrl,
    remote: remoteBaseUrl,
    test: testBaseUrl,
  };
  const selectedUrl = urls[selectedTarget];
  if (!selectedUrl) {
    throw new Error(`API URL is required for target "${selectedTarget}".`);
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('API timeout must be a positive number.');
  }

  return {
    baseUrl: normalizeBaseUrl(selectedUrl),
    enableLogging: enableLogging ?? environment === 'development',
    target: selectedTarget,
    timeoutMs,
  };
}
