import type { ApiResponse } from '../../models/common';
import type {
  CreateLiveStaffInput,
  LiveStaffBranchReference,
  LiveStaffCollection,
  LiveStaffListQuery,
  LiveStaffStatus,
  LiveStaffUser,
  UpdateLiveStaffInput,
} from '../../models/liveStaff';
import { apiClient, type ApiClient } from '../api/apiClient';
import { ApiClientError } from '../api/apiError';
import type { BranchService } from '../organization/branchService';
import { liveBranchService } from '../organization/liveBranchService';
import type { StaffUserService } from './staffUserService';
import {
  mapCreateStaffRequest,
  mapStaffFieldErrors,
  mapStaffStatusRequest,
  mapUpdateStaffRequest,
  parseStaffList,
  parseStaffResponse,
} from './staffUserMapper';

type StaffApiClient = Pick<ApiClient, 'get' | 'patch' | 'post'>;

function success<T>(data: T, message: string): ApiResponse<T> {
  return { data, message, success: true };
}

function staffId(value: string): string {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new ApiClientError({
      code: 'INVALID_STAFF_ID',
      kind: 'validation',
      message: 'This staff reference is invalid.',
      status: 400,
    });
  }
  return value;
}

function remapError(error: unknown): never {
  if (!(error instanceof ApiClientError)) throw error;
  throw new ApiClientError({
    code: error.code,
    details: error.details,
    fieldErrors: mapStaffFieldErrors(error.fieldErrors),
    kind: error.kind,
    message: error.message,
    nonFieldErrors: error.nonFieldErrors,
    retryable: error.retryable,
    status: error.status,
  });
}

function applyClientFilters(
  collection: LiveStaffCollection,
  query?: LiveStaffListQuery,
): LiveStaffCollection {
  const search = query?.search?.trim().toLowerCase() ?? '';
  const items = collection.items.filter(
    item =>
      (!search ||
        item.name.toLowerCase().includes(search) ||
        item.mobile.toLowerCase().includes(search)) &&
      (!query?.role || query.role === 'ALL' || item.role === query.role) &&
      (!query?.branchId ||
        query.branchId === 'ALL' ||
        item.branch.id === query.branchId) &&
      (!query?.status ||
        query.status === 'ALL' ||
        item.status === query.status),
  );
  return { items, pagination: null, totalItems: items.length };
}

export class LiveStaffUserService implements StaffUserService {
  private readonly mutations = new Set<string>();

  constructor(
    private readonly client: StaffApiClient,
    private readonly branches: BranchService,
  ) {}

  private async branchReferences(
    signal?: AbortSignal,
  ): Promise<LiveStaffBranchReference[]> {
    const response = await this.branches.listBranches({ signal });
    return response.data.items.map(branch => ({
      code: branch.code,
      id: branch.id,
      name: branch.name,
      status: branch.status,
    }));
  }

  private async locked<T>(key: string, operation: () => Promise<T>): Promise<T> {
    if (this.mutations.has(key)) {
      throw new ApiClientError({
        code: 'STAFF_MUTATION_IN_PROGRESS',
        kind: 'conflict',
        message: 'This staff change is already in progress.',
        status: 409,
      });
    }
    this.mutations.add(key);
    try {
      return await operation();
    } finally {
      this.mutations.delete(key);
    }
  }

  async listStaff(
    query?: LiveStaffListQuery,
    options?: { signal?: AbortSignal },
  ): Promise<ApiResponse<LiveStaffCollection>> {
    const [raw, branches] = await Promise.all([
      this.client.get<unknown>('/users/', { signal: options?.signal }),
      this.branchReferences(options?.signal),
    ]);
    return success(
      applyClientFilters(parseStaffList(raw, branches), query),
      'Staff loaded.',
    );
  }

  async getStaff(
    idValue: string,
    options?: { signal?: AbortSignal },
  ): Promise<ApiResponse<LiveStaffUser>> {
    const id = staffId(idValue);
    const [raw, branches] = await Promise.all([
      this.client.get<unknown>(`/users/${id}/`, { signal: options?.signal }),
      this.branchReferences(options?.signal),
    ]);
    return success(parseStaffResponse(raw, branches), 'Staff loaded.');
  }

  async createStaff(
    input: CreateLiveStaffInput,
  ): Promise<ApiResponse<LiveStaffUser>> {
    return this.locked('create', async () => {
      try {
        const branches = await this.branchReferences();
        const selected = branches.find(branch => branch.id === input.branchId);
        if (!selected || selected.status !== 'ACTIVE') {
          throw new ApiClientError({
            code: 'INVALID_STAFF_BRANCH',
            fieldErrors: { branchId: 'Select an active accessible branch.' },
            kind: 'validation',
            message: 'Select an active accessible branch.',
            status: 400,
          });
        }
        const raw = await this.client.post<unknown>(
          '/users/',
          mapCreateStaffRequest(input),
        );
        return success(parseStaffResponse(raw, branches), 'Staff created.');
      } catch (error) {
        remapError(error);
      }
    });
  }

  async updateStaff(
    idValue: string,
    input: UpdateLiveStaffInput,
  ): Promise<ApiResponse<LiveStaffUser>> {
    const id = staffId(idValue);
    return this.locked(`update:${id}`, async () => {
      try {
        const branches = await this.branchReferences();
        if (input.branchId !== undefined) {
          const selected = branches.find(
            branch => branch.id === input.branchId,
          );
          if (!selected || selected.status !== 'ACTIVE') {
            throw new ApiClientError({
              code: 'INVALID_STAFF_BRANCH',
              fieldErrors: { branchId: 'Select an active accessible branch.' },
              kind: 'validation',
              message: 'Select an active accessible branch.',
              status: 400,
            });
          }
        }
        const raw = await this.client.patch<unknown>(
          `/users/${id}/`,
          mapUpdateStaffRequest(input),
        );
        return success(parseStaffResponse(raw, branches), 'Staff updated.');
      } catch (error) {
        remapError(error);
      }
    });
  }

  async setStaffStatus(
    idValue: string,
    status: LiveStaffStatus,
  ): Promise<ApiResponse<LiveStaffUser>> {
    const id = staffId(idValue);
    return this.locked(`status:${id}`, async () => {
      try {
        const branches = await this.branchReferences();
        const raw = await this.client.patch<unknown>(
          `/users/${id}/status/`,
          mapStaffStatusRequest(status),
        );
        return success(
          parseStaffResponse(raw, branches),
          status === 'ACTIVE' ? 'Staff activated.' : 'Staff deactivated.',
        );
      } catch (error) {
        remapError(error);
      }
    });
  }
}

export const liveStaffUserService = new LiveStaffUserService(
  apiClient,
  liveBranchService,
);
