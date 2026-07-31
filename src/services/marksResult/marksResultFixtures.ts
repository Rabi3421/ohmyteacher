import type { StudentPaperAttendanceStatus } from '../../models/marksResult';

export const MARKS_RESULT_FIXTURE_CLOCK = '2026-08-20T10:00:00.000Z';

export const MARKS_RESULT_SCENARIOS = {
  absentStudentId: 'student-saanvi',
  atomicDraftFailure: 'ATOMIC_DRAFT_SAVE_FAILURE',
  atomicPublicationFailure: 'PUBLICATION_FAILURE_ROLLBACK',
  atomicResultFailure: 'ATOMIC_RESULT_CALCULATION_FAILURE',
  closedExamId: 'exam-omt-closed-history',
  crossBranchId: 'branch-greenfield-puri',
  crossSchoolId: 'school-greenfield',
  emptyExamId: 'exam-omt-draft',
  exemptStudentId: 'student-tara',
  marksAboveMaximum: 101,
  scheduledExamId: 'exam-omt-scheduled',
  versionConflictExpected: 999,
  zeroMarksStudentId: 'student-aarav',
} as const;

export const ATTENDANCE_FIXTURE_SEQUENCE: ReadonlyArray<{
  studentId: string;
  attendanceStatus: StudentPaperAttendanceStatus;
}> = [
  { studentId: 'student-aarav', attendanceStatus: 'PRESENT' },
  { studentId: 'student-saanvi', attendanceStatus: 'ABSENT' },
  { studentId: 'student-reyansh', attendanceStatus: 'PRESENT' },
  { studentId: 'student-tara', attendanceStatus: 'EXEMPT' },
];
