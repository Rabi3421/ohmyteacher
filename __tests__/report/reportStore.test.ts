import type { ReportAccessContext } from '../../src/models/report';
import { createMockReportService } from '../../src/services/report/mockReportService';
import { createReportStore } from '../../src/store/report/reportStore';
import { getEffectivePermissions } from '../../src/utils/effectivePermissions';

const access: ReportAccessContext = {
  userId: 'admin',
  userName: 'Admin',
  membershipId: 'admin',
  role: 'SCHOOL_ADMIN',
  permissionKeys: getEffectivePermissions('SCHOOL_ADMIN'),
  permittedBranchIds: [],
};
const context = {
  schoolId: 'school-omt',
  branchIds: ['branch-main'],
  academicSessionIds: ['session-school-omt-current'],
  asOfDate: '2026-07-31',
  access,
};

describe('Report store', () => {
  it('loads dashboard/catalog, runs a report, and clears scoped state on context change', async () => {
    const store = createReportStore(createMockReportService());
    store.getState().setContext(context);
    expect(await store.getState().loadDashboard()).toBe(true);
    expect(await store.getState().loadCatalog()).toBe(true);
    store.getState().setReportType('FEE_OUTSTANDING');
    expect(await store.getState().runReport()).toBe(true);
    expect(store.getState().currentReport?.reportType).toBe('FEE_OUTSTANDING');
    store.getState().setContext({ ...context, branchIds: ['branch-east'] });
    expect(store.getState().currentReport).toBeNull();
    expect(store.getState().dashboard).toBeNull();
  });

  it('supports saved filters and preview/create/history independently', async () => {
    const store = createReportStore(createMockReportService());
    store.getState().setContext(context);
    expect(
      await store
        .getState()
        .saveFilter({
          reportType: 'FEE_OUTSTANDING',
          name: 'Main Branch',
          filters: { schoolId: 'school-omt', branchIds: ['branch-main'] },
        }),
    ).toBe(true);
    expect(
      store.getState().applySavedFilter(store.getState().savedFilters[0].id),
    ).toBe(true);
    expect(
      await store
        .getState()
        .previewExport({ reportType: 'FEE_OUTSTANDING', format: 'PDF' }),
    ).toBe(true);
    expect(store.getState().exportHistory.totalItems).toBe(0);
    expect(
      await store
        .getState()
        .createExport({
          reportType: 'FEE_OUTSTANDING',
          format: 'PDF',
          clientRequestId: 'mobile-1',
        }),
    ).toBe(true);
    expect(await store.getState().loadExports()).toBe(true);
    expect(store.getState().exportHistory.totalItems).toBe(1);
  });

  it('exposes all operation-specific loading flags and submission locks', () => {
    const state = createReportStore(createMockReportService()).getState();
    [
      'isLoadingDashboard',
      'isLoadingCatalog',
      'isRunningReport',
      'isLoadingSavedFilters',
      'isSavingFilter',
      'isArchivingFilter',
      'isPreviewingExport',
      'isCreatingExport',
      'isLoadingExports',
      'isLoadingExportJob',
      'isCancellingExport',
      'isRetryingExport',
    ].forEach(key => expect(state[key as keyof typeof state]).toBe(false));
    expect(state.isReportSubmissionLocked).toBe(false);
    expect(state.isExportSubmissionLocked).toBe(false);
  });
});
