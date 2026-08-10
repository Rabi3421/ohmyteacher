import { selectRepository } from '../integration/integrationMode';
import { apiMarksResultService } from './apiMarksResultService';
import type { MarksResultService } from './marksResultService';
import { mockMarksResultService } from './mockMarksResultService';

export function resolveMarksResultService(): MarksResultService {
  return selectRepository({
    live: apiMarksResultService,
    mock: mockMarksResultService,
    module: 'marks-results',
    unsupported: apiMarksResultService,
  });
}

export const marksResultService = resolveMarksResultService();
