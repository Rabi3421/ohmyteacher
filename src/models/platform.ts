import type { ID } from './common';

export type PlatformSchoolStatus = 'ACTIVE' | 'INACTIVE';

export interface PlatformDashboard {
  totalSchools: number;
  activeSchools: number;
  totalBranches: number;
  totalStudents: number;
  totalTeachers: number;
  thisMonthCollection: string;
}

export interface PlatformSchool {
  id: ID;
  name: string;
  address: string;
  phone: string;
  email: string;
  upiId: string;
  status: PlatformSchoolStatus;
  createdAt: string;
}

export interface PlatformInitialAdmin {
  id: ID;
  schoolId: ID;
  name: string;
  mobile: string;
  status: PlatformSchoolStatus;
  role: 'SCHOOL_ADMIN';
  dateJoined: string;
}

export interface CreatePlatformSchoolInput {
  schoolName: string;
  adminName: string;
  adminMobile: string;
}

export interface CreatePlatformSchoolResult {
  school: PlatformSchool;
  admin: PlatformInitialAdmin;
}

export interface UpdatePlatformSchoolInput {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  upiId?: string;
}

export interface PlatformSchoolQuery {
  search?: string;
  status?: PlatformSchoolStatus | 'ALL';
}

export interface PlatformPaginationMetadata {
  count: number;
  next: string | null;
  previous: string | null;
}

export interface PlatformSchoolCollection {
  items: PlatformSchool[];
  totalItems: number;
  pagination: PlatformPaginationMetadata | null;
}
