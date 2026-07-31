import type { UserMembership } from '../../src/models/auth';
import type { ExaminationSetupService } from '../../src/services/examinationSetup/examinationSetupService';
import { createMockExaminationSetupService } from '../../src/services/examinationSetup/mockExaminationSetupService';
import { createExaminationSetupStore } from '../../src/store/examinationSetup/examinationSetupStore';
import { getEffectivePermissions } from '../../src/utils/effectivePermissions';

const admin: UserMembership = {
  branchId: 'branch-main',
  id: 'admin',
  role: 'SCHOOL_ADMIN',
  schoolId: 'school-omt',
  status: 'ACTIVE',
  userId: 'actor',
};
const accountant: UserMembership = {
  ...admin,
  id: 'accountant',
  role: 'ACCOUNTANT',
};
const context = {
  academicSessionId: 'session-school-omt-current',
  branchId: 'branch-main',
  schoolId: 'school-omt',
  sessionStatus: 'ACTIVE' as const,
};
const create = (
  actor = admin,
  service: ExaminationSetupService = createMockExaminationSetupService(),
) =>
  createExaminationSetupStore({
    getMembership: () => actor,
    getPermissions: membership => getEffectivePermissions(membership.role),
    service,
  });

describe('Examination Setup store', () => {
  it('initializes context and loads independently-scoped setup data', async () => {
    const store = create();
    store.getState().setContext(context);
    expect(await store.getState().loadSummary()).toBe(true);
    expect(await store.getState().loadTerms()).toBe(true);
    expect(await store.getState().loadExamTypes()).toBe(true);
    expect(await store.getState().loadGradingSchemes()).toBe(true);
    expect(await store.getState().loadExams()).toBe(true);
    expect(store.getState().summary).not.toBeNull();
    expect(store.getState().exams.items.length).toBeGreaterThan(0);
  });

  it('clears Branch/Session data and School data at the correct context boundary', async () => {
    const store = create();
    store.getState().setContext(context);
    await store.getState().loadExamTypes();
    await store.getState().loadExams();
    store
      .getState()
      .setContext({
        ...context,
        academicSessionId: 'session-school-omt-next',
        sessionStatus: 'UPCOMING',
      });
    expect(store.getState().exams.items).toEqual([]);
    expect(store.getState().examTypes.items.length).toBeGreaterThan(0);
    store.getState().setContext({ ...context, schoolId: 'school-greenfield' });
    expect(store.getState().examTypes.items).toEqual([]);
    expect(store.getState().gradingSchemes.items).toEqual([]);
  });

  it('manages local creation draft and resets it only after success/cancellation', () => {
    const store = create();
    store.getState().setContext(context);
    store.getState().setExamDraft({ code: 'LOCAL', name: 'Local Draft' });
    expect(store.getState().examDraft.code).toBe('LOCAL');
    store.getState().clearCreationDraft();
    expect(store.getState().examDraft).toEqual({});
  });

  it('loads a complete Exam, validates, schedules, returns to Draft, and cancels with permission', async () => {
    const store = create();
    store.getState().setContext(context);
    expect(await store.getState().loadExam('exam-omt-complete-draft')).toBe(
      true,
    );
    expect(await store.getState().validateSetup()).toBe(true);
    expect(store.getState().setupValidation?.isComplete).toBe(true);
    expect(await store.getState().scheduleExam()).toBe(true);
    expect(store.getState().selectedExam?.status).toBe('SCHEDULED');
    expect(await store.getState().returnToDraft()).toBe(true);
    expect(await store.getState().cancelExam('No longer required')).toBe(true);
  });

  it('prevents duplicate in-flight Exam saves', async () => {
    let resolve:
      | ((
          value: Awaited<ReturnType<ExaminationSetupService['createExam']>>,
        ) => void)
      | undefined;
    const base = createMockExaminationSetupService();
    const service: ExaminationSetupService = {
      ...base,
      createExam: () =>
        new Promise(result => {
          resolve = result;
        }),
    };
    const store = create(admin, service);
    store.getState().setContext(context);
    store
      .getState()
      .setExamDraft({
        academicSessionId: context.academicSessionId,
        branchId: context.branchId,
        code: 'ASYNC',
        endDate: '2026-08-20',
        examTypeId: 'exam-type-unit',
        name: 'Async Exam',
        startDate: '2026-08-16',
        termId: 'term-omt-current-1',
      });
    const first = store.getState().saveExam();
    expect(store.getState().isSavingExam).toBe(true);
    expect(await store.getState().saveExam()).toBe(false);
    resolve!(
      await base.createExam(
        context.schoolId,
        store.getState().examDraft as never,
      ),
    );
    expect(await first).toBe(true);
  });

  it('ignores stale responses after a context switch and normalizes errors', async () => {
    let resolve:
      | ((
          value: Awaited<
            ReturnType<ExaminationSetupService['getExaminationSetupSummary']>
          >,
        ) => void)
      | undefined;
    const base = createMockExaminationSetupService();
    const service: ExaminationSetupService = {
      ...base,
      getExaminationSetupSummary: () =>
        new Promise(result => {
          resolve = result;
        }),
    };
    const store = create(admin, service);
    store.getState().setContext(context);
    const pending = store.getState().loadSummary();
    store
      .getState()
      .setContext({
        ...context,
        academicSessionId: 'session-school-omt-next',
        sessionStatus: 'UPCOMING',
      });
    resolve!(
      await base.getExaminationSetupSummary(
        context.schoolId,
        context.branchId,
        context.academicSessionId,
      ),
    );
    expect(await pending).toBe(false);
    expect(store.getState().summary).toBeNull();
    const denied = create(accountant);
    denied.getState().setContext(context);
    expect(await denied.getState().loadSummary()).toBe(false);
    expect(denied.getState().error?.code).toBe('EXAMINATION_ACCESS_DENIED');
  });
});
