import type { AppRole } from '../constants/permissions';
import type { PermissionKey } from '../constants/userPermissions';
import type {
  SchoolRoleConfiguration,
} from '../models/userManagement';
import { getBaseRoleDefinition } from '../services/userManagement/roleDefinitions';

export function getEffectivePermissions(
  role: AppRole,
  configuration?: SchoolRoleConfiguration | null,
): PermissionKey[] {
  const definition = getBaseRoleDefinition(role);
  const permissions = new Set<PermissionKey>(definition.defaultPermissions);
  configuration?.enabledPermissions.forEach(permission =>
    permissions.add(permission),
  );
  configuration?.disabledPermissions.forEach(permission =>
    permissions.delete(permission),
  );
  definition.prohibitedPermissions.forEach(permission =>
    permissions.delete(permission),
  );
  return [...permissions];
}

export function hasPermission(
  permissions: readonly PermissionKey[],
  permission: PermissionKey,
): boolean {
  return permissions.includes(permission);
}

export function hasAnyPermission(
  permissions: readonly PermissionKey[],
  requested: readonly PermissionKey[],
): boolean {
  return requested.some(permission => permissions.includes(permission));
}

export function hasAllPermissions(
  permissions: readonly PermissionKey[],
  requested: readonly PermissionKey[],
): boolean {
  return requested.every(permission => permissions.includes(permission));
}
