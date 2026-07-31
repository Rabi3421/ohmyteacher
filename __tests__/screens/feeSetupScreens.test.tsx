import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { UserMembership } from '../../src/models/auth';
import type { RoleStackParamList } from '../../src/navigation/navigationTypes';
import { CreateFeeHeadScreen } from '../../src/screens/feeSetup/CreateFeeHeadScreen';
import { CreateFeeStructureScreen } from '../../src/screens/feeSetup/CreateFeeStructureScreen';
import { DiscountDefinitionsScreen } from '../../src/screens/feeSetup/DiscountDefinitionsScreen';
import { FeeHeadDetailsScreen } from '../../src/screens/feeSetup/FeeHeadDetailsScreen';
import { FeeHeadsScreen } from '../../src/screens/feeSetup/FeeHeadsScreen';
import { FeeSetupScreen } from '../../src/screens/feeSetup/FeeSetupScreen';
import { FeeStructureDetailsScreen } from '../../src/screens/feeSetup/FeeStructureDetailsScreen';
import { FeeStructurePreviewScreen } from '../../src/screens/feeSetup/FeeStructurePreviewScreen';
import { FeeStructuresScreen } from '../../src/screens/feeSetup/FeeStructuresScreen';
import { FineRulesScreen } from '../../src/screens/feeSetup/FineRulesScreen';
import { StudentFeeAssignmentDetailsScreen } from '../../src/screens/feeSetup/StudentFeeAssignmentDetailsScreen';
import { StudentFeeAssignmentsScreen } from '../../src/screens/feeSetup/StudentFeeAssignmentsScreen';
import { StudentPayablePreviewScreen } from '../../src/screens/feeSetup/StudentPayablePreviewScreen';
import {
  INITIAL_DISCOUNTS,
  INITIAL_FEE_HEADS,
  INITIAL_FEE_STRUCTURES,
  INITIAL_FINE_RULES,
} from '../../src/services/feeSetup/feeSetupFixtures';
import { authStore, INITIAL_AUTH_STATE } from '../../src/store/auth/authStore';
import {
  feeSetupStore,
  INITIAL_FEE_SETUP_STATE,
} from '../../src/store/feeSetup/feeSetupStore';
import {
  INITIAL_ORGANIZATION_STATE,
  organizationStore,
} from '../../src/store/organization/organizationStore';
import {
  INITIAL_USER_MANAGEMENT_STATE,
  userManagementStore,
} from '../../src/store/userManagement/userManagementStore';
import { calculateEffectiveFee } from '../../src/utils/feeCalculation';

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
const admin: UserMembership = {
  id: 'membership-school-admin',
  role: 'SCHOOL_ADMIN',
  schoolId: 'school-omt',
  status: 'ACTIVE',
  userId: 'admin',
};
const branch = {
  address: {
    city: 'Bhubaneswar',
    country: 'India',
    line1: 'Road',
    pinCode: '751001',
    state: 'Odisha',
  },
  code: 'MAIN',
  createdAt: '',
  id: 'branch-main',
  isMainBranch: true,
  mobile: '9876543210',
  name: 'Main Branch',
  schoolId: 'school-omt',
  status: 'ACTIVE' as const,
  updatedAt: '',
};
const session = {
  createdAt: '',
  endDate: '2027-03-31',
  id: 'session-school-omt-current',
  name: '2026-27',
  schoolId: 'school-omt',
  startDate: '2026-04-01',
  status: 'ACTIVE' as const,
  updatedAt: '',
};
const params = {
  academicSessionId: session.id,
  branchId: branch.id,
  schoolId: 'school-omt',
  sessionStatus: session.status,
};
const structure = INITIAL_FEE_STRUCTURES[0];
const preview = calculateEffectiveFee({
  discountAssignments: [],
  discountDefinitions: [],
  overrides: [],
  selections: [],
  structure,
});
const summary = {
  admissionNumber: 'OMT-2026-0001',
  assignmentId: 'assignment',
  assignmentStatus: 'ASSIGNED' as const,
  className: 'Class 1',
  discountCount: 0,
  effectivePayablePaise: preview.netConfiguredAmountPaise,
  enrollmentId: 'enrollment-student-rahul-current',
  feeStructureName: structure.name,
  rollNumber: '1',
  sectionName: 'Section A',
  selectedOptionalCount: 1,
  studentId: 'student-rahul',
  studentName: 'Rahul Patel',
};
let mounted: ReactTestRenderer.ReactTestRenderer | null = null;
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
  routeParams: RoleStackParamList[RouteName],
) {
  return {
    key: `${String(name)}-test`,
    name,
    params: routeParams,
  } as unknown as NativeStackScreenProps<
    RoleStackParamList,
    RouteName
  >['route'];
}
async function render(element: React.ReactElement) {
  await ReactTestRenderer.act(async () => {
    mounted = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>,
    );
  });
  return mounted!;
}
function text(renderer: ReactTestRenderer.ReactTestRenderer) {
  type JsonNode = ReactTestRenderer.ReactTestRendererJSON | string | null;
  function collect(node: JsonNode | JsonNode[]): string {
    if (node === null) return '';
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(collect).join(' ');
    return collect(node.children ?? []);
  }
  return collect(renderer.toJSON());
}
async function press(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  const button = renderer.root.findAllByProps({ accessibilityLabel: label })[0];
  await ReactTestRenderer.act(async () => button.props.onPress());
}
beforeEach(() => {
  authStore.setState({
    ...INITIAL_AUTH_STATE,
    activeMembership: admin,
    memberships: [admin],
    status: 'authenticated',
    user: { id: 'admin', name: 'Admin', status: 'ACTIVE' },
  });
  userManagementStore.setState(INITIAL_USER_MANAGEMENT_STATE);
  organizationStore.setState({
    ...INITIAL_ORGANIZATION_STATE,
    academicSessions: [session],
    branches: {
      items: [branch],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
    currentSchool: {
      activeBranchCount: 1,
      address: branch.address,
      branchCount: 1,
      code: 'OMT001',
      createdAt: '',
      id: 'school-omt',
      mobile: branch.mobile,
      name: 'OMT School',
      status: 'ACTIVE',
      updatedAt: '',
    },
    loadAcademicSessions: jest.fn().mockResolvedValue(undefined),
    loadBranches: jest.fn().mockResolvedValue(undefined),
    loadSchool: jest.fn().mockResolvedValue(true),
  });
  feeSetupStore.setState({
    ...INITIAL_FEE_SETUP_STATE,
    assignments: {
      items: [summary],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
    context: {
      academicSessionId: session.id,
      branchId: branch.id,
      schoolId: 'school-omt',
    },
    currentAssignment: {
      availableDiscounts: INITIAL_DISCOUNTS,
      feeStructure: structure,
      preview,
      summary,
    },
    currentFeeHead: INITIAL_FEE_HEADS[0],
    currentFeeStructure: structure,
    discounts: {
      items: INITIAL_DISCOUNTS,
      page: 1,
      pageSize: 20,
      totalItems: INITIAL_DISCOUNTS.length,
      totalPages: 1,
    },
    feeHeads: {
      items: INITIAL_FEE_HEADS,
      page: 1,
      pageSize: 20,
      totalItems: INITIAL_FEE_HEADS.length,
      totalPages: 1,
    },
    feeStructures: {
      items: INITIAL_FEE_STRUCTURES.slice(0, 3),
      page: 1,
      pageSize: 20,
      totalItems: 3,
      totalPages: 1,
    },
    fineRules: {
      items: INITIAL_FINE_RULES,
      page: 1,
      pageSize: 20,
      totalItems: INITIAL_FINE_RULES.length,
      totalPages: 1,
    },
    loadAssignment: jest.fn().mockResolvedValue(true),
    loadAssignments: jest.fn().mockResolvedValue(undefined),
    loadDiscounts: jest.fn().mockResolvedValue(undefined),
    loadFeeHead: jest.fn().mockResolvedValue(true),
    loadFeeHeads: jest.fn().mockResolvedValue(undefined),
    loadFineRules: jest.fn().mockResolvedValue(undefined),
    loadStructure: jest.fn().mockResolvedValue(true),
    loadStructures: jest.fn().mockResolvedValue(undefined),
    loadSummary: jest.fn().mockResolvedValue(undefined),
    sessionStatus: 'ACTIVE',
    setAssignmentQuery: jest.fn(),
    setContext: jest.fn(),
    setFeeHeadQuery: jest.fn(),
    setStructureQuery: jest.fn(),
    summary: {
      activeDiscountDefinitions: 2,
      activeFeeHeads: 9,
      activeFineRules: 3,
      classesWithoutStructure: 10,
      classesWithStructure: 2,
      enrollmentsWithoutAssignment: 15,
      historicalInactiveHeadReferences: 0,
      studentsWithCustomAssignment: 1,
    },
  });
});
afterEach(async () => {
  if (mounted) await ReactTestRenderer.act(async () => mounted?.unmount());
  mounted = null;
});

describe('Fee Setup screens', () => {
  it('renders the Fee Setup overview', async () => {
    const renderer = await render(
      <FeeSetupScreen
        navigation={navigation<'FeeSetup'>()}
        route={route('FeeSetup', params)}
      />,
    );
    expect(text(renderer)).toContain('Classes without Structure');
  });
  it('renders Fee Heads', async () => {
    const renderer = await render(
      <FeeHeadsScreen
        navigation={navigation<'FeeHeads'>()}
        route={route('FeeHeads', params)}
      />,
    );
    expect(text(renderer)).toContain('Tuition Fee');
  });
  it('validates Create Fee Head', async () => {
    const renderer = await render(
      <CreateFeeHeadScreen
        navigation={navigation<'CreateFeeHead'>()}
        route={route('CreateFeeHead', params)}
      />,
    );
    await press(renderer, 'Create Fee Head');
    expect(text(renderer)).toContain('Fee Head name is required.');
  });
  it('renders Fee Head details and protected usage', async () => {
    const renderer = await render(
      <FeeHeadDetailsScreen
        navigation={navigation<'FeeHeadDetails'>()}
        route={route('FeeHeadDetails', {
          ...params,
          feeHeadId: INITIAL_FEE_HEADS[0].id,
        })}
      />,
    );
    expect(text(renderer)).toContain('active structure references');
  });
  it('renders Fee Structure list', async () => {
    const renderer = await render(
      <FeeStructuresScreen
        navigation={navigation<'FeeStructures'>()}
        route={route('FeeStructures', params)}
      />,
    );
    expect(text(renderer)).toContain('Class 1 Standard Fees');
  });
  it('validates Create Fee Structure step one', async () => {
    const renderer = await render(
      <CreateFeeStructureScreen
        navigation={navigation<'CreateFeeStructure'>()}
        route={route('CreateFeeStructure', params)}
      />,
    );
    await press(renderer, 'Continue');
    expect(text(renderer)).toContain('Structure name is required.');
  });
  it('renders Fee Structure details', async () => {
    const renderer = await render(
      <FeeStructureDetailsScreen
        navigation={navigation<'FeeStructureDetails'>()}
        route={route('FeeStructureDetails', {
          ...params,
          feeStructureId: structure.id,
        })}
      />,
    );
    expect(text(renderer)).toContain('Fee Items');
    expect(text(renderer)).toContain('Nominal item total');
  });
  it('renders configuration preview', async () => {
    const renderer = await render(
      <FeeStructurePreviewScreen
        navigation={navigation<'FeeStructurePreview'>()}
        route={route('FeeStructurePreview', {
          ...params,
          feeStructureId: structure.id,
        })}
      />,
    );
    expect(text(renderer)).toContain('Estimated Fee Configuration');
  });
  it('renders Student Fee Assignment list', async () => {
    const renderer = await render(
      <StudentFeeAssignmentsScreen
        navigation={navigation<'StudentFeeAssignments'>()}
        route={route('StudentFeeAssignments', params)}
      />,
    );
    expect(text(renderer)).toContain('Rahul Patel');
  });
  it('renders Student Fee Assignment details', async () => {
    const renderer = await render(
      <StudentFeeAssignmentDetailsScreen
        navigation={navigation<'StudentFeeAssignmentDetails'>()}
        route={route('StudentFeeAssignmentDetails', {
          ...params,
          enrollmentId: summary.enrollmentId,
          studentId: summary.studentId,
        })}
      />,
    );
    expect(text(renderer)).toContain('Configuration');
  });
  it('renders Discount and Fine Rule lists', async () => {
    const discountRenderer = await render(
      <DiscountDefinitionsScreen
        navigation={navigation<'DiscountDefinitions'>()}
        route={route('DiscountDefinitions', params)}
      />,
    );
    expect(text(discountRenderer)).toContain('Scholarship 20%');
    await ReactTestRenderer.act(async () => discountRenderer.unmount());
    mounted = null;
    const fineRenderer = await render(
      <FineRulesScreen
        navigation={navigation<'FineRules'>()}
        route={route('FineRules', params)}
      />,
    );
    expect(text(fineRenderer)).toContain('Daily Late Fine');
  });
  it('shows closed-session read-only state', async () => {
    feeSetupStore.setState({ sessionStatus: 'CLOSED' });
    const renderer = await render(
      <FeeSetupScreen
        navigation={navigation<'FeeSetup'>()}
        route={route('FeeSetup', {
          ...params,
          sessionStatus: 'CLOSED',
        })}
      />,
    );
    expect(text(renderer)).toContain('Configuration only');
  });
  it('keeps Accountant Fee Structures read-only', async () => {
    const accountant = {
      ...admin,
      branchId: branch.id,
      id: 'accountant',
      role: 'ACCOUNTANT' as const,
    };
    authStore.setState({ activeMembership: accountant, memberships: [accountant] });
    const renderer = await render(
      <FeeStructuresScreen
        navigation={navigation<'FeeStructures'>()}
        route={route('FeeStructures', params)}
      />,
    );
    expect(
      renderer.root.findAllByProps({ accessibilityLabel: 'Add' }),
    ).toHaveLength(0);
  });
  it('renders Student payable preview without payment data', async () => {
    const renderer = await render(
      <StudentPayablePreviewScreen
        navigation={navigation<'StudentPayablePreview'>()}
        route={route('StudentPayablePreview', {
          ...params,
          enrollmentId: summary.enrollmentId,
          studentId: summary.studentId,
        })}
      />,
    );
    expect(text(renderer)).toContain('not a due');
    expect(text(renderer)).not.toContain('Paid Amount');
  });
});
