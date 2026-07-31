import type { CreateMessageTemplateInput } from '../../src/models/communication';
import {
  getMockCommunicationRepositorySnapshot,
  mockCommunicationService,
  resetMockCommunicationData,
  setMockCommunicationClock,
} from '../../src/services/communication/mockCommunicationService';
import { setNextMockManualShareResult } from '../../src/services/communication/mockManualShareService';
import { setNextMockCommunicationProviderStatus } from '../../src/services/communication/mockCommunicationProvider';
import {
  getMockCollectionRepositorySnapshot,
  resetMockCollectionData,
} from '../../src/services/collection/mockCollectionService';
import { resetMockFeeDueData } from '../../src/services/feeDue/mockFeeDueService';

const schoolId = 'school-omt';
const now = '2026-07-31T10:00:00.000Z';
const actor = {
  initiatedByName: 'School Admin',
  initiatedByUserId: 'user-school-admin',
};

beforeEach(() => {
  resetMockFeeDueData();
  resetMockCollectionData();
  resetMockCommunicationData();
  setMockCommunicationClock(() => now);
});

describe('mock Communication service', () => {
  it('creates, updates, soft-deactivates Templates and enforces default uniqueness', async () => {
    const base = getMockCommunicationRepositorySnapshot().templates[0];
    const input: CreateMessageTemplateInput = {
      allowedVariables: base.allowedVariables,
      channel: base.channel,
      code: 'TEST_PAYMENT',
      communicationType: base.communicationType,
      content: base.content,
      includeReceiptLink: base.includeReceiptLink,
      includeSchoolContact: base.includeSchoolContact,
      isDefault: true,
      language: base.language,
      name: 'Test payment confirmation',
      requiredVariables: base.requiredVariables,
      status: base.status,
    };
    const created = await mockCommunicationService.createTemplate(
      schoolId,
      input,
    );
    expect(created.data.code).toBe('TEST_PAYMENT');
    expect(
      getMockCommunicationRepositorySnapshot().templates.find(
        item => item.id === 'template-payment-confirmation',
      )?.isDefault,
    ).toBe(false);
    const updated = await mockCommunicationService.updateTemplate(
      schoolId,
      created.data.id,
      { ...input, name: 'Updated payment confirmation' },
    );
    expect(updated.data.name).toBe('Updated payment confirmation');
    expect(
      (
        await mockCommunicationService.updateTemplateStatus(
          schoolId,
          created.data.id,
          'INACTIVE',
        )
      ).data.status,
    ).toBe('INACTIVE');
    await expect(
      mockCommunicationService.createTemplate(schoolId, input),
    ).rejects.toMatchObject({ code: 'MESSAGE_TEMPLATE_INVALID' });
  });

  it('previews without mutation and records manual handoff without claiming delivery', async () => {
    const before = getMockCommunicationRepositorySnapshot();
    const preview = await mockCommunicationService.previewCommunication(
      schoolId,
      {
        communicationType: 'UPCOMING_DUE_REMINDER',
        feeDueIds: ['due-rahul-august'],
        mode: 'MANUAL_SHARE',
      },
    );
    expect(preview.data.renderedContent).toContain('Rahul Patel');
    expect(getMockCommunicationRepositorySnapshot()).toMatchObject({
      communications: before.communications,
      scheduled: before.scheduled,
    });
    const sent = await mockCommunicationService.sendManualCommunication(
      schoolId,
      { ...actor, previewId: preview.data.previewId },
    );
    expect(sent.data.status).toBe('HANDED_OFF');
    expect(sent.data.sentAt).toBeUndefined();
    expect(sent.message).toContain('Delivery is not confirmed');
  });

  it('records user cancellation as CANCELLED rather than FAILED', async () => {
    setNextMockManualShareResult({ status: 'CANCELLED' });
    const preview = await mockCommunicationService.previewCommunication(
      schoolId,
      {
        communicationType: 'MANUAL_DUE_REMINDER',
        mode: 'MANUAL_SHARE',
        studentId: 'student-rahul',
      },
    );
    const result = await mockCommunicationService.sendManualCommunication(
      schoolId,
      { ...actor, previewId: preview.data.previewId },
    );
    expect(result.data.status).toBe('CANCELLED');
    expect(result.data.failureReason).toBeUndefined();
  });

  it('labels simulated provider sent/delivered/failure outcomes', async () => {
    for (const status of ['SENT', 'DELIVERED', 'FAILED'] as const) {
      resetMockCommunicationData();
      setMockCommunicationClock(() => now);
      setNextMockCommunicationProviderStatus(status);
      const preview = await mockCommunicationService.previewCommunication(
        schoolId,
        {
          communicationType: 'UPCOMING_DUE_REMINDER',
          feeDueIds: ['due-rahul-august'],
          mode: 'PROVIDER_SEND',
        },
      );
      const result = await mockCommunicationService.sendManualCommunication(
        schoolId,
        { ...actor, previewId: preview.data.previewId },
      );
      expect(result.data.status).toBe(status);
      expect(result.data.providerStatus).toContain('DEVELOPMENT_MOCK');
    }
  });

  it('shares active Receipt metadata without mutating immutable Receipt data', async () => {
    const collectionBefore = JSON.stringify(
      getMockCollectionRepositorySnapshot().receipts,
    );
    const result = await mockCommunicationService.shareReceipt(
      schoolId,
      'receipt-advance-rahul',
      { ...actor, mode: 'MANUAL_SHARE' },
    );
    expect(result.data).toMatchObject({
      receiptId: 'receipt-advance-rahul',
      status: 'HANDED_OFF',
    });
    expect(result.data.renderedContent).toContain('DEVELOPMENT PREVIEW');
    expect(JSON.stringify(getMockCollectionRepositorySnapshot().receipts)).toBe(
      collectionBefore,
    );
    await expect(
      mockCommunicationService.shareReceipt(
        schoolId,
        'receipt-reversed-aarav',
        { ...actor, mode: 'MANUAL_SHARE' },
      ),
    ).rejects.toMatchObject({ code: 'CANCELLED_RECEIPT_SHARE_BLOCKED' });
  });

  it('previews and sends Payment confirmation with safe public fields', async () => {
    const preview = await mockCommunicationService.previewCommunication(
      schoolId,
      {
        communicationType: 'PAYMENT_CONFIRMATION',
        mode: 'MANUAL_SHARE',
        paymentId: 'payment-advance-rahul',
      },
    );
    expect(preview.data.renderedContent).toContain('REC/MAIN/2026-27/000001');
    expect(preview.data.renderedContent).not.toContain('payment-advance-rahul');
  });

  const bulkInput = {
    academicSessionId: 'session-school-omt-current',
    branchId: 'branch-main',
    dueStatuses: ['OVERDUE'],
    minimumOutstandingPaise: 100,
    reminderRuleId: 'rule-overdue-weekly',
    scheduledFor: '2026-07-31T09:00:00+05:30',
    sessionStatus: 'ACTIVE' as const,
    templateId: 'template-overdue',
  };

  it('keeps Bulk preview mutation-free, commits one job and rejects duplicates', async () => {
    const before = getMockCommunicationRepositorySnapshot().scheduled;
    const preview = await mockCommunicationService.previewBulkReminder(
      schoolId,
      bulkInput,
    );
    expect(preview.data.eligible).toBeGreaterThan(0);
    expect(getMockCommunicationRepositorySnapshot().scheduled).toEqual(before);
    const result = await mockCommunicationService.commitBulkReminder(schoolId, {
      initiatedByUserId: actor.initiatedByUserId,
      previewId: preview.data.previewId,
    });
    expect(result.data.providerMode).toBe('DEVELOPMENT_MOCK');
    expect(result.data.scheduled).toBeGreaterThan(0);
    await expect(
      mockCommunicationService.commitBulkReminder(schoolId, {
        initiatedByUserId: actor.initiatedByUserId,
        previewId: preview.data.previewId,
      }),
    ).rejects.toMatchObject({ code: 'BULK_REMINDER_ALREADY_COMMITTED' });
  });

  it('rolls back an atomic Bulk commit failure', async () => {
    const preview = await mockCommunicationService.previewBulkReminder(
      schoolId,
      { ...bulkInput, simulateAtomicFailure: true },
    );
    const before = getMockCommunicationRepositorySnapshot().scheduled;
    await expect(
      mockCommunicationService.commitBulkReminder(schoolId, {
        initiatedByUserId: actor.initiatedByUserId,
        previewId: preview.data.previewId,
      }),
    ).rejects.toMatchObject({ code: 'BULK_REMINDER_ATOMIC_FAILURE' });
    expect(getMockCommunicationRepositorySnapshot().scheduled).toEqual(before);
  });

  it('cancels only mutable schedules and blocks closed-session bulk', async () => {
    expect(
      (
        await mockCommunicationService.cancelScheduledReminder(
          schoolId,
          'scheduled-upcoming-rahul',
          'School holiday',
        )
      ).data.status,
    ).toBe('CANCELLED');
    await expect(
      mockCommunicationService.previewBulkReminder(schoolId, {
        ...bulkInput,
        sessionStatus: 'CLOSED',
      }),
    ).rejects.toMatchObject({ code: 'CLOSED_SESSION_BULK_BLOCKED' });
  });

  it('retries by preserving the failed attempt and creating a new chain attempt', async () => {
    const original =
      getMockCommunicationRepositorySnapshot().communications.find(
        item => item.id === 'communication-failed-overdue',
      )!;
    const result = await mockCommunicationService.retryCommunication(
      schoolId,
      original.id,
    );
    expect(result.data).toMatchObject({
      attemptNumber: 2,
      logicalIdempotencyKey: original.logicalIdempotencyKey,
      status: 'SENT',
    });
    const chain =
      getMockCommunicationRepositorySnapshot().communications.filter(
        item => item.logicalIdempotencyKey === original.logicalIdempotencyKey,
      );
    expect(chain).toHaveLength(2);
    expect(chain[0].status).toBe('FAILED');
  });

  it('preserves the Template snapshot after later Template edits', async () => {
    const preview = await mockCommunicationService.previewCommunication(
      schoolId,
      {
        communicationType: 'UPCOMING_DUE_REMINDER',
        feeDueIds: ['due-rahul-august'],
        mode: 'MANUAL_SHARE',
      },
    );
    const sent = await mockCommunicationService.sendManualCommunication(
      schoolId,
      { ...actor, previewId: preview.data.previewId },
    );
    const template = (
      await mockCommunicationService.getTemplate(
        schoolId,
        'template-upcoming-due',
      )
    ).data;
    await mockCommunicationService.updateTemplate(schoolId, template.id, {
      ...template,
      content: `${template.content} Updated later.`,
    });
    expect(
      (await mockCommunicationService.getCommunication(schoolId, sent.data.id))
        .data.communication.templateSnapshot.content,
    ).not.toContain('Updated later');
  });

  it('rejects cross-School and cross-Branch records', async () => {
    await expect(
      mockCommunicationService.getCommunication(
        'school-greenfield',
        'communication-failed-overdue',
      ),
    ).rejects.toMatchObject({ code: 'COMMUNICATION_NOT_FOUND' });
    await expect(
      mockCommunicationService.previewCommunication(schoolId, {
        branchId: 'branch-greenfield-puri',
        communicationType: 'UPCOMING_DUE_REMINDER',
        feeDueIds: ['due-rahul-august'],
        mode: 'MANUAL_SHARE',
      }),
    ).rejects.toMatchObject({ code: 'COMMUNICATION_BRANCH_FORBIDDEN' });
  });
});
