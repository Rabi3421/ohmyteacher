import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AcademicContextBar } from '../../components/academic/AcademicContextBar';
import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppChoiceChip } from '../../components/common/AppChoiceChip';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppSearchInput } from '../../components/common/AppSearchInput';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useAcademicAccess } from '../../hooks/useAcademicAccess';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDebounce } from '../../hooks/useDebounce';
import type { AcademicClass } from '../../models/academic';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAcademicStore } from '../../store';

export function ClassesScreen({
  navigation,
  route,
}: RoleScreenProps<'Classes'>) {
  const theme = useAppTheme();
  const { schoolId, branchId, academicSessionId } = route.params;
  const { canManageClasses } = useAcademicAccess(schoolId, branchId);
  const context = useAcademicStore(state => state.context);
  const classes = useAcademicStore(state => state.classes);
  const isLoading = useAcademicStore(state => state.isLoading);
  const isSaving = useAcademicStore(state => state.isSaving);
  const error = useAcademicStore(state => state.error);
  const loadClasses = useAcademicStore(state => state.loadClasses);
  const setQuery = useAcademicStore(state => state.setClassQuery);
  const updateStatus = useAcademicStore(state => state.updateClassStatus);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [pending, setPending] = useState<AcademicClass | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (context?.schoolId === schoolId) {
      setQuery({ page: 1, search: debouncedSearch, status });
      loadClasses().catch(() => undefined);
    }
  }, [
    context,
    debouncedSearch,
    loadClasses,
    schoolId,
    setQuery,
    status,
  ]);

  const selectedParams = context?.schoolId === schoolId ? context : route.params;

  return (
    <>
      <AppScreen
        contentContainerStyle={styles.content}
        onRefresh={loadClasses}
        refreshing={isLoading}
        scrollable
        testID="classes-screen"
      >
        <View style={styles.maxWidth}>
          <AppHeader
            includeSafeArea={false}
            onBackPress={navigation.goBack}
            rightActions={
              canManageClasses ? (
                <AppButton
                  onPress={() =>
                    navigation.navigate(ROUTES.CREATE_CLASS, selectedParams)
                  }
                  title="Add"
                />
              ) : null
            }
            subtitle={`${classes.totalItems} classes`}
            title="Classes"
          />
          <AcademicContextBar
            initialBranchId={branchId}
            initialSessionId={academicSessionId}
            schoolId={schoolId}
          />
          <AppSearchInput
            onChangeText={setSearch}
            placeholder="Search class name or code"
            value={search}
          />
          <View style={styles.filters}>
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(option => (
              <AppChoiceChip
                key={option}
                onPress={() => setStatus(option)}
                label={
                  option === 'ALL'
                    ? 'All'
                    : option[0] + option.slice(1).toLowerCase()
                }
                selected={status === option}
              />
            ))}
          </View>
          {isLoading && classes.items.length === 0 ? (
            <LoadingView message="Loading classes…" />
          ) : error && classes.items.length === 0 ? (
            <ErrorState message={error.message} onRetry={loadClasses} />
          ) : classes.items.length === 0 ? (
            <EmptyState
              actionLabel={canManageClasses ? 'Create Class' : undefined}
              description="No classes match this academic context and filter."
              onAction={
                canManageClasses
                  ? () =>
                      navigation.navigate(ROUTES.CREATE_CLASS, selectedParams)
                  : undefined
              }
              title="No classes found"
            />
          ) : (
            <View style={styles.list}>
              {classes.items.map(item => (
                <AppCard
                  key={item.id}
                  onPress={() =>
                    navigation.navigate(ROUTES.CLASS_DETAILS, {
                      ...selectedParams,
                      classId: item.id,
                    })
                  }
                  variant="elevated"
                >
                  <View style={styles.row}>
                    <View style={styles.copy}>
                      <AppText variant="title">
                        {item.name}
                      </AppText>
                      <AppText color={theme.colors.primary} variant="caption">Display order {item.displayOrder}</AppText>
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
                    {item.activeSectionCount}/{item.sectionCount} active
                    sections · {item.assignedSubjectCount} assigned subjects
                  </AppText>
                  {canManageClasses ? (
                    <View style={styles.actions}>
                      <AppButton
                        onPress={() =>
                          navigation.navigate(ROUTES.EDIT_CLASS, {
                            ...selectedParams,
                            classId: item.id,
                          })
                        }
                        title="Edit"
                        variant="outline"
                      />
                      <AppButton
                        onPress={() =>
                          item.status === 'ACTIVE'
                            ? setPending(item)
                            : updateStatus(item.id, 'ACTIVE')
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
        </View>
      </AppScreen>
      <ConfirmationDialog
        confirmLabel="Deactivate"
        destructive
        loading={isSaving}
        message="Django keeps sections and teacher assignments when a class is deactivated. New dependent changes remain unavailable until the class is active again."
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          if (pending && (await updateStatus(pending.id, 'INACTIVE'))) {
            setPending(null);
          }
        }}
        title={`Deactivate ${pending?.name ?? 'class'}?`}
        visible={Boolean(pending)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  content: { paddingBottom: 32 },
  copy: { flex: 1 },
  filters: { flexDirection: 'row', gap: 8, marginVertical: 14 },
  list: { gap: 12 },
  maxWidth: { alignSelf: 'center', maxWidth: 760, width: '100%' },
  meta: { marginTop: 10 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12 },
});
