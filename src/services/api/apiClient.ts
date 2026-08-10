import { env } from '../../config/env';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { authSessionStorage } from '../auth/authSessionStorage';
import { secureStorage } from '../storage/secureStorage';
import { ApiClientError, normalizeApiError } from './apiError';
import { notifyUnauthorized } from './apiEvents';
import { createDevelopmentApiLogger, redactSensitiveData } from './apiLogger';
import type {
  ApiClientConfig,
  ApiQueryParams,
  ApiResponseType,
  RefreshedTokenPair,
  RequestOptions,
} from './apiTypes';

const NETWORK_ERROR_MESSAGE =
  'Unable to connect. Check your internet connection and try again.';

interface FetchResult {
  body: unknown;
  response: Response;
}

interface RefreshResponse {
  access?: unknown;
  refresh?: unknown;
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function serializeQuery(query?: ApiQueryParams): string {
  if (!query) return '';

  const pairs: string[] = [];
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const values = Array.isArray(value) ? value : [value];
    values.forEach(item => {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
    });
  });
  return pairs.join('&');
}

function requestUrl(
  baseUrl: string,
  path: string,
  query?: ApiQueryParams,
): string {
  const url = joinUrl(baseUrl, path);
  const serialized = serializeQuery(query);
  if (!serialized) return url;
  return `${url}${url.includes('?') ? '&' : '?'}${serialized}`;
}

async function parseBody(
  response: Response,
  responseType: ApiResponseType,
): Promise<unknown> {
  if (response.status === 204) return undefined;
  if (responseType === 'blob') return response.blob();
  if (responseType === 'text') return response.text();

  const contentType = response.headers.get('content-type') ?? '';
  if (responseType === 'json' || contentType.includes('application/json')) {
    const text = await response.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new ApiClientError({
        code: 'INVALID_JSON_RESPONSE',
        kind: 'server',
        message: 'The server returned an invalid JSON response.',
        status: response.status,
      });
    }
  }

  const text = await response.text();
  return text || undefined;
}

export class ApiClient {
  private readonly config: ApiClientConfig;
  private readonly fetchImpl: typeof fetch;
  private refreshPromise: Promise<RefreshedTokenPair> | null = null;
  private sessionExpiredNotified = false;

  constructor(config: ApiClientConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl.replace(/\/+$/, ''),
      refreshPath: config.refreshPath ?? '/auth/refresh/',
    };
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  private log(
    event: 'request' | 'response' | 'error' | 'refresh',
    message: string,
    data?: unknown,
  ): void {
    this.config.logger?.({ data: redactSensitiveData(data), event, message });
  }

  private async expireSession(): Promise<void> {
    if (this.sessionExpiredNotified) return;
    this.sessionExpiredNotified = true;
    try {
      await this.config.tokenStore?.clearTokens();
    } finally {
      await this.config.onSessionExpired?.();
    }
  }

  private async fetchOnce(
    path: string,
    options: RequestOptions,
    accessToken: string | null,
  ): Promise<FetchResult> {
    const {
      auth = 'required',
      body,
      headers: optionHeaders,
      query,
      responseType = 'auto',
      signal: externalSignal,
      timeoutMs,
      ...requestInit
    } = options;
    const controller = new AbortController();
    let timedOut = false;
    const abortFromCaller = () => controller.abort();
    externalSignal?.addEventListener('abort', abortFromCaller);
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs ?? this.config.timeoutMs);
    const headers = new Headers(this.config.defaultHeaders);
    new Headers(optionHeaders).forEach((value, key) => headers.set(key, value));
    headers.set('Accept', 'application/json');

    let serializedBody: RequestInit['body'];
    if (body !== undefined) {
      if (isFormData(body)) {
        serializedBody = body;
        headers.delete('Content-Type');
      } else {
        serializedBody = JSON.stringify(body);
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }
      }
    }
    if (auth === 'required' && accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const url = requestUrl(this.config.baseUrl, path, query);
    this.log('request', `${requestInit.method ?? 'GET'} ${url}`, {
      body,
      headers,
    });

    try {
      const response = await this.fetchImpl(url, {
        ...requestInit,
        body: serializedBody,
        headers,
        signal: controller.signal,
      });
      const parsedBody = await parseBody(response, responseType);
      this.log('response', `${response.status} ${requestInit.method ?? 'GET'} ${url}`, {
        body: parsedBody,
      });
      return { body: parsedBody, response };
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      const aborted = error instanceof Error && error.name === 'AbortError';
      const normalized = new ApiClientError({
        code: timedOut
          ? 'REQUEST_TIMEOUT'
          : aborted
            ? 'REQUEST_CANCELLED'
            : 'NETWORK_ERROR',
        kind: timedOut ? 'timeout' : aborted ? 'cancelled' : 'network',
        message: timedOut
          ? 'The request timed out. Please try again.'
          : aborted
            ? 'The request was cancelled.'
            : NETWORK_ERROR_MESSAGE,
        retryable: timedOut || !aborted,
      });
      this.log('error', normalized.message, normalized);
      throw normalized;
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener('abort', abortFromCaller);
    }
  }

  private refreshTokens(): Promise<RefreshedTokenPair> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.performRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private async performRefresh(): Promise<RefreshedTokenPair> {
    const tokenStore = this.config.tokenStore;
    if (!tokenStore) {
      throw new ApiClientError({
        code: 'SESSION_EXPIRED',
        kind: 'authentication',
        message: 'Your session has expired. Please sign in again.',
        status: 401,
      });
    }
    const refreshToken = await tokenStore.getRefreshToken();
    if (!refreshToken) {
      throw new ApiClientError({
        code: 'SESSION_EXPIRED',
        kind: 'authentication',
        message: 'Your session has expired. Please sign in again.',
        status: 401,
      });
    }

    this.log('refresh', 'Refreshing access token.');
    const result = await this.fetchOnce(
      this.config.refreshPath ?? '/auth/refresh/',
      {
        auth: 'none',
        body: { refresh: refreshToken },
        method: 'POST',
        responseType: 'json',
      },
      null,
    );
    if (!result.response.ok) {
      throw normalizeApiError(result.response.status, result.body);
    }
    const body = result.body as RefreshResponse;
    if (typeof body?.access !== 'string' || body.access.length === 0) {
      throw new ApiClientError({
        code: 'INVALID_REFRESH_RESPONSE',
        kind: 'authentication',
        message: 'Your session could not be refreshed. Please sign in again.',
        status: 401,
      });
    }
    const tokens = {
      accessToken: body.access,
      refreshToken:
        typeof body.refresh === 'string' && body.refresh.length > 0
          ? body.refresh
          : refreshToken,
    };
    await tokenStore.saveTokens(tokens);
    this.sessionExpiredNotified = false;
    return tokens;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const auth = options.auth ?? 'required';
    const tokenStore = this.config.tokenStore;
    let accessToken =
      auth === 'required' ? await tokenStore?.getAccessToken() ?? null : null;
    let result = await this.fetchOnce(path, options, accessToken);

    if (result.response.status === 401 && auth === 'required') {
      try {
        const latestAccessToken = await tokenStore?.getAccessToken();
        if (latestAccessToken && latestAccessToken !== accessToken) {
          accessToken = latestAccessToken;
        } else {
          accessToken = (await this.refreshTokens()).accessToken;
        }
        result = await this.fetchOnce(path, options, accessToken);
      } catch (error) {
        await this.expireSession();
        if (error instanceof ApiClientError && error.kind === 'cancelled') {
          throw error;
        }
        throw new ApiClientError({
          code: 'SESSION_EXPIRED',
          details: error,
          kind: 'authentication',
          message: 'Your session has expired. Please sign in again.',
          status: 401,
        });
      }
    }

    if (!result.response.ok) {
      if (result.response.status === 401 && auth === 'required') {
        await this.expireSession();
      }
      throw normalizeApiError(result.response.status, result.body);
    }

    this.sessionExpiredNotified = false;
    return result.body as T;
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, body, method: 'POST' });
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, body, method: 'PUT' });
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, body, method: 'PATCH' });
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

function accessTokenExpiry(): string {
  // This is a local refresh hint only; a 401 remains authoritative and invokes
  // the coordinated refresh flow. Phase 16 can read JWT `exp` in its auth mapper.
  return new Date(Date.now() + 15 * 60 * 1_000).toISOString();
}

export const apiClient = new ApiClient({
  baseUrl: env.apiBaseUrl,
  logger: createDevelopmentApiLogger(env.enableApiLogging),
  onSessionExpired: notifyUnauthorized,
  timeoutMs: env.apiTimeoutMs,
  tokenStore: {
    clearTokens: () => authSessionStorage.clear(),
    getAccessToken: () => secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
    getRefreshToken: () => secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
    saveTokens: tokens =>
      authSessionStorage.saveTokens({
        accessToken: tokens.accessToken,
        expiresAt: accessTokenExpiry(),
        refreshToken: tokens.refreshToken,
      }),
  },
});
