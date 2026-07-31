import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { FeeDueListCard } from '../../components/feeDue/FeeDueComponents';
import { StudentSearchField } from '../../components/student/StudentComponents';
import { ROUTES } from '../../constants/routes';
import { useDebounce } from '../../hooks/useDebounce';
import { useFeeDueAccess } from '../../hooks/useFeeDueAccess';
import type { RoleStackParamList } from '../../navigation/navigationTypes';
import { useAuthStore, useFeeDueStore } from '../../store';
import { systemFeeDueClock } from '../../utils/feeDueClock';

type DueParams = RoleStackParamList['PendingFees'];

export function FeeDueListScreen({ navigation, params, mode }: { navigation: NativeStackNavigationProp<RoleStackParamList>; params: DueParams; mode: 'PENDING' | 'OVERDUE' }) {
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [feeHeadId, setFeeHeadId] = useState('');
  const value = useDebounce(search, 300);
  const setContext = useFeeDueStore(state => state.setContext);
  const setQuery = useFeeDueStore(state => state.setDueQuery);
  const load = useFeeDueStore(state => state.loadFeeDues);
  const items = useFeeDueStore(state => state.feeDues);
  const loading = useFeeDueStore(state => state.isLoadingFeeDues);
  const error = useFeeDueStore(state => state.error);
  const refresh = useFeeDueStore(state => state.bulkRefreshFines);
  const refreshing = useFeeDueStore(state => state.isRefreshingFine);
  const actor = useAuthStore(state => state.activeMembership);
  const access = useFeeDueAccess(params.schoolId, params.branchId);
  const asOfDate = systemFeeDueClock.today();
  useEffect(() => {
    setContext({ academicSessionId: params.academicSessionId, asOfDate, branchId: params.branchId, schoolId: params.schoolId }, params.sessionStatus);
    setQuery({ asOfDate, page: 1, search: value, sort: mode === 'OVERDUE' ? 'DAYS_OVERDUE_DESC' : 'DUE_DATE_ASC', status: mode });
    load().catch(() => undefined);
  }, [asOfDate, load, mode, params, setContext, setQuery, value]);
  const title = mode === 'OVERDUE' ? 'Overdue Fees' : 'Pending Fees';
  return <AppScreen scrollable testID={mode === 'OVERDUE' ? 'overdue-fees-screen' : 'pending-fees-screen'}><View style={styles.maxWidth}><AppHeader includeSafeArea={false} onBackPress={navigation.goBack} subtitle="Generated records only — no payment action" title={title} /><StudentSearchField onChangeText={setSearch} value={search} /><AppCard style={styles.filters} variant="outlined"><AppText variant="title">Filters</AppText><AppInput label="Class ID" onChangeText={setClassId} value={classId} /><AppInput label="Section ID" onChangeText={setSectionId} value={sectionId} /><AppInput label="Fee Head ID" onChangeText={setFeeHeadId} value={feeHeadId} /><AppButton onPress={() => { setQuery({ classId: classId || 'ALL', feeHeadId: feeHeadId || 'ALL', page: 1, sectionId: sectionId || 'ALL' }); load().catch(() => undefined); }} title="Apply Filters" variant="outline" /></AppCard>{mode === 'OVERDUE' && access.canRefreshFine ? <AppButton loading={refreshing} onPress={() => refresh({ academicSessionId: params.academicSessionId, asOfDate, branchId: params.branchId, requestedByUserId: actor?.userId ?? 'current-user' })} title="Refresh Accrued Fines" variant="outline" /> : null}{loading && !items.items.length ? <LoadingView message={`Loading ${title}…`} /> : error && !items.items.length ? <ErrorState message={error.message} onRetry={load} /> : !items.items.length ? <EmptyState description={`No ${title.toLowerCase()} match these filters.`} title={`No ${title}`} /> : <View style={styles.list}>{items.items.map(item => <FeeDueListCard item={item} key={item.due.id} onPress={() => navigation.navigate(ROUTES.FEE_DUE_DETAILS, { ...params, feeDueId: item.due.id })} />)}</View>}</View></AppScreen>;
}
const styles = StyleSheet.create({ filters: { gap: 8 }, list: { gap: 10 }, maxWidth: { alignSelf: 'center', gap: 12, maxWidth: 820, width: '100%' } });
