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
import type { UpdateOrganizationBranchInput } from '../../models/currentOrganization';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore, useCurrentOrganizationStore } from '../../store';
import {
  type CurrentOrganizationFormErrors,
  validateCurrentOrganizationForm,
} from '../../utils/currentOrganizationValidation';

export function EditBranchScreen({ navigation, route }: RoleScreenProps<'EditBranch'>) {
  const { branchId, schoolId } = route.params;
  const membership = useAuthStore(state => state.activeMembership);
  const branch = useCurrentOrganizationStore(state => state.currentBranch);
  const loadBranch = useCurrentOrganizationStore(state => state.loadBranch);
  const cancelBranch = useCurrentOrganizationStore(state => state.cancelBranchRequest);
  const updateBranch = useCurrentOrganizationStore(state => state.updateBranch);
  const isLoading = useCurrentOrganizationStore(state => state.isLoadingBranches);
  const isSaving = useCurrentOrganizationStore(state => state.isSavingBranch);
  const error = useCurrentOrganizationStore(state => state.mutationError);
  const [form, setForm] = useState<LiveOrganizationFormValue>();
  const [errors, setErrors] = useState<CurrentOrganizationFormErrors>({});
  const authorized = membership?.role === 'SCHOOL_ADMIN' && membership.schoolId === schoolId;

  useEffect(() => {
    if (!authorized) return;
    if (branch?.id !== branchId) loadBranch(schoolId, branchId).catch(() => undefined);
    return cancelBranch;
  }, [authorized, branch?.id, branchId, cancelBranch, loadBranch, schoolId]);

  useEffect(() => {
    if (branch?.id === branchId) {
      setForm({ address: branch.address, email: branch.email, name: branch.name, phone: branch.phone });
    }
  }, [branch, branchId]);

  if (!authorized) return <ErrorState message="Only School Admin can edit branches." />;
  if (!form || !branch || isLoading) return <LoadingView message="Preparing branch form…" />;

  const submit = async (): Promise<void> => {
    const validation = validateCurrentOrganizationForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0 || isSaving) return;
    const input: UpdateOrganizationBranchInput = {};
    if (form.name.trim() !== branch.name) input.name = form.name;
    if (form.address.trim() !== branch.address) input.address = form.address;
    if (form.phone.trim() !== branch.phone) input.phone = form.phone;
    if (form.email.trim() !== branch.email) input.email = form.email;
    if (Object.keys(input).length === 0) {
      navigation.goBack();
      return;
    }
    if (await updateBranch(schoolId, branchId, input)) navigation.goBack();
  };

  return (
    <AppScreen contentContainerStyle={styles.screenContent} scrollable testID="edit-branch-screen">
      <View style={styles.maxWidth}>
        <AppHeader includeSafeArea={false} onBackPress={navigation.goBack} title="Edit Branch" />
        <AppCard style={styles.card} variant="elevated">
          <LiveOrganizationFormFields entityLabel="Branch" errors={{ ...errors, ...error?.fieldErrors }} onChange={setForm} value={form} />
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
