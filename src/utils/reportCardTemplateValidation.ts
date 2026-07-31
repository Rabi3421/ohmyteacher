import type {
  ReportCardTemplate,
  CreateReportCardTemplateInput,
} from '../models/reportCard';

export interface ReportCardTemplateValidationResult {
  valid: boolean;
  fieldErrors: Record<string, string>;
}

export function normalizeReportCardTemplateCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_');
}

export function validateReportCardTemplate(
  input: CreateReportCardTemplateInput,
  existing: readonly ReportCardTemplate[] = [],
  currentId?: string,
): ReportCardTemplateValidationResult {
  const fieldErrors: Record<string, string> = {};
  const name = input.name.trim();
  const code = normalizeReportCardTemplateCode(input.code);
  if (!name) fieldErrors.name = 'Name is required.';
  if (!code) fieldErrors.code = 'Code is required.';
  if (!input.title.trim()) fieldErrors.title = 'Title is required.';
  if (!['STANDARD', 'COMPACT'].includes(input.layoutType))
    fieldErrors.layoutType = 'Select a valid layout.';
  if ((input.footerText?.length ?? 0) > 500)
    fieldErrors.footerText = 'Footer must not exceed 500 characters.';
  for (const [field, label] of [
    ['principalSignatureLabel', 'Principal signature label'],
    ['schoolAuthoritySignatureLabel', 'Authority signature label'],
    ['parentSignatureLabel', 'Parent signature label'],
  ] as const) {
    if ((input[field]?.length ?? 0) > 80)
      fieldErrors[field] = `${label} must not exceed 80 characters.`;
  }
  if (
    existing.some(
      item =>
        item.id !== currentId &&
        item.name.trim().toLowerCase() === name.toLowerCase(),
    )
  )
    fieldErrors.name = 'Name must be unique within the School.';
  if (
    existing.some(
      item =>
        item.id !== currentId &&
        normalizeReportCardTemplateCode(item.code) === code,
    )
  )
    fieldErrors.code = 'Code must be unique within the School.';
  if (
    input.isDefault &&
    input.status === 'ACTIVE' &&
    existing.some(
      item =>
        item.id !== currentId && item.isDefault && item.status === 'ACTIVE',
    )
  )
    fieldErrors.isDefault = 'Only one active default Template is allowed.';
  return { fieldErrors, valid: Object.keys(fieldErrors).length === 0 };
}

export function canTemplateGenerate(template: ReportCardTemplate): boolean {
  return template.status === 'ACTIVE';
}
