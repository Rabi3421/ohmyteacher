import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type {
  AssessmentComponent,
  Exam,
  ExamClassConfiguration,
  ExamSetupIssue,
  ExamSetupValidationResult,
  ExamSubjectPaper,
  ExamTerm,
  ExamType,
  GradeBand,
  GradingScheme,
} from '../../models/examination';
import { calculateScheduleEndTime } from '../../utils/examSchedule';
import { AppBadge, type BadgeStatus } from '../common/AppBadge';
import { AppButton } from '../common/AppButton';
import { AppCard } from '../common/AppCard';
import { AppInput } from '../common/AppInput';
import { AppText } from '../common/AppText';

function status(value: string): BadgeStatus {
  if (value === 'ACTIVE' || value === 'SCHEDULED') return 'active';
  if (value === 'INACTIVE') return 'inactive';
  if (value === 'CANCELLED') return 'cancelled';
  if (value === 'COMPLETED') return 'completed';
  return 'draft';
}

export function ExaminationContextBar({
  school,
  branch,
  session,
  readOnly,
}: {
  school: string;
  branch: string;
  session: string;
  readOnly?: boolean;
}) {
  return (
    <AppCard testID="examination-context-bar" variant="outlined">
      <AppText variant="label">{school}</AppText>
      <AppText>
        {branch} · {session}
      </AppText>
      {readOnly ? (
        <AppBadge label="Closed · Read only" status="inactive" />
      ) : null}
    </AppCard>
  );
}

export function ExamStatusBadge({ value }: { value: Exam['status'] }) {
  return <AppBadge label={value.replaceAll('_', ' ')} status={status(value)} />;
}

export function ExamSetupCompletionCard({
  value,
}: {
  value: ExamSetupValidationResult;
}) {
  return (
    <AppCard testID="exam-setup-completion-card" variant="outlined">
      <AppText variant="heading3">
        Setup {value.completionPercent}% complete
      </AppText>
      <AppBadge
        label={
          value.isComplete
            ? 'Ready to schedule'
            : `${value.blockers.length} blockers`
        }
        status={value.isComplete ? 'active' : 'draft'}
      />
      <AppText>{value.warnings.length} warnings</AppText>
    </AppCard>
  );
}

export function ExamSetupIssueList({
  issues,
  emptyLabel = 'No setup issues.',
}: {
  issues: readonly ExamSetupIssue[];
  emptyLabel?: string;
}) {
  if (!issues.length) return <AppText>{emptyLabel}</AppText>;
  return (
    <View style={styles.list}>
      {issues.map((issue, index) => (
        <AppCard key={`${issue.code}-${index}`} variant="outlined">
          <AppBadge
            label={issue.severity}
            status={issue.severity === 'BLOCKER' ? 'cancelled' : 'draft'}
          />
          <AppText>{issue.message}</AppText>
        </AppCard>
      ))}
    </View>
  );
}

function SelectCard({
  children,
  onPress,
  testID,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      testID={testID}
    >
      <AppCard variant="outlined">{children}</AppCard>
    </Pressable>
  );
}

export function ExamTermCard({
  item,
  onPress,
}: {
  item: ExamTerm;
  onPress?: () => void;
}) {
  return (
    <SelectCard onPress={onPress} testID={`exam-term-${item.id}`}>
      <View style={styles.row}>
        <AppText variant="heading3">{item.name}</AppText>
        <AppBadge status={status(item.status)} />
      </View>
      <AppText>
        {item.code} · {item.startDate} to {item.endDate}
      </AppText>
      <AppText>{item.activeExamCount} active exams</AppText>
    </SelectCard>
  );
}
export function ExamTypeCard({
  item,
  onPress,
}: {
  item: ExamType;
  onPress?: () => void;
}) {
  return (
    <SelectCard onPress={onPress} testID={`exam-type-${item.id}`}>
      <View style={styles.row}>
        <AppText variant="heading3">{item.name}</AppText>
        <AppBadge status={status(item.status)} />
      </View>
      <AppText>
        {item.code} · Weightage {item.defaultWeightagePercent ?? '—'}%
      </AppText>
    </SelectCard>
  );
}
export function GradingSchemeCard({
  item,
  onPress,
}: {
  item: GradingScheme;
  onPress?: () => void;
}) {
  return (
    <SelectCard onPress={onPress} testID={`grading-scheme-${item.id}`}>
      <View style={styles.row}>
        <AppText variant="heading3">{item.name}</AppText>
        <AppBadge status={status(item.status)} />
      </View>
      <AppText>
        {item.code} · {item.bands.length} bands
        {item.isDefault ? ' · Default' : ''}
      </AppText>
    </SelectCard>
  );
}
export function ExamCard({
  item,
  onPress,
}: {
  item: Exam;
  onPress?: () => void;
}) {
  return (
    <SelectCard onPress={onPress} testID={`exam-${item.id}`}>
      <View style={styles.row}>
        <AppText variant="heading3">{item.name}</AppText>
        <ExamStatusBadge value={item.status} />
      </View>
      <AppText>
        {item.code} · {item.termName} · {item.examTypeName}
      </AppText>
      <AppText>
        {item.startDate} to {item.endDate}
      </AppText>
      <AppText>
        {item.classConfigurationCount} classes · {item.subjectPaperCount} papers
        · {item.setupCompletionPercent}%
      </AppText>
    </SelectCard>
  );
}

export function GradeBandEditor({
  bands,
  disabled,
  onChange,
}: {
  bands: Array<Omit<GradeBand, 'id'> & { id?: string }>;
  disabled?: boolean;
  onChange: (bands: Array<Omit<GradeBand, 'id'> & { id?: string }>) => void;
}) {
  return (
    <View style={styles.list} testID="grade-band-editor">
      <AppText variant="heading3">Grade Bands</AppText>
      {bands.map((band, index) => (
        <AppCard key={band.id ?? index} variant="outlined">
          <AppInput
            disabled={disabled}
            label="Grade"
            onChangeText={grade =>
              onChange(
                bands.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, grade } : item,
                ),
              )
            }
            value={band.grade}
          />
          <AppText>
            {band.minimumPercentage}% – {band.maximumPercentage}% ·{' '}
            {band.isPassing ? 'Passing' : 'Failing'}
          </AppText>
        </AppCard>
      ))}
      <AppButton
        disabled={disabled}
        onPress={() =>
          onChange([
            ...bands,
            {
              displayOrder: bands.length + 1,
              grade: '',
              isPassing: true,
              maximumPercentage: 100,
              minimumPercentage: 0,
            },
          ])
        }
        title="Add Grade Band"
        variant="outline"
      />
    </View>
  );
}

export function ExamClassConfigurationCard({
  item,
  onPress,
}: {
  item: ExamClassConfiguration;
  onPress?: () => void;
}) {
  return (
    <SelectCard onPress={onPress}>
      <AppText variant="heading3">{item.classNameSnapshot}</AppText>
      <AppText>
        {item.sectionSnapshots.map(section => section.name).join(', ')}
      </AppText>
      <AppText>
        {item.gradingSchemeNameSnapshot} · {item.subjectPaperCount} papers ·{' '}
        {item.totalMaximumMarks} marks
      </AppText>
    </SelectCard>
  );
}
export function SubjectPaperCard({
  item,
  onPress,
}: {
  item: ExamSubjectPaper;
  onPress?: () => void;
}) {
  return (
    <SelectCard onPress={onPress}>
      <View style={styles.row}>
        <AppText variant="heading3">{item.subjectNameSnapshot}</AppText>
        <AppBadge status={status(item.status)} />
      </View>
      <AppText>
        {item.totalMaximumMarks} maximum · {item.totalPassMarks} pass
      </AppText>
      <AppText>
        {item.components
          .map(component => `${component.name} ${component.maximumMarks}`)
          .join(' · ')}
      </AppText>
    </SelectCard>
  );
}
export function AssessmentComponentEditor({
  components,
  disabled,
  onChange,
}: {
  components: Array<Omit<AssessmentComponent, 'id'> & { id?: string }>;
  disabled?: boolean;
  onChange: (
    components: Array<Omit<AssessmentComponent, 'id'> & { id?: string }>,
  ) => void;
}) {
  return (
    <View style={styles.list} testID="assessment-component-editor">
      <AppText variant="heading3">Assessment Components</AppText>
      {components.map((component, index) => (
        <AppCard key={component.id ?? index} variant="outlined">
          <AppInput
            disabled={disabled}
            label="Component name"
            onChangeText={name =>
              onChange(
                components.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, name } : item,
                ),
              )
            }
            value={component.name}
          />
          <AppText>
            {component.type} · {component.maximumMarks} maximum ·{' '}
            {component.passMarks ?? 0} pass
          </AppText>
        </AppCard>
      ))}
    </View>
  );
}
export function ExamScheduleItem({ item }: { item: ExamSubjectPaper }) {
  return (
    <AppCard variant="outlined">
      <AppText variant="heading3">{item.subjectNameSnapshot}</AppText>
      <AppText>
        {item.examDate ?? 'Date missing'} · {item.startTime ?? 'Time missing'}–
        {item.startTime && item.durationMinutes
          ? calculateScheduleEndTime(item.startTime, item.durationMinutes)
          : '—'}
      </AppText>
      <AppText>
        {item.durationMinutes ?? '—'} minutes · Room{' '}
        {item.room ?? 'not assigned'}
      </AppText>
    </AppCard>
  );
}
export function ScheduleConflictCard({ issue }: { issue: ExamSetupIssue }) {
  return (
    <AppCard variant="outlined">
      <AppBadge
        label={issue.code.replaceAll('_', ' ')}
        status={issue.severity === 'BLOCKER' ? 'cancelled' : 'draft'}
      />
      <AppText>{issue.message}</AppText>
    </AppCard>
  );
}
export function ExamSetupSummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <AppCard style={styles.metric} variant="outlined">
      <AppText variant="heading2">{value}</AppText>
      <AppText>{label}</AppText>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  metric: { minWidth: 140 },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
});
