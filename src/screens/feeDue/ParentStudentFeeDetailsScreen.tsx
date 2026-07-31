import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import {
  FeeDueListCard,
  StudentOutstandingCard,
} from '../../components/feeDue/FeeDueComponents';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import type { FeeDueStatus } from '../../models/feeDue';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeDueStore } from '../../store';
import { systemFeeDueClock } from '../../utils/feeDueClock';

const statusGroups: FeeDueStatus[] = [
  'UPCOMING',
  'PENDING',
  'OVERDUE',
  'PARTIALLY_PAID',
  'PAID',
  'WAIVED',
  'CANCELLED',
];

export function ParentStudentFeeDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'ParentStudentFeeDetails'>) {
  const { parentMembershipId, schoolId, studentId } = route.params;
  const summary = useFeeDueStore(state => state.parentFeeSummary);
  const error = useFeeDueStore(state => state.error);
  const isLoading = useFeeDueStore(state => state.isLoadingParentFees);
  const load = useFeeDueStore(state => state.loadParentFees);

  const refresh = () =>
    load(
      parentMembershipId,
      studentId,
      schoolId,
      systemFeeDueClock.today(),
    );

  useEffect(() => {
    refresh().catch(() => undefined);
    // Inputs uniquely identify the ownership-scoped request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, parentMembershipId, schoolId, studentId]);

  const matchesStudent = summary?.studentId === studentId;

  return (
    <AppScreen
      onRefresh={refresh}
      refreshing={isLoading}
      scrollable
      testID="parent-student-fee-details-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          subtitle="Read-only generated Fee Dues"
          title="Child Fee Details"
        />
        {isLoading && !matchesStudent ? (
          <LoadingView message="Loading child Fee Dues…" />
        ) : error && !matchesStudent ? (
          <ErrorState message={error.message} onRetry={refresh} />
        ) : summary && matchesStudent ? (
          <>
            <StudentOutstandingCard summary={summary} />
            <AppCard variant="outlined">
              <AppText>
                Total generated, waived, and cancelled amounts remain visible
                as immutable history. No payment action is available here.
              </AppText>
            </AppCard>
            {summary.dues.length === 0 ? (
              <EmptyState
                description="Fee setup may exist, but no Fee Due snapshot has been generated for this child."
                title="No generated Fee Dues"
              />
            ) : (
              statusGroups.map(status => {
                const items = summary.dues.filter(
                  item => item.due.status === status,
                );
                return items.length > 0 ? (
                  <View key={status} style={styles.group}>
                    <AppText variant="heading3">
                      {status.replaceAll('_', ' ')}
                    </AppText>
                    {items.map(item => (
                      <FeeDueListCard
                        item={item}
                        key={item.due.id}
                        onPress={() => undefined}
                      />
                    ))}
                  </View>
                ) : null;
              })
            )}
          </>
        ) : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10 },
  maxWidth: {
    alignSelf: 'center',
    gap: 14,
    maxWidth: 800,
    width: '100%',
  },
});
