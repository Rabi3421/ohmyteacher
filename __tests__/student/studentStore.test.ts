import type { PermissionKey } from '../../src/constants/userPermissions';
import type { UserMembership } from '../../src/models/auth';
import type { StudentAdmissionDraft } from '../../src/models/student';
import {
  mockStudentService,
  resetMockStudentData,
} from '../../src/services/student/mockStudentService';
import {
  createStudentStore,
  type StudentStoreState,
} from '../../src/store/student/studentStore';

const schoolAdmin: UserMembership = {
  id: 'membership-school-admin',
  role: 'SCHOOL_ADMIN',
  schoolId: 'school-omt',
  status: 'ACTIVE',
  userId: 'actor',
};

function createStore(
  getMembership: () => UserMembership | null = () => schoolAdmin,
  permissions: PermissionKey[] = [],
) {
  return createStudentStore({
    getMembership,
    getPermissions: () => permissions,
    service: mockStudentService,
  });
}

const validDraft: StudentAdmissionDraft = {
  enableStudentAppAccess: false,
  enrollment: {
    academicSessionId: 'session-school-omt-current',
    branchId: 'branch-main',
    classId: 'class-omt-c01',
    rollNumber: '36',
    sectionId: 'section-omt-c01-a',
  },
  guardians: [
    {
      address: {
        city: 'Bhubaneswar',
        country: 'India',
        line1: 'Guardian Road',
        pinCode: '751001',
        state: 'Odisha',
      },
      fullName: 'Store Parent',
      isEmergencyContact: true,
      isFeeContact: true,
      isPrimaryContact: true,
      mobile: '9000000101',
      parentAppAccessEnabled: true,
      relationship: 'MOTHER',
      whatsappEnabled: true,
    },
  ],
  profile: {
    address: {
      city: 'Bhubaneswar',
      country: 'India',
      line1: 'Student Road',
      pinCode: '751001',
      state: 'Odisha',
    },
    admissionDate: '2026-07-30',
    dateOfBirth: '2017-02-03',
    fullName: 'Store Student',
    gender: 'MALE',
  },
  step: 5,
};

async function finish<T>(promise: Promise<T>): Promise<T> {
  jest.runOnlyPendingTimers();
  return promise;
}

async function finishSequence<T>(promise: Promise<T>): Promise<T> {
  let settled = false;
  promise.finally(() => {
    settled = true;
  });
  for (let attempt = 0; attempt < 10 && !settled; attempt += 1) {
    jest.runOnlyPendingTimers();
    await Promise.resolve();
  }
  return promise;
}

beforeEach(() => {
  jest.useFakeTimers();
  resetMockStudentData();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('student store', () => {
  it('loads students with observable state', async () => {
    const store = createStore();
    store.getState().setSchoolContext('school-omt');
    const request = store.getState().loadStudents('school-omt');
    expect(store.getState().isLoadingStudents).toBe(true);
    await finish(request);
    expect(store.getState().students.totalItems).toBe(20);
    expect(store.getState().isLoadingStudents).toBe(false);
  });

  it('stores search and academic filters and can clear only academic context', () => {
    const store = createStore();
    store.getState().setQuery({
      branchId: 'branch-main',
      classId: 'class-omt-c01',
      search: 'Rahul',
      studentStatus: 'ACTIVE',
    });
    store.getState().clearAcademicFilters();
    expect(store.getState().query).toMatchObject({
      branchId: 'ALL',
      classId: 'ALL',
      search: 'Rahul',
      studentStatus: 'ACTIVE',
    });
  });

  it('preserves controlled admission steps and resets after success', async () => {
    const store = createStore();
    store.getState().setSchoolContext('school-omt');
    store.getState().updateAdmissionDraft(validDraft);
    expect(store.getState().admissionDraft.step).toBe(5);
    const result = await finish(
      store.getState().submitAdmission('school-omt'),
    );
    expect(result?.profile.fullName).toBe('Store Student');
    expect(store.getState().admissionDraft.step).toBe(1);
    expect(store.getState().admissionResult?.profile.id).toBe(
      result?.profile.id,
    );
  });

  it('does not partially create data when admission fails', async () => {
    const store = createStore();
    store.getState().setSchoolContext('school-omt');
    store.getState().updateAdmissionDraft({
      ...validDraft,
      enableStudentAppAccess: true,
    });
    const result = await finish(
      store.getState().submitAdmission('school-omt'),
    );
    expect(result).toBeNull();
    const list = await finish(
      mockStudentService.getStudents('school-omt', {
        search: 'Store Student',
      }),
    );
    expect(list.data.totalItems).toBe(0);
  });

  it('clears school data and admission state on workspace change', () => {
    const store = createStore();
    store.getState().setSchoolContext('school-omt');
    store.setState({
      admissionDraft: validDraft,
      students: {
        items: [],
        page: 1,
        pageSize: 20,
        totalItems: 20,
        totalPages: 1,
      },
    });
    store.getState().setSchoolContext('school-greenfield');
    expect(store.getState().students.totalItems).toBe(0);
    expect(store.getState().admissionDraft.step).toBe(1);
    expect(store.getState().schoolId).toBe('school-greenfield');
  });

  it('ignores an in-flight list response after school context changes', async () => {
    const store = createStore();
    store.getState().setSchoolContext('school-omt');
    const request = store.getState().loadStudents('school-omt');
    store.getState().setSchoolContext('school-greenfield');
    await finish(request);
    expect(store.getState().schoolId).toBe('school-greenfield');
    expect(store.getState().students.totalItems).toBe(0);
  });

  it('refreshes details and history after transfer', async () => {
    const store = createStore();
    store.getState().setSchoolContext('school-omt');
    await finish(store.getState().loadStudent('school-omt', 'student-rahul'));
    const moved = await finishSequence(
      store.getState().transferStudent('school-omt', 'student-rahul', {
        academicSessionId: 'session-school-omt-current',
        branchId: 'branch-main',
        classId: 'class-omt-c01',
        effectiveDate: '2026-08-01',
        reason: 'Section balancing',
        sectionId: 'section-omt-c01-b',
        type: 'SECTION_CHANGE',
      }),
    );
    expect(moved).toBe(true);
    expect(store.getState().currentStudent?.currentEnrollment?.sectionId).toBe(
      'section-omt-c01-b',
    );
    expect(store.getState().enrollmentHistory.length).toBeGreaterThan(1);
  });

  it('updates and refreshes Student membership access', async () => {
    const store = createStore();
    store.getState().setSchoolContext('school-omt');
    await finish(store.getState().loadStudent('school-omt', 'student-arjun'));
    await finishSequence(
      store.getState().loadAccess('school-omt', 'student-arjun'),
    );
    expect(store.getState().access?.studentMembership?.status).toBe('ACTIVE');
    await finishSequence(
      store
        .getState()
        .updateStudentAccess('school-omt', 'student-arjun', false),
    );
    expect(store.getState().access?.studentMembership?.status).toBe('INACTIVE');
  });

  it('normalizes domain errors for screens', async () => {
    const store = createStore();
    store.getState().setSchoolContext('school-omt');
    store.getState().updateAdmissionDraft({
      ...validDraft,
      profile: {
        ...validDraft.profile,
        dateOfBirth: '2015-05-14',
        fullName: 'Rahul Patel',
      },
    });
    await finish(store.getState().submitAdmission('school-omt'));
    expect(store.getState().error).toMatchObject({
      code: 'DUPLICATE_ADMISSION',
      status: 409,
    });
  });

  it('enforces Parent and Student ownership before service access', async () => {
    let active: UserMembership | null = {
      id: 'membership-parent',
      role: 'PARENT',
      schoolId: 'school-omt',
      status: 'ACTIVE',
      userId: 'parent',
    };
    const store = createStore(() => active);
    await finish(
      store.getState().loadParentChildren('school-omt', 'membership-parent'),
    );
    expect(store.getState().parentChildren).toHaveLength(2);
    await finish(
      store
        .getState()
        .loadParentChild('school-omt', 'membership-parent', 'student-arjun'),
    );
    expect(store.getState().error?.code).toBe('PARENT_CHILD_ACCESS_DENIED');

    active = {
      id: 'membership-student',
      role: 'STUDENT',
      schoolId: 'school-omt',
      status: 'ACTIVE',
      studentId: 'student-arjun',
      userId: 'student',
    };
    await finish(
      store.getState().loadSelfProfile('school-omt', 'membership-student'),
    );
    expect(store.getState().selfProfile?.profile.id).toBe('student-arjun');
    await store
      .getState()
      .loadSelfProfile('school-omt', 'another-membership');
    expect(store.getState().error?.code).toBe('STUDENT_ACCESS_DENIED');
  });

  it('resets all student state explicitly', () => {
    const store = createStore();
    store.setState({
      currentStudent: {} as StudentStoreState['currentStudent'],
      schoolId: 'school-omt',
    });
    store.getState().reset();
    expect(store.getState().currentStudent).toBeNull();
    expect(store.getState().schoolId).toBeNull();
  });
});
