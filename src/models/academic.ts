import type { ID } from './common';

export type AcademicEntityStatus = 'ACTIVE' | 'INACTIVE';
export type SubjectType = 'CORE' | 'ELECTIVE' | 'OPTIONAL';
export type AcademicSort = 'DISPLAY_ORDER_ASC' | 'NAME_ASC';

export interface AcademicContext {
  schoolId: ID;
  branchId: ID;
  academicSessionId: ID;
}

export interface AcademicClass extends AcademicContext {
  id: ID;
  name: string;
  code: string;
  displayOrder: number;
  status: AcademicEntityStatus;
  sectionCount: number;
  activeSectionCount: number;
  assignedSubjectCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: ID;
  classId: ID;
  name: string;
  code: string;
  capacity?: number;
  displayOrder: number;
  status: AcademicEntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: ID;
  schoolId: ID;
  name: string;
  code: string;
  shortName?: string;
  type: SubjectType;
  displayOrder: number;
  status: AcademicEntityStatus;
  activeAssignmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClassSubjectAssignment extends AcademicContext {
  id: ID;
  classId: ID;
  subjectId: ID;
  displayOrder: number;
  status: AcademicEntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicSetupSummary {
  totalClasses: number;
  activeClasses: number;
  totalSections: number;
  activeSubjects: number;
  unassignedClasses: number;
  classesWithoutSections: number;
}

export interface CreateClassInput {
  name: string;
  code: string;
  displayOrder: number;
  status: AcademicEntityStatus;
}
export type UpdateClassInput = CreateClassInput;

export interface ClassListQuery {
  search?: string;
  status?: AcademicEntityStatus | 'ALL';
  page?: number;
  pageSize?: number;
  sort?: AcademicSort;
}

export interface CreateSectionInput {
  name: string;
  code: string;
  capacity?: number;
  displayOrder: number;
  status: AcademicEntityStatus;
}
export type UpdateSectionInput = CreateSectionInput;

export interface SectionListQuery {
  search?: string;
  status?: AcademicEntityStatus | 'ALL';
  page?: number;
  pageSize?: number;
  sort?: AcademicSort;
}

export interface CreateSubjectInput {
  name: string;
  code: string;
  shortName?: string;
  type: SubjectType;
  displayOrder: number;
  status: AcademicEntityStatus;
}
export type UpdateSubjectInput = CreateSubjectInput;

export interface SubjectListQuery {
  search?: string;
  status?: AcademicEntityStatus | 'ALL';
  type?: SubjectType | 'ALL';
  page?: number;
  pageSize?: number;
  sort?: AcademicSort;
}

export interface UpdateClassSubjectAssignmentsInput {
  subjectIds: ID[];
}
