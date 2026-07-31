import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { DiscountFormFields } from '../../components/feeSetup/FeeFormFields';
import type { CreateDiscountDefinitionInput } from '../../models/fee';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeSetupStore } from '../../store';
import { validateDiscount, type FeeFormErrors } from '../../utils/feeValidation';
export function EditDiscountDefinitionScreen({ navigation, route }: RoleScreenProps<'EditDiscountDefinition'>) {
  const current=useFeeSetupStore(s=>s.currentDiscount); const load=useFeeSetupStore(s=>s.loadDiscount); const save=useFeeSetupStore(s=>s.saveDiscount); const updateStatus=useFeeSetupStore(s=>s.updateDiscountStatus); const loading=useFeeSetupStore(s=>s.isSavingDiscount); const error=useFeeSetupStore(s=>s.error);
  const [value,setValue]=useState<CreateDiscountDefinitionInput|null>(null); const [errors,setErrors]=useState<FeeFormErrors>({});
  useEffect(()=>{if(current?.id!==route.params.discountId){load(route.params.discountId).catch(()=>undefined);return;}setValue({applicableFeeHeadIds:current.applicableFeeHeadIds,category:current.category,code:current.code,endDate:current.endDate,maximumAmount:current.maximumAmount,name:current.name,reasonRequired:current.reasonRequired,startDate:current.startDate,status:current.status,type:current.type,value:current.value});},[current,load,route.params.discountId]);
  return <AppScreen scrollable testID="edit-discount-definition-screen"><View style={styles.maxWidth}><AppHeader includeSafeArea={false} onBackPress={navigation.goBack} title="Edit Discount Definition" />{!value||!current?<LoadingView message="Loading discount…" />:<><DiscountFormFields errors={errors} onChange={setValue} value={value} /><AppButton onPress={()=>updateStatus(current.id,current.status==='ACTIVE'?'INACTIVE':'ACTIVE',false)} title={current.status==='ACTIVE'?'Deactivate':'Activate'} variant={current.status==='ACTIVE'?'danger':'outline'} />{error?<InlineError message={error.message}/>:null}<AppButton loading={loading} onPress={async()=>{const next=validateDiscount(value);setErrors(next);if(!Object.keys(next).length&&await save(value,current.id))navigation.goBack();}} style={styles.save} title="Save Discount" /></>}</View></AppScreen>;
}
const styles=StyleSheet.create({maxWidth:{alignSelf:'center',maxWidth:700,width:'100%'},save:{marginTop:20}});
