import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthFormLayout } from '../../components/auth/AuthFormLayout';
import { AppButton } from '../../components/common/AppButton';
import { AppInput } from '../../components/common/AppInput';
import { AppText } from '../../components/common/AppText';
import { InlineError } from '../../components/feedback/InlineError';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import type { AuthScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore } from '../../store';
import { isIndianMobile, normalizeIndianMobile } from '../../utils/validation';

export function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const theme = useAppTheme();
  const network = useNetworkStatus();
  const requestOtp = useAuthStore(state => state.requestOtp);
  const clearError = useAuthStore(state => state.clearError);
  const isLoading = useAuthStore(state => state.isLoading);
  const apiError = useAuthStore(state => state.error);
  const [mobile, setMobile] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const offline = network.isConnected === false;

  const handleSubmit = async (): Promise<void> => {
    const normalizedMobile = normalizeIndianMobile(mobile);
    if (!isIndianMobile(normalizedMobile)) {
      setFieldError('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    setFieldError(undefined);
    clearError();
    if (offline) return;
    await requestOtp({ mobile: normalizedMobile });
  };

  return (
    <AuthFormLayout
      onBackPress={navigation.goBack}
      subtitle="Enter your mobile number. Your verified role determines where you continue."
      testID="login-screen"
      title="Login"
    >
      <View style={styles.fields}>
        <AppInput
          error={fieldError ?? apiError?.fieldErrors?.mobile}
          keyboardType="phone-pad"
          label="Mobile Number"
          maxLength={10}
          onChangeText={value => {
            setMobile(normalizeIndianMobile(value));
            setFieldError(undefined);
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
          disabled={offline || isLoading}
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
          We will send a six-digit verification code to this mobile number.
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
