import type { ApiResponse, PaginatedResponse } from '../../models/common';
import type { PublishedResultSnapshot } from '../../models/marksResult';
import type {
  ReportCardGenerationPreview,
  ReportCardGenerationResultItem,
  ReportCardGenerationRun,
  ReportCardTemplate,
  SelfServiceResultDetails,
} from '../../models/reportCard';
import { buildReportCardSnapshot } from '../../utils/reportCardSnapshot';
import {
  deriveReportCardVersion,
  formatReportCardNumber,
  isGenerationPreviewExpired,
} from '../../utils/reportCardGeneration';
import {
  latestVisibleReportCards,
  parentOwnsStudent,
  reportCardVisibility,
  studentMembershipOwnsStudent,
} from '../../utils/reportCardVisibility';
import {
  mapPublishedResultSummary,
  redactReportCardForSelfService,
  redactPublishedResult,
} from '../../utils/reportCardRedaction';
import {
  canTemplateGenerate,
  normalizeReportCardTemplateCode,
  validateReportCardTemplate,
} from '../../utils/reportCardTemplateValidation';
import { ApiClientError } from '../api/apiError';
import { SCHOOL_AUTH_FIXTURES } from '../auth/authFixtures';
import {
  createMockReportCardNotifications,
  getMockCommunicationRepositorySnapshot,
} from '../communication/mockCommunicationService';
import {
  INITIAL_EXAMS,
  INITIAL_GRADING_SCHEMES,
} from '../examinationSetup/examinationSetupFixtures';
import { publishedResultRepository } from '../marksResult/publishedResultRepository';
import {
  INITIAL_ACADEMIC_SESSIONS,
  INITIAL_BRANCHES,
  INITIAL_SCHOOLS,
} from '../organization/organizationFixtures';
import { INITIAL_PARENT_STUDENT_LINKS } from '../student/studentFixtures';
import { reportCardDocumentService } from './reportCardDocumentServiceResolver';
import { REPORT_CARD_FIXTURE_CLOCK } from './reportCardFixtures';
import { reportCardRepository } from './reportCardRepository';
import type { ReportCardService } from './reportCardService';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const memberships = Object.values(SCHOOL_AUTH_FIXTURES).flatMap(
  item => item.memberships,
);
const success = <T>(data: T, message: string): ApiResponse<T> => ({
  data: clone(data),
  message,
  success: true,
});
function fail(
  code: string,
  message: string,
  status = 409,
  fieldErrors?: Record<string, string>,
): never {
  throw new ApiClientError({ code, fieldErrors, message, status });
}
function paginate<T>(
  items: T[],
  page = 1,
  pageSize = 20,
): PaginatedResponse<T> {
  const current = Math.max(1, page);
  const size = Math.max(1, pageSize);
  return {
    items: items.slice((current - 1) * size, current * size),
    page: current,
    pageSize: size,
    totalItems: items.length,
    totalPages: items.length ? Math.ceil(items.length / size) : 0,
  };
}
function address(value: {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
}): string {
  return [
    value.line1,
    value.line2,
    value.city,
    value.state,
    value.pinCode,
    value.country,
  ]
    .filter(Boolean)
    .join(', ');
}

export interface MockReportCardServiceOptions {
  now?: () => string;
  failNextGeneration?: boolean;
}
export function createMockReportCardService(
  options: MockReportCardServiceOptions = {},
): ReportCardService {
  const now = options.now ?? (() => REPORT_CARD_FIXTURE_CLOCK);
  let failNextGeneration = options.failNextGeneration ?? false;
  let previews = new Map<string, ReportCardGenerationPreview>();
  const committed = new Set<string>();
  let previewSequence = 0;
  const schoolFor = (id: string) =>
    INITIAL_SCHOOLS.find(item => item.id === id) ??
    fail('REPORT_CARD_SCHOOL_NOT_FOUND', 'School was not found.', 404);
  const branchFor = (schoolId: string, id: string) =>
    INITIAL_BRANCHES.find(
      item => item.id === id && item.schoolId === schoolId,
    ) ??
    fail(
      'REPORT_CARD_BRANCH_FORBIDDEN',
      'Branch is outside the selected School.',
      403,
    );
  const sessionFor = (schoolId: string, id: string) =>
    INITIAL_ACADEMIC_SESSIONS.find(
      item => item.id === id && item.schoolId === schoolId,
    ) ??
    fail(
      'REPORT_CARD_SESSION_FORBIDDEN',
      'Academic Session is outside the selected School.',
      403,
    );
  const templateFor = (schoolId: string, id: string) =>
    reportCardRepository
      .templates()
      .find(item => item.id === id && item.schoolId === schoolId) ??
    fail(
      'REPORT_CARD_TEMPLATE_NOT_FOUND',
      'Report Card Template was not found.',
      404,
    );
  const cardFor = (schoolId: string, id: string) =>
    reportCardRepository
      .cards()
      .find(item => item.id === id && item.schoolId === schoolId) ??
    fail('REPORT_CARD_NOT_FOUND', 'Report Card was not found.', 404);
  const publications = () => publishedResultRepository.list();
  const activePublications = (schoolId: string, examId?: string) =>
    publications().filter(
      item =>
        item.schoolId === schoolId &&
        item.status === 'PUBLISHED' &&
        (!examId || item.examId === examId),
    );
  const syncInvalidations = () => {
    const values = publications();
    reportCardRepository.cards().forEach(card => {
      const publication = values.find(
        item => item.id === card.publishedResultSnapshotId,
      );
      if (
        card.status === 'AVAILABLE' &&
        (!publication || publication.status !== 'PUBLISHED')
      ) {
        card.status = 'REVOKED';
        card.publicationInvalidatedAt = now();
        card.revocationReason =
          'Related Result publication is no longer active.';
        card.updatedAt = now();
      }
    });
  };
  const scoped = (
    values: PublishedResultSnapshot[],
    input: {
      publicationBatchId: string;
      scope: string;
      examClassConfigurationId?: string;
      sectionId?: string;
      studentId?: string;
    },
  ) =>
    values.filter(
      item =>
        item.publicationBatchId === input.publicationBatchId &&
        (!input.studentId || item.studentId === input.studentId) &&
        (!input.sectionId ||
          item.overallResult.sectionId === input.sectionId) &&
        (!input.examClassConfigurationId ||
          item.overallResult.examClassConfigurationId ===
            input.examClassConfigurationId),
    );
  const ensureParent = (
    schoolId: string,
    membershipId: string,
    studentId: string,
  ) => {
    if (
      !parentOwnsStudent({
        links: INITIAL_PARENT_STUDENT_LINKS,
        parentMembershipId: membershipId,
        schoolId,
        studentId,
      })
    )
      fail(
        'PARENT_RESULT_OWNERSHIP_FORBIDDEN',
        'This Student is not linked to the active Parent membership.',
        403,
      );
  };
  const ensureStudent = (
    schoolId: string,
    membershipId: string,
    studentId: string,
  ) => {
    if (
      !studentMembershipOwnsStudent({
        memberships,
        schoolId,
        studentId,
        studentMembershipId: membershipId,
      })
    )
      fail(
        'STUDENT_RESULT_OWNERSHIP_FORBIDDEN',
        'This Result does not belong to the active Student membership.',
        403,
      );
  };
  const visibleCardForResult = (result: PublishedResultSnapshot) =>
    latestVisibleReportCards(
      reportCardRepository
        .cards()
        .filter(item => item.publishedResultSnapshotId === result.id),
      publications(),
    )[0];
  const selfDetails = (
    result: PublishedResultSnapshot,
  ): SelfServiceResultDetails =>
    redactPublishedResult(
      result,
      visibleCardForResult(result),
      sessionFor(result.schoolId, result.academicSessionId).name,
    );

  return {
    async getReportCardDashboard(
      schoolId,
      branchId,
      academicSessionId,
      examId,
    ) {
      schoolFor(schoolId);
      branchFor(schoolId, branchId);
      const session = sessionFor(schoolId, academicSessionId);
      syncInvalidations();
      const results = activePublications(schoolId, examId).filter(
        item =>
          item.branchId === branchId &&
          item.academicSessionId === academicSessionId,
      );
      const cards = reportCardRepository
        .cards()
        .filter(
          item =>
            item.schoolId === schoolId &&
            item.branchId === branchId &&
            item.academicSessionId === academicSessionId &&
            item.examId === examId,
        );
      const missingReportCards = results.filter(
        item =>
          !cards.some(
            card =>
              card.publishedResultSnapshotId === item.id &&
              card.status !== 'FAILED',
          ),
      ).length;
      const failedGenerations =
        reportCardRepository
          .runs()
          .filter(item => item.examId === examId && item.status === 'FAILED')
          .length + cards.filter(item => item.status === 'FAILED').length;
      const warnings = [];
      if (!results.length)
        warnings.push({
          code: 'NO_ACTIVE_PUBLICATION',
          message: 'No active Result publication exists for this Exam.',
        });
      if (
        !reportCardRepository
          .templates()
          .some(item => item.schoolId === schoolId && item.status === 'ACTIVE')
      )
        warnings.push({
          code: 'NO_ACTIVE_TEMPLATE',
          message: 'No active Report Card Template is available.',
        });
      if (session.status === 'CLOSED')
        warnings.push({
          code: 'CLOSED_SESSION_READ_ONLY',
          message: 'Closed Academic Sessions are historical and read-only.',
        });
      if (missingReportCards)
        warnings.push({
          code: 'MISSING_REPORT_CARDS',
          message: `${missingReportCards} published Result(s) do not have a usable Report Card.`,
        });
      if (failedGenerations)
        warnings.push({
          code: 'REPORT_CARD_GENERATION_FAILED',
          message: 'One or more Report Card or document generations failed.',
        });
      if (
        publications().some(
          item =>
            item.schoolId === schoolId &&
            item.examId === examId &&
            item.status === 'UNPUBLISHED',
        )
      )
        warnings.push({
          code: 'UNPUBLISHED_BATCH',
          message: 'Historical unpublished Result batches are retained.',
        });
      const notificationValues =
        getMockCommunicationRepositorySnapshot().notifications;
      return success(
        {
          failedGenerations,
          missingReportCards,
          parentNotifications: notificationValues.filter(
            item =>
              item.schoolId === schoolId &&
              item.branchId === branchId &&
              item.audienceType === 'PARENT_MEMBERSHIP' &&
              ['RESULT_PUBLISHED', 'REPORT_CARD_AVAILABLE'].includes(item.type),
          ).length,
          publishedStudents: results.length,
          reportCardsAvailable: cards.filter(
            item => item.status === 'AVAILABLE',
          ).length,
          reportCardsGenerated: cards.filter(item => item.status !== 'FAILED')
            .length,
          revokedReportCards: cards.filter(item => item.status === 'REVOKED')
            .length,
          studentNotifications: notificationValues.filter(
            item =>
              item.schoolId === schoolId &&
              item.branchId === branchId &&
              item.audienceType === 'STUDENT_MEMBERSHIP' &&
              ['RESULT_PUBLISHED', 'REPORT_CARD_AVAILABLE'].includes(item.type),
          ).length,
          warnings,
        },
        'Report Card Dashboard loaded.',
      );
    },
    async getTemplates(schoolId, query = {}) {
      schoolFor(schoolId);
      const search = query.search?.trim().toLowerCase();
      const values = reportCardRepository
        .templates()
        .filter(
          item =>
            item.schoolId === schoolId &&
            (!query.status ||
              query.status === 'ALL' ||
              item.status === query.status) &&
            (!search ||
              `${item.name} ${item.code}`.toLowerCase().includes(search)),
        );
      return success(
        paginate(values, query.page, query.pageSize),
        'Report Card Templates loaded.',
      );
    },
    async getTemplate(schoolId, id) {
      return success(templateFor(schoolId, id), 'Report Card Template loaded.');
    },
    async createTemplate(schoolId, input) {
      schoolFor(schoolId);
      const validation = validateReportCardTemplate(
        input,
        reportCardRepository
          .templates()
          .filter(item => item.schoolId === schoolId),
      );
      if (!validation.valid)
        fail(
          'REPORT_CARD_TEMPLATE_INVALID',
          'Correct the Report Card Template fields.',
          422,
          validation.fieldErrors,
        );
      const at = now();
      const value: ReportCardTemplate = {
        ...clone(input),
        activeUsageCount: 0,
        code: normalizeReportCardTemplateCode(input.code),
        createdAt: at,
        id: `report-template-${reportCardRepository.nextSequence()}`,
        name: input.name.trim(),
        schoolId,
        title: input.title.trim(),
        updatedAt: at,
      };
      reportCardRepository.setTemplates([
        ...reportCardRepository.templates(),
        value,
      ]);
      return success(value, 'Report Card Template created.');
    },
    async updateTemplate(schoolId, id, input) {
      const current = templateFor(schoolId, id);
      const validation = validateReportCardTemplate(
        input,
        reportCardRepository
          .templates()
          .filter(item => item.schoolId === schoolId),
        id,
      );
      if (!validation.valid)
        fail(
          'REPORT_CARD_TEMPLATE_INVALID',
          'Correct the Report Card Template fields.',
          422,
          validation.fieldErrors,
        );
      const value = {
        ...current,
        ...clone(input),
        activeUsageCount: current.activeUsageCount,
        code: normalizeReportCardTemplateCode(input.code),
        id,
        schoolId,
        updatedAt: now(),
      };
      reportCardRepository.setTemplates(
        reportCardRepository
          .templates()
          .map(item => (item.id === id ? value : item)),
      );
      return success(
        value,
        'Template updated for future generations. Existing snapshots are unchanged.',
      );
    },
    async updateTemplateStatus(schoolId, id, status) {
      const current = templateFor(schoolId, id);
      if (status === 'ACTIVE') {
        const validation = validateReportCardTemplate(
          { ...current, status },
          reportCardRepository
            .templates()
            .filter(item => item.schoolId === schoolId),
          id,
        );
        if (!validation.valid)
          fail(
            'REPORT_CARD_TEMPLATE_INVALID',
            'Template cannot be activated.',
            422,
            validation.fieldErrors,
          );
      }
      const value = { ...current, status, updatedAt: now() };
      reportCardRepository.setTemplates(
        reportCardRepository
          .templates()
          .map(item => (item.id === id ? value : item)),
      );
      return success(value, 'Report Card Template status updated.');
    },
    async previewReportCardGeneration(schoolId, examId, input) {
      schoolFor(schoolId);
      const template = templateFor(schoolId, input.templateId);
      if (!canTemplateGenerate(template))
        fail(
          'REPORT_CARD_TEMPLATE_NOT_ACTIVE',
          'Only an active Template can generate Report Cards.',
          422,
        );
      const candidates = scoped(
        publications().filter(
          item => item.schoolId === schoolId && item.examId === examId,
        ),
        input,
      );
      const items = candidates.map(result => {
        const existing = reportCardRepository
          .cards()
          .find(
            card =>
              card.publishedResultSnapshotId === result.id &&
              card.templateId === input.templateId &&
              card.status !== 'FAILED',
          );
        const eligible = result.status === 'PUBLISHED';
        return {
          admissionNumber: result.overallResult.admissionNumberSnapshot,
          eligible,
          existingReportCardId: existing?.id,
          proposedVersion:
            existing?.version ??
            deriveReportCardVersion(
              reportCardRepository.cards(),
              result.studentId,
              result.examId,
            ),
          publishedResultSnapshotId: result.id,
          reason: eligible ? undefined : 'Published Result is not active.',
          studentId: result.studentId,
          studentName: result.overallResult.studentNameSnapshot,
        };
      });
      const createdAt = now();
      const preview: ReportCardGenerationPreview = {
        candidateCount: items.length,
        createdAt,
        eligibleCount: items.filter(
          item => item.eligible && !item.existingReportCardId,
        ).length,
        errorCount: items.filter(item => !item.eligible).length,
        existingCount: items.filter(item => !!item.existingReportCardId).length,
        examId,
        expiresAt: new Date(Date.parse(createdAt) + 15 * 60_000).toISOString(),
        items,
        previewId: `report-preview-${++previewSequence}`,
        publicationBatchId: input.publicationBatchId,
        schoolId,
        scope: input.scope,
        skippedCount: items.filter(item => !item.eligible).length,
        sourcePublicationUpdatedAt: Math.max(
          ...candidates.map(item => Date.parse(item.publishedAt)),
          0,
        ).toString(),
        templateId: input.templateId,
        warnings: items.length
          ? []
          : [
              {
                code: 'MISSING_PUBLICATION',
                message: 'No Published Results match this generation scope.',
              },
            ],
      };
      previews.set(preview.previewId, clone(preview));
      return success(preview, 'Generation preview created without mutation.');
    },
    async generateReportCards(schoolId, examId, input) {
      const preview =
        previews.get(input.previewId) ??
        fail(
          'REPORT_CARD_PREVIEW_NOT_FOUND',
          'Create a generation preview first.',
          404,
        );
      if (committed.has(input.previewId))
        fail(
          'REPORT_CARD_PREVIEW_ALREADY_COMMITTED',
          'This generation preview was already committed.',
        );
      if (preview.schoolId !== schoolId || preview.examId !== examId)
        fail(
          'REPORT_CARD_PREVIEW_SCOPE_MISMATCH',
          'Preview is outside this Exam.',
          403,
        );
      if (isGenerationPreviewExpired(preview, now()))
        fail(
          'REPORT_CARD_PREVIEW_EXPIRED',
          'Generation preview expired. Preview again.',
        );
      const template = templateFor(schoolId, preview.templateId);
      if (!canTemplateGenerate(template))
        fail(
          'REPORT_CARD_TEMPLATE_NOT_ACTIVE',
          'Template is no longer active.',
          422,
        );
      const active = activePublications(schoolId, examId);
      const sourceUpdatedAt = Math.max(
        ...preview.items
          .map(item =>
            active.find(value => value.id === item.publishedResultSnapshotId),
          )
          .filter((item): item is PublishedResultSnapshot => !!item)
          .map(item => Date.parse(item.publishedAt)),
        0,
      ).toString();
      if (sourceUpdatedAt !== preview.sourcePublicationUpdatedAt)
        fail(
          'STALE_PUBLISHED_RESULT',
          'Published Result source changed after preview. Preview again.',
          409,
        );
      const candidates = preview.items
        .map(item =>
          active.find(result => result.id === item.publishedResultSnapshotId),
        )
        .filter((item): item is PublishedResultSnapshot => !!item);
      const session = sessionFor(
        schoolId,
        candidates[0]?.academicSessionId ?? '',
      );
      if (session.status === 'CLOSED')
        fail(
          'CLOSED_SESSION_REPORT_CARD_GENERATION',
          'Closed Sessions are read-only.',
        );
      const transaction = reportCardRepository.snapshot();
      try {
        const at = now();
        const runId = `report-run-${reportCardRepository.nextSequence()}`;
        const run: ReportCardGenerationRun = {
          academicSessionId: session.id,
          branchId: candidates[0]?.branchId ?? '',
          classConfigurationIds: [
            ...new Set(
              candidates.map(
                item => item.overallResult.examClassConfigurationId,
              ),
            ),
          ],
          createdAt: at,
          examId,
          existingCount: 0,
          failedCount: 0,
          generatedCount: 0,
          id: runId,
          publicationBatchId: preview.publicationBatchId,
          requestedAt: at,
          requestedByName: input.requestedByName,
          requestedByUserId: input.requestedByUserId,
          schoolId,
          scope: preview.scope,
          sectionIds: [
            ...new Set(candidates.map(item => item.sectionNameSnapshot)),
          ],
          skippedCount: 0,
          status: 'PROCESSING',
          studentIds: candidates.map(item => item.studentId),
          templateId: template.id,
          totalCandidates: preview.candidateCount,
        };
        reportCardRepository.setRuns([...reportCardRepository.runs(), run]);
        const items: ReportCardGenerationResultItem[] = [];
        for (const item of preview.items) {
          if (item.existingReportCardId) {
            run.existingCount++;
            items.push({
              message: 'Existing Report Card returned.',
              publishedResultSnapshotId: item.publishedResultSnapshotId,
              reportCardId: item.existingReportCardId,
              status: 'EXISTING',
              studentId: item.studentId,
            });
            continue;
          }
          const result = candidates.find(
            value => value.id === item.publishedResultSnapshotId,
          );
          if (!result) {
            run.skippedCount++;
            items.push({
              message: 'Published Result is no longer active.',
              publishedResultSnapshotId: item.publishedResultSnapshotId,
              status: 'SKIPPED',
              studentId: item.studentId,
            });
            continue;
          }
          if (input.simulateFailedStudentIds?.includes(item.studentId)) {
            run.failedCount++;
            items.push({
              message: 'Simulated isolated document preparation failure.',
              publishedResultSnapshotId: result.id,
              status: 'FAILED',
              studentId: result.studentId,
            });
            continue;
          }
          const school = schoolFor(schoolId);
          const branch = branchFor(schoolId, result.branchId);
          const sequence = reportCardRepository.nextSequence();
          const version = deriveReportCardVersion(
            reportCardRepository.cards(),
            result.studentId,
            result.examId,
          );
          const examCode =
            INITIAL_EXAMS.find(examItem => examItem.id === result.examId)
              ?.code ??
            result.examTypeNameSnapshot.replace(/[^A-Za-z0-9]+/g, '_');
          const number = formatReportCardNumber({
            branchCode: branch.code,
            examCode,
            sequence,
            sessionLabel: session.name,
          });
          const card = buildReportCardSnapshot({
            academicSessionName: session.name,
            branchSnapshot: {
              address: address(branch.address),
              code: branch.code,
              name: branch.name,
            },
            generatedAt: at,
            generatedByName: input.requestedByName,
            generatedByUserId: input.requestedByUserId,
            generationRunId: runId,
            gradingSchemeSnapshot: {
              bands: clone(INITIAL_GRADING_SCHEMES[0].bands),
              code: INITIAL_GRADING_SCHEMES[0].code,
              name: INITIAL_GRADING_SCHEMES[0].name,
            },
            id: `report-card-${sequence}`,
            publishedResult: result,
            reportCardNumber: number,
            schoolSnapshot: {
              address: address(school.address),
              code: school.code,
              email: school.email,
              logoUrl: school.logoUrl,
              name: school.name,
              phone: school.mobile,
            },
            template,
            version,
          });
          reportCardRepository.setCards([
            ...reportCardRepository.cards(),
            card,
          ]);
          run.generatedCount++;
          items.push({
            message: 'Report Card generated and made available.',
            publishedResultSnapshotId: result.id,
            reportCardId: card.id,
            reportCardNumber: card.reportCardNumber,
            status: 'CREATED',
            studentId: result.studentId,
          });
        }
        if (failNextGeneration || input.simulateAtomicFailure) {
          failNextGeneration = false;
          fail(
            'ATOMIC_REPORT_CARD_GENERATION_FAILURE',
            'Report Card generation failed and was rolled back.',
            500,
          );
        }
        run.status = run.failedCount ? 'PARTIALLY_COMPLETED' : 'COMPLETED';
        run.completedAt = at;
        reportCardRepository.setRunItems(runId, items);
        committed.add(input.previewId);
        createMockReportCardNotifications(
          reportCardRepository
            .cards()
            .filter(card => items.some(item => item.reportCardId === card.id)),
        );
        if (run.generatedCount)
          reportCardRepository.setTemplates(
            reportCardRepository.templates().map(item =>
              item.id === template.id
                ? {
                    ...item,
                    activeUsageCount:
                      item.activeUsageCount + run.generatedCount,
                  }
                : item,
            ),
          );
        return success(
          { items, run },
          'Report Card generation committed atomically.',
        );
      } catch (error) {
        reportCardRepository.restore(transaction);
        throw error;
      }
    },
    async getGenerationHistory(schoolId, examId, query = {}) {
      schoolFor(schoolId);
      const values = reportCardRepository
        .runs()
        .filter(
          item =>
            item.schoolId === schoolId &&
            item.examId === examId &&
            (!query.status ||
              query.status === 'ALL' ||
              item.status === query.status),
        );
      return success(
        paginate(values, query.page, query.pageSize),
        'Generation history loaded.',
      );
    },
    async getGenerationRun(schoolId, id) {
      const run =
        reportCardRepository
          .runs()
          .find(item => item.id === id && item.schoolId === schoolId) ??
        fail(
          'REPORT_CARD_GENERATION_RUN_NOT_FOUND',
          'Generation Run was not found.',
          404,
        );
      return success(
        { items: reportCardRepository.runItems(id), run },
        'Generation Run loaded.',
      );
    },
    async getReportCards(schoolId, query = {}) {
      schoolFor(schoolId);
      syncInvalidations();
      const search = query.search?.trim().toLowerCase();
      const values = reportCardRepository
        .cards()
        .filter(
          item =>
            item.schoolId === schoolId &&
            (!query.branchId || item.branchId === query.branchId) &&
            (!query.academicSessionId ||
              item.academicSessionId === query.academicSessionId) &&
            (!query.examId || item.examId === query.examId) &&
            (!query.generationRunId ||
              item.generationRunId === query.generationRunId) &&
            (!query.status ||
              query.status === 'ALL' ||
              item.status === query.status) &&
            (!query.documentStatus ||
              query.documentStatus === 'ALL' ||
              item.documentStatus === query.documentStatus) &&
            (!query.className ||
              item.studentSnapshot.className === query.className) &&
            (!query.sectionName ||
              item.studentSnapshot.sectionName === query.sectionName) &&
            (!search ||
              `${item.studentSnapshot.name} ${item.studentSnapshot.admissionNumber} ${item.reportCardNumber}`
                .toLowerCase()
                .includes(search)),
        );
      return success(
        paginate(values, query.page, query.pageSize),
        'Report Cards loaded.',
      );
    },
    async getReportCard(schoolId, id) {
      syncInvalidations();
      return success(cardFor(schoolId, id), 'Report Card loaded.');
    },
    async getReportCardDocument(schoolId, id) {
      return reportCardDocumentService.getDocumentStatus(schoolId, id);
    },
    async revokeReportCard(schoolId, id, input) {
      const card = cardFor(schoolId, id);
      if (!input.reason.trim())
        fail(
          'REPORT_CARD_REVOCATION_REASON_REQUIRED',
          'Revocation reason is required.',
          422,
        );
      if (card.status === 'REVOKED')
        fail('REPORT_CARD_ALREADY_REVOKED', 'Report Card is already revoked.');
      card.status = 'REVOKED';
      card.revocationReason = input.reason.trim();
      card.revokedAt = now();
      card.revokedByUserId = input.actingUserId;
      card.revokedByName = input.actingUserName;
      card.updatedAt = now();
      return success(
        card,
        'Report Card revoked and hidden from self-service access.',
      );
    },
    async getParentPublishedResults(schoolId, membershipId, studentId) {
      schoolFor(schoolId);
      const linked = INITIAL_PARENT_STUDENT_LINKS.filter(
        item =>
          item.schoolId === schoolId &&
          item.parentMembershipId === membershipId &&
          item.status === 'ACTIVE',
      ).map(item => item.studentId);
      if (studentId) ensureParent(schoolId, membershipId, studentId);
      const values = activePublications(schoolId).filter(
        item =>
          linked.includes(item.studentId) &&
          (!studentId || item.studentId === studentId),
      );
      return success(
        values.map(item =>
          mapPublishedResultSummary(
            item,
            visibleCardForResult(item),
            sessionFor(schoolId, item.academicSessionId).name,
          ),
        ),
        'Parent published Results loaded.',
      );
    },
    async getParentPublishedResult(schoolId, membershipId, id) {
      const result =
        activePublications(schoolId).find(item => item.id === id) ??
        fail(
          'PUBLISHED_RESULT_NOT_FOUND',
          'Published Result was not found.',
          404,
        );
      ensureParent(schoolId, membershipId, result.studentId);
      return success(selfDetails(result), 'Parent Result details loaded.');
    },
    async getParentReportCards(schoolId, membershipId, studentId) {
      if (studentId) ensureParent(schoolId, membershipId, studentId);
      const linked = INITIAL_PARENT_STUDENT_LINKS.filter(
        item =>
          item.schoolId === schoolId &&
          item.parentMembershipId === membershipId &&
          item.status === 'ACTIVE',
      ).map(item => item.studentId);
      return success(
        latestVisibleReportCards(
          reportCardRepository
            .cards()
            .filter(
              item =>
                linked.includes(item.studentId) &&
                (!studentId || item.studentId === studentId),
            ),
          publications(),
        ).map(redactReportCardForSelfService),
        'Parent Report Cards loaded.',
      );
    },
    async getParentReportCard(schoolId, membershipId, id) {
      const card = cardFor(schoolId, id);
      ensureParent(schoolId, membershipId, card.studentId);
      const visibility = reportCardVisibility(
        card,
        publications().find(item => item.id === card.publishedResultSnapshotId),
      );
      if (!visibility.visible)
        fail(
          'REPORT_CARD_SELF_SERVICE_UNAVAILABLE',
          visibility.reason ?? 'Report Card is unavailable.',
          404,
        );
      return success(
        redactReportCardForSelfService(card),
        'Parent Report Card loaded.',
      );
    },
    async getStudentPublishedResults(schoolId, membershipId) {
      const member =
        memberships.find(
          item => item.id === membershipId && item.role === 'STUDENT',
        ) ??
        fail(
          'STUDENT_MEMBERSHIP_NOT_FOUND',
          'Student membership was not found.',
          404,
        );
      ensureStudent(schoolId, membershipId, member.studentId ?? '');
      return success(
        activePublications(schoolId)
          .filter(item => item.studentId === member.studentId)
          .map(item =>
            mapPublishedResultSummary(
              item,
              visibleCardForResult(item),
              sessionFor(schoolId, item.academicSessionId).name,
            ),
          ),
        'Student published Results loaded.',
      );
    },
    async getStudentPublishedResult(schoolId, membershipId, id) {
      const result =
        activePublications(schoolId).find(item => item.id === id) ??
        fail(
          'PUBLISHED_RESULT_NOT_FOUND',
          'Published Result was not found.',
          404,
        );
      ensureStudent(schoolId, membershipId, result.studentId);
      return success(selfDetails(result), 'Student Result details loaded.');
    },
    async getStudentReportCards(schoolId, membershipId) {
      const member =
        memberships.find(
          item => item.id === membershipId && item.role === 'STUDENT',
        ) ??
        fail(
          'STUDENT_MEMBERSHIP_NOT_FOUND',
          'Student membership was not found.',
          404,
        );
      ensureStudent(schoolId, membershipId, member.studentId ?? '');
      return success(
        latestVisibleReportCards(
          reportCardRepository
            .cards()
            .filter(item => item.studentId === member.studentId),
          publications(),
        ).map(redactReportCardForSelfService),
        'Student Report Cards loaded.',
      );
    },
    async getStudentReportCard(schoolId, membershipId, id) {
      const card = cardFor(schoolId, id);
      ensureStudent(schoolId, membershipId, card.studentId);
      const visibility = reportCardVisibility(
        card,
        publications().find(item => item.id === card.publishedResultSnapshotId),
      );
      if (!visibility.visible)
        fail(
          'REPORT_CARD_SELF_SERVICE_UNAVAILABLE',
          visibility.reason ?? 'Report Card is unavailable.',
          404,
        );
      return success(
        redactReportCardForSelfService(card),
        'Student Report Card loaded.',
      );
    },
  };
}
export const mockReportCardService = createMockReportCardService();
