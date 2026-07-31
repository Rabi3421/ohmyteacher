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
import { useAuthStore, useOrganizationStore } from '../../store';
import { formatDisplayDate } from '../../utils/date';
import {
  canChangeBranchStatus,
  canEditBranch,
} from '../../utils/organizationPermissions';

export function BranchDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'BranchDetails'>) {
  const theme = useAppTheme();
  const { branchId, schoolId } = route.params;
  const membership = useAuthStore(state => state.activeMembership);
  const school = useOrganizationStore(state => state.currentSchool);
  const branch = useOrganizationStore(state => state.currentBranch);
  const sessions = useOrganizationStore(state => state.academicSessions);
  const isLoading = useOrganizationStore(state => state.isLoadingBranches);
  const isSaving = useOrganizationStore(state => state.isSavingBranch);
  const error = useOrganizationStore(state => state.error);
  const loadSchool = useOrganizationStore(state => state.loadSchool);
  const loadBranch = useOrganizationStore(state => state.loadBranch);
  const loadSessions = useOrganizationStore(
    state => state.loadAcademicSessions,
  );
  const updateStatus = useOrganizationStore(
    state => state.updateBranchStatus,
  );
  const [confirmVisible, setConfirmVisible] = useState(false);

  useEffect(() => {
    loadSchool(schoolId).catch(() => undefined);
    loadBranch(schoolId, branchId).catch(() => undefined);
    loadSessions(schoolId).catch(() => undefined);
  }, [branchId, loadBranch, loadSchool, loadSessions, schoolId]);

  if (isLoading && branch?.id !== branchId) {
    return <LoadingView message="Loading branch…" />;
  }
  if (!branch || branch.id !== branchId || !membership) {
    return (
      <ErrorState
        message={error?.message ?? 'Branch information is unavailable.'}
        onRetry={() => loadBranch(schoolId, branchId)}
      />
    );
  }

  const canEdit = canEditBranch(membership.role, membership, schoolId);
  const canStatus = canChangeBranchStatus(
    membership.role,
    membership,
    schoolId,
  );
  const nextStatus = branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const activeSession = sessions.find(session => session.status === 'ACTIVE');

  return (
    <>
      <AppScreen
        contentContainerStyle={styles.screenContent}
        onRefresh={async () => {
          await Promise.all([
            loadBranch(schoolId, branchId),
            loadSessions(schoolId),
          ]);
        }}
        refreshing={isLoading}
        scrollable
        testID="branch-details-screen"
      >
        <View style={styles.maxWidth}>
          <AppHeader
            includeSafeArea={false}
            onBackPress={navigation.goBack}
            title="Branch Details"
          />
          <View style={styles.titleRow}>
            <View style={styles.copy}>
              <AppText variant="heading2">{branch.name}</AppText>
              <AppText color={theme.colors.primary} variant="bodyMedium">
                {branch.code}
              </AppText>
            </View>
            <AppBadge
              status={branch.status === 'ACTIVE' ? 'active' : 'inactive'}
            />
          </View>
          {error ? (
            <InlineError message={error.message} style={styles.notice} />
          ) : null}
          <AppCard style={styles.card} variant="outlined">
            <Detail label="School" value={school?.name ?? '—'} />
            <Detail label="Mobile" value={branch.mobile} />
            <Detail label="Email" value={branch.email ?? '—'} />
            <Detail
              label="Address"
              value={`${branch.address.line1}, ${branch.address.city}, ${branch.address.state} ${branch.address.pinCode}`}
            />
            <Detail
              label="Branch Type"
              value={branch.isMainBranch ? 'Main Branch' : 'Branch'}
            />
            <Detail
              label="Created"
              value={formatDisplayDate(branch.createdAt)}
            />
          </AppCard>
          <AppCard style={styles.card} variant="outlined">
            <AppText variant="title">Current academic session</AppText>
            <AppText
              color={theme.colors.textSecondary}
              style={styles.sessionCopy}
            >
              {activeSession
                ? `${activeSession.name} · ${formatDisplayDate(activeSession.startDate)} – ${formatDisplayDate(activeSession.endDate)}`
                : 'No active academic session'}
            </AppText>
          </AppCard>
          <View style={styles.actions}>
            <AppButton
              fullWidth
              onPress={() =>
                navigation.navigate(ROUTES.FEE_SETUP, {
                  academicSessionId: activeSession?.id,
                  branchId,
                  schoolId,
                  sessionStatus: activeSession?.status,
                })
              }
              title="Fee Setup"
              variant="outline"
            />
            <AppButton
              fullWidth
              onPress={() =>
                navigation.navigate(ROUTES.STUDENTS, { branchId, schoolId })
              }
              title="Students"
              variant="outline"
            />
            <AppButton
              fullWidth
              onPress={() =>
                navigation.navigate(ROUTES.ACADEMIC_SETUP, {
                  academicSessionId: activeSession?.id,
                  branchId,
                  schoolId,
                })
              }
              title="Academic Setup"
              variant="outline"
            />
            {membership.role === 'BRANCH_ADMIN' ? (
              <>
                <AppButton
                  fullWidth
                  onPress={() =>
                    navigation.navigate(ROUTES.SCHOOL_DETAILS, { schoolId })
                  }
                  title="View School Information"
                  variant="outline"
                />
                <AppButton
                  fullWidth
                  onPress={() =>
                    navigation.navigate(ROUTES.STAFF_USERS, { schoolId })
                  }
                  title="View Branch Staff"
                  variant="outline"
                />
              </>
            ) : null}
            {canEdit ? (
              <AppButton
                fullWidth
                onPress={() =>
                  navigation.navigate(ROUTES.EDIT_BRANCH, {
                    branchId,
                    schoolId,
                  })
                }
                title="Edit Branch"
                variant="outline"
              />
            ) : (
              <AppButton
                fullWidth
                onPress={() =>
                  navigation.navigate(ROUTES.ACADEMIC_SESSIONS, { schoolId })
                }
                title="View Active Session"
                variant="outline"
              />
            )}
            {canStatus ? (
              <AppButton
                fullWidth
                onPress={() => setConfirmVisible(true)}
                title={
                  nextStatus === 'INACTIVE'
                    ? 'Deactivate Branch'
                    : 'Activate Branch'
                }
                variant={nextStatus === 'INACTIVE' ? 'danger' : 'primary'}
              />
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
            ? 'This branch will become unavailable. A school must always keep at least one active branch.'
            : 'This branch will be restored to active status.'
        }
        onCancel={() => setConfirmVisible(false)}
        onConfirm={async () => {
          const updated = await updateStatus(schoolId, branchId, nextStatus);
          if (updated) setConfirmVisible(false);
        }}
        title={`${nextStatus === 'INACTIVE' ? 'Deactivate' : 'Activate'} branch?`}
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
      <AppText align="right" style={styles.detailValue} variant="bodyMedium">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10, marginTop: 24 },
  card: { marginTop: 16 },
  copy: { flex: 1, marginRight: 12 },
  detail: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailValue: { flex: 1, marginLeft: 20 },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 680,
    width: '100%',
  },
  notice: { marginTop: 16 },
  screenContent: { paddingBottom: 32 },
  sessionCopy: { marginTop: 8 },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 22,
  },
});
