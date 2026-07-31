import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import {
  EnrollmentSummaryCard,
  GuardianCard,
  StudentProfileHeader,
} from '../../components/student/StudentComponents';
import { ROUTES } from '../../constants/routes';
import { useStudentAccess } from '../../hooks/useStudentAccess';
import type { StudentProfileStatus } from '../../models/student';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useStudentStore } from '../../store';
import { formatDisplayDate } from '../../utils/date';

export function StudentDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'StudentDetails'>) {
  const { schoolId, studentId } = route.params;
  const student = useStudentStore(state => state.currentStudent);
  const isLoading = useStudentStore(state => state.isLoadingStudent);
  const isUpdatingStatus = useStudentStore(state => state.isUpdatingStatus);
  const error = useStudentStore(state => state.error);
  const setSchool = useStudentStore(state => state.setSchoolContext);
  const loadStudent = useStudentStore(state => state.loadStudent);
  const updateStatus = useStudentStore(state => state.updateStatus);
  const access = useStudentAccess(
    schoolId,
    student?.currentEnrollment?.branchId,
  );
  const [pendingStatus, setPendingStatus] =
    useState<StudentProfileStatus | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    setSchool(schoolId);
    loadStudent(schoolId, studentId).catch(() => undefined);
  }, [loadStudent, schoolId, setSchool, studentId]);

  const current = student?.profile.id === studentId ? student : null;

  return (
    <>
      <AppScreen
        contentContainerStyle={styles.content}
        onRefresh={() => loadStudent(schoolId, studentId)}
        refreshing={isLoading}
        scrollable
        testID="student-details-screen"
      >
        <View style={styles.maxWidth}>
          <AppHeader
            includeSafeArea={false}
            onBackPress={navigation.goBack}
            rightActions={
              access.canEdit ? (
                <AppButton
                  onPress={() =>
                    navigation.navigate(ROUTES.EDIT_STUDENT, route.params)
                  }
                  title="Edit"
                  variant="outline"
                />
              ) : null
            }
            title="Student Details"
          />
          {isLoading && !current ? (
            <LoadingView message="Loading student…" />
          ) : error && !current ? (
            <ErrorState
              message={error.message}
              onRetry={() => loadStudent(schoolId, studentId)}
            />
          ) : current ? (
            <>
              <AppCard variant="elevated">
                <StudentProfileHeader profile={current.profile} />
                <View style={styles.profileFacts}>
                  <AppText>
                    Date of birth: {formatDisplayDate(current.profile.dateOfBirth)}
                  </AppText>
                  <AppText>Gender: {current.profile.gender}</AppText>
                  <AppText>
                    Admission date:{' '}
                    {formatDisplayDate(current.profile.admissionDate)}
                  </AppText>
                  <AppText>
                    Contact: {current.profile.mobile ?? 'No mobile'}
                    {current.profile.email ? ` · ${current.profile.email}` : ''}
                  </AppText>
                  <AppText>
                    Address: {current.profile.address.line1},{' '}
                    {current.profile.address.city}
                  </AppText>
                </View>
              </AppCard>
              <View style={styles.section}>
                <EnrollmentSummaryCard enrollment={current.currentEnrollment} />
              </View>
              <AppText style={styles.heading} variant="heading3">
                Guardian Summary
              </AppText>
              {current.guardians.slice(0, 2).map(guardian => (
                <GuardianCard guardian={guardian} key={guardian.id} />
              ))}
              <AppCard style={styles.section} variant="outlined">
                <AppText variant="title">Access & History</AppText>
                <AppText>
                  Parent accounts: {current.access.parentMemberships.length}
                </AppText>
                <AppText>
                  Student account:{' '}
                  {current.access.studentMembership ? 'Enabled' : 'Not enabled'}
                </AppText>
                <AppText>Enrollment records: {current.enrollmentCount}</AppText>
                <AppText>
                  Status changes: {current.statusHistory.length}
                </AppText>
              </AppCard>
              <View style={styles.actions}>
                {access.canManageGuardians ? (
                  <AppButton
                    onPress={() =>
                      navigation.navigate(ROUTES.STUDENT_GUARDIANS, route.params)
                    }
                    title="Manage Guardians"
                    variant="outline"
                  />
                ) : null}
                {access.canViewHistory ? (
                  <AppButton
                    onPress={() =>
                      navigation.navigate(
                        ROUTES.STUDENT_ENROLLMENT_HISTORY,
                        route.params,
                      )
                    }
                    title="Enrollment History"
                    variant="outline"
                  />
                ) : null}
                {access.canTransfer ? (
                  <AppButton
                    onPress={() =>
                      navigation.navigate(ROUTES.TRANSFER_STUDENT, route.params)
                    }
                    title="Transfer Student"
                    variant="outline"
                  />
                ) : null}
                {access.canManageAccess ? (
                  <AppButton
                    onPress={() =>
                      navigation.navigate(ROUTES.STUDENT_ACCESS, route.params)
                    }
                    title="Manage App Access"
                    variant="outline"
                  />
                ) : null}
              </View>
              {access.canManageStatus ? (
                <AppCard style={styles.section} variant="outlined">
                  <AppText variant="title">Change Student Status</AppText>
                  <AppInput
                    label="Reason"
                    onChangeText={setReason}
                    value={reason}
                  />
                  <View style={styles.statusActions}>
                    {(
                      ['INACTIVE', 'WITHDRAWN', 'PASSED_OUT', 'ACTIVE'] as const
                    ).map(status => (
                      <AppButton
                        key={status}
                        onPress={() => setPendingStatus(status)}
                        title={status.replace('_', ' ')}
                        variant={status === 'ACTIVE' ? 'outline' : 'danger'}
                      />
                    ))}
                  </View>
                </AppCard>
              ) : null}
              {error ? <InlineError message={error.message} /> : null}
            </>
          ) : null}
        </View>
      </AppScreen>
      <ConfirmationDialog
        confirmLabel="Change Status"
        destructive={pendingStatus !== 'ACTIVE'}
        loading={isUpdatingStatus}
        message={`Reason: ${reason || 'Required for this transition'}`}
        onCancel={() => setPendingStatus(null)}
        onConfirm={async () => {
          if (
            pendingStatus &&
            (await updateStatus(schoolId, studentId, pendingStatus, reason))
          ) {
            setPendingStatus(null);
            setReason('');
          }
        }}
        title={`Set status to ${pendingStatus?.replace('_', ' ') ?? ''}?`}
        visible={Boolean(pendingStatus)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  content: { paddingBottom: 32 },
  heading: { marginBottom: 10, marginTop: 20 },
  maxWidth: { alignSelf: 'center', maxWidth: 760, width: '100%' },
  profileFacts: { gap: 6, marginTop: 18 },
  section: { marginTop: 14 },
  statusActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
});
