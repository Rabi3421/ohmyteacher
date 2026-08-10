import { useAuthStore, useCurrentFeeConfigurationStore } from '../store';

export function useFeeSetupAccess(schoolId: string, branchId?: string) {
  const membership = useAuthStore(state => state.activeMembership);
  const sessionStatus = useCurrentFeeConfigurationStore(
    state => state.sessionStatus,
  );
  const inSchool = Boolean(
    membership?.schoolId === schoolId &&
      ['SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(membership.role),
  );
  const inBranch = Boolean(
    inSchool &&
      (!branchId ||
        membership?.role === 'SCHOOL_ADMIN' ||
        membership?.branchId === branchId),
  );
  const writable = sessionStatus !== 'CLOSED';
  return {
    canExempt: false,
    canManageAssignments: false,
    canManageDiscounts: false,
    canManageFineRules: false,
    canManageHeads: Boolean(inSchool && membership?.role === 'SCHOOL_ADMIN' && writable),
    canManageStructures: Boolean(inBranch && writable),
    canOverride: false,
    canView: inBranch,
    isClosed: sessionStatus === 'CLOSED',
  };
}
