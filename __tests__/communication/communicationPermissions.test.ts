import { APP_ROLES } from '../../src/constants/permissions';
import { getEffectivePermissions } from '../../src/utils/effectivePermissions';

describe('Communication permissions', () => {
  it('keeps Teacher absent and grants full selected-School Admin access', () => {
    expect(APP_ROLES).not.toContain('TEACHER');
    for (const role of ['SUPER_ADMIN', 'SCHOOL_ADMIN'] as const) {
      const permissions = getEffectivePermissions(role);
      expect(permissions).toEqual(
        expect.arrayContaining([
          'communication.templates.manage',
          'communication.settings.manage',
          'communication.reminders.manage',
          'communication.send.bulk',
          'communication.failed.retry',
          'notifications.view',
        ]),
      );
    }
  });

  it('gives Branch Admin view/manual/history defaults with optional elevated actions', () => {
    const permissions = getEffectivePermissions('BRANCH_ADMIN');
    expect(permissions).toEqual(
      expect.arrayContaining([
        'communication.templates.view',
        'communication.reminders.view',
        'communication.send.manual',
        'communication.history.view',
        'notifications.view',
      ]),
    );
    expect(permissions).not.toContain('communication.send.bulk');
    expect(permissions).not.toContain('communication.reminders.manage');
  });

  it('lets Accountant share manually but never manage Templates/Rules by default', () => {
    const permissions = getEffectivePermissions('ACCOUNTANT');
    expect(permissions).toEqual(
      expect.arrayContaining([
        'communication.send.manual',
        'communication.history.view',
        'notifications.view',
      ]),
    );
    expect(permissions).not.toContain('communication.templates.manage');
    expect(permissions).not.toContain('communication.reminders.manage');
  });

  it('keeps Receptionist Communication optional and Parent/Student notifications self-scoped', () => {
    expect(getEffectivePermissions('RECEPTIONIST')).not.toContain(
      'communication.send.manual',
    );
    expect(getEffectivePermissions('PARENT')).toContain('notifications.view');
    expect(getEffectivePermissions('STUDENT')).toContain('notifications.view');
  });
});
