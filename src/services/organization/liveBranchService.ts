import type { ApiResponse } from '../../models/common';
import type {
  CreateOrganizationBranchInput,
  OrganizationBranch,
  OrganizationBranchCollection,
  OrganizationBranchStatus,
  UpdateOrganizationBranchInput,
} from '../../models/currentOrganization';
import { apiClient, type ApiClient } from '../api/apiClient';
import { ApiClientError } from '../api/apiError';
import type { BranchService } from './branchService';
import type { OrganizationRequestOptions } from './currentOrganizationService';
import {
  mapCreateOrganizationBranchRequest,
  mapOrganizationBranchStatusRequest,
  mapOrganizationFieldErrors,
  mapUpdateOrganizationBranchRequest,
  parseOrganizationBranch,
  parseOrganizationBranchList,
} from './organizationMapper';

type BranchApiClient = Pick<ApiClient, 'get' | 'patch' | 'post'>;

function success<T>(data: T, message: string): ApiResponse<T> {
  return { data, message, success: true };
}

function validBranchId(branchId: string): string {
  if (!/^[1-9]\d*$/.test(branchId)) {
    throw new ApiClientError({
      code: 'INVALID_BRANCH_ID',
      kind: 'validation',
      message: 'This branch reference is invalid.',
      status: 400,
    });
  }
  return branchId;
}

function remapError(error: unknown): never {
  if (!(error instanceof ApiClientError)) throw error;
  throw new ApiClientError({
    code: error.code,
    details: error.details,
    fieldErrors: mapOrganizationFieldErrors(error.fieldErrors),
    kind: error.kind,
    message: error.message,
    nonFieldErrors: error.nonFieldErrors,
    retryable: error.retryable,
    status: error.status,
  });
}

export class LiveBranchService implements BranchService {
  constructor(private readonly client: BranchApiClient) {}

  async listBranches(
    options?: OrganizationRequestOptions,
  ): Promise<ApiResponse<OrganizationBranchCollection>> {
    const raw = await this.client.get<unknown>('/branches/', {
      signal: options?.signal,
    });
    return success(parseOrganizationBranchList(raw), 'Branches loaded.');
  }

  async getBranch(
    branchId: string,
    options?: OrganizationRequestOptions,
  ): Promise<ApiResponse<OrganizationBranch>> {
    const id = validBranchId(branchId);
    const raw = await this.client.get<unknown>(`/branches/${id}/`, {
      signal: options?.signal,
    });
    return success(parseOrganizationBranch(raw), 'Branch loaded.');
  }

  async createBranch(
    input: CreateOrganizationBranchInput,
  ): Promise<ApiResponse<OrganizationBranch>> {
    try {
      const raw = await this.client.post<unknown>(
        '/branches/',
        mapCreateOrganizationBranchRequest(input),
      );
      return success(parseOrganizationBranch(raw), 'Branch created.');
    } catch (error) {
      remapError(error);
    }
  }

  async updateBranch(
    branchId: string,
    input: UpdateOrganizationBranchInput,
  ): Promise<ApiResponse<OrganizationBranch>> {
    try {
      const id = validBranchId(branchId);
      const raw = await this.client.patch<unknown>(
        `/branches/${id}/`,
        mapUpdateOrganizationBranchRequest(input),
      );
      return success(parseOrganizationBranch(raw), 'Branch updated.');
    } catch (error) {
      remapError(error);
    }
  }

  async setBranchStatus(
    branchId: string,
    status: OrganizationBranchStatus,
  ): Promise<ApiResponse<OrganizationBranch>> {
    const id = validBranchId(branchId);
    const raw = await this.client.patch<unknown>(
      `/branches/${id}/status/`,
      mapOrganizationBranchStatusRequest(status),
    );
    return success(
      parseOrganizationBranch(raw),
      status === 'ACTIVE' ? 'Branch activated.' : 'Branch deactivated.',
    );
  }
}

export const liveBranchService = new LiveBranchService(apiClient);
