import React from 'react';

import { AppScreen } from '../../components/common/AppScreen';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useAuthStore } from '../../store';

export function UnsupportedRoleScreen() {
  const logout = useAuthStore(state => state.logout);

  return (
    <AppScreen testID="unsupported-role-screen">
      <EmptyState
        actionLabel="Sign out"
        description="This verified account role is not supported in this app version. Please contact your administrator if you need different access."
        onAction={logout}
        title="Role not supported in this app version"
      />
    </AppScreen>
  );
}
