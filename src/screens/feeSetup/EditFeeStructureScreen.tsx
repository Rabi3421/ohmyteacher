import React from 'react';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { FeeStructureFormScreen } from './FeeStructureFormScreen';
export function EditFeeStructureScreen({ navigation, route }: RoleScreenProps<'EditFeeStructure'>) {
  return <FeeStructureFormScreen editingId={route.params.feeStructureId} navigation={navigation} />;
}
