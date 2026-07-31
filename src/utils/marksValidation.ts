import type {
  MarksValidationIssue,
  MarksValidationResult,
  StudentPaperMark,
} from '../models/marksResult';

export function calculateStudentPaperTotal(
  mark: Pick<StudentPaperMark, 'attendanceStatus' | 'componentMarks'>,
): number | undefined {
  if (mark.attendanceStatus !== 'PRESENT') return undefined;
  const values = mark.componentMarks.map(item => item.marksObtained);
  return values.some(value => value === undefined)
    ? undefined
    : (values as number[]).reduce((total, value) => total + value, 0);
}

export function validateStudentPaperMark(
  mark: Pick<
    StudentPaperMark,
    | 'attendanceStatus'
    | 'componentMarks'
    | 'exemptionReason'
    | 'paperMaximumMarksSnapshot'
    | 'studentId'
  >,
): MarksValidationResult {
  const issues: MarksValidationIssue[] = [];
  const add = (code: string, message: string, assessmentComponentId?: string) =>
    issues.push({
      assessmentComponentId,
      code,
      message,
      studentId: mark.studentId,
    });
  if (mark.attendanceStatus === 'PRESENT') {
    mark.componentMarks.forEach(component => {
      const value = component.marksObtained;
      if (value === undefined) {
        if (component.marksEntryRequiredSnapshot)
          add(
            'MISSING_COMPONENT_MARKS',
            `${component.componentNameSnapshot} Marks are required.`,
            component.assessmentComponentId,
          );
      } else if (!Number.isInteger(value))
        add(
          'DECIMAL_MARKS_NOT_SUPPORTED',
          'Release 1 accepts whole-number Marks only.',
          component.assessmentComponentId,
        );
      else if (value < 0)
        add(
          'NEGATIVE_MARKS',
          'Marks cannot be negative.',
          component.assessmentComponentId,
        );
      else if (value > component.maximumMarksSnapshot)
        add(
          'MARKS_ABOVE_COMPONENT_MAXIMUM',
          `${component.componentNameSnapshot} Marks exceed the configured maximum.`,
          component.assessmentComponentId,
        );
    });
    const total = calculateStudentPaperTotal(mark);
    if (total !== undefined && total > mark.paperMaximumMarksSnapshot)
      add(
        'PAPER_TOTAL_ABOVE_MAXIMUM',
        'Paper total exceeds the configured maximum.',
      );
    return {
      isComplete: !issues.some(item => item.code === 'MISSING_COMPONENT_MARKS'),
      isValid: issues.length === 0,
      issues,
      totalMarksObtained: total,
    };
  }
  if (mark.componentMarks.some(item => item.marksObtained !== undefined))
    add(
      mark.attendanceStatus === 'ABSENT'
        ? 'ABSENT_MARKS_NOT_ALLOWED'
        : 'EXEMPT_MARKS_NOT_ALLOWED',
      'Absent or Exempt Students cannot have Component Marks.',
    );
  if (mark.attendanceStatus === 'EXEMPT' && !mark.exemptionReason?.trim())
    add('EXEMPTION_REASON_REQUIRED', 'An exemption reason is required.');
  return {
    isComplete: issues.length === 0,
    isValid: issues.length === 0,
    issues,
    totalMarksObtained: undefined,
  };
}

export function validateMarkSheetMarks(
  marks: readonly StudentPaperMark[],
): MarksValidationResult {
  const values = marks.map(validateStudentPaperMark);
  return {
    isComplete: values.every(item => item.isComplete),
    isValid: values.every(item => item.isValid),
    issues: values.flatMap(item => item.issues),
  };
}
