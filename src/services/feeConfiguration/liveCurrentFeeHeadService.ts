import type {
  CreateCurrentFeeHeadInput,
  CurrentFeeHead,
  CurrentFeeHeadStatus,
  UpdateCurrentFeeHeadInput,
} from '../../models/currentFeeConfiguration';
import { apiClient, type ApiClient } from '../api/apiClient';
import { ApiClientError } from '../api/apiError';
import {
  feeRequestId,
  mapCreateFeeHeadRequest,
  mapUpdateFeeHeadRequest,
  parseFeeHead,
  parseFeeHeadList,
} from './currentFeeConfigurationMapper';
import type {
  CurrentFeeHeadService,
  FeeReadOptions,
} from './currentFeeHeadService';

type FeeHeadApiClient = Pick<ApiClient, 'get' | 'patch' | 'post'>;

export class LiveCurrentFeeHeadService implements CurrentFeeHeadService {
  private readonly mutations = new Set<string>();

  constructor(private readonly client: FeeHeadApiClient) {}

  private async locked<T>(key: string, operation: () => Promise<T>): Promise<T> {
    if (this.mutations.has(key)) {
      throw new ApiClientError({
        code: 'FEE_HEAD_MUTATION_IN_PROGRESS',
        kind: 'conflict',
        message: 'This Fee Head change is already in progress.',
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

  async list(options: FeeReadOptions = {}): Promise<CurrentFeeHead[]> {
    return parseFeeHeadList(
      await this.client.get<unknown>('/fee-heads/', { signal: options.signal }),
    );
  }

  async get(id: string, options: FeeReadOptions = {}): Promise<CurrentFeeHead> {
    return parseFeeHead(
      await this.client.get<unknown>(`/fee-heads/${feeRequestId(id, 'feeHeadId')}/`, {
        signal: options.signal,
      }),
    );
  }

  async create(input: CreateCurrentFeeHeadInput): Promise<CurrentFeeHead> {
    return this.locked('create', async () =>
      parseFeeHead(
        await this.client.post<unknown>('/fee-heads/', mapCreateFeeHeadRequest(input)),
      ),
    );
  }

  async update(id: string, input: UpdateCurrentFeeHeadInput): Promise<CurrentFeeHead> {
    return this.locked(`head:${id}`, async () =>
      parseFeeHead(
        await this.client.patch<unknown>(
          `/fee-heads/${feeRequestId(id, 'feeHeadId')}/`,
          mapUpdateFeeHeadRequest(input),
        ),
      ),
    );
  }

  async setStatus(id: string, status: CurrentFeeHeadStatus): Promise<CurrentFeeHead> {
    return this.locked(`head:${id}`, async () =>
      parseFeeHead(
        await this.client.patch<unknown>(
          `/fee-heads/${feeRequestId(id, 'feeHeadId')}/status/`,
          { is_active: status === 'ACTIVE' },
        ),
      ),
    );
  }
}

export const liveCurrentFeeHeadService = new LiveCurrentFeeHeadService(apiClient);
