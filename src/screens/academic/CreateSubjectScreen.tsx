import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AcademicContextBar } from '../../components/academic/AcademicContextBar';
import { SubjectFormFields } from '../../components/academic/AcademicFormFields';
import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { InlineError } from '../../components/feedback/InlineError';
import { ROUTES } from '../../constants/routes';
import type { CreateSubjectInput } from '../../models/academic';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAcademicStore } from '../../store';
import {
  type AcademicFormErrors,
  validateSubjectInput,
} from '../../utils/academicValidation';

const initialValue: CreateSubjectInput = {
  code: '',
  displayOrder: 1,
  name: '',
  status: 'ACTIVE',
  type: 'CORE',
};

export function CreateSubjectScreen({
  navigation,
  route,
}: RoleScreenProps<'CreateSubject'>) {
  const [value, setValue] = useState(initialValue);
  const [errors, setErrors] = useState<AcademicFormErrors>({});
  const error = useAcademicStore(state => state.error);
  const isSaving = useAcademicStore(state => state.isSaving);
  const createSubject = useAcademicStore(state => state.createSubject);

  return (
    <AppScreen
      contentContainerStyle={styles.content}
      scrollable
      testID="create-subject-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          subtitle="Add to the school-wide subject catalog"
          title="Create Subject"
        />
        <AcademicContextBar schoolId={route.params.schoolId} />
        <SubjectFormFields
          disabled={isSaving}
          errors={{ ...errors, ...error?.fieldErrors }}
          onChange={setValue}
          value={value}
        />
        {error ? <InlineError message={error.message} /> : null}
        <AppButton
          loading={isSaving}
          onPress={async () => {
            const nextErrors = validateSubjectInput(value);
            setErrors(nextErrors);
            if (Object.keys(nextErrors).length > 0) return;
            const created = await createSubject(route.params.schoolId, value);
            if (created) {
              navigation.replace(ROUTES.SUBJECT_DETAILS, {
                schoolId: route.params.schoolId,
                subjectId: created.id,
              });
            }
          }}
          style={styles.submit}
          title="Create Subject"
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
