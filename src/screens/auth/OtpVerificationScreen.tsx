import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthFormLayout } from '../../components/auth/AuthFormLayout';
import { AppButton } from '../../components/common/AppButton';
import { AppInput } from '../../components/common/AppInput';
import { AppText } from '../../components/common/AppText';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import type { AuthScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore } from '../../store';
import { isSixDigitOtp } from '../../utils/validation';

function remainingSeconds(
  startedAt: string,
  durationSeconds: number,
  now: number,
): number {
  const elapsed = Math.floor(
    (now - new Date(startedAt).getTime()) / 1000,
  );
  return Math.max(0, durationSeconds - elapsed);
}

export function OtpVerificationScreen({
  navigation,
}: AuthScreenProps<'OtpVerification'>) {
  const theme = useAppTheme();
  const network = useNetworkStatus();
  const pending = useAuthStore(state => state.pendingOtpRequest);
  const verifyOtp = useAuthStore(state => state.verifyOtp);
  const resendOtp = useAuthStore(state => state.resendOtp);
  const resetAuthFlow = useAuthStore(state => state.resetAuthFlow);
  const clearError = useAuthStore(state => state.clearError);
  const isLoading = useAuthStore(state => state.isLoading);
  const apiError = useAuthStore(state => state.error);
  const [otp, setOtp] = useState('');
  const [localError, setLocalError] = useState<string>();
  const [now, setNow] = useState(Date.now());
  const offline = network.isConnected === false;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const resendRemaining = pending
    ? remainingSeconds(
        pending.requestedAt,
        pending.resendAvailableInSeconds,
        now,
      )
    : 0;
  const expiryRemaining = pending
    ? remainingSeconds(pending.requestedAt, pending.expiresInSeconds, now)
    : 0;

  useEffect(() => {
    if (expiryRemaining === 0) {
      setOtp('');
    }
  }, [expiryRemaining]);

  const handleVerify = async (): Promise<void> => {
    if (!isSixDigitOtp(otp)) {
      setLocalError('Enter the complete six-digit OTP.');
      return;
    }
    if (expiryRemaining === 0) {
      setLocalError('This OTP has expired. Request a new code.');
      return;
    }
    if (offline) {
      return;
    }

    setLocalError(undefined);
    clearError();
    const verified = await verifyOtp(otp);
    if (verified) {
      setOtp('');
    }
  };

  const handleResend = async (): Promise<void> => {
    if (resendRemaining > 0 || offline || isLoading) {
      return;
    }
    setOtp('');
    setLocalError(undefined);
    clearError();
    await resendOtp();
  };

  const handleChangeDetails = async (): Promise<void> => {
    setOtp('');
    await resetAuthFlow();
    navigation.popToTop();
  };

  if (!pending) {
    return (
      <AuthFormLayout
        onBackPress={handleChangeDetails}
        subtitle="The previous OTP request is no longer available."
        title="Verification unavailable"
      >
        <ErrorState
          message="Return to login and request a new OTP."
          onRetry={handleChangeDetails}
          retryLabel="Return to login"
        />
      </AuthFormLayout>
    );
  }

  return (
    <AuthFormLayout
      footer={
        <AppButton
          onPress={handleChangeDetails}
          title="Change login details"
          variant="ghost"
        />
      }
      onBackPress={handleChangeDetails}
      subtitle={`Enter the six-digit code sent to ${pending.destinationMasked}`}
      testID="otp-verification-screen"
      title="Verify OTP"
    >
      <View style={styles.content}>
        <AppInput
          accessibilityLabel="Six-digit one-time password"
          autoFocus
          error={localError ?? apiError?.fieldErrors?.otp}
          keyboardType="number-pad"
          label="One-Time Password"
          maxLength={6}
          onChangeText={value => {
            setOtp(value.replace(/\D/g, '').slice(0, 6));
            setLocalError(undefined);
          }}
          placeholder="••••••"
          required
          style={styles.otpInput}
          textContentType="oneTimeCode"
          value={otp}
        />
        {expiryRemaining > 0 ? (
          <AppText
            align="center"
            color={theme.colors.textSecondary}
            variant="caption"
          >
            Code expires in {Math.floor(expiryRemaining / 60)}:
            {String(expiryRemaining % 60).padStart(2, '0')}
          </AppText>
        ) : (
          <InlineError message="This OTP has expired. Request a new code." />
        )}
        {offline ? (
          <InlineError message="You appear to be offline. Reconnect to verify the OTP." />
        ) : apiError && !apiError.fieldErrors ? (
          <InlineError message={apiError.message} />
        ) : null}
        <AppButton
          disabled={offline || expiryRemaining === 0 || otp.length !== 6}
          fullWidth
          loading={isLoading}
          onPress={handleVerify}
          title="Verify and Continue"
        />
        <AppButton
          disabled={resendRemaining > 0 || offline}
          fullWidth
          onPress={handleResend}
          title={
            resendRemaining > 0
              ? `Resend OTP in ${resendRemaining}s`
              : 'Resend OTP'
          }
          variant="outline"
        />
      </View>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  otpInput: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 10,
    textAlign: 'center',
  },
});
