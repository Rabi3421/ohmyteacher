import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { InlineError } from '../../components/feedback/InlineError';
import { AcademicSessionFormFields } from '../../components/organization/AcademicSessionFormFields';
import type { CreateAcademicSessionInput } from '../../models/organization';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useOrganizationStore } from '../../store';
import { getAcademicYearForDate } from '../../utils/academicSession';
import {
  type FormErrors,
  validateAcademicSessionInput,
} from '../../utils/organizationValidation';

function getNextSession(): CreateAcademicSessionInput {
  const current = getAcademicYearForDate(new Date());
  return {
    endDate: `${current.endYear + 1}-03-31`,
    name: `${current.endYear}-${String(current.endYear + 1).slice(-2)}`,
    startDate: `${current.endYear}-04-01`,
    status: 'UPCOMING',
  };
}

export function CreateAcademicSessionScreen({
  navigation,
  route,
}: RoleScreenProps<'CreateAcademicSession'>) {
  const schoolId = route.params.schoolId;
  const createSession = useOrganizationStore(
    state => state.createAcademicSession,
  );
  const isSaving = useOrganizationStore(state => state.isSavingSession);
  const error = useOrganizationStore(state => state.error);
  const [form, setForm] = useState<CreateAcademicSessionInput>(getNextSession);
  const [errors, setErrors] = useState<FormErrors>({});

  const submit = async (): Promise<void> => {
    const validation = validateAcademicSessionInput(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0 || isSaving) return;
    const created = await createSession(schoolId, form);
    if (created) navigation.goBack();
  };

  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      scrollable
      testID="create-academic-session-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          title="Create Academic Session"
        />
        <AppCard style={styles.card} variant="elevated">
          <AcademicSessionFormFields
            errors={errors}
            onChange={setForm}
            value={form}
          />
          <AppText style={styles.statusLabel} variant="label">
            Initial Status
          </AppText>
          <View style={styles.statusActions}>
            {(['UPCOMING', 'ACTIVE'] as const).map(status => (
              <AppButton
                key={status}
                onPress={() => setForm(current => ({ ...current, status }))}
                title={status === 'UPCOMING' ? 'Upcoming' : 'Active'}
                variant={form.status === status ? 'primary' : 'outline'}
              />
            ))}
          </View>
          <AppText style={styles.helper} variant="caption">
            Making this active will deactivate the school’s current active session.
          </AppText>
          {error ? (
            <InlineError message={error.message} style={styles.error} />
          ) : null}
          <AppButton
            fullWidth
            loading={isSaving}
            onPress={submit}
            style={styles.submit}
            title="Create Session"
          />
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 20 },
  error: { marginTop: 16 },
  helper: { marginTop: 8 },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 680,
    width: '100%',
  },
  screenContent: { paddingBottom: 32 },
  statusActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  statusLabel: { marginTop: 20 },
  submit: { marginTop: 20 },
});
