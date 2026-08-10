import type {
  BackendSchoolDto,
  CurrentSchoolResponseDto,
  UpdateSchoolRequestDto,
} from '../auth/authDtos';

export type BackendCurrentSchoolDto = BackendSchoolDto;
export type CurrentOrganizationResponseDto = CurrentSchoolResponseDto;
export type UpdateCurrentOrganizationRequestDto = UpdateSchoolRequestDto;

export interface BackendOrganizationBranchDto {
  id: number;
  school: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface BranchListResponseDto {
  success: true;
  branches: BackendOrganizationBranchDto[];
}

export interface PaginatedBranchListResponseDto {
  success: true;
  count: number;
  next: string | null;
  previous: string | null;
  results: BackendOrganizationBranchDto[];
}

export interface BranchResponseDto {
  success: true;
  branch: BackendOrganizationBranchDto;
}

export interface CreateBranchRequestDto {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export type UpdateBranchRequestDto = Partial<CreateBranchRequestDto>;

export interface UpdateBranchStatusRequestDto {
  is_active: boolean;
}
