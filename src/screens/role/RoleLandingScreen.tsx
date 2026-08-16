import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppAvatar } from '../../components/common/AppAvatar';
import { AppModuleCard } from '../../components/common/AppModuleCard';
import { AppStatCard } from '../../components/common/AppStatCard';
import { AppText } from '../../components/common/AppText';
import { ErrorState } from '../../components/feedback/ErrorState';
import { AppScreen } from '../../components/common/AppScreen';
import { TAB_BAR_HEIGHT } from '../../components/layout/AppBottomTabBar';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTabFocus } from '../../hooks/useTabFocus';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { getDownstreamMockAcademicSessions } from '../../services/academic/downstreamMockAcademicIdentity';
import {
  useAuthStore,
  useCurrentOrganizationStore,
  useOrganizationStore,
  useUserManagementStore,
} from '../../store';
import { getEffectivePermissions } from '../../utils/effectivePermissions';
import { getRoleLabel } from '../../utils/role';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function RoleLandingScreen({
  navigation,
  route,
}: RoleScreenProps<'RoleLanding'>) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore(state => state.user);
  const school = useAuthStore(state => state.school);
  const membership = useAuthStore(state => state.activeMembership);
  const logout = useAuthStore(state => state.logout);
  const roleConfiguration = useUserManagementStore(state => state.roleConfiguration);
  const branches = useCurrentOrganizationStore(state => state.branches.items);
  const loadBranches = useCurrentOrganizationStore(state => state.loadBranches);
  const loadAcademicSessions = useOrganizationStore(state => state.loadAcademicSessions);

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

  const downstreamSessions = schoolId ? getDownstreamMockAcademicSessions(schoolId) : [];
  const activeSession =
    downstreamSessions.find(s => s.status === 'ACTIVE') ??
    downstreamSessions.find(s => s.status === 'UPCOMING');
  const examBranch =
    branches.find(b => b.id === branchId) ??
    branches.find(b => b.status === 'ACTIVE');

  // Key actions based on role
  const quickActions = (() => {
    if (isSuperAdmin) {
      return [
        {
          accent: '#1478F2', tint: '#EAF3FF', icon: 'school' as const,
          title: 'Manage Schools', description: 'View and manage all schools',
          onPress: () => navigation.navigate(ROUTES.SCHOOLS),
        },
        {
          accent: '#E84D8A', tint: '#FDECF3', icon: 'bar-chart' as const,
          title: 'Platform Reports', description: 'Analytics and insights',
          onPress: () => navigation.navigate(ROUTES.REPORTS_DASHBOARD, { schoolId: 'platform' }),
        },
      ];
    }

    if (isParent) {
      return [
        {
          accent: '#18A978', tint: '#E8F8F2', icon: 'users' as const,
          title: 'My Children', description: 'Academic status and details',
          onPress: () => navigation.navigate(ROUTES.PARENT_CHILDREN, { parentMembershipId: membership.id, schoolId }),
        },
        {
          accent: '#F26B55', tint: '#FFF0ED', icon: 'credit-card' as const,
          title: 'Fee Dues', description: 'Pending and overdue fees',
          onPress: () => navigation.navigate(ROUTES.PARENT_FEES, { parentMembershipId: membership.id, schoolId }),
        },
        {
          accent: '#6366F1', tint: '#EEF2FF', icon: 'graduation-cap' as const,
          title: 'Results', description: 'Exam scores and grades',
          onPress: () => navigation.navigate(ROUTES.PARENT_RESULTS, { parentMembershipId: membership.id, schoolId }),
        },
        {
          accent: '#18A978', tint: '#E8F8F2', icon: 'file-text' as const,
          title: 'Report Cards', description: 'Academic report cards',
          onPress: () => navigation.navigate(ROUTES.PARENT_REPORT_CARDS, { parentMembershipId: membership.id, schoolId }),
        },
      ];
    }

    if (isStudent) {
      return [
        {
          accent: '#F26B55', tint: '#FFF0ED', icon: 'credit-card' as const,
          title: 'My Fees', description: 'Fee dues and payment history',
          onPress: () => navigation.navigate(ROUTES.STUDENT_FEES, { schoolId, studentMembershipId: membership.id }),
        },
        {
          accent: '#6366F1', tint: '#EEF2FF', icon: 'graduation-cap' as const,
          title: 'My Results', description: 'Exam scores and performance',
          onPress: () => navigation.navigate(ROUTES.STUDENT_RESULTS, { schoolId, studentMembershipId: membership.id }),
        },
        {
          accent: '#18A978', tint: '#E8F8F2', icon: 'file-text' as const,
          title: 'Report Cards', description: 'Your report cards',
          onPress: () => navigation.navigate(ROUTES.STUDENT_REPORT_CARDS, { schoolId, studentMembershipId: membership.id }),
        },
      ];
    }

    // Staff roles
    const staffActions = [];

    if (isSchoolAdmin && schoolId) {
      staffActions.push({
        accent: '#1478F2', tint: '#EAF3FF', icon: 'school' as const,
        title: 'School Details', description: 'Manage your school',
        onPress: () => navigation.navigate(ROUTES.SCHOOL_DETAILS, { schoolId }),
      });
    } else if (isBranchAdmin && schoolId && branchId) {
      staffActions.push({
        accent: '#1478F2', tint: '#EAF3FF', icon: 'globe' as const,
        title: 'My Branch', description: 'View branch details',
        onPress: () => navigation.navigate(ROUTES.BRANCH_DETAILS, { schoolId, branchId }),
      });
    }

    if (isStaff && schoolId && branchId) {
      staffActions.push({
        accent: '#18A978', tint: '#E8F8F2', icon: 'users' as const,
        title: 'Students', description: 'Manage student records',
        onPress: () => navigation.navigate(ROUTES.STUDENTS, { schoolId, branchId }),
      });
      staffActions.push({
        accent: '#F26B55', tint: '#FFF0ED', icon: 'credit-card' as const,
        title: 'Fee Outstanding', description: 'Pending and overdue dues',
        onPress: () => navigation.navigate(ROUTES.FEE_OUTSTANDING_DASHBOARD, { schoolId, branchId }),
      });
      staffActions.push({
        accent: '#1478F2', tint: '#EAF3FF', icon: 'wallet' as const,
        title: 'Collections', description: 'Daily payments and receipts',
        onPress: () => navigation.navigate(ROUTES.COLLECTION_DASHBOARD, { schoolId, branchId }),
      });
    }

    if ((isSchoolAdmin || isBranchAdmin) && schoolId && examBranch && activeSession) {
      staffActions.push({
        accent: '#6366F1', tint: '#EEF2FF', icon: 'calendar-check' as const,
        title: 'Examinations', description: 'Exam setup and marks entry',
        onPress: () => navigation.navigate(ROUTES.EXAMINATION_SETUP, {
          schoolId, branchId: examBranch.id,
          academicSessionId: activeSession.id,
          sessionStatus: activeSession.status,
        }),
      });
    }

    if (permissions.includes('reports.dashboard.view') && schoolId) {
      staffActions.push({
        accent: '#E84D8A', tint: '#FDECF3', icon: 'bar-chart' as const,
        title: 'Reports', description: 'Analytics and insights',
        onPress: () => navigation.navigate(ROUTES.REPORTS_DASHBOARD, { schoolId, branchIds: branchId ? [branchId] : undefined }),
      });
    }

    return staffActions;
  })();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        backgroundColor={theme.colors.surface}
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting Header */}
        <View style={[styles.topBar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <View style={styles.greetingCol}>
            <AppText style={{ color: theme.colors.textSecondary }} variant="bodyMedium">
              {greeting()}
            </AppText>
            <AppText numberOfLines={1} style={[styles.nameText, { color: theme.colors.textPrimary }]} variant="heading3">
              {firstName}
            </AppText>
            <View style={[styles.rolePill, { backgroundColor: theme.colors.primarySubtle }]}>
              <View style={[styles.roleDot, { backgroundColor: theme.colors.primary }]} />
              <AppText style={{ color: theme.colors.primary }} variant="caption">
                {roleLabel} · {workspaceName}
              </AppText>
            </View>
          </View>
          <AppAvatar
            name={user.name}
            size={48}
            source={user.avatarUrl ? { uri: user.avatarUrl } : undefined}
          />
        </View>

        {/* Stats Row */}
        {isStaff && (
          <View style={styles.statsRow}>
            {activeBranchCount > 0 && isSchoolAdmin && (
              <AppStatCard
                compact
                icon="globe"
                iconBg="#EEF2FF"
                iconColor="#6366F1"
                label="Active Branches"
                value={activeBranchCount}
              />
            )}
            <AppStatCard
              compact
              icon="shield-check"
              iconBg={theme.colors.successSubtle}
              iconColor={theme.colors.success}
              label="Account Status"
              value="Active"
            />
            <AppStatCard
              compact
              icon="star"
              iconBg={theme.colors.primarySubtle}
              iconColor={theme.colors.primary}
              label="Quick Tools"
              value={quickActions.length}
            />
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <AppText style={{ color: theme.colors.textPrimary }} variant="title">
            {isParent || isStudent ? 'My Information' : 'Quick Access'}
          </AppText>
          <AppText style={{ color: theme.colors.textSecondary, marginTop: 2 }} variant="caption">
            {isParent || isStudent
              ? 'Your school information at a glance'
              : 'Frequently used modules for your role'}
          </AppText>
        </View>

        <View style={styles.actionList}>
          {quickActions.map(action => (
            <AppModuleCard
              accent={action.accent}
              description={action.description}
              icon={action.icon}
              key={action.title}
              onPress={action.onPress}
              tint={action.tint}
              title={action.title}
            />
          ))}
        </View>

        {/* Workspace Info */}
        <View style={styles.sectionHeader}>
          <AppText style={{ color: theme.colors.textPrimary }} variant="title">
            Workspace
          </AppText>
        </View>
        <View style={[styles.workspaceCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.workspaceRow}>
            <AppText style={{ color: theme.colors.textSecondary, flex: 1 }} variant="caption">Your role</AppText>
            <AppText style={{ color: theme.colors.textPrimary }} variant="bodyMedium">{roleLabel}</AppText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.workspaceRow}>
            <AppText style={{ color: theme.colors.textSecondary, flex: 1 }} variant="caption">School</AppText>
            <AppText numberOfLines={1} style={{ color: theme.colors.textPrimary, maxWidth: '60%' }} variant="bodyMedium">
              {workspaceName}
            </AppText>
          </View>
          {membership.branchName ? (
            <>
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.workspaceRow}>
                <AppText style={{ color: theme.colors.textSecondary, flex: 1 }} variant="caption">Branch</AppText>
                <AppText numberOfLines={1} style={{ color: theme.colors.textPrimary, maxWidth: '60%' }} variant="bodyMedium">
                  {membership.branchName}
                </AppText>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  actionList: {
    gap: 10,
    paddingHorizontal: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  greetingCol: {
    flex: 1,
    gap: 4,
  },
  nameText: {
    fontWeight: '700',
  },
  roleDot: {
    borderRadius: 4,
    height: 6,
    width: 6,
  },
  rolePill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 5,
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  root: {
    flex: 1,
  },
  scrollContent: {
    gap: 0,
  },
  sectionHeader: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  topBar: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  workspaceCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  workspaceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
