export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  fieldErrors?: Record<string, string>;
}

export class ApiClientError extends Error implements ApiError {
  code?: string;
  status?: number;
  fieldErrors?: Record<string, string>;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.status = error.status;
    this.fieldErrors = error.fieldErrors;
  }
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}
