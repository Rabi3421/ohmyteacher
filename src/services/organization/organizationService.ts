import type { ApiResponse, PaginatedResponse } from '../../models/common';
import type {
  AcademicSession,
  Branch,
  BranchListQuery,
  BranchStatus,
  CreateAcademicSessionInput,
  CreateBranchInput,
  CreateSchoolInput,
  CreateSchoolResult,
  School,
  SchoolListQuery,
  SchoolSettings,
  SchoolStatus,
  UpdateAcademicSessionInput,
  UpdateBranchInput,
  UpdateSchoolInput,
  UpdateSchoolSettingsInput,
} from '../../models/organization';

export interface OrganizationService {
  getSchools(
    query: SchoolListQuery,
  ): Promise<ApiResponse<PaginatedResponse<School>>>;
  getSchool(schoolId: string): Promise<ApiResponse<School>>;
  createSchool(
    input: CreateSchoolInput,
  ): Promise<ApiResponse<CreateSchoolResult>>;
  updateSchool(
    schoolId: string,
    input: UpdateSchoolInput,
  ): Promise<ApiResponse<School>>;
  updateSchoolStatus(
    schoolId: string,
    status: SchoolStatus,
  ): Promise<ApiResponse<School>>;
  getBranches(
    schoolId: string,
    query?: BranchListQuery,
  ): Promise<ApiResponse<PaginatedResponse<Branch>>>;
  getBranch(
    schoolId: string,
    branchId: string,
  ): Promise<ApiResponse<Branch>>;
  createBranch(
    schoolId: string,
    input: CreateBranchInput,
  ): Promise<ApiResponse<Branch>>;
  updateBranch(
    schoolId: string,
    branchId: string,
    input: UpdateBranchInput,
  ): Promise<ApiResponse<Branch>>;
  updateBranchStatus(
    schoolId: string,
    branchId: string,
    status: BranchStatus,
  ): Promise<ApiResponse<Branch>>;
  getAcademicSessions(
    schoolId: string,
  ): Promise<ApiResponse<AcademicSession[]>>;
  createAcademicSession(
    schoolId: string,
    input: CreateAcademicSessionInput,
  ): Promise<ApiResponse<AcademicSession>>;
  updateAcademicSession(
    schoolId: string,
    sessionId: string,
    input: UpdateAcademicSessionInput,
  ): Promise<ApiResponse<AcademicSession>>;
  activateAcademicSession(
    schoolId: string,
    sessionId: string,
  ): Promise<ApiResponse<AcademicSession[]>>;
  closeAcademicSession(
    schoolId: string,
    sessionId: string,
  ): Promise<ApiResponse<AcademicSession>>;
  getSchoolSettings(
    schoolId: string,
  ): Promise<ApiResponse<SchoolSettings>>;
  updateSchoolSettings(
    schoolId: string,
    input: UpdateSchoolSettingsInput,
  ): Promise<ApiResponse<SchoolSettings>>;
}
