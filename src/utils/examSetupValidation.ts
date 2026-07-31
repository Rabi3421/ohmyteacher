import type {
  AcademicClass,
  ClassSubjectAssignment,
  Section,
  Subject,
} from '../models/academic';
import type {
  Exam,
  ExamClassConfiguration,
  ExamSetupIssue,
  ExamSetupValidationResult,
  ExamSubjectPaper,
  GradingScheme,
} from '../models/examination';
import { detectScheduleConflicts } from './examSchedule';
import { validateMarksConfiguration } from './marksConfiguration';

export function validateClassSectionEligibility(input: {
  academicClass?: AcademicClass;
  selectedSections: readonly Section[];
  requestedSectionIds: readonly string[];
  schoolId: string;
  branchId: string;
  academicSessionId: string;
}): string[] {
  const errors: string[] = [];
  const academicClass = input.academicClass;
  if (
    !academicClass ||
    academicClass.status !== 'ACTIVE' ||
    academicClass.schoolId !== input.schoolId ||
    academicClass.branchId !== input.branchId ||
    academicClass.academicSessionId !== input.academicSessionId
  )
    errors.push(
      'Select an active Class from this Branch and Academic Session.',
    );
  if (input.requestedSectionIds.length === 0)
    errors.push('Select at least one active Section.');
  if (
    new Set(input.requestedSectionIds).size !== input.requestedSectionIds.length
  )
    errors.push('A Section cannot be selected more than once.');
  if (
    input.requestedSectionIds.some(
      id =>
        !input.selectedSections.some(
          section =>
            section.id === id &&
            section.classId === academicClass?.id &&
            section.status === 'ACTIVE',
        ),
    )
  )
    errors.push(
      'Every selected Section must be active and belong to the Class.',
    );
  return errors;
}

export function isSubjectEligible(input: {
  subject?: Subject;
  assignment?: ClassSubjectAssignment;
  schoolId: string;
  branchId: string;
  academicSessionId: string;
  classId: string;
}): boolean {
  return Boolean(
    input.subject &&
      input.subject.schoolId === input.schoolId &&
      input.subject.status === 'ACTIVE' &&
      input.assignment &&
      input.assignment.status === 'ACTIVE' &&
      input.assignment.schoolId === input.schoolId &&
      input.assignment.branchId === input.branchId &&
      input.assignment.academicSessionId === input.academicSessionId &&
      input.assignment.classId === input.classId &&
      input.assignment.subjectId === input.subject.id,
  );
}

export function validateExamSetup(input: {
  exam: Exam;
  configurations: readonly ExamClassConfiguration[];
  papers: readonly ExamSubjectPaper[];
  gradingSchemes: readonly GradingScheme[];
  termActive: boolean;
  examTypeActive: boolean;
  sessionStartDate: string;
  sessionEndDate: string;
  sessionClosed: boolean;
}): ExamSetupValidationResult {
  const blockers: ExamSetupIssue[] = [];
  const warnings: ExamSetupIssue[] = [];
  const block = (
    code: string,
    message: string,
    extra: Partial<ExamSetupIssue> = {},
  ) => blockers.push({ code, message, severity: 'BLOCKER', ...extra });
  if (
    !input.exam.name.trim() ||
    !input.exam.code.trim() ||
    input.exam.endDate < input.exam.startDate
  )
    block('INVALID_EXAM_DETAILS', 'Complete valid basic Exam details.');
  if (!input.termActive)
    block('INACTIVE_EXAM_TERM', 'Select an active Exam Term.');
  if (!input.examTypeActive)
    block('INACTIVE_EXAM_TYPE', 'Select an active Exam Type.');
  if (input.sessionClosed)
    block('CLOSED_ACADEMIC_SESSION', 'Closed Academic Sessions are read-only.');
  if (input.configurations.length === 0)
    block('EXAM_CLASS_REQUIRED', 'Add at least one Class configuration.');
  input.configurations.forEach(configuration => {
    if (configuration.sectionIds.length === 0)
      block(
        'EXAM_SECTION_REQUIRED',
        `${configuration.classNameSnapshot} needs at least one Section.`,
        { classConfigurationId: configuration.id },
      );
    if (
      !input.gradingSchemes.some(
        scheme =>
          scheme.id === configuration.gradingSchemeId &&
          scheme.status === 'ACTIVE',
      )
    )
      block(
        'ACTIVE_GRADING_SCHEME_REQUIRED',
        `${configuration.classNameSnapshot} needs an active Grading Scheme.`,
        { classConfigurationId: configuration.id },
      );
    const classPapers = input.papers.filter(
      paper =>
        paper.examClassConfigurationId === configuration.id &&
        paper.status !== 'CANCELLED',
    );
    if (classPapers.length === 0)
      block(
        'SUBJECT_PAPER_REQUIRED',
        `${configuration.classNameSnapshot} needs at least one Subject Paper.`,
        { classConfigurationId: configuration.id },
      );
    classPapers.forEach(paper =>
      blockers.push(...validateMarksConfiguration(paper)),
    );
  });
  const conflicts = detectScheduleConflicts({
    configurations: input.configurations,
    examEndDate: input.exam.endDate,
    examStartDate: input.exam.startDate,
    papers: input.papers.filter(paper => paper.status !== 'CANCELLED'),
    sessionEndDate: input.sessionEndDate,
    sessionStartDate: input.sessionStartDate,
  });
  blockers.push(
    ...conflicts.filter(conflict => conflict.severity === 'BLOCKER'),
  );
  warnings.push(
    ...conflicts.filter(conflict => conflict.severity === 'WARNING'),
  );
  const checks = [
    Boolean(
      input.exam.name.trim() &&
        input.exam.code.trim() &&
        input.exam.endDate >= input.exam.startDate,
    ),
    input.termActive,
    input.examTypeActive,
    !input.sessionClosed,
    input.configurations.length > 0,
    input.configurations.length > 0 &&
      input.configurations.every(item => item.sectionIds.length > 0),
    input.configurations.length > 0 &&
      input.configurations.every(item =>
        input.papers.some(
          paper =>
            paper.examClassConfigurationId === item.id &&
            paper.status !== 'CANCELLED',
        ),
      ),
    input.papers.length > 0 &&
      input.papers.every(
        paper => validateMarksConfiguration(paper).length === 0,
      ),
    input.papers.length > 0 &&
      !conflicts.some(conflict => conflict.code === 'MISSING_SCHEDULE'),
    !conflicts.some(conflict => conflict.severity === 'BLOCKER'),
  ];
  return {
    blockers,
    completionPercent: Math.round(
      (checks.filter(Boolean).length / checks.length) * 100,
    ),
    isComplete: blockers.length === 0,
    warnings,
  };
}
