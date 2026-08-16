import React from 'react';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationLightTheme,
  NavigationContainer,
  type Theme as NavigationTheme,
} from '@react-navigation/native';

import { AppScreen } from '../components/common/AppScreen';
import { ErrorState } from '../components/feedback/ErrorState';
import { useAppTheme } from '../hooks/useAppTheme';
import { AccountInactiveScreen } from '../screens/auth/AccountInactiveScreen';
import { NewUserOnboardingScreen } from '../screens/auth/NewUserOnboardingScreen';
import { SessionExpiredScreen } from '../screens/auth/SessionExpiredScreen';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { UnsupportedRoleScreen } from '../screens/auth/UnsupportedRoleScreen';
import { WorkspaceSelectionScreen } from '../screens/auth/WorkspaceSelectionScreen';
import { useAuthStore } from '../store';
import { AccountantNavigator } from './AccountantNavigator';
import { getAuthInitialRoute } from './authNavigatorResolver';
import { AuthNavigator } from './AuthNavigator';
import { BranchAdminNavigator } from './BranchAdminNavigator';
import { navigationRef } from './navigationRef';
import { ParentNavigator } from './ParentNavigator';
import { ReceptionistNavigator } from './ReceptionistNavigator';
import { getNavigatorForRole } from './roleNavigatorResolver';
import { SchoolAdminNavigator } from './SchoolAdminNavigator';
import { StudentNavigator } from './StudentNavigator';
import { SuperAdminNavigator } from './SuperAdminNavigator';

export function RootNavigator() {
  const theme = useAppTheme();
  const status = useAuthStore(state => state.status);
  const activeMembership = useAuthStore(state => state.activeMembership);
  const navigationBase =
    theme.mode === 'dark' ? NavigationDarkTheme : NavigationLightTheme;
  const navigationTheme: NavigationTheme = {
    ...navigationBase,
    colors: {
      ...navigationBase.colors,
      background: theme.colors.background,
      border: theme.colors.border,
      card: theme.colors.surface,
      notification: theme.colors.error,
      primary: theme.colors.primary,
      text: theme.colors.textPrimary,
    },
  };
  const navigatorKey = activeMembership
    ? getNavigatorForRole(activeMembership.role)
    : null;

  return (
    <NavigationContainer
      key={`${status}:${activeMembership?.id ?? 'none'}`}
      ref={navigationRef}
      theme={navigationTheme}
    >
      {status === 'initializing' ? <SplashScreen /> : null}
      {status === 'unauthenticated' || status === 'otpRequired' ? (
        <AuthNavigator
          initialRouteName={getAuthInitialRoute(status)}
        />
      ) : null}
      {status === 'membershipRequired' ? (
        <WorkspaceSelectionScreen />
      ) : null}
      {status === 'onboardingRequired' ? (
        <NewUserOnboardingScreen />
      ) : null}
      {status === 'unsupportedRole' ? <UnsupportedRoleScreen /> : null}
      {status === 'inactive' ? <AccountInactiveScreen /> : null}
      {status === 'sessionExpired' ? <SessionExpiredScreen /> : null}
      {status === 'authenticated' ? (
        <ResolvedRoleNavigator navigatorKey={navigatorKey} />
      ) : null}
    </NavigationContainer>
  );
}

function ResolvedRoleNavigator({
  navigatorKey,
}: {
  navigatorKey: ReturnType<typeof getNavigatorForRole>;
}) {
  const logout = useAuthStore(state => state.logout);

  switch (navigatorKey) {
    case 'SuperAdminNavigator':
      return <SuperAdminNavigator />;
    case 'SchoolAdminNavigator':
      return <SchoolAdminNavigator />;
    case 'BranchAdminNavigator':
      return <BranchAdminNavigator />;
    case 'AccountantNavigator':
      return <AccountantNavigator />;
    case 'ReceptionistNavigator':
      return <ReceptionistNavigator />;
    case 'ParentNavigator':
      return <ParentNavigator />;
    case 'StudentNavigator':
      return <StudentNavigator />;
    default:
      return (
        <AppScreen>
          <ErrorState
            message="Your verified role is not supported by this app version."
            onRetry={logout}
            retryLabel="Return to login"
            title="Unsupported access"
          />
        </AppScreen>
      );
  }
}
