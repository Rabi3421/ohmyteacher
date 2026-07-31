import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { StaffIdentityFormFields } from '../../components/userManagement/StaffIdentityFormFields';
import type { UpdateUserIdentityInput } from '../../models/userManagement';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useUserManagementStore } from '../../store';
import { isEmail, isIndianMobile, isRequired } from '../../utils/validation';

export function EditStaffUserScreen({
  navigation,
  route,
}: RoleScreenProps<'EditStaffUser'>) {
  const { membershipId, schoolId } = route.params;
  const staff = useUserManagementStore(state => state.currentStaff);
  const loadStaff = useUserManagementStore(state => state.loadStaffUser);
  const updateIdentity = useUserManagementStore(state => state.updateIdentity);
  const isLoading = useUserManagementStore(
    state => state.isLoadingStaffDetails,
  );
  const isSaving = useUserManagementStore(state => state.isUpdatingIdentity);
  const error = useUserManagementStore(state => state.error);
  const [form, setForm] = useState<UpdateUserIdentityInput>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmMobile, setConfirmMobile] = useState(false);

  useEffect(() => {
    if (staff?.membership.id !== membershipId) {
      loadStaff(schoolId, membershipId).catch(() => undefined);
    }
  }, [loadStaff, membershipId, schoolId, staff?.membership.id]);

  useEffect(() => {
    if (staff?.membership.id === membershipId) {
      setForm({
        email: staff.identity.email,
        mobile: staff.identity.mobile,
        name: staff.identity.name,
      });
    }
  }, [membershipId, staff]);

  if (isLoading && !form) {
    return <LoadingView message="Preparing staff form…" />;
  }
  if (!staff || !form) {
    return (
      <ErrorState
        message={error?.message ?? 'Staff information is unavailable.'}
        onRetry={() => loadStaff(schoolId, membershipId)}
      />
    );
  }

  const validate = (): boolean => {
    const validation: Record<string, string> = {};
    if (!isRequired(form.name)) validation.name = 'Full name is required.';
    if (!isIndianMobile(form.mobile)) {
      validation.mobile = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (form.email && !isEmail(form.email)) {
      validation.email = 'Enter a valid email.';
    }
    setErrors(validation);
    return Object.keys(validation).length === 0;
  };

  const save = async (): Promise<void> => {
    if (!validate() || isSaving) return;
    if (form.mobile !== staff.identity.mobile && !confirmMobile) {
      setConfirmMobile(true);
      return;
    }
    const updated = await updateIdentity(
      schoolId,
      membershipId,
      form,
    );
    if (updated) navigation.goBack();
  };

  return (
    <>
      <AppScreen
        contentContainerStyle={styles.screenContent}
        scrollable
        testID="edit-staff-user-screen"
      >
        <View style={styles.maxWidth}>
          <AppHeader
            includeSafeArea={false}
            onBackPress={navigation.goBack}
            title="Edit Staff User"
          />
          <AppCard style={styles.card} variant="elevated">
            <StaffIdentityFormFields
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
              onPress={save}
              style={styles.submit}
              title="Save Identity"
            />
          </AppCard>
        </View>
      </AppScreen>
      <ConfirmationDialog
        confirmLabel="Change Mobile"
        loading={isSaving}
        message="This mock identity change does not perform OTP verification and will revoke active sessions. A backend verification endpoint is required before production use."
        onCancel={() => setConfirmMobile(false)}
        onConfirm={async () => {
          const updated = await updateIdentity(
            schoolId,
            membershipId,
            form,
          );
          if (updated) navigation.goBack();
        }}
        title="Confirm sensitive mobile change"
        visible={confirmMobile}
      />
    </>
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
