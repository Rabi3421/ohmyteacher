import { useCallback } from 'react';

import type { AppRole } from '../constants/permissions';
import { ROUTES } from '../constants/routes';
import type { AppTabId } from '../components/layout/AppBottomTabBar';
import { navigationRef } from '../navigation/navigationRef';

/**
 * Tab navigation using navigationRef — works both inside and outside a navigator.
 */
export function useTabNavigation(role: AppRole) {
  const navigateToTab = useCallback(
    (tab: AppTabId) => {
      if (!navigationRef.isReady()) return;
      switch (tab) {
        case 'home':
          navigationRef.navigate('RoleLanding', { role });
          break;
        case 'academics':
          navigationRef.navigate('AcademicsHub', { role });
          break;
        case 'fees':
          navigationRef.navigate('FeesHub', { role });
          break;
        case 'exams':
          navigationRef.navigate('ExamsHub', { role });
          break;
        case 'more':
          navigationRef.navigate('MoreMenu', { role });
          break;
      }
    },
    [role],
  );

  return { navigateToTab };
}
