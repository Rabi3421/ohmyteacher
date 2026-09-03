import React, { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/common/AppText';
import { AppAvatar } from '../../components/common/AppAvatar';
import { AppListRow } from '../../components/common/AppListRow';
import { AppSectionLabel } from '../../components/common/AppSectionLabel';
import { AppHubHeader } from '../../components/layout/AppHubHeader';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTabFocus } from '../../hooks/useTabFocus';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore } from '../../store';
import { brandGradientTop } from '../../theme/gradients';
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
    <View
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      testID="more-menu-screen"
    >
      <StatusBar
        backgroundColor={brandGradientTop(theme.mode)}
        barStyle="light-content"
      />

      <AppHubHeader
        icon="settings"
        subtitle="Account, organisation, and preferences"
        title="More"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
            },
          ]}
        >
          <AppAvatar name={user?.name ?? 'User'} size={54} />
          <View style={styles.profileInfo}>
            <AppText numberOfLines={1} style={[styles.profileName, { color: theme.colors.textPrimary }]}>
              {user?.name || 'My Account'}
            </AppText>
            <View style={styles.profileChips}>
              <View style={[styles.chip, { backgroundColor: theme.colors.primarySubtle }]}>
                <AppText style={{ color: theme.colors.primary }} variant="caption">{roleLabel}</AppText>
              </View>
            </View>
            <AppText numberOfLines={1} style={[styles.profileWorkspace, { color: theme.colors.textSecondary }]} variant="caption">
              {workspaceName}
            </AppText>
          </View>
        </View>

        {/* Organisation */}
        {(isSchoolAdmin || isSuperAdmin) && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
            <View style={styles.sectionHeader}>
              <AppSectionLabel title="Organisation" />
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
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
            <View style={styles.sectionHeader}>
              <AppSectionLabel accent="#E84D8A" title="Reports" />
            </View>
            <AppListRow leftIcon="bar-chart" leftIconBg="#FDECF3" leftIconColor="#E84D8A" onPress={() => navigation.navigate(ROUTES.REPORTS_DASHBOARD, { schoolId })} title="Reports Dashboard" />
            <AppListRow leftIcon="trending-up" leftIconBg="#FDECF3" leftIconColor="#E84D8A" onPress={() => navigation.navigate(ROUTES.FEE_ANALYTICS_DASHBOARD, { schoolId })} title="Fee Analytics" />
            <AppListRow leftIcon="bar-chart" leftIconBg="#FDECF3" leftIconColor="#E84D8A" onPress={() => navigation.navigate(ROUTES.COLLECTION_ANALYTICS_DASHBOARD, { schoolId })} title="Collection Analytics" />
          </View>
        ) : null}

        {/* Communication */}
        {canManageCommunication && schoolId ? (
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
            <View style={styles.sectionHeader}>
              <AppSectionLabel accent="#7A5AF8" title="Communication" />
            </View>
            <AppListRow leftIcon="inbox" leftIconBg="#F0ECFF" leftIconColor="#7A5AF8" onPress={() => navigation.navigate(ROUTES.COMMUNICATION_DASHBOARD, { branchId, schoolId })} title="Communication Dashboard" />
            <AppListRow leftIcon="bell" leftIconBg="#F0ECFF" leftIconColor="#7A5AF8" onPress={() => navigation.navigate(ROUTES.NOTIFICATION_CENTER, { branchId, schoolId })} title="Notifications" />
          </View>
        ) : null}

        {/* Staff Management */}
        {isSchoolAdmin && schoolId ? (
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
            <View style={styles.sectionHeader}>
              <AppSectionLabel accent="#F59A23" title="Staff Management" />
            </View>
            <AppListRow leftIcon="users" leftIconBg="#FFF4E4" leftIconColor="#F59A23" onPress={() => navigation.navigate(ROUTES.STAFF_USERS, { schoolId })} title="Staff Users" />
            <AppListRow leftIcon="shield-settings" leftIconBg="#FFF4E4" leftIconColor="#F59A23" onPress={() => navigation.navigate(ROUTES.ROLE_LIST, { schoolId })} title="Roles & Permissions" />
          </View>
        ) : null}

        {/* Account */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
          <View style={styles.sectionHeader}>
            <AppSectionLabel title="Account" />
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
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  content: { gap: 14, paddingBottom: 28, paddingHorizontal: 20, paddingTop: 20 },
  profileCard: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  profileChips: { flexDirection: 'row', gap: 6, marginTop: 6 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700', lineHeight: 23 },
  profileWorkspace: { marginTop: 6 },
  root: { flex: 1 },
  section: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  sectionHeader: { paddingBottom: 6, paddingHorizontal: 16, paddingTop: 14 },
});
