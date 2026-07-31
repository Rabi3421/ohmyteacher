import type { GradeBand } from './examination';
import type {
  PublishedOverallResultSnapshot,
  PublishedResultSnapshot,
  PublishedSubjectResultSnapshot,
} from './marksResult';
import type { ID, PaginatedResponse } from './common';

export type ReportCardTemplateStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type ReportCardLayoutType = 'STANDARD' | 'COMPACT';
export type ReportCardStatus =
  | 'DRAFT'
  | 'GENERATED'
  | 'AVAILABLE'
  | 'REVOKED'
  | 'FAILED';
export type ReportCardDocumentStatus =
  | 'DOCUMENT_PENDING'
  | 'PREVIEW_READY'
  | 'DOCUMENT_READY'
  | 'DOCUMENT_FAILED';
export type ReportCardGenerationScope =
  | 'ONE_STUDENT'
  | 'ONE_SECTION'
  | 'ONE_CLASS'
  | 'COMPLETE_EXAM';
export type ReportCardGenerationRunStatus =
  | 'PREVIEWED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PARTIALLY_COMPLETED'
  | 'FAILED';
export type ReportCardGenerationItemStatus =
  | 'CREATED'
  | 'EXISTING'
  | 'SKIPPED'
  | 'FAILED';

export interface ReportCardTemplate {
  id: ID;
  schoolId: ID;
  name: string;
  code: string;
  description?: string;
  layoutType: ReportCardLayoutType;
  title: string;
  subtitle?: string;
  showSchoolLogo: boolean;
  showBranchAddress: boolean;
  showStudentPhoto: boolean;
  showComponentMarks: boolean;
  showSubjectPercentage: boolean;
  showSubjectGrade: boolean;
  showSubjectOutcome: boolean;
  showOverallPercentage: boolean;
  showOverallGrade: boolean;
  showOverallOutcome: boolean;
  showRank: boolean;
  showGradeLegend: boolean;
  showGenerationMetadata: boolean;
  principalSignatureLabel?: string;
  schoolAuthoritySignatureLabel?: string;
  parentSignatureLabel?: string;
  footerText?: string;
  isDefault: boolean;
  status: ReportCardTemplateStatus;
  activeUsageCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ReportCardTemplateSnapshot = Omit<
  ReportCardTemplate,
  'id' | 'schoolId' | 'activeUsageCount' | 'createdAt' | 'updatedAt'
> & { templateId: ID; templateUpdatedAt: string };

export interface ReportCardSchoolSnapshot {
  name: string;
  code: string;
  logoUrl?: string;
  address: string;
  phone?: string;
  email?: string;
}
export interface ReportCardBranchSnapshot {
  name: string;
  code: string;
  address: string;
}
export interface ReportCardExamSnapshot {
  name: string;
  termName: string;
  examTypeName: string;
  academicSessionName: string;
}
export interface ReportCardStudentSnapshot {
  name: string;
  admissionNumber: string;
  rollNumber?: string;
  className: string;
  sectionName: string;
  photoUrl?: string;
}
export type ReportCardSubjectResultSnapshot = PublishedSubjectResultSnapshot;
export type ReportCardOverallResultSnapshot = PublishedOverallResultSnapshot;
export interface ReportCardGradingSchemeSnapshot {
  name: string;
  code: string;
  bands: GradeBand[];
}
export interface ReportCardVersionReference {
  publicationBatchId: ID;
  calculationRunId: ID;
  resultCalculationVersion: number;
  reportCardVersion: number;
}

export interface ReportCard {
  id: ID;
  schoolId: ID;
  branchId: ID;
  academicSessionId: ID;
  examId: ID;
  publicationBatchId: ID;
  publishedResultSnapshotId: ID;
  calculationRunId: ID;
  studentId: ID;
  enrollmentId: ID;
  templateId: ID;
  reportCardNumber: string;
  version: number;
  versionReference: ReportCardVersionReference;
  status: ReportCardStatus;
  schoolSnapshot: ReportCardSchoolSnapshot;
  branchSnapshot: ReportCardBranchSnapshot;
  examSnapshot: ReportCardExamSnapshot;
  studentSnapshot: ReportCardStudentSnapshot;
  subjectResults: ReportCardSubjectResultSnapshot[];
  overallResult: ReportCardOverallResultSnapshot;
  gradingSchemeSnapshot: ReportCardGradingSchemeSnapshot;
  templateSnapshot: ReportCardTemplateSnapshot;
  generatedByUserId: ID;
  generatedByName: string;
  generatedAt: string;
  availableAt?: string;
  revokedAt?: string;
  revokedByUserId?: ID;
  revokedByName?: string;
  revocationReason?: string;
  publicationInvalidatedAt?: string;
  documentStatus: ReportCardDocumentStatus;
  documentUrl?: string;
  documentExpiresAt?: string;
  isDevelopmentDocument: boolean;
  generationRunId: ID;
  createdAt: string;
  updatedAt: string;
}

export type ReportCardDetails = ReportCard;
export type ReportCardListItem = ReportCard;

export interface ReportCardGenerationRun {
  id: ID;
  schoolId: ID;
  branchId: ID;
  academicSessionId: ID;
  examId: ID;
  publicationBatchId: ID;
  templateId: ID;
  scope: ReportCardGenerationScope;
  classConfigurationIds: ID[];
  sectionIds: ID[];
  studentIds: ID[];
  totalCandidates: number;
  generatedCount: number;
  existingCount: number;
  skippedCount: number;
  failedCount: number;
  status: ReportCardGenerationRunStatus;
  requestedByUserId: ID;
  requestedByName: string;
  requestedAt: string;
  completedAt?: string;
  createdAt: string;
}
export interface ReportCardGenerationPreviewItem {
  publishedResultSnapshotId: ID;
  studentId: ID;
  studentName: string;
  admissionNumber: string;
  eligible: boolean;
  existingReportCardId?: ID;
  proposedVersion: number;
  reason?: string;
}
export interface ReportCardGenerationWarning {
  code: string;
  message: string;
  studentId?: ID;
}
export interface ReportCardGenerationPreview {
  previewId: ID;
  schoolId: ID;
  examId: ID;
  publicationBatchId: ID;
  templateId: ID;
  scope: ReportCardGenerationScope;
  candidateCount: number;
  eligibleCount: number;
  existingCount: number;
  skippedCount: number;
  errorCount: number;
  items: ReportCardGenerationPreviewItem[];
  warnings: ReportCardGenerationWarning[];
  sourcePublicationUpdatedAt: string;
  expiresAt: string;
  createdAt: string;
}
export interface ReportCardGenerationResultItem {
  studentId: ID;
  publishedResultSnapshotId: ID;
  status: ReportCardGenerationItemStatus;
  reportCardId?: ID;
  reportCardNumber?: string;
  message: string;
}
export interface ReportCardGenerationResult {
  run: ReportCardGenerationRun;
  items: ReportCardGenerationResultItem[];
}
export type ReportCardGenerationHistory =
  PaginatedResponse<ReportCardGenerationRun>;
export interface ReportCardGenerationRunDetails {
  run: ReportCardGenerationRun;
  items: ReportCardGenerationResultItem[];
}
export interface ReportCardDocumentResult {
  reportCardId: ID;
  documentStatus: ReportCardDocumentStatus;
  documentUrl?: string;
  expiresAt?: string;
  filename: string;
  message: string;
  isDevelopmentMock: boolean;
}
export interface ReportCardVisibilityResult {
  visible: boolean;
  reason?: string;
}
export interface ReportCardDashboardSummary {
  publishedStudents: number;
  reportCardsGenerated: number;
  reportCardsAvailable: number;
  missingReportCards: number;
  failedGenerations: number;
  revokedReportCards: number;
  parentNotifications: number;
  studentNotifications: number;
  warnings: ReportCardGenerationWarning[];
}

export interface PublishedResultSummary {
  publishedResultSnapshotId: ID;
  studentId: ID;
  studentName: string;
  academicSessionId: ID;
  academicSessionName: string;
  examId: ID;
  examName: string;
  examTerm: string;
  examType: string;
  className: string;
  sectionName: string;
  percentage: number;
  grade?: string;
  outcome: PublishedOverallResultSnapshot['outcome'];
  rank?: number;
  publishedAt: string;
  reportCardAvailable: boolean;
  reportCardId?: ID;
}
export type ParentPublishedResultSummary = PublishedResultSummary;
export type StudentPublishedResultSummary = PublishedResultSummary;
export interface SelfServiceResultDetails {
  summary: PublishedResultSummary;
  subjectResults: PublishedSubjectResultSnapshot[];
  overallResult: Omit<
    PublishedOverallResultSnapshot,
    'resultStatus' | 'reviewedAt' | 'publishedAt'
  >;
}

export interface ReportCardTemplateListQuery {
  search?: string;
  status?: ReportCardTemplateStatus | 'ALL';
  page?: number;
  pageSize?: number;
}
export type CreateReportCardTemplateInput = Omit<
  ReportCardTemplate,
  'id' | 'schoolId' | 'activeUsageCount' | 'createdAt' | 'updatedAt'
>;
export type UpdateReportCardTemplateInput = CreateReportCardTemplateInput;
export interface PreviewReportCardGenerationInput {
  publicationBatchId: ID;
  templateId: ID;
  scope: ReportCardGenerationScope;
  examClassConfigurationId?: ID;
  sectionId?: ID;
  studentId?: ID;
}
export interface GenerateReportCardsInput
  extends PreviewReportCardGenerationInput {
  previewId: ID;
  requestedByUserId: ID;
  requestedByName: string;
  simulateAtomicFailure?: boolean;
  simulateFailedStudentIds?: ID[];
}
export interface ReportCardGenerationHistoryQuery {
  status?: ReportCardGenerationRunStatus | 'ALL';
  page?: number;
  pageSize?: number;
}
export interface ReportCardListQuery {
  branchId?: ID;
  academicSessionId?: ID;
  examId?: ID;
  className?: string;
  sectionName?: string;
  generationRunId?: ID;
  search?: string;
  status?: ReportCardStatus | 'ALL';
  documentStatus?: ReportCardDocumentStatus | 'ALL';
  page?: number;
  pageSize?: number;
}
export interface RevokeReportCardInput {
  reason: string;
  actingUserId: ID;
  actingUserName: string;
}

export interface ReportCardSnapshotInput {
  id: ID;
  reportCardNumber: string;
  version: number;
  generationRunId: ID;
  publishedResult: PublishedResultSnapshot;
  template: ReportCardTemplate;
  generatedByUserId: ID;
  generatedByName: string;
  generatedAt: string;
  academicSessionName?: string;
  schoolSnapshot: ReportCardSchoolSnapshot;
  branchSnapshot: ReportCardBranchSnapshot;
  gradingSchemeSnapshot: ReportCardGradingSchemeSnapshot;
}
