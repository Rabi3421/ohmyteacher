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

export interface PlatformRequestOptions {
  signal?: AbortSignal;
}

export interface PlatformService {
  getPlatformDashboard(
    options?: PlatformRequestOptions,
  ): Promise<ApiResponse<PlatformDashboard>>;
  listSchools(
    options?: PlatformRequestOptions,
  ): Promise<ApiResponse<PlatformSchoolCollection>>;
  getSchool(
    schoolId: string,
    options?: PlatformRequestOptions,
  ): Promise<ApiResponse<PlatformSchool>>;
  createSchool(
    input: CreatePlatformSchoolInput,
  ): Promise<ApiResponse<CreatePlatformSchoolResult>>;
  updateSchool(
    schoolId: string,
    input: UpdatePlatformSchoolInput,
  ): Promise<ApiResponse<PlatformSchool>>;
  setSchoolStatus(
    schoolId: string,
    status: PlatformSchoolStatus,
  ): Promise<ApiResponse<PlatformSchool>>;
}
