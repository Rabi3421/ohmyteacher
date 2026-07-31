import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { UserMembership } from '../../src/models/auth';
import type {
  GuardianDetails,
  StudentAdmissionDraft,
  StudentDetails,
} from '../../src/models/student';
import type { RoleStackParamList } from '../../src/navigation/navigationTypes';
import { CreateStudentScreen } from '../../src/screens/student/CreateStudentScreen';
import { ParentChildDetailsScreen } from '../../src/screens/student/ParentChildDetailsScreen';
import { ParentChildrenScreen } from '../../src/screens/student/ParentChildrenScreen';
import { StudentAccessScreen } from '../../src/screens/student/StudentAccessScreen';
import { StudentAdmissionReviewScreen } from '../../src/screens/student/StudentAdmissionReviewScreen';
import { StudentAdmissionSuccessScreen } from '../../src/screens/student/StudentAdmissionSuccessScreen';
import { StudentDetailsScreen } from '../../src/screens/student/StudentDetailsScreen';
import { StudentEnrollmentHistoryScreen } from '../../src/screens/student/StudentEnrollmentHistoryScreen';
import { StudentGuardiansScreen } from '../../src/screens/student/StudentGuardiansScreen';
import { StudentSelfProfileScreen } from '../../src/screens/student/StudentSelfProfileScreen';
import { StudentsScreen } from '../../src/screens/student/StudentsScreen';
import { TransferStudentScreen } from '../../src/screens/student/TransferStudentScreen';
import { authStore, INITIAL_AUTH_STATE } from '../../src/store/auth/authStore';
import {
  INITIAL_STUDENT_STATE,
  studentStore,
} from '../../src/store/student/studentStore';
import {
  INITIAL_USER_MANAGEMENT_STATE,
  userManagementStore,
} from '../../src/store/userManagement/userManagementStore';

jest.mock('react-native-keychain', () => ({
  getAllGenericPasswordServices: jest.fn().mockResolvedValue([]),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  setGenericPassword: jest.fn().mockResolvedValue({ service: 'test' }),
}));

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
}));

const metrics = {
  frame: { height: 800, width: 400, x: 0, y: 0 },
  insets: { bottom: 0, left: 0, right: 0, top: 24 },
};
const schoolAdmin: UserMembership = {
  id: 'membership-school-admin',
  role: 'SCHOOL_ADMIN',
  schoolId: 'school-omt',
  status: 'ACTIVE',
  userId: 'user-school-admin',
};
const profile = {
  address: {
    city: 'Bhubaneswar',
    country: 'India',
    line1: '10 Education Road',
    pinCode: '751001',
    state: 'Odisha',
  },
  admissionDate: '2026-04-01',
  admissionNumber: 'OMT-2026-0001',
  createdAt: '2026-04-01T00:00:00.000Z',
  dateOfBirth: '2015-05-14',
  fullName: 'Rahul Patel',
  gender: 'MALE' as const,
  id: 'student-rahul',
  schoolId: 'school-omt',
  status: 'ACTIVE' as const,
  updatedAt: '2026-07-01T00:00:00.000Z',
};
const enrollment = {
  academicSessionId: 'session-school-omt-current',
  academicSessionName: '2026-27',
  branchId: 'branch-main',
  branchName: 'Main Branch',
  classId: 'class-omt-c01',
  className: 'Class 1',
  createdAt: profile.createdAt,
  id: 'enrollment-rahul-current',
  rollNumber: '1',
  schoolId: profile.schoolId,
  sectionId: 'section-omt-c01-a',
  sectionName: 'Section A',
  startDate: '2026-04-01',
  status: 'ACTIVE' as const,
  studentId: profile.id,
  updatedAt: profile.updatedAt,
};
const guardian: GuardianDetails = {
  address: profile.address,
  createdAt: profile.createdAt,
  fullName: 'Meera Patel',
  id: 'guardian-rahul',
  link: {
    createdAt: profile.createdAt,
    guardianId: 'guardian-rahul',
    id: 'link-rahul',
    isEmergencyContact: true,
    isFeeContact: true,
    isPrimaryContact: true,
    parentAppAccessEnabled: true,
    status: 'ACTIVE',
    studentId: profile.id,
    updatedAt: profile.updatedAt,
    whatsappEnabled: true,
  },
  linkedChildrenCount: 2,
  mobile: '9876543212',
  relationship: 'MOTHER',
  schoolId: profile.schoolId,
  updatedAt: profile.updatedAt,
};
const details: StudentDetails = {
  access: {
    parentMemberships: [
      {
        guardianId: guardian.id,
        guardianName: guardian.fullName,
        linkedStudentIds: [profile.id, 'student-isha'],
        membershipId: 'membership-parent',
        mobile: guardian.mobile,
        status: 'ACTIVE',
        userId: 'user-parent',
      },
    ],
  },
  currentEnrollment: enrollment,
  enrollmentCount: 2,
  guardians: [guardian],
  profile,
  statusHistory: [],
};
const validDraft: StudentAdmissionDraft = {
  enableStudentAppAccess: false,
  enrollment: {
    academicSessionId: enrollment.academicSessionId,
    branchId: enrollment.branchId,
    classId: enrollment.classId,
    sectionId: enrollment.sectionId,
  },
  guardians: [
    {
      address: guardian.address,
      fullName: guardian.fullName,
      isEmergencyContact: true,
      isFeeContact: true,
      isPrimaryContact: true,
      mobile: guardian.mobile,
      parentAppAccessEnabled: true,
      relationship: guardian.relationship,
      whatsappEnabled: true,
    },
  ],
  profile: {
    address: profile.address,
    admissionDate: profile.admissionDate,
    dateOfBirth: profile.dateOfBirth,
    fullName: profile.fullName,
    gender: profile.gender,
  },
  step: 5,
};

let mountedRenderer: ReactTestRenderer.ReactTestRenderer | null = null;

function withSafeArea(element: React.ReactElement) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>
  );
}

function navigation<RouteName extends keyof RoleStackParamList>() {
  return {
    goBack: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
  } as unknown as NativeStackScreenProps<
    RoleStackParamList,
    RouteName
  >['navigation'];
}

function route<RouteName extends keyof RoleStackParamList>(
  name: RouteName,
  params: RoleStackParamList[RouteName],
) {
  return {
    key: `${String(name)}-test`,
    name,
    params,
  } as unknown as NativeStackScreenProps<
    RoleStackParamList,
    RouteName
  >['route'];
}

function text(renderer: ReactTestRenderer.ReactTestRenderer): string {
  return renderer.root
    .findAll(node => typeof node.props.children === 'string')
    .map(node => node.props.children as string)
    .join(' ');
}

async function render(element: React.ReactElement) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(withSafeArea(element));
  });
  mountedRenderer = renderer!;
  return mountedRenderer;
}

async function press(
  renderer: ReactTestRenderer.ReactTestRenderer,
  accessibilityLabel: string,
) {
  const button = renderer.root.findAllByProps({ accessibilityLabel })[0];
  await ReactTestRenderer.act(async () => button.props.onPress());
}

beforeEach(() => {
  authStore.setState({
    ...INITIAL_AUTH_STATE,
    activeMembership: schoolAdmin,
    memberships: [schoolAdmin],
    status: 'authenticated',
    user: {
      id: schoolAdmin.userId,
      name: 'Ananya Sharma',
      status: 'ACTIVE',
    },
  });
  userManagementStore.setState(INITIAL_USER_MANAGEMENT_STATE);
  studentStore.setState({
    ...INITIAL_STUDENT_STATE,
    access: details.access,
    admissionDraft: validDraft,
    admissionResult: {
      access: details.access,
      activeEnrollment: enrollment,
      guardianLinks: [guardian],
      profile,
    },
    currentStudent: details,
    enrollmentHistory: [
      enrollment,
      {
        ...enrollment,
        endDate: '2026-03-31',
        id: 'enrollment-rahul-previous',
        startDate: '2025-04-01',
        status: 'COMPLETED',
      },
    ],
    guardians: [guardian],
    loadAccess: jest.fn().mockResolvedValue(undefined),
    loadEnrollmentHistory: jest.fn().mockResolvedValue(undefined),
    loadGuardians: jest.fn().mockResolvedValue(undefined),
    loadParentChild: jest.fn().mockResolvedValue(true),
    loadParentChildren: jest.fn().mockResolvedValue(undefined),
    loadSelfProfile: jest.fn().mockResolvedValue(true),
    loadStudent: jest.fn().mockResolvedValue(true),
    loadStudents: jest.fn().mockResolvedValue(undefined),
    parentChildren: [
      { currentEnrollment: enrollment, primaryGuardian: guardian, profile },
    ],
    parentSelectedChild: details,
    selfProfile: details,
    setQuery: jest.fn(),
    setSchoolContext: jest.fn(),
    students: {
      items: [
        { currentEnrollment: enrollment, primaryGuardian: guardian, profile },
      ],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
  });
});

afterEach(async () => {
  if (mountedRenderer) {
    await ReactTestRenderer.act(async () => mountedRenderer?.unmount());
    mountedRenderer = null;
  }
});

describe('student and Parent screens', () => {
  it('renders the student list and search foundation', async () => {
    const renderer = await render(
      <StudentsScreen
        navigation={navigation<'Students'>()}
        route={route('Students', { schoolId: 'school-omt' })}
      />,
    );
    expect(text(renderer)).toContain('Rahul Patel');
    expect(text(renderer)).toContain('OMT-2026-0001');
    expect(
      renderer.root.findAllByProps({
        placeholder: 'Search name, admission, roll, or guardian mobile',
      }).length,
    ).toBeGreaterThan(0);
  });

  it('renders the student list empty state', async () => {
    studentStore.setState({
      students: {
        items: [],
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
      },
    });
    const renderer = await render(
      <StudentsScreen
        navigation={navigation<'Students'>()}
        route={route('Students', { schoolId: 'school-omt' })}
      />,
    );
    expect(text(renderer)).toContain('No students found');
  });

  it('validates admission Student step 1', async () => {
    studentStore.setState({
      admissionDraft: {
        ...validDraft,
        guardians: [],
        profile: {
          ...validDraft.profile,
          address: {
            city: '',
            country: 'India',
            line1: '',
            pinCode: '',
            state: '',
          },
          dateOfBirth: '',
          fullName: '',
        },
        step: 1,
      },
    });
    const renderer = await render(
      <CreateStudentScreen
        navigation={navigation<'CreateStudent'>()}
        route={route('CreateStudent', { schoolId: 'school-omt' })}
      />,
    );
    await press(renderer, 'Continue');
    expect(text(renderer)).toContain('Student name is required.');
  });

  it('validates the guardian admission step', async () => {
    studentStore.setState({
      admissionDraft: { ...validDraft, guardians: [], step: 2 },
    });
    const renderer = await render(
      <CreateStudentScreen
        navigation={navigation<'CreateStudent'>()}
        route={route('CreateStudent', { schoolId: 'school-omt' })}
      />,
    );
    await press(renderer, 'Continue');
    expect(text(renderer)).toContain('Guardian name is required.');
  });

  it('validates the enrollment admission step', async () => {
    studentStore.setState({
      admissionDraft: {
        ...validDraft,
        enrollment: {
          academicSessionId: '',
          branchId: '',
          classId: '',
          sectionId: '',
        },
        step: 3,
      },
    });
    const renderer = await render(
      <CreateStudentScreen
        navigation={navigation<'CreateStudent'>()}
        route={route('CreateStudent', { schoolId: 'school-omt' })}
      />,
    );
    await press(renderer, 'Continue');
    expect(text(renderer)).toContain('Branch is required.');
  });

  it('renders the full admission review', async () => {
    const renderer = await render(
      <StudentAdmissionReviewScreen
        navigation={navigation<'StudentAdmissionReview'>()}
        route={route('StudentAdmissionReview', { schoolId: 'school-omt' })}
      />,
    );
    expect(text(renderer)).toContain('Review Admission');
    expect(text(renderer)).toContain('Meera Patel');
    expect(text(renderer)).toContain('section-omt-c01-a');
  });

  it('renders the admission success receipt', async () => {
    const renderer = await render(
      <StudentAdmissionSuccessScreen
        navigation={navigation<'StudentAdmissionSuccess'>()}
        route={route('StudentAdmissionSuccess', { schoolId: 'school-omt' })}
      />,
    );
    expect(text(renderer)).toContain('Admission Complete');
    expect(text(renderer)).toContain('OMT-2026-0001');
  });

  it('renders structured student details', async () => {
    const renderer = await render(
      <StudentDetailsScreen
        navigation={navigation<'StudentDetails'>()}
        route={route('StudentDetails', {
          schoolId: 'school-omt',
          studentId: profile.id,
        })}
      />,
    );
    expect(text(renderer)).toContain('Student Details');
    expect(text(renderer)).toContain('Current Enrollment');
    expect(text(renderer)).toContain('Guardian Summary');
  });

  it('renders and protects the guardian list', async () => {
    const renderer = await render(
      <StudentGuardiansScreen
        navigation={navigation<'StudentGuardians'>()}
        route={route('StudentGuardians', {
          schoolId: 'school-omt',
          studentId: profile.id,
        })}
      />,
    );
    expect(text(renderer)).toContain('Meera Patel');
    expect(
      renderer.root.findByProps({ accessibilityLabel: 'Unlink' }).props
        .accessibilityState.disabled,
    ).toBe(true);
  });

  it('renders enrollment history as a timeline', async () => {
    const renderer = await render(
      <StudentEnrollmentHistoryScreen
        navigation={navigation<'StudentEnrollmentHistory'>()}
        route={route('StudentEnrollmentHistory', {
          schoolId: 'school-omt',
          studentId: profile.id,
        })}
      />,
    );
    expect(text(renderer)).toContain('Enrollment History');
    expect(text(renderer)).toContain('Previous enrollment');
  });

  it('validates the transfer reason before confirmation', async () => {
    const renderer = await render(
      <TransferStudentScreen
        navigation={navigation<'TransferStudent'>()}
        route={route('TransferStudent', {
          schoolId: 'school-omt',
          studentId: profile.id,
        })}
      />,
    );
    await press(renderer, 'Review Transfer');
    expect(text(renderer)).toContain('Transfer reason is required.');
  });

  it('renders Parent and Student identity access controls', async () => {
    const renderer = await render(
      <StudentAccessScreen
        navigation={navigation<'StudentAccess'>()}
        route={route('StudentAccess', {
          schoolId: 'school-omt',
          studentId: profile.id,
        })}
      />,
    );
    expect(text(renderer)).toContain('Parent Access');
    expect(text(renderer)).toContain('Student Access');
    expect(text(renderer)).toContain('Disable Parent Access');
  });

  it('renders only the active Parent membership children', async () => {
    const renderer = await render(
      <ParentChildrenScreen
        navigation={navigation<'ParentChildren'>()}
        route={route('ParentChildren', {
          parentMembershipId: 'membership-parent',
          schoolId: 'school-omt',
        })}
      />,
    );
    expect(text(renderer)).toContain('My Children');
    expect(text(renderer)).toContain('Rahul Patel');
  });

  it('renders a read-only Parent child detail', async () => {
    const renderer = await render(
      <ParentChildDetailsScreen
        navigation={navigation<'ParentChildDetails'>()}
        route={route('ParentChildDetails', {
          parentMembershipId: 'membership-parent',
          schoolId: 'school-omt',
          studentId: profile.id,
        })}
      />,
    );
    expect(text(renderer)).toContain('Read-only school record');
    expect(text(renderer)).toContain('Family Contacts');
    expect(text(renderer)).not.toContain('Edit');
  });

  it('renders a read-only Student self profile', async () => {
    const renderer = await render(
      <StudentSelfProfileScreen
        navigation={navigation<'StudentSelfProfile'>()}
        route={route('StudentSelfProfile', {
          schoolId: 'school-omt',
          studentMembershipId: 'membership-student',
        })}
      />,
    );
    expect(text(renderer)).toContain('My Profile');
    expect(text(renderer)).toContain('Read-only student record');
    expect(text(renderer)).not.toContain('Edit');
  });
});
