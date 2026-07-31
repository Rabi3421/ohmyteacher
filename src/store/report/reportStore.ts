import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { PaginatedResponse } from '../../models/common';
import type {
  CommonReportFilters,
  CreateReportExportInput,
  CreateSavedReportFilterInput,
  ExportJobListQuery,
  PreviewReportExportInput,
  ReportAccessContext,
  ReportCatalogItem,
  ReportExportJob,
  ReportExportJobDetails,
  ReportExportPreview,
  ReportResult,
  ReportsDashboardSummary,
  ReportType,
  SavedReportFilter,
  UpdateSavedReportFilterInput,
} from '../../models/report';
import { ApiClientError, type ApiError } from '../../services/api/apiError';
import type { ReportService } from '../../services/report/reportService';
import { reportService } from '../../services/report/reportServiceResolver';

export interface ReportContext {
  schoolId: string;
  branchIds: string[];
  academicSessionIds: string[];
  asOfDate: string;
  access: ReportAccessContext;
}

const emptyPage = <T>(): PaginatedResponse<T> => ({
  items: [],
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
});
const loading = {
  isLoadingDashboard: false,
  isLoadingCatalog: false,
  isRunningReport: false,
  isLoadingSavedFilters: false,
  isSavingFilter: false,
  isArchivingFilter: false,
  isPreviewingExport: false,
  isCreatingExport: false,
  isLoadingExports: false,
  isLoadingExportJob: false,
  isCancellingExport: false,
  isRetryingExport: false,
};

export interface ReportState {
  context: ReportContext | null;
  dashboard: ReportsDashboardSummary | null;
  catalog: ReportCatalogItem[];
  selectedReportType: ReportType | null;
  filters: CommonReportFilters | null;
  savedFilters: SavedReportFilter[];
  currentReport: ReportResult | null;
  exportPreview: ReportExportPreview | null;
  exportResult: ReportExportJob | null;
  exportHistory: PaginatedResponse<ReportExportJob>;
  selectedExportJob: ReportExportJobDetails | null;
  error: ApiError | null;
  successMessage: string | null;
  isReportSubmissionLocked: boolean;
  isExportSubmissionLocked: boolean;
  isLoadingDashboard: boolean;
  isLoadingCatalog: boolean;
  isRunningReport: boolean;
  isLoadingSavedFilters: boolean;
  isSavingFilter: boolean;
  isArchivingFilter: boolean;
  isPreviewingExport: boolean;
  isCreatingExport: boolean;
  isLoadingExports: boolean;
  isLoadingExportJob: boolean;
  isCancellingExport: boolean;
  isRetryingExport: boolean;
}

export interface ReportActions {
  setContext(context: ReportContext | null): void;
  setReportType(type: ReportType | null): void;
  setFilters(filters: CommonReportFilters | null): void;
  loadDashboard(): Promise<boolean>;
  loadCatalog(): Promise<boolean>;
  runReport(type?: ReportType): Promise<boolean>;
  loadSavedFilters(type?: ReportType): Promise<boolean>;
  saveFilter(
    input: Omit<CreateSavedReportFilterInput, 'access'>,
  ): Promise<boolean>;
  updateFilter(
    id: string,
    input: Omit<UpdateSavedReportFilterInput, 'access'>,
  ): Promise<boolean>;
  archiveFilter(id: string): Promise<boolean>;
  applySavedFilter(id: string): boolean;
  previewExport(
    input: Omit<PreviewReportExportInput, 'filters'> & {
      filters?: CommonReportFilters;
    },
  ): Promise<boolean>;
  createExport(
    input: Omit<CreateReportExportInput, 'filters'> & {
      filters?: CommonReportFilters;
    },
  ): Promise<boolean>;
  loadExports(query?: Omit<ExportJobListQuery, 'access'>): Promise<boolean>;
  loadExportJob(id: string): Promise<boolean>;
  cancelExport(id: string): Promise<boolean>;
  retryExport(id: string, clientRequestId: string): Promise<boolean>;
  clearFeedback(): void;
  reset(): void;
}

export type ReportStoreState = ReportState & ReportActions;
export const INITIAL_REPORT_STATE: ReportState = {
  ...loading,
  context: null,
  dashboard: null,
  catalog: [],
  selectedReportType: null,
  filters: null,
  savedFilters: [],
  currentReport: null,
  exportPreview: null,
  exportResult: null,
  exportHistory: emptyPage(),
  selectedExportJob: null,
  error: null,
  successMessage: null,
  isReportSubmissionLocked: false,
  isExportSubmissionLocked: false,
};

function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiClientError)
    return {
      code: error.code,
      message: error.message,
      status: error.status,
      fieldErrors: error.fieldErrors,
    };
  return {
    code: 'UNEXPECTED_ERROR',
    message:
      error instanceof Error
        ? error.message
        : 'Something went wrong. Please try again.',
  };
}

export function createReportStore(
  service: ReportService = reportService,
): StoreApi<ReportStoreState> {
  return createStore<ReportStoreState>()((set, get) => {
    let contextVersion = 0;
    const context = () =>
      get().context ??
      (() => {
        throw new Error('Select a reporting workspace first.');
      })();
    const filters = () =>
      get().filters ??
      (() => {
        const current = context();
        return {
          schoolId: current.schoolId,
          branchIds: current.branchIds,
          academicSessionIds: current.academicSessionIds,
          asOfDate: current.asOfDate,
          access: current.access,
        };
      })();
    const run = async (
      flag: keyof typeof loading,
      operation: () => Promise<void>,
    ) => {
      const version = contextVersion;
      set({
        [flag]: true,
        error: null,
        successMessage: null,
      } as Partial<ReportStoreState>);
      try {
        await operation();
        return version === contextVersion;
      } catch (error) {
        if (version === contextVersion) set({ error: normalizeError(error) });
        return false;
      } finally {
        if (version === contextVersion)
          set({ [flag]: false } as Partial<ReportStoreState>);
      }
    };
    return {
      ...INITIAL_REPORT_STATE,
      setContext(value) {
        const prior = get().context;
        const changed =
          prior?.schoolId !== value?.schoolId ||
          prior?.branchIds.join('|') !== value?.branchIds.join('|') ||
          prior?.academicSessionIds.join('|') !==
            value?.academicSessionIds.join('|');
        if (!changed) return;
        contextVersion += 1;
        set({
          ...INITIAL_REPORT_STATE,
          context: value,
          filters: value
            ? {
                schoolId: value.schoolId,
                branchIds: value.branchIds,
                academicSessionIds: value.academicSessionIds,
                asOfDate: value.asOfDate,
                access: value.access,
              }
            : null,
        });
      },
      setReportType: selectedReportType =>
        set({ selectedReportType, currentReport: null, exportPreview: null }),
      setFilters: value =>
        set({ filters: value, currentReport: null, exportPreview: null }),
      loadDashboard: () =>
        run('isLoadingDashboard', async () => {
          const current = context();
          const response = await service.getReportsDashboard(current.schoolId, {
            access: current.access,
            branchIds: current.branchIds,
            academicSessionIds: current.academicSessionIds,
            asOfDate: current.asOfDate,
          });
          set({ dashboard: response.data });
        }),
      loadCatalog: () =>
        run('isLoadingCatalog', async () => {
          const current = context();
          const response = await service.getReportCatalog(
            current.schoolId,
            current.access,
          );
          set({ catalog: response.data });
        }),
      async runReport(type) {
        if (get().isReportSubmissionLocked) return false;
        set({ isReportSubmissionLocked: true });
        const ok = await run('isRunningReport', async () => {
          const current = context();
          const reportType = type ?? get().selectedReportType;
          if (!reportType) throw new Error('Select a Report first.');
          const response = await service.runReport(
            current.schoolId,
            reportType,
            filters(),
          );
          set({
            currentReport: response.data,
            selectedReportType: reportType,
            successMessage: 'Report refreshed.',
          });
        });
        set({ isReportSubmissionLocked: false });
        return ok;
      },
      loadSavedFilters: type =>
        run('isLoadingSavedFilters', async () => {
          const current = context();
          const response = await service.getSavedFilters(
            current.schoolId,
            current.access,
            type ?? get().selectedReportType ?? undefined,
          );
          set({ savedFilters: response.data });
        }),
      saveFilter: input =>
        run('isSavingFilter', async () => {
          const current = context();
          const response = await service.saveReportFilter(current.schoolId, {
            ...input,
            access: current.access,
          });
          set({
            savedFilters: [
              ...get().savedFilters.filter(
                item =>
                  item.id !== response.data.id &&
                  (!response.data.isDefault ||
                    item.reportType !== response.data.reportType),
              ),
              response.data,
            ],
            successMessage: response.message,
          });
        }),
      updateFilter: (id, input) =>
        run('isSavingFilter', async () => {
          const current = context();
          const response = await service.updateSavedReportFilter(
            current.schoolId,
            id,
            { ...input, access: current.access },
          );
          set({
            savedFilters: get().savedFilters.map(item =>
              item.id === id
                ? response.data
                : response.data.isDefault &&
                  item.reportType === response.data.reportType
                ? { ...item, isDefault: false }
                : item,
            ),
            successMessage: response.message,
          });
        }),
      archiveFilter: id =>
        run('isArchivingFilter', async () => {
          const current = context();
          await service.archiveSavedReportFilter(current.schoolId, id, {
            access: current.access,
          });
          set({
            savedFilters: get().savedFilters.filter(item => item.id !== id),
            successMessage: 'Saved Filter archived.',
          });
        }),
      applySavedFilter(id) {
        const current = context();
        const item = get().savedFilters.find(value => value.id === id);
        if (!item) return false;
        set({
          selectedReportType: item.reportType,
          filters: {
            ...item.filters,
            schoolId: current.schoolId,
            access: current.access,
          },
          currentReport: null,
        });
        return true;
      },
      previewExport: input =>
        run('isPreviewingExport', async () => {
          const current = context();
          const response = await service.previewExport(current.schoolId, {
            ...input,
            filters: input.filters ?? filters(),
          });
          set({ exportPreview: response.data });
        }),
      async createExport(input) {
        if (get().isExportSubmissionLocked) return false;
        set({ isExportSubmissionLocked: true });
        const ok = await run('isCreatingExport', async () => {
          const current = context();
          const response = await service.createExportJob(current.schoolId, {
            ...input,
            filters: input.filters ?? filters(),
          });
          set({
            exportResult: response.data,
            successMessage: response.message,
          });
        });
        set({ isExportSubmissionLocked: false });
        return ok;
      },
      loadExports: query =>
        run('isLoadingExports', async () => {
          const current = context();
          const response = await service.getExportJobs(current.schoolId, {
            ...query,
            access: current.access,
          });
          set({ exportHistory: response.data });
        }),
      loadExportJob: id =>
        run('isLoadingExportJob', async () => {
          const current = context();
          const response = await service.getExportJob(current.schoolId, id, {
            access: current.access,
          });
          set({ selectedExportJob: response.data });
        }),
      cancelExport: id =>
        run('isCancellingExport', async () => {
          const current = context();
          const response = await service.cancelExportJob(current.schoolId, id, {
            access: current.access,
          });
          set({
            exportResult: response.data,
            selectedExportJob:
              get().selectedExportJob?.job.id === id
                ? { ...get().selectedExportJob!, job: response.data }
                : get().selectedExportJob,
            successMessage: response.message,
          });
        }),
      retryExport: (id, clientRequestId) =>
        run('isRetryingExport', async () => {
          const current = context();
          const response = await service.retryExportJob(current.schoolId, id, {
            access: current.access,
            clientRequestId,
          });
          set({
            exportResult: response.data,
            successMessage: response.message,
          });
        }),
      clearFeedback: () => set({ error: null, successMessage: null }),
      reset() {
        contextVersion += 1;
        set(INITIAL_REPORT_STATE);
      },
    };
  });
}

export const reportStore = createReportStore();
export const useReportStore = <T>(
  selector: (state: ReportStoreState) => T,
): T => useStore(reportStore, selector);
