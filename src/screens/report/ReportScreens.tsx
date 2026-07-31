import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import {
  DistributionBar,
  ReportContextBar,
  ReportExportFormatSelector,
  ReportExportStatusBadge,
  ReportMetadataCard,
  ReportMetricCard,
  ReportWarningCard,
} from '../../components/report/ReportComponents';
import type { ReportExportFormat, ReportType } from '../../models/report';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import {
  useAuthStore,
  useReportStore,
  useUserManagementStore,
} from '../../store';
import { formatCurrency } from '../../utils/currency';
import { getEffectivePermissions } from '../../utils/effectivePermissions';

type BaseParams = {
  schoolId: string;
  branchIds?: string[];
  academicSessionIds?: string[];
  asOfDate?: string;
};

function useReportContext(params: BaseParams) {
  const user = useAuthStore(state => state.user);
  const membership = useAuthStore(state => state.activeMembership);
  const configuration = useUserManagementStore(
    state => state.roleConfiguration,
  );
  const setContext = useReportStore(state => state.setContext);
  const permitted = useMemo(
    () => (membership?.branchId ? [membership.branchId] : []),
    [membership?.branchId],
  );
  const selectedBranches = useMemo(
    () => (params.branchIds?.length ? params.branchIds : permitted),
    [params.branchIds, permitted],
  );
  const permissions = useMemo(
    () =>
      membership
        ? getEffectivePermissions(
            membership.role,
            configuration &&
              configuration.schoolId === membership.schoolId &&
              configuration.role === membership.role
              ? configuration
              : null,
          )
        : [],
    [configuration, membership],
  );
  useEffect(() => {
    if (
      !user ||
      !membership ||
      (!membership.schoolId && membership.role !== 'SUPER_ADMIN')
    )
      return setContext(null);
    setContext({
      schoolId: params.schoolId,
      branchIds: selectedBranches,
      academicSessionIds: params.academicSessionIds ?? [],
      asOfDate: params.asOfDate ?? '2026-07-31',
      access: {
        userId: user.id,
        userName: user.name,
        membershipId: membership.id,
        role: membership.role,
        permissionKeys: permissions,
        permittedBranchIds: permitted,
      },
    });
  }, [
    membership,
    params.academicSessionIds,
    params.asOfDate,
    params.schoolId,
    permissions,
    permitted,
    selectedBranches,
    setContext,
    user,
  ]);
  return { membership, user };
}

function Shell({
  children,
  goBack,
  title,
  testID,
  params,
}: {
  children: React.ReactNode;
  goBack(): void;
  title: string;
  testID: string;
  params: BaseParams;
}) {
  const error = useReportStore(state => state.error);
  const success = useReportStore(state => state.successMessage);
  return (
    <AppScreen scrollable testID={testID}>
      <View style={styles.content}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={goBack}
          title={title}
          subtitle="Reports and Analytics"
        />
        <ReportContextBar
          school={params.schoolId}
          branches={params.branchIds?.length ?? 0}
          asOfDate={params.asOfDate ?? '2026-07-31'}
        />
        {error ? <ErrorState message={error.message} /> : null}
        {success ? <AppText style={styles.success}>{success}</AppText> : null}
        {children}
      </View>
    </AppScreen>
  );
}

function displayField(value: string | number | boolean, format: string) {
  if (format === 'CURRENCY' && typeof value === 'number')
    return formatCurrency(value / 100, { showDecimals: true });
  if (format === 'PERCENTAGE' && typeof value === 'number')
    return `${(value / 100).toFixed(2)}%`;
  return String(value);
}

function ReportResultView() {
  const report = useReportStore(state => state.currentReport);
  const loading = useReportStore(state => state.isRunningReport);
  const runReport = useReportStore(state => state.runReport);
  if (loading && !report) return <LoadingView message="Calculating report…" />;
  if (!report)
    return (
      <EmptyState
        title="No report yet"
        description="Run the report to calculate it from the latest repository snapshot."
        actionLabel="Run report"
        onAction={() => {
          runReport().catch(() => undefined);
        }}
      />
    );
  return (
    <>
      <View style={styles.metrics}>
        {report.summary.metrics.map(item => (
          <ReportMetricCard key={item.key} metric={item} />
        ))}
      </View>
      {report.warnings.map(item => (
        <ReportWarningCard
          key={`${item.code}-${item.ignoredFilterKey ?? ''}`}
          warning={item}
        />
      ))}
      {report.rows.length ? (
        report.rows.map(row => (
          <AppCard key={row.id} style={styles.card} variant="outlined">
            <AppText variant="bodyMedium">{row.title}</AppText>
            {row.subtitle ? (
              <AppText variant="caption">{row.subtitle}</AppText>
            ) : null}
            {row.fields.map(item => (
              <View key={item.key} style={styles.between}>
                <AppText variant="caption">{item.label}</AppText>
                <AppText>{displayField(item.value, item.format)}</AppText>
              </View>
            ))}
            {row.fields.find(
              item =>
                item.format === 'PERCENTAGE' && typeof item.value === 'number',
            ) ? (
              <DistributionBar
                basisPoints={Number(
                  row.fields.find(item => item.format === 'PERCENTAGE')!.value,
                )}
              />
            ) : null}
          </AppCard>
        ))
      ) : (
        <EmptyState
          title="No matching records"
          description="Try a broader Branch, Session, or date range."
        />
      )}
      {report.pagination ? (
        <AppText variant="caption">
          Page {report.pagination.page} of{' '}
          {Math.max(report.pagination.totalPages, 1)} ·{' '}
          {report.pagination.totalItems} records
        </AppText>
      ) : null}
      <ReportMetadataCard metadata={report.metadata} />
      <AppButton
        title="Refresh report"
        loading={loading}
        onPress={() => {
          runReport().catch(() => undefined);
        }}
      />
    </>
  );
}

function TypedReportPage({
  goBack,
  params,
  title,
  type,
  testID,
}: {
  goBack(): void;
  params: BaseParams;
  title: string;
  type: ReportType;
  testID: string;
}) {
  useReportContext(params);
  const setType = useReportStore(state => state.setReportType);
  const runReport = useReportStore(state => state.runReport);
  useEffect(() => {
    setType(type);
    runReport(type).catch(() => undefined);
  }, [runReport, setType, type]);
  return (
    <Shell goBack={goBack} params={params} testID={testID} title={title}>
      <ReportResultView />
    </Shell>
  );
}

export function ReportsDashboardScreen({
  navigation,
  route,
}: RoleScreenProps<'ReportsDashboard'>) {
  useReportContext(route.params);
  const load = useReportStore(state => state.loadDashboard);
  const dashboard = useReportStore(state => state.dashboard);
  const loading = useReportStore(state => state.isLoadingDashboard);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);
  return (
    <Shell
      goBack={navigation.goBack}
      params={route.params}
      testID="reports-dashboard-screen"
      title="Reports Dashboard"
    >
      {loading && !dashboard ? (
        <LoadingView message="Loading analytics…" />
      ) : dashboard ? (
        <>
          <View style={styles.metrics}>
            {dashboard.metrics.map(item => (
              <ReportMetricCard key={item.key} metric={item} />
            ))}
          </View>
          <AppCard style={styles.card} variant="outlined">
            <AppText variant="title">Report categories</AppText>
            {dashboard.categoryCounts.map(item => (
              <View key={item.category} style={styles.between}>
                <AppText>{item.category}</AppText>
                <AppText>{item.reportCount}</AppText>
              </View>
            ))}
          </AppCard>
          <ReportMetadataCard metadata={dashboard.metadata} />
        </>
      ) : (
        <EmptyState
          title="Dashboard unavailable"
          description="Refresh to calculate current analytics."
          actionLabel="Refresh"
          onAction={() => {
            load().catch(() => undefined);
          }}
        />
      )}
    </Shell>
  );
}

export function ReportCatalogScreen({
  navigation,
  route,
}: RoleScreenProps<'ReportCatalog'>) {
  useReportContext(route.params);
  const load = useReportStore(state => state.loadCatalog);
  const catalog = useReportStore(state => state.catalog);
  const loading = useReportStore(state => state.isLoadingCatalog);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);
  return (
    <Shell
      goBack={navigation.goBack}
      params={route.params}
      testID="report-catalog-screen"
      title="Report Catalog"
    >
      {loading && !catalog.length ? (
        <LoadingView message="Loading catalog…" />
      ) : (
        catalog.map(item => (
          <AppCard key={item.reportType} style={styles.card} variant="outlined">
            <AppText variant="title">{item.title}</AppText>
            <AppText>{item.description}</AppText>
            <AppText variant="caption">
              {item.category} · {item.supportedFormats.join(', ')}
            </AppText>
            <AppButton
              title="Open report"
              onPress={() =>
                navigation.navigate('ReportViewer', {
                  ...route.params,
                  reportType: item.reportType,
                })
              }
            />
          </AppCard>
        ))
      )}
    </Shell>
  );
}

export function ReportViewerScreen({
  navigation,
  route,
}: RoleScreenProps<'ReportViewer'>) {
  return (
    <TypedReportPage
      goBack={navigation.goBack}
      params={route.params}
      testID="report-viewer-screen"
      title="Report Viewer"
      type={route.params.reportType}
    />
  );
}

export function ReportFiltersScreen({
  navigation,
  route,
}: RoleScreenProps<'ReportFilters'>) {
  useReportContext(route.params);
  const filters = useReportStore(state => state.filters);
  const setFilters = useReportStore(state => state.setFilters);
  const [dateFrom, setDateFrom] = useState(filters?.dateFrom ?? '');
  const [dateTo, setDateTo] = useState(filters?.dateTo ?? '');
  return (
    <Shell
      goBack={navigation.goBack}
      params={route.params}
      testID="report-filters-screen"
      title="Report Filters"
    >
      <AppInput
        label="Date From"
        value={dateFrom}
        onChangeText={setDateFrom}
        placeholder="YYYY-MM-DD"
      />
      <AppInput
        label="Date To"
        value={dateTo}
        onChangeText={setDateTo}
        placeholder="YYYY-MM-DD"
      />
      <AppButton
        title="Apply filters"
        onPress={() => {
          if (filters)
            setFilters({
              ...filters,
              dateFrom: dateFrom || undefined,
              dateTo: dateTo || undefined,
            });
          navigation.goBack();
        }}
      />
    </Shell>
  );
}

export function SavedReportFiltersScreen({
  navigation,
  route,
}: RoleScreenProps<'SavedReportFilters'>) {
  useReportContext(route.params);
  const load = useReportStore(state => state.loadSavedFilters);
  const save = useReportStore(state => state.saveFilter);
  const archive = useReportStore(state => state.archiveFilter);
  const apply = useReportStore(state => state.applySavedFilter);
  const filters = useReportStore(state => state.filters);
  const items = useReportStore(state => state.savedFilters);
  const [name, setName] = useState('');
  useEffect(() => {
    load(route.params.reportType).catch(() => undefined);
  }, [load, route.params.reportType]);
  return (
    <Shell
      goBack={navigation.goBack}
      params={route.params}
      testID="saved-report-filters-screen"
      title="Saved Filters"
    >
      <AppInput label="Filter name" value={name} onChangeText={setName} />
      <AppButton
        title="Save current filters"
        onPress={() => {
          if (filters && route.params.reportType) {
            const serialized = Object.fromEntries(
              Object.entries(filters).filter(([key]) => key !== 'access'),
            ) as Omit<typeof filters, 'access'>;
            save({
              reportType: route.params.reportType,
              name,
              filters: serialized,
            }).catch(() => undefined);
          }
        }}
      />
      {items.map(item => (
        <AppCard key={item.id} style={styles.card} variant="outlined">
          <View style={styles.between}>
            <AppText variant="bodyMedium">{item.name}</AppText>
            <AppText variant="caption">
              {item.isDefault ? 'Default' : item.reportType}
            </AppText>
          </View>
          <View style={styles.actions}>
            <AppButton
              title="Apply"
              onPress={() => apply(item.id)}
              variant="secondary"
            />
            <AppButton
              title="Archive"
              onPress={() => {
                archive(item.id).catch(() => undefined);
              }}
              variant="danger"
            />
          </View>
        </AppCard>
      ))}
    </Shell>
  );
}

function ExportCenterPage({
  goBack,
  params,
  previewType,
}: {
  goBack(): void;
  params: BaseParams;
  previewType?: ReportType;
}) {
  useReportContext(params);
  const [format, setFormat] = useState<ReportExportFormat>('CSV');
  const preview = useReportStore(state => state.exportPreview);
  const previewExport = useReportStore(state => state.previewExport);
  const createExport = useReportStore(state => state.createExport);
  const type = previewType ?? 'FEE_OUTSTANDING';
  return (
    <Shell
      goBack={goBack}
      params={params}
      testID={previewType ? 'export-preview-screen' : 'export-center-screen'}
      title={previewType ? 'Export Preview' : 'Export Center'}
    >
      <ReportExportFormatSelector onChange={setFormat} value={format} />
      <AppButton
        title="Preview export"
        onPress={() => {
          previewExport({ reportType: type, format }).catch(() => undefined);
        }}
      />
      {preview ? (
        <AppCard style={styles.card} variant="outlined">
          <AppText variant="title">{preview.fileName}</AppText>
          <AppText>
            {preview.reportName} · {preview.estimatedRowCount} rows
          </AppText>
          <AppText variant="caption">
            Estimated {preview.estimatedFileSizeBytes} bytes
          </AppText>
          <AppText variant="caption">
            Development metadata only — no local file is generated.
          </AppText>
          <AppButton
            title="Create Export Job"
            onPress={() => {
              createExport({
                reportType: type,
                format,
                clientRequestId: `mobile-${type}-${format}-${preview.metadata.asOfDate}`,
              }).catch(() => undefined);
            }}
          />
        </AppCard>
      ) : null}
    </Shell>
  );
}

export function ExportCenterScreen({
  navigation,
  route,
}: RoleScreenProps<'ExportCenter'>) {
  return <ExportCenterPage goBack={navigation.goBack} params={route.params} />;
}
export function ExportPreviewScreen({
  navigation,
  route,
}: RoleScreenProps<'ExportPreview'>) {
  return (
    <ExportCenterPage
      goBack={navigation.goBack}
      params={route.params}
      previewType={route.params.reportType}
    />
  );
}

export function ExportHistoryScreen({
  navigation,
  route,
}: RoleScreenProps<'ExportHistory'>) {
  useReportContext(route.params);
  const load = useReportStore(state => state.loadExports);
  const history = useReportStore(state => state.exportHistory);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);
  return (
    <Shell
      goBack={navigation.goBack}
      params={route.params}
      testID="export-history-screen"
      title="Export History"
    >
      {history.items.map(item => (
        <AppCard key={item.id} style={styles.card} variant="outlined">
          <View style={styles.between}>
            <AppText variant="bodyMedium">{item.fileName}</AppText>
            <ReportExportStatusBadge status={item.status} />
          </View>
          <AppText variant="caption">
            {item.reportType} · {item.requestedAt}
          </AppText>
          <AppButton
            title="View job"
            onPress={() =>
              navigation.navigate('ExportJobDetails', {
                ...route.params,
                exportJobId: item.id,
              })
            }
          />
        </AppCard>
      ))}
      {!history.items.length ? (
        <EmptyState
          title="No Export Jobs"
          description="Preview a report and create an Export Job."
        />
      ) : null}
    </Shell>
  );
}

export function ExportJobDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'ExportJobDetails'>) {
  useReportContext(route.params);
  const load = useReportStore(state => state.loadExportJob);
  const cancel = useReportStore(state => state.cancelExport);
  const retry = useReportStore(state => state.retryExport);
  const details = useReportStore(state => state.selectedExportJob);
  useEffect(() => {
    load(route.params.exportJobId).catch(() => undefined);
  }, [load, route.params.exportJobId]);
  const job = details?.job;
  return (
    <Shell
      goBack={navigation.goBack}
      params={route.params}
      testID="export-job-details-screen"
      title="Export Job Details"
    >
      {job ? (
        <AppCard style={styles.card} variant="outlined">
          <View style={styles.between}>
            <AppText variant="title">{job.fileName}</AppText>
            <ReportExportStatusBadge status={job.status} />
          </View>
          <AppText>
            {job.reportType} · {job.format}
          </AppText>
          <AppText variant="caption">
            Requested by {job.requestedByName}
          </AppText>
          <AppText variant="caption">
            Development mock: {job.isDevelopmentMock ? 'Yes' : 'No'}
          </AppText>
          {job.documentUrl ? (
            <AppText variant="caption">
              Document metadata: {job.documentUrl}
            </AppText>
          ) : null}
          {['QUEUED', 'PROCESSING'].includes(job.status) ? (
            <AppButton
              title="Cancel job"
              onPress={() => {
                cancel(job.id).catch(() => undefined);
              }}
              variant="danger"
            />
          ) : null}
          {['FAILED', 'EXPIRED'].includes(job.status) ? (
            <AppButton
              title="Retry job"
              onPress={() => {
                retry(job.id, `retry-${job.id}`).catch(() => undefined);
              }}
            />
          ) : null}
        </AppCard>
      ) : (
        <LoadingView message="Loading Export Job…" />
      )}
    </Shell>
  );
}

const typed = (
  props: { navigation: { goBack(): void }; route: { params: BaseParams } },
  type: ReportType,
  title: string,
  testID: string,
) => (
  <TypedReportPage
    goBack={props.navigation.goBack}
    params={props.route.params}
    testID={testID}
    title={title}
    type={type}
  />
);

export function FeeAnalyticsDashboardScreen(
  props: RoleScreenProps<'FeeAnalyticsDashboard'>,
) {
  return typed(
    props,
    'FEE_OUTSTANDING',
    'Fee Analytics',
    'fee-analytics-dashboard-screen',
  );
}
export function OutstandingReportScreen(
  props: RoleScreenProps<'OutstandingReport'>,
) {
  return typed(
    props,
    'FEE_OUTSTANDING',
    'Outstanding Report',
    'outstanding-report-screen',
  );
}
export function FeeHeadReportScreen(props: RoleScreenProps<'FeeHeadReport'>) {
  return typed(props, 'FEE_HEAD', 'Fee Head Report', 'fee-head-report-screen');
}
export function ClassFeeReportScreen(props: RoleScreenProps<'ClassFeeReport'>) {
  return typed(
    props,
    'CLASS_FEE',
    'Class Fee Report',
    'class-fee-report-screen',
  );
}
export function DiscountExemptionReportScreen(
  props: RoleScreenProps<'DiscountExemptionReport'>,
) {
  return typed(
    props,
    'DISCOUNT_EXEMPTION',
    'Discount and Exemption Report',
    'discount-exemption-report-screen',
  );
}
export function FineWaiverReportScreen(
  props: RoleScreenProps<'FineWaiverReport'>,
) {
  return typed(
    props,
    'FINE_WAIVER',
    'Fine Waiver Report',
    'fine-waiver-report-screen',
  );
}
export function AdvanceCreditReportScreen(
  props: RoleScreenProps<'AdvanceCreditReport'>,
) {
  return typed(
    props,
    'ADVANCE_CREDIT',
    'Advance Credit Report',
    'advance-credit-report-screen',
  );
}
export function PaymentReversalReportScreen(
  props: RoleScreenProps<'PaymentReversalReport'>,
) {
  return typed(
    props,
    'PAYMENT_REVERSAL',
    'Payment Reversal Report',
    'payment-reversal-report-screen',
  );
}
export function CollectionAnalyticsDashboardScreen(
  props: RoleScreenProps<'CollectionAnalyticsDashboard'>,
) {
  return typed(
    props,
    'DAILY_COLLECTION',
    'Collection Analytics',
    'collection-analytics-dashboard-screen',
  );
}
export function DailyCollectionReportScreen(
  props: RoleScreenProps<'DailyCollectionReport'>,
) {
  return typed(
    props,
    'DAILY_COLLECTION',
    'Daily Collection Report',
    'daily-collection-report-screen',
  );
}
export function PaymentModeReportScreen(
  props: RoleScreenProps<'PaymentModeReport'>,
) {
  return typed(
    props,
    'PAYMENT_MODE',
    'Payment Mode Report',
    'payment-mode-report-screen',
  );
}
export function CollectorPerformanceReportScreen(
  props: RoleScreenProps<'CollectorPerformanceReport'>,
) {
  return typed(
    props,
    'COLLECTOR_COLLECTION',
    'Collector Performance',
    'collector-performance-report-screen',
  );
}
export function ReceiptReportScreen(props: RoleScreenProps<'ReceiptReport'>) {
  return typed(props, 'RECEIPTS', 'Receipt Report', 'receipt-report-screen');
}
export function ExaminationAnalyticsDashboardScreen(
  props: RoleScreenProps<'ExaminationAnalyticsDashboard'>,
) {
  return typed(
    props,
    'MARKS_COMPLETION',
    'Examination Analytics',
    'examination-analytics-dashboard-screen',
  );
}
export function MarksCompletionReportScreen(
  props: RoleScreenProps<'MarksCompletionReport'>,
) {
  return typed(
    props,
    'MARKS_COMPLETION',
    'Marks Completion Report',
    'marks-completion-report-screen',
  );
}
export function PassFailReportScreen(props: RoleScreenProps<'PassFailReport'>) {
  return typed(
    props,
    'PASS_FAIL',
    'Pass/Fail Report',
    'pass-fail-report-screen',
  );
}
export function GradeDistributionReportScreen(
  props: RoleScreenProps<'GradeDistributionReport'>,
) {
  return typed(
    props,
    'GRADE_DISTRIBUTION',
    'Grade Distribution',
    'grade-distribution-report-screen',
  );
}
export function SubjectPerformanceReportScreen(
  props: RoleScreenProps<'SubjectPerformanceReport'>,
) {
  return typed(
    props,
    'SUBJECT_PERFORMANCE',
    'Subject Performance',
    'subject-performance-report-screen',
  );
}
export function ClassSectionPerformanceReportScreen(
  props: RoleScreenProps<'ClassSectionPerformanceReport'>,
) {
  return typed(
    props,
    'CLASS_SECTION_PERFORMANCE',
    'Class/Section Performance',
    'class-section-performance-report-screen',
  );
}
export function RankReportScreen(props: RoleScreenProps<'RankReport'>) {
  return typed(props, 'RANK_LIST', 'Rank Report', 'rank-report-screen');
}
export function ResultPublicationReportScreen(
  props: RoleScreenProps<'ResultPublicationReport'>,
) {
  return typed(
    props,
    'RESULT_PUBLICATION',
    'Result Publication Report',
    'result-publication-report-screen',
  );
}
export function ReportCardGenerationReportScreen(
  props: RoleScreenProps<'ReportCardGenerationReport'>,
) {
  return typed(
    props,
    'REPORT_CARD_GENERATION',
    'Report Card Generation Report',
    'report-card-generation-report-screen',
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  between: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  card: { gap: 8 },
  content: { gap: 12, paddingBottom: 32 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  success: { color: '#15803D' },
});
