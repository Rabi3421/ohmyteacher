import type { UserMembership } from '../../src/models/auth';
import type { CommunicationService } from '../../src/services/communication/communicationService';
import {
  mockCommunicationService,
  resetMockCommunicationData,
  setMockCommunicationClock,
} from '../../src/services/communication/mockCommunicationService';
import { resetMockCollectionData } from '../../src/services/collection/mockCollectionService';
import { resetMockFeeDueData } from '../../src/services/feeDue/mockFeeDueService';
import { createCommunicationStore } from '../../src/store/communication/communicationStore';
import { getEffectivePermissions } from '../../src/utils/effectivePermissions';

const admin: UserMembership = {
  branchId: 'branch-main',
  id: 'membership-school-admin',
  role: 'SCHOOL_ADMIN',
  schoolId: 'school-omt',
  status: 'ACTIVE',
  userId: 'user-school-admin',
};
const accountant: UserMembership = {
  ...admin,
  id: 'membership-accountant',
  role: 'ACCOUNTANT',
  userId: 'user-accountant',
};
const parent: UserMembership = {
  ...admin,
  branchId: undefined,
  id: 'membership-parent',
  role: 'PARENT',
  userId: 'user-multiple',
};
const context = {
  academicSessionId: 'session-school-omt-current',
  asOfDate: '2026-07-31',
  branchId: 'branch-main',
  schoolId: 'school-omt',
  sessionStatus: 'ACTIVE' as const,
};
const create = (
  actor: UserMembership = admin,
  service: CommunicationService = mockCommunicationService,
) =>
  createCommunicationStore({
    getActorName: () => 'Test Actor',
    getMembership: () => actor,
    getPermissions: member => getEffectivePermissions(member.role),
    service,
  });

beforeEach(() => {
  resetMockFeeDueData();
  resetMockCollectionData();
  resetMockCommunicationData();
  setMockCommunicationClock(() => '2026-07-31T10:00:00.000Z');
});

describe('Communication store', () => {
  it('loads dashboard/settings and clears scoped data on context/workspace changes', async () => {
    const store = create();
    store.getState().setContext(context);
    expect(await store.getState().loadDashboard()).toBe(true);
    expect(await store.getState().loadSettings()).toBe(true);
    expect(store.getState().dashboard).not.toBeNull();
    store.getState().setContext({
      ...context,
      academicSessionId: 'session-school-omt-next',
    });
    expect(store.getState().dashboard).toBeNull();
    expect(store.getState().settings).not.toBeNull();
    store.getState().setContext({
      ...context,
      schoolId: 'school-greenfield',
    });
    expect(store.getState().settings).toBeNull();
    expect(store.getState().templates.items).toEqual([]);
  });

  it('manages Template and Message drafts and prevents duplicate in-flight sends', async () => {
    const store = create();
    store.getState().setContext(context);
    store.getState().setTemplateDraft({ name: 'Draft name' });
    expect(store.getState().templateDraft.name).toBe('Draft name');
    store.getState().setMessageDraft({
      communicationType: 'UPCOMING_DUE_REMINDER',
      feeDueIds: ['due-rahul-august'],
      mode: 'MANUAL_SHARE',
    });
    expect(await store.getState().previewMessage()).toBe(true);
    const first = store.getState().sendMessage();
    expect(await store.getState().sendMessage()).toBe(false);
    expect(await first).toBe(true);
    expect(store.getState().messageDraft).toEqual({});
    expect(store.getState().messagePreview).toBeNull();
  });

  it('runs Bulk preview/commit once and resets the transient draft', async () => {
    const store = create();
    store.getState().setContext(context);
    store.getState().setBulkDraft({
      academicSessionId: context.academicSessionId,
      branchId: context.branchId,
      dueStatuses: ['OVERDUE'],
      reminderRuleId: 'rule-overdue-weekly',
      scheduledFor: '2026-07-31T09:00:00+05:30',
      sessionStatus: 'ACTIVE',
      templateId: 'template-overdue',
    });
    expect(await store.getState().previewBulk()).toBe(true);
    expect(store.getState().bulkPreview?.eligible).toBeGreaterThan(0);
    expect(await store.getState().commitBulk()).toBe(true);
    expect(store.getState().bulkResult?.providerMode).toBe('DEVELOPMENT_MOCK');
    expect(store.getState().bulkDraft).toEqual({});
  });

  it('updates Reminder status, retries failures and refreshes local lists', async () => {
    const store = create();
    store.getState().setContext(context);
    expect(await store.getState().loadReminderRules()).toBe(true);
    expect(
      await store
        .getState()
        .updateReminderRuleStatus('rule-upcoming-five-days', 'PAUSED'),
    ).toBe(true);
    expect(store.getState().selectedReminderRule?.status).toBe('PAUSED');
    expect(await store.getState().loadFailedCommunications()).toBe(true);
    expect(store.getState().failedCommunications).toHaveLength(1);
    expect(
      await store.getState().retryCommunication('communication-failed-overdue'),
    ).toBe(true);
    expect(store.getState().failedCommunications).toHaveLength(0);
  });

  it('computes unread updates and enforces Parent ownership', async () => {
    const parentStore = create(parent);
    expect(
      await parentStore
        .getState()
        .loadParentNotifications('school-omt', 'membership-parent'),
    ).toBe(true);
    expect(parentStore.getState().parentNotifications).toHaveLength(2);
    expect(
      await parentStore
        .getState()
        .loadParentNotifications('school-omt', 'other-parent'),
    ).toBe(false);
    expect(parentStore.getState().error?.code).toBe(
      'PARENT_NOTIFICATION_FORBIDDEN',
    );
  });

  it('blocks Accountant Template management but permits manual communication', async () => {
    const store = create(accountant);
    store.getState().setContext(context);
    expect(await store.getState().saveTemplate()).toBe(false);
    expect(store.getState().error?.code).toBe('COMMUNICATION_ACCESS_DENIED');
    store.getState().setMessageDraft({
      communicationType: 'UPCOMING_DUE_REMINDER',
      feeDueIds: ['due-rahul-august'],
      mode: 'MANUAL_SHARE',
    });
    expect(await store.getState().previewMessage()).toBe(true);
  });

  it('ignores stale Dashboard responses after context switching', async () => {
    let resolve:
      | ((
          value: Awaited<
            ReturnType<CommunicationService['getCommunicationDashboard']>
          >,
        ) => void)
      | undefined;
    const service: CommunicationService = {
      ...mockCommunicationService,
      getCommunicationDashboard: () =>
        new Promise(result => {
          resolve = result;
        }),
    };
    const store = create(admin, service);
    store.getState().setContext(context);
    const pending = store.getState().loadDashboard();
    store.getState().setContext({ ...context, branchId: 'branch-east' });
    resolve?.(
      await mockCommunicationService.getCommunicationDashboard(
        'school-omt',
        {},
      ),
    );
    expect(await pending).toBe(false);
    expect(store.getState().dashboard).toBeNull();
  });
});
