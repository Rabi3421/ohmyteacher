import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppSearchInput } from '../../components/common/AppSearchInput';
import { AppScreen } from '../../components/common/AppScreen';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { FeeStructureCard } from '../../components/feeSetup/FeeComponents';
import { ROUTES } from '../../constants/routes';
import { useDebounce } from '../../hooks/useDebounce';
import { useFeeSetupAccess } from '../../hooks/useFeeSetupAccess';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeSetupStore } from '../../store';

export function FeeStructuresScreen({ navigation, route }: RoleScreenProps<'FeeStructures'>) {
  const [search, setSearch] = useState('');
  const value = useDebounce(search, 300);
  const structures = useFeeSetupStore(state => state.feeStructures);
  const loading = useFeeSetupStore(state => state.isLoadingStructures);
  const error = useFeeSetupStore(state => state.error);
  const setContext = useFeeSetupStore(state => state.setContext);
  const setQuery = useFeeSetupStore(state => state.setStructureQuery);
  const load = useFeeSetupStore(state => state.loadStructures);
  const access = useFeeSetupAccess(route.params.schoolId, route.params.branchId);
  useEffect(() => {
    setContext({ academicSessionId: route.params.academicSessionId, branchId: route.params.branchId, schoolId: route.params.schoolId }, route.params.sessionStatus);
    setQuery({ page: 1, search: value });
    load().catch(() => undefined);
  }, [load, route.params, setContext, setQuery, value]);
  return (
    <AppScreen scrollable testID="fee-structures-screen">
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          rightActions={access.canManageStructures ? <AppButton onPress={() => navigation.navigate(ROUTES.CREATE_FEE_STRUCTURE, route.params)} title="Add" /> : null}
          subtitle={access.isClosed ? 'Closed session · Read only' : `${structures.totalItems} structures`}
          title="Fee Structures"
        />
        <AppSearchInput
          onChangeText={setSearch}
          placeholder="Search structures by name or class"
          value={search}
        />
        {loading && !structures.items.length ? <LoadingView message="Loading Fee Structures…" /> :
          error && !structures.items.length ? <ErrorState message={error.message} onRetry={load} /> :
          !structures.items.length ? <EmptyState description="No structures match this context." title="No Fee Structures" /> :
          <View style={styles.list}>{structures.items.map(item => (
            <FeeStructureCard item={item} key={item.id} onPress={() => navigation.navigate(ROUTES.FEE_STRUCTURE_DETAILS, { ...route.params, feeStructureId: item.id })} />
          ))}</View>}
      </View>
    </AppScreen>
  );
}
const styles = StyleSheet.create({ list: { gap: 12, marginTop: 16 }, maxWidth: { alignSelf: 'center', maxWidth: 780, width: '100%' } });
