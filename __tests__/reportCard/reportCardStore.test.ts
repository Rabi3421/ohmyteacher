import type { UserMembership } from '../../src/models/auth';
import type { ReportCardService } from '../../src/services/reportCard/reportCardService';
import {
  mockCommunicationService,
  resetMockCommunicationData,
} from '../../src/services/communication/mockCommunicationService';
import { createMockReportCardService } from '../../src/services/reportCard/mockReportCardService';
import { resetMockReportCardRepository } from '../../src/services/reportCard/reportCardRepository';
import { createReportCardStore } from '../../src/store/reportCard/reportCardStore';
import { getEffectivePermissions } from '../../src/utils/effectivePermissions';

const admin: UserMembership = {
  branchId: 'branch-main',
  id: 'admin',
  role: 'SCHOOL_ADMIN',
  schoolId: 'school-omt',
  schoolName: 'OMT',
  status: 'ACTIVE',
  userId: 'admin',
};
const accountant: UserMembership = {
  ...admin,
  id: 'accountant',
  role: 'ACCOUNTANT',
};
const context = {
  academicSessionId: 'session-school-omt-current',
  branchId: 'branch-main',
  examId: 'exam-omt-scheduled',
  schoolId: 'school-omt',
  sessionStatus: 'ACTIVE' as const,
};
const create = (
  membership = admin,
  service: ReportCardService = createMockReportCardService(),
) =>
  createReportCardStore({
    communication: mockCommunicationService,
    getMembership: () => membership,
    getPermissions: member => getEffectivePermissions(member.role),
    service,
  });

describe('Report Card store', () => {
  beforeEach(() => {
    resetMockReportCardRepository();
    resetMockCommunicationData();
  });

  it('loads dashboard/Templates/cards and clears Exam-scoped state', async () => {
    const store = create();
    store.getState().setContext(context);
    expect(await store.getState().loadDashboard()).toBe(true);
    expect(await store.getState().loadTemplates()).toBe(true);
    expect(await store.getState().loadReportCards()).toBe(true);
    expect(store.getState().dashboard?.publishedStudents).toBe(5);
    expect(store.getState().templates.items.length).toBeGreaterThan(0);
    store.getState().setContext({ ...context, examId: 'different-exam' });
    expect(store.getState().reportCards.items).toEqual([]);
    expect(store.getState().generationPreview).toBeNull();
  });

  it('previews/commits generation once and resets the generation draft', async () => {
    const store = create();
    store.getState().setContext(context);
    store
      .getState()
      .setGenerationDraft({
        publicationBatchId: 'publication-batch-phase13-active',
        scope: 'COMPLETE_EXAM',
        templateId: 'report-template-standard',
      });
    expect(await store.getState().previewGeneration()).toBe(true);
    expect(store.getState().generationPreview?.candidateCount).toBe(5);
    expect(await store.getState().generateReportCards()).toBe(true);
    expect(store.getState().generationResult?.run.status).toBe('COMPLETED');
    expect(store.getState().generationDraft).toBeNull();
    expect(await store.getState().generateReportCards()).toBe(false);
  });

  it('loads document/revocation changes and normalizes access errors', async () => {
    const store = create();
    store.getState().setContext(context);
    expect(await store.getState().loadDocument('report-card-rahul-v2')).toBe(
      true,
    );
    expect(store.getState().documentState?.isDevelopmentMock).toBe(true);
    expect(
      await store
        .getState()
        .revokeReportCard('report-card-rahul-v2', 'Corrected publication'),
    ).toBe(true);
    expect(store.getState().selectedReportCard?.status).toBe('REVOKED');
    const blocked = create(accountant);
    blocked.getState().setContext(context);
    expect(await blocked.getState().loadReportCards()).toBe(false);
    expect(blocked.getState().error?.code).toBe('REPORT_CARD_ACCESS_DENIED');
  });

  it('ignores a stale dashboard response after Exam context changes', async () => {
    let resolve:
      | ((
          value: Awaited<
            ReturnType<ReportCardService['getReportCardDashboard']>
          >,
        ) => void)
      | undefined;
    const base = createMockReportCardService();
    const service: ReportCardService = {
      ...base,
      getReportCardDashboard: () =>
        new Promise(result => {
          resolve = result;
        }),
    };
    const store = create(admin, service);
    store.getState().setContext(context);
    const pending = store.getState().loadDashboard();
    store.getState().setContext({ ...context, examId: 'another-exam' });
    resolve!(
      await base.getReportCardDashboard(
        context.schoolId,
        context.branchId,
        context.academicSessionId,
        context.examId,
      ),
    );
    expect(await pending).toBe(false);
    expect(store.getState().dashboard).toBeNull();
  });
});
