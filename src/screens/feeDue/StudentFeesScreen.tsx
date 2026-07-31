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

export function StudentFeesScreen({
  route,
}: RoleScreenProps<'StudentFees'>) {
  const { schoolId, studentMembershipId } = route.params;
  const summary = useFeeDueStore(state => state.studentSelfFeeSummary);
  const error = useFeeDueStore(state => state.error);
  const isLoading = useFeeDueStore(state => state.isLoadingStudentFees);
  const load = useFeeDueStore(state => state.loadStudentSelfFees);
  const refresh = () =>
    load(studentMembershipId, schoolId, systemFeeDueClock.today());

  useEffect(() => {
    refresh().catch(() => undefined);
    // Inputs uniquely identify the ownership-scoped request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, schoolId, studentMembershipId]);

  return (
    <AppScreen
      onRefresh={refresh}
      refreshing={isLoading}
      scrollable
      testID="student-fees-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          subtitle="Your read-only generated Fee Dues"
          title="My Fees"
        />
        {isLoading && !summary ? (
          <LoadingView message="Loading your Fee Dues…" />
        ) : error && !summary ? (
          <ErrorState message={error.message} onRetry={refresh} />
        ) : summary ? (
          <>
            <StudentOutstandingCard summary={summary} />
            <AppCard variant="outlined">
              <AppText>
                These are generated Fee Due snapshots, not a payment ledger.
                Payments and receipts are not available in this phase.
              </AppText>
            </AppCard>
            {summary.dues.length === 0 ? (
              <EmptyState
                description="No Fee Due snapshot has been generated for your student record."
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
