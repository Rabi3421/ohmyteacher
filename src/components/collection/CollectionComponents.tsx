import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type {
  PaymentListItem,
  ProposedAllocation,
  Receipt,
  ReceiptListItem,
} from '../../models/collection';
import { useAppTheme } from '../../hooks/useAppTheme';
import { formatCurrency } from '../../utils/currency';
import { paiseToRupees } from '../../utils/feeCalculation';
import { AppBadge, type BadgeStatus } from '../common/AppBadge';
import { AppAvatar } from '../common/AppAvatar';
import { AppCard } from '../common/AppCard';
import { AppText } from '../common/AppText';

export const collectionMoney = (paise: number) =>
  formatCurrency(paiseToRupees(paise), { showDecimals: true });

export function CollectionMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <AppCard style={styles.metric} variant="outlined">
      <AppText variant="caption">{label.toUpperCase()}</AppText>
      <AppText variant="heading3">{value}</AppText>
    </AppCard>
  );
}

export function CollectionSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <AppText variant="title">{title}</AppText>
      {children}
    </View>
  );
}

function paymentStatus(
  status: PaymentListItem['payment']['status'],
): BadgeStatus {
  return status === 'POSTED' ? 'active' : 'cancelled';
}

export function PaymentSummaryCard({ item }: { item: PaymentListItem }) {
  return (
    <AppCard variant="outlined">
      <View style={styles.between}>
        <View style={styles.copy}>
          <AppText variant="title">{item.payment.paymentNumber}</AppText>
          <AppText>
            {item.studentName} · {item.admissionNumber}
          </AppText>
          <AppText variant="caption">
            {item.branchName} · {item.payment.paymentDate} ·{' '}
            {item.payment.paymentMode.replace('_', ' ')}
          </AppText>
          <AppText>{item.receiptNumber ?? 'Receipt pending'}</AppText>
        </View>
        <View style={styles.end}>
          <AppBadge
            label={item.payment.status}
            status={paymentStatus(item.payment.status)}
          />
          <AppText variant="title">
            {collectionMoney(item.payment.amountPaise)}
          </AppText>
          {item.payment.advanceAmountPaise ? (
            <AppText variant="caption">
              Advance {collectionMoney(item.payment.advanceAmountPaise)}
            </AppText>
          ) : null}
        </View>
      </View>
    </AppCard>
  );
}

export function ReceiptSummaryCard({ item }: { item: ReceiptListItem }) {
  return (
    <AppCard variant="outlined">
      <View style={styles.between}>
        <View style={styles.copy}>
          <AppText variant="title">{item.receipt.receiptNumber}</AppText>
          <AppText>
            {item.studentName} · {item.admissionNumber}
          </AppText>
          <AppText variant="caption">
            {item.paymentNumber} · {item.branchName}
          </AppText>
          <AppText variant="caption">
            {item.receipt.issuedAt.slice(0, 10)} ·{' '}
            {item.receipt.paymentMode.replace('_', ' ')}
          </AppText>
        </View>
        <View style={styles.end}>
          <AppBadge
            label={item.receipt.status}
            status={item.receipt.status === 'ACTIVE' ? 'active' : 'cancelled'}
          />
          <AppText variant="title">
            {collectionMoney(item.receipt.paymentAmountPaise)}
          </AppText>
        </View>
      </View>
    </AppCard>
  );
}

export function AllocationCard({ item }: { item: ProposedAllocation }) {
  return (
    <AppCard variant="outlined">
      <View style={styles.between}>
        <View style={styles.copy}>
          <AppText variant="title">{item.feeHeadName}</AppText>
          <AppText>
            {item.periodLabel} · Due {item.dueDate}
          </AppText>
          <AppText variant="caption">
            Fine {collectionMoney(item.fineAmountAppliedPaise)} · Fee{' '}
            {collectionMoney(item.feeAmountAppliedPaise)}
          </AppText>
        </View>
        <View style={styles.end}>
          <AppText variant="title">
            {collectionMoney(item.totalAppliedPaise)}
          </AppText>
          <AppBadge
            label={item.resultingStatus.replace('_', ' ')}
            status={
              item.resultingStatus === 'PAID'
                ? 'paid'
                : item.resultingStatus === 'PARTIALLY_PAID'
                ? 'partial'
                : item.resultingStatus === 'OVERDUE'
                ? 'overdue'
                : 'unpaid'
            }
          />
        </View>
      </View>
    </AppCard>
  );
}

export function ReceiptPaper({ receipt }: { receipt: Receipt }) {
  const theme = useAppTheme();
  return (
    <AppCard style={styles.paper} variant="elevated">
      {receipt.status === 'CANCELLED' ? (
        <AppBadge label="CANCELLED RECEIPT" status="cancelled" />
      ) : null}
      <View style={styles.center}>
        <AppAvatar
          name={receipt.schoolSnapshot.name}
          size={64}
          source={
            receipt.schoolSnapshot.logoUrl
              ? { uri: receipt.schoolSnapshot.logoUrl }
              : undefined
          }
        />
        <AppText variant="heading2">{receipt.schoolSnapshot.name}</AppText>
        <AppText>{receipt.branchSnapshot.name}</AppText>
        <AppText variant="caption">{receipt.branchSnapshot.address}</AppText>
        <AppText variant="caption">{receipt.branchSnapshot.mobile}</AppText>
      </View>
      <View style={[styles.divider, { borderColor: theme.colors.border }]} />
      <View style={styles.between}>
        <View>
          <AppText variant="caption">RECEIPT NUMBER</AppText>
          <AppText variant="title">{receipt.receiptNumber}</AppText>
        </View>
        <View style={styles.end}>
          <AppText variant="caption">ISSUED</AppText>
          <AppText>{receipt.issuedAt.slice(0, 10)}</AppText>
        </View>
      </View>
      <View style={[styles.divider, { borderColor: theme.colors.border }]} />
      <AppText variant="title">{receipt.studentSnapshot.name}</AppText>
      <AppText>
        {receipt.studentSnapshot.admissionNumber} ·{' '}
        {receipt.studentSnapshot.className}{' '}
        {receipt.studentSnapshot.sectionName}
      </AppText>
      {receipt.payerSnapshot ? (
        <AppText variant="caption">
          Payer {receipt.payerSnapshot.name ?? '—'} ·{' '}
          {receipt.payerSnapshot.mobile ?? '—'}
        </AppText>
      ) : null}
      <View style={[styles.divider, { borderColor: theme.colors.border }]} />
      {receipt.allocationSnapshots.map(item => (
        <View key={item.feeDueId} style={styles.between}>
          <View style={styles.copy}>
            <AppText>
              {item.feeHeadName} · {item.periodLabel}
            </AppText>
            <AppText variant="caption">
              Fee {collectionMoney(item.feeAmountAppliedPaise)} · Fine{' '}
              {collectionMoney(item.fineAmountAppliedPaise)}
            </AppText>
            <AppText variant="caption">
              Result {item.resultingDueStatus.replace('_', ' ')}
            </AppText>
          </View>
          <AppText>{collectionMoney(item.totalAppliedPaise)}</AppText>
        </View>
      ))}
      {receipt.advanceAmountPaise > 0 ? (
        <View style={styles.between}>
          <AppText>Unapplied Student Advance</AppText>
          <AppText>{collectionMoney(receipt.advanceAmountPaise)}</AppText>
        </View>
      ) : null}
      <View style={[styles.divider, { borderColor: theme.colors.border }]} />
      <View style={styles.between}>
        <AppText variant="title">Total paid</AppText>
        <AppText variant="heading2">
          {collectionMoney(receipt.paymentAmountPaise)}
        </AppText>
      </View>
      <AppText>
        {receipt.paymentMode.replace('_', ' ')}
        {receipt.paymentReference ? ` · ${receipt.paymentReference}` : ''}
      </AppText>
      <AppText variant="caption">
        Collected by {receipt.collectedByName}
      </AppText>
      {receipt.cancellationReason ? (
        <AppText variant="caption">
          Cancellation: {receipt.cancellationReason}
        </AppText>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  between: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  center: { alignItems: 'center', gap: 4 },
  copy: { flex: 1, gap: 4 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, marginVertical: 8 },
  end: { alignItems: 'flex-end', gap: 6 },
  metric: { flexGrow: 1, minWidth: 150 },
  paper: { gap: 10 },
  section: { gap: 10 },
});
