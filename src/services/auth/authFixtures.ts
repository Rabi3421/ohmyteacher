import type { AuthSession, AuthUser, UserMembership } from '../../models/auth';

export const MOCK_AUTH = {
  otp: '123456',
  otpExpiresInSeconds: 300,
  resendAvailableInSeconds: 30,
  maximumAttempts: 5,
  schoolCode: 'OMT001',
} as const;

export interface AuthFixture {
  key: string;
  user: AuthUser;
  memberships: UserMembership[];
}

function user(
  id: string,
  name: string,
  mobile: string,
  status: AuthUser['status'] = 'ACTIVE',
): AuthUser {
  return { id, mobile, name, status };
}

function membership(
  id: string,
  userId: string,
  role: UserMembership['role'],
  overrides: Partial<UserMembership> = {},
): UserMembership {
  return {
    id,
    role,
    schoolCode: MOCK_AUTH.schoolCode,
    schoolId: 'school-omt',
    schoolName: 'OhMyTeacher Demo School',
    status: 'ACTIVE',
    userId,
    ...overrides,
  };
}

export const SCHOOL_AUTH_FIXTURES: Record<string, AuthFixture> = {
  '9876543210': {
    key: 'school-admin',
    user: user('user-school-admin', 'Ananya Sharma', '9876543210'),
    memberships: [
      membership(
        'membership-school-admin',
        'user-school-admin',
        'SCHOOL_ADMIN',
      ),
    ],
  },
  '9876543211': {
    key: 'accountant',
    user: user('user-accountant', 'Vikram Rao', '9876543211'),
    memberships: [
      membership('membership-accountant', 'user-accountant', 'ACCOUNTANT', {
        branchId: 'branch-main',
        branchName: 'Main Branch',
      }),
    ],
  },
  '9876543212': {
    key: 'multiple-memberships',
    user: user('user-multiple', 'Meera Patel', '9876543212'),
    memberships: [
      membership('membership-parent', 'user-multiple', 'PARENT', {
        studentId: 'student-rahul',
        studentName: 'Rahul Patel',
      }),
      membership('membership-multi-accountant', 'user-multiple', 'ACCOUNTANT', {
        branchId: 'branch-main',
        branchName: 'Main Branch',
      }),
    ],
  },
  '9876543213': {
    key: 'parent-children',
    user: user('user-parent', 'Priya Kumar', '9876543213'),
    memberships: [
      membership('membership-child-one', 'user-parent', 'PARENT', {
        studentId: 'student-aarav',
        studentName: 'Aarav Kumar',
      }),
      membership('membership-child-two', 'user-parent', 'PARENT', {
        branchId: 'branch-east',
        branchName: 'East Branch',
        studentId: 'student-anaya',
        studentName: 'Anaya Kumar',
      }),
    ],
  },
  '9876543214': {
    key: 'inactive-user',
    user: user('user-inactive', 'Inactive User', '9876543214', 'INACTIVE'),
    memberships: [
      membership('membership-inactive-user', 'user-inactive', 'PARENT'),
    ],
  },
  '9876543215': {
    key: 'branch-admin',
    user: user('user-branch-admin', 'Rohit Das', '9876543215'),
    memberships: [
      membership(
        'membership-branch-admin',
        'user-branch-admin',
        'BRANCH_ADMIN',
        {
          branchId: 'branch-main',
          branchName: 'Main Branch',
        },
      ),
    ],
  },
  '9876543216': {
    key: 'receptionist',
    user: user('user-receptionist', 'Neha Singh', '9876543216'),
    memberships: [
      membership('membership-reception', 'user-receptionist', 'RECEPTIONIST', {
        branchId: 'branch-main',
        branchName: 'Main Branch',
      }),
    ],
  },
  '9876543217': {
    key: 'student',
    user: user('user-student', 'Arjun Nair', '9876543217'),
    memberships: [
      membership('membership-student', 'user-student', 'STUDENT', {
        studentId: 'student-arjun',
        studentName: 'Arjun Nair',
      }),
    ],
  },
  '9876543218': {
    key: 'inactive-membership',
    user: user('user-inactive-membership', 'Kavya Joshi', '9876543218'),
    memberships: [
      membership('membership-inactive', 'user-inactive-membership', 'PARENT', {
        status: 'INACTIVE',
      }),
    ],
  },
};

export const PLATFORM_AUTH_FIXTURES: Record<string, AuthFixture> = {
  '9999999999': {
    key: 'super-admin-mobile',
    user: user('user-super-admin-mobile', 'Platform Admin', '9999999999'),
    memberships: [
      {
        id: 'membership-super-admin-mobile',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        userId: 'user-super-admin-mobile',
      },
    ],
  },
};

const ALL_FIXTURES = [
  ...Object.values(SCHOOL_AUTH_FIXTURES),
  ...Object.values(PLATFORM_AUTH_FIXTURES),
];

export function getFixtureByKey(key: string): AuthFixture | undefined {
  return ALL_FIXTURES.find(fixture => fixture.key === key);
}

export function createFixtureSession(fixture: AuthFixture): AuthSession {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  return {
    memberships: fixture.memberships,
    tokens: {
      accessToken: `mock-access:${fixture.key}`,
      expiresAt,
      refreshToken: `mock-refresh:${fixture.key}`,
    },
    user: fixture.user,
  };
}
