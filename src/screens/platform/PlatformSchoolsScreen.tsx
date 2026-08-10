import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppScreen } from '../../components/common/AppScreen';
import { AppSearchInput } from '../../components/common/AppSearchInput';
import { AppText } from '../../components/common/AppText';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDebounce } from '../../hooks/useDebounce';
import type { PlatformSchoolStatus } from '../../models/platform';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore, usePlatformStore } from '../../store';
import { formatDisplayDate } from '../../utils/date';

type StatusFilter = PlatformSchoolStatus | 'ALL';

function maskedPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits ? `••••••${digits.slice(-4)}` : 'No phone';
}

export function PlatformSchoolsScreen({
  navigation,
}: RoleScreenProps<'Schools'>) {
  const theme = useAppTheme();
  const isSuperAdmin = useAuthStore(
    state => state.activeMembership?.role === 'SUPER_ADMIN',
  );
  const schools = usePlatformStore(state => state.schools);
  const allSchools = usePlatformStore(state => state.allSchools);
  const schoolTotalItems = usePlatformStore(state => state.schoolTotalItems);
  const isLoading = usePlatformStore(state => state.isLoadingSchools);
  const error = usePlatformStore(state => state.listError);
  const paginationAvailable = usePlatformStore(
    state => state.paginationAvailable,
  );
  const setQuery = usePlatformStore(state => state.setSchoolQuery);
  const loadSchools = usePlatformStore(state => state.loadSchools);
  const cancelSchoolListRequest = usePlatformStore(
    state => state.cancelSchoolListRequest,
  );
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    if (isSuperAdmin) loadSchools().catch(() => undefined);
    return cancelSchoolListRequest;
  }, [cancelSchoolListRequest, isSuperAdmin, loadSchools]);

  useEffect(() => {
    setQuery({ search: debouncedSearch, status });
  }, [debouncedSearch, setQuery, status]);

  if (!isSuperAdmin) {
    return (
      <AppScreen testID="platform-access-denied-screen">
        <ErrorState
          message="Only a verified Super Admin can access platform schools."
          title="Platform access denied"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      onRefresh={loadSchools}
      refreshing={isLoading}
      scrollable
      testID="platform-schools-screen"
    >
      <View style={styles.maxWidth}>
        <View style={styles.topRow}>
          <SectionHeader
            subtitle={
              paginationAvailable
                ? `${schools.length} shown · ${schoolTotalItems} total`
                : `${schools.length} of ${allSchools.length} schools`
            }
            title="Platform Schools"
          />
          <AppButton
            onPress={() => navigation.navigate(ROUTES.CREATE_SCHOOL)}
            title="Add School"
          />
        </View>
        <AppSearchInput
          onChangeText={setSearch}
          placeholder="Search name, phone, email, or address"
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
        <AppText
          color={theme.colors.textSecondary}
          style={styles.filterNote}
          variant="caption"
        >
          Search and status filtering are applied locally because the current
          Django school-list endpoint has no query parameters.
        </AppText>
        {paginationAvailable ? (
          <AppText color={theme.colors.info} style={styles.filterNote}>
            The server returned a paginated response. This screen displays the
            returned page without inventing additional results.
          </AppText>
        ) : null}

        {isLoading && allSchools.length === 0 ? (
          <LoadingView message="Loading live schools…" />
        ) : error ? (
          <ErrorState
            message={error.message}
            onRetry={loadSchools}
            title={
              error.status === 403
                ? 'Platform permission denied'
                : 'School list unavailable'
            }
          />
        ) : schools.length === 0 ? (
          <EmptyState
            actionLabel="Create School"
            description="No live schools match the current search and filter."
            onAction={() => navigation.navigate(ROUTES.CREATE_SCHOOL)}
            title="No schools found"
          />
        ) : (
          <View style={styles.list}>
            {schools.map(school => (
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
                <View style={styles.cardTitleRow}>
                  <AppText
                    numberOfLines={1}
                    style={styles.schoolName}
                    variant="title"
                  >
                    {school.name}
                  </AppText>
                  <AppBadge
                    status={school.status === 'ACTIVE' ? 'active' : 'inactive'}
                  />
                </View>
                <AppText color={theme.colors.textSecondary} variant="caption">
                  {school.email || 'No email'} · {maskedPhone(school.phone)}
                </AppText>
                <AppText
                  color={theme.colors.textTertiary}
                  style={styles.created}
                  variant="caption"
                >
                  Created {formatDisplayDate(school.createdAt)}
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
  cardTitleRow: { alignItems: 'center', flexDirection: 'row' },
  created: { marginTop: 6 },
  filterButton: { minWidth: 92 },
  filterNote: { marginTop: 10 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  list: { gap: 12, marginTop: 20 },
  maxWidth: { alignSelf: 'center', maxWidth: 760, width: '100%' },
  schoolName: { flex: 1, marginRight: 8 },
  screenContent: { paddingBottom: 32 },
  search: { marginTop: 20 },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: 12,
  },
});
