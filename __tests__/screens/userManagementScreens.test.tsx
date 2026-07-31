import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { UserMembership } from '../../src/models/auth';
import type {
  Branch,
} from '../../src/models/organization';
import type {
  RoleDefinition,
  StaffUserDetails,
  StaffUserSummary,
  UserActivity,
  UserSessionSummary,
} from '../../src/models/userManagement';
import type { RoleStackParamList } from '../../src/navigation/navigationTypes';
import { getBaseRoleDefinition } from '../../src/services/userManagement/roleDefinitions';
import { ActiveSessionsScreen } from '../../src/screens/userManagement/ActiveSessionsScreen';
import { AssignBranchesScreen } from '../../src/screens/userManagement/AssignBranchesScreen';
import { CreateStaffUserScreen } from '../../src/screens/userManagement/CreateStaffUserScreen';
import { RoleListScreen } from '../../src/screens/userManagement/RoleListScreen';
import { RolePermissionsScreen } from '../../src/screens/userManagement/RolePermissionsScreen';
import { StaffUserDetailsScreen } from '../../src/screens/userManagement/StaffUserDetailsScreen';
import { StaffUsersScreen } from '../../src/screens/userManagement/StaffUsersScreen';
import { UserActivityScreen } from '../../src/screens/userManagement/UserActivityScreen';
import {
  authStore,
  INITIAL_AUTH_STATE,
} from '../../src/store/auth/authStore';
import {
  INITIAL_ORGANIZATION_STATE,
  organizationStore,
} from '../../src/store/organization/organizationStore';
import {
  INITIAL_USER_MANAGEMENT_STATE,
  userManagementStore,
} from '../../src/store/userManagement/userManagementStore';

jest.mock('react-native-keychain', () => ({
  getAllGenericPasswordServices: jest.fn().mockResolvedValue([]),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  setGenericPassword: jest.fn().mockResolvedValue({ service: 'test' }),
}));

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
}));

const initialMetrics = {
  frame: { height: 800, width: 400, x: 0, y: 0 },
  insets: { bottom: 0, left: 0, right: 0, top: 24 },
};

const SCHOOL_ADMIN: UserMembership = {
  id: 'membership-school-admin',
  role: 'SCHOOL_ADMIN',
  schoolId: 'school-omt',
  schoolName: 'OhMyTeacher Demo School',
  status: 'ACTIVE',
  userId: 'user-school-admin',
};

const BRANCH: Branch = {
  address: {
    city: 'Bhubaneswar',
    country: 'India',
    line1: '1 Education Road',
    pinCode: '751001',
    state: 'Odisha',
  },
  code: 'MAIN',
  createdAt: '2025-04-01T09:00:00.000Z',
  id: 'branch-main',
  isMainBranch: true,
  mobile: '9876543200',
  name: 'Main Branch',
  schoolId: 'school-omt',
  status: 'ACTIVE',
  updatedAt: '2026-07-20T10:00:00.000Z',
};

const SUMMARY: StaffUserSummary = {
  branches: [{ code: 'MAIN', id: 'branch-main', name: 'Main Branch' }],
  identity: {
    createdAt: '2025-04-01T09:00:00.000Z',
    email: 'vikram@omt.edu.in',
    id: 'user-accountant',
    lastLoginAt: '2026-07-20T07:45:00.000Z',
    mobile: '9876543211',
    name: 'Vikram Rao',
    status: 'ACTIVE',
    updatedAt: '2026-07-20T10:00:00.000Z',
  },
  membership: {
    branchIds: ['branch-main'],
    createdAt: '2025-04-01T09:00:00.000Z',
    id: 'membership-accountant',
    role: 'ACCOUNTANT',
    schoolId: 'school-omt',
    status: 'ACTIVE',
    updatedAt: '2026-07-20T10:00:00.000Z',
    userId: 'user-accountant',
  },
};

const DETAILS: StaffUserDetails = {
  ...SUMMARY,
  activeSessionCount: 2,
  effectiveAccess: {
    branchIds: ['branch-main'],
    permissions: [
      'students.view',
      'fees.view',
      'payments.collect',
      'receipts.view',
    ],
    role: 'ACCOUNTANT',
    scope: 'BRANCH',
  },
  schoolName: 'OhMyTeacher Demo School',
};

const ACCOUNTANT_ROLE: RoleDefinition = {
  ...getBaseRoleDefinition('ACCOUNTANT'),
  activeMembershipCount: 1,
};

const SESSION: UserSessionSummary = {
  approximateDeviceId: '…A72F',
  deviceLabel: 'Samsung Galaxy S24',
  id: 'session-accountant-current',
  isCurrent: true,
  lastActiveAt: '2026-07-20T09:55:00.000Z',
  loggedInAt: '2026-07-20T07:45:00.000Z',
  membershipId: 'membership-accountant',
  platform: 'ANDROID',
  status: 'ACTIVE',
};

const ACTIVITY: UserActivity = {
  action: 'ROLE_CHANGED',
  description: 'Role changed from Receptionist to Accountant.',
  id: 'activity-1',
  performedAt: '2026-07-20T10:00:00.000Z',
  performedByName: 'Ananya Sharma',
  performedByUserId: 'user-school-admin',
  schoolId: 'school-omt',
  targetMembershipId: 'membership-accountant',
  targetUserId: 'user-accountant',
};

const originalUserActions = {
  loadActiveSessions: userManagementStore.getState().loadActiveSessions,
  loadActivity: userManagementStore.getState().loadActivity,
  loadRoleConfiguration:
    userManagementStore.getState().loadRoleConfiguration,
  loadRoles: userManagementStore.getState().loadRoles,
  loadStaff: userManagementStore.getState().loadStaff,
  loadStaffUser: userManagementStore.getState().loadStaffUser,
};
const originalOrganizationActions = {
  loadBranches: organizationStore.getState().loadBranches,
  loadSchool: organizationStore.getState().loadSchool,
};

function withSafeArea(element: React.ReactElement) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      {element}
    </SafeAreaProvider>
  );
}

function makeNavigation<RouteName extends keyof RoleStackParamList>() {
  return {
    goBack: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
  } as unknown as NativeStackScreenProps<
    RoleStackParamList,
    RouteName
  >['navigation'];
}

function renderText(renderer: ReactTestRenderer.ReactTestRenderer): string {
  return renderer.root
    .findAll(node => typeof node.props.children === 'string')
    .map(node => node.props.children as string)
    .join(' ');
}

beforeEach(() => {
  authStore.setState({
    ...INITIAL_AUTH_STATE,
    activeMembership: SCHOOL_ADMIN,
    memberships: [SCHOOL_ADMIN],
    status: 'authenticated',
    user: {
      id: 'user-school-admin',
      name: 'Ananya Sharma',
      status: 'ACTIVE',
    },
  });
  userManagementStore.setState({
    ...INITIAL_USER_MANAGEMENT_STATE,
    loadActiveSessions: jest.fn().mockResolvedValue(undefined),
    loadActivity: jest.fn().mockResolvedValue(undefined),
    loadRoleConfiguration: jest.fn().mockResolvedValue(undefined),
    loadRoles: jest.fn().mockResolvedValue(undefined),
    loadStaff: jest.fn().mockResolvedValue(undefined),
    loadStaffUser: jest.fn().mockResolvedValue(true),
  });
  organizationStore.setState({
    ...INITIAL_ORGANIZATION_STATE,
    branches: {
      items: [BRANCH],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
    loadBranches: jest.fn().mockResolvedValue(undefined),
    loadSchool: jest.fn().mockResolvedValue(true),
  });
});

afterAll(() => {
  userManagementStore.setState(originalUserActions);
  organizationStore.setState(originalOrganizationActions);
});

test('staff list renders', async () => {
  userManagementStore.setState({
    staff: {
      items: [SUMMARY],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
  });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <StaffUsersScreen
          navigation={makeNavigation<'StaffUsers'>()}
          route={{
            key: 'StaffUsers-test',
            name: 'StaffUsers',
            params: { schoolId: 'school-omt' },
          }}
        />,
      ),
    );
  });
  expect(renderer!.root.findByProps({ testID: 'staff-users-screen' })).toBeTruthy();
  expect(renderText(renderer!)).toContain('Vikram Rao');
  expect(renderText(renderer!)).toContain('Accountant');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('staff empty state renders', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <StaffUsersScreen
          navigation={makeNavigation<'StaffUsers'>()}
          route={{
            key: 'StaffUsers-empty',
            name: 'StaffUsers',
            params: { schoolId: 'school-omt' },
          }}
        />,
      ),
    );
  });
  expect(renderText(renderer!)).toContain('No staff found');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('create staff validates identity and branch scope', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <CreateStaffUserScreen
          navigation={makeNavigation<'CreateStaffUser'>()}
          route={{
            key: 'CreateStaffUser-test',
            name: 'CreateStaffUser',
            params: { schoolId: 'school-omt' },
          }}
        />,
      ),
    );
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Create Staff Membership' })
      .props.onPress();
  });
  expect(renderText(renderer!)).toContain('Full name is required.');
  expect(renderText(renderer!)).toContain('Select at least one active branch.');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('staff user details renders identity, membership, and access', async () => {
  userManagementStore.setState({ currentStaff: DETAILS });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <StaffUserDetailsScreen
          navigation={makeNavigation<'StaffUserDetails'>()}
          route={{
            key: 'StaffUserDetails-test',
            name: 'StaffUserDetails',
            params: {
              membershipId: 'membership-accountant',
              schoolId: 'school-omt',
            },
          }}
        />,
      ),
    );
  });
  expect(renderer!.root.findByProps({ testID: 'staff-user-details-screen' })).toBeTruthy();
  expect(renderText(renderer!)).toContain('Access summary');
  expect(renderText(renderer!)).toContain('Main Branch');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('branch assignment screen renders active branches', async () => {
  userManagementStore.setState({ currentStaff: DETAILS });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <AssignBranchesScreen
          navigation={makeNavigation<'AssignBranches'>()}
          route={{
            key: 'AssignBranches-test',
            name: 'AssignBranches',
            params: {
              membershipId: 'membership-accountant',
              schoolId: 'school-omt',
            },
          }}
        />,
      ),
    );
  });
  expect(renderer!.root.findByProps({ testID: 'assign-branches-screen' })).toBeTruthy();
  expect(renderText(renderer!)).toContain('Main Branch');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('role list renders system definitions without add action', async () => {
  userManagementStore.setState({ roles: [ACCOUNTANT_ROLE] });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <RoleListScreen
          navigation={makeNavigation<'RoleList'>()}
          route={{
            key: 'RoleList-test',
            name: 'RoleList',
            params: { schoolId: 'school-omt' },
          }}
        />,
      ),
    );
  });
  expect(renderer!.root.findByProps({ testID: 'role-list-screen' })).toBeTruthy();
  expect(renderText(renderer!)).toContain('Accountant');
  expect(renderText(renderer!)).not.toContain('Add Role');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('permission matrix renders grouped permission boundaries', async () => {
  userManagementStore.setState({
    roleConfiguration: {
      disabledPermissions: [],
      enabledPermissions: [],
      role: 'ACCOUNTANT',
      schoolId: 'school-omt',
      updatedAt: '2026-07-20T10:00:00.000Z',
    },
  });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <RolePermissionsScreen
          navigation={makeNavigation<'RolePermissions'>()}
          route={{
            key: 'RolePermissions-test',
            name: 'RolePermissions',
            params: { role: 'ACCOUNTANT', schoolId: 'school-omt' },
          }}
        />,
      ),
    );
  });
  expect(renderer!.root.findByProps({ testID: 'role-permissions-screen' })).toBeTruthy();
  expect(renderText(renderer!)).toContain('Organization');
  expect(renderText(renderer!)).toContain('organization.school.view');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('active sessions screen renders safe device summaries', async () => {
  userManagementStore.setState({ activeSessions: [SESSION] });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <ActiveSessionsScreen
          navigation={makeNavigation<'ActiveSessions'>()}
          route={{
            key: 'ActiveSessions-test',
            name: 'ActiveSessions',
            params: {
              membershipId: 'membership-accountant',
              schoolId: 'school-omt',
            },
          }}
        />,
      ),
    );
  });
  expect(renderer!.root.findByProps({ testID: 'active-sessions-screen' })).toBeTruthy();
  expect(renderText(renderer!)).toContain('Samsung Galaxy S24');
  expect(renderText(renderer!)).not.toContain('accessToken');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('activity list renders safe user-management events', async () => {
  userManagementStore.setState({
    activity: {
      items: [ACTIVITY],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
  });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <UserActivityScreen
          navigation={makeNavigation<'UserActivity'>()}
          route={{
            key: 'UserActivity-test',
            name: 'UserActivity',
            params: {
              membershipId: 'membership-accountant',
              schoolId: 'school-omt',
            },
          }}
        />,
      ),
    );
  });
  expect(renderer!.root.findByProps({ testID: 'user-activity-screen' })).toBeTruthy();
  expect(renderText(renderer!)).toContain('ROLE CHANGED');
  expect(renderText(renderer!)).toContain(
    'Role changed from Receptionist to Accountant.',
  );
  await ReactTestRenderer.act(async () => renderer!.unmount());
});
