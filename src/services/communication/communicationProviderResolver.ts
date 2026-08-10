import { selectRepository } from '../integration/integrationMode';
import { apiCommunicationProvider } from './apiCommunicationProvider';
import { mockCommunicationProvider } from './mockCommunicationProvider';

export const communicationProvider = selectRepository({
  live: apiCommunicationProvider,
  mock: mockCommunicationProvider,
  module: 'communication',
  unsupported: apiCommunicationProvider,
});
