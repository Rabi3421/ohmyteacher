import React from 'react';
import { StyleSheet, View } from 'react-native';

import type {
  CreateClassInput,
  CreateSectionInput,
  CreateSubjectInput,
} from '../../models/academic';
import type { AcademicFormErrors } from '../../utils/academicValidation';
import { AppInput } from '../common/AppInput';

interface BaseProps<T> {
  value: T;
  onChange: (value: T) => void;
  errors?: AcademicFormErrors;
  disabled?: boolean;
}

export function ClassFormFields({ value, onChange, errors = {}, disabled }: BaseProps<CreateClassInput>) {
  return (
    <View style={styles.fields}>
      <AppInput disabled={disabled} error={errors.name} label="Name" maxLength={50} onChangeText={name => onChange({ ...value, name })} required value={value.name} />
      <AppInput disabled={disabled} error={errors.displayOrder} helperText="Classes are ordered by this number, then by ID." keyboardType="number-pad" label="Display order" onChangeText={displayOrder => onChange({ ...value, displayOrder: Number(displayOrder) || 0 })} required value={String(value.displayOrder)} />
    </View>
  );
}

export function SectionFormFields({ value, onChange, errors = {}, disabled }: BaseProps<CreateSectionInput>) {
  return (
    <View style={styles.fields}>
      <AppInput disabled={disabled} error={errors.name} label="Name" maxLength={10} onChangeText={name => onChange({ ...value, name })} required value={value.name} />
      <AppInput disabled={disabled} error={errors.capacity} helperText="Optional planned capacity; no student data is created." keyboardType="number-pad" label="Capacity" onChangeText={capacity => onChange({ ...value, capacity: capacity ? Number(capacity) : undefined })} value={value.capacity ? String(value.capacity) : ''} />
    </View>
  );
}

export function SubjectFormFields({ value, onChange, errors = {}, disabled }: BaseProps<CreateSubjectInput>) {
  return (
    <View style={styles.fields}>
      <AppInput disabled={disabled} error={errors.name} label="Name" maxLength={100} onChangeText={name => onChange({ ...value, name })} required value={value.name} />
      <AppInput autoCapitalize="characters" disabled={disabled} error={errors.code} helperText="Optional school subject code." label="Code" maxLength={20} onChangeText={code => onChange({ ...value, code: code.toUpperCase() })} value={value.code} />
    </View>
  );
}

const styles = StyleSheet.create({ fields: { gap: 16 } });
