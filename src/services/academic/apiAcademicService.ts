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
import { apiClient, type ApiClient } from '../api/apiClient';
import { ApiClientError } from '../api/apiError';
import type { StaffUserService } from '../userManagement/staffUserService';
import { liveStaffUserService } from '../userManagement/liveStaffUserService';
import type { AcademicService } from './academicService';
import {
  mapAssignmentRequest,
  mapCreateClassRequest,
  mapCreateSectionRequest,
  mapSubjectRequest,
  mapUpdateClassRequest,
  mapUpdateSectionRequest,
  parseAssignmentList,
  parseAssignmentSubjectIds,
  parseClass,
  parseClassList,
  parseSection,
  parseSectionList,
  parseSubject,
  parseSubjectList,
  requestId,
} from './academicMapper';

type AcademicApiClient = Pick<ApiClient, 'delete' | 'get' | 'patch' | 'post'>;

function success<T>(data: T, message: string): ApiResponse<T> {
  return { data, message, success: true };
}

function page<T>(items: T[], pageNumber = 1, pageSize = 20): PaginatedResponse<T> {
  const safePage = Math.max(1, pageNumber);
  const safeSize = Math.max(1, pageSize);
  const start = (safePage - 1) * safeSize;
  return {
    items: items.slice(start, start + safeSize),
    page: safePage,
    pageSize: safeSize,
    totalItems: items.length,
    totalPages: Math.ceil(items.length / safeSize),
  };
}

function term(value?: string): string {
  return value?.trim().toLowerCase() ?? '';
}

function ensureContextClass(item: AcademicClass, context: AcademicContext): AcademicClass {
  if (item.branchId !== context.branchId || item.academicSessionId !== context.academicSessionId) {
    throw new ApiClientError({
      code: 'ACADEMIC_CONTEXT_MISMATCH',
      kind: 'not-found',
      message: 'The class is outside the selected branch or academic session.',
      status: 404,
    });
  }
  return item;
}

export class LiveAcademicService implements AcademicService {
  private readonly mutations = new Set<string>();

  constructor(
    private readonly client: AcademicApiClient,
    private readonly staffUsers: Pick<StaffUserService, 'listStaff'> = liveStaffUserService,
  ) {}

  private async locked<T>(key: string, operation: () => Promise<T>): Promise<T> {
    if (this.mutations.has(key)) {
      throw new ApiClientError({
        code: 'ACADEMIC_MUTATION_IN_PROGRESS',
        kind: 'conflict',
        message: 'This academic change is already in progress.',
        status: 409,
      });
    }
    this.mutations.add(key);
    try {
      return await operation();
    } finally {
      this.mutations.delete(key);
    }
  }

  private async classItems(context: AcademicContext): Promise<AcademicClass[]> {
    const [classRaw, sectionRaw, assignmentRaw] = await Promise.all([
      this.client.get<unknown>('/classes/', { query: { branch: requestId(context.branchId, 'branchId') } }),
      this.client.get<unknown>('/sections/'),
      this.client.get<unknown>('/class-subject-teacher/'),
    ]);
    const sections = parseSectionList(sectionRaw);
    const assignments = parseAssignmentList(assignmentRaw, context);
    return parseClassList(classRaw, context)
      .filter(item => item.branchId === context.branchId && item.academicSessionId === context.academicSessionId)
      .map(item => {
        const ownedSections = sections.filter(section => section.classId === item.id);
        return {
          ...item,
          activeSectionCount: ownedSections.filter(section => section.status === 'ACTIVE').length,
          assignedSubjectCount: assignments.filter(assignment => assignment.classId === item.id).length,
          sectionCount: ownedSections.length,
        };
      });
  }

  async getSetupSummary(context: AcademicContext): Promise<ApiResponse<AcademicSetupSummary>> {
    const [classes, subjectsRaw] = await Promise.all([
      this.classItems(context),
      this.client.get<unknown>('/subjects/'),
    ]);
    const subjects = parseSubjectList(subjectsRaw);
    return success({
      activeClasses: classes.filter(item => item.status === 'ACTIVE').length,
      activeSubjects: subjects.filter(item => item.status === 'ACTIVE').length,
      classesWithoutSections: classes.filter(item => item.sectionCount === 0).length,
      totalClasses: classes.length,
      totalSections: classes.reduce((total, item) => total + item.sectionCount, 0),
      unassignedClasses: classes.filter(item => item.assignedSubjectCount === 0).length,
    }, 'Academic setup loaded.');
  }

  async getClasses(context: AcademicContext, query: ClassListQuery = {}): Promise<ApiResponse<PaginatedResponse<AcademicClass>>> {
    const search = term(query.search);
    let items = (await this.classItems(context)).filter(item =>
      (!search || item.name.toLowerCase().includes(search)) &&
      (!query.status || query.status === 'ALL' || item.status === query.status),
    );
    if (query.sort === 'NAME_ASC') items = items.sort((a, b) => a.name.localeCompare(b.name));
    else items = items.sort((a, b) => a.displayOrder - b.displayOrder || Number(a.id) - Number(b.id));
    return success(page(items, query.page, query.pageSize), 'Classes loaded.');
  }

  async getClass(context: AcademicContext, classId: string): Promise<ApiResponse<AcademicClass>> {
    const [raw, sectionsRaw, assignmentsRaw] = await Promise.all([
      this.client.get<unknown>(`/classes/${requestId(classId, 'classId')}/`),
      this.client.get<unknown>('/sections/', { query: { school_class: requestId(classId, 'classId') } }),
      this.client.get<unknown>('/class-subject-teacher/', { query: { school_class: requestId(classId, 'classId') } }),
    ]);
    const item = ensureContextClass(parseClass(raw, context), context);
    const sections = parseSectionList(sectionsRaw).filter(section => section.classId === item.id);
    const assignments = parseAssignmentList(assignmentsRaw, context).filter(assignment => assignment.classId === item.id);
    return success({ ...item, activeSectionCount: sections.filter(section => section.status === 'ACTIVE').length, assignedSubjectCount: assignments.length, sectionCount: sections.length }, 'Class loaded.');
  }

  async createClass(context: AcademicContext, input: CreateClassInput): Promise<ApiResponse<AcademicClass>> {
    return this.locked('class:create', async () => {
      const raw = await this.client.post<unknown>('/classes/', mapCreateClassRequest(context, input));
      return success(ensureContextClass(parseClass(raw, context), context), 'Class created.');
    });
  }

  async updateClass(context: AcademicContext, classId: string, input: UpdateClassInput): Promise<ApiResponse<AcademicClass>> {
    return this.locked(`class:${classId}`, async () => {
      const raw = await this.client.patch<unknown>(`/classes/${requestId(classId, 'classId')}/`, mapUpdateClassRequest(input));
      return success(ensureContextClass(parseClass(raw, context), context), 'Class updated.');
    });
  }

  async updateClassStatus(context: AcademicContext, classId: string, status: AcademicEntityStatus): Promise<ApiResponse<AcademicClass>> {
    const raw = await this.client.patch<unknown>(`/classes/${requestId(classId, 'classId')}/status/`, { is_active: status === 'ACTIVE' });
    return success(ensureContextClass(parseClass(raw, context), context), `Class ${status === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
  }

  async getSections(context: AcademicContext, classId: string, query: SectionListQuery = {}): Promise<ApiResponse<PaginatedResponse<Section>>> {
    await this.getClass(context, classId);
    const raw = await this.client.get<unknown>('/sections/', { query: { school_class: requestId(classId, 'classId') } });
    const search = term(query.search);
    let items = parseSectionList(raw).filter(item => item.classId === classId && (!search || item.name.toLowerCase().includes(search)) && (!query.status || query.status === 'ALL' || item.status === query.status));
    if (query.sort === 'NAME_ASC') items = items.sort((a, b) => a.name.localeCompare(b.name));
    return success(page(items, query.page, query.pageSize), 'Sections loaded.');
  }

  async getSection(context: AcademicContext, classId: string, sectionId: string): Promise<ApiResponse<Section>> {
    await this.getClass(context, classId);
    const item = parseSection(await this.client.get<unknown>(`/sections/${requestId(sectionId, 'sectionId')}/`));
    if (item.classId !== classId) throw new ApiClientError({ code: 'ACADEMIC_CONTEXT_MISMATCH', kind: 'not-found', message: 'The section is outside the selected class.', status: 404 });
    return success(item, 'Section loaded.');
  }

  async createSection(context: AcademicContext, classId: string, input: CreateSectionInput): Promise<ApiResponse<Section>> {
    await this.getClass(context, classId);
    const raw = await this.client.post<unknown>('/sections/', mapCreateSectionRequest(classId, input));
    return success(parseSection(raw), 'Section created.');
  }

  async updateSection(context: AcademicContext, classId: string, sectionId: string, input: UpdateSectionInput): Promise<ApiResponse<Section>> {
    await this.getSection(context, classId, sectionId);
    const raw = await this.client.patch<unknown>(`/sections/${requestId(sectionId, 'sectionId')}/`, mapUpdateSectionRequest(input));
    return success(parseSection(raw), 'Section updated.');
  }

  async updateSectionStatus(context: AcademicContext, classId: string, sectionId: string, status: AcademicEntityStatus): Promise<ApiResponse<Section>> {
    await this.getSection(context, classId, sectionId);
    const raw = await this.client.patch<unknown>(`/sections/${requestId(sectionId, 'sectionId')}/status/`, { is_active: status === 'ACTIVE' });
    return success(parseSection(raw), `Section ${status === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
  }

  async getSubjects(schoolId: string, query: SubjectListQuery = {}): Promise<ApiResponse<PaginatedResponse<Subject>>> {
    const [raw, assignmentRaw] = await Promise.all([
      this.client.get<unknown>('/subjects/'),
      this.client.get<unknown>('/class-subject-teacher/'),
    ]);
    const visibleAssignmentSubjectIds = parseAssignmentSubjectIds(assignmentRaw);
    const search = term(query.search);
    let items = parseSubjectList(raw)
      .map(item => ({ ...item, activeAssignmentCount: visibleAssignmentSubjectIds.filter(subjectId => subjectId === item.id).length }))
      .filter(item => item.schoolId === schoolId && (!search || item.name.toLowerCase().includes(search) || item.code.toLowerCase().includes(search)) && (!query.status || query.status === 'ALL' || item.status === query.status));
    if (query.sort === 'NAME_ASC') items = items.sort((a, b) => a.name.localeCompare(b.name));
    return success(page(items, query.page, query.pageSize), 'Subjects loaded.');
  }

  async getSubject(schoolId: string, subjectId: string): Promise<ApiResponse<Subject>> {
    const [raw, assignmentRaw] = await Promise.all([
      this.client.get<unknown>(`/subjects/${requestId(subjectId, 'subjectId')}/`),
      this.client.get<unknown>('/class-subject-teacher/'),
    ]);
    const base = parseSubject(raw);
    const item = {
      ...base,
      activeAssignmentCount: parseAssignmentSubjectIds(assignmentRaw).filter(id => id === base.id).length,
    };
    if (item.schoolId !== schoolId) throw new ApiClientError({ code: 'ACADEMIC_CONTEXT_MISMATCH', kind: 'not-found', message: 'The subject is outside the selected school.', status: 404 });
    return success(item, 'Subject loaded.');
  }

  async createSubject(schoolId: string, input: CreateSubjectInput): Promise<ApiResponse<Subject>> {
    const item = parseSubject(await this.client.post<unknown>('/subjects/', mapSubjectRequest(input)));
    if (item.schoolId !== schoolId) throw new ApiClientError({ code: 'ACADEMIC_CONTEXT_MISMATCH', kind: 'not-found', message: 'The subject is outside the selected school.', status: 404 });
    return success(item, 'Subject created.');
  }

  async updateSubject(schoolId: string, subjectId: string, input: UpdateSubjectInput): Promise<ApiResponse<Subject>> {
    await this.getSubject(schoolId, subjectId);
    const item = parseSubject(await this.client.patch<unknown>(`/subjects/${requestId(subjectId, 'subjectId')}/`, mapSubjectRequest(input)));
    return success(item, 'Subject updated.');
  }

  async updateSubjectStatus(schoolId: string, subjectId: string, status: AcademicEntityStatus): Promise<ApiResponse<Subject>> {
    await this.getSubject(schoolId, subjectId);
    const item = parseSubject(await this.client.patch<unknown>(`/subjects/${requestId(subjectId, 'subjectId')}/status/`, { is_active: status === 'ACTIVE' }));
    return success(item, `Subject ${status === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
  }

  async getClassSubjectAssignments(context: AcademicContext, classId: string): Promise<ApiResponse<ClassSubjectAssignment[]>> {
    await this.getClass(context, classId);
    const raw = await this.client.get<unknown>('/class-subject-teacher/', { query: { school_class: requestId(classId, 'classId') } });
    return success(parseAssignmentList(raw, context).filter(item => item.classId === classId), 'Teacher assignments loaded.');
  }

  async updateClassSubjectAssignments(context: AcademicContext, classId: string, input: UpdateClassSubjectAssignmentsInput): Promise<ApiResponse<ClassSubjectAssignment[]>> {
    return this.locked(`assignments:${classId}`, async () => {
      const existing = (await this.getClassSubjectAssignments(context, classId)).data;
      const desired = input.assignments ?? [];
      if (new Set(desired.map(item => item.subjectId)).size !== desired.length) {
        throw new ApiClientError({ code: 'DUPLICATE_ACADEMIC_ASSIGNMENT', kind: 'validation', message: 'Each subject can have only one teacher for this class.', status: 400 });
      }
      const [staff, subjects] = await Promise.all([
        this.staffUsers.listStaff({ branchId: context.branchId, role: 'TEACHER', status: 'ACTIVE' }),
        this.getSubjects(context.schoolId, { pageSize: 10000, status: 'ACTIVE' }),
      ]);
      const eligibleTeacherIds = new Set(staff.data.items.filter(item => item.role === 'TEACHER' && item.status === 'ACTIVE' && item.schoolId === context.schoolId && item.branch.id === context.branchId).map(item => item.id));
      const eligibleSubjectIds = new Set(subjects.data.items.map(item => item.id));
      if (desired.some(item => !eligibleTeacherIds.has(item.teacherId))) {
        throw new ApiClientError({ code: 'INELIGIBLE_ACADEMIC_TEACHER', kind: 'validation', message: 'Select an active Teacher from this class’s branch.', status: 400 });
      }
      if (desired.some(item => !eligibleSubjectIds.has(item.subjectId))) {
        throw new ApiClientError({ code: 'INELIGIBLE_ACADEMIC_SUBJECT', kind: 'validation', message: 'Select an active subject from this school.', status: 400 });
      }
      const keep = new Set(desired.map(item => `${item.subjectId}:${item.teacherId}`));
      const existingPairs = new Set(existing.map(item => `${item.subjectId}:${item.teacherId ?? ''}`));
      for (const item of existing) {
        if (!keep.has(`${item.subjectId}:${item.teacherId ?? ''}`)) {
          await this.client.delete<unknown>(`/class-subject-teacher/${requestId(item.id, 'assignmentId')}/`);
        }
      }
      for (const item of desired) {
        if (!existingPairs.has(`${item.subjectId}:${item.teacherId}`)) {
          await this.client.post<unknown>('/class-subject-teacher/', mapAssignmentRequest(classId, item.subjectId, item.teacherId));
        }
      }
      return this.getClassSubjectAssignments(context, classId);
    });
  }
}

export const apiAcademicService = new LiveAcademicService(apiClient);
