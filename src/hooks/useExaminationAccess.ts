import type { ExamStatus } from '../models/examination';
import type { AcademicSessionStatus } from '../models/organization';
import { useAuthStore, useUserManagementStore } from '../store';
import { getEffectivePermissions } from '../utils/effectivePermissions';
import {
  canCancelExam,
  canCopyExam,
  canCreateExam,
  canEditExam,
  canManageExamClasses,
  canManageExamPapers,
  canManageExamSchedule,
  canManageExamTerms,
  canManageExamTypes,
  canManageGradingSchemes,
  canReturnExamToDraft,
  canScheduleExam,
  canViewExaminationSetup,
} from '../utils/examinationPermissions';

export function useExaminationAccess(input: {
  schoolId: string;
  branchId?: string;
  sessionStatus?: AcademicSessionStatus;
  examStatus?: ExamStatus;
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
    canCancelExam: canCancelExam(context),
    canCopyExam: canCopyExam(context),
    canCreateExam: canCreateExam(context),
    canEditExam: canEditExam(context),
    canManageExamClasses: canManageExamClasses(context),
    canManageExamPapers: canManageExamPapers(context),
    canManageExamSchedule: canManageExamSchedule(context),
    canManageExamTerms: canManageExamTerms(context),
    canManageExamTypes: canManageExamTypes(context),
    canManageGradingSchemes: canManageGradingSchemes(context),
    canReturnExamToDraft: canReturnExamToDraft(context),
    canScheduleExam: canScheduleExam(context),
    canViewExaminationSetup: canViewExaminationSetup(context),
  };
}
