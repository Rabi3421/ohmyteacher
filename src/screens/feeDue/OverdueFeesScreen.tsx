import React from 'react';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { FeeDueListScreen } from './FeeDueListScreen';
export function OverdueFeesScreen({ navigation, route }: RoleScreenProps<'OverdueFees'>) {
  return <FeeDueListScreen mode="OVERDUE" navigation={navigation} params={route.params} />;
}
