import { ApiClientError } from '../api/apiError';
import type { MarksResultService } from './marksResultService';

function unavailable(): never {
  throw new ApiClientError({
    code: 'REAL_API_NOT_CONFIGURED',
    message: 'The Marks and Results API is not configured in this build.',
  });
}

export const apiMarksResultService: MarksResultService = {
  calculateResults: async () => unavailable(),
  getClassResults: async () => unavailable(),
  getMarkSheet: async () => unavailable(),
  getMarkSheetHistory: async () => unavailable(),
  getMarkSheets: async () => unavailable(),
  getMarksDashboard: async () => unavailable(),
  getPublicationHistory: async () => unavailable(),
  getRankList: async () => unavailable(),
  getResultProcessingSummary: async () => unavailable(),
  getSectionResults: async () => unavailable(),
  getStudentResult: async () => unavailable(),
  lockMarkSheet: async () => unavailable(),
  previewResultCalculation: async () => unavailable(),
  publishResults: async () => unavailable(),
  returnMarkSheetToDraft: async () => unavailable(),
  reviewResults: async () => unavailable(),
  saveMarkSheetDraft: async () => unavailable(),
  submitMarkSheet: async () => unavailable(),
  unlockMarkSheet: async () => unavailable(),
  unpublishResults: async () => unavailable(),
};
