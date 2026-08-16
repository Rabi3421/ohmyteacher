import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppRole } from '../constants/permissions';
import type { AcademicSessionStatus } from '../models/organization';
import type { ReportExportFormat, ReportType } from '../models/report';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  OtpVerification: undefined;
  ComponentPreview: undefined;
  Placeholder: { title?: string } | undefined;
};

type FeeContextParams = {
  schoolId: string;
  branchId: string;
  academicSessionId: string;
  sessionStatus: AcademicSessionStatus;
};

type CollectionContextParams = FeeContextParams & { asOfDate?: string };

type CommunicationContextParams = {
  schoolId: string;
  branchId?: string;
  academicSessionId?: string;
  sessionStatus?: AcademicSessionStatus;
  asOfDate?: string;
};

type ExaminationContextParams = FeeContextParams;
type MarksResultContextParams = ExaminationContextParams & {
  examId: string;
  examStatus?: import('../models/examination').ExamStatus;
};
type ReportCardContextParams = MarksResultContextParams;
type ReportContextParams = {
  schoolId: string;
  branchIds?: string[];
  academicSessionIds?: string[];
  asOfDate?: string;
};

export type RoleStackParamList = {
  RoleLanding: { role: AppRole };
  AcademicsHub: { role: AppRole };
  FeesHub: { role: AppRole };
  ExamsHub: { role: AppRole };
  MoreMenu: { role: AppRole };
  Profile: { role: AppRole };
  Schools: undefined;
  CreateSchool: undefined;
  SchoolDetails: { schoolId: string };
  EditSchool: { schoolId: string };
  SchoolBranches: { schoolId: string };
  CreateBranch: { schoolId: string };
  EditBranch: { schoolId: string; branchId: string };
  BranchDetails: { schoolId: string; branchId: string };
  AcademicSessions: { schoolId: string };
  AcademicSetup: {
    schoolId: string;
    branchId?: string;
    academicSessionId?: string;
  };
  Classes: {
    schoolId: string;
    branchId: string;
    academicSessionId: string;
  };
  CreateClass: {
    schoolId: string;
    branchId: string;
    academicSessionId: string;
  };
  EditClass: {
    schoolId: string;
    branchId: string;
    academicSessionId: string;
    classId: string;
  };
  ClassDetails: {
    schoolId: string;
    branchId: string;
    academicSessionId: string;
    classId: string;
  };
  Sections: {
    schoolId: string;
    branchId: string;
    academicSessionId: string;
    classId: string;
  };
  CreateSection: {
    schoolId: string;
    branchId: string;
    academicSessionId: string;
    classId: string;
  };
  EditSection: {
    schoolId: string;
    branchId: string;
    academicSessionId: string;
    classId: string;
    sectionId: string;
  };
  Subjects: {
    schoolId: string;
    branchId?: string;
    academicSessionId?: string;
  };
  CreateSubject: { schoolId: string };
  EditSubject: { schoolId: string; subjectId: string };
  SubjectDetails: { schoolId: string; subjectId: string };
  ClassSubjectAssignment: {
    schoolId: string;
    branchId: string;
    academicSessionId: string;
    classId: string;
  };
  Students: { schoolId: string; branchId?: string };
  CreateStudent: { schoolId: string };
  StudentAdmissionReview: { schoolId: string };
  StudentAdmissionSuccess: { schoolId: string };
  StudentDetails: { schoolId: string; studentId: string };
  EditStudent: { schoolId: string; studentId: string };
  StudentGuardians: { schoolId: string; studentId: string };
  CreateGuardian: { schoolId: string; studentId: string };
  EditGuardian: {
    schoolId: string;
    studentId: string;
    guardianId: string;
  };
  StudentEnrollmentHistory: { schoolId: string; studentId: string };
  TransferStudent: { schoolId: string; studentId: string };
  StudentAccess: { schoolId: string; studentId: string };
  ParentChildren: { schoolId: string; parentMembershipId: string };
  ParentChildDetails: {
    schoolId: string;
    parentMembershipId: string;
    studentId: string;
  };
  StudentSelfProfile: {
    schoolId: string;
    studentMembershipId: string;
  };
  FeeSetup: {
    schoolId: string;
    branchId?: string;
    academicSessionId?: string;
    sessionStatus?: AcademicSessionStatus;
  };
  FeeHeads: FeeContextParams;
  CreateFeeHead: FeeContextParams;
  EditFeeHead: FeeContextParams & { feeHeadId: string };
  FeeHeadDetails: FeeContextParams & { feeHeadId: string };
  FeeStructures: FeeContextParams;
  CreateFeeStructure: FeeContextParams;
  EditFeeStructure: FeeContextParams & {
    feeStructureId: string;
  };
  FeeStructureDetails: FeeContextParams & {
    feeStructureId: string;
  };
  FeeStructurePreview: FeeContextParams & {
    feeStructureId: string;
  };
  StudentFeeAssignments: FeeContextParams & {
    classId?: string;
    feeStructureId?: string;
  };
  StudentFeeAssignmentDetails: FeeContextParams & {
    studentId: string;
    enrollmentId: string;
  };
  EditStudentFeeAssignment: FeeContextParams & {
    studentId: string;
    enrollmentId: string;
  };
  DiscountDefinitions: FeeContextParams;
  CreateDiscountDefinition: FeeContextParams;
  EditDiscountDefinition: FeeContextParams & {
    discountId: string;
  };
  FineRules: FeeContextParams;
  CreateFineRule: FeeContextParams;
  EditFineRule: FeeContextParams & { fineRuleId: string };
  StudentPayablePreview: FeeContextParams & {
    studentId: string;
    enrollmentId: string;
  };
  FeeOutstandingDashboard: {
    schoolId: string;
    branchId?: string;
    academicSessionId?: string;
    sessionStatus?: AcademicSessionStatus;
    asOfDate?: string;
  };
  GenerateFeeDues: FeeContextParams;
  FeeGenerationPreview: FeeContextParams;
  FeeGenerationResult: FeeContextParams;
  FeeGenerationHistory: FeeContextParams;
  FeeGenerationRunDetails: FeeContextParams & { generationRunId: string };
  PendingFees: FeeContextParams;
  OverdueFees: FeeContextParams;
  StudentFeeDues: FeeContextParams & { studentId: string };
  FeeDueDetails: FeeContextParams & { feeDueId: string };
  CancelFeeDue: FeeContextParams & { feeDueId: string };
  WaiveFeeDue: FeeContextParams & { feeDueId: string };
  FineAccrualPreview: FeeContextParams & { feeDueId: string };
  ParentFees: { schoolId: string; parentMembershipId: string };
  ParentStudentFeeDetails: {
    schoolId: string;
    parentMembershipId: string;
    studentId: string;
  };
  StudentFees: { schoolId: string; studentMembershipId: string };
  CollectionDashboard: {
    schoolId: string;
    branchId?: string;
    academicSessionId?: string;
    sessionStatus?: AcademicSessionStatus;
    asOfDate?: string;
  };
  CollectPayment: CollectionContextParams & { studentId?: string };
  PaymentDueSelection: CollectionContextParams & { studentId: string };
  PaymentDetailsEntry: CollectionContextParams & { studentId: string };
  PaymentAllocationReview: CollectionContextParams;
  PaymentSuccess: CollectionContextParams;
  Payments: CollectionContextParams;
  PaymentDetails: CollectionContextParams & { paymentId: string };
  ReversePayment: CollectionContextParams & { paymentId: string };
  Receipts: CollectionContextParams;
  ReceiptDetails: CollectionContextParams & { receiptId: string };
  ReceiptPreview: CollectionContextParams & { receiptId: string };
  StudentLedger: CollectionContextParams & { studentId: string };
  StudentAdvanceCredits: CollectionContextParams & { studentId: string };
  ApplyAdvanceCredit: CollectionContextParams & { studentId: string };
  DailyCollection: CollectionContextParams;
  ParentReceipts: {
    schoolId: string;
    parentMembershipId: string;
    studentId?: string;
  };
  ParentReceiptDetails: {
    schoolId: string;
    parentMembershipId: string;
    receiptId: string;
  };
  StudentReceipts: { schoolId: string; studentMembershipId: string };
  StudentReceiptDetails: {
    schoolId: string;
    studentMembershipId: string;
    receiptId: string;
  };
  CommunicationDashboard: CommunicationContextParams;
  CommunicationSettings: { schoolId: string };
  MessageTemplates: { schoolId: string };
  CreateMessageTemplate: { schoolId: string };
  EditMessageTemplate: { schoolId: string; templateId: string };
  MessageTemplateDetails: { schoolId: string; templateId: string };
  MessagePreview: CommunicationContextParams & {
    communicationType?: import('../models/communication').CommunicationType;
    templateId?: string;
    studentId?: string;
    guardianId?: string;
    feeDueIds?: string[];
    paymentId?: string;
    receiptId?: string;
    mode?: 'MANUAL_SHARE' | 'PROVIDER_SEND';
  };
  ManualFeeReminder: CommunicationContextParams & {
    studentId?: string;
    feeDueIds?: string[];
  };
  BulkReminderSetup: CommunicationContextParams;
  BulkReminderPreview: CommunicationContextParams;
  ReminderRules: CommunicationContextParams;
  CreateReminderRule: CommunicationContextParams;
  EditReminderRule: CommunicationContextParams & { reminderRuleId: string };
  ScheduledReminders: CommunicationContextParams;
  ScheduledReminderDetails: CommunicationContextParams & {
    scheduledReminderId: string;
  };
  CommunicationHistory: CommunicationContextParams & {
    studentId?: string;
    feeDueId?: string;
    paymentId?: string;
    receiptId?: string;
  };
  CommunicationDetails: CommunicationContextParams & {
    communicationId: string;
  };
  FailedCommunications: CommunicationContextParams;
  RetryCommunication: CommunicationContextParams & {
    communicationId: string;
  };
  NotificationCenter: CommunicationContextParams;
  NotificationDetails: CommunicationContextParams & {
    notificationId: string;
  };
  ParentNotifications: { schoolId: string; parentMembershipId: string };
  ParentNotificationDetails: {
    schoolId: string;
    parentMembershipId: string;
    notificationId: string;
  };
  StudentNotifications: { schoolId: string; studentMembershipId: string };
  StudentNotificationDetails: {
    schoolId: string;
    studentMembershipId: string;
    notificationId: string;
  };
  ExaminationSetup: ExaminationContextParams;
  ExamTerms: ExaminationContextParams;
  CreateExamTerm: ExaminationContextParams;
  EditExamTerm: ExaminationContextParams & { termId: string };
  ExamTypes: ExaminationContextParams;
  CreateExamType: ExaminationContextParams;
  EditExamType: ExaminationContextParams & { examTypeId: string };
  ExamTypeDetails: ExaminationContextParams & { examTypeId: string };
  GradingSchemes: ExaminationContextParams;
  CreateGradingScheme: ExaminationContextParams;
  EditGradingScheme: ExaminationContextParams & { gradingSchemeId: string };
  GradingSchemeDetails: ExaminationContextParams & { gradingSchemeId: string };
  Exams: ExaminationContextParams;
  CreateExam: ExaminationContextParams;
  EditExam: ExaminationContextParams & { examId: string };
  ExamDetails: ExaminationContextParams & { examId: string };
  ExamClassConfigurations: ExaminationContextParams & { examId: string };
  ExamClassConfiguration: ExaminationContextParams & {
    examId: string;
    examClassConfigurationId?: string;
  };
  ExamSubjectPapers: ExaminationContextParams & {
    examId: string;
    examClassConfigurationId: string;
  };
  ExamSubjectPaper: ExaminationContextParams & {
    examId: string;
    examClassConfigurationId: string;
    subjectPaperId?: string;
  };
  ExamSchedule: ExaminationContextParams & { examId: string };
  ExamSchedulePreview: ExaminationContextParams & { examId: string };
  ExamSetupReview: ExaminationContextParams & { examId: string };
  CopyExam: ExaminationContextParams & { examId: string };
  CancelExam: ExaminationContextParams & { examId: string };
  MarksDashboard: MarksResultContextParams;
  MarkSheets: MarksResultContextParams;
  MarkSheetDetails: MarksResultContextParams & { markSheetId: string };
  MarksEntry: MarksResultContextParams & { markSheetId: string };
  MarksEntryReview: MarksResultContextParams & { markSheetId: string };
  SubmitMarkSheet: MarksResultContextParams & { markSheetId: string };
  LockMarkSheet: MarksResultContextParams & { markSheetId: string };
  UnlockMarkSheet: MarksResultContextParams & { markSheetId: string };
  MarkSheetHistory: MarksResultContextParams & { markSheetId: string };
  ResultProcessingDashboard: MarksResultContextParams;
  CalculateResults: MarksResultContextParams;
  ResultCalculationPreview: MarksResultContextParams;
  ResultCalculationResult: MarksResultContextParams & {
    calculationRunId?: string;
  };
  ClassResults: MarksResultContextParams & { examClassConfigurationId: string };
  SectionResults: MarksResultContextParams & {
    examClassConfigurationId: string;
    sectionId: string;
  };
  StudentResultDetails: MarksResultContextParams & { studentId: string };
  ResultReview: MarksResultContextParams & {
    examClassConfigurationId: string;
    sectionId?: string;
    calculationRunId: string;
  };
  PublishResults: MarksResultContextParams & {
    examClassConfigurationId?: string;
    sectionId?: string;
    calculationRunId: string;
  };
  UnpublishResults: MarksResultContextParams & { publicationBatchId: string };
  ResultPublicationHistory: MarksResultContextParams;
  RankList: MarksResultContextParams & {
    examClassConfigurationId: string;
    sectionId?: string;
  };
  ReportCardDashboard: ReportCardContextParams;
  ReportCardTemplates: { schoolId: string };
  CreateReportCardTemplate: { schoolId: string };
  EditReportCardTemplate: { schoolId: string; templateId: string };
  ReportCardTemplateDetails: { schoolId: string; templateId: string };
  ReportCardTemplatePreview: { schoolId: string; templateId?: string };
  GenerateReportCards: ReportCardContextParams;
  ReportCardGenerationPreview: ReportCardContextParams;
  ReportCardGenerationResult: ReportCardContextParams;
  ReportCardGenerationHistory: ReportCardContextParams;
  ReportCardGenerationRunDetails: ReportCardContextParams & {
    generationRunId: string;
  };
  ReportCards: ReportCardContextParams;
  ReportCardDetails: ReportCardContextParams & { reportCardId: string };
  ReportCardPreview: ReportCardContextParams & { reportCardId: string };
  RevokeReportCard: ReportCardContextParams & { reportCardId: string };
  ParentResults: {
    schoolId: string;
    parentMembershipId: string;
    studentId?: string;
  };
  ParentStudentResultDetails: {
    schoolId: string;
    parentMembershipId: string;
    publishedResultSnapshotId: string;
  };
  ParentReportCards: {
    schoolId: string;
    parentMembershipId: string;
    studentId?: string;
  };
  ParentReportCardDetails: {
    schoolId: string;
    parentMembershipId: string;
    reportCardId: string;
  };
  StudentResults: { schoolId: string; studentMembershipId: string };
  StudentSelfResultDetails: {
    schoolId: string;
    studentMembershipId: string;
    publishedResultSnapshotId: string;
  };
  StudentReportCards: { schoolId: string; studentMembershipId: string };
  StudentReportCardDetails: {
    schoolId: string;
    studentMembershipId: string;
    reportCardId: string;
  };
  ResultCommunication: ReportCardContextParams & {
    publishedResultSnapshotId?: string;
    reportCardId?: string;
  };
  ExaminationCommunicationHistory: ReportCardContextParams & {
    publishedResultSnapshotId?: string;
    reportCardId?: string;
  };
  ReportsDashboard: ReportContextParams;
  ReportCatalog: ReportContextParams;
  ReportViewer: ReportContextParams & { reportType: ReportType };
  ReportFilters: ReportContextParams & { reportType: ReportType };
  SavedReportFilters: ReportContextParams & { reportType?: ReportType };
  FeeAnalyticsDashboard: ReportContextParams;
  OutstandingReport: ReportContextParams;
  FeeHeadReport: ReportContextParams;
  ClassFeeReport: ReportContextParams;
  DiscountExemptionReport: ReportContextParams;
  FineWaiverReport: ReportContextParams;
  AdvanceCreditReport: ReportContextParams;
  PaymentReversalReport: ReportContextParams;
  CollectionAnalyticsDashboard: ReportContextParams;
  DailyCollectionReport: ReportContextParams;
  PaymentModeReport: ReportContextParams;
  CollectorPerformanceReport: ReportContextParams;
  ReceiptReport: ReportContextParams;
  ExaminationAnalyticsDashboard: ReportContextParams;
  MarksCompletionReport: ReportContextParams;
  PassFailReport: ReportContextParams;
  GradeDistributionReport: ReportContextParams;
  SubjectPerformanceReport: ReportContextParams;
  ClassSectionPerformanceReport: ReportContextParams;
  RankReport: ReportContextParams;
  ResultPublicationReport: ReportContextParams;
  ReportCardGenerationReport: ReportContextParams;
  ExportCenter: ReportContextParams;
  ExportPreview: ReportContextParams & {
    reportType: ReportType;
    format?: ReportExportFormat;
  };
  ExportHistory: ReportContextParams;
  ExportJobDetails: ReportContextParams & { exportJobId: string };
  CreateAcademicSession: { schoolId: string };
  EditAcademicSession: { schoolId: string; sessionId: string };
  SchoolSettings: { schoolId: string };
  OrganizationSetupSuccess: { schoolId: string };
  StaffUsers: { schoolId: string };
  CreateStaffUser: { schoolId: string };
  StaffUserDetails: { schoolId: string; membershipId: string };
  EditStaffUser: { schoolId: string; membershipId: string };
  AssignBranches: { schoolId: string; membershipId: string };
  ChangeUserRole: { schoolId: string; membershipId: string };
  RoleList: { schoolId: string };
  RoleDetails: { schoolId: string; role: AppRole };
  RolePermissions: { schoolId: string; role: AppRole };
  UserActivity: { schoolId: string; membershipId: string };
  ActiveSessions: { schoolId: string; membershipId: string };
};

export type AppNavigationParamList = AuthStackParamList & RoleStackParamList;

export type AuthScreenProps<RouteName extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, RouteName>;

export type RoleScreenProps<RouteName extends keyof RoleStackParamList> =
  NativeStackScreenProps<RoleStackParamList, RouteName>;

// Kept as a compatibility alias for existing development-screen imports.
export type RootStackParamList = AuthStackParamList;
export type RootScreenProps<RouteName extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, RouteName>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends AppNavigationParamList {}
  }
}
