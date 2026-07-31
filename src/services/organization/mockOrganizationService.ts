import type { ApiResponse, PaginatedResponse } from '../../models/common';
import type {
  AcademicSession,
  Branch,
  BranchListQuery,
  CreateAcademicSessionInput,
  CreateBranchInput,
  CreateSchoolInput,
  CreateSchoolResult,
  School,
  SchoolListQuery,
  SchoolSettings,
} from '../../models/organization';
import {
  doDateRangesOverlap,
  getAcademicYearForDate,
} from '../../utils/academicSession';
import { ApiClientError } from '../api/apiError';
import { mockDelay } from '../mock/mockDelay';
import {
  INITIAL_ACADEMIC_SESSIONS,
  INITIAL_BRANCHES,
  INITIAL_SCHOOLS,
  INITIAL_SCHOOL_SETTINGS,
} from './organizationFixtures';
import type { OrganizationService } from './organizationService';

let schools: School[] = [];
let branches: Branch[] = [];
let sessions: AcademicSession[] = [];
let settings: SchoolSettings[] = [];
let sequence = 100;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function resetMockOrganizationData(): void {
  schools = clone(INITIAL_SCHOOLS);
  branches = clone(INITIAL_BRANCHES);
  sessions = clone(INITIAL_ACADEMIC_SESSIONS);
  settings = clone(INITIAL_SCHOOL_SETTINGS);
  sequence = 100;
}

export function getMockOrganizationRepositorySnapshot() {
  return clone({ branches, schools, sessions, settings });
}

resetMockOrganizationData();

function success<T>(data: T, message = 'Success'): ApiResponse<T> {
  return { data: clone(data), message, success: true };
}

function notFound(entity: string): never {
  throw new ApiClientError({
    code: `${entity.toUpperCase()}_NOT_FOUND`,
    message: `${entity} could not be found.`,
    status: 404,
  });
}

function findSchool(schoolId: string): School {
  return schools.find(item => item.id === schoolId) ?? notFound('School');
}

function syncSchoolSummary(schoolId: string): School {
  const school = findSchool(schoolId);
  const schoolBranches = branches.filter(item => item.schoolId === schoolId);
  const activeSession = sessions.find(
    item => item.schoolId === schoolId && item.status === 'ACTIVE',
  );
  school.branchCount = schoolBranches.length;
  school.activeBranchCount = schoolBranches.filter(
    item => item.status === 'ACTIVE',
  ).length;
  school.activeSession = activeSession
    ? {
        endDate: activeSession.endDate,
        id: activeSession.id,
        name: activeSession.name,
        startDate: activeSession.startDate,
      }
    : undefined;
  school.updatedAt = new Date().toISOString();
  return school;
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

function validateSessionInput(
  schoolId: string,
  input: CreateAcademicSessionInput,
  excludedId?: string,
): void {
  if (input.endDate <= input.startDate) {
    throw new ApiClientError({
      code: 'INVALID_DATE_RANGE',
      fieldErrors: { endDate: 'End date must be after start date.' },
      message: 'Check the academic session dates.',
      status: 400,
    });
  }
  const schoolSessions = sessions.filter(
    item => item.schoolId === schoolId && item.id !== excludedId,
  );
  if (
    schoolSessions.some(
      item => item.name.toUpperCase() === input.name.trim().toUpperCase(),
    )
  ) {
    throw new ApiClientError({
      code: 'DUPLICATE_SESSION_NAME',
      fieldErrors: { name: 'A session with this name already exists.' },
      message: 'Academic session name must be unique.',
      status: 409,
    });
  }
  if (
    schoolSessions.some(item =>
      doDateRangesOverlap(
        input.startDate,
        input.endDate,
        item.startDate,
        item.endDate,
      ),
    )
  ) {
    throw new ApiClientError({
      code: 'SESSION_DATE_OVERLAP',
      message:
        'This date range overlaps an existing academic session. Review the dates before continuing.',
      status: 409,
    });
  }
  if (
    input.status === 'ACTIVE' &&
    schoolSessions.some(item => item.status === 'ACTIVE')
  ) {
    throw new ApiClientError({
      code: 'ACTIVE_SESSION_EXISTS',
      message: 'Activate this session separately to close the current session.',
      status: 409,
    });
  }
}

export const mockOrganizationService: OrganizationService = {
  async getSchools(query: SchoolListQuery) {
    await mockDelay(150);
    const search = query.search?.trim().toLowerCase() ?? '';
    const filtered = schools.filter(
      school =>
        (query.status === undefined ||
          query.status === 'ALL' ||
          school.status === query.status) &&
        (!search ||
          school.name.toLowerCase().includes(search) ||
          school.code.toLowerCase().includes(search) ||
          school.mobile.includes(search)),
    );
    return success(paginate(filtered, query.page, query.pageSize));
  },

  async getSchool(schoolId) {
    await mockDelay(120);
    return success(syncSchoolSummary(schoolId));
  },

  async createSchool(input: CreateSchoolInput) {
    await mockDelay(250);
    const code = input.code.trim().toUpperCase();
    if (schools.some(item => item.code === code)) {
      throw new ApiClientError({
        code: 'DUPLICATE_SCHOOL_CODE',
        fieldErrors: { code: 'This school code is already in use.' },
        message: 'Choose a different school code.',
        status: 409,
      });
    }
    if (schools.some(item => item.schoolAdmin?.mobile === input.admin.mobile)) {
      throw new ApiClientError({
        code: 'DUPLICATE_ADMIN_MEMBERSHIP',
        fieldErrors: {
          adminMobile:
            'This mobile already has an initial School Admin membership.',
        },
        message: 'The initial School Admin membership already exists.',
        status: 409,
      });
    }

    sequence += 1;
    const timestamp = new Date().toISOString();
    const schoolId = `school-created-${sequence}`;
    const admin = {
      email: input.admin.email,
      membershipId: `membership-created-${sequence}`,
      mobile: input.admin.mobile,
      name: input.admin.name,
      role: 'SCHOOL_ADMIN' as const,
    };
    const academicYear = getAcademicYearForDate(new Date());
    const activeSession: AcademicSession = {
      createdAt: timestamp,
      endDate: academicYear.endDate,
      id: `session-created-${sequence}`,
      name: academicYear.name,
      schoolId,
      startDate: academicYear.startDate,
      status: 'ACTIVE',
      updatedAt: timestamp,
    };
    const mainBranch: Branch = {
      address: clone(input.address),
      code: 'MAIN',
      createdAt: timestamp,
      email: input.email,
      id: `branch-created-${sequence}`,
      isMainBranch: true,
      mobile: input.mobile,
      name: 'Main Branch',
      schoolId,
      status: 'ACTIVE',
      updatedAt: timestamp,
    };
    const school: School = {
      activeBranchCount: 1,
      activeSession: {
        endDate: activeSession.endDate,
        id: activeSession.id,
        name: activeSession.name,
        startDate: activeSession.startDate,
      },
      address: clone(input.address),
      alternateMobile: input.alternateMobile,
      branchCount: 1,
      code,
      createdAt: timestamp,
      email: input.email,
      id: schoolId,
      logoUrl: input.logoUrl,
      mobile: input.mobile,
      name: input.name.trim(),
      schoolAdmin: admin,
      status: 'ACTIVE',
      updatedAt: timestamp,
      website: input.website,
    };
    schools.unshift(school);
    branches.push(mainBranch);
    sessions.push(activeSession);
    settings.push({
      academicYearStartMonth: 4,
      country: 'India',
      currency: 'INR',
      dateFormat: 'DD-MMM-YYYY',
      displayName: school.name,
      logoUrl: school.logoUrl,
      primaryEmail: school.email,
      primaryMobile: school.mobile,
      schoolId,
      timezone: 'Asia/Kolkata',
    });
    const result: CreateSchoolResult = {
      activeSession,
      mainBranch,
      school,
      schoolAdmin: admin,
    };
    return success(result, 'School and default organization setup created.');
  },

  async updateSchool(schoolId, input) {
    await mockDelay(180);
    const school = findSchool(schoolId);
    Object.assign(school, clone(input), {
      name: input.name.trim(),
      updatedAt: new Date().toISOString(),
    });
    return success(syncSchoolSummary(schoolId), 'School updated.');
  },

  async updateSchoolStatus(schoolId, status) {
    await mockDelay(150);
    const school = findSchool(schoolId);
    school.status = status;
    school.updatedAt = new Date().toISOString();
    return success(school, `School ${status.toLowerCase()}.`);
  },

  async getBranches(schoolId, query: BranchListQuery = {}) {
    await mockDelay(130);
    findSchool(schoolId);
    const search = query.search?.trim().toLowerCase() ?? '';
    const filtered = branches.filter(
      branch =>
        branch.schoolId === schoolId &&
        (query.status === undefined ||
          query.status === 'ALL' ||
          branch.status === query.status) &&
        (!search ||
          branch.name.toLowerCase().includes(search) ||
          branch.code.toLowerCase().includes(search) ||
          branch.mobile.includes(search)),
    );
    return success(paginate(filtered, query.page, query.pageSize));
  },

  async getBranch(schoolId, branchId) {
    await mockDelay(100);
    findSchool(schoolId);
    const branch = branches.find(
      item => item.id === branchId && item.schoolId === schoolId,
    );
    return success(branch ?? notFound('Branch'));
  },

  async createBranch(schoolId, input: CreateBranchInput) {
    await mockDelay(180);
    findSchool(schoolId);
    const code = input.code.trim().toUpperCase();
    if (
      branches.some(
        item => item.schoolId === schoolId && item.code === code,
      )
    ) {
      throw new ApiClientError({
        code: 'DUPLICATE_BRANCH_CODE',
        fieldErrors: { code: 'This branch code already exists in the school.' },
        message: 'Choose a different branch code.',
        status: 409,
      });
    }
    sequence += 1;
    const timestamp = new Date().toISOString();
    const branch: Branch = {
      ...clone(input),
      code,
      createdAt: timestamp,
      id: `branch-created-${sequence}`,
      isMainBranch: false,
      name: input.name.trim(),
      schoolId,
      status: 'ACTIVE',
      updatedAt: timestamp,
    };
    branches.push(branch);
    syncSchoolSummary(schoolId);
    return success(branch, 'Branch created.');
  },

  async updateBranch(schoolId, branchId, input) {
    await mockDelay(160);
    findSchool(schoolId);
    const branch = branches.find(
      item => item.id === branchId && item.schoolId === schoolId,
    );
    if (!branch) {
      return success(notFound('Branch'));
    }
    Object.assign(branch, clone(input), {
      name: input.name.trim(),
      updatedAt: new Date().toISOString(),
    });
    return success(branch, 'Branch updated.');
  },

  async updateBranchStatus(schoolId, branchId, status) {
    await mockDelay(140);
    findSchool(schoolId);
    const branch = branches.find(
      item => item.id === branchId && item.schoolId === schoolId,
    );
    if (!branch) {
      return success(notFound('Branch'));
    }
    const activeCount = branches.filter(
      item => item.schoolId === schoolId && item.status === 'ACTIVE',
    ).length;
    if (status === 'INACTIVE' && branch.status === 'ACTIVE' && activeCount <= 1) {
      throw new ApiClientError({
        code: 'LAST_ACTIVE_BRANCH',
        message: 'A school must always have at least one active branch.',
        status: 409,
      });
    }
    branch.status = status;
    branch.updatedAt = new Date().toISOString();
    syncSchoolSummary(schoolId);
    return success(branch, `Branch ${status.toLowerCase()}.`);
  },

  async getAcademicSessions(schoolId) {
    await mockDelay(120);
    findSchool(schoolId);
    return success(
      sessions.filter(item => item.schoolId === schoolId),
    );
  },

  async createAcademicSession(schoolId, input) {
    await mockDelay(170);
    findSchool(schoolId);
    validateSessionInput(schoolId, input);
    sequence += 1;
    const timestamp = new Date().toISOString();
    const session: AcademicSession = {
      ...input,
      createdAt: timestamp,
      id: `session-created-${sequence}`,
      name: input.name.trim(),
      schoolId,
      status: input.status ?? 'UPCOMING',
      updatedAt: timestamp,
    };
    sessions.push(session);
    syncSchoolSummary(schoolId);
    return success(session, 'Academic session created.');
  },

  async updateAcademicSession(schoolId, sessionId, input) {
    await mockDelay(150);
    findSchool(schoolId);
    const session = sessions.find(
      item => item.id === sessionId && item.schoolId === schoolId,
    );
    if (!session) {
      return success(notFound('Academic session'));
    }
    if (session.status !== 'UPCOMING') {
      throw new ApiClientError({
        code: 'SESSION_READ_ONLY',
        message: 'Only upcoming academic sessions can be edited.',
        status: 409,
      });
    }
    validateSessionInput(schoolId, input, sessionId);
    Object.assign(session, input, {
      name: input.name.trim(),
      updatedAt: new Date().toISOString(),
    });
    return success(session, 'Academic session updated.');
  },

  async activateAcademicSession(schoolId, sessionId) {
    await mockDelay(180);
    findSchool(schoolId);
    const selected = sessions.find(
      item => item.id === sessionId && item.schoolId === schoolId,
    );
    if (!selected) {
      return success(notFound('Academic session'));
    }
    if (selected.status === 'CLOSED') {
      throw new ApiClientError({
        code: 'CLOSED_SESSION_READ_ONLY',
        message: 'Closed academic sessions cannot be reopened.',
        status: 409,
      });
    }
    const timestamp = new Date().toISOString();
    sessions.forEach(session => {
      if (session.schoolId === schoolId && session.status === 'ACTIVE') {
        session.status = 'CLOSED';
        session.updatedAt = timestamp;
      }
    });
    selected.status = 'ACTIVE';
    selected.updatedAt = timestamp;
    syncSchoolSummary(schoolId);
    return success(
      sessions.filter(item => item.schoolId === schoolId),
      'Academic session activated.',
    );
  },

  async closeAcademicSession(schoolId, sessionId) {
    await mockDelay(150);
    findSchool(schoolId);
    const session = sessions.find(
      item => item.id === sessionId && item.schoolId === schoolId,
    );
    if (!session) {
      return success(notFound('Academic session'));
    }
    session.status = 'CLOSED';
    session.updatedAt = new Date().toISOString();
    syncSchoolSummary(schoolId);
    return success(session, 'Academic session closed.');
  },

  async getSchoolSettings(schoolId) {
    await mockDelay(100);
    findSchool(schoolId);
    return success(
      settings.find(item => item.schoolId === schoolId) ??
        notFound('School settings'),
    );
  },

  async updateSchoolSettings(schoolId, input) {
    await mockDelay(150);
    findSchool(schoolId);
    const schoolSettings = settings.find(item => item.schoolId === schoolId);
    if (!schoolSettings) {
      return success(notFound('School settings'));
    }
    Object.assign(schoolSettings, clone(input));
    return success(schoolSettings, 'School settings updated.');
  },
};
