import { ApiClientError } from '../../src/services/api/apiError';
import { clearExamLifecycleStatus } from '../../src/services/examinationSetup/examinationLifecycleRepository';
import { createMockExaminationSetupService } from '../../src/services/examinationSetup/mockExaminationSetupService';
import { createMockMarksResultService } from '../../src/services/marksResult/mockMarksResultService';

const school = 'school-omt';
const branch = 'branch-main';
const session = 'session-school-omt-current';
const exam = 'exam-omt-scheduled';
const code = async (value: Promise<unknown>) => {
  try {
    await value;
    return undefined;
  } catch (error) {
    return (error as ApiClientError).code;
  }
};

async function calculateComplete(
  service: ReturnType<typeof createMockMarksResultService>,
) {
  const sheet = (await service.getMarkSheets(school, exam)).data.items[0];
  const details = (await service.getMarkSheet(school, exam, sheet.id)).data;
  const draft = (
    await service.saveMarkSheetDraft(school, exam, sheet.id, {
      expectedVersion: details.version,
      marks: details.students.map(student => ({
        attendanceStatus: 'PRESENT',
        componentMarks: student.mark.componentMarks.map(component => ({
          assessmentComponentId: component.assessmentComponentId,
          marksObtained: Math.min(
            component.maximumMarksSnapshot,
            (component.passMarksSnapshot ?? 0) + 1,
          ),
        })),
        expectedVersion: student.mark.version,
        studentId: student.studentId,
      })),
    })
  ).data;
  const submitted = (
    await service.submitMarkSheet(school, exam, sheet.id, {
      expectedVersion: draft.version,
    })
  ).data;
  await service.lockMarkSheet(school, exam, sheet.id, {
    expectedVersion: submitted.version,
  });
  const calculationInput = { scope: 'COMPLETE_EXAM' as const };
  const preview = (
    await service.previewResultCalculation(school, exam, calculationInput)
  ).data;
  const calculated = (
    await service.calculateResults(school, exam, {
      ...calculationInput,
      previewId: preview.previewId,
    })
  ).data;
  return { calculated, sheet };
}

describe('Mock Marks and Results service', () => {
  beforeEach(() => clearExamLifecycleStatus());
  it('derives eligible students from enrollment history and lists scoped Mark Sheets', async () => {
    const service = createMockMarksResultService();
    const page = (await service.getMarkSheets(school, exam)).data;
    expect(page.items).toHaveLength(1);
    const sheet = (await service.getMarkSheet(school, exam, page.items[0].id))
      .data;
    expect(sheet.students).toHaveLength(4);
    expect(sheet.students.map(item => item.studentId)).toEqual(
      expect.arrayContaining([
        'student-aarav',
        'student-saanvi',
        'student-reyansh',
        'student-tara',
      ]),
    );
  });
  it('saves atomically, records attendance history, transitions lifecycle, and detects versions', async () => {
    const service = createMockMarksResultService();
    const id = (await service.getMarkSheets(school, exam)).data.items[0].id;
    const before = (await service.getMarkSheet(school, exam, id)).data;
    const marks = before.students.map(item => ({
      attendanceStatus:
        item.studentId === 'student-saanvi'
          ? ('ABSENT' as const)
          : ('PRESENT' as const),
      componentMarks: item.mark.componentMarks.map(component => ({
        assessmentComponentId: component.assessmentComponentId,
        marksObtained:
          item.studentId === 'student-saanvi'
            ? undefined
            : Math.min(
                component.maximumMarksSnapshot,
                (component.passMarksSnapshot ?? 0) + 1,
              ),
      })),
      expectedVersion: item.mark.version,
      studentId: item.studentId,
    }));
    const saved = (
      await service.saveMarkSheetDraft(school, exam, id, {
        expectedVersion: before.version,
        marks,
      })
    ).data;
    expect(saved.status).toBe('DRAFT');
    expect(service.getExamStatus(exam)).toBe('IN_PROGRESS');
    const examination = createMockExaminationSetupService();
    expect(await code(examination.returnExamToDraft(school, exam))).toBe(
      'INVALID_EXAM_TRANSITION',
    );
    expect(
      await code(
        examination.cancelExam(school, exam, { reason: 'No longer needed' }),
      ),
    ).toBe('INVALID_EXAM_TRANSITION');
    expect(
      (await service.getMarkSheetHistory(school, exam, id)).data.some(
        item => item.action === 'STUDENT_MARK_MARKED_ABSENT',
      ),
    ).toBe(true);
    expect(
      await code(
        service.saveMarkSheetDraft(school, exam, id, {
          expectedVersion: before.version,
          marks,
        }),
      ),
    ).toBe('MARKS_VERSION_CONFLICT');
  });
  it('rolls back an injected Draft-save failure', async () => {
    const service = createMockMarksResultService({ failNextDraftSave: true });
    const page = (await service.getMarkSheets(school, exam)).data;
    const before = (await service.getMarkSheet(school, exam, page.items[0].id))
      .data;
    const marks = before.students.map(item => ({
      attendanceStatus: 'PRESENT' as const,
      componentMarks: item.mark.componentMarks.map(component => ({
        assessmentComponentId: component.assessmentComponentId,
        marksObtained: Math.min(
          component.maximumMarksSnapshot,
          (component.passMarksSnapshot ?? 0) + 1,
        ),
      })),
      expectedVersion: item.mark.version,
      studentId: item.studentId,
    }));
    expect(
      await code(
        service.saveMarkSheetDraft(school, exam, before.id, {
          expectedVersion: before.version,
          marks,
        }),
      ),
    ).toBe('ATOMIC_DRAFT_SAVE_FAILURE');
    expect(
      (await service.getMarkSheet(school, exam, before.id)).data.status,
    ).toBe('NOT_STARTED');
  });
  it('enforces submit/lock/unlock transitions and stale-result rules', async () => {
    const service = createMockMarksResultService({
      seedState: 'COMPLETE_DRAFT',
    });
    const sheet = (await service.getMarkSheets(school, exam)).data.items[0];
    const submitted = (
      await service.submitMarkSheet(school, exam, sheet.id, {
        expectedVersion: sheet.version,
      })
    ).data;
    const locked = (
      await service.lockMarkSheet(school, exam, sheet.id, {
        expectedVersion: submitted.version,
      })
    ).data;
    expect(locked.status).toBe('LOCKED');
    expect(
      await code(
        service.unlockMarkSheet(school, exam, sheet.id, { reason: '' }),
      ),
    ).toBe('UNLOCK_REASON_REQUIRED');
    expect(
      (
        await service.unlockMarkSheet(school, exam, sheet.id, {
          reason: 'Correction',
        })
      ).data.status,
    ).toBe('DRAFT');
  });
  it('previews without mutation and calculates a scoped Result atomically', async () => {
    const service = createMockMarksResultService({ seedState: 'LOCKED' });
    const input = {
      scope: 'ONE_STUDENT' as const,
      studentId: 'student-reyansh',
    };
    const first = (await service.previewResultCalculation(school, exam, input))
      .data;
    const second = (await service.previewResultCalculation(school, exam, input))
      .data;
    expect(first.sourceVersions).toEqual(second.sourceVersions);
    const result = (
      await service.calculateResults(school, exam, {
        ...input,
        previewId: first.previewId,
      })
    ).data;
    expect(result.overallResults).toHaveLength(1);
    expect(result.overallResults[0].studentId).toBe('student-reyansh');
  });
  it('rolls back atomic calculation failure', async () => {
    const service = createMockMarksResultService({
      failNextCalculation: true,
      seedState: 'LOCKED',
    });
    const input = {
      scope: 'ONE_STUDENT' as const,
      studentId: 'student-reyansh',
    };
    const preview = (
      await service.previewResultCalculation(school, exam, input)
    ).data;
    expect(
      await code(
        service.calculateResults(school, exam, {
          ...input,
          previewId: preview.previewId,
        }),
      ),
    ).toBe('ATOMIC_RESULT_CALCULATION_FAILURE');
    expect(
      await code(service.getStudentResult(school, exam, input.studentId)),
    ).toBe('STUDENT_RESULT_NOT_FOUND');
  });
  it('reviews, publishes immutable snapshots, blocks unlock, and preserves unpublication history', async () => {
    const service = createMockMarksResultService({
      seedState: 'COMPLETE_DRAFT',
    });
    const { calculated, sheet } = await calculateComplete(service);
    const overall = calculated.overallResults[0];
    await service.reviewResults(school, exam, {
      calculationRunId: calculated.run.id,
      examClassConfigurationId: overall.examClassConfigurationId,
      reviewScope: 'CLASS',
    });
    expect(service.getExamStatus(exam)).toBe('COMPLETED');
    const batch = (
      await service.publishResults(school, exam, {
        actingUserId: 'actor',
        actingUserName: 'Admin',
        calculationRunId: calculated.run.id,
        scope: 'COMPLETE_EXAM',
      })
    ).data;
    expect(service.getPublishedSnapshots()).toHaveLength(4);
    expect(
      await code(
        service.unlockMarkSheet(school, exam, sheet.id, {
          reason: 'Correction',
        }),
      ),
    ).toBe('PUBLISHED_RESULT_UNLOCK_REJECTED');
    const unpublished = (
      await service.unpublishResults(school, exam, batch.id, {
        actingUserId: 'actor',
        actingUserName: 'Admin',
        reason: 'Correction required',
      })
    ).data;
    expect(unpublished.status).toBe('UNPUBLISHED');
    expect(service.getPublishedSnapshots()[0].status).toBe('UNPUBLISHED');
    expect(
      (await service.getPublicationHistory(school, exam)).data,
    ).toHaveLength(1);
    await service.unlockMarkSheet(school, exam, sheet.id, {
      reason: 'Correct source Marks',
    });
    expect(
      (await service.getStudentResult(school, exam, overall.studentId)).data
        .overallResult.resultStatus,
    ).toBe('STALE');
    expect(service.getExamStatus(exam)).toBe('IN_PROGRESS');
  });
  it('rolls back publication atomically', async () => {
    const service = createMockMarksResultService({
      failNextPublication: true,
      seedState: 'COMPLETE_DRAFT',
    });
    const { calculated } = await calculateComplete(service);
    const overall = calculated.overallResults[0];
    await service.reviewResults(school, exam, {
      calculationRunId: calculated.run.id,
      examClassConfigurationId: overall.examClassConfigurationId,
      reviewScope: 'CLASS',
    });
    expect(
      await code(
        service.publishResults(school, exam, {
          actingUserId: 'actor',
          actingUserName: 'Admin',
          calculationRunId: calculated.run.id,
          scope: 'COMPLETE_EXAM',
        }),
      ),
    ).toBe('PUBLICATION_FAILURE_ROLLBACK');
    expect(service.getPublishedSnapshots()).toEqual([]);
    expect((await service.getPublicationHistory(school, exam)).data).toEqual(
      [],
    );
  });
  it('rejects cross-School, cross-Branch and closed-session mutations', async () => {
    const service = createMockMarksResultService();
    expect(
      await code(
        service.getMarksDashboard('school-greenfield', branch, session, exam),
      ),
    ).toBe('EXAM_SCOPE_MISMATCH');
    expect(
      await code(service.getMarksDashboard(school, 'other', session, exam)),
    ).toBe('BRANCH_SCOPE_MISMATCH');
    expect(
      await code(
        service.saveMarkSheetDraft(school, 'exam-omt-closed-history', 'none', {
          expectedVersion: 1,
          marks: [],
        }),
      ),
    ).toBe('CLOSED_ACADEMIC_SESSION');
  });
});
