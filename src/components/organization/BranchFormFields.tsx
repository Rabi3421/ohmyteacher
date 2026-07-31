import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { CreateBranchInput } from '../../models/organization';
import type { FormErrors } from '../../utils/organizationValidation';
import { normalizeIndianMobile, normalizeSchoolCode } from '../../utils/validation';
import { AppInput } from '../common/AppInput';
import { AppText } from '../common/AppText';

export interface BranchFormFieldsProps {
  value: CreateBranchInput;
  onChange: (value: CreateBranchInput) => void;
  errors?: FormErrors;
  codeImmutable?: boolean;
}

export function BranchFormFields({
  value,
  onChange,
  errors = {},
  codeImmutable = false,
}: BranchFormFieldsProps) {
  const update = <Key extends keyof CreateBranchInput>(
    key: Key,
    fieldValue: CreateBranchInput[Key],
  ) => onChange({ ...value, [key]: fieldValue });
  const updateAddress = (
    key: keyof CreateBranchInput['address'],
    fieldValue: string,
  ) =>
    onChange({
      ...value,
      address: { ...value.address, [key]: fieldValue },
    });

  return (
    <View style={styles.fields}>
      <AppText variant="heading3">Branch information</AppText>
      <AppInput
        error={errors.name}
        label="Branch Name"
        onChangeText={text => update('name', text)}
        required
        value={value.name}
      />
      <AppInput
        autoCapitalize="characters"
        disabled={codeImmutable}
        error={errors.code}
        label="Branch Code"
        onChangeText={text => update('code', normalizeSchoolCode(text))}
        required
        value={value.code}
      />
      <AppInput
        autoCapitalize="none"
        error={errors.email}
        keyboardType="email-address"
        label="Branch Email"
        onChangeText={text => update('email', text)}
        value={value.email ?? ''}
      />
      <AppInput
        error={errors.mobile}
        keyboardType="phone-pad"
        label="Branch Mobile"
        maxLength={10}
        onChangeText={text => update('mobile', normalizeIndianMobile(text))}
        required
        value={value.mobile}
      />
      <AppText style={styles.sectionTitle} variant="heading3">
        Address
      </AppText>
      <AppInput
        error={errors.line1}
        label="Address Line 1"
        onChangeText={text => updateAddress('line1', text)}
        required
        value={value.address.line1}
      />
      <AppInput
        label="Address Line 2"
        onChangeText={text => updateAddress('line2', text)}
        value={value.address.line2 ?? ''}
      />
      <AppInput
        error={errors.city}
        label="City"
        onChangeText={text => updateAddress('city', text)}
        required
        value={value.address.city}
      />
      <AppInput
        label="District"
        onChangeText={text => updateAddress('district', text)}
        value={value.address.district ?? ''}
      />
      <AppInput
        error={errors.state}
        label="State"
        onChangeText={text => updateAddress('state', text)}
        required
        value={value.address.state}
      />
      <AppInput
        error={errors.pinCode}
        keyboardType="number-pad"
        label="PIN Code"
        maxLength={6}
        onChangeText={text =>
          updateAddress('pinCode', text.replace(/\D/g, '').slice(0, 6))
        }
        required
        value={value.address.pinCode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 14,
  },
  sectionTitle: {
    marginTop: 12,
  },
});
