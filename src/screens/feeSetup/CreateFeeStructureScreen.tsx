import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { InlineError } from '../../components/feedback/InlineError';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useCurrentFeeConfigurationStore } from '../../store';
import { formatFeePaise, parseFeeAmountInput } from '../../utils/feeMoney';

export function CreateFeeStructureScreen({ navigation, route }: RoleScreenProps<'CreateFeeStructure'>) {
  const structures = useCurrentFeeConfigurationStore(state => state.structures);
  const heads = useCurrentFeeConfigurationStore(state => state.feeHeads);
  const error = useCurrentFeeConfigurationStore(state => state.error);
  const saving = useCurrentFeeConfigurationStore(state => state.isSaving);
  const setContext = useCurrentFeeConfigurationStore(state => state.setContext);
  const loadStructures = useCurrentFeeConfigurationStore(state => state.loadStructures);
  const loadHeads = useCurrentFeeConfigurationStore(state => state.loadFeeHeads);
  const create = useCurrentFeeConfigurationStore(state => state.createStructureItem);
  const [classId, setClassId] = useState('');
  const [feeHeadId, setFeeHeadId] = useState('');
  const [amount, setAmount] = useState('');
  const [mandatory, setMandatory] = useState(true);
  const [amountError, setAmountError] = useState<string>();
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    setContext(route.params, route.params.sessionStatus);
    Promise.all([loadStructures(), loadHeads()]).catch(() => undefined);
  }, [loadHeads, loadStructures, route.params, setContext]);

  const availableClasses = structures.filter(item => item.classStatus === 'ACTIVE');
  const selectedStructure = structures.find(item => item.classId === classId);
  const availableHeads = useMemo(
    () => heads.filter(head => head.status === 'ACTIVE' && !selectedStructure?.items.some(item => item.feeHeadId === head.id)),
    [heads, selectedStructure],
  );
  const selectedHead = heads.find(item => item.id === feeHeadId);
  let reviewPaise: number | null = null;
  if (reviewing) {
    try { reviewPaise = parseFeeAmountInput(amount); } catch { reviewPaise = null; }
  }

  function review() {
    if (!classId || !feeHeadId) return;
    try {
      parseFeeAmountInput(amount);
      setAmountError(undefined);
      setReviewing(true);
    } catch (value) {
      setAmountError(value instanceof Error ? value.message : 'Enter a valid amount.');
    }
  }

  return (
    <AppScreen scrollable testID="create-fee-structure-screen">
      <View style={styles.maxWidth}>
        <AppHeader includeSafeArea={false} onBackPress={reviewing ? () => setReviewing(false) : navigation.goBack} subtitle="One independent Django Structure Item request" title={reviewing ? 'Review Structure Item' : 'Add Structure Item'} />
        {!reviewing ? (
          <View style={styles.fields}>
            <AppText variant="label">Active Class</AppText>
            <View style={styles.options}>{availableClasses.map(item => <AppButton key={item.classId} onPress={() => { setClassId(item.classId); setFeeHeadId(''); }} title={item.className} variant={classId === item.classId ? 'primary' : 'outline'} />)}</View>
            <AppText variant="label">Active Fee Head not already used</AppText>
            <View style={styles.options}>{availableHeads.map(item => <AppButton key={item.id} onPress={() => setFeeHeadId(item.id)} title={item.name} variant={feeHeadId === item.id ? 'primary' : 'outline'} />)}</View>
            <AppInput
              error={amountError ?? error?.fieldErrors?.amount}
              helperText="Canonical rupees; no comma/sign; maximum 99,999,999.99"
              keyboardType="decimal-pad"
              label="Amount (INR)"
              onChangeText={value => { setAmount(value); setAmountError(undefined); }}
              required
              value={amount}
            />
            <View style={styles.options}>
              <AppButton onPress={() => setMandatory(true)} title="Mandatory" variant={mandatory ? 'primary' : 'outline'} />
              <AppButton onPress={() => setMandatory(false)} title="Optional" variant={!mandatory ? 'primary' : 'outline'} />
            </View>
            {error && !error.fieldErrors ? <InlineError message={error.message} /> : null}
            <AppButton disabled={!classId || !feeHeadId || !amount} onPress={review} title="Review Item" />
          </View>
        ) : (
          <View style={styles.fields}>
            <AppCard style={styles.review} variant="elevated">
              <AppText variant="heading3">{selectedStructure?.className}</AppText>
              <AppText variant="title">{selectedHead?.name}</AppText>
              <AppText>{reviewPaise === null ? 'Invalid amount' : formatFeePaise(reviewPaise)}</AppText>
              <AppBadge label={mandatory ? 'MANDATORY' : 'OPTIONAL'} status={mandatory ? 'active' : 'draft'} />
              <AppText variant="caption">Saving configuration does not create a Fee Due.</AppText>
            </AppCard>
            {error ? <InlineError message={error.message} /> : null}
            <AppButton
              loading={saving}
              onPress={async () => {
                let amountPaise: number;
                try { amountPaise = parseFeeAmountInput(amount); } catch (value) { setAmountError(value instanceof Error ? value.message : 'Invalid amount.'); setReviewing(false); return; }
                const item = await create({ amountPaise, classId, feeHeadId, mandatory });
                if (item) navigation.navigate('FeeStructureDetails', { ...route.params, feeStructureId: classId });
              }}
              title="Create Structure Item"
            />
          </View>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({ fields: { gap: 14 }, maxWidth: { alignSelf: 'center', maxWidth: 760, width: '100%' }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, review: { gap: 10 } });
