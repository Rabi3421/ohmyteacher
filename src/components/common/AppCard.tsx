import React, { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';

export type AppCardVariant = 'default' | 'elevated' | 'outlined';

export interface AppCardProps
  extends Omit<PressableProps, 'children' | 'style'> {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  variant?: AppCardVariant;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function AppCard({
  children,
  header,
  footer,
  variant = 'default',
  onPress,
  disabled,
  style,
  contentStyle,
  ...props
}: AppCardProps) {
  const theme = useAppTheme();
  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    {
      backgroundColor: theme.colors.surface,
      borderColor:
        variant === 'outlined' ? theme.colors.borderStrong : theme.colors.border,
      borderRadius: theme.radius.lg,
    },
    variant === 'elevated' ? theme.shadows.md : theme.shadows.none,
    style,
  ];
  const content = (
    <>
      {header ? (
        <View
          style={[
            styles.header,
            { borderBottomColor: theme.colors.border },
          ]}
        >
          {header}
        </View>
      ) : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
      {footer ? (
        <View
          style={[
            styles.footer,
            { borderTopColor: theme.colors.border },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}
        {...props}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
