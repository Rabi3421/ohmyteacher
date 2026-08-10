import type {
  AcademicClass,
  AcademicContext,
  AcademicEntityStatus,
  AcademicSort,
  ClassListQuery,
  ClassSubjectAssignment,
  CreateClassInput,
  CreateSectionInput,
  CreateSubjectInput,
  Section,
  SectionListQuery,
  Subject,
  SubjectListQuery,
} from '../../models/academic';
import type { ApiResponse, PaginatedResponse } from '../../models/common';
import type { AcademicSession, Branch } from '../../models/organization';
import {
  validateClassInput,
  validateSectionInput,
  validateSubjectInput,
} from '../../utils/academicValidation';
import { ApiClientError } from '../api/apiError';
import { mockDelay } from '../mock/mockDelay';
import {
  INITIAL_ACADEMIC_SESSIONS,
  INITIAL_BRANCHES,
  INITIAL_SCHOOLS,
} from '../organization/organizationFixtures';
import {
  INITIAL_ACADEMIC_CLASSES,
  INITIAL_CLASS_SUBJECT_ASSIGNMENTS,
  INITIAL_SECTIONS,
  INITIAL_SUBJECTS,
} from './academicFixtures';
import type { AcademicService } from './academicService';

let classes: AcademicClass[] = [];
let sections: Section[] = [];
let subjects: Subject[] = [];
let assignments: ClassSubjectAssignment[] = [];
let sequence = 200;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function resetMockAcademicData(): void {
  classes = clone(INITIAL_ACADEMIC_CLASSES);
  sections = clone(INITIAL_SECTIONS);
  subjects = clone(INITIAL_SUBJECTS);
  assignments = clone(INITIAL_CLASS_SUBJECT_ASSIGNMENTS);
  sequence = 200;
  syncAllCounts();
}

export function getMockAcademicRepositorySnapshot() {
  return clone({ assignments, classes, sections, subjects });
}

function success<T>(data: T, message = 'Success'): ApiResponse<T> {
  return { data: clone(data), message, success: true };
}

function error(
  code: string,
  message: string,
  status: number,
  fieldErrors?: Record<string, string>,
): never {
  throw new ApiClientError({ code, fieldErrors, message, status });
}

function findBranch(context: AcademicContext): Branch {
  const branch = INITIAL_BRANCHES.find(item => item.id === context.branchId);
  if (!branch || branch.schoolId !== context.schoolId) {
    return error(
      'ACADEMIC_CONTEXT_MISMATCH',
      'The selected branch does not belong to this school.',
      404,
    );
  }
  return branch;
}

function findSession(context: AcademicContext): AcademicSession {
  const session = INITIAL_ACADEMIC_SESSIONS.find(
    item => item.id === context.academicSessionId,
  );
  if (!session || session.schoolId !== context.schoolId) {
    return error(
      'ACADEMIC_CONTEXT_MISMATCH',
      'The selected academic session does not belong to this school.',
      404,
    );
  }
  return session;
}

function assertContext(context: AcademicContext): AcademicSession {
  if (!INITIAL_SCHOOLS.some(item => item.id === context.schoolId)) {
    return error('SCHOOL_NOT_FOUND', 'School could not be found.', 404);
  }
  findBranch(context);
  return findSession(context);
}

function assertWritable(context: AcademicContext): void {
  const branch = findBranch(context);
  const session = findSession(context);
  if (branch.status !== 'ACTIVE') {
    error(
      'BRANCH_INACTIVE',
      'Academic setup cannot be changed for an inactive branch.',
      409,
    );
  }
  if (session.status === 'CLOSED') {
    error(
      'ACADEMIC_SESSION_CLOSED',
      'This academic session is closed and strictly read-only.',
      409,
    );
  }
}

function sameContext(item: AcademicClass, context: AcademicContext): boolean {
  return (
    item.schoolId === context.schoolId &&
    item.branchId === context.branchId &&
    item.academicSessionId === context.academicSessionId
  );
}

function findClass(context: AcademicContext, classId: string): AcademicClass {
  assertContext(context);
  const academicClass = classes.find(
    item => item.id === classId && sameContext(item, context),
  );
  if (!academicClass) {
    return error(
      'CLASS_NOT_FOUND',
      'Class could not be found in the selected academic context.',
      404,
    );
  }
  return academicClass;
}

function findSection(classId: string, sectionId: string): Section {
  const section = sections.find(
    item => item.id === sectionId && item.classId === classId,
  );
  if (!section) {
    return error(
      'SECTION_NOT_FOUND',
      'Section could not be found in this class.',
      404,
    );
  }
  return section;
}

function assertSchool(schoolId: string): void {
  if (!INITIAL_SCHOOLS.some(item => item.id === schoolId)) {
    error('SCHOOL_NOT_FOUND', 'School could not be found.', 404);
  }
}

function findSubject(schoolId: string, subjectId: string): Subject {
  assertSchool(schoolId);
  const subject = subjects.find(
    item => item.id === subjectId && item.schoolId === schoolId,
  );
  if (!subject) {
    return error(
      'SUBJECT_NOT_FOUND',
      'Subject could not be found in this school.',
      404,
    );
  }
  return subject;
}

function assertValid(
  validation: Record<string, string>,
  message: string,
): void {
  if (Object.keys(validation).length > 0) {
    error('VALIDATION_ERROR', message, 400, validation);
  }
}

function normalized(value: string): string {
  return value.trim().toUpperCase();
}

function assertUniqueClass(
  context: AcademicContext,
  input: CreateClassInput,
  excludedId?: string,
): void {
  const conflict = classes.find(
    item =>
      item.id !== excludedId &&
      sameContext(item, context) &&
      (normalized(item.name) === normalized(input.name) ||
        normalized(item.code) === normalized(input.code)),
  );
  if (conflict) {
    error(
      'DUPLICATE_CLASS',
      'Class name and code must be unique in this branch and session.',
      409,
      {
        [normalized(conflict.name) === normalized(input.name)
          ? 'name'
          : 'code']: 'This value is already in use.',
      },
    );
  }
}

function assertUniqueSection(
  classId: string,
  input: CreateSectionInput,
  excludedId?: string,
): void {
  const conflict = sections.find(
    item =>
      item.id !== excludedId &&
      item.classId === classId &&
      (normalized(item.name) === normalized(input.name) ||
        normalized(item.code) === normalized(input.code)),
  );
  if (conflict) {
    error(
      'DUPLICATE_SECTION',
      'Section name and code must be unique within the class.',
      409,
      {
        [normalized(conflict.name) === normalized(input.name)
          ? 'name'
          : 'code']: 'This value is already in use.',
      },
    );
  }
}

function assertUniqueSubject(
  schoolId: string,
  input: CreateSubjectInput,
  excludedId?: string,
): void {
  const conflict = subjects.find(
    item =>
      item.id !== excludedId &&
      item.schoolId === schoolId &&
      (normalized(item.name) === normalized(input.name) ||
        normalized(item.code) === normalized(input.code)),
  );
  if (conflict) {
    error(
      'DUPLICATE_SUBJECT',
      'Subject name and code must be unique within the school.',
      409,
      {
        [normalized(conflict.name) === normalized(input.name)
          ? 'name'
          : 'code']: 'This value is already in use.',
      },
    );
  }
}

function sortEntities<T extends { displayOrder: number; name?: string }>(
  items: T[],
  sort: AcademicSort = 'DISPLAY_ORDER_ASC',
): T[] {
  return [...items].sort((left, right) =>
    sort === 'NAME_ASC' && left.name && right.name
      ? left.name.localeCompare(right.name)
      : left.displayOrder - right.displayOrder ||
        (left.name ?? '').localeCompare(right.name ?? ''),
  );
}

function paginate<T>(
  items: T[],
  page = 1,
  pageSize = 20,
): PaginatedResponse<T> {
  const safePage = Math.max(1, page);
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

function filterSearch<T extends { name: string; code: string }>(
  items: T[],
  search?: string,
): T[] {
  const term = search?.trim().toLowerCase();
  return term
    ? items.filter(
        item =>
          item.name.toLowerCase().includes(term) ||
          item.code.toLowerCase().includes(term),
      )
    : items;
}

function syncClassCounts(academicClass: AcademicClass): void {
  const classSections = sections.filter(
    item => item.classId === academicClass.id,
  );
  academicClass.sectionCount = classSections.length;
  academicClass.activeSectionCount = classSections.filter(
    item => item.status === 'ACTIVE',
  ).length;
  academicClass.assignedSubjectCount = assignments.filter(
    item => item.classId === academicClass.id && item.status === 'ACTIVE',
  ).length;
}

function syncSubjectCounts(subject: Subject): void {
  subject.activeAssignmentCount = assignments.filter(
    item => item.subjectId === subject.id && item.status === 'ACTIVE',
  ).length;
}

function syncAllCounts(): void {
  classes.forEach(syncClassCounts);
  subjects.forEach(syncSubjectCounts);
}

function assertClassCanDeactivate(academicClass: AcademicClass): void {
  syncClassCounts(academicClass);
  if (
    academicClass.activeSectionCount > 0 ||
    academicClass.assignedSubjectCount > 0
  ) {
    error(
      'CLASS_HAS_ACTIVE_DEPENDENCIES',
      'Deactivate all sections and subject assignments before deactivating this class.',
      409,
    );
  }
}

function cleanBase<T extends { name: string; code: string }>(input: T): T {
  return {
    ...clone(input),
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
  };
}

resetMockAcademicData();

export const mockAcademicService: AcademicService = {
  async getSetupSummary(context) {
    await mockDelay(80);
    assertContext(context);
    syncAllCounts();
    const scoped = classes.filter(item => sameContext(item, context));
    const classIds = new Set(scoped.map(item => item.id));
    const scopedSections = sections.filter(item => classIds.has(item.classId));
    return success({
      activeClasses: scoped.filter(item => item.status === 'ACTIVE').length,
      activeSubjects: subjects.filter(
        item => item.schoolId === context.schoolId && item.status === 'ACTIVE',
      ).length,
      classesWithoutSections: scoped.filter(item => item.sectionCount === 0)
        .length,
      totalClasses: scoped.length,
      totalSections: scopedSections.length,
      unassignedClasses: scoped.filter(
        item => item.assignedSubjectCount === 0,
      ).length,
    });
  },

  async getClasses(context, query: ClassListQuery = {}) {
    await mockDelay(100);
    assertContext(context);
    syncAllCounts();
    let filtered = classes.filter(
      item =>
        sameContext(item, context) &&
        (!query.status ||
          query.status === 'ALL' ||
          item.status === query.status),
    );
    filtered = filterSearch(filtered, query.search);
    filtered = sortEntities(filtered, query.sort);
    return success(paginate(filtered, query.page, query.pageSize));
  },

  async getClass(context, classId) {
    await mockDelay(80);
    const academicClass = findClass(context, classId);
    syncClassCounts(academicClass);
    return success(academicClass);
  },

  async createClass(context, input) {
    await mockDelay(120);
    assertContext(context);
    assertWritable(context);
    const clean = cleanBase(input);
    assertValid(validateClassInput(clean), 'Check the class details.');
    assertUniqueClass(context, clean);
    sequence += 1;
    const now = new Date().toISOString();
    const academicClass: AcademicClass = {
      ...context,
      ...clean,
      activeSectionCount: 0,
      assignedSubjectCount: 0,
      createdAt: now,
      id: `class-created-${sequence}`,
      sectionCount: 0,
      updatedAt: now,
    };
    classes.push(academicClass);
    return success(academicClass, 'Class created.');
  },

  async updateClass(context, classId, input) {
    await mockDelay(120);
    assertWritable(context);
    const academicClass = findClass(context, classId);
    const clean = cleanBase(input);
    assertValid(validateClassInput(clean), 'Check the class details.');
    assertUniqueClass(context, clean, classId);
    if (academicClass.status === 'ACTIVE' && clean.status === 'INACTIVE') {
      assertClassCanDeactivate(academicClass);
    }
    Object.assign(academicClass, clean, { updatedAt: new Date().toISOString() });
    return success(academicClass, 'Class updated.');
  },

  async updateClassStatus(context, classId, status) {
    await mockDelay(100);
    assertWritable(context);
    const academicClass = findClass(context, classId);
    if (status === 'INACTIVE') {
      assertClassCanDeactivate(academicClass);
    }
    academicClass.status = status;
    academicClass.updatedAt = new Date().toISOString();
    return success(
      academicClass,
      status === 'ACTIVE' ? 'Class activated.' : 'Class deactivated.',
    );
  },

  async getSections(context, classId, query: SectionListQuery = {}) {
    await mockDelay(90);
    findClass(context, classId);
    let filtered = sections.filter(
      item =>
        item.classId === classId &&
        (!query.status ||
          query.status === 'ALL' ||
          item.status === query.status),
    );
    filtered = filterSearch(filtered, query.search);
    filtered = sortEntities(filtered, query.sort);
    return success(paginate(filtered, query.page, query.pageSize));
  },

  async getSection(context, classId, sectionId) {
    await mockDelay(70);
    findClass(context, classId);
    return success(findSection(classId, sectionId));
  },

  async createSection(context, classId, input) {
    await mockDelay(110);
    assertWritable(context);
    const academicClass = findClass(context, classId);
    if (academicClass.status !== 'ACTIVE') {
      error(
        'CLASS_INACTIVE',
        'Activate the class before adding sections.',
        409,
      );
    }
    const clean = cleanBase(input);
    assertValid(validateSectionInput(clean), 'Check the section details.');
    assertUniqueSection(classId, clean);
    sequence += 1;
    const now = new Date().toISOString();
    const section: Section = {
      ...clean,
      classId,
      createdAt: now,
      id: `section-created-${sequence}`,
      updatedAt: now,
    };
    sections.push(section);
    syncClassCounts(academicClass);
    return success(section, 'Section created.');
  },

  async updateSection(context, classId, sectionId, input) {
    await mockDelay(110);
    assertWritable(context);
    const academicClass = findClass(context, classId);
    if (academicClass.status !== 'ACTIVE') {
      error(
        'CLASS_INACTIVE',
        'Activate the class before changing sections.',
        409,
      );
    }
    const section = findSection(classId, sectionId);
    const clean = cleanBase(input);
    assertValid(validateSectionInput(clean), 'Check the section details.');
    assertUniqueSection(classId, clean, sectionId);
    Object.assign(section, clean, { updatedAt: new Date().toISOString() });
    syncClassCounts(academicClass);
    return success(section, 'Section updated.');
  },

  async updateSectionStatus(context, classId, sectionId, status) {
    await mockDelay(90);
    assertWritable(context);
    const academicClass = findClass(context, classId);
    if (academicClass.status !== 'ACTIVE' && status === 'ACTIVE') {
      error(
        'CLASS_INACTIVE',
        'Activate the class before activating a section.',
        409,
      );
    }
    const section = findSection(classId, sectionId);
    section.status = status;
    section.updatedAt = new Date().toISOString();
    syncClassCounts(academicClass);
    return success(
      section,
      status === 'ACTIVE' ? 'Section activated.' : 'Section deactivated.',
    );
  },

  async getSubjects(schoolId, query: SubjectListQuery = {}) {
    await mockDelay(100);
    assertSchool(schoolId);
    subjects.filter(item => item.schoolId === schoolId).forEach(syncSubjectCounts);
    let filtered = subjects.filter(
      item =>
        item.schoolId === schoolId &&
        (!query.status ||
          query.status === 'ALL' ||
          item.status === query.status) &&
        (!query.type || query.type === 'ALL' || item.type === query.type),
    );
    filtered = filterSearch(filtered, query.search);
    filtered = sortEntities(filtered, query.sort);
    return success(paginate(filtered, query.page, query.pageSize));
  },

  async getSubject(schoolId, subjectId) {
    await mockDelay(70);
    const subject = findSubject(schoolId, subjectId);
    syncSubjectCounts(subject);
    return success(subject);
  },

  async createSubject(schoolId, input) {
    await mockDelay(110);
    assertSchool(schoolId);
    const clean = {
      ...cleanBase(input),
      shortName: input.shortName?.trim() || undefined,
    };
    assertValid(validateSubjectInput(clean), 'Check the subject details.');
    assertUniqueSubject(schoolId, clean);
    sequence += 1;
    const now = new Date().toISOString();
    const subject: Subject = {
      ...clean,
      activeAssignmentCount: 0,
      createdAt: now,
      id: `subject-created-${sequence}`,
      schoolId,
      updatedAt: now,
    };
    subjects.push(subject);
    return success(subject, 'Subject created.');
  },

  async updateSubject(schoolId, subjectId, input) {
    await mockDelay(110);
    const subject = findSubject(schoolId, subjectId);
    const clean = {
      ...cleanBase(input),
      shortName: input.shortName?.trim() || undefined,
    };
    assertValid(validateSubjectInput(clean), 'Check the subject details.');
    assertUniqueSubject(schoolId, clean, subjectId);
    syncSubjectCounts(subject);
    if (
      subject.status === 'ACTIVE' &&
      clean.status === 'INACTIVE' &&
      subject.activeAssignmentCount > 0
    ) {
      error(
        'SUBJECT_HAS_ACTIVE_ASSIGNMENTS',
        'Remove this subject from active classes before deactivating it.',
        409,
      );
    }
    Object.assign(subject, clean, { updatedAt: new Date().toISOString() });
    return success(subject, 'Subject updated.');
  },

  async updateSubjectStatus(schoolId, subjectId, status: AcademicEntityStatus) {
    await mockDelay(90);
    const subject = findSubject(schoolId, subjectId);
    syncSubjectCounts(subject);
    if (status === 'INACTIVE' && subject.activeAssignmentCount > 0) {
      error(
        'SUBJECT_HAS_ACTIVE_ASSIGNMENTS',
        'Remove this subject from active classes before deactivating it.',
        409,
      );
    }
    subject.status = status;
    subject.updatedAt = new Date().toISOString();
    return success(
      subject,
      status === 'ACTIVE' ? 'Subject activated.' : 'Subject deactivated.',
    );
  },

  async getClassSubjectAssignments(context, classId) {
    await mockDelay(80);
    findClass(context, classId);
    return success(
      [...assignments]
        .filter(
          item =>
            item.classId === classId &&
            item.schoolId === context.schoolId &&
            item.branchId === context.branchId &&
            item.academicSessionId === context.academicSessionId,
        )
        .sort((left, right) => left.displayOrder - right.displayOrder),
    );
  },

  async updateClassSubjectAssignments(context, classId, input) {
    await mockDelay(130);
    assertWritable(context);
    const academicClass = findClass(context, classId);
    if (academicClass.status !== 'ACTIVE') {
      error(
        'CLASS_INACTIVE',
        'Activate the class before assigning subjects.',
        409,
      );
    }
    const subjectIds = input.subjectIds ?? [];
    if (new Set(subjectIds).size !== subjectIds.length) {
      error(
        'DUPLICATE_SUBJECT_ASSIGNMENT',
        'Each subject can only be assigned once.',
        409,
      );
    }
    const selectedSubjects = subjectIds.map(subjectId =>
      findSubject(context.schoolId, subjectId),
    );
    if (selectedSubjects.some(subject => subject.status !== 'ACTIVE')) {
      error(
        'SUBJECT_INACTIVE',
        'Only active subjects can be assigned to a class.',
        409,
      );
    }

    const now = new Date().toISOString();
    const selectedIds = new Set(subjectIds);
    const existing = assignments.filter(
      item =>
        item.classId === classId &&
        item.schoolId === context.schoolId &&
        item.branchId === context.branchId &&
        item.academicSessionId === context.academicSessionId,
    );
    existing.forEach(item => {
      if (!selectedIds.has(item.subjectId)) {
        item.status = 'INACTIVE';
        item.updatedAt = now;
      }
    });
    subjectIds.forEach((subjectId, index) => {
      const current = existing.find(item => item.subjectId === subjectId);
      if (current) {
        current.displayOrder = index + 1;
        current.status = 'ACTIVE';
        current.updatedAt = now;
        return;
      }
      sequence += 1;
      assignments.push({
        ...context,
        classId,
        createdAt: now,
        displayOrder: index + 1,
        id: `assignment-created-${sequence}`,
        status: 'ACTIVE',
        subjectId,
        updatedAt: now,
      });
    });
    syncClassCounts(academicClass);
    subjects.forEach(syncSubjectCounts);
    return success(
      assignments
        .filter(
          item =>
            item.classId === classId &&
            item.schoolId === context.schoolId &&
            item.branchId === context.branchId &&
            item.academicSessionId === context.academicSessionId,
        )
        .sort((left, right) => left.displayOrder - right.displayOrder),
      'Subject assignments updated.',
    );
  },
};
