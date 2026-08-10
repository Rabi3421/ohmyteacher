import { selectRepository } from '../integration/integrationMode';
import type { AuthService } from './authService';
import { liveAuthService } from './liveAuthService';
import { mockAuthService } from './mockAuthService';

export function resolveAuthService(): AuthService {
  return selectRepository({
    live: liveAuthService,
    mock: mockAuthService,
    module: 'authentication',
    unsupported: liveAuthService,
  });
}

export const authService = resolveAuthService();
