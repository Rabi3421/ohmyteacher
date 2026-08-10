export type BackendStaffRoleDto = 'branch_admin' | 'teacher';

export interface BackendStaffUserDto {
  id: number;
  phone_number: string;
  name: string;
  role: string;
  school: number | null;
  branch: number | null;
  is_active: boolean;
  date_joined: string;
}

export interface StaffListResponseDto {
  success: true;
  users: BackendStaffUserDto[];
}

export interface StaffResponseDto {
  success: true;
  user: BackendStaffUserDto;
}

export interface CreateStaffRequestDto {
  name: string;
  phone_number: string;
  role: BackendStaffRoleDto;
  branch: number;
}

export interface UpdateStaffRequestDto {
  name?: string;
  branch?: number;
}

export interface UpdateStaffStatusRequestDto {
  is_active: boolean;
}
