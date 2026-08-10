import type { ID } from './common';

export const BACKEND_STUDENT_STATUSES = [
  'active',
  'inactive',
  'transferred',
  'dropped',
  'passed_out',
] as const;

export type BackendStudentStatus = (typeof BACKEND_STUDENT_STATUSES)[number];

export interface CurrentStudent {
  id: ID;
  branchId: ID;
  classId: ID;
  sectionId: ID;
  admissionNumber: string;
  rollNumber: string;
  name: string;
  dateOfBirth: string | null;
  gender: string;
  admissionDate: string;
  status: BackendStudentStatus;
  parentName: string;
  parentPhoneNumber: string;
  parentEmail: string;
  address: string;
  createdAt: string;
}

export interface CurrentStudentListQuery {
  search?: string;
  classId?: ID;
  status?: BackendStudentStatus;
}

export interface CurrentStudentAdmissionInput {
  classId: ID;
  sectionId: ID;
  rollNumber?: string;
  name: string;
  dateOfBirth?: string | null;
  gender?: string;
  parentName?: string;
  parentPhoneNumber: string;
  parentEmail?: string;
  address?: string;
}

export type CurrentStudentUpdateInput = Partial<
  Omit<CurrentStudentAdmissionInput, 'parentPhoneNumber'>
>;
