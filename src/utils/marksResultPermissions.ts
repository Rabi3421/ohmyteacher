import type { PermissionKey } from '../constants/userPermissions';
import type { UserMembership } from '../models/auth';
import type { ExamStatus } from '../models/examination';
import type { MarkSheetStatus } from '../models/marksResult';
import type { AcademicSessionStatus } from '../models/organization';

export interface MarksResultAccessContext {
  membership: UserMembership | null;
  permissions: readonly PermissionKey[];
  schoolId: string;
  branchId?: string;
  sessionStatus?: AcademicSessionStatus;
  examStatus?: ExamStatus;
  markSheetStatus?: MarkSheetStatus;
  hasActivePublication?: boolean;
}

function inScope(context: MarksResultAccessContext): boolean {
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

function has(context: MarksResultAccessContext, permission: PermissionKey) {
  return inScope(context) && context.permissions.includes(permission);
}

function mutable(context: MarksResultAccessContext) {
  return (
    context.sessionStatus !== 'CLOSED' &&
    !['DRAFT', 'CANCELLED'].includes(context.examStatus ?? '')
  );
}

export const canViewMarks = (c: MarksResultAccessContext) =>
  has(c, 'marks.view');
export const canEnterMarks = (c: MarksResultAccessContext) =>
  mutable(c) &&
  ['NOT_STARTED', 'DRAFT'].includes(c.markSheetStatus ?? 'NOT_STARTED') &&
  has(c, 'marks.enter');
export const canSubmitMarks = (c: MarksResultAccessContext) =>
  mutable(c) && c.markSheetStatus === 'DRAFT' && has(c, 'marks.submit');
export const canReturnMarksToDraft = (c: MarksResultAccessContext) =>
  mutable(c) &&
  !c.hasActivePublication &&
  c.markSheetStatus === 'SUBMITTED' &&
  has(c, 'marks.submit');
export const canLockMarks = (c: MarksResultAccessContext) =>
  mutable(c) && c.markSheetStatus === 'SUBMITTED' && has(c, 'marks.lock');
export const canUnlockMarks = (c: MarksResultAccessContext) =>
  mutable(c) &&
  !c.hasActivePublication &&
  c.markSheetStatus === 'LOCKED' &&
  has(c, 'marks.unlock');
export const canExemptStudent = (c: MarksResultAccessContext) =>
  canEnterMarks(c) && has(c, 'marks.exempt');
export const canViewMarksHistory = (c: MarksResultAccessContext) =>
  has(c, 'marks.history.view');
export const canViewResults = (c: MarksResultAccessContext) =>
  has(c, 'results.view');
export const canCalculateResults = (c: MarksResultAccessContext) =>
  mutable(c) && has(c, 'results.calculate');
export const canReviewResults = (c: MarksResultAccessContext) =>
  mutable(c) && has(c, 'results.review');
export const canPublishResults = (c: MarksResultAccessContext) =>
  mutable(c) && !c.hasActivePublication && has(c, 'results.publish');
export const canUnpublishResults = (c: MarksResultAccessContext) =>
  mutable(c) && !!c.hasActivePublication && has(c, 'results.unpublish');
export const canViewRankList = (c: MarksResultAccessContext) =>
  has(c, 'results.rank.view');
export const canViewPublicationHistory = (c: MarksResultAccessContext) =>
  has(c, 'results.publication_history.view');
