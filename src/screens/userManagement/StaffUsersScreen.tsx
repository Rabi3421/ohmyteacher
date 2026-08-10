import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppAvatar } from '../../components/common/AppAvatar';
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
import type {
  BackendStaffRole,
  LiveStaffStatus,
} from '../../models/liveStaff';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import {
  useAuthStore,
  useCurrentOrganizationStore,
  useCurrentStaffStore,
} from '../../store';
import { formatDisplayDate } from '../../utils/date';
import { getBackendStaffRoleLabel } from '../../utils/role';
import { canCreateStaff } from '../../utils/userManagementPermissions';

type RoleFilter = BackendStaffRole | 'ALL';
type StatusFilter = LiveStaffStatus | 'ALL';

function maskedMobile(value: string): string {
  return value.length <= 4 ? '••••' : `••••••${value.slice(-4)}`;
}

export function StaffUsersScreen({
  navigation,
  route,
}: RoleScreenProps<'StaffUsers'>) {
  const theme = useAppTheme();
  const schoolId = route.params.schoolId;
  const membership = useAuthStore(state => state.activeMembership);
  const staff = useCurrentStaffStore(state => state.staff);
  const isLoading = useCurrentStaffStore(state => state.isLoading);
  const error = useCurrentStaffStore(state => state.error);
  const loadStaff = useCurrentStaffStore(state => state.loadStaff);
  const cancelList = useCurrentStaffStore(state => state.cancelListRequest);
  const setQuery = useCurrentStaffStore(state => state.setQuery);
  const branches = useCurrentOrganizationStore(state => state.branches.items);
  const loadBranches = useCurrentOrganizationStore(state => state.loadBranches);
  const loadSchool = useCurrentOrganizationStore(state => state.loadCurrentSchool);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [branchId, setBranchId] = useState<string | 'ALL'>('ALL');
  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    loadStaff(schoolId).catch(() => undefined);
    loadBranches(schoolId).catch(() => undefined);
    loadSchool(schoolId).catch(() => undefined);
    return cancelList;
  }, [cancelList, loadBranches, loadSchool, loadStaff, schoolId]);

  useEffect(() => {
    setQuery({ branchId, role, search: debouncedSearch, status });
  }, [branchId, debouncedSearch, role, setQuery, status]);

  const canCreate = membership
    ? canCreateStaff(membership.role, membership, schoolId)
    : false;
  const roleOptions: RoleFilter[] = ['ALL', 'BRANCH_ADMIN', 'TEACHER'];

  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      onRefresh={() => loadStaff(schoolId)}
      refreshing={isLoading}
      scrollable
      testID="staff-users-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          rightActions={
            canCreate ? (
              <AppButton
                onPress={() =>
                  navigation.navigate(ROUTES.CREATE_STAFF_USER, { schoolId })
                }
                title="Add"
              />
            ) : null
          }
          subtitle={`${staff.totalItems} staff accounts`}
          title="Staff Users"
        />
        <AppSearchInput
          onChangeText={setSearch}
          placeholder="Search name or mobile"
          style={styles.search}
          value={search}
        />
        <AppText style={styles.filterLabel} variant="label">Role</AppText>
        <View style={styles.filters}>
          {roleOptions.map(option => (
            <AppButton
              key={option}
              onPress={() => setRole(option)}
              title={option === 'ALL' ? 'All' : getBackendStaffRoleLabel(option)}
              variant={role === option ? 'primary' : 'outline'}
            />
          ))}
        </View>
        <AppText style={styles.filterLabel} variant="label">Status</AppText>
        <View style={styles.filters}>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(option => (
            <AppButton
              key={option}
              onPress={() => setStatus(option)}
              title={option === 'ALL' ? 'All' : option === 'ACTIVE' ? 'Active' : 'Inactive'}
              variant={status === option ? 'primary' : 'outline'}
            />
          ))}
        </View>
        {membership?.role === 'SCHOOL_ADMIN' && branches.length > 1 ? (
          <>
            <AppText style={styles.filterLabel} variant="label">Branch</AppText>
            <View style={styles.filters}>
              <AppButton
                onPress={() => setBranchId('ALL')}
                title="All"
                variant={branchId === 'ALL' ? 'primary' : 'outline'}
              />
              {branches.map(branch => (
                <AppButton
                  key={branch.id}
                  onPress={() => setBranchId(branch.id)}
                  title={branch.name}
                  variant={branchId === branch.id ? 'primary' : 'outline'}
                />
              ))}
            </View>
          </>
        ) : null}
        {error && staff.items.length > 0 ? (
          <InlineError message={error.message} style={styles.notice} />
        ) : null}
        {isLoading && staff.items.length === 0 ? (
          <LoadingView message="Loading live staff users…" />
        ) : error && staff.items.length === 0 ? (
          <ErrorState message={error.message} onRetry={() => loadStaff(schoolId)} />
        ) : staff.items.length === 0 ? (
          <EmptyState
            actionLabel={canCreate ? 'Add Staff' : undefined}
            description="No live staff accounts match these filters."
            onAction={canCreate ? () => navigation.navigate(ROUTES.CREATE_STAFF_USER, { schoolId }) : undefined}
            title="No staff found"
          />
        ) : (
          <View style={styles.list}>
            {staff.items.map(item => (
              <AppCard
                key={item.id}
                onPress={() => navigation.navigate(ROUTES.STAFF_USER_DETAILS, { membershipId: item.id, schoolId })}
                variant="elevated"
              >
                <View style={styles.row}>
                  <AppAvatar name={item.name} size={50} />
                  <View style={styles.copy}>
                    <View style={styles.titleRow}>
                      <AppText style={styles.name} variant="title">{item.name}</AppText>
                      <AppBadge status={item.status === 'ACTIVE' ? 'active' : 'inactive'} />
                    </View>
                    <AppText color={theme.colors.primary} variant="bodyMedium">
                      {getBackendStaffRoleLabel(item.role)}
                    </AppText>
                    <AppText color={theme.colors.textSecondary} variant="caption">
                      {item.branch.name ?? 'Unavailable branch'} · {maskedMobile(item.mobile)}
                    </AppText>
                    <AppText color={theme.colors.textTertiary} variant="caption">
                      Joined {formatDisplayDate(item.joinedAt)}
                    </AppText>
                  </View>
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
  copy: { flex: 1, marginLeft: 12 },
  filterLabel: { marginTop: 16 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  list: { gap: 12, marginTop: 20 },
  maxWidth: { alignSelf: 'center', maxWidth: 760, width: '100%' },
  name: { flex: 1 },
  notice: { marginTop: 16 },
  row: { alignItems: 'center', flexDirection: 'row' },
  screenContent: { paddingBottom: 32 },
  search: { marginTop: 16 },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
});
