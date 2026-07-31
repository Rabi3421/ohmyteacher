import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { CreateSchoolInput } from '../../models/organization';
import type { FormErrors } from '../../utils/organizationValidation';
import { normalizeIndianMobile, normalizeSchoolCode } from '../../utils/validation';
import { AppInput } from '../common/AppInput';
import { AppText } from '../common/AppText';

export type SchoolFormValue = Omit<CreateSchoolInput, 'admin'>;

export interface SchoolFormFieldsProps {
  value: SchoolFormValue;
  onChange: (value: SchoolFormValue) => void;
  errors?: FormErrors;
  codeImmutable?: boolean;
}

export function SchoolFormFields({
  value,
  onChange,
  errors = {},
  codeImmutable = false,
}: SchoolFormFieldsProps) {
  const update = <Key extends keyof SchoolFormValue>(
    key: Key,
    fieldValue: SchoolFormValue[Key],
  ) => onChange({ ...value, [key]: fieldValue });
  const updateAddress = (
    key: keyof SchoolFormValue['address'],
    fieldValue: string,
  ) =>
    onChange({
      ...value,
      address: { ...value.address, [key]: fieldValue },
    });

  return (
    <View style={styles.fields}>
      <AppText variant="heading3">School information</AppText>
      <AppInput
        error={errors.name}
        label="School Name"
        onChangeText={text => update('name', text)}
        required
        value={value.name}
      />
      <AppInput
        autoCapitalize="characters"
        disabled={codeImmutable}
        error={errors.code}
        helperText={codeImmutable ? 'School code is immutable.' : undefined}
        label="School Code"
        onChangeText={text => update('code', normalizeSchoolCode(text))}
        required
        value={value.code}
      />
      <AppInput
        autoCapitalize="none"
        error={errors.email}
        keyboardType="email-address"
        label="School Email"
        onChangeText={text => update('email', text)}
        value={value.email ?? ''}
      />
      <AppInput
        error={errors.mobile}
        keyboardType="phone-pad"
        label="School Mobile"
        maxLength={10}
        onChangeText={text => update('mobile', normalizeIndianMobile(text))}
        required
        value={value.mobile}
      />
      <AppInput
        error={errors.alternateMobile}
        keyboardType="phone-pad"
        label="Alternate Mobile"
        maxLength={10}
        onChangeText={text =>
          update('alternateMobile', normalizeIndianMobile(text))
        }
        value={value.alternateMobile ?? ''}
      />
      <AppInput
        autoCapitalize="none"
        label="Website"
        onChangeText={text => update('website', text)}
        placeholder="https://school.example"
        value={value.website ?? ''}
      />
      <AppInput
        autoCapitalize="none"
        label="Logo URL"
        onChangeText={text => update('logoUrl', text)}
        placeholder="Optional logo reference"
        value={value.logoUrl ?? ''}
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
      <AppInput disabled label="Country" value={value.address.country} />
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
