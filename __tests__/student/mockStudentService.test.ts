import type {
  CreateStudentAdmissionInput,
  GuardianInput,
} from '../../src/models/student';
import {
  mockStudentService,
  resetMockStudentData,
} from '../../src/services/student/mockStudentService';

const schoolId = 'school-omt';
const guardian = (
  overrides: Partial<GuardianInput> = {},
): GuardianInput => ({
  address: {
    city: 'Bhubaneswar',
    country: 'India',
    line1: '12 Test Road',
    pinCode: '751001',
    state: 'Odisha',
  },
  fullName: 'Test Parent',
  isEmergencyContact: true,
  isFeeContact: true,
  isPrimaryContact: true,
  mobile: '9000000001',
  parentAppAccessEnabled: true,
  relationship: 'MOTHER',
  whatsappEnabled: true,
  ...overrides,
});

function admission(
  overrides: Partial<CreateStudentAdmissionInput> = {},
): CreateStudentAdmissionInput {
  return {
    enableStudentAppAccess: false,
    enrollment: {
      academicSessionId: 'session-school-omt-current',
      branchId: 'branch-main',
      classId: 'class-omt-c01',
      rollNumber: '35',
      sectionId: 'section-omt-c01-a',
    },
    guardians: [guardian()],
    profile: {
      address: {
        city: 'Bhubaneswar',
        country: 'India',
        line1: '10 Test Road',
        pinCode: '751001',
        state: 'Odisha',
      },
      admissionDate: '2026-07-30',
      dateOfBirth: '2017-01-02',
      fullName: 'Test Student',
      gender: 'FEMALE',
    },
    ...overrides,
  };
}

async function finish<T>(promise: Promise<T>): Promise<T> {
  jest.runOnlyPendingTimers();
  return promise;
}

beforeEach(() => {
  jest.useFakeTimers();
  resetMockStudentData();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('mock student service', () => {
  it('lists and paginates at least twenty OMT student profiles', async () => {
    const response = await finish(
      mockStudentService.getStudents(schoolId, { page: 1, pageSize: 5 }),
    );
    expect(response.data.items).toHaveLength(5);
    expect(response.data.totalItems).toBe(20);
    expect(response.data.totalPages).toBe(4);
  });

  it.each([
    ['name', 'Rahul', 'student-rahul'],
    ['admission number', 'OMT-2026-0002', 'student-aarav'],
    ['guardian mobile', '9876543212', 'student-isha'],
  ])('searches by %s', async (_, search, expectedId) => {
    const response = await finish(
      mockStudentService.getStudents(schoolId, { search }),
    );
    expect(response.data.items.map(item => item.profile.id)).toContain(
      expectedId,
    );
  });

  it('filters the active enrollment hierarchy and profile status', async () => {
    const response = await finish(
      mockStudentService.getStudents(schoolId, {
        academicSessionId: 'session-school-omt-current',
        branchId: 'branch-main',
        classId: 'class-omt-c01',
        sectionId: 'section-omt-c01-a',
        studentStatus: 'ACTIVE',
      }),
    );
    expect(response.data.items.length).toBeGreaterThan(0);
    expect(
      response.data.items.every(
        item =>
          item.currentEnrollment?.classId === 'class-omt-c01' &&
          item.profile.status === 'ACTIVE',
      ),
    ).toBe(true);
  });

  it('completes admission atomically with generated identifiers and links', async () => {
    const response = await finish(
      mockStudentService.createStudentAdmission(schoolId, admission()),
    );
    expect(response.data.profile.admissionNumber).toMatch(
      /^OMT-2026-\d{4}$/,
    );
    expect(response.data.activeEnrollment.status).toBe('ACTIVE');
    expect(response.data.guardianLinks).toHaveLength(1);
    expect(response.data.access.parentMemberships).toHaveLength(1);
  });

  it('reuses a school guardian, global identity, and Parent membership', async () => {
    const response = await finish(
      mockStudentService.createStudentAdmission(
        schoolId,
        admission({
          guardians: [
            guardian({
              fullName: 'Meera Patel',
              mobile: '9876543212',
            }),
          ],
        }),
      ),
    );
    expect(response.data.guardianLinks[0].id).toBe(
      'guardian-student-rahul',
    );
    expect(response.data.access.parentMemberships[0]).toMatchObject({
      membershipId: 'membership-parent',
      userId: 'user-multiple',
    });
    expect(response.data.access.parentMemberships[0].linkedStudentIds).toEqual(
      expect.arrayContaining([
        'student-rahul',
        'student-isha',
        response.data.profile.id,
      ]),
    );
  });

  it('optionally creates Student access for a unique personal mobile', async () => {
    const response = await finish(
      mockStudentService.createStudentAdmission(
        schoolId,
        admission({
          enableStudentAppAccess: true,
          profile: {
            ...admission().profile,
            mobile: '9000000099',
          },
        }),
      ),
    );
    expect(response.data.access.studentMembership).toMatchObject({
      mobile: '9000000099',
      status: 'ACTIVE',
    });
  });

  it('rejects Student access without mobile before creating any profile', async () => {
    const request = mockStudentService.createStudentAdmission(
      schoolId,
      admission({ enableStudentAppAccess: true }),
    );
    await expect(finish(request)).rejects.toMatchObject({
      code: 'STUDENT_MOBILE_REQUIRED',
    });
    const list = await finish(
      mockStudentService.getStudents(schoolId, { search: 'Test Student' }),
    );
    expect(list.data.totalItems).toBe(0);
  });

  it('rejects duplicate student admission and duplicate active roll number', async () => {
    const duplicateStudent = mockStudentService.createStudentAdmission(
      schoolId,
      admission({
        profile: {
          ...admission().profile,
          dateOfBirth: '2015-05-14',
          fullName: 'Rahul Patel',
        },
      }),
    );
    await expect(finish(duplicateStudent)).rejects.toMatchObject({
      code: 'DUPLICATE_ADMISSION',
    });

    const duplicateRoll = mockStudentService.createStudentAdmission(
      schoolId,
      admission({
        enrollment: { ...admission().enrollment, rollNumber: '1' },
      }),
    );
    await expect(finish(duplicateRoll)).rejects.toMatchObject({
      code: 'DUPLICATE_ROLL_NUMBER',
    });
  });

  it.each([
    [
      'invalid branch',
      { branchId: 'branch-greenfield-puri' },
      'INVALID_BRANCH',
    ],
    ['invalid class', { classId: 'missing-class' }, 'INVALID_CLASS'],
    ['invalid section', { sectionId: 'missing-section' }, 'INVALID_SECTION'],
    [
      'closed session',
      {
        academicSessionId: 'session-school-omt-closed',
        classId: 'class-omt-closed-c05',
        sectionId: 'section-omt-closed-c05-a',
      },
      'ACADEMIC_SESSION_CLOSED',
    ],
  ])('protects admission from %s', async (_, enrollmentPatch, code) => {
    const request = mockStudentService.createStudentAdmission(
      schoolId,
      admission({
        enrollment: { ...admission().enrollment, ...enrollmentPatch },
      }),
    );
    await expect(finish(request)).rejects.toMatchObject({ code });
  });

  it('updates mutable profile fields without replacing admission identity', async () => {
    const before = await finish(
      mockStudentService.getStudent(schoolId, 'student-rahul'),
    );
    const response = await finish(
      mockStudentService.updateStudentProfile(schoolId, 'student-rahul', {
        address: before.data.profile.address,
        dateOfBirth: before.data.profile.dateOfBirth,
        fullName: 'Rahul Patel Updated',
        gender: before.data.profile.gender,
      }),
    );
    expect(response.data.fullName).toBe('Rahul Patel Updated');
    expect(response.data.admissionNumber).toBe(
      before.data.profile.admissionNumber,
    );
  });

  it('protects the final and primary guardian links', async () => {
    const finalGuardian = mockStudentService.unlinkStudentGuardian(
      schoolId,
      'student-rahul',
      'guardian-student-rahul',
    );
    await expect(finish(finalGuardian)).rejects.toMatchObject({
      code: 'FINAL_GUARDIAN_PROTECTED',
    });

    await finish(
      mockStudentService.addStudentGuardian(
        schoolId,
        'student-rahul',
        guardian({
          isFeeContact: false,
          isPrimaryContact: false,
          mobile: '9000000002',
        }),
      ),
    );
    const primaryGuardian = mockStudentService.unlinkStudentGuardian(
      schoolId,
      'student-rahul',
      'guardian-student-rahul',
    );
    await expect(finish(primaryGuardian)).rejects.toMatchObject({
      code: 'PRIMARY_GUARDIAN_PROTECTED',
    });
  });

  it('creates a new record for a same-session section transfer', async () => {
    const before = await finish(
      mockStudentService.getEnrollmentHistory(schoolId, 'student-rahul'),
    );
    const response = await finish(
      mockStudentService.transferStudent(schoolId, 'student-rahul', {
        academicSessionId: 'session-school-omt-current',
        branchId: 'branch-main',
        classId: 'class-omt-c01',
        effectiveDate: '2026-08-01',
        reason: 'Section balance',
        sectionId: 'section-omt-c01-b',
        type: 'SECTION_CHANGE',
      }),
    );
    expect(response.data.previousEnrollment.status).toBe('TRANSFERRED');
    expect(response.data.activeEnrollment.status).toBe('ACTIVE');
    const after = await finish(
      mockStudentService.getEnrollmentHistory(schoolId, 'student-rahul'),
    );
    expect(after.data).toHaveLength(before.data.length + 1);
    expect(after.data[0].id).not.toBe(response.data.previousEnrollment.id);
  });

  it('supports an authorized same-session branch transfer', async () => {
    const response = await finish(
      mockStudentService.transferStudent(
        'school-greenfield',
        'student-greenfield',
        {
          academicSessionId: 'session-school-greenfield-current',
          branchId: 'branch-greenfield-puri',
          classId: 'class-greenfield-puri-c01',
          effectiveDate: '2026-08-01',
          reason: 'Family relocation',
          sectionId: 'section-greenfield-puri-c01-a',
          type: 'BRANCH_TRANSFER',
        },
      ),
    );
    expect(response.data.activeEnrollment.branchId).toBe(
      'branch-greenfield-puri',
    );
  });

  it('rejects identical destinations and unauthorized cross-branch movement', async () => {
    const identical = mockStudentService.transferStudent(
      schoolId,
      'student-rahul',
      {
        academicSessionId: 'session-school-omt-current',
        branchId: 'branch-main',
        classId: 'class-omt-c01',
        effectiveDate: '2026-08-01',
        reason: 'No actual move',
        sectionId: 'section-omt-c01-a',
        type: 'SECTION_CHANGE',
      },
    );
    await expect(finish(identical)).rejects.toMatchObject({
      code: 'IDENTICAL_TRANSFER_DESTINATION',
    });

    const denied = mockStudentService.transferStudent(
      'school-greenfield',
      'student-greenfield',
      {
        academicSessionId: 'session-school-greenfield-current',
        allowedBranchIds: ['branch-school-greenfield-main'],
        branchId: 'branch-greenfield-puri',
        classId: 'class-greenfield-puri-c01',
        effectiveDate: '2026-08-01',
        reason: 'Unauthorized destination',
        sectionId: 'section-greenfield-puri-c01-a',
        type: 'BRANCH_TRANSFER',
      },
    );
    await expect(finish(denied)).rejects.toMatchObject({
      code: 'CROSS_BRANCH_ACCESS_DENIED',
    });
  });

  it('applies protected status transitions and enrollment closure', async () => {
    const response = await finish(
      mockStudentService.updateStudentStatus(schoolId, 'student-arjun', {
        reason: 'Approved withdrawal',
        status: 'WITHDRAWN',
      }),
    );
    expect(response.data.profile.status).toBe('WITHDRAWN');
    expect(response.data.currentEnrollment).toBeUndefined();
    expect(response.data.access.studentMembership?.status).toBe('INACTIVE');

    const reactivate = mockStudentService.updateStudentStatus(
      schoolId,
      'student-arjun',
      { reason: 'Attempt', status: 'ACTIVE' },
    );
    await expect(finish(reactivate)).rejects.toMatchObject({
      code: 'UNSUPPORTED_REACTIVATION',
    });
  });

  it('enforces Parent child links and Student membership ownership', async () => {
    const children = await finish(
      mockStudentService.getParentChildren(schoolId, 'membership-parent'),
    );
    expect(children.data.map(item => item.profile.id)).toEqual(
      expect.arrayContaining(['student-rahul', 'student-isha']),
    );

    const unrelatedChild = mockStudentService.getParentChild(
      schoolId,
      'membership-parent',
      'student-arjun',
    );
    await expect(finish(unrelatedChild)).rejects.toMatchObject({
      code: 'PARENT_CHILD_ACCESS_DENIED',
    });

    const self = await finish(
      mockStudentService.getStudentSelfProfile(
        schoolId,
        'membership-student',
      ),
    );
    expect(self.data.profile.id).toBe('student-arjun');
    const unrelatedMembership = mockStudentService.getStudentSelfProfile(
      schoolId,
      'membership-parent',
    );
    await expect(finish(unrelatedMembership)).rejects.toMatchObject({
      code: 'STUDENT_SELF_ACCESS_DENIED',
    });
  });

  it('rejects cross-school student IDs independently', async () => {
    const request = mockStudentService.getStudent(
      schoolId,
      'student-greenfield',
    );
    await expect(finish(request)).rejects.toMatchObject({
      code: 'STUDENT_NOT_FOUND',
    });
  });
});
