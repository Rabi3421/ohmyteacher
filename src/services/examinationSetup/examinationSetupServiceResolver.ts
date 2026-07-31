import { env } from '../../config/env';
import { apiExaminationSetupService } from './apiExaminationSetupService';
import type { ExaminationSetupService } from './examinationSetupService';
import { mockExaminationSetupService } from './mockExaminationSetupService';

export function resolveExaminationSetupService(): ExaminationSetupService {
  return env.dataSource === 'api'
    ? apiExaminationSetupService
    : mockExaminationSetupService;
}

export const examinationSetupService = resolveExaminationSetupService();
