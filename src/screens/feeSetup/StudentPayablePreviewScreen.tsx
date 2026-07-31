import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { LoadingView } from '../../components/feedback/LoadingView';
import { EffectiveFeePreviewCard } from '../../components/feeSetup/FeeComponents';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeSetupStore } from '../../store';
export function StudentPayablePreviewScreen({ navigation, route }: RoleScreenProps<'StudentPayablePreview'>) {
  const current = useFeeSetupStore(state => state.currentAssignment);
  const load = useFeeSetupStore(state => state.loadAssignment);
  useEffect(() => { if (current?.summary.enrollmentId !== route.params.enrollmentId) load(route.params.studentId, route.params.enrollmentId).catch(() => undefined); }, [current?.summary.enrollmentId, load, route.params.enrollmentId, route.params.studentId]);
  return <AppScreen scrollable testID="student-payable-preview-screen"><View style={styles.maxWidth}><AppHeader includeSafeArea={false} onBackPress={navigation.goBack} subtitle={current?.summary.studentName} title="Estimated Fee Configuration" /><AppText style={styles.notice}>This preview is not a due, balance, fine, payment, receipt, or ledger.</AppText>{current?.preview ? <EffectiveFeePreviewCard preview={current.preview} /> : <LoadingView message="Preparing Student payable preview…" />}</View></AppScreen>;
}
const styles = StyleSheet.create({ maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' }, notice: { marginBottom: 14 } });
