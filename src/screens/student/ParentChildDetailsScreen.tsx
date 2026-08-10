import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { CurrentStudentFacts, CurrentStudentStatusBadge } from '../../components/student/CurrentStudentComponents';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useCurrentStudentStore } from '../../store';

export function ParentChildDetailsScreen({ navigation, route }: RoleScreenProps<'ParentChildDetails'>) {
  const children = useCurrentStudentStore(state => state.myChildren);
  const child = children.find(item => item.id === route.params.studentId);
  const isLoading = useCurrentStudentStore(state => state.isLoading);
  const error = useCurrentStudentStore(state => state.error);
  const load = useCurrentStudentStore(state => state.loadMyChildren);
  useEffect(() => { if (!child) load().catch(() => undefined); }, [child, load]);
  return <AppScreen scrollable testID="parent-child-details-screen"><View style={styles.maxWidth}>
    <AppHeader includeSafeArea={false} onBackPress={navigation.goBack} subtitle="Read-only record from /my-children/" title="Child Profile" />
    {isLoading && !child ? <LoadingView message="Loading child profile…" /> : error && !child ? <ErrorState message={error.message} onRetry={load} /> : child ? <AppCard variant="elevated"><View style={styles.heading}><AppText variant="heading2">{child.name}</AppText><CurrentStudentStatusBadge status={child.status} /></View><CurrentStudentFacts item={child} showParent={false} /></AppCard> : null}
  </View></AppScreen>;
}
const styles = StyleSheet.create({ heading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }, maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' } });
