import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthFormLayout } from '../../components/auth/AuthFormLayout';
import { AppButton } from '../../components/common/AppButton';
import { AppInput } from '../../components/common/AppInput';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useAuthStore } from '../../store';
import {
  isEmail,
  isIndianMobile,
  normalizeIndianMobile,
} from '../../utils/validation';

interface FieldErrors {
  name?: string;
  schoolName?: string;
  phone?: string;
  email?: string;
}

export function NewUserOnboardingScreen() {
  const network = useNetworkStatus();
  const user = useAuthStore(state => state.user);
  const school = useAuthStore(state => state.school);
  const error = useAuthStore(state => state.error);
  const isLoading = useAuthStore(state => state.isLoading);
  const loadOnboarding = useAuthStore(state => state.loadOnboarding);
  const completeOnboarding = useAuthStore(state => state.completeOnboarding);
  const clearError = useAuthStore(state => state.clearError);
  const logout = useAuthStore(state => state.logout);
  const [name, setName] = useState(user?.name ?? '');
  const [schoolName, setSchoolName] = useState(school?.name ?? '');
  const [address, setAddress] = useState(school?.address ?? '');
  const [phone, setPhone] = useState(school?.phone ?? '');
  const [email, setEmail] = useState(school?.email ?? '');
  const [upiId, setUpiId] = useState(school?.upiId ?? '');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const offline = network.isConnected === false;

  useEffect(() => {
    if (!school) {
      loadOnboarding();
    }
  }, [loadOnboarding, school]);

  useEffect(() => {
    if (user?.name) setName(current => current || user.name);
    if (school) {
      setSchoolName(current => current || school.name);
      setAddress(current => current || school.address);
      setPhone(current => current || school.phone);
      setEmail(current => current || school.email);
      setUpiId(current => current || school.upiId);
    }
  }, [school, user]);

  const handleSubmit = async (): Promise<void> => {
    const normalizedPhone = phone ? normalizeIndianMobile(phone) : '';
    const nextErrors: FieldErrors = {};
    if (!name.trim()) nextErrors.name = 'Full name is required.';
    if (!schoolName.trim()) {
      nextErrors.schoolName = 'School name is required.';
    }
    if (normalizedPhone && !isIndianMobile(normalizedPhone)) {
      nextErrors.phone = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (email.trim() && !isEmail(email)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    setFieldErrors(nextErrors);
    clearError();
    if (Object.keys(nextErrors).length > 0 || offline) return;

    await completeOnboarding({
      name: name.trim(),
      school: {
        address: address.trim(),
        email: email.trim().toLowerCase(),
        name: schoolName.trim(),
        phone: normalizedPhone,
        upiId: upiId.trim(),
      },
    });
  };

  const backendFields = error?.fieldErrors;

  return (
    <AuthFormLayout
      footer={
        <AppButton
          disabled={isLoading}
          onPress={logout}
          title="Sign out"
          variant="ghost"
        />
      }
      subtitle="Add the essential details for your new school workspace. You can update them later."
      testID="new-user-onboarding-screen"
      title="Complete your setup"
    >
      {!school && isLoading ? (
        <LoadingView message="Loading your new workspace…" />
      ) : !school && error ? (
        <ErrorState
          message={error.message}
          onRetry={loadOnboarding}
          retryLabel="Try again"
          title="Could not load setup"
        />
      ) : (
        <View style={styles.fields}>
          <AppInput
            autoCapitalize="words"
            error={fieldErrors.name ?? backendFields?.name}
            label="Your Full Name"
            onChangeText={value => {
              setName(value);
              setFieldErrors(current => ({ ...current, name: undefined }));
            }}
            placeholder="Full name"
            required
            textContentType="name"
            value={name}
          />
          <AppInput
            error={fieldErrors.schoolName ?? backendFields?.schoolName}
            label="School Name"
            onChangeText={value => {
              setSchoolName(value);
              setFieldErrors(current => ({ ...current, schoolName: undefined }));
            }}
            placeholder="School name"
            required
            value={schoolName}
          />
          <AppInput
            label="Address"
            multiline
            onChangeText={setAddress}
            placeholder="School address (optional)"
            value={address}
          />
          <AppInput
            error={fieldErrors.phone ?? backendFields?.phone}
            keyboardType="phone-pad"
            label="School Phone"
            maxLength={10}
            onChangeText={value => {
              setPhone(normalizeIndianMobile(value));
              setFieldErrors(current => ({ ...current, phone: undefined }));
            }}
            placeholder="98765 43210 (optional)"
            textContentType="telephoneNumber"
            value={phone}
          />
          <AppInput
            autoCapitalize="none"
            autoCorrect={false}
            error={fieldErrors.email ?? backendFields?.email}
            keyboardType="email-address"
            label="School Email"
            onChangeText={value => {
              setEmail(value);
              setFieldErrors(current => ({ ...current, email: undefined }));
            }}
            placeholder="school@example.com (optional)"
            textContentType="emailAddress"
            value={email}
          />
          <AppInput
            autoCapitalize="none"
            autoCorrect={false}
            error={backendFields?.upiId}
            label="UPI ID"
            onChangeText={setUpiId}
            placeholder="school@bank (optional)"
            value={upiId}
          />
          {offline ? (
            <InlineError message="You appear to be offline. Reconnect to save your setup." />
          ) : error && !error.fieldErrors ? (
            <InlineError message={error.message} />
          ) : null}
          <AppButton
            disabled={offline || isLoading}
            fullWidth
            loading={isLoading}
            onPress={handleSubmit}
            title="Save and Continue"
          />
        </View>
      )}
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 16,
  },
});
