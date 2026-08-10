import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppSearchInput } from '../../components/common/AppSearchInput';
import { AppText } from '../../components/common/AppText';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { CurrentStudentCard } from '../../components/student/CurrentStudentComponents';
import { ROUTES } from '../../constants/routes';
import { useDebounce } from '../../hooks/useDebounce';
import { BACKEND_STUDENT_STATUSES, type BackendStudentStatus } from '../../models/currentStudent';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useCurrentStudentStore } from '../../store';

export function StudentsScreen({ navigation, route }: RoleScreenProps<'Students'>) {
  const items = useCurrentStudentStore(state => state.items);
  const isLoading = useCurrentStudentStore(state => state.isLoading);
  const error = useCurrentStudentStore(state => state.error);
  const setQuery = useCurrentStudentStore(state => state.setQuery);
  const load = useCurrentStudentStore(state => state.loadStudents);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<BackendStudentStatus | undefined>();
  const debounced = useDebounce(search, 350);

  useEffect(() => {
    setQuery({ search: debounced, status });
    load().catch(() => undefined);
  }, [debounced, load, setQuery, status]);

  return <AppScreen contentContainerStyle={styles.content} onRefresh={load} refreshing={isLoading} scrollable testID="students-screen">
    <View style={styles.maxWidth}>
      <AppHeader includeSafeArea={false} onBackPress={navigation.goBack} rightActions={<AppButton onPress={() => navigation.navigate(ROUTES.CREATE_STUDENT, { schoolId: route.params.schoolId })} title="Admit" />} subtitle={`${items.length} backend student records`} title="Students" />
      <AppSearchInput onChangeText={setSearch} placeholder="Search name, admission number, or parent phone" value={search} />
      <AppText style={styles.label} variant="caption">Backend status</AppText>
      <View style={styles.filters}>
        <AppButton onPress={() => setStatus(undefined)} title="ALL" variant={!status ? 'primary' : 'outline'} />
        {BACKEND_STUDENT_STATUSES.map(option => <AppButton key={option} onPress={() => setStatus(option)} title={option.replace('_', ' ')} variant={status === option ? 'primary' : 'outline'} />)}
      </View>
      {isLoading && !items.length ? <LoadingView message="Loading students…" /> : error && !items.length ? <ErrorState message={error.message} onRetry={load} /> : !items.length ? <EmptyState actionLabel="Admit Student" description="No student matches the confirmed backend filters." onAction={() => navigation.navigate(ROUTES.CREATE_STUDENT, { schoolId: route.params.schoolId })} title="No students found" /> : <View style={styles.list}>{items.map(item => <CurrentStudentCard item={item} key={item.id} onPress={() => navigation.navigate(ROUTES.STUDENT_DETAILS, { schoolId: route.params.schoolId, studentId: item.id })} />)}</View>}
    </View>
  </AppScreen>;
}

const styles = StyleSheet.create({ content: { paddingBottom: 32 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, label: { marginBottom: 6, marginTop: 14 }, list: { gap: 12, marginTop: 16 }, maxWidth: { alignSelf: 'center', maxWidth: 780, width: '100%' } });
