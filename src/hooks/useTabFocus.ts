import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import type { AppTabId } from '../components/layout/AppBottomTabBar';
import { useActiveTab } from '../navigation/ActiveTabContext';

/**
 * Call this in any screen that should highlight a specific tab.
 * It uses useFocusEffect so it fires whenever the screen is focused
 * (including when navigating back to it).
 */
export function useTabFocus(tab: AppTabId) {
  const { setActiveTab } = useActiveTab();

  useFocusEffect(
    useCallback(() => {
      setActiveTab(tab);
    }, [setActiveTab, tab]),
  );
}
