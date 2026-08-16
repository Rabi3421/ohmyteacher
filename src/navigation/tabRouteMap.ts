import type { AppTabId } from '../components/layout/AppBottomTabBar';

const FEE_ROUTES = new Set([
  'FeesHub', 'FeeOutstandingDashboard', 'GenerateFeeDues',
  'FeeGenerationPreview', 'FeeGenerationResult', 'FeeGenerationHistory',
  'FeeGenerationRunDetails', 'PendingFees', 'OverdueFees', 'StudentFeeDues',
  'FeeDueDetails', 'CancelFeeDue', 'WaiveFeeDue', 'FineAccrualPreview',
  'ParentFees', 'ParentStudentFeeDetails', 'StudentFees',
  'CollectionDashboard', 'CollectPayment', 'PaymentDueSelection',
  'PaymentDetailsEntry', 'PaymentAllocationReview', 'PaymentSuccess',
  'Payments', 'PaymentDetails', 'ReversePayment',
  'Receipts', 'ReceiptDetails', 'ReceiptPreview',
  'StudentLedger', 'StudentAdvanceCredits', 'ApplyAdvanceCredit',
  'DailyCollection', 'ParentReceipts', 'ParentReceiptDetails',
  'StudentReceipts', 'StudentReceiptDetails',
  'FeeSetup', 'FeeHeads', 'CreateFeeHead', 'EditFeeHead', 'FeeHeadDetails',
  'FeeStructures', 'CreateFeeStructure', 'EditFeeStructure',
  'FeeStructureDetails', 'FeeStructurePreview',
  'StudentFeeAssignments', 'StudentFeeAssignmentDetails', 'EditStudentFeeAssignment',
  'DiscountDefinitions', 'CreateDiscountDefinition', 'EditDiscountDefinition',
  'FineRules', 'CreateFineRule', 'EditFineRule', 'StudentPayablePreview',
]);

const EXAM_ROUTES = new Set([
  'ExamsHub', 'ExaminationSetup', 'ExamTerms', 'CreateExamTerm', 'EditExamTerm',
  'ExamTypes', 'CreateExamType', 'EditExamType', 'ExamTypeDetails',
  'GradingSchemes', 'CreateGradingScheme', 'EditGradingScheme', 'GradingSchemeDetails',
  'Exams', 'CreateExam', 'EditExam', 'ExamDetails',
  'ExamClassConfigurations', 'ExamClassConfiguration',
  'ExamSubjectPapers', 'ExamSubjectPaper',
  'ExamSchedule', 'ExamSchedulePreview', 'ExamSetupReview',
  'CopyExam', 'CancelExam',
  'MarksDashboard', 'MarkSheets', 'MarkSheetDetails', 'MarksEntry',
  'MarksEntryReview', 'SubmitMarkSheet', 'LockMarkSheet', 'UnlockMarkSheet',
  'MarkSheetHistory', 'ResultProcessingDashboard', 'CalculateResults',
  'ResultCalculationPreview', 'ResultCalculationResult',
  'ClassResults', 'SectionResults', 'StudentResultDetails',
  'ResultReview', 'PublishResults', 'UnpublishResults', 'ResultPublicationHistory',
  'RankList', 'ReportCardDashboard', 'GenerateReportCards',
  'ReportCardGenerationPreview', 'ReportCardGenerationResult',
  'ReportCardGenerationHistory', 'ReportCardGenerationRunDetails',
  'ReportCards', 'ReportCardDetails', 'ReportCardPreview', 'RevokeReportCard',
  'ReportCardTemplates', 'CreateReportCardTemplate', 'EditReportCardTemplate',
  'ReportCardTemplateDetails', 'ReportCardTemplatePreview',
  'ParentResults', 'ParentStudentResultDetails',
  'ParentReportCards', 'ParentReportCardDetails',
  'StudentResults', 'StudentSelfResultDetails',
  'StudentReportCards', 'StudentReportCardDetails',
  'ResultCommunication', 'ExaminationCommunicationHistory',
]);

const ACADEMICS_ROUTES = new Set([
  'AcademicsHub', 'Students', 'CreateStudent', 'StudentAdmissionReview',
  'StudentAdmissionSuccess', 'StudentDetails', 'EditStudent',
  'StudentGuardians', 'CreateGuardian', 'EditGuardian',
  'StudentEnrollmentHistory', 'TransferStudent', 'StudentAccess',
  'ParentChildren', 'ParentChildDetails', 'StudentSelfProfile',
  'AcademicSetup', 'Classes', 'CreateClass', 'EditClass', 'ClassDetails',
  'Sections', 'CreateSection', 'EditSection',
  'Subjects', 'CreateSubject', 'EditSubject', 'SubjectDetails',
  'ClassSubjectAssignment',
  'StaffUsers', 'CreateStaffUser', 'EditStaffUser', 'StaffUserDetails',
  'AssignBranches', 'ChangeUserRole', 'RoleList', 'RoleDetails', 'RolePermissions',
  'UserActivity', 'ActiveSessions',
]);

const MORE_ROUTES = new Set([
  'MoreMenu', 'Profile',
  'Schools', 'CreateSchool', 'SchoolDetails', 'EditSchool',
  'SchoolBranches', 'CreateBranch', 'EditBranch', 'BranchDetails',
  'AcademicSessions', 'CreateAcademicSession', 'EditAcademicSession',
  'SchoolSettings', 'OrganizationSetupSuccess',
  'ReportsDashboard', 'ReportCatalog', 'ReportViewer', 'ReportFilters',
  'SavedReportFilters', 'FeeAnalyticsDashboard', 'OutstandingReport',
  'FeeHeadReport', 'ClassFeeReport', 'DiscountExemptionReport',
  'FineWaiverReport', 'AdvanceCreditReport', 'PaymentReversalReport',
  'CollectionAnalyticsDashboard', 'DailyCollectionReport', 'PaymentModeReport',
  'CollectorPerformanceReport', 'ReceiptReport',
  'ExaminationAnalyticsDashboard', 'MarksCompletionReport',
  'PassFailReport', 'GradeDistributionReport', 'SubjectPerformanceReport',
  'ClassSectionPerformanceReport', 'RankReport', 'ResultPublicationReport',
  'ReportCardGenerationReport', 'ExportCenter', 'ExportPreview',
  'ExportHistory', 'ExportJobDetails',
  'CommunicationDashboard', 'CommunicationSettings',
  'MessageTemplates', 'CreateMessageTemplate', 'EditMessageTemplate',
  'MessageTemplateDetails', 'MessagePreview', 'ManualFeeReminder',
  'BulkReminderSetup', 'BulkReminderPreview', 'ReminderRules',
  'CreateReminderRule', 'EditReminderRule', 'ScheduledReminders',
  'ScheduledReminderDetails', 'CommunicationHistory', 'CommunicationDetails',
  'FailedCommunications', 'RetryCommunication', 'NotificationCenter',
  'NotificationDetails', 'ParentNotifications', 'ParentNotificationDetails',
  'StudentNotifications', 'StudentNotificationDetails',
]);

export function getActiveTab(routeName: string): AppTabId {
  if (FEE_ROUTES.has(routeName)) return 'fees';
  if (EXAM_ROUTES.has(routeName)) return 'exams';
  if (ACADEMICS_ROUTES.has(routeName)) return 'academics';
  if (MORE_ROUTES.has(routeName)) return 'more';
  return 'home';
}
