import React from 'react';
import { StyleSheet, View } from 'react-native';

import type {
  CreateClassInput,
  CreateSectionInput,
  CreateSubjectInput,
  SubjectType,
} from '../../models/academic';
import type { AcademicFormErrors } from '../../utils/academicValidation';
import { AppButton } from '../common/AppButton';
import { AppInput } from '../common/AppInput';
import { AppText } from '../common/AppText';

interface BaseProps<T> {
  value: T;
  onChange: (value: T) => void;
  errors?: AcademicFormErrors;
  disabled?: boolean;
}

function BaseFields<T extends CreateClassInput>({
  value,
  onChange,
  errors = {},
  disabled,
}: BaseProps<T>) {
  return (
    <>
      <AppInput
        disabled={disabled}
        error={errors.name}
        label="Name"
        onChangeText={name => onChange({ ...value, name })}
        required
        value={value.name}
      />
      <AppInput
        autoCapitalize="characters"
        disabled={disabled}
        error={errors.code}
        helperText="Uppercase letters, numbers, hyphen, or underscore."
        label="Code"
        maxLength={20}
        onChangeText={code =>
          onChange({
            ...value,
            code: code.toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
          })
        }
        required
        value={value.code}
      />
      <AppInput
        disabled={disabled}
        error={errors.displayOrder}
        keyboardType="number-pad"
        label="Display order"
        onChangeText={displayOrder =>
          onChange({ ...value, displayOrder: Number(displayOrder) || 0 })
        }
        required
        value={value.displayOrder ? String(value.displayOrder) : ''}
      />
      <AppText variant="label">Status</AppText>
      <View style={styles.options}>
        {(['ACTIVE', 'INACTIVE'] as const).map(status => (
          <AppButton
            disabled={disabled}
            key={status}
            onPress={() => onChange({ ...value, status })}
            title={status === 'ACTIVE' ? 'Active' : 'Inactive'}
            variant={value.status === status ? 'primary' : 'outline'}
          />
        ))}
      </View>
    </>
  );
}

export function ClassFormFields(props: BaseProps<CreateClassInput>) {
  return (
    <View style={styles.fields}>
      <BaseFields {...props} />
    </View>
  );
}

export function SectionFormFields({
  value,
  onChange,
  errors,
  disabled,
}: BaseProps<CreateSectionInput>) {
  return (
    <View style={styles.fields}>
      <BaseFields
        disabled={disabled}
        errors={errors}
        onChange={onChange}
        value={value}
      />
      <AppInput
        disabled={disabled}
        error={errors?.capacity}
        helperText="Optional planned capacity; no student data is created."
        keyboardType="number-pad"
        label="Capacity"
        onChangeText={capacity =>
          onChange({
            ...value,
            capacity: capacity ? Number(capacity) : undefined,
          })
        }
        value={value.capacity ? String(value.capacity) : ''}
      />
    </View>
  );
}

export function SubjectFormFields({
  value,
  onChange,
  errors,
  disabled,
}: BaseProps<CreateSubjectInput>) {
  return (
    <View style={styles.fields}>
      <BaseFields
        disabled={disabled}
        errors={errors}
        onChange={onChange}
        value={value}
      />
      <AppInput
        disabled={disabled}
        label="Short name"
        maxLength={20}
        onChangeText={shortName => onChange({ ...value, shortName })}
        value={value.shortName ?? ''}
      />
      <AppText variant="label">Subject type</AppText>
      <View style={styles.options}>
        {(['CORE', 'ELECTIVE', 'OPTIONAL'] as SubjectType[]).map(type => (
          <AppButton
            disabled={disabled}
            key={type}
            onPress={() => onChange({ ...value, type })}
            title={type[0] + type.slice(1).toLowerCase()}
            variant={value.type === type ? 'primary' : 'outline'}
          />
        ))}
      </View>
      {errors?.type ? <AppText variant="caption">{errors.type}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { gap: 16 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
