import { ApiClientError } from '../api/apiError';
import type { FeeSetupService } from './feeSetupService';

function unavailable(): never {
  throw new ApiClientError({
    code: 'REAL_API_NOT_CONFIGURED',
    message: 'The Fee Setup API is not configured in this build.',
  });
}

export const apiFeeSetupService: FeeSetupService = {
  assignDefaultFeeStructure: async () => unavailable(),
  copyFeeStructure: async () => unavailable(),
  createDiscountDefinition: async () => unavailable(),
  createFeeHead: async () => unavailable(),
  createFeeStructure: async () => unavailable(),
  createFineRule: async () => unavailable(),
  getDiscountDefinition: async () => unavailable(),
  getDiscountDefinitions: async () => unavailable(),
  getFeeHead: async () => unavailable(),
  getFeeHeads: async () => unavailable(),
  getFeeSetupSummary: async () => unavailable(),
  getFeeStructure: async () => unavailable(),
  getFeeStructures: async () => unavailable(),
  getFineRule: async () => unavailable(),
  getFineRules: async () => unavailable(),
  getStudentFeeAssignment: async () => unavailable(),
  getStudentFeeAssignments: async () => unavailable(),
  previewStudentPayable: async () => unavailable(),
  updateDiscountDefinition: async () => unavailable(),
  updateDiscountStatus: async () => unavailable(),
  updateFeeHead: async () => unavailable(),
  updateFeeHeadStatus: async () => unavailable(),
  updateFeeStructure: async () => unavailable(),
  updateFeeStructureStatus: async () => unavailable(),
  updateFineRule: async () => unavailable(),
  updateFineRuleStatus: async () => unavailable(),
  updateStudentFeeAssignment: async () => unavailable(),
};
