import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AcademicContextBar } from '../../components/academic/AcademicContextBar';
import { SubjectFormFields } from '../../components/academic/AcademicFormFields';
import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import type { UpdateSubjectInput } from '../../models/academic';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAcademicStore } from '../../store';
import {
  type AcademicFormErrors,
  validateSubjectInput,
} from '../../utils/academicValidation';

export function EditSubjectScreen({
  navigation,
  route,
}: RoleScreenProps<'EditSubject'>) {
  const { schoolId, subjectId } = route.params;
  const current = useAcademicStore(state => state.currentSubject);
  const error = useAcademicStore(state => state.error);
  const isLoading = useAcademicStore(state => state.isLoading);
  const isSaving = useAcademicStore(state => state.isSaving);
  const loadSubject = useAcademicStore(state => state.loadSubject);
  const updateSubject = useAcademicStore(state => state.updateSubject);
  const [value, setValue] = useState<UpdateSubjectInput | null>(null);
  const [errors, setErrors] = useState<AcademicFormErrors>({});

  useEffect(() => {
    loadSubject(schoolId, subjectId).catch(() => undefined);
  }, [loadSubject, schoolId, subjectId]);

  useEffect(() => {
    if (current?.id === subjectId) {
      setValue({
        code: current.code,
        displayOrder: current.displayOrder,
        name: current.name,
        shortName: current.shortName,
        status: current.status,
        type: current.type,
      });
    }
  }, [current, subjectId]);

  return (
    <AppScreen
      contentContainerStyle={styles.content}
      scrollable
      testID="edit-subject-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          title="Edit Subject"
        />
        <AcademicContextBar schoolId={schoolId} />
        {isLoading && !value ? (
          <LoadingView message="Loading subject…" />
        ) : error && !value ? (
          <ErrorState
            message={error.message}
            onRetry={() => loadSubject(schoolId, subjectId)}
          />
        ) : value ? (
          <>
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
                if (await updateSubject(schoolId, subjectId, value)) {
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
  maxWidth: { alignSelf: 'center', maxWidth: 680, width: '100%' },
  submit: { marginTop: 22 },
});
