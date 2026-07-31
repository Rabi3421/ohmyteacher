import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { InlineError } from '../../components/feedback/InlineError';
import { GuardianFormFields } from '../../components/student/StudentFormFields';
import type { GuardianInput } from '../../models/student';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useStudentStore } from '../../store';
import {
  type StudentFormErrors,
  validateGuardianInput,
} from '../../utils/studentValidation';

const initialGuardian: GuardianInput = {
  address: { city: '', country: 'India', line1: '', pinCode: '', state: '' },
  fullName: '',
  isEmergencyContact: true,
  isFeeContact: false,
  isPrimaryContact: false,
  mobile: '',
  parentAppAccessEnabled: true,
  relationship: 'FATHER',
  whatsappEnabled: true,
};

export function CreateGuardianScreen({
  navigation,
  route,
}: RoleScreenProps<'CreateGuardian'>) {
  const { schoolId, studentId } = route.params;
  const addGuardian = useStudentStore(state => state.addGuardian);
  const isSaving = useStudentStore(state => state.isSavingGuardian);
  const error = useStudentStore(state => state.error);
  const [value, setValue] = useState(initialGuardian);
  const [errors, setErrors] = useState<StudentFormErrors>({});

  return (
    <AppScreen scrollable testID="create-guardian-screen">
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          subtitle="An existing guardian identity with the same school and mobile is reused."
          title="Add Guardian"
        />
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
            if (await addGuardian(schoolId, studentId, value)) {
              navigation.goBack();
            }
          }}
          style={styles.save}
          title="Link Guardian"
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' },
  save: { marginTop: 22 },
});
