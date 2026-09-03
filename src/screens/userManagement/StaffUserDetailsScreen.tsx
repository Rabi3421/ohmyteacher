import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppDetailRow } from '../../components/common/AppDetailRow';
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
import {
  useAuthStore,
  useCurrentOrganizationStore,
  useCurrentStaffStore,
} from '../../store';
import { formatDisplayDate } from '../../utils/date';
import { getBackendStaffRoleLabel } from '../../utils/role';
import {
  canAssignBranches,
  canEditStaff,
} from '../../utils/userManagementPermissions';

export function StaffUserDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'StaffUserDetails'>) {
  const theme = useAppTheme();
  const { membershipId: staffId, schoolId } = route.params;
  const actor = useAuthStore(state => state.activeMembership);
  const school = useCurrentOrganizationStore(state => state.currentSchool);
  const loadSchool = useCurrentOrganizationStore(state => state.loadCurrentSchool);
  const staff = useCurrentStaffStore(state => state.currentStaff);
  const isLoading = useCurrentStaffStore(state => state.isLoadingDetails);
  const isSaving = useCurrentStaffStore(state => state.isSaving);
  const error = useCurrentStaffStore(state => state.error);
  const success = useCurrentStaffStore(state => state.successMessage);
  const loadStaff = useCurrentStaffStore(state => state.loadStaffUser);
  const cancelDetail = useCurrentStaffStore(state => state.cancelDetailRequest);
  const setStatus = useCurrentStaffStore(state => state.setStaffStatus);
  const [confirmStatus, setConfirmStatus] = useState(false);

  useEffect(() => {
    loadStaff(schoolId, staffId).catch(() => undefined);
    loadSchool(schoolId).catch(() => undefined);
    return cancelDetail;
  }, [cancelDetail, loadSchool, loadStaff, schoolId, staffId]);

  if (isLoading && staff?.id !== staffId) {
    return <LoadingView message="Loading live staff details…" />;
  }
  if (!staff || staff.id !== staffId || !actor) {
    return <ErrorState message={error?.message ?? 'Staff information is unavailable.'} onRetry={() => loadStaff(schoolId, staffId)} />;
  }

  const editable = canEditStaff(actor.role, actor, schoolId);
  const assignable = canAssignBranches(actor.role, actor, schoolId);
  const nextStatus = staff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const inactiveSchool = school?.id === schoolId && school.status === 'INACTIVE';

  return (
    <>
      <AppScreen
        contentContainerStyle={styles.screenContent}
        onRefresh={() => loadStaff(schoolId, staffId)}
        refreshing={isLoading}
        scrollable
        testID="staff-user-details-screen"
      >
        <View style={styles.maxWidth}>
          <AppHeader includeSafeArea={false} onBackPress={navigation.goBack} title="Staff User Details" />
          <View style={styles.hero}>
            <AppAvatar name={staff.name} size={72} />
            <View style={styles.heroCopy}>
              <AppText variant="heading2">{staff.name}</AppText>
              <AppText color={theme.colors.primary} variant="bodyMedium">
                {getBackendStaffRoleLabel(staff.role)}
              </AppText>
              <AppBadge
                label={`Account ${staff.status.toLowerCase()}`}
                status={staff.status === 'ACTIVE' ? 'active' : 'inactive'}
              />
            </View>
          </View>
          {inactiveSchool ? (
            <InlineError message="This school is inactive. Staff changes are unavailable in the app." style={styles.notice} />
          ) : null}
          {success ? <AppCard style={styles.notice} variant="outlined"><AppText>{success}</AppText></AppCard> : null}
          {error ? <InlineError message={error.message} style={styles.notice} /> : null}
          <AppCard style={styles.card} variant="outlined">
            <AppText variant="title">Django user account</AppText>
            <Detail label="Mobile" value={staff.mobile} />
            <Detail divided label="Fixed Role" value={getBackendStaffRoleLabel(staff.role)} />
            <Detail divided label="Status" value={staff.status === 'ACTIVE' ? 'Active' : 'Inactive'} />
            <Detail divided label="Joined" value={formatDisplayDate(staff.joinedAt)} />
          </AppCard>
          <AppCard style={styles.card} variant="outlined">
            <AppText variant="title">Server-owned scope</AppText>
            <Detail label="School" value={school?.id === schoolId ? school.name : 'Current school'} />
            <Detail divided label="Branch" value={staff.branch.name ?? 'Unavailable branch'} />
            <Detail divided label="Branch ID" value={staff.branch.id} />
            <AppText style={styles.helper} variant="caption">
              Django stores one school and one branch directly on this User. This is not a configurable membership.
            </AppText>
          </AppCard>
          {editable ? (
            <View style={styles.actions}>
              <AppButton
                disabled={inactiveSchool}
                fullWidth
                onPress={() => navigation.navigate(ROUTES.EDIT_STAFF_USER, { membershipId: staffId, schoolId })}
                title="Edit Name"
                variant="outline"
              />
              {assignable ? (
                <AppButton
                  disabled={inactiveSchool}
                  fullWidth
                  onPress={() => navigation.navigate(ROUTES.ASSIGN_BRANCHES, { membershipId: staffId, schoolId })}
                  title="Change Branch"
                  variant="outline"
                />
              ) : null}
              <AppButton
                disabled={inactiveSchool}
                fullWidth
                onPress={() => setConfirmStatus(true)}
                title={`${nextStatus === 'INACTIVE' ? 'Deactivate' : 'Activate'} Account`}
                variant={nextStatus === 'INACTIVE' ? 'danger' : 'primary'}
              />
            </View>
          ) : null}
        </View>
      </AppScreen>
      <ConfirmationDialog
        confirmLabel={nextStatus === 'INACTIVE' ? 'Deactivate' : 'Activate'}
        destructive={nextStatus === 'INACTIVE'}
        loading={isSaving}
        message={`${nextStatus === 'INACTIVE' ? 'Deactivate' : 'Activate'} this Django user account? The backend does not promise immediate revocation of already issued JWTs.`}
        onCancel={() => setConfirmStatus(false)}
        onConfirm={async () => {
          if (await setStatus(schoolId, staffId, nextStatus)) setConfirmStatus(false);
        }}
        title="Confirm account status change"
        visible={confirmStatus}
      />
    </>
  );
}

function Detail({
  label,
  value,
  divided,
}: {
  label: string;
  value: string;
  divided?: boolean;
}) {
  return <AppDetailRow divided={divided} label={label} value={value} />;
}

const styles = StyleSheet.create({
  actions: { gap: 10, marginTop: 20 },
  card: { gap: 12, marginTop: 18 },
  detail: { flexDirection: 'row', justifyContent: 'space-between' },
  detailValue: { flex: 1, marginLeft: 16 },
  helper: { marginTop: 4 },
  hero: { alignItems: 'center', flexDirection: 'row', marginTop: 20 },
  heroCopy: { flex: 1, gap: 6, marginLeft: 16 },
  maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' },
  notice: { marginTop: 16 },
  screenContent: { paddingBottom: 32 },
});
