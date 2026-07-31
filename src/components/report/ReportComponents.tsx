import React from 'react';
import { StyleSheet, View } from 'react-native';

import type {
  ReportExportFormat,
  ReportExportStatus,
  ReportMetadata,
  ReportMetric,
  ReportWarning,
} from '../../models/report';
import { formatCurrency } from '../../utils/currency';
import { AppBadge } from '../common/AppBadge';
import { AppButton } from '../common/AppButton';
import { AppCard } from '../common/AppCard';
import { AppText } from '../common/AppText';

export function ReportContextBar({
  school,
  branches,
  asOfDate,
}: {
  school: string;
  branches: number;
  asOfDate: string;
}) {
  return (
    <AppCard style={styles.card} variant="outlined">
      <AppText variant="bodyMedium">{school}</AppText>
      <AppText variant="caption">
        {branches
          ? `${branches} Branch${branches === 1 ? '' : 'es'}`
          : 'All permitted Branches'}{' '}
        · As of {asOfDate}
      </AppText>
    </AppCard>
  );
}

export function ReportMetricCard({ metric }: { metric: ReportMetric }) {
  const display =
    metric.format === 'CURRENCY'
      ? formatCurrency(metric.value / 100, { showDecimals: true })
      : metric.format === 'BASIS_POINTS'
      ? `${(metric.value / 100).toFixed(2)}%`
      : metric.value.toLocaleString('en-IN');
  return (
    <AppCard style={styles.metric} variant="outlined">
      <AppText variant="caption">{metric.label}</AppText>
      <AppText variant="title">{display}</AppText>
      {metric.comparisonBasisPoints !== undefined ? (
        <AppText variant="caption">
          {metric.comparisonBasisPoints >= 0 ? '+' : ''}
          {(metric.comparisonBasisPoints / 100).toFixed(2)}%
        </AppText>
      ) : null}
    </AppCard>
  );
}

export function ReportWarningCard({ warning }: { warning: ReportWarning }) {
  return (
    <AppCard style={styles.warning} variant="outlined">
      <AppText variant="bodyMedium">Attention</AppText>
      <AppText>{warning.message}</AppText>
    </AppCard>
  );
}

export function ReportMetadataCard({ metadata }: { metadata: ReportMetadata }) {
  return (
    <AppCard style={styles.card} variant="outlined">
      <AppText variant="bodyMedium">Report metadata</AppText>
      <AppText variant="caption">
        Generated {metadata.generatedAt} · {metadata.timezone}
      </AppText>
      <AppText variant="caption">
        As of {metadata.asOfDate} · {metadata.currency}
      </AppText>
      <AppText variant="caption">
        Source snapshot {metadata.sourceSnapshotTimestamp}
      </AppText>
      <AppText variant="caption">
        Filters: {metadata.filtersApplied.join(', ') || 'None'}
      </AppText>
    </AppCard>
  );
}

export function ReportExportFormatSelector({
  value,
  onChange,
}: {
  value: ReportExportFormat;
  onChange(value: ReportExportFormat): void;
}) {
  return (
    <View style={styles.actions}>
      {(['CSV', 'XLSX', 'PDF'] as ReportExportFormat[]).map(format => (
        <AppButton
          key={format}
          title={format}
          onPress={() => onChange(format)}
          variant={value === format ? 'primary' : 'secondary'}
        />
      ))}
    </View>
  );
}

export function ReportExportStatusBadge({
  status,
}: {
  status: ReportExportStatus;
}) {
  const positive = status === 'READY';
  const negative =
    status === 'FAILED' || status === 'EXPIRED' || status === 'CANCELLED';
  return (
    <AppBadge
      label={status.replaceAll('_', ' ')}
      status={positive ? 'active' : negative ? 'failed' : 'draft'}
    />
  );
}

export function DistributionBar({ basisPoints }: { basisPoints: number }) {
  const width = `${Math.min(
    100,
    Math.max(0, basisPoints / 100),
  )}%` as `${number}%`;
  return (
    <View
      accessibilityLabel={`${(basisPoints / 100).toFixed(2)} percent`}
      style={styles.barTrack}
    >
      <View style={[styles.barFill, { width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  barFill: { backgroundColor: '#2563EB', borderRadius: 4, height: 8 },
  barTrack: {
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    height: 8,
    overflow: 'hidden',
  },
  card: { gap: 4 },
  metric: { flexBasis: '46%', flexGrow: 1, gap: 4 },
  warning: { backgroundColor: '#FFF7ED', gap: 4 },
});
