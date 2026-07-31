import { env } from '../../config/env';
import { mockManualShareService } from './mockManualShareService';
import { nativeManualShareService } from './nativeManualShareService';

export const manualShareService =
  env.dataSource === 'mock' ? mockManualShareService : nativeManualShareService;
