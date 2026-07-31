import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { UpdateUserIdentityInput } from '../../models/userManagement';
import { normalizeIndianMobile } from '../../utils/validation';
import { AppInput } from '../common/AppInput';
import { AppText } from '../common/AppText';

export interface StaffIdentityFormFieldsProps {
  value: UpdateUserIdentityInput;
  onChange: (value: UpdateUserIdentityInput) => void;
  errors?: Record<string, string>;
}

export function StaffIdentityFormFields({
  value,
  onChange,
  errors = {},
}: StaffIdentityFormFieldsProps) {
  return (
    <View style={styles.fields}>
      <AppText variant="heading3">User identity</AppText>
      <AppInput
        error={errors.name}
        label="Full Name"
        onChangeText={name => onChange({ ...value, name })}
        required
        value={value.name}
      />
      <AppInput
        error={errors.mobile}
        helperText="Changing mobile invalidates active sessions."
        keyboardType="phone-pad"
        label="Mobile Number"
        maxLength={10}
        onChangeText={mobile =>
          onChange({ ...value, mobile: normalizeIndianMobile(mobile) })
        }
        required
        value={value.mobile}
      />
      <AppInput
        autoCapitalize="none"
        error={errors.email}
        keyboardType="email-address"
        label="Email"
        onChangeText={email => onChange({ ...value, email })}
        value={value.email ?? ''}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { gap: 14 },
});
