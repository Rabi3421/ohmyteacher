import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import {
  useAcademicStore,
  useAuthStore,
  useCurrentOrganizationStore,
  useOrganizationStore,
  useUserManagementStore,
} from '../../store';
import { AppBadge } from '../common/AppBadge';
import { AppButton } from '../common/AppButton';
import { AppChoiceChip } from '../common/AppChoiceChip';
import { AppCard } from '../common/AppCard';
import { AppText } from '../common/AppText';

export interface AcademicContextBarProps {
  schoolId: string;
  initialBranchId?: string;
  initialSessionId?: string;
}

export function AcademicContextBar({
  schoolId,
  initialBranchId,
  initialSessionId,
}: AcademicContextBarProps) {
  const theme = useAppTheme();
  const membership = useAuthStore(state => state.activeMembership);
  const currentSchool = useCurrentOrganizationStore(
    state => state.currentSchool,
  );
  const branches = useCurrentOrganizationStore(state => state.branches.items);
  const sessions = useOrganizationStore(state => state.academicSessions);
  const isLoadingBranches = useCurrentOrganizationStore(state => state.isLoadingBranches);
  const isLoadingSessions = useOrganizationStore(state => state.isLoadingSessions);
  const branchError = useCurrentOrganizationStore(state => state.branchError);
  const sessionError = useOrganizationStore(state => state.error);
  const loadSchool = useCurrentOrganizationStore(
    state => state.loadCurrentSchool,
  );
  const loadBranches = useCurrentOrganizationStore(
    state => state.loadBranches,
  );
  const loadSessions = useOrganizationStore(
    state => state.loadAcademicSessions,
  );
  const loadRoleConfiguration = useUserManagementStore(
    state => state.loadRoleConfiguration,
  );
  const context = useAcademicStore(state => state.context);
  const setContext = useAcademicStore(state => state.setContext);
  const initializedSchoolId = useRef<string | undefined>(undefined);

  useEffect(() => {
    loadSchool(schoolId).catch(() => undefined);
    loadBranches(schoolId).catch(() => undefined);
    loadSessions(schoolId).catch(() => undefined);
    if (membership?.role === 'BRANCH_ADMIN') {
      loadRoleConfiguration(schoolId, 'BRANCH_ADMIN').catch(
        () => undefined,
      );
    }
  }, [
    loadBranches,
    loadRoleConfiguration,
    loadSchool,
    loadSessions,
    membership?.role,
    schoolId,
  ]);

  const availableBranches = useMemo(
    () =>
      branches.filter(
        branch =>
          branch.schoolId === schoolId &&
          branch.status === 'ACTIVE' &&
          (membership?.role !== 'BRANCH_ADMIN' ||
            membership.branchId === branch.id),
      ),
    [branches, membership, schoolId],
  );
  const availableSessions = useMemo(
    () => sessions.filter(session => session.schoolId === schoolId),
    [schoolId, sessions],
  );

  useEffect(() => {
    if (availableBranches.length === 0 || availableSessions.length === 0) {
      return;
    }
    const isInitialized = initializedSchoolId.current === schoolId;
    const branchId =
      (isInitialized &&
      context?.schoolId === schoolId &&
      availableBranches.some(branch => branch.id === context.branchId)
        ? context.branchId
        : undefined) ??
      (initialBranchId &&
      availableBranches.some(branch => branch.id === initialBranchId)
        ? initialBranchId
        : undefined) ??
      (!isInitialized &&
      context?.schoolId === schoolId &&
      availableBranches.some(branch => branch.id === context.branchId)
        ? context.branchId
        : undefined) ??
      membership?.branchId ??
      availableBranches[0].id;
    const academicSessionId =
      (isInitialized &&
      context?.schoolId === schoolId &&
      availableSessions.some(
        session => session.id === context.academicSessionId,
      )
        ? context.academicSessionId
        : undefined) ??
      (initialSessionId &&
      availableSessions.some(session => session.id === initialSessionId)
        ? initialSessionId
        : undefined) ??
      (!isInitialized &&
      context?.schoolId === schoolId &&
      availableSessions.some(
        session => session.id === context.academicSessionId,
      )
        ? context.academicSessionId
        : undefined) ??
      availableSessions.find(session => session.status === 'ACTIVE')?.id ??
      availableSessions[0].id;
    const session = availableSessions.find(
      item => item.id === academicSessionId,
    );
    initializedSchoolId.current = schoolId;
    if (
      context?.schoolId !== schoolId ||
      context.branchId !== branchId ||
      context.academicSessionId !== academicSessionId
    ) {
      setContext(
        { academicSessionId, branchId, schoolId },
        session?.status,
      );
    }
  }, [
    availableBranches,
    availableSessions,
    context,
    initialBranchId,
    initialSessionId,
    membership?.branchId,
    schoolId,
    setContext,
  ]);

  const selectedSession = availableSessions.find(
    session => session.id === context?.academicSessionId,
  );

  return (
    <AppCard style={styles.card} variant="outlined">
      <View style={styles.titleRow}>
        <View style={styles.copy}>
          <AppText variant="label">
            {currentSchool?.id === schoolId
              ? currentSchool.name
              : membership?.schoolName ?? 'Selected school'}
          </AppText>
          <AppText color={theme.colors.textSecondary} variant="caption">
            Academic context
          </AppText>
        </View>
        {selectedSession ? (
          <AppBadge
            label={selectedSession.status}
            status={
              selectedSession.status === 'ACTIVE'
                ? 'active'
                : selectedSession.status === 'CLOSED'
                  ? 'locked'
                  : 'draft'
            }
          />
        ) : null}
      </View>
      {isLoadingBranches || isLoadingSessions ? (
        <AppText color={theme.colors.textSecondary} style={styles.notice} variant="caption">
          Refreshing live academic context…
        </AppText>
      ) : null}
      {!isLoadingBranches && availableBranches.length === 0 ? (
        <View style={styles.notice}>
          <AppText color={theme.colors.error} variant="caption">
            {branchError?.message ?? 'No active accessible branch is available.'}
          </AppText>
          <AppButton onPress={() => loadBranches(schoolId)} title="Retry Branches" variant="outline" />
        </View>
      ) : null}
      {!isLoadingSessions && availableSessions.length === 0 ? (
        <View style={styles.notice}>
          <AppText color={theme.colors.error} variant="caption">
            {sessionError?.message ?? 'No academic session is available.'}
          </AppText>
          <AppButton onPress={() => loadSessions(schoolId)} title="Retry Sessions" variant="outline" />
        </View>
      ) : null}
      <AppText style={styles.label} variant="caption">
        Branch
      </AppText>
      <View style={styles.options}>
        {availableBranches.map(branch => (
          <AppChoiceChip
            key={branch.id}
            onPress={() => {
              if (!context || branch.id === context.branchId) return;
              setContext(
                { ...context, branchId: branch.id },
                selectedSession?.status,
              );
            }}
            label={branch.name}
            selected={context?.branchId === branch.id}
          />
        ))}
      </View>
      <AppText style={styles.label} variant="caption">
        Academic session
      </AppText>
      <View style={styles.options}>
        {availableSessions.map(session => (
          <AppChoiceChip
            key={session.id}
            onPress={() => {
              if (!context || session.id === context.academicSessionId) return;
              setContext(
                { ...context, academicSessionId: session.id },
                session.status,
              );
            }}
            label={`${session.name}${session.status === 'CLOSED' ? ' · Closed' : ''}`}
            selected={context?.academicSessionId === session.id}
          />
        ))}
      </View>
      {selectedSession?.status === 'CLOSED' ? (
        <View
          style={[
            styles.readOnly,
            { backgroundColor: theme.colors.warningSubtle },
          ]}
        >
          <AppText color={theme.colors.warning} variant="caption">
            Closed session · All academic setup is strictly read-only.
          </AppText>
        </View>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16 },
  copy: { flex: 1 },
  label: { marginBottom: 6, marginTop: 14 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  notice: { gap: 8, marginTop: 12 },
  readOnly: { borderRadius: 12, marginTop: 14, padding: 12 },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
});
