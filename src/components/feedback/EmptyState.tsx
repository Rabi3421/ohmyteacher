import React, { type ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import { AppButton } from '../common/AppButton';
import { AppText } from '../common/AppText';
import { AppIcon } from '../icons/AppIcon';

export interface EmptyStateProps extends ViewProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  style,
  ...props
}: EmptyStateProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, style]} {...props}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: theme.colors.primarySubtle },
        ]}
      >
        {icon ?? (
          <AppIcon
            color={theme.colors.primary}
            name="inbox"
            size={theme.iconSizes.xl}
          />
        )}
      </View>
      <AppText align="center" style={styles.title} variant="title">
        {title}
      </AppText>
      {description ? (
        <AppText
          align="center"
          color={theme.colors.textSecondary}
          style={styles.description}
        >
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <AppButton
          onPress={onAction}
          style={styles.action}
          title={actionLabel}
          variant="outline"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    marginTop: 18,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
    padding: 24,
  },
  description: {
    marginTop: 6,
    maxWidth: 360,
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: 28,
    height: 64,
    justifyContent: 'center',
    marginBottom: 16,
    width: 64,
  },
  title: {
    marginTop: 2,
  },
});
