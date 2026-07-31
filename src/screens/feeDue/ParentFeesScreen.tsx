import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useStudentStore } from '../../store';

export function ParentFeesScreen({
  navigation,
  route,
}: RoleScreenProps<'ParentFees'>) {
  const { parentMembershipId, schoolId } = route.params;
  const children = useStudentStore(state => state.parentChildren);
  const error = useStudentStore(state => state.error);
  const isLoading = useStudentStore(state => state.isLoadingParentChildren);
  const loadChildren = useStudentStore(state => state.loadParentChildren);

  useEffect(() => {
    loadChildren(schoolId, parentMembershipId).catch(() => undefined);
  }, [loadChildren, parentMembershipId, schoolId]);

  return (
    <AppScreen
      onRefresh={() => loadChildren(schoolId, parentMembershipId)}
      refreshing={isLoading}
      scrollable
      testID="parent-fees-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          subtitle="Generated dues for your linked children"
          title="Fees"
        />
        <AppCard variant="outlined">
          <AppText>
            Amounts are read-only Fee Due snapshots. Payments and receipts are
            not part of this phase.
          </AppText>
        </AppCard>
        {isLoading && children.length === 0 ? (
          <LoadingView message="Loading linked children…" />
        ) : error && children.length === 0 ? (
          <ErrorState
            message={error.message}
            onRetry={() => loadChildren(schoolId, parentMembershipId)}
          />
        ) : children.length === 0 ? (
          <EmptyState
            description="No active student link is available for this Parent membership."
            title="No linked children"
          />
        ) : (
          <View style={styles.list}>
            {children.map(child => (
              <AppCard key={child.profile.id} variant="elevated">
                <AppText variant="title">{child.profile.fullName}</AppText>
                <AppText>{child.profile.admissionNumber}</AppText>
                <AppText variant="caption">
                  {child.currentEnrollment
                    ? `${child.currentEnrollment.className} · ${child.currentEnrollment.sectionName}`
                    : 'No active enrollment'}
                </AppText>
                <AppButton
                  onPress={() =>
                    navigation.navigate(
                      ROUTES.PARENT_STUDENT_FEE_DETAILS,
                      {
                        parentMembershipId,
                        schoolId,
                        studentId: child.profile.id,
                      },
                    )
                  }
                  style={styles.action}
                  title="View Fee Dues"
                  variant="outline"
                />
              </AppCard>
            ))}
          </View>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  action: { marginTop: 14 },
  list: { gap: 12 },
  maxWidth: {
    alignSelf: 'center',
    gap: 14,
    maxWidth: 760,
    width: '100%',
  },
});
