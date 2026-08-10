import { selectRepository } from '../integration/integrationMode';
import { apiFeeSetupService } from './apiFeeSetupService';
import type { FeeSetupService } from './feeSetupService';
import { mockFeeSetupService } from './mockFeeSetupService';

export function resolveFeeSetupService(): FeeSetupService {
  return selectRepository({
    live: apiFeeSetupService,
    mock: mockFeeSetupService,
    // The rich Phase 7 mock graph is intentionally retained for the isolated
    // Phase 23+ demo workflows. Phase 22 screens use currentFeeConfiguration.
    module: 'fee-setup-demo',
    unsupported: apiFeeSetupService,
  });
}

export const feeSetupService = resolveFeeSetupService();
