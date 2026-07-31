import { env } from '../../config/env';
import { apiStudentService } from './apiStudentService';
import { mockStudentService } from './mockStudentService';
import type { StudentService } from './studentService';

export function resolveStudentService(): StudentService {
  return env.dataSource === 'api' ? apiStudentService : mockStudentService;
}

export const studentService = resolveStudentService();
