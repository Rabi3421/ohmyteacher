import type { PermissionKey } from '../constants/userPermissions';
import type { UserMembership } from '../models/auth';
import type { AcademicSessionStatus } from '../models/organization';

export interface ReportCardAccessContext {
  membership: UserMembership | null;
  permissions: readonly PermissionKey[];
  schoolId: string;
  branchId?: string;
  sessionStatus?: AcademicSessionStatus;
  linkedStudentIds?: readonly string[];
  studentId?: string;
}

function staffInScope(context: ReportCardAccessContext): boolean {
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

const has = (context: ReportCardAccessContext, permission: PermissionKey) =>
  staffInScope(context) && context.permissions.includes(permission);

export const canViewReportCards = (c: ReportCardAccessContext) =>
  has(c, 'report_cards.view');
export const canManageReportCardTemplates = (c: ReportCardAccessContext) =>
  !!c.membership &&
  ['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(c.membership.role) &&
  has(c, 'report_cards.templates.manage');
export const canGenerateReportCards = (c: ReportCardAccessContext) =>
  c.sessionStatus !== 'CLOSED' && has(c, 'report_cards.generate');
export const canRevokeReportCard = (c: ReportCardAccessContext) =>
  c.sessionStatus !== 'CLOSED' && has(c, 'report_cards.revoke');
export const canViewReportCardHistory = (c: ReportCardAccessContext) =>
  has(c, 'report_cards.history.view');
export const canShareReportCard = (c: ReportCardAccessContext) =>
  has(c, 'report_cards.share');
export const canSendResultCommunication = (c: ReportCardAccessContext) =>
  has(c, 'results.communication.send');

export const canParentViewPublishedResult = (c: ReportCardAccessContext) =>
  c.membership?.role === 'PARENT' &&
  c.membership.schoolId === c.schoolId &&
  c.permissions.includes('results.self_service.view') &&
  !!c.studentId &&
  (c.linkedStudentIds ?? [c.membership.studentId]).includes(c.studentId);
export const canParentViewReportCard = canParentViewPublishedResult;
export const canStudentViewPublishedResult = (c: ReportCardAccessContext) =>
  c.membership?.role === 'STUDENT' &&
  c.membership.schoolId === c.schoolId &&
  c.permissions.includes('results.self_service.view') &&
  !!c.studentId &&
  c.membership.studentId === c.studentId;
export const canStudentViewReportCard = canStudentViewPublishedResult;
