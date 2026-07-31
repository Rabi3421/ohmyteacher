import { ROUTES } from '../../src/constants/routes';
import type { RoleStackParamList } from '../../src/navigation/navigationTypes';
import * as Screens from '../../src/screens/report/ReportScreens';

describe('Phase 14 Report screens and routes', () => {
  it('exports every required mobile screen', () => {
    const names = [
      'ReportsDashboardScreen',
      'ReportCatalogScreen',
      'ReportViewerScreen',
      'ReportFiltersScreen',
      'SavedReportFiltersScreen',
      'FeeAnalyticsDashboardScreen',
      'OutstandingReportScreen',
      'FeeHeadReportScreen',
      'ClassFeeReportScreen',
      'DiscountExemptionReportScreen',
      'FineWaiverReportScreen',
      'AdvanceCreditReportScreen',
      'PaymentReversalReportScreen',
      'CollectionAnalyticsDashboardScreen',
      'DailyCollectionReportScreen',
      'PaymentModeReportScreen',
      'CollectorPerformanceReportScreen',
      'ReceiptReportScreen',
      'ExaminationAnalyticsDashboardScreen',
      'MarksCompletionReportScreen',
      'PassFailReportScreen',
      'GradeDistributionReportScreen',
      'SubjectPerformanceReportScreen',
      'ClassSectionPerformanceReportScreen',
      'RankReportScreen',
      'ResultPublicationReportScreen',
      'ReportCardGenerationReportScreen',
      'ExportCenterScreen',
      'ExportPreviewScreen',
      'ExportHistoryScreen',
      'ExportJobDetailsScreen',
    ];
    names.forEach(name =>
      expect(Screens[name as keyof typeof Screens]).toEqual(
        expect.any(Function),
      ),
    );
  });

  it('uses typed Report Type and record-ID navigation parameters', () => {
    const viewer: RoleStackParamList['ReportViewer'] = {
      schoolId: 'school-omt',
      reportType: 'FEE_OUTSTANDING',
    };
    const job: RoleStackParamList['ExportJobDetails'] = {
      schoolId: 'school-omt',
      exportJobId: 'job-1',
    };
    expect(viewer).toEqual({
      schoolId: 'school-omt',
      reportType: 'FEE_OUTSTANDING',
    });
    expect(job.exportJobId).toBe('job-1');
    expect(ROUTES.REPORTS_DASHBOARD).toBe('ReportsDashboard');
    expect(ROUTES.EXPORT_JOB_DETAILS).toBe('ExportJobDetails');
  });
});
