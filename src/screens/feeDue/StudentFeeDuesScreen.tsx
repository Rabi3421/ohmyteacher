import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { LoadingView } from '../../components/feedback/LoadingView';
import {
  FeeDueListCard,
  StudentOutstandingCard,
} from '../../components/feeDue/FeeDueComponents';
import { ROUTES } from '../../constants/routes';
import { AppButton } from '../../components/common/AppButton';
import { useCommunicationAccess } from '../../hooks/useCommunicationAccess';
import type { FeeDueStatus } from '../../models/feeDue';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeDueStore } from '../../store';

const groups: FeeDueStatus[] = [
  'UPCOMING',
  'PENDING',
  'OVERDUE',
  'PAID',
  'WAIVED',
  'CANCELLED',
];

export function StudentFeeDuesScreen({
  navigation,
  route,
}: RoleScreenProps<'StudentFeeDues'>) {
  const summary = useFeeDueStore(state => state.currentStudentDues);
  const load = useFeeDueStore(state => state.loadStudentDues);
  const communicationAccess = useCommunicationAccess(
    route.params.schoolId,
    route.params.branchId,
  );
  useEffect(() => {
    load(route.params.studentId).catch(() => undefined);
  }, [load, route.params.studentId]);
  return (
    <AppScreen scrollable testID="student-fee-dues-screen">
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          subtitle="Generated Fee Due history — not a ledger"
          title="Student Fee Dues"
        />
        {!summary || summary.studentId !== route.params.studentId ? (
          <LoadingView message="Loading Student Fee Dues…" />
        ) : (
          <>
            <StudentOutstandingCard summary={summary} />
            {communicationAccess.canSendManual &&
            summary.dues.some(
              item =>
                !['PAID', 'WAIVED', 'CANCELLED'].includes(item.due.status),
            ) ? (
              <AppButton
                onPress={() =>
                  navigation.navigate(ROUTES.MESSAGE_PREVIEW, {
                    ...route.params,
                    communicationType: 'MANUAL_DUE_REMINDER',
                    feeDueIds: summary.dues
                      .filter(
                        item =>
                          !['PAID', 'WAIVED', 'CANCELLED'].includes(
                            item.due.status,
                          ),
                      )
                      .map(item => item.due.id),
                    studentId: route.params.studentId,
                  })
                }
                title="Send Outstanding Reminder"
              />
            ) : null}
            <AppText>
              Total Generated and historical waived/cancelled records remain
              snapshot-based.
            </AppText>
            {groups.map(status => {
              const items = summary.dues.filter(
                item => item.due.status === status,
              );
              return items.length ? (
                <View key={status} style={styles.group}>
                  <AppText variant="heading3">
                    {status.replace('_', ' ')}
                  </AppText>
                  {items.map(item => (
                    <FeeDueListCard
                      item={item}
                      key={item.due.id}
                      onPress={() =>
                        navigation.navigate(ROUTES.FEE_DUE_DETAILS, {
                          ...route.params,
                          feeDueId: item.due.id,
                        })
                      }
                    />
                  ))}
                </View>
              ) : null;
            })}
          </>
        )}
      </View>
    </AppScreen>
  );
}
const styles = StyleSheet.create({
  group: { gap: 10 },
  maxWidth: { alignSelf: 'center', gap: 14, maxWidth: 800, width: '100%' },
});
