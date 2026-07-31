import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { BranchFormFields } from '../../components/organization/BranchFormFields';
import type { CreateBranchInput } from '../../models/organization';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useOrganizationStore } from '../../store';
import {
  type FormErrors,
  validateBranchInput,
} from '../../utils/organizationValidation';

export function EditBranchScreen({
  navigation,
  route,
}: RoleScreenProps<'EditBranch'>) {
  const { branchId, schoolId } = route.params;
  const branch = useOrganizationStore(state => state.currentBranch);
  const loadBranch = useOrganizationStore(state => state.loadBranch);
  const updateBranch = useOrganizationStore(state => state.updateBranch);
  const isLoading = useOrganizationStore(state => state.isLoadingBranches);
  const isSaving = useOrganizationStore(state => state.isSavingBranch);
  const error = useOrganizationStore(state => state.error);
  const [form, setForm] = useState<CreateBranchInput>();
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (branch?.id !== branchId) {
      loadBranch(schoolId, branchId).catch(() => undefined);
    }
  }, [branch?.id, branchId, loadBranch, schoolId]);

  useEffect(() => {
    if (branch?.id === branchId) {
      setForm({
        address: branch.address,
        code: branch.code,
        email: branch.email,
        mobile: branch.mobile,
        name: branch.name,
      });
    }
  }, [branch, branchId]);

  if (!form || (isLoading && branch?.id !== branchId)) {
    return <LoadingView message="Preparing branch form…" />;
  }

  const submit = async (): Promise<void> => {
    const validation = validateBranchInput(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0 || isSaving) return;
    const updated = await updateBranch(schoolId, branchId, {
      address: form.address,
      email: form.email,
      mobile: form.mobile,
      name: form.name,
    });
    if (updated) navigation.goBack();
  };

  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      scrollable
      testID="edit-branch-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          title="Edit Branch"
        />
        <AppCard style={styles.card} variant="elevated">
          <BranchFormFields
            codeImmutable
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
