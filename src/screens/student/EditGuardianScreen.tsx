import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { GuardianFormFields } from '../../components/student/StudentFormFields';
import type { GuardianInput } from '../../models/student';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useStudentStore } from '../../store';
import {
  type StudentFormErrors,
  validateGuardianInput,
} from '../../utils/studentValidation';

export function EditGuardianScreen({
  navigation,
  route,
}: RoleScreenProps<'EditGuardian'>) {
  const { schoolId, studentId, guardianId } = route.params;
  const guardians = useStudentStore(state => state.guardians);
  const loadGuardians = useStudentStore(state => state.loadGuardians);
  const updateGuardian = useStudentStore(state => state.updateGuardian);
  const isLoading = useStudentStore(state => state.isLoadingStudent);
  const isSaving = useStudentStore(state => state.isSavingGuardian);
  const error = useStudentStore(state => state.error);
  const guardian = guardians.find(item => item.id === guardianId);
  const [value, setValue] = useState<GuardianInput | null>(null);
  const [errors, setErrors] = useState<StudentFormErrors>({});

  useEffect(() => {
    if (!guardian) {
      loadGuardians(schoolId, studentId).catch(() => undefined);
      return;
    }
    setValue({
      address: guardian.address,
      alternateMobile: guardian.alternateMobile,
      email: guardian.email,
      fullName: guardian.fullName,
      isEmergencyContact: guardian.link.isEmergencyContact,
      isFeeContact: guardian.link.isFeeContact,
      isPrimaryContact: guardian.link.isPrimaryContact,
      mobile: guardian.mobile,
      occupation: guardian.occupation,
      parentAppAccessEnabled: guardian.link.parentAppAccessEnabled,
      relationship: guardian.relationship,
      whatsappEnabled: guardian.link.whatsappEnabled,
    });
  }, [guardian, loadGuardians, schoolId, studentId]);

  return (
    <AppScreen scrollable testID="edit-guardian-screen">
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          subtitle="Primary and fee contacts must always remain assigned."
          title="Edit Guardian"
        />
        {isLoading && !value ? (
          <LoadingView message="Loading guardian…" />
        ) : error && !value ? (
          <ErrorState
            message={error.message}
            onRetry={() => loadGuardians(schoolId, studentId)}
          />
        ) : value ? (
          <>
            <GuardianFormFields
              disabled={isSaving}
              errors={errors}
              onChange={setValue}
              value={value}
            />
            {error ? <InlineError message={error.message} /> : null}
            <AppButton
              loading={isSaving}
              onPress={async () => {
                const nextErrors = validateGuardianInput(value);
                setErrors(nextErrors);
                if (Object.keys(nextErrors).length) return;
                if (
                  await updateGuardian(
                    schoolId,
                    studentId,
                    guardianId,
                    value,
                  )
                ) {
                  navigation.goBack();
                }
              }}
              style={styles.save}
              title="Save Guardian"
            />
          </>
        ) : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' },
  save: { marginTop: 22 },
});
