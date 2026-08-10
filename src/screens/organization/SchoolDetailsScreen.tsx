import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
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
        <View style={styles.titleRow}>
          <View style={styles.copy}>
            <AppText variant="heading2">{school.name || 'Unnamed school'}</AppText>
            <AppText color={theme.colors.textSecondary} variant="caption">
              Current authenticated school
            </AppText>
          </View>
          <AppBadge status={inactive ? 'inactive' : 'active'} />
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
        <AppCard style={styles.card} variant="outlined">
          <Detail label="Address" value={school.address || '—'} />
          <Detail label="Phone" value={maskPhone(school.phone)} />
          <Detail label="Email" value={school.email || '—'} />
          <Detail label="UPI ID" value={school.upiId || '—'} />
          <Detail label="Created" value={formatDisplayDate(school.createdAt)} />
        </AppCard>
        <AppCard style={styles.card} variant="outlined">
          <AppText variant="title">Live branch summary</AppText>
          {branchError && branches.length === 0 ? (
            <InlineError message={branchError.message} style={styles.notice} />
          ) : (
            <>
              <Detail label="Branches" value={String(branches.length)} />
              <Detail
                label="Active branches"
                value={String(
                  branches.filter(branch => branch.status === 'ACTIVE').length,
                )}
              />
            </>
          )}
        </AppCard>
        <AppCard style={styles.card} variant="outlined">
          <AppText variant="title">Phase 18 scope</AppText>
          <AppText color={theme.colors.textSecondary} style={styles.scopeCopy}>
            Staff, academics, students, fees and other business modules remain
            mock and are not joined to these live organization records.
          </AppText>
        </AppCard>
        <View style={styles.actions}>
          {isSchoolAdmin ? (
            <AppButton
              disabled={inactive}
              fullWidth
              onPress={() =>
                navigation.navigate(ROUTES.EDIT_SCHOOL, { schoolId })
              }
              title="Edit School Profile"
              variant="outline"
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
    marginTop: 12,
  },
  detailValue: { flex: 1, marginLeft: 20 },
  maxWidth: { alignSelf: 'center', maxWidth: 680, width: '100%' },
  notice: { marginTop: 16 },
  scopeCopy: { marginTop: 8 },
  screenContent: { paddingBottom: 32 },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 22,
  },
});
