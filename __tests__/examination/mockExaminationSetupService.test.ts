import { ApiClientError } from '../../src/services/api/apiError';
import { createMockExaminationSetupService } from '../../src/services/examinationSetup/mockExaminationSetupService';
import { INITIAL_ACADEMIC_SESSIONS } from '../../src/services/organization/organizationFixtures';

const schoolId = 'school-omt';
const branchId = 'branch-main';
const sessionId = 'session-school-omt-current';
const baseExam = {
  academicSessionId: sessionId,
  branchId,
  code: 'NEW-EXAM',
  endDate: '2026-08-20',
  examTypeId: 'exam-type-unit',
  name: 'New Exam',
  startDate: '2026-08-16',
  termId: 'term-omt-current-1',
};

async function code(promise: Promise<unknown>) {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return (error as ApiClientError).code;
  }
}

describe('Mock Examination Setup service', () => {
  it('lists, searches, and paginates Exams and setup resources', async () => {
    const service = createMockExaminationSetupService();
    expect(
      (await service.getExamTerms(schoolId, sessionId)).data.items,
    ).toHaveLength(2);
    expect(
      (await service.getExamTypes(schoolId, { search: 'annual' })).data.items,
    ).toHaveLength(1);
    expect((await service.getGradingSchemes(schoolId)).data.items).toHaveLength(
      2,
    );
    expect(
      (
        await service.getExams(schoolId, branchId, sessionId, {
          page: 1,
          pageSize: 2,
        })
      ).data.items,
    ).toHaveLength(2);
  });

  it('creates and updates a Term and rejects duplicate/overlapping Terms', async () => {
    const service = createMockExaminationSetupService();
    const next = INITIAL_ACADEMIC_SESSIONS.find(
      item => item.id === 'session-school-omt-next',
    )!;
    const input = {
      code: 'FIRST',
      displayOrder: 1,
      endDate: next.endDate,
      name: 'First Term',
      startDate: next.startDate,
      status: 'ACTIVE' as const,
    };
    const created = (await service.createExamTerm(schoolId, next.id, input))
      .data;
    expect(created.code).toBe('FIRST');
    expect(
      (
        await service.updateExamTerm(schoolId, next.id, created.id, {
          ...input,
          name: 'Updated Term',
        })
      ).data.name,
    ).toBe('Updated Term');
    expect(
      await code(
        service.createExamTerm(schoolId, next.id, {
          ...input,
          code: 'OTHER',
          name: 'Overlap',
        }),
      ),
    ).toBe('INVALID_EXAM_TERM');
  });

  it('protects referenced Term, Exam Type, and Grading Scheme deactivation', async () => {
    const service = createMockExaminationSetupService();
    expect(
      await code(
        service.updateExamTermStatus(
          schoolId,
          sessionId,
          'term-omt-current-1',
          'INACTIVE',
        ),
      ),
    ).toBe('EXAM_TERM_IN_USE');
    expect(
      await code(
        service.updateExamTypeStatus(schoolId, 'exam-type-unit', 'INACTIVE'),
      ),
    ).toBe('EXAM_TYPE_IN_USE');
    expect(
      await code(
        service.updateGradingSchemeStatus(
          schoolId,
          'grading-omt-default',
          'INACTIVE',
        ),
      ),
    ).toBe('GRADING_SCHEME_IN_USE');
  });

  it('keeps incomplete grading drafts but validates activation and default uniqueness', async () => {
    const service = createMockExaminationSetupService();
    const draft = (
      await service.createGradingScheme(schoolId, {
        bands: [],
        code: 'EMPTY',
        isDefault: false,
        name: 'Empty Draft',
        status: 'DRAFT',
      })
    ).data;
    expect(draft.status).toBe('DRAFT');
    expect(
      await code(
        service.updateGradingSchemeStatus(schoolId, draft.id, 'ACTIVE'),
      ),
    ).toBe('INVALID_GRADE_BANDS');
  });

  it('creates an atomic Draft, prevents duplicate codes, and rolls back injected failure', async () => {
    const service = createMockExaminationSetupService();
    const created = (await service.createExam(schoolId, baseExam)).data;
    expect(created.status).toBe('DRAFT');
    expect(
      await code(
        service.createExam(schoolId, { ...baseExam, name: 'Duplicate' }),
      ),
    ).toBe('INVALID_EXAM');
    const failing = createMockExaminationSetupService({
      failNextAtomicCreation: true,
    });
    expect(await code(failing.createExam(schoolId, baseExam))).toBe(
      'ATOMIC_EXAM_CREATION_FAILURE',
    );
    expect(
      (
        await failing.getExams(schoolId, branchId, sessionId, {
          search: 'NEW-EXAM',
        })
      ).data.totalItems,
    ).toBe(0);
  });

  it('validates setup, schedules a complete Exam, and returns it to Draft', async () => {
    const service = createMockExaminationSetupService({
      now: () => '2026-07-31T10:00:00.000Z',
    });
    expect(
      (await service.validateExamSetup(schoolId, 'exam-omt-complete-draft'))
        .data.isComplete,
    ).toBe(true);
    expect(
      (await service.scheduleExam(schoolId, 'exam-omt-complete-draft')).data
        .status,
    ).toBe('SCHEDULED');
    expect(
      (await service.returnExamToDraft(schoolId, 'exam-omt-complete-draft'))
        .data.status,
    ).toBe('DRAFT');
    expect(await code(service.scheduleExam(schoolId, 'exam-omt-draft'))).toBe(
      'INCOMPLETE_EXAM_SETUP',
    );
  });

  it('rolls back a rejected schedule update atomically', async () => {
    const service = createMockExaminationSetupService();
    const before = await service.getExam(
      schoolId,
      branchId,
      sessionId,
      'exam-omt-complete-draft',
    );
    const paper = before.data.subjectPapers[0];
    expect(
      await code(
        service.updateExamSchedule(schoolId, before.data.id, {
          schedules: [
            {
              durationMinutes: 60,
              examDate: '2030-01-01',
              paperId: paper.id,
              startTime: '09:00',
            },
          ],
        }),
      ),
    ).toBe('BLOCKING_SCHEDULE_CONFLICT');
    const after = await service.getExam(
      schoolId,
      branchId,
      sessionId,
      before.data.id,
    );
    expect(after.data.subjectPapers[0].examDate).toBe(paper.examDate);
  });

  it('previews/copies without scheduling and cancels with a reason', async () => {
    const service = createMockExaminationSetupService();
    const preview = (
      await service.previewCopyExam(schoolId, 'exam-omt-complete-draft', {
        destinationAcademicSessionId: sessionId,
        destinationBranchId: branchId,
        destinationTermId: 'term-omt-current-2',
      })
    ).data;
    expect(preview.matchedClassCount).toBe(1);
    const copied = (
      await service.copyExam(schoolId, 'exam-omt-complete-draft', {
        code: 'COPY-1',
        destinationAcademicSessionId: sessionId,
        destinationBranchId: branchId,
        destinationTermId: 'term-omt-current-2',
        name: 'Copied Exam',
      })
    ).data.exam;
    expect(copied.status).toBe('DRAFT');
    expect(copied.classConfigurationCount).toBe(1);
    expect(copied.subjectPaperCount).toBe(1);
    expect(copied.subjectPapers[0].examDate).toBeUndefined();
    expect(
      await code(service.cancelExam(schoolId, copied.id, { reason: '' })),
    ).toBe('CANCELLATION_REASON_REQUIRED');
    expect(
      (
        await service.cancelExam(schoolId, copied.id, {
          actingUserId: 'actor',
          reason: 'Calendar changed',
        })
      ).data.status,
    ).toBe('CANCELLED');
  });

  it('rejects closed-session, cross-School, cross-Branch, invalid Subject and conflicts', async () => {
    const service = createMockExaminationSetupService();
    expect(
      await code(
        service.cancelExam(schoolId, 'exam-omt-closed-history', {
          reason: 'No',
        }),
      ),
    ).toBe('CLOSED_ACADEMIC_SESSION');
    expect(
      await code(
        service.getExam(schoolId, 'other-branch', sessionId, 'exam-omt-draft'),
      ),
    ).toBe('BRANCH_SCOPE_MISMATCH');
    expect(
      await code(
        service.getExam(
          'school-greenfield',
          branchId,
          sessionId,
          'exam-omt-draft',
        ),
      ),
    ).toBe('EXAM_NOT_FOUND');
    expect(
      await code(
        service.updateExamSubjectPapers(
          schoolId,
          'exam-omt-complete-draft',
          'exam-config-complete-c01',
          {
            papers: [
              {
                components: [
                  {
                    displayOrder: 1,
                    marksEntryRequired: true,
                    maximumMarks: 100,
                    name: 'Theory',
                    passMarks: 40,
                    type: 'THEORY',
                  },
                ],
                displayOrder: 1,
                subjectId: 'subject-omt-mus',
                totalMaximumMarks: 100,
                totalPassMarks: 40,
              },
            ],
          },
        ),
      ),
    ).toBe('SUBJECT_NOT_ELIGIBLE');
  });
});
