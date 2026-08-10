import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { maskStudentPhone } from '../../components/student/CurrentStudentComponents';
import type { CurrentStudentUpdateInput } from '../../models/currentStudent';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useCurrentStudentStore } from '../../store';

export function EditStudentScreen({ navigation, route }: RoleScreenProps<'EditStudent'>) {
  const valueFromStore = useCurrentStudentStore(state => state.current);
  const current = valueFromStore?.id === route.params.studentId ? valueFromStore : null;
  const load = useCurrentStudentStore(state => state.loadStudent);
  const update = useCurrentStudentStore(state => state.updateStudent);
  const error = useCurrentStudentStore(state => state.error);
  const loading = useCurrentStudentStore(state => state.isLoading);
  const saving = useCurrentStudentStore(state => state.isSaving);
  const [value, setValue] = useState<CurrentStudentUpdateInput | null>(null);

  useEffect(() => { load(route.params.studentId).catch(() => undefined); }, [load, route.params.studentId]);
  useEffect(() => {
    if (current) setValue({ address: current.address, dateOfBirth: current.dateOfBirth, gender: current.gender, name: current.name, parentEmail: current.parentEmail, parentName: current.parentName, rollNumber: current.rollNumber });
  }, [current]);

  return <AppScreen contentContainerStyle={styles.content} scrollable testID="edit-student-screen"><View style={styles.maxWidth}>
    <AppHeader includeSafeArea={false} onBackPress={() => { setValue(null); navigation.goBack(); }} subtitle="Admission number, branch, placement, and parent login phone stay unchanged" title="Edit Student" />
    {loading && !value ? <LoadingView message="Loading student…" /> : error && !value ? <ErrorState message={error.message} onRetry={() => load(route.params.studentId)} /> : value && current ? <View style={styles.fields}>
      <AppInput disabled={saving} label="Student Name" onChangeText={name => setValue({ ...value, name })} required value={value.name ?? ''} />
      <AppInput disabled={saving} helperText="YYYY-MM-DD or blank" label="Date of Birth" onChangeText={dateOfBirth => setValue({ ...value, dateOfBirth: dateOfBirth || null })} value={value.dateOfBirth ?? ''} />
      <AppInput disabled={saving} label="Gender" onChangeText={gender => setValue({ ...value, gender })} value={value.gender ?? ''} />
      <AppInput disabled={saving} label="Roll Number" onChangeText={rollNumber => setValue({ ...value, rollNumber })} value={value.rollNumber ?? ''} />
      <AppInput disabled={saving} label="Parent Name" onChangeText={parentName => setValue({ ...value, parentName })} value={value.parentName ?? ''} />
      <AppInput disabled helperText="Locked because Django PATCH does not relink the login account" label="Parent Login Phone" value={maskStudentPhone(current.parentPhoneNumber)} />
      <AppInput autoCapitalize="none" disabled={saving} keyboardType="email-address" label="Parent Email" onChangeText={parentEmail => setValue({ ...value, parentEmail })} value={value.parentEmail ?? ''} />
      <AppInput disabled={saving} label="Address" onChangeText={address => setValue({ ...value, address })} value={value.address ?? ''} />
      <AppText variant="caption">Class ID {current.classId} and section ID {current.sectionId} are current placement fields, not an enrolment-history resource.</AppText>
      {error ? <InlineError message={error.message} /> : null}
      <AppButton disabled={!value.name?.trim()} loading={saving} onPress={async () => { if (await update(route.params.studentId, value)) { setValue(null); navigation.goBack(); } }} title="Save Changes" />
    </View> : null}
  </View></AppScreen>;
}

const styles = StyleSheet.create({ content: { paddingBottom: 32 }, fields: { gap: 14 }, maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' } });
