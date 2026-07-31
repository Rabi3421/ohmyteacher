import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import type { UpdateSchoolSettingsInput } from '../../models/organization';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore, useOrganizationStore } from '../../store';
import { canEditSchoolSettings } from '../../utils/organizationPermissions';
import { isEmail, isIndianMobile, isRequired } from '../../utils/validation';

type SettingsErrors = Partial<
  Record<keyof UpdateSchoolSettingsInput, string>
>;

export function SchoolSettingsScreen({
  navigation,
  route,
}: RoleScreenProps<'SchoolSettings'>) {
  const schoolId = route.params.schoolId;
  const membership = useAuthStore(state => state.activeMembership);
  const settings = useOrganizationStore(state => state.schoolSettings);
  const isLoading = useOrganizationStore(state => state.isLoadingSettings);
  const isSaving = useOrganizationStore(state => state.isSavingSettings);
  const error = useOrganizationStore(state => state.error);
  const successMessage = useOrganizationStore(state => state.successMessage);
  const loadSettings = useOrganizationStore(state => state.loadSchoolSettings);
  const saveSettings = useOrganizationStore(
    state => state.updateSchoolSettings,
  );
  const [form, setForm] = useState<UpdateSchoolSettingsInput>();
  const [errors, setErrors] = useState<SettingsErrors>({});

  useEffect(() => {
    loadSettings(schoolId).catch(() => undefined);
  }, [loadSettings, schoolId]);

  useEffect(() => {
    if (settings?.schoolId === schoolId) {
      setForm({
        academicYearStartMonth: settings.academicYearStartMonth,
        country: settings.country,
        currency: settings.currency,
        dateFormat: settings.dateFormat,
        displayName: settings.displayName,
        logoUrl: settings.logoUrl,
        primaryEmail: settings.primaryEmail,
        primaryMobile: settings.primaryMobile,
        timezone: settings.timezone,
      });
    }
  }, [schoolId, settings]);

  if (isLoading && !form) {
    return <LoadingView message="Loading school settings…" />;
  }
  if (!form || !membership) {
    return (
      <ErrorState
        message={error?.message ?? 'School settings are unavailable.'}
        onRetry={() => loadSettings(schoolId)}
      />
    );
  }

  const editable = canEditSchoolSettings(
    membership.role,
    membership,
    schoolId,
  );
  const update = <Key extends keyof UpdateSchoolSettingsInput>(
    key: Key,
    value: UpdateSchoolSettingsInput[Key],
  ): void => setForm(current => (current ? { ...current, [key]: value } : current));

  const submit = async (): Promise<void> => {
    const validation: SettingsErrors = {};
    if (!isRequired(form.displayName)) {
      validation.displayName = 'Display name is required.';
    }
    if (form.primaryEmail && !isEmail(form.primaryEmail)) {
      validation.primaryEmail = 'Enter a valid email.';
    }
    if (!isIndianMobile(form.primaryMobile)) {
      validation.primaryMobile = 'Enter a valid 10-digit mobile number.';
    }
    if (
      !Number.isInteger(form.academicYearStartMonth) ||
      form.academicYearStartMonth < 1 ||
      form.academicYearStartMonth > 12
    ) {
      validation.academicYearStartMonth = 'Enter a month from 1 to 12.';
    }
    setErrors(validation);
    if (Object.keys(validation).length > 0 || isSaving) return;
    await saveSettings(schoolId, form);
  };

  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      scrollable
      testID="school-settings-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          title="School Settings"
        />
        {!editable ? (
          <AppCard style={styles.notice} variant="outlined">
            <AppText>This workspace has read-only settings access.</AppText>
          </AppCard>
        ) : null}
        {successMessage ? (
          <AppCard style={styles.notice} variant="outlined">
            <AppText>{successMessage}</AppText>
          </AppCard>
        ) : null}
        <AppCard style={styles.card} variant="elevated">
          <View style={styles.fields}>
            <AppInput
              disabled={!editable}
              error={errors.displayName}
              label="Display Name"
              onChangeText={value => update('displayName', value)}
              required
              value={form.displayName}
            />
            <AppInput
              autoCapitalize="none"
              disabled={!editable}
              label="Logo URL"
              onChangeText={value => update('logoUrl', value)}
              value={form.logoUrl ?? ''}
            />
            <AppInput
              autoCapitalize="none"
              disabled={!editable}
              error={errors.primaryEmail}
              keyboardType="email-address"
              label="Primary Email"
              onChangeText={value => update('primaryEmail', value)}
              value={form.primaryEmail ?? ''}
            />
            <AppInput
              disabled={!editable}
              error={errors.primaryMobile}
              keyboardType="phone-pad"
              label="Primary Mobile"
              maxLength={10}
              onChangeText={value =>
                update('primaryMobile', value.replace(/\D/g, '').slice(0, 10))
              }
              required
              value={form.primaryMobile}
            />
            <AppInput
              disabled={!editable}
              label="Timezone"
              onChangeText={value => update('timezone', value)}
              required
              value={form.timezone}
            />
            <AppInput
              autoCapitalize="characters"
              disabled={!editable}
              label="Currency"
              maxLength={3}
              onChangeText={value => update('currency', value.toUpperCase())}
              required
              value={form.currency}
            />
            <AppInput
              disabled={!editable}
              label="Country"
              onChangeText={value => update('country', value)}
              required
              value={form.country}
            />
            <AppInput
              disabled={!editable}
              error={errors.academicYearStartMonth}
              helperText="1 = January, 4 = April"
              keyboardType="number-pad"
              label="Academic Year Start Month"
              maxLength={2}
              onChangeText={value =>
                update('academicYearStartMonth', Number(value))
              }
              required
              value={String(form.academicYearStartMonth)}
            />
            <AppInput
              disabled={!editable}
              helperText="For example: DD/MM/YYYY"
              label="Date Format"
              onChangeText={value => update('dateFormat', value)}
              required
              value={form.dateFormat}
            />
          </View>
          {error ? (
            <InlineError message={error.message} style={styles.error} />
          ) : null}
          {editable ? (
            <AppButton
              fullWidth
              loading={isSaving}
              onPress={submit}
              style={styles.submit}
              title="Save Settings"
            />
          ) : null}
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 18 },
  error: { marginTop: 16 },
  fields: { gap: 14 },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 680,
    width: '100%',
  },
  notice: { marginTop: 16 },
  screenContent: { paddingBottom: 32 },
  submit: { marginTop: 20 },
});
