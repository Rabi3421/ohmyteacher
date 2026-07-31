import { ApiClientError } from '../api/apiError';
import type { StudentService } from './studentService';

function unavailable(): never {
  throw new ApiClientError({
    code: 'REAL_API_NOT_CONFIGURED',
    message: 'The student API is not configured in this build.',
  });
}

export const apiStudentService: StudentService = {
  getStudents: async () => unavailable(),
  getStudent: async () => unavailable(),
  createStudentAdmission: async () => unavailable(),
  updateStudentProfile: async () => unavailable(),
  updateStudentStatus: async () => unavailable(),
  getStudentGuardians: async () => unavailable(),
  addStudentGuardian: async () => unavailable(),
  updateStudentGuardian: async () => unavailable(),
  unlinkStudentGuardian: async () => unavailable(),
  getEnrollmentHistory: async () => unavailable(),
  transferStudent: async () => unavailable(),
  getStudentAccess: async () => unavailable(),
  updateParentAccess: async () => unavailable(),
  updateStudentAppAccess: async () => unavailable(),
  getParentChildren: async () => unavailable(),
  getParentChild: async () => unavailable(),
  getStudentSelfProfile: async () => unavailable(),
};
