import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { FeeStructureItemEditor } from '../../components/feeSetup/FeeFormFields';
import { FeeContextBar } from '../../components/feeSetup/FeeComponents';
import type { FeeStructureItemInput } from '../../models/fee';
import type { RoleStackParamList } from '../../navigation/navigationTypes';
import { useFeeSetupStore, useOrganizationStore } from '../../store';
import { formatCurrency } from '../../utils/currency';
import {
  getAcademicSessionMonths,
  validateFeeStructure,
  type FeeFormErrors,
} from '../../utils/feeValidation';

export function FeeStructureFormScreen({
  navigation,
  editingId,
}: {
  navigation: NativeStackNavigationProp<RoleStackParamList>;
  editingId?: string;
}) {
  const draft = useFeeSetupStore(state => state.structureDraft);
  const heads = useFeeSetupStore(state => state.feeHeads.items);
  const fineRules = useFeeSetupStore(state => state.fineRules.items);
  const context = useFeeSetupStore(state => state.context);
  const sessions = useOrganizationStore(state => state.academicSessions);
  const branches = useOrganizationStore(state => state.branches.items);
  const school = useOrganizationStore(state => state.currentSchool);
  const current = useFeeSetupStore(state => state.currentFeeStructure);
  const updateDraft = useFeeSetupStore(state => state.updateStructureDraft);
  const loadHeads = useFeeSetupStore(state => state.loadFeeHeads);
  const loadStructure = useFeeSetupStore(state => state.loadStructure);
  const loadFineRules = useFeeSetupStore(state => state.loadFineRules);
  const save = useFeeSetupStore(state => state.saveStructure);
  const saving = useFeeSetupStore(state => state.isSavingStructure);
  const error = useFeeSetupStore(state => state.error);
  const [errors, setErrors] = useState<FeeFormErrors>({});
  const [initialized, setInitialized] = useState(!editingId);

  useEffect(() => {
    loadHeads().catch(() => undefined);
    loadFineRules().catch(() => undefined);
  }, [loadFineRules, loadHeads]);
  useEffect(() => {
    if (!editingId || initialized) return;
    if (current?.id !== editingId) {
      loadStructure(editingId).catch(() => undefined);
      return;
    }
    updateDraft({
      input: {
        classId: current.classId,
        description: current.description,
        effectiveFrom: current.effectiveFrom,
        items: current.items.map(({ id: _id, feeStructureId: _structure, feeHeadName: _head, ...item }) => item),
        name: current.name,
        status: current.status === 'INACTIVE' ? 'DRAFT' : current.status,
      },
      step: 1,
    });
    setInitialized(true);
  }, [current, editingId, initialized, loadStructure, updateDraft]);

  if (!initialized) return <AppScreen testID="fee-structure-form-screen"><LoadingView message="Loading Fee Structure…" /></AppScreen>;
  const activeHeads = heads.filter(item => item.status === 'ACTIVE');
  const selectedSession = sessions.find(
    session => session.id === context?.academicSessionId,
  );
  const selectedBranch = branches.find(branch => branch.id === context?.branchId);
  const sessionMonths = selectedSession
    ? getAcademicSessionMonths(selectedSession.startDate, selectedSession.endDate)
    : [];
  const total = draft.input.items.reduce((sum, item) => sum + item.amount, 0);
  const setInput = (input: typeof draft.input) => updateDraft({ input });
  function addHead(headId: string) {
    const head = activeHeads.find(item => item.id === headId);
    if (!head || draft.input.items.some(item => item.feeHeadId === headId)) return;
    const item: FeeStructureItemInput = {
      amount: 0,
      applicability: head.mandatoryByDefault ? 'ALL_STUDENTS' : 'OPTIONAL_SELECTION',
      applicableMonths:
        head.defaultFrequency === 'MONTHLY' ? sessionMonths : undefined,
      installmentCount:
        head.defaultFrequency === 'QUARTERLY'
          ? 4
          : head.defaultFrequency === 'HALF_YEARLY'
            ? 2
            : head.defaultFrequency === 'YEARLY'
              ? 1
              : undefined,
      displayOrder: draft.input.items.length + 1,
      dueRule: head.type === 'ONE_TIME' ? { date: draft.input.effectiveFrom, type: 'FIXED_DATE' } : { day: 10, type: 'FIXED_DAY_OF_PERIOD' },
      feeHeadId: head.id,
      frequency: head.defaultFrequency,
      mandatory: head.mandatoryByDefault,
      status: 'ACTIVE',
    };
    setInput({ ...draft.input, items: [...draft.input.items, item] });
  }
  function next() {
    const nextErrors = validateFeeStructure(draft.input, heads);
    setErrors(nextErrors);
    if (draft.step === 1 && (nextErrors.name || nextErrors.classId || nextErrors.effectiveFrom)) return;
    if (draft.step >= 2 && Object.keys(nextErrors).length) return;
    updateDraft({ step: Math.min(4, draft.step + 1) as typeof draft.step });
  }
  return (
    <AppScreen scrollable testID={editingId ? 'edit-fee-structure-screen' : 'create-fee-structure-screen'}>
      <View style={styles.maxWidth}>
        <AppHeader includeSafeArea={false} onBackPress={() => draft.step > 1 ? updateDraft({ step: (draft.step - 1) as typeof draft.step }) : navigation.goBack()} subtitle="Controlled 4-step configuration" title={editingId ? 'Edit Fee Structure' : 'Create Fee Structure'} />
        <View style={styles.steps}>{['Context','Items','Due Rules','Review'].map((label,index) => <AppBadge key={label} label={`${index+1}. ${label}`} status={index + 1 <= draft.step ? 'active' : 'draft'} />)}</View>
        {draft.step === 1 ? <View style={styles.fields}>
          <FeeContextBar
            branch={selectedBranch?.name ?? context?.branchId ?? 'Select branch'}
            closed={selectedSession?.status === 'CLOSED'}
            school={school?.name ?? context?.schoolId ?? 'Select school'}
            session={selectedSession?.name ?? context?.academicSessionId ?? 'Select session'}
          />
          <AppInput error={errors.name} label="Structure Name" onChangeText={name => setInput({ ...draft.input, name })} value={draft.input.name} />
          <AppInput error={errors.classId} label="Class ID" onChangeText={classId => setInput({ ...draft.input, classId })} value={draft.input.classId} />
          <AppInput error={errors.effectiveFrom} helperText="YYYY-MM-DD" label="Effective From" onChangeText={effectiveFrom => setInput({ ...draft.input, effectiveFrom })} value={draft.input.effectiveFrom} />
          <AppInput label="Description" multiline onChangeText={description => setInput({ ...draft.input, description })} value={draft.input.description ?? ''} />
          <View style={styles.options}>{(['DRAFT','ACTIVE'] as const).map(status => <AppButton key={status} onPress={() => setInput({ ...draft.input, status })} title={status} variant={draft.input.status === status ? 'primary' : 'outline'} />)}</View>
        </View> : draft.step === 2 ? <View style={styles.fields}>
          <AppText variant="heading3">Add Active Fee Heads</AppText>
          <View style={styles.options}>{activeHeads.map(head => <AppButton disabled={draft.input.items.some(item => item.feeHeadId === head.id)} key={head.id} onPress={() => addHead(head.id)} title={head.name} variant="outline" />)}</View>
          {draft.input.items.map((item,index) => {
            const head = heads.find(candidate => candidate.id === item.feeHeadId);
            return head ? <AppCard key={item.feeHeadId} variant="outlined"><FeeStructureItemEditor fineRules={fineRules} head={head} item={item} onChange={updated => setInput({ ...draft.input, items: draft.input.items.map((candidate,i) => i === index ? updated : candidate) })} onRemove={() => setInput({ ...draft.input, items: draft.input.items.filter((_,i) => i !== index) })} /></AppCard> : null;
          })}
          {errors.items ? <InlineError message={errors.items} /> : null}
        </View> : draft.step === 3 ? <View style={styles.fields}>
          <AppText variant="heading3">Due Rules & Academic Months</AppText>
          <AppText>Review each item’s fixed day or fixed date. Monthly month numbers must follow the selected academic session order.</AppText>
          {draft.input.items.map(item => <AppCard key={item.feeHeadId} variant="outlined"><AppText variant="title">{heads.find(head => head.id === item.feeHeadId)?.name}</AppText><AppText>{item.dueRule.type === 'FIXED_DATE' ? `Due ${item.dueRule.date}` : `Due day ${item.dueRule.day}`}</AppText><AppText>{item.applicableMonths?.join(' → ') ?? `${item.installmentCount ?? 1} installment`}</AppText></AppCard>)}
        </View> : <View style={styles.fields}>
          <AppText variant="heading3">Review & Save</AppText>
          <AppCard variant="elevated"><AppText variant="title">{draft.input.name}</AppText><AppText>Class: {draft.input.classId}</AppText><AppText>Effective: {draft.input.effectiveFrom}</AppText><AppText>{draft.input.items.length} Fee Items · {formatCurrency(total)} nominal</AppText><AppText>{draft.input.items.filter(item => !item.mandatory).length} optional · {draft.input.items.filter(item => item.frequency === 'ONE_TIME').length} one-time</AppText></AppCard>
        </View>}
        {error ? <InlineError message={error.message} /> : null}
        {draft.step < 4 ? <AppButton onPress={next} style={styles.next} title="Continue" /> : <AppButton loading={saving} onPress={async () => { const result = await save(editingId); if (result) navigation.goBack(); }} style={styles.next} title="Save Fee Structure" />}
      </View>
    </AppScreen>
  );
}
const styles = StyleSheet.create({ fields: { gap: 14 }, maxWidth: { alignSelf: 'center', maxWidth: 760, width: '100%' }, next: { marginTop: 20 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 } });
