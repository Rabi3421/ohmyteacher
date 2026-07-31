import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { StudentListItem } from '../../components/student/StudentComponents';
import { ROUTES } from '../../constants/routes';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useStudentStore } from '../../store';

export function ParentChildrenScreen({
  navigation,
  route,
}: RoleScreenProps<'ParentChildren'>) {
  const { schoolId, parentMembershipId } = route.params;
  const children = useStudentStore(state => state.parentChildren);
  const isLoading = useStudentStore(state => state.isLoadingParentChildren);
  const error = useStudentStore(state => state.error);
  const loadChildren = useStudentStore(state => state.loadParentChildren);

  useEffect(() => {
    loadChildren(schoolId, parentMembershipId).catch(() => undefined);
  }, [loadChildren, parentMembershipId, schoolId]);

  return (
    <AppScreen
      contentContainerStyle={styles.content}
      onRefresh={() => loadChildren(schoolId, parentMembershipId)}
      refreshing={isLoading}
      scrollable
      testID="parent-children-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          subtitle={`${children.length} linked child${children.length === 1 ? '' : 'ren'}`}
          title="My Children"
        />
        {isLoading && children.length === 0 ? (
          <LoadingView message="Loading children…" />
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
              <StudentListItem
                item={child}
                key={child.profile.id}
                onPress={() =>
                  navigation.navigate(ROUTES.PARENT_CHILD_DETAILS, {
                    parentMembershipId,
                    schoolId,
                    studentId: child.profile.id,
                  })
                }
              />
            ))}
          </View>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  list: { gap: 12 },
  maxWidth: { alignSelf: 'center', maxWidth: 760, width: '100%' },
});
