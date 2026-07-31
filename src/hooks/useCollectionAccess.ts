import {
  useAuthStore,
  useCollectionStore,
  useUserManagementStore,
} from '../store';
import {
  canCollectPayment,
  canManageAdvanceCredit,
  canReversePayment,
  canViewAdvanceCredit,
  canViewDailyCollection,
  canViewPayments,
  canViewReceipts,
  canViewStudentLedger,
} from '../utils/collectionPermissions';
import { getEffectivePermissions } from '../utils/effectivePermissions';

export function useCollectionAccess(schoolId: string, branchId: string) {
  const membership = useAuthStore(state => state.activeMembership);
  const configuration = useUserManagementStore(
    state => state.roleConfiguration,
  );
  const sessionStatus = useCollectionStore(state => state.sessionStatus);
  const permissions = membership
    ? getEffectivePermissions(
        membership.role,
        configuration?.role === membership.role &&
          configuration.schoolId === membership.schoolId
          ? configuration
          : null,
      )
    : [];
  const check = <T extends unknown[]>(
    fn: (
      member: NonNullable<typeof membership>,
      permissions: PermissionKeyArray,
      ...args: T
    ) => boolean,
    ...args: T
  ) => Boolean(membership) && fn(membership!, permissions, ...args);
  return {
    canApplyAdvance: check(
      canManageAdvanceCredit,
      schoolId,
      branchId,
      sessionStatus,
    ),
    canCollect: check(canCollectPayment, schoolId, branchId, sessionStatus),
    canReverse: check(canReversePayment, schoolId, branchId, sessionStatus),
    canViewAdvance: check(canViewAdvanceCredit, schoolId, branchId),
    canViewDaily: check(canViewDailyCollection, schoolId, branchId),
    canViewLedger: check(canViewStudentLedger, schoolId, branchId),
    canViewPayments: check(canViewPayments, schoolId, branchId),
    canViewReceipts: check(canViewReceipts, schoolId, branchId),
    isClosed: sessionStatus === 'CLOSED',
  };
}

type PermissionKeyArray = ReturnType<typeof getEffectivePermissions>;
