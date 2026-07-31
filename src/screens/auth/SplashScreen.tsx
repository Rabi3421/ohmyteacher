import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { BrandMark } from '../../components/welcome/BrandMark';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useAuthStore } from '../../store';

export function SplashScreen() {
  const theme = useAppTheme();
  const error = useAuthStore(state => state.error);
  const initializeAuth = useAuthStore(state => state.initializeAuth);

  return (
    <AppScreen keyboardAvoiding={false} testID="splash-screen">
      <View style={styles.content}>
        <BrandMark size={104} />
        <AppText align="center" style={styles.brand} variant="heading1">
          OhMyTeacher
        </AppText>
        <AppText
          align="center"
          color={theme.colors.textSecondary}
          style={styles.tagline}
          variant="subtitle"
        >
          Teach More. Manage Less.
        </AppText>
        {error ? (
          <ErrorState
            message={error.message}
            onRetry={initializeAuth}
            style={styles.feedback}
            title="Unable to restore your session"
          />
        ) : (
          <LoadingView
            message="Preparing your workspace…"
            style={styles.feedback}
          />
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  brand: {
    marginTop: 12,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  feedback: {
    flex: 0,
    marginTop: 24,
    minHeight: 140,
    width: '100%',
  },
  tagline: {
    marginTop: 6,
  },
});
