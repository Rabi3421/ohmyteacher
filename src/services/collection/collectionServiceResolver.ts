import { env } from '../../config/env';
import { apiCollectionService } from './apiCollectionService';
import { mockCollectionService } from './mockCollectionService';
export const collectionService =
  env.dataSource === 'api' ? apiCollectionService : mockCollectionService;
