import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type {
  AuthStackParamList,
  RoleStackParamList,
} from '../../src/navigation/navigationTypes';
import { OtpVerificationScreen } from '../../src/screens/auth/OtpVerificationScreen';
import { LoginScreen } from '../../src/screens/auth/LoginScreen';
import { WorkspaceSelectionScreen } from '../../src/screens/auth/WorkspaceSelectionScreen';
import { RoleLandingScreen } from '../../src/screens/role/RoleLandingScreen';
import { authStore, INITIAL_AUTH_STATE } from '../../src/store/auth/authStore';

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

function withSafeArea(element: React.ReactElement) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      {element}
    </SafeAreaProvider>
  );
}

beforeEach(() => {
  authStore.setState({
    ...INITIAL_AUTH_STATE,
    isLoading: false,
    status: 'unauthenticated',
  });
});

test('login requires a valid mobile number before requesting OTP', async () => {
  const navigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
  } as unknown as NativeStackScreenProps<
    AuthStackParamList,
    'Login'
  >['navigation'];
  const route = { key: 'Login-test', name: 'Login' as const };
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(<LoginScreen navigation={navigation} route={route} />),
    );
  });
  await ReactTestRenderer.act(async () => {
    await renderer!.root
      .findByProps({ accessibilityLabel: 'Request OTP' })
      .props.onPress();
  });

  expect(
    renderer!.root.findAll(
      node =>
        node.props.children === 'Enter a valid 10-digit Indian mobile number.',
    ).length,
  ).toBeGreaterThan(0);
  expect(JSON.stringify(renderer!.toJSON())).toContain('verified role');
  expect(navigation.navigate).not.toHaveBeenCalled();
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('OTP verification renders the masked destination', async () => {
  authStore.setState({
    pendingOtpRequest: {
      context: {
        input: { mobile: '9876543210' },
        kind: 'login',
      },
      destinationMasked: '+91 ••••••3210',
      expiresInSeconds: 300,
      requestedAt: new Date().toISOString(),
      requestId: 'request-1',
      resendAvailableInSeconds: 30,
    },
    status: 'otpRequired',
  });
  const navigation = {
    popToTop: jest.fn(),
  } as unknown as NativeStackScreenProps<
    AuthStackParamList,
    'OtpVerification'
  >['navigation'];
  const route = {
    key: 'OtpVerification-test',
    name: 'OtpVerification' as const,
  };
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(
        <OtpVerificationScreen navigation={navigation} route={route} />,
      ),
    );
  });

  expect(
    renderer!.root.findByProps({ testID: 'otp-verification-screen' }),
  ).toBeTruthy();
  expect(
    renderer!.root.findAll(
      node =>
        typeof node.props.children === 'string' &&
        node.props.children.includes('+91 ••••••3210'),
    ).length,
  ).toBeGreaterThan(0);
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('workspace selection renders only service-provided memberships', async () => {
  authStore.setState({
    memberships: [
      {
        id: 'membership-parent',
        role: 'PARENT',
        schoolId: 'school-1',
        schoolName: 'Demo Public School',
        status: 'ACTIVE',
        studentId: 'student-1',
        studentName: 'Rahul Kumar',
        userId: 'user-1',
      },
    ],
    status: 'membershipRequired',
    user: { id: 'user-1', name: 'Meera Patel', status: 'ACTIVE' },
  });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(<WorkspaceSelectionScreen />),
    );
  });

  expect(
    renderer!.root.findByProps({ testID: 'workspace-selection-screen' }),
  ).toBeTruthy();
  expect(JSON.stringify(renderer!.toJSON())).toContain('Rahul Kumar');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('role landing renders the selected membership context', async () => {
  authStore.setState({
    activeMembership: {
      branchId: 'branch-main',
      branchName: 'Main Branch',
      id: 'membership-accountant',
      role: 'ACCOUNTANT',
      schoolId: 'school-1',
      schoolName: 'Demo Public School',
      status: 'ACTIVE',
      userId: 'user-1',
    },
    memberships: [
      {
        id: 'membership-accountant',
        role: 'ACCOUNTANT',
        schoolId: 'school-1',
        schoolName: 'Demo Public School',
        status: 'ACTIVE',
        userId: 'user-1',
      },
    ],
    status: 'authenticated',
    user: { id: 'user-1', name: 'Vikram Rao', status: 'ACTIVE' },
  });
  const navigation = {} as NativeStackScreenProps<
    RoleStackParamList,
    'RoleLanding'
  >['navigation'];
  const route = {
    key: 'RoleLanding-test',
    name: 'RoleLanding' as const,
    params: { role: 'ACCOUNTANT' as const },
  };
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      withSafeArea(<RoleLandingScreen navigation={navigation} route={route} />),
    );
  });

  expect(
    renderer!.root.findByProps({ testID: 'role-landing-screen' }),
  ).toBeTruthy();
  const dashboard = JSON.stringify(renderer!.toJSON());
  expect(dashboard).toContain('Demo Public School');
  expect(dashboard).toContain('Quick access');
  expect(dashboard).toContain('Everything you need in one place');
  expect(dashboard).not.toContain('Dashboard coming later');
  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Collection Dashboard' }),
  ).toBeTruthy();
  await ReactTestRenderer.act(async () => renderer!.unmount());
});
