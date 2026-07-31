import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { UserMembership } from '../../src/models/auth';
import type { RoleStackParamList } from '../../src/navigation/navigationTypes';
import {
  ApplyAdvanceCreditScreen,
  CollectionDashboardScreen,
  CollectPaymentScreen,
  DailyCollectionScreen,
  ParentReceiptDetailsScreen,
  ParentReceiptsScreen,
  PaymentAllocationReviewScreen,
  PaymentDetailsEntryScreen,
  PaymentDetailsScreen,
  PaymentDueSelectionScreen,
  PaymentSuccessScreen,
  PaymentsScreen,
  ReceiptDetailsScreen,
  ReceiptPreviewScreen,
  ReceiptsScreen,
  ReversePaymentScreen,
  StudentAdvanceCreditsScreen,
  StudentLedgerScreen,
  StudentReceiptDetailsScreen,
  StudentReceiptsScreen,
} from '../../src/screens/collection/CollectionScreens';
import { authStore, INITIAL_AUTH_STATE } from '../../src/store/auth/authStore';
import {
  collectionStore,
  INITIAL_COLLECTION_STATE,
} from '../../src/store/collection/collectionStore';
import {
  INITIAL_ORGANIZATION_STATE,
  organizationStore,
} from '../../src/store/organization/organizationStore';
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
const context = {
  academicSessionId: 'session-school-omt-current',
  branchId: 'branch-main',
  schoolId: 'school-omt',
  sessionStatus: 'ACTIVE' as const,
};

function navigation<RouteName extends keyof RoleStackParamList>() {
  return {
    goBack: jest.fn(),
    navigate: jest.fn(),
    popTo: jest.fn(),
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

beforeEach(() => {
  authStore.setState({
    ...INITIAL_AUTH_STATE,
    activeMembership: admin,
    memberships: [admin],
    status: 'authenticated',
    user: { id: admin.userId, name: 'Admin', status: 'ACTIVE' },
  });
  userManagementStore.setState(INITIAL_USER_MANAGEMENT_STATE);
  organizationStore.setState({
    ...INITIAL_ORGANIZATION_STATE,
    academicSessions: [
      {
        createdAt: '',
        endDate: '2027-03-31',
        id: context.academicSessionId,
        name: '2026-27',
        schoolId: context.schoolId,
        startDate: '2026-04-01',
        status: 'ACTIVE',
        updatedAt: '',
      },
    ],
    branches: {
      items: [
        {
          address: {
            city: 'Bhubaneswar',
            country: 'India',
            line1: 'Road',
            pinCode: '751001',
            state: 'Odisha',
          },
          code: 'MAIN',
          createdAt: '',
          id: context.branchId,
          isMainBranch: true,
          mobile: '9876543210',
          name: 'Main Branch',
          schoolId: context.schoolId,
          status: 'ACTIVE',
          updatedAt: '',
        },
      ],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
    loadAcademicSessions: jest.fn().mockResolvedValue(undefined),
    loadBranches: jest.fn().mockResolvedValue(undefined),
    loadSchool: jest.fn().mockResolvedValue(true),
  });
  studentStore.setState({
    ...INITIAL_STUDENT_STATE,
    loadStudents: jest.fn().mockResolvedValue(undefined),
  });
  collectionStore.setState({
    ...INITIAL_COLLECTION_STATE,
    context: { ...context, asOfDate: '2026-07-31' },
    loadAdvance: jest.fn().mockResolvedValue(true),
    loadCollectableDues: jest.fn().mockResolvedValue(true),
    loadDailyCollection: jest.fn().mockResolvedValue(true),
    loadDashboard: jest.fn().mockResolvedValue(true),
    loadLedger: jest.fn().mockResolvedValue(true),
    loadParentReceipt: jest.fn().mockResolvedValue(true),
    loadParentReceipts: jest.fn().mockResolvedValue(true),
    loadPayment: jest.fn().mockResolvedValue(true),
    loadPayments: jest.fn().mockResolvedValue(undefined),
    loadReceipt: jest.fn().mockResolvedValue(true),
    loadReceipts: jest.fn().mockResolvedValue(undefined),
    loadStudentReceipt: jest.fn().mockResolvedValue(true),
    loadStudentReceipts: jest.fn().mockResolvedValue(true),
    sessionStatus: 'ACTIVE',
    setContext: jest.fn(),
  });
});

describe('Collection screens', () => {
  it('renders every required Phase 9 route without direct fixtures', async () => {
    const cases: Array<[string, React.ReactElement]> = [
      [
        'collection-dashboard-screen',
        <CollectionDashboardScreen
          navigation={navigation<'CollectionDashboard'>()}
          route={route('CollectionDashboard', context)}
        />,
      ],
      [
        'collect-payment-screen',
        <CollectPaymentScreen
          navigation={navigation<'CollectPayment'>()}
          route={route('CollectPayment', context)}
        />,
      ],
      [
        'payment-due-selection-screen',
        <PaymentDueSelectionScreen
          navigation={navigation<'PaymentDueSelection'>()}
          route={route('PaymentDueSelection', {
            ...context,
            studentId: 'student-rahul',
          })}
        />,
      ],
      [
        'payment-details-entry-screen',
        <PaymentDetailsEntryScreen
          navigation={navigation<'PaymentDetailsEntry'>()}
          route={route('PaymentDetailsEntry', {
            ...context,
            studentId: 'student-rahul',
          })}
        />,
      ],
      [
        'payment-allocation-review-screen',
        <PaymentAllocationReviewScreen
          navigation={navigation<'PaymentAllocationReview'>()}
          route={route('PaymentAllocationReview', context)}
        />,
      ],
      [
        'payment-success-screen',
        <PaymentSuccessScreen
          navigation={navigation<'PaymentSuccess'>()}
          route={route('PaymentSuccess', context)}
        />,
      ],
      [
        'payments-screen',
        <PaymentsScreen
          navigation={navigation<'Payments'>()}
          route={route('Payments', context)}
        />,
      ],
      [
        'payment-details-screen',
        <PaymentDetailsScreen
          navigation={navigation<'PaymentDetails'>()}
          route={route('PaymentDetails', {
            ...context,
            paymentId: 'payment-id',
          })}
        />,
      ],
      [
        'reverse-payment-screen',
        <ReversePaymentScreen
          navigation={navigation<'ReversePayment'>()}
          route={route('ReversePayment', {
            ...context,
            paymentId: 'payment-id',
          })}
        />,
      ],
      [
        'receipts-screen',
        <ReceiptsScreen
          navigation={navigation<'Receipts'>()}
          route={route('Receipts', context)}
        />,
      ],
      [
        'receipt-details-screen',
        <ReceiptDetailsScreen
          navigation={navigation<'ReceiptDetails'>()}
          route={route('ReceiptDetails', {
            ...context,
            receiptId: 'receipt-id',
          })}
        />,
      ],
      [
        'receipt-preview-screen',
        <ReceiptPreviewScreen
          navigation={navigation<'ReceiptPreview'>()}
          route={route('ReceiptPreview', {
            ...context,
            receiptId: 'receipt-id',
          })}
        />,
      ],
      [
        'student-ledger-screen',
        <StudentLedgerScreen
          navigation={navigation<'StudentLedger'>()}
          route={route('StudentLedger', {
            ...context,
            studentId: 'student-rahul',
          })}
        />,
      ],
      [
        'student-advance-credits-screen',
        <StudentAdvanceCreditsScreen
          navigation={navigation<'StudentAdvanceCredits'>()}
          route={route('StudentAdvanceCredits', {
            ...context,
            studentId: 'student-rahul',
          })}
        />,
      ],
      [
        'apply-advance-credit-screen',
        <ApplyAdvanceCreditScreen
          navigation={navigation<'ApplyAdvanceCredit'>()}
          route={route('ApplyAdvanceCredit', {
            ...context,
            studentId: 'student-rahul',
          })}
        />,
      ],
      [
        'daily-collection-screen',
        <DailyCollectionScreen
          navigation={navigation<'DailyCollection'>()}
          route={route('DailyCollection', context)}
        />,
      ],
      [
        'parent-receipts-screen',
        <ParentReceiptsScreen
          navigation={navigation<'ParentReceipts'>()}
          route={route('ParentReceipts', {
            parentMembershipId: 'membership-parent',
            schoolId: 'school-omt',
          })}
        />,
      ],
      [
        'parent-receipt-details-screen',
        <ParentReceiptDetailsScreen
          navigation={navigation<'ParentReceiptDetails'>()}
          route={route('ParentReceiptDetails', {
            parentMembershipId: 'membership-parent',
            receiptId: 'receipt-id',
            schoolId: 'school-omt',
          })}
        />,
      ],
      [
        'student-receipts-screen',
        <StudentReceiptsScreen
          navigation={navigation<'StudentReceipts'>()}
          route={route('StudentReceipts', {
            schoolId: 'school-omt',
            studentMembershipId: 'membership-student',
          })}
        />,
      ],
      [
        'student-receipt-details-screen',
        <StudentReceiptDetailsScreen
          navigation={navigation<'StudentReceiptDetails'>()}
          route={route('StudentReceiptDetails', {
            receiptId: 'receipt-id',
            schoolId: 'school-omt',
            studentMembershipId: 'membership-student',
          })}
        />,
      ],
    ];
    for (const [testID, element] of cases) {
      let renderer: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <SafeAreaProvider initialMetrics={metrics}>
            {element}
          </SafeAreaProvider>,
        );
        await Promise.resolve();
      });
      expect(renderer!.root.findByProps({ testID })).toBeTruthy();
      await ReactTestRenderer.act(async () => renderer!.unmount());
    }
  });

  it('shows the closed-session read-only Collection state', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={metrics}>
          <CollectPaymentScreen
            navigation={navigation<'CollectPayment'>()}
            route={route('CollectPayment', {
              ...context,
              sessionStatus: 'CLOSED',
            })}
          />
        </SafeAreaProvider>,
      );
    });
    expect(JSON.stringify(renderer!.toJSON())).toContain(
      'Closed academic sessions are historical and read-only',
    );
    await ReactTestRenderer.act(async () => renderer!.unmount());
  });
});
