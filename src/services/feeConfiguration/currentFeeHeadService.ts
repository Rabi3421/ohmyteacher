import type {
  CreateCurrentFeeHeadInput,
  CurrentFeeHead,
  CurrentFeeHeadStatus,
  UpdateCurrentFeeHeadInput,
} from '../../models/currentFeeConfiguration';

export interface FeeReadOptions {
  signal?: AbortSignal;
}

export interface CurrentFeeHeadService {
  list(options?: FeeReadOptions): Promise<CurrentFeeHead[]>;
  get(id: string, options?: FeeReadOptions): Promise<CurrentFeeHead>;
  create(input: CreateCurrentFeeHeadInput): Promise<CurrentFeeHead>;
  update(id: string, input: UpdateCurrentFeeHeadInput): Promise<CurrentFeeHead>;
  setStatus(id: string, status: CurrentFeeHeadStatus): Promise<CurrentFeeHead>;
}
