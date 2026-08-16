import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import type { AppIconName } from '../icons/AppIcon';
import { AppIcon } from '../icons/AppIcon';
import { AppText } from './AppText';

interface AppStatCardProps {
  label: string;
  value: string | number;
  icon?: AppIconName;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: string; positive?: boolean };
  onPress?: () => void;
  compact?: boolean;
}

export function AppStatCard({
  label,
  value,
  icon,
  iconColor,
  iconBg,
  trend,
  onPress,
  compact = false,
}: AppStatCardProps) {
  const theme = useAppTheme();
  const resolvedIconColor = iconColor ?? theme.colors.primary;
  const resolvedIconBg = iconBg ?? theme.colors.primarySubtle;

  const content = (
    <View style={[styles.container, compact && styles.compact, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {icon && (
        <View style={[styles.iconBox, { backgroundColor: resolvedIconBg }]}>
          <AppIcon color={resolvedIconColor} name={icon} size={18} strokeWidth={2} />
        </View>
      )}
      <AppText
        style={[styles.value, { color: theme.colors.textPrimary }]}
        variant={compact ? 'title' : 'amountMedium'}
      >
        {value}
      </AppText>
      <AppText style={{ color: theme.colors.textSecondary }} variant="caption">
        {label}
      </AppText>
      {trend && (
        <View style={styles.trendRow}>
          <AppIcon
            color={trend.positive !== false ? theme.colors.success : theme.colors.error}
            name={trend.positive !== false ? 'trending-up' : 'arrow-right'}
            size={12}
          />
          <AppText
            style={[
              styles.trendText,
              { color: trend.positive !== false ? theme.colors.success : theme.colors.error },
            ]}
            variant="caption"
          >
            {trend.value}
          </AppText>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  compact: {
    padding: 12,
  },
  container: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    padding: 16,
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    marginBottom: 4,
    width: 36,
  },
  pressed: {
    opacity: 0.85,
  },
  trendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  value: {
    fontWeight: '700',
  },
});
