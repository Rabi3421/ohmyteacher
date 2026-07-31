import { env } from '../../config/env';
import { apiAcademicService } from './apiAcademicService';
import type { AcademicService } from './academicService';
import { mockAcademicService } from './mockAcademicService';

export function resolveAcademicService(): AcademicService {
  return env.dataSource === 'api' ? apiAcademicService : mockAcademicService;
}

export const academicService = resolveAcademicService();
