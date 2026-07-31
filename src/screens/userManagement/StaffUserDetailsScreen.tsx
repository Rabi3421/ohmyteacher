import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppAvatar } from '../../components/common/AppAvatar';
import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore, useUserManagementStore } from '../../store';
import { formatDateTime, formatDisplayDate } from '../../utils/date';
import { getRoleLabel } from '../../utils/role';
import {
  canEditStaff,
  canManageRolePermissions,
  canRevokeUserSessions,
  canViewUserActivity,
} from '../../utils/userManagementPermissions';

type ConfirmAction = 'membership' | 'global' | 'instructions';

export function StaffUserDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'StaffUserDetails'>) {
  const theme = useAppTheme();
  const { membershipId, schoolId } = route.params;
  const actor = useAuthStore(state => state.activeMembership);
  const staff = useUserManagementStore(state => state.currentStaff);
  const isLoading = useUserManagementStore(
    state => state.isLoadingStaffDetails,
  );
  const isUpdatingMembership = useUserManagementStore(
    state => state.isUpdatingMembership,
  );
  const isUpdatingIdentity = useUserManagementStore(
    state => state.isUpdatingIdentity,
  );
  const isSending = useUserManagementStore(
    state => state.isSendingInstructions,
  );
  const error = useUserManagementStore(state => state.error);
  const successMessage = useUserManagementStore(
    state => state.successMessage,
  );
  const loadStaff = useUserManagementStore(state => state.loadStaffUser);
  const changeMembershipStatus = useUserManagementStore(
    state => state.updateMembershipStatus,
  );
  const changeUserStatus = useUserManagementStore(
    state => state.updateUserStatus,
  );
  const resendInstructions = useUserManagementStore(
    state => state.resendLoginInstructions,
  );
  const [confirm, setConfirm] = useState<ConfirmAction>();

  useEffect(() => {
    loadStaff(schoolId, membershipId).catch(() => undefined);
  }, [loadStaff, membershipId, schoolId]);

  if (isLoading && staff?.membership.id !== membershipId) {
    return <LoadingView message="Loading staff access…" />;
  }
  if (!staff || staff.membership.id !== membershipId || !actor) {
    return (
      <ErrorState
        message={error?.message ?? 'Staff information is unavailable.'}
        onRetry={() => loadStaff(schoolId, membershipId)}
      />
    );
  }

  const editable = canEditStaff(actor.role, actor, schoolId);
  const canSessions = canRevokeUserSessions(actor.role, actor, schoolId);
  const canActivity = canViewUserActivity(actor.role, actor, schoolId);
  const canPermissions = canManageRolePermissions(
    actor.role,
    actor,
    schoolId,
  );
  const nextMembershipStatus =
    staff.membership.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const nextUserStatus =
    staff.identity.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  return (
    <>
      <AppScreen
        contentContainerStyle={styles.screenContent}
        onRefresh={() => loadStaff(schoolId, membershipId)}
        refreshing={isLoading}
        scrollable
        testID="staff-user-details-screen"
      >
        <View style={styles.maxWidth}>
          <AppHeader
            includeSafeArea={false}
            onBackPress={navigation.goBack}
            title="Staff User Details"
          />
          <View style={styles.hero}>
            <AppAvatar name={staff.identity.name} size={72} />
            <View style={styles.heroCopy}>
              <AppText variant="heading2">{staff.identity.name}</AppText>
              <AppText color={theme.colors.primary} variant="bodyMedium">
                {getRoleLabel(staff.membership.role)}
              </AppText>
              <View style={styles.badges}>
                <AppBadge
                  label={`Membership ${staff.membership.status.toLowerCase()}`}
                  status={
                    staff.membership.status === 'ACTIVE'
                      ? 'active'
                      : 'inactive'
                  }
                />
                <AppBadge
                  label={`User ${staff.identity.status.toLowerCase()}`}
                  status={
                    staff.identity.status === 'ACTIVE'
                      ? 'active'
                      : 'inactive'
                  }
                />
              </View>
            </View>
          </View>
          {successMessage ? (
            <AppCard style={styles.notice} variant="outlined">
              <AppText>{successMessage}</AppText>
            </AppCard>
          ) : null}
          {error ? (
            <InlineError message={error.message} style={styles.notice} />
          ) : null}
          <AppCard style={styles.card} variant="outlined">
            <AppText variant="title">Identity</AppText>
            <Detail label="Mobile" value={staff.identity.mobile} />
            <Detail label="Email" value={staff.identity.email ?? '—'} />
            <Detail
              label="Last Login"
              value={
                staff.identity.lastLoginAt
                  ? formatDateTime(staff.identity.lastLoginAt)
                  : 'Never'
              }
            />
          </AppCard>
          <AppCard style={styles.card} variant="outlined">
            <AppText variant="title">Membership</AppText>
            <Detail label="School" value={staff.schoolName} />
            <Detail
              label="Role"
              value={getRoleLabel(staff.membership.role)}
            />
            <Detail
              label="Assigned Branches"
              value={
                staff.branches.length
                  ? staff.branches.map(item => item.name).join(', ')
                  : 'All school branches'
              }
            />
            <Detail
              label="Created"
              value={formatDisplayDate(staff.membership.createdAt)}
            />
            <Detail
              label="Updated"
              value={formatDisplayDate(staff.membership.updatedAt)}
            />
          </AppCard>
          <AppCard style={styles.card} variant="outlined">
            <AppText variant="title">Access summary</AppText>
            <Detail label="Scope" value={staff.effectiveAccess.scope} />
            <Detail
              label="Permissions"
              value={String(staff.effectiveAccess.permissions.length)}
            />
            <Detail
              label="Permission Groups"
              value={String(
                new Set(
                  staff.effectiveAccess.permissions.map(
                    permission => permission.split('.')[0],
                  ),
                ).size,
              )}
            />
            <Detail
              label="Active Device Sessions"
              value={String(staff.activeSessionCount)}
            />
          </AppCard>
          <View style={styles.actions}>
            {editable ? (
              <>
                <AppButton
                  fullWidth
                  onPress={() =>
                    navigation.navigate(ROUTES.EDIT_STAFF_USER, {
                      membershipId,
                      schoolId,
                    })
                  }
                  title="Edit Identity"
                  variant="outline"
                />
                {staff.membership.role !== 'SCHOOL_ADMIN' ? (
                  <>
                    <AppButton
                      fullWidth
                      onPress={() =>
                        navigation.navigate(ROUTES.CHANGE_USER_ROLE, {
                          membershipId,
                          schoolId,
                        })
                      }
                      title="Change Role"
                      variant="outline"
                    />
                    <AppButton
                      fullWidth
                      onPress={() =>
                        navigation.navigate(ROUTES.ASSIGN_BRANCHES, {
                          membershipId,
                          schoolId,
                        })
                      }
                      title="Assign Branches"
                      variant="outline"
                    />
                  </>
                ) : null}
                <AppButton
                  fullWidth
                  onPress={() => setConfirm('membership')}
                  title={`${nextMembershipStatus === 'INACTIVE' ? 'Deactivate' : 'Activate'} Membership`}
                  variant={
                    nextMembershipStatus === 'INACTIVE' ? 'danger' : 'primary'
                  }
                />
                {actor.role === 'SUPER_ADMIN' ? (
                  <AppButton
                    fullWidth
                    onPress={() => setConfirm('global')}
                    title={`${nextUserStatus === 'INACTIVE' ? 'Deactivate' : 'Activate'} Global User`}
                    variant={
                      nextUserStatus === 'INACTIVE' ? 'danger' : 'primary'
                    }
                  />
                ) : null}
                <AppButton
                  fullWidth
                  onPress={() => setConfirm('instructions')}
                  title="Resend Login Instructions"
                  variant="outline"
                />
                {canPermissions ? (
                  <AppButton
                    fullWidth
                    onPress={() =>
                      navigation.navigate(ROUTES.ROLE_PERMISSIONS, {
                        role: staff.membership.role,
                        schoolId,
                      })
                    }
                    title="Manage Role Permissions"
                    variant="outline"
                  />
                ) : null}
              </>
            ) : null}
            {canSessions ? (
              <AppButton
                fullWidth
                onPress={() =>
                  navigation.navigate(ROUTES.ACTIVE_SESSIONS, {
                    membershipId,
                    schoolId,
                  })
                }
                title="Active Sessions"
                variant="outline"
              />
            ) : null}
            {canActivity ? (
              <AppButton
                fullWidth
                onPress={() =>
                  navigation.navigate(ROUTES.USER_ACTIVITY, {
                    membershipId,
                    schoolId,
                  })
                }
                title="User Activity"
                variant="outline"
              />
            ) : null}
          </View>
        </View>
      </AppScreen>
      <ConfirmationDialog
        confirmLabel={
          confirm === 'instructions'
            ? 'Send'
            : confirm === 'global'
              ? nextUserStatus === 'INACTIVE'
                ? 'Deactivate'
                : 'Activate'
              : nextMembershipStatus === 'INACTIVE'
                ? 'Deactivate'
                : 'Activate'
        }
        destructive={
          (confirm === 'global' && nextUserStatus === 'INACTIVE') ||
          (confirm === 'membership' &&
            nextMembershipStatus === 'INACTIVE')
        }
        loading={
          isUpdatingMembership || isUpdatingIdentity || isSending
        }
        message={
          confirm === 'instructions'
            ? `Send the school code and OTP login guidance to mobile ending ${staff.identity.mobile.slice(-4)}. No OTP or password will be sent.`
            : confirm === 'global'
              ? 'Global status affects this identity across every membership and deactivation revokes sessions.'
              : 'Membership status affects only this school workspace. Deactivation preserves records and revokes sessions.'
        }
        onCancel={() => setConfirm(undefined)}
        onConfirm={async () => {
          const updated =
            confirm === 'instructions'
              ? await resendInstructions(schoolId, membershipId)
              : confirm === 'global'
                ? await changeUserStatus(
                    schoolId,
                    membershipId,
                    nextUserStatus,
                  )
                : await changeMembershipStatus(
                    schoolId,
                    membershipId,
                    nextMembershipStatus,
                  );
          if (updated) setConfirm(undefined);
        }}
        title={
          confirm === 'instructions'
            ? 'Resend login instructions?'
            : 'Confirm status change'
        }
        visible={Boolean(confirm)}
      />
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.detail}>
      <AppText color={theme.colors.textSecondary}>{label}</AppText>
      <AppText align="right" style={styles.detailValue} variant="bodyMedium">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10, marginTop: 24 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  card: { gap: 8, marginTop: 16 },
  detail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  detailValue: { flex: 1, marginLeft: 20 },
  hero: { alignItems: 'center', flexDirection: 'row', marginTop: 20 },
  heroCopy: { flex: 1, marginLeft: 16 },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 680,
    width: '100%',
  },
  notice: { marginTop: 16 },
  screenContent: { paddingBottom: 32 },
});
