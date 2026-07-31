import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { InlineError } from '../../components/feedback/InlineError';
import { DiscountFormFields } from '../../components/feeSetup/FeeFormFields';
import type { CreateDiscountDefinitionInput } from '../../models/fee';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeSetupStore } from '../../store';
import { validateDiscount, type FeeFormErrors } from '../../utils/feeValidation';
export const initialDiscount: CreateDiscountDefinitionInput = { applicableFeeHeadIds: [], category: 'SCHOLARSHIP', code: '', name: '', reasonRequired: true, startDate: new Date().toISOString().slice(0,10), status: 'ACTIVE', type: 'PERCENTAGE', value: 0 };
export function CreateDiscountDefinitionScreen({ navigation }: RoleScreenProps<'CreateDiscountDefinition'>) {
  const [value,setValue] = useState(initialDiscount); const [errors,setErrors] = useState<FeeFormErrors>({});
  const save = useFeeSetupStore(state => state.saveDiscount); const loading = useFeeSetupStore(state => state.isSavingDiscount); const error = useFeeSetupStore(state => state.error);
  return <AppScreen scrollable testID="create-discount-definition-screen"><View style={styles.maxWidth}><AppHeader includeSafeArea={false} onBackPress={navigation.goBack} title="Create Discount Definition" /><DiscountFormFields errors={errors} onChange={setValue} value={value} />{error ? <InlineError message={error.message} /> : null}<AppButton loading={loading} onPress={async () => { const next=validateDiscount(value); setErrors(next); if (!Object.keys(next).length && await save(value)) navigation.goBack(); }} style={styles.save} title="Create Discount" /></View></AppScreen>;
}
const styles=StyleSheet.create({maxWidth:{alignSelf:'center',maxWidth:700,width:'100%'},save:{marginTop:20}});
