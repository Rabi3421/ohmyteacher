import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import type {
  PlatformSchool,
  UpdatePlatformSchoolInput,
} from '../../models/platform';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore, usePlatformStore } from '../../store';
import { isEmail, isIndianMobile } from '../../utils/validation';

type Form = Required<UpdatePlatformSchoolInput>;
type FormErrors = Partial<Record<keyof Form, string>>;

function formFromSchool(school: PlatformSchool): Form {
  return {
    address: school.address,
    email: school.email,
    name: school.name,
    phone: school.phone,
    upiId: school.upiId,
  };
}

export function EditPlatformSchoolScreen({
  navigation,
  route,
}: RoleScreenProps<'EditSchool'>) {
  const schoolId = route.params.schoolId;
  const isSuperAdmin = useAuthStore(
    state => state.activeMembership?.role === 'SUPER_ADMIN',
  );
  const school = usePlatformStore(state => state.currentSchool);
  const loadSchool = usePlatformStore(state => state.loadSchool);
  const cancelSchoolDetailRequest = usePlatformStore(
    state => state.cancelSchoolDetailRequest,
  );
  const updateSchool = usePlatformStore(state => state.updateSchool);
  const isLoading = usePlatformStore(state => state.isLoadingSchool);
  const isSaving = usePlatformStore(state => state.isMutatingSchool);
  const detailError = usePlatformStore(state => state.detailError);
  const mutationError = usePlatformStore(state => state.mutationError);
  const clearFeedback = usePlatformStore(state => state.clearFeedback);
  const [form, setForm] = useState<Form>();
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (isSuperAdmin && school?.id !== schoolId) {
      loadSchool(schoolId).catch(() => undefined);
    }
    return cancelSchoolDetailRequest;
  }, [
    cancelSchoolDetailRequest,
    isSuperAdmin,
    loadSchool,
    school?.id,
    schoolId,
  ]);

  useEffect(() => {
    if (school?.id === schoolId) setForm(formFromSchool(school));
  }, [school, schoolId]);

  if (!isSuperAdmin) {
    return (
      <AppScreen testID="platform-access-denied-screen">
        <ErrorState
          message="Only a verified Super Admin can edit platform schools."
          title="Platform access denied"
        />
      </AppScreen>
    );
  }

  if (isLoading && !form) {
    return <LoadingView message="Preparing live school form…" />;
  }
  if (!form || !school || school.id !== schoolId) {
    return (
      <ErrorState
        message={detailError?.message ?? 'School information is unavailable.'}
        onRetry={() => loadSchool(schoolId)}
      />
    );
  }

  const update = (field: keyof Form, value: string): void => {
    setForm(current => (current ? { ...current, [field]: value } : current));
    setErrors(current => ({ ...current, [field]: undefined }));
    clearFeedback();
  };

  const submit = async (): Promise<void> => {
    const nextErrors: FormErrors = {};
    if (!form.name.trim()) nextErrors.name = 'School name is required.';
    if (form.phone.trim() && !isIndianMobile(form.phone)) {
      nextErrors.phone = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (form.email.trim() && !isEmail(form.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || isSaving) return;

    const original = formFromSchool(school);
    const changes: UpdatePlatformSchoolInput = {};
    (Object.keys(form) as Array<keyof Form>).forEach(field => {
      if (form[field].trim() !== original[field].trim()) {
        changes[field] = form[field];
      }
    });
    if (Object.keys(changes).length === 0) {
      navigation.goBack();
      return;
    }
    if (await updateSchool(schoolId, changes)) navigation.goBack();
  };

  const backendFields = mutationError?.fieldErrors;
  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      scrollable
      testID="edit-platform-school-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          title="Edit School"
        />
        <AppCard style={styles.card} variant="elevated">
          <View style={styles.fields}>
            <AppInput
              error={errors.name ?? backendFields?.name}
              label="School Name"
              onChangeText={value => update('name', value)}
              required
              value={form.name}
            />
            <AppInput
              error={backendFields?.address}
              label="Address"
              multiline
              onChangeText={value => update('address', value)}
              value={form.address}
            />
            <AppInput
              error={errors.phone ?? backendFields?.phone}
              keyboardType="phone-pad"
              label="Phone"
              maxLength={15}
              onChangeText={value => update('phone', value)}
              value={form.phone}
            />
            <AppInput
              autoCapitalize="none"
              error={errors.email ?? backendFields?.email}
              keyboardType="email-address"
              label="Email"
              onChangeText={value => update('email', value)}
              value={form.email}
            />
            <AppInput
              autoCapitalize="none"
              error={backendFields?.upiId}
              label="UPI ID"
              onChangeText={value => update('upiId', value)}
              value={form.upiId}
            />
            {mutationError && !mutationError.fieldErrors ? (
              <InlineError message={mutationError.message} />
            ) : null}
            <AppButton
              disabled={isSaving}
              fullWidth
              loading={isSaving}
              onPress={submit}
              title="Save Changes"
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
