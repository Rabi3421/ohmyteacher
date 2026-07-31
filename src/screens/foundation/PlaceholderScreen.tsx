import React from 'react';

import { AppButton } from '../../components/common/AppButton';
import { AppScreen } from '../../components/common/AppScreen';
import { EmptyState } from '../../components/feedback/EmptyState';
import type { RootScreenProps } from '../../navigation/navigationTypes';

export function PlaceholderScreen({
  navigation,
  route,
}: RootScreenProps<'Placeholder'>) {
  return (
    <AppScreen>
      <EmptyState
        actionLabel="Back to foundation"
        description="This route is reserved for a future module. No business screen is included in Phase 1."
        onAction={navigation.goBack}
        title={route.params?.title ?? 'Coming in a future phase'}
      />
      <AppButton
        onPress={navigation.goBack}
        title="Go back"
        variant="ghost"
      />
    </AppScreen>
  );
}
