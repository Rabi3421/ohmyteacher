import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { UserMembership } from '../../src/models/auth';
import type { RoleStackParamList } from '../../src/navigation/navigationTypes';
import { CancelFeeDueScreen } from '../../src/screens/feeDue/CancelFeeDueScreen';
import { FeeDueDetailsScreen } from '../../src/screens/feeDue/FeeDueDetailsScreen';
import { FeeGenerationHistoryScreen } from '../../src/screens/feeDue/FeeGenerationHistoryScreen';
import { FeeGenerationPreviewScreen } from '../../src/screens/feeDue/FeeGenerationPreviewScreen';
import { FeeGenerationResultScreen } from '../../src/screens/feeDue/FeeGenerationResultScreen';
import { FeeGenerationRunDetailsScreen } from '../../src/screens/feeDue/FeeGenerationRunDetailsScreen';
import { FeeOutstandingDashboardScreen } from '../../src/screens/feeDue/FeeOutstandingDashboardScreen';
import { FineAccrualPreviewScreen } from '../../src/screens/feeDue/FineAccrualPreviewScreen';
import { GenerateFeeDuesScreen } from '../../src/screens/feeDue/GenerateFeeDuesScreen';
import { OverdueFeesScreen } from '../../src/screens/feeDue/OverdueFeesScreen';
import { ParentFeesScreen } from '../../src/screens/feeDue/ParentFeesScreen';
import { ParentStudentFeeDetailsScreen } from '../../src/screens/feeDue/ParentStudentFeeDetailsScreen';
import { PendingFeesScreen } from '../../src/screens/feeDue/PendingFeesScreen';
import { StudentFeeDuesScreen } from '../../src/screens/feeDue/StudentFeeDuesScreen';
import { StudentFeesScreen } from '../../src/screens/feeDue/StudentFeesScreen';
import { WaiveFeeDueScreen } from '../../src/screens/feeDue/WaiveFeeDueScreen';
import {
  authStore,
  INITIAL_AUTH_STATE,
} from '../../src/store/auth/authStore';
import {
  feeDueStore,
  INITIAL_FEE_DUE_STATE,
} from '../../src/store/feeDue/feeDueStore';
import {
  INITIAL_ORGANIZATION_STATE,
  organizationStore,
} from '../../src/store/organization/organizationStore';
import { currentOrganizationStore } from '../../src/store/organization/currentOrganizationStore';
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
const admin: UserMembership = {
  branchId: 'branch-main',
  id: 'membership-school-admin',
  role: 'SCHOOL_ADMIN',
  schoolId: 'school-omt',
  status: 'ACTIVE',
  userId: 'user-school-admin',
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
      <SafeAreaProvider initialMetrics={metrics}>
        {element}
      </SafeAreaProvider>,
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

beforeEach(() => {
  authStore.setState({
    ...INITIAL_AUTH_STATE,
    activeMembership: admin,
    memberships: [admin],
    status: 'authenticated',
    user: {
      id: admin.userId,
      name: 'Admin',
      status: 'ACTIVE',
    },
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
      code: 'OMT',
      createdAt: '',
      id: 'school-omt',
      mobile: branch.mobile,
      name: 'OhMyTeacher School',
      status: 'ACTIVE',
      updatedAt: '',
    },
    loadAcademicSessions: jest.fn().mockResolvedValue(undefined),
    loadBranches: jest.fn().mockResolvedValue(undefined),
    loadSchool: jest.fn().mockResolvedValue(true),
  });
  // Branches and the school now come from the live current-organization
  // store; only academic sessions stay on organizationStore.
  const liveBranch = {
    address: 'Bhubaneswar',
    code: branch.code,
    createdAt: '',
    email: '',
    id: branch.id,
    name: branch.name,
    phone: '',
    schoolId: branch.schoolId,
    status: 'ACTIVE' as const,
  };
  currentOrganizationStore.setState({
    allBranches: [liveBranch],
    branches: {
      items: [liveBranch],
      pagination: null,
      totalItems: 1,
    },
    currentSchool: {
      address: 'Bhubaneswar',
      createdAt: '',
      email: '',
      id: 'school-omt',
      name: 'OhMyTeacher School',
      phone: '',
      status: 'ACTIVE' as const,
      upiId: '',
    },
    loadBranches: jest.fn().mockResolvedValue(undefined),
    loadCurrentSchool: jest.fn().mockResolvedValue(true),
  });
  feeDueStore.setState({
    ...INITIAL_FEE_DUE_STATE,
    context: {
      academicSessionId: session.id,
      asOfDate: '2026-07-31',
      branchId: branch.id,
      schoolId: 'school-omt',
    },
    loadFeeDue: jest.fn().mockResolvedValue(true),
    loadFeeDues: jest.fn().mockResolvedValue(undefined),
    loadGenerationHistory: jest.fn().mockResolvedValue(undefined),
    loadGenerationRun: jest.fn().mockResolvedValue(true),
    loadOutstanding: jest.fn().mockResolvedValue(undefined),
    loadParentFees: jest.fn().mockResolvedValue(true),
    loadStudentDues: jest.fn().mockResolvedValue(true),
    loadStudentSelfFees: jest.fn().mockResolvedValue(true),
    previewFine: jest.fn().mockResolvedValue(true),
    sessionStatus: 'ACTIVE',
    setContext: jest.fn(),
    setDueQuery: jest.fn(),
    updateGenerationDraft: jest.fn(),
  });
  studentStore.setState({
    ...INITIAL_STUDENT_STATE,
    loadParentChildren: jest.fn().mockResolvedValue(undefined),
  });
});

afterEach(async () => {
  await ReactTestRenderer.act(async () => {
    mounted?.unmount();
  });
  mounted = null;
});

describe('Fee Due screens', () => {
  it('renders Outstanding dashboard and closed-session read-only state', async () => {
    organizationStore.setState({
      academicSessions: [{ ...session, status: 'CLOSED' }],
    });
    feeDueStore.setState({ sessionStatus: 'CLOSED' });
    const renderer = await render(
      <FeeOutstandingDashboardScreen
        navigation={navigation<'FeeOutstandingDashboard'>()}
        route={route('FeeOutstandingDashboard', {
          ...params,
          sessionStatus: 'CLOSED',
        })}
      />,
    );
    expect(
      renderer.root.findByProps({
        testID: 'fee-outstanding-dashboard-screen',
      }),
    ).toBeTruthy();
    expect(text(renderer)).toContain('READ ONLY');
  });

  it('validates Generate Fees before preview', async () => {
    const renderer = await render(
      <GenerateFeeDuesScreen
        navigation={navigation<'GenerateFeeDues'>()}
        route={route('GenerateFeeDues', params)}
      />,
    );
    const button = renderer.root.findByProps({
      accessibilityLabel: 'Continue',
    });
    await ReactTestRenderer.act(async () => button.props.onPress());
    expect(text(renderer)).toContain('Select at least one stable period key.');
  });

  it.each([
    ['preview', 'fee-generation-preview-screen'],
    ['result', 'fee-generation-result-screen'],
    ['history', 'fee-generation-history-screen'],
    ['run details', 'fee-generation-run-details-screen'],
    ['pending', 'pending-fees-screen'],
    ['overdue', 'overdue-fees-screen'],
    ['student dues', 'student-fee-dues-screen'],
    ['due details', 'fee-due-details-screen'],
    ['cancel', 'cancel-fee-due-screen'],
    ['waive', 'waive-fee-due-screen'],
    ['fine preview', 'fine-accrual-preview-screen'],
    ['parent fees', 'parent-fees-screen'],
    ['parent child fees', 'parent-student-fee-details-screen'],
    ['student self fees', 'student-fees-screen'],
  ])('renders the %s screen state', async (name, testID) => {
    let element: React.ReactElement;
    switch (name) {
      case 'preview':
        element = (
          <FeeGenerationPreviewScreen
            navigation={navigation<'FeeGenerationPreview'>()}
            route={route('FeeGenerationPreview', params)}
          />
        );
        break;
      case 'result':
        element = (
          <FeeGenerationResultScreen
            navigation={navigation<'FeeGenerationResult'>()}
            route={route('FeeGenerationResult', params)}
          />
        );
        break;
      case 'history':
        element = (
          <FeeGenerationHistoryScreen
            navigation={navigation<'FeeGenerationHistory'>()}
            route={route('FeeGenerationHistory', params)}
          />
        );
        break;
      case 'run details':
        element = (
          <FeeGenerationRunDetailsScreen
            navigation={navigation<'FeeGenerationRunDetails'>()}
            route={route('FeeGenerationRunDetails', {
              ...params,
              generationRunId: 'fee-run-july',
            })}
          />
        );
        break;
      case 'pending':
        element = (
          <PendingFeesScreen
            navigation={navigation<'PendingFees'>()}
            route={route('PendingFees', params)}
          />
        );
        break;
      case 'overdue':
        element = (
          <OverdueFeesScreen
            navigation={navigation<'OverdueFees'>()}
            route={route('OverdueFees', params)}
          />
        );
        break;
      case 'student dues':
        element = (
          <StudentFeeDuesScreen
            navigation={navigation<'StudentFeeDues'>()}
            route={route('StudentFeeDues', {
              ...params,
              studentId: 'student-rahul',
            })}
          />
        );
        break;
      case 'due details':
        element = (
          <FeeDueDetailsScreen
            navigation={navigation<'FeeDueDetails'>()}
            route={route('FeeDueDetails', {
              ...params,
              feeDueId: 'due-rahul-july-pending',
            })}
          />
        );
        break;
      case 'cancel':
        element = (
          <CancelFeeDueScreen
            navigation={navigation<'CancelFeeDue'>()}
            route={route('CancelFeeDue', {
              ...params,
              feeDueId: 'due-rahul-july-pending',
            })}
          />
        );
        break;
      case 'waive':
        element = (
          <WaiveFeeDueScreen
            navigation={navigation<'WaiveFeeDue'>()}
            route={route('WaiveFeeDue', {
              ...params,
              feeDueId: 'due-rahul-july-pending',
            })}
          />
        );
        break;
      case 'fine preview':
        element = (
          <FineAccrualPreviewScreen
            navigation={navigation<'FineAccrualPreview'>()}
            route={route('FineAccrualPreview', {
              ...params,
              feeDueId: 'due-rahul-june-daily',
            })}
          />
        );
        break;
      case 'parent fees':
        element = (
          <ParentFeesScreen
            navigation={navigation<'ParentFees'>()}
            route={route('ParentFees', {
              parentMembershipId: 'membership-parent',
              schoolId: 'school-omt',
            })}
          />
        );
        break;
      case 'parent child fees':
        element = (
          <ParentStudentFeeDetailsScreen
            navigation={navigation<'ParentStudentFeeDetails'>()}
            route={route('ParentStudentFeeDetails', {
              parentMembershipId: 'membership-parent',
              schoolId: 'school-omt',
              studentId: 'student-rahul',
            })}
          />
        );
        break;
      default:
        element = (
          <StudentFeesScreen
            navigation={navigation<'StudentFees'>()}
            route={route('StudentFees', {
              schoolId: 'school-omt',
              studentMembershipId: 'membership-student',
            })}
          />
        );
    }
    const renderer = await render(element);
    expect(renderer.root.findByProps({ testID })).toBeTruthy();
  });
});
