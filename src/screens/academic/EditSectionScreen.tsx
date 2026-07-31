import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AcademicContextBar } from '../../components/academic/AcademicContextBar';
import { SectionFormFields } from '../../components/academic/AcademicFormFields';
import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { useClassContextRedirect } from '../../hooks/useClassContextRedirect';
import type { UpdateSectionInput } from '../../models/academic';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAcademicStore } from '../../store';
import {
  type AcademicFormErrors,
  validateSectionInput,
} from '../../utils/academicValidation';

export function EditSectionScreen({
  navigation,
  route,
}: RoleScreenProps<'EditSection'>) {
  const {
    classId,
    sectionId,
    schoolId,
    branchId,
    academicSessionId,
  } = route.params;
  const context = useAcademicStore(state => state.context);
  const current = useAcademicStore(state => state.currentSection);
  const error = useAcademicStore(state => state.error);
  const isLoading = useAcademicStore(state => state.isLoading);
  const isSaving = useAcademicStore(state => state.isSaving);
  const loadSection = useAcademicStore(state => state.loadSection);
  const updateSection = useAcademicStore(state => state.updateSection);
  const [value, setValue] = useState<UpdateSectionInput | null>(null);
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
      loadSection(classId, sectionId).catch(() => undefined);
    }
  }, [
    academicSessionId,
    branchId,
    classId,
    context,
    loadSection,
    schoolId,
    sectionId,
  ]);

  useEffect(() => {
    if (current?.id === sectionId) {
      setValue({
        capacity: current.capacity,
        code: current.code,
        displayOrder: current.displayOrder,
        name: current.name,
        status: current.status,
      });
    }
  }, [current, sectionId]);

  return (
    <AppScreen
      contentContainerStyle={styles.content}
      scrollable
      testID="edit-section-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          title="Edit Section"
        />
        <AcademicContextBar
          initialBranchId={branchId}
          initialSessionId={academicSessionId}
          schoolId={schoolId}
        />
        {isLoading && !value ? (
          <LoadingView message="Loading section…" />
        ) : error && !value ? (
          <ErrorState
            message={error.message}
            onRetry={() => loadSection(classId, sectionId)}
          />
        ) : value ? (
          <>
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
                if (await updateSection(classId, sectionId, value)) {
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
