import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useFeeSetupAccess } from '../../hooks/useFeeSetupAccess';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useCurrentFeeConfigurationStore } from '../../store';
import { feePaiseToDto, formatFeePaise, parseFeeAmountInput } from '../../utils/feeMoney';

interface ItemEdit {
  id: string;
  amount: string;
  mandatory: boolean;
  originalAmountPaise: number;
  originalMandatory: boolean;
}

export function FeeStructureDetailsScreen({ navigation, route }: RoleScreenProps<'FeeStructureDetails'>) {
  const current = useCurrentFeeConfigurationStore(state => state.currentStructure);
  const heads = useCurrentFeeConfigurationStore(state => state.feeHeads);
  const load = useCurrentFeeConfigurationStore(state => state.loadStructure);
  const loadHeads = useCurrentFeeConfigurationStore(state => state.loadFeeHeads);
  const update = useCurrentFeeConfigurationStore(state => state.updateStructureItem);
  const setContext = useCurrentFeeConfigurationStore(state => state.setContext);
  const loading = useCurrentFeeConfigurationStore(state => state.isLoadingStructures);
  const saving = useCurrentFeeConfigurationStore(state => state.isSaving);
  const error = useCurrentFeeConfigurationStore(state => state.error);
  const access = useFeeSetupAccess(route.params.schoolId, route.params.branchId);
  const [editing, setEditing] = useState<ItemEdit | null>(null);
  const [pending, setPending] = useState<ItemEdit | null>(null);
  const [amountError, setAmountError] = useState<string>();

  useEffect(() => {
    setContext(route.params, route.params.sessionStatus);
    Promise.all([load(route.params.feeStructureId), loadHeads()]).catch(() => undefined);
  }, [load, loadHeads, route.params, setContext]);
  const structure = current?.classId === route.params.feeStructureId ? current : null;

  function requestSave(value: ItemEdit) {
    try {
      parseFeeAmountInput(value.amount);
      setAmountError(undefined);
      setPending(value);
    } catch (failure) {
      setAmountError(failure instanceof Error ? failure.message : 'Enter a valid amount.');
    }
  }

  return (
    <>
      <AppScreen onRefresh={() => load(route.params.feeStructureId)} refreshing={loading} scrollable testID="fee-structure-details-screen">
        <View style={styles.maxWidth}>
          <AppHeader
            includeSafeArea={false}
            onBackPress={navigation.goBack}
            rightActions={structure && access.canManageStructures && structure.classStatus === 'ACTIVE' ? <AppButton onPress={() => navigation.navigate(ROUTES.CREATE_FEE_STRUCTURE, route.params)} title="Add Item" /> : null}
            subtitle="Class ID is the stable blueprint identity"
            title="Class Fee Blueprint"
          />
          {!structure && loading ? <LoadingView message="Loading live Structure Items…" /> : !structure && error ? (
            <ErrorState message={error.message} onRetry={() => load(route.params.feeStructureId)} />
          ) : structure ? (
            <View style={styles.sections}>
              <AppCard style={styles.card} variant="elevated">
                <View style={styles.row}>
                  <View style={styles.copy}><AppText variant="heading2">{structure.className}</AppText><AppText>{structure.items.length} Structure Items</AppText></View>
                  <AppBadge label={structure.classStatus} status={structure.classStatus === 'ACTIVE' ? 'active' : 'inactive'} />
                </View>
                <AppText variant="title">Configured total {formatFeePaise(structure.totalPaise)}</AppText>
                <AppText variant="caption">This is a configuration sum, not a Student outstanding balance.</AppText>
              </AppCard>
              {structure.items.length === 0 ? (
                <EmptyState actionLabel={access.canManageStructures ? 'Add first Item' : undefined} description="Django has no exposed standalone Structure record. Posting the first Item creates its hidden one-to-one Class parent." onAction={access.canManageStructures ? () => navigation.navigate(ROUTES.CREATE_FEE_STRUCTURE, route.params) : undefined} title="No Structure Items" />
              ) : structure.items.map(item => {
                const head = heads.find(candidate => candidate.id === item.feeHeadId);
                const value = editing?.id === item.id ? editing : null;
                return (
                  <AppCard key={item.id} style={styles.card} variant="outlined">
                    <View style={styles.row}>
                      <View style={styles.copy}>
                        <AppText variant="title">{head?.name ?? `Fee Head ${item.feeHeadId}`}</AppText>
                        <AppText>{formatFeePaise(item.amountPaise)} · {item.mandatory ? 'Mandatory' : 'Optional'}</AppText>
                        <AppText variant="caption">{head ? (head.frequency === 'MONTHLY' ? 'Monthly' : 'One-time') : 'Historical/inactive Head reference'}</AppText>
                      </View>
                      {head ? <AppBadge label={head.status} status={head.status === 'ACTIVE' ? 'active' : 'inactive'} /> : null}
                    </View>
                    {value ? (
                      <View style={styles.editor}>
                        <AppInput error={amountError ?? error?.fieldErrors?.amount} keyboardType="decimal-pad" label="Amount (INR)" onChangeText={amount => { setEditing({ ...value, amount }); setAmountError(undefined); }} value={value.amount} />
                        <View style={styles.actions}>
                          <AppButton onPress={() => setEditing({ ...value, mandatory: true })} title="Mandatory" variant={value.mandatory ? 'primary' : 'outline'} />
                          <AppButton onPress={() => setEditing({ ...value, mandatory: false })} title="Optional" variant={!value.mandatory ? 'primary' : 'outline'} />
                        </View>
                        <View style={styles.actions}>
                          <AppButton onPress={() => { setEditing(null); setAmountError(undefined); }} title="Cancel" variant="ghost" />
                          <AppButton onPress={() => requestSave(value)} title="Review Changes" />
                        </View>
                      </View>
                    ) : access.canManageStructures && structure.classStatus === 'ACTIVE' ? (
                      <AppButton onPress={() => { setEditing({ amount: feePaiseToDto(item.amountPaise), id: item.id, mandatory: item.mandatory, originalAmountPaise: item.amountPaise, originalMandatory: item.mandatory }); setAmountError(undefined); }} title="Edit Amount / Mandatory" variant="outline" />
                    ) : null}
                  </AppCard>
                );
              })}
              {error ? <InlineError message={error.message} /> : null}
              <AppCard style={styles.card} variant="outlined">
                <AppText variant="title">Lifecycle and dependency boundary</AppText>
                <AppText>Django exposes no Structure activation, deactivation, copy, preview, schedule, or status fields. Item deletion is intentionally unavailable here; existing invoices retain amount snapshots, but destructive configuration changes require a later policy decision.</AppText>
              </AppCard>
            </View>
          ) : null}
        </View>
      </AppScreen>
      <ConfirmationDialog
        loading={saving}
        message={pending ? `Update this Structure Item to ${pending.amount} INR and mark it ${pending.mandatory ? 'mandatory' : 'optional'}? Existing generated invoice snapshots are unchanged.` : ''}
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          if (!pending) return;
          const amountPaise = parseFeeAmountInput(pending.amount);
          const changes: { amountPaise?: number; mandatory?: boolean } = {};
          if (amountPaise !== pending.originalAmountPaise) changes.amountPaise = amountPaise;
          if (pending.mandatory !== pending.originalMandatory) changes.mandatory = pending.mandatory;
          if (Object.keys(changes).length === 0 || await update(pending.id, changes)) {
            setPending(null);
            setEditing(null);
          }
        }}
        title="Confirm Structure Item update"
        visible={Boolean(pending)}
      />
    </>
  );
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, card: { gap: 10 }, copy: { flex: 1 }, editor: { gap: 10 }, maxWidth: { alignSelf: 'center', maxWidth: 780, width: '100%' }, row: { alignItems: 'center', flexDirection: 'row', gap: 10 }, sections: { gap: 13 } });
