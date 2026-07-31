import type {
  CreateAcademicSessionInput,
  CreateBranchInput,
  CreateSchoolInput,
} from '../models/organization';
import {
  isEmail,
  isIndianMobile,
  isPinCode,
  isRequired,
  isSchoolCode,
} from './validation';

export type FormErrors = Record<string, string>;

export function validateSchoolInput(
  input: CreateSchoolInput,
  includeAdmin = true,
): FormErrors {
  const errors: FormErrors = {};
  if (!isRequired(input.name)) errors.name = 'School name is required.';
  if (!isSchoolCode(input.code)) {
    errors.code = 'Use 3–20 uppercase letters, numbers, or hyphens.';
  }
  if (!isIndianMobile(input.mobile)) {
    errors.mobile = 'Enter a valid 10-digit Indian mobile number.';
  }
  if (input.alternateMobile && !isIndianMobile(input.alternateMobile)) {
    errors.alternateMobile = 'Enter a valid alternate mobile number.';
  }
  if (input.email && !isEmail(input.email)) {
    errors.email = 'Enter a valid school email.';
  }
  if (!isRequired(input.address.line1)) {
    errors.line1 = 'Address line 1 is required.';
  }
  if (!isRequired(input.address.city)) errors.city = 'City is required.';
  if (!isRequired(input.address.state)) errors.state = 'State is required.';
  if (!isPinCode(input.address.pinCode)) {
    errors.pinCode = 'Enter a valid six-digit PIN code.';
  }
  if (includeAdmin) {
    if (!isRequired(input.admin.name)) {
      errors.adminName = 'Admin name is required.';
    }
    if (!isIndianMobile(input.admin.mobile)) {
      errors.adminMobile = 'Enter a valid admin mobile number.';
    }
    if (input.admin.email && !isEmail(input.admin.email)) {
      errors.adminEmail = 'Enter a valid admin email.';
    }
  }
  return errors;
}

export function validateBranchInput(input: CreateBranchInput): FormErrors {
  const errors: FormErrors = {};
  if (!isRequired(input.name)) errors.name = 'Branch name is required.';
  if (!isSchoolCode(input.code)) {
    errors.code = 'Use 3–20 uppercase letters, numbers, or hyphens.';
  }
  if (!isIndianMobile(input.mobile)) {
    errors.mobile = 'Enter a valid branch mobile number.';
  }
  if (input.email && !isEmail(input.email)) {
    errors.email = 'Enter a valid branch email.';
  }
  if (!isRequired(input.address.line1)) {
    errors.line1 = 'Address line 1 is required.';
  }
  if (!isRequired(input.address.city)) errors.city = 'City is required.';
  if (!isRequired(input.address.state)) errors.state = 'State is required.';
  if (!isPinCode(input.address.pinCode)) {
    errors.pinCode = 'Enter a valid six-digit PIN code.';
  }
  return errors;
}

export function validateAcademicSessionInput(
  input: CreateAcademicSessionInput,
): FormErrors {
  const errors: FormErrors = {};
  if (!isRequired(input.name)) errors.name = 'Session name is required.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) {
    errors.startDate = 'Use YYYY-MM-DD format.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.endDate)) {
    errors.endDate = 'Use YYYY-MM-DD format.';
  } else if (input.endDate <= input.startDate) {
    errors.endDate = 'End date must be after start date.';
  }
  return errors;
}
