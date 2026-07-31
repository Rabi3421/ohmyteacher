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
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useAcademicAccess } from '../../hooks/useAcademicAccess';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useClassContextRedirect } from '../../hooks/useClassContextRedirect';
import { useDebounce } from '../../hooks/useDebounce';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAcademicStore } from '../../store';

export function SectionsScreen({
  navigation,
  route,
}: RoleScreenProps<'Sections'>) {
  const theme = useAppTheme();
  const { classId, schoolId, branchId, academicSessionId } = route.params;
  const { canManageSections } = useAcademicAccess(schoolId, branchId);
  const context = useAcademicStore(state => state.context);
  const currentClass = useAcademicStore(state => state.currentClass);
  const sections = useAcademicStore(state => state.sections);
  const error = useAcademicStore(state => state.error);
  const isLoading = useAcademicStore(state => state.isLoading);
  const isSaving = useAcademicStore(state => state.isSaving);
  const loadClass = useAcademicStore(state => state.loadClass);
  const loadSections = useAcademicStore(state => state.loadSections);
  const setQuery = useAcademicStore(state => state.setSectionQuery);
  const updateStatus = useAcademicStore(state => state.updateSectionStatus);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const debouncedSearch = useDebounce(search, 300);
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
      setQuery({ page: 1, search: debouncedSearch, status });
      loadClass(classId).catch(() => undefined);
      loadSections(classId).catch(() => undefined);
    }
  }, [
    academicSessionId,
    branchId,
    classId,
    context,
    debouncedSearch,
    loadClass,
    loadSections,
    schoolId,
    setQuery,
    status,
  ]);

  return (
    <AppScreen
      contentContainerStyle={styles.content}
      onRefresh={() => loadSections(classId)}
      refreshing={isLoading}
      scrollable
      testID="sections-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          rightActions={
            canManageSections && currentClass?.status === 'ACTIVE' ? (
              <AppButton
                onPress={() =>
                  navigation.navigate(ROUTES.CREATE_SECTION, route.params)
                }
                title="Add"
              />
            ) : null
          }
          subtitle={currentClass?.id === classId ? currentClass.name : undefined}
          title="Sections"
        />
        <AcademicContextBar
          initialBranchId={branchId}
          initialSessionId={academicSessionId}
          schoolId={schoolId}
        />
        <AppSearchInput
          onChangeText={setSearch}
          placeholder="Search section name or code"
          value={search}
        />
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
        {isLoading && sections.items.length === 0 ? (
          <LoadingView message="Loading sections…" />
        ) : error && sections.items.length === 0 ? (
          <ErrorState
            message={error.message}
            onRetry={() => loadSections(classId)}
          />
        ) : sections.items.length === 0 ? (
          <EmptyState
            actionLabel={
              canManageSections && currentClass?.status === 'ACTIVE'
                ? 'Create Section'
                : undefined
            }
            description="No sections match this class and filter."
            onAction={
              canManageSections && currentClass?.status === 'ACTIVE'
                ? () =>
                    navigation.navigate(ROUTES.CREATE_SECTION, route.params)
                : undefined
            }
            title="No sections found"
          />
        ) : (
          <View style={styles.list}>
            {sections.items.map(item => (
              <AppCard key={item.id} variant="elevated">
                <View style={styles.row}>
                  <View style={styles.copy}>
                    <AppText variant="title">
                      {item.displayOrder}. {item.name}
                    </AppText>
                    <AppText color={theme.colors.primary} variant="caption">
                      {item.code}
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
                  Capacity: {item.capacity ?? 'Not set'}
                </AppText>
                {canManageSections ? (
                  <View style={styles.actions}>
                    <AppButton
                      onPress={() =>
                        navigation.navigate(ROUTES.EDIT_SECTION, {
                          ...route.params,
                          sectionId: item.id,
                        })
                      }
                      title="Edit"
                      variant="outline"
                    />
                    <AppButton
                      disabled={
                        isSaving ||
                        (currentClass?.status !== 'ACTIVE' &&
                          item.status === 'INACTIVE')
                      }
                      onPress={() =>
                        updateStatus(
                          classId,
                          item.id,
                          item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                        )
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
        {error && sections.items.length > 0 ? (
          <InlineError message={error.message} />
        ) : null}
      </View>
    </AppScreen>
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
