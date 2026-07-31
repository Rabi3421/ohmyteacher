import type { SubjectType } from './academic';
import type { ID } from './common';
import type {
  AssessmentComponentType,
  ExamSetupIssue,
  GradeBand,
} from './examination';

export type MarkSheetStatus = 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'LOCKED';
export type StudentPaperAttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXEMPT';
export type SubjectResultOutcome = 'PASS' | 'FAIL' | 'ABSENT' | 'EXEMPT';
export type OverallResultOutcome = 'PASS' | 'FAIL' | 'ABSENT' | 'INCOMPLETE';
export type ResultRecordStatus =
  | 'CALCULATED'
  | 'REVIEWED'
  | 'PUBLISHED'
  | 'UNPUBLISHED'
  | 'STALE';
export type ResultCalculationScope =
  | 'ONE_STUDENT'
  | 'ONE_SECTION'
  | 'ONE_CLASS'
  | 'COMPLETE_EXAM';
export type ResultCalculationRunStatus =
  | 'PREVIEWED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PARTIALLY_COMPLETED'
  | 'FAILED';
export type RankScope = 'SECTION_RANK' | 'CLASS_RANK';
export type ResultPublicationScope = 'SECTION' | 'CLASS' | 'COMPLETE_EXAM';

export interface StudentComponentMark {
  assessmentComponentId: ID;
  componentNameSnapshot: string;
  componentTypeSnapshot: AssessmentComponentType;
  maximumMarksSnapshot: number;
  passMarksSnapshot?: number;
  marksEntryRequiredSnapshot: boolean;
  marksObtained?: number;
}

export interface StudentPaperMark {
  id: ID;
  markSheetId: ID;
  schoolId: ID;
  branchId: ID;
  academicSessionId: ID;
  examId: ID;
  examClassConfigurationId: ID;
  sectionId: ID;
  subjectPaperId: ID;
  subjectId: ID;
  subjectNameSnapshot: string;
  subjectCodeSnapshot: string;
  subjectTypeSnapshot: SubjectType;
  paperMaximumMarksSnapshot: number;
  paperPassMarksSnapshot: number;
  gradingSchemeIdSnapshot: ID;
  gradeBandsSnapshot: GradeBand[];
  studentId: ID;
  enrollmentId: ID;
  attendanceStatus: StudentPaperAttendanceStatus;
  componentMarks: StudentComponentMark[];
  totalMarksObtained?: number;
  remarks?: string;
  exemptionReason?: string;
  version: number;
  enteredByUserId?: ID;
  enteredByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarkSheet {
  id: ID;
  schoolId: ID;
  branchId: ID;
  academicSessionId: ID;
  examId: ID;
  examClassConfigurationId: ID;
  sectionId: ID;
  subjectPaperId: ID;
  classNameSnapshot: string;
  sectionNameSnapshot: string;
  subjectNameSnapshot: string;
  subjectCodeSnapshot: string;
  paperMaximumMarksSnapshot: number;
  paperPassMarksSnapshot: number;
  scheduledAt?: string;
  status: MarkSheetStatus;
  studentCount: number;
  presentCount: number;
  absentCount: number;
  exemptCount: number;
  completedStudentCount: number;
  invalidStudentCount: number;
  version: number;
  submittedAt?: string;
  submittedByUserId?: ID;
  submittedByName?: string;
  lockedAt?: string;
  lockedByUserId?: ID;
  lockedByName?: string;
  unlockedAt?: string;
  unlockedByUserId?: ID;
  unlockReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarkSheetStudent {
  studentId: ID;
  enrollmentId: ID;
  studentName: string;
  admissionNumber: string;
  rollNumber?: string;
  mark: StudentPaperMark;
}

export interface MarksValidationIssue {
  code: string;
  message: string;
  studentId?: ID;
  assessmentComponentId?: ID;
  field?: string;
}

export interface MarksValidationResult {
  isValid: boolean;
  isComplete: boolean;
  totalMarksObtained?: number;
  issues: MarksValidationIssue[];
}

export interface MarkSheetReviewSummary {
  totalStudents: number;
  present: number;
  absent: number;
  exempt: number;
  completed: number;
  incomplete: number;
  invalid: number;
  highestMarks?: number;
  lowestMarks?: number;
  averageMarks?: number;
  paperMaximumMarks: number;
  paperPassMarks: number;
  blockers: MarksValidationIssue[];
}

export interface MarkSheetDetails extends MarkSheet {
  examNameSnapshot: string;
  students: MarkSheetStudent[];
  validation: MarksValidationResult;
  reviewSummary: MarkSheetReviewSummary;
}

export type MarkSheetSummary = MarkSheet;

export interface MarksDashboardSummary {
  totalMarkSheets: number;
  notStarted: number;
  draft: number;
  submitted: number;
  locked: number;
  incompleteStudents: number;
  invalidMarks: number;
  resultsReady: number;
  publishedSections: number;
  warnings: ExamSetupIssue[];
}

export interface MarkSheetHistoryRecord {
  id: ID;
  schoolId: ID;
  examId: ID;
  markSheetId: ID;
  classNameSnapshot: string;
  sectionNameSnapshot: string;
  subjectNameSnapshot: string;
  studentId?: ID;
  action: string;
  description: string;
  oldValueSummary?: string;
  newValueSummary?: string;
  actingUserId?: ID;
  actingUserName?: string;
  reason?: string;
  version: number;
  createdAt: string;
}

export interface StudentComponentResult extends StudentComponentMark {
  outcome: 'PASS' | 'FAIL' | 'NOT_APPLICABLE';
}

export interface StudentSubjectResult {
  id: ID;
  schoolId: ID;
  branchId: ID;
  academicSessionId: ID;
  examId: ID;
  examClassConfigurationId: ID;
  sectionId: ID;
  studentId: ID;
  enrollmentId: ID;
  subjectPaperId: ID;
  subjectId: ID;
  subjectNameSnapshot: string;
  subjectCodeSnapshot: string;
  subjectTypeSnapshot: SubjectType;
  maximumMarks: number;
  passMarks: number;
  marksObtained?: number;
  percentage?: number;
  percentageBasisPoints?: number;
  grade?: string;
  gradePoint?: number;
  attendanceStatus: StudentPaperAttendanceStatus;
  outcome: SubjectResultOutcome;
  componentResults: StudentComponentResult[];
  calculationRunId: ID;
  calculationVersion: number;
  createdAt: string;
}

export interface StudentOverallResult {
  id: ID;
  schoolId: ID;
  branchId: ID;
  academicSessionId: ID;
  examId: ID;
  examClassConfigurationId: ID;
  sectionId: ID;
  studentId: ID;
  enrollmentId: ID;
  studentNameSnapshot: string;
  admissionNumberSnapshot: string;
  rollNumberSnapshot?: string;
  classNameSnapshot: string;
  sectionNameSnapshot: string;
  totalMaximumMarks: number;
  totalMarksObtained: number;
  percentage: number;
  percentageBasisPoints: number;
  grade?: string;
  gradePoint?: number;
  gradeBandSnapshot?: GradeBand;
  passedSubjectCount: number;
  failedSubjectCount: number;
  absentSubjectCount: number;
  exemptSubjectCount: number;
  outcome: OverallResultOutcome;
  rank?: number;
  calculationRunId: ID;
  calculationVersion: number;
  resultStatus: ResultRecordStatus;
  reviewedAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResultCalculationRun {
  id: ID;
  schoolId: ID;
  examId: ID;
  scope: ResultCalculationScope;
  examClassConfigurationId?: ID;
  sectionId?: ID;
  studentId?: ID;
  status: ResultCalculationRunStatus;
  sourceVersions: Record<ID, number>;
  studentCount: number;
  completedCount: number;
  failedCount: number;
  startedAt: string;
  completedAt?: string;
}

export interface ResultCalculationPreview {
  previewId: ID;
  expiresAt: string;
  scope: ResultCalculationScope;
  students: number;
  lockedMarkSheets: number;
  missingMarkSheets: number;
  eligibleStudents: number;
  passCount: number;
  failCount: number;
  absentCount: number;
  incompleteCount: number;
  gradeDistribution: Record<string, number>;
  rankApplicable: boolean;
  blockers: ExamSetupIssue[];
  warnings: ExamSetupIssue[];
  sourceVersions: Record<ID, number>;
}

export interface ResultCalculationResult {
  run: ResultCalculationRun;
  subjectResults: StudentSubjectResult[];
  overallResults: StudentOverallResult[];
  warnings: ExamSetupIssue[];
}

export interface ResultReviewRecord {
  id: ID;
  schoolId: ID;
  examId: ID;
  examClassConfigurationId: ID;
  sectionId?: ID;
  reviewScope: 'SECTION' | 'CLASS';
  status: 'PENDING' | 'REVIEWED';
  reviewedByUserId?: ID;
  reviewedByName?: string;
  reviewedAt?: string;
  remarks?: string;
  calculationRunId: ID;
}

export interface PublishedSubjectResultSnapshot
  extends Omit<StudentSubjectResult, 'calculationRunId' | 'createdAt'> {}
export interface PublishedOverallResultSnapshot
  extends Omit<
    StudentOverallResult,
    'calculationRunId' | 'createdAt' | 'updatedAt'
  > {}

export interface PublishedResultSnapshot {
  id: ID;
  schoolId: ID;
  branchId: ID;
  academicSessionId: ID;
  examId: ID;
  examNameSnapshot: string;
  termNameSnapshot: string;
  examTypeNameSnapshot: string;
  studentId: ID;
  enrollmentId: ID;
  classNameSnapshot: string;
  sectionNameSnapshot: string;
  rollNumberSnapshot?: string;
  subjectResults: PublishedSubjectResultSnapshot[];
  overallResult: PublishedOverallResultSnapshot;
  publicationBatchId: ID;
  calculationRunId: ID;
  publishedAt: string;
  publishedByUserId: ID;
  publishedByName: string;
  status: 'PUBLISHED' | 'UNPUBLISHED';
}

export interface ResultPublicationBatch {
  id: ID;
  schoolId: ID;
  branchId: ID;
  academicSessionId: ID;
  examId: ID;
  scope: ResultPublicationScope;
  examClassConfigurationId?: ID;
  sectionId?: ID;
  calculationRunId: ID;
  studentCount: number;
  status: 'PUBLISHED' | 'UNPUBLISHED';
  publishedAt: string;
  publishedByUserId: ID;
  publishedByName: string;
  unpublishedAt?: string;
  unpublishedByUserId?: ID;
  unpublishedByName?: string;
  unpublicationReason?: string;
}

export type ResultPublicationHistory = ResultPublicationBatch;

export interface RankEntry {
  studentId: ID;
  studentName: string;
  admissionNumber: string;
  rollNumber?: string;
  totalMarksObtained: number;
  totalMaximumMarks: number;
  percentage: number;
  outcome: OverallResultOutcome;
  rank?: number;
}

export interface ResultProcessingSummary {
  lockedMarkSheets: number;
  unlockedMarkSheets: number;
  calculatedStudents: number;
  incompleteStudents: number;
  reviewedSections: number;
  publishedSections: number;
  passCount: number;
  failCount: number;
  absentCount: number;
  staleResults: number;
  warnings: ExamSetupIssue[];
}

export interface ClassResultSummary {
  examClassConfigurationId: ID;
  results: StudentOverallResult[];
  total: number;
}
export interface SectionResultSummary {
  sectionId: ID;
  results: StudentOverallResult[];
  total: number;
}
export interface StudentResultDetails {
  student: Pick<
    StudentOverallResult,
    | 'studentId'
    | 'studentNameSnapshot'
    | 'admissionNumberSnapshot'
    | 'rollNumberSnapshot'
    | 'classNameSnapshot'
    | 'sectionNameSnapshot'
  >;
  subjectResults: StudentSubjectResult[];
  overallResult: StudentOverallResult;
}

export interface MarkSheetListQuery {
  search?: string;
  classId?: ID;
  sectionId?: ID;
  status?: MarkSheetStatus | 'ALL';
  completion?: 'ALL' | 'COMPLETE' | 'INCOMPLETE';
  page?: number;
  pageSize?: number;
}
export interface ResultListQuery {
  search?: string;
  outcome?: OverallResultOutcome | 'ALL';
  grade?: string;
  minimumRank?: number;
  maximumRank?: number;
}

export interface StudentPaperMarkInput {
  studentId: ID;
  expectedVersion: number;
  attendanceStatus: StudentPaperAttendanceStatus;
  componentMarks: Array<{
    assessmentComponentId: ID;
    marksObtained?: number;
  }>;
  remarks?: string;
  exemptionReason?: string;
}
export interface SaveMarkSheetDraftInput {
  expectedVersion: number;
  marks: StudentPaperMarkInput[];
  actingUserId?: ID;
  actingUserName?: string;
}
export interface ReturnMarkSheetToDraftInput {
  reason: string;
  actingUserId?: ID;
  actingUserName?: string;
}
export type UnlockMarkSheetInput = ReturnMarkSheetToDraftInput;
export interface MarkSheetActionInput {
  expectedVersion: number;
  actingUserId?: ID;
  actingUserName?: string;
}

export interface PreviewResultCalculationInput {
  scope: ResultCalculationScope;
  examClassConfigurationId?: ID;
  sectionId?: ID;
  studentId?: ID;
}
export interface CalculateResultsInput extends PreviewResultCalculationInput {
  previewId: ID;
  actingUserId?: ID;
  actingUserName?: string;
}
export interface ReviewResultsInput {
  reviewScope: 'SECTION' | 'CLASS';
  examClassConfigurationId: ID;
  sectionId?: ID;
  calculationRunId: ID;
  remarks?: string;
  actingUserId?: ID;
  actingUserName?: string;
}
export interface PublishResultsInput {
  scope: ResultPublicationScope;
  examClassConfigurationId?: ID;
  sectionId?: ID;
  calculationRunId: ID;
  actingUserId: ID;
  actingUserName: string;
}
export interface UnpublishResultsInput {
  reason: string;
  actingUserId: ID;
  actingUserName: string;
}
export interface GetRankListInput {
  scope: RankScope;
  examClassConfigurationId: ID;
  sectionId?: ID;
}
