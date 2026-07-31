import type { ExamStatus } from '../models/examination';
import type { MarkSheetStatus } from '../models/marksResult';
import type { AcademicSessionStatus } from '../models/organization';
import { useAuthStore, useUserManagementStore } from '../store';
import { getEffectivePermissions } from '../utils/effectivePermissions';
import * as access from '../utils/marksResultPermissions';

export function useMarksResultAccess(input: {
  schoolId: string;
  branchId?: string;
  sessionStatus?: AcademicSessionStatus;
  examStatus?: ExamStatus;
  markSheetStatus?: MarkSheetStatus;
  hasActivePublication?: boolean;
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
    canCalculateResults: access.canCalculateResults(context),
    canEnterMarks: access.canEnterMarks(context),
    canExemptStudent: access.canExemptStudent(context),
    canLockMarks: access.canLockMarks(context),
    canPublishResults: access.canPublishResults(context),
    canReturnMarksToDraft: access.canReturnMarksToDraft(context),
    canReviewResults: access.canReviewResults(context),
    canSubmitMarks: access.canSubmitMarks(context),
    canUnlockMarks: access.canUnlockMarks(context),
    canUnpublishResults: access.canUnpublishResults(context),
    canViewMarks: access.canViewMarks(context),
    canViewMarksHistory: access.canViewMarksHistory(context),
    canViewPublicationHistory: access.canViewPublicationHistory(context),
    canViewRankList: access.canViewRankList(context),
    canViewResults: access.canViewResults(context),
  };
}
