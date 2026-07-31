import type { ApiResponse, PaginatedResponse } from '../../models/common';
import type {
  CreateStudentAdmissionInput,
  GuardianDetails,
  GuardianInput,
  GuardianProfile,
  ParentAccessSummary,
  ParentStudentLink,
  StudentAccessSummary,
  StudentActivity,
  StudentCurrentEnrollment,
  StudentDetails,
  StudentEnrollment,
  StudentGuardianLink,
  StudentListItem,
  StudentListQuery,
  StudentMembershipSummary,
  StudentProfile,
  StudentStatusHistory,
  TransferStudentInput,
} from '../../models/student';
import type { AuthFixture } from '../auth/authFixtures';
import { SCHOOL_AUTH_FIXTURES } from '../auth/authFixtures';
import { ApiClientError } from '../api/apiError';
import { mockDelay } from '../mock/mockDelay';
import {
  INITIAL_ACADEMIC_CLASSES,
  INITIAL_SECTIONS,
} from '../academic/academicFixtures';
import {
  INITIAL_ACADEMIC_SESSIONS,
  INITIAL_BRANCHES,
  INITIAL_SCHOOLS,
} from '../organization/organizationFixtures';
import {
  validateAdmission,
  validateGuardianInput,
  validateStudentProfileInput,
  validateTransferInput,
} from '../../utils/studentValidation';
import {
  INITIAL_GUARDIANS,
  INITIAL_PARENT_STUDENT_LINKS,
  INITIAL_STUDENT_ENROLLMENTS,
  INITIAL_STUDENT_GUARDIAN_LINKS,
  INITIAL_STUDENT_PROFILES,
} from './studentFixtures';
import type { StudentService } from './studentService';

let profiles: StudentProfile[] = [];
let enrollments: StudentEnrollment[] = [];
let guardians: GuardianProfile[] = [];
let guardianLinks: StudentGuardianLink[] = [];
let parentLinks: ParentStudentLink[] = [];
let studentMemberships: StudentMembershipSummary[] = [];
let statusHistory: StudentStatusHistory[] = [];
let activity: StudentActivity[] = [];
let sequence = 500;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const BASE_AUTH_FIXTURES = clone(SCHOOL_AUTH_FIXTURES);

export function resetMockStudentData(): void {
  profiles = clone(INITIAL_STUDENT_PROFILES);
  enrollments = clone(INITIAL_STUDENT_ENROLLMENTS);
  guardians = clone(INITIAL_GUARDIANS);
  guardianLinks = clone(INITIAL_STUDENT_GUARDIAN_LINKS);
  parentLinks = clone(INITIAL_PARENT_STUDENT_LINKS);
  studentMemberships = [
    {
      membershipId: 'membership-student',
      mobile: '9876543217',
      status: 'ACTIVE',
      userId: 'user-student',
    },
  ];
  statusHistory = [];
  activity = [];
  sequence = 500;
  Object.keys(SCHOOL_AUTH_FIXTURES).forEach(key => {
    delete SCHOOL_AUTH_FIXTURES[key];
  });
  Object.assign(SCHOOL_AUTH_FIXTURES, clone(BASE_AUTH_FIXTURES));
}

export function getMockStudentRepositorySnapshot() {
  return clone({
    activity,
    enrollments,
    guardianLinks,
    guardians,
    parentLinks,
    profiles,
    statusHistory,
    studentMemberships,
  });
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

function assertSchool(schoolId: string): void {
  if (!INITIAL_SCHOOLS.some(item => item.id === schoolId)) {
    fail('SCHOOL_NOT_FOUND', 'School could not be found.', 404);
  }
}

function findProfile(schoolId: string, studentId: string): StudentProfile {
  assertSchool(schoolId);
  return (
    profiles.find(
      item => item.id === studentId && item.schoolId === schoolId,
    ) ??
    fail(
      'STUDENT_NOT_FOUND',
      'Student could not be found in this school.',
      404,
    )
  );
}

function activeEnrollment(studentId: string): StudentEnrollment | undefined {
  return enrollments.find(
    item => item.studentId === studentId && item.status === 'ACTIVE',
  );
}

function enrichEnrollment(
  enrollment: StudentEnrollment,
): StudentCurrentEnrollment {
  const branch = INITIAL_BRANCHES.find(item => item.id === enrollment.branchId);
  const session = INITIAL_ACADEMIC_SESSIONS.find(
    item => item.id === enrollment.academicSessionId,
  );
  const academicClass = INITIAL_ACADEMIC_CLASSES.find(
    item => item.id === enrollment.classId,
  );
  const section = INITIAL_SECTIONS.find(
    item => item.id === enrollment.sectionId,
  );
  if (!branch || !session || !academicClass || !section) {
    return fail(
      'INVALID_ENROLLMENT_CONTEXT',
      'Enrollment references invalid academic setup.',
      409,
    );
  }
  return {
    ...enrollment,
    academicSessionName: session.name,
    branchName: branch.name,
    className: academicClass.name,
    sectionName: section.name,
  };
}

function guardianDetails(
  studentId: string,
  guardianId: string,
): GuardianDetails {
  const guardian =
    guardians.find(item => item.id === guardianId) ??
    fail('GUARDIAN_NOT_FOUND', 'Guardian could not be found.', 404);
  const link =
    guardianLinks.find(
      item =>
        item.studentId === studentId &&
        item.guardianId === guardianId &&
        item.status === 'ACTIVE',
    ) ??
    fail(
      'GUARDIAN_LINK_NOT_FOUND',
      'Guardian is not linked to this student.',
      404,
    );
  return {
    ...guardian,
    link,
    linkedChildrenCount: guardianLinks.filter(
      item => item.guardianId === guardianId && item.status === 'ACTIVE',
    ).length,
  };
}

function getGuardians(studentId: string): GuardianDetails[] {
  return guardianLinks
    .filter(item => item.studentId === studentId && item.status === 'ACTIVE')
    .map(item => guardianDetails(studentId, item.guardianId));
}

function parentAccess(studentId: string): ParentAccessSummary[] {
  return parentLinks
    .filter(item => item.studentId === studentId && item.status === 'ACTIVE')
    .map(link => {
      const guardian =
        guardians.find(item => item.id === link.guardianId) ??
        fail('GUARDIAN_NOT_FOUND', 'Guardian could not be found.', 404);
      return {
        guardianId: guardian.id,
        guardianName: guardian.fullName,
        linkedStudentIds: parentLinks
          .filter(
            item =>
              item.parentMembershipId === link.parentMembershipId &&
              item.status === 'ACTIVE',
          )
          .map(item => item.studentId),
        membershipId: link.parentMembershipId,
        mobile: guardian.mobile,
        status: 'ACTIVE',
        userId: guardian.userId ?? '',
      };
    });
}

function getAccess(studentId: string): StudentAccessSummary {
  return {
    parentMemberships: parentAccess(studentId),
    studentMembership: studentMemberships.find(item => {
      const fixture = Object.values(SCHOOL_AUTH_FIXTURES).find(candidate =>
        candidate.memberships.some(
          membership =>
            membership.id === item.membershipId &&
            membership.studentId === studentId,
        ),
      );
      return Boolean(fixture);
    }),
  };
}

function details(profile: StudentProfile): StudentDetails {
  const current = activeEnrollment(profile.id);
  const studentEnrollments = enrollments.filter(
    item => item.studentId === profile.id,
  );
  return {
    access: getAccess(profile.id),
    currentEnrollment: current ? enrichEnrollment(current) : undefined,
    enrollmentCount: studentEnrollments.length,
    guardians: getGuardians(profile.id),
    lastTransfer: studentEnrollments
      .filter(item => item.status === 'TRANSFERRED')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0],
    profile,
    statusHistory: statusHistory.filter(item => item.studentId === profile.id),
  };
}

function listItem(profile: StudentProfile): StudentListItem {
  const current = activeEnrollment(profile.id);
  return {
    currentEnrollment: current ? enrichEnrollment(current) : undefined,
    primaryGuardian: getGuardians(profile.id).find(
      item => item.link.isPrimaryContact,
    ),
    profile,
  };
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

function assertValidation(errors: Record<string, string>, message: string) {
  if (Object.keys(errors).length) {
    fail('VALIDATION_ERROR', message, 400, errors);
  }
}

function normalizeMobile(value: string): string {
  return value.replace(/\D/g, '').slice(-10);
}

function validateEnrollment(
  schoolId: string,
  input: {
    branchId: string;
    academicSessionId: string;
    classId: string;
    sectionId: string;
    rollNumber?: string;
  },
  excludedStudentId?: string,
): void {
  const branch = INITIAL_BRANCHES.find(item => item.id === input.branchId);
  if (
    !branch ||
    branch.schoolId !== schoolId ||
    branch.status !== 'ACTIVE'
  ) {
    fail('INVALID_BRANCH', 'Select an active branch in this school.', 409);
  }
  const session = INITIAL_ACADEMIC_SESSIONS.find(
    item => item.id === input.academicSessionId,
  );
  if (!session || session.schoolId !== schoolId) {
    fail('INVALID_ACADEMIC_SESSION', 'Select a session in this school.', 409);
  }
  if (session.status === 'CLOSED') {
    fail(
      'ACADEMIC_SESSION_CLOSED',
      'Closed sessions are strictly read-only.',
      409,
    );
  }
  const academicClass = INITIAL_ACADEMIC_CLASSES.find(
    item =>
      item.id === input.classId &&
      item.schoolId === schoolId &&
      item.branchId === input.branchId &&
      item.academicSessionId === input.academicSessionId,
  );
  if (!academicClass || academicClass.status !== 'ACTIVE') {
    fail(
      'INVALID_CLASS',
      'Select an active class in the branch and session.',
      409,
    );
  }
  const section = INITIAL_SECTIONS.find(
    item =>
      item.id === input.sectionId &&
      item.classId === input.classId &&
      item.status === 'ACTIVE',
  );
  if (!section) {
    fail('INVALID_SECTION', 'Select an active section in this class.', 409);
  }
  if (
    input.rollNumber &&
    enrollments.some(
      item =>
        item.studentId !== excludedStudentId &&
        item.status === 'ACTIVE' &&
        item.branchId === input.branchId &&
        item.academicSessionId === input.academicSessionId &&
        item.classId === input.classId &&
        item.sectionId === input.sectionId &&
        item.rollNumber?.toLowerCase() === input.rollNumber?.toLowerCase(),
    )
  ) {
    fail(
      'DUPLICATE_ROLL_NUMBER',
      'Roll number is already used in this section.',
      409,
      { rollNumber: 'This roll number is already in use.' },
    );
  }
}

function fixtureByMobile(mobile: string): AuthFixture | undefined {
  return SCHOOL_AUTH_FIXTURES[normalizeMobile(mobile)];
}

function ensureParentAccess(
  schoolId: string,
  studentId: string,
  guardian: GuardianProfile,
): ParentAccessSummary {
  let fixture = fixtureByMobile(guardian.mobile);
  const now = new Date().toISOString();
  if (!fixture) {
    sequence += 1;
    fixture = {
      key: `parent-${sequence}`,
      memberships: [],
      user: {
        email: guardian.email,
        id: `user-parent-${sequence}`,
        mobile: normalizeMobile(guardian.mobile),
        name: guardian.fullName,
        status: 'ACTIVE',
      },
    };
    SCHOOL_AUTH_FIXTURES[normalizeMobile(guardian.mobile)] = fixture;
  }
  guardian.userId = fixture.user.id;
  let membership = fixture.memberships.find(
    item => item.schoolId === schoolId && item.role === 'PARENT',
  );
  if (!membership) {
    sequence += 1;
    const school = INITIAL_SCHOOLS.find(item => item.id === schoolId)!;
    membership = {
      id: `membership-parent-${sequence}`,
      role: 'PARENT',
      schoolCode: school.code,
      schoolId,
      schoolName: school.name,
      status: 'ACTIVE',
      userId: fixture.user.id,
    };
    fixture.memberships.push(membership);
  }
  membership.status = 'ACTIVE';
  let link = parentLinks.find(
    item =>
      item.parentMembershipId === membership!.id &&
      item.studentId === studentId,
  );
  if (!link) {
    sequence += 1;
    link = {
      createdAt: now,
      guardianId: guardian.id,
      id: `parent-link-${sequence}`,
      parentMembershipId: membership.id,
      schoolId,
      status: 'ACTIVE',
      studentId,
    };
    parentLinks.push(link);
  } else {
    link.status = 'ACTIVE';
  }
  return {
    guardianId: guardian.id,
    guardianName: guardian.fullName,
    linkedStudentIds: parentLinks
      .filter(
        item =>
          item.parentMembershipId === membership!.id &&
          item.status === 'ACTIVE',
      )
      .map(item => item.studentId),
    membershipId: membership.id,
    mobile: guardian.mobile,
    status: 'ACTIVE',
    userId: fixture.user.id,
  };
}

function ensureStudentAccess(profile: StudentProfile): StudentMembershipSummary {
  if (!profile.mobile) {
    return fail(
      'STUDENT_MOBILE_REQUIRED',
      'A unique personal mobile is required for Student App access.',
      409,
    );
  }
  const mobile = normalizeMobile(profile.mobile);
  let fixture = fixtureByMobile(mobile);
  if (
    fixture &&
    !fixture.memberships.some(
      item => item.role === 'STUDENT' && item.studentId === profile.id,
    )
  ) {
    fail(
      'INCOMPATIBLE_STUDENT_IDENTITY',
      'This mobile belongs to an incompatible account.',
      409,
    );
  }
  if (!fixture) {
    sequence += 1;
    fixture = {
      key: `student-${sequence}`,
      memberships: [],
      user: {
        email: profile.email,
        id: `user-student-${sequence}`,
        mobile,
        name: profile.fullName,
        status: 'ACTIVE',
      },
    };
    SCHOOL_AUTH_FIXTURES[mobile] = fixture;
  }
  let membership = fixture.memberships.find(
    item => item.role === 'STUDENT' && item.studentId === profile.id,
  );
  if (!membership) {
    sequence += 1;
    const school = INITIAL_SCHOOLS.find(item => item.id === profile.schoolId)!;
    membership = {
      id: `membership-student-${sequence}`,
      role: 'STUDENT',
      schoolCode: school.code,
      schoolId: profile.schoolId,
      schoolName: school.name,
      status: 'ACTIVE',
      studentId: profile.id,
      studentName: profile.fullName,
      userId: fixture.user.id,
    };
    fixture.memberships.push(membership);
  }
  const summary = {
    membershipId: membership.id,
    mobile,
    status: 'ACTIVE' as const,
    userId: fixture.user.id,
  };
  const existing = studentMemberships.find(
    item => item.membershipId === membership!.id,
  );
  if (existing) Object.assign(existing, summary);
  else studentMemberships.push(summary);
  return summary;
}

function record(
  schoolId: string,
  studentId: string,
  actionName: StudentActivity['action'],
  description: string,
): void {
  sequence += 1;
  activity.unshift({
    action: actionName,
    description,
    id: `student-activity-${sequence}`,
    performedAt: new Date().toISOString(),
    performedBy: 'Current administrator',
    schoolId,
    studentId,
  });
}

resetMockStudentData();

export const mockStudentService: StudentService = {
  async getStudents(schoolId, query: StudentListQuery) {
    await mockDelay(100);
    assertSchool(schoolId);
    const search = query.search?.trim().toLowerCase();
    const items = profiles
      .filter(item => item.schoolId === schoolId)
      .map(listItem)
      .filter(item => {
        const enrollment = item.currentEnrollment;
        return (
          (!search ||
            item.profile.fullName.toLowerCase().includes(search) ||
            item.profile.admissionNumber.toLowerCase().includes(search) ||
            enrollment?.rollNumber?.toLowerCase().includes(search) ||
            item.primaryGuardian?.mobile.includes(search)) &&
          (!query.branchId ||
            query.branchId === 'ALL' ||
            enrollment?.branchId === query.branchId) &&
          (!query.academicSessionId ||
            query.academicSessionId === 'ALL' ||
            enrollment?.academicSessionId === query.academicSessionId) &&
          (!query.classId ||
            query.classId === 'ALL' ||
            enrollment?.classId === query.classId) &&
          (!query.sectionId ||
            query.sectionId === 'ALL' ||
            enrollment?.sectionId === query.sectionId) &&
          (!query.studentStatus ||
            query.studentStatus === 'ALL' ||
            item.profile.status === query.studentStatus) &&
          (!query.enrollmentStatus ||
            query.enrollmentStatus === 'ALL' ||
            enrollment?.status === query.enrollmentStatus)
        );
      })
      .sort((a, b) => a.profile.fullName.localeCompare(b.profile.fullName));
    return success(paginate(items, query.page, query.pageSize));
  },

  async getStudent(schoolId, studentId) {
    await mockDelay(80);
    return success(details(findProfile(schoolId, studentId)));
  },

  async createStudentAdmission(schoolId, input: CreateStudentAdmissionInput) {
    await mockDelay(160);
    assertSchool(schoolId);
    assertValidation(validateAdmission(input), 'Check the admission details.');
    validateEnrollment(schoolId, input.enrollment);
    if (
      profiles.some(
        item =>
          item.schoolId === schoolId &&
          item.fullName.trim().toLowerCase() ===
            input.profile.fullName.trim().toLowerCase() &&
          item.dateOfBirth === input.profile.dateOfBirth,
      )
    ) {
      fail(
        'DUPLICATE_ADMISSION',
        'A student with this name and date of birth already exists.',
        409,
      );
    }
    if (
      input.profile.mobile &&
      profiles.some(
        item =>
          item.schoolId === schoolId &&
          item.mobile &&
          normalizeMobile(item.mobile) === normalizeMobile(input.profile.mobile!),
      )
    ) {
      fail(
        'DUPLICATE_STUDENT_MOBILE',
        'This student mobile is already in use.',
        409,
      );
    }
    if (input.enableStudentAppAccess) {
      if (!input.profile.mobile) {
        fail(
          'STUDENT_MOBILE_REQUIRED',
          'Student App access requires a personal mobile.',
          409,
        );
      }
      const fixture = fixtureByMobile(input.profile.mobile!);
      if (fixture) {
        fail(
          'INCOMPATIBLE_STUDENT_IDENTITY',
          'This mobile belongs to an existing account.',
          409,
        );
      }
    }

    const now = new Date().toISOString();
    sequence += 1;
    const school = INITIAL_SCHOOLS.find(item => item.id === schoolId)!;
    const nextAdmission =
      profiles.filter(item => item.schoolId === schoolId).length + 1;
    const profile: StudentProfile = {
      ...clone(input.profile),
      admissionNumber: `${school.code.replace(/\d/g, '')}-${new Date(
        input.profile.admissionDate,
      ).getFullYear()}-${String(nextAdmission).padStart(4, '0')}`,
      createdAt: now,
      fullName: input.profile.fullName.trim(),
      id: `student-created-${sequence}`,
      mobile: input.profile.mobile
        ? normalizeMobile(input.profile.mobile)
        : undefined,
      schoolId,
      status: 'ACTIVE',
      updatedAt: now,
    };
    const enrollment: StudentEnrollment = {
      ...clone(input.enrollment),
      createdAt: now,
      id: `enrollment-created-${sequence}`,
      schoolId,
      startDate: input.profile.admissionDate,
      status: 'ACTIVE',
      studentId: profile.id,
      updatedAt: now,
    };

    profiles.push(profile);
    enrollments.push(enrollment);
    record(
      schoolId,
      profile.id,
      'ENROLLMENT_CREATED',
      'Initial enrollment created.',
    );
    input.guardians.forEach(guardianInput => {
      const mobile = normalizeMobile(guardianInput.mobile);
      let guardian = guardians.find(
        item =>
          item.schoolId === schoolId &&
          normalizeMobile(item.mobile) === mobile,
      );
      if (!guardian) {
        sequence += 1;
        guardian = {
          ...clone(guardianInput),
          createdAt: now,
          fullName: guardianInput.fullName.trim(),
          id: `guardian-created-${sequence}`,
          mobile,
          schoolId,
          updatedAt: now,
        };
        guardians.push(guardian);
      }
      sequence += 1;
      guardianLinks.push({
        createdAt: now,
        guardianId: guardian.id,
        id: `student-guardian-created-${sequence}`,
        isEmergencyContact: guardianInput.isEmergencyContact,
        isFeeContact: guardianInput.isFeeContact,
        isPrimaryContact: guardianInput.isPrimaryContact,
        parentAppAccessEnabled: guardianInput.parentAppAccessEnabled,
        status: 'ACTIVE',
        studentId: profile.id,
        updatedAt: now,
        whatsappEnabled: guardianInput.whatsappEnabled,
      });
      if (guardianInput.parentAppAccessEnabled) {
        ensureParentAccess(schoolId, profile.id, guardian);
      }
      record(schoolId, profile.id, 'GUARDIAN_LINKED', 'Guardian linked.');
      if (guardianInput.isPrimaryContact) {
        record(
          schoolId,
          profile.id,
          'PRIMARY_GUARDIAN_CHANGED',
          'Primary guardian assigned.',
        );
      }
      if (guardianInput.isFeeContact) {
        record(
          schoolId,
          profile.id,
          'FEE_CONTACT_CHANGED',
          'Fee contact assigned.',
        );
      }
    });
    if (input.enableStudentAppAccess) ensureStudentAccess(profile);
    record(schoolId, profile.id, 'STUDENT_ADMITTED', 'Student admitted.');
    return success(
      {
        access: getAccess(profile.id),
        activeEnrollment: enrichEnrollment(enrollment),
        guardianLinks: getGuardians(profile.id),
        profile,
      },
      'Student admission completed.',
    );
  },

  async updateStudentProfile(schoolId, studentId, input) {
    await mockDelay(100);
    const profile = findProfile(schoolId, studentId);
    assertValidation(
      validateStudentProfileInput({
        ...input,
        admissionDate: profile.admissionDate,
      }),
      'Check the student details.',
    );
    if (
      input.mobile &&
      profiles.some(
        item =>
          item.id !== studentId &&
          item.schoolId === schoolId &&
          item.mobile &&
          normalizeMobile(item.mobile) === normalizeMobile(input.mobile!),
      )
    ) {
      fail('DUPLICATE_STUDENT_MOBILE', 'Student mobile is already used.', 409);
    }
    Object.assign(profile, clone(input), {
      fullName: input.fullName.trim(),
      mobile: input.mobile ? normalizeMobile(input.mobile) : undefined,
      updatedAt: new Date().toISOString(),
    });
    record(schoolId, studentId, 'STUDENT_PROFILE_UPDATED', 'Profile updated.');
    return success(profile, 'Student profile updated.');
  },

  async updateStudentStatus(schoolId, studentId, input) {
    await mockDelay(100);
    const profile = findProfile(schoolId, studentId);
    if (!input.reason.trim() && input.status !== 'ACTIVE') {
      fail('STATUS_REASON_REQUIRED', 'A status reason is required.', 400);
    }
    if (
      ['WITHDRAWN', 'PASSED_OUT'].includes(profile.status) &&
      input.status === 'ACTIVE'
    ) {
      fail(
        'UNSUPPORTED_REACTIVATION',
        'Withdrawn and passed-out students cannot be reactivated here.',
        409,
      );
    }
    const previous = profile.status;
    profile.status = input.status;
    profile.updatedAt = new Date().toISOString();
    const current = activeEnrollment(studentId);
    if (current && input.status === 'WITHDRAWN') {
      current.status = 'CANCELLED';
      current.endDate = new Date().toISOString().slice(0, 10);
      const summary = studentMemberships.find(item => {
        const fixture = Object.values(SCHOOL_AUTH_FIXTURES).find(candidate =>
          candidate.memberships.some(
            membership =>
              membership.id === item.membershipId &&
              membership.studentId === studentId,
          ),
        );
        return Boolean(fixture);
      });
      if (summary) {
        summary.status = 'INACTIVE';
        Object.values(SCHOOL_AUTH_FIXTURES).forEach(fixture =>
          fixture.memberships
            .filter(item => item.id === summary.membershipId)
            .forEach(item => {
              item.status = 'INACTIVE';
            }),
        );
      }
    }
    if (current && input.status === 'PASSED_OUT') {
      current.status = 'COMPLETED';
      current.endDate = new Date().toISOString().slice(0, 10);
    }
    sequence += 1;
    statusHistory.unshift({
      changedAt: profile.updatedAt,
      fromStatus: previous,
      id: `student-status-${sequence}`,
      reason: input.reason,
      studentId,
      toStatus: input.status,
    });
    record(schoolId, studentId, 'STUDENT_STATUS_CHANGED', 'Status changed.');
    return success(details(profile), 'Student status updated.');
  },

  async getStudentGuardians(schoolId, studentId) {
    await mockDelay(70);
    findProfile(schoolId, studentId);
    return success(getGuardians(studentId));
  },

  async addStudentGuardian(schoolId, studentId, input: GuardianInput) {
    await mockDelay(100);
    findProfile(schoolId, studentId);
    assertValidation(validateGuardianInput(input), 'Check guardian details.');
    const mobile = normalizeMobile(input.mobile);
    let guardian = guardians.find(
      item =>
        item.schoolId === schoolId &&
        normalizeMobile(item.mobile) === mobile,
    );
    const now = new Date().toISOString();
    if (!guardian) {
      sequence += 1;
      guardian = {
        ...clone(input),
        createdAt: now,
        id: `guardian-created-${sequence}`,
        mobile,
        schoolId,
        updatedAt: now,
      };
      guardians.push(guardian);
    }
    if (
      guardianLinks.some(
        item =>
          item.studentId === studentId &&
          item.guardianId === guardian!.id &&
          item.status === 'ACTIVE',
      )
    ) {
      fail('DUPLICATE_GUARDIAN_LINK', 'Guardian is already linked.', 409);
    }
    if (input.isPrimaryContact) {
      guardianLinks
        .filter(item => item.studentId === studentId)
        .forEach(item => {
          item.isPrimaryContact = false;
        });
    }
    if (input.isFeeContact) {
      guardianLinks
        .filter(item => item.studentId === studentId)
        .forEach(item => {
          item.isFeeContact = false;
        });
    }
    sequence += 1;
    guardianLinks.push({
      createdAt: now,
      guardianId: guardian.id,
      id: `student-guardian-created-${sequence}`,
      isEmergencyContact: input.isEmergencyContact,
      isFeeContact: input.isFeeContact,
      isPrimaryContact: input.isPrimaryContact,
      parentAppAccessEnabled: input.parentAppAccessEnabled,
      status: 'ACTIVE',
      studentId,
      updatedAt: now,
      whatsappEnabled: input.whatsappEnabled,
    });
    if (input.parentAppAccessEnabled) {
      ensureParentAccess(schoolId, studentId, guardian);
    }
    record(schoolId, studentId, 'GUARDIAN_LINKED', 'Guardian linked.');
    if (input.isPrimaryContact) {
      record(
        schoolId,
        studentId,
        'PRIMARY_GUARDIAN_CHANGED',
        'Primary guardian changed.',
      );
    }
    if (input.isFeeContact) {
      record(
        schoolId,
        studentId,
        'FEE_CONTACT_CHANGED',
        'Fee contact changed.',
      );
    }
    return success(guardianDetails(studentId, guardian.id), 'Guardian linked.');
  },

  async updateStudentGuardian(schoolId, studentId, guardianId, input) {
    await mockDelay(100);
    findProfile(schoolId, studentId);
    assertValidation(validateGuardianInput(input), 'Check guardian details.');
    const current = guardianDetails(studentId, guardianId);
    const primaryChanged =
      input.isPrimaryContact !== current.link.isPrimaryContact;
    const feeContactChanged =
      input.isFeeContact !== current.link.isFeeContact;
    if (input.isPrimaryContact) {
      guardianLinks
        .filter(item => item.studentId === studentId)
        .forEach(item => {
          item.isPrimaryContact = item.guardianId === guardianId;
        });
    } else if (current.link.isPrimaryContact) {
      fail(
        'PRIMARY_GUARDIAN_REQUIRED',
        'Select another primary guardian first.',
        409,
      );
    }
    if (input.isFeeContact) {
      guardianLinks
        .filter(item => item.studentId === studentId)
        .forEach(item => {
          item.isFeeContact = item.guardianId === guardianId;
        });
    } else if (current.link.isFeeContact) {
      fail('FEE_CONTACT_REQUIRED', 'Select another fee contact first.', 409);
    }
    const profile = guardians.find(item => item.id === guardianId)!;
    Object.assign(profile, clone(input), {
      mobile: normalizeMobile(input.mobile),
      updatedAt: new Date().toISOString(),
    });
    Object.assign(current.link, {
      isEmergencyContact: input.isEmergencyContact,
      isFeeContact: input.isFeeContact,
      isPrimaryContact: input.isPrimaryContact,
      parentAppAccessEnabled: input.parentAppAccessEnabled,
      whatsappEnabled: input.whatsappEnabled,
    });
    if (input.parentAppAccessEnabled) {
      ensureParentAccess(schoolId, studentId, profile);
    }
    record(schoolId, studentId, 'GUARDIAN_UPDATED', 'Guardian updated.');
    if (primaryChanged) {
      record(
        schoolId,
        studentId,
        'PRIMARY_GUARDIAN_CHANGED',
        'Primary guardian changed.',
      );
    }
    if (feeContactChanged) {
      record(
        schoolId,
        studentId,
        'FEE_CONTACT_CHANGED',
        'Fee contact changed.',
      );
    }
    return success(guardianDetails(studentId, guardianId), 'Guardian updated.');
  },

  async unlinkStudentGuardian(schoolId, studentId, guardianId) {
    await mockDelay(90);
    findProfile(schoolId, studentId);
    const links = guardianLinks.filter(
      item => item.studentId === studentId && item.status === 'ACTIVE',
    );
    const link =
      links.find(item => item.guardianId === guardianId) ??
      fail('GUARDIAN_LINK_NOT_FOUND', 'Guardian link not found.', 404);
    if (links.length === 1) {
      fail(
        'FINAL_GUARDIAN_PROTECTED',
        'A student must retain at least one active guardian.',
        409,
      );
    }
    if (link.isPrimaryContact) {
      fail(
        'PRIMARY_GUARDIAN_PROTECTED',
        'Select another primary guardian before unlinking.',
        409,
      );
    }
    link.status = 'INACTIVE';
    parentLinks
      .filter(
        item =>
          item.studentId === studentId && item.guardianId === guardianId,
      )
      .forEach(item => {
        item.status = 'INACTIVE';
      });
    record(schoolId, studentId, 'GUARDIAN_UNLINKED', 'Guardian unlinked.');
    return success(
      guardianLinks.filter(item => item.studentId === studentId),
      'Guardian unlinked with history preserved.',
    );
  },

  async getEnrollmentHistory(schoolId, studentId) {
    await mockDelay(70);
    findProfile(schoolId, studentId);
    return success(
      enrollments
        .filter(item => item.studentId === studentId)
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    );
  },

  async transferStudent(schoolId, studentId, input: TransferStudentInput) {
    await mockDelay(130);
    assertValidation(validateTransferInput(input), 'Check transfer details.');
    const profile = findProfile(schoolId, studentId);
    if (profile.status !== 'ACTIVE') {
      fail('STUDENT_NOT_ACTIVE', 'Only active students can transfer.', 409);
    }
    const current =
      activeEnrollment(studentId) ??
      fail('ACTIVE_ENROLLMENT_NOT_FOUND', 'No active enrollment found.', 409);
    if (input.academicSessionId !== current.academicSessionId) {
      fail(
        'SESSION_TRANSFER_NOT_SUPPORTED',
        'Transfer must remain in the same session.',
        409,
      );
    }
    if (
      input.allowedBranchIds &&
      (!input.allowedBranchIds.includes(current.branchId) ||
        !input.allowedBranchIds.includes(input.branchId))
    ) {
      fail(
        'CROSS_BRANCH_ACCESS_DENIED',
        'Access to both branches is required.',
        403,
      );
    }
    validateEnrollment(schoolId, input, studentId);
    if (
      current.branchId === input.branchId &&
      current.classId === input.classId &&
      current.sectionId === input.sectionId
    ) {
      fail(
        'IDENTICAL_TRANSFER_DESTINATION',
        'Choose a different class or section.',
        409,
      );
    }
    const now = new Date().toISOString();
    current.status = 'TRANSFERRED';
    current.endDate = input.effectiveDate;
    current.transferReason = input.reason;
    current.transferType = input.type;
    current.updatedAt = now;
    sequence += 1;
    const next: StudentEnrollment = {
      academicSessionId: current.academicSessionId,
      branchId: input.branchId,
      classId: input.classId,
      createdAt: now,
      id: `enrollment-transfer-${sequence}`,
      rollNumber: input.rollNumber,
      schoolId,
      sectionId: input.sectionId,
      startDate: input.effectiveDate,
      status: 'ACTIVE',
      studentId,
      updatedAt: now,
    };
    enrollments.push(next);
    record(
      schoolId,
      studentId,
      'ENROLLMENT_CREATED',
      'Transfer enrollment created.',
    );
    record(schoolId, studentId, 'STUDENT_TRANSFERRED', 'Student transferred.');
    return success(
      {
        activeEnrollment: enrichEnrollment(next),
        previousEnrollment: current,
      },
      'Student transferred.',
    );
  },

  async getStudentAccess(schoolId, studentId) {
    await mockDelay(70);
    findProfile(schoolId, studentId);
    return success(getAccess(studentId));
  },

  async updateParentAccess(schoolId, studentId, guardianId, input) {
    await mockDelay(90);
    findProfile(schoolId, studentId);
    const guardian = guardianDetails(studentId, guardianId);
    guardian.link.parentAppAccessEnabled = input.enabled;
    if (input.enabled) {
      ensureParentAccess(schoolId, studentId, guardian);
    } else {
      const affectedMembershipIds = new Set(
        parentLinks
          .filter(
            item =>
              item.studentId === studentId &&
              item.guardianId === guardianId,
          )
          .map(item => item.parentMembershipId),
      );
      parentLinks
        .filter(
          item =>
            item.studentId === studentId &&
            item.guardianId === guardianId,
        )
        .forEach(item => {
          item.status = 'INACTIVE';
        });
      affectedMembershipIds.forEach(membershipId => {
        const stillLinked = parentLinks.some(
          item =>
            item.parentMembershipId === membershipId &&
            item.status === 'ACTIVE',
        );
        if (!stillLinked) {
          Object.values(SCHOOL_AUTH_FIXTURES).forEach(fixture =>
            fixture.memberships
              .filter(item => item.id === membershipId)
              .forEach(item => {
                item.status = 'INACTIVE';
              }),
          );
        }
      });
    }
    record(
      schoolId,
      studentId,
      input.enabled ? 'PARENT_ACCESS_ENABLED' : 'PARENT_ACCESS_DISABLED',
      `Parent access ${input.enabled ? 'enabled' : 'disabled'}.`,
    );
    return success(getAccess(studentId), 'Parent access updated.');
  },

  async updateStudentAppAccess(schoolId, studentId, input) {
    await mockDelay(90);
    const profile = findProfile(schoolId, studentId);
    if (input.enabled) {
      ensureStudentAccess(profile);
    } else {
      const summary = getAccess(studentId).studentMembership;
      if (summary) {
        summary.status = 'INACTIVE';
        Object.values(SCHOOL_AUTH_FIXTURES).forEach(fixture =>
          fixture.memberships
            .filter(item => item.id === summary.membershipId)
            .forEach(item => {
              item.status = 'INACTIVE';
            }),
        );
      }
    }
    record(
      schoolId,
      studentId,
      input.enabled ? 'STUDENT_ACCESS_ENABLED' : 'STUDENT_ACCESS_DISABLED',
      `Student access ${input.enabled ? 'enabled' : 'disabled'}.`,
    );
    return success(getAccess(studentId), 'Student access updated.');
  },

  async getParentChildren(schoolId, parentMembershipId) {
    await mockDelay(80);
    assertSchool(schoolId);
    const links = parentLinks.filter(
      item =>
        item.schoolId === schoolId &&
        item.parentMembershipId === parentMembershipId &&
        item.status === 'ACTIVE',
    );
    return success(
      links.map(link => listItem(findProfile(schoolId, link.studentId))),
    );
  },

  async getParentChild(schoolId, parentMembershipId, studentId) {
    await mockDelay(70);
    const linked = parentLinks.some(
      item =>
        item.schoolId === schoolId &&
        item.parentMembershipId === parentMembershipId &&
        item.studentId === studentId &&
        item.status === 'ACTIVE',
    );
    if (!linked) {
      fail(
        'PARENT_CHILD_ACCESS_DENIED',
        'This child is not linked to the active Parent membership.',
        403,
      );
    }
    return success(details(findProfile(schoolId, studentId)));
  },

  async getStudentSelfProfile(schoolId, studentMembershipId) {
    await mockDelay(70);
    const membership = Object.values(SCHOOL_AUTH_FIXTURES)
      .flatMap(fixture => fixture.memberships)
      .find(
        item =>
          item.id === studentMembershipId &&
          item.schoolId === schoolId &&
          item.role === 'STUDENT',
      );
    if (!membership?.studentId) {
      fail(
        'STUDENT_SELF_ACCESS_DENIED',
        'The active membership is not linked to a student profile.',
        403,
      );
    }
    return success(details(findProfile(schoolId, membership.studentId)));
  },
};
