import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type {
  MarkSheetStatus,
  OverallResultOutcome,
  RankEntry,
  ResultProcessingSummary,
  StudentPaperMarkInput,
  StudentSubjectResult,
} from '../../models/marksResult';
import { AppBadge, type BadgeStatus } from '../common/AppBadge';
import { AppCard } from '../common/AppCard';
import { AppInput } from '../common/AppInput';
import { AppText } from '../common/AppText';

export function MarksContextBar({
  school,
  branch,
  session,
  exam,
  readOnly,
}: {
  school: string;
  branch: string;
  session: string;
  exam: string;
  readOnly?: boolean;
}) {
  return (
    <AppCard variant="outlined">
      <AppText variant="caption">
        {school} · {branch}
      </AppText>
      <AppText variant="caption">
        {session} · {exam}
      </AppText>
      {readOnly ? <AppBadge label="Read only" status="locked" /> : null}
    </AppCard>
  );
}
export function MarkSheetStatusBadge({ status }: { status: MarkSheetStatus }) {
  const tone: BadgeStatus =
    status === 'LOCKED'
      ? 'locked'
      : status === 'SUBMITTED'
      ? 'completed'
      : status === 'DRAFT'
      ? 'draft'
      : 'inactive';
  return <AppBadge label={status.replaceAll('_', ' ')} status={tone} />;
}
export function ResultOutcomeBadge({
  outcome,
}: {
  outcome: OverallResultOutcome | StudentSubjectResult['outcome'];
}) {
  return (
    <AppBadge
      label={outcome}
      status={
        outcome === 'PASS'
          ? 'passed'
          : outcome === 'FAIL'
          ? 'failed'
          : 'inactive'
      }
    />
  );
}
export function AttendanceStatusSelector({
  value,
  disabled,
  allowExempt = true,
  onChange,
}: {
  value: StudentPaperMarkInput['attendanceStatus'];
  disabled?: boolean;
  allowExempt?: boolean;
  onChange: (value: StudentPaperMarkInput['attendanceStatus']) => void;
}) {
  return (
    <View style={styles.row}>
      {(['PRESENT', 'ABSENT', 'EXEMPT'] as const)
        .filter(item => item !== 'EXEMPT' || allowExempt)
        .map(item => (
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            key={item}
            onPress={() => onChange(item)}
            style={styles.choice}
          >
            <AppBadge
              label={item}
              status={value === item ? 'active' : 'inactive'}
            />
          </Pressable>
        ))}
    </View>
  );
}
export function ComponentMarksInput({
  label,
  maximum,
  value,
  disabled,
  onChange,
}: {
  label: string;
  maximum: number;
  value?: number;
  disabled?: boolean;
  onChange: (value?: number) => void;
}) {
  return (
    <AppInput
      disabled={disabled}
      keyboardType="decimal-pad"
      label={`${label} / ${maximum}`}
      onChangeText={text =>
        onChange(text.trim() === '' ? undefined : Number(text))
      }
      value={value === undefined ? '' : String(value)}
    />
  );
}
export function MarksValidationSummary({
  complete,
  issues,
}: {
  complete: boolean;
  issues: readonly { message: string }[];
}) {
  return (
    <AppCard variant="outlined">
      <AppText variant="subtitle">
        {complete ? 'Marks complete' : 'Marks need attention'}
      </AppText>
      {issues.map((item, index) => (
        <AppText key={`${item.message}-${index}`} variant="caption">
          • {item.message}
        </AppText>
      ))}
    </AppCard>
  );
}
export function MarkSheetProgressCard({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  return (
    <AppCard>
      <AppText variant="subtitle">
        {completed} of {total} students complete
      </AppText>
      <AppText variant="caption">
        {total ? Math.round((completed / total) * 100) : 0}% progress
      </AppText>
    </AppCard>
  );
}
export function StudentMarksEntryCard({
  name,
  admissionNumber,
  children,
}: {
  name: string;
  admissionNumber: string;
  children: React.ReactNode;
}) {
  return (
    <AppCard variant="outlined">
      <AppText variant="subtitle">{name}</AppText>
      <AppText variant="caption">Admission {admissionNumber}</AppText>
      {children}
    </AppCard>
  );
}
export function StudentSubjectResultCard({
  value,
}: {
  value: StudentSubjectResult;
}) {
  return (
    <AppCard variant="outlined">
      <View style={styles.between}>
        <AppText variant="subtitle">{value.subjectNameSnapshot}</AppText>
        <ResultOutcomeBadge outcome={value.outcome} />
      </View>
      <AppText>
        {value.marksObtained ?? '—'} / {value.maximumMarks} ·{' '}
        {value.grade ?? 'No grade'}
      </AppText>
    </AppCard>
  );
}
export function ResultSummaryCard({
  value,
}: {
  value: ResultProcessingSummary;
}) {
  return (
    <AppCard>
      <AppText variant="subtitle">Result readiness</AppText>
      <AppText>
        Locked {value.lockedMarkSheets} · Unlocked {value.unlockedMarkSheets}
      </AppText>
      <AppText>
        Calculated {value.calculatedStudents} · Incomplete{' '}
        {value.incompleteStudents}
      </AppText>
      <AppText>
        Pass {value.passCount} · Fail {value.failCount} · Absent{' '}
        {value.absentCount}
      </AppText>
    </AppCard>
  );
}
export function GradeDistributionCard({
  values,
}: {
  values: Record<string, number>;
}) {
  return (
    <AppCard variant="outlined">
      <AppText variant="subtitle">Grade distribution</AppText>
      {Object.entries(values).map(([grade, count]) => (
        <AppText key={grade}>
          {grade}: {count}
        </AppText>
      ))}
    </AppCard>
  );
}
export function ResultPublicationStatusBadge({
  status,
}: {
  status: 'PUBLISHED' | 'UNPUBLISHED';
}) {
  return (
    <AppBadge
      label={status}
      status={status === 'PUBLISHED' ? 'published' : 'inactive'}
    />
  );
}
export function RankListItem({ item }: { item: RankEntry }) {
  return (
    <AppCard variant="outlined">
      <View style={styles.between}>
        <AppText variant="subtitle">
          #{item.rank ?? '—'} {item.studentName}
        </AppText>
        <ResultOutcomeBadge outcome={item.outcome} />
      </View>
      <AppText>
        {item.totalMarksObtained}/{item.totalMaximumMarks} ·{' '}
        {item.percentage.toFixed(2)}%
      </AppText>
    </AppCard>
  );
}
export function MarksVersionConflictDialog({
  visible,
  onReload,
}: {
  visible: boolean;
  onReload: () => void;
}) {
  return visible ? (
    <AppCard variant="outlined">
      <AppText variant="subtitle">Marks changed elsewhere</AppText>
      <AppText>
        Your unsaved entries are preserved. Reload the current version before
        saving again.
      </AppText>
      <Pressable accessibilityRole="button" onPress={onReload}>
        <AppText>Reload current version</AppText>
      </Pressable>
    </AppCard>
  ) : null;
}

const styles = StyleSheet.create({
  between: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  choice: { marginRight: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 },
});
