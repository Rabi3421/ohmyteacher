import React, { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import { AppText } from './AppText';

export type AppButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger';

export interface AppButtonProps
  extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: AppButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AppButton({
  title,
  variant = 'primary',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  accessibilityLabel = title,
  style,
  ...props
}: AppButtonProps) {
  const theme = useAppTheme();
  const isDisabled = disabled || loading;
  const filled = variant === 'primary' || variant === 'secondary' || variant === 'danger';
  const backgroundColor = {
    primary: theme.colors.primary,
    secondary: theme.colors.secondary,
    outline: theme.colors.transparent,
    ghost: theme.colors.transparent,
    danger: theme.colors.error,
  }[variant];
  const contentColor = filled
    ? theme.colors.textInverse
    : theme.colors.primary;
  const borderColor =
    variant === 'outline' ? theme.colors.borderStrong : backgroundColor;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor,
          minHeight: theme.layout.buttonHeight,
          opacity: isDisabled ? 0.5 : pressed ? 0.82 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} size="small" />
      ) : (
        <View style={styles.content}>
          {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
          <AppText color={contentColor} numberOfLines={1} variant="button">
            {title}
          </AppText>
          {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minWidth: 0,
  },
  fullWidth: {
    width: '100%',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
});
