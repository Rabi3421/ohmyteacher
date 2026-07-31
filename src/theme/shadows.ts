import type { ViewStyle } from 'react-native';

import { palette } from './colors';

export const shadows: Record<'none' | 'sm' | 'md' | 'lg', ViewStyle> = {
  none: {
    elevation: 0,
    shadowOpacity: 0,
  },
  sm: {
    elevation: 2,
    shadowColor: palette.slate900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  md: {
    elevation: 4,
    shadowColor: palette.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  lg: {
    elevation: 8,
    shadowColor: palette.slate900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
};
