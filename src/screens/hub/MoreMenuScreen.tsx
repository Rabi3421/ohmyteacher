import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/common/AppText';
import { AppCard } from '../../components/common/AppCard';
import { AppAvatar } from '../../components/common/AppAvatar';
import { AppListRow } from '../../components/common/AppListRow';
import { TAB_BAR_HEIGHT } from '../../components/layout/AppBottomTabBar';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTabFocus } from '../../hooks/useTabFocus';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore } from '../../store';
import { getRoleLabel } from '../../utils/role';

export function MoreMenuScreen({ navigation, route }: RoleScreenProps<'MoreMenu'>) {
  const theme = useAppTheme();
  const { role } = route.params;
  const membership = useAuthStore(s => s.activeMembership);
  const memberships = useAuthStore(s => s.memberships);
  const user = useAuthStore(s => s.user);
  const school = useAuthStore(s => s.school);
  const switchWorkspace = useAuthStore(s => s.switchWorkspace);
  const logout = useAuthStore(s => s.logout);
  const insets = useSafeAreaInsets();
  const [showLogout, setShowLogout] = useState(false);

  useTabFocus('more');

  const schoolId = membership?.schoolId ?? '';
  const branchId = membership?.branchId;

  const isStaff = ['SCHOOL_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'].includes(role);
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isSchoolAdmin = role === 'SCHOOL_ADMIN';
  const canViewReports = isStaff || isSuperAdmin;
  const canManageCommunication = isStaff;
  const hasMultipleWorkspaces = memberships.filter(m => m.status === 'ACTIVE').length > 1;

  const workspaceName = membership?.schoolName ?? school?.name ?? 'My Workspace';
  const roleLabel = getRoleLabel(role);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border, paddingTop: insets.top + 8 }]}>
        <AppText style={{ color: theme.colors.textPrimary }} variant="heading3">More</AppText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <AppCard contentStyle={styles.profileCard}>
          <View style={styles.profileRow}>
            <AppAvatar name={user?.name ?? 'User'} size={52} />
            <View style={styles.profileInfo}>
              <AppText style={{ color: theme.colors.textPrimary }} variant="title">{user?.name || 'My Account'}</AppText>
              <AppText style={{ color: theme.colors.primary, marginTop: 2 }} variant="caption">{roleLabel}</AppText>
              <AppText style={{ color: theme.colors.textSecondary, marginTop: 1 }} variant="caption" numberOfLines={1}>{workspaceName}</AppText>
            </View>
          </View>
        </AppCard>

        {/* Organisation */}
        {(isSchoolAdmin || isSuperAdmin) && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.sectionHeader}>
              <AppText style={{ color: theme.colors.textSecondary }} variant="label">ORGANISATION</AppText>
            </View>
            {isSuperAdmin ? (
              <AppListRow leftIcon="school" leftIconBg={theme.colors.primarySubtle} leftIconColor={theme.colors.primary} onPress={() => navigation.navigate(ROUTES.SCHOOLS)} title="Manage Schools" />
            ) : null}
            {isSchoolAdmin && schoolId ? (
              <>
                <AppListRow leftIcon="school" leftIconBg={theme.colors.primarySubtle} leftIconColor={theme.colors.primary} onPress={() => navigation.navigate(ROUTES.SCHOOL_DETAILS, { schoolId })} title="School Details" />
                <AppListRow leftIcon="globe" leftIconBg="#EEF2FF" leftIconColor="#6366F1" onPress={() => navigation.navigate(ROUTES.SCHOOL_BRANCHES, { schoolId })} title="Branches" />
                <AppListRow leftIcon="calendar" leftIconBg="#FFF4E4" leftIconColor="#F59A23" onPress={() => navigation.navigate(ROUTES.ACADEMIC_SESSIONS, { schoolId })} title="Academic Sessions" />
                <AppListRow leftIcon="settings" leftIconBg={theme.colors.surfaceMuted} leftIconColor={theme.colors.textSecondary} onPress={() => navigation.navigate(ROUTES.SCHOOL_SETTINGS, { schoolId })} title="School Settings" />
              </>
            ) : null}
          </View>
        )}

        {/* Reports */}
        {canViewReports && schoolId ? (
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.sectionHeader}>
              <AppText style={{ color: theme.colors.textSecondary }} variant="label">REPORTS</AppText>
            </View>
            <AppListRow leftIcon="bar-chart" leftIconBg="#FDECF3" leftIconColor="#E84D8A" onPress={() => navigation.navigate(ROUTES.REPORTS_DASHBOARD, { schoolId })} title="Reports Dashboard" />
            <AppListRow leftIcon="trending-up" leftIconBg="#FDECF3" leftIconColor="#E84D8A" onPress={() => navigation.navigate(ROUTES.FEE_ANALYTICS_DASHBOARD, { schoolId })} title="Fee Analytics" />
            <AppListRow leftIcon="bar-chart" leftIconBg="#FDECF3" leftIconColor="#E84D8A" onPress={() => navigation.navigate(ROUTES.COLLECTION_ANALYTICS_DASHBOARD, { schoolId })} title="Collection Analytics" />
          </View>
        ) : null}

        {/* Communication */}
        {canManageCommunication && schoolId ? (
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.sectionHeader}>
              <AppText style={{ color: theme.colors.textSecondary }} variant="label">COMMUNICATION</AppText>
            </View>
            <AppListRow leftIcon="inbox" leftIconBg="#F0ECFF" leftIconColor="#7A5AF8" onPress={() => navigation.navigate(ROUTES.COMMUNICATION_DASHBOARD, { branchId, schoolId })} title="Communication Dashboard" />
            <AppListRow leftIcon="bell" leftIconBg="#F0ECFF" leftIconColor="#7A5AF8" onPress={() => navigation.navigate(ROUTES.NOTIFICATION_CENTER, { branchId, schoolId })} title="Notifications" />
          </View>
        ) : null}

        {/* Staff Management */}
        {isSchoolAdmin && schoolId ? (
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.sectionHeader}>
              <AppText style={{ color: theme.colors.textSecondary }} variant="label">STAFF MANAGEMENT</AppText>
            </View>
            <AppListRow leftIcon="users" leftIconBg="#FFF4E4" leftIconColor="#F59A23" onPress={() => navigation.navigate(ROUTES.STAFF_USERS, { schoolId })} title="Staff Users" />
            <AppListRow leftIcon="shield-settings" leftIconBg="#FFF4E4" leftIconColor="#F59A23" onPress={() => navigation.navigate(ROUTES.ROLE_LIST, { schoolId })} title="Roles & Permissions" />
          </View>
        ) : null}

        {/* Account */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.sectionHeader}>
            <AppText style={{ color: theme.colors.textSecondary }} variant="label">ACCOUNT</AppText>
          </View>
          {hasMultipleWorkspaces ? (
            <AppListRow leftIcon="globe" leftIconBg={theme.colors.primarySubtle} leftIconColor={theme.colors.primary} onPress={() => switchWorkspace()} title="Switch Workspace" />
          ) : null}
          <AppListRow destructive leftIcon="log-out" onPress={() => setShowLogout(true)} showChevron={false} title="Sign Out" />
        </View>
      </ScrollView>

      <ConfirmationDialog
        confirmLabel="Sign Out"
        destructive
        loading={false}
        message="You will need to enter your OTP to sign back in."
        onCancel={() => setShowLogout(false)}
        onConfirm={() => { setShowLogout(false); logout(); }}
        title="Sign out of this workspace?"
        visible={showLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 16 },
  header: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 16, paddingHorizontal: 20 },
  profileCard: { padding: 16 },
  profileInfo: { flex: 1 },
  profileRow: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  root: { flex: 1 },
  section: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  sectionHeader: { paddingBottom: 4, paddingHorizontal: 16, paddingTop: 12 },
});
