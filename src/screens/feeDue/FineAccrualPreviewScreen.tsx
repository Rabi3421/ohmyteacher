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
import { systemFeeDueClock } from '../../utils/feeDueClock';

export function FineAccrualPreviewScreen({ navigation, route }: RoleScreenProps<'FineAccrualPreview'>) {
  const preview = useFeeDueStore(state => state.finePreview);
  const load = useFeeDueStore(state => state.previewFine);
  const asOfDate = useFeeDueStore(
    state => state.context?.asOfDate ?? systemFeeDueClock.today(),
  );
  useEffect(() => { load(route.params.feeDueId, asOfDate).catch(() => undefined); }, [asOfDate, load, route.params.feeDueId]);
  return <AppScreen testID="fine-accrual-preview-screen"><View style={styles.maxWidth}><AppHeader includeSafeArea={false} onBackPress={navigation.goBack} subtitle="Read-only deterministic calculation from the stored Fine Rule snapshot" title="Fine Accrual Preview" />{!preview || preview.feeDueId !== route.params.feeDueId ? <LoadingView message="Calculating Fine preview…" /> : <AppCard variant="elevated"><AppText variant="heading3">{preview.lateDays} chargeable late days</AppText><AppText>Calculated Fine {formatCurrency(paiseToRupees(preview.fineAmountPaise))}</AppText><AppText>Fine Waived {formatCurrency(paiseToRupees(preview.fineWaivedAmountPaise))}</AppText><AppText>Effective Fine {formatCurrency(paiseToRupees(preview.effectiveFinePaise))}</AppText><AppText variant="title">Outstanding {formatCurrency(paiseToRupees(preview.outstandingAmountPaise))}</AppText><AppText variant="caption">As of {preview.asOfDate}. This preview does not mutate the Fee Due.</AppText></AppCard>}</View></AppScreen>;
}
const styles = StyleSheet.create({ maxWidth: { alignSelf: 'center', gap: 14, maxWidth: 680, width: '100%' } });
