import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppSearchInput } from '../../components/common/AppSearchInput';
import { AppScreen } from '../../components/common/AppScreen';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { FeeHeadListItem } from '../../components/feeSetup/FeeComponents';
import { ROUTES } from '../../constants/routes';
import { useDebounce } from '../../hooks/useDebounce';
import { useFeeSetupAccess } from '../../hooks/useFeeSetupAccess';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeSetupStore } from '../../store';

export function FeeHeadsScreen({
  navigation,
  route,
}: RoleScreenProps<'FeeHeads'>) {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);
  const heads = useFeeSetupStore(state => state.feeHeads);
  const loading = useFeeSetupStore(state => state.isLoadingFeeHeads);
  const error = useFeeSetupStore(state => state.error);
  const setContext = useFeeSetupStore(state => state.setContext);
  const setQuery = useFeeSetupStore(state => state.setFeeHeadQuery);
  const load = useFeeSetupStore(state => state.loadFeeHeads);
  const access = useFeeSetupAccess(route.params.schoolId, route.params.branchId);

  useEffect(() => {
    setContext(
      {
        academicSessionId: route.params.academicSessionId,
        branchId: route.params.branchId,
        schoolId: route.params.schoolId,
      },
      route.params.sessionStatus,
    );
    setQuery({ page: 1, search: debounced });
    load().catch(() => undefined);
  }, [debounced, load, route.params, setContext, setQuery]);

  return (
    <AppScreen scrollable testID="fee-heads-screen">
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          rightActions={
            access.canManageHeads ? (
              <AppButton
                onPress={() =>
                  navigation.navigate(ROUTES.CREATE_FEE_HEAD, route.params)
                }
                title="Add"
              />
            ) : null
          }
          subtitle={`${heads.totalItems} school Fee Heads`}
          title="Fee Heads"
        />
        <AppSearchInput
          onChangeText={setSearch}
          placeholder="Search Fee Heads by name or code"
          value={search}
        />
        {loading && !heads.items.length ? (
          <LoadingView message="Loading Fee Heads…" />
        ) : error && !heads.items.length ? (
          <ErrorState message={error.message} onRetry={load} />
        ) : !heads.items.length ? (
          <EmptyState
            description="Create reusable school-level Fee Heads first."
            title="No Fee Heads"
          />
        ) : (
          <View style={styles.list}>
            {heads.items.map(item => (
              <FeeHeadListItem
                item={item}
                key={item.id}
                onPress={() =>
                  navigation.navigate(ROUTES.FEE_HEAD_DETAILS, {
                    ...route.params,
                    feeHeadId: item.id,
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
  list: { gap: 12, marginTop: 16 },
  maxWidth: { alignSelf: 'center', maxWidth: 760, width: '100%' },
});
