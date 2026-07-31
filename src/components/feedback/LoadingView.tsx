import React from 'react';
import { ActivityIndicator, StyleSheet, View, type ViewProps } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import { AppText } from '../common/AppText';

export interface LoadingViewProps extends ViewProps {
  message?: string;
  compact?: boolean;
}

export function LoadingView({
  message = 'Loading…',
  compact = false,
  style,
  ...props
}: LoadingViewProps) {
  const theme = useAppTheme();

  return (
    <View
      accessibilityLabel={message}
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      style={[styles.container, compact && styles.compact, style]}
      {...props}
    >
      <ActivityIndicator color={theme.colors.primary} size={compact ? 'small' : 'large'} />
      {message ? (
        <AppText
          color={theme.colors.textSecondary}
          style={styles.message}
          variant={compact ? 'caption' : 'bodyMedium'}
        >
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  compact: {
    flex: 0,
    minHeight: 72,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 180,
    padding: 24,
  },
  message: {
    marginTop: 12,
    textAlign: 'center',
  },
});
