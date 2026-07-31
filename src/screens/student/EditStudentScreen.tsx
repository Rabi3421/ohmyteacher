import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { StudentProfileFormFields } from '../../components/student/StudentFormFields';
import type {
  StudentProfileInput,
  UpdateStudentProfileInput,
} from '../../models/student';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useStudentStore } from '../../store';
import {
  type StudentFormErrors,
  validateStudentProfileInput,
} from '../../utils/studentValidation';

export function EditStudentScreen({
  navigation,
  route,
}: RoleScreenProps<'EditStudent'>) {
  const { schoolId, studentId } = route.params;
  const current = useStudentStore(state => state.currentStudent);
  const isLoading = useStudentStore(state => state.isLoadingStudent);
  const isSaving = useStudentStore(state => state.isUpdatingStudent);
  const error = useStudentStore(state => state.error);
  const loadStudent = useStudentStore(state => state.loadStudent);
  const updateProfile = useStudentStore(state => state.updateProfile);
  const [value, setValue] = useState<StudentProfileInput | null>(null);
  const [errors, setErrors] = useState<StudentFormErrors>({});

  useEffect(() => {
    loadStudent(schoolId, studentId).catch(() => undefined);
  }, [loadStudent, schoolId, studentId]);

  useEffect(() => {
    if (current?.profile.id === studentId) {
      setValue({
        address: current.profile.address,
        admissionDate: current.profile.admissionDate,
        bloodGroup: current.profile.bloodGroup,
        dateOfBirth: current.profile.dateOfBirth,
        email: current.profile.email,
        fullName: current.profile.fullName,
        gender: current.profile.gender,
        mobile: current.profile.mobile,
        photoUrl: current.profile.photoUrl,
      });
    }
  }, [current, studentId]);

  return (
    <AppScreen
      contentContainerStyle={styles.content}
      scrollable
      testID="edit-student-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          subtitle="Admission number remains immutable"
          title="Edit Student"
        />
        {isLoading && !value ? (
          <LoadingView message="Loading student…" />
        ) : error && !value ? (
          <ErrorState
            message={error.message}
            onRetry={() => loadStudent(schoolId, studentId)}
          />
        ) : value ? (
          <>
            <StudentProfileFormFields
              disabled={isSaving}
              errors={{ ...errors, ...error?.fieldErrors }}
              onChange={setValue}
              value={value}
            />
            {current?.access.studentMembership && value.mobile !== current.profile.mobile ? (
              <InlineError message="Changing mobile may revoke or refresh existing Student App sessions." />
            ) : null}
            {error ? <InlineError message={error.message} /> : null}
            <AppButton
              loading={isSaving}
              onPress={async () => {
                const nextErrors = validateStudentProfileInput(value);
                setErrors(nextErrors);
                if (Object.keys(nextErrors).length) return;
                const input: UpdateStudentProfileInput = {
                  address: value.address,
                  bloodGroup: value.bloodGroup,
                  dateOfBirth: value.dateOfBirth,
                  email: value.email,
                  fullName: value.fullName,
                  gender: value.gender,
                  mobile: value.mobile,
                  photoUrl: value.photoUrl,
                };
                if (await updateProfile(schoolId, studentId, input)) {
                  navigation.goBack();
                }
              }}
              style={styles.submit}
              title="Save Changes"
            />
          </>
        ) : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' },
  submit: { marginTop: 20 },
});
