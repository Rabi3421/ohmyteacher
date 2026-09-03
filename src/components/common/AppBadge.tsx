import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import { AppText } from './AppText';

export type BadgeStatus =
  | 'active'
  | 'inactive'
  | 'paid'
  | 'partial'
  | 'unpaid'
  | 'overdue'
  | 'draft'
  | 'completed'
  | 'locked'
  | 'published'
  | 'cancelled'
  | 'passed'
  | 'failed';

export interface AppBadgeProps extends ViewProps {
  status: BadgeStatus;
  label?: string;
}

const LABELS: Record<BadgeStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  paid: 'Paid',
  partial: 'Partial',
  unpaid: 'Unpaid',
  overdue: 'Overdue',
  draft: 'Draft',
  completed: 'Completed',
  locked: 'Locked',
  published: 'Published',
  cancelled: 'Cancelled',
  passed: 'Passed',
  failed: 'Failed',
};

export function AppBadge({ status, label = LABELS[status], style, ...props }: AppBadgeProps) {
  const theme = useAppTheme();
  const tone =
    status === 'active' ||
    status === 'paid' ||
    status === 'completed' ||
    status === 'published' ||
    status === 'passed'
      ? 'success'
      : status === 'partial' || status === 'draft'
        ? 'warning'
        : status === 'inactive' || status === 'locked' || status === 'unpaid'
          ? 'neutral'
          : 'error';
  const toneColors = {
    success: {
      background: theme.colors.successSubtle,
      foreground: theme.colors.success,
    },
    warning: {
      background: theme.colors.warningSubtle,
      foreground: theme.colors.warning,
    },
    error: {
      background: theme.colors.errorSubtle,
      foreground: theme.colors.error,
    },
    neutral: {
      background: theme.colors.surfaceMuted,
      foreground: theme.colors.textSecondary,
    },
  }[tone];

  return (
    <View
      accessibilityLabel={`${label} status`}
      style={[
        styles.badge,
        { backgroundColor: toneColors.background },
        style,
      ]}
      {...props}
    >
      <View style={[styles.dot, { backgroundColor: toneColors.foreground }]} />
      <AppText
        color={toneColors.foreground}
        numberOfLines={1}
        style={styles.label}
        variant="caption"
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    minHeight: 26,
    paddingHorizontal: 11,
  },
  label: {
    fontWeight: '600',
  },
  dot: {
    borderRadius: 4,
    height: 7,
    marginRight: 6,
    width: 7,
  },
});
