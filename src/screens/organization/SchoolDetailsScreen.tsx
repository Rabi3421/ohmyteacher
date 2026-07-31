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
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore, useOrganizationStore } from '../../store';
import { formatDisplayDate } from '../../utils/date';
import {
  canChangeSchoolStatus,
  canEditSchool,
  canEditSchoolSettings,
  canManageAcademicSessions,
} from '../../utils/organizationPermissions';

export function SchoolDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'SchoolDetails'>) {
  const theme = useAppTheme();
  const schoolId = route.params.schoolId;
  const membership = useAuthStore(state => state.activeMembership);
  const school = useOrganizationStore(state => state.currentSchool);
  const isLoading = useOrganizationStore(state => state.isLoadingSchool);
  const isUpdating = useOrganizationStore(state => state.isUpdatingSchool);
  const error = useOrganizationStore(state => state.error);
  const successMessage = useOrganizationStore(state => state.successMessage);
  const loadSchool = useOrganizationStore(state => state.loadSchool);
  const branches = useOrganizationStore(state => state.branches.items);
  const loadBranches = useOrganizationStore(state => state.loadBranches);
  const updateStatus = useOrganizationStore(state => state.updateSchoolStatus);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);

  useEffect(() => {
    loadSchool(schoolId).catch(() => undefined);
    loadBranches(schoolId).catch(() => undefined);
  }, [loadBranches, loadSchool, schoolId]);

  if (isLoading && school?.id !== schoolId) {
    return <LoadingView message="Loading school…" />;
  }
  if (error && school?.id !== schoolId) {
    return (
      <ErrorState
        message={error.message}
        onRetry={() => loadSchool(schoolId)}
      />
    );
  }
  if (!school || !membership) {
    return <ErrorState message="School information is unavailable." />;
  }

  const role = membership.role;
  const canEdit = canEditSchool(role, membership, schoolId);
  const canManageSessions = canManageAcademicSessions(
    role,
    membership,
    schoolId,
  );
  const canSettings = canEditSchoolSettings(role, membership, schoolId);
  const canStatus = canChangeSchoolStatus(role);
  const nextStatus = school.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const examinationBranch = branches.find(
    branch => branch.schoolId === schoolId && branch.status === 'ACTIVE',
  );

  return (
    <>
      <AppScreen
        contentContainerStyle={styles.screenContent}
        onRefresh={() => loadSchool(schoolId)}
        refreshing={isLoading}
        scrollable
        testID="school-details-screen"
      >
        <View style={styles.maxWidth}>
          <AppHeader
            includeSafeArea={false}
            onBackPress={navigation.goBack}
            title="School Details"
          />
          <View style={styles.hero}>
            <AppAvatar
              name={school.name}
              size={72}
              source={school.logoUrl ? { uri: school.logoUrl } : undefined}
            />
            <View style={styles.heroCopy}>
              <View style={styles.titleRow}>
                <AppText style={styles.title} variant="heading2">
                  {school.name}
                </AppText>
                <AppBadge
                  status={school.status === 'ACTIVE' ? 'active' : 'inactive'}
                />
              </View>
              <AppText color={theme.colors.primary} variant="bodyMedium">
                {school.code}
              </AppText>
            </View>
          </View>
          {successMessage ? (
            <AppCard style={styles.notice} variant="outlined">
              <AppText color={theme.colors.success}>{successMessage}</AppText>
            </AppCard>
          ) : null}
          <AppCard
            header={<AppText variant="title">Overview</AppText>}
            style={styles.card}
            variant="outlined"
          >
            <Detail label="Email" value={school.email ?? '—'} />
            <Detail label="Mobile" value={school.mobile} />
            <Detail
              label="Alternate Mobile"
              value={school.alternateMobile ?? '—'}
            />
            <Detail label="Website" value={school.website ?? '—'} />
            <Detail
              label="Address"
              value={`${school.address.line1}, ${school.address.city}, ${school.address.state} ${school.address.pinCode}`}
            />
            <Detail
              label="Created"
              value={formatDisplayDate(school.createdAt)}
            />
          </AppCard>
          <AppCard
            header={<AppText variant="title">Organization summary</AppText>}
            style={styles.card}
            variant="outlined"
          >
            <Detail label="Branches" value={String(school.branchCount)} />
            <Detail
              label="Active Branches"
              value={String(school.activeBranchCount)}
            />
            <Detail
              label="Academic Session"
              value={school.activeSession?.name ?? 'No active session'}
            />
            <Detail
              label="School Admin"
              value={
                school.schoolAdmin
                  ? `${school.schoolAdmin.name} · ${school.schoolAdmin.mobile}`
                  : 'Not assigned'
              }
            />
          </AppCard>
          <AppText style={styles.actionsTitle} variant="heading3">
            Quick actions
          </AppText>
          <View style={styles.actions}>
            <AppButton
              fullWidth
              onPress={() =>
                navigation.navigate(ROUTES.COLLECTION_DASHBOARD, { schoolId })
              }
              title="Collection Dashboard"
              variant="outline"
            />
            {examinationBranch && school.activeSession ? (
              <AppButton
                fullWidth
                onPress={() =>
                  navigation.navigate(ROUTES.EXAMINATION_SETUP, {
                    academicSessionId: school.activeSession!.id,
                    branchId: examinationBranch.id,
                    schoolId,
                    sessionStatus: 'ACTIVE',
                  })
                }
                title="Examination Setup"
                variant="outline"
              />
            ) : null}
            <AppButton
              fullWidth
              onPress={() =>
                navigation.navigate(ROUTES.FEE_SETUP, { schoolId })
              }
              title="Fee Setup"
              variant="outline"
            />
            <AppButton
              fullWidth
              onPress={() => navigation.navigate(ROUTES.STUDENTS, { schoolId })}
              title="Students"
              variant="outline"
            />
            <AppButton
              fullWidth
              onPress={() =>
                navigation.navigate(ROUTES.ACADEMIC_SETUP, { schoolId })
              }
              title="Academic Setup"
              variant="outline"
            />
            {role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN' ? (
              <AppButton
                fullWidth
                onPress={() =>
                  navigation.navigate(ROUTES.STAFF_USERS, { schoolId })
                }
                title={
                  role === 'SUPER_ADMIN' ? 'School Admin Users' : 'Staff Users'
                }
                variant="outline"
              />
            ) : null}
            {role === 'SCHOOL_ADMIN' ? (
              <AppButton
                fullWidth
                onPress={() =>
                  navigation.navigate(ROUTES.ROLE_LIST, { schoolId })
                }
                title="Roles & Permissions"
                variant="outline"
              />
            ) : null}
            {canEdit ? (
              <AppButton
                fullWidth
                onPress={() =>
                  navigation.navigate(ROUTES.EDIT_SCHOOL, { schoolId })
                }
                title="Edit School"
                variant="outline"
              />
            ) : null}
            {role !== 'BRANCH_ADMIN' ? (
              <AppButton
                fullWidth
                onPress={() =>
                  navigation.navigate(ROUTES.SCHOOL_BRANCHES, { schoolId })
                }
                title="Manage Branches"
                variant="outline"
              />
            ) : null}
            {canManageSessions ? (
              <AppButton
                fullWidth
                onPress={() =>
                  navigation.navigate(ROUTES.ACADEMIC_SESSIONS, { schoolId })
                }
                title="Academic Sessions"
                variant="outline"
              />
            ) : null}
            {canSettings ? (
              <AppButton
                fullWidth
                onPress={() =>
                  navigation.navigate(ROUTES.SCHOOL_SETTINGS, { schoolId })
                }
                title="School Settings"
                variant="outline"
              />
            ) : null}
            {canStatus ? (
              <AppButton
                fullWidth
                onPress={() => setShowStatusConfirm(true)}
                title={
                  school.status === 'ACTIVE'
                    ? 'Deactivate School'
                    : 'Activate School'
                }
                variant={school.status === 'ACTIVE' ? 'danger' : 'primary'}
              />
            ) : null}
          </View>
        </View>
      </AppScreen>
      <ConfirmationDialog
        confirmLabel={nextStatus === 'INACTIVE' ? 'Deactivate' : 'Activate'}
        destructive={nextStatus === 'INACTIVE'}
        loading={isUpdating}
        message={
          nextStatus === 'INACTIVE'
            ? 'Deactivation preserves all data but will prevent school users from protected access after backend enforcement is connected.'
            : 'This will restore the school to active status.'
        }
        onCancel={() => setShowStatusConfirm(false)}
        onConfirm={async () => {
          const updated = await updateStatus(schoolId, nextStatus);
          if (updated) setShowStatusConfirm(false);
        }}
        title={`${
          nextStatus === 'INACTIVE' ? 'Deactivate' : 'Activate'
        } school?`}
        visible={showStatusConfirm}
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
  actions: {
    gap: 10,
  },
  actionsTitle: {
    marginBottom: 12,
    marginTop: 24,
  },
  card: {
    marginTop: 16,
  },
  detail: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 40,
  },
  detailValue: {
    flex: 1,
    marginLeft: 16,
  },
  hero: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 20,
  },
  heroCopy: {
    flex: 1,
    marginLeft: 16,
  },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 720,
    width: '100%',
  },
  notice: {
    marginTop: 16,
  },
  screenContent: {
    paddingBottom: 32,
  },
  title: {
    flex: 1,
    marginRight: 10,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
