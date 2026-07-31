import type {
  CreateStudentAdmissionInput,
  GuardianInput,
  StudentProfileInput,
  TransferStudentInput,
} from '../models/student';
import { isEmail, isIndianMobile, isRequired } from './validation';

export type StudentFormErrors = Record<string, string>;

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function validateStudentProfileInput(
  input: StudentProfileInput,
): StudentFormErrors {
  const errors: StudentFormErrors = {};
  if (!isRequired(input.fullName)) errors.fullName = 'Student name is required.';
  if (!validDate(input.dateOfBirth)) {
    errors.dateOfBirth = 'Enter a valid date of birth.';
  } else if (input.dateOfBirth > new Date().toISOString().slice(0, 10)) {
    errors.dateOfBirth = 'Date of birth cannot be in the future.';
  } else if (Number(input.dateOfBirth.slice(0, 4)) < 1980) {
    errors.dateOfBirth = 'Enter a reasonable date of birth.';
  }
  if (!validDate(input.admissionDate)) {
    errors.admissionDate = 'Enter a valid admission date.';
  }
  if (!['MALE', 'FEMALE', 'OTHER'].includes(input.gender)) {
    errors.gender = 'Select a gender.';
  }
  if (input.mobile && !isIndianMobile(input.mobile)) {
    errors.mobile = 'Enter a valid 10-digit mobile number.';
  }
  if (input.email && !isEmail(input.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!isRequired(input.address.line1)) errors.line1 = 'Address is required.';
  if (!isRequired(input.address.city)) errors.city = 'City is required.';
  if (!isRequired(input.address.state)) errors.state = 'State is required.';
  if (!/^\d{6}$/.test(input.address.pinCode)) {
    errors.pinCode = 'Enter a valid 6-digit PIN code.';
  }
  return errors;
}

export function validateGuardianInput(
  input: GuardianInput,
): StudentFormErrors {
  const errors: StudentFormErrors = {};
  if (!isRequired(input.fullName)) errors.fullName = 'Guardian name is required.';
  if (!isIndianMobile(input.mobile)) {
    errors.mobile = 'Enter a valid 10-digit mobile number.';
  }
  if (input.alternateMobile && !isIndianMobile(input.alternateMobile)) {
    errors.alternateMobile = 'Enter a valid 10-digit mobile number.';
  }
  if (input.email && !isEmail(input.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER'].includes(input.relationship)) {
    errors.relationship = 'Select a relationship.';
  }
  if (!isRequired(input.address.line1)) {
    errors.line1 = 'Guardian address is required.';
  }
  if (!isRequired(input.address.city)) errors.city = 'City is required.';
  if (!isRequired(input.address.state)) errors.state = 'State is required.';
  if (!/^\d{6}$/.test(input.address.pinCode)) {
    errors.pinCode = 'Enter a valid 6-digit PIN code.';
  }
  return errors;
}

export function validateAdmission(
  input: CreateStudentAdmissionInput,
): StudentFormErrors {
  const errors = validateStudentProfileInput(input.profile);
  if (input.guardians.length === 0) {
    errors.guardians = 'At least one guardian is required.';
  }
  if (
    input.guardians.length > 0 &&
    input.guardians.filter(item => item.isPrimaryContact).length !== 1
  ) {
    errors.primaryGuardian = 'Select exactly one primary guardian.';
  }
  if (
    input.guardians.length > 0 &&
    input.guardians.filter(item => item.isFeeContact).length !== 1
  ) {
    errors.feeContact = 'Select exactly one fee contact.';
  }
  input.guardians.forEach((guardian, index) => {
    const guardianErrors = validateGuardianInput(guardian);
    Object.entries(guardianErrors).forEach(([key, value]) => {
      errors[`guardians.${index}.${key}`] = value;
    });
  });
  if (!input.enrollment.branchId) errors.branchId = 'Branch is required.';
  if (!input.enrollment.academicSessionId) {
    errors.academicSessionId = 'Academic session is required.';
  }
  if (!input.enrollment.classId) errors.classId = 'Class is required.';
  if (!input.enrollment.sectionId) errors.sectionId = 'Section is required.';
  return errors;
}

export function validateTransferInput(
  input: TransferStudentInput,
): StudentFormErrors {
  const errors: StudentFormErrors = {};
  if (!input.branchId) errors.branchId = 'Destination branch is required.';
  if (!input.classId) errors.classId = 'Destination class is required.';
  if (!input.sectionId) errors.sectionId = 'Destination section is required.';
  if (!validDate(input.effectiveDate)) {
    errors.effectiveDate = 'Enter a valid effective date.';
  }
  if (!isRequired(input.reason)) errors.reason = 'Transfer reason is required.';
  return errors;
}
