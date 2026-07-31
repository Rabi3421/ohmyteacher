import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useFeeSetupAccess } from '../../hooks/useFeeSetupAccess';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeSetupStore } from '../../store';

export function FeeHeadDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'FeeHeadDetails'>) {
  const current = useFeeSetupStore(state => state.currentFeeHead);
  const load = useFeeSetupStore(state => state.loadFeeHead);
  const updateStatus = useFeeSetupStore(state => state.updateFeeHeadStatus);
  const loading = useFeeSetupStore(state => state.isLoadingFeeHeads || state.isSavingFeeHead);
  const error = useFeeSetupStore(state => state.error);
  const [confirming, setConfirming] = useState(false);
  const access = useFeeSetupAccess(route.params.schoolId, route.params.branchId);
  useEffect(() => { load(route.params.feeHeadId).catch(() => undefined); }, [load, route.params.feeHeadId]);
  const head = current?.id === route.params.feeHeadId ? current : null;
  return (
    <>
      <AppScreen scrollable testID="fee-head-details-screen">
        <View style={styles.maxWidth}>
          <AppHeader
            includeSafeArea={false}
            onBackPress={navigation.goBack}
            rightActions={access.canManageHeads ? (
              <AppButton onPress={() => navigation.navigate(ROUTES.EDIT_FEE_HEAD, route.params)} title="Edit" variant="outline" />
            ) : null}
            title="Fee Head Details"
          />
          {!head ? <LoadingView message="Loading Fee Head…" /> : (
            <AppCard variant="elevated">
              <View style={styles.row}>
                <View style={styles.copy}>
                  <AppText variant="heading2">{head.name}</AppText>
                  <AppText>{head.code}</AppText>
                </View>
                <AppBadge label={head.status} status={head.status === 'ACTIVE' ? 'active' : 'inactive'} />
              </View>
              <AppText>{head.type.replace('_', ' ')} · {head.defaultFrequency.replace('_', ' ')}</AppText>
              <AppText>{head.mandatoryByDefault ? 'Mandatory by default' : 'Optional by default'} · {head.refundable ? 'Refundable' : 'Non-refundable'}</AppText>
              <AppText>{head.activeStructureItemCount} active structure references</AppText>
              {access.canManageHeads ? (
                <AppButton onPress={() => setConfirming(true)} title={head.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} variant={head.status === 'ACTIVE' ? 'danger' : 'outline'} />
              ) : null}
              {error ? <InlineError message={error.message} /> : null}
            </AppCard>
          )}
        </View>
      </AppScreen>
      <ConfirmationDialog
        destructive={head?.status === 'ACTIVE'}
        loading={loading}
        message="References and history are preserved. Active references block deactivation."
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          if (head && await updateStatus(head.id, head.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')) setConfirming(false);
        }}
        title="Confirm Fee Head status"
        visible={confirming}
      />
    </>
  );
}
const styles = StyleSheet.create({ copy: { flex: 1 }, maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' }, row: { alignItems: 'center', flexDirection: 'row', gap: 10 } });
