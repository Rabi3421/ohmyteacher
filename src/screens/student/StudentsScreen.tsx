import React, { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/common/AppButton';
import { AppSearchInput } from '../../components/common/AppSearchInput';
import { AppText } from '../../components/common/AppText';
import { AppIcon } from '../../components/icons/AppIcon';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { CurrentStudentCard } from '../../components/student/CurrentStudentComponents';
import { TAB_BAR_HEIGHT } from '../../components/layout/AppBottomTabBar';
import { ROUTES } from '../../constants/routes';
import { useDebounce } from '../../hooks/useDebounce';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTabFocus } from '../../hooks/useTabFocus';
import { BACKEND_STUDENT_STATUSES, type BackendStudentStatus } from '../../models/currentStudent';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useCurrentStudentStore } from '../../store';

const STATUS_LABELS: Record<BackendStudentStatus | 'ALL', string> = {
  ALL: 'All',
  active: 'Active',
  inactive: 'Inactive',
  transferred: 'Transferred',
  dropped: 'Dropped',
  passed_out: 'Passed Out',
};

export function StudentsScreen({ navigation, route }: RoleScreenProps<'Students'>) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const items = useCurrentStudentStore(state => state.items);
  const isLoading = useCurrentStudentStore(state => state.isLoading);
  const error = useCurrentStudentStore(state => state.error);
  const setQuery = useCurrentStudentStore(state => state.setQuery);
  const load = useCurrentStudentStore(state => state.loadStudents);
  useTabFocus('academics');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<BackendStudentStatus | undefined>();
  const debounced = useDebounce(search, 350);

  useEffect(() => {
    setQuery({ search: debounced, status });
    load().catch(() => undefined);
  }, [debounced, load, setQuery, status]);

  const allStatuses: Array<BackendStudentStatus | 'ALL'> = ['ALL', ...BACKEND_STUDENT_STATUSES];

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border, paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityLabel="Go back"
            hitSlop={8}
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.5 : 1 }]}
          >
            <AppIcon color={theme.colors.textPrimary} name="chevron-left" size={24} />
          </Pressable>
          <View style={styles.headerTitle}>
            <AppText style={{ color: theme.colors.textPrimary }} variant="title">Students</AppText>
            <AppText style={{ color: theme.colors.textSecondary }} variant="caption">
              {isLoading ? 'Loading…' : `${items.length} student${items.length !== 1 ? 's' : ''}`}
            </AppText>
          </View>
          <AppButton
            onPress={() => navigation.navigate(ROUTES.CREATE_STUDENT, { schoolId: route.params.schoolId })}
            title="Admit"
            variant="primary"
          />
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <AppSearchInput
            onChangeText={setSearch}
            placeholder="Search by name, admission no., or parent phone"
            value={search}
          />
        </View>

        {/* Status Filter Chips */}
        <ScrollView
          contentContainerStyle={styles.filterRow}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {allStatuses.map(s => {
            const isActive = s === 'ALL' ? !status : status === s;
            return (
              <Pressable
                key={s}
                onPress={() => setStatus(s === 'ALL' ? undefined : s as BackendStudentStatus)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
                    borderColor: isActive ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <AppText
                  style={{ color: isActive ? '#fff' : theme.colors.textSecondary }}
                  variant="caption"
                >
                  {STATUS_LABELS[s]}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 16 }]}
        refreshControl={
          <RefreshControl colors={['#1478F2']} onRefresh={load} refreshing={isLoading} tintColor="#1478F2" />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading && !items.length ? (
          <LoadingView message="Loading students…" />
        ) : error && !items.length ? (
          <ErrorState message={error.message} onRetry={load} />
        ) : !items.length ? (
          <EmptyState
            actionLabel="Admit Student"
            description="No students found for the selected filters."
            onAction={() => navigation.navigate(ROUTES.CREATE_STUDENT, { schoolId: route.params.schoolId })}
            title="No students found"
          />
        ) : (
          items.map(item => (
            <CurrentStudentCard
              item={item}
              key={item.id}
              onPress={() => navigation.navigate(ROUTES.STUDENT_DETAILS, { schoolId: route.params.schoolId, studentId: item.id })}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    marginLeft: -4,
    width: 40,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  headerTitle: {
    flex: 1,
  },
  list: {
    gap: 10,
    padding: 16,
  },
  root: {
    flex: 1,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
});
