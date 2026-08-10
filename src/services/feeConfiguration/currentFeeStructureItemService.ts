import type {
  CreateCurrentFeeStructureItemInput,
  CurrentFeeStructureItem,
  UpdateCurrentFeeStructureItemInput,
} from '../../models/currentFeeConfiguration';
import type { FeeReadOptions } from './currentFeeHeadService';

export interface CurrentFeeStructureItemService {
  list(classId?: string, options?: FeeReadOptions): Promise<CurrentFeeStructureItem[]>;
  get(id: string, options?: FeeReadOptions): Promise<CurrentFeeStructureItem>;
  create(input: CreateCurrentFeeStructureItemInput): Promise<CurrentFeeStructureItem>;
  update(id: string, input: UpdateCurrentFeeStructureItemInput): Promise<CurrentFeeStructureItem>;
}
