import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { CurrentStudentCard } from '../../components/student/CurrentStudentComponents';
import { ROUTES } from '../../constants/routes';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useCurrentStudentStore } from '../../store';

export function ParentChildrenScreen({ navigation, route }: RoleScreenProps<'ParentChildren'>) {
  const children = useCurrentStudentStore(state => state.myChildren);
  const isLoading = useCurrentStudentStore(state => state.isLoading);
  const error = useCurrentStudentStore(state => state.error);
  const load = useCurrentStudentStore(state => state.loadMyChildren);
  useEffect(() => { load().catch(() => undefined); }, [load]);
  return <AppScreen contentContainerStyle={styles.content} onRefresh={load} refreshing={isLoading} scrollable testID="parent-children-screen"><View style={styles.maxWidth}>
    <AppHeader includeSafeArea={false} subtitle={`${children.length} backend-linked ${children.length === 1 ? 'child' : 'children'}`} title="My Children" />
    {isLoading && !children.length ? <LoadingView message="Loading children…" /> : error && !children.length ? <ErrorState message={error.message} onRetry={load} /> : !children.length ? <EmptyState description="No StudentLink is associated with this phone login." title="No linked children" /> : <View style={styles.list}>{children.map(child => <CurrentStudentCard item={child} key={child.id} onPress={() => navigation.navigate(ROUTES.PARENT_CHILD_DETAILS, { parentMembershipId: route.params.parentMembershipId, schoolId: route.params.schoolId, studentId: child.id })} />)}</View>}
  </View></AppScreen>;
}
const styles = StyleSheet.create({ content: { paddingBottom: 32 }, list: { gap: 12 }, maxWidth: { alignSelf: 'center', maxWidth: 760, width: '100%' } });
