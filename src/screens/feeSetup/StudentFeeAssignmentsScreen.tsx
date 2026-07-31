import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { StudentFeeAssignmentCard } from '../../components/feeSetup/FeeComponents';
import { StudentSearchField } from '../../components/student/StudentComponents';
import { ROUTES } from '../../constants/routes';
import { useDebounce } from '../../hooks/useDebounce';
import { useFeeSetupAccess } from '../../hooks/useFeeSetupAccess';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeSetupStore } from '../../store';

export function StudentFeeAssignmentsScreen({ navigation, route }: RoleScreenProps<'StudentFeeAssignments'>) {
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState(route.params.classId ?? '');
  const [structureId, setStructureId] = useState(route.params.feeStructureId ?? '');
  const [filterClassId, setFilterClassId] = useState(route.params.classId ?? '');
  const [filterSectionId, setFilterSectionId] = useState('');
  const [optionalFeeHeadId, setOptionalFeeHeadId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const debounced = useDebounce(search, 300);
  const assignments = useFeeSetupStore(state => state.assignments);
  const loading = useFeeSetupStore(state => state.isLoadingAssignments);
  const bulkLoading = useFeeSetupStore(state => state.isBulkAssigning);
  const error = useFeeSetupStore(state => state.error);
  const success = useFeeSetupStore(state => state.successMessage);
  const setContext = useFeeSetupStore(state => state.setContext);
  const setQuery = useFeeSetupStore(state => state.setAssignmentQuery);
  const load = useFeeSetupStore(state => state.loadAssignments);
  const bulk = useFeeSetupStore(state => state.bulkAssign);
  const access = useFeeSetupAccess(route.params.schoolId, route.params.branchId);
  useEffect(() => {
    setContext({ academicSessionId: route.params.academicSessionId, branchId: route.params.branchId, schoolId: route.params.schoolId }, route.params.sessionStatus);
    setQuery({ classId: route.params.classId ?? 'ALL', page: 1 });
    load().catch(() => undefined);
  }, [load, route.params.academicSessionId, route.params.branchId, route.params.classId, route.params.schoolId, route.params.sessionStatus, setContext, setQuery]);
  useEffect(() => {
    setQuery({ page: 1, search: debounced });
    load().catch(() => undefined);
  }, [debounced, load, setQuery]);
  return (
    <>
      <AppScreen scrollable testID="student-fee-assignments-screen"><View style={styles.maxWidth}>
        <AppHeader includeSafeArea={false} onBackPress={navigation.goBack} subtitle={access.isClosed ? 'Historical assignments · Read only' : `${assignments.totalItems} eligible enrollments`} title="Student Fee Assignments" />
        <StudentSearchField onChangeText={setSearch} value={search} />
        <View style={styles.filters}>{(['ALL','ASSIGNED','UNASSIGNED'] as const).map(status => <AppButton key={status} onPress={() => { setQuery({ assignmentStatus: status }); load().catch(() => undefined); }} title={status} variant="outline" />)}</View>
        <AppCard style={styles.filtersCard} variant="outlined">
          <AppText variant="title">Filters</AppText>
          <AppInput label="Class ID" onChangeText={setFilterClassId} value={filterClassId} />
          <AppInput label="Section ID" onChangeText={setFilterSectionId} value={filterSectionId} />
          <AppInput label="Selected Optional Fee Head ID" onChangeText={setOptionalFeeHeadId} value={optionalFeeHeadId} />
          <AppButton onPress={() => { setQuery({ classId: filterClassId || 'ALL', optionalFeeHeadId: optionalFeeHeadId || 'ALL', page: 1, sectionId: filterSectionId || 'ALL' }); load().catch(() => undefined); }} title="Apply Filters" variant="outline" />
        </AppCard>
        {access.canManageAssignments ? <AppCard style={styles.bulk} variant="outlined"><AppText variant="title">Bulk Default Assignment</AppText><AppText>Eligible active enrollments only. Existing customized assignments are skipped.</AppText><AppInput label="Class ID" onChangeText={setClassId} value={classId} /><AppInput label="Active Fee Structure ID" onChangeText={setStructureId} value={structureId} /><AppButton disabled={!classId || !structureId} onPress={() => setConfirming(true)} title="Assign Default to Eligible Students" /></AppCard> : null}
        {success ? <AppCard variant="outlined"><AppText>{success}</AppText></AppCard> : null}
        {loading && !assignments.items.length ? <LoadingView message="Loading Student Fee Assignments…" /> : error && !assignments.items.length ? <ErrorState message={error.message} onRetry={load} /> : !assignments.items.length ? <EmptyState description="No eligible student enrollment matches this context." title="No assignments" /> : <View style={styles.list}>{assignments.items.map(item => <StudentFeeAssignmentCard item={item} key={item.enrollmentId} onPress={() => navigation.navigate(ROUTES.STUDENT_FEE_ASSIGNMENT_DETAILS, { ...route.params, enrollmentId: item.enrollmentId, studentId: item.studentId })} />)}</View>}
      </View></AppScreen>
      <ConfirmationDialog loading={bulkLoading} message="This assigns the active default structure only to eligible unassigned enrollments. Customized assignments are never overwritten." onCancel={() => setConfirming(false)} onConfirm={async () => { const ok = await bulk({ academicSessionId: route.params.academicSessionId, branchId: route.params.branchId, classId, effectiveFrom: new Date().toISOString().slice(0,10), feeStructureId: structureId, schoolId: route.params.schoolId }); if (ok) setConfirming(false); }} title="Confirm bulk default assignment" visible={confirming} />
    </>
  );
}
const styles = StyleSheet.create({ bulk: { gap: 10, marginTop: 14 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }, filtersCard: { gap: 10, marginTop: 14 }, list: { gap: 12, marginTop: 16 }, maxWidth: { alignSelf: 'center', maxWidth: 780, width: '100%' } });
