import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { LoadingView } from '../../components/feedback/LoadingView';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeDueStore } from '../../store';
import { formatCurrency } from '../../utils/currency';
import { paiseToRupees } from '../../utils/feeCalculation';

export function FeeGenerationRunDetailsScreen({ navigation, route }: RoleScreenProps<'FeeGenerationRunDetails'>) {
  const current = useFeeDueStore(state => state.currentGenerationRun);
  const load = useFeeDueStore(state => state.loadGenerationRun);
  useEffect(() => { load(route.params.generationRunId).catch(() => undefined); }, [load, route.params.generationRunId]);
  const details = current?.run.id === route.params.generationRunId ? current : null;
  return <AppScreen scrollable testID="fee-generation-run-details-screen"><View style={styles.maxWidth}><AppHeader includeSafeArea={false} onBackPress={navigation.goBack} title="Generation Run Details" />{!details ? <LoadingView message="Loading Generation Run…" /> : <><AppCard variant="elevated"><AppText variant="heading2">{details.run.id}</AppText><AppText>{details.run.branchName} · {details.run.academicSessionName}</AppText><AppText>{details.run.generationType.replace('_', ' ')} · {details.run.requestedPeriods.join(', ') || 'Full session'}</AppText><AppText>Requested by {details.run.requestedByUserId} on {details.run.requestedAt}</AppText></AppCard><AppCard variant="outlined"><AppText variant="title">Summary</AppText><AppText>{details.run.createdCount} created · {details.run.existingCount} existing · {details.run.skippedCount} skipped · {details.run.failedCount} failed</AppText><AppText>Total generated {formatCurrency(paiseToRupees(details.run.totalGeneratedAmountPaise))}</AppText></AppCard>{details.warnings.map(item => <AppCard key={item.code} variant="outlined"><AppText>{item.count} · {item.message}</AppText></AppCard>)}{details.items.map(item => <AppCard key={item.idempotencyKey} variant="outlined"><AppText variant="title">{item.status}</AppText><AppText>{item.idempotencyKey}</AppText>{item.reason ? <AppText>{item.reason}</AppText> : null}</AppCard>)}</>}</View></AppScreen>;
}
const styles = StyleSheet.create({ maxWidth: { alignSelf: 'center', gap: 12, maxWidth: 800, width: '100%' } });
