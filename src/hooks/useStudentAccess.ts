import { useAuthStore, useStudentStore, useUserManagementStore } from '../store';
import {
  canCreateStudent,
  canEditStudent,
  canManageGuardians,
  canManageStudentAccess,
  canManageStudentStatus,
  canTransferStudent,
  canViewStudentHistory,
} from '../utils/studentPermissions';
import { getEffectivePermissions } from '../utils/effectivePermissions';

export function useStudentAccess(schoolId: string, branchId?: string) {
  const membership = useAuthStore(state => state.activeMembership);
  const configuration = useUserManagementStore(
    state => state.roleConfiguration,
  );
  const currentBranchId = useStudentStore(
    state => state.currentStudent?.currentEnrollment?.branchId,
  );
  const scopedBranch = branchId ?? currentBranchId;
  const permissions = membership
    ? getEffectivePermissions(
        membership.role,
        configuration?.role === membership.role &&
          configuration.schoolId === membership.schoolId
          ? configuration
          : null,
      )
    : [];
  return {
    canCreate:
      Boolean(membership) &&
      canCreateStudent(membership!, permissions, schoolId, scopedBranch),
    canEdit:
      Boolean(membership) &&
      canEditStudent(membership!, permissions, schoolId, scopedBranch),
    canManageAccess:
      Boolean(membership) &&
      canManageStudentAccess(
        membership!,
        permissions,
        schoolId,
        scopedBranch,
      ),
    canManageGuardians:
      Boolean(membership) &&
      canManageGuardians(
        membership!,
        permissions,
        schoolId,
        scopedBranch,
      ),
    canManageStatus:
      Boolean(membership) &&
      canManageStudentStatus(
        membership!,
        permissions,
        schoolId,
        scopedBranch,
      ),
    canTransfer:
      Boolean(membership) &&
      canTransferStudent(
        membership!,
        permissions,
        schoolId,
        scopedBranch,
        scopedBranch,
      ),
    canViewHistory:
      Boolean(membership) &&
      canViewStudentHistory(
        membership!,
        permissions,
        schoolId,
        scopedBranch,
      ),
  };
}
