import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  SchoolFormFields,
  type SchoolFormValue,
} from '../../components/organization/SchoolFormFields';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import type { CreateSchoolInput } from '../../models/organization';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useOrganizationStore } from '../../store';
import {
  type FormErrors,
  validateSchoolInput,
} from '../../utils/organizationValidation';

export function EditSchoolScreen({
  navigation,
  route,
}: RoleScreenProps<'EditSchool'>) {
  const schoolId = route.params.schoolId;
  const school = useOrganizationStore(state => state.currentSchool);
  const loadSchool = useOrganizationStore(state => state.loadSchool);
  const updateSchool = useOrganizationStore(state => state.updateSchool);
  const isLoading = useOrganizationStore(state => state.isLoadingSchool);
  const isSaving = useOrganizationStore(state => state.isUpdatingSchool);
  const error = useOrganizationStore(state => state.error);
  const [form, setForm] = useState<SchoolFormValue>();
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (school?.id !== schoolId) {
      loadSchool(schoolId).catch(() => undefined);
    }
  }, [loadSchool, school?.id, schoolId]);

  useEffect(() => {
    if (school?.id === schoolId) {
      setForm({
        address: school.address,
        alternateMobile: school.alternateMobile,
        code: school.code,
        email: school.email,
        logoUrl: school.logoUrl,
        mobile: school.mobile,
        name: school.name,
        website: school.website,
      });
    }
  }, [school, schoolId]);

  if (!form || isLoading) {
    return <LoadingView message="Preparing school form…" />;
  }

  const submit = async (): Promise<void> => {
    const validationInput: CreateSchoolInput = {
      ...form,
      admin: { mobile: '9999999999', name: 'Existing Admin' },
    };
    const validation = validateSchoolInput(validationInput, false);
    setErrors(validation);
    if (Object.keys(validation).length > 0 || isSaving) return;
    const input = {
      address: form.address,
      alternateMobile: form.alternateMobile,
      email: form.email,
      logoUrl: form.logoUrl,
      mobile: form.mobile,
      name: form.name,
      website: form.website,
    };
    const updated = await updateSchool(schoolId, input);
    if (updated) navigation.goBack();
  };

  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      scrollable
      testID="edit-school-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          title="Edit School"
        />
        <AppCard style={styles.card} variant="elevated">
          <SchoolFormFields
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
  card: {
    marginTop: 20,
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
