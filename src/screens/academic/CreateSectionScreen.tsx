import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AcademicContextBar } from '../../components/academic/AcademicContextBar';
import { SectionFormFields } from '../../components/academic/AcademicFormFields';
import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { InlineError } from '../../components/feedback/InlineError';
import { useClassContextRedirect } from '../../hooks/useClassContextRedirect';
import type { CreateSectionInput } from '../../models/academic';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAcademicStore } from '../../store';
import {
  type AcademicFormErrors,
  validateSectionInput,
} from '../../utils/academicValidation';

const initialValue: CreateSectionInput = {
  code: '',
  displayOrder: 1,
  name: '',
  status: 'ACTIVE',
};

export function CreateSectionScreen({
  navigation,
  route,
}: RoleScreenProps<'CreateSection'>) {
  const [value, setValue] = useState(initialValue);
  const [errors, setErrors] = useState<AcademicFormErrors>({});
  const error = useAcademicStore(state => state.error);
  const isSaving = useAcademicStore(state => state.isSaving);
  const createSection = useAcademicStore(state => state.createSection);
  useClassContextRedirect(navigation, {
    academicSessionId: route.params.academicSessionId,
    branchId: route.params.branchId,
    schoolId: route.params.schoolId,
  });

  return (
    <AppScreen
      contentContainerStyle={styles.content}
      scrollable
      testID="create-section-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          subtitle="Add a section within this class"
          title="Create Section"
        />
        <AcademicContextBar
          initialBranchId={route.params.branchId}
          initialSessionId={route.params.academicSessionId}
          schoolId={route.params.schoolId}
        />
        <SectionFormFields
          disabled={isSaving}
          errors={{ ...errors, ...error?.fieldErrors }}
          onChange={setValue}
          value={value}
        />
        {error ? <InlineError message={error.message} /> : null}
        <AppButton
          loading={isSaving}
          onPress={async () => {
            const nextErrors = validateSectionInput(value);
            setErrors(nextErrors);
            if (Object.keys(nextErrors).length > 0) return;
            if (await createSection(route.params.classId, value)) {
              navigation.goBack();
            }
          }}
          style={styles.submit}
          title="Create Section"
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  maxWidth: { alignSelf: 'center', maxWidth: 680, width: '100%' },
  submit: { marginTop: 22 },
});
