import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './src/navigation/RootNavigator';
import { setUnauthorizedHandler } from './src/services/api/apiEvents';
import { authStore, useAppStore } from './src/store';

function App() {
  useEffect(() => {
    const initializeApp = useAppStore.getState().initialize();
    const initializeAuth = authStore.getState().initializeAuth();
    Promise.all([initializeApp, initializeAuth]).catch(() => {
      // Each store exposes its own recoverable initialization state.
    });
    return setUnauthorizedHandler(() => {
      authStore.getState().expireSession().catch(() => {
        // Local auth state still transitions even if storage cleanup fails.
      });
    });
  }, []);

  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}

export default App;
