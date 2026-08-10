import type {
  CreateCurrentFeeStructureItemInput,
  CurrentFeeStructureItem,
  UpdateCurrentFeeStructureItemInput,
} from '../../models/currentFeeConfiguration';
import { apiClient, type ApiClient } from '../api/apiClient';
import { ApiClientError } from '../api/apiError';
import {
  feeRequestId,
  mapCreateFeeStructureItemRequest,
  mapUpdateFeeStructureItemRequest,
  parseFeeStructureItem,
  parseFeeStructureItemList,
} from './currentFeeConfigurationMapper';
import type { FeeReadOptions } from './currentFeeHeadService';
import type { CurrentFeeStructureItemService } from './currentFeeStructureItemService';

type StructureItemApiClient = Pick<ApiClient, 'get' | 'patch' | 'post'>;

export class LiveCurrentFeeStructureItemService
  implements CurrentFeeStructureItemService
{
  private readonly mutations = new Set<string>();

  constructor(private readonly client: StructureItemApiClient) {}

  private async locked<T>(key: string, operation: () => Promise<T>): Promise<T> {
    if (this.mutations.has(key)) {
      throw new ApiClientError({
        code: 'FEE_STRUCTURE_ITEM_MUTATION_IN_PROGRESS',
        kind: 'conflict',
        message: 'This Structure Item change is already in progress.',
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

  async list(
    classId?: string,
    options: FeeReadOptions = {},
  ): Promise<CurrentFeeStructureItem[]> {
    return parseFeeStructureItemList(
      await this.client.get<unknown>('/fee-structure-items/', {
        query: classId
          ? { school_class: feeRequestId(classId, 'classId') }
          : undefined,
        signal: options.signal,
      }),
    );
  }

  async get(id: string, options: FeeReadOptions = {}): Promise<CurrentFeeStructureItem> {
    return parseFeeStructureItem(
      await this.client.get<unknown>(
        `/fee-structure-items/${feeRequestId(id, 'structureItemId')}/`,
        { signal: options.signal },
      ),
    );
  }

  async create(input: CreateCurrentFeeStructureItemInput): Promise<CurrentFeeStructureItem> {
    return this.locked(`class:${input.classId}:head:${input.feeHeadId}`, async () =>
      parseFeeStructureItem(
        await this.client.post<unknown>(
          '/fee-structure-items/',
          mapCreateFeeStructureItemRequest(input),
        ),
      ),
    );
  }

  async update(
    id: string,
    input: UpdateCurrentFeeStructureItemInput,
  ): Promise<CurrentFeeStructureItem> {
    return this.locked(`item:${id}`, async () =>
      parseFeeStructureItem(
        await this.client.patch<unknown>(
          `/fee-structure-items/${feeRequestId(id, 'structureItemId')}/`,
          mapUpdateFeeStructureItemRequest(input),
        ),
      ),
    );
  }
}

export const liveCurrentFeeStructureItemService =
  new LiveCurrentFeeStructureItemService(apiClient);
