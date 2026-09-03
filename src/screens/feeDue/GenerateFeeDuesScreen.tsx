import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppChoiceChip } from '../../components/common/AppChoiceChip';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { InlineError } from '../../components/feedback/InlineError';
import type { FeeGenerationType, PreviewFeeGenerationInput } from '../../models/feeDue';
import { ROUTES } from '../../constants/routes';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore, useFeeDueStore } from '../../store';

const csv = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);

export function GenerateFeeDuesScreen({ navigation, route }: RoleScreenProps<'GenerateFeeDues'>) {
  const draft = useFeeDueStore(state => state.generationDraft);
  const update = useFeeDueStore(state => state.updateGenerationDraft);
  const preview = useFeeDueStore(state => state.previewGeneration);
  const loading = useFeeDueStore(state => state.isPreviewingGeneration);
  const error = useFeeDueStore(state => state.error);
  const actor = useAuthStore(state => state.activeMembership);
  const [validation, setValidation] = useState('');
  const input: PreviewFeeGenerationInput = {
    ...draft.input,
    academicSessionId: route.params.academicSessionId,
    branchId: route.params.branchId,
    requestedByUserId: actor?.userId ?? '',
    schoolId: route.params.schoolId,
  };
  const setInput = (value: PreviewFeeGenerationInput) => update({ input: value });
  function next() {
    if (draft.step === 1 && input.generationType !== 'FULL_SESSION' && !input.requestedPeriodKeys.length) return setValidation('Select at least one stable period key.');
    if (draft.step === 2 && input.generationType === 'CLASS' && !input.classIds.length) return setValidation('Select at least one Class ID.');
    if (draft.step === 2 && ['SECTION'].includes(input.generationType) && !input.sectionIds.length) return setValidation('Select at least one Section ID.');
    if (draft.step === 2 && ['SELECTED_STUDENTS', 'INDIVIDUAL_STUDENT'].includes(input.generationType) && !input.studentIds.length) return setValidation('Select Student IDs.');
    if (draft.step === 3 && input.feeScope === 'SELECTED' && !input.feeHeadIds.length) return setValidation('Select Fee Head IDs.');
    setValidation('');
    update({ step: Math.min(4, draft.step + 1) as FeeDueGenerationStep });
  }
  type FeeDueGenerationStep = 1 | 2 | 3 | 4 | 5;
  return (
    <AppScreen scrollable testID="generate-fee-dues-screen"><View style={styles.maxWidth}>
      <AppHeader includeSafeArea={false} onBackPress={navigation.goBack} subtitle="Preview is mutation-free; commit is separately confirmed" title="Generate Fee Dues" />
      <View style={styles.options}>{['Context & Period', 'Student Scope', 'Fee Scope', 'Preview', 'Confirm'].map((label, index) => <AppBadge key={label} label={`${index + 1}. ${label}`} status={index + 1 <= draft.step ? 'active' : 'draft'} />)}</View>
      {draft.step === 1 ? <View style={styles.fields}>
        <AppText variant="title">Generation Mode</AppText>
        <View style={styles.options}>{(['BRANCH', 'CLASS', 'SECTION', 'SELECTED_STUDENTS', 'INDIVIDUAL_STUDENT', 'ONE_TIME_FEE', 'FULL_SESSION'] as FeeGenerationType[]).map(type => <AppChoiceChip key={type} onPress={() => setInput({ ...input, generationType: type })} label={type.replaceAll('_', ' ')}
            selected={input.generationType === type} />)}</View>
        <AppInput helperText="Examples: 2026-07, 2026-27-Q1. Blank only for full session." label="Period Keys" onChangeText={text => setInput({ ...input, requestedPeriodKeys: csv(text) })} value={input.requestedPeriodKeys.join(',')} />
        <AppInput helperText="YYYY-MM-DD" label="As-of Date" onChangeText={asOfDate => setInput({ ...input, asOfDate })} value={input.asOfDate} />
        <AppChoiceChip onPress={() => setInput({ ...input, includePreviousEligiblePeriods: !input.includePreviousEligiblePeriods })} label="Include Previous Eligible Periods"
          selected={input.includePreviousEligiblePeriods} />
      </View> : draft.step === 2 ? <View style={styles.fields}>
        <AppInput label="Class IDs" onChangeText={text => setInput({ ...input, classIds: csv(text) })} value={input.classIds.join(',')} />
        <AppInput label="Section IDs" onChangeText={text => setInput({ ...input, sectionIds: csv(text) })} value={input.sectionIds.join(',')} />
        <AppInput label="Student IDs" onChangeText={text => setInput({ ...input, studentIds: csv(text) })} value={input.studentIds.join(',')} />
      </View> : draft.step === 3 ? <View style={styles.fields}>
        <AppText variant="title">Fee Scope</AppText>
        <View style={styles.options}>{(['ALL', 'RECURRING', 'ONE_TIME', 'SELECTED'] as const).map(scope => <AppChoiceChip key={scope} onPress={() => setInput({ ...input, feeScope: scope })} label={scope.replace('_', ' ')}
            selected={input.feeScope === scope} />)}</View>
        {input.feeScope === 'SELECTED' ? <AppInput label="Fee Head IDs" onChangeText={text => setInput({ ...input, feeHeadIds: csv(text) })} value={input.feeHeadIds.join(',')} /> : null}
      </View> : <View style={styles.fields}>
        <AppText variant="heading3">Ready for Mutation-Free Preview</AppText>
        <AppText>{input.generationType.replaceAll('_', ' ')} · {input.requestedPeriodKeys.join(', ') || 'Full session'}</AppText>
        <AppText>{input.classIds.length} classes · {input.sectionIds.length} sections · {input.studentIds.length} selected students</AppText>
        <AppButton loading={loading} onPress={async () => { if (await preview(input)) navigation.navigate(ROUTES.FEE_GENERATION_PREVIEW, route.params); }} title="Create Generation Preview" />
      </View>}
      {validation ? <InlineError message={validation} /> : null}
      {error ? <InlineError message={error.message} /> : null}
      {draft.step < 4 ? <AppButton onPress={next} style={styles.next} title="Continue" /> : null}
    </View></AppScreen>
  );
}

const styles = StyleSheet.create({
  fields: { gap: 14, marginTop: 18 },
  maxWidth: { alignSelf: 'center', maxWidth: 780, width: '100%' },
  next: { marginTop: 18 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
