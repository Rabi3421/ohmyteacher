import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { LoadingView } from '../../components/feedback/LoadingView';
import {
  FeeDueAmountBreakdown,
  FeeDueStatusBadge,
} from '../../components/feeDue/FeeDueComponents';
import { ROUTES } from '../../constants/routes';
import { useFeeDueAccess } from '../../hooks/useFeeDueAccess';
import { useCommunicationAccess } from '../../hooks/useCommunicationAccess';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeDueStore } from '../../store';
import { systemFeeDueClock } from '../../utils/feeDueClock';

export function FeeDueDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'FeeDueDetails'>) {
  const current = useFeeDueStore(state => state.currentFeeDue);
  const load = useFeeDueStore(state => state.loadFeeDue);
  const refresh = useFeeDueStore(state => state.refreshFine);
  const refreshing = useFeeDueStore(state => state.isRefreshingFine);
  const asOfDate = useFeeDueStore(
    state => state.context?.asOfDate ?? systemFeeDueClock.today(),
  );
  const access = useFeeDueAccess(route.params.schoolId, route.params.branchId);
  const communicationAccess = useCommunicationAccess(
    route.params.schoolId,
    route.params.branchId,
  );
  useEffect(() => {
    load(route.params.feeDueId).catch(() => undefined);
  }, [load, route.params.feeDueId]);
  const details =
    current?.item.due.id === route.params.feeDueId ? current : null;
  if (!details)
    return (
      <AppScreen testID="fee-due-details-screen">
        <LoadingView message="Loading immutable Fee Due snapshot…" />
      </AppScreen>
    );
  const due = details.item.due;
  const mutable = !['WAIVED', 'CANCELLED', 'PAID'].includes(due.status);
  return (
    <AppScreen scrollable testID="fee-due-details-screen">
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          title="Fee Due Details"
        />
        <AppCard variant="elevated">
          <View style={styles.row}>
            <View style={styles.copy}>
              <AppText variant="heading2">{due.studentNameSnapshot}</AppText>
              <AppText>
                {due.admissionNumberSnapshot} · {due.branchNameSnapshot}
              </AppText>
              <AppText>
                {due.classNameSnapshot} · {due.sectionNameSnapshot}
              </AppText>
            </View>
            <FeeDueStatusBadge status={due.status} />
          </View>
        </AppCard>
        <AppCard variant="outlined">
          <AppText variant="title">
            {due.feeHeadNameSnapshot} · {due.periodLabel}
          </AppText>
          <AppText>
            {due.frequencySnapshot.replace('_', ' ')} · Due {due.dueDate}
          </AppText>
          <AppText variant="caption">
            Generated {due.generatedAt} · Run {due.generatedByRunId}
          </AppText>
          <AppText variant="caption">
            Structure {due.calculationSnapshot.feeStructureName} · Assignment{' '}
            {due.feeAssignmentId}
          </AppText>
          {due.fineRuleSnapshot ? (
            <AppText>Fine Rule snapshot: {due.fineRuleSnapshot.name}</AppText>
          ) : (
            <AppText>No Fine Rule snapshot</AppText>
          )}
        </AppCard>
        <FeeDueAmountBreakdown due={due} />
        <AppCard variant="outlined">
          <AppText variant="title">Activity</AppText>
          {details.activities.map(item => (
            <AppText key={item.id}>
              {item.performedAt} · {item.action.replaceAll('_', ' ')}
            </AppText>
          ))}
        </AppCard>
        <View style={styles.actions}>
          {communicationAccess.canSendManual && mutable ? (
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.MESSAGE_PREVIEW, {
                  ...route.params,
                  communicationType: 'MANUAL_DUE_REMINDER',
                  feeDueIds: [due.id],
                  studentId: due.studentId,
                })
              }
              title="Send Reminder"
            />
          ) : null}
          {communicationAccess.canViewHistory ? (
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.COMMUNICATION_HISTORY, {
                  ...route.params,
                  feeDueId: due.id,
                  studentId: due.studentId,
                })
              }
              title="View Communication History"
              variant="ghost"
            />
          ) : null}
          <AppButton
            onPress={() =>
              navigation.navigate(ROUTES.FINE_ACCRUAL_PREVIEW, route.params)
            }
            title="Preview Fine"
            variant="outline"
          />
          {access.canRefreshFine && mutable ? (
            <AppButton
              loading={refreshing}
              onPress={() => refresh(due.id, asOfDate)}
              title="Refresh Fine"
              variant="outline"
            />
          ) : null}
          {access.canWaiveFine &&
          mutable &&
          due.fineAmountPaise > due.fineWaivedAmountPaise ? (
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.WAIVE_FEE_DUE, {
                  ...route.params,
                  feeDueId: due.id,
                })
              }
              title="Waive Fine / Due"
              variant="outline"
            />
          ) : access.canWaiveDue && mutable ? (
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.WAIVE_FEE_DUE, {
                  ...route.params,
                  feeDueId: due.id,
                })
              }
              title="Waive Due"
              variant="outline"
            />
          ) : null}
          {access.canCancel && mutable ? (
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.CANCEL_FEE_DUE, {
                  ...route.params,
                  feeDueId: due.id,
                })
              }
              title="Cancel Due"
              variant="danger"
            />
          ) : null}
        </View>
      </View>
    </AppScreen>
  );
}
const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  copy: { flex: 1 },
  maxWidth: { alignSelf: 'center', gap: 14, maxWidth: 780, width: '100%' },
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
});
