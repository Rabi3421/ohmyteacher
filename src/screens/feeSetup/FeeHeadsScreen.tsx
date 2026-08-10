import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppSearchInput } from '../../components/common/AppSearchInput';
import { AppScreen } from '../../components/common/AppScreen';
import { CurrentFeeHeadCard } from '../../components/feeSetup/CurrentFeeConfigurationComponents';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useFeeSetupAccess } from '../../hooks/useFeeSetupAccess';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useCurrentFeeConfigurationStore } from '../../store';

export function FeeHeadsScreen({ navigation, route }: RoleScreenProps<'FeeHeads'>) {
  const [search, setSearch] = useState('');
  const heads = useCurrentFeeConfigurationStore(state => state.feeHeads);
  const loading = useCurrentFeeConfigurationStore(state => state.isLoadingHeads);
  const error = useCurrentFeeConfigurationStore(state => state.error);
  const setContext = useCurrentFeeConfigurationStore(state => state.setContext);
  const load = useCurrentFeeConfigurationStore(state => state.loadFeeHeads);
  const access = useFeeSetupAccess(route.params.schoolId, route.params.branchId);

  useEffect(() => {
    setContext(route.params, route.params.sessionStatus);
    load().catch(() => undefined);
  }, [load, route.params, setContext]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return heads.filter(item => !term || item.name.toLowerCase().includes(term));
  }, [heads, search]);

  return (
    <AppScreen onRefresh={load} refreshing={loading} scrollable testID="fee-heads-screen">
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          rightActions={access.canManageHeads ? (
            <AppButton onPress={() => navigation.navigate(ROUTES.CREATE_FEE_HEAD, route.params)} title="Add" />
          ) : null}
          subtitle={`${heads.length} School-wide Fee Heads`}
          title="Fee Heads"
        />
        <AppSearchInput onChangeText={setSearch} placeholder="Filter by name" value={search} />
        {loading && heads.length === 0 ? (
          <LoadingView message="Loading live Fee Heads…" />
        ) : error && heads.length === 0 ? (
          <ErrorState message={error.message} onRetry={load} />
        ) : visible.length === 0 ? (
          <EmptyState
            description={search ? 'No Fee Head matches this local filter.' : 'Create a School-wide Fee Head before adding Class items.'}
            title="No Fee Heads"
          />
        ) : (
          <View style={styles.list}>
            {visible.map(item => (
              <CurrentFeeHeadCard
                item={item}
                key={item.id}
                onPress={() => navigation.navigate(ROUTES.FEE_HEAD_DETAILS, { ...route.params, feeHeadId: item.id })}
              />
            ))}
          </View>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, marginTop: 16 },
  maxWidth: { alignSelf: 'center', maxWidth: 760, width: '100%' },
});
