import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { CurrentOrganizationFormErrors } from '../../utils/currentOrganizationValidation';
import { AppInput } from '../common/AppInput';

export interface LiveOrganizationFormValue {
  name: string;
  address: string;
  phone: string;
  email: string;
  upiId?: string;
}

interface LiveOrganizationFormFieldsProps {
  entityLabel: 'School' | 'Branch';
  errors?: CurrentOrganizationFormErrors;
  includeUpi?: boolean;
  onChange: (value: LiveOrganizationFormValue) => void;
  value: LiveOrganizationFormValue;
}

export function LiveOrganizationFormFields({
  entityLabel,
  errors = {},
  includeUpi = false,
  onChange,
  value,
}: LiveOrganizationFormFieldsProps) {
  const update = (key: keyof LiveOrganizationFormValue, text: string) =>
    onChange({ ...value, [key]: text });

  return (
    <View style={styles.fields}>
      <AppInput
        error={errors.name}
        label={`${entityLabel} Name`}
        maxLength={255}
        onChangeText={text => update('name', text)}
        required
        value={value.name}
      />
      <AppInput
        error={errors.address}
        label="Address"
        maxLength={255}
        multiline
        onChangeText={text => update('address', text)}
        value={value.address}
      />
      <AppInput
        error={errors.phone}
        helperText="Optional; maximum 15 characters."
        keyboardType="phone-pad"
        label={`${entityLabel} Phone`}
        maxLength={15}
        onChangeText={text => update('phone', text)}
        value={value.phone}
      />
      <AppInput
        autoCapitalize="none"
        error={errors.email}
        keyboardType="email-address"
        label={`${entityLabel} Email`}
        onChangeText={text => update('email', text)}
        value={value.email}
      />
      {includeUpi ? (
        <AppInput
          autoCapitalize="none"
          error={errors.upiId}
          label="UPI ID"
          maxLength={100}
          onChangeText={text => update('upiId', text)}
          value={value.upiId ?? ''}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { gap: 14 },
});
