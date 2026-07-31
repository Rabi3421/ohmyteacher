import type { ResolvedRecipient } from '../models/communication';
import type {
  GuardianProfile,
  ParentStudentLink,
  StudentGuardianLink,
  StudentProfile,
} from '../models/student';

export type RecipientFailureReason =
  | 'STUDENT_NOT_FOUND'
  | 'CROSS_SCHOOL'
  | 'GUARDIAN_NOT_LINKED'
  | 'INACTIVE_GUARDIAN_LINK'
  | 'MISSING_CONTACT'
  | 'INVALID_MOBILE'
  | 'WHATSAPP_DISABLED';

export type RecipientResolution =
  | { ok: true; recipient: ResolvedRecipient }
  | { ok: false; reason: RecipientFailureReason };

export function normalizeIndianMobile(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  const national =
    digits.length === 12 && digits.startsWith('91')
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith('0')
      ? digits.slice(1)
      : digits;
  return national.length === 10 && /^[6-9]\d{9}$/.test(national)
    ? `+91${national}`
    : null;
}

export function maskMobile(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 4 ? `+91 ••••••${digits.slice(-4)}` : 'Unavailable';
}

export function resolveCommunicationRecipient(input: {
  schoolId: string;
  studentId: string;
  explicitGuardianId?: string;
  automated: boolean;
  students: StudentProfile[];
  guardians: GuardianProfile[];
  guardianLinks: StudentGuardianLink[];
  parentLinks: ParentStudentLink[];
}): RecipientResolution {
  const student = input.students.find(item => item.id === input.studentId);
  if (!student) return { ok: false, reason: 'STUDENT_NOT_FOUND' };
  if (student.schoolId !== input.schoolId)
    return { ok: false, reason: 'CROSS_SCHOOL' };
  const linked = input.guardianLinks.filter(
    item => item.studentId === student.id,
  );
  if (
    input.explicitGuardianId &&
    !linked.some(item => item.guardianId === input.explicitGuardianId)
  )
    return { ok: false, reason: 'GUARDIAN_NOT_LINKED' };
  const active = linked.filter(item => item.status === 'ACTIVE');
  if (
    input.explicitGuardianId &&
    !active.some(item => item.guardianId === input.explicitGuardianId)
  )
    return { ok: false, reason: 'INACTIVE_GUARDIAN_LINK' };
  const ordered = input.explicitGuardianId
    ? active.filter(item => item.guardianId === input.explicitGuardianId)
    : active
        .filter(item => item.isFeeContact || item.isPrimaryContact)
        .sort(
          (a, b) =>
            Number(b.isFeeContact) - Number(a.isFeeContact) ||
            Number(b.isPrimaryContact) - Number(a.isPrimaryContact),
        );
  if (!ordered.length) return { ok: false, reason: 'MISSING_CONTACT' };
  const link = ordered[0];
  if (input.automated && !link.whatsappEnabled)
    return { ok: false, reason: 'WHATSAPP_DISABLED' };
  const guardian = input.guardians.find(
    item => item.id === link.guardianId && item.schoolId === input.schoolId,
  );
  if (!guardian) return { ok: false, reason: 'MISSING_CONTACT' };
  const mobile = normalizeIndianMobile(guardian.mobile);
  if (!mobile) return { ok: false, reason: 'INVALID_MOBILE' };
  const parent = input.parentLinks.find(
    item =>
      item.schoolId === input.schoolId &&
      item.studentId === student.id &&
      item.guardianId === guardian.id &&
      item.status === 'ACTIVE',
  );
  return {
    ok: true,
    recipient: {
      guardianId: guardian.id,
      guardianName: guardian.fullName,
      maskedMobile: maskMobile(mobile),
      normalizedMobile: mobile,
      parentMembershipId: parent?.parentMembershipId,
      source: input.explicitGuardianId
        ? 'EXPLICIT_GUARDIAN'
        : link.isFeeContact
        ? 'FEE_CONTACT'
        : 'PRIMARY_CONTACT',
      studentId: student.id,
      whatsappEnabled: link.whatsappEnabled,
    },
  };
}
