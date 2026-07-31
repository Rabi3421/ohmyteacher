import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ROUTES } from '../../constants/routes';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeDueStore } from '../../store';

export function FeeGenerationResultScreen({ navigation, route }: RoleScreenProps<'FeeGenerationResult'>) {
  const result = useFeeDueStore(state => state.generationResult);
  return <AppScreen scrollable testID="fee-generation-result-screen"><View style={styles.maxWidth}><AppHeader includeSafeArea={false} onBackPress={navigation.goBack} title="Generation Result" />{!result ? <EmptyState description="No generation result is available." title="Result unavailable" /> : <><AppCard variant="elevated"><AppText variant="heading2">{result.status.replace('_', ' ')}</AppText><AppText>{result.createdCount} created · {result.existingCount} existing</AppText><AppText>{result.skippedCount} skipped · {result.failedCount} failed</AppText><AppText variant="caption">Run {result.generationRunId}</AppText></AppCard><AppButton onPress={() => navigation.replace(ROUTES.FEE_GENERATION_RUN_DETAILS, { ...route.params, generationRunId: result.generationRunId })} title="View Generation Run" /><AppButton onPress={() => navigation.navigate(ROUTES.PENDING_FEES, route.params)} title="View Generated Outstanding" variant="outline" /></>}</View></AppScreen>;
}
const styles = StyleSheet.create({ maxWidth: { alignSelf: 'center', gap: 14, maxWidth: 720, width: '100%' } });
