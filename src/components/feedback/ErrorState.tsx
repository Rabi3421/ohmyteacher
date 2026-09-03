import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import { AppButton } from '../common/AppButton';
import { AppText } from '../common/AppText';
import { AppIcon } from '../icons/AppIcon';

export interface ErrorStateProps extends ViewProps {
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  retryLabel = 'Try again',
  onRetry,
  style,
  ...props
}: ErrorStateProps) {
  const theme = useAppTheme();

  return (
    <View accessibilityLiveRegion="polite" style={[styles.container, style]} {...props}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: theme.colors.errorSubtle },
        ]}
      >
        <AppIcon
          color={theme.colors.error}
          name="alert-circle"
          size={theme.iconSizes.xl}
        />
      </View>
      <AppText align="center" variant="title">
        {title}
      </AppText>
      <AppText
        align="center"
        color={theme.colors.textSecondary}
        style={styles.message}
      >
        {message}
      </AppText>
      {onRetry ? (
        <AppButton
          leftIcon={
            <AppIcon
              color={theme.colors.primary}
              name="refresh"
              size={theme.iconSizes.sm}
            />
          }
          onPress={onRetry}
          style={styles.action}
          title={retryLabel}
          variant="outline"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    marginTop: 20,
    minWidth: 180,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: 26,
    height: 76,
    justifyContent: 'center',
    marginBottom: 18,
    width: 76,
  },
  message: {
    marginTop: 6,
    maxWidth: 360,
  },
});
