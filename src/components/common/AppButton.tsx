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
import LinearGradient from 'react-native-linear-gradient';

import { useAppTheme } from '../../hooks/useAppTheme';
import { brandGradient } from '../../theme/gradients';
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

  // The primary action carries the welcome screen's brand gradient; the rest
  // stay flat so a screen never shows two competing gradients.
  const useGradient = variant === 'primary' && !isDisabled;

  const backgroundColor = {
    primary: theme.colors.primary,
    secondary: theme.colors.secondary,
    outline: theme.colors.surface,
    ghost: theme.colors.transparent,
    danger: theme.colors.error,
  }[variant];
  const contentColor = filled ? theme.colors.textInverse : theme.colors.primary;
  const borderColor = {
    primary: theme.colors.primary,
    secondary: theme.colors.secondary,
    outline: theme.colors.border,
    ghost: theme.colors.transparent,
    danger: theme.colors.error,
  }[variant];

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
          opacity: isDisabled ? 0.5 : pressed ? 0.86 : 1,
        },
        variant === 'outline' && [styles.soft, { shadowColor: theme.colors.shadow }],
        useGradient && [styles.raised, { shadowColor: theme.colors.primary }],
        fullWidth && styles.fullWidth,
        style,
      ]}
      {...props}
    >
      {useGradient ? (
        <LinearGradient
          colors={[...brandGradient(theme.mode)]}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

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
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    overflow: 'hidden',
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
  raised: {
    elevation: 4,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
  },
  rightIcon: {
    marginLeft: 8,
  },
  soft: {
    elevation: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
});
