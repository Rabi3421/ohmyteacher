import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import type { StaffRole } from '../../models/userManagement';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore, useUserManagementStore } from '../../store';
import { getRoleLabel } from '../../utils/role';

export function ChangeUserRoleScreen({
  navigation,
  route,
}: RoleScreenProps<'ChangeUserRole'>) {
  const { membershipId, schoolId } = route.params;
  const actor = useAuthStore(state => state.activeMembership);
  const staff = useUserManagementStore(state => state.currentStaff);
  const loadStaff = useUserManagementStore(state => state.loadStaffUser);
  const changeRole = useUserManagementStore(state => state.changeRole);
  const isLoading = useUserManagementStore(
    state => state.isLoadingStaffDetails,
  );
  const isSaving = useUserManagementStore(
    state => state.isUpdatingMembership,
  );
  const error = useUserManagementStore(state => state.error);
  const [selectedRole, setSelectedRole] = useState<StaffRole>();
  const [confirmVisible, setConfirmVisible] = useState(false);

  useEffect(() => {
    loadStaff(schoolId, membershipId).catch(() => undefined);
  }, [loadStaff, membershipId, schoolId]);

  if (isLoading && !staff) {
    return <LoadingView message="Loading role assignment…" />;
  }
  if (!staff || !actor) {
    return (
      <ErrorState
        message={error?.message ?? 'Staff information is unavailable.'}
        onRetry={() => loadStaff(schoolId, membershipId)}
      />
    );
  }

  const roles: StaffRole[] =
    actor.role === 'SUPER_ADMIN'
      ? ['SCHOOL_ADMIN']
      : ['BRANCH_ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'];

  return (
    <>
      <AppScreen
        contentContainerStyle={styles.screenContent}
        scrollable
        testID="change-user-role-screen"
      >
        <View style={styles.maxWidth}>
          <AppHeader
            includeSafeArea={false}
            onBackPress={navigation.goBack}
            subtitle={staff.identity.name}
            title="Change Role"
          />
          <AppCard style={styles.card} variant="elevated">
            <AppText variant="title">
              Current: {getRoleLabel(staff.membership.role)}
            </AppText>
            <AppText style={styles.helper}>
              Role changes recalculate effective permissions, remove prohibited
              overrides, revoke active sessions, and require workspace
              re-resolution at the next login.
            </AppText>
            <View style={styles.options}>
              {roles.map(role => (
                <AppButton
                  disabled={role === staff.membership.role}
                  fullWidth
                  key={role}
                  onPress={() => setSelectedRole(role)}
                  title={getRoleLabel(role)}
                  variant={selectedRole === role ? 'primary' : 'outline'}
                />
              ))}
            </View>
            {error ? (
              <InlineError message={error.message} style={styles.error} />
            ) : null}
            <AppButton
              disabled={!selectedRole}
              fullWidth
              onPress={() => setConfirmVisible(true)}
              style={styles.submit}
              title="Review Role Change"
            />
          </AppCard>
        </View>
      </AppScreen>
      <ConfirmationDialog
        confirmLabel="Change Role"
        loading={isSaving}
        message={`Change ${staff.identity.name} from ${getRoleLabel(staff.membership.role)} to ${selectedRole ? getRoleLabel(selectedRole) : 'the selected role'}? Active sessions will be revoked.`}
        onCancel={() => setConfirmVisible(false)}
        onConfirm={async () => {
          if (!selectedRole) return;
          const updated = await changeRole(
            schoolId,
            membershipId,
            selectedRole,
          );
          if (updated) navigation.goBack();
        }}
        title="Confirm role change"
        visible={confirmVisible}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 20 },
  error: { marginTop: 16 },
  helper: { marginTop: 10 },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 680,
    width: '100%',
  },
  options: { gap: 10, marginTop: 20 },
  screenContent: { paddingBottom: 32 },
  submit: { marginTop: 22 },
});
