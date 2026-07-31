import { useAuthStore, useFeeSetupStore, useUserManagementStore } from '../store';
import {
  canApplyAmountOverride,
  canApplyExemption,
  canManageDiscountDefinitions,
  canManageFeeHeads,
  canManageFineRules,
  canManageFeeStructures,
  canManageStudentFeeAssignments,
  canViewFeeSetup,
} from '../utils/feePermissions';
import { getEffectivePermissions } from '../utils/effectivePermissions';

export function useFeeSetupAccess(schoolId: string, branchId?: string) {
  const membership = useAuthStore(state => state.activeMembership);
  const configuration = useUserManagementStore(
    state => state.roleConfiguration,
  );
  const sessionStatus = useFeeSetupStore(state => state.sessionStatus);
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
    canExempt:
      Boolean(membership && branchId) &&
      canApplyExemption(
        membership!,
        permissions,
        schoolId,
        branchId!,
        sessionStatus,
      ),
    canManageAssignments:
      Boolean(membership && branchId) &&
      canManageStudentFeeAssignments(
        membership!,
        permissions,
        schoolId,
        branchId!,
        sessionStatus,
      ),
    canManageDiscounts:
      Boolean(membership) &&
      canManageDiscountDefinitions(
        membership!,
        permissions,
        schoolId,
        sessionStatus,
      ),
    canManageFineRules:
      Boolean(membership) &&
      canManageFineRules(membership!, permissions, schoolId, sessionStatus),
    canManageHeads:
      Boolean(membership) &&
      canManageFeeHeads(membership!, permissions, schoolId, sessionStatus),
    canManageStructures:
      Boolean(membership && branchId) &&
      canManageFeeStructures(
        membership!,
        permissions,
        schoolId,
        branchId!,
        sessionStatus,
      ),
    canOverride:
      Boolean(membership && branchId) &&
      canApplyAmountOverride(
        membership!,
        permissions,
        schoolId,
        branchId!,
        sessionStatus,
      ),
    canView:
      Boolean(membership) &&
      canViewFeeSetup(membership!, permissions, schoolId, branchId),
    isClosed: sessionStatus === 'CLOSED',
  };
}
