import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { UserMembership } from '../../src/models/auth';
import type { CurrentSchool, OrganizationBranch } from '../../src/models/currentOrganization';
import type { LiveStaffUser } from '../../src/models/liveStaff';
import type { RoleStackParamList } from '../../src/navigation/navigationTypes';
import { CreateStaffUserScreen } from '../../src/screens/userManagement/CreateStaffUserScreen';
import { StaffUserDetailsScreen } from '../../src/screens/userManagement/StaffUserDetailsScreen';
import { StaffUsersScreen } from '../../src/screens/userManagement/StaffUsersScreen';
import { authStore, INITIAL_AUTH_STATE } from '../../src/store/auth/authStore';
import {
  currentOrganizationStore,
  INITIAL_CURRENT_ORGANIZATION_STATE,
} from '../../src/store/organization/currentOrganizationStore';
import {
  currentStaffStore,
  INITIAL_CURRENT_STAFF_STATE,
} from '../../src/store/userManagement/currentStaffStore';

jest.mock('react-native-keychain', () => ({
  getAllGenericPasswordServices: jest.fn().mockResolvedValue([]),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  setGenericPassword: jest.fn().mockResolvedValue({ service: 'test' }),
}));

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: true, isInternetReachable: true, type: 'wifi' }),
}));

jest.mock('../../src/hooks/useDebounce', () => ({
  useDebounce: (value: unknown) => value,
}));

const initialMetrics = {
  frame: { height: 800, width: 400, x: 0, y: 0 },
  insets: { bottom: 0, left: 0, right: 0, top: 24 },
};

const membership: UserMembership = {
  id: 'backend-user:1:SCHOOL_ADMIN',
  role: 'SCHOOL_ADMIN',
  schoolId: '11',
  status: 'ACTIVE',
  userId: '1',
};

const school: CurrentSchool = {
  address: '',
  createdAt: '2026-08-01T10:00:00Z',
  email: '',
  id: '11',
  name: 'Live School',
  phone: '',
  status: 'ACTIVE',
  upiId: '',
};

const branch: OrganizationBranch = {
  address: '',
  code: 'SCH11-B1',
  createdAt: '2026-08-01T10:00:00Z',
  email: '',
  id: '21',
  name: 'Main Branch',
  phone: '',
  schoolId: '11',
  status: 'ACTIVE',
};

const teacher: LiveStaffUser = {
  branch: { code: branch.code, id: branch.id, name: branch.name, status: 'ACTIVE' },
  id: '31',
  joinedAt: '2026-08-01T10:00:00Z',
  mobile: '+919111100003',
  name: 'Teacher One',
  role: 'TEACHER',
  schoolId: '11',
  status: 'ACTIVE',
};

function withSafeArea(element: React.ReactElement) {
  return <SafeAreaProvider initialMetrics={initialMetrics}>{element}</SafeAreaProvider>;
}

function navigation<RouteName extends keyof RoleStackParamList>() {
  return { goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn(), reset: jest.fn() } as unknown as NativeStackScreenProps<RoleStackParamList, RouteName>['navigation'];
}

function text(renderer: ReactTestRenderer.ReactTestRenderer): string {
  return renderer.root
    .findAll(node => typeof node.props.children === 'string')
    .map(node => node.props.children as string)
    .join(' ');
}

beforeEach(() => {
  authStore.setState({
    ...INITIAL_AUTH_STATE,
    activeMembership: membership,
    memberships: [membership],
    status: 'authenticated',
    user: { id: '1', name: 'School Admin', status: 'ACTIVE' },
  });
  currentOrganizationStore.setState({
    ...INITIAL_CURRENT_ORGANIZATION_STATE,
    allBranches: [branch],
    branches: { items: [branch], pagination: null, totalItems: 1 },
    currentSchool: school,
    loadBranches: jest.fn().mockResolvedValue(true),
    loadCurrentSchool: jest.fn().mockResolvedValue(true),
  });
  currentStaffStore.setState({
    ...INITIAL_CURRENT_STAFF_STATE,
    allStaff: [teacher],
    currentStaff: teacher,
    staff: { items: [teacher], pagination: null, totalItems: 1 },
    cancelDetailRequest: jest.fn(),
    cancelListRequest: jest.fn(),
    loadStaff: jest.fn().mockResolvedValue(true),
    loadStaffUser: jest.fn().mockResolvedValue(true),
  });
});

test('staff list renders only live fixed-role account language', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(withSafeArea(
      <StaffUsersScreen
        navigation={navigation<'StaffUsers'>()}
        route={{ key: 'staff-list', name: 'StaffUsers', params: { schoolId: '11' } }}
      />,
    ));
  });
  const rendered = text(renderer!);
  expect(rendered).toContain('Teacher One');
  expect(rendered).toContain('Teacher');
  expect(rendered).not.toContain('Accountant');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('staff list keeps live errors explicit with no mock fallback rows', async () => {
  currentStaffStore.setState({
    allStaff: [],
    currentStaff: null,
    error: { code: 'NETWORK_ERROR', message: 'Unable to connect.' },
    staff: { items: [], pagination: null, totalItems: 0 },
  });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(withSafeArea(
      <StaffUsersScreen
        navigation={navigation<'StaffUsers'>()}
        route={{ key: 'staff-error', name: 'StaffUsers', params: { schoolId: '11' } }}
      />,
    ));
  });
  expect(text(renderer!)).toContain('Unable to connect.');
  expect(text(renderer!)).not.toContain('Teacher One');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('creation form offers backend roles and one live branch only', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(withSafeArea(
      <CreateStaffUserScreen
        navigation={navigation<'CreateStaffUser'>()}
        route={{ key: 'staff-create', name: 'CreateStaffUser', params: { schoolId: '11' } }}
      />,
    ));
  });
  const rendered = text(renderer!);
  expect(rendered).toContain('Branch Admin');
  expect(rendered).toContain('Teacher');
  expect(rendered).toContain('Main Branch');
  expect(rendered).not.toContain('Accountant');
  expect(rendered).not.toContain('Receptionist');
  expect(rendered).not.toContain('Membership status');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('Branch Admin creation is locked to Teacher and its own branch', async () => {
  const branchAdmin = { ...membership, branchId: '21', role: 'BRANCH_ADMIN' as const };
  authStore.setState({ activeMembership: branchAdmin, memberships: [branchAdmin] });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(withSafeArea(
      <CreateStaffUserScreen
        navigation={navigation<'CreateStaffUser'>()}
        route={{ key: 'branch-create', name: 'CreateStaffUser', params: { schoolId: '11' } }}
      />,
    ));
  });
  expect(text(renderer!)).toContain('Teacher');
  expect(text(renderer!)).not.toContain('Branch Admin');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('details present Django User semantics and omit unsupported controls', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(withSafeArea(
      <StaffUserDetailsScreen
        navigation={navigation<'StaffUserDetails'>()}
        route={{ key: 'staff-detail', name: 'StaffUserDetails', params: { membershipId: '31', schoolId: '11' } }}
      />,
    ));
  });
  const rendered = text(renderer!);
  expect(rendered).toContain('Django user account');
  expect(rendered).toContain('Change Branch');
  expect(rendered).toContain('Deactivate Account');
  expect(rendered).not.toContain('Change Role');
  expect(rendered).not.toContain('Active Sessions');
  expect(rendered).not.toContain('User Activity');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});
