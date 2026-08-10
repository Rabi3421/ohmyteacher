import { selectRepository } from '../integration/integrationMode';
import { apiCommunicationService } from './apiCommunicationService';
import { mockCommunicationService } from './mockCommunicationService';

export const communicationService = selectRepository({
  live: apiCommunicationService,
  mock: mockCommunicationService,
  module: 'communication',
  unsupported: apiCommunicationService,
});
