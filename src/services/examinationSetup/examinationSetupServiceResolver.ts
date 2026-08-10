import { selectRepository } from '../integration/integrationMode';
import { apiExaminationSetupService } from './apiExaminationSetupService';
import type { ExaminationSetupService } from './examinationSetupService';
import { mockExaminationSetupService } from './mockExaminationSetupService';

export function resolveExaminationSetupService(): ExaminationSetupService {
  return selectRepository({
    live: apiExaminationSetupService,
    mock: mockExaminationSetupService,
    module: 'examinations',
    unsupported: apiExaminationSetupService,
  });
}

export const examinationSetupService = resolveExaminationSetupService();
