import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthFormLayout } from '../../components/auth/AuthFormLayout';
import { AppButton } from '../../components/common/AppButton';
import { AppInput } from '../../components/common/AppInput';
import { AppText } from '../../components/common/AppText';
import { InlineError } from '../../components/feedback/InlineError';
import { AppIcon } from '../../components/icons/AppIcon';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import type { AuthScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore } from '../../store';
import {
  isIndianMobile,
  isSchoolCode,
  normalizeIndianMobile,
  normalizeSchoolCode,
} from '../../utils/validation';

interface FieldErrors {
  schoolCode?: string;
  mobile?: string;
}

export function SchoolLoginScreen({
  navigation,
}: AuthScreenProps<'SchoolLogin'>) {
  const theme = useAppTheme();
  const network = useNetworkStatus();
  const requestSchoolOtp = useAuthStore(state => state.requestSchoolOtp);
  const clearError = useAuthStore(state => state.clearError);
  const isLoading = useAuthStore(state => state.isLoading);
  const apiError = useAuthStore(state => state.error);
  const [schoolCode, setSchoolCode] = useState('');
  const [mobile, setMobile] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const offline = network.isConnected === false;

  const handleSubmit = async (): Promise<void> => {
    const normalizedSchoolCode = normalizeSchoolCode(schoolCode);
    const normalizedMobile = normalizeIndianMobile(mobile);
    const nextErrors: FieldErrors = {};
    if (!isSchoolCode(normalizedSchoolCode)) {
      nextErrors.schoolCode = 'Enter a valid school code.';
    }
    if (!isIndianMobile(normalizedMobile)) {
      nextErrors.mobile = 'Enter a valid 10-digit Indian mobile number.';
    }
    setFieldErrors(nextErrors);
    clearError();
    if (Object.keys(nextErrors).length > 0 || offline) {
      return;
    }

    const requested = await requestSchoolOtp({
      mobile: normalizedMobile,
      schoolCode: normalizedSchoolCode,
    });
    if (requested) {
      navigation.navigate(ROUTES.OTP_VERIFICATION);
    }
  };

  return (
    <AuthFormLayout
      footer={
        <AppButton
          onPress={() => navigation.replace(ROUTES.PLATFORM_ADMIN_LOGIN)}
          title="Use Platform Admin Login"
          variant="ghost"
        />
      }
      onBackPress={navigation.goBack}
      subtitle="Parents, students, and school staff sign in with their registered mobile number."
      testID="school-login-screen"
      title="School Login"
    >
      <View style={styles.fields}>
        <AppInput
          autoCapitalize="characters"
          autoCorrect={false}
          error={fieldErrors.schoolCode ?? apiError?.fieldErrors?.schoolCode}
          label="School Code"
          leftIcon={
            <AppIcon
              color={theme.colors.textSecondary}
              name="school"
              size={theme.iconSizes.sm}
            />
          }
          maxLength={20}
          onChangeText={value => {
            setSchoolCode(normalizeSchoolCode(value));
            setFieldErrors(current => ({ ...current, schoolCode: undefined }));
          }}
          placeholder="e.g. OMT001"
          required
          value={schoolCode}
        />
        <AppInput
          error={fieldErrors.mobile ?? apiError?.fieldErrors?.mobile}
          keyboardType="phone-pad"
          label="Mobile Number"
          maxLength={10}
          onChangeText={value => {
            setMobile(normalizeIndianMobile(value));
            setFieldErrors(current => ({ ...current, mobile: undefined }));
          }}
          placeholder="98765 43210"
          required
          textContentType="telephoneNumber"
          value={mobile}
        />
        {offline ? (
          <InlineError message="You appear to be offline. Connect to the internet to request an OTP." />
        ) : apiError && !apiError.fieldErrors ? (
          <InlineError message={apiError.message} />
        ) : null}
        <AppButton
          disabled={offline}
          fullWidth
          loading={isLoading}
          onPress={handleSubmit}
          title="Request OTP"
        />
        <AppText
          align="center"
          color={theme.colors.textSecondary}
          variant="caption"
        >
          We will send a six-digit verification code to your registered mobile.
        </AppText>
      </View>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 16,
  },
});
