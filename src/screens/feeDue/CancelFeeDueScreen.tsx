import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '../../components/common/AppButton';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { InlineError } from '../../components/feedback/InlineError';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeDueStore } from '../../store';

export function CancelFeeDueScreen({ navigation, route }: RoleScreenProps<'CancelFeeDue'>) {
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const cancel = useFeeDueStore(state => state.cancelDue);
  const loading = useFeeDueStore(state => state.isCancellingFeeDue);
  const error = useFeeDueStore(state => state.error);
  return <><AppScreen testID="cancel-fee-due-screen"><View style={styles.maxWidth}><AppHeader includeSafeArea={false} onBackPress={navigation.goBack} subtitle="Cancellation preserves snapshots and audit history" title="Cancel Fee Due" /><AppInput label="Cancellation Reason" multiline onChangeText={setReason} required value={reason} />{error ? <InlineError message={error.message} /> : null}<AppButton disabled={!reason.trim()} onPress={() => setConfirming(true)} title="Review Cancellation" variant="danger" /></View></AppScreen><ConfirmationDialog destructive loading={loading} message="Outstanding becomes zero. The Fee Due and Generation Run link remain available and no automatic regeneration occurs." onCancel={() => setConfirming(false)} onConfirm={async () => { if (await cancel(route.params.feeDueId, reason)) navigation.goBack(); }} title="Cancel this Fee Due?" visible={confirming} /></>;
}
const styles = StyleSheet.create({ maxWidth: { alignSelf: 'center', gap: 16, maxWidth: 680, width: '100%' } });
