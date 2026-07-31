import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AcademicContextBar } from '../../components/academic/AcademicContextBar';
import { ClassFormFields } from '../../components/academic/AcademicFormFields';
import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { InlineError } from '../../components/feedback/InlineError';
import { ROUTES } from '../../constants/routes';
import type { CreateClassInput } from '../../models/academic';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAcademicStore } from '../../store';
import {
  type AcademicFormErrors,
  validateClassInput,
} from '../../utils/academicValidation';

const initialValue: CreateClassInput = {
  code: '',
  displayOrder: 1,
  name: '',
  status: 'ACTIVE',
};

export function CreateClassScreen({
  navigation,
  route,
}: RoleScreenProps<'CreateClass'>) {
  const [value, setValue] = useState(initialValue);
  const [errors, setErrors] = useState<AcademicFormErrors>({});
  const context = useAcademicStore(state => state.context);
  const error = useAcademicStore(state => state.error);
  const isSaving = useAcademicStore(state => state.isSaving);
  const createClass = useAcademicStore(state => state.createClass);

  return (
    <AppScreen
      contentContainerStyle={styles.content}
      scrollable
      testID="create-class-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          subtitle="Add a class to the selected branch and session"
          title="Create Class"
        />
        <AcademicContextBar
          initialBranchId={route.params.branchId}
          initialSessionId={route.params.academicSessionId}
          schoolId={route.params.schoolId}
        />
        <ClassFormFields
          disabled={isSaving}
          errors={{ ...errors, ...error?.fieldErrors }}
          onChange={setValue}
          value={value}
        />
        {error ? <InlineError message={error.message} /> : null}
        <AppButton
          disabled={!context}
          loading={isSaving}
          onPress={async () => {
            const nextErrors = validateClassInput(value);
            setErrors(nextErrors);
            if (Object.keys(nextErrors).length > 0) return;
            const created = await createClass(value);
            if (created && context) {
              navigation.replace(ROUTES.CLASS_DETAILS, {
                ...context,
                classId: created.id,
              });
            }
          }}
          style={styles.submit}
          title="Create Class"
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
