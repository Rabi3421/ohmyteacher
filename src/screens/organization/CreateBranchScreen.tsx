import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BranchFormFields } from '../../components/organization/BranchFormFields';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { InlineError } from '../../components/feedback/InlineError';
import { ROUTES } from '../../constants/routes';
import type { CreateBranchInput } from '../../models/organization';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useOrganizationStore } from '../../store';
import {
  type FormErrors,
  validateBranchInput,
} from '../../utils/organizationValidation';

const EMPTY_BRANCH: CreateBranchInput = {
  address: {
    city: '',
    country: 'India',
    line1: '',
    pinCode: '',
    state: '',
  },
  code: '',
  mobile: '',
  name: '',
};

export function CreateBranchScreen({
  navigation,
  route,
}: RoleScreenProps<'CreateBranch'>) {
  const schoolId = route.params.schoolId;
  const school = useOrganizationStore(state => state.currentSchool);
  const loadSchool = useOrganizationStore(state => state.loadSchool);
  const createBranch = useOrganizationStore(state => state.createBranch);
  const isSaving = useOrganizationStore(state => state.isSavingBranch);
  const error = useOrganizationStore(state => state.error);
  const [form, setForm] = useState<CreateBranchInput>(EMPTY_BRANCH);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (school?.id !== schoolId) loadSchool(schoolId).catch(() => undefined);
  }, [loadSchool, school?.id, schoolId]);

  const useSchoolDetails = (): void => {
    if (!school) return;
    setForm(current => ({
      ...current,
      address: school.address,
      email: school.email,
      mobile: school.mobile,
    }));
  };

  const submit = async (): Promise<void> => {
    const validation = validateBranchInput(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0 || isSaving) return;
    const created = await createBranch(schoolId, form);
    if (created) {
      navigation.replace(ROUTES.BRANCH_DETAILS, {
        branchId: created.id,
        schoolId,
      });
    }
  };

  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      scrollable
      testID="create-branch-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          title="Create Branch"
        />
        <AppButton
          fullWidth
          onPress={useSchoolDetails}
          style={styles.copyButton}
          title="Use School Address and Contact"
          variant="outline"
        />
        <AppCard style={styles.card} variant="elevated">
          <BranchFormFields
            errors={{
              ...errors,
              code: errors.code ?? error?.fieldErrors?.code,
            }}
            onChange={setForm}
            value={form}
          />
          {error && !error.fieldErrors ? (
            <InlineError message={error.message} style={styles.error} />
          ) : null}
          <AppButton
            fullWidth
            loading={isSaving}
            onPress={submit}
            style={styles.submit}
            title="Create Branch"
          />
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
  },
  copyButton: {
    marginTop: 18,
  },
  error: {
    marginTop: 16,
  },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 680,
    width: '100%',
  },
  screenContent: {
    paddingBottom: 32,
  },
  submit: {
    marginTop: 20,
  },
});
