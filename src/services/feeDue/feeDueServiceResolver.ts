import { env } from '../../config/env';
import { apiFeeDueService } from './apiFeeDueService';
import { mockFeeDueService } from './mockFeeDueService';

export const feeDueService =
  env.dataSource === 'api' ? apiFeeDueService : mockFeeDueService;
