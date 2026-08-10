import type { ApiResponse } from '../../models/common';
import type {
  CreateLiveStaffInput,
  LiveStaffCollection,
  LiveStaffListQuery,
  LiveStaffStatus,
  LiveStaffUser,
  UpdateLiveStaffInput,
} from '../../models/liveStaff';

export interface StaffRequestOptions {
  signal?: AbortSignal;
}

export interface StaffUserService {
  listStaff(
    query?: LiveStaffListQuery,
    options?: StaffRequestOptions,
  ): Promise<ApiResponse<LiveStaffCollection>>;
  getStaff(
    staffId: string,
    options?: StaffRequestOptions,
  ): Promise<ApiResponse<LiveStaffUser>>;
  createStaff(input: CreateLiveStaffInput): Promise<ApiResponse<LiveStaffUser>>;
  updateStaff(
    staffId: string,
    input: UpdateLiveStaffInput,
  ): Promise<ApiResponse<LiveStaffUser>>;
  setStaffStatus(
    staffId: string,
    status: LiveStaffStatus,
  ): Promise<ApiResponse<LiveStaffUser>>;
}
