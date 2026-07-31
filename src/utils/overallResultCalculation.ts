import type { GradeBand } from '../models/examination';
import type {
  OverallResultOutcome,
  StudentOverallResult,
  StudentSubjectResult,
} from '../models/marksResult';
import { findGradeBand } from './gradeBandValidation';
import { calculateResultPercentage } from './resultPercentage';

export function calculateOverallResult(input: {
  subjectResults: readonly StudentSubjectResult[];
  requiredSubjectCount: number;
  includeOptionalSubjectsInTotal: boolean;
  requirePassInEverySubject: boolean;
  overallPassPercentage?: number;
  gradeBands: readonly GradeBand[];
  calculationRunId: string;
  calculationVersion: number;
  createdAt: string;
  student: {
    studentId: string;
    enrollmentId: string;
    name: string;
    admissionNumber: string;
    rollNumber?: string;
  };
  context: {
    schoolId: string;
    branchId: string;
    academicSessionId: string;
    examId: string;
    examClassConfigurationId: string;
    sectionId: string;
    className: string;
    sectionName: string;
  };
}): StudentOverallResult {
  const required = input.subjectResults.filter(
    item => item.subjectTypeSnapshot !== 'OPTIONAL',
  );
  const included = input.subjectResults.filter(
    item =>
      item.outcome !== 'EXEMPT' &&
      (input.includeOptionalSubjectsInTotal ||
        item.subjectTypeSnapshot !== 'OPTIONAL'),
  );
  const incomplete =
    required.length < input.requiredSubjectCount ||
    input.subjectResults.some(
      item =>
        item.attendanceStatus === 'PRESENT' && item.marksObtained === undefined,
    );
  const totalMaximumMarks = included.reduce(
    (total, item) => total + item.maximumMarks,
    0,
  );
  const totalMarksObtained = included.reduce(
    (total, item) => total + (item.marksObtained ?? 0),
    0,
  );
  const calculatedPercentage = calculateResultPercentage(
    totalMarksObtained,
    totalMaximumMarks,
  );
  const percentage = calculatedPercentage?.percentage ?? 0;
  const allRequiredAbsent =
    required.length > 0 && required.every(item => item.outcome === 'ABSENT');
  const requiredFailure = required.some(
    item => item.outcome === 'FAIL' || item.outcome === 'ABSENT',
  );
  let outcome: OverallResultOutcome;
  if (incomplete || totalMaximumMarks === 0) outcome = 'INCOMPLETE';
  else if (allRequiredAbsent) outcome = 'ABSENT';
  else if (
    (input.requirePassInEverySubject && requiredFailure) ||
    (input.overallPassPercentage !== undefined &&
      percentage < input.overallPassPercentage)
  )
    outcome = 'FAIL';
  else outcome = 'PASS';
  const gradeBand =
    outcome !== 'INCOMPLETE'
      ? findGradeBand([...input.gradeBands], percentage)
      : undefined;
  return {
    absentSubjectCount: input.subjectResults.filter(
      item => item.outcome === 'ABSENT',
    ).length,
    academicSessionId: input.context.academicSessionId,
    admissionNumberSnapshot: input.student.admissionNumber,
    branchId: input.context.branchId,
    calculationRunId: input.calculationRunId,
    calculationVersion: input.calculationVersion,
    classNameSnapshot: input.context.className,
    createdAt: input.createdAt,
    enrollmentId: input.student.enrollmentId,
    examClassConfigurationId: input.context.examClassConfigurationId,
    examId: input.context.examId,
    exemptSubjectCount: input.subjectResults.filter(
      item => item.outcome === 'EXEMPT',
    ).length,
    failedSubjectCount: input.subjectResults.filter(
      item => item.outcome === 'FAIL',
    ).length,
    grade: gradeBand?.grade,
    gradeBandSnapshot: gradeBand ? { ...gradeBand } : undefined,
    gradePoint: gradeBand?.gradePoint,
    id: `overall-result-${input.calculationRunId}-${input.student.studentId}`,
    outcome,
    passedSubjectCount: input.subjectResults.filter(
      item => item.outcome === 'PASS',
    ).length,
    percentage,
    percentageBasisPoints: calculatedPercentage?.basisPoints ?? 0,
    resultStatus: 'CALCULATED',
    rollNumberSnapshot: input.student.rollNumber,
    schoolId: input.context.schoolId,
    sectionId: input.context.sectionId,
    sectionNameSnapshot: input.context.sectionName,
    studentId: input.student.studentId,
    studentNameSnapshot: input.student.name,
    totalMarksObtained,
    totalMaximumMarks,
    updatedAt: input.createdAt,
  };
}
