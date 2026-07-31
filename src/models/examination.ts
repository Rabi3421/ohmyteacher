import type { SubjectType } from './academic';
import type { ID, PaginatedResponse } from './common';

export type ExamTermStatus = 'ACTIVE' | 'INACTIVE';
export type ExamTypeStatus = 'ACTIVE' | 'INACTIVE';
export type GradingSchemeStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type ExamStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';
export type ExamSectionApplicability =
  | 'ALL_ACTIVE_SECTIONS'
  | 'SELECTED_SECTIONS';
export type AssessmentComponentType =
  | 'THEORY'
  | 'PRACTICAL'
  | 'ORAL'
  | 'PROJECT'
  | 'INTERNAL';
export type ExamPaperStatus = 'DRAFT' | 'SCHEDULED' | 'CANCELLED';
export type ExamIssueSeverity = 'BLOCKER' | 'WARNING';
export type ExamScheduleConflictType =
  | 'CLASS_TIME_OVERLAP'
  | 'SECTION_TIME_OVERLAP'
  | 'ROOM_TIME_OVERLAP'
  | 'OUTSIDE_EXAM_DATE_RANGE'
  | 'OUTSIDE_SESSION_RANGE'
  | 'MISSING_SCHEDULE'
  | 'DUPLICATE_SUBJECT';

export interface ExaminationContext {
  schoolId: ID;
  branchId: ID;
  academicSessionId: ID;
  sessionStatus: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
}

export interface ExamTerm {
  id: ID;
  schoolId: ID;
  academicSessionId: ID;
  name: string;
  code: string;
  description?: string;
  startDate: string;
  endDate: string;
  displayOrder: number;
  status: ExamTermStatus;
  activeExamCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExamType {
  id: ID;
  schoolId: ID;
  name: string;
  code: string;
  description?: string;
  defaultWeightagePercent?: number;
  displayOrder: number;
  status: ExamTypeStatus;
  activeExamCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GradeBand {
  id: ID;
  minimumPercentage: number;
  maximumPercentage: number;
  grade: string;
  gradePoint?: number;
  remark?: string;
  isPassing: boolean;
  displayOrder: number;
}

export interface GradingScheme {
  id: ID;
  schoolId: ID;
  name: string;
  code: string;
  description?: string;
  bands: GradeBand[];
  isDefault: boolean;
  status: GradingSchemeStatus;
  activeExamClassCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentComponent {
  id: ID;
  type: AssessmentComponentType;
  name: string;
  maximumMarks: number;
  passMarks?: number;
  marksEntryRequired: boolean;
  displayOrder: number;
}

export interface ExamSubjectPaper {
  id: ID;
  examId: ID;
  examClassConfigurationId: ID;
  schoolId: ID;
  branchId: ID;
  academicSessionId: ID;
  classId: ID;
  subjectId: ID;
  subjectNameSnapshot: string;
  subjectCodeSnapshot: string;
  subjectTypeSnapshot: SubjectType;
  totalMaximumMarks: number;
  totalPassMarks: number;
  weightagePercent?: number;
  components: AssessmentComponent[];
  examDate?: string;
  startTime?: string;
  durationMinutes?: number;
  room?: string;
  displayOrder: number;
  status: ExamPaperStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ExamClassConfiguration {
  id: ID;
  examId: ID;
  schoolId: ID;
  branchId: ID;
  academicSessionId: ID;
  classId: ID;
  classNameSnapshot: string;
  classCodeSnapshot: string;
  sectionApplicability: ExamSectionApplicability;
  sectionIds: ID[];
  sectionSnapshots: Array<{ id: ID; name: string; code: string }>;
  gradingSchemeId: ID;
  gradingSchemeNameSnapshot: string;
  requirePassInEverySubject: boolean;
  overallPassPercentage?: number;
  includeOptionalSubjectsInTotal: boolean;
  rankEnabled: boolean;
  subjectPaperCount: number;
  totalMaximumMarks: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface ExamSetupIssue {
  code: string;
  severity: ExamIssueSeverity;
  message: string;
  examId?: ID;
  classConfigurationId?: ID;
  paperId?: ID;
  field?: string;
}

export interface ExamScheduleConflict extends ExamSetupIssue {
  code: ExamScheduleConflictType;
  paperIds: ID[];
  examDate?: string;
}

export interface ExamSetupValidationResult {
  isComplete: boolean;
  completionPercent: number;
  blockers: ExamSetupIssue[];
  warnings: ExamSetupIssue[];
}

export interface Exam {
  id: ID;
  schoolId: ID;
  branchId: ID;
  academicSessionId: ID;
  termId: ID;
  termName: string;
  examTypeId: ID;
  examTypeName: string;
  branchName: string;
  academicSessionName: string;
  name: string;
  code: string;
  description?: string;
  startDate: string;
  endDate: string;
  defaultWeightagePercent?: number;
  status: ExamStatus;
  classConfigurationCount: number;
  subjectPaperCount: number;
  setupCompletionPercent: number;
  setupWarnings: ExamSetupIssue[];
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledByUserId?: ID;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExamDetails extends Exam {
  classConfigurations: ExamClassConfiguration[];
  subjectPapers: ExamSubjectPaper[];
  setupValidation: ExamSetupValidationResult;
  scheduleConflicts: ExamScheduleConflict[];
}

export interface ExaminationSetupSummary {
  activeTerms: number;
  activeExamTypes: number;
  activeGradingSchemes: number;
  draftExams: number;
  scheduledExams: number;
  incompleteExams: number;
  upcomingPapers: number;
  scheduleConflicts: number;
  warnings: ExamSetupIssue[];
}

export type ExamSetupSummary = ExaminationSetupSummary;

export interface ExamCopyPreview {
  sourceExamId: ID;
  destinationBranchId: ID;
  destinationAcademicSessionId: ID;
  destinationTermId: ID;
  matchedClassCount: number;
  matchedSubjectCount: number;
  omittedClassCodes: string[];
  omittedSubjectCodes: string[];
  warnings: ExamSetupIssue[];
}

export interface ExamCopyResult {
  exam: ExamDetails;
  warnings: ExamSetupIssue[];
}

export interface ExamActivity {
  id: ID;
  schoolId: ID;
  branchId?: ID;
  academicSessionId?: ID;
  examId?: ID;
  classId?: ID;
  action: string;
  actingUserId?: ID;
  timestamp: string;
  description: string;
}

interface ListQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ExamTermListQuery extends ListQuery {
  status?: ExamTermStatus | 'ALL';
}
export interface ExamTypeListQuery extends ListQuery {
  status?: ExamTypeStatus | 'ALL';
}
export interface GradingSchemeListQuery extends ListQuery {
  status?: GradingSchemeStatus | 'ALL';
}
export interface ExamListQuery extends ListQuery {
  termId?: ID;
  examTypeId?: ID;
  status?: ExamStatus | 'ALL';
  startDate?: string;
  endDate?: string;
}

export interface CreateExamTermInput {
  name: string;
  code: string;
  description?: string;
  startDate: string;
  endDate: string;
  displayOrder: number;
  status: ExamTermStatus;
}
export type UpdateExamTermInput = CreateExamTermInput;

export interface CreateExamTypeInput {
  name: string;
  code: string;
  description?: string;
  defaultWeightagePercent?: number;
  displayOrder: number;
  status: ExamTypeStatus;
}
export type UpdateExamTypeInput = CreateExamTypeInput;

export interface CreateGradingSchemeInput {
  name: string;
  code: string;
  description?: string;
  bands: Array<Omit<GradeBand, 'id'> & { id?: ID }>;
  isDefault: boolean;
  status: GradingSchemeStatus;
}
export type UpdateGradingSchemeInput = CreateGradingSchemeInput;

export interface CreateExamInput {
  branchId: ID;
  academicSessionId: ID;
  termId: ID;
  examTypeId: ID;
  name: string;
  code: string;
  description?: string;
  startDate: string;
  endDate: string;
  defaultWeightagePercent?: number;
  classConfigurations?: ExamClassConfigurationInput[];
  subjectPapers?: ExamSubjectPaperInput[];
}
export type UpdateExamInput = Omit<
  CreateExamInput,
  'branchId' | 'academicSessionId' | 'classConfigurations' | 'subjectPapers'
>;

export interface ExamClassConfigurationInput {
  id?: ID;
  classId: ID;
  sectionApplicability: ExamSectionApplicability;
  sectionIds: ID[];
  gradingSchemeId: ID;
  requirePassInEverySubject: boolean;
  overallPassPercentage?: number;
  includeOptionalSubjectsInTotal: boolean;
  rankEnabled: boolean;
}

export interface ExamSubjectPaperInput {
  id?: ID;
  examClassConfigurationId?: ID;
  classId?: ID;
  subjectId: ID;
  totalMaximumMarks: number;
  totalPassMarks: number;
  weightagePercent?: number;
  components: Array<Omit<AssessmentComponent, 'id'> & { id?: ID }>;
  examDate?: string;
  startTime?: string;
  durationMinutes?: number;
  room?: string;
  displayOrder: number;
}

export interface UpdateExamClassConfigurationsInput {
  configurations: ExamClassConfigurationInput[];
}
export interface UpdateExamSubjectPapersInput {
  papers: ExamSubjectPaperInput[];
}
export interface UpdateExamScheduleInput {
  schedules: Array<{
    paperId: ID;
    examDate: string;
    startTime: string;
    durationMinutes: number;
    room?: string;
  }>;
}

export interface PreviewCopyExamInput {
  destinationBranchId: ID;
  destinationAcademicSessionId: ID;
  destinationTermId: ID;
}
export interface CopyExamInput extends PreviewCopyExamInput {
  name: string;
  code: string;
}
export interface CancelExamInput {
  reason: string;
  actingUserId?: ID;
}

export interface ExaminationPages {
  terms: PaginatedResponse<ExamTerm>;
  examTypes: PaginatedResponse<ExamType>;
  gradingSchemes: PaginatedResponse<GradingScheme>;
  exams: PaginatedResponse<Exam>;
}
