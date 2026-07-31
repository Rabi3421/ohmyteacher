import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppAvatar } from '../../components/common/AppAvatar';
import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppScreen } from '../../components/common/AppScreen';
import { AppSearchInput } from '../../components/common/AppSearchInput';
import { AppText } from '../../components/common/AppText';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { AppIcon } from '../../components/icons/AppIcon';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDebounce } from '../../hooks/useDebounce';
import type { SchoolStatus } from '../../models/organization';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useOrganizationStore } from '../../store';
import { formatDisplayDate } from '../../utils/date';

type StatusFilter = SchoolStatus | 'ALL';

export function SuperAdminSchoolsScreen({
  navigation,
}: RoleScreenProps<'Schools'>) {
  const theme = useAppTheme();
  const schools = useOrganizationStore(state => state.schools);
  const isLoading = useOrganizationStore(state => state.isLoadingSchools);
  const error = useOrganizationStore(state => state.error);
  const setQuery = useOrganizationStore(state => state.setSchoolQuery);
  const loadSchools = useOrganizationStore(state => state.loadSchools);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    setQuery({ page: 1, search: debouncedSearch, status });
    loadSchools().catch(() => undefined);
  }, [debouncedSearch, loadSchools, setQuery, status]);

  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      onRefresh={loadSchools}
      refreshing={isLoading}
      scrollable
      testID="schools-screen"
    >
      <View style={styles.maxWidth}>
        <View style={styles.topRow}>
          <SectionHeader
            subtitle={`${schools.totalItems} schools`}
            title="Schools"
          />
          <AppButton
            onPress={() => navigation.navigate(ROUTES.CREATE_SCHOOL)}
            title="Add School"
          />
        </View>
        <AppSearchInput
          onChangeText={setSearch}
          placeholder="Search name, code, or mobile"
          style={styles.search}
          value={search}
        />
        <View style={styles.filters}>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(filter => (
            <AppButton
              key={filter}
              onPress={() => setStatus(filter)}
              style={styles.filterButton}
              title={
                filter === 'ALL'
                  ? 'All'
                  : filter[0] + filter.slice(1).toLowerCase()
              }
              variant={status === filter ? 'primary' : 'outline'}
            />
          ))}
        </View>

        {isLoading && schools.items.length === 0 ? (
          <LoadingView message="Loading schools…" />
        ) : error ? (
          <ErrorState message={error.message} onRetry={loadSchools} />
        ) : schools.items.length === 0 ? (
          <EmptyState
            actionLabel="Create School"
            description="No schools match the current search and filter."
            onAction={() => navigation.navigate(ROUTES.CREATE_SCHOOL)}
            title="No schools found"
          />
        ) : (
          <View style={styles.list}>
            {schools.items.map(school => (
              <AppCard
                accessibilityLabel={`Open ${school.name}`}
                key={school.id}
                onPress={() =>
                  navigation.navigate(ROUTES.SCHOOL_DETAILS, {
                    schoolId: school.id,
                  })
                }
                variant="elevated"
              >
                <View style={styles.cardRow}>
                  <AppAvatar
                    name={school.name}
                    size={52}
                    source={
                      school.logoUrl ? { uri: school.logoUrl } : undefined
                    }
                  />
                  <View style={styles.cardCopy}>
                    <View style={styles.cardTitleRow}>
                      <AppText
                        numberOfLines={1}
                        style={styles.schoolName}
                        variant="title"
                      >
                        {school.name}
                      </AppText>
                      <AppBadge
                        status={
                          school.status === 'ACTIVE' ? 'active' : 'inactive'
                        }
                      />
                    </View>
                    <AppText color={theme.colors.primary} variant="bodyMedium">
                      {school.code}
                    </AppText>
                    <AppText
                      color={theme.colors.textSecondary}
                      variant="caption"
                    >
                      {school.branchCount} branches ·{' '}
                      {school.activeSession?.name ?? 'No active session'}
                    </AppText>
                    <AppText
                      color={theme.colors.textSecondary}
                      variant="caption"
                    >
                      {school.schoolAdmin?.name ?? 'Admin pending'} ·{' '}
                      {school.mobile}
                    </AppText>
                    <AppText
                      color={theme.colors.textTertiary}
                      variant="caption"
                    >
                      Created {formatDisplayDate(school.createdAt)}
                    </AppText>
                  </View>
                  <AppIcon
                    color={theme.colors.textSecondary}
                    name="chevron-right"
                    size={theme.iconSizes.md}
                  />
                </View>
              </AppCard>
            ))}
          </View>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  cardCopy: {
    flex: 1,
    marginHorizontal: 12,
    minWidth: 0,
  },
  cardRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  cardTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  filterButton: {
    minWidth: 92,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  list: {
    gap: 12,
    marginTop: 20,
  },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 760,
    width: '100%',
  },
  schoolName: {
    flex: 1,
    marginRight: 8,
  },
  screenContent: {
    paddingBottom: 32,
  },
  search: {
    marginTop: 20,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: 12,
  },
});
