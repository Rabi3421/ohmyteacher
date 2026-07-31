import type { ApiResponse, PaginatedResponse } from '../../models/common';
import type {
  AcademicClass,
  AcademicContext,
  AcademicEntityStatus,
  AcademicSetupSummary,
  ClassListQuery,
  ClassSubjectAssignment,
  CreateClassInput,
  CreateSectionInput,
  CreateSubjectInput,
  Section,
  SectionListQuery,
  Subject,
  SubjectListQuery,
  UpdateClassInput,
  UpdateClassSubjectAssignmentsInput,
  UpdateSectionInput,
  UpdateSubjectInput,
} from '../../models/academic';

export interface AcademicService {
  getSetupSummary(
    context: AcademicContext,
  ): Promise<ApiResponse<AcademicSetupSummary>>;
  getClasses(
    context: AcademicContext,
    query?: ClassListQuery,
  ): Promise<ApiResponse<PaginatedResponse<AcademicClass>>>;
  getClass(
    context: AcademicContext,
    classId: string,
  ): Promise<ApiResponse<AcademicClass>>;
  createClass(
    context: AcademicContext,
    input: CreateClassInput,
  ): Promise<ApiResponse<AcademicClass>>;
  updateClass(
    context: AcademicContext,
    classId: string,
    input: UpdateClassInput,
  ): Promise<ApiResponse<AcademicClass>>;
  updateClassStatus(
    context: AcademicContext,
    classId: string,
    status: AcademicEntityStatus,
  ): Promise<ApiResponse<AcademicClass>>;
  getSections(
    context: AcademicContext,
    classId: string,
    query?: SectionListQuery,
  ): Promise<ApiResponse<PaginatedResponse<Section>>>;
  getSection(
    context: AcademicContext,
    classId: string,
    sectionId: string,
  ): Promise<ApiResponse<Section>>;
  createSection(
    context: AcademicContext,
    classId: string,
    input: CreateSectionInput,
  ): Promise<ApiResponse<Section>>;
  updateSection(
    context: AcademicContext,
    classId: string,
    sectionId: string,
    input: UpdateSectionInput,
  ): Promise<ApiResponse<Section>>;
  updateSectionStatus(
    context: AcademicContext,
    classId: string,
    sectionId: string,
    status: AcademicEntityStatus,
  ): Promise<ApiResponse<Section>>;
  getSubjects(
    schoolId: string,
    query?: SubjectListQuery,
  ): Promise<ApiResponse<PaginatedResponse<Subject>>>;
  getSubject(
    schoolId: string,
    subjectId: string,
  ): Promise<ApiResponse<Subject>>;
  createSubject(
    schoolId: string,
    input: CreateSubjectInput,
  ): Promise<ApiResponse<Subject>>;
  updateSubject(
    schoolId: string,
    subjectId: string,
    input: UpdateSubjectInput,
  ): Promise<ApiResponse<Subject>>;
  updateSubjectStatus(
    schoolId: string,
    subjectId: string,
    status: AcademicEntityStatus,
  ): Promise<ApiResponse<Subject>>;
  getClassSubjectAssignments(
    context: AcademicContext,
    classId: string,
  ): Promise<ApiResponse<ClassSubjectAssignment[]>>;
  updateClassSubjectAssignments(
    context: AcademicContext,
    classId: string,
    input: UpdateClassSubjectAssignmentsInput,
  ): Promise<ApiResponse<ClassSubjectAssignment[]>>;
}
