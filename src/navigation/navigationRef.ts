import { createNavigationContainerRef } from '@react-navigation/native';

import type { AppNavigationParamList } from './navigationTypes';

export const navigationRef =
  createNavigationContainerRef<AppNavigationParamList>();
