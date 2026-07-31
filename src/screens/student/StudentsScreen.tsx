import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import {
  StudentListItem,
  StudentSearchField,
} from '../../components/student/StudentComponents';
import { ROUTES } from '../../constants/routes';
import { useDebounce } from '../../hooks/useDebounce';
import { useStudentAccess } from '../../hooks/useStudentAccess';
import type { StudentProfileStatus } from '../../models/student';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useStudentStore } from '../../store';

export function StudentsScreen({
  navigation,
  route,
}: RoleScreenProps<'Students'>) {
  const { schoolId, branchId } = route.params;
  const { canCreate } = useStudentAccess(schoolId, branchId);
  const students = useStudentStore(state => state.students);
  const isLoading = useStudentStore(state => state.isLoadingStudents);
  const error = useStudentStore(state => state.error);
  const setSchool = useStudentStore(state => state.setSchoolContext);
  const setQuery = useStudentStore(state => state.setQuery);
  const loadStudents = useStudentStore(state => state.loadStudents);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StudentProfileStatus | 'ALL'>('ALL');
  const debounced = useDebounce(search, 350);

  useEffect(() => {
    setSchool(schoolId);
  }, [schoolId, setSchool]);

  useEffect(() => {
    setQuery({
      branchId: branchId ?? 'ALL',
      page: 1,
      search: debounced,
      studentStatus: status,
    });
    loadStudents(schoolId).catch(() => undefined);
  }, [branchId, debounced, loadStudents, schoolId, setQuery, status]);

  return (
    <AppScreen
      contentContainerStyle={styles.content}
      onRefresh={() => loadStudents(schoolId)}
      refreshing={isLoading}
      scrollable
      testID="students-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          rightActions={
            canCreate ? (
              <AppButton
                onPress={() =>
                  navigation.navigate(ROUTES.CREATE_STUDENT, { schoolId })
                }
                title="Add"
              />
            ) : null
          }
          subtitle={`${students.totalItems} student profiles`}
          title="Students"
        />
        <StudentSearchField onChangeText={setSearch} value={search} />
        <AppText style={styles.filterLabel} variant="caption">
          Student status
        </AppText>
        <View style={styles.filters}>
          {(
            ['ALL', 'ACTIVE', 'INACTIVE', 'WITHDRAWN', 'PASSED_OUT'] as const
          ).map(option => (
            <AppButton
              key={option}
              onPress={() => setStatus(option)}
              title={option.replace('_', ' ')}
              variant={status === option ? 'primary' : 'outline'}
            />
          ))}
        </View>
        {isLoading && students.items.length === 0 ? (
          <LoadingView message="Loading students…" />
        ) : error && students.items.length === 0 ? (
          <ErrorState
            message={error.message}
            onRetry={() => loadStudents(schoolId)}
          />
        ) : students.items.length === 0 ? (
          <EmptyState
            actionLabel={canCreate ? 'Add Student' : undefined}
            description="No students match this search and filter context."
            onAction={
              canCreate
                ? () =>
                    navigation.navigate(ROUTES.CREATE_STUDENT, { schoolId })
                : undefined
            }
            title="No students found"
          />
        ) : (
          <View style={styles.list}>
            {students.items.map(item => (
              <StudentListItem
                item={item}
                key={item.profile.id}
                onPress={() =>
                  navigation.navigate(ROUTES.STUDENT_DETAILS, {
                    schoolId,
                    studentId: item.profile.id,
                  })
                }
              />
            ))}
          </View>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  filterLabel: { marginBottom: 6, marginTop: 14 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  list: { gap: 12, marginTop: 16 },
  maxWidth: { alignSelf: 'center', maxWidth: 780, width: '100%' },
});
