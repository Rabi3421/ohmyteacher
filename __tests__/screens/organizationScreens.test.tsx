import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { UserMembership } from '../../src/models/auth';
import type {
  AcademicSession,
  Branch,
  CreateSchoolResult,
  School,
  SchoolSettings,
} from '../../src/models/organization';
import type { RoleStackParamList } from '../../src/navigation/navigationTypes';
import { AcademicSessionsScreen } from '../../src/screens/organization/AcademicSessionsScreen';
import { CreateSchoolScreen } from '../../src/screens/organization/CreateSchoolScreen';
import { OrganizationSetupSuccessScreen } from '../../src/screens/organization/OrganizationSetupSuccessScreen';
import { SchoolBranchesScreen } from '../../src/screens/organization/SchoolBranchesScreen';
import { SchoolDetailsScreen } from '../../src/screens/organization/SchoolDetailsScreen';
import { SchoolSettingsScreen } from '../../src/screens/organization/SchoolSettingsScreen';
import { SuperAdminSchoolsScreen } from '../../src/screens/organization/SuperAdminSchoolsScreen';
import {
  authStore,
  INITIAL_AUTH_STATE,
} from '../../src/store/auth/authStore';
import {
  INITIAL_ORGANIZATION_STATE,
  organizationStore,
} from '../../src/store/organization/organizationStore';

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

const SCHOOL: School = {
  activeBranchCount: 1,
  activeSession: {
    endDate: '2027-03-31',
    id: 'session-current',
    name: '2026-27',
    startDate: '2026-04-01',
  },
  address: {
    city: 'Bhubaneswar',
    country: 'India',
    line1: '1 Education Road',
    pinCode: '751001',
    state: 'Odisha',
  },
  branchCount: 1,
  code: 'OMT001',
  createdAt: '2026-04-01T09:00:00.000Z',
  email: 'office@omt.edu.in',
  id: 'school-omt',
  mobile: '9876543200',
  name: 'OhMyTeacher Demo School',
  schoolAdmin: {
    membershipId: 'membership-school-admin',
    mobile: '9876543210',
    name: 'Ananya Sharma',
    role: 'SCHOOL_ADMIN',
  },
  status: 'ACTIVE',
  updatedAt: '2026-07-15T10:00:00.000Z',
};

const BRANCH: Branch = {
  address: SCHOOL.address,
  code: 'MAIN',
  createdAt: SCHOOL.createdAt,
  id: 'branch-main',
  isMainBranch: true,
  mobile: SCHOOL.mobile,
  name: 'Main Branch',
  schoolId: SCHOOL.id,
  status: 'ACTIVE',
  updatedAt: SCHOOL.updatedAt,
};

const SESSION: AcademicSession = {
  createdAt: SCHOOL.createdAt,
  endDate: '2027-03-31',
  id: 'session-current',
  name: '2026-27',
  schoolId: SCHOOL.id,
  startDate: '2026-04-01',
  status: 'ACTIVE',
  updatedAt: SCHOOL.updatedAt,
};

const SETTINGS: SchoolSettings = {
  academicYearStartMonth: 4,
  country: 'India',
  currency: 'INR',
  dateFormat: 'DD-MMM-YYYY',
  displayName: SCHOOL.name,
  primaryEmail: SCHOOL.email,
  primaryMobile: SCHOOL.mobile,
  schoolId: SCHOOL.id,
  timezone: 'Asia/Kolkata',
};

const SUPER_MEMBERSHIP: UserMembership = {
  id: 'membership-super',
  role: 'SUPER_ADMIN',
  status: 'ACTIVE',
  userId: 'user-super',
};

const SCHOOL_MEMBERSHIP: UserMembership = {
  id: 'membership-school-admin',
  role: 'SCHOOL_ADMIN',
  schoolId: SCHOOL.id,
  schoolName: SCHOOL.name,
  status: 'ACTIVE',
  userId: 'user-school-admin',
};

const originalLoadActions = {
  loadAcademicSessions: organizationStore.getState().loadAcademicSessions,
  loadBranches: organizationStore.getState().loadBranches,
  loadSchool: organizationStore.getState().loadSchool,
  loadSchools: organizationStore.getState().loadSchools,
  loadSchoolSettings: organizationStore.getState().loadSchoolSettings,
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

function renderText(
  renderer: ReactTestRenderer.ReactTestRenderer,
): string {
  return renderer.root
    .findAll(node => typeof node.props.children === 'string')
    .map(node => node.props.children as string)
    .join(' ');
}

beforeEach(() => {
  authStore.setState({
    ...INITIAL_AUTH_STATE,
    activeMembership: SUPER_MEMBERSHIP,
    memberships: [SUPER_MEMBERSHIP],
    status: 'authenticated',
    user: { id: 'user-super', name: 'Platform Admin', status: 'ACTIVE' },
  });
  organizationStore.setState({
    ...INITIAL_ORGANIZATION_STATE,
    loadAcademicSessions: jest.fn().mockResolvedValue(undefined),
    loadBranches: jest.fn().mockResolvedValue(undefined),
    loadSchool: jest.fn().mockResolvedValue(true),
    loadSchools: jest.fn().mockResolvedValue(undefined),
    loadSchoolSettings: jest.fn().mockResolvedValue(undefined),
  });
});

afterAll(() => {
  organizationStore.setState(originalLoadActions);
});

test('school list renders organization data', async () => {
  organizationStore.setState({
    schools: {
      items: [SCHOOL],
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
        <SuperAdminSchoolsScreen
          navigation={makeNavigation<'Schools'>()}
          route={{ key: 'Schools-test', name: 'Schools' }}
        />,
      ),
    );
  });

  expect(renderer!.root.findByProps({ testID: 'schools-screen' })).toBeTruthy();
  expect(renderText(renderer!)).toContain('OhMyTeacher Demo School');
  expect(renderText(renderer!)).toContain('OMT001');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('school list renders its empty state', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <SuperAdminSchoolsScreen
          navigation={makeNavigation<'Schools'>()}
          route={{ key: 'Schools-empty', name: 'Schools' }}
        />,
      ),
    );
  });

  expect(renderText(renderer!)).toContain('No schools found');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('create school shows inline validation', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <CreateSchoolScreen
          navigation={makeNavigation<'CreateSchool'>()}
          route={{ key: 'CreateSchool-test', name: 'CreateSchool' }}
        />,
      ),
    );
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Continue' })
      .props.onPress();
  });

  expect(renderText(renderer!)).toContain('School name is required.');
  expect(renderText(renderer!)).toContain(
    'Enter a valid 10-digit Indian mobile number.',
  );
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('school details renders overview and organization summary', async () => {
  authStore.setState({
    activeMembership: SCHOOL_MEMBERSHIP,
    memberships: [SCHOOL_MEMBERSHIP],
    user: { id: 'user-school-admin', name: 'Ananya', status: 'ACTIVE' },
  });
  organizationStore.setState({
    currentSchool: SCHOOL,
    loadSchool: jest.fn().mockResolvedValue(true),
  });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <SchoolDetailsScreen
          navigation={makeNavigation<'SchoolDetails'>()}
          route={{
            key: 'SchoolDetails-test',
            name: 'SchoolDetails',
            params: { schoolId: SCHOOL.id },
          }}
        />,
      ),
    );
  });

  expect(
    renderer!.root.findByProps({ testID: 'school-details-screen' }),
  ).toBeTruthy();
  expect(renderText(renderer!)).toContain('Organization summary');
  expect(renderText(renderer!)).toContain('Ananya Sharma');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('branch list renders branch records', async () => {
  authStore.setState({
    activeMembership: SCHOOL_MEMBERSHIP,
    memberships: [SCHOOL_MEMBERSHIP],
    user: { id: 'user-school-admin', name: 'Ananya', status: 'ACTIVE' },
  });
  organizationStore.setState({
    branches: {
      items: [BRANCH],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
    loadBranches: jest.fn().mockResolvedValue(undefined),
  });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <SchoolBranchesScreen
          navigation={makeNavigation<'SchoolBranches'>()}
          route={{
            key: 'SchoolBranches-test',
            name: 'SchoolBranches',
            params: { schoolId: SCHOOL.id },
          }}
        />,
      ),
    );
  });

  expect(renderer!.root.findByProps({ testID: 'branches-screen' })).toBeTruthy();
  expect(renderText(renderer!)).toContain('Main Branch');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('academic session list renders status and dates', async () => {
  authStore.setState({
    activeMembership: SCHOOL_MEMBERSHIP,
    memberships: [SCHOOL_MEMBERSHIP],
    user: { id: 'user-school-admin', name: 'Ananya', status: 'ACTIVE' },
  });
  organizationStore.setState({
    academicSessions: [SESSION],
    loadAcademicSessions: jest.fn().mockResolvedValue(undefined),
  });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <AcademicSessionsScreen
          navigation={makeNavigation<'AcademicSessions'>()}
          route={{
            key: 'AcademicSessions-test',
            name: 'AcademicSessions',
            params: { schoolId: SCHOOL.id },
          }}
        />,
      ),
    );
  });

  expect(
    renderer!.root.findByProps({ testID: 'academic-sessions-screen' }),
  ).toBeTruthy();
  expect(renderText(renderer!)).toContain('2026-27');
  expect(renderText(renderer!)).toContain('Active');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('school settings renders general organization defaults', async () => {
  authStore.setState({
    activeMembership: SCHOOL_MEMBERSHIP,
    memberships: [SCHOOL_MEMBERSHIP],
    user: { id: 'user-school-admin', name: 'Ananya', status: 'ACTIVE' },
  });
  organizationStore.setState({
    loadSchoolSettings: jest.fn().mockResolvedValue(undefined),
    schoolSettings: SETTINGS,
  });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <SchoolSettingsScreen
          navigation={makeNavigation<'SchoolSettings'>()}
          route={{
            key: 'SchoolSettings-test',
            name: 'SchoolSettings',
            params: { schoolId: SCHOOL.id },
          }}
        />,
      ),
    );
  });

  expect(
    renderer!.root.findByProps({ testID: 'school-settings-screen' }),
  ).toBeTruthy();
  expect(renderer!.root.findByProps({ value: 'Asia/Kolkata' })).toBeTruthy();
  expect(renderer!.root.findByProps({ value: 'INR' })).toBeTruthy();
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('organization setup success renders all atomic creation results', async () => {
  const result: CreateSchoolResult = {
    activeSession: SESSION,
    mainBranch: BRANCH,
    school: SCHOOL,
    schoolAdmin: SCHOOL.schoolAdmin!,
  };
  organizationStore.setState({ createSchoolResult: result });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <OrganizationSetupSuccessScreen
          navigation={makeNavigation<'OrganizationSetupSuccess'>()}
          route={{
            key: 'OrganizationSetupSuccess-test',
            name: 'OrganizationSetupSuccess',
            params: { schoolId: SCHOOL.id },
          }}
        />,
      ),
    );
  });

  expect(
    renderer!.root.findByProps({
      testID: 'organization-setup-success-screen',
    }),
  ).toBeTruthy();
  expect(renderText(renderer!)).toContain('Organization setup complete');
  expect(renderText(renderer!)).toContain('Main Branch');
  expect(renderText(renderer!)).toContain('Ananya Sharma');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});
