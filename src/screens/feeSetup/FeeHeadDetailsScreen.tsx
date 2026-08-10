import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useFeeSetupAccess } from '../../hooks/useFeeSetupAccess';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useCurrentFeeConfigurationStore } from '../../store';

export function FeeHeadDetailsScreen({ navigation, route }: RoleScreenProps<'FeeHeadDetails'>) {
  const current = useCurrentFeeConfigurationStore(state => state.currentFeeHead);
  const load = useCurrentFeeConfigurationStore(state => state.loadFeeHead);
  const setContext = useCurrentFeeConfigurationStore(state => state.setContext);
  const setStatus = useCurrentFeeConfigurationStore(state => state.setFeeHeadStatus);
  const loading = useCurrentFeeConfigurationStore(state => state.isLoadingHeads);
  const saving = useCurrentFeeConfigurationStore(state => state.isSaving);
  const error = useCurrentFeeConfigurationStore(state => state.error);
  const access = useFeeSetupAccess(route.params.schoolId, route.params.branchId);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setContext(route.params, route.params.sessionStatus);
    load(route.params.feeHeadId).catch(() => undefined);
  }, [load, route.params, setContext]);
  const head = current?.id === route.params.feeHeadId ? current : null;

  return (
    <>
      <AppScreen onRefresh={() => load(route.params.feeHeadId)} refreshing={loading} scrollable testID="fee-head-details-screen">
        <View style={styles.maxWidth}>
          <AppHeader
            includeSafeArea={false}
            onBackPress={navigation.goBack}
            rightActions={head && access.canManageHeads ? <AppButton onPress={() => navigation.navigate(ROUTES.EDIT_FEE_HEAD, route.params)} title="Edit" variant="outline" /> : null}
            title="Fee Head Details"
          />
          {!head && loading ? <LoadingView message="Loading live Fee Head…" /> : !head && error ? (
            <ErrorState message={error.message} onRetry={() => load(route.params.feeHeadId)} />
          ) : head ? (
            <AppCard style={styles.card} variant="elevated">
              <View style={styles.row}>
                <View style={styles.copy}><AppText variant="heading2">{head.name}</AppText><AppText>School-wide Fee Head</AppText></View>
                <AppBadge label={head.status} status={head.status === 'ACTIVE' ? 'active' : 'inactive'} />
              </View>
              <AppText>{head.frequency === 'MONTHLY' ? 'Monthly generation frequency' : 'One-time frequency'}</AppText>
              <AppText variant="caption">Created {new Date(head.createdAt).toLocaleDateString()}</AppText>
              {access.canManageHeads ? <AppButton onPress={() => setConfirming(true)} title={head.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} variant={head.status === 'ACTIVE' ? 'danger' : 'outline'} /> : null}
              {error ? <InlineError message={error.message} /> : null}
            </AppCard>
          ) : null}
        </View>
      </AppScreen>
      <ConfirmationDialog
        destructive={head?.status === 'ACTIVE'}
        loading={saving}
        message={head?.status === 'ACTIVE' ? `Deactivate ${head.name}? Existing Class items and generated invoice snapshots remain. New Item forms will exclude this Head.` : `Activate ${head?.name ?? 'this Fee Head'} for new configuration?`}
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          if (head && await setStatus(head.id, head.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')) setConfirming(false);
        }}
        title="Confirm Fee Head status"
        visible={confirming}
      />
    </>
  );
}

const styles = StyleSheet.create({ card: { gap: 12 }, copy: { flex: 1 }, maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' }, row: { alignItems: 'center', flexDirection: 'row', gap: 10 } });
