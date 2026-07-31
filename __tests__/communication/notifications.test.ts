import {
  mockCommunicationService,
  resetMockCommunicationData,
  setMockCommunicationClock,
} from '../../src/services/communication/mockCommunicationService';

beforeEach(() => {
  resetMockCommunicationData();
  setMockCommunicationClock(() => '2026-07-31T10:00:00.000Z');
});

describe('in-app Notifications', () => {
  it('lists staff, Parent and Student audiences separately', async () => {
    const staff = await mockCommunicationService.getNotifications(
      'school-omt',
      {
        audienceType: 'STAFF_USER',
      },
    );
    const parent = await mockCommunicationService.getParentNotifications(
      'school-omt',
      'membership-parent',
      'membership-parent',
    );
    const student = await mockCommunicationService.getStudentNotifications(
      'school-omt',
      'membership-student',
      'membership-student',
    );
    expect(staff.data.totalItems).toBe(4);
    expect(parent.data).toHaveLength(2);
    expect(student.data).toHaveLength(1);
    expect(parent.data.map(item => item.studentId)).toEqual(
      expect.arrayContaining(['student-rahul', 'student-isha']),
    );
  });

  it('marks one/all read and archives without hard delete', async () => {
    const read = await mockCommunicationService.markNotificationRead(
      'school-omt',
      'notification-parent-receipt',
    );
    expect(read.data).toMatchObject({ status: 'READ' });
    await mockCommunicationService.markAllNotificationsRead(
      'school-omt',
      'membership-parent',
    );
    const archived = await mockCommunicationService.archiveNotification(
      'school-omt',
      'notification-parent-receipt',
    );
    expect(archived.data.status).toBe('ARCHIVED');
    expect(
      (
        await mockCommunicationService.getParentNotifications(
          'school-omt',
          'membership-parent',
        )
      ).data,
    ).toHaveLength(2);
  });

  it('rejects Parent and Student membership ownership substitution', async () => {
    await expect(
      mockCommunicationService.getParentNotifications(
        'school-omt',
        'membership-parent',
        'other-parent',
      ),
    ).rejects.toMatchObject({ code: 'PARENT_NOTIFICATION_FORBIDDEN' });
    await expect(
      mockCommunicationService.getStudentNotifications(
        'school-omt',
        'membership-student',
        'other-student',
      ),
    ).rejects.toMatchObject({ code: 'STUDENT_NOTIFICATION_FORBIDDEN' });
  });
});
