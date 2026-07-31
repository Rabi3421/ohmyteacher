import type { ID, PaginatedResponse } from './common';

export type CommunicationChannel = 'WHATSAPP' | 'IN_APP';
export type CommunicationType =
  | 'PAYMENT_CONFIRMATION'
  | 'RECEIPT_SHARE'
  | 'UPCOMING_DUE_REMINDER'
  | 'DUE_DATE_REMINDER'
  | 'OVERDUE_REMINDER'
  | 'MANUAL_DUE_REMINDER'
  | 'FINE_UPDATED_NOTICE'
  | 'GENERAL_FEE_NOTICE'
  | 'RESULT_PUBLISHED'
  | 'REPORT_CARD_AVAILABLE'
  | 'REPORT_CARD_SHARE';
export type CommunicationStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'QUEUED'
  | 'SENDING'
  | 'HANDED_OFF'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'CANCELLED'
  | 'SKIPPED';
export type CommunicationMode =
  | 'MANUAL_SHARE'
  | 'PROVIDER_SEND'
  | 'SYSTEM_NOTIFICATION';
export type MessageTemplateStatus = 'ACTIVE' | 'INACTIVE';
export type MessageLanguage = 'ENGLISH' | 'HINGLISH';
export type ReminderTriggerType =
  | 'BEFORE_DUE_DATE'
  | 'ON_DUE_DATE'
  | 'AFTER_DUE_DATE'
  | 'RECURRING_OVERDUE';
export type ReminderRuleStatus = 'ACTIVE' | 'PAUSED' | 'INACTIVE';
export type ScheduledReminderStatus =
  | 'SCHEDULED'
  | 'QUEUED'
  | 'SENT'
  | 'FAILED'
  | 'CANCELLED'
  | 'SKIPPED';
export type NotificationAudience =
  | 'STAFF_USER'
  | 'PARENT_MEMBERSHIP'
  | 'STUDENT_MEMBERSHIP';
export type NotificationStatus = 'UNREAD' | 'READ' | 'ARCHIVED';

export const TEMPLATE_VARIABLES = [
  'schoolName',
  'branchName',
  'studentName',
  'admissionNumber',
  'className',
  'sectionName',
  'parentName',
  'feeHeadName',
  'feePeriod',
  'dueDate',
  'dueAmount',
  'fineAmount',
  'outstandingAmount',
  'paymentAmount',
  'paymentDate',
  'paymentMode',
  'receiptNumber',
  'receiptLink',
  'schoolPhone',
  'examName',
  'examTerm',
  'examType',
  'academicSession',
  'percentage',
  'grade',
  'resultOutcome',
  'rank',
  'reportCardNumber',
  'reportCardLink',
  'publishedDate',
] as const;
export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];
export type TemplateVariables = Partial<Record<TemplateVariable, string>>;

export interface MessageTemplate {
  id: ID;
  schoolId: ID;
  name: string;
  code: string;
  communicationType: CommunicationType;
  channel: CommunicationChannel;
  language: MessageLanguage;
  content: string;
  allowedVariables: TemplateVariable[];
  requiredVariables: TemplateVariable[];
  includeReceiptLink: boolean;
  includeSchoolContact: boolean;
  isDefault: boolean;
  status: MessageTemplateStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MessageTemplateSnapshot {
  name: string;
  code: string;
  content: string;
  variablesUsed: TemplateVariables;
  language: MessageLanguage;
  channel: CommunicationChannel;
}

export interface CommunicationSettings {
  schoolId: ID;
  defaultLanguage: MessageLanguage;
  defaultWhatsAppCountryCode: string;
  schoolContactNumber: string;
  reminderTime: string;
  reminderTimezone: string;
  manualShareEnabled: boolean;
  automatedReminderEnabled: boolean;
  providerConfigurationStatus: 'DEVELOPMENT_MOCK' | 'AVAILABLE' | 'UNAVAILABLE';
  receiptLinkExpiryLabel: string;
  maximumRetryCount: number;
  updatedAt: string;
}

export interface ReminderRule {
  id: ID;
  schoolId: ID;
  name: string;
  code: string;
  branchIds: ID[];
  triggerType: ReminderTriggerType;
  dayOffset: number;
  repeatEveryDays?: number;
  maximumOccurrences?: number;
  communicationType: CommunicationType;
  templateId: ID;
  feeHeadIds?: ID[];
  classIds?: ID[];
  sectionIds?: ID[];
  periodKeys?: string[];
  minimumDaysOverdue?: number;
  minimumOutstandingPaise?: number;
  includeFine: boolean;
  sendTime: string;
  timezone: string;
  status: ReminderRuleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedRecipient {
  studentId: ID;
  guardianId: ID;
  parentMembershipId?: ID;
  guardianName: string;
  normalizedMobile: string;
  maskedMobile: string;
  source: 'FEE_CONTACT' | 'PRIMARY_CONTACT' | 'EXPLICIT_GUARDIAN';
  whatsappEnabled: boolean;
}

export interface ScheduledReminder {
  id: ID;
  schoolId: ID;
  branchId: ID;
  reminderRuleId: ID;
  feeDueId: ID;
  studentId: ID;
  guardianId: ID;
  parentMembershipId?: ID;
  templateId: ID;
  scheduledFor: string;
  occurrenceNumber: number;
  recipientMobileMasked: string;
  status: ScheduledReminderStatus;
  idempotencyKey: string;
  communicationId?: ID;
  skipReason?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationRecord {
  id: ID;
  schoolId: ID;
  branchId?: ID;
  communicationType: CommunicationType;
  channel: CommunicationChannel;
  studentId?: ID;
  guardianId?: ID;
  parentMembershipId?: ID;
  feeDueIds: ID[];
  paymentId?: ID;
  receiptId?: ID;
  publishedResultSnapshotId?: ID;
  reportCardId?: ID;
  templateId: ID;
  templateSnapshot: MessageTemplateSnapshot;
  renderedContent: string;
  recipientName?: string;
  recipientMobileMasked?: string;
  mode: CommunicationMode;
  status: CommunicationStatus;
  providerMessageId?: string;
  providerStatus?: string;
  scheduledFor?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  failureCode?: string;
  failureReason?: string;
  idempotencyKey: string;
  logicalIdempotencyKey: string;
  attemptNumber: number;
  initiatedByUserId?: ID;
  initiatedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: ID;
  schoolId: ID;
  audienceType: NotificationAudience;
  audienceId: ID;
  type: CommunicationType;
  title: string;
  message: string;
  studentId?: ID;
  feeDueId?: ID;
  paymentId?: ID;
  receiptId?: ID;
  publishedResultSnapshotId?: ID;
  reportCardId?: ID;
  branchId?: ID;
  status: NotificationStatus;
  createdAt: string;
  readAt?: string;
  archivedAt?: string;
}

export interface CommunicationContext {
  schoolId: ID;
  branchId?: ID;
  academicSessionId?: ID;
  sessionStatus?: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
  asOfDate: string;
}

export interface CommunicationDashboardQuery {
  branchId?: ID;
  academicSessionId?: ID;
  fromDate?: string;
  toDate?: string;
}
export interface CommunicationDashboardSummary {
  messagesToday: number;
  scheduled: number;
  queued: number;
  sent: number;
  delivered: number;
  failed: number;
  manualShares: number;
  parentsWithoutValidContact: number;
  recent: CommunicationRecord[];
  upcoming: ScheduledReminder[];
  activeRuleCount: number;
}

export interface MessageTemplateListQuery {
  communicationType?: CommunicationType | 'ALL';
  status?: MessageTemplateStatus | 'ALL';
  language?: MessageLanguage | 'ALL';
  search?: string;
  page?: number;
  pageSize?: number;
}
export type MessageTemplatePage = PaginatedResponse<MessageTemplate>;
export type CreateMessageTemplateInput = Omit<
  MessageTemplate,
  'id' | 'schoolId' | 'createdAt' | 'updatedAt'
>;
export type UpdateMessageTemplateInput = CreateMessageTemplateInput;

export interface PreviewCommunicationInput {
  communicationType: CommunicationType;
  templateId?: ID;
  studentId?: ID;
  guardianId?: ID;
  feeDueIds?: ID[];
  paymentId?: ID;
  receiptId?: ID;
  publishedResultSnapshotId?: ID;
  reportCardId?: ID;
  mode: Exclude<CommunicationMode, 'SYSTEM_NOTIFICATION'>;
  branchId?: ID;
}
export interface CommunicationPreview {
  previewId: ID;
  expiresAt: string;
  input: PreviewCommunicationInput;
  template: MessageTemplate;
  renderedContent: string;
  variables: TemplateVariables;
  recipient: ResolvedRecipient;
  warnings: string[];
}
export interface SendManualCommunicationInput {
  previewId: ID;
  initiatedByUserId: ID;
  initiatedByName: string;
  remarks?: string;
}

export interface ReminderRuleListQuery {
  branchId?: ID;
  status?: ReminderRuleStatus | 'ALL';
  page?: number;
  pageSize?: number;
}
export type CreateReminderRuleInput = Omit<
  ReminderRule,
  'id' | 'schoolId' | 'createdAt' | 'updatedAt'
>;
export type UpdateReminderRuleInput = CreateReminderRuleInput;
export interface ScheduledReminderListQuery {
  branchId?: ID;
  status?: ScheduledReminderStatus | 'ALL';
  page?: number;
  pageSize?: number;
}
export interface ScheduledReminderDetails {
  reminder: ScheduledReminder;
  rule: ReminderRule;
  communication?: CommunicationRecord;
}

export interface PreviewBulkReminderInput {
  branchId: ID;
  academicSessionId: ID;
  sessionStatus?: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
  templateId: ID;
  reminderRuleId?: ID;
  scheduledFor: string;
  studentIds?: ID[];
  feeHeadIds?: ID[];
  classIds?: ID[];
  sectionIds?: ID[];
  periodKeys?: string[];
  minimumDaysOverdue?: number;
  minimumOutstandingPaise?: number;
  dueStatuses?: string[];
  /** Development mock test hook; ignored by the future production API. */
  simulateAtomicFailure?: boolean;
}
export interface BulkReminderPreviewItem {
  feeDueId: ID;
  studentId: ID;
  studentName: string;
  guardianName?: string;
  recipientMobileMasked?: string;
  eligible: boolean;
  reason?: string;
}
export interface BulkReminderPreview {
  previewId: ID;
  expiresAt: string;
  input: PreviewBulkReminderInput;
  items: BulkReminderPreviewItem[];
  candidates: number;
  eligible: number;
  missingContact: number;
  whatsappDisabled: number;
  duplicate: number;
  belowThreshold: number;
  terminal: number;
  estimatedMessageCount: number;
}
export interface CommitBulkReminderInput {
  previewId: ID;
  initiatedByUserId: ID;
}
export interface BulkReminderResult {
  jobId: ID;
  candidates: number;
  eligible: number;
  scheduled: number;
  sent: number;
  skipped: number;
  failed: number;
  missingContact: number;
  duplicate: number;
  providerMode: 'DEVELOPMENT_MOCK' | 'BACKEND_JOB';
}

export interface CommunicationHistoryQuery {
  branchId?: ID;
  studentId?: ID;
  feeDueId?: ID;
  paymentId?: ID;
  receiptId?: ID;
  status?: CommunicationStatus | 'ALL';
  page?: number;
  pageSize?: number;
}
export interface CommunicationDetails {
  communication: CommunicationRecord;
  retryEligible: boolean;
  retryReason?: string;
  attempts: CommunicationRecord[];
}
export interface ShareReceiptInput {
  templateId?: ID;
  guardianId?: ID;
  mode: 'MANUAL_SHARE' | 'PROVIDER_SEND';
  initiatedByUserId: ID;
  initiatedByName: string;
}
export interface PreviewResultCommunicationInput {
  communicationType:
    | 'RESULT_PUBLISHED'
    | 'REPORT_CARD_AVAILABLE'
    | 'REPORT_CARD_SHARE';
  publishedResultSnapshotId: ID;
  reportCardId?: ID;
  templateId?: ID;
  guardianId?: ID;
  mode: 'MANUAL_SHARE' | 'PROVIDER_SEND';
}
export interface SendResultCommunicationInput {
  previewId: ID;
  initiatedByUserId: ID;
  initiatedByName: string;
}
export interface ShareReportCardInput {
  templateId?: ID;
  guardianId?: ID;
  mode: 'MANUAL_SHARE' | 'PROVIDER_SEND';
  initiatedByUserId: ID;
  initiatedByName: string;
}
export interface ExaminationCommunicationHistoryQuery {
  branchId?: ID;
  studentId?: ID;
  publishedResultSnapshotId?: ID;
  reportCardId?: ID;
  status?: CommunicationStatus | 'ALL';
  page?: number;
  pageSize?: number;
}
export interface NotificationListQuery {
  audienceType?: NotificationAudience;
  audienceId?: ID;
  branchId?: ID;
  status?: NotificationStatus | 'ALL';
  type?: CommunicationType | 'ALL';
  page?: number;
  pageSize?: number;
}
export type NotificationPage = PaginatedResponse<AppNotification>;

export type CommunicationActivityType =
  | 'MESSAGE_TEMPLATE_CREATED'
  | 'MESSAGE_TEMPLATE_UPDATED'
  | 'MESSAGE_TEMPLATE_STATUS_CHANGED'
  | 'COMMUNICATION_PREVIEWED'
  | 'MANUAL_SHARE_HANDED_OFF'
  | 'PROVIDER_MESSAGE_QUEUED'
  | 'PROVIDER_MESSAGE_SENT'
  | 'PROVIDER_MESSAGE_DELIVERED'
  | 'PROVIDER_MESSAGE_FAILED'
  | 'COMMUNICATION_RETRIED'
  | 'REMINDER_RULE_CREATED'
  | 'REMINDER_RULE_UPDATED'
  | 'REMINDER_RULE_PAUSED'
  | 'REMINDER_RULE_ACTIVATED'
  | 'BULK_REMINDER_PREVIEWED'
  | 'BULK_REMINDER_COMMITTED'
  | 'SCHEDULED_REMINDER_CANCELLED'
  | 'NOTIFICATION_CREATED'
  | 'NOTIFICATION_READ'
  | 'NOTIFICATION_ARCHIVED';
export interface CommunicationActivity {
  id: ID;
  schoolId: ID;
  action: CommunicationActivityType;
  entityId?: ID;
  performedByUserId?: ID;
  occurredAt: string;
  metadata: Record<string, string | number | boolean | undefined>;
}
