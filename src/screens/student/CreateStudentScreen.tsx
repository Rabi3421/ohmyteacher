import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AcademicContextBar } from '../../components/academic/AcademicContextBar';
import { AppButton } from '../../components/common/AppButton';
import { AppChoiceChip } from '../../components/common/AppChoiceChip';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { InlineError } from '../../components/feedback/InlineError';
import { maskStudentPhone } from '../../components/student/CurrentStudentComponents';
import type { CurrentStudentAdmissionInput } from '../../models/currentStudent';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAcademicStore, useCurrentStudentStore } from '../../store';

const initialValue: CurrentStudentAdmissionInput = {
  address: '', classId: '', dateOfBirth: null, gender: '', name: '', parentEmail: '', parentName: '', parentPhoneNumber: '', rollNumber: '', sectionId: '',
};

function validDate(value: string | null | undefined): boolean {
  return !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function CreateStudentScreen({ navigation, route }: RoleScreenProps<'CreateStudent'>) {
  const [value, setValue] = useState(initialValue);
  const [reviewing, setReviewing] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);
  const context = useAcademicStore(state => state.context);
  const classes = useAcademicStore(state => state.classes.items);
  const sections = useAcademicStore(state => state.sections.items);
  const loadClasses = useAcademicStore(state => state.loadClasses);
  const loadSections = useAcademicStore(state => state.loadSections);
  const setClassQuery = useAcademicStore(state => state.setClassQuery);
  const setSectionQuery = useAcademicStore(state => state.setSectionQuery);
  const create = useCurrentStudentStore(state => state.createAdmission);
  const saving = useCurrentStudentStore(state => state.isSaving);
  const error = useCurrentStudentStore(state => state.error);

  useEffect(() => {
    if (!context || context.schoolId !== route.params.schoolId) return;
    setValue(current => ({ ...current, classId: '', sectionId: '' }));
    setClassQuery({ page: 1, pageSize: 100, status: 'ACTIVE' });
    loadClasses().catch(() => undefined);
  }, [context, loadClasses, route.params.schoolId, setClassQuery]);

  useEffect(() => {
    if (!value.classId) return;
    setSectionQuery({ page: 1, pageSize: 100, status: 'ACTIVE' });
    loadSections(value.classId).catch(() => undefined);
  }, [loadSections, setSectionQuery, value.classId]);

  const validate = () => {
    if (!context) return 'Select a branch and academic session.';
    if (!value.classId || !value.sectionId) return 'Select an active class and section.';
    if (!value.name.trim()) return 'Student name is required.';
    if (!validDate(value.dateOfBirth)) return 'Date of birth must use YYYY-MM-DD.';
    if (!/^\d{10,15}$/.test(value.parentPhoneNumber.replace(/\D/g, ''))) return 'Enter a valid 10–15 digit parent login phone.';
    if (value.parentEmail && !/^\S+@\S+\.\S+$/.test(value.parentEmail)) return 'Enter a valid parent email or leave it blank.';
    return null;
  };

  return <AppScreen contentContainerStyle={styles.content} scrollable testID="create-student-screen"><View style={styles.maxWidth}>
    <AppHeader includeSafeArea={false} onBackPress={() => { setValue(initialValue); navigation.goBack(); }} subtitle="One atomic student + parent-login link operation" title="Admit Student" />
    <AcademicContextBar schoolId={route.params.schoolId} />
    {!reviewing ? <View style={styles.fields}>
      <AppText variant="label">Active Class</AppText>
      <View style={styles.options}>{classes.filter(item => item.status === 'ACTIVE').map(item => <AppChoiceChip key={item.id} onPress={() => setValue(current => ({ ...current, classId: item.id, sectionId: '' }))} label={item.name}
            selected={value.classId === item.id} />)}</View>
      <AppText variant="label">Active Section</AppText>
      <View style={styles.options}>{sections.filter(item => item.classId === value.classId && item.status === 'ACTIVE').map(item => <AppChoiceChip key={item.id} onPress={() => setValue(current => ({ ...current, sectionId: item.id }))} label={item.name}
            selected={value.sectionId === item.id} />)}</View>
      <AppInput disabled={saving} error={error?.fieldErrors?.name} label="Student Name" onChangeText={name => setValue({ ...value, name })} required value={value.name} />
      <AppInput disabled={saving} error={error?.fieldErrors?.dateOfBirth} helperText="YYYY-MM-DD or blank" label="Date of Birth" onChangeText={dateOfBirth => setValue({ ...value, dateOfBirth: dateOfBirth || null })} value={value.dateOfBirth ?? ''} />
      <AppInput disabled={saving} error={error?.fieldErrors?.gender} helperText="The backend stores free text" label="Gender" onChangeText={gender => setValue({ ...value, gender })} value={value.gender ?? ''} />
      <AppInput disabled={saving} error={error?.fieldErrors?.rollNumber} label="Roll Number" onChangeText={rollNumber => setValue({ ...value, rollNumber })} value={value.rollNumber ?? ''} />
      <AppInput disabled={saving} error={error?.fieldErrors?.parentName} label="Parent Name" onChangeText={parentName => setValue({ ...value, parentName })} value={value.parentName ?? ''} />
      <AppInput disabled={saving} error={error?.fieldErrors?.parentPhoneNumber} helperText="Creates or reuses the backend student-role parent login" keyboardType="phone-pad" label="Parent Login Phone" onChangeText={parentPhoneNumber => setValue({ ...value, parentPhoneNumber })} required value={value.parentPhoneNumber} />
      <AppInput autoCapitalize="none" disabled={saving} error={error?.fieldErrors?.parentEmail} keyboardType="email-address" label="Parent Email" onChangeText={parentEmail => setValue({ ...value, parentEmail })} value={value.parentEmail ?? ''} />
      <AppInput disabled={saving} error={error?.fieldErrors?.address} label="Address" onChangeText={address => setValue({ ...value, address })} value={value.address ?? ''} />
      {validation ? <InlineError message={validation} /> : null}
      {error ? <InlineError message={error.message} /> : null}
      <AppButton onPress={() => { const next = validate(); setValidation(next); if (!next) setReviewing(true); }} title="Review Admission" />
    </View> : <View style={styles.fields}>
      <AppCard variant="elevated"><AppText variant="title">Review atomic admission</AppText><AppText>{value.name}</AppText><AppText>Branch {context?.branchId} · Session {context?.academicSessionId}</AppText><AppText>Class {value.classId} · Section {value.sectionId} · Roll {value.rollNumber || 'not assigned'}</AppText><AppText>Parent login: {value.parentName || 'Name not recorded'} · {maskStudentPhone(value.parentPhoneNumber)}</AppText></AppCard>
      <AppCard variant="outlined"><AppText>The server will generate the admission number and admission date, create the student, create or reuse the phone account, and create the StudentLink in one transaction. No OTP is sent by this request.</AppText></AppCard>
      {error ? <InlineError message={error.message} /> : null}
      <View style={styles.options}><AppButton disabled={saving} onPress={() => setReviewing(false)} title="Back to Edit" variant="outline" /><AppButton loading={saving} onPress={async () => { const created = await create(value); if (created) { setValue(initialValue); setReviewing(false); navigation.replace('StudentDetails', { schoolId: route.params.schoolId, studentId: created.id }); } }} title="Confirm Admission" /></View>
    </View>}
  </View></AppScreen>;
}

const styles = StyleSheet.create({ content: { paddingBottom: 32 }, fields: { gap: 14 }, maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
