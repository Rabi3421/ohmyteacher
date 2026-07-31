import type { GradeBand } from '../models/examination';
import type {
  StudentPaperMark,
  StudentSubjectResult,
} from '../models/marksResult';
import { findGradeBand } from './gradeBandValidation';
import { validateStudentPaperMark } from './marksValidation';
import { calculateResultPercentage } from './resultPercentage';

export function calculateSubjectResult(input: {
  mark: StudentPaperMark;
  calculationRunId: string;
  calculationVersion: number;
  createdAt: string;
  gradeBands?: readonly GradeBand[];
}): StudentSubjectResult {
  const { mark } = input;
  const validation = validateStudentPaperMark(mark);
  const percentage =
    mark.attendanceStatus === 'PRESENT' &&
    validation.totalMarksObtained !== undefined
      ? calculateResultPercentage(
          validation.totalMarksObtained,
          mark.paperMaximumMarksSnapshot,
        )
      : undefined;
  const gradeBand =
    percentage !== undefined
      ? findGradeBand(
          [...(input.gradeBands ?? mark.gradeBandsSnapshot)],
          percentage.percentage,
        )
      : undefined;
  const componentResults = mark.componentMarks.map(component => ({
    ...component,
    outcome:
      mark.attendanceStatus !== 'PRESENT'
        ? ('NOT_APPLICABLE' as const)
        : component.marksObtained !== undefined &&
          component.marksObtained >= (component.passMarksSnapshot ?? 0)
        ? ('PASS' as const)
        : ('FAIL' as const),
  }));
  const passed =
    validation.isValid &&
    validation.isComplete &&
    validation.totalMarksObtained !== undefined &&
    validation.totalMarksObtained >= mark.paperPassMarksSnapshot &&
    componentResults.every(item => item.outcome !== 'FAIL');
  const outcome =
    mark.attendanceStatus === 'ABSENT'
      ? ('ABSENT' as const)
      : mark.attendanceStatus === 'EXEMPT'
      ? ('EXEMPT' as const)
      : passed
      ? ('PASS' as const)
      : ('FAIL' as const);
  return {
    academicSessionId: mark.academicSessionId,
    attendanceStatus: mark.attendanceStatus,
    branchId: mark.branchId,
    calculationRunId: input.calculationRunId,
    calculationVersion: input.calculationVersion,
    componentResults,
    createdAt: input.createdAt,
    enrollmentId: mark.enrollmentId,
    examClassConfigurationId: mark.examClassConfigurationId,
    examId: mark.examId,
    grade: mark.attendanceStatus === 'PRESENT' ? gradeBand?.grade : undefined,
    gradePoint:
      mark.attendanceStatus === 'PRESENT' ? gradeBand?.gradePoint : undefined,
    id: `subject-result-${input.calculationRunId}-${mark.id}`,
    marksObtained: validation.totalMarksObtained,
    maximumMarks: mark.paperMaximumMarksSnapshot,
    outcome,
    passMarks: mark.paperPassMarksSnapshot,
    percentage: percentage?.percentage,
    percentageBasisPoints: percentage?.basisPoints,
    schoolId: mark.schoolId,
    sectionId: mark.sectionId,
    studentId: mark.studentId,
    subjectCodeSnapshot: mark.subjectCodeSnapshot,
    subjectId: mark.subjectId,
    subjectNameSnapshot: mark.subjectNameSnapshot,
    subjectPaperId: mark.subjectPaperId,
    subjectTypeSnapshot: mark.subjectTypeSnapshot,
  };
}
