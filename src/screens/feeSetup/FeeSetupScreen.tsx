import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AcademicContextBar } from '../../components/academic/AcademicContextBar';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import {
  useAcademicStore,
  useCurrentFeeConfigurationStore,
} from '../../store';

export function FeeSetupScreen({
  navigation,
  route,
}: RoleScreenProps<'FeeSetup'>) {
  const context = useAcademicStore(state => state.context);
  const sessionStatus = useAcademicStore(state => state.sessionStatus);
  const summary = useCurrentFeeConfigurationStore(state => state.summary);
  const error = useCurrentFeeConfigurationStore(state => state.error);
  const loading = useCurrentFeeConfigurationStore(
    state => state.isLoadingSummary,
  );
  const setContext = useCurrentFeeConfigurationStore(state => state.setContext);
  const loadSummary = useCurrentFeeConfigurationStore(state => state.loadSummary);
  const selected = context?.schoolId === route.params.schoolId ? context : null;

  useEffect(() => {
    if (!selected) return;
    setContext(selected, sessionStatus);
    loadSummary().catch(() => undefined);
  }, [loadSummary, selected, sessionStatus, setContext]);

  const params = selected
    ? { ...selected, sessionStatus: sessionStatus ?? 'UPCOMING' }
    : null;

  return (
    <AppScreen
      contentContainerStyle={styles.content}
      onRefresh={selected ? loadSummary : undefined}
      refreshing={loading}
      scrollable
      testID="fee-setup-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          subtitle="Live configuration only — no Student liabilities"
          title="Fee Configuration"
        />
        <AcademicContextBar
          initialBranchId={route.params.branchId}
          initialSessionId={route.params.academicSessionId}
          schoolId={route.params.schoolId}
        />
        {!selected ? (
          <LoadingView message="Resolving live Branch and academic Session…" />
        ) : error && !summary ? (
          <ErrorState message={error.message} onRetry={loadSummary} />
        ) : !summary ? (
          <LoadingView message="Loading live fee configuration…" />
        ) : (
          <>
            <View style={styles.grid}>
              {[
                ['Active Fee Heads', summary.activeFeeHeads],
                ['Configured Classes', summary.configuredClasses],
                ['Classes without Items', summary.unconfiguredClasses],
                ['Structure Items', summary.structureItems],
              ].map(([label, value]) => (
                <AppCard key={String(label)} style={styles.summaryCard}>
                  <AppText variant="heading2">{String(value)}</AppText>
                  <AppText variant="caption">{String(label)}</AppText>
                </AppCard>
              ))}
            </View>
            {sessionStatus === 'CLOSED' ? (
              <AppCard style={styles.notice} variant="outlined">
                <AppText variant="title">Closed Session · Read only</AppText>
                <AppText>
                  Existing Class fee blueprints remain visible. The frontend
                  blocks changes because Django does not enforce inactive
                  Session state on Structure Items.
                </AppText>
              </AppCard>
            ) : null}
            <View style={styles.actions}>
              <AppButton
                onPress={() => params && navigation.navigate(ROUTES.FEE_HEADS, params)}
                title="Fee Heads"
              />
              <AppButton
                onPress={() => params && navigation.navigate(ROUTES.FEE_STRUCTURES, params)}
                title="Class Fee Blueprints"
                variant="outline"
              />
            </View>
            <AppCard style={styles.notice} variant="outlined">
              <AppText variant="title">Unavailable in the Django contract</AppText>
              <AppText>
                Discounts, fine rules, Structure activation, copying, preview,
                and Student assignments have no configuration endpoint. They
                are not simulated on these live screens.
              </AppText>
            </AppCard>
            <AppCard style={styles.notice} variant="outlined">
              <AppText variant="title">Fee dues remain demo-isolated</AppText>
              <AppText>
                Saving configuration does not generate dues, balances, ledger
                entries, payments, or receipts. Live IDs are never passed into
                the later mock fee-due repository.
              </AppText>
            </AppCard>
          </>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10, marginTop: 18 },
  content: { paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  maxWidth: { alignSelf: 'center', maxWidth: 800, width: '100%' },
  notice: { gap: 6, marginTop: 16 },
  summaryCard: { minWidth: 150 },
});
