export type ApiErrorKind =
  | 'validation'
  | 'authentication'
  | 'permission'
  | 'not-found'
  | 'conflict'
  | 'server'
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'unsupported'
  | 'unknown';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  kind?: ApiErrorKind;
  fieldErrors?: Record<string, string>;
  nonFieldErrors?: string[];
  retryable?: boolean;
  details?: unknown;
}

export class ApiClientError extends Error implements ApiError {
  code?: string;
  status?: number;
  kind?: ApiErrorKind;
  fieldErrors?: Record<string, string>;
  nonFieldErrors?: string[];
  retryable?: boolean;
  details?: unknown;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.status = error.status;
    this.kind = error.kind;
    this.fieldErrors = error.fieldErrors;
    this.nonFieldErrors = error.nonFieldErrors;
    this.retryable = error.retryable;
    this.details = error.details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function messagesFrom(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(messagesFrom);
  }
  if (isRecord(value)) {
    return Object.values(value).flatMap(messagesFrom);
  }
  return [];
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 422) return 'validation';
  if (status === 401) return 'authentication';
  if (status === 403) return 'permission';
  if (status === 404) return 'not-found';
  if (status === 409) return 'conflict';
  if (status >= 500) return 'server';
  return 'unknown';
}

export function normalizeApiError(
  status: number,
  body: unknown,
): ApiClientError {
  const record = isRecord(body) ? body : undefined;
  const errors = record && isRecord(record.errors) ? record.errors : undefined;
  const fieldErrors: Record<string, string> = {};
  const nonFieldErrors: string[] = [];

  if (errors) {
    Object.entries(errors).forEach(([field, value]) => {
      const messages = messagesFrom(value);
      if (field === 'non_field_errors' || field === 'detail') {
        nonFieldErrors.push(...messages);
      } else if (messages.length > 0) {
        fieldErrors[field] = messages.join(' ');
      }
    });
  }

  nonFieldErrors.push(...messagesFrom(record?.non_field_errors));
  const message =
    (typeof record?.message === 'string' && record.message) ||
    (typeof record?.detail === 'string' && record.detail) ||
    nonFieldErrors[0] ||
    Object.values(fieldErrors)[0] ||
    `Request failed (${status}).`;

  return new ApiClientError({
    code:
      typeof record?.error_code === 'string'
        ? record.error_code
        : typeof record?.code === 'string'
          ? record.code
          : undefined,
    details: body,
    fieldErrors:
      Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
    kind: kindForStatus(status),
    message,
    nonFieldErrors:
      nonFieldErrors.length > 0 ? nonFieldErrors : undefined,
    retryable: status === 408 || status === 429 || status >= 500,
    status,
  });
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

export function createUnsupportedOperationError(
  moduleName: string,
  operation = 'operation',
): ApiClientError {
  return new ApiClientError({
    code: 'BACKEND_OPERATION_UNSUPPORTED',
    kind: 'unsupported',
    message: `${moduleName} ${operation} is not supported by the configured backend.`,
    retryable: false,
  });
}
