import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { InlineError } from '../../components/feedback/InlineError';
import { AdmissionStepIndicator } from '../../components/student/StudentComponents';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useStudentStore } from '../../store';

export function StudentAdmissionReviewScreen({
  navigation,
  route,
}: RoleScreenProps<'StudentAdmissionReview'>) {
  const theme = useAppTheme();
  const draft = useStudentStore(state => state.admissionDraft);
  const isCreating = useStudentStore(state => state.isCreatingStudent);
  const error = useStudentStore(state => state.error);
  const submit = useStudentStore(state => state.submitAdmission);
  const setStep = useStudentStore(state => state.setAdmissionStep);
  const primary = draft.guardians.find(item => item.isPrimaryContact);
  const feeContact = draft.guardians.find(item => item.isFeeContact);

  return (
    <AppScreen
      contentContainerStyle={styles.content}
      scrollable
      testID="student-admission-review-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={() => {
            setStep(4);
            navigation.goBack();
          }}
          subtitle="Confirm all details before the atomic admission"
          title="Review Admission"
        />
        <AdmissionStepIndicator step={5} />
        <AppCard header={<AppText variant="title">Student</AppText>}>
          <Line label="Name" value={draft.profile.fullName} />
          <Line label="Date of birth" value={draft.profile.dateOfBirth} />
          <Line label="Gender" value={draft.profile.gender} />
          <Line label="Admission date" value={draft.profile.admissionDate} />
          <Line label="Mobile" value={draft.profile.mobile ?? 'Not provided'} />
        </AppCard>
        <AppCard
          header={<AppText variant="title">Guardians</AppText>}
          style={styles.card}
        >
          <Line label="Primary" value={primary?.fullName ?? 'Not selected'} />
          <Line label="Fee contact" value={feeContact?.fullName ?? 'Not selected'} />
          <Line
            label="Parent App"
            value={
              draft.guardians.some(item => item.parentAppAccessEnabled)
                ? 'Will create or reuse access'
                : 'Not enabled'
            }
          />
        </AppCard>
        <AppCard
          header={<AppText variant="title">Enrollment</AppText>}
          style={styles.card}
        >
          <Line label="Branch" value={draft.enrollment.branchId} />
          <Line label="Session" value={draft.enrollment.academicSessionId} />
          <Line label="Class" value={draft.enrollment.classId} />
          <Line label="Section" value={draft.enrollment.sectionId} />
          <Line label="Roll" value={draft.enrollment.rollNumber ?? 'Not assigned'} />
        </AppCard>
        {!draft.guardians.some(item => item.parentAppAccessEnabled) ? (
          <AppText color={theme.colors.warning} style={styles.warning}>
            Warning: No Parent App access selected.
          </AppText>
        ) : null}
        {!draft.enableStudentAppAccess ? (
          <AppText color={theme.colors.textSecondary} style={styles.warning}>
            Student login will not be created.
          </AppText>
        ) : null}
        {!draft.enrollment.rollNumber ? (
          <AppText color={theme.colors.warning} style={styles.warning}>
            Roll number is optional and has not been assigned.
          </AppText>
        ) : null}
        {error ? <InlineError message={error.message} /> : null}
        <AppButton
          loading={isCreating}
          onPress={async () => {
            const result = await submit(route.params.schoolId);
            if (result) {
              navigation.replace(ROUTES.STUDENT_ADMISSION_SUCCESS, {
                schoolId: route.params.schoolId,
              });
            }
          }}
          style={styles.submit}
          title="Submit Admission"
        />
      </View>
    </AppScreen>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.line}>
      <AppText color={theme.colors.textSecondary}>{label}</AppText>
      <AppText align="right" style={styles.value}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 12 },
  content: { paddingBottom: 32 },
  line: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' },
  submit: { marginTop: 20 },
  value: { flex: 1, marginLeft: 20 },
  warning: { marginTop: 10 },
});
