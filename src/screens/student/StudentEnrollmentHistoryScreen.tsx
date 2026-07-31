import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBadge } from '../../components/common/AppBadge';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useStudentStore } from '../../store';
import { formatDisplayDate } from '../../utils/date';

export function StudentEnrollmentHistoryScreen({
  navigation,
  route,
}: RoleScreenProps<'StudentEnrollmentHistory'>) {
  const theme = useAppTheme();
  const { schoolId, studentId } = route.params;
  const current = useStudentStore(state => state.currentStudent);
  const history = useStudentStore(state => state.enrollmentHistory);
  const isLoading = useStudentStore(state => state.isLoadingStudent);
  const error = useStudentStore(state => state.error);
  const loadStudent = useStudentStore(state => state.loadStudent);
  const loadHistory = useStudentStore(state => state.loadEnrollmentHistory);

  useEffect(() => {
    async function load() {
      if (current?.profile.id !== studentId) {
        await loadStudent(schoolId, studentId);
      }
      await loadHistory(schoolId, studentId);
    }
    load().catch(() => undefined);
  }, [current?.profile.id, loadHistory, loadStudent, schoolId, studentId]);

  return (
    <AppScreen
      contentContainerStyle={styles.content}
      onRefresh={() => loadHistory(schoolId, studentId)}
      refreshing={isLoading}
      scrollable
      testID="student-enrollment-history-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          subtitle={current?.profile.fullName}
          title="Enrollment History"
        />
        {isLoading && history.length === 0 ? (
          <LoadingView message="Loading enrollment history…" />
        ) : error && history.length === 0 ? (
          <ErrorState
            message={error.message}
            onRetry={() => loadHistory(schoolId, studentId)}
          />
        ) : history.length === 0 ? (
          <EmptyState
            description="No enrollment has been recorded for this profile."
            title="No enrollment history"
          />
        ) : (
          <View style={styles.timeline}>
            {history.map((enrollment, index) => (
              <View key={enrollment.id} style={styles.timelineRow}>
                <View
                  style={[
                    styles.marker,
                    { backgroundColor: theme.colors.primary },
                  ]}
                />
                <AppCard style={styles.card} variant="outlined">
                  <View style={styles.titleRow}>
                    <AppText variant="title">
                      {index === 0 ? 'Latest enrollment' : 'Previous enrollment'}
                    </AppText>
                    <AppBadge
                      label={enrollment.status}
                      status={
                        enrollment.status === 'ACTIVE' ? 'active' : 'inactive'
                      }
                    />
                  </View>
                  <AppText>Session: {enrollment.academicSessionId}</AppText>
                  <AppText>
                    Branch: {enrollment.branchId} · Class: {enrollment.classId}
                  </AppText>
                  <AppText>
                    Section: {enrollment.sectionId} · Roll:{' '}
                    {enrollment.rollNumber ?? 'Not assigned'}
                  </AppText>
                  <AppText variant="caption">
                    {formatDisplayDate(enrollment.startDate)}
                    {enrollment.endDate
                      ? ` — ${formatDisplayDate(enrollment.endDate)}`
                      : ' — Present'}
                  </AppText>
                  {enrollment.transferType ? (
                    <AppText variant="caption">
                      {enrollment.transferType.replace('_', ' ')} ·{' '}
                      {enrollment.transferReason}
                    </AppText>
                  ) : null}
                </AppCard>
              </View>
            ))}
          </View>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1 },
  content: { paddingBottom: 32 },
  marker: {
    borderRadius: 5,
    height: 10,
    marginTop: 22,
    width: 10,
  },
  maxWidth: { alignSelf: 'center', maxWidth: 760, width: '100%' },
  timeline: { gap: 12 },
  timelineRow: { flexDirection: 'row', gap: 10 },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
