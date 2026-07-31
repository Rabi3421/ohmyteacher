import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { LoadingView } from '../../components/feedback/LoadingView';
import { GuardianCard } from '../../components/student/StudentComponents';
import { ROUTES } from '../../constants/routes';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useStudentStore } from '../../store';

export function StudentGuardiansScreen({
  navigation,
  route,
}: RoleScreenProps<'StudentGuardians'>) {
  const { schoolId, studentId } = route.params;
  const guardians = useStudentStore(state => state.guardians);
  const currentStudent = useStudentStore(state => state.currentStudent);
  const isLoading = useStudentStore(state => state.isLoadingStudent);
  const isSaving = useStudentStore(state => state.isSavingGuardian);
  const error = useStudentStore(state => state.error);
  const loadStudent = useStudentStore(state => state.loadStudent);
  const loadGuardians = useStudentStore(state => state.loadGuardians);
  const unlinkGuardian = useStudentStore(state => state.unlinkGuardian);
  const [pendingGuardianId, setPendingGuardianId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (currentStudent?.profile.id !== studentId) {
        await loadStudent(schoolId, studentId);
      }
      await loadGuardians(schoolId, studentId);
    }
    load().catch(() => undefined);
  }, [currentStudent?.profile.id, loadGuardians, loadStudent, schoolId, studentId]);

  return (
    <>
      <AppScreen
        contentContainerStyle={styles.content}
        onRefresh={() => loadGuardians(schoolId, studentId)}
        refreshing={isLoading}
        scrollable
        testID="student-guardians-screen"
      >
        <View style={styles.maxWidth}>
          <AppHeader
            includeSafeArea={false}
            onBackPress={navigation.goBack}
            rightActions={
              <AppButton
                onPress={() =>
                  navigation.navigate(ROUTES.CREATE_GUARDIAN, route.params)
                }
                title="Add"
              />
            }
            subtitle={currentStudent?.profile.fullName}
            title="Guardians"
          />
          {isLoading && guardians.length === 0 ? (
            <LoadingView message="Loading guardians…" />
          ) : error && guardians.length === 0 ? (
            <ErrorState
              message={error.message}
              onRetry={() => loadGuardians(schoolId, studentId)}
            />
          ) : guardians.length === 0 ? (
            <EmptyState
              actionLabel="Add Guardian"
              description="Link a guardian before continuing."
              onAction={() =>
                navigation.navigate(ROUTES.CREATE_GUARDIAN, route.params)
              }
              title="No guardians"
            />
          ) : (
            <View style={styles.list}>
              {guardians.map(guardian => (
                <View key={guardian.id} style={styles.item}>
                  <GuardianCard guardian={guardian} />
                  <View style={styles.actions}>
                    <AppButton
                      onPress={() =>
                        navigation.navigate(ROUTES.EDIT_GUARDIAN, {
                          guardianId: guardian.id,
                          schoolId,
                          studentId,
                        })
                      }
                      title="Edit"
                      variant="outline"
                    />
                    <AppButton
                      disabled={
                        guardians.length === 1 ||
                        guardian.link.isPrimaryContact
                      }
                      onPress={() => setPendingGuardianId(guardian.id)}
                      title="Unlink"
                      variant="danger"
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </AppScreen>
      <ConfirmationDialog
        confirmLabel="Unlink Guardian"
        destructive
        loading={isSaving}
        message="This removes the active student link while preserving guardian and relationship history."
        onCancel={() => setPendingGuardianId(null)}
        onConfirm={async () => {
          if (
            pendingGuardianId &&
            (await unlinkGuardian(schoolId, studentId, pendingGuardianId))
          ) {
            setPendingGuardianId(null);
          }
        }}
        title="Unlink this guardian?"
        visible={Boolean(pendingGuardianId)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  content: { paddingBottom: 32 },
  item: { gap: 8 },
  list: { gap: 16 },
  maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' },
});
