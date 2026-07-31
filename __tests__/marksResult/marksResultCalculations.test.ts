import type {
  StudentOverallResult,
  StudentPaperMark,
  StudentSubjectResult,
} from '../../src/models/marksResult';
import { INITIAL_GRADING_SCHEMES } from '../../src/services/examinationSetup/examinationSetupFixtures';
import {
  calculateStudentPaperTotal,
  validateStudentPaperMark,
} from '../../src/utils/marksValidation';
import { calculateOverallResult } from '../../src/utils/overallResultCalculation';
import { calculateResultPercentage } from '../../src/utils/resultPercentage';
import { calculateCompetitionRanks } from '../../src/utils/resultRanking';
import { calculateSubjectResult } from '../../src/utils/subjectResultCalculation';

const bands = INITIAL_GRADING_SCHEMES[0].bands;
const mark = (
  values: Array<number | undefined>,
  attendanceStatus: StudentPaperMark['attendanceStatus'] = 'PRESENT',
): StudentPaperMark => ({
  academicSessionId: 'session',
  attendanceStatus,
  branchId: 'branch',
  componentMarks: values.map((marksObtained, index) => ({
    assessmentComponentId: `component-${index}`,
    componentNameSnapshot: index ? 'Practical' : 'Theory',
    componentTypeSnapshot: index ? 'PRACTICAL' : 'THEORY',
    marksEntryRequiredSnapshot: true,
    marksObtained,
    maximumMarksSnapshot: index ? 30 : 70,
    passMarksSnapshot: index ? 12 : 28,
  })),
  createdAt: '2026-01-01',
  enrollmentId: 'enrollment',
  examClassConfigurationId: 'configuration',
  examId: 'exam',
  gradeBandsSnapshot: bands,
  gradingSchemeIdSnapshot: 'grading',
  id: 'mark',
  markSheetId: 'sheet',
  paperMaximumMarksSnapshot: 100,
  paperPassMarksSnapshot: 40,
  schoolId: 'school',
  sectionId: 'section',
  studentId: 'student',
  subjectCodeSnapshot: 'MAT',
  subjectId: 'subject',
  subjectNameSnapshot: 'Mathematics',
  subjectPaperId: 'paper',
  subjectTypeSnapshot: 'CORE',
  updatedAt: '2026-01-01',
  version: 1,
});
const subject = (
  overrides: Partial<StudentSubjectResult> = {},
): StudentSubjectResult => ({
  ...calculateSubjectResult({
    calculationRunId: 'run',
    calculationVersion: 1,
    createdAt: '2026-01-01',
    mark: mark([56, 24]),
  }),
  ...overrides,
});
const overall = (
  studentId: string,
  total: number,
  outcome: StudentOverallResult['outcome'] = 'PASS',
): StudentOverallResult => ({
  ...calculateOverallResult({
    calculationRunId: 'run',
    calculationVersion: 1,
    context: {
      academicSessionId: 'session',
      branchId: 'branch',
      className: 'Class 2',
      examClassConfigurationId: 'configuration',
      examId: 'exam',
      schoolId: 'school',
      sectionId: 'section',
      sectionName: 'A',
    },
    createdAt: '2026-01-01',
    gradeBands: bands,
    includeOptionalSubjectsInTotal: true,
    overallPassPercentage: 40,
    requiredSubjectCount: 1,
    requirePassInEverySubject: true,
    student: {
      admissionNumber: studentId,
      enrollmentId: `enrollment-${studentId}`,
      name: studentId,
      studentId,
    },
    subjectResults: [
      subject({
        marksObtained: total,
        percentage: total,
        percentageBasisPoints: total * 100,
        outcome: outcome === 'FAIL' ? 'FAIL' : 'PASS',
      }),
    ],
  }),
  outcome,
  percentage: total,
  percentageBasisPoints: total * 100,
  studentId,
  totalMarksObtained: total,
});

describe('Marks validation and Result calculation', () => {
  it('distinguishes zero Marks from blank and preserves controlled basis-point rounding', () => {
    expect(calculateStudentPaperTotal(mark([0, 0]))).toBe(0);
    expect(validateStudentPaperMark(mark([undefined, 0])).isComplete).toBe(
      false,
    );
    expect(calculateResultPercentage(2, 3)).toEqual({
      basisPoints: 6667,
      percentage: 66.67,
    });
  });
  it('rejects negative, decimal, above-maximum, absent-with-marks and exempt-without-reason values', () => {
    expect(validateStudentPaperMark(mark([-1, 2])).issues[0].code).toBe(
      'NEGATIVE_MARKS',
    );
    expect(validateStudentPaperMark(mark([1.5, 2])).issues[0].code).toBe(
      'DECIMAL_MARKS_NOT_SUPPORTED',
    );
    expect(validateStudentPaperMark(mark([71, 2])).issues[0].code).toBe(
      'MARKS_ABOVE_COMPONENT_MAXIMUM',
    );
    expect(
      validateStudentPaperMark(mark([1, undefined], 'ABSENT')).issues[0].code,
    ).toBe('ABSENT_MARKS_NOT_ALLOWED');
    expect(
      validateStudentPaperMark(mark([undefined, undefined], 'EXEMPT')).issues[0]
        .code,
    ).toBe('EXEMPTION_REASON_REQUIRED');
  });
  it('requires both Paper and required Component pass thresholds', () => {
    expect(
      calculateSubjectResult({
        calculationRunId: 'run',
        calculationVersion: 1,
        createdAt: 'now',
        mark: mark([70, 0]),
      }).outcome,
    ).toBe('FAIL');
    expect(
      calculateSubjectResult({
        calculationRunId: 'run',
        calculationVersion: 1,
        createdAt: 'now',
        mark: mark([28, 12]),
      }).outcome,
    ).toBe('PASS');
  });
  it('calculates absence/exemption and assigns the zero-percent grade', () => {
    expect(
      calculateSubjectResult({
        calculationRunId: 'run',
        calculationVersion: 1,
        createdAt: 'now',
        mark: mark([undefined, undefined], 'ABSENT'),
      }).outcome,
    ).toBe('ABSENT');
    expect(
      calculateSubjectResult({
        calculationRunId: 'run',
        calculationVersion: 1,
        createdAt: 'now',
        mark: {
          ...mark([undefined, undefined], 'EXEMPT'),
          exemptionReason: 'Approved',
        },
      }).outcome,
    ).toBe('EXEMPT');
    expect(
      calculateSubjectResult({
        calculationRunId: 'run',
        calculationVersion: 1,
        createdAt: 'now',
        mark: mark([0, 0]),
      }).grade,
    ).toBe('F');
  });
  it('excludes optional/exempt Subjects and marks missing required Subjects incomplete', () => {
    const common = {
      calculationRunId: 'run',
      calculationVersion: 1,
      context: {
        academicSessionId: 'session',
        branchId: 'branch',
        className: 'Class',
        examClassConfigurationId: 'config',
        examId: 'exam',
        schoolId: 'school',
        sectionId: 'section',
        sectionName: 'A',
      },
      createdAt: 'now',
      gradeBands: bands,
      overallPassPercentage: 40,
      requirePassInEverySubject: true,
      student: {
        admissionNumber: '1',
        enrollmentId: 'enrollment',
        name: 'Name',
        studentId: 'student',
      },
    };
    expect(
      calculateOverallResult({
        ...common,
        includeOptionalSubjectsInTotal: false,
        requiredSubjectCount: 1,
        subjectResults: [
          subject(),
          subject({
            id: 'optional',
            marksObtained: 100,
            maximumMarks: 100,
            subjectTypeSnapshot: 'OPTIONAL',
          }),
        ],
      }).totalMaximumMarks,
    ).toBe(100);
    expect(
      calculateOverallResult({
        ...common,
        includeOptionalSubjectsInTotal: true,
        requiredSubjectCount: 2,
        subjectResults: [subject()],
      }).outcome,
    ).toBe('INCOMPLETE');
  });
  it('uses competition ranking, pass-only eligibility, deterministic tie ordering and gaps', () => {
    const ranked = calculateCompetitionRanks(
      [
        overall('c', 80),
        overall('b', 90),
        overall('a', 90),
        overall('d', 99, 'FAIL'),
      ],
      true,
    );
    expect(ranked.find(item => item.studentId === 'a')?.rank).toBe(1);
    expect(ranked.find(item => item.studentId === 'b')?.rank).toBe(1);
    expect(ranked.find(item => item.studentId === 'c')?.rank).toBe(3);
    expect(ranked.find(item => item.studentId === 'd')?.rank).toBeUndefined();
  });
});
