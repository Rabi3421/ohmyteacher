import { env } from '../../config/env';
import { apiFeeSetupService } from './apiFeeSetupService';
import type { FeeSetupService } from './feeSetupService';
import { mockFeeSetupService } from './mockFeeSetupService';

export function resolveFeeSetupService(): FeeSetupService {
  return env.dataSource === 'api' ? apiFeeSetupService : mockFeeSetupService;
}

export const feeSetupService = resolveFeeSetupService();
