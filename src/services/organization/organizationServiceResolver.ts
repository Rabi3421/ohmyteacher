import {
  selectRepository,
  unsupportedOperation,
} from '../integration/integrationMode';
import { apiOrganizationService } from './apiOrganizationService';
import type { CurrentOrganizationService } from './currentOrganizationService';
import { liveCurrentOrganizationService } from './liveCurrentOrganizationService';
import { mockOrganizationService } from './mockOrganizationService';
import type { OrganizationService } from './organizationService';
import { liveAcademicSessionService } from '../academic/liveAcademicSessionService';

export function resolveOrganizationService(): OrganizationService {
  // Current-school and branch APIs remain isolated below. Only the confirmed
  // Session methods cross this legacy aggregate in Phase 20; school settings
  // and older aggregate operations keep their previous repository.
  type SessionMethods = Pick<OrganizationService,
    | 'activateAcademicSession'
    | 'closeAcademicSession'
    | 'createAcademicSession'
    | 'getAcademicSessions'
    | 'updateAcademicSession'
  >;
  const sessions = selectRepository<SessionMethods>({
    live: liveAcademicSessionService,
    mock: mockOrganizationService,
    module: 'academic-sessions',
    unsupported: apiOrganizationService,
  });
  return {
    ...mockOrganizationService,
    activateAcademicSession: sessions.activateAcademicSession.bind(sessions),
    closeAcademicSession: sessions.closeAcademicSession.bind(sessions),
    createAcademicSession: sessions.createAcademicSession.bind(sessions),
    getAcademicSessions: sessions.getAcademicSessions.bind(sessions),
    updateAcademicSession: sessions.updateAcademicSession.bind(sessions),
  };
}

export const organizationService = resolveOrganizationService();

const unavailableCurrentOrganizationService: CurrentOrganizationService = {
  getCurrentSchool: async () =>
    unsupportedOperation('organization', 'load current school'),
  updateCurrentSchool: async () =>
    unsupportedOperation('organization', 'update current school'),
};

export function resolveCurrentOrganizationService(): CurrentOrganizationService {
  return selectRepository({
    live: liveCurrentOrganizationService,
    mock: unavailableCurrentOrganizationService,
    module: 'organization',
    unsupported: unavailableCurrentOrganizationService,
  });
}

export const currentOrganizationService = resolveCurrentOrganizationService();
