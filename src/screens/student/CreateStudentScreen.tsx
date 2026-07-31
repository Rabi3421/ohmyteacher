import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import {
  AdmissionStepIndicator,
  GuardianCard,
} from '../../components/student/StudentComponents';
import {
  EnrollmentFormFields,
  GuardianFormFields,
  StudentProfileFormFields,
} from '../../components/student/StudentFormFields';
import { ROUTES } from '../../constants/routes';
import type { GuardianInput } from '../../models/student';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useStudentStore } from '../../store';
import {
  type StudentFormErrors,
  validateGuardianInput,
  validateStudentProfileInput,
} from '../../utils/studentValidation';

const guardianInitial: GuardianInput = {
  address: {
    city: '',
    country: 'India',
    line1: '',
    pinCode: '',
    state: '',
  },
  fullName: '',
  isEmergencyContact: true,
  isFeeContact: true,
  isPrimaryContact: true,
  mobile: '',
  parentAppAccessEnabled: true,
  relationship: 'FATHER',
  whatsappEnabled: true,
};

export function CreateStudentScreen({
  navigation,
  route,
}: RoleScreenProps<'CreateStudent'>) {
  const draft = useStudentStore(state => state.admissionDraft);
  const updateDraft = useStudentStore(state => state.updateAdmissionDraft);
  const setStep = useStudentStore(state => state.setAdmissionStep);
  const resetDraft = useStudentStore(state => state.resetAdmissionDraft);
  const [guardian, setGuardian] = useState(guardianInitial);
  const [errors, setErrors] = useState<StudentFormErrors>({});

  function next() {
    if (draft.step === 1) {
      const nextErrors = validateStudentProfileInput(draft.profile);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) return;
      setStep(2);
      return;
    }
    if (draft.step === 2) {
      if (draft.guardians.length === 0) {
        const nextErrors = validateGuardianInput(guardian);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) return;
        updateDraft({ guardians: [guardian] });
      }
      setStep(3);
      return;
    }
    if (draft.step === 3) {
      const nextErrors: StudentFormErrors = {};
      if (!draft.enrollment.branchId) nextErrors.branchId = 'Branch is required.';
      if (!draft.enrollment.academicSessionId) {
        nextErrors.academicSessionId = 'Academic session is required.';
      }
      if (!draft.enrollment.classId) nextErrors.classId = 'Class is required.';
      if (!draft.enrollment.sectionId) {
        nextErrors.sectionId = 'Section is required.';
      }
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) return;
      setStep(4);
      return;
    }
    navigation.navigate(ROUTES.STUDENT_ADMISSION_REVIEW, {
      schoolId: route.params.schoolId,
    });
  }

  return (
    <AppScreen
      contentContainerStyle={styles.content}
      scrollable
      testID="create-student-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={() => {
            if (draft.step > 1) setStep((draft.step - 1) as typeof draft.step);
            else {
              resetDraft();
              navigation.goBack();
            }
          }}
          subtitle="Admission draft remains local until submission"
          title="Student Admission"
        />
        <AdmissionStepIndicator step={draft.step} />
        {draft.step === 1 ? (
          <StudentProfileFormFields
            errors={errors}
            onChange={profile => updateDraft({ profile })}
            value={draft.profile}
          />
        ) : draft.step === 2 ? (
          <View style={styles.fields}>
            {draft.guardians.map((item, index) => (
              <AppCard key={`${item.mobile}-${index}`} variant="outlined">
                <AppText variant="title">{item.fullName}</AppText>
                <AppText>{item.relationship} · {item.mobile}</AppText>
                <AppButton
                  onPress={() =>
                    updateDraft({
                      guardians: draft.guardians.filter((_, i) => i !== index),
                    })
                  }
                  title="Remove Unsaved Guardian"
                  variant="ghost"
                />
              </AppCard>
            ))}
            <GuardianFormFields
              errors={errors}
              onChange={setGuardian}
              value={guardian}
            />
            <AppButton
              onPress={() => {
                const nextErrors = validateGuardianInput(guardian);
                setErrors(nextErrors);
                if (Object.keys(nextErrors).length) return;
                const normalized = {
                  ...guardian,
                  isFeeContact: draft.guardians.length
                    ? guardian.isFeeContact
                    : true,
                  isPrimaryContact: draft.guardians.length
                    ? guardian.isPrimaryContact
                    : true,
                };
                updateDraft({ guardians: [...draft.guardians, normalized] });
                setGuardian({
                  ...guardianInitial,
                  isFeeContact: false,
                  isPrimaryContact: false,
                });
              }}
              title="Add Guardian"
              variant="outline"
            />
          </View>
        ) : draft.step === 3 ? (
          <EnrollmentFormFields
            errors={errors}
            onChange={enrollment => updateDraft({ enrollment })}
            value={draft.enrollment}
          />
        ) : (
          <View style={styles.fields}>
            <AppText variant="heading3">App Access</AppText>
            {draft.guardians.map(item => (
              <GuardianCard
                guardian={{
                  ...item,
                  createdAt: '',
                  id: item.mobile,
                  link: {
                    createdAt: '',
                    guardianId: item.mobile,
                    id: item.mobile,
                    isEmergencyContact: item.isEmergencyContact,
                    isFeeContact: item.isFeeContact,
                    isPrimaryContact: item.isPrimaryContact,
                    parentAppAccessEnabled: item.parentAppAccessEnabled,
                    status: 'ACTIVE',
                    studentId: '',
                    updatedAt: '',
                    whatsappEnabled: item.whatsappEnabled,
                  },
                  linkedChildrenCount: 0,
                  schoolId: route.params.schoolId,
                  updatedAt: '',
                }}
                key={item.mobile}
              />
            ))}
            <AppButton
              disabled={!draft.profile.mobile}
              onPress={() =>
                updateDraft({
                  enableStudentAppAccess: !draft.enableStudentAppAccess,
                })
              }
              title={
                draft.enableStudentAppAccess
                  ? 'Student App Enabled'
                  : 'Enable Student App'
              }
              variant={
                draft.enableStudentAppAccess ? 'primary' : 'outline'
              }
            />
            {!draft.profile.mobile ? (
              <AppText variant="caption">
                Student access requires a unique personal mobile.
              </AppText>
            ) : null}
          </View>
        )}
        <AppButton
          onPress={next}
          style={styles.next}
          title={draft.step === 4 ? 'Review Admission' : 'Continue'}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  fields: { gap: 14 },
  maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' },
  next: { marginTop: 22 },
});
