import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppDetailRow } from '../../components/common/AppDetailRow';
import { AppHeader } from '../../components/common/AppHeader';
import { AppIdentityCard } from '../../components/common/AppIdentityCard';
import { AppScreen } from '../../components/common/AppScreen';
import { AppSectionLabel } from '../../components/common/AppSectionLabel';
import { AppStatCard } from '../../components/common/AppStatCard';
import { AppText } from '../../components/common/AppText';
import { ErrorState } from '../../components/feedback/ErrorState';
import { AppIcon } from '../../components/icons/AppIcon';
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

export function SchoolDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'SchoolDetails'>) {
  const theme = useAppTheme();
  const schoolId = route.params.schoolId;
  const membership = useAuthStore(state => state.activeMembership);
  const logout = useAuthStore(state => state.logout);
  const school = useCurrentOrganizationStore(state => state.currentSchool);
  const branches = useCurrentOrganizationStore(state => state.allBranches);
  const isLoadingSchool = useCurrentOrganizationStore(
    state => state.isLoadingSchool,
  );
  const isLoadingBranches = useCurrentOrganizationStore(
    state => state.isLoadingBranches,
  );
  const schoolError = useCurrentOrganizationStore(state => state.schoolError);
  const branchError = useCurrentOrganizationStore(state => state.branchError);
  const successMessage = useCurrentOrganizationStore(
    state => state.successMessage,
  );
  const loadSchool = useCurrentOrganizationStore(
    state => state.loadCurrentSchool,
  );
  const loadBranches = useCurrentOrganizationStore(
    state => state.loadBranches,
  );
  const cancelSchool = useCurrentOrganizationStore(
    state => state.cancelSchoolRequest,
  );
  const cancelBranches = useCurrentOrganizationStore(
    state => state.cancelBranchRequest,
  );
  const authorized =
    membership?.schoolId === schoolId &&
    ['SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(membership.role);

  useEffect(() => {
    if (!authorized) return;
    loadSchool(schoolId).catch(() => undefined);
    loadBranches(schoolId).catch(() => undefined);
    return () => {
      cancelSchool();
      cancelBranches();
    };
  }, [
    authorized,
    cancelBranches,
    cancelSchool,
    loadBranches,
    loadSchool,
    schoolId,
  ]);

  if (!authorized) {
    return (
      <ErrorState
        message="This current-school workspace is not available to your role."
        title="Access denied"
      />
    );
  }
  if (isLoadingSchool && school?.id !== schoolId) {
    return <LoadingView message="Loading school…" />;
  }
  if (!school || school.id !== schoolId) {
    return (
      <ErrorState
        message={schoolError?.message ?? 'School information is unavailable.'}
        onRetry={() => loadSchool(schoolId)}
        title={schoolError?.status === 404 ? 'School unavailable' : undefined}
      />
    );
  }

  const isSchoolAdmin = membership.role === 'SCHOOL_ADMIN';
  const inactive = school.status === 'INACTIVE';
  const refresh = async () => {
    await Promise.all([loadSchool(schoolId), loadBranches(schoolId)]);
  };

  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      onRefresh={refresh}
      refreshing={isLoadingSchool || isLoadingBranches}
      scrollable
      testID="school-details-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          title="My School"
        />
        <View style={styles.identity}>
          <AppIdentityCard
            icon="school"
            subtitle="Current authenticated school"
            title={school.name || 'Unnamed school'}
            trailing={<AppBadge status={inactive ? 'inactive' : 'active'} />}
          />
        </View>
        {inactive ? (
          <InlineError
            message="This school is inactive. Django does not globally revoke existing JWTs, so management actions are blocked here while logout remains available."
            style={styles.notice}
          />
        ) : null}
        {successMessage ? (
          <AppCard style={styles.notice} variant="outlined">
            <AppText color={theme.colors.success}>{successMessage}</AppText>
          </AppCard>
        ) : null}
        <View style={styles.section}>
          <AppSectionLabel title="Branches" accent="#6366F1" />
        </View>
        {branchError && branches.length === 0 ? (
          <InlineError message={branchError.message} />
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statSlot}>
              <AppStatCard
                compact
                icon="globe"
                iconBg="#EEF2FF"
                iconColor="#6366F1"
                label="Total branches"
                value={branches.length}
              />
            </View>
            <View style={styles.statSlot}>
              <AppStatCard
                compact
                icon="check-circle"
                iconBg={theme.colors.successSubtle}
                iconColor={theme.colors.success}
                label="Active"
                value={
                  branches.filter(branch => branch.status === 'ACTIVE').length
                }
              />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <AppSectionLabel title="School information" />
        </View>
        <AppCard contentStyle={styles.detailCard}>
          <AppDetailRow
            icon="map-pin"
            label="Address"
            value={school.address || '—'}
          />
          <AppDetailRow
            divided
            icon="phone"
            iconColor="#18A978"
            iconTint="#E8F8F2"
            label="Phone"
            value={maskPhone(school.phone)}
          />
          <AppDetailRow
            divided
            icon="mail"
            iconColor="#6366F1"
            iconTint="#EEF2FF"
            label="Email"
            value={school.email || '—'}
          />
          <AppDetailRow
            divided
            icon="wallet"
            iconColor="#F59A23"
            iconTint="#FFF4E4"
            label="UPI ID"
            value={school.upiId || '—'}
          />
          <AppDetailRow
            divided
            icon="calendar"
            iconColor="#7A5AF8"
            iconTint="#F0ECFF"
            label="Created"
            value={formatDisplayDate(school.createdAt)}
          />
        </AppCard>

        <View
          style={[
            styles.scopeNote,
            {
              backgroundColor: theme.colors.infoSubtle,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <AppIcon
            color={theme.colors.info}
            name="info"
            size={17}
            strokeWidth={2}
          />
          <AppText
            color={theme.colors.textSecondary}
            style={styles.scopeCopy}
            variant="caption"
          >
            Staff, academics, students, fees and other business modules remain
            mock and are not joined to these live organization records.
          </AppText>
        </View>
        <View style={styles.actions}>
          {isSchoolAdmin ? (
            <AppButton
              disabled={inactive}
              fullWidth
              onPress={() =>
                navigation.navigate(ROUTES.EDIT_SCHOOL, { schoolId })
              }
              title="Edit School Profile"
            />
          ) : null}
          {isSchoolAdmin ? (
            <AppButton
              fullWidth
              onPress={() =>
                navigation.navigate(ROUTES.SCHOOL_BRANCHES, { schoolId })
              }
              title="Manage Branches"
              variant="outline"
            />
          ) : membership.branchId ? (
            <AppButton
              fullWidth
              onPress={() =>
                navigation.navigate(ROUTES.BRANCH_DETAILS, {
                  branchId: membership.branchId!,
                  schoolId,
                })
              }
              title="View Assigned Branch"
              variant="outline"
            />
          ) : null}
          {inactive ? (
            <AppButton
              fullWidth
              onPress={logout}
              title="Log Out"
              variant="danger"
            />
          ) : null}
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 12, marginTop: 26 },
  detailCard: { paddingVertical: 4 },
  identity: { marginTop: 20 },
  maxWidth: { alignSelf: 'center', maxWidth: 680, width: '100%' },
  notice: { marginTop: 16 },
  scopeCopy: { flex: 1 },
  scopeNote: {
    alignItems: 'flex-start',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    padding: 14,
  },
  screenContent: { paddingBottom: 32 },
  section: { marginTop: 22 },
  statSlot: { flex: 1 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
});
