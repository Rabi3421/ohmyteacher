import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import type { TypographyVariant } from '../../theme/typography';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export function AppText({
  variant = 'body',
  color,
  align,
  style,
  maxFontSizeMultiplier = 1.4,
  ...props
}: AppTextProps) {
  const theme = useAppTheme();

  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        theme.typographyVariants[variant],
        styles.text,
        { color: color ?? theme.colors.textPrimary, textAlign: align },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  text: {
    flexShrink: 1,
  },
});
