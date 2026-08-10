import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import {
  LiveOrganizationFormFields,
  type LiveOrganizationFormValue,
} from '../../components/organization/LiveOrganizationFormFields';
import type { UpdateCurrentSchoolInput } from '../../models/currentOrganization';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore, useCurrentOrganizationStore } from '../../store';
import {
  type CurrentOrganizationFormErrors,
  validateCurrentOrganizationForm,
} from '../../utils/currentOrganizationValidation';

export function EditSchoolScreen({
  navigation,
  route,
}: RoleScreenProps<'EditSchool'>) {
  const schoolId = route.params.schoolId;
  const membership = useAuthStore(state => state.activeMembership);
  const school = useCurrentOrganizationStore(state => state.currentSchool);
  const loadSchool = useCurrentOrganizationStore(
    state => state.loadCurrentSchool,
  );
  const cancelSchool = useCurrentOrganizationStore(
    state => state.cancelSchoolRequest,
  );
  const updateSchool = useCurrentOrganizationStore(
    state => state.updateCurrentSchool,
  );
  const isLoading = useCurrentOrganizationStore(state => state.isLoadingSchool);
  const isSaving = useCurrentOrganizationStore(state => state.isUpdatingSchool);
  const error = useCurrentOrganizationStore(state => state.mutationError);
  const [form, setForm] = useState<LiveOrganizationFormValue>();
  const [errors, setErrors] = useState<CurrentOrganizationFormErrors>({});
  const authorized =
    membership?.role === 'SCHOOL_ADMIN' && membership.schoolId === schoolId;

  useEffect(() => {
    if (!authorized) return;
    if (school?.id !== schoolId) {
      loadSchool(schoolId).catch(() => undefined);
    }
    return cancelSchool;
  }, [authorized, cancelSchool, loadSchool, school?.id, schoolId]);

  useEffect(() => {
    if (school?.id === schoolId) {
      setForm({
        address: school.address,
        email: school.email,
        name: school.name,
        phone: school.phone,
        upiId: school.upiId,
      });
    }
  }, [school, schoolId]);

  if (!authorized) {
    return <ErrorState message="Only School Admin can edit the current school." />;
  }
  if (!form || isLoading || !school) {
    return <LoadingView message="Preparing school form…" />;
  }

  const submit = async (): Promise<void> => {
    const validation = validateCurrentOrganizationForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0 || isSaving) return;
    const input: UpdateCurrentSchoolInput = {};
    if (form.name.trim() !== school.name) input.name = form.name;
    if (form.address.trim() !== school.address) input.address = form.address;
    if (form.phone.trim() !== school.phone) input.phone = form.phone;
    if (form.email.trim() !== school.email) input.email = form.email;
    if ((form.upiId ?? '').trim() !== school.upiId) input.upiId = form.upiId;
    if (Object.keys(input).length === 0) {
      navigation.goBack();
      return;
    }
    const updated = await updateSchool(schoolId, input);
    if (updated) navigation.goBack();
  };

  const fieldErrors = { ...errors, ...error?.fieldErrors };
  return (
    <AppScreen contentContainerStyle={styles.screenContent} scrollable testID="edit-school-screen">
      <View style={styles.maxWidth}>
        <AppHeader includeSafeArea={false} onBackPress={navigation.goBack} title="Edit School" />
        <AppCard style={styles.card} variant="elevated">
          <LiveOrganizationFormFields
            entityLabel="School"
            errors={fieldErrors}
            includeUpi
            onChange={setForm}
            value={form}
          />
          {error && !error.fieldErrors ? <InlineError message={error.message} style={styles.error} /> : null}
          <AppButton fullWidth loading={isSaving} onPress={submit} style={styles.submit} title="Save Changes" />
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 20 },
  error: { marginTop: 16 },
  maxWidth: { alignSelf: 'center', maxWidth: 680, width: '100%' },
  screenContent: { paddingBottom: 32 },
  submit: { marginTop: 20 },
});
