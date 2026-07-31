import React from 'react';
import { StyleSheet, View } from 'react-native';

import type {
  FeeDue,
  FeeDueListItem,
  FeeGenerationPreviewItem,
  FeeGenerationRun,
  FeeOutstandingSummary,
  StudentFeeDueSummary,
} from '../../models/feeDue';
import { formatCurrency } from '../../utils/currency';
import { paiseToRupees } from '../../utils/feeCalculation';
import { AppBadge, type BadgeStatus } from '../common/AppBadge';
import { AppCard } from '../common/AppCard';
import { AppText } from '../common/AppText';

const money = (paise: number) => formatCurrency(paiseToRupees(paise));

export function FeeDueStatusBadge({ status }: { status: FeeDue['status'] }) {
  const tone: BadgeStatus =
    status === 'PAID'
      ? 'paid'
      : status === 'PARTIALLY_PAID'
        ? 'partial'
        : status === 'OVERDUE'
          ? 'overdue'
          : status === 'CANCELLED'
            ? 'cancelled'
            : status === 'WAIVED'
              ? 'completed'
              : status === 'UPCOMING'
                ? 'draft'
                : 'unpaid';
  return <AppBadge label={status.replace('_', ' ')} status={tone} />;
}

export function FeeOutstandingSummaryCards({ summary }: { summary: FeeOutstandingSummary }) {
  const cards = [
    ['Upcoming Amount', summary.upcomingAmountPaise],
    ['Pending Amount', summary.pendingAmountPaise],
    ['Overdue Amount', summary.overdueAmountPaise],
    ['Accrued Fine', summary.accruedFinePaise],
    ['Total Outstanding', summary.totalOutstandingPaise],
  ] as const;
  return (
    <View style={styles.grid}>
      {cards.map(([label, value]) => (
        <AppCard key={label} style={styles.summary} variant="outlined">
          <AppText variant="caption">{label}</AppText>
          <AppText variant="heading3">{money(value)}</AppText>
        </AppCard>
      ))}
      <AppCard style={styles.summary} variant="outlined">
        <AppText variant="caption">Students With Outstanding</AppText>
        <AppText variant="heading3">{summary.studentsWithOutstanding}</AppText>
      </AppCard>
      <AppCard style={styles.summary} variant="outlined">
        <AppText variant="caption">Unassigned Eligible Students</AppText>
        <AppText variant="heading3">{summary.unassignedEligibleStudents}</AppText>
      </AppCard>
    </View>
  );
}

export function FeeDueListCard({ item, onPress }: { item: FeeDueListItem; onPress: () => void }) {
  const due = item.due;
  return (
    <AppCard onPress={onPress} variant="elevated">
      <View style={styles.row}>
        <View style={styles.copy}>
          <AppText variant="title">{due.studentNameSnapshot}</AppText>
          <AppText>{due.feeHeadNameSnapshot} · {due.periodLabel}</AppText>
          <AppText variant="caption">{due.admissionNumberSnapshot} · {due.classNameSnapshot} · {due.sectionNameSnapshot}</AppText>
          <AppText variant="caption">Due {due.dueDate} · Fine {money(Math.max(0, due.fineAmountPaise - due.fineWaivedAmountPaise))}</AppText>
          <AppText variant="title">Outstanding {money(due.outstandingAmountPaise)}</AppText>
        </View>
        <FeeDueStatusBadge status={due.status} />
      </View>
    </AppCard>
  );
}

export function FeeDueAmountBreakdown({ due }: { due: FeeDue }) {
  const rows = [
    ['Base Amount', due.baseAmountPaise],
    ['Override Adjustment', due.overrideAmountPaise],
    ['Exemption', -due.exemptionAmountPaise],
    ['Discount', -due.discountAmountPaise],
    ['Net Fee', due.netFeeAmountPaise],
    ['Fine', due.fineAmountPaise],
    ['Fine Waived', -due.fineWaivedAmountPaise],
    ['Paid (reserved)', -due.paidAmountPaise],
    ['Outstanding', due.outstandingAmountPaise],
  ] as const;
  return (
    <AppCard variant="outlined">
      <AppText variant="title">Generated Amount Snapshot</AppText>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.row}>
          <AppText style={styles.copy}>{label}</AppText>
          <AppText>{value < 0 ? '-' : ''}{money(Math.abs(value))}</AppText>
        </View>
      ))}
    </AppCard>
  );
}

export function GenerationRunCard({ run, onPress }: { run: FeeGenerationRun; onPress: () => void }) {
  return (
    <AppCard onPress={onPress} variant="outlined">
      <View style={styles.row}>
        <View style={styles.copy}>
          <AppText variant="title">{run.id}</AppText>
          <AppText>{run.generationType.replace('_', ' ')} · {run.requestedPeriods.join(', ') || 'Full session'}</AppText>
          <AppText variant="caption">{run.createdCount} created · {run.existingCount} existing · {run.skippedCount} skipped · {run.failedCount} failed</AppText>
        </View>
        <AppBadge label={run.status.replace('_', ' ')} status={run.status === 'COMPLETED' ? 'completed' : run.status === 'FAILED' ? 'failed' : 'partial'} />
      </View>
    </AppCard>
  );
}

export function GenerationPreviewCard({ item }: { item: FeeGenerationPreviewItem }) {
  return (
    <AppCard variant="outlined">
      <View style={styles.row}>
        <View style={styles.copy}>
          <AppText variant="title">{item.studentName} · {item.feeHeadName}</AppText>
          <AppText>{item.periodLabel} {item.dueDate ? `· Due ${item.dueDate}` : ''}</AppText>
          <AppText variant="caption">{item.className} · {item.sectionName}</AppText>
          {item.reason ? <AppText variant="caption">{item.reason}</AppText> : null}
          <AppText>Net {money(item.netAmountPaise)}</AppText>
        </View>
        <AppBadge label={item.status} status={item.status === 'NEW' || item.status === 'CREATED' ? 'active' : item.status === 'ERROR' ? 'failed' : 'draft'} />
      </View>
    </AppCard>
  );
}

export function StudentOutstandingCard({ summary }: { summary: StudentFeeDueSummary }) {
  return (
    <AppCard variant="elevated">
      <AppText variant="heading2">{summary.studentName}</AppText>
      <AppText>{summary.admissionNumber}</AppText>
      <View style={styles.grid}>
        <AppText>Upcoming {money(summary.upcomingAmountPaise)}</AppText>
        <AppText>Pending {money(summary.pendingAmountPaise)}</AppText>
        <AppText>Overdue {money(summary.overdueAmountPaise)}</AppText>
        <AppText>Fine {money(summary.accruedFinePaise)}</AppText>
      </View>
      <AppText variant="heading3">Total Outstanding {money(summary.totalOutstandingPaise)}</AppText>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  copy: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 8 },
  summary: { minWidth: 150 },
});
