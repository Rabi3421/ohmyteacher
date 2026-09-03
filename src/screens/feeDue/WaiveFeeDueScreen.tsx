import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '../../components/common/AppButton';
import { AppChoiceChip } from '../../components/common/AppChoiceChip';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { InlineError } from '../../components/feedback/InlineError';
import { useFeeDueAccess } from '../../hooks/useFeeDueAccess';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeDueStore } from '../../store';

export function WaiveFeeDueScreen({ navigation, route }: RoleScreenProps<'WaiveFeeDue'>) {
  const current = useFeeDueStore(state => state.currentFeeDue);
  const waiveFine = useFeeDueStore(state => state.waiveFine);
  const waiveDue = useFeeDueStore(state => state.waiveDue);
  const error = useFeeDueStore(state => state.error);
  const loading = useFeeDueStore(state => state.isWaivingFine || state.isWaivingFeeDue);
  const access = useFeeDueAccess(route.params.schoolId, route.params.branchId);
  const [mode, setMode] = useState<'PARTIAL_FINE' | 'FULL_FINE' | 'FULL_DUE'>('FULL_FINE');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const due = current?.item.due.id === route.params.feeDueId ? current.item.due : null;
  return <><AppScreen scrollable testID="waive-fee-due-screen"><View style={styles.maxWidth}><AppHeader includeSafeArea={false} onBackPress={navigation.goBack} subtitle="Partial base-fee waiver is not supported" title="Waive Fine or Fee Due" /><View style={styles.options}>{access.canWaiveFine ? <><AppChoiceChip onPress={() => setMode('PARTIAL_FINE')} label="Partial Fine"
            selected={mode === 'PARTIAL_FINE'} /><AppChoiceChip onPress={() => setMode('FULL_FINE')} label="Full Fine"
            selected={mode === 'FULL_FINE'} /></> : null}{access.canWaiveDue ? <AppChoiceChip onPress={() => setMode('FULL_DUE')} label="Full Fee Due"
            selected={mode === 'FULL_DUE'} /> : null}</View>{mode === 'PARTIAL_FINE' ? <AppInput keyboardType="decimal-pad" label="Waiver Amount (rupees)" onChangeText={setAmount} value={amount} /> : null}<AppInput label="Authorization Reason" multiline onChangeText={setReason} required value={reason} />{due ? <AppText>Current Fine ₹{due.fineAmountPaise / 100} · Outstanding ₹{due.outstandingAmountPaise / 100}</AppText> : null}{error ? <InlineError message={error.message} /> : null}<AppButton disabled={!reason.trim()} onPress={() => setConfirming(true)} title="Review Waiver" /></View></AppScreen><ConfirmationDialog loading={loading} message={mode === 'FULL_DUE' ? 'This fully waives the generated Fee Due while preserving every original snapshot value.' : 'This waives Fine only. Base Fee remains unchanged and future refresh respects waiver history.'} onCancel={() => setConfirming(false)} onConfirm={async () => { const ok = mode === 'FULL_DUE' ? await waiveDue(route.params.feeDueId, reason) : await waiveFine(route.params.feeDueId, Math.round((Number(amount) || 0) * 100), reason, mode === 'FULL_FINE'); if (ok) navigation.goBack(); }} title="Confirm authorized waiver?" visible={confirming} /></>;
}
const styles = StyleSheet.create({ maxWidth: { alignSelf: 'center', gap: 16, maxWidth: 680, width: '100%' }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
