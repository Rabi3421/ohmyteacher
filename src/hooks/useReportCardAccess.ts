import type { AcademicSessionStatus } from '../models/organization';
import { useAuthStore, useUserManagementStore } from '../store';
import { getEffectivePermissions } from '../utils/effectivePermissions';
import * as access from '../utils/reportCardPermissions';

export function useReportCardAccess(input: {
  schoolId: string;
  branchId?: string;
  sessionStatus?: AcademicSessionStatus;
  linkedStudentIds?: readonly string[];
  studentId?: string;
}) {
  const membership = useAuthStore(state => state.activeMembership);
  const configuration = useUserManagementStore(
    state => state.roleConfiguration,
  );
  const permissions = membership
    ? getEffectivePermissions(
        membership.role,
        configuration?.role === membership.role &&
          configuration.schoolId === membership.schoolId
          ? configuration
          : null,
      )
    : [];
  const context = { ...input, membership, permissions };
  return {
    canGenerateReportCards: access.canGenerateReportCards(context),
    canManageReportCardTemplates: access.canManageReportCardTemplates(context),
    canParentViewPublishedResult: access.canParentViewPublishedResult(context),
    canParentViewReportCard: access.canParentViewReportCard(context),
    canRevokeReportCard: access.canRevokeReportCard(context),
    canSendResultCommunication: access.canSendResultCommunication(context),
    canShareReportCard: access.canShareReportCard(context),
    canStudentViewPublishedResult:
      access.canStudentViewPublishedResult(context),
    canStudentViewReportCard: access.canStudentViewReportCard(context),
    canViewReportCardHistory: access.canViewReportCardHistory(context),
    canViewReportCards: access.canViewReportCards(context),
  };
}
