import {
  useAcademicStore,
  useAuthStore,
  useUserManagementStore,
} from '../store';
import {
  canAssignClassSubjects,
  canManageClasses,
  canManageSections,
  canManageSubjects,
} from '../utils/academicPermissions';
import { getEffectivePermissions } from '../utils/effectivePermissions';

export function useAcademicAccess(schoolId: string, branchId?: string) {
  const membership = useAuthStore(state => state.activeMembership);
  const configuration = useUserManagementStore(
    state => state.roleConfiguration,
  );
  const sessionStatus = useAcademicStore(state => state.sessionStatus);
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
    canAssign:
      Boolean(membership && branchId) &&
      canAssignClassSubjects(
        membership!,
        permissions,
        schoolId,
        branchId!,
        sessionStatus,
      ),
    canManageClasses:
      Boolean(membership && branchId) &&
      canManageClasses(
        membership!,
        permissions,
        schoolId,
        branchId!,
        sessionStatus,
      ),
    canManageSections:
      Boolean(membership && branchId) &&
      canManageSections(
        membership!,
        permissions,
        schoolId,
        branchId!,
        sessionStatus,
      ),
    canManageSubjects:
      Boolean(membership) &&
      canManageSubjects(membership!, permissions, schoolId) &&
      sessionStatus !== 'CLOSED',
    isClosed: sessionStatus === 'CLOSED',
  };
}
