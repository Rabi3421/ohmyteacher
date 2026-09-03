import React, { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/common/AppButton';
import { AppChoiceChip } from '../../components/common/AppChoiceChip';
import { AppSearchInput } from '../../components/common/AppSearchInput';
import { AppText } from '../../components/common/AppText';
import { AppIcon } from '../../components/icons/AppIcon';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { CurrentStudentCard } from '../../components/student/CurrentStudentComponents';
import { ROUTES } from '../../constants/routes';
import { useDebounce } from '../../hooks/useDebounce';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTabFocus } from '../../hooks/useTabFocus';
import { BACKEND_STUDENT_STATUSES, type BackendStudentStatus } from '../../models/currentStudent';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useCurrentStudentStore } from '../../store';
import { brandGradient } from '../../theme/gradients';

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
      <StatusBar
        backgroundColor={theme.colors.surface}
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
      />

      <View style={[styles.header, { backgroundColor: theme.colors.surface, paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityLabel="Go back"
            hitSlop={8}
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: theme.colors.primarySubtle, opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <AppIcon color={theme.colors.primary} name="chevron-left" size={18} strokeWidth={2.4} />
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
            placeholder="Search students"
            value={search}
          />
        </View>

        {/* Status Filter Chips */}
        <ScrollView
          contentContainerStyle={styles.filterRow}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {allStatuses.map(s => (
            <AppChoiceChip
              key={s}
              label={STATUS_LABELS[s]}
              onPress={() =>
                setStatus(s === 'ALL' ? undefined : (s as BackendStudentStatus))
              }
              selected={s === 'ALL' ? !status : status === s}
            />
          ))}
        </ScrollView>

        <LinearGradient
          colors={[...brandGradient(theme.mode)]}
          end={{ x: 1, y: 0 }}
          start={{ x: 0, y: 0 }}
          style={styles.headerAccent}
        />
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={[styles.list, styles.listBottomPad]}
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
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  header: {
    overflow: 'hidden',
  },
  headerAccent: {
    height: 3,
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
  listBottomPad: {
    paddingBottom: 28,
  },
  root: {
    flex: 1,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
});
