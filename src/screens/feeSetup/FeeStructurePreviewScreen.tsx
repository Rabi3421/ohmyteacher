import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { LoadingView } from '../../components/feedback/LoadingView';
import { EffectiveFeePreviewCard } from '../../components/feeSetup/FeeComponents';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeSetupStore } from '../../store';
import { calculateEffectiveFee } from '../../utils/feeCalculation';
export function FeeStructurePreviewScreen({ navigation, route }: RoleScreenProps<'FeeStructurePreview'>) {
  const current = useFeeSetupStore(state => state.currentFeeStructure);
  const load = useFeeSetupStore(state => state.loadStructure);
  useEffect(() => { if (current?.id !== route.params.feeStructureId) load(route.params.feeStructureId).catch(() => undefined); }, [current?.id, load, route.params.feeStructureId]);
  const structure = current?.id === route.params.feeStructureId ? current : null;
  const preview = structure ? calculateEffectiveFee({ discountAssignments: [], discountDefinitions: [], fineRuleNames: [], overrides: [], selections: [], structure }) : null;
  return <AppScreen scrollable testID="fee-structure-preview-screen"><View style={styles.maxWidth}><AppHeader includeSafeArea={false} onBackPress={navigation.goBack} subtitle="Default mandatory configuration" title="Fee Structure Preview" />{preview ? <EffectiveFeePreviewCard preview={preview} /> : <LoadingView message="Preparing preview…" />}</View></AppScreen>;
}
const styles = StyleSheet.create({ maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' } });
