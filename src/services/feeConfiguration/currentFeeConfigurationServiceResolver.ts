import {
  selectRepository,
  unsupportedOperation,
} from '../integration/integrationMode';
import type { CurrentFeeHeadService } from './currentFeeHeadService';
import type { CurrentFeeStructureItemService } from './currentFeeStructureItemService';
import type { CurrentFeeStructureService } from './currentFeeStructureService';
import { liveCurrentFeeHeadService } from './liveCurrentFeeHeadService';
import { liveCurrentFeeStructureItemService } from './liveCurrentFeeStructureItemService';
import { liveCurrentFeeStructureService } from './liveCurrentFeeStructureService';

const unavailableHeadService: CurrentFeeHeadService = {
  create: async () => unsupportedOperation('fee-heads', 'create'),
  get: async () => unsupportedOperation('fee-heads', 'detail'),
  list: async () => unsupportedOperation('fee-heads', 'list'),
  setStatus: async () => unsupportedOperation('fee-heads', 'status'),
  update: async () => unsupportedOperation('fee-heads', 'update'),
};
const unavailableItemService: CurrentFeeStructureItemService = {
  create: async () => unsupportedOperation('fee-structure-items', 'create'),
  get: async () => unsupportedOperation('fee-structure-items', 'detail'),
  list: async () => unsupportedOperation('fee-structure-items', 'list'),
  update: async () => unsupportedOperation('fee-structure-items', 'update'),
};
const unavailableStructureService: CurrentFeeStructureService = {
  get: async () => unsupportedOperation('fee-structures', 'detail'),
  list: async () => unsupportedOperation('fee-structures', 'list'),
};

export function resolveCurrentFeeHeadService(): CurrentFeeHeadService {
  return selectRepository({
    live: liveCurrentFeeHeadService,
    mock: unavailableHeadService,
    module: 'fee-heads',
    unsupported: unavailableHeadService,
  });
}

export function resolveCurrentFeeStructureItemService(): CurrentFeeStructureItemService {
  return selectRepository({
    live: liveCurrentFeeStructureItemService,
    mock: unavailableItemService,
    module: 'fee-structure-items',
    unsupported: unavailableItemService,
  });
}

export function resolveCurrentFeeStructureService(): CurrentFeeStructureService {
  return selectRepository({
    live: liveCurrentFeeStructureService,
    mock: unavailableStructureService,
    module: 'fee-structures',
    unsupported: unavailableStructureService,
  });
}

export const currentFeeHeadService = resolveCurrentFeeHeadService();
export const currentFeeStructureItemService =
  resolveCurrentFeeStructureItemService();
export const currentFeeStructureService = resolveCurrentFeeStructureService();
