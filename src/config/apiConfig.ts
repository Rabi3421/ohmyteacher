import type { EnvironmentName } from './env';

export const API_PREFIX = '/ohmyteacher/api/v0';
export const DEFAULT_API_TIMEOUT_MS = 15_000;

export type ApiPlatform = 'android' | 'ios';
export type ApiTarget =
  | 'auto'
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
  target: Exclude<ApiTarget, 'auto'>;
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
  remoteBaseUrl,
  testBaseUrl = urlWithPrefix('http://127.0.0.1:8000'),
  timeoutMs = DEFAULT_API_TIMEOUT_MS,
  enableLogging,
}: CreateApiConfigurationInput): ApiConfiguration {
  const selectedTarget: Exclude<ApiTarget, 'auto'> =
    target === 'auto'
      ? environment === 'test'
        ? 'test'
        : platform === 'android'
          ? 'android-emulator'
          : 'ios-simulator'
      : target;

  const urls: Record<Exclude<ApiTarget, 'auto'>, string | undefined> = {
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
