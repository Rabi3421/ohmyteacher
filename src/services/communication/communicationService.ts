import type { ApiResponse, PaginatedResponse } from '../../models/common';
import type {
  AppNotification,
  BulkReminderPreview,
  BulkReminderResult,
  CommitBulkReminderInput,
  CommunicationDashboardQuery,
  CommunicationDashboardSummary,
  CommunicationDetails,
  CommunicationHistoryQuery,
  CommunicationPreview,
  CommunicationRecord,
  CommunicationSettings,
  CreateMessageTemplateInput,
  CreateReminderRuleInput,
  MessageTemplate,
  MessageTemplateListQuery,
  MessageTemplateStatus,
  NotificationListQuery,
  PreviewBulkReminderInput,
  PreviewCommunicationInput,
  PreviewResultCommunicationInput,
  ReminderRule,
  ReminderRuleListQuery,
  ReminderRuleStatus,
  ScheduledReminder,
  ScheduledReminderDetails,
  ScheduledReminderListQuery,
  SendManualCommunicationInput,
  ShareReceiptInput,
  ShareReportCardInput,
  SendResultCommunicationInput,
  ExaminationCommunicationHistoryQuery,
  UpdateMessageTemplateInput,
  UpdateReminderRuleInput,
} from '../../models/communication';

export interface CommunicationService {
  getCommunicationDashboard(
    schoolId: string,
    query: CommunicationDashboardQuery,
  ): Promise<ApiResponse<CommunicationDashboardSummary>>;
  getCommunicationSettings(
    schoolId: string,
  ): Promise<ApiResponse<CommunicationSettings>>;
  updateCommunicationSettings(
    schoolId: string,
    input: Partial<
      Omit<
        CommunicationSettings,
        'schoolId' | 'providerConfigurationStatus' | 'updatedAt'
      >
    >,
  ): Promise<ApiResponse<CommunicationSettings>>;
  getTemplates(
    schoolId: string,
    query?: MessageTemplateListQuery,
  ): Promise<ApiResponse<PaginatedResponse<MessageTemplate>>>;
  getTemplate(
    schoolId: string,
    templateId: string,
  ): Promise<ApiResponse<MessageTemplate>>;
  createTemplate(
    schoolId: string,
    input: CreateMessageTemplateInput,
  ): Promise<ApiResponse<MessageTemplate>>;
  updateTemplate(
    schoolId: string,
    templateId: string,
    input: UpdateMessageTemplateInput,
  ): Promise<ApiResponse<MessageTemplate>>;
  updateTemplateStatus(
    schoolId: string,
    templateId: string,
    status: MessageTemplateStatus,
  ): Promise<ApiResponse<MessageTemplate>>;
  previewCommunication(
    schoolId: string,
    input: PreviewCommunicationInput,
  ): Promise<ApiResponse<CommunicationPreview>>;
  sendManualCommunication(
    schoolId: string,
    input: SendManualCommunicationInput,
  ): Promise<ApiResponse<CommunicationRecord>>;
  previewBulkReminder(
    schoolId: string,
    input: PreviewBulkReminderInput,
  ): Promise<ApiResponse<BulkReminderPreview>>;
  commitBulkReminder(
    schoolId: string,
    input: CommitBulkReminderInput,
  ): Promise<ApiResponse<BulkReminderResult>>;
  getReminderRules(
    schoolId: string,
    query?: ReminderRuleListQuery,
  ): Promise<ApiResponse<PaginatedResponse<ReminderRule>>>;
  getReminderRule(
    schoolId: string,
    reminderRuleId: string,
  ): Promise<ApiResponse<ReminderRule>>;
  createReminderRule(
    schoolId: string,
    input: CreateReminderRuleInput,
  ): Promise<ApiResponse<ReminderRule>>;
  updateReminderRule(
    schoolId: string,
    reminderRuleId: string,
    input: UpdateReminderRuleInput,
  ): Promise<ApiResponse<ReminderRule>>;
  updateReminderRuleStatus(
    schoolId: string,
    reminderRuleId: string,
    status: ReminderRuleStatus,
  ): Promise<ApiResponse<ReminderRule>>;
  getScheduledReminders(
    schoolId: string,
    query?: ScheduledReminderListQuery,
  ): Promise<ApiResponse<PaginatedResponse<ScheduledReminder>>>;
  getScheduledReminder(
    schoolId: string,
    scheduledReminderId: string,
  ): Promise<ApiResponse<ScheduledReminderDetails>>;
  cancelScheduledReminder(
    schoolId: string,
    scheduledReminderId: string,
    reason: string,
  ): Promise<ApiResponse<ScheduledReminder>>;
  getCommunicationHistory(
    schoolId: string,
    query?: CommunicationHistoryQuery,
  ): Promise<ApiResponse<PaginatedResponse<CommunicationRecord>>>;
  getCommunication(
    schoolId: string,
    communicationId: string,
  ): Promise<ApiResponse<CommunicationDetails>>;
  retryCommunication(
    schoolId: string,
    communicationId: string,
  ): Promise<ApiResponse<CommunicationRecord>>;
  shareReceipt(
    schoolId: string,
    receiptId: string,
    input: ShareReceiptInput,
  ): Promise<ApiResponse<CommunicationRecord>>;
  getNotifications(
    schoolId: string,
    query?: NotificationListQuery,
  ): Promise<ApiResponse<PaginatedResponse<AppNotification>>>;
  markNotificationRead(
    schoolId: string,
    notificationId: string,
  ): Promise<ApiResponse<AppNotification>>;
  markAllNotificationsRead(
    schoolId: string,
    audienceId?: string,
  ): Promise<ApiResponse<null>>;
  archiveNotification(
    schoolId: string,
    notificationId: string,
  ): Promise<ApiResponse<AppNotification>>;
  getParentNotifications(
    schoolId: string,
    parentMembershipId: string,
    activeMembershipId?: string,
  ): Promise<ApiResponse<AppNotification[]>>;
  getStudentNotifications(
    schoolId: string,
    studentMembershipId: string,
    activeMembershipId?: string,
  ): Promise<ApiResponse<AppNotification[]>>;
  previewResultCommunication(
    schoolId: string,
    input: PreviewResultCommunicationInput,
  ): Promise<ApiResponse<CommunicationPreview>>;
  sendResultCommunication(
    schoolId: string,
    input: SendResultCommunicationInput,
  ): Promise<ApiResponse<CommunicationRecord>>;
  shareReportCard(
    schoolId: string,
    reportCardId: string,
    input: ShareReportCardInput,
  ): Promise<ApiResponse<CommunicationRecord>>;
  getExaminationCommunicationHistory(
    schoolId: string,
    query?: ExaminationCommunicationHistoryQuery,
  ): Promise<ApiResponse<PaginatedResponse<CommunicationRecord>>>;
}
