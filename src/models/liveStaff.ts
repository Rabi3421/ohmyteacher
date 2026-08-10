import type { ID } from './common';

export type BackendStaffRole = 'BRANCH_ADMIN' | 'TEACHER';
export type LiveStaffStatus = 'ACTIVE' | 'INACTIVE';

export interface LiveStaffBranchReference {
  id: ID;
  name?: string;
  code?: string;
  status?: LiveStaffStatus;
}

// Django stores these fields on one User row. `schoolId` and `branch` are
// ownership references, not separate frontend memberships.
export interface LiveStaffUser {
  id: ID;
  name: string;
  mobile: string;
  role: BackendStaffRole;
  schoolId: ID;
  branch: LiveStaffBranchReference;
  status: LiveStaffStatus;
  joinedAt: string;
}

export interface LiveStaffCollection {
  items: LiveStaffUser[];
  totalItems: number;
  pagination: null | {
    count: number;
    next: string | null;
    previous: string | null;
  };
}

export interface LiveStaffListQuery {
  search?: string;
  role?: BackendStaffRole | 'ALL';
  branchId?: ID | 'ALL';
  status?: LiveStaffStatus | 'ALL';
}

export interface CreateLiveStaffInput {
  name: string;
  mobile: string;
  role: BackendStaffRole;
  branchId: ID;
}

export interface UpdateLiveStaffInput {
  name?: string;
  branchId?: ID;
}
