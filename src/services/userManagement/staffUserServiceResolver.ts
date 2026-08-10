import { selectRepository, unsupportedOperation } from '../integration/integrationMode';
import { liveStaffUserService } from './liveStaffUserService';
import type { StaffUserService } from './staffUserService';

const unsupportedStaffUserService: StaffUserService = {
  createStaff: async () => unsupportedOperation('staff', 'createStaff'),
  getStaff: async () => unsupportedOperation('staff', 'getStaff'),
  listStaff: async () => unsupportedOperation('staff', 'listStaff'),
  setStaffStatus: async () => unsupportedOperation('staff', 'setStaffStatus'),
  updateStaff: async () => unsupportedOperation('staff', 'updateStaff'),
};

export function resolveStaffUserService(): StaffUserService {
  return selectRepository({
    live: liveStaffUserService,
    mock: unsupportedStaffUserService,
    module: 'staff',
    unsupported: unsupportedStaffUserService,
  });
}

export const staffUserService = resolveStaffUserService();
