import { env } from '../../config/env';
import { apiCommunicationProvider } from './apiCommunicationProvider';
import { mockCommunicationProvider } from './mockCommunicationProvider';

export const communicationProvider =
  env.dataSource === 'mock'
    ? mockCommunicationProvider
    : apiCommunicationProvider;
