import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { EmptyState } from '../../components/feedback/EmptyState';
import { GenerationPreviewCard } from '../../components/feeDue/FeeDueComponents';
import { ROUTES } from '../../constants/routes';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeDueStore } from '../../store';
import { formatCurrency } from '../../utils/currency';
import { paiseToRupees } from '../../utils/feeCalculation';

export function FeeGenerationPreviewScreen({ navigation, route }: RoleScreenProps<'FeeGenerationPreview'>) {
  const preview = useFeeDueStore(state => state.generationPreview);
  const commit = useFeeDueStore(state => state.commitGeneration);
  const loading = useFeeDueStore(state => state.isGeneratingFees);
  const [confirming, setConfirming] = useState(false);
  if (!preview) return <AppScreen testID="fee-generation-preview-screen"><EmptyState description="Return to Generate Fees and create a fresh preview." title="Preview unavailable" /></AppScreen>;
  return (
    <>
      <AppScreen scrollable testID="fee-generation-preview-screen"><View style={styles.maxWidth}>
        <AppHeader includeSafeArea={false} onBackPress={navigation.goBack} subtitle={`Expires ${preview.expiresAt}`} title="Fee Generation Preview" />
        <AppCard variant="elevated"><AppText variant="heading3">{preview.newDueCount} new · {preview.existingDueCount} existing</AppText><AppText>{preview.skippedCount} skipped · {preview.errorCount} errors</AppText><AppText variant="title">Configured total {formatCurrency(paiseToRupees(preview.totalAmountPaise))}</AppText></AppCard>
        {preview.warnings.map(warning => <AppCard key={warning.code} variant="outlined"><AppText variant="title">{warning.count} warning items</AppText><AppText>{warning.message}</AppText></AppCard>)}
        <View style={styles.list}>{preview.items.map(item => <GenerationPreviewCard item={item} key={item.idempotencyKey} />)}</View>
        <AppButton disabled={!preview.newDueCount || preview.errorCount > 0} onPress={() => setConfirming(true)} title="Confirm Fee Due Generation" />
      </View></AppScreen>
      <ConfirmationDialog loading={loading} message="This creates immutable Fee Due snapshots. Existing idempotency keys are skipped and no current Fee Structure values are overwritten." onCancel={() => setConfirming(false)} onConfirm={async () => { if (await commit()) navigation.replace(ROUTES.FEE_GENERATION_RESULT, route.params); }} title="Generate Fee Dues?" visible={confirming} />
    </>
  );
}

const styles = StyleSheet.create({ list: { gap: 10 }, maxWidth: { alignSelf: 'center', gap: 14, maxWidth: 820, width: '100%' } });
