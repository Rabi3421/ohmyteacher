import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import {
  EnrollmentSummaryCard,
  GuardianCard,
  StudentProfileHeader,
} from '../../components/student/StudentComponents';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useStudentStore } from '../../store';
import { formatDisplayDate } from '../../utils/date';

export function StudentSelfProfileScreen({
  route,
}: RoleScreenProps<'StudentSelfProfile'>) {
  const { schoolId, studentMembershipId } = route.params;
  const profile = useStudentStore(state => state.selfProfile);
  const isLoading = useStudentStore(state => state.isLoadingStudent);
  const error = useStudentStore(state => state.error);
  const loadProfile = useStudentStore(state => state.loadSelfProfile);

  useEffect(() => {
    loadProfile(schoolId, studentMembershipId).catch(() => undefined);
  }, [loadProfile, schoolId, studentMembershipId]);

  return (
    <AppScreen
      onRefresh={() => loadProfile(schoolId, studentMembershipId)}
      refreshing={isLoading}
      scrollable
      testID="student-self-profile-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          subtitle="Read-only student record"
          title="My Profile"
        />
        {isLoading && !profile ? (
          <LoadingView message="Loading your profile…" />
        ) : error && !profile ? (
          <ErrorState
            message={error.message}
            onRetry={() => loadProfile(schoolId, studentMembershipId)}
          />
        ) : profile ? (
          <View style={styles.sections}>
            <AppCard variant="elevated">
              <StudentProfileHeader profile={profile.profile} />
              <View style={styles.facts}>
                <AppText>
                  Date of birth: {formatDisplayDate(profile.profile.dateOfBirth)}
                </AppText>
                <AppText>Gender: {profile.profile.gender}</AppText>
                <AppText>
                  Admission date:{' '}
                  {formatDisplayDate(profile.profile.admissionDate)}
                </AppText>
                <AppText>
                  Address: {profile.profile.address.line1},{' '}
                  {profile.profile.address.city}
                </AppText>
              </View>
            </AppCard>
            <EnrollmentSummaryCard enrollment={profile.currentEnrollment} />
            <AppText variant="heading3">Guardians</AppText>
            {profile.guardians.map(guardian => (
              <GuardianCard guardian={guardian} key={guardian.id} />
            ))}
          </View>
        ) : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  facts: { gap: 6, marginTop: 16 },
  maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' },
  sections: { gap: 14 },
});
