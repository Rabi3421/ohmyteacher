import { env } from '../../config/env';
import { apiOrganizationService } from './apiOrganizationService';
import { mockOrganizationService } from './mockOrganizationService';
import type { OrganizationService } from './organizationService';

export function resolveOrganizationService(): OrganizationService {
  return env.dataSource === 'api'
    ? apiOrganizationService
    : mockOrganizationService;
}

export const organizationService = resolveOrganizationService();
