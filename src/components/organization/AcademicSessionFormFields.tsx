import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { CreateAcademicSessionInput } from '../../models/organization';
import type { FormErrors } from '../../utils/organizationValidation';
import { AppInput } from '../common/AppInput';
import { AppText } from '../common/AppText';

export interface AcademicSessionFormFieldsProps {
  value: CreateAcademicSessionInput;
  onChange: (value: CreateAcademicSessionInput) => void;
  errors?: FormErrors;
}

export function AcademicSessionFormFields({
  value,
  onChange,
  errors = {},
}: AcademicSessionFormFieldsProps) {
  return (
    <View style={styles.fields}>
      <AppText variant="heading3">Academic session</AppText>
      <AppInput
        error={errors.name}
        label="Session Name"
        onChangeText={name => onChange({ ...value, name })}
        placeholder="2027-28"
        required
        value={value.name}
      />
      <AppInput
        error={errors.startDate}
        helperText="Use YYYY-MM-DD"
        label="Start Date"
        maxLength={10}
        onChangeText={startDate => onChange({ ...value, startDate })}
        placeholder="2027-04-01"
        required
        value={value.startDate}
      />
      <AppInput
        error={errors.endDate}
        helperText="Use YYYY-MM-DD"
        label="End Date"
        maxLength={10}
        onChangeText={endDate => onChange({ ...value, endDate })}
        placeholder="2028-03-31"
        required
        value={value.endDate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 14,
  },
});
