import { selectRepository } from '../integration/integrationMode';
import { apiFeeDueService } from './apiFeeDueService';
import { mockFeeDueService } from './mockFeeDueService';

export const feeDueService = selectRepository({
  live: apiFeeDueService,
  mock: mockFeeDueService,
  module: 'fee-dues',
  unsupported: apiFeeDueService,
});
