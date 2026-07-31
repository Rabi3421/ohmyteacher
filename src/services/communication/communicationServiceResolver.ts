import { env } from '../../config/env';
import { apiCommunicationService } from './apiCommunicationService';
import { mockCommunicationService } from './mockCommunicationService';

export const communicationService =
  env.dataSource === 'mock'
    ? mockCommunicationService
    : apiCommunicationService;
