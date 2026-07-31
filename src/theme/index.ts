import { darkColors, lightColors } from './colors';
import { radius } from './radius';
import { shadows } from './shadows';
import { iconSizes, layout, spacing } from './spacing';
import { typography, typographyVariants } from './typography';

export type ThemeMode = 'light' | 'dark' | 'system';

export const lightTheme = {
  mode: 'light',
  colors: lightColors,
  spacing,
  radius,
  shadows,
  typography,
  typographyVariants,
  iconSizes,
  layout,
} as const;

export const darkTheme = {
  ...lightTheme,
  mode: 'dark',
  colors: darkColors,
} as const;

export type AppTheme = typeof lightTheme | typeof darkTheme;

export {
  darkColors,
  iconSizes,
  layout,
  lightColors,
  radius,
  shadows,
  spacing,
  typography,
  typographyVariants,
};
