import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppAvatar } from '../../components/common/AppAvatar';
import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { ErrorState } from '../../components/feedback/ErrorState';
import { AppIcon } from '../../components/icons/AppIcon';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import {
  useAuthStore,
  useCurrentOrganizationStore,
  useOrganizationStore,
  useUserManagementStore,
} from '../../store';
import { getDownstreamMockAcademicSessions } from '../../services/academic/downstreamMockAcademicIdentity';
import { getEffectivePermissions } from '../../utils/effectivePermissions';
import { getRoleLabel } from '../../utils/role';

export function RoleLandingScreen({
  navigation,
  route,
}: RoleScreenProps<'RoleLanding'>) {
  const theme = useAppTheme();
  const user = useAuthStore(state => state.user);
  const membership = useAuthStore(state => state.activeMembership);
  const memberships = useAuthStore(state => state.memberships);
  const switchWorkspace = useAuthStore(state => state.switchWorkspace);
  const logout = useAuthStore(state => state.logout);
  const isLoading = useAuthStore(state => state.isLoading);
  const roleConfiguration = useUserManagementStore(
    state => state.roleConfiguration,
  );
  const branches = useCurrentOrganizationStore(state => state.branches.items);
  const loadBranches = useCurrentOrganizationStore(state => state.loadBranches);
  const loadAcademicSessions = useOrganizationStore(
    state => state.loadAcademicSessions,
  );
  const [showLogout, setShowLogout] = useState(false);
  const activeMembershipCount = memberships.filter(
    item => item.status === 'ACTIVE',
  ).length;

  React.useEffect(() => {
    if (
      membership?.schoolId &&
      ['SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(membership.role)
    ) {
      loadBranches(membership.schoolId).catch(() => undefined);
      loadAcademicSessions(membership.schoolId).catch(() => undefined);
    }
  }, [
    loadAcademicSessions,
    loadBranches,
    membership?.role,
    membership?.schoolId,
  ]);

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

  const roleLabel = getRoleLabel(membership.role);
  const workspaceName = membership.schoolName ?? 'OhMyTeacher Platform';
  const communicationPermissions = getEffectivePermissions(
    membership.role,
    roleConfiguration &&
      roleConfiguration.schoolId === membership.schoolId &&
      roleConfiguration.role === membership.role
      ? roleConfiguration
      : null,
  );
  const organizationAction =
    membership.role === 'SUPER_ADMIN'
      ? {
          onPress: () => navigation.navigate(ROUTES.SCHOOLS),
          title: 'Manage Schools',
        }
      : membership.role === 'SCHOOL_ADMIN' && membership.schoolId
      ? {
          onPress: () =>
            navigation.navigate(ROUTES.SCHOOL_DETAILS, {
              schoolId: membership.schoolId!,
            }),
          title: 'Manage My School',
        }
      : membership.role === 'BRANCH_ADMIN' &&
        membership.schoolId &&
        membership.branchId
      ? {
          onPress: () =>
            navigation.navigate(ROUTES.BRANCH_DETAILS, {
              branchId: membership.branchId!,
              schoolId: membership.schoolId!,
            }),
          title: 'View My Branch',
        }
      : null;
  const studentAction =
    membership.role === 'PARENT' && membership.schoolId
      ? {
          onPress: () =>
            navigation.navigate(ROUTES.PARENT_CHILDREN, {
              parentMembershipId: membership.id,
              schoolId: membership.schoolId!,
            }),
          title: 'View My Children',
        }
      : membership.role === 'STUDENT' && membership.schoolId
      ? {
          onPress: () =>
            navigation.navigate(ROUTES.STUDENT_SELF_PROFILE, {
              schoolId: membership.schoolId!,
              studentMembershipId: membership.id,
            }),
          title: 'View My Student Profile',
        }
      : membership.schoolId &&
        (membership.role === 'SCHOOL_ADMIN' || membership.role === 'BRANCH_ADMIN')
      ? {
          onPress: () =>
            navigation.navigate(ROUTES.STUDENTS, {
              branchId: membership.branchId,
              schoolId: membership.schoolId!,
            }),
          title: 'Students',
        }
      : null;
  const feeSetupAction =
    membership.schoolId &&
    ['SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(membership.role)
      ? {
          onPress: () =>
            navigation.navigate(ROUTES.FEE_SETUP, {
              branchId: membership.branchId,
              schoolId: membership.schoolId!,
            }),
          title:
            membership.role === 'SCHOOL_ADMIN'
              ? 'Manage Fee Configuration'
              : 'Manage Branch Fee Configuration',
        }
      : null;
  const feeDueAction =
    membership.role === 'PARENT' && membership.schoolId
      ? {
          onPress: () =>
            navigation.navigate(ROUTES.PARENT_FEES, {
              parentMembershipId: membership.id,
              schoolId: membership.schoolId!,
            }),
          title: 'View Fees',
        }
      : membership.role === 'STUDENT' && membership.schoolId
      ? {
          onPress: () =>
            navigation.navigate(ROUTES.STUDENT_FEES, {
              schoolId: membership.schoolId!,
              studentMembershipId: membership.id,
            }),
          title: 'View My Fees',
        }
      : membership.schoolId &&
        ['SCHOOL_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'].includes(
          membership.role,
        )
      ? {
          onPress: () =>
            navigation.navigate(ROUTES.FEE_OUTSTANDING_DASHBOARD, {
              branchId: membership.branchId,
              schoolId: membership.schoolId!,
            }),
          title: 'View Fee Outstanding',
        }
      : null;
  const collectionAction =
    membership.role === 'PARENT' && membership.schoolId
      ? {
          onPress: () =>
            navigation.navigate(ROUTES.PARENT_RECEIPTS, {
              parentMembershipId: membership.id,
              schoolId: membership.schoolId!,
            }),
          title: 'My Receipts',
        }
      : membership.role === 'STUDENT' && membership.schoolId
      ? {
          onPress: () =>
            navigation.navigate(ROUTES.STUDENT_RECEIPTS, {
              schoolId: membership.schoolId!,
              studentMembershipId: membership.id,
            }),
          title: 'My Receipts',
        }
      : membership.schoolId &&
        ['SCHOOL_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'].includes(
          membership.role,
        )
      ? {
          onPress: () =>
            navigation.navigate(ROUTES.COLLECTION_DASHBOARD, {
              branchId: membership.branchId,
              schoolId: membership.schoolId!,
            }),
          title: 'Collection Dashboard',
        }
      : null;
  const communicationAction =
    membership.role === 'PARENT' && membership.schoolId
      ? {
          onPress: () =>
            navigation.navigate(ROUTES.PARENT_NOTIFICATIONS, {
              parentMembershipId: membership.id,
              schoolId: membership.schoolId!,
            }),
          title: 'My Notifications',
        }
      : membership.role === 'STUDENT' && membership.schoolId
      ? {
          onPress: () =>
            navigation.navigate(ROUTES.STUDENT_NOTIFICATIONS, {
              schoolId: membership.schoolId!,
              studentMembershipId: membership.id,
            }),
          title: 'My Notifications',
        }
      : membership.schoolId &&
        ['SCHOOL_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'].includes(
          membership.role,
        )
      ? {
          onPress: () =>
            navigation.navigate(ROUTES.COMMUNICATION_DASHBOARD, {
              branchId: membership.branchId,
              schoolId: membership.schoolId!,
            }),
          title: 'Communication',
        }
      : membership.schoolId &&
        communicationPermissions.includes('notifications.view')
      ? {
          onPress: () =>
            navigation.navigate(ROUTES.NOTIFICATION_CENTER, {
              branchId: membership.branchId,
              schoolId: membership.schoolId!,
            }),
          title: 'Notifications',
        }
      : null;
  const examinationBranch =
    branches.find(branch => branch.id === membership.branchId) ??
    branches.find(branch => branch.status === 'ACTIVE');
  const downstreamSessions = membership.schoolId
    ? getDownstreamMockAcademicSessions(membership.schoolId)
    : [];
  const examinationSession =
    downstreamSessions.find(session => session.status === 'ACTIVE') ??
    downstreamSessions.find(session => session.status === 'UPCOMING');
  const examinationAction =
    membership.schoolId &&
    ['SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(membership.role) &&
    communicationPermissions.includes('exams.view') &&
    examinationBranch &&
    examinationSession
      ? {
          onPress: () =>
            navigation.navigate(ROUTES.EXAMINATION_SETUP, {
              academicSessionId: examinationSession.id,
              branchId: examinationBranch.id,
              schoolId: membership.schoolId!,
              sessionStatus: examinationSession.status,
            }),
          title: 'Examination Setup',
        }
      : null;
  const reportsAction = communicationPermissions.includes(
    'reports.dashboard.view',
  )
    ? {
        onPress: () =>
          navigation.navigate(ROUTES.REPORTS_DASHBOARD, {
            branchIds: membership.branchId ? [membership.branchId] : undefined,
            schoolId: membership.schoolId ?? 'platform',
          }),
        title:
          membership.role === 'SUPER_ADMIN'
            ? 'Platform Reports'
            : 'Reports and Analytics',
      }
    : null;

  return (
    <>
      <AppScreen
        contentContainerStyle={styles.screenContent}
        scrollable
        testID="role-landing-screen"
      >
        <View style={styles.maxWidth}>
          <View style={styles.header}>
            <View>
              <AppText color={theme.colors.textSecondary} variant="caption">
                CURRENT WORKSPACE
              </AppText>
              <AppText numberOfLines={1} variant="title">
                {workspaceName}
              </AppText>
            </View>
            <AppAvatar
              name={user.name}
              size={48}
              source={user.avatarUrl ? { uri: user.avatarUrl } : undefined}
            />
          </View>

          <View
            style={[
              styles.hero,
              {
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radius.xl,
              },
              theme.shadows.md,
            ]}
          >
            <AppBadge label={roleLabel} status="active" />
            <AppText
              color={theme.colors.textInverse}
              style={styles.greeting}
              variant="heading1"
            >
              Welcome, {user.name}
            </AppText>
            <AppText color={theme.colors.primarySubtle}>
              Your verified membership opened the {roleLabel} workspace.
            </AppText>
          </View>

          <AppCard
            header={<AppText variant="title">Workspace details</AppText>}
            style={styles.detailsCard}
            variant="outlined"
          >
            <DetailRow label="Role" value={roleLabel} />
            <DetailRow label="School" value={workspaceName} />
            {membership.branchName ? (
              <DetailRow label="Branch" value={membership.branchName} />
            ) : null}
            {membership.studentName ? (
              <DetailRow label="Student" value={membership.studentName} />
            ) : null}
            <DetailRow
              label="Status"
              value={membership.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            />
          </AppCard>

          {organizationAction ? (
            <AppButton
              fullWidth
              onPress={organizationAction.onPress}
              style={styles.organizationAction}
              title={organizationAction.title}
            />
          ) : null}
          {studentAction ? (
            <AppButton
              fullWidth
              onPress={studentAction.onPress}
              style={styles.studentAction}
              title={studentAction.title}
              variant="secondary"
            />
          ) : null}
          {feeSetupAction ? (
            <AppButton
              fullWidth
              onPress={feeSetupAction.onPress}
              style={styles.studentAction}
              title={feeSetupAction.title}
              variant="outline"
            />
          ) : null}
          {feeDueAction ? (
            <AppButton
              fullWidth
              onPress={feeDueAction.onPress}
              style={styles.studentAction}
              title={feeDueAction.title}
              variant="outline"
            />
          ) : null}
          {collectionAction ? (
            <AppButton
              fullWidth
              onPress={collectionAction.onPress}
              style={styles.studentAction}
              title={collectionAction.title}
            />
          ) : null}
          {communicationAction ? (
            <AppButton
              fullWidth
              onPress={communicationAction.onPress}
              style={styles.studentAction}
              title={communicationAction.title}
              variant="outline"
            />
          ) : null}
          {examinationAction ? (
            <AppButton
              fullWidth
              onPress={examinationAction.onPress}
              style={styles.studentAction}
              title={examinationAction.title}
              variant="outline"
            />
          ) : null}
          {reportsAction ? (
            <AppButton
              fullWidth
              onPress={reportsAction.onPress}
              style={styles.studentAction}
              title={reportsAction.title}
              variant="outline"
            />
          ) : null}
          {membership.role === 'SCHOOL_ADMIN' && membership.schoolId ? (
            <AppButton
              fullWidth
              onPress={() =>
                navigation.navigate(ROUTES.REPORT_CARD_TEMPLATES, {
                  schoolId: membership.schoolId!,
                })
              }
              style={styles.studentAction}
              title="Report Card Templates"
              variant="outline"
            />
          ) : null}
          {membership.role === 'PARENT' && membership.schoolId ? (
            <>
              <AppButton
                fullWidth
                onPress={() =>
                  navigation.navigate(ROUTES.PARENT_RESULTS, {
                    parentMembershipId: membership.id,
                    schoolId: membership.schoolId!,
                  })
                }
                style={styles.studentAction}
                title="My Results"
                variant="outline"
              />
              <AppButton
                fullWidth
                onPress={() =>
                  navigation.navigate(ROUTES.PARENT_REPORT_CARDS, {
                    parentMembershipId: membership.id,
                    schoolId: membership.schoolId!,
                  })
                }
                style={styles.studentAction}
                title="My Report Cards"
                variant="outline"
              />
            </>
          ) : null}
          {membership.role === 'STUDENT' && membership.schoolId ? (
            <>
              <AppButton
                fullWidth
                onPress={() =>
                  navigation.navigate(ROUTES.STUDENT_RESULTS, {
                    schoolId: membership.schoolId!,
                    studentMembershipId: membership.id,
                  })
                }
                style={styles.studentAction}
                title="My Results"
                variant="outline"
              />
              <AppButton
                fullWidth
                onPress={() =>
                  navigation.navigate(ROUTES.STUDENT_REPORT_CARDS, {
                    schoolId: membership.schoolId!,
                    studentMembershipId: membership.id,
                  })
                }
                style={styles.studentAction}
                title="My Report Cards"
                variant="outline"
              />
            </>
          ) : null}

          <AppCard style={styles.placeholder} variant="elevated">
            <View
              style={[
                styles.placeholderIcon,
                { backgroundColor: theme.colors.infoSubtle },
              ]}
            >
              <AppIcon
                color={theme.colors.info}
                name="bar-chart"
                size={theme.iconSizes.xl}
              />
            </View>
            <AppText align="center" variant="heading3">
              Dashboard coming later
            </AppText>
            <AppText
              align="center"
              color={theme.colors.textSecondary}
              style={styles.placeholderCopy}
            >
              Role dashboards and business data will be implemented in a later
              phase.
            </AppText>
          </AppCard>

          <View style={styles.actions}>
            {activeMembershipCount > 1 ? (
              <AppButton
                fullWidth
                onPress={switchWorkspace}
                title="Switch Workspace"
                variant="outline"
              />
            ) : null}
            <AppButton
              fullWidth
              onPress={() => setShowLogout(true)}
              title="Logout"
              variant="ghost"
            />
          </View>
        </View>
      </AppScreen>
      <ConfirmationDialog
        confirmLabel="Logout"
        loading={isLoading}
        message="You will need to verify your account again to access this workspace."
        onCancel={() => setShowLogout(false)}
        onConfirm={async () => {
          await logout();
          setShowLogout(false);
        }}
        title="Logout from OhMyTeacher?"
        visible={showLogout}
      />
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.detailRow}>
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
    marginTop: 24,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  detailValue: {
    flex: 1,
    marginLeft: 16,
  },
  detailsCard: {
    marginTop: 20,
  },
  greeting: {
    marginBottom: 6,
    marginTop: 18,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 8,
  },
  hero: {
    padding: 24,
  },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 680,
    width: '100%',
  },
  organizationAction: {
    marginTop: 20,
  },
  placeholder: {
    marginTop: 20,
  },
  placeholderCopy: {
    marginTop: 6,
  },
  placeholderIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 28,
    height: 64,
    justifyContent: 'center',
    marginBottom: 14,
    width: 64,
  },
  screenContent: {
    paddingBottom: 32,
  },
  studentAction: {
    marginTop: 12,
  },
});
