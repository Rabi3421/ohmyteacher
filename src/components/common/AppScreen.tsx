import React from 'react';

import {
  ScreenContainer,
  type ScreenContainerProps,
} from '../layout/ScreenContainer';

export type AppScreenProps = ScreenContainerProps;

export function AppScreen(props: AppScreenProps) {
  return <ScreenContainer {...props} />;
}
