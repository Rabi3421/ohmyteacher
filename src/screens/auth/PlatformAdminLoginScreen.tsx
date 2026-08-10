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
  normalizeIndianMobile,
} from '../../utils/validation';

export function PlatformAdminLoginScreen({
  navigation,
}: AuthScreenProps<'PlatformAdminLogin'>) {
  const theme = useAppTheme();
  const network = useNetworkStatus();
  const requestPlatformOtp = useAuthStore(state => state.requestPlatformOtp);
  const clearError = useAuthStore(state => state.clearError);
  const isLoading = useAuthStore(state => state.isLoading);
  const apiError = useAuthStore(state => state.error);
  const [identifier, setIdentifier] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const offline = network.isConnected === false;

  const handleSubmit = async (): Promise<void> => {
    const normalized = normalizeIndianMobile(identifier);
    if (!isIndianMobile(normalized)) {
      setFieldError('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    setFieldError(undefined);
    clearError();
    if (offline) {
      return;
    }
    const requested = await requestPlatformOtp({ identifier: normalized });
    if (requested) {
      navigation.navigate(ROUTES.OTP_VERIFICATION);
    }
  };

  return (
    <AuthFormLayout
      footer={
        <AppButton
          onPress={() => navigation.replace(ROUTES.SCHOOL_LOGIN)}
          title="Use School Login"
          variant="ghost"
        />
      }
      onBackPress={navigation.goBack}
      subtitle="Platform administration is reserved for authorized OhMyTeacher operators."
      testID="platform-admin-login-screen"
      title="Platform Admin Login"
    >
      <View style={styles.fields}>
        <AppInput
          autoCapitalize="none"
          autoCorrect={false}
          error={fieldError ?? apiError?.fieldErrors?.identifier}
          keyboardType="phone-pad"
          label="Mobile Number"
          leftIcon={
            <AppIcon
              color={theme.colors.textSecondary}
              name="shield-check"
              size={theme.iconSizes.sm}
            />
          }
          maxLength={10}
          onChangeText={value => {
            setIdentifier(normalizeIndianMobile(value));
            setFieldError(undefined);
          }}
          placeholder="98765 43210"
          required
          textContentType="telephoneNumber"
          value={identifier}
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
          Your final access is determined by the verified platform membership.
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
