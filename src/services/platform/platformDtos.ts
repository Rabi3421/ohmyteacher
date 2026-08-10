export interface PlatformDashboardResponseDto {
  success: true;
  total_schools: number;
  active_schools: number;
  total_branches: number;
  total_students: number;
  total_teachers: number;
  this_month_collection: string;
}

export interface BackendPlatformSchoolDto {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  upi_id: string;
  is_active: boolean;
  created_at: string;
}

export interface BackendPlatformAdminDto {
  id: number;
  phone_number: string;
  name: string;
  role: string;
  school: number | null;
  branch: number | null;
  is_active: boolean;
  date_joined: string;
}

export interface PlatformSchoolListResponseDto {
  success: true;
  schools: BackendPlatformSchoolDto[];
}

export interface PaginatedPlatformSchoolListResponseDto {
  success: true;
  count: number;
  next: string | null;
  previous: string | null;
  results: BackendPlatformSchoolDto[];
}

export interface PlatformSchoolResponseDto {
  success: true;
  school: BackendPlatformSchoolDto;
}

export interface CreatePlatformSchoolRequestDto {
  school_name: string;
  admin_name: string;
  admin_phone_number: string;
}

export interface CreatePlatformSchoolResponseDto {
  success: true;
  school: BackendPlatformSchoolDto;
  admin: BackendPlatformAdminDto;
}

export interface UpdatePlatformSchoolRequestDto {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  upi_id?: string;
}

export interface UpdatePlatformSchoolStatusRequestDto {
  is_active: boolean;
}
