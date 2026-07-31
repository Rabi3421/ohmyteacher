export const spacing = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const;

export const layout = {
  screenPadding: spacing.md,
  screenPaddingLarge: spacing.xl,
  contentMaxWidth: 720,
  buttonHeight: 48,
  inputHeight: 52,
  compactHeight: 40,
  touchTarget: 44,
} as const;

export const iconSizes = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 36,
} as const;
