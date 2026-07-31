import { ApiClientError } from '../api/apiError';
import type { OrganizationService } from './organizationService';

function unavailable(): never {
  throw new ApiClientError({
    code: 'REAL_API_NOT_CONFIGURED',
    message: 'The organization API is not configured in this build.',
  });
}

// Contract-complete REST adapter placeholder. Methods intentionally do not call
// nonexistent endpoints until the Python backend contract is available.
export const apiOrganizationService: OrganizationService = {
  getSchools: async () => unavailable(),
  getSchool: async () => unavailable(),
  createSchool: async () => unavailable(),
  updateSchool: async () => unavailable(),
  updateSchoolStatus: async () => unavailable(),
  getBranches: async () => unavailable(),
  getBranch: async () => unavailable(),
  createBranch: async () => unavailable(),
  updateBranch: async () => unavailable(),
  updateBranchStatus: async () => unavailable(),
  getAcademicSessions: async () => unavailable(),
  createAcademicSession: async () => unavailable(),
  updateAcademicSession: async () => unavailable(),
  activateAcademicSession: async () => unavailable(),
  closeAcademicSession: async () => unavailable(),
  getSchoolSettings: async () => unavailable(),
  updateSchoolSettings: async () => unavailable(),
};
