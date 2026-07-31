import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AcademicContextBar } from '../../components/academic/AcademicContextBar';
import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppSearchInput } from '../../components/common/AppSearchInput';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useAcademicAccess } from '../../hooks/useAcademicAccess';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDebounce } from '../../hooks/useDebounce';
import type { Subject, SubjectType } from '../../models/academic';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAcademicStore } from '../../store';

export function SubjectsScreen({
  navigation,
  route,
}: RoleScreenProps<'Subjects'>) {
  const theme = useAppTheme();
  const { schoolId } = route.params;
  const { canManageSubjects } = useAcademicAccess(
    schoolId,
    route.params.branchId,
  );
  const subjects = useAcademicStore(state => state.subjects);
  const error = useAcademicStore(state => state.error);
  const isLoading = useAcademicStore(state => state.isLoading);
  const isSaving = useAcademicStore(state => state.isSaving);
  const loadSubjects = useAcademicStore(state => state.loadSubjects);
  const setQuery = useAcademicStore(state => state.setSubjectQuery);
  const updateStatus = useAcademicStore(state => state.updateSubjectStatus);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [type, setType] = useState<SubjectType | 'ALL'>('ALL');
  const [pending, setPending] = useState<Subject | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setQuery({ page: 1, search: debouncedSearch, status, type });
    loadSubjects(schoolId).catch(() => undefined);
  }, [
    debouncedSearch,
    loadSubjects,
    schoolId,
    setQuery,
    status,
    type,
  ]);

  return (
    <>
      <AppScreen
        contentContainerStyle={styles.content}
        onRefresh={() => loadSubjects(schoolId)}
        refreshing={isLoading}
        scrollable
        testID="subjects-screen"
      >
        <View style={styles.maxWidth}>
          <AppHeader
            includeSafeArea={false}
            onBackPress={navigation.goBack}
            rightActions={
              canManageSubjects ? (
                <AppButton
                  onPress={() =>
                    navigation.navigate(ROUTES.CREATE_SUBJECT, { schoolId })
                  }
                  title="Add"
                />
              ) : null
            }
            subtitle={`${subjects.totalItems} school-wide subjects`}
            title="Subject Catalog"
          />
          <AcademicContextBar
            initialBranchId={route.params.branchId}
            initialSessionId={route.params.academicSessionId}
            schoolId={schoolId}
          />
          <AppSearchInput
            onChangeText={setSearch}
            placeholder="Search subject name or code"
            value={search}
          />
          <AppText style={styles.label} variant="caption">
            Status
          </AppText>
          <View style={styles.filters}>
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(option => (
              <AppButton
                key={option}
                onPress={() => setStatus(option)}
                title={
                  option === 'ALL'
                    ? 'All'
                    : option[0] + option.slice(1).toLowerCase()
                }
                variant={status === option ? 'primary' : 'outline'}
              />
            ))}
          </View>
          <AppText style={styles.label} variant="caption">
            Type
          </AppText>
          <View style={styles.filters}>
            {(['ALL', 'CORE', 'ELECTIVE', 'OPTIONAL'] as const).map(option => (
              <AppButton
                key={option}
                onPress={() => setType(option)}
                title={
                  option === 'ALL'
                    ? 'All'
                    : option[0] + option.slice(1).toLowerCase()
                }
                variant={type === option ? 'primary' : 'outline'}
              />
            ))}
          </View>
          {isLoading && subjects.items.length === 0 ? (
            <LoadingView message="Loading subjects…" />
          ) : error && subjects.items.length === 0 ? (
            <ErrorState
              message={error.message}
              onRetry={() => loadSubjects(schoolId)}
            />
          ) : subjects.items.length === 0 ? (
            <EmptyState
              actionLabel={canManageSubjects ? 'Create Subject' : undefined}
              description="No subjects match these filters."
              onAction={
                canManageSubjects
                  ? () =>
                      navigation.navigate(ROUTES.CREATE_SUBJECT, { schoolId })
                  : undefined
              }
              title="No subjects found"
            />
          ) : (
            <View style={styles.list}>
              {subjects.items.map(item => (
                <AppCard
                  key={item.id}
                  onPress={() =>
                    navigation.navigate(ROUTES.SUBJECT_DETAILS, {
                      schoolId,
                      subjectId: item.id,
                    })
                  }
                  variant="elevated"
                >
                  <View style={styles.row}>
                    <View style={styles.copy}>
                      <AppText variant="title">
                        {item.displayOrder}. {item.name}
                      </AppText>
                      <AppText color={theme.colors.primary} variant="caption">
                        {item.code} · {item.type}
                      </AppText>
                    </View>
                    <AppBadge
                      status={
                        item.status === 'ACTIVE' ? 'active' : 'inactive'
                      }
                    />
                  </View>
                  <AppText
                    color={theme.colors.textSecondary}
                    style={styles.meta}
                  >
                    {item.activeAssignmentCount} active class assignments
                  </AppText>
                  {canManageSubjects ? (
                    <View style={styles.actions}>
                      <AppButton
                        onPress={() =>
                          navigation.navigate(ROUTES.EDIT_SUBJECT, {
                            schoolId,
                            subjectId: item.id,
                          })
                        }
                        title="Edit"
                        variant="outline"
                      />
                      <AppButton
                        onPress={() =>
                          item.status === 'ACTIVE'
                            ? setPending(item)
                            : updateStatus(schoolId, item.id, 'ACTIVE')
                        }
                        title={
                          item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'
                        }
                        variant={
                          item.status === 'ACTIVE' ? 'danger' : 'outline'
                        }
                      />
                    </View>
                  ) : null}
                </AppCard>
              ))}
            </View>
          )}
          {error && subjects.items.length > 0 ? (
            <InlineError message={error.message} />
          ) : null}
        </View>
      </AppScreen>
      <ConfirmationDialog
        confirmLabel="Deactivate"
        destructive
        loading={isSaving}
        message="A subject with active class assignments cannot be deactivated. Assignment history is preserved."
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          if (
            pending &&
            (await updateStatus(schoolId, pending.id, 'INACTIVE'))
          ) {
            setPending(null);
          }
        }}
        title={`Deactivate ${pending?.name ?? 'subject'}?`}
        visible={Boolean(pending)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  content: { paddingBottom: 32 },
  copy: { flex: 1 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  label: { marginBottom: 6, marginTop: 14 },
  list: { gap: 12, marginTop: 16 },
  maxWidth: { alignSelf: 'center', maxWidth: 760, width: '100%' },
  meta: { marginTop: 10 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12 },
});
