import { ApiClientError } from '../api/apiError';
import type { ExaminationSetupService } from './examinationSetupService';

function unavailable(): never {
  throw new ApiClientError({
    code: 'REAL_API_NOT_CONFIGURED',
    message: 'The Examination Setup API is not configured in this build.',
  });
}

export const apiExaminationSetupService: ExaminationSetupService = {
  cancelExam: async () => unavailable(),
  copyExam: async () => unavailable(),
  createExam: async () => unavailable(),
  createExamTerm: async () => unavailable(),
  createExamType: async () => unavailable(),
  createGradingScheme: async () => unavailable(),
  getExam: async () => unavailable(),
  getExamTerm: async () => unavailable(),
  getExamTerms: async () => unavailable(),
  getExamType: async () => unavailable(),
  getExamTypes: async () => unavailable(),
  getExaminationSetupSummary: async () => unavailable(),
  getExams: async () => unavailable(),
  getGradingScheme: async () => unavailable(),
  getGradingSchemes: async () => unavailable(),
  previewCopyExam: async () => unavailable(),
  returnExamToDraft: async () => unavailable(),
  scheduleExam: async () => unavailable(),
  updateExam: async () => unavailable(),
  updateExamClassConfigurations: async () => unavailable(),
  updateExamSchedule: async () => unavailable(),
  updateExamSubjectPapers: async () => unavailable(),
  updateExamTerm: async () => unavailable(),
  updateExamTermStatus: async () => unavailable(),
  updateExamType: async () => unavailable(),
  updateExamTypeStatus: async () => unavailable(),
  updateGradingScheme: async () => unavailable(),
  updateGradingSchemeStatus: async () => unavailable(),
  validateExamSetup: async () => unavailable(),
};
