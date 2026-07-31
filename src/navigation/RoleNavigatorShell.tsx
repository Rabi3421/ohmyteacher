import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ROUTES } from '../constants/routes';
import type { AppRole } from '../constants/permissions';
import {
  ApplyAdvanceCreditScreen,
  CollectionDashboardScreen,
  CollectPaymentScreen,
  DailyCollectionScreen,
  ParentReceiptDetailsScreen,
  ParentReceiptsScreen,
  PaymentAllocationReviewScreen,
  PaymentDetailsEntryScreen,
  PaymentDetailsScreen,
  PaymentDueSelectionScreen,
  PaymentSuccessScreen,
  PaymentsScreen,
  ReceiptDetailsScreen,
  ReceiptPreviewScreen,
  ReceiptsScreen,
  ReversePaymentScreen,
  StudentAdvanceCreditsScreen,
  StudentLedgerScreen,
  StudentReceiptDetailsScreen,
  StudentReceiptsScreen,
} from '../screens/collection/CollectionScreens';
import {
  BulkReminderPreviewScreen,
  BulkReminderSetupScreen,
  CommunicationDashboardScreen,
  CommunicationDetailsScreen,
  CommunicationHistoryScreen,
  CommunicationSettingsScreen,
  CreateMessageTemplateScreen,
  CreateReminderRuleScreen,
  EditMessageTemplateScreen,
  EditReminderRuleScreen,
  FailedCommunicationsScreen,
  ManualFeeReminderScreen,
  MessagePreviewScreen,
  MessageTemplateDetailsScreen,
  MessageTemplatesScreen,
  NotificationCenterScreen,
  NotificationDetailsScreen,
  ParentNotificationDetailsScreen,
  ParentNotificationsScreen,
  ReminderRulesScreen,
  RetryCommunicationScreen,
  ScheduledReminderDetailsScreen,
  ScheduledRemindersScreen,
  StudentNotificationDetailsScreen,
  StudentNotificationsScreen,
} from '../screens/communication/CommunicationScreens';
import {
  CancelExamScreen,
  CopyExamScreen,
  CreateExamScreen,
  CreateExamTermScreen,
  CreateExamTypeScreen,
  CreateGradingSchemeScreen,
  EditExamScreen,
  EditExamTermScreen,
  EditExamTypeScreen,
  EditGradingSchemeScreen,
  ExamClassConfigurationScreen,
  ExamClassConfigurationsScreen,
  ExamDetailsScreen,
  ExaminationSetupScreen,
  ExamSchedulePreviewScreen,
  ExamScheduleScreen,
  ExamSetupReviewScreen,
  ExamSubjectPaperScreen,
  ExamSubjectPapersScreen,
  ExamsScreen,
  ExamTermsScreen,
  ExamTypeDetailsScreen,
  ExamTypesScreen,
  GradingSchemeDetailsScreen,
  GradingSchemesScreen,
} from '../screens/examination/ExaminationScreens';
import { AcademicSetupScreen } from '../screens/academic/AcademicSetupScreen';
import { ClassesScreen } from '../screens/academic/ClassesScreen';
import { ClassDetailsScreen } from '../screens/academic/ClassDetailsScreen';
import { ClassSubjectAssignmentScreen } from '../screens/academic/ClassSubjectAssignmentScreen';
import { CreateClassScreen } from '../screens/academic/CreateClassScreen';
import { CreateSectionScreen } from '../screens/academic/CreateSectionScreen';
import { CreateSubjectScreen } from '../screens/academic/CreateSubjectScreen';
import { EditClassScreen } from '../screens/academic/EditClassScreen';
import { EditSectionScreen } from '../screens/academic/EditSectionScreen';
import { EditSubjectScreen } from '../screens/academic/EditSubjectScreen';
import { SectionsScreen } from '../screens/academic/SectionsScreen';
import { SubjectDetailsScreen } from '../screens/academic/SubjectDetailsScreen';
import { SubjectsScreen } from '../screens/academic/SubjectsScreen';
import { AcademicSessionsScreen } from '../screens/organization/AcademicSessionsScreen';
import { BranchDetailsScreen } from '../screens/organization/BranchDetailsScreen';
import { CreateAcademicSessionScreen } from '../screens/organization/CreateAcademicSessionScreen';
import { CreateBranchScreen } from '../screens/organization/CreateBranchScreen';
import { CreateSchoolScreen } from '../screens/organization/CreateSchoolScreen';
import { EditAcademicSessionScreen } from '../screens/organization/EditAcademicSessionScreen';
import { EditBranchScreen } from '../screens/organization/EditBranchScreen';
import { EditSchoolScreen } from '../screens/organization/EditSchoolScreen';
import { OrganizationSetupSuccessScreen } from '../screens/organization/OrganizationSetupSuccessScreen';
import { SchoolBranchesScreen } from '../screens/organization/SchoolBranchesScreen';
import { SchoolDetailsScreen } from '../screens/organization/SchoolDetailsScreen';
import { SchoolSettingsScreen } from '../screens/organization/SchoolSettingsScreen';
import { SuperAdminSchoolsScreen } from '../screens/organization/SuperAdminSchoolsScreen';
import { RoleLandingScreen } from '../screens/role/RoleLandingScreen';
import { CreateDiscountDefinitionScreen } from '../screens/feeSetup/CreateDiscountDefinitionScreen';
import { CreateFeeHeadScreen } from '../screens/feeSetup/CreateFeeHeadScreen';
import { CreateFeeStructureScreen } from '../screens/feeSetup/CreateFeeStructureScreen';
import { CreateFineRuleScreen } from '../screens/feeSetup/CreateFineRuleScreen';
import { DiscountDefinitionsScreen } from '../screens/feeSetup/DiscountDefinitionsScreen';
import { EditDiscountDefinitionScreen } from '../screens/feeSetup/EditDiscountDefinitionScreen';
import { EditFeeHeadScreen } from '../screens/feeSetup/EditFeeHeadScreen';
import { EditFeeStructureScreen } from '../screens/feeSetup/EditFeeStructureScreen';
import { EditFineRuleScreen } from '../screens/feeSetup/EditFineRuleScreen';
import { FeeHeadDetailsScreen } from '../screens/feeSetup/FeeHeadDetailsScreen';
import { FeeHeadsScreen } from '../screens/feeSetup/FeeHeadsScreen';
import { FeeSetupScreen } from '../screens/feeSetup/FeeSetupScreen';
import { FeeStructureDetailsScreen } from '../screens/feeSetup/FeeStructureDetailsScreen';
import { FeeStructurePreviewScreen } from '../screens/feeSetup/FeeStructurePreviewScreen';
import { FeeStructuresScreen } from '../screens/feeSetup/FeeStructuresScreen';
import { FineRulesScreen } from '../screens/feeSetup/FineRulesScreen';
import { StudentFeeAssignmentDetailsScreen } from '../screens/feeSetup/StudentFeeAssignmentDetailsScreen';
import { StudentFeeAssignmentsScreen } from '../screens/feeSetup/StudentFeeAssignmentsScreen';
import { EditStudentFeeAssignmentScreen } from '../screens/feeSetup/EditStudentFeeAssignmentScreen';
import { StudentPayablePreviewScreen } from '../screens/feeSetup/StudentPayablePreviewScreen';
import { CancelFeeDueScreen } from '../screens/feeDue/CancelFeeDueScreen';
import { FeeDueDetailsScreen } from '../screens/feeDue/FeeDueDetailsScreen';
import { FeeGenerationHistoryScreen } from '../screens/feeDue/FeeGenerationHistoryScreen';
import { FeeGenerationPreviewScreen } from '../screens/feeDue/FeeGenerationPreviewScreen';
import { FeeGenerationResultScreen } from '../screens/feeDue/FeeGenerationResultScreen';
import { FeeGenerationRunDetailsScreen } from '../screens/feeDue/FeeGenerationRunDetailsScreen';
import { FeeOutstandingDashboardScreen } from '../screens/feeDue/FeeOutstandingDashboardScreen';
import { FineAccrualPreviewScreen } from '../screens/feeDue/FineAccrualPreviewScreen';
import { GenerateFeeDuesScreen } from '../screens/feeDue/GenerateFeeDuesScreen';
import { OverdueFeesScreen } from '../screens/feeDue/OverdueFeesScreen';
import { ParentFeesScreen } from '../screens/feeDue/ParentFeesScreen';
import { ParentStudentFeeDetailsScreen } from '../screens/feeDue/ParentStudentFeeDetailsScreen';
import { PendingFeesScreen } from '../screens/feeDue/PendingFeesScreen';
import { StudentFeeDuesScreen } from '../screens/feeDue/StudentFeeDuesScreen';
import { StudentFeesScreen } from '../screens/feeDue/StudentFeesScreen';
import { WaiveFeeDueScreen } from '../screens/feeDue/WaiveFeeDueScreen';
import { CreateGuardianScreen } from '../screens/student/CreateGuardianScreen';
import { CreateStudentScreen } from '../screens/student/CreateStudentScreen';
import { EditGuardianScreen } from '../screens/student/EditGuardianScreen';
import { EditStudentScreen } from '../screens/student/EditStudentScreen';
import { ParentChildDetailsScreen } from '../screens/student/ParentChildDetailsScreen';
import { ParentChildrenScreen } from '../screens/student/ParentChildrenScreen';
import { StudentAccessScreen } from '../screens/student/StudentAccessScreen';
import { StudentAdmissionReviewScreen } from '../screens/student/StudentAdmissionReviewScreen';
import { StudentAdmissionSuccessScreen } from '../screens/student/StudentAdmissionSuccessScreen';
import { StudentDetailsScreen } from '../screens/student/StudentDetailsScreen';
import { StudentEnrollmentHistoryScreen } from '../screens/student/StudentEnrollmentHistoryScreen';
import { StudentGuardiansScreen } from '../screens/student/StudentGuardiansScreen';
import { StudentSelfProfileScreen } from '../screens/student/StudentSelfProfileScreen';
import { StudentsScreen } from '../screens/student/StudentsScreen';
import { TransferStudentScreen } from '../screens/student/TransferStudentScreen';
import { ActiveSessionsScreen } from '../screens/userManagement/ActiveSessionsScreen';
import { AssignBranchesScreen } from '../screens/userManagement/AssignBranchesScreen';
import { ChangeUserRoleScreen } from '../screens/userManagement/ChangeUserRoleScreen';
import { CreateStaffUserScreen } from '../screens/userManagement/CreateStaffUserScreen';
import { EditStaffUserScreen } from '../screens/userManagement/EditStaffUserScreen';
import { RoleDetailsScreen } from '../screens/userManagement/RoleDetailsScreen';
import { RoleListScreen } from '../screens/userManagement/RoleListScreen';
import { RolePermissionsScreen } from '../screens/userManagement/RolePermissionsScreen';
import { StaffUserDetailsScreen } from '../screens/userManagement/StaffUserDetailsScreen';
import { StaffUsersScreen } from '../screens/userManagement/StaffUsersScreen';
import { UserActivityScreen } from '../screens/userManagement/UserActivityScreen';
import type { RoleStackParamList } from './navigationTypes';
import {
  CalculateResultsScreen,
  ClassResultsScreen,
  LockMarkSheetScreen,
  MarkSheetDetailsScreen,
  MarkSheetHistoryScreen,
  MarkSheetsScreen,
  MarksDashboardScreen,
  MarksEntryReviewScreen,
  MarksEntryScreen,
  PublishResultsScreen,
  RankListScreen,
  ResultCalculationPreviewScreen,
  ResultCalculationResultScreen,
  ResultProcessingDashboardScreen,
  ResultPublicationHistoryScreen,
  ResultReviewScreen,
  SectionResultsScreen,
  StudentResultDetailsScreen,
  SubmitMarkSheetScreen,
  UnlockMarkSheetScreen,
  UnpublishResultsScreen,
} from '../screens/marksResult/MarksResultScreens';
import {
  CreateReportCardTemplateScreen,
  EditReportCardTemplateScreen,
  ExaminationCommunicationHistoryScreen,
  GenerateReportCardsScreen,
  ParentReportCardDetailsScreen,
  ParentReportCardsScreen,
  ParentResultsScreen,
  ParentStudentResultDetailsScreen,
  ReportCardDashboardScreen,
  ReportCardDetailsScreen,
  ReportCardGenerationHistoryScreen,
  ReportCardGenerationPreviewScreen,
  ReportCardGenerationResultScreen,
  ReportCardGenerationRunDetailsScreen,
  ReportCardPreviewScreen,
  ReportCardsScreen,
  ReportCardTemplateDetailsScreen,
  ReportCardTemplatePreviewScreen,
  ReportCardTemplatesScreen,
  ResultCommunicationScreen,
  RevokeReportCardScreen,
  StudentReportCardDetailsScreen,
  StudentReportCardsScreen,
  StudentResultDetailsScreen as StudentSelfResultDetailsScreen,
  StudentResultsScreen,
} from '../screens/reportCard/ReportCardScreens';
import {
  AdvanceCreditReportScreen,
  ClassFeeReportScreen,
  ClassSectionPerformanceReportScreen,
  CollectionAnalyticsDashboardScreen,
  CollectorPerformanceReportScreen,
  DailyCollectionReportScreen,
  DiscountExemptionReportScreen,
  ExaminationAnalyticsDashboardScreen,
  ExportCenterScreen,
  ExportHistoryScreen,
  ExportJobDetailsScreen,
  ExportPreviewScreen,
  FeeAnalyticsDashboardScreen,
  FeeHeadReportScreen,
  FineWaiverReportScreen,
  GradeDistributionReportScreen,
  MarksCompletionReportScreen,
  OutstandingReportScreen,
  PassFailReportScreen,
  PaymentModeReportScreen,
  PaymentReversalReportScreen,
  RankReportScreen,
  ReceiptReportScreen,
  ReportCardGenerationReportScreen,
  ReportCatalogScreen,
  ReportFiltersScreen,
  ReportsDashboardScreen,
  ReportViewerScreen,
  ResultPublicationReportScreen,
  SavedReportFiltersScreen,
  SubjectPerformanceReportScreen,
} from '../screens/report/ReportScreens';
import { useUserManagementStore } from '../store';
import { getEffectivePermissions } from '../utils/effectivePermissions';

const Stack = createNativeStackNavigator<RoleStackParamList>();

export interface RoleNavigatorShellProps {
  role: AppRole;
}

export function RoleNavigatorShell({ role }: RoleNavigatorShellProps) {
  const roleConfiguration = useUserManagementStore(
    state => state.roleConfiguration,
  );
  const reportPermissions = getEffectivePermissions(
    role,
    roleConfiguration?.role === role ? roleConfiguration : null,
  );
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const canManageSchool = role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN';
  const canViewOrganization = canManageSchool || role === 'BRANCH_ADMIN';
  const canViewStaff = canViewOrganization;
  const canManageStaff = isSuperAdmin || role === 'SCHOOL_ADMIN';
  const canManageSchoolStaff = role === 'SCHOOL_ADMIN';
  const isStaff = [
    'SUPER_ADMIN',
    'SCHOOL_ADMIN',
    'BRANCH_ADMIN',
    'ACCOUNTANT',
    'RECEPTIONIST',
  ].includes(role);
  const canViewFeeSetup = [
    'SUPER_ADMIN',
    'SCHOOL_ADMIN',
    'BRANCH_ADMIN',
    'ACCOUNTANT',
  ].includes(role);
  const canOperateFeeDues = [
    'SUPER_ADMIN',
    'SCHOOL_ADMIN',
    'BRANCH_ADMIN',
    'ACCOUNTANT',
  ].includes(role);
  const canViewExaminationSetup = [
    'SUPER_ADMIN',
    'SCHOOL_ADMIN',
    'BRANCH_ADMIN',
  ].includes(role);
  const canManageReportCardTemplates = ['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(
    role,
  );
  const canViewReports = reportPermissions.includes('reports.dashboard.view');
  const canViewFeeReports = reportPermissions.includes('fee_reports.view');
  const canViewCollectionReports = reportPermissions.includes(
    'reports.collections.view',
  );
  const canViewExamReports = reportPermissions.includes('exam_reports.view');
  const canManageSavedFilters = reportPermissions.includes(
    'reports.saved_filters.manage',
  );
  const canViewExports = reportPermissions.includes(
    'reports.export_history.view',
  );

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        component={RoleLandingScreen}
        initialParams={{ role }}
        name={ROUTES.ROLE_LANDING}
      />
      {canViewReports ? (
        <>
          <Stack.Screen
            component={ReportsDashboardScreen}
            name={ROUTES.REPORTS_DASHBOARD}
          />
          <Stack.Screen
            component={ReportCatalogScreen}
            name={ROUTES.REPORT_CATALOG}
          />
          <Stack.Screen
            component={ReportViewerScreen}
            name={ROUTES.REPORT_VIEWER}
          />
          <Stack.Screen
            component={ReportFiltersScreen}
            name={ROUTES.REPORT_FILTERS}
          />
        </>
      ) : null}
      {canManageSavedFilters ? (
        <Stack.Screen
          component={SavedReportFiltersScreen}
          name={ROUTES.SAVED_REPORT_FILTERS}
        />
      ) : null}
      {canViewFeeReports ? (
        <>
          <Stack.Screen
            component={FeeAnalyticsDashboardScreen}
            name={ROUTES.FEE_ANALYTICS_DASHBOARD}
          />
          <Stack.Screen
            component={OutstandingReportScreen}
            name={ROUTES.OUTSTANDING_REPORT}
          />
          <Stack.Screen
            component={FeeHeadReportScreen}
            name={ROUTES.FEE_HEAD_REPORT}
          />
          <Stack.Screen
            component={ClassFeeReportScreen}
            name={ROUTES.CLASS_FEE_REPORT}
          />
          <Stack.Screen
            component={DiscountExemptionReportScreen}
            name={ROUTES.DISCOUNT_EXEMPTION_REPORT}
          />
          <Stack.Screen
            component={FineWaiverReportScreen}
            name={ROUTES.FINE_WAIVER_REPORT}
          />
          <Stack.Screen
            component={AdvanceCreditReportScreen}
            name={ROUTES.ADVANCE_CREDIT_REPORT}
          />
          <Stack.Screen
            component={PaymentReversalReportScreen}
            name={ROUTES.PAYMENT_REVERSAL_REPORT}
          />
        </>
      ) : null}
      {canViewCollectionReports ? (
        <>
          <Stack.Screen
            component={CollectionAnalyticsDashboardScreen}
            name={ROUTES.COLLECTION_ANALYTICS_DASHBOARD}
          />
          <Stack.Screen
            component={DailyCollectionReportScreen}
            name={ROUTES.DAILY_COLLECTION_REPORT}
          />
          <Stack.Screen
            component={PaymentModeReportScreen}
            name={ROUTES.PAYMENT_MODE_REPORT}
          />
          <Stack.Screen
            component={CollectorPerformanceReportScreen}
            name={ROUTES.COLLECTOR_PERFORMANCE_REPORT}
          />
          <Stack.Screen
            component={ReceiptReportScreen}
            name={ROUTES.RECEIPT_REPORT}
          />
        </>
      ) : null}
      {canViewExamReports ? (
        <>
          <Stack.Screen
            component={ExaminationAnalyticsDashboardScreen}
            name={ROUTES.EXAMINATION_ANALYTICS_DASHBOARD}
          />
          <Stack.Screen
            component={MarksCompletionReportScreen}
            name={ROUTES.MARKS_COMPLETION_REPORT}
          />
          <Stack.Screen
            component={PassFailReportScreen}
            name={ROUTES.PASS_FAIL_REPORT}
          />
          <Stack.Screen
            component={GradeDistributionReportScreen}
            name={ROUTES.GRADE_DISTRIBUTION_REPORT}
          />
          <Stack.Screen
            component={SubjectPerformanceReportScreen}
            name={ROUTES.SUBJECT_PERFORMANCE_REPORT}
          />
          <Stack.Screen
            component={ClassSectionPerformanceReportScreen}
            name={ROUTES.CLASS_SECTION_PERFORMANCE_REPORT}
          />
          <Stack.Screen
            component={RankReportScreen}
            name={ROUTES.RANK_REPORT}
          />
          <Stack.Screen
            component={ResultPublicationReportScreen}
            name={ROUTES.RESULT_PUBLICATION_REPORT}
          />
          <Stack.Screen
            component={ReportCardGenerationReportScreen}
            name={ROUTES.REPORT_CARD_GENERATION_REPORT}
          />
        </>
      ) : null}
      {canViewExports ? (
        <>
          <Stack.Screen
            component={ExportCenterScreen}
            name={ROUTES.EXPORT_CENTER}
          />
          <Stack.Screen
            component={ExportPreviewScreen}
            name={ROUTES.EXPORT_PREVIEW}
          />
          <Stack.Screen
            component={ExportHistoryScreen}
            name={ROUTES.EXPORT_HISTORY}
          />
          <Stack.Screen
            component={ExportJobDetailsScreen}
            name={ROUTES.EXPORT_JOB_DETAILS}
          />
        </>
      ) : null}
      {canViewExaminationSetup ? (
        <>
          <Stack.Screen
            component={ExaminationSetupScreen}
            name={ROUTES.EXAMINATION_SETUP}
          />
          <Stack.Screen component={ExamTermsScreen} name={ROUTES.EXAM_TERMS} />
          <Stack.Screen
            component={CreateExamTermScreen}
            name={ROUTES.CREATE_EXAM_TERM}
          />
          <Stack.Screen
            component={EditExamTermScreen}
            name={ROUTES.EDIT_EXAM_TERM}
          />
          <Stack.Screen component={ExamTypesScreen} name={ROUTES.EXAM_TYPES} />
          <Stack.Screen
            component={CreateExamTypeScreen}
            name={ROUTES.CREATE_EXAM_TYPE}
          />
          <Stack.Screen
            component={EditExamTypeScreen}
            name={ROUTES.EDIT_EXAM_TYPE}
          />
          <Stack.Screen
            component={ExamTypeDetailsScreen}
            name={ROUTES.EXAM_TYPE_DETAILS}
          />
          <Stack.Screen
            component={GradingSchemesScreen}
            name={ROUTES.GRADING_SCHEMES}
          />
          <Stack.Screen
            component={CreateGradingSchemeScreen}
            name={ROUTES.CREATE_GRADING_SCHEME}
          />
          <Stack.Screen
            component={EditGradingSchemeScreen}
            name={ROUTES.EDIT_GRADING_SCHEME}
          />
          <Stack.Screen
            component={GradingSchemeDetailsScreen}
            name={ROUTES.GRADING_SCHEME_DETAILS}
          />
          <Stack.Screen component={ExamsScreen} name={ROUTES.EXAMS} />
          <Stack.Screen
            component={CreateExamScreen}
            name={ROUTES.CREATE_EXAM}
          />
          <Stack.Screen component={EditExamScreen} name={ROUTES.EDIT_EXAM} />
          <Stack.Screen
            component={ExamDetailsScreen}
            name={ROUTES.EXAM_DETAILS}
          />
          <Stack.Screen
            component={ExamClassConfigurationsScreen}
            name={ROUTES.EXAM_CLASS_CONFIGURATIONS}
          />
          <Stack.Screen
            component={ExamClassConfigurationScreen}
            name={ROUTES.EXAM_CLASS_CONFIGURATION}
          />
          <Stack.Screen
            component={ExamSubjectPapersScreen}
            name={ROUTES.EXAM_SUBJECT_PAPERS}
          />
          <Stack.Screen
            component={ExamSubjectPaperScreen}
            name={ROUTES.EXAM_SUBJECT_PAPER}
          />
          <Stack.Screen
            component={ExamScheduleScreen}
            name={ROUTES.EXAM_SCHEDULE}
          />
          <Stack.Screen
            component={ExamSchedulePreviewScreen}
            name={ROUTES.EXAM_SCHEDULE_PREVIEW}
          />
          <Stack.Screen
            component={ExamSetupReviewScreen}
            name={ROUTES.EXAM_SETUP_REVIEW}
          />
          <Stack.Screen component={CopyExamScreen} name={ROUTES.COPY_EXAM} />
          <Stack.Screen
            component={CancelExamScreen}
            name={ROUTES.CANCEL_EXAM}
          />
          <Stack.Screen
            component={MarksDashboardScreen}
            name={ROUTES.MARKS_DASHBOARD}
          />
          <Stack.Screen
            component={MarkSheetsScreen}
            name={ROUTES.MARK_SHEETS}
          />
          <Stack.Screen
            component={MarkSheetDetailsScreen}
            name={ROUTES.MARK_SHEET_DETAILS}
          />
          <Stack.Screen
            component={MarksEntryScreen}
            name={ROUTES.MARKS_ENTRY}
          />
          <Stack.Screen
            component={MarksEntryReviewScreen}
            name={ROUTES.MARKS_ENTRY_REVIEW}
          />
          <Stack.Screen
            component={SubmitMarkSheetScreen}
            name={ROUTES.SUBMIT_MARK_SHEET}
          />
          <Stack.Screen
            component={LockMarkSheetScreen}
            name={ROUTES.LOCK_MARK_SHEET}
          />
          <Stack.Screen
            component={UnlockMarkSheetScreen}
            name={ROUTES.UNLOCK_MARK_SHEET}
          />
          <Stack.Screen
            component={MarkSheetHistoryScreen}
            name={ROUTES.MARK_SHEET_HISTORY}
          />
          <Stack.Screen
            component={ResultProcessingDashboardScreen}
            name={ROUTES.RESULT_PROCESSING_DASHBOARD}
          />
          <Stack.Screen
            component={CalculateResultsScreen}
            name={ROUTES.CALCULATE_RESULTS}
          />
          <Stack.Screen
            component={ResultCalculationPreviewScreen}
            name={ROUTES.RESULT_CALCULATION_PREVIEW}
          />
          <Stack.Screen
            component={ResultCalculationResultScreen}
            name={ROUTES.RESULT_CALCULATION_RESULT}
          />
          <Stack.Screen
            component={ClassResultsScreen}
            name={ROUTES.CLASS_RESULTS}
          />
          <Stack.Screen
            component={SectionResultsScreen}
            name={ROUTES.SECTION_RESULTS}
          />
          <Stack.Screen
            component={StudentResultDetailsScreen}
            name={ROUTES.STUDENT_RESULT_DETAILS}
          />
          <Stack.Screen
            component={ResultReviewScreen}
            name={ROUTES.RESULT_REVIEW}
          />
          <Stack.Screen
            component={PublishResultsScreen}
            name={ROUTES.PUBLISH_RESULTS}
          />
          <Stack.Screen
            component={UnpublishResultsScreen}
            name={ROUTES.UNPUBLISH_RESULTS}
          />
          <Stack.Screen
            component={ResultPublicationHistoryScreen}
            name={ROUTES.RESULT_PUBLICATION_HISTORY}
          />
          <Stack.Screen component={RankListScreen} name={ROUTES.RANK_LIST} />
          <Stack.Screen
            component={ReportCardDashboardScreen}
            name={ROUTES.REPORT_CARD_DASHBOARD}
          />
          <Stack.Screen
            component={GenerateReportCardsScreen}
            name={ROUTES.GENERATE_REPORT_CARDS}
          />
          <Stack.Screen
            component={ReportCardGenerationPreviewScreen}
            name={ROUTES.REPORT_CARD_GENERATION_PREVIEW}
          />
          <Stack.Screen
            component={ReportCardGenerationResultScreen}
            name={ROUTES.REPORT_CARD_GENERATION_RESULT}
          />
          <Stack.Screen
            component={ReportCardGenerationHistoryScreen}
            name={ROUTES.REPORT_CARD_GENERATION_HISTORY}
          />
          <Stack.Screen
            component={ReportCardGenerationRunDetailsScreen}
            name={ROUTES.REPORT_CARD_GENERATION_RUN_DETAILS}
          />
          <Stack.Screen
            component={ReportCardsScreen}
            name={ROUTES.REPORT_CARDS}
          />
          <Stack.Screen
            component={ReportCardDetailsScreen}
            name={ROUTES.REPORT_CARD_DETAILS}
          />
          <Stack.Screen
            component={ReportCardPreviewScreen}
            name={ROUTES.REPORT_CARD_PREVIEW}
          />
          <Stack.Screen
            component={RevokeReportCardScreen}
            name={ROUTES.REVOKE_REPORT_CARD}
          />
          <Stack.Screen
            component={ResultCommunicationScreen}
            name={ROUTES.RESULT_COMMUNICATION}
          />
          <Stack.Screen
            component={ExaminationCommunicationHistoryScreen}
            name={ROUTES.EXAMINATION_COMMUNICATION_HISTORY}
          />
        </>
      ) : null}
      {canManageReportCardTemplates ? (
        <>
          <Stack.Screen
            component={ReportCardTemplatesScreen}
            name={ROUTES.REPORT_CARD_TEMPLATES}
          />
          <Stack.Screen
            component={CreateReportCardTemplateScreen}
            name={ROUTES.CREATE_REPORT_CARD_TEMPLATE}
          />
          <Stack.Screen
            component={EditReportCardTemplateScreen}
            name={ROUTES.EDIT_REPORT_CARD_TEMPLATE}
          />
          <Stack.Screen
            component={ReportCardTemplateDetailsScreen}
            name={ROUTES.REPORT_CARD_TEMPLATE_DETAILS}
          />
          <Stack.Screen
            component={ReportCardTemplatePreviewScreen}
            name={ROUTES.REPORT_CARD_TEMPLATE_PREVIEW}
          />
        </>
      ) : null}
      {isStaff ? (
        <>
          <Stack.Screen
            component={CommunicationDashboardScreen}
            name={ROUTES.COMMUNICATION_DASHBOARD}
          />
          <Stack.Screen
            component={CommunicationSettingsScreen}
            name={ROUTES.COMMUNICATION_SETTINGS}
          />
          <Stack.Screen
            component={MessageTemplatesScreen}
            name={ROUTES.MESSAGE_TEMPLATES}
          />
          <Stack.Screen
            component={CreateMessageTemplateScreen}
            name={ROUTES.CREATE_MESSAGE_TEMPLATE}
          />
          <Stack.Screen
            component={EditMessageTemplateScreen}
            name={ROUTES.EDIT_MESSAGE_TEMPLATE}
          />
          <Stack.Screen
            component={MessageTemplateDetailsScreen}
            name={ROUTES.MESSAGE_TEMPLATE_DETAILS}
          />
          <Stack.Screen
            component={MessagePreviewScreen}
            name={ROUTES.MESSAGE_PREVIEW}
          />
          <Stack.Screen
            component={ManualFeeReminderScreen}
            name={ROUTES.MANUAL_FEE_REMINDER}
          />
          <Stack.Screen
            component={BulkReminderSetupScreen}
            name={ROUTES.BULK_REMINDER_SETUP}
          />
          <Stack.Screen
            component={BulkReminderPreviewScreen}
            name={ROUTES.BULK_REMINDER_PREVIEW}
          />
          <Stack.Screen
            component={ReminderRulesScreen}
            name={ROUTES.REMINDER_RULES}
          />
          <Stack.Screen
            component={CreateReminderRuleScreen}
            name={ROUTES.CREATE_REMINDER_RULE}
          />
          <Stack.Screen
            component={EditReminderRuleScreen}
            name={ROUTES.EDIT_REMINDER_RULE}
          />
          <Stack.Screen
            component={ScheduledRemindersScreen}
            name={ROUTES.SCHEDULED_REMINDERS}
          />
          <Stack.Screen
            component={ScheduledReminderDetailsScreen}
            name={ROUTES.SCHEDULED_REMINDER_DETAILS}
          />
          <Stack.Screen
            component={CommunicationHistoryScreen}
            name={ROUTES.COMMUNICATION_HISTORY}
          />
          <Stack.Screen
            component={CommunicationDetailsScreen}
            name={ROUTES.COMMUNICATION_DETAILS}
          />
          <Stack.Screen
            component={FailedCommunicationsScreen}
            name={ROUTES.FAILED_COMMUNICATIONS}
          />
          <Stack.Screen
            component={RetryCommunicationScreen}
            name={ROUTES.RETRY_COMMUNICATION}
          />
          <Stack.Screen
            component={NotificationCenterScreen}
            name={ROUTES.NOTIFICATION_CENTER}
          />
          <Stack.Screen
            component={NotificationDetailsScreen}
            name={ROUTES.NOTIFICATION_DETAILS}
          />
          <Stack.Screen component={StudentsScreen} name={ROUTES.STUDENTS} />
          <Stack.Screen
            component={CreateStudentScreen}
            name={ROUTES.CREATE_STUDENT}
          />
          <Stack.Screen
            component={StudentAdmissionReviewScreen}
            name={ROUTES.STUDENT_ADMISSION_REVIEW}
          />
          <Stack.Screen
            component={StudentAdmissionSuccessScreen}
            name={ROUTES.STUDENT_ADMISSION_SUCCESS}
          />
          <Stack.Screen
            component={StudentDetailsScreen}
            name={ROUTES.STUDENT_DETAILS}
          />
          <Stack.Screen
            component={EditStudentScreen}
            name={ROUTES.EDIT_STUDENT}
          />
          <Stack.Screen
            component={StudentGuardiansScreen}
            name={ROUTES.STUDENT_GUARDIANS}
          />
          <Stack.Screen
            component={CreateGuardianScreen}
            name={ROUTES.CREATE_GUARDIAN}
          />
          <Stack.Screen
            component={EditGuardianScreen}
            name={ROUTES.EDIT_GUARDIAN}
          />
          <Stack.Screen
            component={StudentEnrollmentHistoryScreen}
            name={ROUTES.STUDENT_ENROLLMENT_HISTORY}
          />
          <Stack.Screen
            component={TransferStudentScreen}
            name={ROUTES.TRANSFER_STUDENT}
          />
          <Stack.Screen
            component={StudentAccessScreen}
            name={ROUTES.STUDENT_ACCESS}
          />
        </>
      ) : null}
      {canViewFeeSetup ? (
        <>
          <Stack.Screen component={FeeSetupScreen} name={ROUTES.FEE_SETUP} />
          <Stack.Screen component={FeeHeadsScreen} name={ROUTES.FEE_HEADS} />
          <Stack.Screen
            component={CreateFeeHeadScreen}
            name={ROUTES.CREATE_FEE_HEAD}
          />
          <Stack.Screen
            component={EditFeeHeadScreen}
            name={ROUTES.EDIT_FEE_HEAD}
          />
          <Stack.Screen
            component={FeeHeadDetailsScreen}
            name={ROUTES.FEE_HEAD_DETAILS}
          />
          <Stack.Screen
            component={FeeStructuresScreen}
            name={ROUTES.FEE_STRUCTURES}
          />
          <Stack.Screen
            component={CreateFeeStructureScreen}
            name={ROUTES.CREATE_FEE_STRUCTURE}
          />
          <Stack.Screen
            component={EditFeeStructureScreen}
            name={ROUTES.EDIT_FEE_STRUCTURE}
          />
          <Stack.Screen
            component={FeeStructureDetailsScreen}
            name={ROUTES.FEE_STRUCTURE_DETAILS}
          />
          <Stack.Screen
            component={FeeStructurePreviewScreen}
            name={ROUTES.FEE_STRUCTURE_PREVIEW}
          />
          <Stack.Screen
            component={StudentFeeAssignmentsScreen}
            name={ROUTES.STUDENT_FEE_ASSIGNMENTS}
          />
          <Stack.Screen
            component={StudentFeeAssignmentDetailsScreen}
            name={ROUTES.STUDENT_FEE_ASSIGNMENT_DETAILS}
          />
          <Stack.Screen
            component={EditStudentFeeAssignmentScreen}
            name={ROUTES.EDIT_STUDENT_FEE_ASSIGNMENT}
          />
          <Stack.Screen
            component={DiscountDefinitionsScreen}
            name={ROUTES.DISCOUNT_DEFINITIONS}
          />
          <Stack.Screen
            component={CreateDiscountDefinitionScreen}
            name={ROUTES.CREATE_DISCOUNT_DEFINITION}
          />
          <Stack.Screen
            component={EditDiscountDefinitionScreen}
            name={ROUTES.EDIT_DISCOUNT_DEFINITION}
          />
          <Stack.Screen component={FineRulesScreen} name={ROUTES.FINE_RULES} />
          <Stack.Screen
            component={CreateFineRuleScreen}
            name={ROUTES.CREATE_FINE_RULE}
          />
          <Stack.Screen
            component={EditFineRuleScreen}
            name={ROUTES.EDIT_FINE_RULE}
          />
          <Stack.Screen
            component={StudentPayablePreviewScreen}
            name={ROUTES.STUDENT_PAYABLE_PREVIEW}
          />
        </>
      ) : null}
      {isStaff ? (
        <>
          <Stack.Screen
            component={FeeOutstandingDashboardScreen}
            name={ROUTES.FEE_OUTSTANDING_DASHBOARD}
          />
          <Stack.Screen
            component={FeeGenerationHistoryScreen}
            name={ROUTES.FEE_GENERATION_HISTORY}
          />
          <Stack.Screen
            component={FeeGenerationRunDetailsScreen}
            name={ROUTES.FEE_GENERATION_RUN_DETAILS}
          />
          <Stack.Screen
            component={PendingFeesScreen}
            name={ROUTES.PENDING_FEES}
          />
          <Stack.Screen
            component={OverdueFeesScreen}
            name={ROUTES.OVERDUE_FEES}
          />
          <Stack.Screen
            component={StudentFeeDuesScreen}
            name={ROUTES.STUDENT_FEE_DUES}
          />
          <Stack.Screen
            component={FeeDueDetailsScreen}
            name={ROUTES.FEE_DUE_DETAILS}
          />
          <Stack.Screen
            component={FineAccrualPreviewScreen}
            name={ROUTES.FINE_ACCRUAL_PREVIEW}
          />
        </>
      ) : null}
      {canOperateFeeDues ? (
        <>
          <Stack.Screen
            component={GenerateFeeDuesScreen}
            name={ROUTES.GENERATE_FEE_DUES}
          />
          <Stack.Screen
            component={FeeGenerationPreviewScreen}
            name={ROUTES.FEE_GENERATION_PREVIEW}
          />
          <Stack.Screen
            component={FeeGenerationResultScreen}
            name={ROUTES.FEE_GENERATION_RESULT}
          />
          <Stack.Screen
            component={CancelFeeDueScreen}
            name={ROUTES.CANCEL_FEE_DUE}
          />
          <Stack.Screen
            component={WaiveFeeDueScreen}
            name={ROUTES.WAIVE_FEE_DUE}
          />
        </>
      ) : null}
      {isStaff ? (
        <>
          <Stack.Screen
            component={CollectionDashboardScreen}
            name={ROUTES.COLLECTION_DASHBOARD}
          />
          <Stack.Screen
            component={CollectPaymentScreen}
            name={ROUTES.COLLECT_PAYMENT}
          />
          <Stack.Screen
            component={PaymentDueSelectionScreen}
            name={ROUTES.PAYMENT_DUE_SELECTION}
          />
          <Stack.Screen
            component={PaymentDetailsEntryScreen}
            name={ROUTES.PAYMENT_DETAILS_ENTRY}
          />
          <Stack.Screen
            component={PaymentAllocationReviewScreen}
            name={ROUTES.PAYMENT_ALLOCATION_REVIEW}
          />
          <Stack.Screen
            component={PaymentSuccessScreen}
            name={ROUTES.PAYMENT_SUCCESS}
          />
          <Stack.Screen component={PaymentsScreen} name={ROUTES.PAYMENTS} />
          <Stack.Screen
            component={PaymentDetailsScreen}
            name={ROUTES.PAYMENT_DETAILS}
          />
          <Stack.Screen
            component={ReversePaymentScreen}
            name={ROUTES.REVERSE_PAYMENT}
          />
          <Stack.Screen component={ReceiptsScreen} name={ROUTES.RECEIPTS} />
          <Stack.Screen
            component={ReceiptDetailsScreen}
            name={ROUTES.RECEIPT_DETAILS}
          />
          <Stack.Screen
            component={ReceiptPreviewScreen}
            name={ROUTES.RECEIPT_PREVIEW}
          />
          <Stack.Screen
            component={StudentLedgerScreen}
            name={ROUTES.STUDENT_LEDGER}
          />
          <Stack.Screen
            component={StudentAdvanceCreditsScreen}
            name={ROUTES.STUDENT_ADVANCE_CREDITS}
          />
          <Stack.Screen
            component={ApplyAdvanceCreditScreen}
            name={ROUTES.APPLY_ADVANCE_CREDIT}
          />
          <Stack.Screen
            component={DailyCollectionScreen}
            name={ROUTES.DAILY_COLLECTION}
          />
        </>
      ) : null}
      {role === 'PARENT' ? (
        <>
          <Stack.Screen
            component={ParentResultsScreen}
            name={ROUTES.PARENT_RESULTS}
          />
          <Stack.Screen
            component={ParentStudentResultDetailsScreen}
            name={ROUTES.PARENT_STUDENT_RESULT_DETAILS}
          />
          <Stack.Screen
            component={ParentReportCardsScreen}
            name={ROUTES.PARENT_REPORT_CARDS}
          />
          <Stack.Screen
            component={ParentReportCardDetailsScreen}
            name={ROUTES.PARENT_REPORT_CARD_DETAILS}
          />
          <Stack.Screen
            component={ParentNotificationsScreen}
            name={ROUTES.PARENT_NOTIFICATIONS}
          />
          <Stack.Screen
            component={ParentNotificationDetailsScreen}
            name={ROUTES.PARENT_NOTIFICATION_DETAILS}
          />
          <Stack.Screen
            component={ParentChildrenScreen}
            name={ROUTES.PARENT_CHILDREN}
          />
          <Stack.Screen
            component={ParentChildDetailsScreen}
            name={ROUTES.PARENT_CHILD_DETAILS}
          />
          <Stack.Screen
            component={ParentFeesScreen}
            name={ROUTES.PARENT_FEES}
          />
          <Stack.Screen
            component={ParentStudentFeeDetailsScreen}
            name={ROUTES.PARENT_STUDENT_FEE_DETAILS}
          />
          <Stack.Screen
            component={ParentReceiptsScreen}
            name={ROUTES.PARENT_RECEIPTS}
          />
          <Stack.Screen
            component={ParentReceiptDetailsScreen}
            name={ROUTES.PARENT_RECEIPT_DETAILS}
          />
        </>
      ) : null}
      {role === 'STUDENT' ? (
        <>
          <Stack.Screen
            component={StudentResultsScreen}
            name={ROUTES.STUDENT_RESULTS}
          />
          <Stack.Screen
            component={StudentSelfResultDetailsScreen}
            name={ROUTES.STUDENT_SELF_RESULT_DETAILS}
          />
          <Stack.Screen
            component={StudentReportCardsScreen}
            name={ROUTES.STUDENT_REPORT_CARDS}
          />
          <Stack.Screen
            component={StudentReportCardDetailsScreen}
            name={ROUTES.STUDENT_REPORT_CARD_DETAILS}
          />
          <Stack.Screen
            component={StudentNotificationsScreen}
            name={ROUTES.STUDENT_NOTIFICATIONS}
          />
          <Stack.Screen
            component={StudentNotificationDetailsScreen}
            name={ROUTES.STUDENT_NOTIFICATION_DETAILS}
          />
          <Stack.Screen
            component={StudentSelfProfileScreen}
            name={ROUTES.STUDENT_SELF_PROFILE}
          />
          <Stack.Screen
            component={StudentFeesScreen}
            name={ROUTES.STUDENT_FEES}
          />
          <Stack.Screen
            component={StudentReceiptsScreen}
            name={ROUTES.STUDENT_RECEIPTS}
          />
          <Stack.Screen
            component={StudentReceiptDetailsScreen}
            name={ROUTES.STUDENT_RECEIPT_DETAILS}
          />
        </>
      ) : null}
      {isSuperAdmin ? (
        <>
          <Stack.Screen
            component={SuperAdminSchoolsScreen}
            name={ROUTES.SCHOOLS}
          />
          <Stack.Screen
            component={CreateSchoolScreen}
            name={ROUTES.CREATE_SCHOOL}
          />
          <Stack.Screen
            component={OrganizationSetupSuccessScreen}
            name={ROUTES.ORGANIZATION_SETUP_SUCCESS}
          />
        </>
      ) : null}
      {canViewOrganization ? (
        <>
          <Stack.Screen
            component={SchoolDetailsScreen}
            name={ROUTES.SCHOOL_DETAILS}
          />
          <Stack.Screen
            component={BranchDetailsScreen}
            name={ROUTES.BRANCH_DETAILS}
          />
          <Stack.Screen
            component={AcademicSessionsScreen}
            name={ROUTES.ACADEMIC_SESSIONS}
          />
          <Stack.Screen
            component={AcademicSetupScreen}
            name={ROUTES.ACADEMIC_SETUP}
          />
          <Stack.Screen component={ClassesScreen} name={ROUTES.CLASSES} />
          <Stack.Screen
            component={CreateClassScreen}
            name={ROUTES.CREATE_CLASS}
          />
          <Stack.Screen component={EditClassScreen} name={ROUTES.EDIT_CLASS} />
          <Stack.Screen
            component={ClassDetailsScreen}
            name={ROUTES.CLASS_DETAILS}
          />
          <Stack.Screen component={SectionsScreen} name={ROUTES.SECTIONS} />
          <Stack.Screen
            component={CreateSectionScreen}
            name={ROUTES.CREATE_SECTION}
          />
          <Stack.Screen
            component={EditSectionScreen}
            name={ROUTES.EDIT_SECTION}
          />
          <Stack.Screen component={SubjectsScreen} name={ROUTES.SUBJECTS} />
          <Stack.Screen
            component={CreateSubjectScreen}
            name={ROUTES.CREATE_SUBJECT}
          />
          <Stack.Screen
            component={EditSubjectScreen}
            name={ROUTES.EDIT_SUBJECT}
          />
          <Stack.Screen
            component={SubjectDetailsScreen}
            name={ROUTES.SUBJECT_DETAILS}
          />
          <Stack.Screen
            component={ClassSubjectAssignmentScreen}
            name={ROUTES.CLASS_SUBJECT_ASSIGNMENT}
          />
        </>
      ) : null}
      {canManageSchool ? (
        <>
          <Stack.Screen
            component={EditSchoolScreen}
            name={ROUTES.EDIT_SCHOOL}
          />
          <Stack.Screen
            component={SchoolBranchesScreen}
            name={ROUTES.SCHOOL_BRANCHES}
          />
          <Stack.Screen
            component={CreateBranchScreen}
            name={ROUTES.CREATE_BRANCH}
          />
          <Stack.Screen
            component={EditBranchScreen}
            name={ROUTES.EDIT_BRANCH}
          />
          <Stack.Screen
            component={CreateAcademicSessionScreen}
            name={ROUTES.CREATE_ACADEMIC_SESSION}
          />
          <Stack.Screen
            component={EditAcademicSessionScreen}
            name={ROUTES.EDIT_ACADEMIC_SESSION}
          />
          <Stack.Screen
            component={SchoolSettingsScreen}
            name={ROUTES.SCHOOL_SETTINGS}
          />
        </>
      ) : null}
      {canViewStaff ? (
        <>
          <Stack.Screen
            component={StaffUsersScreen}
            name={ROUTES.STAFF_USERS}
          />
          <Stack.Screen
            component={StaffUserDetailsScreen}
            name={ROUTES.STAFF_USER_DETAILS}
          />
          <Stack.Screen
            component={UserActivityScreen}
            name={ROUTES.USER_ACTIVITY}
          />
        </>
      ) : null}
      {canManageStaff ? (
        <>
          <Stack.Screen
            component={CreateStaffUserScreen}
            name={ROUTES.CREATE_STAFF_USER}
          />
          <Stack.Screen
            component={EditStaffUserScreen}
            name={ROUTES.EDIT_STAFF_USER}
          />
          <Stack.Screen
            component={ActiveSessionsScreen}
            name={ROUTES.ACTIVE_SESSIONS}
          />
        </>
      ) : null}
      {canManageSchoolStaff ? (
        <>
          <Stack.Screen
            component={AssignBranchesScreen}
            name={ROUTES.ASSIGN_BRANCHES}
          />
          <Stack.Screen
            component={ChangeUserRoleScreen}
            name={ROUTES.CHANGE_USER_ROLE}
          />
          <Stack.Screen component={RoleListScreen} name={ROUTES.ROLE_LIST} />
          <Stack.Screen
            component={RoleDetailsScreen}
            name={ROUTES.ROLE_DETAILS}
          />
          <Stack.Screen
            component={RolePermissionsScreen}
            name={ROUTES.ROLE_PERMISSIONS}
          />
        </>
      ) : null}
    </Stack.Navigator>
  );
}
