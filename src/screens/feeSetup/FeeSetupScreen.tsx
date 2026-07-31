import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { FeeContextBar } from '../../components/feeSetup/FeeComponents';
import { ROUTES } from '../../constants/routes';
import { useFeeSetupAccess } from '../../hooks/useFeeSetupAccess';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import {
  useAuthStore,
  useFeeSetupStore,
  useOrganizationStore,
} from '../../store';

export function FeeSetupScreen({
  navigation,
  route,
}: RoleScreenProps<'FeeSetup'>) {
  const membership = useAuthStore(state => state.activeMembership);
  const school = useOrganizationStore(state => state.currentSchool);
  const branches = useOrganizationStore(state => state.branches.items);
  const sessions = useOrganizationStore(state => state.academicSessions);
  const loadSchool = useOrganizationStore(state => state.loadSchool);
  const loadBranches = useOrganizationStore(state => state.loadBranches);
  const loadSessions = useOrganizationStore(state => state.loadAcademicSessions);
  const [branchId, setBranchId] = useState(
    route.params.branchId ?? membership?.branchId,
  );
  const [sessionId, setSessionId] = useState(route.params.academicSessionId);
  const summary = useFeeSetupStore(state => state.summary);
  const error = useFeeSetupStore(state => state.error);
  const isLoading = useFeeSetupStore(state => state.isLoadingSummary);
  const setContext = useFeeSetupStore(state => state.setContext);
  const loadSummary = useFeeSetupStore(state => state.loadSummary);
  const branch = branches.find(item => item.id === branchId);
  const session = sessions.find(item => item.id === sessionId);
  const access = useFeeSetupAccess(route.params.schoolId, branchId);

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
        branchId: branch.id,
        schoolId: route.params.schoolId,
      },
      session.status,
    );
    loadSummary().catch(() => undefined);
  }, [
    branch,
    loadSummary,
    route.params.schoolId,
    session,
    setContext,
  ]);

  if (!branch || !session) {
    return (
      <AppScreen testID="fee-setup-screen">
        <LoadingView message="Resolving Fee Setup context…" />
      </AppScreen>
    );
  }

  const contextParams = {
    academicSessionId: session.id,
    branchId: branch.id,
    schoolId: route.params.schoolId,
    sessionStatus: session.status,
  };

  return (
    <AppScreen
      contentContainerStyle={styles.content}
      onRefresh={loadSummary}
      refreshing={isLoading}
      scrollable
      testID="fee-setup-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          subtitle="Configuration only — no dues or collections"
          title="Fee Setup"
        />
        <FeeContextBar
          branch={branch.name}
          closed={session.status === 'CLOSED'}
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
        <AppText style={styles.selectorLabel} variant="label">
          Academic Session
        </AppText>
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
        {error && !summary ? (
          <ErrorState message={error.message} onRetry={loadSummary} />
        ) : summary ? (
          <>
            <View style={styles.grid}>
              {[
                ['Active Fee Heads', summary.activeFeeHeads],
                ['Classes with Structure', summary.classesWithStructure],
                ['Classes without Structure', summary.classesWithoutStructure],
                [
                  'Custom Assignments',
                  summary.studentsWithCustomAssignment,
                ],
                ['Active Discounts', summary.activeDiscountDefinitions],
                ['Active Fine Rules', summary.activeFineRules],
              ].map(([label, value]) => (
                <AppCard key={String(label)} style={styles.summaryCard}>
                  <AppText variant="heading2">{String(value)}</AppText>
                  <AppText variant="caption">{String(label)}</AppText>
                </AppCard>
              ))}
            </View>
            {session.status === 'CLOSED' ? (
              <AppCard style={styles.warning} variant="outlined">
                <AppText variant="title">Closed session is read-only</AppText>
                <AppText>
                  Structures, historical assignments, and previews remain
                  available. Every mutation is blocked.
                </AppText>
              </AppCard>
            ) : summary.activeFeeHeads === 0 ||
              summary.classesWithoutStructure > 0 ||
              summary.enrollmentsWithoutAssignment > 0 ? (
              <AppCard style={styles.warning} variant="outlined">
                <AppText variant="title">Setup warnings</AppText>
                {summary.activeFeeHeads === 0 ? (
                  <AppText>No active Fee Heads configured.</AppText>
                ) : null}
                {summary.classesWithoutStructure > 0 ? (
                  <AppText>
                    {summary.classesWithoutStructure} classes have no active
                    Fee Structure.
                  </AppText>
                ) : null}
                {summary.enrollmentsWithoutAssignment > 0 ? (
                  <AppText>
                    {summary.enrollmentsWithoutAssignment} active enrollments
                    have no Fee Assignment.
                  </AppText>
                ) : null}
              </AppCard>
            ) : null}
          </>
        ) : (
          <LoadingView message="Loading Fee Setup summary…" />
        )}
        <View style={styles.actions}>
          <AppButton
            onPress={() =>
              navigation.navigate(
                ROUTES.FEE_OUTSTANDING_DASHBOARD,
                contextParams,
              )
            }
            title="View Generated Fee Dues"
          />
          <AppButton
            onPress={() => navigation.navigate(ROUTES.FEE_HEADS, contextParams)}
            title={access.canManageHeads ? 'Manage Fee Heads' : 'View Fee Heads'}
            variant="outline"
          />
          <AppButton
            onPress={() =>
              navigation.navigate(ROUTES.FEE_STRUCTURES, contextParams)
            }
            title={access.canManageStructures ? 'Manage Fee Structures' : 'View Fee Structures'}
            variant="outline"
          />
          <AppButton
            onPress={() =>
              navigation.navigate(
                ROUTES.STUDENT_FEE_ASSIGNMENTS,
                contextParams,
              )
            }
            title={access.canManageAssignments ? 'Manage Student Assignments' : 'View Student Assignments'}
            variant="outline"
          />
          {access.canManageDiscounts ? (
            <AppButton
              onPress={() =>
                navigation.navigate(
                  ROUTES.DISCOUNT_DEFINITIONS,
                  contextParams,
                )
              }
              title="Manage Discounts"
              variant="outline"
            />
          ) : null}
          {access.canManageFineRules ? (
            <AppButton
              onPress={() => navigation.navigate(ROUTES.FINE_RULES, contextParams)}
              title="Manage Fine Rules"
              variant="outline"
            />
          ) : null}
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10, marginTop: 20 },
  content: { paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  maxWidth: { alignSelf: 'center', maxWidth: 800, width: '100%' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectorLabel: { marginTop: 12 },
  summaryCard: { minWidth: 155 },
  warning: { marginTop: 16 },
});
