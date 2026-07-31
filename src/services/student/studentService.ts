import type { ApiResponse, PaginatedResponse } from '../../models/common';
import type {
  CreateGuardianInput,
  CreateStudentAdmissionInput,
  GuardianDetails,
  StudentAccessSummary,
  StudentAdmissionResult,
  StudentDetails,
  StudentEnrollment,
  StudentListItem,
  StudentListQuery,
  StudentProfile,
  StudentTransferResult,
  TransferStudentInput,
  UpdateGuardianInput,
  UpdateParentAccessInput,
  UpdateStudentAppAccessInput,
  UpdateStudentProfileInput,
  UpdateStudentStatusInput,
  StudentGuardianLink,
} from '../../models/student';

export interface StudentService {
  getStudents(
    schoolId: string,
    query: StudentListQuery,
  ): Promise<ApiResponse<PaginatedResponse<StudentListItem>>>;
  getStudent(
    schoolId: string,
    studentId: string,
  ): Promise<ApiResponse<StudentDetails>>;
  createStudentAdmission(
    schoolId: string,
    input: CreateStudentAdmissionInput,
  ): Promise<ApiResponse<StudentAdmissionResult>>;
  updateStudentProfile(
    schoolId: string,
    studentId: string,
    input: UpdateStudentProfileInput,
  ): Promise<ApiResponse<StudentProfile>>;
  updateStudentStatus(
    schoolId: string,
    studentId: string,
    input: UpdateStudentStatusInput,
  ): Promise<ApiResponse<StudentDetails>>;
  getStudentGuardians(
    schoolId: string,
    studentId: string,
  ): Promise<ApiResponse<GuardianDetails[]>>;
  addStudentGuardian(
    schoolId: string,
    studentId: string,
    input: CreateGuardianInput,
  ): Promise<ApiResponse<GuardianDetails>>;
  updateStudentGuardian(
    schoolId: string,
    studentId: string,
    guardianId: string,
    input: UpdateGuardianInput,
  ): Promise<ApiResponse<GuardianDetails>>;
  unlinkStudentGuardian(
    schoolId: string,
    studentId: string,
    guardianId: string,
  ): Promise<ApiResponse<StudentGuardianLink[]>>;
  getEnrollmentHistory(
    schoolId: string,
    studentId: string,
  ): Promise<ApiResponse<StudentEnrollment[]>>;
  transferStudent(
    schoolId: string,
    studentId: string,
    input: TransferStudentInput,
  ): Promise<ApiResponse<StudentTransferResult>>;
  getStudentAccess(
    schoolId: string,
    studentId: string,
  ): Promise<ApiResponse<StudentAccessSummary>>;
  updateParentAccess(
    schoolId: string,
    studentId: string,
    guardianId: string,
    input: UpdateParentAccessInput,
  ): Promise<ApiResponse<StudentAccessSummary>>;
  updateStudentAppAccess(
    schoolId: string,
    studentId: string,
    input: UpdateStudentAppAccessInput,
  ): Promise<ApiResponse<StudentAccessSummary>>;
  getParentChildren(
    schoolId: string,
    parentMembershipId: string,
  ): Promise<ApiResponse<StudentListItem[]>>;
  getParentChild(
    schoolId: string,
    parentMembershipId: string,
    studentId: string,
  ): Promise<ApiResponse<StudentDetails>>;
  getStudentSelfProfile(
    schoolId: string,
    studentMembershipId: string,
  ): Promise<ApiResponse<StudentDetails>>;
}
