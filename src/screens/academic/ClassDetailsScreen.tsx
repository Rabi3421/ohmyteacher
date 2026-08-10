import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AcademicContextBar } from '../../components/academic/AcademicContextBar';
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
import { ROUTES } from '../../constants/routes';
import { useAcademicAccess } from '../../hooks/useAcademicAccess';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useClassContextRedirect } from '../../hooks/useClassContextRedirect';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAcademicStore } from '../../store';
import { formatDateTime } from '../../utils/date';

export function ClassDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'ClassDetails'>) {
  const theme = useAppTheme();
  const { classId, schoolId, branchId, academicSessionId } = route.params;
  const access = useAcademicAccess(schoolId, branchId);
  const context = useAcademicStore(state => state.context);
  const current = useAcademicStore(state => state.currentClass);
  const error = useAcademicStore(state => state.error);
  const isLoading = useAcademicStore(state => state.isLoading);
  const isSaving = useAcademicStore(state => state.isSaving);
  const loadClass = useAcademicStore(state => state.loadClass);
  const updateStatus = useAcademicStore(state => state.updateClassStatus);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  useClassContextRedirect(navigation, {
    academicSessionId,
    branchId,
    schoolId,
  });

  useEffect(() => {
    if (
      context?.schoolId === schoolId &&
      context.branchId === branchId &&
      context.academicSessionId === academicSessionId
    ) {
      loadClass(classId).catch(() => undefined);
    }
  }, [
    academicSessionId,
    branchId,
    classId,
    context,
    loadClass,
    schoolId,
  ]);

  const item = current?.id === classId ? current : null;

  return (
    <>
      <AppScreen
        contentContainerStyle={styles.content}
        onRefresh={() => loadClass(classId)}
        refreshing={isLoading}
        scrollable
        testID="class-details-screen"
      >
        <View style={styles.maxWidth}>
          <AppHeader
            includeSafeArea={false}
            onBackPress={navigation.goBack}
            rightActions={
              access.canManageClasses && item ? (
                <AppButton
                  onPress={() =>
                    navigation.navigate(ROUTES.EDIT_CLASS, route.params)
                  }
                  title="Edit"
                  variant="outline"
                />
              ) : null
            }
            title="Class Details"
          />
          <AcademicContextBar
            initialBranchId={branchId}
            initialSessionId={academicSessionId}
            schoolId={schoolId}
          />
          {isLoading && !item ? (
            <LoadingView message="Loading class…" />
          ) : error && !item ? (
            <ErrorState
              message={error.message}
              onRetry={() => loadClass(classId)}
            />
          ) : item ? (
            <>
              <AppCard variant="elevated">
                <View style={styles.row}>
                  <View style={styles.copy}>
                    <AppText variant="heading2">{item.name}</AppText>
                  </View>
                  <AppBadge
                    status={
                      item.status === 'ACTIVE' ? 'active' : 'inactive'
                    }
                  />
                </View>
                <View style={styles.facts}>
                  <AppText>Display order: {item.displayOrder}</AppText>
                  <AppText>
                    Sections: {item.activeSectionCount} active of{' '}
                    {item.sectionCount}
                  </AppText>
                  <AppText>
                    Assigned subjects: {item.assignedSubjectCount}
                  </AppText>
                  <AppText
                    color={theme.colors.textTertiary}
                    variant="caption"
                  >
                    Created {formatDateTime(item.createdAt)}
                  </AppText>
                </View>
              </AppCard>
              <View style={styles.actions}>
                <AppButton
                  onPress={() =>
                    navigation.navigate(ROUTES.SECTIONS, route.params)
                  }
                  title="View Sections"
                  variant="outline"
                />
                <AppButton
                  onPress={() =>
                    navigation.navigate(
                      ROUTES.CLASS_SUBJECT_ASSIGNMENT,
                      route.params,
                    )
                  }
                  title={
                    access.canAssign ? 'Assign Teachers' : 'View Teachers'
                  }
                  variant="outline"
                />
                {access.canManageClasses ? (
                  <AppButton
                    onPress={() =>
                      item.status === 'ACTIVE'
                        ? setConfirmDeactivate(true)
                        : updateStatus(classId, 'ACTIVE')
                    }
                    title={
                      item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'
                    }
                    variant={
                      item.status === 'ACTIVE' ? 'danger' : 'primary'
                    }
                  />
                ) : null}
              </View>
              {error ? <InlineError message={error.message} /> : null}
            </>
          ) : null}
        </View>
      </AppScreen>
      <ConfirmationDialog
        confirmLabel="Deactivate"
        destructive
        loading={isSaving}
        message="Django retains this class’s sections and teacher assignments. Dependent changes remain unavailable until the class is active again."
        onCancel={() => setConfirmDeactivate(false)}
        onConfirm={async () => {
          if (await updateStatus(classId, 'INACTIVE')) {
            setConfirmDeactivate(false);
          }
        }}
        title={`Deactivate ${item?.name ?? 'class'}?`}
        visible={confirmDeactivate}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  content: { paddingBottom: 32 },
  copy: { flex: 1 },
  facts: { gap: 6, marginTop: 18 },
  maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12 },
});
