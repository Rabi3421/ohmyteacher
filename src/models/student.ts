import type { Address, ID } from './common';

export type StudentProfileStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'WITHDRAWN'
  | 'PASSED_OUT';
export type StudentEnrollmentStatus =
  | 'ACTIVE'
  | 'TRANSFERRED'
  | 'COMPLETED'
  | 'CANCELLED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type GuardianRelationship =
  | 'FATHER'
  | 'MOTHER'
  | 'GUARDIAN'
  | 'OTHER';
export type LinkStatus = 'ACTIVE' | 'INACTIVE';
export type TransferType =
  | 'SECTION_CHANGE'
  | 'CLASS_CHANGE'
  | 'BRANCH_TRANSFER';

export interface StudentProfile {
  id: ID;
  schoolId: ID;
  admissionNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: Gender;
  mobile?: string;
  email?: string;
  bloodGroup?: string;
  photoUrl?: string;
  address: Address;
  admissionDate: string;
  status: StudentProfileStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StudentEnrollment {
  id: ID;
  studentId: ID;
  schoolId: ID;
  branchId: ID;
  academicSessionId: ID;
  classId: ID;
  sectionId: ID;
  rollNumber?: string;
  status: StudentEnrollmentStatus;
  startDate: string;
  endDate?: string;
  transferType?: TransferType;
  transferReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GuardianProfile {
  id: ID;
  schoolId: ID;
  userId?: ID;
  fullName: string;
  relationship: GuardianRelationship;
  mobile: string;
  alternateMobile?: string;
  email?: string;
  occupation?: string;
  address: Address;
  createdAt: string;
  updatedAt: string;
}

export interface StudentGuardianLink {
  id: ID;
  studentId: ID;
  guardianId: ID;
  isPrimaryContact: boolean;
  isFeeContact: boolean;
  isEmergencyContact: boolean;
  whatsappEnabled: boolean;
  parentAppAccessEnabled: boolean;
  status: LinkStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ParentStudentLink {
  id: ID;
  schoolId: ID;
  parentMembershipId: ID;
  studentId: ID;
  guardianId: ID;
  status: LinkStatus;
  createdAt: string;
}

export interface StudentCurrentEnrollment extends StudentEnrollment {
  branchName: string;
  academicSessionName: string;
  className: string;
  sectionName: string;
}

export interface GuardianSummary extends GuardianProfile {
  link: StudentGuardianLink;
  linkedChildrenCount: number;
}

export type GuardianDetails = GuardianSummary;

export interface ParentAccessSummary {
  guardianId: ID;
  guardianName: string;
  mobile: string;
  userId: ID;
  membershipId: ID;
  linkedStudentIds: ID[];
  status: LinkStatus;
}

export interface StudentMembershipSummary {
  userId: ID;
  membershipId: ID;
  mobile: string;
  status: LinkStatus;
}

export interface StudentAccessSummary {
  parentMemberships: ParentAccessSummary[];
  studentMembership?: StudentMembershipSummary;
}

export interface StudentListItem {
  profile: StudentProfile;
  currentEnrollment?: StudentCurrentEnrollment;
  primaryGuardian?: GuardianSummary;
}

export interface StudentStatusHistory {
  id: ID;
  studentId: ID;
  fromStatus: StudentProfileStatus;
  toStatus: StudentProfileStatus;
  reason: string;
  changedAt: string;
}

export interface StudentDetails {
  profile: StudentProfile;
  currentEnrollment?: StudentCurrentEnrollment;
  guardians: GuardianSummary[];
  access: StudentAccessSummary;
  enrollmentCount: number;
  lastTransfer?: StudentEnrollment;
  statusHistory: StudentStatusHistory[];
}

export interface StudentListQuery {
  search?: string;
  branchId?: ID | 'ALL';
  academicSessionId?: ID | 'ALL';
  classId?: ID | 'ALL';
  sectionId?: ID | 'ALL';
  studentStatus?: StudentProfileStatus | 'ALL';
  enrollmentStatus?: StudentEnrollmentStatus | 'ALL';
  page?: number;
  pageSize?: number;
}

export interface StudentProfileInput {
  fullName: string;
  dateOfBirth: string;
  gender: Gender;
  mobile?: string;
  email?: string;
  bloodGroup?: string;
  photoUrl?: string;
  admissionDate: string;
  address: Address;
}

export type UpdateStudentProfileInput = Omit<
  StudentProfileInput,
  'admissionDate'
>;

export interface GuardianInput {
  fullName: string;
  relationship: GuardianRelationship;
  mobile: string;
  alternateMobile?: string;
  email?: string;
  occupation?: string;
  address: Address;
  isPrimaryContact: boolean;
  isFeeContact: boolean;
  isEmergencyContact: boolean;
  whatsappEnabled: boolean;
  parentAppAccessEnabled: boolean;
}

export type CreateGuardianInput = GuardianInput;
export type UpdateGuardianInput = GuardianInput;

export interface EnrollmentInput {
  branchId: ID;
  academicSessionId: ID;
  classId: ID;
  sectionId: ID;
  rollNumber?: string;
}

export interface CreateStudentAdmissionInput {
  profile: StudentProfileInput;
  guardians: GuardianInput[];
  enrollment: EnrollmentInput;
  enableStudentAppAccess: boolean;
}

export interface StudentAdmissionDraft {
  step: 1 | 2 | 3 | 4 | 5;
  profile: StudentProfileInput;
  guardians: GuardianInput[];
  enrollment: EnrollmentInput;
  enableStudentAppAccess: boolean;
}

export interface StudentAdmissionResult {
  profile: StudentProfile;
  activeEnrollment: StudentCurrentEnrollment;
  guardianLinks: GuardianSummary[];
  access: StudentAccessSummary;
}

export interface UpdateStudentStatusInput {
  status: StudentProfileStatus;
  reason: string;
}

export interface TransferStudentInput extends EnrollmentInput {
  effectiveDate: string;
  reason: string;
  type: TransferType;
  allowedBranchIds?: ID[];
}

export interface StudentTransferResult {
  previousEnrollment: StudentEnrollment;
  activeEnrollment: StudentCurrentEnrollment;
}

export interface UpdateParentAccessInput {
  enabled: boolean;
}

export interface UpdateStudentAppAccessInput {
  enabled: boolean;
}

export type StudentActivityAction =
  | 'STUDENT_ADMITTED'
  | 'STUDENT_PROFILE_UPDATED'
  | 'GUARDIAN_LINKED'
  | 'GUARDIAN_UPDATED'
  | 'GUARDIAN_UNLINKED'
  | 'PRIMARY_GUARDIAN_CHANGED'
  | 'FEE_CONTACT_CHANGED'
  | 'ENROLLMENT_CREATED'
  | 'STUDENT_TRANSFERRED'
  | 'STUDENT_STATUS_CHANGED'
  | 'PARENT_ACCESS_ENABLED'
  | 'PARENT_ACCESS_DISABLED'
  | 'STUDENT_ACCESS_ENABLED'
  | 'STUDENT_ACCESS_DISABLED';

export interface StudentActivity {
  id: ID;
  studentId: ID;
  schoolId: ID;
  action: StudentActivityAction;
  description: string;
  performedBy: string;
  performedAt: string;
  metadata?: Record<string, string | number | boolean>;
}
