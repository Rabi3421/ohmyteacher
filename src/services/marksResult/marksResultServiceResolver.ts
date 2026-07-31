import { env } from '../../config/env';
import { apiMarksResultService } from './apiMarksResultService';
import type { MarksResultService } from './marksResultService';
import { mockMarksResultService } from './mockMarksResultService';

export function resolveMarksResultService(): MarksResultService {
  return env.dataSource === 'api'
    ? apiMarksResultService
    : mockMarksResultService;
}

export const marksResultService = resolveMarksResultService();
