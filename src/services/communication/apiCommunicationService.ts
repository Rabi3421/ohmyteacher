import { ApiClientError } from '../api/apiError';
import type { CommunicationService } from './communicationService';

const unavailable = (): never => {
  throw new ApiClientError({
    code: 'COMMUNICATION_API_UNAVAILABLE',
    message: 'Communication API mode is not configured.',
    status: 503,
  });
};

export const apiCommunicationService: CommunicationService = {
  archiveNotification: async () => unavailable(),
  cancelScheduledReminder: async () => unavailable(),
  commitBulkReminder: async () => unavailable(),
  createReminderRule: async () => unavailable(),
  createTemplate: async () => unavailable(),
  getCommunication: async () => unavailable(),
  getCommunicationDashboard: async () => unavailable(),
  getCommunicationHistory: async () => unavailable(),
  getExaminationCommunicationHistory: async () => unavailable(),
  getCommunicationSettings: async () => unavailable(),
  getNotifications: async () => unavailable(),
  getParentNotifications: async () => unavailable(),
  getReminderRule: async () => unavailable(),
  getReminderRules: async () => unavailable(),
  getScheduledReminder: async () => unavailable(),
  getScheduledReminders: async () => unavailable(),
  getStudentNotifications: async () => unavailable(),
  getTemplate: async () => unavailable(),
  getTemplates: async () => unavailable(),
  markAllNotificationsRead: async () => unavailable(),
  markNotificationRead: async () => unavailable(),
  previewBulkReminder: async () => unavailable(),
  previewCommunication: async () => unavailable(),
  previewResultCommunication: async () => unavailable(),
  retryCommunication: async () => unavailable(),
  sendManualCommunication: async () => unavailable(),
  sendResultCommunication: async () => unavailable(),
  shareReportCard: async () => unavailable(),
  shareReceipt: async () => unavailable(),
  updateCommunicationSettings: async () => unavailable(),
  updateReminderRule: async () => unavailable(),
  updateReminderRuleStatus: async () => unavailable(),
  updateTemplate: async () => unavailable(),
  updateTemplateStatus: async () => unavailable(),
};
