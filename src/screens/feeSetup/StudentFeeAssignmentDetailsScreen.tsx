import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { LoadingView } from '../../components/feedback/LoadingView';
import { EffectiveFeePreviewCard } from '../../components/feeSetup/FeeComponents';
import { ROUTES } from '../../constants/routes';
import { useFeeSetupAccess } from '../../hooks/useFeeSetupAccess';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeSetupStore } from '../../store';
export function StudentFeeAssignmentDetailsScreen({ navigation, route }: RoleScreenProps<'StudentFeeAssignmentDetails'>) {
  const current = useFeeSetupStore(state => state.currentAssignment);
  const load = useFeeSetupStore(state => state.loadAssignment);
  const access = useFeeSetupAccess(route.params.schoolId, route.params.branchId);
  useEffect(() => { load(route.params.studentId, route.params.enrollmentId).catch(() => undefined); }, [load, route.params.enrollmentId, route.params.studentId]);
  const details = current?.summary.enrollmentId === route.params.enrollmentId ? current : null;
  return <AppScreen scrollable testID="student-fee-assignment-details-screen"><View style={styles.maxWidth}><AppHeader includeSafeArea={false} onBackPress={navigation.goBack} title="Student Fee Assignment" />{!details ? <LoadingView message="Loading assignment…" /> : <View style={styles.sections}>
    <AppCard variant="elevated"><View style={styles.row}><View style={styles.copy}><AppText variant="heading2">{details.summary.studentName}</AppText><AppText>{details.summary.admissionNumber} · {details.summary.className} · {details.summary.sectionName}</AppText></View><AppBadge label={details.summary.assignmentStatus} status={details.assignment ? 'active' : 'inactive'} /></View><AppText>{details.summary.feeStructureName ?? 'Default structure not assigned'}</AppText></AppCard>
    {details.assignment ? <AppCard variant="outlined"><AppText variant="title">Configuration</AppText><AppText>{details.assignment.optionalItemSelections.filter(item => item.selected).length} optional items selected</AppText><AppText>{details.assignment.amountOverrides.length} amount overrides</AppText><AppText>{details.assignment.discountAssignments.length} discounts</AppText><AppText>{details.assignment.amountOverrideHistory?.length ?? 0} historical overrides preserved</AppText><AppText>{details.assignment.discountAssignmentHistory?.length ?? 0} historical discount assignments preserved</AppText></AppCard> : null}
    {details.preview ? <EffectiveFeePreviewCard preview={details.preview} /> : null}
    <View style={styles.actions}>{access.canManageAssignments ? <AppButton onPress={() => navigation.navigate(ROUTES.EDIT_STUDENT_FEE_ASSIGNMENT, route.params)} title={details.assignment ? 'Edit Assignment' : 'Create Assignment'} /> : null}<AppButton onPress={() => navigation.navigate(ROUTES.STUDENT_PAYABLE_PREVIEW, route.params)} title="Payable Preview" variant="outline" /></View>
  </View>}</View></AppScreen>;
}
const styles = StyleSheet.create({ actions: { flexDirection: 'row', gap: 8 }, copy: { flex: 1 }, maxWidth: { alignSelf: 'center', maxWidth: 740, width: '100%' }, row: { alignItems: 'center', flexDirection: 'row', gap: 10 }, sections: { gap: 14 } });
