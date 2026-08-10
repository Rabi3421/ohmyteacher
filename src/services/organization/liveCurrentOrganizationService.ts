import type {
  CurrentSchool,
  UpdateCurrentSchoolInput,
} from '../../models/currentOrganization';
import type { ApiResponse } from '../../models/common';
import { mapBackendSchool, parseSchoolResponse } from '../auth/authMapper';
import { apiClient, type ApiClient } from '../api/apiClient';
import { ApiClientError } from '../api/apiError';
import type {
  CurrentOrganizationService,
  OrganizationRequestOptions,
} from './currentOrganizationService';
import {
  mapCurrentSchoolUpdateRequest,
  mapOrganizationFieldErrors,
} from './organizationMapper';

type CurrentOrganizationApiClient = Pick<ApiClient, 'get' | 'patch'>;

function success<T>(data: T, message: string): ApiResponse<T> {
  return { data, message, success: true };
}

function remapError(error: unknown): never {
  if (!(error instanceof ApiClientError)) throw error;
  const fieldErrors = mapOrganizationFieldErrors(error.fieldErrors);
  throw new ApiClientError({
    code: error.code,
    details: error.details,
    fieldErrors,
    kind: error.kind,
    message: error.message,
    nonFieldErrors: error.nonFieldErrors,
    retryable: error.retryable,
    status: error.status,
  });
}

export class LiveCurrentOrganizationService
  implements CurrentOrganizationService
{
  constructor(private readonly client: CurrentOrganizationApiClient) {}

  async getCurrentSchool(
    options?: OrganizationRequestOptions,
  ): Promise<ApiResponse<CurrentSchool>> {
    const raw = await this.client.get<unknown>('/school/', {
      signal: options?.signal,
    });
    return success(
      mapBackendSchool(parseSchoolResponse(raw).school),
      'School loaded.',
    );
  }

  async updateCurrentSchool(
    input: UpdateCurrentSchoolInput,
  ): Promise<ApiResponse<CurrentSchool>> {
    try {
      const raw = await this.client.patch<unknown>(
        '/school/',
        mapCurrentSchoolUpdateRequest(input),
      );
      return success(
        mapBackendSchool(parseSchoolResponse(raw).school),
        'School updated.',
      );
    } catch (error) {
      remapError(error);
    }
  }
}

export const liveCurrentOrganizationService =
  new LiveCurrentOrganizationService(apiClient);
