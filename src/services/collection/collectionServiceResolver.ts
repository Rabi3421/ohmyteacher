import { selectRepository } from '../integration/integrationMode';
import { apiCollectionService } from './apiCollectionService';
import { mockCollectionService } from './mockCollectionService';
export const collectionService = selectRepository({
  live: apiCollectionService,
  mock: mockCollectionService,
  module: 'collections',
  unsupported: apiCollectionService,
});
