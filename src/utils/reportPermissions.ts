import type { PermissionKey } from '../constants/userPermissions';

const has = (permissions: readonly PermissionKey[], key: PermissionKey) =>
  permissions.includes(key);

export const canViewReportsDashboard = (
  permissions: readonly PermissionKey[],
) => has(permissions, 'reports.dashboard.view');
export const canViewStudentReports = (permissions: readonly PermissionKey[]) =>
  has(permissions, 'reports.students.view');
export const canViewFeeReports = (permissions: readonly PermissionKey[]) =>
  has(permissions, 'fee_reports.view');
export const canViewCollectionReports = (
  permissions: readonly PermissionKey[],
) => has(permissions, 'reports.collections.view');
export const canViewExaminationReports = (
  permissions: readonly PermissionKey[],
) => has(permissions, 'exam_reports.view');
export const canViewCommunicationReports = (
  permissions: readonly PermissionKey[],
) => has(permissions, 'reports.communication.view');
export const canViewAuditReports = (permissions: readonly PermissionKey[]) =>
  has(permissions, 'reports.audit.view');
export const canExportFeeReports = (permissions: readonly PermissionKey[]) =>
  has(permissions, 'fee_reports.export');
export const canExportExaminationReports = (
  permissions: readonly PermissionKey[],
) => has(permissions, 'exam_reports.export');
export const canManageSavedReportFilters = (
  permissions: readonly PermissionKey[],
) => has(permissions, 'reports.saved_filters.manage');
export const canViewExportHistory = (permissions: readonly PermissionKey[]) =>
  has(permissions, 'reports.export_history.view');
