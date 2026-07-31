import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { RoleStackParamList } from '../../src/navigation/navigationTypes';
import {
  BulkReminderPreviewScreen,
  BulkReminderSetupScreen,
  CommunicationDashboardScreen,
  CommunicationDetailsScreen,
  CommunicationHistoryScreen,
  CommunicationSettingsScreen,
  CreateMessageTemplateScreen,
  CreateReminderRuleScreen,
  EditMessageTemplateScreen,
  EditReminderRuleScreen,
  FailedCommunicationsScreen,
  ManualFeeReminderScreen,
  MessagePreviewScreen,
  MessageTemplateDetailsScreen,
  MessageTemplatesScreen,
  NotificationCenterScreen,
  NotificationDetailsScreen,
  ParentNotificationDetailsScreen,
  ParentNotificationsScreen,
  ReminderRulesScreen,
  RetryCommunicationScreen,
  ScheduledReminderDetailsScreen,
  ScheduledRemindersScreen,
  StudentNotificationDetailsScreen,
  StudentNotificationsScreen,
} from '../../src/screens/communication/CommunicationScreens';
import {
  communicationStore,
  INITIAL_COMMUNICATION_STATE,
} from '../../src/store/communication/communicationStore';

jest.mock('react-native-keychain', () => ({
  getAllGenericPasswordServices: jest.fn().mockResolvedValue([]),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  setGenericPassword: jest.fn().mockResolvedValue({ service: 'test' }),
}));

const metrics = {
  frame: { height: 800, width: 400, x: 0, y: 0 },
  insets: { bottom: 0, left: 0, right: 0, top: 24 },
};
const context = {
  academicSessionId: 'session-school-omt-current',
  branchId: 'branch-main',
  schoolId: 'school-omt',
  sessionStatus: 'ACTIVE' as const,
};
function navigation<RouteName extends keyof RoleStackParamList>() {
  return {
    goBack: jest.fn(),
    navigate: jest.fn(),
    popTo: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
  } as unknown as NativeStackScreenProps<
    RoleStackParamList,
    RouteName
  >['navigation'];
}
function route<RouteName extends keyof RoleStackParamList>(
  name: RouteName,
  params: RoleStackParamList[RouteName],
) {
  return {
    key: `${String(name)}-test`,
    name,
    params,
  } as unknown as NativeStackScreenProps<
    RoleStackParamList,
    RouteName
  >['route'];
}

beforeEach(() => {
  communicationStore.setState({
    ...INITIAL_COMMUNICATION_STATE,
    archiveNotification: jest.fn().mockResolvedValue(true),
    cancelScheduledReminder: jest.fn().mockResolvedValue(true),
    commitBulk: jest.fn().mockResolvedValue(true),
    loadCommunication: jest.fn().mockResolvedValue(true),
    loadDashboard: jest.fn().mockResolvedValue(true),
    loadFailedCommunications: jest.fn().mockResolvedValue(true),
    loadHistory: jest.fn().mockResolvedValue(true),
    loadNotifications: jest.fn().mockResolvedValue(true),
    loadParentNotifications: jest.fn().mockResolvedValue(true),
    loadReminderRule: jest.fn().mockResolvedValue(true),
    loadReminderRules: jest.fn().mockResolvedValue(true),
    loadScheduledReminder: jest.fn().mockResolvedValue(true),
    loadScheduledReminders: jest.fn().mockResolvedValue(true),
    loadSettings: jest.fn().mockResolvedValue(true),
    loadStudentNotifications: jest.fn().mockResolvedValue(true),
    loadTemplate: jest.fn().mockResolvedValue(true),
    loadTemplates: jest.fn().mockResolvedValue(true),
    markAllNotificationsRead: jest.fn().mockResolvedValue(true),
    markNotificationRead: jest.fn().mockResolvedValue(true),
    previewBulk: jest.fn().mockResolvedValue(true),
    previewMessage: jest.fn().mockResolvedValue(true),
    retryCommunication: jest.fn().mockResolvedValue(true),
    saveReminderRule: jest.fn().mockResolvedValue(true),
    saveSettings: jest.fn().mockResolvedValue(true),
    saveTemplate: jest.fn().mockResolvedValue(true),
    sendMessage: jest.fn().mockResolvedValue(true),
    setContext: jest.fn(),
    updateReminderRuleStatus: jest.fn().mockResolvedValue(true),
    updateTemplateStatus: jest.fn().mockResolvedValue(true),
  });
});

describe('Communication screens', () => {
  it('renders all 25 required Phase 10 screens from service/store state', async () => {
    const cases: Array<[string, React.ReactElement]> = [
      [
        'communication-dashboard-screen',
        <CommunicationDashboardScreen
          navigation={navigation<'CommunicationDashboard'>()}
          route={route('CommunicationDashboard', context)}
        />,
      ],
      [
        'communication-settings-screen',
        <CommunicationSettingsScreen
          navigation={navigation<'CommunicationSettings'>()}
          route={route('CommunicationSettings', { schoolId: context.schoolId })}
        />,
      ],
      [
        'message-templates-screen',
        <MessageTemplatesScreen
          navigation={navigation<'MessageTemplates'>()}
          route={route('MessageTemplates', { schoolId: context.schoolId })}
        />,
      ],
      [
        'create-message-template-screen',
        <CreateMessageTemplateScreen
          navigation={navigation<'CreateMessageTemplate'>()}
          route={route('CreateMessageTemplate', { schoolId: context.schoolId })}
        />,
      ],
      [
        'edit-message-template-screen',
        <EditMessageTemplateScreen
          navigation={navigation<'EditMessageTemplate'>()}
          route={route('EditMessageTemplate', {
            schoolId: context.schoolId,
            templateId: 'template-overdue',
          })}
        />,
      ],
      [
        'message-template-details-screen',
        <MessageTemplateDetailsScreen
          navigation={navigation<'MessageTemplateDetails'>()}
          route={route('MessageTemplateDetails', {
            schoolId: context.schoolId,
            templateId: 'template-overdue',
          })}
        />,
      ],
      [
        'message-preview-screen',
        <MessagePreviewScreen
          navigation={navigation<'MessagePreview'>()}
          route={route('MessagePreview', {
            ...context,
            communicationType: 'MANUAL_DUE_REMINDER',
            studentId: 'student-rahul',
          })}
        />,
      ],
      [
        'manual-fee-reminder-screen',
        <ManualFeeReminderScreen
          navigation={navigation<'ManualFeeReminder'>()}
          route={route('ManualFeeReminder', {
            ...context,
            studentId: 'student-rahul',
          })}
        />,
      ],
      [
        'bulk-reminder-setup-screen',
        <BulkReminderSetupScreen
          navigation={navigation<'BulkReminderSetup'>()}
          route={route('BulkReminderSetup', context)}
        />,
      ],
      [
        'bulk-reminder-preview-screen',
        <BulkReminderPreviewScreen
          navigation={navigation<'BulkReminderPreview'>()}
          route={route('BulkReminderPreview', context)}
        />,
      ],
      [
        'reminder-rules-screen',
        <ReminderRulesScreen
          navigation={navigation<'ReminderRules'>()}
          route={route('ReminderRules', context)}
        />,
      ],
      [
        'create-reminder-rule-screen',
        <CreateReminderRuleScreen
          navigation={navigation<'CreateReminderRule'>()}
          route={route('CreateReminderRule', context)}
        />,
      ],
      [
        'edit-reminder-rule-screen',
        <EditReminderRuleScreen
          navigation={navigation<'EditReminderRule'>()}
          route={route('EditReminderRule', {
            ...context,
            reminderRuleId: 'rule-overdue-weekly',
          })}
        />,
      ],
      [
        'scheduled-reminders-screen',
        <ScheduledRemindersScreen
          navigation={navigation<'ScheduledReminders'>()}
          route={route('ScheduledReminders', context)}
        />,
      ],
      [
        'scheduled-reminder-details-screen',
        <ScheduledReminderDetailsScreen
          navigation={navigation<'ScheduledReminderDetails'>()}
          route={route('ScheduledReminderDetails', {
            ...context,
            scheduledReminderId: 'scheduled-upcoming-rahul',
          })}
        />,
      ],
      [
        'communication-history-screen',
        <CommunicationHistoryScreen
          navigation={navigation<'CommunicationHistory'>()}
          route={route('CommunicationHistory', context)}
        />,
      ],
      [
        'communication-details-screen',
        <CommunicationDetailsScreen
          navigation={navigation<'CommunicationDetails'>()}
          route={route('CommunicationDetails', {
            ...context,
            communicationId: 'communication-failed-overdue',
          })}
        />,
      ],
      [
        'failed-communications-screen',
        <FailedCommunicationsScreen
          navigation={navigation<'FailedCommunications'>()}
          route={route('FailedCommunications', context)}
        />,
      ],
      [
        'retry-communication-screen',
        <RetryCommunicationScreen
          navigation={navigation<'RetryCommunication'>()}
          route={route('RetryCommunication', {
            ...context,
            communicationId: 'communication-failed-overdue',
          })}
        />,
      ],
      [
        'notification-center-screen',
        <NotificationCenterScreen
          navigation={navigation<'NotificationCenter'>()}
          route={route('NotificationCenter', context)}
        />,
      ],
      [
        'notification-details-screen',
        <NotificationDetailsScreen
          navigation={navigation<'NotificationDetails'>()}
          route={route('NotificationDetails', {
            ...context,
            notificationId: 'notification-staff-payment',
          })}
        />,
      ],
      [
        'parent-notifications-screen',
        <ParentNotificationsScreen
          navigation={navigation<'ParentNotifications'>()}
          route={route('ParentNotifications', {
            parentMembershipId: 'membership-parent',
            schoolId: context.schoolId,
          })}
        />,
      ],
      [
        'parent-notification-details-screen',
        <ParentNotificationDetailsScreen
          navigation={navigation<'ParentNotificationDetails'>()}
          route={route('ParentNotificationDetails', {
            notificationId: 'notification-parent-receipt',
            parentMembershipId: 'membership-parent',
            schoolId: context.schoolId,
          })}
        />,
      ],
      [
        'student-notifications-screen',
        <StudentNotificationsScreen
          navigation={navigation<'StudentNotifications'>()}
          route={route('StudentNotifications', {
            schoolId: context.schoolId,
            studentMembershipId: 'membership-student',
          })}
        />,
      ],
      [
        'student-notification-details-screen',
        <StudentNotificationDetailsScreen
          navigation={navigation<'StudentNotificationDetails'>()}
          route={route('StudentNotificationDetails', {
            notificationId: 'notification-student-due',
            schoolId: context.schoolId,
            studentMembershipId: 'membership-student',
          })}
        />,
      ],
    ];
    for (const [testID, screen] of cases) {
      let renderer: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <SafeAreaProvider initialMetrics={metrics}>
            {screen}
          </SafeAreaProvider>,
        );
      });
      expect(renderer!.root.findByProps({ testID })).toBeTruthy();
      await ReactTestRenderer.act(async () => renderer!.unmount());
    }
  });
});
