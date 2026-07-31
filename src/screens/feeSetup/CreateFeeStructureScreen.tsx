import React from 'react';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { FeeStructureFormScreen } from './FeeStructureFormScreen';
export function CreateFeeStructureScreen({ navigation }: RoleScreenProps<'CreateFeeStructure'>) {
  return <FeeStructureFormScreen navigation={navigation} />;
}
