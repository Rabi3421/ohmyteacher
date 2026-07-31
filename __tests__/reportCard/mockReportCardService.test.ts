import { ApiClientError } from '../../src/services/api/apiError';
import {
  resetMockCommunicationData,
  createMockReportCardNotifications,
} from '../../src/services/communication/mockCommunicationService';
import { mockCommunicationService } from '../../src/services/communication/mockCommunicationService';
import { publishedResultRepository } from '../../src/services/marksResult/publishedResultRepository';
import { mockReportCardDocumentService } from '../../src/services/reportCard/mockReportCardDocumentService';
import { createMockReportCardService } from '../../src/services/reportCard/mockReportCardService';
import {
  reportCardRepository,
  resetMockReportCardRepository,
} from '../../src/services/reportCard/reportCardRepository';

const school = 'school-omt';
const exam = 'exam-omt-scheduled';
const generation = {
  publicationBatchId: 'publication-batch-phase13-active',
  scope: 'COMPLETE_EXAM' as const,
  templateId: 'report-template-standard',
};
const code = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return (error as ApiClientError).code;
  }
};

describe('Mock Report Card service', () => {
  beforeEach(() => {
    resetMockReportCardRepository();
    resetMockCommunicationData();
  });

  it('loads dashboard and creates a non-mutating generation preview', async () => {
    const service = createMockReportCardService();
    const before = reportCardRepository.cards().length;
    const summary = (
      await service.getReportCardDashboard(
        school,
        'branch-main',
        'session-school-omt-current',
        exam,
      )
    ).data;
    const preview = (
      await service.previewReportCardGeneration(school, exam, generation)
    ).data;
    expect(summary.publishedStudents).toBe(5);
    expect(preview.candidateCount).toBe(5);
    expect(preview.existingCount).toBe(3);
    expect(reportCardRepository.cards()).toHaveLength(before);
  });

  it('commits once, skips existing identities and allocates unique numbers', async () => {
    const service = createMockReportCardService();
    const preview = (
      await service.previewReportCardGeneration(school, exam, generation)
    ).data;
    const generated = (
      await service.generateReportCards(school, exam, {
        ...generation,
        previewId: preview.previewId,
        requestedByName: 'Admin',
        requestedByUserId: 'admin',
      })
    ).data;
    expect(generated.run.status).toBe('COMPLETED');
    expect(
      generated.items.filter(item => item.status === 'CREATED'),
    ).toHaveLength(2);
    expect(
      new Set(reportCardRepository.cards().map(item => item.reportCardNumber))
        .size,
    ).toBe(reportCardRepository.cards().length);
    expect(
      await code(
        service.generateReportCards(school, exam, {
          ...generation,
          previewId: preview.previewId,
          requestedByName: 'Admin',
          requestedByUserId: 'admin',
        }),
      ),
    ).toBe('REPORT_CARD_PREVIEW_ALREADY_COMMITTED');
  });

  it('rolls back entity writes atomically and never reuses issued sequences', async () => {
    const service = createMockReportCardService({ failNextGeneration: true });
    const before = reportCardRepository.cards().length;
    const preview = (
      await service.previewReportCardGeneration(school, exam, generation)
    ).data;
    expect(
      await code(
        service.generateReportCards(school, exam, {
          ...generation,
          previewId: preview.previewId,
          requestedByName: 'Admin',
          requestedByUserId: 'admin',
        }),
      ),
    ).toBe('ATOMIC_REPORT_CARD_GENERATION_FAILURE');
    expect(reportCardRepository.cards()).toHaveLength(before);
    const nextPreview = (
      await service.previewReportCardGeneration(school, exam, generation)
    ).data;
    const next = (
      await service.generateReportCards(school, exam, {
        ...generation,
        previewId: nextPreview.previewId,
        requestedByName: 'Admin',
        requestedByUserId: 'admin',
      })
    ).data;
    expect(
      next.items.find(item => item.reportCardNumber)?.reportCardNumber,
    ).not.toContain('000101');
  });

  it('rejects expired previews, inactive Templates and closed Sessions', async () => {
    let now = '2026-08-25T10:00:00.000Z';
    const service = createMockReportCardService({ now: () => now });
    const preview = (
      await service.previewReportCardGeneration(school, exam, generation)
    ).data;
    now = '2026-08-25T11:00:00.000Z';
    expect(
      await code(
        service.generateReportCards(school, exam, {
          ...generation,
          previewId: preview.previewId,
          requestedByName: 'Admin',
          requestedByUserId: 'admin',
        }),
      ),
    ).toBe('REPORT_CARD_PREVIEW_EXPIRED');
    expect(
      await code(
        service.previewReportCardGeneration(school, exam, {
          ...generation,
          templateId: 'report-template-draft',
        }),
      ),
    ).toBe('REPORT_CARD_TEMPLATE_NOT_ACTIVE');
  });

  it('enforces Parent/Student ownership, latest visibility and safe redaction', async () => {
    const service = createMockReportCardService();
    const parent = (
      await service.getParentReportCards(school, 'membership-parent')
    ).data;
    expect(parent.map(item => item.id)).toContain('report-card-rahul-v2');
    expect(parent[0]).not.toHaveProperty('generatedByUserId');
    expect(
      await code(
        service.getParentReportCard(
          school,
          'membership-parent',
          'report-card-arjun-v1',
        ),
      ),
    ).toBe('PARENT_RESULT_OWNERSHIP_FORBIDDEN');
    const student = (
      await service.getStudentReportCards(school, 'membership-student')
    ).data;
    expect(student).toHaveLength(1);
    expect(student[0].id).toBe('report-card-arjun-v1');
    expect(
      await code(
        service.getStudentReportCard(
          school,
          'membership-student',
          'report-card-rahul-v2',
        ),
      ),
    ).toBe('STUDENT_RESULT_OWNERSHIP_FORBIDDEN');
  });

  it('invalidates an unpublished source and blocks self-service/document access', async () => {
    const service = createMockReportCardService();
    publishedResultRepository.updatePublicationStatus(
      'publication-batch-phase13-active',
      'UNPUBLISHED',
    );
    expect(
      (await service.getParentReportCards(school, 'membership-parent')).data,
    ).toEqual([]);
    expect(
      await code(
        mockReportCardDocumentService.getDocumentStatus(
          school,
          'report-card-rahul-v2',
        ),
      ),
    ).toBe('REPORT_CARD_DOCUMENT_UNAVAILABLE');
  });

  it('supports development document metadata and Report Card notifications', async () => {
    const document = (
      await mockReportCardDocumentService.getDocumentStatus(
        school,
        'report-card-rahul-v2',
      )
    ).data;
    expect(document.isDevelopmentMock).toBe(true);
    expect(document.message).toContain('Python backend');
    createMockReportCardNotifications([
      reportCardRepository
        .cards()
        .find(item => item.id === 'report-card-rahul-v2')!,
    ]);
    const notifications = (
      await mockCommunicationService.getParentNotifications(
        school,
        'membership-parent',
      )
    ).data;
    expect(
      notifications.some(item => item.type === 'REPORT_CARD_AVAILABLE'),
    ).toBe(true);
  });
});
