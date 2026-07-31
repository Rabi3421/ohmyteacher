import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import {
  useAcademicStore,
  useAuthStore,
  useOrganizationStore,
  useUserManagementStore,
} from '../../store';
import { AppBadge } from '../common/AppBadge';
import { AppButton } from '../common/AppButton';
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
  const currentSchool = useOrganizationStore(state => state.currentSchool);
  const branches = useOrganizationStore(state => state.branches.items);
  const sessions = useOrganizationStore(state => state.academicSessions);
  const loadSchool = useOrganizationStore(state => state.loadSchool);
  const loadBranches = useOrganizationStore(state => state.loadBranches);
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
      <AppText style={styles.label} variant="caption">
        Branch
      </AppText>
      <View style={styles.options}>
        {availableBranches.map(branch => (
          <AppButton
            key={branch.id}
            onPress={() => {
              if (!context || branch.id === context.branchId) return;
              setContext(
                { ...context, branchId: branch.id },
                selectedSession?.status,
              );
            }}
            title={branch.name}
            variant={
              context?.branchId === branch.id ? 'primary' : 'outline'
            }
          />
        ))}
      </View>
      <AppText style={styles.label} variant="caption">
        Academic session
      </AppText>
      <View style={styles.options}>
        {availableSessions.map(session => (
          <AppButton
            key={session.id}
            onPress={() => {
              if (!context || session.id === context.academicSessionId) return;
              setContext(
                { ...context, academicSessionId: session.id },
                session.status,
              );
            }}
            title={`${session.name}${session.status === 'CLOSED' ? ' · Closed' : ''}`}
            variant={
              context?.academicSessionId === session.id
                ? 'primary'
                : 'outline'
            }
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
  readOnly: { borderRadius: 10, marginTop: 14, padding: 10 },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
});
