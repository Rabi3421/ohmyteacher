import { useAuthStore, useUserManagementStore } from '../store';
import { getEffectivePermissions } from '../utils/effectivePermissions';

export function useCommunicationAccess(schoolId: string, branchId?: string) {
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
  const tenant =
    Boolean(membership) &&
    (membership?.role === 'SUPER_ADMIN' || membership?.schoolId === schoolId);
  const branch =
    !branchId || !membership?.branchId || membership.branchId === branchId;
  const has = (key: (typeof permissions)[number]) =>
    tenant && branch && permissions.includes(key);
  return {
    canManageReminders: has('communication.reminders.manage'),
    canManageSettings: has('communication.settings.manage'),
    canManageTemplates: has('communication.templates.manage'),
    canRetry: has('communication.failed.retry'),
    canSendBulk: has('communication.send.bulk'),
    canSendManual: has('communication.send.manual'),
    canViewHistory: has('communication.history.view'),
    canViewNotifications: has('notifications.view'),
    canViewReminders: has('communication.reminders.view'),
    canViewSettings: has('communication.settings.view'),
    canViewTemplates: has('communication.templates.view'),
  };
}
