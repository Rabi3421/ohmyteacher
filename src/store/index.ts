export { useAppStore } from './app/appStore';
export {
  createReportStore,
  INITIAL_REPORT_STATE,
  reportStore,
  useReportStore,
  type ReportStoreState,
} from './report/reportStore';
export {
  createReportCardStore,
  INITIAL_REPORT_CARD_STATE,
  reportCardStore,
  useReportCardStore,
  type ReportCardStoreState,
} from './reportCard/reportCardStore';
export {
  createMarksResultStore,
  INITIAL_MARKS_RESULT_STATE,
  marksResultStore,
  useMarksResultStore,
  type MarksResultStoreState,
} from './marksResult/marksResultStore';
export {
  createExaminationSetupStore,
  examinationSetupStore,
  INITIAL_EXAMINATION_SETUP_STATE,
  useExaminationSetupStore,
  type ExaminationSetupStoreState,
} from './examinationSetup/examinationSetupStore';
export {
  communicationStore,
  createCommunicationStore,
  INITIAL_COMMUNICATION_STATE,
  useCommunicationStore,
  type CommunicationStoreState,
} from './communication/communicationStore';
export {
  collectionStore,
  createCollectionStore,
  createPaymentDraft,
  INITIAL_COLLECTION_STATE,
  useCollectionStore,
  type CollectionStoreState,
} from './collection/collectionStore';
export {
  academicStore,
  createAcademicStore,
  INITIAL_ACADEMIC_STATE,
  useAcademicStore,
  type AcademicStoreState,
} from './academic/academicStore';
export {
  authStore,
  createAuthStore,
  INITIAL_AUTH_STATE,
  useAuthStore,
  type AuthState,
  type AuthStatus,
  type AuthStoreState,
} from './auth/authStore';
export {
  createFeeDueDraft,
  createFeeDueStore,
  feeDueStore,
  INITIAL_FEE_DUE_STATE,
  useFeeDueStore,
  type FeeDueStoreState,
} from './feeDue/feeDueStore';
export {
  createFeeSetupStore,
  feeSetupStore,
  INITIAL_FEE_SETUP_STATE,
  useFeeSetupStore,
  type FeeSetupStoreState,
} from './feeSetup/feeSetupStore';
export {
  createCurrentFeeConfigurationStore,
  currentFeeConfigurationStore,
  INITIAL_CURRENT_FEE_CONFIGURATION_STATE,
  useCurrentFeeConfigurationStore,
  type CurrentFeeConfigurationStoreState,
} from './feeConfiguration/currentFeeConfigurationStore';
export {
  createOrganizationStore,
  INITIAL_ORGANIZATION_STATE,
  organizationStore,
  useOrganizationStore,
  type OrganizationStoreState,
} from './organization/organizationStore';
export {
  createCurrentOrganizationStore,
  currentOrganizationStore,
  INITIAL_CURRENT_ORGANIZATION_STATE,
  useCurrentOrganizationStore,
  type CurrentOrganizationStoreState,
} from './organization/currentOrganizationStore';
export {
  createPlatformStore,
  INITIAL_PLATFORM_STATE,
  platformStore,
  usePlatformStore,
  type PlatformStoreState,
} from './platform/platformStore';
export {
  createStudentStore,
  INITIAL_STUDENT_STATE,
  studentStore,
  useStudentStore,
  type StudentStoreState,
} from './student/studentStore';
export {
  createCurrentStudentStore,
  currentStudentStore,
  INITIAL_CURRENT_STUDENT_STATE,
  useCurrentStudentStore,
  type CurrentStudentStoreState,
} from './student/currentStudentStore';
export {
  createUserManagementStore,
  INITIAL_USER_MANAGEMENT_STATE,
  userManagementStore,
  useUserManagementStore,
  type UserManagementStoreState,
} from './userManagement/userManagementStore';
export {
  createCurrentStaffStore,
  currentStaffStore,
  INITIAL_CURRENT_STAFF_STATE,
  useCurrentStaffStore,
  type CurrentStaffStoreState,
} from './userManagement/currentStaffStore';
