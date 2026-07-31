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
import { useAcademicStore } from '../../store';

export function ClassSubjectAssignmentScreen({
  navigation,
  route,
}: RoleScreenProps<'ClassSubjectAssignment'>) {
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  useClassContextRedirect(navigation, {
    academicSessionId,
    branchId,
    schoolId,
  });

  useEffect(() => {
    if (
      context?.schoolId === schoolId &&
      context.branchId === branchId &&
      context.academicSessionId === academicSessionId
    ) {
      setSubjectQuery({
        page: 1,
        pageSize: 100,
        search: undefined,
        status: 'ALL',
        type: 'ALL',
      });
      loadClass(classId).catch(() => undefined);
      loadSubjects(schoolId).catch(() => undefined);
      loadAssignments(classId).catch(() => undefined);
    }
  }, [
    academicSessionId,
    branchId,
    classId,
    context,
    loadAssignments,
    loadClass,
    loadSubjects,
    schoolId,
    setSubjectQuery,
  ]);

  useEffect(() => {
    setSelectedIds(
      assignments
        .filter(item => item.status === 'ACTIVE')
        .map(item => item.subjectId),
    );
  }, [assignments]);

  const visibleSubjects = useMemo(() => {
    const term = search.trim().toLowerCase();
    return subjects.items.filter(
      subject =>
        !term ||
        subject.name.toLowerCase().includes(term) ||
        subject.code.toLowerCase().includes(term),
    );
  }, [search, subjects.items]);
  const priorIds = new Set(assignments.map(item => item.subjectId));

  return (
    <AppScreen
      contentContainerStyle={styles.content}
      onRefresh={async () => {
        await Promise.all([
          loadSubjects(schoolId),
          loadAssignments(classId),
        ]);
      }}
      refreshing={isLoading}
      scrollable
      testID="class-subject-assignment-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          subtitle={
            currentClass?.id === classId
              ? `${currentClass.name} · ${selectedIds.length} selected`
              : undefined
          }
          title={canAssign ? 'Assign Subjects' : 'Class Subjects'}
        />
        <AcademicContextBar
          initialBranchId={branchId}
          initialSessionId={academicSessionId}
          schoolId={schoolId}
        />
        <AppSearchInput
          onChangeText={setSearch}
          placeholder="Search the subject catalog"
          value={search}
        />
        {isLoading && subjects.items.length === 0 ? (
          <LoadingView message="Loading subject assignments…" />
        ) : error && subjects.items.length === 0 ? (
          <ErrorState
            message={error.message}
            onRetry={() => loadSubjects(schoolId)}
          />
        ) : visibleSubjects.length === 0 ? (
          <EmptyState
            description="Create an active school subject before assigning it."
            title="No subjects available"
          />
        ) : (
          <View style={styles.list}>
            {visibleSubjects.map(subject => {
              const selected = selectedIds.includes(subject.id);
              const disabled = !canAssign || subject.status !== 'ACTIVE';
              return (
                <AppCard
                  disabled={disabled}
                  key={subject.id}
                  onPress={
                    canAssign
                      ? () =>
                          setSelectedIds(current =>
                            selected
                              ? current.filter(id => id !== subject.id)
                              : [...current, subject.id],
                          )
                      : undefined
                  }
                  style={
                    selected
                      ? [
                          styles.selected,
                          { borderColor: theme.colors.primary },
                        ]
                      : undefined
                  }
                  variant="outlined"
                >
                  <View style={styles.row}>
                    <View style={styles.copy}>
                      <AppText variant="title">{subject.name}</AppText>
                      <AppText
                        color={theme.colors.textSecondary}
                        variant="caption"
                      >
                        {subject.code} · {subject.type}
                        {priorIds.has(subject.id) && !selected
                          ? ' · Previously assigned'
                          : ''}
                      </AppText>
                    </View>
                    <AppBadge
                      label={
                        subject.status !== 'ACTIVE'
                          ? 'Inactive'
                          : selected
                            ? 'Assigned'
                            : 'Available'
                      }
                      status={
                        subject.status !== 'ACTIVE'
                          ? 'inactive'
                          : selected
                            ? 'active'
                            : 'draft'
                      }
                    />
                  </View>
                </AppCard>
              );
            })}
          </View>
        )}
        {error && subjects.items.length > 0 ? (
          <InlineError message={error.message} />
        ) : null}
        {canAssign ? (
          <AppButton
            disabled={currentClass?.status !== 'ACTIVE'}
            loading={isSaving}
            onPress={() => updateAssignments(classId, selectedIds)}
            style={styles.submit}
            title="Save Assignments"
          />
        ) : (
          <AppText
            color={theme.colors.textSecondary}
            style={styles.readOnly}
            variant="caption"
          >
            Subject assignments are read-only for this role or session.
          </AppText>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  copy: { flex: 1 },
  list: { gap: 10, marginTop: 16 },
  maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' },
  readOnly: { marginTop: 18, textAlign: 'center' },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  selected: { borderWidth: 2 },
  submit: { marginTop: 20 },
});
