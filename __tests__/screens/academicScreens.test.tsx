import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type {
  AcademicClass,
  AcademicSetupSummary,
  ClassSubjectAssignment,
  Section,
  Subject,
} from '../../src/models/academic';
import type { UserMembership } from '../../src/models/auth';
import type {
  CurrentSchool,
  OrganizationBranch,
} from '../../src/models/currentOrganization';
import type {
  AcademicSession,
  Branch,
  School,
} from '../../src/models/organization';
import type { RoleStackParamList } from '../../src/navigation/navigationTypes';
import { AcademicSetupScreen } from '../../src/screens/academic/AcademicSetupScreen';
import { ClassesScreen } from '../../src/screens/academic/ClassesScreen';
import { ClassDetailsScreen } from '../../src/screens/academic/ClassDetailsScreen';
import { ClassSubjectAssignmentScreen } from '../../src/screens/academic/ClassSubjectAssignmentScreen';
import { CreateClassScreen } from '../../src/screens/academic/CreateClassScreen';
import { CreateSectionScreen } from '../../src/screens/academic/CreateSectionScreen';
import { CreateSubjectScreen } from '../../src/screens/academic/CreateSubjectScreen';
import { SectionsScreen } from '../../src/screens/academic/SectionsScreen';
import { SubjectDetailsScreen } from '../../src/screens/academic/SubjectDetailsScreen';
import { SubjectsScreen } from '../../src/screens/academic/SubjectsScreen';
import {
  academicStore,
  INITIAL_ACADEMIC_STATE,
} from '../../src/store/academic/academicStore';
import { authStore, INITIAL_AUTH_STATE } from '../../src/store/auth/authStore';
import {
  INITIAL_ORGANIZATION_STATE,
  organizationStore,
} from '../../src/store/organization/organizationStore';
import {
  currentOrganizationStore,
  INITIAL_CURRENT_ORGANIZATION_STATE,
} from '../../src/store/organization/currentOrganizationStore';
import { currentStaffStore, INITIAL_CURRENT_STAFF_STATE } from '../../src/store/userManagement/currentStaffStore';
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
const membership: UserMembership = {
  id: 'membership-school-admin',
  role: 'SCHOOL_ADMIN',
  schoolId: 'school-omt',
  schoolName: 'OhMyTeacher Demo School',
  status: 'ACTIVE',
  userId: 'user-school-admin',
};
const school: School = {
  activeBranchCount: 1,
  address: {
    city: 'Bhubaneswar',
    country: 'India',
    line1: 'Education Road',
    pinCode: '751001',
    state: 'Odisha',
  },
  branchCount: 1,
  code: 'OMT001',
  createdAt: '2025-04-01T09:00:00.000Z',
  id: 'school-omt',
  mobile: '9876543200',
  name: 'OhMyTeacher Demo School',
  status: 'ACTIVE',
  updatedAt: '2026-07-15T10:00:00.000Z',
};
const branch: Branch = {
  address: school.address,
  code: 'MAIN',
  createdAt: school.createdAt,
  id: 'branch-main',
  isMainBranch: true,
  mobile: school.mobile,
  name: 'Main Branch',
  schoolId: school.id,
  status: 'ACTIVE',
  updatedAt: school.updatedAt,
};
const currentSchool: CurrentSchool = {
  address: school.address.line1,
  createdAt: school.createdAt,
  email: '',
  id: school.id,
  name: school.name,
  phone: school.mobile,
  status: 'ACTIVE',
  upiId: '',
};
const currentBranch: OrganizationBranch = {
  address: branch.address.line1,
  code: branch.code,
  createdAt: branch.createdAt,
  email: '',
  id: branch.id,
  name: branch.name,
  phone: branch.mobile,
  schoolId: school.id,
  status: 'ACTIVE',
};
const activeSession: AcademicSession = {
  createdAt: school.createdAt,
  endDate: '2027-03-31',
  id: 'session-school-omt-current',
  name: '2026-27',
  schoolId: school.id,
  startDate: '2026-04-01',
  status: 'ACTIVE',
  updatedAt: school.updatedAt,
};
const closedSession: AcademicSession = {
  ...activeSession,
  endDate: '2026-03-31',
  id: 'session-school-omt-closed',
  name: '2025-26',
  startDate: '2025-04-01',
  status: 'CLOSED',
};
const context = {
  academicSessionId: activeSession.id,
  branchId: branch.id,
  schoolId: school.id,
};
const academicClass: AcademicClass = {
  ...context,
  activeSectionCount: 1,
  assignedSubjectCount: 2,
  code: 'C05',
  createdAt: school.createdAt,
  displayOrder: 5,
  id: 'class-omt-c05',
  name: 'Class 5',
  sectionCount: 1,
  status: 'ACTIVE',
  updatedAt: school.updatedAt,
};
const section: Section = {
  capacity: 40,
  classId: academicClass.id,
  code: 'A',
  createdAt: school.createdAt,
  displayOrder: 1,
  id: 'section-c05-a',
  name: 'Section A',
  status: 'ACTIVE',
  updatedAt: school.updatedAt,
};
const subject: Subject = {
  activeAssignmentCount: 1,
  code: 'ENG',
  createdAt: school.createdAt,
  displayOrder: 1,
  id: 'subject-omt-eng',
  name: 'English',
  schoolId: school.id,
  shortName: 'Eng',
  status: 'ACTIVE',
  type: 'CORE',
  updatedAt: school.updatedAt,
};
const assignment: ClassSubjectAssignment = {
  ...context,
  classId: academicClass.id,
  createdAt: school.createdAt,
  displayOrder: 1,
  id: 'assignment-c05-eng',
  status: 'ACTIVE',
  subjectId: subject.id,
  teacherId: 'teacher-1',
  updatedAt: school.updatedAt,
};
const summary: AcademicSetupSummary = {
  activeClasses: 10,
  activeSubjects: 7,
  classesWithoutSections: 2,
  totalClasses: 11,
  totalSections: 15,
  unassignedClasses: 1,
};

const roleParams = {
  academicSessionId: activeSession.id,
  branchId: branch.id,
  schoolId: school.id,
};
const classParams = { ...roleParams, classId: academicClass.id };

const originalAcademicActions = {
  createClass: academicStore.getState().createClass,
  createSection: academicStore.getState().createSection,
  createSubject: academicStore.getState().createSubject,
  loadAssignments: academicStore.getState().loadAssignments,
  loadClass: academicStore.getState().loadClass,
  loadClasses: academicStore.getState().loadClasses,
  loadSections: academicStore.getState().loadSections,
  loadSetupSummary: academicStore.getState().loadSetupSummary,
  loadSubject: academicStore.getState().loadSubject,
  loadSubjects: academicStore.getState().loadSubjects,
  setClassQuery: academicStore.getState().setClassQuery,
  setSectionQuery: academicStore.getState().setSectionQuery,
  setSubjectQuery: academicStore.getState().setSubjectQuery,
};
const originalOrganizationActions = {
  loadAcademicSessions:
    organizationStore.getState().loadAcademicSessions,
  loadBranches: organizationStore.getState().loadBranches,
  loadSchool: organizationStore.getState().loadSchool,
};
const originalCurrentOrganizationActions = {
  loadBranches: currentOrganizationStore.getState().loadBranches,
  loadCurrentSchool: currentOrganizationStore.getState().loadCurrentSchool,
};
let mountedRenderer: ReactTestRenderer.ReactTestRenderer | null = null;

function page<T>(items: T[]) {
  return {
    items,
    page: 1,
    pageSize: 20,
    totalItems: items.length,
    totalPages: items.length ? 1 : 0,
  };
}

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

async function dispose(renderer: ReactTestRenderer.ReactTestRenderer) {
  await ReactTestRenderer.act(async () => renderer.unmount());
  if (mountedRenderer === renderer) mountedRenderer = null;
}

beforeEach(() => {
  authStore.setState({
    ...INITIAL_AUTH_STATE,
    activeMembership: membership,
    memberships: [membership],
    status: 'authenticated',
    user: { id: 'user-school-admin', name: 'Ananya Sharma', status: 'ACTIVE' },
  });
  userManagementStore.setState(INITIAL_USER_MANAGEMENT_STATE);
  organizationStore.setState({
    ...INITIAL_ORGANIZATION_STATE,
    academicSessions: [closedSession, activeSession],
    branches: page([branch]),
    currentSchool: school,
    loadAcademicSessions: jest.fn().mockResolvedValue(undefined),
    loadBranches: jest.fn().mockResolvedValue(undefined),
    loadSchool: jest.fn().mockResolvedValue(true),
  });
  currentOrganizationStore.setState({
    ...INITIAL_CURRENT_ORGANIZATION_STATE,
    allBranches: [currentBranch],
    branches: {
      items: [currentBranch],
      pagination: null,
      totalItems: 1,
    },
    currentSchool,
    loadBranches: jest.fn().mockResolvedValue(true),
    loadCurrentSchool: jest.fn().mockResolvedValue(true),
  });
  academicStore.setState({
    ...INITIAL_ACADEMIC_STATE,
    assignments: [assignment],
    classes: page([academicClass]),
    context,
    currentClass: academicClass,
    currentSection: section,
    currentSubject: subject,
    createClass: jest.fn().mockResolvedValue(null),
    createSection: jest.fn().mockResolvedValue(null),
    createSubject: jest.fn().mockResolvedValue(null),
    loadAssignments: jest.fn().mockResolvedValue(undefined),
    loadClass: jest.fn().mockResolvedValue(true),
    loadClasses: jest.fn().mockResolvedValue(undefined),
    loadSections: jest.fn().mockResolvedValue(undefined),
    loadSetupSummary: jest.fn().mockResolvedValue(undefined),
    loadSubject: jest.fn().mockResolvedValue(true),
    loadSubjects: jest.fn().mockResolvedValue(undefined),
    sections: page([section]),
    sessionStatus: 'ACTIVE',
    setClassQuery: jest.fn(),
    setSectionQuery: jest.fn(),
    setSubjectQuery: jest.fn(),
    subjects: page([subject]),
    summary,
  });
  currentStaffStore.setState({
    ...INITIAL_CURRENT_STAFF_STATE,
    loadStaff: jest.fn().mockResolvedValue(true),
    staff: {
      items: [{ branch: { id: branch.id, name: branch.name, status: 'ACTIVE' }, id: 'teacher-1', joinedAt: school.createdAt, mobile: '9000000000', name: 'Teacher One', role: 'TEACHER', schoolId: school.id, status: 'ACTIVE' }],
      pagination: null,
      totalItems: 1,
    },
  });
});

afterEach(async () => {
  if (mountedRenderer) await dispose(mountedRenderer);
});

afterAll(() => {
  academicStore.setState(originalAcademicActions);
  organizationStore.setState(originalOrganizationActions);
  currentOrganizationStore.setState(originalCurrentOrganizationActions);
});

test('academic setup overview renders', async () => {
  const renderer = await render(
    <AcademicSetupScreen
      navigation={navigation<'AcademicSetup'>()}
      route={route('AcademicSetup', { schoolId: school.id })}
    />,
  );
  expect(renderer.root.findByProps({ testID: 'academic-setup-screen' })).toBeTruthy();
  expect(text(renderer)).toContain('Active subjects');
  expect(text(renderer)).toContain('Setup attention');
  await dispose(renderer);
});

test('academic context bar switches sessions without restoring route defaults', async () => {
  const renderer = await render(
    <AcademicSetupScreen
      navigation={navigation<'AcademicSetup'>()}
      route={route('AcademicSetup', {
        academicSessionId: activeSession.id,
        branchId: branch.id,
        schoolId: school.id,
      })}
    />,
  );
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: '2025-26 · Closed' })
      .props.onPress();
  });
  expect(academicStore.getState().context?.academicSessionId).toBe(
    closedSession.id,
  );
  expect(academicStore.getState().sessionStatus).toBe('CLOSED');
  await dispose(renderer);
});

test('classes list renders', async () => {
  const renderer = await render(
    <ClassesScreen
      navigation={navigation<'Classes'>()}
      route={route('Classes', roleParams)}
    />,
  );
  expect(text(renderer)).toContain('Class 5');
  expect(text(renderer)).toContain('Deactivate');
  await dispose(renderer);
});

test('class empty state renders', async () => {
  academicStore.setState({ classes: page([]) });
  const renderer = await render(
    <ClassesScreen
      navigation={navigation<'Classes'>()}
      route={route('Classes', roleParams)}
    />,
  );
  expect(text(renderer)).toContain('No classes found');
  await dispose(renderer);
});

test('create class validates required fields', async () => {
  const renderer = await render(
    <CreateClassScreen
      navigation={navigation<'CreateClass'>()}
      route={route('CreateClass', roleParams)}
    />,
  );
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Create Class' })
      .props.onPress();
  });
  expect(text(renderer)).toContain('Name is required.');
  expect(text(renderer)).toContain('Name is required.');
  await dispose(renderer);
});

test('class details renders', async () => {
  const renderer = await render(
    <ClassDetailsScreen
      navigation={navigation<'ClassDetails'>()}
      route={route('ClassDetails', classParams)}
    />,
  );
  expect(text(renderer)).toContain('Class 5');
  expect(text(renderer)).toContain('View Sections');
  await dispose(renderer);
});

test('sections list renders', async () => {
  const renderer = await render(
    <SectionsScreen
      navigation={navigation<'Sections'>()}
      route={route('Sections', classParams)}
    />,
  );
  expect(text(renderer)).toContain('Sections');
  expect(text(renderer)).toContain('Deactivate');
  await dispose(renderer);
});

test('create section validates required fields', async () => {
  const renderer = await render(
    <CreateSectionScreen
      navigation={navigation<'CreateSection'>()}
      route={route('CreateSection', classParams)}
    />,
  );
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Create Section' })
      .props.onPress();
  });
  expect(text(renderer)).toContain('Name is required.');
  expect(text(renderer)).toContain('Name is required.');
  await dispose(renderer);
});

test('subjects list renders', async () => {
  const renderer = await render(
    <SubjectsScreen
      navigation={navigation<'Subjects'>()}
      route={route('Subjects', roleParams)}
    />,
  );
  expect(text(renderer)).toContain('Subject Catalog');
  expect(text(renderer)).toContain('Edit');
  await dispose(renderer);
});

test('create subject validates required fields', async () => {
  const renderer = await render(
    <CreateSubjectScreen
      navigation={navigation<'CreateSubject'>()}
      route={route('CreateSubject', { schoolId: school.id })}
    />,
  );
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Create Subject' })
      .props.onPress();
  });
  expect(text(renderer)).toContain('Name is required.');
  expect(text(renderer)).toContain('Optional school subject code.');
  await dispose(renderer);
});

test('subject details renders', async () => {
  const renderer = await render(
    <SubjectDetailsScreen
      navigation={navigation<'SubjectDetails'>()}
      route={route('SubjectDetails', {
        schoolId: school.id,
        subjectId: subject.id,
      })}
    />,
  );
  expect(text(renderer)).toContain('English');
  expect(text(renderer)).toContain('Deactivate');
  await dispose(renderer);
});

test('class-subject assignment renders', async () => {
  const renderer = await render(
    <ClassSubjectAssignmentScreen
      navigation={navigation<'ClassSubjectAssignment'>()}
      route={route('ClassSubjectAssignment', classParams)}
    />,
  );
  expect(
    renderer.root.findByProps({
      testID: 'class-subject-assignment-screen',
    }),
  ).toBeTruthy();
  expect(text(renderer)).toContain('Assigned');
  expect(text(renderer)).toContain('Save Teacher Assignments');
  await dispose(renderer);
});

test('closed-session read-only state renders', async () => {
  academicStore.setState({
    context: {
      ...context,
      academicSessionId: closedSession.id,
    },
    sessionStatus: 'CLOSED',
  });
  const renderer = await render(
    <AcademicSetupScreen
      navigation={navigation<'AcademicSetup'>()}
      route={route('AcademicSetup', {
        academicSessionId: closedSession.id,
        branchId: branch.id,
        schoolId: school.id,
      })}
    />,
  );
  expect(text(renderer)).toContain('strictly read-only');
  expect(text(renderer)).toContain('CLOSED');
  await dispose(renderer);
});
