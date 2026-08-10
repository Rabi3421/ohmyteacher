import { mockUserManagementService } from './mockUserManagementService';
import type { UserManagementService } from './userManagementService';

export function resolveUserManagementService(): UserManagementService {
  // This legacy repository owns configurable roles, permissions, sessions and
  // activity as well as mock membership workflows. Django exposes none of
  // those contracts. Live fixed-role users resolve through staffUserService.
  return mockUserManagementService;
}

export const userManagementService = resolveUserManagementService();
