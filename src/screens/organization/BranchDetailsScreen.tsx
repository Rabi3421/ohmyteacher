import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

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
import { useAuthStore, useCurrentOrganizationStore } from '../../store';
import { formatDisplayDate } from '../../utils/date';

function maskPhone(phone: string): string {
  if (!phone) return '—';
  return phone.length <= 4 ? '••••' : `••••••${phone.slice(-4)}`;
}

export function BranchDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'BranchDetails'>) {
  const theme = useAppTheme();
  const { branchId, schoolId } = route.params;
  const membership = useAuthStore(state => state.activeMembership);
  const logout = useAuthStore(state => state.logout);
  const school = useCurrentOrganizationStore(state => state.currentSchool);
  const branch = useCurrentOrganizationStore(state => state.currentBranch);
  const isLoading = useCurrentOrganizationStore(state => state.isLoadingBranches);
  const isSaving = useCurrentOrganizationStore(state => state.isSavingBranch);
  const error = useCurrentOrganizationStore(state => state.branchError);
  const mutationError = useCurrentOrganizationStore(state => state.mutationError);
  const loadSchool = useCurrentOrganizationStore(state => state.loadCurrentSchool);
  const loadBranch = useCurrentOrganizationStore(state => state.loadBranch);
  const cancelSchool = useCurrentOrganizationStore(state => state.cancelSchoolRequest);
  const cancelBranch = useCurrentOrganizationStore(state => state.cancelBranchRequest);
  const updateStatus = useCurrentOrganizationStore(state => state.setBranchStatus);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const validId = /^[1-9]\d*$/.test(branchId);
  const authorized =
    validId &&
    membership?.schoolId === schoolId &&
    ['SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(membership.role) &&
    (membership.role !== 'BRANCH_ADMIN' || membership.branchId === branchId);

  useEffect(() => {
    if (!authorized) return;
    loadSchool(schoolId).catch(() => undefined);
    loadBranch(schoolId, branchId).catch(() => undefined);
    return () => {
      cancelSchool();
      cancelBranch();
    };
  }, [authorized, branchId, cancelBranch, cancelSchool, loadBranch, loadSchool, schoolId]);

  if (!validId) return <ErrorState message="This branch reference is invalid." />;
  if (!authorized) return <ErrorState message="You cannot access this branch." title="Access denied" />;
  if (isLoading && branch?.id !== branchId) return <LoadingView message="Loading branch…" />;
  if (!branch || branch.id !== branchId) {
    return (
      <ErrorState
        message={error?.message ?? 'Branch information is unavailable.'}
        onRetry={() => loadBranch(schoolId, branchId)}
        title={error?.status === 403 ? 'Branch access denied' : error?.status === 404 ? 'Branch not found' : undefined}
      />
    );
  }

  const canManage = membership.role === 'SCHOOL_ADMIN' && school?.status !== 'INACTIVE';
  const inactive = branch.status === 'INACTIVE';
  const nextStatus = inactive ? 'ACTIVE' : 'INACTIVE';

  return (
    <>
      <AppScreen
        contentContainerStyle={styles.screenContent}
        onRefresh={() => loadBranch(schoolId, branchId)}
        refreshing={isLoading}
        scrollable
        testID="branch-details-screen"
      >
        <View style={styles.maxWidth}>
          <AppHeader includeSafeArea={false} onBackPress={navigation.goBack} title="Branch Details" />
          <View style={styles.titleRow}>
            <View style={styles.copy}>
              <AppText variant="heading2">{branch.name}</AppText>
              <AppText color={theme.colors.primary} variant="bodyMedium">{branch.code}</AppText>
            </View>
            <AppBadge status={inactive ? 'inactive' : 'active'} />
          </View>
          {inactive ? (
            <InlineError
              message="This branch is inactive. Django does not globally revoke existing sessions, so the app treats it as unavailable for branch context selection."
              style={styles.notice}
            />
          ) : null}
          {mutationError ? <InlineError message={mutationError.message} style={styles.notice} /> : null}
          <AppCard style={styles.card} variant="outlined">
            <Detail label="School" value={school?.name ?? 'Current school'} />
            <Detail label="Code" value={branch.code} />
            <Detail label="Phone" value={maskPhone(branch.phone)} />
            <Detail label="Email" value={branch.email || '—'} />
            <Detail label="Address" value={branch.address || '—'} />
            <Detail label="Created" value={formatDisplayDate(branch.createdAt)} />
          </AppCard>
          <AppCard style={styles.card} variant="outlined">
            <AppText variant="title">Backend scope</AppText>
            <AppText color={theme.colors.textSecondary} style={styles.scopeCopy}>
              School ownership and branch access are derived from the authenticated user. The route does not select a tenant.
            </AppText>
          </AppCard>
          <View style={styles.actions}>
            {canManage ? (
              <AppButton
                fullWidth
                onPress={() => navigation.navigate(ROUTES.EDIT_BRANCH, { branchId, schoolId })}
                title="Edit Branch"
                variant="outline"
              />
            ) : null}
            {canManage ? (
              <AppButton
                fullWidth
                onPress={() => setConfirmVisible(true)}
                title={nextStatus === 'INACTIVE' ? 'Deactivate Branch' : 'Activate Branch'}
                variant={nextStatus === 'INACTIVE' ? 'danger' : 'primary'}
              />
            ) : null}
            {inactive && membership.role === 'BRANCH_ADMIN' ? (
              <AppButton fullWidth onPress={logout} title="Log Out" variant="danger" />
            ) : null}
          </View>
        </View>
      </AppScreen>
      <ConfirmationDialog
        confirmLabel={nextStatus === 'INACTIVE' ? 'Deactivate' : 'Activate'}
        destructive={nextStatus === 'INACTIVE'}
        loading={isSaving}
        message={
          nextStatus === 'INACTIVE'
            ? `Deactivate ${branch.name}? Django does not enforce a last-active or Main Branch restriction and does not revoke existing JWTs.`
            : `Activate ${branch.name} for branch selection again?`
        }
        onCancel={() => setConfirmVisible(false)}
        onConfirm={async () => {
          if (await updateStatus(schoolId, branchId, nextStatus)) setConfirmVisible(false);
        }}
        title={`${nextStatus === 'INACTIVE' ? 'Deactivate' : 'Activate'} ${branch.name}?`}
        visible={confirmVisible}
      />
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.detail}>
      <AppText color={theme.colors.textSecondary}>{label}</AppText>
      <AppText align="right" style={styles.detailValue} variant="bodyMedium">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10, marginTop: 24 },
  card: { marginTop: 16 },
  copy: { flex: 1, marginRight: 12 },
  detail: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  detailValue: { flex: 1, marginLeft: 20 },
  maxWidth: { alignSelf: 'center', maxWidth: 680, width: '100%' },
  notice: { marginTop: 16 },
  scopeCopy: { marginTop: 8 },
  screenContent: { paddingBottom: 32 },
  titleRow: { alignItems: 'center', flexDirection: 'row', marginTop: 22 },
});
