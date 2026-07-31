import type { ApiResponse, PaginatedResponse } from '../../models/common';
import type {
  AppNotification,
  BulkReminderPreview,
  CommunicationActivity,
  CommunicationPreview,
  CommunicationRecord,
  CommunicationSettings,
  CreateMessageTemplateInput,
  CreateReminderRuleInput,
  MessageTemplate,
  ReminderRule,
  ScheduledReminder,
  UpdateMessageTemplateInput,
  UpdateReminderRuleInput,
} from '../../models/communication';
import type { FeeDue } from '../../models/feeDue';
import type { PublishedResultSnapshot } from '../../models/marksResult';
import type { ReportCard } from '../../models/reportCard';
import {
  extractTemplateVariables,
  formatTemplateCurrency,
  formatTemplateDate,
  renderTemplate,
  snapshotTemplate,
} from '../../utils/templateRenderer';
import { examinationCommunicationVariables } from '../../utils/examinationCommunicationVariables';
import { reportCardVisibility } from '../../utils/reportCardVisibility';
import {
  resolveCommunicationRecipient,
  type RecipientFailureReason,
} from '../../utils/communicationRecipient';
import {
  communicationIdempotencyKey,
  reminderIdempotencyKey,
} from '../../utils/communicationIdempotency';
import {
  isSupportedReminderTimezone,
  isValidReminderTime,
} from '../../utils/reminderSchedule';
import { ApiClientError } from '../api/apiError';
import { SCHOOL_AUTH_FIXTURES } from '../auth/authFixtures';
import { INITIAL_ACADEMIC_CLASSES } from '../academic/academicFixtures';
import { getMockCollectionRepositorySnapshot } from '../collection/mockCollectionService';
import { getMockFeeDueRepositorySnapshot } from '../feeDue/mockFeeDueService';
import { publishedResultRepository } from '../marksResult/publishedResultRepository';
import { INITIAL_FEE_HEADS } from '../feeSetup/feeSetupFixtures';
import {
  INITIAL_ACADEMIC_SESSIONS,
  INITIAL_BRANCHES,
  INITIAL_SCHOOLS,
} from '../organization/organizationFixtures';
import {
  INITIAL_GUARDIANS,
  INITIAL_PARENT_STUDENT_LINKS,
  INITIAL_STUDENT_ENROLLMENTS,
  INITIAL_STUDENT_GUARDIAN_LINKS,
  INITIAL_STUDENT_PROFILES,
} from '../student/studentFixtures';
import { communicationProvider } from './communicationProviderResolver';
import type { CommunicationService } from './communicationService';
import {
  INITIAL_APP_NOTIFICATIONS,
  INITIAL_COMMUNICATION_RECORDS,
  INITIAL_COMMUNICATION_SETTINGS,
  INITIAL_MESSAGE_TEMPLATES,
  INITIAL_REMINDER_RULES,
  INITIAL_SCHEDULED_REMINDERS,
} from './communicationFixtures';
import { manualShareService } from './manualShareServiceResolver';
import { reportCardRepository } from '../reportCard/reportCardRepository';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const defaultNow = () => new Date().toISOString();
let clock = defaultNow;
let settings: CommunicationSettings[] = [];
let templates: MessageTemplate[] = [];
let rules: ReminderRule[] = [];
let scheduled: ScheduledReminder[] = [];
let communications: CommunicationRecord[] = [];
let notifications: AppNotification[] = [];
let activities: CommunicationActivity[] = [];
let previews = new Map<string, CommunicationPreview>();
let bulkPreviews = new Map<string, BulkReminderPreview>();
let committedBulkPreviewIds = new Set<string>();
let sequence = 1000;

export function setMockCommunicationClock(now?: () => string): void {
  clock = now ?? defaultNow;
}
export function resetMockCommunicationData(): void {
  settings = clone(INITIAL_COMMUNICATION_SETTINGS);
  templates = clone(INITIAL_MESSAGE_TEMPLATES);
  rules = clone(INITIAL_REMINDER_RULES);
  scheduled = clone(INITIAL_SCHEDULED_REMINDERS);
  communications = clone(INITIAL_COMMUNICATION_RECORDS);
  notifications = clone(INITIAL_APP_NOTIFICATIONS);
  activities = [];
  previews = new Map();
  bulkPreviews = new Map();
  committedBulkPreviewIds = new Set();
  sequence = 1000;
  clock = defaultNow;
}
export function getMockCommunicationRepositorySnapshot() {
  return clone({
    activities,
    communications,
    notifications,
    rules,
    scheduled,
    settings,
    templates,
  });
}
resetMockCommunicationData();

function addSelfServiceNotification(value: AppNotification): void {
  if (
    !notifications.some(
      item =>
        item.audienceId === value.audienceId &&
        item.type === value.type &&
        item.publishedResultSnapshotId === value.publishedResultSnapshotId &&
        item.reportCardId === value.reportCardId,
    )
  )
    notifications.push(value);
}

export function createMockResultPublicationNotifications(
  results: readonly PublishedResultSnapshot[],
): void {
  const studentMemberships = Object.values(SCHOOL_AUTH_FIXTURES).flatMap(
    fixture => fixture.memberships,
  );
  results.forEach(result => {
    INITIAL_PARENT_STUDENT_LINKS.filter(
      link =>
        link.schoolId === result.schoolId &&
        link.studentId === result.studentId &&
        link.status === 'ACTIVE',
    ).forEach(link =>
      addSelfServiceNotification({
        audienceId: link.parentMembershipId,
        audienceType: 'PARENT_MEMBERSHIP',
        branchId: result.branchId,
        createdAt: result.publishedAt,
        id: `notification-result-${result.id}-${link.parentMembershipId}`,
        message: `${result.examNameSnapshot} result is now available.`,
        publishedResultSnapshotId: result.id,
        schoolId: result.schoolId,
        status: 'UNREAD',
        studentId: result.studentId,
        title: 'Result published',
        type: 'RESULT_PUBLISHED',
      }),
    );
    studentMemberships
      .filter(
        member =>
          member.role === 'STUDENT' &&
          member.schoolId === result.schoolId &&
          member.studentId === result.studentId &&
          member.status === 'ACTIVE',
      )
      .forEach(member =>
        addSelfServiceNotification({
          audienceId: member.id,
          audienceType: 'STUDENT_MEMBERSHIP',
          branchId: result.branchId,
          createdAt: result.publishedAt,
          id: `notification-result-${result.id}-${member.id}`,
          message: `${result.examNameSnapshot} result is now available.`,
          publishedResultSnapshotId: result.id,
          schoolId: result.schoolId,
          status: 'UNREAD',
          studentId: result.studentId,
          title: 'Result published',
          type: 'RESULT_PUBLISHED',
        }),
      );
  });
}

export function createMockReportCardNotifications(
  cards: readonly ReportCard[],
): void {
  const studentMemberships = Object.values(SCHOOL_AUTH_FIXTURES).flatMap(
    fixture => fixture.memberships,
  );
  cards
    .filter(card => card.status === 'AVAILABLE')
    .forEach(card => {
      INITIAL_PARENT_STUDENT_LINKS.filter(
        link =>
          link.schoolId === card.schoolId &&
          link.studentId === card.studentId &&
          link.status === 'ACTIVE',
      ).forEach(link =>
        addSelfServiceNotification({
          audienceId: link.parentMembershipId,
          audienceType: 'PARENT_MEMBERSHIP',
          branchId: card.branchId,
          createdAt: card.availableAt ?? card.generatedAt,
          id: `notification-report-card-${card.id}-${link.parentMembershipId}`,
          message: `Report Card ${card.reportCardNumber} is now available.`,
          publishedResultSnapshotId: card.publishedResultSnapshotId,
          reportCardId: card.id,
          schoolId: card.schoolId,
          status: 'UNREAD',
          studentId: card.studentId,
          title: 'Report Card available',
          type: 'REPORT_CARD_AVAILABLE',
        }),
      );
      studentMemberships
        .filter(
          member =>
            member.role === 'STUDENT' &&
            member.schoolId === card.schoolId &&
            member.studentId === card.studentId &&
            member.status === 'ACTIVE',
        )
        .forEach(member =>
          addSelfServiceNotification({
            audienceId: member.id,
            audienceType: 'STUDENT_MEMBERSHIP',
            branchId: card.branchId,
            createdAt: card.availableAt ?? card.generatedAt,
            id: `notification-report-card-${card.id}-${member.id}`,
            message: `Report Card ${card.reportCardNumber} is now available.`,
            publishedResultSnapshotId: card.publishedResultSnapshotId,
            reportCardId: card.id,
            schoolId: card.schoolId,
            status: 'UNREAD',
            studentId: card.studentId,
            title: 'Report Card available',
            type: 'REPORT_CARD_AVAILABLE',
          }),
        );
    });
}

function success<T>(data: T, message = 'Success'): ApiResponse<T> {
  return { data: clone(data), message, success: true };
}
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
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, pageSize);
  return {
    items: items.slice((safePage - 1) * safeSize, safePage * safeSize),
    page: safePage,
    pageSize: safeSize,
    totalItems: items.length,
    totalPages: items.length ? Math.ceil(items.length / safeSize) : 0,
  };
}
function school(schoolId: string) {
  return (
    INITIAL_SCHOOLS.find(item => item.id === schoolId) ??
    fail('COMMUNICATION_SCHOOL_NOT_FOUND', 'School was not found.', 404)
  );
}
function templateFor(schoolId: string, templateId: string) {
  return (
    templates.find(
      item => item.id === templateId && item.schoolId === schoolId,
    ) ??
    fail('MESSAGE_TEMPLATE_NOT_FOUND', 'Message Template was not found.', 404)
  );
}
function ruleFor(schoolId: string, ruleId: string) {
  return (
    rules.find(item => item.id === ruleId && item.schoolId === schoolId) ??
    fail('REMINDER_RULE_NOT_FOUND', 'Reminder Rule was not found.', 404)
  );
}
function addActivity(
  schoolId: string,
  action: CommunicationActivity['action'],
  entityId?: string,
  metadata: CommunicationActivity['metadata'] = {},
) {
  activities.push({
    action,
    entityId,
    id: `communication-activity-${++sequence}`,
    metadata,
    occurredAt: clock(),
    schoolId,
  });
}
function validateTemplateInput(
  schoolId: string,
  input: CreateMessageTemplateInput | UpdateMessageTemplateInput,
  currentId?: string,
): void {
  const fieldErrors: Record<string, string> = {};
  if (!input.name.trim()) fieldErrors.name = 'Name is required.';
  if (!input.code.trim()) fieldErrors.code = 'Code is required.';
  if (!input.content.trim()) fieldErrors.content = 'Content is required.';
  if (input.content.length > 2_000)
    fieldErrors.content = 'Content must not exceed 2,000 characters.';
  if (
    templates.some(
      item =>
        item.schoolId === schoolId &&
        item.id !== currentId &&
        item.code.toLowerCase() === input.code.trim().toLowerCase(),
    )
  )
    fieldErrors.code = 'Code must be unique within the School.';
  try {
    const used = extractTemplateVariables(input.content);
    const disallowed = used.find(
      item => !input.allowedVariables.includes(item),
    );
    if (disallowed)
      fieldErrors.content = `Variable {{${disallowed}}} is not allowed.`;
    const absent = input.requiredVariables.find(item => !used.includes(item));
    if (absent)
      fieldErrors.requiredVariables = `Required variable {{${absent}}} must appear in content.`;
  } catch (error) {
    fieldErrors.content =
      error instanceof Error
        ? error.message
        : 'Template variables are invalid.';
  }
  if (Object.keys(fieldErrors).length)
    fail(
      'MESSAGE_TEMPLATE_INVALID',
      'Correct the highlighted Template fields.',
      422,
      fieldErrors,
    );
}
function enforceDefaultUniqueness(value: MessageTemplate) {
  if (!value.isDefault || value.status !== 'ACTIVE') return;
  templates = templates.map(item =>
    item.id !== value.id &&
    item.schoolId === value.schoolId &&
    item.communicationType === value.communicationType &&
    item.channel === value.channel &&
    item.language === value.language
      ? { ...item, isDefault: false, updatedAt: value.updatedAt }
      : item,
  );
}
function validateRuleInput(
  schoolId: string,
  input: CreateReminderRuleInput | UpdateReminderRuleInput,
  currentId?: string,
): void {
  const fieldErrors: Record<string, string> = {};
  if (!input.name.trim()) fieldErrors.name = 'Name is required.';
  if (!input.code.trim()) fieldErrors.code = 'Code is required.';
  if (
    rules.some(
      item =>
        item.schoolId === schoolId &&
        item.id !== currentId &&
        item.code.toLowerCase() === input.code.trim().toLowerCase(),
    )
  )
    fieldErrors.code = 'Code must be unique within the School.';
  const selectedTemplate = templateFor(schoolId, input.templateId);
  if (selectedTemplate.status !== 'ACTIVE')
    fieldErrors.templateId = 'Select an active Template.';
  if (selectedTemplate.communicationType !== input.communicationType)
    fieldErrors.templateId =
      'Template type must match the Reminder communication type.';
  if (
    input.minimumOutstandingPaise !== undefined &&
    input.minimumOutstandingPaise < 0
  )
    fieldErrors.minimumOutstandingPaise =
      'Minimum outstanding cannot be negative.';
  if (input.dayOffset < 0)
    fieldErrors.dayOffset = 'Day offset cannot be negative.';
  if (input.repeatEveryDays !== undefined && input.repeatEveryDays <= 0)
    fieldErrors.repeatEveryDays = 'Repeat frequency must be positive.';
  if (input.maximumOccurrences !== undefined && input.maximumOccurrences <= 0)
    fieldErrors.maximumOccurrences = 'Maximum occurrences must be positive.';
  if (!isValidReminderTime(input.sendTime))
    fieldErrors.sendTime = 'Use a valid 24-hour time.';
  if (!isSupportedReminderTimezone(input.timezone))
    fieldErrors.timezone = 'Timezone is invalid.';
  if (
    input.branchIds.some(
      id =>
        !INITIAL_BRANCHES.some(
          branch => branch.id === id && branch.schoolId === schoolId,
        ),
    )
  )
    fieldErrors.branchIds = 'A Branch is outside this School.';
  if (
    input.classIds?.some(
      id =>
        !INITIAL_ACADEMIC_CLASSES.some(
          item => item.id === id && item.schoolId === schoolId,
        ),
    )
  )
    fieldErrors.classIds = 'A Class is outside this School.';
  if (
    input.feeHeadIds?.some(
      id =>
        !INITIAL_FEE_HEADS.some(
          item => item.id === id && item.schoolId === schoolId,
        ),
    )
  )
    fieldErrors.feeHeadIds = 'A Fee Head is outside this School.';
  if (
    input.status === 'ACTIVE' &&
    !settings.find(item => item.schoolId === schoolId)?.automatedReminderEnabled
  )
    fieldErrors.status =
      'Automated reminders are disabled in Communication Settings.';
  if (Object.keys(fieldErrors).length)
    fail(
      'REMINDER_RULE_INVALID',
      'Correct the highlighted Reminder Rule fields.',
      422,
      fieldErrors,
    );
}
function resolveRecipient(
  schoolId: string,
  studentId: string,
  explicitGuardianId: string | undefined,
  automated: boolean,
) {
  const result = resolveCommunicationRecipient({
    automated,
    explicitGuardianId,
    guardianLinks: INITIAL_STUDENT_GUARDIAN_LINKS,
    guardians: INITIAL_GUARDIANS,
    parentLinks: INITIAL_PARENT_STUDENT_LINKS,
    schoolId,
    studentId,
    students: INITIAL_STUDENT_PROFILES,
  });
  if (!result.ok)
    fail(
      `RECIPIENT_${result.reason}`,
      recipientMessage(result.reason),
      result.reason === 'CROSS_SCHOOL' ? 403 : 422,
    );
  return result.recipient;
}
function recipientMessage(reason: RecipientFailureReason): string {
  const messages: Record<RecipientFailureReason, string> = {
    CROSS_SCHOOL: 'Student is outside the selected School.',
    GUARDIAN_NOT_LINKED: 'Guardian is not linked to this Student.',
    INACTIVE_GUARDIAN_LINK: 'Guardian link is inactive.',
    INVALID_MOBILE: 'Guardian mobile number is invalid.',
    MISSING_CONTACT: 'No active Guardian contact is available.',
    STUDENT_NOT_FOUND: 'Student was not found.',
    WHATSAPP_DISABLED:
      'WhatsApp reminders are disabled for this Guardian link.',
  };
  return messages[reason];
}
function dataForPreview(
  schoolId: string,
  input: CommunicationPreview['input'],
) {
  if (
    ['RESULT_PUBLISHED', 'REPORT_CARD_AVAILABLE', 'REPORT_CARD_SHARE'].includes(
      input.communicationType,
    )
  ) {
    const result = publishedResultRepository
      .list()
      .find(
        item =>
          item.id === input.publishedResultSnapshotId &&
          item.schoolId === schoolId,
      );
    if (!result)
      fail(
        'PUBLISHED_RESULT_NOT_FOUND',
        'Published Result was not found in this School.',
        404,
      );
    if (result.status !== 'PUBLISHED')
      fail(
        'PUBLISHED_RESULT_INACTIVE',
        'Communication is blocked because this Result is no longer published.',
        422,
      );
    const reportCard = input.reportCardId
      ? reportCardRepository
          .cards()
          .find(
            item =>
              item.id === input.reportCardId && item.schoolId === schoolId,
          )
      : undefined;
    if (input.reportCardId && !reportCard)
      fail(
        'REPORT_CARD_NOT_FOUND',
        'Report Card was not found in this School.',
        404,
      );
    if (reportCard) {
      if (reportCard.publishedResultSnapshotId !== result.id)
        fail(
          'REPORT_CARD_RESULT_MISMATCH',
          'Report Card does not belong to this Published Result.',
          422,
        );
      const visibility = reportCardVisibility(reportCard, result);
      if (!visibility.visible)
        fail(
          'REPORT_CARD_SHARE_UNAVAILABLE',
          visibility.reason ?? 'Report Card is unavailable for sharing.',
          422,
        );
    }
    if (input.communicationType !== 'RESULT_PUBLISHED' && !reportCard)
      fail(
        'REPORT_CARD_REQUIRED',
        'An available Report Card is required for this communication.',
        422,
      );
    const student =
      INITIAL_STUDENT_PROFILES.find(
        item => item.id === result.studentId && item.schoolId === schoolId,
      ) ??
      fail(
        'COMMUNICATION_STUDENT_NOT_FOUND',
        'Student was not found in this School.',
        404,
      );
    const branch =
      INITIAL_BRANCHES.find(
        item => item.id === result.branchId && item.schoolId === schoolId,
      ) ??
      fail(
        'COMMUNICATION_BRANCH_FORBIDDEN',
        'Branch is outside the selected School.',
        403,
      );
    const recipient = resolveRecipient(
      schoolId,
      student.id,
      input.guardianId,
      input.mode === 'PROVIDER_SEND',
    );
    const academicSessionName = INITIAL_ACADEMIC_SESSIONS.find(
      item =>
        item.id === result.academicSessionId && item.schoolId === schoolId,
    )?.name;
    return {
      branchId: branch.id,
      dueIds: [],
      payment: undefined,
      publishedResult: result,
      receipt: undefined,
      recipient,
      reportCard,
      student,
      variables: {
        ...examinationCommunicationVariables({
          academicSessionName,
          branchName: branch.name,
          reportCard,
          result,
          schoolName: school(schoolId).name,
        }),
        parentName: recipient.guardianName,
      },
    };
  }
  const collection = getMockCollectionRepositorySnapshot();
  const dues = getMockFeeDueRepositorySnapshot();
  let studentId = input.studentId;
  let selectedDues = (input.feeDueIds ?? []).map(
    id =>
      dues.find(item => item.id === id && item.schoolId === schoolId) ??
      fail('FEE_DUE_NOT_FOUND', 'Fee Due was not found in this School.', 404),
  );
  if (
    !selectedDues.length &&
    input.studentId &&
    input.communicationType === 'MANUAL_DUE_REMINDER'
  ) {
    selectedDues = dues.filter(
      item =>
        item.schoolId === schoolId &&
        item.studentId === input.studentId &&
        item.outstandingAmountPaise > 0 &&
        !['CANCELLED', 'WAIVED', 'PAID'].includes(item.status),
    );
    if (!selectedDues.length)
      fail(
        'NO_ELIGIBLE_FEE_DUES',
        'This Student has no eligible current outstanding.',
        422,
      );
  }
  if (selectedDues.some(item => ['CANCELLED', 'WAIVED'].includes(item.status)))
    fail(
      'FEE_DUE_NOT_ELIGIBLE',
      'Cancelled or waived Dues cannot be messaged.',
      422,
    );
  let payment = input.paymentId
    ? collection.payments.find(
        item => item.id === input.paymentId && item.schoolId === schoolId,
      )
    : undefined;
  let receipt = input.receiptId
    ? collection.receipts.find(
        item => item.id === input.receiptId && item.schoolId === schoolId,
      )
    : undefined;
  if (input.paymentId && !payment)
    fail('PAYMENT_NOT_FOUND', 'Payment was not found in this School.', 404);
  if (input.receiptId && !receipt)
    fail('RECEIPT_NOT_FOUND', 'Receipt was not found in this School.', 404);
  if (receipt?.status === 'CANCELLED')
    fail(
      'CANCELLED_RECEIPT_SHARE_BLOCKED',
      'Cancelled Receipts cannot be shared by default.',
      422,
    );
  if (receipt && receipt.documentStatus === 'DOCUMENT_PENDING')
    fail(
      'RECEIPT_DOCUMENT_UNAVAILABLE',
      'Receipt document metadata is not ready.',
      422,
    );
  if (payment && !receipt && payment.receiptId)
    receipt = collection.receipts.find(
      item => item.id === payment?.receiptId && item.schoolId === schoolId,
    );
  studentId =
    studentId ??
    selectedDues[0]?.studentId ??
    payment?.studentId ??
    receipt?.studentId;
  if (!studentId)
    fail(
      'COMMUNICATION_STUDENT_REQUIRED',
      'A Student-linked record is required.',
      422,
    );
  const student =
    INITIAL_STUDENT_PROFILES.find(
      item => item.id === studentId && item.schoolId === schoolId,
    ) ??
    fail(
      'COMMUNICATION_STUDENT_NOT_FOUND',
      'Student was not found in this School.',
      404,
    );
  const due = selectedDues[0];
  const branchId =
    input.branchId ?? due?.branchId ?? payment?.branchId ?? receipt?.branchId;
  const branch = INITIAL_BRANCHES.find(
    item => item.id === branchId && item.schoolId === schoolId,
  );
  if (branchId && !branch)
    fail(
      'COMMUNICATION_BRANCH_FORBIDDEN',
      'Branch is outside the selected School.',
      403,
    );
  const recipient = resolveRecipient(
    schoolId,
    student.id,
    input.guardianId,
    input.mode === 'PROVIDER_SEND',
  );
  const schoolValue = school(schoolId);
  const effectiveFine = selectedDues.reduce(
    (sum, item) =>
      sum + Math.max(0, item.fineAmountPaise - item.fineWaivedAmountPaise),
    0,
  );
  const totalOutstanding = selectedDues.reduce(
    (sum, item) => sum + item.outstandingAmountPaise,
    0,
  );
  const variables = {
    admissionNumber: student.admissionNumber,
    branchName: branch?.name ?? receipt?.branchSnapshot.name ?? '',
    className:
      due?.classNameSnapshot ?? receipt?.studentSnapshot.className ?? '',
    dueAmount: due ? formatTemplateCurrency(due.netFeeAmountPaise) : '',
    dueDate: due ? formatTemplateDate(due.dueDate) : '',
    feeHeadName: due?.feeHeadNameSnapshot ?? '',
    feePeriod: selectedDues.map(item => item.periodLabel).join(', '),
    fineAmount: formatTemplateCurrency(effectiveFine),
    outstandingAmount: formatTemplateCurrency(totalOutstanding),
    parentName: recipient.guardianName,
    paymentAmount: payment
      ? formatTemplateCurrency(payment.amountPaise)
      : receipt
      ? formatTemplateCurrency(receipt.paymentAmountPaise)
      : '',
    paymentDate: payment
      ? formatTemplateDate(payment.paymentDate)
      : receipt
      ? formatTemplateDate(receipt.issuedAt)
      : '',
    paymentMode: payment?.paymentMode ?? receipt?.paymentMode ?? '',
    receiptLink: receipt
      ? `[DEVELOPMENT PREVIEW] ${
          receipt.documentUrl ?? `development://receipts/${receipt.id}`
        }`
      : '',
    receiptNumber: receipt?.receiptNumber ?? '',
    schoolName: schoolValue.name,
    schoolPhone:
      settings.find(item => item.schoolId === schoolId)?.schoolContactNumber ??
      '',
    sectionName:
      due?.sectionNameSnapshot ?? receipt?.studentSnapshot.sectionName ?? '',
    studentName: student.fullName,
  };
  return {
    branchId,
    dueIds: selectedDues.map(item => item.id),
    payment,
    publishedResult: undefined,
    receipt,
    recipient,
    reportCard: undefined,
    student,
    variables,
  };
}
function currentPreview(schoolId: string, previewId: string) {
  const preview =
    previews.get(previewId) ??
    fail(
      'COMMUNICATION_PREVIEW_NOT_FOUND',
      'Message preview has expired.',
      404,
    );
  if (preview.template.schoolId !== schoolId)
    fail(
      'COMMUNICATION_PREVIEW_FORBIDDEN',
      'Preview is outside this School.',
      403,
    );
  if (Date.parse(preview.expiresAt) < Date.parse(clock()))
    fail(
      'COMMUNICATION_PREVIEW_EXPIRED',
      'Message preview has expired. Preview again.',
      409,
    );
  return preview;
}

export const mockCommunicationService: CommunicationService = {
  async getCommunicationDashboard(schoolId, query) {
    school(schoolId);
    const records = communications.filter(
      item =>
        item.schoolId === schoolId &&
        (!query.branchId || item.branchId === query.branchId),
    );
    const today = clock().slice(0, 10);
    return success({
      activeRuleCount: rules.filter(
        item => item.schoolId === schoolId && item.status === 'ACTIVE',
      ).length,
      delivered: records.filter(item => item.status === 'DELIVERED').length,
      failed: records.filter(item => item.status === 'FAILED').length,
      manualShares: records.filter(item => item.mode === 'MANUAL_SHARE').length,
      messagesToday: records.filter(
        item => item.createdAt.slice(0, 10) === today,
      ).length,
      parentsWithoutValidContact: INITIAL_STUDENT_PROFILES.filter(
        student =>
          student.schoolId === schoolId &&
          !resolveCommunicationRecipient({
            automated: false,
            guardianLinks: INITIAL_STUDENT_GUARDIAN_LINKS,
            guardians: INITIAL_GUARDIANS,
            parentLinks: INITIAL_PARENT_STUDENT_LINKS,
            schoolId,
            studentId: student.id,
            students: INITIAL_STUDENT_PROFILES,
          }).ok,
      ).length,
      queued: records.filter(item => item.status === 'QUEUED').length,
      recent: records.slice(-5).reverse(),
      scheduled: scheduled.filter(
        item => item.schoolId === schoolId && item.status === 'SCHEDULED',
      ).length,
      sent: records.filter(item =>
        ['SENT', 'DELIVERED', 'READ'].includes(item.status),
      ).length,
      upcoming: scheduled
        .filter(
          item => item.schoolId === schoolId && item.status === 'SCHEDULED',
        )
        .slice(0, 5),
    });
  },
  async getCommunicationSettings(schoolId) {
    school(schoolId);
    return success(
      settings.find(item => item.schoolId === schoolId) ??
        fail(
          'COMMUNICATION_SETTINGS_NOT_FOUND',
          'Communication Settings were not found.',
          404,
        ),
    );
  },
  async updateCommunicationSettings(schoolId, input) {
    const current =
      settings.find(item => item.schoolId === schoolId) ??
      fail(
        'COMMUNICATION_SETTINGS_NOT_FOUND',
        'Communication Settings were not found.',
        404,
      );
    if (
      input.automatedReminderEnabled &&
      current.providerConfigurationStatus === 'UNAVAILABLE'
    )
      fail(
        'COMMUNICATION_PROVIDER_UNAVAILABLE',
        'Automated reminders require an available provider.',
        422,
      );
    if (input.reminderTime && !isValidReminderTime(input.reminderTime))
      fail('COMMUNICATION_SETTINGS_INVALID', 'Reminder time is invalid.', 422, {
        reminderTime: 'Use HH:mm.',
      });
    if (
      input.reminderTimezone &&
      !isSupportedReminderTimezone(input.reminderTimezone)
    )
      fail(
        'COMMUNICATION_SETTINGS_INVALID',
        'Reminder timezone is invalid.',
        422,
        { reminderTimezone: 'Timezone is invalid.' },
      );
    const updated = {
      ...current,
      ...input,
      providerConfigurationStatus: current.providerConfigurationStatus,
      schoolId,
      updatedAt: clock(),
    };
    settings = settings.map(item =>
      item.schoolId === schoolId ? updated : item,
    );
    return success(updated, 'Communication Settings updated.');
  },
  async getTemplates(schoolId, query = {}) {
    school(schoolId);
    const search = query.search?.trim().toLowerCase();
    const items = templates.filter(
      item =>
        item.schoolId === schoolId &&
        (!query.communicationType ||
          query.communicationType === 'ALL' ||
          item.communicationType === query.communicationType) &&
        (!query.status ||
          query.status === 'ALL' ||
          item.status === query.status) &&
        (!query.language ||
          query.language === 'ALL' ||
          item.language === query.language) &&
        (!search || `${item.name} ${item.code}`.toLowerCase().includes(search)),
    );
    return success(paginate(items, query.page, query.pageSize));
  },
  async getTemplate(schoolId, templateId) {
    return success(templateFor(schoolId, templateId));
  },
  async createTemplate(schoolId, input) {
    school(schoolId);
    validateTemplateInput(schoolId, input);
    const now = clock();
    const value: MessageTemplate = {
      ...clone(input),
      code: input.code.trim().toUpperCase(),
      createdAt: now,
      id: `message-template-${++sequence}`,
      name: input.name.trim(),
      schoolId,
      updatedAt: now,
    };
    templates.push(value);
    enforceDefaultUniqueness(value);
    addActivity(schoolId, 'MESSAGE_TEMPLATE_CREATED', value.id);
    return success(value, 'Message Template created.');
  },
  async updateTemplate(schoolId, templateId, input) {
    const current = templateFor(schoolId, templateId);
    validateTemplateInput(schoolId, input, current.id);
    const value = {
      ...current,
      ...clone(input),
      code: input.code.trim().toUpperCase(),
      id: current.id,
      schoolId,
      updatedAt: clock(),
    };
    templates = templates.map(item => (item.id === current.id ? value : item));
    enforceDefaultUniqueness(value);
    addActivity(schoolId, 'MESSAGE_TEMPLATE_UPDATED', value.id);
    return success(value, 'Message Template updated.');
  },
  async updateTemplateStatus(schoolId, templateId, status) {
    const current = templateFor(schoolId, templateId);
    const value = { ...current, status, updatedAt: clock() };
    templates = templates.map(item => (item.id === current.id ? value : item));
    addActivity(schoolId, 'MESSAGE_TEMPLATE_STATUS_CHANGED', current.id, {
      status,
    });
    return success(value, 'Template status updated.');
  },
  async previewCommunication(schoolId, input) {
    const selected = input.templateId
      ? templateFor(schoolId, input.templateId)
      : templates.find(
          item =>
            item.schoolId === schoolId &&
            item.communicationType === input.communicationType &&
            item.channel === 'WHATSAPP' &&
            item.isDefault &&
            item.status === 'ACTIVE',
        ) ??
        fail(
          'DEFAULT_TEMPLATE_NOT_FOUND',
          'No active default Template is configured.',
          422,
        );
    if (selected.status !== 'ACTIVE')
      fail(
        'INACTIVE_TEMPLATE',
        'Inactive Templates cannot be used for new communication.',
        422,
      );
    if (selected.communicationType !== input.communicationType)
      fail(
        'TEMPLATE_TYPE_MISMATCH',
        'Template does not match the Communication type.',
        422,
      );
    const data = dataForPreview(schoolId, input);
    const now = clock();
    const preview: CommunicationPreview = {
      expiresAt: new Date(Date.parse(now) + 10 * 60_000).toISOString(),
      input: clone(input),
      previewId: `communication-preview-${++sequence}`,
      recipient: data.recipient,
      renderedContent: renderTemplate(selected, data.variables),
      template: clone(selected),
      variables: data.variables,
      warnings:
        input.mode === 'PROVIDER_SEND'
          ? ['Development mock provider: no real WhatsApp delivery occurs.']
          : ['Device handoff does not confirm WhatsApp delivery.'],
    };
    previews.set(preview.previewId, clone(preview));
    addActivity(schoolId, 'COMMUNICATION_PREVIEWED', preview.previewId);
    return success(preview, 'Message preview created without sending.');
  },
  async sendManualCommunication(schoolId, input) {
    const preview = currentPreview(schoolId, input.previewId);
    const data = dataForPreview(schoolId, preview.input);
    const selected = templateFor(schoolId, preview.template.id);
    if (selected.status !== 'ACTIVE')
      fail(
        'INACTIVE_TEMPLATE',
        'Template became inactive. Preview again.',
        422,
      );
    const rendered = renderTemplate(selected, data.variables);
    const now = clock();
    const logicalKey = communicationIdempotencyKey(
      schoolId,
      preview.input.communicationType,
      data.student.id,
      data.dueIds.join(','),
      data.payment?.id ?? '',
      data.receipt?.id ?? '',
      data.publishedResult?.id ?? '',
      data.reportCard?.id ?? '',
      preview.input.mode,
    );
    if (
      communications.some(
        item =>
          item.idempotencyKey === `${logicalKey}::1` &&
          item.status !== 'FAILED' &&
          item.status !== 'CANCELLED',
      )
    )
      fail(
        'DUPLICATE_COMMUNICATION',
        'This communication was already submitted.',
        409,
      );
    const outcome =
      preview.input.mode === 'MANUAL_SHARE'
        ? data.receipt
          ? await manualShareService.shareReceipt({
              documentUri: data.variables.receiptLink ?? '',
              message: rendered,
              recipientMobile: data.recipient.normalizedMobile,
              title: 'Fee receipt',
            })
          : await manualShareService.shareText({
              message: rendered,
              recipientMobile: data.recipient.normalizedMobile,
              title: 'Fee communication',
            })
        : await communicationProvider.sendMessage({
            channel: 'WHATSAPP',
            communicationType: preview.input.communicationType,
            idempotencyKey: logicalKey,
            recipientMobile: data.recipient.normalizedMobile,
            renderedContent: rendered,
          });
    const status = outcome.status;
    const record: CommunicationRecord = {
      attemptNumber: 1,
      branchId: data.branchId,
      channel: 'WHATSAPP',
      communicationType: preview.input.communicationType,
      createdAt: now,
      deliveredAt: status === 'DELIVERED' ? now : undefined,
      failedAt: status === 'FAILED' ? now : undefined,
      failureCode: 'failureCode' in outcome ? outcome.failureCode : undefined,
      failureReason:
        'failureReason' in outcome ? outcome.failureReason : undefined,
      feeDueIds: data.dueIds,
      guardianId: data.recipient.guardianId,
      id: `communication-${++sequence}`,
      idempotencyKey: `${logicalKey}::1`,
      initiatedByName: input.initiatedByName,
      initiatedByUserId: input.initiatedByUserId,
      logicalIdempotencyKey: logicalKey,
      mode: preview.input.mode,
      parentMembershipId: data.recipient.parentMembershipId,
      paymentId: data.payment?.id,
      publishedResultSnapshotId: data.publishedResult?.id,
      providerMessageId:
        'providerMessageId' in outcome ? outcome.providerMessageId : undefined,
      providerStatus:
        'providerStatus' in outcome ? outcome.providerStatus : undefined,
      receiptId: data.receipt?.id,
      reportCardId: data.reportCard?.id,
      recipientMobileMasked: data.recipient.maskedMobile,
      recipientName: data.recipient.guardianName,
      renderedContent: rendered,
      schoolId,
      sentAt: ['SENT', 'DELIVERED'].includes(status) ? now : undefined,
      status,
      studentId: data.student.id,
      templateId: selected.id,
      templateSnapshot: snapshotTemplate(selected, data.variables),
      updatedAt: now,
    };
    communications.push(record);
    previews.delete(preview.previewId);
    addActivity(
      schoolId,
      status === 'HANDED_OFF'
        ? 'MANUAL_SHARE_HANDED_OFF'
        : status === 'FAILED'
        ? 'PROVIDER_MESSAGE_FAILED'
        : status === 'DELIVERED'
        ? 'PROVIDER_MESSAGE_DELIVERED'
        : 'PROVIDER_MESSAGE_SENT',
      record.id,
      { mode: record.mode, status },
    );
    return success(
      record,
      status === 'HANDED_OFF'
        ? 'Message handed to the device share sheet. Delivery is not confirmed.'
        : status === 'CANCELLED'
        ? 'Share cancelled.'
        : `Development mock result: ${status}.`,
    );
  },
  async previewBulkReminder(schoolId, input) {
    school(schoolId);
    if (
      input.sessionStatus === 'CLOSED' ||
      INITIAL_ACADEMIC_SESSIONS.find(
        item => item.id === input.academicSessionId,
      )?.status === 'CLOSED'
    )
      fail(
        'CLOSED_SESSION_BULK_BLOCKED',
        'Bulk scheduling is unavailable for closed sessions.',
        422,
      );
    const selectedTemplate = templateFor(schoolId, input.templateId);
    if (selectedTemplate.status !== 'ACTIVE')
      fail('INACTIVE_TEMPLATE', 'Select an active Template.', 422);
    const selectedRule = input.reminderRuleId
      ? ruleFor(schoolId, input.reminderRuleId)
      : undefined;
    if (selectedRule?.status !== 'ACTIVE')
      fail(
        'REMINDER_RULE_NOT_ACTIVE',
        'Only an active Reminder Rule can schedule messages.',
        422,
      );
    const dues = getMockFeeDueRepositorySnapshot().filter(due => {
      const enrollment = INITIAL_STUDENT_ENROLLMENTS.find(
        item => item.id === due.enrollmentId,
      );
      const daysOverdue = Math.floor(
        (Date.parse(input.scheduledFor.slice(0, 10)) -
          Date.parse(due.dueDate.slice(0, 10))) /
          86_400_000,
      );
      return (
        due.schoolId === schoolId &&
        due.branchId === input.branchId &&
        due.academicSessionId === input.academicSessionId &&
        (!input.studentIds?.length ||
          input.studentIds.includes(due.studentId)) &&
        (!input.feeHeadIds?.length ||
          input.feeHeadIds.includes(due.feeHeadId)) &&
        (!input.dueStatuses?.length ||
          input.dueStatuses.includes(due.status)) &&
        (!input.classIds?.length ||
          Boolean(enrollment && input.classIds.includes(enrollment.classId))) &&
        (!input.sectionIds?.length ||
          Boolean(
            enrollment && input.sectionIds.includes(enrollment.sectionId),
          )) &&
        (!input.periodKeys?.length ||
          input.periodKeys.includes(due.periodKey)) &&
        (input.minimumDaysOverdue === undefined ||
          daysOverdue >= input.minimumDaysOverdue)
      );
    });
    const items = dues.map(due => {
      const result = resolveCommunicationRecipient({
        automated: true,
        guardianLinks: INITIAL_STUDENT_GUARDIAN_LINKS,
        guardians: INITIAL_GUARDIANS,
        parentLinks: INITIAL_PARENT_STUDENT_LINKS,
        schoolId,
        studentId: due.studentId,
        students: INITIAL_STUDENT_PROFILES,
      });
      let reason: string | undefined;
      if (
        ['CANCELLED', 'WAIVED', 'PAID'].includes(due.status) ||
        due.outstandingAmountPaise <= 0
      )
        reason = 'TERMINAL_DUE';
      else if (
        due.outstandingAmountPaise <
        (input.minimumOutstandingPaise ??
          selectedRule?.minimumOutstandingPaise ??
          0)
      )
        reason = 'BELOW_THRESHOLD';
      else if (!result.ok) reason = result.reason;
      const key = reminderIdempotencyKey({
        feeDueId: due.id,
        occurrenceNumber: 1,
        ruleId: selectedRule?.id ?? `bulk-${selectedTemplate.id}`,
        scheduledDate: input.scheduledFor,
      });
      if (
        !reason &&
        scheduled.some(
          item => item.idempotencyKey === key && item.status !== 'CANCELLED',
        )
      )
        reason = 'DUPLICATE';
      return {
        eligible: !reason,
        feeDueId: due.id,
        guardianName: result.ok ? result.recipient.guardianName : undefined,
        reason,
        recipientMobileMasked: result.ok
          ? result.recipient.maskedMobile
          : undefined,
        studentId: due.studentId,
        studentName: due.studentNameSnapshot,
      };
    });
    const count = (reason: string) =>
      items.filter(item => item.reason === reason).length;
    const preview: BulkReminderPreview = {
      belowThreshold: count('BELOW_THRESHOLD'),
      candidates: items.length,
      duplicate: count('DUPLICATE'),
      eligible: items.filter(item => item.eligible).length,
      estimatedMessageCount: items.filter(item => item.eligible).length,
      expiresAt: new Date(Date.parse(clock()) + 10 * 60_000).toISOString(),
      input: clone(input),
      items,
      missingContact: count('MISSING_CONTACT') + count('INVALID_MOBILE'),
      previewId: `bulk-reminder-preview-${++sequence}`,
      terminal: count('TERMINAL_DUE'),
      whatsappDisabled: count('WHATSAPP_DISABLED'),
    };
    bulkPreviews.set(preview.previewId, clone(preview));
    addActivity(schoolId, 'BULK_REMINDER_PREVIEWED', preview.previewId, {
      candidates: preview.candidates,
      eligible: preview.eligible,
    });
    return success(preview, 'Bulk preview created without mutation.');
  },
  async commitBulkReminder(schoolId, input) {
    if (committedBulkPreviewIds.has(input.previewId))
      fail(
        'BULK_REMINDER_ALREADY_COMMITTED',
        'This bulk preview was already committed.',
        409,
      );
    const stored =
      bulkPreviews.get(input.previewId) ??
      fail(
        'BULK_REMINDER_PREVIEW_NOT_FOUND',
        'Bulk preview was not found.',
        404,
      );
    if (Date.parse(stored.expiresAt) < Date.parse(clock()))
      fail(
        'BULK_REMINDER_PREVIEW_EXPIRED',
        'Bulk preview expired. Preview again.',
        409,
      );
    const revalidated = (
      await mockCommunicationService.previewBulkReminder(schoolId, stored.input)
    ).data;
    const before = clone(scheduled);
    try {
      const ruleId =
        stored.input.reminderRuleId ?? `bulk-${stored.input.templateId}`;
      for (const item of revalidated.items.filter(value => value.eligible)) {
        const recipient = resolveRecipient(
          schoolId,
          item.studentId,
          undefined,
          true,
        );
        const due = getMockFeeDueRepositorySnapshot().find(
          value => value.id === item.feeDueId,
        ) as FeeDue;
        const key = reminderIdempotencyKey({
          feeDueId: due.id,
          occurrenceNumber: 1,
          ruleId,
          scheduledDate: stored.input.scheduledFor,
        });
        if (
          scheduled.some(
            value =>
              value.idempotencyKey === key && value.status !== 'CANCELLED',
          )
        )
          continue;
        scheduled.push({
          branchId: due.branchId,
          createdAt: clock(),
          feeDueId: due.id,
          guardianId: recipient.guardianId,
          id: `scheduled-reminder-${++sequence}`,
          idempotencyKey: key,
          occurrenceNumber: 1,
          parentMembershipId: recipient.parentMembershipId,
          recipientMobileMasked: recipient.maskedMobile,
          reminderRuleId: ruleId,
          scheduledFor: stored.input.scheduledFor,
          schoolId,
          status: 'SCHEDULED',
          studentId: due.studentId,
          templateId: stored.input.templateId,
          updatedAt: clock(),
        });
        if (stored.input.simulateAtomicFailure)
          fail(
            'BULK_REMINDER_ATOMIC_FAILURE',
            'Simulated bulk transaction failure; no Reminders were committed.',
            500,
          );
      }
    } catch (error) {
      scheduled = before;
      throw error;
    }
    committedBulkPreviewIds.add(input.previewId);
    bulkPreviews.delete(input.previewId);
    addActivity(schoolId, 'BULK_REMINDER_COMMITTED', input.previewId, {
      scheduled: revalidated.eligible,
    });
    return success(
      {
        candidates: revalidated.candidates,
        duplicate: revalidated.duplicate,
        eligible: revalidated.eligible,
        failed: 0,
        jobId: `development-mock-job-${++sequence}`,
        missingContact: revalidated.missingContact,
        providerMode: 'DEVELOPMENT_MOCK',
        scheduled: revalidated.eligible,
        sent: 0,
        skipped: revalidated.candidates - revalidated.eligible,
      },
      'Development mock backend job accepted.',
    );
  },
  async getReminderRules(schoolId, query = {}) {
    const items = rules.filter(
      item =>
        item.schoolId === schoolId &&
        (!query.branchId ||
          item.branchIds.length === 0 ||
          item.branchIds.includes(query.branchId)) &&
        (!query.status ||
          query.status === 'ALL' ||
          item.status === query.status),
    );
    return success(paginate(items, query.page, query.pageSize));
  },
  async getReminderRule(schoolId, reminderRuleId) {
    return success(ruleFor(schoolId, reminderRuleId));
  },
  async createReminderRule(schoolId, input) {
    school(schoolId);
    validateRuleInput(schoolId, input);
    const now = clock();
    const value: ReminderRule = {
      ...clone(input),
      code: input.code.trim().toUpperCase(),
      createdAt: now,
      id: `reminder-rule-${++sequence}`,
      name: input.name.trim(),
      schoolId,
      updatedAt: now,
    };
    rules.push(value);
    addActivity(schoolId, 'REMINDER_RULE_CREATED', value.id);
    return success(value, 'Reminder Rule created.');
  },
  async updateReminderRule(schoolId, reminderRuleId, input) {
    const current = ruleFor(schoolId, reminderRuleId);
    validateRuleInput(schoolId, input, current.id);
    const value = {
      ...current,
      ...clone(input),
      code: input.code.trim().toUpperCase(),
      id: current.id,
      schoolId,
      updatedAt: clock(),
    };
    rules = rules.map(item => (item.id === current.id ? value : item));
    addActivity(schoolId, 'REMINDER_RULE_UPDATED', value.id);
    return success(value, 'Reminder Rule updated.');
  },
  async updateReminderRuleStatus(schoolId, reminderRuleId, status) {
    const current = ruleFor(schoolId, reminderRuleId);
    if (
      status === 'ACTIVE' &&
      !settings.find(item => item.schoolId === schoolId)
        ?.automatedReminderEnabled
    )
      fail(
        'AUTOMATED_REMINDERS_DISABLED',
        'Enable automated reminders before activating this Rule.',
        422,
      );
    const value = { ...current, status, updatedAt: clock() };
    rules = rules.map(item => (item.id === current.id ? value : item));
    addActivity(
      schoolId,
      status === 'PAUSED' ? 'REMINDER_RULE_PAUSED' : 'REMINDER_RULE_ACTIVATED',
      value.id,
    );
    return success(value, `Reminder Rule ${status.toLowerCase()}.`);
  },
  async getScheduledReminders(schoolId, query = {}) {
    const items = scheduled.filter(
      item =>
        item.schoolId === schoolId &&
        (!query.branchId || item.branchId === query.branchId) &&
        (!query.status ||
          query.status === 'ALL' ||
          item.status === query.status),
    );
    return success(paginate(items, query.page, query.pageSize));
  },
  async getScheduledReminder(schoolId, id) {
    const reminder =
      scheduled.find(item => item.id === id && item.schoolId === schoolId) ??
      fail(
        'SCHEDULED_REMINDER_NOT_FOUND',
        'Scheduled Reminder was not found.',
        404,
      );
    return success({
      communication: reminder.communicationId
        ? communications.find(item => item.id === reminder.communicationId)
        : undefined,
      reminder,
      rule: ruleFor(schoolId, reminder.reminderRuleId),
    });
  },
  async cancelScheduledReminder(schoolId, id, reason) {
    if (!reason.trim())
      fail(
        'CANCELLATION_REASON_REQUIRED',
        'Cancellation reason is required.',
        422,
      );
    const current =
      scheduled.find(item => item.id === id && item.schoolId === schoolId) ??
      fail(
        'SCHEDULED_REMINDER_NOT_FOUND',
        'Scheduled Reminder was not found.',
        404,
      );
    if (!['SCHEDULED', 'QUEUED'].includes(current.status))
      fail(
        'SCHEDULED_REMINDER_NOT_CANCELLABLE',
        'Only scheduled or queued Reminders can be cancelled.',
        422,
      );
    const value = {
      ...current,
      failureReason: reason.trim(),
      status: 'CANCELLED' as const,
      updatedAt: clock(),
    };
    scheduled = scheduled.map(item => (item.id === current.id ? value : item));
    addActivity(schoolId, 'SCHEDULED_REMINDER_CANCELLED', id, {
      reason: reason.trim(),
    });
    return success(value, 'Scheduled Reminder cancelled.');
  },
  async getCommunicationHistory(schoolId, query = {}) {
    const items = communications
      .filter(
        item =>
          item.schoolId === schoolId &&
          (!query.branchId || item.branchId === query.branchId) &&
          (!query.studentId || item.studentId === query.studentId) &&
          (!query.feeDueId || item.feeDueIds.includes(query.feeDueId)) &&
          (!query.paymentId || item.paymentId === query.paymentId) &&
          (!query.receiptId || item.receiptId === query.receiptId) &&
          (!query.status ||
            query.status === 'ALL' ||
            item.status === query.status),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return success(paginate(items, query.page, query.pageSize));
  },
  async getCommunication(schoolId, id) {
    const value =
      communications.find(
        item => item.id === id && item.schoolId === schoolId,
      ) ?? fail('COMMUNICATION_NOT_FOUND', 'Communication was not found.', 404);
    const settingsValue = settings.find(item => item.schoolId === schoolId);
    const attempts = communications.filter(
      item => item.logicalIdempotencyKey === value.logicalIdempotencyKey,
    );
    return success({
      attempts,
      communication: value,
      retryEligible:
        value.status === 'FAILED' &&
        attempts.length < (settingsValue?.maximumRetryCount ?? 3),
      retryReason:
        value.status !== 'FAILED'
          ? 'Only failed Communications can be retried.'
          : undefined,
    });
  },
  async retryCommunication(schoolId, id) {
    const original =
      communications.find(
        item => item.id === id && item.schoolId === schoolId,
      ) ?? fail('COMMUNICATION_NOT_FOUND', 'Communication was not found.', 404);
    if (original.status !== 'FAILED')
      fail(
        'COMMUNICATION_NOT_RETRYABLE',
        'Only failed Communications can be retried.',
        422,
      );
    const attempts = communications.filter(
      item => item.logicalIdempotencyKey === original.logicalIdempotencyKey,
    );
    if (
      attempts.length >=
      (settings.find(item => item.schoolId === schoolId)?.maximumRetryCount ??
        3)
    )
      fail('COMMUNICATION_RETRY_LIMIT', 'Maximum retry count reached.', 422);
    const selected = templateFor(schoolId, original.templateId);
    if (selected.status !== 'ACTIVE')
      fail(
        'INACTIVE_TEMPLATE',
        'The original Template is no longer active.',
        422,
      );
    const data = dataForPreview(schoolId, {
      branchId: original.branchId,
      communicationType: original.communicationType,
      feeDueIds: original.feeDueIds,
      guardianId: original.guardianId,
      mode: 'PROVIDER_SEND',
      paymentId: original.paymentId,
      publishedResultSnapshotId: original.publishedResultSnapshotId,
      receiptId: original.receiptId,
      reportCardId: original.reportCardId,
      studentId: original.studentId,
      templateId: original.templateId,
    });
    const rendered = renderTemplate(selected, data.variables);
    const result = await communicationProvider.sendMessage({
      channel: 'WHATSAPP',
      communicationType: original.communicationType,
      idempotencyKey: `${original.logicalIdempotencyKey}::${
        attempts.length + 1
      }`,
      recipientMobile: data.recipient.normalizedMobile,
      renderedContent: rendered,
    });
    const now = clock();
    const value: CommunicationRecord = {
      ...original,
      attemptNumber: attempts.length + 1,
      createdAt: now,
      deliveredAt: result.status === 'DELIVERED' ? now : undefined,
      failedAt: result.status === 'FAILED' ? now : undefined,
      failureCode: result.failureCode,
      failureReason: result.failureReason,
      id: `communication-retry-${++sequence}`,
      idempotencyKey: `${original.logicalIdempotencyKey}::${
        attempts.length + 1
      }`,
      providerMessageId: result.providerMessageId,
      providerStatus: result.providerStatus,
      renderedContent: rendered,
      sentAt: result.status !== 'FAILED' ? now : undefined,
      status: result.status,
      templateSnapshot: snapshotTemplate(selected, data.variables),
      updatedAt: now,
    };
    communications.push(value);
    addActivity(schoolId, 'COMMUNICATION_RETRIED', value.id, {
      originalId: original.id,
    });
    return success(value, `Development mock retry result: ${value.status}.`);
  },
  async shareReceipt(schoolId, receiptId, input) {
    const preview = await mockCommunicationService.previewCommunication(
      schoolId,
      {
        communicationType: 'RECEIPT_SHARE',
        guardianId: input.guardianId,
        mode: input.mode,
        receiptId,
        templateId: input.templateId,
      },
    );
    return mockCommunicationService.sendManualCommunication(schoolId, {
      initiatedByName: input.initiatedByName,
      initiatedByUserId: input.initiatedByUserId,
      previewId: preview.data.previewId,
    });
  },
  async previewResultCommunication(schoolId, input) {
    return mockCommunicationService.previewCommunication(schoolId, input);
  },
  async sendResultCommunication(schoolId, input) {
    return mockCommunicationService.sendManualCommunication(schoolId, input);
  },
  async shareReportCard(schoolId, reportCardId, input) {
    const card = reportCardRepository
      .cards()
      .find(item => item.id === reportCardId && item.schoolId === schoolId);
    if (!card) fail('REPORT_CARD_NOT_FOUND', 'Report Card was not found.', 404);
    const preview = await mockCommunicationService.previewResultCommunication(
      schoolId,
      {
        communicationType: 'REPORT_CARD_SHARE',
        guardianId: input.guardianId,
        mode: input.mode,
        publishedResultSnapshotId: card.publishedResultSnapshotId,
        reportCardId,
        templateId: input.templateId,
      },
    );
    return mockCommunicationService.sendResultCommunication(schoolId, {
      initiatedByName: input.initiatedByName,
      initiatedByUserId: input.initiatedByUserId,
      previewId: preview.data.previewId,
    });
  },
  async getExaminationCommunicationHistory(schoolId, query = {}) {
    const examinationTypes = new Set([
      'RESULT_PUBLISHED',
      'REPORT_CARD_AVAILABLE',
      'REPORT_CARD_SHARE',
    ]);
    const items = communications
      .filter(
        item =>
          item.schoolId === schoolId &&
          examinationTypes.has(item.communicationType) &&
          (!query.branchId || item.branchId === query.branchId) &&
          (!query.studentId || item.studentId === query.studentId) &&
          (!query.publishedResultSnapshotId ||
            item.publishedResultSnapshotId ===
              query.publishedResultSnapshotId) &&
          (!query.reportCardId || item.reportCardId === query.reportCardId) &&
          (!query.status ||
            query.status === 'ALL' ||
            item.status === query.status),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return success(paginate(items, query.page, query.pageSize));
  },
  async getNotifications(schoolId, query = {}) {
    school(schoolId);
    const items = notifications.filter(
      item =>
        item.schoolId === schoolId &&
        (!query.audienceType || item.audienceType === query.audienceType) &&
        (!query.audienceId || item.audienceId === query.audienceId) &&
        (!query.branchId || item.branchId === query.branchId) &&
        (!query.status ||
          query.status === 'ALL' ||
          item.status === query.status) &&
        (!query.type || query.type === 'ALL' || item.type === query.type),
    );
    return success(
      paginate(
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        query.page,
        query.pageSize,
      ),
    );
  },
  async markNotificationRead(schoolId, id) {
    const current =
      notifications.find(
        item => item.id === id && item.schoolId === schoolId,
      ) ?? fail('NOTIFICATION_NOT_FOUND', 'Notification was not found.', 404);
    const value = {
      ...current,
      readAt: current.readAt ?? clock(),
      status: 'READ' as const,
    };
    notifications = notifications.map(item => (item.id === id ? value : item));
    addActivity(schoolId, 'NOTIFICATION_READ', id);
    return success(value, 'Notification marked as read.');
  },
  async markAllNotificationsRead(schoolId, audienceId) {
    const at = clock();
    notifications = notifications.map(item =>
      item.schoolId === schoolId &&
      (!audienceId || item.audienceId === audienceId) &&
      item.status === 'UNREAD'
        ? { ...item, readAt: at, status: 'READ' }
        : item,
    );
    addActivity(schoolId, 'NOTIFICATION_READ', audienceId, { all: true });
    return success(null, 'Notifications marked as read.');
  },
  async archiveNotification(schoolId, id) {
    const current =
      notifications.find(
        item => item.id === id && item.schoolId === schoolId,
      ) ?? fail('NOTIFICATION_NOT_FOUND', 'Notification was not found.', 404);
    const value = {
      ...current,
      archivedAt: clock(),
      status: 'ARCHIVED' as const,
    };
    notifications = notifications.map(item => (item.id === id ? value : item));
    addActivity(schoolId, 'NOTIFICATION_ARCHIVED', id);
    return success(value, 'Notification archived.');
  },
  async getParentNotifications(schoolId, membershipId, activeMembershipId) {
    if (activeMembershipId && membershipId !== activeMembershipId)
      fail(
        'PARENT_NOTIFICATION_FORBIDDEN',
        'You can only view notifications for your active Parent membership.',
        403,
      );
    return success(
      notifications.filter(
        item =>
          item.schoolId === schoolId &&
          item.audienceType === 'PARENT_MEMBERSHIP' &&
          item.audienceId === membershipId,
      ),
    );
  },
  async getStudentNotifications(schoolId, membershipId, activeMembershipId) {
    if (activeMembershipId && membershipId !== activeMembershipId)
      fail(
        'STUDENT_NOTIFICATION_FORBIDDEN',
        'You can only view notifications for your active Student membership.',
        403,
      );
    return success(
      notifications.filter(
        item =>
          item.schoolId === schoolId &&
          item.audienceType === 'STUDENT_MEMBERSHIP' &&
          item.audienceId === membershipId,
      ),
    );
  },
};
