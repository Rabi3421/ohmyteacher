import { ApiClientError } from '../api/apiError';
import type { AcademicService } from './academicService';

function unavailable(): never {
  throw new ApiClientError({
    code: 'REAL_API_NOT_CONFIGURED',
    message: 'The academic setup API is not configured in this build.',
  });
}

export const apiAcademicService: AcademicService = {
  getSetupSummary: async () => unavailable(),
  getClasses: async () => unavailable(),
  getClass: async () => unavailable(),
  createClass: async () => unavailable(),
  updateClass: async () => unavailable(),
  updateClassStatus: async () => unavailable(),
  getSections: async () => unavailable(),
  getSection: async () => unavailable(),
  createSection: async () => unavailable(),
  updateSection: async () => unavailable(),
  updateSectionStatus: async () => unavailable(),
  getSubjects: async () => unavailable(),
  getSubject: async () => unavailable(),
  createSubject: async () => unavailable(),
  updateSubject: async () => unavailable(),
  updateSubjectStatus: async () => unavailable(),
  getClassSubjectAssignments: async () => unavailable(),
  updateClassSubjectAssignments: async () => unavailable(),
};
