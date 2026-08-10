import type { CreateClassInput, CreateSectionInput, CreateSubjectInput } from '../models/academic';
import { isRequired } from './validation';

export type AcademicFormErrors = Record<string, string>;

export function normalizeAcademicCode(value: string): string {
  return value.toUpperCase().slice(0, 20);
}

export function validateClassInput(input: CreateClassInput): AcademicFormErrors {
  const errors: AcademicFormErrors = {};
  if (!isRequired(input.name)) errors.name = 'Name is required.';
  else if (input.name.trim().length > 50) errors.name = 'Use 50 characters or fewer.';
  if (!Number.isInteger(input.displayOrder) || input.displayOrder < 0 || input.displayOrder > 32767) {
    errors.displayOrder = 'Use a whole number from 0 to 32767.';
  }
  return errors;
}

export function validateSectionInput(input: CreateSectionInput): AcademicFormErrors {
  const errors: AcademicFormErrors = {};
  if (!isRequired(input.name)) errors.name = 'Name is required.';
  else if (input.name.trim().length > 10) errors.name = 'Use 10 characters or fewer.';
  if (input.capacity !== undefined && (!Number.isInteger(input.capacity) || input.capacity <= 0 || input.capacity > 32767)) {
    errors.capacity = 'Use a whole number from 1 to 32767.';
  }
  return errors;
}

export function validateSubjectInput(input: CreateSubjectInput): AcademicFormErrors {
  const errors: AcademicFormErrors = {};
  if (!isRequired(input.name)) errors.name = 'Name is required.';
  else if (input.name.trim().length > 100) errors.name = 'Use 100 characters or fewer.';
  if (input.code.length > 20) errors.code = 'Use 20 characters or fewer.';
  return errors;
}
