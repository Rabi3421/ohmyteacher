import React from 'react';
import { StyleSheet, View } from 'react-native';

import type {
  EnrollmentInput,
  GuardianInput,
  StudentProfileInput,
} from '../../models/student';
import type { StudentFormErrors } from '../../utils/studentValidation';
import { AppButton } from '../common/AppButton';
import { AppInput } from '../common/AppInput';
import { AppText } from '../common/AppText';

interface FormProps<T> {
  value: T;
  onChange: (value: T) => void;
  errors?: StudentFormErrors;
  disabled?: boolean;
}

export function StudentProfileFormFields({
  value,
  onChange,
  errors = {},
  disabled,
}: FormProps<StudentProfileInput>) {
  return (
    <View style={styles.fields}>
      <AppInput
        disabled={disabled}
        error={errors.fullName}
        label="Student Full Name"
        onChangeText={fullName => onChange({ ...value, fullName })}
        required
        value={value.fullName}
      />
      <AppInput
        disabled={disabled}
        error={errors.dateOfBirth}
        helperText="YYYY-MM-DD"
        label="Date of Birth"
        onChangeText={dateOfBirth => onChange({ ...value, dateOfBirth })}
        required
        value={value.dateOfBirth}
      />
      <AppText variant="label">Gender</AppText>
      <View style={styles.options}>
        {(['MALE', 'FEMALE', 'OTHER'] as const).map(gender => (
          <AppButton
            disabled={disabled}
            key={gender}
            onPress={() => onChange({ ...value, gender })}
            title={gender[0] + gender.slice(1).toLowerCase()}
            variant={value.gender === gender ? 'primary' : 'outline'}
          />
        ))}
      </View>
      <AppInput
        disabled={disabled}
        error={errors.mobile}
        keyboardType="phone-pad"
        label="Student Mobile"
        onChangeText={mobile => onChange({ ...value, mobile })}
        value={value.mobile ?? ''}
      />
      <AppInput
        autoCapitalize="none"
        disabled={disabled}
        error={errors.email}
        keyboardType="email-address"
        label="Student Email"
        onChangeText={email => onChange({ ...value, email })}
        value={value.email ?? ''}
      />
      <AppInput
        disabled={disabled}
        label="Blood Group"
        onChangeText={bloodGroup => onChange({ ...value, bloodGroup })}
        value={value.bloodGroup ?? ''}
      />
      <AppInput
        disabled={disabled}
        error={errors.admissionDate}
        helperText="YYYY-MM-DD"
        label="Admission Date"
        onChangeText={admissionDate =>
          onChange({ ...value, admissionDate })
        }
        required
        value={value.admissionDate}
      />
      <AppInput
        disabled={disabled}
        error={errors.line1}
        label="Address"
        onChangeText={line1 =>
          onChange({ ...value, address: { ...value.address, line1 } })
        }
        required
        value={value.address.line1}
      />
      <View style={styles.row}>
        <AppInput
          containerStyle={styles.flex}
          disabled={disabled}
          error={errors.city}
          label="City"
          onChangeText={city =>
            onChange({ ...value, address: { ...value.address, city } })
          }
          value={value.address.city}
        />
        <AppInput
          containerStyle={styles.flex}
          disabled={disabled}
          error={errors.state}
          label="State"
          onChangeText={state =>
            onChange({ ...value, address: { ...value.address, state } })
          }
          value={value.address.state}
        />
      </View>
      <AppInput
        disabled={disabled}
        error={errors.pinCode}
        keyboardType="number-pad"
        label="PIN Code"
        maxLength={6}
        onChangeText={pinCode =>
          onChange({ ...value, address: { ...value.address, pinCode } })
        }
        value={value.address.pinCode}
      />
    </View>
  );
}

export function GuardianFormFields({
  value,
  onChange,
  errors = {},
  disabled,
}: FormProps<GuardianInput>) {
  return (
    <View style={styles.fields}>
      <AppInput
        disabled={disabled}
        error={errors.fullName}
        label="Guardian Full Name"
        onChangeText={fullName => onChange({ ...value, fullName })}
        required
        value={value.fullName}
      />
      <AppText variant="label">Relationship</AppText>
      <View style={styles.options}>
        {(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER'] as const).map(
          relationship => (
            <AppButton
              disabled={disabled}
              key={relationship}
              onPress={() => onChange({ ...value, relationship })}
              title={
                relationship[0] + relationship.slice(1).toLowerCase()
              }
              variant={
                value.relationship === relationship ? 'primary' : 'outline'
              }
            />
          ),
        )}
      </View>
      <AppInput
        disabled={disabled}
        error={errors.mobile}
        keyboardType="phone-pad"
        label="Mobile Number"
        onChangeText={mobile => onChange({ ...value, mobile })}
        required
        value={value.mobile}
      />
      <AppInput
        disabled={disabled}
        error={errors.alternateMobile}
        keyboardType="phone-pad"
        label="Alternate Mobile"
        onChangeText={alternateMobile =>
          onChange({ ...value, alternateMobile })
        }
        value={value.alternateMobile ?? ''}
      />
      <AppInput
        autoCapitalize="none"
        disabled={disabled}
        error={errors.email}
        keyboardType="email-address"
        label="Email"
        onChangeText={email => onChange({ ...value, email })}
        value={value.email ?? ''}
      />
      <AppInput
        disabled={disabled}
        label="Occupation"
        onChangeText={occupation => onChange({ ...value, occupation })}
        value={value.occupation ?? ''}
      />
      <AppInput
        disabled={disabled}
        error={errors.line1}
        label="Guardian Address"
        onChangeText={line1 =>
          onChange({ ...value, address: { ...value.address, line1 } })
        }
        required
        value={value.address.line1}
      />
      <View style={styles.row}>
        <AppInput
          containerStyle={styles.flex}
          disabled={disabled}
          error={errors.city}
          label="City"
          onChangeText={city =>
            onChange({ ...value, address: { ...value.address, city } })
          }
          required
          value={value.address.city}
        />
        <AppInput
          containerStyle={styles.flex}
          disabled={disabled}
          error={errors.state}
          label="State"
          onChangeText={state =>
            onChange({ ...value, address: { ...value.address, state } })
          }
          required
          value={value.address.state}
        />
      </View>
      <AppInput
        disabled={disabled}
        error={errors.pinCode}
        keyboardType="number-pad"
        label="PIN Code"
        maxLength={6}
        onChangeText={pinCode =>
          onChange({ ...value, address: { ...value.address, pinCode } })
        }
        required
        value={value.address.pinCode}
      />
      <View style={styles.options}>
        {[
          ['isPrimaryContact', 'Primary Contact'],
          ['isFeeContact', 'Fee Contact'],
          ['isEmergencyContact', 'Emergency Contact'],
          ['whatsappEnabled', 'WhatsApp'],
          ['parentAppAccessEnabled', 'Parent App'],
        ].map(([key, label]) => {
          const typedKey = key as keyof Pick<
            GuardianInput,
            | 'isPrimaryContact'
            | 'isFeeContact'
            | 'isEmergencyContact'
            | 'whatsappEnabled'
            | 'parentAppAccessEnabled'
          >;
          return (
            <AppButton
              disabled={disabled}
              key={key}
              onPress={() => onChange({ ...value, [typedKey]: !value[typedKey] })}
              title={label}
              variant={value[typedKey] ? 'primary' : 'outline'}
            />
          );
        })}
      </View>
    </View>
  );
}

export function EnrollmentFormFields({
  value,
  onChange,
  errors = {},
  disabled,
}: FormProps<EnrollmentInput>) {
  return (
    <View style={styles.fields}>
      {[
        ['branchId', 'Branch ID', errors.branchId],
        ['academicSessionId', 'Academic Session ID', errors.academicSessionId],
        ['classId', 'Class ID', errors.classId],
        ['sectionId', 'Section ID', errors.sectionId],
      ].map(([key, label, error]) => (
        <AppInput
          disabled={disabled}
          error={error}
          key={key}
          label={label}
          onChangeText={text => onChange({ ...value, [key]: text })}
          required
          value={value[key as keyof EnrollmentInput] ?? ''}
        />
      ))}
      <AppInput
        disabled={disabled}
        error={errors.rollNumber}
        label="Roll Number"
        onChangeText={rollNumber => onChange({ ...value, rollNumber })}
        value={value.rollNumber ?? ''}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { gap: 15 },
  flex: { flex: 1 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', gap: 10 },
});
