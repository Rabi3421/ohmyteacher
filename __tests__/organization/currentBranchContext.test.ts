import type { UserMembership } from '../../src/models/auth';
import type { OrganizationBranch } from '../../src/models/currentOrganization';
import { academicStore } from '../../src/store/academic/academicStore';
import { useAppStore } from '../../src/store/app/appStore';
import { reconcileLiveBranchSelection } from '../../src/store/organization/currentOrganizationStore';

const membership = (
  role: UserMembership['role'],
  branchId?: string,
): UserMembership => ({
  branchId,
  id: `membership-${role}`,
  role,
  schoolId: '11',
  status: 'ACTIVE',
  userId: '1',
});

const branch = (
  id: string,
  status: OrganizationBranch['status'] = 'ACTIVE',
): OrganizationBranch => ({
  address: '',
  code: `B${id}`,
  createdAt: '2026-08-01T10:00:00Z',
  email: '',
  id,
  name: `Branch ${id}`,
  phone: '',
  schoolId: '11',
  status,
});

beforeEach(() => {
  useAppStore.getState().resetSelections();
  academicStore.getState().setContext(null);
});

describe('live current-branch reconciliation', () => {
  it('preserves a selected active live branch for School Admin', () => {
    useAppStore.getState().setSelectedSchoolId('11');
    useAppStore.getState().setSelectedBranchId('22');
    reconcileLiveBranchSelection(
      '11',
      [branch('21'), branch('22')],
      membership('SCHOOL_ADMIN'),
    );
    expect(useAppStore.getState()).toMatchObject({
      selectedBranchId: '22',
      selectedSchoolId: '11',
    });
  });

  it('replaces removed or inactive selection and clears incompatible academic context', () => {
    useAppStore.getState().setSelectedSchoolId('11');
    useAppStore.getState().setSelectedBranchId('22');
    academicStore.getState().setContext(
      { academicSessionId: 'mock-session', branchId: '22', schoolId: '11' },
      'ACTIVE',
    );
    reconcileLiveBranchSelection(
      '11',
      [branch('21'), branch('22', 'INACTIVE')],
      membership('SCHOOL_ADMIN'),
    );
    expect(useAppStore.getState().selectedBranchId).toBe('21');
    expect(academicStore.getState().context).toBeNull();
  });

  it('uses only an active assigned branch for Branch Admin', () => {
    reconcileLiveBranchSelection(
      '11',
      [branch('21'), branch('22')],
      membership('BRANCH_ADMIN', '22'),
    );
    expect(useAppStore.getState().selectedBranchId).toBe('22');
    reconcileLiveBranchSelection(
      '11',
      [branch('22', 'INACTIVE')],
      membership('BRANCH_ADMIN', '22'),
    );
    expect(useAppStore.getState().selectedBranchId).toBeNull();
  });
});
