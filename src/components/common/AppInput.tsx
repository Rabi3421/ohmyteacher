import React, { type ReactNode, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import { AppIcon } from '../icons/AppIcon';
import { AppText } from './AppText';

export interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  disabled?: boolean;
  containerStyle?: TextInputProps['style'];
}

export function AppInput({
  label,
  error,
  helperText,
  required,
  leftIcon,
  rightIcon,
  disabled,
  secureTextEntry,
  editable,
  multiline,
  style,
  containerStyle,
  ...props
}: AppInputProps) {
  const theme = useAppTheme();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isEditable = editable !== false && !disabled;
  const hasPasswordToggle = Boolean(secureTextEntry);
  const trailingIcon = hasPasswordToggle ? (
    <Pressable
      accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => setPasswordVisible(current => !current)}
      style={styles.iconButton}
    >
      <AppIcon
        color={theme.colors.textSecondary}
        name={passwordVisible ? 'eye-off' : 'eye'}
        size={theme.iconSizes.md}
      />
    </Pressable>
  ) : (
    rightIcon
  );

  return (
    <View style={containerStyle}>
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
      <View
        style={[
          styles.inputFrame,
          {
            backgroundColor: disabled
              ? theme.colors.surfaceMuted
              : theme.colors.surface,
            borderColor: error ? theme.colors.error : theme.colors.border,
            minHeight: multiline
              ? theme.layout.inputHeight * 2
              : theme.layout.inputHeight,
          },
        ]}
      >
        {leftIcon ? <View style={styles.leadingIcon}>{leftIcon}</View> : null}
        <TextInput
          accessibilityState={{ disabled: !isEditable }}
          editable={isEditable}
          maxFontSizeMultiplier={1.4}
          multiline={multiline}
          placeholderTextColor={theme.colors.textTertiary}
          secureTextEntry={secureTextEntry && !passwordVisible}
          selectionColor={theme.colors.primary}
          style={[
            styles.input,
            multiline && styles.multiline,
            {
              color: isEditable
                ? theme.colors.textPrimary
                : theme.colors.disabledText,
              fontSize: theme.typography.sizes.body,
            },
            style,
          ]}
          {...props}
        />
        {trailingIcon ? (
          <View style={styles.trailingIcon}>{trailingIcon}</View>
        ) : null}
      </View>
      {error ? (
        <AppText color={theme.colors.error} style={styles.supportingText} variant="caption">
          {error}
        </AppText>
      ) : helperText ? (
        <AppText
          color={theme.colors.textSecondary}
          style={styles.supportingText}
          variant="caption"
        >
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
  },
  inputFrame: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  leadingIcon: {
    marginLeft: 14,
  },
  trailingIcon: {
    marginRight: 10,
  },
  iconButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  supportingText: {
    marginLeft: 2,
    marginTop: 5,
  },
});
