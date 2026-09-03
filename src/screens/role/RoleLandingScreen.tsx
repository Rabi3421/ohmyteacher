import React from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppActionTile } from '../../components/common/AppActionTile';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ErrorState } from '../../components/feedback/ErrorState';
import { AppIcon, type AppIconName } from '../../components/icons/AppIcon';
import { AppHeroHeader } from '../../components/layout/AppHeroHeader';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTabFocus } from '../../hooks/useTabFocus';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import {
  useAuthStore,
  useCurrentOrganizationStore,
  useOrganizationStore,
  useUserManagementStore,
} from '../../store';
import { getEffectivePermissions } from '../../utils/effectivePermissions';
import { getRoleLabel } from '../../utils/role';

// Tinted icon pairs shared with the welcome screen's floating badges so the
// signed-in shell keeps the same visual language as the marketing entry point.
const TONE = {
  blue: { accent: '#1478F2', tint: '#EAF3FF' },
  green: { accent: '#18A978', tint: '#E8F8F2' },
  indigo: { accent: '#6366F1', tint: '#EEF2FF' },
  orange: { accent: '#F59A23', tint: '#FFF4E4' },
  pink: { accent: '#E84D8A', tint: '#FDECF3' },
  purple: { accent: '#7A5AF8', tint: '#F0ECFF' },
  red: { accent: '#F26B55', tint: '#FFF0ED' },
} as const;

type Tone = keyof typeof TONE;

interface QuickAction {
  icon: AppIconName;
  title: string;
  description: string;
  tone: Tone;
  onPress: () => void;
}

interface HeroStat {
  icon: AppIconName;
  label: string;
  value: string;
  tone: Tone;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });
}

export function RoleLandingScreen({
  navigation,
  route,
}: RoleScreenProps<'RoleLanding'>) {
  const theme = useAppTheme();
  const user = useAuthStore(state => state.user);
  const school = useAuthStore(state => state.school);
  const membership = useAuthStore(state => state.activeMembership);
  const logout = useAuthStore(state => state.logout);
  const memberships = useAuthStore(state => state.memberships);
  const switchWorkspace = useAuthStore(state => state.switchWorkspace);
  const roleConfiguration = useUserManagementStore(state => state.roleConfiguration);
  const branches = useCurrentOrganizationStore(state => state.branches.items);
  const isLoadingBranches = useCurrentOrganizationStore(state => state.isLoadingBranches);
  const loadBranches = useCurrentOrganizationStore(state => state.loadBranches);
  const loadAcademicSessions = useOrganizationStore(state => state.loadAcademicSessions);
  const academicSessions = useOrganizationStore(state => state.academicSessions);

  useTabFocus('home');

  React.useEffect(() => {
    if (membership?.schoolId && ['SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(membership.role)) {
      loadBranches(membership.schoolId).catch(() => undefined);
      loadAcademicSessions(membership.schoolId).catch(() => undefined);
    }
  }, [loadAcademicSessions, loadBranches, membership?.role, membership?.schoolId]);

  if (!user || !membership || membership.role !== route.params.role) {
    return (
      <AppScreen testID="role-access-error-screen">
        <ErrorState
          message="This workspace could not be resolved safely. Please sign in again."
          onRetry={logout}
          retryLabel="Return to login"
          title="Workspace access unavailable"
        />
      </AppScreen>
    );
  }

  const role = membership.role;
  const roleLabel = getRoleLabel(role);
  const schoolId = membership.schoolId ?? '';
  const branchId = membership.branchId;
  const workspaceName = membership.schoolName ?? school?.name ?? 'My School';
  const firstName = user.name.trim().split(/\s+/)[0] || 'there';
  const permissions = getEffectivePermissions(
    role,
    roleConfiguration?.schoolId === membership.schoolId && roleConfiguration?.role === role
      ? roleConfiguration
      : null,
  );

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isSchoolAdmin = role === 'SCHOOL_ADMIN';
  const isBranchAdmin = role === 'BRANCH_ADMIN';
  const isStaff = ['SCHOOL_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'].includes(role);
  const isParent = role === 'PARENT';
  const isStudent = role === 'STUDENT';

  const activeBranchCount = branches.filter(b => b.status === 'ACTIVE').length;
  const hasMultipleWorkspaces =
    memberships.filter(m => m.status === 'ACTIVE').length > 1;

  const activeSession =
    academicSessions.find(s => s.status === 'ACTIVE') ??
    academicSessions.find(s => s.status === 'UPCOMING');
  const examBranch =
    branches.find(b => b.id === branchId) ??
    branches.find(b => b.status === 'ACTIVE');

  const notificationsTarget = (() => {
    if (isStaff && schoolId) {
      return () => navigation.navigate(ROUTES.NOTIFICATION_CENTER, { branchId, schoolId });
    }
    if (isParent && schoolId) {
      return () =>
        navigation.navigate(ROUTES.PARENT_NOTIFICATIONS, {
          parentMembershipId: membership.id,
          schoolId,
        });
    }
    if (isStudent && schoolId) {
      return () =>
        navigation.navigate(ROUTES.STUDENT_NOTIFICATIONS, {
          schoolId,
          studentMembershipId: membership.id,
        });
    }
    return undefined;
  })();

  // Key actions based on role
  const quickActions: QuickAction[] = (() => {
    if (isSuperAdmin) {
      return [
        {
          icon: 'school', tone: 'blue',
          title: 'Manage Schools', description: 'View and manage all schools',
          onPress: () => navigation.navigate(ROUTES.SCHOOLS),
        },
        {
          icon: 'plus', tone: 'green',
          title: 'Add School', description: 'Onboard a new organisation',
          onPress: () => navigation.navigate(ROUTES.CREATE_SCHOOL),
        },
        {
          icon: 'bar-chart', tone: 'pink',
          title: 'Platform Reports', description: 'Analytics and insights',
          onPress: () => navigation.navigate(ROUTES.REPORTS_DASHBOARD, { schoolId: 'platform' }),
        },
      ];
    }

    if (isParent) {
      return [
        {
          icon: 'users', tone: 'green',
          title: 'My Children', description: 'Academic status and details',
          onPress: () => navigation.navigate(ROUTES.PARENT_CHILDREN, { parentMembershipId: membership.id, schoolId }),
        },
        {
          icon: 'credit-card', tone: 'red',
          title: 'Fee Dues', description: 'Pending and overdue fees',
          onPress: () => navigation.navigate(ROUTES.PARENT_FEES, { parentMembershipId: membership.id, schoolId }),
        },
        {
          icon: 'graduation-cap', tone: 'indigo',
          title: 'Results', description: 'Exam scores and grades',
          onPress: () => navigation.navigate(ROUTES.PARENT_RESULTS, { parentMembershipId: membership.id, schoolId }),
        },
        {
          icon: 'file-text', tone: 'purple',
          title: 'Report Cards', description: 'Academic report cards',
          onPress: () => navigation.navigate(ROUTES.PARENT_REPORT_CARDS, { parentMembershipId: membership.id, schoolId }),
        },
      ];
    }

    if (isStudent) {
      return [
        {
          icon: 'credit-card', tone: 'red',
          title: 'My Fees', description: 'Fee dues and payment history',
          onPress: () => navigation.navigate(ROUTES.STUDENT_FEES, { schoolId, studentMembershipId: membership.id }),
        },
        {
          icon: 'graduation-cap', tone: 'indigo',
          title: 'My Results', description: 'Exam scores and performance',
          onPress: () => navigation.navigate(ROUTES.STUDENT_RESULTS, { schoolId, studentMembershipId: membership.id }),
        },
        {
          icon: 'file-text', tone: 'purple',
          title: 'Report Cards', description: 'Your report cards',
          onPress: () => navigation.navigate(ROUTES.STUDENT_REPORT_CARDS, { schoolId, studentMembershipId: membership.id }),
        },
        {
          icon: 'user', tone: 'green',
          title: 'My Profile', description: 'Personal and class details',
          onPress: () => navigation.navigate(ROUTES.STUDENT_SELF_PROFILE, { schoolId, studentMembershipId: membership.id }),
        },
      ];
    }

    // Staff roles
    const staffActions: QuickAction[] = [];

    if (isSchoolAdmin && schoolId) {
      staffActions.push({
        icon: 'school', tone: 'blue',
        title: 'School Details', description: 'Manage your school',
        onPress: () => navigation.navigate(ROUTES.SCHOOL_DETAILS, { schoolId }),
      });
      staffActions.push({
        icon: 'globe', tone: 'indigo',
        title: 'Branches', description: 'Campuses and locations',
        onPress: () => navigation.navigate(ROUTES.SCHOOL_BRANCHES, { schoolId }),
      });
    } else if (isBranchAdmin && schoolId && branchId) {
      staffActions.push({
        icon: 'globe', tone: 'blue',
        title: 'My Branch', description: 'View branch details',
        onPress: () => navigation.navigate(ROUTES.BRANCH_DETAILS, { schoolId, branchId }),
      });
    }

    if (isStaff && schoolId && branchId) {
      staffActions.push({
        icon: 'users', tone: 'green',
        title: 'Students', description: 'Manage student records',
        onPress: () => navigation.navigate(ROUTES.STUDENTS, { schoolId, branchId }),
      });
      staffActions.push({
        icon: 'credit-card', tone: 'red',
        title: 'Fee Outstanding', description: 'Pending and overdue dues',
        onPress: () => navigation.navigate(ROUTES.FEE_OUTSTANDING_DASHBOARD, { schoolId, branchId }),
      });
      staffActions.push({
        icon: 'wallet', tone: 'blue',
        title: 'Collections', description: 'Daily payments and receipts',
        onPress: () => navigation.navigate(ROUTES.COLLECTION_DASHBOARD, { schoolId, branchId }),
      });
    }

    if ((isSchoolAdmin || isBranchAdmin) && schoolId && examBranch && activeSession) {
      staffActions.push({
        icon: 'calendar-check', tone: 'purple',
        title: 'Examinations', description: 'Exam setup and marks entry',
        onPress: () => navigation.navigate(ROUTES.EXAMINATION_SETUP, {
          schoolId, branchId: examBranch.id,
          academicSessionId: activeSession.id,
          sessionStatus: activeSession.status,
        }),
      });
    }

    if (isSchoolAdmin && schoolId) {
      staffActions.push({
        icon: 'calendar', tone: 'orange',
        title: 'Academic Sessions', description: 'Sessions and calendar',
        onPress: () => navigation.navigate(ROUTES.ACADEMIC_SESSIONS, { schoolId }),
      });
      staffActions.push({
        icon: 'shield-settings', tone: 'purple',
        title: 'Staff & Roles', description: 'Users and permissions',
        onPress: () => navigation.navigate(ROUTES.STAFF_USERS, { schoolId }),
      });
    }

    if (permissions.includes('reports.dashboard.view') && schoolId) {
      staffActions.push({
        icon: 'bar-chart', tone: 'pink',
        title: 'Reports', description: 'Analytics and insights',
        onPress: () => navigation.navigate(ROUTES.REPORTS_DASHBOARD, { schoolId, branchIds: branchId ? [branchId] : undefined }),
      });
    }

    return staffActions;
  })();

  const heroStats: HeroStat[] = (() => {
    const stats: HeroStat[] = [];
    if (isSchoolAdmin) {
      stats.push({
        icon: 'globe',
        label: activeBranchCount === 1 ? 'Branch' : 'Branches',
        tone: 'indigo',
        // Avoid flashing a misleading "0" while the branch list is in flight.
        value: isLoadingBranches && branches.length === 0 ? '—' : String(activeBranchCount),
      });
    } else if (membership.branchName) {
      stats.push({
        icon: 'globe', label: 'Branch', tone: 'indigo',
        value: membership.branchName,
      });
    }
    if (activeSession) {
      stats.push({
        icon: 'calendar', label: 'Session', tone: 'orange',
        value: activeSession.name,
      });
    }
    stats.push({
      icon: 'shield-check', label: 'Account', tone: 'green', value: 'Active',
    });
    return stats;
  })();

  const sectionTitle = isParent || isStudent ? 'My Information' : 'Quick Access';
  const sectionSubtitle =
    isParent || isStudent
      ? 'Your school information at a glance'
      : 'Frequently used modules for your role';

  return (
    <View
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      testID="role-landing-screen"
    >
      <StatusBar
        backgroundColor={theme.mode === 'dark' ? '#1D4ED8' : '#3FAEFF'}
        barStyle="light-content"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AppHeroHeader
          avatarName={user.name}
          avatarUri={user.avatarUrl}
          contextLabel={`${roleLabel} · ${workspaceName}`}
          dateLabel={todayLabel()}
          greeting={greeting()}
          name={firstName}
          onAvatarPress={() => navigation.navigate(ROUTES.MORE_MENU, { role })}
          onBellPress={notificationsTarget}
        />

        {/* Summary strip floating over the hero */}
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
            },
          ]}
        >
          {heroStats.map((stat, index) => (
            <React.Fragment key={stat.label}>
              {index > 0 ? (
                <View
                  style={[styles.statDivider, { backgroundColor: theme.colors.border }]}
                />
              ) : null}
              <View style={styles.statItem}>
                <View
                  style={[styles.statIcon, { backgroundColor: TONE[stat.tone].tint }]}
                >
                  <AppIcon
                    color={TONE[stat.tone].accent}
                    name={stat.icon}
                    size={16}
                    strokeWidth={2.2}
                  />
                </View>
                <AppText
                  numberOfLines={1}
                  style={[styles.statValue, { color: theme.colors.textPrimary }]}
                >
                  {stat.value}
                </AppText>
                <AppText
                  numberOfLines={1}
                  style={{ color: theme.colors.textSecondary }}
                  variant="caption"
                >
                  {stat.label}
                </AppText>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Quick actions */}
        <View style={styles.sectionHeader}>
          <AppText style={{ color: theme.colors.textPrimary }} variant="title">
            {sectionTitle}
          </AppText>
          <Svg
            accessibilityElementsHidden
            height="9"
            style={styles.sectionAccent}
            viewBox="0 0 74 10"
            width="74"
          >
            <Path
              d="M3 7.5 Q37 -0.5 71 7.5"
              fill="none"
              stroke={theme.colors.orange}
              strokeLinecap="round"
              strokeWidth="4"
            />
          </Svg>
          <AppText
            style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}
            variant="caption"
          >
            {sectionSubtitle}
          </AppText>
        </View>

        <View style={styles.tileGrid}>
          {quickActions.map(action => (
            <View key={action.title} style={styles.tileSlot}>
              <AppActionTile
                accent={TONE[action.tone].accent}
                description={action.description}
                icon={action.icon}
                onPress={action.onPress}
                tint={TONE[action.tone].tint}
                title={action.title}
              />
            </View>
          ))}
        </View>

        {/* Workspace */}
        <View style={styles.sectionHeader}>
          <AppText style={{ color: theme.colors.textPrimary }} variant="title">
            Workspace
          </AppText>
        </View>

        <View
          style={[
            styles.workspaceCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
            },
          ]}
        >
          <View style={styles.workspaceHeader}>
            <View
              style={[styles.workspaceIcon, { backgroundColor: TONE.blue.tint }]}
            >
              <AppIcon
                color={TONE.blue.accent}
                name="school"
                size={22}
                strokeWidth={2.1}
              />
            </View>
            <View style={styles.workspaceHeaderText}>
              <AppText
                numberOfLines={1}
                style={[styles.workspaceName, { color: theme.colors.textPrimary }]}
              >
                {workspaceName}
              </AppText>
              <AppText
                numberOfLines={1}
                style={{ color: theme.colors.textSecondary }}
                variant="caption"
              >
                Signed in as {roleLabel}
              </AppText>
            </View>
          </View>

          {membership.branchName || activeSession ? (
            <View style={styles.chipRow}>
              {membership.branchName ? (
                <View style={[styles.chip, { backgroundColor: TONE.indigo.tint }]}>
                  <AppText style={{ color: TONE.indigo.accent }} variant="caption">
                    {membership.branchName}
                  </AppText>
                </View>
              ) : null}
              {activeSession ? (
                <View style={[styles.chip, { backgroundColor: TONE.orange.tint }]}>
                  <AppText style={{ color: TONE.orange.accent }} variant="caption">
                    {activeSession.name}
                  </AppText>
                </View>
              ) : null}
            </View>
          ) : null}

          {hasMultipleWorkspaces ? (
            <>
              <View
                style={[styles.divider, { backgroundColor: theme.colors.border }]}
              />
              <Pressable
                accessibilityLabel="Switch workspace"
                accessibilityRole="button"
                onPress={() => switchWorkspace()}
                style={({ pressed }) => [
                  styles.switchRow,
                  pressed && styles.switchRowPressed,
                ]}
              >
                <AppIcon
                  color={theme.colors.primary}
                  name="refresh"
                  size={17}
                  strokeWidth={2.1}
                />
                <AppText
                  style={[styles.switchLabel, { color: theme.colors.primary }]}
                  variant="label"
                >
                  Switch workspace
                </AppText>
                <AppIcon
                  color={theme.colors.textTertiary}
                  name="chevron-right"
                  size={16}
                />
              </Pressable>
            </>
          ) : null}
        </View>

        <View style={styles.footer}>
          <AppIcon
            color={theme.colors.primary}
            fillColor={theme.colors.primary}
            name="heart"
            size={13}
            strokeWidth={1.5}
          />
          <AppText style={{ color: theme.colors.textTertiary }} variant="caption">
            Built for better education
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  switchLabel: {
    flex: 1,
    fontWeight: '600',
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  switchRowPressed: {
    opacity: 0.6,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingTop: 24,
  },
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  sectionAccent: {
    marginLeft: 2,
    marginTop: 2,
  },
  sectionHeader: {
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 26,
  },
  sectionSubtitle: {
    marginTop: 6,
  },
  statCard: {
    alignItems: 'stretch',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 6,
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: -34,
    paddingVertical: 14,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  statDivider: {
    alignSelf: 'center',
    height: '62%',
    width: StyleSheet.hairlineWidth,
  },
  statIcon: {
    alignItems: 'center',
    borderRadius: 10,
    height: 30,
    justifyContent: 'center',
    marginBottom: 8,
    width: 30,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
  },
  tileSlot: {
    flexBasis: '48%',
    flexGrow: 0,
  },
  workspaceCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    marginHorizontal: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  workspaceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 14,
  },
  workspaceHeaderText: {
    flex: 1,
  },
  workspaceIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  workspaceName: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
});
