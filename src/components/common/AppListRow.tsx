import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import type { AppIconName } from '../icons/AppIcon';
import { AppIcon } from '../icons/AppIcon';
import { AppText } from './AppText';

interface AppListRowProps {
  title: string;
  subtitle?: string;
  leftIcon?: AppIconName;
  leftIconColor?: string;
  leftIconBg?: string;
  rightLabel?: string;
  rightIcon?: AppIconName;
  showChevron?: boolean;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export function AppListRow({
  title,
  subtitle,
  leftIcon,
  leftIconColor,
  leftIconBg,
  rightLabel,
  rightIcon,
  showChevron = true,
  onPress,
  destructive = false,
  disabled = false,
}: AppListRowProps) {
  const theme = useAppTheme();
  const titleColor = destructive ? theme.colors.error : disabled ? theme.colors.disabledText : theme.colors.textPrimary;
  const iconColor = leftIconColor ?? (destructive ? theme.colors.error : theme.colors.primary);
  const iconBg = leftIconBg ?? (destructive ? theme.colors.errorSubtle : theme.colors.primarySubtle);

  const inner = (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      {leftIcon && (
        <View style={[styles.leftIconBox, { backgroundColor: iconBg }]}>
          <AppIcon color={iconColor} name={leftIcon} size={19} strokeWidth={2} />
        </View>
      )}
      <View style={styles.textArea}>
        <AppText style={{ color: titleColor }} variant="bodyMedium">
          {title}
        </AppText>
        {subtitle && (
          <AppText style={{ color: theme.colors.textSecondary, marginTop: 1 }} variant="caption">
            {subtitle}
          </AppText>
        )}
      </View>
      {rightLabel && (
        <AppText style={{ color: theme.colors.textSecondary }} variant="caption">
          {rightLabel}
        </AppText>
      )}
      {rightIcon && (
        <AppIcon color={theme.colors.textTertiary} name={rightIcon} size={16} />
      )}
      {showChevron && !rightIcon && (
        <AppIcon color={theme.colors.textTertiary} name="chevron-right" size={16} />
      )}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  leftIconBox: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  textArea: {
    flex: 1,
  },
});
