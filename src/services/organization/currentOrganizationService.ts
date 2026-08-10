import type {
  CurrentSchool,
  UpdateCurrentSchoolInput,
} from '../../models/currentOrganization';
import type { ApiResponse } from '../../models/common';

export interface OrganizationRequestOptions {
  signal?: AbortSignal;
}

export interface CurrentOrganizationService {
  getCurrentSchool(
    options?: OrganizationRequestOptions,
  ): Promise<ApiResponse<CurrentSchool>>;
  updateCurrentSchool(
    input: UpdateCurrentSchoolInput,
  ): Promise<ApiResponse<CurrentSchool>>;
}
