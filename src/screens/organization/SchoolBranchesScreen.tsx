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
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDebounce } from '../../hooks/useDebounce';
import type { OrganizationBranchStatus } from '../../models/currentOrganization';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore, useCurrentOrganizationStore } from '../../store';
import { formatDisplayDate } from '../../utils/date';

type Filter = OrganizationBranchStatus | 'ALL';

function maskPhone(phone: string): string {
  if (!phone) return 'No phone';
  return phone.length <= 4 ? '••••' : `••••••${phone.slice(-4)}`;
}

export function SchoolBranchesScreen({
  navigation,
  route,
}: RoleScreenProps<'SchoolBranches'>) {
  const theme = useAppTheme();
  const schoolId = route.params.schoolId;
  const membership = useAuthStore(state => state.activeMembership);
  const branches = useCurrentOrganizationStore(state => state.branches);
  const isLoading = useCurrentOrganizationStore(state => state.isLoadingBranches);
  const error = useCurrentOrganizationStore(state => state.branchError);
  const setQuery = useCurrentOrganizationStore(state => state.setBranchQuery);
  const loadBranches = useCurrentOrganizationStore(state => state.loadBranches);
  const cancelRequest = useCurrentOrganizationStore(state => state.cancelBranchRequest);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Filter>('ALL');
  const debouncedSearch = useDebounce(search, 350);
  const authorized =
    membership?.schoolId === schoolId &&
    ['SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(membership.role);

  useEffect(() => {
    if (!authorized) return;
    loadBranches(schoolId).catch(() => undefined);
    return cancelRequest;
  }, [authorized, cancelRequest, loadBranches, schoolId]);

  useEffect(() => {
    setQuery({ search: debouncedSearch, status });
  }, [debouncedSearch, setQuery, status]);

  if (!authorized) {
    return <ErrorState message="You cannot view branches for this school." title="Access denied" />;
  }

  const canCreate = membership.role === 'SCHOOL_ADMIN';
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
          rightActions={canCreate ? (
            <AppButton onPress={() => navigation.navigate(ROUTES.CREATE_BRANCH, { schoolId })} title="Add" />
          ) : null}
          title="Branches"
        />
        <AppSearchInput onChangeText={setSearch} placeholder="Search loaded branches" style={styles.search} value={search} />
        <AppText color={theme.colors.textTertiary} style={styles.disclosure} variant="caption">
          Search and status filters are client-side because Django exposes no branch query parameters.
        </AppText>
        <View style={styles.filters}>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(filter => (
            <AppButton
              key={filter}
              onPress={() => setStatus(filter)}
              style={styles.filter}
              title={filter === 'ALL' ? 'All' : filter[0] + filter.slice(1).toLowerCase()}
              variant={status === filter ? 'primary' : 'outline'}
            />
          ))}
        </View>
        {branches.pagination ? (
          <InlineError
            message={`The backend returned a future paginated envelope (${branches.totalItems} total). Only the returned page is shown.`}
            style={styles.disclosure}
          />
        ) : null}
        {isLoading && branches.items.length === 0 ? (
          <LoadingView message="Loading branches…" />
        ) : error && branches.items.length === 0 ? (
          <ErrorState message={error.message} onRetry={() => loadBranches(schoolId)} title={error.status === 403 ? 'Branch access denied' : error.status === 404 ? 'Branches unavailable' : undefined} />
        ) : branches.items.length === 0 ? (
          <EmptyState
            actionLabel={canCreate ? 'Add Branch' : undefined}
            description="No live branches match the current local filter."
            onAction={canCreate ? () => navigation.navigate(ROUTES.CREATE_BRANCH, { schoolId }) : undefined}
            title="No branches found"
          />
        ) : (
          <View style={styles.list}>
            {error ? <InlineError message={error.message} /> : null}
            {branches.items.map(branch => (
              <AppCard
                key={branch.id}
                onPress={() => navigation.navigate(ROUTES.BRANCH_DETAILS, { branchId: branch.id, schoolId })}
                variant="elevated"
              >
                <View style={styles.titleRow}>
                  <View style={styles.copy}>
                    <AppText variant="title">{branch.name}</AppText>
                    <AppText color={theme.colors.primary} variant="bodyMedium">{branch.code}</AppText>
                  </View>
                  <AppBadge status={branch.status === 'ACTIVE' ? 'active' : 'inactive'} />
                </View>
                <AppText color={theme.colors.textSecondary} variant="caption">
                  {maskPhone(branch.phone)} · {branch.address || 'No address'}
                </AppText>
                <AppText color={theme.colors.textTertiary} variant="caption">
                  Created {formatDisplayDate(branch.createdAt)}
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
  copy: { flex: 1, marginRight: 8 },
  disclosure: { marginTop: 8 },
  filter: { minWidth: 92 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  list: { gap: 12, marginTop: 20 },
  maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' },
  screenContent: { paddingBottom: 32 },
  search: { marginTop: 16 },
  titleRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 8 },
});
