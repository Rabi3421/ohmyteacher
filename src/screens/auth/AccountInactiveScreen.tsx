import React from 'react';

import { AppScreen } from '../../components/common/AppScreen';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useAuthStore } from '../../store';

const MESSAGES = {
  USER_INACTIVE:
    'Your account is currently inactive. Contact your school or platform administrator for assistance.',
  SCHOOL_INACTIVE:
    'This school workspace is currently inactive. Contact the school administration for assistance.',
  BRANCH_INACTIVE:
    'This branch workspace is currently inactive. Contact the school administration for assistance.',
  MEMBERSHIP_INACTIVE:
    'No active workspace membership is available. Contact your school administration to review your access.',
} as const;

export function AccountInactiveScreen() {
  const reason = useAuthStore(state => state.inactiveReason);
  const logout = useAuthStore(state => state.logout);

  return (
    <AppScreen testID="account-inactive-screen">
      <EmptyState
        actionLabel="Return to login"
        description={
          MESSAGES[reason ?? 'MEMBERSHIP_INACTIVE']
        }
        onAction={logout}
        title="Account access unavailable"
      />
    </AppScreen>
  );
}
