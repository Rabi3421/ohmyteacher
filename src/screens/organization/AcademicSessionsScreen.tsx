import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBadge, type BadgeStatus } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import type {
  AcademicSession,
  AcademicSessionStatus,
} from '../../models/organization';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore, useOrganizationStore } from '../../store';
import { formatDisplayDate } from '../../utils/date';
import { canManageAcademicSessions } from '../../utils/organizationPermissions';

type PendingAction = {
  action: 'activate';
  session: AcademicSession;
};

const BADGE_STATUS: Record<AcademicSessionStatus, BadgeStatus> = {
  ACTIVE: 'completed',
  CLOSED: 'locked',
  UPCOMING: 'draft',
};

export function AcademicSessionsScreen({
  navigation,
  route,
}: RoleScreenProps<'AcademicSessions'>) {
  const theme = useAppTheme();
  const schoolId = route.params.schoolId;
  const membership = useAuthStore(state => state.activeMembership);
  const sessions = useOrganizationStore(state => state.academicSessions);
  const isLoading = useOrganizationStore(state => state.isLoadingSessions);
  const isSaving = useOrganizationStore(state => state.isSavingSession);
  const error = useOrganizationStore(state => state.error);
  const loadSessions = useOrganizationStore(
    state => state.loadAcademicSessions,
  );
  const activateSession = useOrganizationStore(
    state => state.activateAcademicSession,
  );
  const [pending, setPending] = useState<PendingAction>();

  useEffect(() => {
    loadSessions(schoolId).catch(() => undefined);
  }, [loadSessions, schoolId]);

  const canManage = membership
    ? canManageAcademicSessions(membership.role, membership, schoolId)
    : false;

  return (
    <>
      <AppScreen
        contentContainerStyle={styles.screenContent}
        onRefresh={() => loadSessions(schoolId)}
        refreshing={isLoading}
        scrollable
        testID="academic-sessions-screen"
      >
        <View style={styles.maxWidth}>
          <AppHeader
            includeSafeArea={false}
            onBackPress={navigation.goBack}
            rightActions={
              canManage ? (
                <AppButton
                  onPress={() =>
                    navigation.navigate(ROUTES.CREATE_ACADEMIC_SESSION, {
                      schoolId,
                    })
                  }
                  title="Add"
                />
              ) : null
            }
            title="Academic Sessions"
          />
          {isLoading && sessions.length === 0 ? (
            <LoadingView message="Loading academic sessions…" />
          ) : error && sessions.length === 0 ? (
            <ErrorState
              message={error.message}
              onRetry={() => loadSessions(schoolId)}
            />
          ) : sessions.length === 0 ? (
            <EmptyState
              actionLabel={canManage ? 'Create Session' : undefined}
              description={
                canManage
                  ? 'Create an academic session to organize school operations.'
                  : 'There is no active academic session.'
              }
              onAction={
                canManage
                  ? () =>
                      navigation.navigate(ROUTES.CREATE_ACADEMIC_SESSION, {
                        schoolId,
                      })
                  : undefined
              }
              title="No sessions found"
            />
          ) : (
            <View style={styles.list}>
              {sessions.map(session => (
                <AppCard key={session.id} variant="elevated">
                  <View style={styles.titleRow}>
                    <AppText style={styles.copy} variant="title">
                      {session.name}
                    </AppText>
                    <AppBadge
                      label={
                        session.status[0] +
                        session.status.slice(1).toLowerCase()
                      }
                      status={BADGE_STATUS[session.status]}
                    />
                  </View>
                  <AppText color={theme.colors.textSecondary}>
                    {formatDisplayDate(session.startDate)} –{' '}
                    {formatDisplayDate(session.endDate)}
                  </AppText>
                  <AppText
                    color={theme.colors.textTertiary}
                    style={styles.created}
                    variant="caption"
                  >
                    Created {formatDisplayDate(session.createdAt)}
                  </AppText>
                  {canManage ? (
                    <View style={styles.actions}>
                      <AppButton
                        onPress={() =>
                          navigation.navigate(
                            ROUTES.EDIT_ACADEMIC_SESSION,
                            { schoolId, sessionId: session.id },
                          )
                        }
                        title="Edit"
                        variant="outline"
                      />
                      {session.status === 'UPCOMING' ? (
                          <AppButton
                            onPress={() =>
                              setPending({ action: 'activate', session })
                            }
                            title="Activate"
                          />
                      ) : null}
                    </View>
                  ) : null}
                </AppCard>
              ))}
            </View>
          )}
        </View>
      </AppScreen>
      <ConfirmationDialog
        confirmLabel="Activate"
        loading={isSaving}
        message={
          'Activating this session atomically deactivates the school’s currently active session.'
        }
        onCancel={() => setPending(undefined)}
        onConfirm={async () => {
          if (!pending) return;
          const updated = await activateSession(schoolId, pending.session.id);
          if (updated) setPending(undefined);
        }}
        title={`Activate ${pending?.session.name ?? 'session'}?`}
        visible={Boolean(pending)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  copy: { flex: 1, marginRight: 12 },
  created: { marginTop: 6 },
  list: { gap: 12, marginTop: 20 },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 720,
    width: '100%',
  },
  screenContent: { paddingBottom: 32 },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },
});
