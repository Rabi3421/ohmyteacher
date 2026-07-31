import React from 'react';

import { AppScreen } from '../../components/common/AppScreen';
import { ErrorState } from '../../components/feedback/ErrorState';
import { useAuthStore } from '../../store';

export function SessionExpiredScreen() {
  const resetAuthFlow = useAuthStore(state => state.resetAuthFlow);

  return (
    <AppScreen testID="session-expired-screen">
      <ErrorState
        message="For your security, your session has ended. Sign in again to continue."
        onRetry={resetAuthFlow}
        retryLabel="Login Again"
        title="Session expired"
      />
    </AppScreen>
  );
}
