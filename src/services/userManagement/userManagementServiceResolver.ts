import { env } from '../../config/env';
import { apiUserManagementService } from './apiUserManagementService';
import { mockUserManagementService } from './mockUserManagementService';
import type { UserManagementService } from './userManagementService';

export function resolveUserManagementService(): UserManagementService {
  return env.dataSource === 'api'
    ? apiUserManagementService
    : mockUserManagementService;
}

export const userManagementService = resolveUserManagementService();
