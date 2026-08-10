import { selectRepository } from '../integration/integrationMode';
import { apiStudentService } from './apiStudentService';
import { mockStudentService } from './mockStudentService';
import type { StudentService } from './studentService';

export function resolveStudentService(): StudentService {
  return selectRepository({
    live: apiStudentService,
    mock: mockStudentService,
    // Rich Phase 6 identities remain isolated for later mock modules. The
    // Phase 21 screens use the separate CurrentStudent live repository.
    module: 'student-demo-identity',
    unsupported: apiStudentService,
  });
}

export const studentService = resolveStudentService();
