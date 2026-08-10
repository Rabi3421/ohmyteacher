import type { ApiResponse } from '../../models/common';
import type {
  CreatePlatformSchoolInput,
  CreatePlatformSchoolResult,
  PlatformDashboard,
  PlatformSchool,
  PlatformSchoolCollection,
  PlatformSchoolStatus,
  UpdatePlatformSchoolInput,
} from '../../models/platform';
import { apiClient, type ApiClient } from '../api/apiClient';
import { ApiClientError } from '../api/apiError';
import {
  mapCreatePlatformSchoolRequest,
  mapPlatformFieldErrors,
  mapPlatformSchoolStatusRequest,
  mapUpdatePlatformSchoolRequest,
  parseCreatePlatformSchool,
  parsePlatformDashboard,
  parsePlatformSchool,
  parsePlatformSchoolList,
} from './platformMapper';
import type {
  PlatformRequestOptions,
  PlatformService,
} from './platformService';

type PlatformApiClient = Pick<ApiClient, 'get' | 'patch' | 'post'>;

function success<T>(data: T, message: string): ApiResponse<T> {
  return { data, message, success: true };
}

function validSchoolId(schoolId: string): string {
  if (!/^[1-9]\d*$/.test(schoolId)) {
    throw new ApiClientError({
      code: 'INVALID_SCHOOL_ID',
      kind: 'validation',
      message: 'This school reference is invalid.',
      status: 400,
    });
  }
  return schoolId;
}

function remapPlatformError(error: unknown, fallbackField?: string): never {
  if (!(error instanceof ApiClientError)) throw error;
  const mapped = mapPlatformFieldErrors(error.fieldErrors) ?? {};
  if (
    fallbackField &&
    Object.keys(mapped).length === 0 &&
    error.kind === 'validation'
  ) {
    mapped[fallbackField] = error.message;
  }
  throw new ApiClientError({
    code: error.code,
    details: error.details,
    fieldErrors: Object.keys(mapped).length > 0 ? mapped : undefined,
    kind: error.kind,
    message: error.message,
    nonFieldErrors: error.nonFieldErrors,
    retryable: error.retryable,
    status: error.status,
  });
}

export class LivePlatformService implements PlatformService {
  constructor(private readonly client: PlatformApiClient) {}

  async getPlatformDashboard(
    options?: PlatformRequestOptions,
  ): Promise<ApiResponse<PlatformDashboard>> {
    const raw = await this.client.get<unknown>('/platform/dashboard/', {
      signal: options?.signal,
    });
    return success(parsePlatformDashboard(raw), 'Dashboard loaded.');
  }

  async listSchools(
    options?: PlatformRequestOptions,
  ): Promise<ApiResponse<PlatformSchoolCollection>> {
    const raw = await this.client.get<unknown>('/schools/', {
      signal: options?.signal,
    });
    return success(parsePlatformSchoolList(raw), 'Schools loaded.');
  }

  async getSchool(
    schoolId: string,
    options?: PlatformRequestOptions,
  ): Promise<ApiResponse<PlatformSchool>> {
    const id = validSchoolId(schoolId);
    const raw = await this.client.get<unknown>(`/schools/${id}/`, {
      signal: options?.signal,
    });
    return success(parsePlatformSchool(raw), 'School loaded.');
  }

  async createSchool(
    input: CreatePlatformSchoolInput,
  ): Promise<ApiResponse<CreatePlatformSchoolResult>> {
    try {
      const raw = await this.client.post<unknown>(
        '/schools/',
        mapCreatePlatformSchoolRequest(input),
      );
      return success(
        parseCreatePlatformSchool(raw),
        'School and initial Admin created.',
      );
    } catch (error) {
      remapPlatformError(
        error,
        error instanceof ApiClientError && error.code === 'USER_EXISTS'
          ? 'adminMobile'
          : undefined,
      );
    }
  }

  async updateSchool(
    schoolId: string,
    input: UpdatePlatformSchoolInput,
  ): Promise<ApiResponse<PlatformSchool>> {
    try {
      const id = validSchoolId(schoolId);
      const raw = await this.client.patch<unknown>(
        `/schools/${id}/`,
        mapUpdatePlatformSchoolRequest(input),
      );
      return success(parsePlatformSchool(raw), 'School updated.');
    } catch (error) {
      remapPlatformError(error);
    }
  }

  async setSchoolStatus(
    schoolId: string,
    status: PlatformSchoolStatus,
  ): Promise<ApiResponse<PlatformSchool>> {
    const id = validSchoolId(schoolId);
    const raw = await this.client.patch<unknown>(
      `/schools/${id}/status/`,
      mapPlatformSchoolStatusRequest(status),
    );
    return success(
      parsePlatformSchool(raw),
      status === 'ACTIVE' ? 'School reinstated.' : 'School suspended.',
    );
  }
}

export const livePlatformService = new LivePlatformService(apiClient);
