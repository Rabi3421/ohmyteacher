import type { ApiResponse } from '../../models/common';
import type {
  CreateOrganizationBranchInput,
  OrganizationBranch,
  OrganizationBranchCollection,
  OrganizationBranchStatus,
  UpdateOrganizationBranchInput,
} from '../../models/currentOrganization';
import type { OrganizationRequestOptions } from './currentOrganizationService';

export interface BranchService {
  listBranches(
    options?: OrganizationRequestOptions,
  ): Promise<ApiResponse<OrganizationBranchCollection>>;
  getBranch(
    branchId: string,
    options?: OrganizationRequestOptions,
  ): Promise<ApiResponse<OrganizationBranch>>;
  createBranch(
    input: CreateOrganizationBranchInput,
  ): Promise<ApiResponse<OrganizationBranch>>;
  updateBranch(
    branchId: string,
    input: UpdateOrganizationBranchInput,
  ): Promise<ApiResponse<OrganizationBranch>>;
  setBranchStatus(
    branchId: string,
    status: OrganizationBranchStatus,
  ): Promise<ApiResponse<OrganizationBranch>>;
}
