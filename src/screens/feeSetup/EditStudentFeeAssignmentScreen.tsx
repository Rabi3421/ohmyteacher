import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import type { FeeOverrideType, StudentFeeAmountOverride, StudentFeeItemSelection } from '../../models/fee';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore, useFeeSetupStore } from '../../store';
import { useFeeSetupAccess } from '../../hooks/useFeeSetupAccess';

export function EditStudentFeeAssignmentScreen({ navigation, route }: RoleScreenProps<'EditStudentFeeAssignment'>) {
  const actor = useAuthStore(state => state.activeMembership);
  const current = useFeeSetupStore(state => state.currentAssignment);
  const load = useFeeSetupStore(state => state.loadAssignment);
  const save = useFeeSetupStore(state => state.saveAssignment);
  const saving = useFeeSetupStore(state => state.isSavingStudentAssignment);
  const error = useFeeSetupStore(state => state.error);
  const [structureId, setStructureId] = useState('');
  const [selections, setSelections] = useState<StudentFeeItemSelection[]>([]);
  const [overrides, setOverrides] = useState<StudentFeeAmountOverride[]>([]);
  const [discountIds, setDiscountIds] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [initialized, setInitialized] = useState(false);
  const access = useFeeSetupAccess(route.params.schoolId, route.params.branchId);
  useEffect(() => { if (current?.summary.enrollmentId !== route.params.enrollmentId) load(route.params.studentId, route.params.enrollmentId).catch(() => undefined); else if (!initialized) { setStructureId(current.assignment?.feeStructureId ?? current.feeStructure?.id ?? ''); setSelections(current.assignment?.optionalItemSelections ?? []); setOverrides(current.assignment?.amountOverrides ?? []); setDiscountIds(current.assignment?.discountAssignments.map(item => item.discountDefinitionId) ?? []); setInitialized(true); } }, [current, initialized, load, route.params.enrollmentId, route.params.studentId]);
  if (!initialized || !current) return <AppScreen testID="edit-student-fee-assignment-screen"><LoadingView message="Loading effective configuration…" /></AppScreen>;
  const structure = current.feeStructure;
  function setOverride(itemId: string, type: FeeOverrideType) {
    const existing = overrides.find(item => item.feeStructureItemId === itemId);
    const next: StudentFeeAmountOverride = { createdAt: existing?.createdAt ?? '', customAmount: type === 'CUSTOM_AMOUNT' ? existing?.customAmount ?? 0 : undefined, effectiveFrom: new Date().toISOString().slice(0,10), feeStructureItemId: itemId, id: existing?.id ?? itemId, reason: type === 'DEFAULT_AMOUNT' ? undefined : reason, type };
    setOverrides([...overrides.filter(item => item.feeStructureItemId !== itemId), next]);
  }
  return <AppScreen scrollable testID="edit-student-fee-assignment-screen"><View style={styles.maxWidth}><AppHeader includeSafeArea={false} onBackPress={navigation.goBack} subtitle="Structure amounts remain unchanged" title="Edit Student Fee Assignment" /><AppInput label="Fee Structure ID" onChangeText={setStructureId} value={structureId} />
    <AppInput helperText="Required for custom amounts, exemptions, and reason-required discounts" label="Approval Reason" onChangeText={setReason} value={reason} />
    <View style={styles.sections}>{structure?.items.map(item => {
      const selected = item.mandatory || item.applicability === 'ALL_STUDENTS' || Boolean(selections.find(selection => selection.feeStructureItemId === item.id)?.selected);
      const override = overrides.find(value => value.feeStructureItemId === item.id);
      const overrideTypes: FeeOverrideType[] = [
        'DEFAULT_AMOUNT',
        ...(access.canOverride ? (['CUSTOM_AMOUNT'] as FeeOverrideType[]) : []),
        ...(access.canExempt ? (['EXEMPT'] as FeeOverrideType[]) : []),
      ];
      return <AppCard key={item.id} variant="outlined"><AppText variant="title">{item.feeHeadName}</AppText><AppText>{item.mandatory ? 'Mandatory' : item.applicability.replace('_',' ')}</AppText>{!item.mandatory && item.applicability !== 'ALL_STUDENTS' ? <AppButton onPress={() => setSelections([...selections.filter(value => value.feeStructureItemId !== item.id), { effectiveFrom: new Date().toISOString().slice(0,10), feeStructureItemId: item.id, selected: !selected }])} title={selected ? 'Selected' : 'Not Selected'} variant={selected ? 'primary' : 'outline'} /> : null}<View style={styles.options}>{overrideTypes.map(type => <AppButton key={type} onPress={() => setOverride(item.id,type)} title={type.replace('_',' ')} variant={(override?.type ?? 'DEFAULT_AMOUNT') === type ? 'primary' : 'outline'} />)}</View>{override?.type === 'CUSTOM_AMOUNT' ? <AppInput keyboardType="decimal-pad" label="Custom Amount" onChangeText={text => setOverrides(overrides.map(value => value.feeStructureItemId === item.id ? { ...value, customAmount: Number(text) || 0, reason } : value))} value={String(override.customAmount ?? '')} /> : null}</AppCard>;
    })}</View>
    <AppText style={styles.heading} variant="heading3">Discounts</AppText><View style={styles.options}>{current.availableDiscounts.map(discount => <AppButton key={discount.id} onPress={() => setDiscountIds(discountIds.includes(discount.id) ? discountIds.filter(id => id !== discount.id) : [...discountIds, discount.id])} title={discount.name} variant={discountIds.includes(discount.id) ? 'primary' : 'outline'} />)}</View>
    {error ? <InlineError message={error.message} /> : null}<AppButton loading={saving} onPress={async () => { const ok = await save(route.params.studentId, route.params.enrollmentId, { approvedByUserId: actor?.userId ?? 'current-user', discountAssignments: discountIds.map(id => ({ discountDefinitionId: id, effectiveFrom: new Date().toISOString().slice(0,10), feeHeadIds: [], reason, status: 'ACTIVE' })), effectiveFrom: new Date().toISOString().slice(0,10), feeStructureId: structureId, optionalItemSelections: selections, amountOverrides: overrides.map(({ id: _id, createdAt: _created, ...value }) => ({ ...value, reason: value.type === 'DEFAULT_AMOUNT' ? undefined : reason })) }); if (ok) navigation.goBack(); }} style={styles.save} title="Save Effective Configuration" /></View></AppScreen>;
}
const styles = StyleSheet.create({ heading: { marginTop: 16 }, maxWidth: { alignSelf: 'center', maxWidth: 740, width: '100%' }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, save: { marginTop: 20 }, sections: { gap: 12, marginTop: 14 } });
