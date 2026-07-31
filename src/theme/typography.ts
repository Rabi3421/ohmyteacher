import type { TextStyle } from 'react-native';

export const typography = {
  sizes: {
    caption: 12,
    bodySmall: 14,
    body: 16,
    subtitle: 17,
    button: 16,
    title: 20,
    heading3: 22,
    heading2: 26,
    heading1: 32,
    headingSmall: 28,
    heading: 36,
    brand: 40,
    display: 40,
    amountMedium: 24,
    amountLarge: 34,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extraBold: '800',
  },
  lineHeights: {
    caption: 18,
    bodySmall: 20,
    body: 24,
    subtitle: 25,
    title: 28,
    heading3: 30,
    heading2: 34,
    heading1: 40,
    heading: 42,
    display: 48,
    amountMedium: 30,
    amountLarge: 42,
  },
} as const;

export type TypographyVariant =
  | 'display'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'bodyMedium'
  | 'caption'
  | 'label'
  | 'button'
  | 'amountLarge'
  | 'amountMedium';

export const typographyVariants: Record<TypographyVariant, TextStyle> = {
  display: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.extraBold,
    lineHeight: typography.lineHeights.display,
  },
  heading1: {
    fontSize: typography.sizes.heading1,
    fontWeight: typography.weights.bold,
    lineHeight: typography.lineHeights.heading1,
  },
  heading2: {
    fontSize: typography.sizes.heading2,
    fontWeight: typography.weights.bold,
    lineHeight: typography.lineHeights.heading2,
  },
  heading3: {
    fontSize: typography.sizes.heading3,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.lineHeights.heading3,
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.lineHeights.title,
  },
  subtitle: {
    fontSize: typography.sizes.subtitle,
    fontWeight: typography.weights.regular,
    lineHeight: typography.lineHeights.subtitle,
  },
  body: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.regular,
    lineHeight: typography.lineHeights.body,
  },
  bodyMedium: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    lineHeight: typography.lineHeights.body,
  },
  caption: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.regular,
    lineHeight: typography.lineHeights.caption,
  },
  label: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.medium,
    lineHeight: typography.lineHeights.bodySmall,
  },
  button: {
    fontSize: typography.sizes.button,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.lineHeights.body,
  },
  amountLarge: {
    fontSize: typography.sizes.amountLarge,
    fontWeight: typography.weights.bold,
    lineHeight: typography.lineHeights.amountLarge,
  },
  amountMedium: {
    fontSize: typography.sizes.amountMedium,
    fontWeight: typography.weights.bold,
    lineHeight: typography.lineHeights.amountMedium,
  },
};
