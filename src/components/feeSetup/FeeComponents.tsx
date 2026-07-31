import React from 'react';
import { StyleSheet, View } from 'react-native';

import type {
  DiscountDefinition,
  EffectiveFeePreview,
  FeeHead,
  FeeStructure,
  FineRule,
  StudentFeeAssignmentSummary,
} from '../../models/fee';
import { formatCurrency } from '../../utils/currency';
import { paiseToRupees } from '../../utils/feeCalculation';
import { AppBadge } from '../common/AppBadge';
import { AppCard } from '../common/AppCard';
import { AppText } from '../common/AppText';

export function FeeContextBar({
  school,
  branch,
  session,
  closed,
}: {
  school: string;
  branch: string;
  session: string;
  closed?: boolean;
}) {
  return (
    <AppCard style={styles.context} variant="outlined">
      <AppText variant="caption">FEE SETUP CONTEXT</AppText>
      <AppText variant="title">
        {school} · {branch}
      </AppText>
      <View style={styles.row}>
        <AppText style={styles.copy}>{session}</AppText>
        {closed ? <AppBadge label="READ ONLY" status="locked" /> : null}
      </View>
    </AppCard>
  );
}

export function FeeHeadListItem({
  item,
  onPress,
}: {
  item: FeeHead;
  onPress: () => void;
}) {
  return (
    <AppCard onPress={onPress} variant="elevated">
      <View style={styles.row}>
        <View style={styles.copy}>
          <AppText variant="title">{item.name}</AppText>
          <AppText variant="caption">
            {item.code} · {item.type.replace('_', ' ')} ·{' '}
            {item.defaultFrequency.replace('_', ' ')}
          </AppText>
          <AppText variant="caption">
            {item.activeStructureItemCount} active structure references
          </AppText>
        </View>
        <AppBadge
          label={item.status}
          status={item.status === 'ACTIVE' ? 'active' : 'inactive'}
        />
      </View>
    </AppCard>
  );
}

export function FeeStructureCard({
  item,
  onPress,
}: {
  item: FeeStructure;
  onPress: () => void;
}) {
  return (
    <AppCard onPress={onPress} variant="elevated">
      <View style={styles.row}>
        <View style={styles.copy}>
          <AppText variant="title">{item.name}</AppText>
          <AppText>
            {item.className} · {item.items.length} items
          </AppText>
          <AppText variant="caption">
            Nominal {formatCurrency(item.totalNominalAmount)} ·{' '}
            {item.assignedStudentCount} students
          </AppText>
        </View>
        <AppBadge
          label={item.status}
          status={
            item.status === 'ACTIVE'
              ? 'active'
              : item.status === 'DRAFT'
                ? 'draft'
                : 'inactive'
          }
        />
      </View>
    </AppCard>
  );
}

export function DiscountCard({
  item,
  onPress,
}: {
  item: DiscountDefinition;
  onPress?: () => void;
}) {
  return (
    <AppCard onPress={onPress} variant="outlined">
      <View style={styles.row}>
        <View style={styles.copy}>
          <AppText variant="title">{item.name}</AppText>
          <AppText>
            {item.code} · {item.type} ·{' '}
            {item.type === 'FIXED'
              ? formatCurrency(item.value)
              : `${item.value}%`}
          </AppText>
          <AppText variant="caption">
            {item.category.replace('_', ' ')} · {item.activeAssignmentCount}{' '}
            active assignments
          </AppText>
        </View>
        <AppBadge
          label={item.status}
          status={item.status === 'ACTIVE' ? 'active' : 'inactive'}
        />
      </View>
    </AppCard>
  );
}

export function FineRuleCard({
  item,
  onPress,
}: {
  item: FineRule;
  onPress?: () => void;
}) {
  const amount =
    item.type === 'FIXED_AFTER_DUE'
      ? formatCurrency(item.fixedAmount ?? 0)
      : item.type === 'DAILY_AFTER_DUE'
        ? `${formatCurrency(item.dailyAmount ?? 0)}/day`
        : `${item.slabs?.length ?? 0} slabs`;
  return (
    <AppCard onPress={onPress} variant="outlined">
      <View style={styles.row}>
        <View style={styles.copy}>
          <AppText variant="title">{item.name}</AppText>
          <AppText>
            {item.code} · {amount}
          </AppText>
          <AppText variant="caption">
            Grace {item.graceDays} days · {item.activeUsageCount} active uses
          </AppText>
        </View>
        <AppBadge
          label={item.status}
          status={item.status === 'ACTIVE' ? 'active' : 'inactive'}
        />
      </View>
    </AppCard>
  );
}

export function StudentFeeAssignmentCard({
  item,
  onPress,
}: {
  item: StudentFeeAssignmentSummary;
  onPress: () => void;
}) {
  return (
    <AppCard onPress={onPress} variant="elevated">
      <View style={styles.row}>
        <View style={styles.copy}>
          <AppText variant="title">{item.studentName}</AppText>
          <AppText variant="caption">
            {item.admissionNumber} · Roll {item.rollNumber ?? '—'}
          </AppText>
          <AppText>
            {item.className} · {item.sectionName}
          </AppText>
          <AppText variant="caption">
            {item.feeStructureName ?? 'No active assignment'} ·{' '}
            {formatCurrency(paiseToRupees(item.effectivePayablePaise))}
          </AppText>
        </View>
        <AppBadge
          label={item.assignmentStatus}
          status={item.assignmentStatus === 'ASSIGNED' ? 'active' : 'inactive'}
        />
      </View>
    </AppCard>
  );
}

export function EffectiveFeePreviewCard({
  preview,
}: {
  preview: EffectiveFeePreview;
}) {
  return (
    <AppCard variant="elevated">
      <AppText variant="heading3">{preview.title}</AppText>
      <AppText variant="caption">
        Configuration estimate only — no dues, payments, balance, fine, receipt,
        or ledger.
      </AppText>
      <View style={styles.breakdown}>
        {preview.lineItems.map(item => (
          <View key={item.feeStructureItemId} style={styles.row}>
            <AppText style={styles.copy}>
              {item.label}
              {!item.selected ? ' (not selected)' : item.exempt ? ' (exempt)' : ''}
            </AppText>
            <AppText>
              {formatCurrency(paiseToRupees(item.effectiveAmountPaise))}
            </AppText>
          </View>
        ))}
        {preview.discounts.map(item => (
          <View key={item.discountDefinitionId} style={styles.row}>
            <AppText style={styles.copy}>{item.label}</AppText>
            <AppText>-{formatCurrency(paiseToRupees(item.amountPaise))}</AppText>
          </View>
        ))}
        <View style={styles.row}>
          <AppText style={styles.copy}>Gross Amount</AppText>
          <AppText>{formatCurrency(paiseToRupees(preview.grossAmountPaise))}</AppText>
        </View>
        <View style={styles.row}>
          <AppText style={styles.copy}>Selected Optional Amount</AppText>
          <AppText>{formatCurrency(paiseToRupees(preview.selectedOptionalAmountPaise))}</AppText>
        </View>
        <View style={styles.row}>
          <AppText style={styles.copy}>Custom Override Adjustment</AppText>
          <AppText>{formatCurrency(paiseToRupees(preview.customOverrideDeltaPaise))}</AppText>
        </View>
        <View style={styles.row}>
          <AppText style={styles.copy}>Exemptions</AppText>
          <AppText>-{formatCurrency(paiseToRupees(preview.exemptionAmountPaise))}</AppText>
        </View>
        <View style={styles.row}>
          <AppText style={styles.copy}>Discount Amount</AppText>
          <AppText>-{formatCurrency(paiseToRupees(preview.discountAmountPaise))}</AppText>
        </View>
      </View>
      <View style={styles.total}>
        <AppText variant="title">Net Configured Amount</AppText>
        <AppText variant="heading2">
          {formatCurrency(paiseToRupees(preview.netConfiguredAmountPaise))}
        </AppText>
      </View>
      {preview.estimatedFineRuleNames.length ? (
        <AppText variant="caption">
          Attached Fine Rules (not applied):{' '}
          {preview.estimatedFineRuleNames.join(', ')}
        </AppText>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  breakdown: { gap: 8, marginTop: 16 },
  context: { marginBottom: 16 },
  copy: { flex: 1 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  total: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
});
