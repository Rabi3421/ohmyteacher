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
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useFeeSetupAccess } from '../../hooks/useFeeSetupAccess';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useFeeSetupStore } from '../../store';
import { formatCurrency } from '../../utils/currency';

export function FeeStructureDetailsScreen({ navigation, route }: RoleScreenProps<'FeeStructureDetails'>) {
  const current = useFeeSetupStore(state => state.currentFeeStructure);
  const load = useFeeSetupStore(state => state.loadStructure);
  const fineRules = useFeeSetupStore(state => state.fineRules.items);
  const loadFineRules = useFeeSetupStore(state => state.loadFineRules);
  const copy = useFeeSetupStore(state => state.copyStructure);
  const updateStatus = useFeeSetupStore(state => state.updateStructureStatus);
  const error = useFeeSetupStore(state => state.error);
  const saving = useFeeSetupStore(state => state.isSavingStructure || state.isCopyingStructure);
  const access = useFeeSetupAccess(route.params.schoolId, route.params.branchId);
  const [pending, setPending] = useState<'ACTIVATE' | 'DEACTIVATE' | 'COPY' | null>(null);
  const [copyClassId, setCopyClassId] = useState('');
  const [copyBranchId, setCopyBranchId] = useState(route.params.branchId);
  const [copySessionId, setCopySessionId] = useState(route.params.academicSessionId);
  useEffect(() => {
    load(route.params.feeStructureId).catch(() => undefined);
    loadFineRules().catch(() => undefined);
  }, [load, loadFineRules, route.params.feeStructureId]);
  const item = current?.id === route.params.feeStructureId ? current : null;
  const selectedPeriodTotal = item?.items
    .filter(feeItem => feeItem.status === 'ACTIVE')
    .reduce((sum, feeItem) => {
      const periods =
        feeItem.frequency === 'MONTHLY'
          ? feeItem.applicableMonths?.length ?? 0
          : feeItem.frequency === 'QUARTERLY'
            ? feeItem.installmentCount ?? 4
            : feeItem.frequency === 'HALF_YEARLY'
              ? feeItem.installmentCount ?? 2
              : feeItem.installmentCount ?? 1;
      return sum + feeItem.amount * periods;
    }, 0) ?? 0;
  return (
    <>
      <AppScreen scrollable testID="fee-structure-details-screen"><View style={styles.maxWidth}>
        <AppHeader includeSafeArea={false} onBackPress={navigation.goBack} title="Fee Structure Details" />
        {!item ? <LoadingView message="Loading Fee Structure…" /> : <View style={styles.sections}>
          <AppCard variant="elevated"><View style={styles.row}><View style={styles.copy}><AppText variant="heading2">{item.name}</AppText><AppText>{item.branchName} · {item.academicSessionName} · {item.className}</AppText></View><AppBadge label={item.status} status={item.status === 'ACTIVE' ? 'active' : item.status === 'DRAFT' ? 'draft' : 'inactive'} /></View><AppText>Effective {item.effectiveFrom} · {item.assignedStudentCount} assigned students</AppText></AppCard>
          <AppText variant="heading3">Fee Items</AppText>
          {item.items.map(feeItem => <AppCard key={feeItem.id} variant="outlined"><View style={styles.row}><View style={styles.copy}><AppText variant="title">{feeItem.feeHeadName}</AppText><AppText>{formatCurrency(feeItem.amount)} · {feeItem.frequency.replace('_',' ')}</AppText><AppText variant="caption">{feeItem.applicability.replace('_',' ')} · {feeItem.mandatory ? 'Mandatory' : 'Optional'}</AppText><AppText variant="caption">{feeItem.dueRule.type === 'FIXED_DATE' ? `Due ${feeItem.dueRule.date}` : `Due day ${feeItem.dueRule.day}`}{feeItem.fineRuleId ? ` · Fine Rule ${fineRules.find(rule => rule.id === feeItem.fineRuleId)?.name ?? feeItem.fineRuleId}` : ''}</AppText></View><AppBadge label={feeItem.status} status={feeItem.status === 'ACTIVE' ? 'active' : 'inactive'} /></View></AppCard>)}
          <AppCard variant="outlined"><AppText variant="title">Summary</AppText><AppText>Nominal item total: {formatCurrency(item.totalNominalAmount)}</AppText><AppText>Nominal monthly amount: {formatCurrency(item.items.filter(x => x.frequency === 'MONTHLY').reduce((s,x) => s+x.amount,0))}</AppText><AppText>One-time amount: {formatCurrency(item.items.filter(x => x.frequency === 'ONE_TIME').reduce((s,x) => s+x.amount,0))}</AppText><AppText>Optional amount: {formatCurrency(item.items.filter(x => !x.mandatory).reduce((s,x) => s+x.amount,0))}</AppText><AppText>Total selected-period amount: {formatCurrency(selectedPeriodTotal)}</AppText><AppText>Assigned students: {item.assignedStudentCount}</AppText></AppCard>
          <View style={styles.actions}>
            <AppButton onPress={() => navigation.navigate(ROUTES.FEE_STRUCTURE_PREVIEW, route.params)} title="Preview" variant="outline" />
            <AppButton onPress={() => navigation.navigate(ROUTES.STUDENT_FEE_ASSIGNMENTS, { ...route.params, classId: item.classId, feeStructureId: item.id })} title="Student Assignments" variant="outline" />
            {access.canManageStructures ? <>
              <AppButton onPress={() => navigation.navigate(ROUTES.EDIT_FEE_STRUCTURE, route.params)} title="Edit" variant="outline" />
              <AppButton onPress={() => setPending('COPY')} title="Copy" variant="outline" />
              {item.status === 'DRAFT' ? <AppButton onPress={() => setPending('ACTIVATE')} title="Activate" /> : item.status === 'ACTIVE' ? <AppButton onPress={() => setPending('DEACTIVATE')} title="Deactivate" variant="danger" /> : null}
            </> : null}
          </View>
          {pending === 'COPY' ? <AppCard variant="outlined"><AppText variant="title">Copy Fee Structure</AppText><AppInput label="Target Branch ID" onChangeText={setCopyBranchId} value={copyBranchId} /><AppInput label="Target Academic Session ID" onChangeText={setCopySessionId} value={copySessionId} /><AppInput label="Target Class ID" onChangeText={setCopyClassId} value={copyClassId} /><AppButton loading={saving} onPress={async () => { const result = await copy({ effectiveFrom: item.effectiveFrom, name: `${item.name} Copy`, sourceFeeStructureId: item.id, targetAcademicSessionId: copySessionId, targetBranchId: copyBranchId, targetClassId: copyClassId }); if (result) setPending(null); }} title="Create Draft Copy" /></AppCard> : null}
          {error ? <InlineError message={error.message} /> : null}
        </View>}
      </View></AppScreen>
      <ConfirmationDialog destructive={pending === 'DEACTIVATE'} loading={saving} message={pending === 'ACTIVATE' ? 'Activation validates every item and explicitly replaces a conflicting active structure for the same period.' : 'Historical structures and assignments remain preserved.'} onCancel={() => setPending(null)} onConfirm={async () => { if (!item || pending === 'COPY') return; const activating = pending === 'ACTIVATE'; const ok = await updateStatus(item.id, activating ? 'ACTIVE' : 'INACTIVE', activating); if (ok) setPending(null); }} title={pending === 'ACTIVATE' ? 'Activate Fee Structure?' : 'Deactivate Fee Structure?'} visible={pending === 'ACTIVATE' || pending === 'DEACTIVATE'} />
    </>
  );
}
const styles = StyleSheet.create({ actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, copy: { flex: 1 }, maxWidth: { alignSelf: 'center', maxWidth: 780, width: '100%' }, row: { alignItems: 'center', flexDirection: 'row', gap: 10 }, sections: { gap: 13 } });
