import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { AcademicSessionFormFields } from '../../components/organization/AcademicSessionFormFields';
import type { CreateAcademicSessionInput } from '../../models/organization';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useOrganizationStore } from '../../store';
import {
  type FormErrors,
  validateAcademicSessionInput,
} from '../../utils/organizationValidation';

export function EditAcademicSessionScreen({
  navigation,
  route,
}: RoleScreenProps<'EditAcademicSession'>) {
  const { schoolId, sessionId } = route.params;
  const sessions = useOrganizationStore(state => state.academicSessions);
  const isLoading = useOrganizationStore(state => state.isLoadingSessions);
  const isSaving = useOrganizationStore(state => state.isSavingSession);
  const error = useOrganizationStore(state => state.error);
  const loadSessions = useOrganizationStore(
    state => state.loadAcademicSessions,
  );
  const updateSession = useOrganizationStore(
    state => state.updateAcademicSession,
  );
  const session = useMemo(
    () => sessions.find(item => item.id === sessionId),
    [sessionId, sessions],
  );
  const [form, setForm] = useState<CreateAcademicSessionInput>();
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!session) loadSessions(schoolId).catch(() => undefined);
  }, [loadSessions, schoolId, session]);

  useEffect(() => {
    if (session) {
      setForm({
        endDate: session.endDate,
        name: session.name,
        startDate: session.startDate,
      });
    }
  }, [session]);

  if (isLoading && !session) {
    return <LoadingView message="Preparing academic session…" />;
  }
  if (!session || !form) {
    return (
      <ErrorState
        message={error?.message ?? 'Academic session is unavailable.'}
        onRetry={() => loadSessions(schoolId)}
      />
    );
  }

  const submit = async (): Promise<void> => {
    const validation = validateAcademicSessionInput(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0 || isSaving) return;
    const updated = await updateSession(schoolId, sessionId, {
      endDate: form.endDate,
      name: form.name,
      startDate: form.startDate,
    });
    if (updated) navigation.goBack();
  };

  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      scrollable
      testID="edit-academic-session-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          title="Edit Academic Session"
        />
        <AppCard style={styles.card} variant="elevated">
          <AcademicSessionFormFields
            errors={errors}
            onChange={setForm}
            value={form}
          />
          {error ? (
            <InlineError message={error.message} style={styles.error} />
          ) : null}
          <AppButton
            fullWidth
            loading={isSaving}
            onPress={submit}
            style={styles.submit}
            title="Save Changes"
          />
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 20 },
  error: { marginTop: 16 },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 680,
    width: '100%',
  },
  screenContent: { paddingBottom: 32 },
  submit: { marginTop: 20 },
});
