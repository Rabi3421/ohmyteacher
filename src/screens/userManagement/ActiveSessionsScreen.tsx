import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useUserManagementStore } from '../../store';
import { formatDateTime } from '../../utils/date';

type RevokeAction =
  | { type: 'selected'; sessionId: string }
  | { type: 'others' }
  | { type: 'all' };

export function ActiveSessionsScreen({
  navigation,
  route,
}: RoleScreenProps<'ActiveSessions'>) {
  const theme = useAppTheme();
  const { membershipId, schoolId } = route.params;
  const sessions = useUserManagementStore(state => state.activeSessions);
  const isLoading = useUserManagementStore(state => state.isLoadingSessions);
  const isRevoking = useUserManagementStore(
    state => state.isRevokingSessions,
  );
  const error = useUserManagementStore(state => state.error);
  const success = useUserManagementStore(state => state.successMessage);
  const loadSessions = useUserManagementStore(
    state => state.loadActiveSessions,
  );
  const revokeSession = useUserManagementStore(state => state.revokeSession);
  const revokeOthers = useUserManagementStore(
    state => state.revokeOtherSessions,
  );
  const revokeAll = useUserManagementStore(state => state.revokeAllSessions);
  const [pending, setPending] = useState<RevokeAction>();

  useEffect(() => {
    loadSessions(schoolId, membershipId).catch(() => undefined);
  }, [loadSessions, membershipId, schoolId]);

  return (
    <>
      <AppScreen
        contentContainerStyle={styles.screenContent}
        onRefresh={() => loadSessions(schoolId, membershipId)}
        refreshing={isLoading}
        scrollable
        testID="active-sessions-screen"
      >
        <View style={styles.maxWidth}>
          <AppHeader
            includeSafeArea={false}
            onBackPress={navigation.goBack}
            subtitle="No access or refresh tokens are displayed"
            title="Active Sessions"
          />
          {success ? (
            <AppCard style={styles.notice} variant="outlined">
              <AppText>{success}</AppText>
            </AppCard>
          ) : null}
          {isLoading && sessions.length === 0 ? (
            <LoadingView message="Loading device sessions…" />
          ) : error && sessions.length === 0 ? (
            <ErrorState
              message={error.message}
              onRetry={() => loadSessions(schoolId, membershipId)}
            />
          ) : sessions.length === 0 ? (
            <EmptyState
              description="This membership has no active device sessions."
              title="No active sessions"
            />
          ) : (
            <>
              <View style={styles.list}>
                {sessions.map(session => (
                  <AppCard key={session.id} variant="elevated">
                    <View style={styles.titleRow}>
                      <AppText style={styles.copy} variant="title">
                        {session.deviceLabel}
                      </AppText>
                      {session.isCurrent ? (
                        <AppBadge label="Current" status="active" />
                      ) : (
                        <AppBadge label="Active" status="active" />
                      )}
                    </View>
                    <AppText color={theme.colors.primary}>
                      {session.platform} · {session.approximateDeviceId}
                    </AppText>
                    <AppText
                      color={theme.colors.textSecondary}
                      variant="caption"
                    >
                      Login {formatDateTime(session.loggedInAt)} · Last active{' '}
                      {formatDateTime(session.lastActiveAt)}
                    </AppText>
                    <AppButton
                      onPress={() =>
                        setPending({
                          sessionId: session.id,
                          type: 'selected',
                        })
                      }
                      style={styles.revoke}
                      title="Revoke Session"
                      variant="danger"
                    />
                  </AppCard>
                ))}
              </View>
              <View style={styles.actions}>
                <AppButton
                  fullWidth
                  onPress={() => setPending({ type: 'others' })}
                  title="Revoke All Other Sessions"
                  variant="outline"
                />
                <AppButton
                  fullWidth
                  onPress={() => setPending({ type: 'all' })}
                  title="Revoke All Sessions"
                  variant="danger"
                />
              </View>
            </>
          )}
        </View>
      </AppScreen>
      <ConfirmationDialog
        confirmLabel="Revoke"
        destructive
        loading={isRevoking}
        message="Revoked sessions can no longer access protected workspaces. The user must complete OTP authentication again."
        onCancel={() => setPending(undefined)}
        onConfirm={async () => {
          if (!pending) return;
          const revoked =
            pending.type === 'selected'
              ? await revokeSession(
                  schoolId,
                  membershipId,
                  pending.sessionId,
                )
              : pending.type === 'others'
                ? await revokeOthers(schoolId, membershipId)
                : await revokeAll(schoolId, membershipId);
          if (revoked) setPending(undefined);
        }}
        title="Revoke device access?"
        visible={Boolean(pending)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10, marginTop: 22 },
  copy: { flex: 1, marginRight: 8 },
  list: { gap: 12, marginTop: 20 },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 720,
    width: '100%',
  },
  notice: { marginTop: 14 },
  revoke: { marginTop: 14 },
  screenContent: { paddingBottom: 32 },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
  },
});
