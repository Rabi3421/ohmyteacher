/**
 * @format
 */

import React from 'react';
import { ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import App from '../App';
import { WelcomeRoute } from '../src/navigation/AuthNavigator';
import type { AuthStackParamList } from '../src/navigation/navigationTypes';
import { ComponentPreviewScreen } from '../src/screens/foundation/ComponentPreviewScreen';
import { authStore, INITIAL_AUTH_STATE } from '../src/store/auth/authStore';

jest.mock('react-native-linear-gradient', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View };
});

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

test('renders the application startup flow', async () => {
  authStore.setState(INITIAL_AUTH_STATE);
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <App />
      </SafeAreaProvider>,
    );
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(
    renderer!.root.findByProps({ accessibilityLabel: 'Login' }),
  ).toBeTruthy();
  expect(renderer!.root.findAllByType(ScrollView)).toHaveLength(0);
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test('renders the Component Preview development screen', async () => {
  const navigation = {
    navigate: jest.fn(),
  } as unknown as NativeStackScreenProps<
    AuthStackParamList,
    'ComponentPreview'
  >['navigation'];
  const route = {
    key: 'ComponentPreview-test',
    name: 'ComponentPreview' as const,
  };
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <ComponentPreviewScreen navigation={navigation} route={route} />
      </SafeAreaProvider>,
    );
    await Promise.resolve();
  });

  expect(
    renderer!.root.findByProps({ testID: 'component-preview-screen' }),
  ).toBeTruthy();
});

test('routes the single Welcome action to unified login', async () => {
  const navigate = jest.fn();
  const navigation = {
    navigate,
  } as unknown as NativeStackScreenProps<
    AuthStackParamList,
    'Welcome'
  >['navigation'];
  const route = { key: 'Welcome-test', name: 'Welcome' as const };
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <WelcomeRoute navigation={navigation} route={route} />,
    );
    await Promise.resolve();
  });

  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({ accessibilityLabel: 'Login' }).props.onPress();
  });

  expect(navigate).toHaveBeenCalledTimes(1);
  expect(navigate).toHaveBeenCalledWith('Login');
});
