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
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useDebounce } from '../../hooks/useDebounce';
import type {
  MembershipStatus,
  StaffRole,
} from '../../models/userManagement';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import {
  useAuthStore,
  useOrganizationStore,
  useUserManagementStore,
} from '../../store';
import { formatDateTime, formatDisplayDate } from '../../utils/date';
import { getRoleLabel } from '../../utils/role';
import { canCreateStaff } from '../../utils/userManagementPermissions';

type RoleFilter = StaffRole | 'ALL';
type StatusFilter = MembershipStatus | 'ALL';

export function StaffUsersScreen({
  navigation,
  route,
}: RoleScreenProps<'StaffUsers'>) {
  const theme = useAppTheme();
  const schoolId = route.params.schoolId;
  const membership = useAuthStore(state => state.activeMembership);
  const staff = useUserManagementStore(state => state.staff);
  const isLoading = useUserManagementStore(state => state.isLoadingStaff);
  const error = useUserManagementStore(state => state.error);
  const loadStaff = useUserManagementStore(state => state.loadStaff);
  const setQuery = useUserManagementStore(state => state.setStaffQuery);
  const branches = useOrganizationStore(state => state.branches);
  const loadBranches = useOrganizationStore(state => state.loadBranches);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [branchId, setBranchId] = useState<string | 'ALL'>('ALL');
  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    setQuery({
      branchId,
      page: 1,
      role,
      search: debouncedSearch,
      status,
    });
    loadStaff(schoolId).catch(() => undefined);
  }, [
    branchId,
    debouncedSearch,
    loadStaff,
    role,
    schoolId,
    setQuery,
    status,
  ]);

  useEffect(() => {
    loadBranches(schoolId).catch(() => undefined);
  }, [loadBranches, schoolId]);

  const canCreate = membership
    ? canCreateStaff(membership.role, membership, schoolId)
    : false;
  const roleOptions: RoleFilter[] =
    membership?.role === 'SUPER_ADMIN'
      ? ['ALL', 'SCHOOL_ADMIN']
      : ['ALL', 'SCHOOL_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'];

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
          subtitle={`${staff.totalItems} staff memberships`}
          title={
            membership?.role === 'SUPER_ADMIN'
              ? 'School Admin Users'
              : 'Staff Users'
          }
        />
        <AppSearchInput
          onChangeText={setSearch}
          placeholder="Search name, mobile, or email"
          style={styles.search}
          value={search}
        />
        <AppText style={styles.filterLabel} variant="label">
          Role
        </AppText>
        <View style={styles.filters}>
          {roleOptions.map(option => (
            <AppButton
              key={option}
              onPress={() => setRole(option)}
              title={option === 'ALL' ? 'All' : getRoleLabel(option)}
              variant={role === option ? 'primary' : 'outline'}
            />
          ))}
        </View>
        <AppText style={styles.filterLabel} variant="label">
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
        {membership?.role !== 'SUPER_ADMIN' && branches.items.length > 1 ? (
          <>
            <AppText style={styles.filterLabel} variant="label">
              Branch
            </AppText>
            <View style={styles.filters}>
              <AppButton
                onPress={() => setBranchId('ALL')}
                title="All"
                variant={branchId === 'ALL' ? 'primary' : 'outline'}
              />
              {branches.items.map(branch => (
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
        {isLoading && staff.items.length === 0 ? (
          <LoadingView message="Loading staff users…" />
        ) : error && staff.items.length === 0 ? (
          <ErrorState
            message={error.message}
            onRetry={() => loadStaff(schoolId)}
          />
        ) : staff.items.length === 0 ? (
          <EmptyState
            actionLabel={canCreate ? 'Add Staff' : undefined}
            description="No staff memberships match these filters."
            onAction={
              canCreate
                ? () =>
                    navigation.navigate(ROUTES.CREATE_STAFF_USER, {
                      schoolId,
                    })
                : undefined
            }
            title="No staff found"
          />
        ) : (
          <View style={styles.list}>
            {staff.items.map(item => (
              <AppCard
                key={item.membership.id}
                onPress={() =>
                  navigation.navigate(ROUTES.STAFF_USER_DETAILS, {
                    membershipId: item.membership.id,
                    schoolId,
                  })
                }
                variant="elevated"
              >
                <View style={styles.row}>
                  <AppAvatar
                    name={item.identity.name}
                    size={50}
                    source={
                      item.identity.avatarUrl
                        ? { uri: item.identity.avatarUrl }
                        : undefined
                    }
                  />
                  <View style={styles.copy}>
                    <View style={styles.titleRow}>
                      <AppText style={styles.name} variant="title">
                        {item.identity.name}
                      </AppText>
                      <AppBadge
                        status={
                          item.membership.status === 'ACTIVE'
                            ? 'active'
                            : 'inactive'
                        }
                      />
                    </View>
                    <AppText color={theme.colors.primary} variant="bodyMedium">
                      {getRoleLabel(item.membership.role)}
                    </AppText>
                    <AppText color={theme.colors.textSecondary} variant="caption">
                      {item.identity.mobile}
                      {item.identity.email ? ` · ${item.identity.email}` : ''}
                    </AppText>
                    <AppText color={theme.colors.textSecondary} variant="caption">
                      {item.branches.length} assigned branches · User{' '}
                      {item.identity.status.toLowerCase()}
                    </AppText>
                    <AppText color={theme.colors.textTertiary} variant="caption">
                      Last login{' '}
                      {item.identity.lastLoginAt
                        ? formatDateTime(item.identity.lastLoginAt)
                        : 'Never'}{' '}
                      · Created {formatDisplayDate(item.membership.createdAt)}
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
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  list: { gap: 12, marginTop: 20 },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 760,
    width: '100%',
  },
  name: { flex: 1, marginRight: 8 },
  row: { alignItems: 'center', flexDirection: 'row' },
  screenContent: { paddingBottom: 32 },
  search: { marginTop: 16 },
  titleRow: { alignItems: 'center', flexDirection: 'row' },
});
