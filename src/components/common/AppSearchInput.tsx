import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import { AppIcon } from '../icons/AppIcon';
import { AppInput, type AppInputProps } from './AppInput';

export interface AppSearchInputProps
  extends Omit<AppInputProps, 'leftIcon' | 'rightIcon' | 'secureTextEntry'> {
  value: string;
  onChangeText: (value: string) => void;
  onClear?: () => void;
}

export function AppSearchInput({
  value,
  onChangeText,
  onClear,
  placeholder = 'Search',
  ...props
}: AppSearchInputProps) {
  const theme = useAppTheme();

  return (
    <AppInput
      accessibilityLabel={props.accessibilityLabel ?? placeholder}
      leftIcon={
        <AppIcon
          color={theme.colors.textSecondary}
          name="search"
          size={theme.iconSizes.sm}
        />
      }
      onChangeText={onChangeText}
      placeholder={placeholder}
      returnKeyType="search"
      rightIcon={
        value ? (
          <Pressable
            accessibilityLabel="Clear search"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              onChangeText('');
              onClear?.();
            }}
            style={styles.clearButton}
          >
            <AppIcon
              color={theme.colors.textSecondary}
              name="close"
              size={theme.iconSizes.sm}
            />
          </Pressable>
        ) : undefined
      }
      value={value}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  clearButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
});
