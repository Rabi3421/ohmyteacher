import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppSearchInput } from '../../components/common/AppSearchInput';
import { AppText } from '../../components/common/AppText';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDebounce } from '../../hooks/useDebounce';
import type { BranchStatus } from '../../models/organization';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore, useOrganizationStore } from '../../store';
import { formatDisplayDate } from '../../utils/date';
import { canCreateBranch } from '../../utils/organizationPermissions';

type Filter = BranchStatus | 'ALL';

export function SchoolBranchesScreen({
  navigation,
  route,
}: RoleScreenProps<'SchoolBranches'>) {
  const theme = useAppTheme();
  const schoolId = route.params.schoolId;
  const membership = useAuthStore(state => state.activeMembership);
  const branches = useOrganizationStore(state => state.branches);
  const isLoading = useOrganizationStore(state => state.isLoadingBranches);
  const error = useOrganizationStore(state => state.error);
  const setQuery = useOrganizationStore(state => state.setBranchQuery);
  const loadBranches = useOrganizationStore(state => state.loadBranches);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Filter>('ALL');
  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    setQuery({ page: 1, search: debouncedSearch, status });
    loadBranches(schoolId).catch(() => undefined);
  }, [debouncedSearch, loadBranches, schoolId, setQuery, status]);

  const canCreate = membership
    ? canCreateBranch(membership.role, membership, schoolId)
    : false;

  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      onRefresh={() => loadBranches(schoolId)}
      refreshing={isLoading}
      scrollable
      testID="branches-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          rightActions={
            canCreate ? (
              <AppButton
                onPress={() =>
                  navigation.navigate(ROUTES.CREATE_BRANCH, { schoolId })
                }
                title="Add"
              />
            ) : null
          }
          title="Branches"
        />
        <AppSearchInput
          onChangeText={setSearch}
          placeholder="Search branches"
          style={styles.search}
          value={search}
        />
        <View style={styles.filters}>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(filter => (
            <AppButton
              key={filter}
              onPress={() => setStatus(filter)}
              style={styles.filter}
              title={
                filter === 'ALL'
                  ? 'All'
                  : filter[0] + filter.slice(1).toLowerCase()
              }
              variant={status === filter ? 'primary' : 'outline'}
            />
          ))}
        </View>
        {isLoading && branches.items.length === 0 ? (
          <LoadingView message="Loading branches…" />
        ) : error ? (
          <ErrorState
            message={error.message}
            onRetry={() => loadBranches(schoolId)}
          />
        ) : branches.items.length === 0 ? (
          <EmptyState
            actionLabel={canCreate ? 'Add Branch' : undefined}
            description="No branches match the current filter."
            onAction={
              canCreate
                ? () =>
                    navigation.navigate(ROUTES.CREATE_BRANCH, { schoolId })
                : undefined
            }
            title="No branches found"
          />
        ) : (
          <View style={styles.list}>
            {branches.items.map(branch => (
              <AppCard
                key={branch.id}
                onPress={() =>
                  navigation.navigate(ROUTES.BRANCH_DETAILS, {
                    branchId: branch.id,
                    schoolId,
                  })
                }
                variant="elevated"
              >
                <View style={styles.titleRow}>
                  <View style={styles.copy}>
                    <AppText variant="title">{branch.name}</AppText>
                    <AppText color={theme.colors.primary} variant="bodyMedium">
                      {branch.code}
                    </AppText>
                  </View>
                  <AppBadge
                    status={branch.status === 'ACTIVE' ? 'active' : 'inactive'}
                  />
                </View>
                <AppText color={theme.colors.textSecondary} variant="caption">
                  {branch.mobile} · {branch.address.city}
                </AppText>
                <AppText color={theme.colors.textTertiary} variant="caption">
                  Created {formatDisplayDate(branch.createdAt)}
                  {branch.isMainBranch ? ' · Main Branch' : ''}
                </AppText>
              </AppCard>
            ))}
          </View>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    marginRight: 8,
  },
  filter: {
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
    maxWidth: 720,
    width: '100%',
  },
  screenContent: {
    paddingBottom: 32,
  },
  search: {
    marginTop: 16,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
  },
});
