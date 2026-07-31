import type { Address, ID } from './common';

export type SchoolStatus = 'ACTIVE' | 'INACTIVE';
export type BranchStatus = 'ACTIVE' | 'INACTIVE';
export type AcademicSessionStatus = 'UPCOMING' | 'ACTIVE' | 'CLOSED';

export interface AcademicSessionSummary {
  id: ID;
  name: string;
  startDate: string;
  endDate: string;
}

export interface InitialSchoolAdminSummary {
  membershipId: ID;
  name: string;
  mobile: string;
  email?: string;
  role: 'SCHOOL_ADMIN';
}

export interface School {
  id: ID;
  name: string;
  code: string;
  email?: string;
  mobile: string;
  alternateMobile?: string;
  website?: string;
  logoUrl?: string;
  address: Address;
  status: SchoolStatus;
  branchCount: number;
  activeBranchCount: number;
  activeSession?: AcademicSessionSummary;
  schoolAdmin?: InitialSchoolAdminSummary;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: ID;
  schoolId: ID;
  name: string;
  code: string;
  email?: string;
  mobile: string;
  address: Address;
  status: BranchStatus;
  isMainBranch: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicSession {
  id: ID;
  schoolId: ID;
  name: string;
  startDate: string;
  endDate: string;
  status: AcademicSessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolSettings {
  schoolId: ID;
  displayName: string;
  logoUrl?: string;
  primaryEmail?: string;
  primaryMobile: string;
  timezone: string;
  currency: string;
  country: string;
  academicYearStartMonth: number;
  dateFormat: string;
}

export interface CreateSchoolResult {
  school: School;
  mainBranch: Branch;
  activeSession: AcademicSession;
  schoolAdmin: InitialSchoolAdminSummary;
}

export interface SchoolListQuery {
  search?: string;
  status?: SchoolStatus | 'ALL';
  page?: number;
  pageSize?: number;
}

export interface BranchListQuery {
  search?: string;
  status?: BranchStatus | 'ALL';
  page?: number;
  pageSize?: number;
}

export interface CreateSchoolInput {
  name: string;
  code: string;
  email?: string;
  mobile: string;
  alternateMobile?: string;
  website?: string;
  logoUrl?: string;
  address: Address;
  admin: {
    name: string;
    mobile: string;
    email?: string;
  };
}

export type UpdateSchoolInput = Omit<
  CreateSchoolInput,
  'code' | 'admin'
>;

export interface CreateBranchInput {
  name: string;
  code: string;
  email?: string;
  mobile: string;
  address: Address;
}

export type UpdateBranchInput = Omit<CreateBranchInput, 'code'>;

export interface CreateAcademicSessionInput {
  name: string;
  startDate: string;
  endDate: string;
  status?: Extract<AcademicSessionStatus, 'UPCOMING' | 'ACTIVE'>;
}

export type UpdateAcademicSessionInput = Pick<
  CreateAcademicSessionInput,
  'name' | 'startDate' | 'endDate'
>;

export type UpdateSchoolSettingsInput = Omit<SchoolSettings, 'schoolId'>;

export type { UserMembership } from './auth';
