import { selectRepository, unsupportedOperation } from '../integration/integrationMode';
import type { BranchService } from './branchService';
import { liveBranchService } from './liveBranchService';

const unavailableBranchService: BranchService = {
  createBranch: async () => unsupportedOperation('branches', 'create branch'),
  getBranch: async () => unsupportedOperation('branches', 'get branch'),
  listBranches: async () => unsupportedOperation('branches', 'list branches'),
  setBranchStatus: async () => unsupportedOperation('branches', 'change branch status'),
  updateBranch: async () => unsupportedOperation('branches', 'update branch'),
};

export function resolveBranchService(): BranchService {
  return selectRepository({
    live: liveBranchService,
    mock: unavailableBranchService,
    module: 'branches',
    unsupported: unavailableBranchService,
  });
}

export const branchService = resolveBranchService();
