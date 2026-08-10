import { createUnsupportedOperationError } from '../api/apiError';
import { selectRepository } from '../integration/integrationMode';
import { livePlatformService } from './livePlatformService';
import type { PlatformService } from './platformService';

function unsupported(): never {
  throw createUnsupportedOperationError('platform');
}

const unavailablePlatformService: PlatformService = {
  createSchool: async () => unsupported(),
  getPlatformDashboard: async () => unsupported(),
  getSchool: async () => unsupported(),
  listSchools: async () => unsupported(),
  setSchoolStatus: async () => unsupported(),
  updateSchool: async () => unsupported(),
};

export function resolvePlatformService(): PlatformService {
  return selectRepository({
    live: livePlatformService,
    mock: unavailablePlatformService,
    module: 'platform',
    unsupported: unavailablePlatformService,
  });
}

export const platformService = resolvePlatformService();
