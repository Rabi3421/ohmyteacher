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

export function ParentChildDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'ParentChildDetails'>) {
  const { schoolId, parentMembershipId, studentId } = route.params;
  const child = useStudentStore(state => state.parentSelectedChild);
  const isLoading = useStudentStore(state => state.isLoadingStudent);
  const error = useStudentStore(state => state.error);
  const loadChild = useStudentStore(state => state.loadParentChild);
  const current = child?.profile.id === studentId ? child : null;

  useEffect(() => {
    loadChild(schoolId, parentMembershipId, studentId).catch(() => undefined);
  }, [loadChild, parentMembershipId, schoolId, studentId]);

  return (
    <AppScreen scrollable testID="parent-child-details-screen">
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          subtitle="Read-only school record"
          title="Child Profile"
        />
        {isLoading && !current ? (
          <LoadingView message="Loading child profile…" />
        ) : error && !current ? (
          <ErrorState
            message={error.message}
            onRetry={() =>
              loadChild(schoolId, parentMembershipId, studentId)
            }
          />
        ) : current ? (
          <View style={styles.sections}>
            <AppCard variant="elevated">
              <StudentProfileHeader profile={current.profile} />
              <View style={styles.facts}>
                <AppText>
                  Date of birth: {formatDisplayDate(current.profile.dateOfBirth)}
                </AppText>
                <AppText>Gender: {current.profile.gender}</AppText>
                <AppText>
                  Admission date:{' '}
                  {formatDisplayDate(current.profile.admissionDate)}
                </AppText>
              </View>
            </AppCard>
            <EnrollmentSummaryCard enrollment={current.currentEnrollment} />
            <AppText variant="heading3">Family Contacts</AppText>
            {current.guardians.map(guardian => (
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
