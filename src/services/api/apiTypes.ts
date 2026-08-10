export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ApiAuthentication = 'required' | 'none';
export type ApiResponseType = 'auto' | 'json' | 'text' | 'blob';
export type QueryPrimitive = string | number | boolean;
export type QueryValue =
  | QueryPrimitive
  | null
  | undefined
  | readonly QueryPrimitive[];
export type ApiQueryParams = Readonly<Record<string, QueryValue>>;

export interface RequestOptions
  extends Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'> {
  auth?: ApiAuthentication;
  body?: unknown;
  headers?: RequestInit['headers'];
  method?: HttpMethod;
  query?: ApiQueryParams;
  responseType?: ApiResponseType;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface RefreshedTokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface ApiTokenStore {
  clearTokens(): Promise<void>;
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  saveTokens(tokens: RefreshedTokenPair): Promise<void>;
}

export interface ApiLogEntry {
  data?: unknown;
  event: 'request' | 'response' | 'error' | 'refresh';
  message: string;
}

export type ApiLogger = (entry: ApiLogEntry) => void;

export interface ApiClientConfig {
  baseUrl: string;
  defaultHeaders?: RequestInit['headers'];
  fetchImpl?: typeof fetch;
  logger?: ApiLogger;
  onSessionExpired?: () => void | Promise<void>;
  refreshPath?: string;
  timeoutMs: number;
  tokenStore?: ApiTokenStore;
}

export interface BackendPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PageMetadata {
  count: number;
  next: string | null;
  previous: string | null;
}

export interface FileApiResponse {
  blob: Blob;
  contentDisposition: string | null;
  contentType: string | null;
}
