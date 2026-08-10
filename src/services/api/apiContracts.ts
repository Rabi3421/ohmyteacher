export interface BackendSuccessEnvelope {
  success: true;
  message?: string;
}

export interface BackendDataEnvelope<T> extends BackendSuccessEnvelope {
  data: T;
}

export type BackendEntityEnvelope<TKey extends string, T> =
  BackendSuccessEnvelope & Record<TKey, T>;

export interface BackendErrorDto {
  success?: false;
  message?: string;
  detail?: string;
  error_code?: string;
  code?: string;
  errors?: Record<string, string | string[] | Record<string, unknown>>;
  non_field_errors?: string[];
}

export interface BackendRefreshTokenDto extends BackendSuccessEnvelope {
  access: string;
  refresh?: string | null;
}

export interface BackendUserDto {
  id: number;
  phone_number: string;
  name: string;
  role: 'super_admin' | 'admin' | 'branch_admin' | 'teacher' | 'student';
  school: number | null;
  branch: number | null;
  is_active: boolean;
  date_joined: string;
}

export interface BackendPaginatedDto<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
