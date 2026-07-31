import type { PermissionKey } from '../../src/constants/userPermissions';
import type { UserMembership } from '../../src/models/auth';
import {
  canCancelFeeDue,
  canGenerateFeeDues,
  canRefreshFeeFines,
  canViewFeeDues,
  canViewGenerationHistory,
  canWaiveFeeDue,
  canWaiveFeeFine,
} from '../../src/utils/feeDuePermissions';

const membership = (
  role: UserMembership['role'],
  patch: Partial<UserMembership> = {},
): UserMembership => ({
  branchId: 'branch-main',
  id: `membership-${role}`,
  role,
  schoolId: 'school-omt',
  status: 'ACTIVE',
  userId: `user-${role}`,
  ...patch,
});
const permissions = (...values: PermissionKey[]) => values;

describe('Fee Due permissions', () => {
  it('allows Super Admin across tenants and branches', () => {
    expect(
      canGenerateFeeDues(
        membership('SUPER_ADMIN', {
          branchId: undefined,
          schoolId: undefined,
        }),
        [],
        'another-school',
        'another-branch',
        'ACTIVE',
      ),
    ).toBe(true);
  });

  it('allows School Admin in its own school', () => {
    expect(
      canCancelFeeDue(
        membership('SCHOOL_ADMIN', { branchId: undefined }),
        [],
        'school-omt',
        'branch-other',
        'ACTIVE',
      ),
    ).toBe(true);
  });

  it('requires branch scope for branch staff', () => {
    expect(
      canViewFeeDues(
        membership('BRANCH_ADMIN'),
        permissions('fees.due.view'),
        'school-omt',
        'branch-other',
      ),
    ).toBe(false);
  });

  it('gives Receptionist read-only access with view permission', () => {
    const actor = membership('RECEPTIONIST');
    expect(
      canViewFeeDues(
        actor,
        permissions('fees.due.view'),
        'school-omt',
        'branch-main',
      ),
    ).toBe(true);
    expect(
      canGenerateFeeDues(
        actor,
        permissions('fees.due.view'),
        'school-omt',
        'branch-main',
        'ACTIVE',
      ),
    ).toBe(false);
  });

  it('keeps Accountant sensitive operations permission-driven', () => {
    const actor = membership('ACCOUNTANT');
    expect(
      canRefreshFeeFines(
        actor,
        permissions('fees.fine.refresh'),
        'school-omt',
        'branch-main',
        'ACTIVE',
      ),
    ).toBe(true);
    expect(
      canWaiveFeeFine(
        actor,
        permissions('fees.fine.refresh'),
        'school-omt',
        'branch-main',
        'ACTIVE',
      ),
    ).toBe(false);
  });

  it('requires the dedicated history permission', () => {
    const actor = membership('BRANCH_ADMIN');
    expect(
      canViewGenerationHistory(
        actor,
        permissions('fees.due.view'),
        'school-omt',
        'branch-main',
      ),
    ).toBe(false);
    expect(
      canViewGenerationHistory(
        actor,
        permissions(
          'fees.due.view',
          'fees.generation_history.view',
        ),
        'school-omt',
        'branch-main',
      ),
    ).toBe(true);
  });

  it('blocks all mutations for a closed session', () => {
    const actor = membership('BRANCH_ADMIN');
    const values = permissions(
      'fees.due.generate',
      'fees.due.cancel',
      'fees.due.waive',
      'fees.fine.refresh',
      'fees.fine.waive',
    );
    expect(
      canGenerateFeeDues(
        actor,
        values,
        'school-omt',
        'branch-main',
        'CLOSED',
      ),
    ).toBe(false);
    expect(
      canWaiveFeeDue(
        actor,
        values,
        'school-omt',
        'branch-main',
        'CLOSED',
      ),
    ).toBe(false);
  });

  it('does not treat Parent, Student, or Teacher as staff access', () => {
    (['PARENT', 'STUDENT', 'TEACHER'] as UserMembership['role'][]).forEach(
      role => {
        expect(
          canViewFeeDues(
            membership(role),
            permissions('fees.due.view'),
            'school-omt',
            'branch-main',
          ),
        ).toBe(false);
      },
    );
  });
});
