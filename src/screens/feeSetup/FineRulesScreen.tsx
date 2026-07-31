import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { EmptyState } from '../../components/feedback/EmptyState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { FineRuleCard } from '../../components/feeSetup/FeeComponents';
import { ROUTES } from '../../constants/routes';
import { useFeeSetupAccess } from '../../hooks/useFeeSetupAccess';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeSetupStore } from '../../store';
export function FineRulesScreen({navigation,route}:RoleScreenProps<'FineRules'>){const rules=useFeeSetupStore(s=>s.fineRules);const loading=useFeeSetupStore(s=>s.isLoadingFineRules);const load=useFeeSetupStore(s=>s.loadFineRules);const access=useFeeSetupAccess(route.params.schoolId,route.params.branchId);useEffect(()=>{load().catch(()=>undefined)},[load]);return <AppScreen scrollable testID="fine-rules-screen"><View style={styles.maxWidth}><AppHeader includeSafeArea={false} onBackPress={navigation.goBack} rightActions={access.canManageFineRules?<AppButton onPress={()=>navigation.navigate(ROUTES.CREATE_FINE_RULE,route.params)} title="Add"/>:null} subtitle="Configuration preview only — fines are not applied" title="Fine Rules"/>{loading&&!rules.items.length?<LoadingView message="Loading Fine Rules…"/>:!rules.items.length?<EmptyState description="No Late Fine Rules configured." title="No Fine Rules"/>:<View style={styles.list}>{rules.items.map(item=><FineRuleCard item={item} key={item.id} onPress={access.canManageFineRules?()=>navigation.navigate(ROUTES.EDIT_FINE_RULE,{...route.params,fineRuleId:item.id}):undefined}/>)}</View>}</View></AppScreen>}
const styles=StyleSheet.create({list:{gap:12},maxWidth:{alignSelf:'center',maxWidth:740,width:'100%'}});
