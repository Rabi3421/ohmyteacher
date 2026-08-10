import type { AuthSchool } from './auth';

export type CurrentSchool = AuthSchool;
export type OrganizationBranchStatus = 'ACTIVE' | 'INACTIVE';

export interface OrganizationBranch {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  status: OrganizationBranchStatus;
  createdAt: string;
}

export interface OrganizationBranchPagination {
  count: number;
  next: string | null;
  previous: string | null;
}

export interface OrganizationBranchCollection {
  items: OrganizationBranch[];
  totalItems: number;
  pagination: OrganizationBranchPagination | null;
}

export interface UpdateCurrentSchoolInput {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  upiId?: string;
}

export interface CreateOrganizationBranchInput {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export type UpdateOrganizationBranchInput = Partial<CreateOrganizationBranchInput>;

export interface OrganizationBranchListQuery {
  search?: string;
  status?: OrganizationBranchStatus | 'ALL';
}
