import { env } from '../../config/env';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { secureStorage } from '../storage/secureStorage';
import { ApiClientError } from './apiError';
import { notifyUnauthorized } from './apiEvents';
import type { ApiClientConfig, RequestOptions } from './apiTypes';

const NETWORK_ERROR_MESSAGE =
  'Unable to connect. Check your internet connection and try again.';

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';

  if (response.status === 204) {
    return undefined;
  }

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text || undefined;
}

function getErrorMessage(body: unknown, fallback: string): string {
  if (
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof body.message === 'string'
  ) {
    return body.message;
  }

  return fallback;
}

export class ApiClient {
  private readonly config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? this.config.timeoutMs,
    );

    try {
      const accessToken = await this.config.getAccessToken?.();
      const headers = new Headers({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...this.config.defaultHeaders,
        ...options.headers,
      });

      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }

      const response = await fetch(`${this.config.baseUrl}${path}`, {
        ...options,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        headers,
        method: options.method ?? 'GET',
        signal: controller.signal,
      });
      const body = await parseBody(response);

      if (!response.ok) {
        if (response.status === 401) {
          notifyUnauthorized();
        }

        const errorBody =
          typeof body === 'object' && body !== null ? body : undefined;
        throw new ApiClientError({
          message: getErrorMessage(body, `Request failed (${response.status}).`),
          code:
            errorBody && 'code' in errorBody && typeof errorBody.code === 'string'
              ? errorBody.code
              : undefined,
          fieldErrors:
            errorBody &&
            'fieldErrors' in errorBody &&
            typeof errorBody.fieldErrors === 'object'
              ? (errorBody.fieldErrors as Record<string, string>)
              : undefined,
          status: response.status,
        });
      }

      return body as T;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }

      const isTimeout =
        error instanceof Error && error.name === 'AbortError';
      throw new ApiClientError({
        code: isTimeout ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
        message: isTimeout
          ? 'The request timed out. Please try again.'
          : NETWORK_ERROR_MESSAGE,
      });
    } finally {
      clearTimeout(timeout);
    }
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

export const apiClient = new ApiClient({
  baseUrl: env.apiBaseUrl,
  timeoutMs: env.apiTimeoutMs,
  getAccessToken: () => secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
});
