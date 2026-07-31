import type { UserMembership } from '../../src/models/auth';
import type { MarksResultService } from '../../src/services/marksResult/marksResultService';
import { createMockMarksResultService } from '../../src/services/marksResult/mockMarksResultService';
import { createMarksResultStore } from '../../src/store/marksResult/marksResultStore';
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
  examId: 'exam-omt-scheduled',
  examStatus: 'SCHEDULED' as const,
  schoolId: 'school-omt',
  sessionStatus: 'ACTIVE' as const,
};
const create = (
  actor = admin,
  service: MarksResultService = createMockMarksResultService(),
) =>
  createMarksResultStore({
    getMembership: () => actor,
    getPermissions: member => getEffectivePermissions(member.role),
    service,
  });

describe('Marks and Results store', () => {
  it('loads dashboard, list, selected sheet and local Marks draft', async () => {
    const store = create();
    store.getState().setContext(context);
    expect(await store.getState().loadDashboard()).toBe(true);
    expect(await store.getState().loadMarkSheets()).toBe(true);
    const id = store.getState().markSheets.items[0].id;
    expect(await store.getState().loadMarkSheet(id)).toBe(true);
    expect(store.getState().marksDraft).toHaveLength(4);
    expect(store.getState().dashboard?.totalMarkSheets).toBe(1);
  });
  it('clears Exam-scoped state when context changes', async () => {
    const store = create();
    store.getState().setContext(context);
    await store.getState().loadMarkSheets();
    store.getState().setContext({ ...context, examId: 'another-exam' });
    expect(store.getState().markSheets.items).toEqual([]);
    expect(store.getState().selectedMarkSheet).toBeNull();
  });
  it('preserves unsaved Marks and reports a version conflict', async () => {
    const service = createMockMarksResultService();
    const store = create(admin, service);
    store.getState().setContext(context);
    await store.getState().loadMarkSheets();
    const id = store.getState().markSheets.items[0].id;
    await store.getState().loadMarkSheet(id);
    const selected = store.getState().selectedMarkSheet!;
    await service.saveMarkSheetDraft(context.schoolId, context.examId, id, {
      expectedVersion: selected.version,
      marks: store.getState().marksDraft,
    });
    store
      .getState()
      .setMarksDraft(
        store
          .getState()
          .marksDraft.map((item, index) =>
            index
              ? item
              : {
                  ...item,
                  componentMarks: item.componentMarks.map(component => ({
                    ...component,
                    marksObtained: 7,
                  })),
                },
          ),
      );
    expect(await store.getState().saveDraft()).toBe(false);
    expect(store.getState().error?.code).toBe('MARKS_VERSION_CONFLICT');
    expect(store.getState().hasUnsavedMarks).toBe(true);
    expect(store.getState().marksDraft[0].componentMarks[0].marksObtained).toBe(
      7,
    );
  });
  it('prevents duplicate in-flight loads and ignores stale responses after context changes', async () => {
    let resolve:
      | ((
          value: Awaited<ReturnType<MarksResultService['getMarksDashboard']>>,
        ) => void)
      | undefined;
    const base = createMockMarksResultService();
    const service: MarksResultService = {
      ...base,
      getMarksDashboard: () =>
        new Promise(result => {
          resolve = result;
        }),
    };
    const store = create(admin, service);
    store.getState().setContext(context);
    const pending = store.getState().loadDashboard();
    expect(await store.getState().loadDashboard()).toBe(false);
    store.getState().setContext({ ...context, examId: 'another-exam' });
    resolve!(
      await base.getMarksDashboard(
        context.schoolId,
        context.branchId,
        context.academicSessionId,
        context.examId,
      ),
    );
    expect(await pending).toBe(false);
    expect(store.getState().dashboard).toBeNull();
  });
  it('normalizes role denial and keeps all loading flags independent', async () => {
    const store = create(accountant);
    store.getState().setContext(context);
    expect(await store.getState().loadDashboard()).toBe(false);
    expect(store.getState().error?.code).toBe('MARKS_RESULTS_ACCESS_DENIED');
    expect(store.getState().isLoadingMarksDashboard).toBe(false);
    expect(store.getState().isCalculatingResults).toBe(false);
    expect(store.getState().isPublishingResults).toBe(false);
  });
});
