import { useAuthStore, useFeeDueStore, useUserManagementStore } from '../store';
import {
  canCancelFeeDue,
  canGenerateFeeDues,
  canRefreshFeeFines,
  canViewFeeDues,
  canViewGenerationHistory,
  canWaiveFeeDue,
  canWaiveFeeFine,
} from '../utils/feeDuePermissions';
import { getEffectivePermissions } from '../utils/effectivePermissions';

export function useFeeDueAccess(schoolId: string, branchId: string) {
  const membership = useAuthStore(state => state.activeMembership);
  const configuration = useUserManagementStore(state => state.roleConfiguration);
  const sessionStatus = useFeeDueStore(state => state.sessionStatus);
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
    canCancel: Boolean(membership) && canCancelFeeDue(membership!, permissions, schoolId, branchId, sessionStatus),
    canGenerate: Boolean(membership) && canGenerateFeeDues(membership!, permissions, schoolId, branchId, sessionStatus),
    canRefreshFine: Boolean(membership) && canRefreshFeeFines(membership!, permissions, schoolId, branchId, sessionStatus),
    canView: Boolean(membership) && canViewFeeDues(membership!, permissions, schoolId, branchId),
    canViewHistory: Boolean(membership) && canViewGenerationHistory(membership!, permissions, schoolId, branchId),
    canWaiveDue: Boolean(membership) && canWaiveFeeDue(membership!, permissions, schoolId, branchId, sessionStatus),
    canWaiveFine: Boolean(membership) && canWaiveFeeFine(membership!, permissions, schoolId, branchId, sessionStatus),
    isClosed: sessionStatus === 'CLOSED',
  };
}
