import { useColorScheme } from 'react-native';

import { useAppStore } from '../store';
import { darkTheme, lightTheme, type AppTheme } from '../theme';

export function useAppTheme(): AppTheme {
  const systemMode = useColorScheme();
  const themeMode = useAppStore(state => state.themeMode);
  const resolvedMode = themeMode === 'system' ? systemMode : themeMode;

  return resolvedMode === 'dark' ? darkTheme : lightTheme;
}
