import React from 'react';
import { StyleSheet, View } from 'react-native';

import type {
  ReportExportFormat,
  ReportExportStatus,
  ReportMetadata,
  ReportMetric,
  ReportWarning,
} from '../../models/report';
import { useAppTheme } from '../../hooks/useAppTheme';
import { formatCurrency } from '../../utils/currency';
import { AppBadge } from '../common/AppBadge';
import { AppChoiceChip } from '../common/AppChoiceChip';
import { AppDetailRow } from '../common/AppDetailRow';
import { AppIdentityCard } from '../common/AppIdentityCard';
import { AppText } from '../common/AppText';
import { AppIcon, type AppIconName } from '../icons/AppIcon';

// Tones cycle across a report's metric row so neighbouring tiles stay
// distinguishable without inventing meaning that the data does not carry.
const METRIC_TONES = [
  { accent: '#1478F2', tint: '#EAF3FF' },
  { accent: '#18A978', tint: '#E8F8F2' },
  { accent: '#F59A23', tint: '#FFF4E4' },
  { accent: '#7A5AF8', tint: '#F0ECFF' },
  { accent: '#E84D8A', tint: '#FDECF3' },
  { accent: '#6366F1', tint: '#EEF2FF' },
] as const;

function metricIcon(metric: ReportMetric): AppIconName {
  if (metric.format === 'CURRENCY') return 'wallet';
  if (metric.format === 'BASIS_POINTS') return 'trending-up';
  const key = metric.key.toLowerCase();
  if (key.includes('student')) return 'users';
  if (key.includes('result') || key.includes('exam')) return 'graduation-cap';
  if (key.includes('receipt') || key.includes('payment')) return 'credit-card';
  return 'bar-chart';
}

function toneFor(index: number) {
  return METRIC_TONES[index % METRIC_TONES.length];
}

export function ReportContextBar({
  school,
  branches,
  asOfDate,
}: {
  school: string;
  branches: number;
  asOfDate: string;
}) {
  const scope = branches
    ? `${branches} Branch${branches === 1 ? '' : 'es'}`
    : 'All permitted Branches';

  return (
    <AppIdentityCard
      icon="school"
      subtitle={`${scope} · As of ${asOfDate}`}
      title={school}
    />
  );
}

export function ReportMetricCard({
  metric,
  index = 0,
}: {
  metric: ReportMetric;
  index?: number;
}) {
  const theme = useAppTheme();
  const tone = toneFor(index);
  const display =
    metric.format === 'CURRENCY'
      ? formatCurrency(metric.value / 100, { showDecimals: true })
      : metric.format === 'BASIS_POINTS'
        ? `${(metric.value / 100).toFixed(2)}%`
        : metric.value.toLocaleString('en-IN');
  const comparison = metric.comparisonBasisPoints;
  const positive = comparison !== undefined && comparison >= 0;

  return (
    <View
      style={[
        styles.metric,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      <View style={[styles.metricIcon, { backgroundColor: tone.tint }]}>
        <AppIcon
          color={tone.accent}
          name={metricIcon(metric)}
          size={18}
          strokeWidth={2.1}
        />
      </View>
      <AppText
        numberOfLines={1}
        style={[styles.metricValue, { color: theme.colors.textPrimary }]}
      >
        {display}
      </AppText>
      <AppText
        color={theme.colors.textSecondary}
        numberOfLines={2}
        variant="caption"
      >
        {metric.label}
      </AppText>
      {comparison !== undefined ? (
        <View style={styles.metricTrend}>
          <AppIcon
            color={positive ? theme.colors.success : theme.colors.error}
            name={positive ? 'trending-up' : 'arrow-right'}
            size={12}
            strokeWidth={2.2}
          />
          <AppText
            color={positive ? theme.colors.success : theme.colors.error}
            style={styles.metricTrendText}
            variant="caption"
          >
            {positive ? '+' : ''}
            {(comparison / 100).toFixed(2)}%
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

export function ReportWarningCard({ warning }: { warning: ReportWarning }) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.warning,
        {
          backgroundColor: theme.colors.warningSubtle,
          borderColor: theme.colors.warning,
        },
      ]}
    >
      <AppIcon
        color={theme.colors.warning}
        name="alert-circle"
        size={18}
        strokeWidth={2}
      />
      <View style={styles.warningCopy}>
        <AppText style={styles.warningTitle} variant="label">
          Attention
        </AppText>
        <AppText color={theme.colors.textSecondary} variant="caption">
          {warning.message}
        </AppText>
      </View>
    </View>
  );
}

export function ReportMetadataCard({ metadata }: { metadata: ReportMetadata }) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.metadata,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      <View style={styles.metadataHeader}>
        <AppIcon
          color={theme.colors.textTertiary}
          name="info"
          size={16}
          strokeWidth={2}
        />
        <AppText color={theme.colors.textSecondary} variant="label">
          Report metadata
        </AppText>
      </View>
      <AppDetailRow label="Generated" value={metadata.generatedAt} />
      <AppDetailRow divided label="Timezone" value={metadata.timezone} />
      <AppDetailRow divided label="As of" value={metadata.asOfDate} />
      <AppDetailRow divided label="Currency" value={metadata.currency} />
      <AppDetailRow
        divided
        label="Snapshot"
        value={metadata.sourceSnapshotTimestamp}
      />
      <AppDetailRow
        divided
        label="Filters"
        value={metadata.filtersApplied.join(', ') || 'None'}
      />
    </View>
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
        <AppChoiceChip
          key={format}
          label={format}
          onPress={() => onChange(format)}
          selected={value === format}
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
  const theme = useAppTheme();
  const width = `${Math.min(
    100,
    Math.max(0, basisPoints / 100),
  )}%` as `${number}%`;
  return (
    <View
      accessibilityLabel={`${(basisPoints / 100).toFixed(2)} percent`}
      style={[styles.barTrack, { backgroundColor: theme.colors.surfaceMuted }]}
    >
      <View
        style={[styles.barFill, { backgroundColor: theme.colors.primary, width }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  barFill: { borderRadius: 999, height: 8 },
  barTrack: {
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
  },
  metadata: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    paddingHorizontal: 16,
    paddingVertical: 6,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  metadataHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
    paddingTop: 12,
  },
  metric: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 3,
    padding: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  metricIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    marginBottom: 8,
    width: 36,
  },
  metricTrend: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  metricTrendText: {
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  warning: {
    alignItems: 'flex-start',
    borderLeftWidth: 3,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  warningCopy: { flex: 1 },
  warningTitle: { fontWeight: '700' },
});
