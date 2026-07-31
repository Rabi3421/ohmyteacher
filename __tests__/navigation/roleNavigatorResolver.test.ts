import { APP_ROLES } from '../../src/constants/permissions';
import { getNavigatorForRole } from '../../src/navigation/roleNavigatorResolver';

describe('role navigator resolver', () => {
  it.each([
    ['SUPER_ADMIN', 'SuperAdminNavigator'],
    ['SCHOOL_ADMIN', 'SchoolAdminNavigator'],
    ['BRANCH_ADMIN', 'BranchAdminNavigator'],
    ['ACCOUNTANT', 'AccountantNavigator'],
    ['RECEPTIONIST', 'ReceptionistNavigator'],
    ['PARENT', 'ParentNavigator'],
    ['STUDENT', 'StudentNavigator'],
  ] as const)('resolves %s', (role, navigator) => {
    expect(getNavigatorForRole(role)).toBe(navigator);
  });

  it('covers every supported application role', () => {
    expect(APP_ROLES.every(role => getNavigatorForRole(role) !== null)).toBe(
      true,
    );
  });

  it('fails safely for an unknown role', () => {
    expect(getNavigatorForRole('TEACHER')).toBeNull();
  });
});
