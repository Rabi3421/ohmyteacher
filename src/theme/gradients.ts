import type { ThemeMode } from './index';

/**
 * The brand gradient introduced on the welcome screen. Shared by every
 * signed-in header so the app shell reads as one continuous experience.
 */
export const gradients = {
  brand: ['#3FAEFF', '#1478F2', '#0B57C7'] as const,
  brandDark: ['#1D4ED8', '#123A8F', '#0A1F4D'] as const,
};

export function brandGradient(mode: ThemeMode | string): readonly string[] {
  return mode === 'dark' ? gradients.brandDark : gradients.brand;
}

/** Status bar colour matching the top of the brand gradient. */
export function brandGradientTop(mode: ThemeMode | string): string {
  return mode === 'dark' ? gradients.brandDark[0] : gradients.brand[0];
}
