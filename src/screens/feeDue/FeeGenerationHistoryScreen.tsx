import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { GenerationRunCard } from '../../components/feeDue/FeeDueComponents';
import { ROUTES } from '../../constants/routes';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeDueStore } from '../../store';

export function FeeGenerationHistoryScreen({ navigation, route }: RoleScreenProps<'FeeGenerationHistory'>) {
  const history = useFeeDueStore(state => state.generationHistory);
  const loading = useFeeDueStore(state => state.isLoadingGenerationHistory);
  const error = useFeeDueStore(state => state.error);
  const load = useFeeDueStore(state => state.loadGenerationHistory);
  useEffect(() => { load().catch(() => undefined); }, [load]);
  return (
    <AppScreen scrollable testID="fee-generation-history-screen"><View style={styles.maxWidth}>
      <AppHeader includeSafeArea={false} onBackPress={navigation.goBack} subtitle="Immutable audit history — runs cannot be deleted" title="Generation History" />
      {loading && !history.items.length ? <LoadingView message="Loading Generation Runs…" /> : error && !history.items.length ? <ErrorState message={error.message} onRetry={load} /> : !history.items.length ? <EmptyState description="No generation run matches this context." title="No Generation History" /> : <View style={styles.list}>{history.items.map(run => <GenerationRunCard key={run.id} onPress={() => navigation.navigate(ROUTES.FEE_GENERATION_RUN_DETAILS, { ...route.params, generationRunId: run.id })} run={run} />)}</View>}
    </View></AppScreen>
  );
}
const styles = StyleSheet.create({ list: { gap: 10 }, maxWidth: { alignSelf: 'center', maxWidth: 800, width: '100%' } });
