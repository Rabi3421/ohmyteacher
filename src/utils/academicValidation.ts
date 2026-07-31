import type {
  CreateSectionInput,
  CreateSubjectInput,
} from '../models/academic';
import { isRequired } from './validation';

export type AcademicFormErrors = Record<string, string>;

export function normalizeAcademicCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
}

function validCode(value: string): boolean {
  return /^[A-Z0-9][A-Z0-9_-]{0,19}$/.test(value);
}

function positiveWhole(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function validateBase(input: {
  name: string;
  code: string;
  displayOrder: number;
}): AcademicFormErrors {
  const errors: AcademicFormErrors = {};
  if (!isRequired(input.name)) errors.name = 'Name is required.';
  if (!validCode(input.code)) {
    errors.code = 'Use uppercase letters, numbers, hyphen, or underscore.';
  }
  if (!positiveWhole(input.displayOrder)) {
    errors.displayOrder = 'Display order must be a positive whole number.';
  }
  return errors;
}

export const validateClassInput = validateBase;

export function validateSectionInput(
  input: CreateSectionInput,
): AcademicFormErrors {
  const errors = validateBase(input);
  if (
    input.capacity !== undefined &&
    !positiveWhole(input.capacity)
  ) {
    errors.capacity = 'Capacity must be a positive whole number.';
  }
  return errors;
}

export function validateSubjectInput(
  input: CreateSubjectInput,
): AcademicFormErrors {
  const errors = validateBase(input);
  if (!['CORE', 'ELECTIVE', 'OPTIONAL'].includes(input.type)) {
    errors.type = 'Select a valid subject type.';
  }
  return errors;
}
