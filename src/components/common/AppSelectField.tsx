import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import { AppIcon } from '../icons/AppIcon';
import { AppText } from './AppText';

export interface AppSelectFieldProps {
  label?: string;
  value?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  leftIcon?: ReactNode;
  onPress: () => void;
  style?: ViewStyle;
}

export function AppSelectField({
  label,
  value,
  placeholder = 'Select an option',
  error,
  helperText,
  disabled,
  required,
  leftIcon,
  onPress,
  style,
}: AppSelectFieldProps) {
  const theme = useAppTheme();

  return (
    <View style={style}>
      {label ? (
        <AppText style={styles.label} variant="label">
          {label}
          {required ? (
            <AppText color={theme.colors.error} variant="label">
              {' *'}
            </AppText>
          ) : null}
        </AppText>
      ) : null}
      <Pressable
        accessibilityLabel={`${label ?? 'Selection'}: ${value ?? placeholder}`}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: disabled
              ? theme.colors.surfaceMuted
              : theme.colors.surface,
            borderColor: error ? theme.colors.error : theme.colors.border,
            minHeight: theme.layout.inputHeight,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <AppText
          color={
            value ? theme.colors.textPrimary : theme.colors.textTertiary
          }
          numberOfLines={1}
          style={styles.value}
        >
          {value ?? placeholder}
        </AppText>
        <AppIcon
          color={theme.colors.textSecondary}
          name="chevron-down"
          size={theme.iconSizes.sm}
        />
      </Pressable>
      {error ? (
        <AppText color={theme.colors.error} style={styles.supporting} variant="caption">
          {error}
        </AppText>
      ) : helperText ? (
        <AppText
          color={theme.colors.textSecondary}
          style={styles.supporting}
          variant="caption"
        >
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 14,
  },
  label: {
    marginBottom: 6,
  },
  leftIcon: {
    marginRight: 10,
  },
  supporting: {
    marginLeft: 2,
    marginTop: 5,
  },
  value: {
    flex: 1,
    marginRight: 8,
  },
});
