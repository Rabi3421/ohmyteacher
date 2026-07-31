import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { PermissionKey } from '../../constants/userPermissions';
import type { UserMembership } from '../../models/auth';
import type { PaginatedResponse } from '../../models/common';
import type {
  AppNotification,
  BulkReminderPreview,
  BulkReminderResult,
  CommunicationContext,
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
  NotificationListQuery,
  PreviewBulkReminderInput,
  PreviewCommunicationInput,
  ReminderRule,
  ReminderRuleListQuery,
  ScheduledReminder,
  ScheduledReminderDetails,
  ScheduledReminderListQuery,
} from '../../models/communication';
import { ApiClientError, type ApiError } from '../../services/api/apiError';
import type { CommunicationService } from '../../services/communication/communicationService';
import { communicationService } from '../../services/communication/communicationServiceResolver';
import { getEffectivePermissions } from '../../utils/effectivePermissions';
import { authStore } from '../auth/authStore';
import { userManagementStore } from '../userManagement/userManagementStore';

const page = <T>(): PaginatedResponse<T> => ({
  items: [],
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
});

export interface CommunicationState {
  context: CommunicationContext | null;
  dashboard: CommunicationDashboardSummary | null;
  settings: CommunicationSettings | null;
  templates: PaginatedResponse<MessageTemplate>;
  templateQuery: MessageTemplateListQuery;
  selectedTemplate: MessageTemplate | null;
  templateDraft: Partial<CreateMessageTemplateInput>;
  messageDraft: Partial<PreviewCommunicationInput>;
  messagePreview: CommunicationPreview | null;
  bulkDraft: Partial<PreviewBulkReminderInput>;
  bulkPreview: BulkReminderPreview | null;
  bulkResult: BulkReminderResult | null;
  reminderRules: PaginatedResponse<ReminderRule>;
  reminderRuleQuery: ReminderRuleListQuery;
  selectedReminderRule: ReminderRule | null;
  reminderRuleDraft: Partial<CreateReminderRuleInput>;
  scheduledReminders: PaginatedResponse<ScheduledReminder>;
  scheduledQuery: ScheduledReminderListQuery;
  selectedScheduledReminder: ScheduledReminderDetails | null;
  history: PaginatedResponse<CommunicationRecord>;
  historyQuery: CommunicationHistoryQuery;
  selectedCommunication: CommunicationDetails | null;
  failedCommunications: CommunicationRecord[];
  notifications: PaginatedResponse<AppNotification>;
  notificationQuery: NotificationListQuery;
  selectedNotification: AppNotification | null;
  parentNotifications: AppNotification[];
  studentNotifications: AppNotification[];
  isLoadingDashboard: boolean;
  isLoadingSettings: boolean;
  isSavingSettings: boolean;
  isLoadingTemplates: boolean;
  isSavingTemplate: boolean;
  isPreviewingMessage: boolean;
  isSendingManualMessage: boolean;
  isPreviewingBulkReminder: boolean;
  isCommittingBulkReminder: boolean;
  isLoadingReminderRules: boolean;
  isSavingReminderRule: boolean;
  isLoadingScheduledReminders: boolean;
  isCancellingReminder: boolean;
  isLoadingHistory: boolean;
  isLoadingCommunication: boolean;
  isRetryingCommunication: boolean;
  isLoadingNotifications: boolean;
  isUpdatingNotification: boolean;
  isLoadingParentNotifications: boolean;
  isLoadingStudentNotifications: boolean;
  error: ApiError | null;
  successMessage: string | null;
}

export interface CommunicationActions {
  setContext(context: CommunicationContext | null): void;
  loadDashboard(): Promise<boolean>;
  loadSettings(): Promise<boolean>;
  saveSettings(input: Partial<CommunicationSettings>): Promise<boolean>;
  setTemplateQuery(query: Partial<MessageTemplateListQuery>): void;
  loadTemplates(): Promise<boolean>;
  loadTemplate(id: string): Promise<boolean>;
  setTemplateDraft(draft: Partial<CreateMessageTemplateInput>): void;
  saveTemplate(id?: string): Promise<boolean>;
  updateTemplateStatus(
    id: string,
    status: MessageTemplate['status'],
  ): Promise<boolean>;
  setMessageDraft(draft: Partial<PreviewCommunicationInput>): void;
  previewMessage(): Promise<boolean>;
  sendMessage(): Promise<boolean>;
  clearMessageDraft(): void;
  setBulkDraft(draft: Partial<PreviewBulkReminderInput>): void;
  previewBulk(): Promise<boolean>;
  commitBulk(): Promise<boolean>;
  clearBulkDraft(): void;
  setReminderRuleQuery(query: Partial<ReminderRuleListQuery>): void;
  loadReminderRules(): Promise<boolean>;
  loadReminderRule(id: string): Promise<boolean>;
  setReminderRuleDraft(draft: Partial<CreateReminderRuleInput>): void;
  saveReminderRule(id?: string): Promise<boolean>;
  updateReminderRuleStatus(
    id: string,
    status: ReminderRule['status'],
  ): Promise<boolean>;
  setScheduledQuery(query: Partial<ScheduledReminderListQuery>): void;
  loadScheduledReminders(): Promise<boolean>;
  loadScheduledReminder(id: string): Promise<boolean>;
  cancelScheduledReminder(id: string, reason: string): Promise<boolean>;
  setHistoryQuery(query: Partial<CommunicationHistoryQuery>): void;
  loadHistory(): Promise<boolean>;
  loadFailedCommunications(): Promise<boolean>;
  loadCommunication(id: string): Promise<boolean>;
  retryCommunication(id: string): Promise<boolean>;
  shareReceipt(
    receiptId: string,
    mode?: 'MANUAL_SHARE' | 'PROVIDER_SEND',
  ): Promise<boolean>;
  setNotificationQuery(query: Partial<NotificationListQuery>): void;
  loadNotifications(): Promise<boolean>;
  selectNotification(notification: AppNotification | null): void;
  markNotificationRead(id: string): Promise<boolean>;
  markAllNotificationsRead(): Promise<boolean>;
  archiveNotification(id: string): Promise<boolean>;
  loadParentNotifications(
    schoolId: string,
    membershipId: string,
  ): Promise<boolean>;
  loadStudentNotifications(
    schoolId: string,
    membershipId: string,
  ): Promise<boolean>;
  clearFeedback(): void;
  reset(): void;
}

export type CommunicationStoreState = CommunicationState & CommunicationActions;
const loading = {
  isCancellingReminder: false,
  isCommittingBulkReminder: false,
  isLoadingCommunication: false,
  isLoadingDashboard: false,
  isLoadingHistory: false,
  isLoadingNotifications: false,
  isLoadingParentNotifications: false,
  isLoadingReminderRules: false,
  isLoadingScheduledReminders: false,
  isLoadingSettings: false,
  isLoadingStudentNotifications: false,
  isLoadingTemplates: false,
  isPreviewingBulkReminder: false,
  isPreviewingMessage: false,
  isRetryingCommunication: false,
  isSavingReminderRule: false,
  isSavingSettings: false,
  isSavingTemplate: false,
  isSendingManualMessage: false,
  isUpdatingNotification: false,
};
export const INITIAL_COMMUNICATION_STATE: CommunicationState = {
  ...loading,
  bulkDraft: {},
  bulkPreview: null,
  bulkResult: null,
  context: null,
  dashboard: null,
  error: null,
  failedCommunications: [],
  history: page(),
  historyQuery: { page: 1, pageSize: 20, status: 'ALL' },
  messageDraft: {},
  messagePreview: null,
  notificationQuery: { page: 1, pageSize: 20, status: 'ALL' },
  notifications: page(),
  parentNotifications: [],
  reminderRuleDraft: {},
  reminderRuleQuery: { page: 1, pageSize: 20, status: 'ALL' },
  reminderRules: page(),
  scheduledQuery: { page: 1, pageSize: 20, status: 'ALL' },
  scheduledReminders: page(),
  selectedCommunication: null,
  selectedNotification: null,
  selectedReminderRule: null,
  selectedScheduledReminder: null,
  selectedTemplate: null,
  settings: null,
  studentNotifications: [],
  successMessage: null,
  templateDraft: {},
  templateQuery: { page: 1, pageSize: 20, status: 'ALL' },
  templates: page(),
};

function normalize(error: unknown): ApiError {
  return error instanceof ApiClientError
    ? {
        code: error.code,
        fieldErrors: error.fieldErrors,
        message: error.message,
        status: error.status,
      }
    : {
        code: 'UNEXPECTED_COMMUNICATION_ERROR',
        message: 'The Communication operation could not be completed.',
      };
}

export function createCommunicationStore(input: {
  service: CommunicationService;
  getMembership: () => UserMembership | null;
  getPermissions: (membership: UserMembership) => PermissionKey[];
  getActorName?: () => string | undefined;
}): StoreApi<CommunicationStoreState> {
  let requestSequence = 0;
  return createStore<CommunicationStoreState>()((set, get) => {
    const membership = () =>
      input.getMembership() ?? deny('Select an active workspace.');
    const selected = () =>
      get().context ?? deny('Select Communication context.');
    const deny = (message: string): never => {
      throw new ApiClientError({
        code: 'COMMUNICATION_ACCESS_DENIED',
        message,
        status: 403,
      });
    };
    const requirePermission = (key: PermissionKey) => {
      const member = membership();
      if (!input.getPermissions(member).includes(key))
        deny('You do not have permission for this Communication action.');
      return member;
    };
    const contextKey = () => JSON.stringify(get().context);
    const begin = () => ({ context: contextKey(), token: ++requestSequence });
    const current = (request: { context: string; token: number }) =>
      request.context === contextKey() && request.token === requestSequence;
    const run = async <T>(options: {
      loading: keyof CommunicationState;
      permission?: PermissionKey;
      action: () => Promise<{ data: T; message?: string }>;
      success: (data: T) => Partial<CommunicationState>;
    }): Promise<boolean> => {
      const request = begin();
      set({
        error: null,
        [options.loading]: true,
      } as Partial<CommunicationState>);
      try {
        if (options.permission) requirePermission(options.permission);
        const response = await options.action();
        if (!current(request)) return false;
        set({
          ...options.success(response.data),
          [options.loading]: false,
          successMessage: response.message ?? null,
        } as Partial<CommunicationState>);
        return true;
      } catch (error) {
        if (current(request))
          set({
            error: normalize(error),
            [options.loading]: false,
          } as Partial<CommunicationState>);
        return false;
      }
    };
    return {
      ...INITIAL_COMMUNICATION_STATE,
      setContext(value) {
        const previous = get().context;
        if (JSON.stringify(previous) === JSON.stringify(value)) return;
        requestSequence++;
        const schoolChanged = previous?.schoolId !== value?.schoolId;
        set({
          ...loading,
          bulkDraft: {},
          bulkPreview: null,
          bulkResult: null,
          context: value,
          dashboard: null,
          error: null,
          history: page(),
          messageDraft: {},
          messagePreview: null,
          reminderRules: page(),
          scheduledReminders: page(),
          selectedCommunication: null,
          selectedReminderRule: null,
          selectedScheduledReminder: null,
          successMessage: null,
          ...(schoolChanged
            ? {
                failedCommunications: [],
                notifications: page(),
                parentNotifications: [],
                selectedNotification: null,
                selectedTemplate: null,
                settings: null,
                studentNotifications: [],
                templateDraft: {},
                templates: page(),
              }
            : {}),
        });
      },
      loadDashboard() {
        const value = selected();
        return run({
          action: () =>
            input.service.getCommunicationDashboard(value.schoolId, {
              academicSessionId: value.academicSessionId,
              branchId: value.branchId,
            }),
          loading: 'isLoadingDashboard',
          permission: 'communication.history.view',
          success: dashboard => ({ dashboard }),
        });
      },
      loadSettings() {
        const value = selected();
        return run({
          action: () => input.service.getCommunicationSettings(value.schoolId),
          loading: 'isLoadingSettings',
          permission: 'communication.settings.view',
          success: settingsValue => ({ settings: settingsValue }),
        });
      },
      saveSettings(value) {
        const context = selected();
        return run({
          action: () =>
            input.service.updateCommunicationSettings(context.schoolId, value),
          loading: 'isSavingSettings',
          permission: 'communication.settings.manage',
          success: settingsValue => ({ settings: settingsValue }),
        });
      },
      setTemplateQuery(value) {
        set({ templateQuery: { ...get().templateQuery, ...value } });
      },
      loadTemplates() {
        const value = selected();
        return run({
          action: () =>
            input.service.getTemplates(value.schoolId, get().templateQuery),
          loading: 'isLoadingTemplates',
          permission: 'communication.templates.view',
          success: templates => ({ templates }),
        });
      },
      loadTemplate(id) {
        const value = selected();
        return run({
          action: () => input.service.getTemplate(value.schoolId, id),
          loading: 'isLoadingTemplates',
          permission: 'communication.templates.view',
          success: selectedTemplate => ({
            selectedTemplate,
            templateDraft: selectedTemplate,
          }),
        });
      },
      setTemplateDraft(value) {
        set({ templateDraft: { ...get().templateDraft, ...value } });
      },
      saveTemplate(id) {
        const value = selected();
        const draft = get().templateDraft as CreateMessageTemplateInput;
        return run({
          action: () =>
            id
              ? input.service.updateTemplate(value.schoolId, id, draft)
              : input.service.createTemplate(value.schoolId, draft),
          loading: 'isSavingTemplate',
          permission: 'communication.templates.manage',
          success: selectedTemplate => ({
            selectedTemplate,
            templateDraft: {},
          }),
        });
      },
      updateTemplateStatus(id, status) {
        const value = selected();
        return run({
          action: () =>
            input.service.updateTemplateStatus(value.schoolId, id, status),
          loading: 'isSavingTemplate',
          permission: 'communication.templates.manage',
          success: selectedTemplate => ({ selectedTemplate }),
        });
      },
      setMessageDraft(value) {
        set({
          messageDraft: { ...get().messageDraft, ...value },
          messagePreview: null,
        });
      },
      previewMessage() {
        const value = selected();
        const draft = get().messageDraft as PreviewCommunicationInput;
        return run({
          action: () =>
            input.service.previewCommunication(value.schoolId, draft),
          loading: 'isPreviewingMessage',
          permission: 'communication.send.manual',
          success: messagePreview => ({ messagePreview }),
        });
      },
      sendMessage() {
        if (get().isSendingManualMessage) return Promise.resolve(false);
        const value = selected();
        const preview = get().messagePreview;
        const actor = requirePermission('communication.send.manual');
        if (!preview) {
          set({
            error: normalize(
              new ApiClientError({
                code: 'COMMUNICATION_PREVIEW_REQUIRED',
                message: 'Preview the message before sending.',
                status: 400,
              }),
            ),
          });
          return Promise.resolve(false);
        }
        return run({
          action: () =>
            input.service.sendManualCommunication(value.schoolId, {
              initiatedByName: input.getActorName?.() ?? actor.userId,
              initiatedByUserId: actor.userId,
              previewId: preview.previewId,
            }),
          loading: 'isSendingManualMessage',
          success: record => ({
            history: {
              ...get().history,
              items: [record, ...get().history.items],
            },
            messageDraft: {},
            messagePreview: null,
          }),
        });
      },
      clearMessageDraft() {
        set({ messageDraft: {}, messagePreview: null });
      },
      setBulkDraft(value) {
        set({
          bulkDraft: { ...get().bulkDraft, ...value },
          bulkPreview: null,
          bulkResult: null,
        });
      },
      previewBulk() {
        const value = selected();
        return run({
          action: () =>
            input.service.previewBulkReminder(
              value.schoolId,
              get().bulkDraft as PreviewBulkReminderInput,
            ),
          loading: 'isPreviewingBulkReminder',
          permission: 'communication.send.bulk',
          success: bulkPreview => ({ bulkPreview }),
        });
      },
      commitBulk() {
        if (get().isCommittingBulkReminder) return Promise.resolve(false);
        const value = selected();
        const preview = get().bulkPreview;
        const actor = requirePermission('communication.send.bulk');
        if (!preview) {
          set({
            error: normalize(
              new ApiClientError({
                code: 'BULK_PREVIEW_REQUIRED',
                message: 'Preview Bulk Reminders before commit.',
                status: 400,
              }),
            ),
          });
          return Promise.resolve(false);
        }
        return run({
          action: () =>
            input.service.commitBulkReminder(value.schoolId, {
              initiatedByUserId: actor.userId,
              previewId: preview.previewId,
            }),
          loading: 'isCommittingBulkReminder',
          success: bulkResult => ({
            bulkDraft: {},
            bulkPreview: null,
            bulkResult,
          }),
        });
      },
      clearBulkDraft() {
        set({ bulkDraft: {}, bulkPreview: null, bulkResult: null });
      },
      setReminderRuleQuery(value) {
        set({ reminderRuleQuery: { ...get().reminderRuleQuery, ...value } });
      },
      loadReminderRules() {
        const value = selected();
        return run({
          action: () =>
            input.service.getReminderRules(
              value.schoolId,
              get().reminderRuleQuery,
            ),
          loading: 'isLoadingReminderRules',
          permission: 'communication.reminders.view',
          success: reminderRules => ({ reminderRules }),
        });
      },
      loadReminderRule(id) {
        const value = selected();
        return run({
          action: () => input.service.getReminderRule(value.schoolId, id),
          loading: 'isLoadingReminderRules',
          permission: 'communication.reminders.view',
          success: selectedReminderRule => ({
            reminderRuleDraft: selectedReminderRule,
            selectedReminderRule,
          }),
        });
      },
      setReminderRuleDraft(value) {
        set({ reminderRuleDraft: { ...get().reminderRuleDraft, ...value } });
      },
      saveReminderRule(id) {
        const value = selected();
        const draft = get().reminderRuleDraft as CreateReminderRuleInput;
        return run({
          action: () =>
            id
              ? input.service.updateReminderRule(value.schoolId, id, draft)
              : input.service.createReminderRule(value.schoolId, draft),
          loading: 'isSavingReminderRule',
          permission: 'communication.reminders.manage',
          success: selectedReminderRule => ({
            reminderRuleDraft: {},
            selectedReminderRule,
          }),
        });
      },
      updateReminderRuleStatus(id, status) {
        const value = selected();
        return run({
          action: () =>
            input.service.updateReminderRuleStatus(value.schoolId, id, status),
          loading: 'isSavingReminderRule',
          permission: 'communication.reminders.manage',
          success: selectedReminderRule => ({ selectedReminderRule }),
        });
      },
      setScheduledQuery(value) {
        set({ scheduledQuery: { ...get().scheduledQuery, ...value } });
      },
      loadScheduledReminders() {
        const value = selected();
        return run({
          action: () =>
            input.service.getScheduledReminders(
              value.schoolId,
              get().scheduledQuery,
            ),
          loading: 'isLoadingScheduledReminders',
          permission: 'communication.reminders.view',
          success: scheduledReminders => ({ scheduledReminders }),
        });
      },
      loadScheduledReminder(id) {
        const value = selected();
        return run({
          action: () => input.service.getScheduledReminder(value.schoolId, id),
          loading: 'isLoadingScheduledReminders',
          permission: 'communication.reminders.view',
          success: selectedScheduledReminder => ({ selectedScheduledReminder }),
        });
      },
      cancelScheduledReminder(id, reason) {
        const value = selected();
        return run({
          action: () =>
            input.service.cancelScheduledReminder(value.schoolId, id, reason),
          loading: 'isCancellingReminder',
          permission: 'communication.reminders.manage',
          success: reminder => ({
            selectedScheduledReminder: get().selectedScheduledReminder
              ? { ...get().selectedScheduledReminder!, reminder }
              : null,
          }),
        });
      },
      setHistoryQuery(value) {
        set({ historyQuery: { ...get().historyQuery, ...value } });
      },
      loadHistory() {
        const value = selected();
        return run({
          action: () =>
            input.service.getCommunicationHistory(
              value.schoolId,
              get().historyQuery,
            ),
          loading: 'isLoadingHistory',
          permission: 'communication.history.view',
          success: history => ({ history }),
        });
      },
      loadFailedCommunications() {
        const value = selected();
        return run({
          action: () =>
            input.service.getCommunicationHistory(value.schoolId, {
              branchId: value.branchId,
              pageSize: 100,
              status: 'FAILED',
            }),
          loading: 'isLoadingHistory',
          permission: 'communication.history.view',
          success: result => ({ failedCommunications: result.items }),
        });
      },
      loadCommunication(id) {
        const value = selected();
        return run({
          action: () => input.service.getCommunication(value.schoolId, id),
          loading: 'isLoadingCommunication',
          permission: 'communication.history.view',
          success: selectedCommunication => ({ selectedCommunication }),
        });
      },
      retryCommunication(id) {
        const value = selected();
        return run({
          action: () => input.service.retryCommunication(value.schoolId, id),
          loading: 'isRetryingCommunication',
          permission: 'communication.failed.retry',
          success: record => ({
            failedCommunications: get().failedCommunications.filter(
              item => item.id !== id,
            ),
            selectedCommunication: null,
            history: {
              ...get().history,
              items: [record, ...get().history.items],
            },
          }),
        });
      },
      shareReceipt(receiptId, mode = 'MANUAL_SHARE') {
        const value = selected();
        const actor = requirePermission('communication.send.manual');
        return run({
          action: () =>
            input.service.shareReceipt(value.schoolId, receiptId, {
              initiatedByName: input.getActorName?.() ?? actor.userId,
              initiatedByUserId: actor.userId,
              mode,
            }),
          loading: 'isSendingManualMessage',
          success: record => ({
            history: {
              ...get().history,
              items: [record, ...get().history.items],
            },
          }),
        });
      },
      setNotificationQuery(value) {
        set({ notificationQuery: { ...get().notificationQuery, ...value } });
      },
      loadNotifications() {
        const value = selected();
        const actor = requirePermission('notifications.view');
        return run({
          action: () =>
            input.service.getNotifications(value.schoolId, {
              ...get().notificationQuery,
              audienceId: actor.id,
              audienceType: 'STAFF_USER',
              branchId: value.branchId,
            }),
          loading: 'isLoadingNotifications',
          success: notificationsValue => ({
            notifications: notificationsValue,
          }),
        });
      },
      selectNotification(value) {
        set({ selectedNotification: value });
      },
      markNotificationRead(id) {
        const value = selected();
        return run({
          action: () => input.service.markNotificationRead(value.schoolId, id),
          loading: 'isUpdatingNotification',
          permission: 'notifications.view',
          success: notification => ({
            notifications: {
              ...get().notifications,
              items: get().notifications.items.map(item =>
                item.id === id ? notification : item,
              ),
            },
            selectedNotification: notification,
          }),
        });
      },
      markAllNotificationsRead() {
        const value = selected();
        const actor = membership();
        return run({
          action: () =>
            input.service.markAllNotificationsRead(value.schoolId, actor.id),
          loading: 'isUpdatingNotification',
          permission: 'notifications.view',
          success: () => ({
            notifications: {
              ...get().notifications,
              items: get().notifications.items.map(item =>
                item.status === 'UNREAD' ? { ...item, status: 'READ' } : item,
              ),
            },
          }),
        });
      },
      archiveNotification(id) {
        const value = selected();
        return run({
          action: () => input.service.archiveNotification(value.schoolId, id),
          loading: 'isUpdatingNotification',
          permission: 'notifications.view',
          success: notification => ({
            notifications: {
              ...get().notifications,
              items: get().notifications.items.map(item =>
                item.id === id ? notification : item,
              ),
            },
            selectedNotification: notification,
          }),
        });
      },
      loadParentNotifications(schoolId, membershipId) {
        const actor = membership();
        if (actor.role !== 'PARENT' || actor.id !== membershipId) {
          set({
            error: normalize(
              new ApiClientError({
                code: 'PARENT_NOTIFICATION_FORBIDDEN',
                message: 'You can only view your Parent notifications.',
                status: 403,
              }),
            ),
          });
          return Promise.resolve(false);
        }
        return run({
          action: () =>
            input.service.getParentNotifications(
              schoolId,
              membershipId,
              actor.id,
            ),
          loading: 'isLoadingParentNotifications',
          permission: 'notifications.view',
          success: parentNotifications => ({ parentNotifications }),
        });
      },
      loadStudentNotifications(schoolId, membershipId) {
        const actor = membership();
        if (actor.role !== 'STUDENT' || actor.id !== membershipId) {
          set({
            error: normalize(
              new ApiClientError({
                code: 'STUDENT_NOTIFICATION_FORBIDDEN',
                message: 'You can only view your Student notifications.',
                status: 403,
              }),
            ),
          });
          return Promise.resolve(false);
        }
        return run({
          action: () =>
            input.service.getStudentNotifications(
              schoolId,
              membershipId,
              actor.id,
            ),
          loading: 'isLoadingStudentNotifications',
          permission: 'notifications.view',
          success: studentNotifications => ({ studentNotifications }),
        });
      },
      clearFeedback() {
        set({ error: null, successMessage: null });
      },
      reset() {
        requestSequence++;
        set(INITIAL_COMMUNICATION_STATE);
      },
    };
  });
}

export const communicationStore = createCommunicationStore({
  getActorName: () => authStore.getState().user?.name,
  getMembership: () => authStore.getState().activeMembership,
  getPermissions: membership => {
    const configuration = userManagementStore.getState().roleConfiguration;
    return getEffectivePermissions(
      membership.role,
      configuration &&
        configuration.schoolId === membership.schoolId &&
        configuration.role === membership.role
        ? configuration
        : null,
    );
  },
  service: communicationService,
});

let previousMembershipId = authStore.getState().activeMembership?.id;
authStore.subscribe(state => {
  const membershipId = state.activeMembership?.id;
  if (membershipId !== previousMembershipId) {
    previousMembershipId = membershipId;
    communicationStore.getState().reset();
  }
});

export function useCommunicationStore<T>(
  selector: (state: CommunicationStoreState) => T,
): T {
  return useStore(communicationStore, selector);
}
