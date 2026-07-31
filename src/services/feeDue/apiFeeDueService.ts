import { ApiClientError } from '../api/apiError';
import type { FeeDueService } from './feeDueService';

const unavailable = (): never => {
  throw new ApiClientError({
    code: 'FEE_DUE_API_UNAVAILABLE',
    message: 'Fee Due API mode is not configured.',
    status: 503,
  });
};

export const apiFeeDueService: FeeDueService = {
  bulkRefreshFines: async () => unavailable(),
  calculateFinePreview: async () => unavailable(),
  cancelFeeDue: async () => unavailable(),
  commitFeeGeneration: async () => unavailable(),
  getFeeDue: async () => unavailable(),
  getFeeDues: async () => unavailable(),
  getGenerationHistory: async () => unavailable(),
  getGenerationRun: async () => unavailable(),
  getOutstandingSummary: async () => unavailable(),
  getParentStudentFees: async () => unavailable(),
  getStudentFeeDues: async () => unavailable(),
  getStudentSelfFees: async () => unavailable(),
  previewFeeGeneration: async () => unavailable(),
  refreshFeeDueFine: async () => unavailable(),
  waiveFeeDue: async () => unavailable(),
  waiveFeeDueFine: async () => unavailable(),
};
