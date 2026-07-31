import { ROUTES } from '../../src/constants/routes';
import { COMMUNICATION_SCREEN_NAMES } from '../../src/screens/communication/CommunicationScreens';

describe('Communication entry points and architecture boundaries', () => {
  it('provides centralized preview/history routes for Payment, Receipt and Due entry points', () => {
    expect(ROUTES.MESSAGE_PREVIEW).toBe('MessagePreview');
    expect(ROUTES.MANUAL_FEE_REMINDER).toBe('ManualFeeReminder');
    expect(ROUTES.COMMUNICATION_HISTORY).toBe('CommunicationHistory');
  });

  it('registers all 25 requested Communication screens', () => {
    expect(COMMUNICATION_SCREEN_NAMES).toHaveLength(25);
    expect(COMMUNICATION_SCREEN_NAMES).toEqual(
      expect.arrayContaining([
        'MessagePreviewScreen',
        'ManualFeeReminderScreen',
        'CommunicationHistoryScreen',
        'ParentNotificationsScreen',
        'StudentNotificationsScreen',
      ]),
    );
  });

  it('does not add Teacher or Examination Communication navigation', () => {
    expect(Object.keys(ROUTES)).not.toContain('TEACHER');
    expect(Object.keys(ROUTES)).not.toContain('EXAM_COMMUNICATION');
  });
});
