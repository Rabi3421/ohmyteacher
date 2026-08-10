import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AcademicContextBar } from '../../components/academic/AcademicContextBar';
import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppSearchInput } from '../../components/common/AppSearchInput';
import { AppText } from '../../components/common/AppText';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { useAcademicAccess } from '../../hooks/useAcademicAccess';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useClassContextRedirect } from '../../hooks/useClassContextRedirect';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAcademicStore, useCurrentStaffStore } from '../../store';

export function ClassSubjectAssignmentScreen({ navigation, route }: RoleScreenProps<'ClassSubjectAssignment'>) {
  const theme = useAppTheme();
  const { classId, schoolId, branchId, academicSessionId } = route.params;
  const { canAssign } = useAcademicAccess(schoolId, branchId);
  const context = useAcademicStore(state => state.context);
  const currentClass = useAcademicStore(state => state.currentClass);
  const subjects = useAcademicStore(state => state.subjects);
  const assignments = useAcademicStore(state => state.assignments);
  const error = useAcademicStore(state => state.error);
  const isLoading = useAcademicStore(state => state.isLoading);
  const isSaving = useAcademicStore(state => state.isSaving);
  const loadClass = useAcademicStore(state => state.loadClass);
  const loadSubjects = useAcademicStore(state => state.loadSubjects);
  const loadAssignments = useAcademicStore(state => state.loadAssignments);
  const updateAssignments = useAcademicStore(state => state.updateAssignments);
  const setSubjectQuery = useAcademicStore(state => state.setSubjectQuery);
  const staff = useCurrentStaffStore(state => state.staff.items);
  const isLoadingStaff = useCurrentStaffStore(state => state.isLoading);
  const staffError = useCurrentStaffStore(state => state.error);
  const loadStaff = useCurrentStaffStore(state => state.loadStaff);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');

  useClassContextRedirect(navigation, { academicSessionId, branchId, schoolId });

  useEffect(() => {
    if (context?.schoolId === schoolId && context.branchId === branchId && context.academicSessionId === academicSessionId) {
      setSubjectQuery({ page: 1, pageSize: 100, search: undefined, status: 'ALL', type: 'ALL' });
      Promise.all([
        loadClass(classId),
        loadSubjects(schoolId),
        loadAssignments(classId),
        loadStaff(schoolId),
      ]).catch(() => undefined);
    }
  }, [academicSessionId, branchId, classId, context, loadAssignments, loadClass, loadStaff, loadSubjects, schoolId, setSubjectQuery]);

  useEffect(() => {
    setSelected(Object.fromEntries(assignments.filter(item => item.teacherId).map(item => [item.subjectId, item.teacherId!])))
  }, [assignments]);

  const teachers = useMemo(() => staff.filter(item => item.role === 'TEACHER' && item.status === 'ACTIVE' && item.branch.id === branchId), [branchId, staff]);
  const visibleSubjects = useMemo(() => {
    const value = search.trim().toLowerCase();
    return subjects.items.filter(subject => !value || subject.name.toLowerCase().includes(value) || subject.code.toLowerCase().includes(value));
  }, [search, subjects.items]);

  const refresh = async () => {
    await Promise.all([loadSubjects(schoolId), loadAssignments(classId), loadStaff(schoolId)]);
  };

  return (
    <AppScreen contentContainerStyle={styles.content} onRefresh={refresh} refreshing={isLoading || isLoadingStaff} scrollable testID="class-subject-assignment-screen">
      <View style={styles.maxWidth}>
        <AppHeader includeSafeArea={false} onBackPress={navigation.goBack} subtitle={currentClass?.id === classId ? `${currentClass.name} · ${Object.keys(selected).length} assigned` : undefined} title={canAssign ? 'Teacher Assignments' : 'Class Teachers'} />
        <AcademicContextBar initialBranchId={branchId} initialSessionId={academicSessionId} schoolId={schoolId} />
        <AppText color={theme.colors.textSecondary} style={styles.helper}>Django allows one teacher for each class-and-subject pair. Only active teachers from this class’s branch are eligible.</AppText>
        <AppSearchInput onChangeText={setSearch} placeholder="Search subjects" value={search} />
        {(isLoading || isLoadingStaff) && subjects.items.length === 0 ? (
          <LoadingView message="Loading teacher assignments…" />
        ) : (error || staffError) && subjects.items.length === 0 ? (
          <ErrorState message={(error ?? staffError)?.message ?? 'Assignments are unavailable.'} onRetry={refresh} />
        ) : visibleSubjects.length === 0 ? (
          <EmptyState description="Create a school subject before assigning a teacher." title="No subjects available" />
        ) : teachers.length === 0 ? (
          <EmptyState description="This branch has no active Teacher user. Create or reactivate one in Staff Users first." title="No eligible teachers" />
        ) : (
          <View style={styles.list}>
            {visibleSubjects.map(subject => {
              const selectedTeacher = teachers.find(item => item.id === selected[subject.id]);
              return (
                <AppCard key={subject.id} variant="outlined">
                  <View style={styles.row}>
                    <View style={styles.copy}>
                      <AppText variant="title">{subject.name}</AppText>
                      {subject.code ? <AppText color={theme.colors.textSecondary} variant="caption">{subject.code}</AppText> : null}
                    </View>
                    <AppBadge label={selectedTeacher ? 'Assigned' : 'Unassigned'} status={selectedTeacher ? 'active' : 'draft'} />
                  </View>
                  <View style={styles.teachers}>
                    {teachers.map(teacher => (
                      <AppButton disabled={!canAssign || subject.status !== 'ACTIVE'} key={teacher.id} onPress={() => setSelected(current => ({ ...current, [subject.id]: teacher.id }))} title={teacher.name} variant={selected[subject.id] === teacher.id ? 'primary' : 'outline'} />
                    ))}
                    {selectedTeacher && canAssign ? <AppButton onPress={() => setSelected(current => { const next = { ...current }; delete next[subject.id]; return next; })} title="Unassign" variant="danger" /> : null}
                  </View>
                </AppCard>
              );
            })}
          </View>
        )}
        {error || staffError ? <InlineError message={(error ?? staffError)!.message} /> : null}
        {canAssign && teachers.length > 0 ? (
          <AppButton disabled={currentClass?.status !== 'ACTIVE'} loading={isSaving} onPress={() => updateAssignments(classId, Object.entries(selected).map(([subjectId, teacherId]) => ({ subjectId, teacherId })))} style={styles.submit} title="Save Teacher Assignments" />
        ) : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 }, copy: { flex: 1 }, helper: { marginBottom: 14 }, list: { gap: 10, marginTop: 16 }, maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' }, row: { alignItems: 'center', flexDirection: 'row', gap: 12 }, submit: { marginTop: 20 }, teachers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
});
