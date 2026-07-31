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
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAcademicStore } from '../../store';
import { formatDateTime } from '../../utils/date';

export function SubjectDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'SubjectDetails'>) {
  const theme = useAppTheme();
  const { schoolId, subjectId } = route.params;
  const { canManageSubjects } = useAcademicAccess(schoolId);
  const current = useAcademicStore(state => state.currentSubject);
  const error = useAcademicStore(state => state.error);
  const isLoading = useAcademicStore(state => state.isLoading);
  const isSaving = useAcademicStore(state => state.isSaving);
  const loadSubject = useAcademicStore(state => state.loadSubject);
  const updateStatus = useAcademicStore(state => state.updateSubjectStatus);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  useEffect(() => {
    loadSubject(schoolId, subjectId).catch(() => undefined);
  }, [loadSubject, schoolId, subjectId]);

  const item = current?.id === subjectId ? current : null;

  return (
    <>
      <AppScreen
        contentContainerStyle={styles.content}
        onRefresh={() => loadSubject(schoolId, subjectId)}
        refreshing={isLoading}
        scrollable
        testID="subject-details-screen"
      >
        <View style={styles.maxWidth}>
          <AppHeader
            includeSafeArea={false}
            onBackPress={navigation.goBack}
            rightActions={
              canManageSubjects && item ? (
                <AppButton
                  onPress={() =>
                    navigation.navigate(ROUTES.EDIT_SUBJECT, route.params)
                  }
                  title="Edit"
                  variant="outline"
                />
              ) : null
            }
            title="Subject Details"
          />
          <AcademicContextBar schoolId={schoolId} />
          {isLoading && !item ? (
            <LoadingView message="Loading subject…" />
          ) : error && !item ? (
            <ErrorState
              message={error.message}
              onRetry={() => loadSubject(schoolId, subjectId)}
            />
          ) : item ? (
            <>
              <AppCard variant="elevated">
                <View style={styles.row}>
                  <View style={styles.copy}>
                    <AppText variant="heading2">{item.name}</AppText>
                    <AppText color={theme.colors.primary}>
                      {item.code}
                      {item.shortName ? ` · ${item.shortName}` : ''}
                    </AppText>
                  </View>
                  <AppBadge
                    status={
                      item.status === 'ACTIVE' ? 'active' : 'inactive'
                    }
                  />
                </View>
                <View style={styles.facts}>
                  <AppText>Type: {item.type}</AppText>
                  <AppText>Display order: {item.displayOrder}</AppText>
                  <AppText>
                    Active class assignments: {item.activeAssignmentCount}
                  </AppText>
                  <AppText
                    color={theme.colors.textTertiary}
                    variant="caption"
                  >
                    Updated {formatDateTime(item.updatedAt)}
                  </AppText>
                </View>
              </AppCard>
              {canManageSubjects ? (
                <AppButton
                  onPress={() =>
                    item.status === 'ACTIVE'
                      ? setConfirmDeactivate(true)
                      : updateStatus(schoolId, subjectId, 'ACTIVE')
                  }
                  style={styles.action}
                  title={
                    item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'
                  }
                  variant={item.status === 'ACTIVE' ? 'danger' : 'primary'}
                />
              ) : null}
              {error ? <InlineError message={error.message} /> : null}
            </>
          ) : null}
        </View>
      </AppScreen>
      <ConfirmationDialog
        confirmLabel="Deactivate"
        destructive
        loading={isSaving}
        message="This is allowed only after all active class assignments are removed."
        onCancel={() => setConfirmDeactivate(false)}
        onConfirm={async () => {
          if (await updateStatus(schoolId, subjectId, 'INACTIVE')) {
            setConfirmDeactivate(false);
          }
        }}
        title={`Deactivate ${item?.name ?? 'subject'}?`}
        visible={confirmDeactivate}
      />
    </>
  );
}

const styles = StyleSheet.create({
  action: { alignSelf: 'flex-start', marginTop: 18 },
  content: { paddingBottom: 32 },
  copy: { flex: 1 },
  facts: { gap: 6, marginTop: 18 },
  maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12 },
});
