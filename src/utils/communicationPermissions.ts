import type { AppRole } from '../constants/permissions';
import type { PermissionKey } from '../constants/userPermissions';

export function hasCommunicationPermission(
  permissions: PermissionKey[],
  permission: PermissionKey,
): boolean {
  return permissions.includes(permission);
}

export function canAccessOwnedNotification(input: {
  role: AppRole;
  audienceId: string;
  activeMembershipId: string;
}): boolean {
  if (input.role === 'PARENT' || input.role === 'STUDENT')
    return input.audienceId === input.activeMembershipId;
  return false;
}

export function canSendManualCommunication(
  permissions: PermissionKey[],
): boolean {
  return hasCommunicationPermission(permissions, 'communication.send.manual');
}

export function canManageCommunicationTemplates(
  permissions: PermissionKey[],
): boolean {
  return hasCommunicationPermission(
    permissions,
    'communication.templates.manage',
  );
}
