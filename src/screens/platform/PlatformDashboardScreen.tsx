import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore, usePlatformStore } from '../../store';
import { formatCurrency } from '../../utils/currency';

export function PlatformDashboardScreen({
  navigation,
  route,
}: RoleScreenProps<'RoleLanding'>) {
  const theme = useAppTheme();
  const membership = useAuthStore(state => state.activeMembership);
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const isLoggingOut = useAuthStore(state => state.isLoading);
  const dashboard = usePlatformStore(state => state.dashboard);
  const error = usePlatformStore(state => state.dashboardError);
  const isLoading = usePlatformStore(state => state.isLoadingDashboard);
  const loadDashboard = usePlatformStore(state => state.loadDashboard);
  const cancelDashboardRequest = usePlatformStore(
    state => state.cancelDashboardRequest,
  );
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    loadDashboard().catch(() => undefined);
    return cancelDashboardRequest;
  }, [cancelDashboardRequest, loadDashboard]);

  if (
    !membership ||
    membership.role !== 'SUPER_ADMIN' ||
    route.params.role !== 'SUPER_ADMIN'
  ) {
    return (
      <AppScreen testID="platform-access-denied-screen">
        <ErrorState
          message="Only a verified Super Admin can access platform management."
          title="Platform access denied"
        />
      </AppScreen>
    );
  }

  return (
    <>
      <AppScreen
        contentContainerStyle={styles.screenContent}
        onRefresh={loadDashboard}
        refreshing={isLoading}
        scrollable
        testID="platform-dashboard-screen"
      >
        <View style={styles.maxWidth}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <AppText color={theme.colors.textSecondary} variant="caption">
                OHMYTEACHER PLATFORM
              </AppText>
              <AppText variant="heading2">
                Welcome, {user?.name || 'Super Admin'}
              </AppText>
            </View>
            <AppButton
              onPress={() => setShowLogout(true)}
              title="Sign out"
              variant="ghost"
            />
          </View>

          {isLoading && !dashboard ? (
            <LoadingView message="Loading platform dashboard…" />
          ) : error ? (
            <ErrorState
              message={error.message}
              onRetry={loadDashboard}
              title={
                error.status === 403
                  ? 'Platform permission denied'
                  : 'Dashboard unavailable'
              }
            />
          ) : dashboard ? (
            <>
              <View style={styles.metrics}>
                <Metric label="Total Schools" value={dashboard.totalSchools} />
                <Metric label="Active Schools" value={dashboard.activeSchools} />
                <Metric label="Total Branches" value={dashboard.totalBranches} />
                <Metric label="Active Students" value={dashboard.totalStudents} />
                <Metric label="Active Teachers" value={dashboard.totalTeachers} />
                <Metric
                  label="Collection This Month"
                  value={formatCurrency(Number(dashboard.thisMonthCollection))}
                />
              </View>
              <AppButton
                fullWidth
                onPress={() => navigation.navigate(ROUTES.SCHOOLS)}
                style={styles.action}
                title="Manage Schools"
              />
              <AppText
                align="center"
                color={theme.colors.textSecondary}
                style={styles.note}
                variant="caption"
              >
                Dashboard trends and charts are unavailable because the backend
                currently provides headline metrics only.
              </AppText>
            </>
          ) : null}
        </View>
      </AppScreen>
      <ConfirmationDialog
        confirmLabel="Sign out"
        destructive
        loading={isLoggingOut}
        message="Your secure local session will be cleared on this device."
        onCancel={() => setShowLogout(false)}
        onConfirm={logout}
        title="Sign out of OhMyTeacher?"
        visible={showLogout}
      />
    </>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  const theme = useAppTheme();
  return (
    <AppCard style={styles.metric} variant="elevated">
      <AppText color={theme.colors.textSecondary} variant="caption">
        {label}
      </AppText>
      <AppText style={styles.metricValue} variant="heading2">
        {String(value)}
      </AppText>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  action: { marginTop: 24 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 12,
  },
  headerCopy: { flex: 1, marginRight: 12 },
  maxWidth: { alignSelf: 'center', maxWidth: 760, width: '100%' },
  metric: { minWidth: 210, width: '48%' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricValue: { marginTop: 8 },
  note: { marginTop: 14 },
  screenContent: { paddingBottom: 32 },
});
