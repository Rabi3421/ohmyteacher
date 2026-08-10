import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppSearchInput } from '../../components/common/AppSearchInput';
import { AppScreen } from '../../components/common/AppScreen';
import { CurrentFeeStructureCard } from '../../components/feeSetup/CurrentFeeConfigurationComponents';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useFeeSetupAccess } from '../../hooks/useFeeSetupAccess';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useCurrentFeeConfigurationStore } from '../../store';

export function FeeStructuresScreen({ navigation, route }: RoleScreenProps<'FeeStructures'>) {
  const [search, setSearch] = useState('');
  const structures = useCurrentFeeConfigurationStore(state => state.structures);
  const loading = useCurrentFeeConfigurationStore(state => state.isLoadingStructures);
  const error = useCurrentFeeConfigurationStore(state => state.error);
  const setContext = useCurrentFeeConfigurationStore(state => state.setContext);
  const load = useCurrentFeeConfigurationStore(state => state.loadStructures);
  const access = useFeeSetupAccess(route.params.schoolId, route.params.branchId);

  useEffect(() => {
    setContext(route.params, route.params.sessionStatus);
    load().catch(() => undefined);
  }, [load, route.params, setContext]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return structures.filter(item => !term || item.className.toLowerCase().includes(term));
  }, [search, structures]);

  return (
    <AppScreen onRefresh={load} refreshing={loading} scrollable testID="fee-structures-screen">
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          rightActions={access.canManageStructures ? <AppButton onPress={() => navigation.navigate(ROUTES.CREATE_FEE_STRUCTURE, route.params)} title="Add Item" /> : null}
          subtitle={`${structures.filter(item => item.items.length > 0).length}/${structures.length} Classes configured`}
          title="Class Fee Blueprints"
        />
        <AppSearchInput onChangeText={setSearch} placeholder="Filter by Class name" value={search} />
        {loading && structures.length === 0 ? <LoadingView message="Loading live Class fee blueprints…" /> :
          error && structures.length === 0 ? <ErrorState message={error.message} onRetry={load} /> :
          visible.length === 0 ? <EmptyState description={search ? 'No Class matches this local filter.' : 'No Classes exist in the selected live context.'} title="No Class blueprints" /> :
          <View style={styles.list}>{visible.map(item => (
            <CurrentFeeStructureCard item={item} key={item.id} onPress={() => navigation.navigate(ROUTES.FEE_STRUCTURE_DETAILS, { ...route.params, feeStructureId: item.classId })} />
          ))}</View>}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({ list: { gap: 12, marginTop: 16 }, maxWidth: { alignSelf: 'center', maxWidth: 780, width: '100%' } });
