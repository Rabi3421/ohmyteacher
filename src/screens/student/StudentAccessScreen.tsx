import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useStudentStore } from '../../store';

type PendingAccess =
  | { kind: 'PARENT'; id: string; enabled: boolean; name: string }
  | { kind: 'STUDENT'; enabled: boolean; name: string };

export function StudentAccessScreen({
  navigation,
  route,
}: RoleScreenProps<'StudentAccess'>) {
  const { schoolId, studentId } = route.params;
  const student = useStudentStore(state => state.currentStudent);
  const access = useStudentStore(state => state.access);
  const isLoading = useStudentStore(state => state.isLoadingAccess);
  const isUpdating = useStudentStore(state => state.isUpdatingAccess);
  const error = useStudentStore(state => state.error);
  const loadStudent = useStudentStore(state => state.loadStudent);
  const loadAccess = useStudentStore(state => state.loadAccess);
  const updateParent = useStudentStore(state => state.updateParentAccess);
  const updateStudent = useStudentStore(state => state.updateStudentAccess);
  const [pending, setPending] = useState<PendingAccess | null>(null);

  useEffect(() => {
    async function load() {
      if (student?.profile.id !== studentId) {
        await loadStudent(schoolId, studentId);
      }
      await loadAccess(schoolId, studentId);
    }
    load().catch(() => undefined);
  }, [loadAccess, loadStudent, schoolId, student?.profile.id, studentId]);

  return (
    <>
      <AppScreen
        contentContainerStyle={styles.content}
        onRefresh={() => loadAccess(schoolId, studentId)}
        refreshing={isLoading}
        scrollable
        testID="student-access-screen"
      >
        <View style={styles.maxWidth}>
          <AppHeader
            includeSafeArea={false}
            onBackPress={navigation.goBack}
            subtitle="Accounts are linked to memberships; disabling access does not delete identities."
            title="App Access"
          />
          {isLoading && !access ? (
            <LoadingView message="Loading access…" />
          ) : error && !access ? (
            <ErrorState
              message={error.message}
              onRetry={() => loadAccess(schoolId, studentId)}
            />
          ) : access ? (
            <View style={styles.sections}>
              <AppText variant="heading3">Parent Access</AppText>
              {student?.guardians.map(guardian => {
                const membership = access.parentMemberships.find(
                  item => item.guardianId === guardian.id,
                );
                const enabled = membership?.status === 'ACTIVE';
                return (
                  <AppCard key={guardian.id} variant="outlined">
                    <View style={styles.row}>
                      <View style={styles.copy}>
                        <AppText variant="title">{guardian.fullName}</AppText>
                        <AppText variant="caption">
                          {guardian.relationship} · {guardian.mobile}
                        </AppText>
                        {membership ? (
                          <AppText variant="caption">
                            {membership.linkedStudentIds.length} linked child
                            {membership.linkedStudentIds.length === 1 ? '' : 'ren'}
                          </AppText>
                        ) : null}
                      </View>
                      <AppBadge
                        label={enabled ? 'ENABLED' : 'DISABLED'}
                        status={enabled ? 'active' : 'inactive'}
                      />
                    </View>
                    <AppButton
                      onPress={() =>
                        setPending({
                          enabled: !enabled,
                          id: guardian.id,
                          kind: 'PARENT',
                          name: guardian.fullName,
                        })
                      }
                      title={enabled ? 'Disable Parent Access' : 'Enable Parent Access'}
                      variant={enabled ? 'danger' : 'outline'}
                    />
                  </AppCard>
                );
              })}
              <AppText style={styles.studentHeading} variant="heading3">
                Student Access
              </AppText>
              <AppCard variant="outlined">
                <View style={styles.row}>
                  <View style={styles.copy}>
                    <AppText variant="title">
                      {student?.profile.fullName ?? 'Student'}
                    </AppText>
                    <AppText variant="caption">
                      {student?.profile.mobile ??
                        'A unique student mobile is required.'}
                    </AppText>
                  </View>
                  <AppBadge
                    label={
                      access.studentMembership?.status === 'ACTIVE'
                        ? 'ENABLED'
                        : 'DISABLED'
                    }
                    status={
                      access.studentMembership?.status === 'ACTIVE'
                        ? 'active'
                        : 'inactive'
                    }
                  />
                </View>
                <AppButton
                  disabled={!student?.profile.mobile}
                  onPress={() =>
                    setPending({
                      enabled: access.studentMembership?.status !== 'ACTIVE',
                      kind: 'STUDENT',
                      name: student?.profile.fullName ?? 'Student',
                    })
                  }
                  title={
                    access.studentMembership?.status === 'ACTIVE'
                      ? 'Disable Student Access'
                      : 'Enable Student Access'
                  }
                  variant={
                    access.studentMembership?.status === 'ACTIVE'
                      ? 'danger'
                      : 'outline'
                  }
                />
              </AppCard>
              {error ? <InlineError message={error.message} /> : null}
            </View>
          ) : null}
        </View>
      </AppScreen>
      <ConfirmationDialog
        confirmLabel={pending?.enabled ? 'Enable Access' : 'Disable Access'}
        destructive={!pending?.enabled}
        loading={isUpdating}
        message={`This will ${pending?.enabled ? 'enable' : 'disable'} app access for ${pending?.name}. Existing profile and enrollment records remain unchanged.`}
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          if (!pending) return;
          const saved =
            pending.kind === 'PARENT'
              ? await updateParent(
                  schoolId,
                  studentId,
                  pending.id,
                  pending.enabled,
                )
              : await updateStudent(schoolId, studentId, pending.enabled);
          if (saved) setPending(null);
        }}
        title="Confirm access change"
        visible={Boolean(pending)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  copy: { flex: 1 },
  maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' },
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  sections: { gap: 12 },
  studentHeading: { marginTop: 10 },
});
