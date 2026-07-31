import type { ApiResponse, PaginatedResponse } from '../../models/common';
import type {
  CreateDiscountDefinitionInput,
  CreateFeeHeadInput,
  CreateFeeStructureInput,
  CreateFineRuleInput,
  DiscountDefinition,
  EffectiveFeePreview,
  FeeHead,
  FeeStructure,
  FineRule,
  StudentFeeAssignment,
  StudentFeeAssignmentDetails,
  StudentPayablePreviewInput,
} from '../../models/fee';
import { calculateEffectiveFee } from '../../utils/feeCalculation';
import {
  validateDiscount,
  validateFeeHead,
  validateFeeStructure,
  validateFineRule,
} from '../../utils/feeValidation';
import {
  INITIAL_ACADEMIC_CLASSES,
  INITIAL_SECTIONS,
} from '../academic/academicFixtures';
import { ApiClientError } from '../api/apiError';
import { mockDelay } from '../mock/mockDelay';
import {
  INITIAL_ACADEMIC_SESSIONS,
  INITIAL_BRANCHES,
  INITIAL_SCHOOLS,
} from '../organization/organizationFixtures';
import {
  INITIAL_STUDENT_ENROLLMENTS,
  INITIAL_STUDENT_PROFILES,
} from '../student/studentFixtures';
import {
  INITIAL_DISCOUNTS,
  INITIAL_FEE_ASSIGNMENTS,
  INITIAL_FEE_HEADS,
  INITIAL_FEE_STRUCTURES,
  INITIAL_FINE_RULES,
} from './feeSetupFixtures';
import type { FeeSetupService } from './feeSetupService';

let heads: FeeHead[] = [];
let structures: FeeStructure[] = [];
let assignments: StudentFeeAssignment[] = [];
let discounts: DiscountDefinition[] = [];
let fineRules: FineRule[] = [];
let sequence = 800;

const clone = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

export function resetMockFeeSetupData(): void {
  heads = clone(INITIAL_FEE_HEADS);
  structures = clone(INITIAL_FEE_STRUCTURES);
  assignments = clone(INITIAL_FEE_ASSIGNMENTS);
  discounts = clone(INITIAL_DISCOUNTS);
  fineRules = clone(INITIAL_FINE_RULES);
  sequence = 800;
  refreshCounts();
}

export function getMockFeeSetupRepositorySnapshot() {
  return clone({ assignments, discounts, fineRules, heads, structures });
}

function success<T>(data: T, message = 'Success'): ApiResponse<T> {
  return { data: clone(data), message, success: true };
}

function fail(
  code: string,
  message: string,
  status = 409,
  fieldErrors?: Record<string, string>,
): never {
  throw new ApiClientError({ code, fieldErrors, message, status });
}

function assertErrors(errors: Record<string, string>, message: string) {
  if (Object.keys(errors).length) {
    fail('FEE_VALIDATION_ERROR', message, 400, errors);
  }
}

function paginate<T>(
  items: T[],
  page = 1,
  pageSize = 20,
): PaginatedResponse<T> {
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, pageSize);
  return {
    items: items.slice((safePage - 1) * safeSize, safePage * safeSize),
    page: safePage,
    pageSize: safeSize,
    totalItems: items.length,
    totalPages: items.length ? Math.ceil(items.length / safeSize) : 0,
  };
}

function assertSchool(schoolId: string) {
  if (!INITIAL_SCHOOLS.some(item => item.id === schoolId)) {
    fail('SCHOOL_NOT_FOUND', 'School could not be found.', 404);
  }
}

function context(
  schoolId: string,
  branchId: string,
  academicSessionId: string,
  mutable = false,
) {
  assertSchool(schoolId);
  const branch = INITIAL_BRANCHES.find(
    item =>
      item.id === branchId &&
      item.schoolId === schoolId &&
      item.status === 'ACTIVE',
  );
  if (!branch) fail('INVALID_FEE_BRANCH', 'Select an active school branch.', 409);
  const session = INITIAL_ACADEMIC_SESSIONS.find(
    item => item.id === academicSessionId && item.schoolId === schoolId,
  );
  if (!session) fail('INVALID_FEE_SESSION', 'Select a school session.', 409);
  if (mutable && session.status === 'CLOSED') {
    fail(
      'FEE_SESSION_CLOSED',
      'This academic session is closed and strictly read-only.',
      409,
    );
  }
  return { branch, session };
}

function findHead(schoolId: string, id: string) {
  assertSchool(schoolId);
  return (
    heads.find(item => item.id === id && item.schoolId === schoolId) ??
    fail('FEE_HEAD_NOT_FOUND', 'Fee Head was not found in this school.', 404)
  );
}

function findStructure(
  schoolId: string,
  branchId: string,
  sessionId: string,
  id: string,
) {
  context(schoolId, branchId, sessionId);
  return (
    structures.find(
      item =>
        item.id === id &&
        item.schoolId === schoolId &&
        item.branchId === branchId &&
        item.academicSessionId === sessionId,
    ) ??
    fail(
      'FEE_STRUCTURE_NOT_FOUND',
      'Fee Structure was not found in this context.',
      404,
    )
  );
}

function classForContext(
  schoolId: string,
  branchId: string,
  sessionId: string,
  classId: string,
) {
  return (
    INITIAL_ACADEMIC_CLASSES.find(
      item =>
        item.id === classId &&
        item.schoolId === schoolId &&
        item.branchId === branchId &&
        item.academicSessionId === sessionId &&
        item.status === 'ACTIVE',
    ) ??
    fail(
      'INVALID_FEE_CLASS',
      'Select an active class in this branch and session.',
      409,
    )
  );
}

function refreshCounts() {
  heads.forEach(head => {
    head.activeStructureItemCount = structures
      .filter(item => item.status === 'ACTIVE')
      .flatMap(item => item.items)
      .filter(
        item => item.status === 'ACTIVE' && item.feeHeadId === head.id,
      ).length;
  });
  structures.forEach(structure => {
    structure.assignedStudentCount = assignments.filter(
      item =>
        item.feeStructureId === structure.id && item.status === 'ACTIVE',
    ).length;
  });
  discounts.forEach(definition => {
    definition.activeAssignmentCount = assignments
      .flatMap(item => item.discountAssignments)
      .filter(
        item =>
          item.discountDefinitionId === definition.id &&
          item.status === 'ACTIVE',
      ).length;
  });
  fineRules.forEach(rule => {
    rule.activeUsageCount = structures
      .flatMap(item => item.items)
      .filter(item => item.status === 'ACTIVE' && item.fineRuleId === rule.id)
      .length;
  });
}

function normalizeHead(input: CreateFeeHeadInput) {
  return {
    ...clone(input),
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
  };
}

function uniqueHead(
  schoolId: string,
  input: CreateFeeHeadInput,
  excludedId?: string,
) {
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim().toLowerCase();
  if (
    heads.some(
      item =>
        item.schoolId === schoolId &&
        item.id !== excludedId &&
        item.code.toUpperCase() === code,
    )
  ) {
    fail('DUPLICATE_FEE_HEAD_CODE', 'Fee Head code already exists.', 409, {
      code: 'Use a unique school Fee Head code.',
    });
  }
  if (
    heads.some(
      item =>
        item.schoolId === schoolId &&
        item.id !== excludedId &&
        item.name.toLowerCase() === name,
    )
  ) {
    fail('DUPLICATE_FEE_HEAD_NAME', 'Fee Head name already exists.', 409, {
      name: 'Use a unique school Fee Head name.',
    });
  }
}

function buildStructure(
  schoolId: string,
  branchId: string,
  sessionId: string,
  input: CreateFeeStructureInput,
  id: string,
  createdAt: string,
): FeeStructure {
  const { branch, session } = context(schoolId, branchId, sessionId, true);
  const academicClass = classForContext(
    schoolId,
    branchId,
    sessionId,
    input.classId,
  );
  assertErrors(
    validateFeeStructure(input, heads, session.startDate, session.endDate),
    'Check Fee Structure details.',
  );
  if (
    input.status === 'ACTIVE' &&
    structures.some(
      item =>
        item.id !== id &&
        item.schoolId === schoolId &&
        item.branchId === branchId &&
        item.academicSessionId === sessionId &&
        item.classId === input.classId &&
        item.effectiveFrom === input.effectiveFrom &&
        item.status === 'ACTIVE',
    )
  ) {
    fail(
      'ACTIVE_FEE_STRUCTURE_CONFLICT',
      'An active Fee Structure already exists for this class and effective date.',
      409,
    );
  }
  const items = input.items.map((item, index) => {
    const head = findHead(schoolId, item.feeHeadId);
    if (
      item.fineRuleId &&
      !fineRules.some(
        rule =>
          rule.id === item.fineRuleId &&
          rule.schoolId === schoolId &&
          rule.status === 'ACTIVE',
      )
    ) {
      fail(
        'INVALID_FINE_RULE',
        'Select an active Fine Rule from this school.',
        409,
      );
    }
    return {
      ...clone(item),
      feeHeadName: head.name,
      feeStructureId: id,
      id: `${id}-item-${index + 1}`,
    };
  });
  return {
    academicSessionId: sessionId,
    academicSessionName: session.name,
    assignedStudentCount: 0,
    branchId,
    branchName: branch.name,
    classId: input.classId,
    className: academicClass.name,
    createdAt,
    description: input.description,
    effectiveFrom: input.effectiveFrom,
    id,
    items,
    name: input.name.trim(),
    schoolId,
    status: input.status,
    totalNominalAmount: items.reduce((total, item) => total + item.amount, 0),
    updatedAt: new Date().toISOString(),
  };
}

function feeEnrollment(
  schoolId: string,
  studentId: string,
  enrollmentId: string,
  requireActive = true,
) {
  const profile = INITIAL_STUDENT_PROFILES.find(
    item => item.id === studentId && item.schoolId === schoolId,
  );
  if (!profile || profile.status !== 'ACTIVE') {
    fail('INVALID_FEE_STUDENT', 'Student must be active in this school.', 409);
  }
  const enrollment = INITIAL_STUDENT_ENROLLMENTS.find(
    item =>
      item.id === enrollmentId &&
      item.studentId === studentId &&
      item.schoolId === schoolId,
  );
  if (!enrollment || (requireActive && enrollment.status !== 'ACTIVE')) {
    fail(
      'INVALID_FEE_ENROLLMENT',
      'Fee Assignment requires the current active enrollment.',
      409,
    );
  }
  if (enrollment.status !== 'ACTIVE') {
    const session = INITIAL_ACADEMIC_SESSIONS.find(
      item => item.id === enrollment.academicSessionId,
    );
    if (session?.status !== 'CLOSED') {
      fail(
        'INVALID_FEE_ENROLLMENT',
        'Transferred or ended enrollments cannot receive Fee Assignments.',
        409,
      );
    }
  }
  return { enrollment, profile };
}

function assignmentPreview(
  structure: FeeStructure,
  assignment?: StudentFeeAssignment,
): EffectiveFeePreview {
  const fineRuleNames = structure.items
    .map(item => fineRules.find(rule => rule.id === item.fineRuleId)?.name)
    .filter((name): name is string => Boolean(name));
  return calculateEffectiveFee({
    discountAssignments: assignment?.discountAssignments ?? [],
    discountDefinitions: discounts,
    fineRuleNames,
    overrides: assignment?.amountOverrides ?? [],
    selections: assignment?.optionalItemSelections ?? [],
    structure,
  });
}

function assignmentDetails(
  schoolId: string,
  studentId: string,
  enrollmentId: string,
): StudentFeeAssignmentDetails {
  const { enrollment, profile } = feeEnrollment(
    schoolId,
    studentId,
    enrollmentId,
    false,
  );
  const academicClass = INITIAL_ACADEMIC_CLASSES.find(
    item => item.id === enrollment.classId,
  )!;
  const section = INITIAL_SECTIONS.find(item => item.id === enrollment.sectionId)!;
  const assignment = assignments.find(
    item =>
      item.studentId === studentId &&
      item.enrollmentId === enrollmentId,
  );
  const structure = assignment
    ? structures.find(item => item.id === assignment.feeStructureId)
    : structures.find(
        item =>
          item.schoolId === schoolId &&
          item.branchId === enrollment.branchId &&
          item.academicSessionId === enrollment.academicSessionId &&
          item.classId === enrollment.classId &&
          item.status === 'ACTIVE',
      );
  const preview = structure
    ? assignmentPreview(structure, assignment)
    : undefined;
  return {
    assignment,
    availableDiscounts: discounts.filter(
      item => item.schoolId === schoolId && item.status === 'ACTIVE',
    ),
    feeStructure: structure,
    preview,
    summary: {
      admissionNumber: profile.admissionNumber,
      assignmentId: assignment?.id,
      assignmentStatus: assignment ? 'ASSIGNED' : 'UNASSIGNED',
      className: academicClass.name,
      discountCount: assignment?.discountAssignments.length ?? 0,
      effectivePayablePaise: preview?.netConfiguredAmountPaise ?? 0,
      enrollmentId,
      feeStructureName: structure?.name,
      rollNumber: enrollment.rollNumber,
      sectionName: section.name,
      selectedOptionalCount:
        assignment?.optionalItemSelections.filter(item => item.selected).length ??
        0,
      studentId,
      studentName: profile.fullName,
    },
  };
}

resetMockFeeSetupData();

export const mockFeeSetupService: FeeSetupService = {
  async getFeeSetupSummary(schoolId, branchId, academicSessionId) {
    await mockDelay(80);
    context(schoolId, branchId, academicSessionId);
    refreshCounts();
    const classes = INITIAL_ACADEMIC_CLASSES.filter(
      item =>
        item.schoolId === schoolId &&
        item.branchId === branchId &&
        item.academicSessionId === academicSessionId &&
        item.status === 'ACTIVE',
    );
    const activeStructures = structures.filter(
      item =>
        item.schoolId === schoolId &&
        item.branchId === branchId &&
        item.academicSessionId === academicSessionId &&
        item.status === 'ACTIVE',
    );
    const eligible = INITIAL_STUDENT_ENROLLMENTS.filter(
      item =>
        item.schoolId === schoolId &&
        item.branchId === branchId &&
        item.academicSessionId === academicSessionId &&
        item.status === 'ACTIVE' &&
        INITIAL_STUDENT_PROFILES.some(
          student =>
            student.id === item.studentId && student.status === 'ACTIVE',
        ),
    );
    return success({
      activeDiscountDefinitions: discounts.filter(
        item => item.schoolId === schoolId && item.status === 'ACTIVE',
      ).length,
      activeFeeHeads: heads.filter(
        item => item.schoolId === schoolId && item.status === 'ACTIVE',
      ).length,
      activeFineRules: fineRules.filter(
        item => item.schoolId === schoolId && item.status === 'ACTIVE',
      ).length,
      classesWithStructure: new Set(activeStructures.map(item => item.classId))
        .size,
      classesWithoutStructure: classes.filter(
        item => !activeStructures.some(structure => structure.classId === item.id),
      ).length,
      enrollmentsWithoutAssignment: eligible.filter(
        item =>
          !assignments.some(
            assignment =>
              assignment.enrollmentId === item.id &&
              assignment.status === 'ACTIVE',
          ),
      ).length,
      historicalInactiveHeadReferences: structures
        .filter(item => item.status === 'INACTIVE')
        .flatMap(item => item.items)
        .filter(item => findHead(schoolId, item.feeHeadId).status === 'INACTIVE')
        .length,
      studentsWithCustomAssignment: assignments.filter(
        item =>
          item.schoolId === schoolId &&
          item.amountOverrides.some(
            override => override.type !== 'DEFAULT_AMOUNT',
          ),
      ).length,
    });
  },

  async getFeeHeads(schoolId, query) {
    await mockDelay(70);
    assertSchool(schoolId);
    const search = query.search?.trim().toLowerCase();
    return success(
      paginate(
        heads
          .filter(item => item.schoolId === schoolId)
          .filter(
            item =>
              (!search ||
                item.name.toLowerCase().includes(search) ||
                item.code.toLowerCase().includes(search)) &&
              (!query.status ||
                query.status === 'ALL' ||
                item.status === query.status) &&
              (!query.type || query.type === 'ALL' || item.type === query.type),
          )
          .sort((a, b) => a.displayOrder - b.displayOrder),
        query.page,
        query.pageSize,
      ),
    );
  },

  async getFeeHead(schoolId, feeHeadId) {
    await mockDelay(60);
    refreshCounts();
    return success(findHead(schoolId, feeHeadId));
  },

  async createFeeHead(schoolId, input) {
    await mockDelay(90);
    assertSchool(schoolId);
    assertErrors(validateFeeHead(input), 'Check Fee Head details.');
    uniqueHead(schoolId, input);
    const now = new Date().toISOString();
    sequence += 1;
    const head: FeeHead = {
      ...normalizeHead(input),
      activeStructureItemCount: 0,
      createdAt: now,
      id: `fee-head-created-${sequence}`,
      schoolId,
      updatedAt: now,
    };
    heads.push(head);
    return success(head, 'Fee Head created.');
  },

  async updateFeeHead(schoolId, feeHeadId, input) {
    await mockDelay(90);
    const head = findHead(schoolId, feeHeadId);
    assertErrors(validateFeeHead(input), 'Check Fee Head details.');
    uniqueHead(schoolId, input, feeHeadId);
    Object.assign(head, normalizeHead(input), {
      updatedAt: new Date().toISOString(),
    });
    return success(head, 'Fee Head updated.');
  },

  async updateFeeHeadStatus(schoolId, feeHeadId, status) {
    await mockDelay(80);
    refreshCounts();
    const head = findHead(schoolId, feeHeadId);
    if (status === 'INACTIVE' && head.activeStructureItemCount > 0) {
      const affected = structures.filter(
        item =>
          item.status === 'ACTIVE' &&
          item.items.some(
            structureItem =>
              structureItem.status === 'ACTIVE' &&
              structureItem.feeHeadId === feeHeadId,
          ),
      );
      fail(
        'FEE_HEAD_IN_USE',
        `${head.activeStructureItemCount} active structure items use this Fee Head across ${new Set(
          affected.map(item => item.className),
        ).size} classes and ${new Set(affected.map(item => item.branchName)).size} branches.`,
        409,
      );
    }
    head.status = status;
    head.updatedAt = new Date().toISOString();
    return success(head, 'Fee Head status updated.');
  },

  async getFeeStructures(
    schoolId,
    branchId,
    academicSessionId,
    query,
  ) {
    await mockDelay(80);
    context(schoolId, branchId, academicSessionId);
    const search = query.search?.trim().toLowerCase();
    refreshCounts();
    return success(
      paginate(
        structures.filter(
          item =>
            item.schoolId === schoolId &&
            item.branchId === branchId &&
            item.academicSessionId === academicSessionId &&
            (!search ||
              item.name.toLowerCase().includes(search) ||
              item.className.toLowerCase().includes(search)) &&
            (!query.classId ||
              query.classId === 'ALL' ||
              item.classId === query.classId) &&
            (!query.status ||
              query.status === 'ALL' ||
              item.status === query.status),
        ),
        query.page,
        query.pageSize,
      ),
    );
  },

  async getFeeStructure(schoolId, branchId, academicSessionId, id) {
    await mockDelay(60);
    refreshCounts();
    return success(findStructure(schoolId, branchId, academicSessionId, id));
  },

  async createFeeStructure(schoolId, branchId, sessionId, input) {
    await mockDelay(120);
    sequence += 1;
    const now = new Date().toISOString();
    const structure = buildStructure(
      schoolId,
      branchId,
      sessionId,
      input,
      `fee-structure-created-${sequence}`,
      now,
    );
    structures.push(structure);
    refreshCounts();
    return success(structure, 'Fee Structure created atomically.');
  },

  async updateFeeStructure(schoolId, branchId, sessionId, id, input) {
    await mockDelay(110);
    context(schoolId, branchId, sessionId, true);
    const existing = findStructure(schoolId, branchId, sessionId, id);
    const replacement = buildStructure(
      schoolId,
      branchId,
      sessionId,
      input,
      id,
      existing.createdAt,
    );
    Object.assign(existing, replacement);
    refreshCounts();
    return success(existing, 'Fee Structure updated.');
  },

  async copyFeeStructure(schoolId, input) {
    await mockDelay(120);
    assertSchool(schoolId);
    const source =
      structures.find(
        item => item.id === input.sourceFeeStructureId && item.schoolId === schoolId,
      ) ??
      fail('FEE_STRUCTURE_NOT_FOUND', 'Source Fee Structure was not found.', 404);
    const activeItems = source.items.filter(
      item => findHead(schoolId, item.feeHeadId).status === 'ACTIVE',
    );
    const excluded = source.items.length - activeItems.length;
    const created = await this.createFeeStructure(
      schoolId,
      input.targetBranchId,
      input.targetAcademicSessionId,
      {
        classId: input.targetClassId,
        description: `Copied from ${source.name}`,
        effectiveFrom: input.effectiveFrom,
        items: activeItems.map(
          ({ id: _id, feeStructureId: _structureId, feeHeadName: _name, ...item }) =>
            item,
        ),
        name: input.name,
        status: 'DRAFT',
      },
    );
    return success(
      created.data,
      excluded
        ? `Draft copied; ${excluded} inactive Fee Head items were excluded.`
        : 'Fee Structure copied as a draft.',
    );
  },

  async updateFeeStructureStatus(
    schoolId,
    branchId,
    sessionId,
    id,
    status,
    replaceActive,
  ) {
    await mockDelay(90);
    const { session } = context(schoolId, branchId, sessionId, true);
    const structure = findStructure(schoolId, branchId, sessionId, id);
    if (status === 'DRAFT' && structure.status !== 'DRAFT') {
      fail('INVALID_STRUCTURE_TRANSITION', 'Active history cannot return to draft.');
    }
    if (status === 'ACTIVE') {
      if (structure.status === 'INACTIVE') {
        fail(
          'INVALID_STRUCTURE_TRANSITION',
          'An inactive historical structure cannot be reactivated.',
          409,
        );
      }
      assertErrors(
        validateFeeStructure(
          {
            classId: structure.classId,
            description: structure.description,
            effectiveFrom: structure.effectiveFrom,
            items: structure.items.map(
              ({ id: _id, feeStructureId: _structureId, feeHeadName: _name, ...item }) =>
                item,
            ),
            name: structure.name,
            status: 'ACTIVE',
          },
          heads,
          session.startDate,
          session.endDate,
        ),
        'Fee Structure is not ready for activation.',
      );
      const conflict = structures.find(
        item =>
          item.id !== id &&
          item.schoolId === schoolId &&
          item.branchId === branchId &&
          item.academicSessionId === sessionId &&
          item.classId === structure.classId &&
          item.effectiveFrom === structure.effectiveFrom &&
          item.status === 'ACTIVE',
      );
      if (conflict && !replaceActive) {
        fail(
          'ACTIVE_FEE_STRUCTURE_CONFLICT',
          'Confirm replacement of the existing active Fee Structure.',
          409,
        );
      }
      if (conflict) conflict.status = 'INACTIVE';
    }
    structure.status = status;
    structure.updatedAt = new Date().toISOString();
    refreshCounts();
    return success(structure, 'Fee Structure status updated.');
  },

  async getStudentFeeAssignments(
    schoolId,
    branchId,
    sessionId,
    query,
  ) {
    await mockDelay(90);
    const { session } = context(schoolId, branchId, sessionId);
    const search = query.search?.trim().toLowerCase();
    const summaries = INITIAL_STUDENT_ENROLLMENTS.filter(
      item =>
        item.schoolId === schoolId &&
        item.branchId === branchId &&
        item.academicSessionId === sessionId &&
        (session.status === 'CLOSED'
          ? item.status !== 'ACTIVE'
          : item.status === 'ACTIVE') &&
        INITIAL_STUDENT_PROFILES.some(
          student =>
            student.id === item.studentId && student.status === 'ACTIVE',
        ),
    )
      .map(item => assignmentDetails(schoolId, item.studentId, item.id).summary)
      .filter(
        item =>
          (!search ||
            item.studentName.toLowerCase().includes(search) ||
            item.admissionNumber.toLowerCase().includes(search)) &&
          (!query.classId ||
            query.classId === 'ALL' ||
            INITIAL_STUDENT_ENROLLMENTS.find(
              enrollment => enrollment.id === item.enrollmentId,
            )?.classId === query.classId) &&
          (!query.sectionId ||
            query.sectionId === 'ALL' ||
            INITIAL_STUDENT_ENROLLMENTS.find(
              enrollment => enrollment.id === item.enrollmentId,
            )?.sectionId === query.sectionId) &&
          (!query.optionalFeeHeadId ||
            query.optionalFeeHeadId === 'ALL' ||
            (() => {
              const enrollment = INITIAL_STUDENT_ENROLLMENTS.find(
                candidate => candidate.id === item.enrollmentId,
              );
              const assignment = assignments.find(
                candidate => candidate.enrollmentId === item.enrollmentId,
              );
              const structure = structures.find(
                candidate =>
                  candidate.id ===
                  (assignment?.feeStructureId ??
                    structures.find(
                      fallback =>
                        fallback.schoolId === schoolId &&
                        fallback.branchId === enrollment?.branchId &&
                        fallback.academicSessionId ===
                          enrollment?.academicSessionId &&
                        fallback.classId === enrollment?.classId &&
                        fallback.status === 'ACTIVE',
                    )?.id),
              );
              const optionalItem = structure?.items.find(
                feeItem =>
                  feeItem.feeHeadId === query.optionalFeeHeadId &&
                  !feeItem.mandatory,
              );
              return Boolean(
                optionalItem &&
                  assignment?.optionalItemSelections.some(
                    selection =>
                      selection.feeStructureItemId === optionalItem.id &&
                      selection.selected,
                  ),
              );
            })()) &&
          (!query.assignmentStatus ||
            query.assignmentStatus === 'ALL' ||
            item.assignmentStatus === query.assignmentStatus),
      );
    return success(paginate(summaries, query.page, query.pageSize));
  },

  async getStudentFeeAssignment(schoolId, studentId, enrollmentId) {
    await mockDelay(70);
    return success(assignmentDetails(schoolId, studentId, enrollmentId));
  },

  async assignDefaultFeeStructure(schoolId, input) {
    await mockDelay(130);
    context(schoolId, input.branchId, input.academicSessionId, true);
    const structure = findStructure(
      schoolId,
      input.branchId,
      input.academicSessionId,
      input.feeStructureId,
    );
    if (structure.status !== 'ACTIVE' || structure.classId !== input.classId) {
      fail(
        'INVALID_DEFAULT_FEE_STRUCTURE',
        'Select the active Fee Structure for this class.',
      );
    }
    let assigned = 0;
    let skipped = 0;
    const eligible = INITIAL_STUDENT_ENROLLMENTS.filter(
      item =>
        item.schoolId === schoolId &&
        item.branchId === input.branchId &&
        item.academicSessionId === input.academicSessionId &&
        item.classId === input.classId &&
        item.status === 'ACTIVE' &&
        INITIAL_STUDENT_PROFILES.some(
          student =>
            student.id === item.studentId && student.status === 'ACTIVE',
        ),
    );
    eligible.forEach(enrollment => {
      if (
        assignments.some(
          item =>
            item.enrollmentId === enrollment.id && item.status === 'ACTIVE',
        )
      ) {
        skipped += 1;
        return;
      }
      sequence += 1;
      const now = new Date().toISOString();
      assignments.push({
        amountOverrides: [],
        createdAt: now,
        discountAssignments: [],
        effectiveFrom: input.effectiveFrom,
        enrollmentId: enrollment.id,
        feeStructureId: structure.id,
        id: `fee-assignment-created-${sequence}`,
        optionalItemSelections: [],
        schoolId,
        status: 'ACTIVE',
        studentId: enrollment.studentId,
        updatedAt: now,
      });
      assigned += 1;
    });
    refreshCounts();
    return success(
      { assigned, failed: 0, failedStudentIds: [], skipped },
      'Default Fee Structure assignment completed.',
    );
  },

  async updateStudentFeeAssignment(
    schoolId,
    studentId,
    enrollmentId,
    input,
  ) {
    await mockDelay(110);
    const { enrollment } = feeEnrollment(schoolId, studentId, enrollmentId);
    context(
      schoolId,
      enrollment.branchId,
      enrollment.academicSessionId,
      true,
    );
    const structure = findStructure(
      schoolId,
      enrollment.branchId,
      enrollment.academicSessionId,
      input.feeStructureId,
    );
    if (
      structure.status !== 'ACTIVE' ||
      structure.classId !== enrollment.classId
    ) {
      fail(
        'FEE_ASSIGNMENT_CONTEXT_MISMATCH',
        'Fee Structure must match the active enrollment.',
        409,
      );
    }
    input.optionalItemSelections.forEach(selection => {
      const item = structure.items.find(
        candidate => candidate.id === selection.feeStructureItemId,
      );
      if (!item) fail('INVALID_FEE_ITEM', 'Fee item does not belong to structure.');
      if (item.mandatory && !selection.selected) {
        fail('MANDATORY_FEE_REQUIRED', 'Mandatory Fee Items cannot be disabled.');
      }
    });
    input.amountOverrides.forEach(override => {
      const item = structure.items.find(
        candidate => candidate.id === override.feeStructureItemId,
      );
      if (!item) fail('INVALID_FEE_ITEM', 'Fee override item is invalid.');
      if (
        override.type === 'CUSTOM_AMOUNT' &&
        (override.customAmount === undefined || override.customAmount < 0)
      ) {
        fail('INVALID_CUSTOM_AMOUNT', 'Custom amount cannot be negative.');
      }
      if (override.type !== 'DEFAULT_AMOUNT' && !override.reason?.trim()) {
        fail('FEE_OVERRIDE_REASON_REQUIRED', 'Override reason is required.');
      }
      if (
        override.type === 'EXEMPT' &&
        item.mandatory &&
        !input.allowMandatoryExemption
      ) {
        fail(
          'FEE_EXEMPTION_PERMISSION_REQUIRED',
          'Elevated permission is required to exempt a mandatory item.',
          403,
        );
      }
    });
    input.discountAssignments.forEach(item => {
      const definition = discounts.find(
        candidate =>
          candidate.id === item.discountDefinitionId &&
          candidate.schoolId === schoolId &&
          candidate.status === 'ACTIVE',
      );
      if (!definition) fail('INVALID_DISCOUNT', 'Select an active discount.');
      if (definition.reasonRequired && !item.reason?.trim()) {
        fail('DISCOUNT_REASON_REQUIRED', 'Discount reason is required.');
      }
      if (
        item.effectiveFrom < input.effectiveFrom ||
        item.effectiveFrom < definition.startDate ||
        (definition.endDate && item.effectiveFrom > definition.endDate) ||
        (item.effectiveTo && item.effectiveTo < item.effectiveFrom)
      ) {
        fail(
          'INVALID_DISCOUNT_PERIOD',
          'Discount dates must overlap the Fee Assignment and definition period.',
        );
      }
      if (
        item.feeHeadIds.some(
          feeHeadId =>
            !structure.items.some(
              structureItem => structureItem.feeHeadId === feeHeadId,
            ) ||
            (definition.applicableFeeHeadIds.length > 0 &&
              !definition.applicableFeeHeadIds.includes(feeHeadId)),
        )
      ) {
        fail(
          'INVALID_DISCOUNT_FEE_HEAD',
          'Discount Fee Heads must be allowed by this definition and structure.',
        );
      }
    });
    let assignment = assignments.find(
      item =>
        item.studentId === studentId &&
        item.enrollmentId === enrollmentId &&
        item.status === 'ACTIVE',
    );
    const now = new Date().toISOString();
    if (!assignment) {
      sequence += 1;
      assignment = {
        amountOverrides: [],
        createdAt: now,
        discountAssignments: [],
        effectiveFrom: input.effectiveFrom,
        enrollmentId,
        feeStructureId: input.feeStructureId,
        id: `fee-assignment-created-${sequence}`,
        optionalItemSelections: [],
        schoolId,
        status: 'ACTIVE',
        studentId,
        updatedAt: now,
      };
      assignments.push(assignment);
    }
    assignment.feeStructureId = input.feeStructureId;
    assignment.effectiveFrom = input.effectiveFrom;
    assignment.optionalItemSelections = clone(input.optionalItemSelections);
    assignment.amountOverrideHistory = [
      ...(assignment.amountOverrideHistory ?? []),
      ...clone(assignment.amountOverrides),
    ];
    assignment.amountOverrides = input.amountOverrides.map(item => ({
      ...clone(item),
      createdAt: now,
      id: `fee-override-${++sequence}`,
    }));
    assignment.discountAssignmentHistory = [
      ...(assignment.discountAssignmentHistory ?? []),
      ...clone(assignment.discountAssignments),
    ];
    assignment.discountAssignments = input.discountAssignments.map(item => ({
      ...clone(item),
      approvedByUserId: input.approvedByUserId,
      createdAt: now,
      id: `student-discount-${++sequence}`,
      studentFeeAssignmentId: assignment!.id,
    }));
    assignment.updatedAt = now;
    refreshCounts();
    return success(
      assignmentDetails(schoolId, studentId, enrollmentId),
      'Student Fee Assignment updated.',
    );
  },

  async getDiscountDefinitions(schoolId, query = {}) {
    await mockDelay(70);
    assertSchool(schoolId);
    refreshCounts();
    const search = query.search?.trim().toLowerCase();
    return success(
      paginate(
        discounts.filter(
          item =>
            item.schoolId === schoolId &&
            (!search ||
              item.name.toLowerCase().includes(search) ||
              item.code.toLowerCase().includes(search)) &&
            (!query.status ||
              query.status === 'ALL' ||
              item.status === query.status),
        ),
        query.page,
        query.pageSize,
      ),
    );
  },

  async getDiscountDefinition(schoolId, id) {
    await mockDelay(60);
    assertSchool(schoolId);
    refreshCounts();
    return success(
      discounts.find(item => item.id === id && item.schoolId === schoolId) ??
        fail('DISCOUNT_NOT_FOUND', 'Discount definition was not found.', 404),
    );
  },

  async createDiscountDefinition(schoolId, input) {
    await mockDelay(90);
    assertSchool(schoolId);
    assertErrors(validateDiscount(input), 'Check discount details.');
    validateDiscountScope(schoolId, input);
    sequence += 1;
    const now = new Date().toISOString();
    const definition: DiscountDefinition = {
      ...clone(input),
      activeAssignmentCount: 0,
      code: input.code.trim().toUpperCase(),
      createdAt: now,
      id: `discount-created-${sequence}`,
      name: input.name.trim(),
      schoolId,
      updatedAt: now,
    };
    discounts.push(definition);
    return success(definition, 'Discount definition created.');
  },

  async updateDiscountDefinition(schoolId, id, input) {
    await mockDelay(90);
    const definition =
      discounts.find(item => item.id === id && item.schoolId === schoolId) ??
      fail('DISCOUNT_NOT_FOUND', 'Discount definition was not found.', 404);
    assertErrors(validateDiscount(input), 'Check discount details.');
    validateDiscountScope(schoolId, input, id);
    Object.assign(definition, clone(input), {
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      updatedAt: new Date().toISOString(),
    });
    return success(definition, 'Discount definition updated.');
  },

  async updateDiscountStatus(schoolId, id, status, force) {
    await mockDelay(80);
    refreshCounts();
    const definition =
      discounts.find(item => item.id === id && item.schoolId === schoolId) ??
      fail('DISCOUNT_NOT_FOUND', 'Discount definition was not found.', 404);
    if (
      status === 'INACTIVE' &&
      definition.activeAssignmentCount > 0 &&
      !force
    ) {
      fail(
        'DISCOUNT_IN_USE',
        'Active Student Fee Assignments use this discount. Confirm protected deactivation.',
      );
    }
    definition.status = status;
    return success(definition, 'Discount status updated.');
  },

  async getFineRules(schoolId, query = {}) {
    await mockDelay(70);
    assertSchool(schoolId);
    refreshCounts();
    const search = query.search?.trim().toLowerCase();
    return success(
      paginate(
        fineRules.filter(
          item =>
            item.schoolId === schoolId &&
            (!search ||
              item.name.toLowerCase().includes(search) ||
              item.code.toLowerCase().includes(search)) &&
            (!query.status ||
              query.status === 'ALL' ||
              item.status === query.status),
        ),
        query.page,
        query.pageSize,
      ),
    );
  },

  async getFineRule(schoolId, id) {
    await mockDelay(60);
    assertSchool(schoolId);
    refreshCounts();
    return success(
      fineRules.find(item => item.id === id && item.schoolId === schoolId) ??
        fail('FINE_RULE_NOT_FOUND', 'Fine Rule was not found.', 404),
    );
  },

  async createFineRule(schoolId, input) {
    await mockDelay(90);
    assertSchool(schoolId);
    assertErrors(validateFineRule(input), 'Check Fine Rule details.');
    uniqueFine(schoolId, input);
    sequence += 1;
    const now = new Date().toISOString();
    const rule: FineRule = {
      ...clone(input),
      activeUsageCount: 0,
      code: input.code.trim().toUpperCase(),
      createdAt: now,
      id: `fine-created-${sequence}`,
      name: input.name.trim(),
      schoolId,
      updatedAt: now,
    };
    fineRules.push(rule);
    return success(rule, 'Fine Rule created.');
  },

  async updateFineRule(schoolId, id, input) {
    await mockDelay(90);
    const rule =
      fineRules.find(item => item.id === id && item.schoolId === schoolId) ??
      fail('FINE_RULE_NOT_FOUND', 'Fine Rule was not found.', 404);
    assertErrors(validateFineRule(input), 'Check Fine Rule details.');
    uniqueFine(schoolId, input, id);
    Object.assign(rule, clone(input), {
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      updatedAt: new Date().toISOString(),
    });
    return success(rule, 'Fine Rule updated.');
  },

  async updateFineRuleStatus(schoolId, id, status) {
    await mockDelay(80);
    refreshCounts();
    const rule =
      fineRules.find(item => item.id === id && item.schoolId === schoolId) ??
      fail('FINE_RULE_NOT_FOUND', 'Fine Rule was not found.', 404);
    if (status === 'INACTIVE' && rule.activeUsageCount > 0) {
      fail(
        'FINE_RULE_IN_USE',
        'This Fine Rule is attached to active Fee Structure Items.',
      );
    }
    rule.status = status;
    return success(rule, 'Fine Rule status updated.');
  },

  async previewStudentPayable(schoolId, input: StudentPayablePreviewInput) {
    await mockDelay(70);
    const { enrollment } = feeEnrollment(
      schoolId,
      input.studentId,
      input.enrollmentId,
    );
    const structure = findStructure(
      schoolId,
      enrollment.branchId,
      enrollment.academicSessionId,
      input.feeStructureId,
    );
    return success(
      calculateEffectiveFee({
        discountAssignments: input.discountAssignments,
        discountDefinitions: discounts,
        fineRuleNames: structure.items
          .map(item => fineRules.find(rule => rule.id === item.fineRuleId)?.name)
          .filter((name): name is string => Boolean(name)),
        overrides: input.amountOverrides,
        selectedMonths: input.selectedMonths,
        selections: input.optionalItemSelections,
        structure,
      }),
    );
  },
};

function validateDiscountScope(
  schoolId: string,
  input: CreateDiscountDefinitionInput,
  excludedId?: string,
) {
  const code = input.code.trim().toUpperCase();
  if (
    discounts.some(
      item =>
        item.id !== excludedId &&
        item.schoolId === schoolId &&
        item.code.toUpperCase() === code,
    )
  ) {
    fail('DUPLICATE_DISCOUNT_CODE', 'Discount code already exists.');
  }
  if (
    input.applicableFeeHeadIds.some(
      id => !heads.some(item => item.id === id && item.schoolId === schoolId),
    )
  ) {
    fail('INVALID_DISCOUNT_FEE_HEAD', 'Discount Fee Head scope is invalid.');
  }
}

function uniqueFine(
  schoolId: string,
  input: CreateFineRuleInput,
  excludedId?: string,
) {
  if (
    fineRules.some(
      item =>
        item.id !== excludedId &&
        item.schoolId === schoolId &&
        item.code.toUpperCase() === input.code.trim().toUpperCase(),
    )
  ) {
    fail('DUPLICATE_FINE_CODE', 'Fine Rule code already exists.');
  }
}
