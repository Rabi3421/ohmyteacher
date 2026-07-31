import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ROUTES } from '../../constants/routes';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useStudentStore } from '../../store';

export function StudentAdmissionSuccessScreen({
  navigation,
  route,
}: RoleScreenProps<'StudentAdmissionSuccess'>) {
  const result = useStudentStore(state => state.admissionResult);
  const resetDraft = useStudentStore(state => state.resetAdmissionDraft);
  if (!result) {
    return (
      <AppScreen testID="student-admission-success-screen">
        <EmptyState
          description="The completed admission is no longer in this session."
          title="Admission result unavailable"
        />
      </AppScreen>
    );
  }
  const primary = result.guardianLinks.find(item => item.link.isPrimaryContact);
  return (
    <AppScreen
      contentContainerStyle={styles.content}
      scrollable
      testID="student-admission-success-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader includeSafeArea={false} title="Admission Complete" />
        <AppCard variant="elevated">
          <AppText variant="heading2">{result.profile.fullName}</AppText>
          <AppText variant="title">{result.profile.admissionNumber}</AppText>
          <AppText>{result.activeEnrollment.branchName}</AppText>
          <AppText>
            {result.activeEnrollment.academicSessionName} ·{' '}
            {result.activeEnrollment.className} ·{' '}
            {result.activeEnrollment.sectionName}
          </AppText>
          <AppText>Primary guardian: {primary?.fullName ?? '—'}</AppText>
          <AppText>
            Parent App:{' '}
            {result.access.parentMemberships.length ? 'Enabled' : 'Not enabled'}
          </AppText>
          <AppText>
            Student App:{' '}
            {result.access.studentMembership ? 'Enabled' : 'Not enabled'}
          </AppText>
        </AppCard>
        <View style={styles.actions}>
          <AppButton
            onPress={() =>
              navigation.replace(ROUTES.STUDENT_DETAILS, {
                schoolId: route.params.schoolId,
                studentId: result.profile.id,
              })
            }
            title="View Student"
          />
          <AppButton
            onPress={() => {
              resetDraft();
              navigation.replace(ROUTES.CREATE_STUDENT, {
                schoolId: route.params.schoolId,
              });
            }}
            title="Add Another Student"
            variant="outline"
          />
          <AppButton
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: ROUTES.STUDENTS,
                    params: { schoolId: route.params.schoolId },
                  },
                ],
              })
            }
            title="Return to Students"
            variant="ghost"
          />
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10, marginTop: 18 },
  content: { paddingBottom: 32 },
  maxWidth: { alignSelf: 'center', maxWidth: 680, width: '100%' },
});
