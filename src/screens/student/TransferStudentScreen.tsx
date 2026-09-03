import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppChoiceChip } from '../../components/common/AppChoiceChip';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { EnrollmentSummaryCard } from '../../components/student/StudentComponents';
import { EnrollmentFormFields } from '../../components/student/StudentFormFields';
import type { TransferStudentInput, TransferType } from '../../models/student';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useStudentStore } from '../../store';
import {
  type StudentFormErrors,
  validateTransferInput,
} from '../../utils/studentValidation';

export function TransferStudentScreen({
  navigation,
  route,
}: RoleScreenProps<'TransferStudent'>) {
  const { schoolId, studentId } = route.params;
  const student = useStudentStore(state => state.currentStudent);
  const loadStudent = useStudentStore(state => state.loadStudent);
  const transferStudent = useStudentStore(state => state.transferStudent);
  const isLoading = useStudentStore(state => state.isLoadingStudent);
  const isTransferring = useStudentStore(state => state.isTransferringStudent);
  const error = useStudentStore(state => state.error);
  const current = student?.profile.id === studentId ? student : null;
  const [value, setValue] = useState<TransferStudentInput | null>(null);
  const [errors, setErrors] = useState<StudentFormErrors>({});
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!current) {
      loadStudent(schoolId, studentId).catch(() => undefined);
      return;
    }
    if (current.currentEnrollment && !value) {
      const enrollment = current.currentEnrollment;
      setValue({
        academicSessionId: enrollment.academicSessionId,
        branchId: enrollment.branchId,
        classId: enrollment.classId,
        effectiveDate: new Date().toISOString().slice(0, 10),
        reason: '',
        rollNumber: enrollment.rollNumber,
        sectionId: enrollment.sectionId,
        type: 'SECTION_CHANGE',
      });
    }
  }, [current, loadStudent, schoolId, studentId, value]);

  function prepareTransfer() {
    if (!value) return;
    const nextErrors = validateTransferInput(value);
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) setConfirming(true);
  }

  return (
    <>
      <AppScreen scrollable testID="transfer-student-screen">
        <View style={styles.maxWidth}>
          <AppHeader
            includeSafeArea={false}
            onBackPress={navigation.goBack}
            subtitle="The existing enrollment is closed; history is never overwritten."
            title="Transfer Student"
          />
          {isLoading && !current ? (
            <LoadingView message="Loading enrollment…" />
          ) : error && !current ? (
            <ErrorState
              message={error.message}
              onRetry={() => loadStudent(schoolId, studentId)}
            />
          ) : current && value ? (
            <>
              <EnrollmentSummaryCard enrollment={current.currentEnrollment} />
              <AppCard style={styles.form} variant="outlined">
                <AppText variant="title">Destination Enrollment</AppText>
                <AppText variant="caption">
                  Transfers must stay in the current academic session. The
                  destination class and section must belong to the selected
                  branch.
                </AppText>
                <EnrollmentFormFields
                  disabled={isTransferring}
                  errors={errors}
                  onChange={enrollment => setValue({ ...value, ...enrollment })}
                  value={value}
                />
                <AppText variant="label">Transfer Type</AppText>
                <View style={styles.options}>
                  {(
                    [
                      'SECTION_CHANGE',
                      'CLASS_CHANGE',
                      'BRANCH_TRANSFER',
                    ] as TransferType[]
                  ).map(type => (
                    <AppChoiceChip
                      key={type}
                      onPress={() => setValue({ ...value, type })}
                      label={type.replace('_', ' ')}
                      selected={value.type === type}
                    />
                  ))}
                </View>
                <AppInput
                  error={errors.effectiveDate}
                  helperText="YYYY-MM-DD"
                  label="Effective Date"
                  onChangeText={effectiveDate =>
                    setValue({ ...value, effectiveDate })
                  }
                  value={value.effectiveDate}
                />
                <AppInput
                  error={errors.reason}
                  label="Transfer Reason"
                  multiline
                  onChangeText={reason => setValue({ ...value, reason })}
                  required
                  value={value.reason}
                />
              </AppCard>
              {error ? <InlineError message={error.message} /> : null}
              <AppButton
                onPress={prepareTransfer}
                style={styles.submit}
                title="Review Transfer"
              />
            </>
          ) : current ? (
            <ErrorState message="This student has no active enrollment." />
          ) : null}
        </View>
      </AppScreen>
      <ConfirmationDialog
        confirmLabel="Transfer Student"
        loading={isTransferring}
        message={`Create a new ${value?.type.replace('_', ' ').toLowerCase()} enrollment effective ${value?.effectiveDate}?`}
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          if (value && (await transferStudent(schoolId, studentId, value))) {
            setConfirming(false);
            navigation.goBack();
          }
        }}
        title="Confirm enrollment transfer"
        visible={confirming}
      />
    </>
  );
}

const styles = StyleSheet.create({
  form: { gap: 15, marginTop: 16 },
  maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  submit: { marginTop: 20 },
});
