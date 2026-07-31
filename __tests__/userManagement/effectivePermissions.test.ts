import { PERMISSION_KEYS } from '../../src/constants/userPermissions';
import type { AppRole } from '../../src/constants/permissions';
import {
  getEffectivePermissions,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from '../../src/utils/effectivePermissions';
import { getBaseRoleDefinition } from '../../src/services/userManagement/roleDefinitions';

describe('role permission matrix', () => {
  it.each([
    'SUPER_ADMIN',
    'SCHOOL_ADMIN',
    'BRANCH_ADMIN',
    'ACCOUNTANT',
    'RECEPTIONIST',
    'PARENT',
    'STUDENT',
  ] as AppRole[])('defines defaults and boundaries for %s', role => {
    const definition = getBaseRoleDefinition(role);
    expect(definition.role).toBe(role);
    expect(definition.defaultPermissions.length).toBeGreaterThan(0);
    expect(definition.isSystemRole).toBe(true);
  });

  it('gives Super Admin and School Admin the fixed release permission set', () => {
    expect(getEffectivePermissions('SUPER_ADMIN')).toEqual([
      ...PERMISSION_KEYS,
    ]);
    expect(getEffectivePermissions('SCHOOL_ADMIN')).toEqual([
      ...PERMISSION_KEYS,
    ]);
  });

  it('applies allowed school overrides before prohibited permissions', () => {
    const permissions = getEffectivePermissions('ACCOUNTANT', {
      disabledPermissions: ['receipts.share'],
      enabledPermissions: [
        'fee_reports.export',
        'fees.discount.manage',
        'exams.manage',
      ],
      role: 'ACCOUNTANT',
      schoolId: 'school-omt',
      updatedAt: '2026-07-20T10:00:00.000Z',
    });
    expect(permissions).toContain('fee_reports.export');
    expect(permissions).toContain('fees.discount.manage');
    expect(permissions).not.toContain('receipts.share');
    expect(permissions).not.toContain('exams.manage');
  });

  it('never grants Accountant examination permissions', () => {
    const permissions = getEffectivePermissions('ACCOUNTANT');
    expect(
      permissions.some(
        permission =>
          permission.startsWith('exams.') ||
          permission.startsWith('marks.') ||
          permission.startsWith('results.'),
      ),
    ).toBe(false);
  });

  it('never grants Receptionist receipt cancellation or user management', () => {
    const permissions = getEffectivePermissions('RECEPTIONIST', {
      disabledPermissions: [],
      enabledPermissions: ['payments.collect', 'receipts.cancel'],
      role: 'RECEPTIONIST',
      schoolId: 'school-omt',
      updatedAt: '2026-07-20T10:00:00.000Z',
    });
    expect(permissions).toContain('payments.collect');
    expect(permissions).not.toContain('receipts.cancel');
    expect(permissions.some(permission => permission.startsWith('users.'))).toBe(
      false,
    );
  });

  it('supports single, any, and all permission checks', () => {
    const permissions = getEffectivePermissions('ACCOUNTANT');
    expect(hasPermission(permissions, 'payments.collect')).toBe(true);
    expect(
      hasAnyPermission(permissions, ['exams.manage', 'payments.collect']),
    ).toBe(true);
    expect(
      hasAllPermissions(permissions, ['fees.view', 'payments.collect']),
    ).toBe(true);
    expect(
      hasAllPermissions(permissions, ['fees.view', 'exams.manage']),
    ).toBe(false);
  });
});
