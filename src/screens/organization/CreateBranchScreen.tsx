import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import {
  LiveOrganizationFormFields,
  type LiveOrganizationFormValue,
} from '../../components/organization/LiveOrganizationFormFields';
import { ROUTES } from '../../constants/routes';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore, useCurrentOrganizationStore } from '../../store';
import {
  type CurrentOrganizationFormErrors,
  validateCurrentOrganizationForm,
} from '../../utils/currentOrganizationValidation';

const EMPTY_BRANCH: LiveOrganizationFormValue = {
  address: '',
  email: '',
  name: '',
  phone: '',
};

export function CreateBranchScreen({
  navigation,
  route,
}: RoleScreenProps<'CreateBranch'>) {
  const schoolId = route.params.schoolId;
  const membership = useAuthStore(state => state.activeMembership);
  const school = useCurrentOrganizationStore(state => state.currentSchool);
  const loadSchool = useCurrentOrganizationStore(state => state.loadCurrentSchool);
  const cancelSchool = useCurrentOrganizationStore(state => state.cancelSchoolRequest);
  const createBranch = useCurrentOrganizationStore(state => state.createBranch);
  const isSaving = useCurrentOrganizationStore(state => state.isSavingBranch);
  const error = useCurrentOrganizationStore(state => state.mutationError);
  const [form, setForm] = useState<LiveOrganizationFormValue>(EMPTY_BRANCH);
  const [errors, setErrors] = useState<CurrentOrganizationFormErrors>({});
  const authorized = membership?.role === 'SCHOOL_ADMIN' && membership.schoolId === schoolId;

  useEffect(() => {
    if (!authorized || school?.id === schoolId) return;
    loadSchool(schoolId).catch(() => undefined);
    return cancelSchool;
  }, [authorized, cancelSchool, loadSchool, school?.id, schoolId]);

  if (!authorized) {
    return <ErrorState message="Only School Admin can create branches in the current school." />;
  }

  const submit = async (): Promise<void> => {
    const validation = validateCurrentOrganizationForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0 || isSaving) return;
    const created = await createBranch(schoolId, form);
    if (created) {
      navigation.replace(ROUTES.BRANCH_DETAILS, { branchId: created.id, schoolId });
    }
  };

  return (
    <AppScreen contentContainerStyle={styles.screenContent} scrollable testID="create-branch-screen">
      <View style={styles.maxWidth}>
        <AppHeader includeSafeArea={false} onBackPress={navigation.goBack} title="Create Branch" />
        {school ? (
          <AppButton
            fullWidth
            onPress={() => setForm(current => ({ ...current, address: school.address, email: school.email, phone: school.phone }))}
            style={styles.copyButton}
            title="Use School Contact"
            variant="outline"
          />
        ) : null}
        <AppCard style={styles.card} variant="elevated">
          <AppText style={styles.note} variant="caption">
            Django assigns the school and generates the branch code. Neither can be overridden here.
          </AppText>
          <LiveOrganizationFormFields
            entityLabel="Branch"
            errors={{ ...errors, ...error?.fieldErrors }}
            onChange={setForm}
            value={form}
          />
          {error && !error.fieldErrors ? <InlineError message={error.message} style={styles.error} /> : null}
          <AppButton fullWidth loading={isSaving} onPress={submit} style={styles.submit} title="Create Branch" />
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 14 },
  copyButton: { marginTop: 18 },
  error: { marginTop: 16 },
  maxWidth: { alignSelf: 'center', maxWidth: 680, width: '100%' },
  note: { marginBottom: 16 },
  screenContent: { paddingBottom: 32 },
  submit: { marginTop: 20 },
});
