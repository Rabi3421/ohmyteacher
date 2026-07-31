import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ROUTES } from '../constants/routes';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { PlatformAdminLoginScreen } from '../screens/auth/PlatformAdminLoginScreen';
import { SchoolLoginScreen } from '../screens/auth/SchoolLoginScreen';
import { OtpVerificationScreen } from '../screens/auth/OtpVerificationScreen';
import { ComponentPreviewScreen } from '../screens/foundation/ComponentPreviewScreen';
import { PlaceholderScreen } from '../screens/foundation/PlaceholderScreen';
import type {
  AuthScreenProps,
  AuthStackParamList,
} from './navigationTypes';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function WelcomeRoute({
  navigation,
}: AuthScreenProps<'Welcome'>) {
  return (
    <WelcomeScreen
      onComponentPreviewPress={
        __DEV__
          ? () => navigation.navigate(ROUTES.COMPONENT_PREVIEW)
          : undefined
      }
      onPlatformAdminLoginPress={() =>
        navigation.navigate(ROUTES.PLATFORM_ADMIN_LOGIN)
      }
      onSchoolLoginPress={() => navigation.navigate(ROUTES.SCHOOL_LOGIN)}
    />
  );
}

export function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName={ROUTES.WELCOME}
      screenOptions={{
        animation: 'slide_from_right',
        headerShown: false,
      }}
    >
      <Stack.Screen component={WelcomeRoute} name={ROUTES.WELCOME} />
      <Stack.Screen component={SchoolLoginScreen} name={ROUTES.SCHOOL_LOGIN} />
      <Stack.Screen
        component={PlatformAdminLoginScreen}
        name={ROUTES.PLATFORM_ADMIN_LOGIN}
      />
      <Stack.Screen
        component={OtpVerificationScreen}
        name={ROUTES.OTP_VERIFICATION}
      />
      {__DEV__ ? (
        <>
          <Stack.Screen
            component={ComponentPreviewScreen}
            name={ROUTES.COMPONENT_PREVIEW}
          />
          <Stack.Screen
            component={PlaceholderScreen}
            name={ROUTES.PLACEHOLDER}
          />
        </>
      ) : null}
    </Stack.Navigator>
  );
}
