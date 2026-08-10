import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { CurrentStudentFacts, CurrentStudentStatusBadge } from '../../components/student/CurrentStudentComponents';
import { ROUTES } from '../../constants/routes';
import { BACKEND_STUDENT_STATUSES, type BackendStudentStatus } from '../../models/currentStudent';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useCurrentStudentStore } from '../../store';

export function StudentDetailsScreen({ navigation, route }: RoleScreenProps<'StudentDetails'>) {
  const currentValue = useCurrentStudentStore(state => state.current);
  const current = currentValue?.id === route.params.studentId ? currentValue : null;
  const isLoading = useCurrentStudentStore(state => state.isLoading);
  const isSaving = useCurrentStudentStore(state => state.isSaving);
  const error = useCurrentStudentStore(state => state.error);
  const load = useCurrentStudentStore(state => state.loadStudent);
  const changeStatus = useCurrentStudentStore(state => state.updateStatus);
  const [pending, setPending] = useState<BackendStudentStatus | null>(null);

  useEffect(() => { load(route.params.studentId).catch(() => undefined); }, [load, route.params.studentId]);

  return <>
    <AppScreen contentContainerStyle={styles.content} onRefresh={() => load(route.params.studentId)} refreshing={isLoading} scrollable testID="student-details-screen">
      <View style={styles.maxWidth}>
        <AppHeader includeSafeArea={false} onBackPress={navigation.goBack} rightActions={current ? <AppButton onPress={() => navigation.navigate(ROUTES.EDIT_STUDENT, route.params)} title="Edit" variant="outline" /> : null} title="Student Details" />
        {isLoading && !current ? <LoadingView message="Loading student…" /> : error && !current ? <ErrorState message={error.message} onRetry={() => load(route.params.studentId)} /> : current ? <View style={styles.sections}>
          <AppCard variant="elevated">
            <View style={styles.heading}><AppText variant="heading2">{current.name}</AppText><CurrentStudentStatusBadge status={current.status} /></View>
            <CurrentStudentFacts item={current} />
          </AppCard>
          <AppCard variant="outlined">
            <AppText variant="title">Confirmed backend boundaries</AppText>
            <AppText>Parent identity is the phone-linked login created or reused during admission. Separate guardian management, app-access toggles, enrolment history, transfers with reasons, and hard delete are not available.</AppText>
          </AppCard>
          <AppCard variant="outlined">
            <AppText variant="title">Change lifecycle status</AppText>
            <AppText>The backend accepts any exact status without a reason or transition history.</AppText>
            <View style={styles.actions}>{BACKEND_STUDENT_STATUSES.filter(status => status !== current.status).map(status => <AppButton key={status} onPress={() => setPending(status)} title={status.replace('_', ' ')} variant={status === 'active' ? 'outline' : 'danger'} />)}</View>
          </AppCard>
          {error ? <InlineError message={error.message} /> : null}
        </View> : null}
      </View>
    </AppScreen>
    <ConfirmationDialog confirmLabel="Change Status" destructive={pending !== 'active'} loading={isSaving} message="This endpoint records only the new status. It does not store a reason or transition history." onCancel={() => setPending(null)} onConfirm={async () => { if (pending && await changeStatus(route.params.studentId, pending)) setPending(null); }} title={`Set status to ${pending?.replace('_', ' ') ?? ''}?`} visible={Boolean(pending)} />
  </>;
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }, content: { paddingBottom: 32 }, heading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }, maxWidth: { alignSelf: 'center', maxWidth: 760, width: '100%' }, sections: { gap: 14 } });
