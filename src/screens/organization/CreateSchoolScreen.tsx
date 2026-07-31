import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  SchoolFormFields,
  type SchoolFormValue,
} from '../../components/organization/SchoolFormFields';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { InlineError } from '../../components/feedback/InlineError';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { CreateSchoolInput } from '../../models/organization';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useOrganizationStore } from '../../store';
import { getAcademicYearForDate } from '../../utils/academicSession';
import {
  type FormErrors,
  validateSchoolInput,
} from '../../utils/organizationValidation';
import { normalizeIndianMobile } from '../../utils/validation';

const EMPTY_SCHOOL: SchoolFormValue = {
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

export function CreateSchoolScreen({
  navigation,
}: RoleScreenProps<'CreateSchool'>) {
  const theme = useAppTheme();
  const createSchool = useOrganizationStore(state => state.createSchool);
  const isCreating = useOrganizationStore(state => state.isCreatingSchool);
  const apiError = useOrganizationStore(state => state.error);
  const [school, setSchool] = useState<SchoolFormValue>(EMPTY_SCHOOL);
  const [admin, setAdmin] = useState<CreateSchoolInput['admin']>({
    mobile: '',
    name: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState<1 | 2>(1);
  const [showDiscard, setShowDiscard] = useState(false);
  const academicYear = getAcademicYearForDate(new Date());
  const input: CreateSchoolInput = { ...school, admin };
  const isDirty = Boolean(school.name || school.code || school.mobile);

  const next = (): void => {
    const validation = validateSchoolInput(input, false);
    setErrors(validation);
    if (Object.keys(validation).length === 0) {
      setStep(2);
    }
  };

  const submit = async (): Promise<void> => {
    const validation = validateSchoolInput(input);
    setErrors(validation);
    if (Object.keys(validation).length > 0 || isCreating) {
      return;
    }
    const result = await createSchool(input);
    if (result) {
      navigation.replace(ROUTES.ORGANIZATION_SETUP_SUCCESS, {
        schoolId: result.school.id,
      });
    }
  };

  const requestBack = (): void => {
    if (step === 2) {
      setStep(1);
    } else if (isDirty) {
      setShowDiscard(true);
    } else {
      navigation.goBack();
    }
  };

  return (
    <>
      <AppScreen
        contentContainerStyle={styles.screenContent}
        scrollable
        testID="create-school-screen"
      >
        <View style={styles.maxWidth}>
          <AppHeader
            includeSafeArea={false}
            onBackPress={requestBack}
            subtitle={`Step ${step} of 2`}
            title="Create School"
          />
          {step === 1 ? (
            <AppCard style={styles.card} variant="elevated">
              <SchoolFormFields
                errors={errors}
                onChange={setSchool}
                value={school}
              />
              <AppButton
                fullWidth
                onPress={next}
                style={styles.submit}
                title="Continue"
              />
            </AppCard>
          ) : (
            <View style={styles.stack}>
              <AppCard variant="elevated">
                <View style={styles.fields}>
                  <AppText variant="heading3">
                    Initial School Admin
                  </AppText>
                  <AppInput
                    error={
                      errors.adminName ?? apiError?.fieldErrors?.adminName
                    }
                    label="Admin Name"
                    onChangeText={name => setAdmin(current => ({ ...current, name }))}
                    required
                    value={admin.name}
                  />
                  <AppInput
                    error={
                      errors.adminMobile ??
                      apiError?.fieldErrors?.adminMobile
                    }
                    keyboardType="phone-pad"
                    label="Admin Mobile"
                    maxLength={10}
                    onChangeText={mobile =>
                      setAdmin(current => ({
                        ...current,
                        mobile: normalizeIndianMobile(mobile),
                      }))
                    }
                    required
                    value={admin.mobile}
                  />
                  <AppInput
                    autoCapitalize="none"
                    error={errors.adminEmail}
                    keyboardType="email-address"
                    label="Admin Email"
                    onChangeText={email =>
                      setAdmin(current => ({ ...current, email }))
                    }
                    value={admin.email ?? ''}
                  />
                </View>
              </AppCard>
              <AppCard
                header={<AppText variant="title">Default setup preview</AppText>}
                variant="outlined"
              >
                <SetupRow label="School" value={school.name || 'New school'} />
                <SetupRow label="Branch" value="Main Branch (MAIN)" />
                <SetupRow
                  label="Academic Session"
                  value={academicYear.name}
                />
                <SetupRow
                  label="Membership"
                  value="Initial School Admin"
                />
                <AppText
                  color={theme.colors.textSecondary}
                  style={styles.previewNote}
                  variant="caption"
                >
                  Country India · Currency INR · Timezone Asia/Kolkata
                </AppText>
              </AppCard>
              {apiError && !apiError.fieldErrors ? (
                <InlineError message={apiError.message} />
              ) : null}
              <AppButton
                fullWidth
                loading={isCreating}
                onPress={submit}
                title="Create School and Setup"
              />
            </View>
          )}
        </View>
      </AppScreen>
      <ConfirmationDialog
        confirmLabel="Discard"
        destructive
        message="Your unsaved school information will be lost."
        onCancel={() => setShowDiscard(false)}
        onConfirm={() => navigation.goBack()}
        title="Discard changes?"
        visible={showDiscard}
      />
    </>
  );
}

function SetupRow({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.setupRow}>
      <AppText color={theme.colors.textSecondary}>{label}</AppText>
      <AppText align="right" style={styles.setupValue} variant="bodyMedium">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 20,
  },
  fields: {
    gap: 14,
  },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 680,
    width: '100%',
  },
  previewNote: {
    marginTop: 12,
  },
  screenContent: {
    paddingBottom: 32,
  },
  setupRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 38,
  },
  setupValue: {
    flex: 1,
    marginLeft: 16,
  },
  stack: {
    gap: 16,
    marginTop: 20,
  },
  submit: {
    marginTop: 20,
  },
});
