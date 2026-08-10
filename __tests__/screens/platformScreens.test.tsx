import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { UserMembership } from '../../src/models/auth';
import type { PlatformSchool } from '../../src/models/platform';
import type { RoleStackParamList } from '../../src/navigation/navigationTypes';
import { CreatePlatformSchoolScreen } from '../../src/screens/platform/CreatePlatformSchoolScreen';
import { PlatformDashboardScreen } from '../../src/screens/platform/PlatformDashboardScreen';
import { PlatformSchoolDetailsScreen } from '../../src/screens/platform/PlatformSchoolDetailsScreen';
import { PlatformSchoolsScreen } from '../../src/screens/platform/PlatformSchoolsScreen';
import {
  authStore,
  INITIAL_AUTH_STATE,
} from '../../src/store/auth/authStore';
import {
  INITIAL_PLATFORM_STATE,
  platformStore,
} from '../../src/store/platform/platformStore';

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

const SUPER_MEMBERSHIP: UserMembership = {
  id: 'membership-super',
  role: 'SUPER_ADMIN',
  status: 'ACTIVE',
  userId: 'user-super',
};

const SCHOOL: PlatformSchool = {
  address: 'Bhubaneswar',
  createdAt: '2026-08-01T10:00:00Z',
  email: 'school@example.com',
  id: '11',
  name: 'Sunrise Public School',
  phone: '9876543210',
  status: 'ACTIVE',
  upiId: 'sunrise@bank',
};

const originalActions = {
  loadDashboard: platformStore.getState().loadDashboard,
  loadSchool: platformStore.getState().loadSchool,
  loadSchools: platformStore.getState().loadSchools,
  setSchoolStatus: platformStore.getState().setSchoolStatus,
};

function withSafeArea(element: React.ReactElement) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      {element}
    </SafeAreaProvider>
  );
}

function navigation<RouteName extends keyof RoleStackParamList>() {
  return {
    goBack: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
  } as unknown as NativeStackScreenProps<
    RoleStackParamList,
    RouteName
  >['navigation'];
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
    activeMembership: SUPER_MEMBERSHIP,
    memberships: [SUPER_MEMBERSHIP],
    status: 'authenticated',
    user: { id: 'user-super', name: 'Platform Admin', status: 'ACTIVE' },
  });
  platformStore.setState({
    ...INITIAL_PLATFORM_STATE,
    loadDashboard: jest.fn().mockResolvedValue(undefined),
    loadSchool: jest.fn().mockResolvedValue(true),
    loadSchools: jest.fn().mockResolvedValue(undefined),
    setSchoolStatus: jest.fn().mockResolvedValue(true),
  });
});

afterAll(() => {
  platformStore.setState(originalActions);
});

test('platform dashboard renders only confirmed live metrics', async () => {
  platformStore.setState({
    dashboard: {
      activeSchools: 4,
      thisMonthCollection: '12500.50',
      totalBranches: 8,
      totalSchools: 5,
      totalStudents: 120,
      totalTeachers: 20,
    },
  });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <PlatformDashboardScreen
          navigation={navigation<'RoleLanding'>()}
          route={{
            key: 'PlatformDashboard-test',
            name: 'RoleLanding',
            params: { role: 'SUPER_ADMIN' },
          }}
        />,
      ),
    );
  });
  expect(
    renderer!.root.findByProps({ testID: 'platform-dashboard-screen' }),
  ).toBeTruthy();
  expect(text(renderer!)).toContain('Total Schools');
  expect(text(renderer!)).toContain('Collection This Month');
  expect(text(renderer!)).toContain('headline metrics only');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('non-Super-Admin cannot render the platform dashboard', async () => {
  const schoolAdmin: UserMembership = {
    ...SUPER_MEMBERSHIP,
    id: 'membership-school-admin',
    role: 'SCHOOL_ADMIN',
    schoolId: '11',
  };
  authStore.setState({
    activeMembership: schoolAdmin,
    memberships: [schoolAdmin],
  });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <PlatformDashboardScreen
          navigation={navigation<'RoleLanding'>()}
          route={{
            key: 'PlatformDashboard-denied',
            name: 'RoleLanding',
            params: { role: 'SUPER_ADMIN' },
          }}
        />,
      ),
    );
  });
  expect(
    renderer!.root.findByProps({ testID: 'platform-access-denied-screen' }),
  ).toBeTruthy();
  expect(text(renderer!)).toContain('Platform access denied');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('deep-linked platform school list does not expose stale data to School Admin', async () => {
  const schoolAdmin: UserMembership = {
    ...SUPER_MEMBERSHIP,
    id: 'membership-school-admin',
    role: 'SCHOOL_ADMIN',
    schoolId: '11',
  };
  authStore.setState({
    activeMembership: schoolAdmin,
    memberships: [schoolAdmin],
  });
  platformStore.setState({ allSchools: [SCHOOL], schools: [SCHOOL] });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <PlatformSchoolsScreen
          navigation={navigation<'Schools'>()}
          route={{ key: 'Schools-denied', name: 'Schools' }}
        />,
      ),
    );
  });
  expect(
    renderer!.root.findByProps({ testID: 'platform-access-denied-screen' }),
  ).toBeTruthy();
  expect(text(renderer!)).not.toContain('Sunrise Public School');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('platform school list renders live records and local-filter disclosure', async () => {
  platformStore.setState({ allSchools: [SCHOOL], schools: [SCHOOL] });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <PlatformSchoolsScreen
          navigation={navigation<'Schools'>()}
          route={{ key: 'Schools-test', name: 'Schools' }}
        />,
      ),
    );
  });
  expect(
    renderer!.root.findByProps({ testID: 'platform-schools-screen' }),
  ).toBeTruthy();
  expect(text(renderer!)).toContain('Sunrise Public School');
  expect(text(renderer!)).toContain('applied locally');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('platform school creation preserves focused backend validation', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <CreatePlatformSchoolScreen
          navigation={navigation<'CreateSchool'>()}
          route={{ key: 'CreateSchool-test', name: 'CreateSchool' }}
        />,
      ),
    );
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Create School and Admin' })
      .props.onPress();
  });
  expect(text(renderer!)).toContain('School name is required.');
  expect(text(renderer!)).toContain('Admin name is required.');
  expect(text(renderer!)).toContain(
    'Enter a valid 10-digit Indian mobile number.',
  );
  expect(text(renderer!)).not.toContain('School Code');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('platform detail confirmation names the selected school', async () => {
  platformStore.setState({ currentSchool: SCHOOL });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <PlatformSchoolDetailsScreen
          navigation={navigation<'SchoolDetails'>()}
          route={{
            key: 'SchoolDetails-test',
            name: 'SchoolDetails',
            params: { schoolId: '11' },
          }}
        />,
      ),
    );
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({ accessibilityLabel: 'Suspend School' })
      .props.onPress();
  });
  expect(text(renderer!)).toContain('Suspend Sunrise Public School?');
  expect(text(renderer!)).toContain('Existing JWT sessions may remain usable');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});
