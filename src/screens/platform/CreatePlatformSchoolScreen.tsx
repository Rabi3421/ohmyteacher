import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { InlineError } from '../../components/feedback/InlineError';
import { ErrorState } from '../../components/feedback/ErrorState';
import { ROUTES } from '../../constants/routes';
import type { CreatePlatformSchoolInput } from '../../models/platform';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore, usePlatformStore } from '../../store';
import {
  isIndianMobile,
  normalizeIndianMobile,
} from '../../utils/validation';

type FormErrors = Partial<Record<keyof CreatePlatformSchoolInput, string>>;

export function CreatePlatformSchoolScreen({
  navigation,
}: RoleScreenProps<'CreateSchool'>) {
  const createSchool = usePlatformStore(state => state.createSchool);
  const isSuperAdmin = useAuthStore(
    state => state.activeMembership?.role === 'SUPER_ADMIN',
  );
  const isCreating = usePlatformStore(state => state.isCreatingSchool);
  const apiError = usePlatformStore(state => state.mutationError);
  const clearFeedback = usePlatformStore(state => state.clearFeedback);
  const [form, setForm] = useState<CreatePlatformSchoolInput>({
    adminMobile: '',
    adminName: '',
    schoolName: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const update = (
    field: keyof CreatePlatformSchoolInput,
    value: string,
  ): void => {
    setForm(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
    clearFeedback();
  };

  const submit = async (): Promise<void> => {
    const nextErrors: FormErrors = {};
    if (!form.schoolName.trim()) {
      nextErrors.schoolName = 'School name is required.';
    }
    if (!form.adminName.trim()) {
      nextErrors.adminName = 'Admin name is required.';
    }
    if (!isIndianMobile(form.adminMobile)) {
      nextErrors.adminMobile = 'Enter a valid 10-digit Indian mobile number.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || isCreating) return;

    const result = await createSchool(form);
    if (result) {
      navigation.replace(ROUTES.SCHOOL_DETAILS, {
        schoolId: result.school.id,
      });
    }
  };

  const backendFields = apiError?.fieldErrors;
  if (!isSuperAdmin) {
    return (
      <AppScreen testID="platform-access-denied-screen">
        <ErrorState
          message="Only a verified Super Admin can onboard schools."
          title="Platform access denied"
        />
      </AppScreen>
    );
  }
  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      scrollable
      testID="create-platform-school-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          title="Onboard School"
        />
        <AppCard style={styles.card} variant="elevated">
          <View style={styles.fields}>
            <AppText variant="heading3">School and initial Admin</AppText>
            <AppInput
              error={errors.schoolName ?? backendFields?.schoolName}
              label="School Name"
              onChangeText={value => update('schoolName', value)}
              required
              value={form.schoolName}
            />
            <AppInput
              error={errors.adminName ?? backendFields?.adminName}
              label="Admin Name"
              onChangeText={value => update('adminName', value)}
              required
              value={form.adminName}
            />
            <AppInput
              error={errors.adminMobile ?? backendFields?.adminMobile}
              keyboardType="phone-pad"
              label="Admin Mobile"
              maxLength={10}
              onChangeText={value =>
                update('adminMobile', normalizeIndianMobile(value))
              }
              required
              textContentType="telephoneNumber"
              value={form.adminMobile}
            />
            <AppText variant="caption">
              Django atomically creates the School, Main Branch, default
              Session, and Admin account. School contact details can be added
              from Edit School after creation.
            </AppText>
            {apiError && !apiError.fieldErrors ? (
              <InlineError message={apiError.message} />
            ) : null}
            <AppButton
              disabled={isCreating}
              fullWidth
              loading={isCreating}
              onPress={submit}
              title="Create School and Admin"
            />
          </View>
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 20 },
  fields: { gap: 16 },
  maxWidth: { alignSelf: 'center', maxWidth: 620, width: '100%' },
  screenContent: { paddingBottom: 32 },
});
