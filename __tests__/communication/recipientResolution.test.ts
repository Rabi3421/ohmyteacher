import {
  INITIAL_GUARDIANS,
  INITIAL_PARENT_STUDENT_LINKS,
  INITIAL_STUDENT_GUARDIAN_LINKS,
  INITIAL_STUDENT_PROFILES,
} from '../../src/services/student/studentFixtures';
import {
  normalizeIndianMobile,
  resolveCommunicationRecipient,
} from '../../src/utils/communicationRecipient';

const base = {
  automated: false,
  guardianLinks: INITIAL_STUDENT_GUARDIAN_LINKS,
  guardians: INITIAL_GUARDIANS,
  parentLinks: INITIAL_PARENT_STUDENT_LINKS,
  schoolId: 'school-omt',
  studentId: 'student-saanvi',
  students: INITIAL_STUDENT_PROFILES,
};

describe('Communication recipient resolution', () => {
  it('prioritizes the active Fee Contact and normalizes/masks mobile', () => {
    const result = resolveCommunicationRecipient(base);
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.recipient).toMatchObject({
        source: 'FEE_CONTACT',
        studentId: 'student-saanvi',
      });
    expect(normalizeIndianMobile('91 98765 43212')).toBe('+919876543212');
  });

  it('uses a selected active linked Guardian without changing Student specificity', () => {
    const result = resolveCommunicationRecipient({
      ...base,
      explicitGuardianId: 'guardian-student-saanvi-secondary',
    });
    expect(result.ok && result.recipient.source).toBe('EXPLICIT_GUARDIAN');
    expect(result.ok && result.recipient.studentId).toBe('student-saanvi');
  });

  it('rejects unrelated, inactive, invalid and automated opt-out recipients', () => {
    expect(
      resolveCommunicationRecipient({
        ...base,
        explicitGuardianId: 'guardian-student-aarav',
      }),
    ).toMatchObject({ ok: false, reason: 'GUARDIAN_NOT_LINKED' });
    expect(
      resolveCommunicationRecipient({
        ...base,
        guardianLinks: base.guardianLinks.map(item =>
          item.studentId === base.studentId
            ? { ...item, status: 'INACTIVE' as const }
            : item,
        ),
      }),
    ).toMatchObject({ ok: false, reason: 'MISSING_CONTACT' });
    expect(
      resolveCommunicationRecipient({
        ...base,
        guardians: base.guardians.map(item =>
          item.id === `guardian-${base.studentId}`
            ? { ...item, mobile: '123' }
            : item,
        ),
      }),
    ).toMatchObject({ ok: false, reason: 'INVALID_MOBILE' });
    expect(
      resolveCommunicationRecipient({
        ...base,
        automated: true,
        guardianLinks: base.guardianLinks.map(item =>
          item.studentId === base.studentId
            ? { ...item, whatsappEnabled: false }
            : item,
        ),
      }),
    ).toMatchObject({ ok: false, reason: 'WHATSAPP_DISABLED' });
  });

  it('keeps a multi-child Parent relationship Student-specific', () => {
    const rahul = resolveCommunicationRecipient({
      ...base,
      studentId: 'student-rahul',
    });
    const isha = resolveCommunicationRecipient({
      ...base,
      studentId: 'student-isha',
    });
    expect(rahul.ok && rahul.recipient.parentMembershipId).toBe(
      'membership-parent',
    );
    expect(isha.ok && isha.recipient.parentMembershipId).toBe(
      'membership-parent',
    );
    expect(rahul.ok && rahul.recipient.studentId).not.toBe(
      isha.ok && isha.recipient.studentId,
    );
  });

  it('rejects cross-School Student access', () => {
    expect(
      resolveCommunicationRecipient({ ...base, schoolId: 'another-school' }),
    ).toMatchObject({ ok: false, reason: 'CROSS_SCHOOL' });
  });
});
