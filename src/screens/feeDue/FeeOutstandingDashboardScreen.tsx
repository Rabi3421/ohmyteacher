import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { FeeOutstandingSummaryCards } from '../../components/feeDue/FeeDueComponents';
import { FeeContextBar } from '../../components/feeSetup/FeeComponents';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useFeeDueAccess } from '../../hooks/useFeeDueAccess';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import {
  useAuthStore,
  useFeeDueStore,
  useOrganizationStore,
} from '../../store';
import { systemFeeDueClock } from '../../utils/feeDueClock';

export function FeeOutstandingDashboardScreen({
  navigation,
  route,
}: RoleScreenProps<'FeeOutstandingDashboard'>) {
  const membership = useAuthStore(state => state.activeMembership);
  const setContext = useFeeDueStore(state => state.setContext);
  const summary = useFeeDueStore(state => state.outstanding);
  const loading = useFeeDueStore(state => state.isLoadingOutstanding);
  const error = useFeeDueStore(state => state.error);
  const load = useFeeDueStore(state => state.loadOutstanding);
  const school = useOrganizationStore(state => state.currentSchool);
  const branches = useOrganizationStore(state => state.branches.items);
  const sessions = useOrganizationStore(state => state.academicSessions);
  const loadSchool = useOrganizationStore(state => state.loadSchool);
  const loadBranches = useOrganizationStore(state => state.loadBranches);
  const loadSessions = useOrganizationStore(
    state => state.loadAcademicSessions,
  );
  const [branchId, setBranchId] = useState(
    route.params.branchId ?? membership?.branchId,
  );
  const [sessionId, setSessionId] = useState(
    route.params.academicSessionId,
  );
  const asOfDate =
    route.params.asOfDate ?? systemFeeDueClock.today();
  const branch = branches.find(item => item.id === branchId);
  const session = sessions.find(item => item.id === sessionId);
  const access = useFeeDueAccess(
    route.params.schoolId,
    branchId ?? '',
  );

  useEffect(() => {
    Promise.all([
      loadSchool(route.params.schoolId),
      loadBranches(route.params.schoolId),
      loadSessions(route.params.schoolId),
    ]).catch(() => undefined);
  }, [loadBranches, loadSchool, loadSessions, route.params.schoolId]);

  useEffect(() => {
    if (!branchId) {
      const available = branches.find(
        item =>
          item.status === 'ACTIVE' &&
          (!membership?.branchId || item.id === membership.branchId),
      );
      if (available) setBranchId(available.id);
    }
    if (!sessionId) {
      const available =
        sessions.find(item => item.status === 'ACTIVE') ??
        sessions.find(item => item.status === 'UPCOMING') ??
        sessions[0];
      if (available) setSessionId(available.id);
    }
  }, [branchId, branches, membership?.branchId, sessionId, sessions]);

  useEffect(() => {
    if (!branch || !session) return;
    setContext(
      {
        academicSessionId: session.id,
        asOfDate,
        branchId: branch.id,
        schoolId: route.params.schoolId,
      },
      session.status,
    );
    load().catch(() => undefined);
  }, [
    asOfDate,
    branch,
    load,
    route.params.schoolId,
    session,
    setContext,
  ]);

  if (!branch || !session) {
    return (
      <AppScreen testID="fee-outstanding-dashboard-screen">
        <LoadingView message="Resolving Fee Due context…" />
      </AppScreen>
    );
  }

  const params = {
    academicSessionId: session.id,
    branchId: branch.id,
    schoolId: route.params.schoolId,
    sessionStatus: session.status,
  };

  return (
    <AppScreen
      onRefresh={load}
      refreshing={loading}
      scrollable
      testID="fee-outstanding-dashboard-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          subtitle="Generated outstanding amounts only — no collections"
          title="Fee Outstanding"
        />
        <FeeContextBar
          branch={branch.name}
          closed={access.isClosed}
          school={school?.name ?? route.params.schoolId}
          session={session.name}
        />
        <AppText variant="label">Branch</AppText>
        <View style={styles.options}>
          {branches
            .filter(
              item =>
                item.status === 'ACTIVE' &&
                (!membership?.branchId || item.id === membership.branchId),
            )
            .map(item => (
              <AppButton
                key={item.id}
                onPress={() => setBranchId(item.id)}
                title={item.name}
                variant={item.id === branch.id ? 'primary' : 'outline'}
              />
            ))}
        </View>
        <AppText variant="label">Academic Session</AppText>
        <View style={styles.options}>
          {sessions.map(item => (
            <AppButton
              key={item.id}
              onPress={() => setSessionId(item.id)}
              title={`${item.name}${item.status === 'CLOSED' ? ' · Closed' : ''}`}
              variant={item.id === session.id ? 'primary' : 'outline'}
            />
          ))}
        </View>
        <AppText variant="caption">AS OF {asOfDate}</AppText>
        {loading && !summary ? (
          <LoadingView message="Loading generated outstanding…" />
        ) : error && !summary ? (
          <ErrorState message={error.message} onRetry={load} />
        ) : summary ? (
          <>
            <FeeOutstandingSummaryCards summary={summary} />
            <AppCard variant="outlined">
              <AppText variant="title">Latest Generation Run</AppText>
              <AppText>
                {summary.latestGenerationRun?.id ??
                  'No generation run in this context'}
              </AppText>
            </AppCard>
          </>
        ) : null}
        <View style={styles.actions}>
          {access.canGenerate ? (
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.GENERATE_FEE_DUES, params)
              }
              title="Generate Fees"
            />
          ) : null}
          <AppButton
            onPress={() => navigation.navigate(ROUTES.PENDING_FEES, params)}
            title="Pending Fees"
            variant="outline"
          />
          <AppButton
            onPress={() => navigation.navigate(ROUTES.OVERDUE_FEES, params)}
            title="Overdue Fees"
            variant="outline"
          />
          {access.canViewHistory ? (
            <AppButton
              onPress={() =>
                navigation.navigate(
                  ROUTES.FEE_GENERATION_HISTORY,
                  params,
                )
              }
              title="Generation History"
              variant="outline"
            />
          ) : null}
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10, marginTop: 16 },
  maxWidth: {
    alignSelf: 'center',
    gap: 14,
    maxWidth: 820,
    width: '100%',
  },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
