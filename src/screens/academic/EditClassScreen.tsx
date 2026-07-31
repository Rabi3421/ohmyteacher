import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AcademicContextBar } from '../../components/academic/AcademicContextBar';
import { ClassFormFields } from '../../components/academic/AcademicFormFields';
import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { useClassContextRedirect } from '../../hooks/useClassContextRedirect';
import type { UpdateClassInput } from '../../models/academic';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAcademicStore } from '../../store';
import {
  type AcademicFormErrors,
  validateClassInput,
} from '../../utils/academicValidation';

export function EditClassScreen({
  navigation,
  route,
}: RoleScreenProps<'EditClass'>) {
  const { classId, schoolId, branchId, academicSessionId } = route.params;
  const current = useAcademicStore(state => state.currentClass);
  const context = useAcademicStore(state => state.context);
  const error = useAcademicStore(state => state.error);
  const isLoading = useAcademicStore(state => state.isLoading);
  const isSaving = useAcademicStore(state => state.isSaving);
  const loadClass = useAcademicStore(state => state.loadClass);
  const updateClass = useAcademicStore(state => state.updateClass);
  const [value, setValue] = useState<UpdateClassInput | null>(null);
  const [errors, setErrors] = useState<AcademicFormErrors>({});
  useClassContextRedirect(navigation, {
    academicSessionId,
    branchId,
    schoolId,
  });

  useEffect(() => {
    if (
      context?.schoolId === schoolId &&
      context.branchId === branchId &&
      context.academicSessionId === academicSessionId
    ) {
      loadClass(classId).catch(() => undefined);
    }
  }, [
    academicSessionId,
    branchId,
    classId,
    context,
    loadClass,
    schoolId,
  ]);

  useEffect(() => {
    if (current?.id === classId) {
      setValue({
        code: current.code,
        displayOrder: current.displayOrder,
        name: current.name,
        status: current.status,
      });
    }
  }, [classId, current]);

  return (
    <AppScreen
      contentContainerStyle={styles.content}
      scrollable
      testID="edit-class-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          title="Edit Class"
        />
        <AcademicContextBar
          initialBranchId={branchId}
          initialSessionId={academicSessionId}
          schoolId={schoolId}
        />
        {isLoading && !value ? (
          <LoadingView message="Loading class…" />
        ) : error && !value ? (
          <ErrorState
            message={error.message}
            onRetry={() => loadClass(classId)}
          />
        ) : value ? (
          <>
            <ClassFormFields
              disabled={isSaving}
              errors={{ ...errors, ...error?.fieldErrors }}
              onChange={setValue}
              value={value}
            />
            {error ? <InlineError message={error.message} /> : null}
            <AppButton
              loading={isSaving}
              onPress={async () => {
                const nextErrors = validateClassInput(value);
                setErrors(nextErrors);
                if (Object.keys(nextErrors).length > 0) return;
                if (await updateClass(classId, value)) navigation.goBack();
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
