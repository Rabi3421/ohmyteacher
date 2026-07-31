export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  body?: unknown;
  method?: HttpMethod;
  timeoutMs?: number;
}

export interface ApiClientConfig {
  baseUrl: string;
  timeoutMs: number;
  defaultHeaders?: Record<string, string>;
  getAccessToken?: () => Promise<string | null>;
}
