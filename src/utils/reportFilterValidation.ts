import type { CommonReportFilters, ReportWarning } from '../models/report';

export interface ReportFilterScope {
  schoolId: string;
  branchIds: string[];
  academicSessionIds: string[];
  classIds: string[];
  sectionIds: string[];
  studentIds: string[];
  examIds: string[];
}

export interface ValidatedReportFilters {
  filters: CommonReportFilters;
  warnings: ReportWarning[];
}

export function validateReportFilters(
  input: CommonReportFilters,
  scope: ReportFilterScope,
): ValidatedReportFilters {
  if (input.schoolId !== scope.schoolId)
    throw new Error('School context does not match.');
  if (input.dateFrom && input.dateTo && input.dateFrom > input.dateTo) {
    throw new Error('Date From must be before or equal to Date To.');
  }
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 20;
  if (!Number.isInteger(page) || page < 1)
    throw new Error('Page must be a positive integer.');
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new Error('Page size must be between 1 and 100.');
  }
  const warnings: ReportWarning[] = [];
  const permittedBranches =
    input.access.role === 'SUPER_ADMIN' || input.access.role === 'SCHOOL_ADMIN'
      ? scope.branchIds
      : scope.branchIds.filter(id =>
          input.access.permittedBranchIds.includes(id),
        );
  const clean = (
    key: string,
    values: string[] | undefined,
    allowed: string[],
  ) => {
    if (!values) return undefined;
    const valid = [...new Set(values)]
      .filter(value => allowed.includes(value))
      .sort();
    if (valid.length !== values.length)
      warnings.push({
        code: 'IGNORED_OUT_OF_SCOPE_FILTER',
        ignoredFilterKey: key,
        message: `Some ${key} values were ignored because they are no longer available in your scope.`,
      });
    return valid;
  };
  const filters: CommonReportFilters = {
    ...input,
    branchIds: clean(
      'branchIds',
      input.branchIds ?? permittedBranches,
      permittedBranches,
    ),
    academicSessionIds: clean(
      'academicSessionIds',
      input.academicSessionIds,
      scope.academicSessionIds,
    ),
    classIds: clean('classIds', input.classIds, scope.classIds),
    sectionIds: clean('sectionIds', input.sectionIds, scope.sectionIds),
    studentIds: clean('studentIds', input.studentIds, scope.studentIds),
    examIds: clean('examIds', input.examIds, scope.examIds),
    page,
    pageSize,
  };
  return { filters, warnings };
}
