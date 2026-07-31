import React from 'react';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { FeeDueListScreen } from './FeeDueListScreen';
export function PendingFeesScreen({ navigation, route }: RoleScreenProps<'PendingFees'>) {
  return <FeeDueListScreen mode="PENDING" navigation={navigation} params={route.params} />;
}
