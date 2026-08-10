import type { PermissionKey } from '../../src/constants/userPermissions';
import type { UserMembership } from '../../src/models/auth';
import {
  mockAcademicService,
  resetMockAcademicData,
} from '../../src/services/academic/mockAcademicService';
import { createAcademicStore } from '../../src/store/academic/academicStore';

const schoolAdmin: UserMembership = {
  id: 'membership-school-admin',
  role: 'SCHOOL_ADMIN',
  schoolId: 'school-omt',
  status: 'ACTIVE',
  userId: 'actor',
};
const branchAdmin: UserMembership = {
  branchId: 'branch-main',
  id: 'membership-branch-admin',
  role: 'BRANCH_ADMIN',
  schoolId: 'school-omt',
  status: 'ACTIVE',
  userId: 'actor',
};
const context = {
  academicSessionId: 'session-school-omt-current',
  branchId: 'branch-main',
  schoolId: 'school-omt',
};
const viewPermissions: PermissionKey[] = [
  'academic.class.view',
  'academic.section.view',
  'academic.subject.view',
];

function createStore(
  active: UserMembership = schoolAdmin,
  permissions: PermissionKey[] = [],
) {
  return createAcademicStore({
    getMembership: () => active,
    getPermissions: () => permissions,
    service: mockAcademicService,
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  resetMockAcademicData();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('academic store', () => {
  it('initializes context and loads summary with observable loading state', async () => {
    const store = createStore();
    store.getState().setContext(context, 'ACTIVE');
    const request = store.getState().loadSetupSummary();
    expect(store.getState().isLoading).toBe(true);
    jest.runOnlyPendingTimers();
    await request;
    expect(store.getState().summary?.totalClasses).toBe(13);
    expect(store.getState().isLoading).toBe(false);
  });

  it('clears contextual data when branch changes but keeps school subjects', () => {
    const store = createStore();
    store.getState().setContext(context, 'ACTIVE');
    store.setState({
      assignments: [
        {
          ...context,
          classId: 'class-1',
          createdAt: '',
          displayOrder: 1,
          id: 'assignment-1',
          status: 'ACTIVE',
          subjectId: 'subject-1',
          updatedAt: '',
        },
      ],
      subjects: {
        items: [
          {
            activeAssignmentCount: 0,
            code: 'ENG',
            createdAt: '',
            displayOrder: 1,
            id: 'subject-1',
            name: 'English',
            schoolId: 'school-omt',
            status: 'ACTIVE',
            type: 'CORE',
            updatedAt: '',
          },
        ],
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
      summary: {
        activeClasses: 1,
        activeSubjects: 1,
        classesWithoutSections: 0,
        totalClasses: 1,
        totalSections: 1,
        unassignedClasses: 0,
      },
    });
    store.getState().setContext(
      { ...context, branchId: 'branch-other' },
      'ACTIVE',
    );
    expect(store.getState().assignments).toHaveLength(0);
    expect(store.getState().summary).toBeNull();
    expect(store.getState().subjects.items).toHaveLength(1);
  });

  it('clears session data when academic session changes', () => {
    const store = createStore();
    store.getState().setContext(context, 'ACTIVE');
    store.setState({
      classes: {
        items: [],
        page: 1,
        pageSize: 20,
        totalItems: 5,
        totalPages: 1,
      },
      currentClass: {
        ...context,
        activeSectionCount: 0,
        assignedSubjectCount: 0,
        code: 'C1',
        createdAt: '',
        displayOrder: 1,
        id: 'class-1',
        name: 'Class 1',
        sectionCount: 0,
        status: 'ACTIVE',
        updatedAt: '',
      },
    });
    store.getState().setContext(
      { ...context, academicSessionId: 'session-school-omt-next' },
      'UPCOMING',
    );
    expect(store.getState().classes.totalItems).toBe(0);
    expect(store.getState().currentClass).toBeNull();
  });

  it('ignores an in-flight response after context changes', async () => {
    const store = createStore();
    store.getState().setContext(context, 'ACTIVE');
    const request = store.getState().loadClasses();
    store.getState().setContext(
      { ...context, academicSessionId: 'session-school-omt-next' },
      'UPCOMING',
    );
    jest.runOnlyPendingTimers();
    await request;
    expect(store.getState().classes.items).toHaveLength(0);
    expect(store.getState().isLoading).toBe(false);
  });

  it('clears school-scoped subjects when workspace school changes', () => {
    const store = createStore();
    store.getState().setContext(context, 'ACTIVE');
    store.setState({
      currentSubject: {
        activeAssignmentCount: 0,
        code: 'ENG',
        createdAt: '',
        displayOrder: 1,
        id: 'subject-1',
        name: 'English',
        schoolId: 'school-omt',
        status: 'ACTIVE',
        type: 'CORE',
        updatedAt: '',
      },
    });
    store.getState().setContext(
      {
        academicSessionId: 'session-school-greenfield-current',
        branchId: 'branch-school-greenfield-main',
        schoolId: 'school-greenfield',
      },
      'ACTIVE',
    );
    expect(store.getState().currentSubject).toBeNull();
    expect(store.getState().subjects.items).toHaveLength(0);
  });

  it('normalizes service errors and field errors', async () => {
    const store = createStore();
    store.getState().setContext(context, 'ACTIVE');
    const request = store.getState().createClass({
      code: 'C01',
      displayOrder: 15,
      name: 'Duplicate',
      status: 'ACTIVE',
    });
    jest.runOnlyPendingTimers();
    await request;
    expect(store.getState().error).toMatchObject({
      code: 'DUPLICATE_CLASS',
      status: 409,
    });
    expect(store.getState().error?.fieldErrors).toBeDefined();
  });

  it('validates tenant IDs independently of navigation routes', async () => {
    const store = createStore(branchAdmin, viewPermissions);
    store.getState().setContext(
      { ...context, branchId: 'branch-greenfield-puri' },
      'ACTIVE',
    );
    await store.getState().loadClasses();
    expect(store.getState().error).toMatchObject({
      code: 'ACADEMIC_ACCESS_DENIED',
      status: 403,
    });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('allows backend-confirmed Branch Admin mutations and blocks legacy closed contexts', async () => {
    const branchStore = createStore(branchAdmin, viewPermissions);
    branchStore.getState().setContext(context, 'ACTIVE');
    const branchMutation = branchStore.getState().createClass({
      code: 'C11',
      displayOrder: 14,
      name: 'Class 11',
      status: 'ACTIVE',
    });
    jest.runOnlyPendingTimers();
    expect(await branchMutation).not.toBeNull();
    expect(branchStore.getState().error).toBeNull();

    const closedStore = createStore();
    closedStore.getState().setContext(
      {
        ...context,
        academicSessionId: 'session-school-omt-closed',
      },
      'CLOSED',
    );
    await closedStore.getState().createClass({
      code: 'NEW',
      displayOrder: 20,
      name: 'New Class',
      status: 'ACTIVE',
    });
    expect(closedStore.getState().error?.message).toContain('read-only');
    expect(jest.getTimerCount()).toBe(0);
  });
});
