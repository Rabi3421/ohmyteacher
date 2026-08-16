import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ROUTES } from '../constants/routes';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { OtpVerificationScreen } from '../screens/auth/OtpVerificationScreen';
import { ComponentPreviewScreen } from '../screens/foundation/ComponentPreviewScreen';
import { PlaceholderScreen } from '../screens/foundation/PlaceholderScreen';
import type { AuthScreenProps, AuthStackParamList } from './navigationTypes';

const Stack = createNativeStackNavigator<AuthStackParamList>();

interface AuthNavigatorProps {
  initialRouteName?: keyof AuthStackParamList;
}

export function WelcomeRoute({ navigation }: AuthScreenProps<'Welcome'>) {
  return (
    <WelcomeScreen
      onComponentPreviewPress={
        __DEV__
          ? () => navigation.navigate(ROUTES.COMPONENT_PREVIEW)
          : undefined
      }
      onLoginPress={() => navigation.navigate(ROUTES.LOGIN)}
    />
  );
}

export function AuthNavigator({
  initialRouteName = ROUTES.WELCOME,
}: AuthNavigatorProps) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        animation: 'slide_from_right',
        headerShown: false,
      }}
    >
      <Stack.Screen component={WelcomeRoute} name={ROUTES.WELCOME} />
      <Stack.Screen component={LoginScreen} name={ROUTES.LOGIN} />
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
