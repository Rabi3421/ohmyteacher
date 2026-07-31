import type { AppRole } from '../constants/permissions';
import type { PermissionKey } from '../constants/userPermissions';
import type { UserMembership } from '../models/auth';

export interface ExaminationAccessContext {
  membership: UserMembership | null;
  permissions: readonly PermissionKey[];
  schoolId: string;
  branchId?: string;
  sessionStatus?: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
  examStatus?:
    | 'DRAFT'
    | 'SCHEDULED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED';
}

function inScope(context: ExaminationAccessContext): boolean {
  const member = context.membership;
  if (
    !member ||
    !['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(member.role)
  )
    return false;
  if (member.role !== 'SUPER_ADMIN' && member.schoolId !== context.schoolId)
    return false;
  return (
    !context.branchId ||
    member.role !== 'BRANCH_ADMIN' ||
    member.branchId === context.branchId
  );
}

function has(
  context: ExaminationAccessContext,
  permission: PermissionKey,
): boolean {
  return inScope(context) && context.permissions.includes(permission);
}

function mutable(context: ExaminationAccessContext): boolean {
  return (
    context.sessionStatus !== 'CLOSED' && context.examStatus !== 'CANCELLED'
  );
}

export const canViewExaminationSetup = (context: ExaminationAccessContext) =>
  has(context, 'exams.view');
export const canManageExamTerms = (context: ExaminationAccessContext) =>
  mutable(context) && has(context, 'exams.terms.manage');
export const canManageExamTypes = (context: ExaminationAccessContext) =>
  mutable(context) && has(context, 'exams.types.manage');
export const canManageGradingSchemes = (context: ExaminationAccessContext) =>
  mutable(context) && has(context, 'exams.grading.manage');
export const canCreateExam = (context: ExaminationAccessContext) =>
  mutable(context) && has(context, 'exams.manage');
export const canEditExam = (context: ExaminationAccessContext) =>
  mutable(context) &&
  context.examStatus === 'DRAFT' &&
  has(context, 'exams.manage');
export const canManageExamClasses = canEditExam;
export const canManageExamPapers = canEditExam;
export const canManageExamSchedule = (context: ExaminationAccessContext) =>
  mutable(context) &&
  context.examStatus === 'DRAFT' &&
  has(context, 'exams.schedule.manage');
export const canScheduleExam = canManageExamSchedule;
export const canReturnExamToDraft = (context: ExaminationAccessContext) =>
  mutable(context) &&
  context.examStatus === 'SCHEDULED' &&
  has(context, 'exams.schedule.manage');
export const canCancelExam = (context: ExaminationAccessContext) =>
  mutable(context) &&
  ['DRAFT', 'SCHEDULED'].includes(context.examStatus ?? '') &&
  has(context, 'exams.cancel');
// Copying from a historical closed Session is allowed. The destination
// Session is independently checked by the service and must be mutable.
export const canCopyExam = (context: ExaminationAccessContext) =>
  has(context, 'exams.manage');

export function isExaminationRole(role: AppRole): boolean {
  return (
    role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN' || role === 'BRANCH_ADMIN'
  );
}
