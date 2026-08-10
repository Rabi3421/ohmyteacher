import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { UserMembership } from '../../src/models/auth';
import type { CurrentClassFeeStructure, CurrentFeeHead, CurrentFeeStructureItem } from '../../src/models/currentFeeConfiguration';
import type { RoleStackParamList } from '../../src/navigation/navigationTypes';
import { CreateFeeHeadScreen } from '../../src/screens/feeSetup/CreateFeeHeadScreen';
import { CreateFeeStructureScreen } from '../../src/screens/feeSetup/CreateFeeStructureScreen';
import { FeeHeadDetailsScreen } from '../../src/screens/feeSetup/FeeHeadDetailsScreen';
import { FeeHeadsScreen } from '../../src/screens/feeSetup/FeeHeadsScreen';
import { FeeSetupScreen } from '../../src/screens/feeSetup/FeeSetupScreen';
import { FeeStructureDetailsScreen } from '../../src/screens/feeSetup/FeeStructureDetailsScreen';
import { FeeStructuresScreen } from '../../src/screens/feeSetup/FeeStructuresScreen';
import { UnsupportedFeeConfigurationScreen } from '../../src/screens/feeSetup/UnsupportedFeeConfigurationScreen';
import { academicStore, INITIAL_ACADEMIC_STATE } from '../../src/store/academic/academicStore';
import { authStore, INITIAL_AUTH_STATE } from '../../src/store/auth/authStore';
import { currentFeeConfigurationStore, INITIAL_CURRENT_FEE_CONFIGURATION_STATE } from '../../src/store/feeConfiguration/currentFeeConfigurationStore';
import { currentOrganizationStore, INITIAL_CURRENT_ORGANIZATION_STATE } from '../../src/store/organization/currentOrganizationStore';
import { INITIAL_ORGANIZATION_STATE, organizationStore } from '../../src/store/organization/organizationStore';

jest.mock('react-native-keychain', () => ({
  getAllGenericPasswordServices: jest.fn().mockResolvedValue([]),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  setGenericPassword: jest.fn().mockResolvedValue({ service: 'test' }),
}));
jest.mock('@react-native-community/netinfo', () => ({ useNetInfo: () => ({ isConnected: true, isInternetReachable: true, type: 'wifi' }) }));

const metrics = { frame: { height: 800, width: 400, x: 0, y: 0 }, insets: { bottom: 0, left: 0, right: 0, top: 24 } };
const admin: UserMembership = { id: 'm1', role: 'SCHOOL_ADMIN', schoolId: '1', status: 'ACTIVE', userId: 'u1' };
const context = { academicSessionId: '31', branchId: '11', schoolId: '1' };
const params = { ...context, sessionStatus: 'ACTIVE' as const };
const head: CurrentFeeHead = { createdAt: '2026-08-03T10:00:00Z', frequency: 'MONTHLY', id: '7', name: 'Tuition Fee', schoolId: '1', status: 'ACTIVE' };
const item: CurrentFeeStructureItem = { amountPaise: 80_000, classId: '21', createdAt: '2026-08-03T10:00:00Z', feeHeadId: '7', id: '9', mandatory: true };
const structure: CurrentClassFeeStructure = { ...context, classId: '21', className: 'Class 1', classStatus: 'ACTIVE', id: '21', items: [item], totalPaise: 80_000 };

let mounted: ReactTestRenderer.ReactTestRenderer | null = null;
function navigation<RouteName extends keyof RoleStackParamList>() {
  return { goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn(), reset: jest.fn() } as unknown as NativeStackScreenProps<RoleStackParamList, RouteName>['navigation'];
}
function route<RouteName extends keyof RoleStackParamList>(name: RouteName, routeParams: RoleStackParamList[RouteName]) {
  return { key: `${String(name)}-test`, name, params: routeParams } as unknown as NativeStackScreenProps<RoleStackParamList, RouteName>['route'];
}
async function render(element: React.ReactElement) {
  await ReactTestRenderer.act(async () => { mounted = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}>{element}</SafeAreaProvider>); });
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
async function press(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  const button = renderer.root.findAllByProps({ accessibilityLabel: label })[0];
  await ReactTestRenderer.act(async () => button.props.onPress());
}

beforeEach(() => {
  authStore.setState({ ...INITIAL_AUTH_STATE, activeMembership: admin, memberships: [admin], status: 'authenticated', user: { id: 'u1', name: 'Admin', status: 'ACTIVE' } });
  academicStore.setState({ ...INITIAL_ACADEMIC_STATE, context, sessionStatus: 'ACTIVE', setContext: jest.fn() });
  currentOrganizationStore.setState({
    ...INITIAL_CURRENT_ORGANIZATION_STATE,
    branches: { items: [{ address: '', code: 'MAIN', createdAt: '', email: '', id: '11', name: 'Main Branch', phone: '', schoolId: '1', status: 'ACTIVE' }], pagination: null, totalItems: 1 },
    currentSchool: { address: '', createdAt: '', email: '', id: '1', name: 'OMT School', phone: '', status: 'ACTIVE', upiId: '' },
    loadBranches: jest.fn().mockResolvedValue(true),
    loadCurrentSchool: jest.fn().mockResolvedValue(true),
  });
  organizationStore.setState({
    ...INITIAL_ORGANIZATION_STATE,
    academicSessions: [{ createdAt: '', endDate: '2027-03-31', id: '31', name: '2026-27', schoolId: '1', startDate: '2026-04-01', status: 'ACTIVE', updatedAt: '' }],
    loadAcademicSessions: jest.fn().mockResolvedValue(undefined),
  });
  currentFeeConfigurationStore.setState({
    ...INITIAL_CURRENT_FEE_CONFIGURATION_STATE,
    context,
    currentFeeHead: head,
    currentStructure: structure,
    feeHeads: [head],
    loadFeeHead: jest.fn().mockResolvedValue(true),
    loadFeeHeads: jest.fn().mockResolvedValue(undefined),
    loadStructure: jest.fn().mockResolvedValue(true),
    loadStructures: jest.fn().mockResolvedValue(undefined),
    loadSummary: jest.fn().mockResolvedValue(undefined),
    sessionStatus: 'ACTIVE',
    setContext: jest.fn(),
    structures: [structure],
    summary: { activeFeeHeads: 1, configuredClasses: 1, structureItems: 1, unconfiguredClasses: 0 },
  });
});
afterEach(async () => { if (mounted) await ReactTestRenderer.act(async () => mounted?.unmount()); mounted = null; });

describe('live Fee Configuration screens', () => {
  it('renders the live overview and isolation boundary', async () => {
    const renderer = await render(<FeeSetupScreen navigation={navigation<'FeeSetup'>()} route={route('FeeSetup', params)} />);
    expect(text(renderer)).toContain('Configured Classes');
    expect(text(renderer)).toContain('Fee dues remain demo-isolated');
  });

  it('renders live School-wide Fee Heads', async () => {
    const renderer = await render(<FeeHeadsScreen navigation={navigation<'FeeHeads'>()} route={route('FeeHeads', params)} />);
    expect(text(renderer)).toContain('Tuition Fee');
    expect(text(renderer)).toContain('Monthly');
  });

  it('validates a blank Head name before transport', async () => {
    const renderer = await render(<CreateFeeHeadScreen navigation={navigation<'CreateFeeHead'>()} route={route('CreateFeeHead', params)} />);
    await press(renderer, 'Create Active Fee Head');
    expect(text(renderer)).toContain('Name is required.');
  });

  it('renders confirmed Head detail fields only', async () => {
    const renderer = await render(<FeeHeadDetailsScreen navigation={navigation<'FeeHeadDetails'>()} route={route('FeeHeadDetails', { ...params, feeHeadId: '7' })} />);
    expect(text(renderer)).toContain('Monthly generation frequency');
    expect(text(renderer)).not.toContain('structure references');
  });

  it('renders Class-keyed fee blueprints with exact totals', async () => {
    const renderer = await render(<FeeStructuresScreen navigation={navigation<'FeeStructures'>()} route={route('FeeStructures', params)} />);
    expect(text(renderer)).toContain('Class 1');
    expect(text(renderer)).toContain('₹800.00');
  });

  it('creates a single independent Item rather than a fabricated aggregate', async () => {
    const renderer = await render(<CreateFeeStructureScreen navigation={navigation<'CreateFeeStructure'>()} route={route('CreateFeeStructure', params)} />);
    expect(text(renderer)).toContain('One independent Django Structure Item request');
    expect(text(renderer)).toContain('Class 1');
  });

  it('renders Item details without liability or lifecycle claims', async () => {
    const renderer = await render(<FeeStructureDetailsScreen navigation={navigation<'FeeStructureDetails'>()} route={route('FeeStructureDetails', { ...params, feeStructureId: '21' })} />);
    expect(text(renderer)).toContain('Configured total');
    expect(text(renderer)).toContain('not a Student outstanding balance');
    expect(text(renderer)).toContain('no Structure activation');
  });

  it('blocks unsupported fee configuration screens explicitly', async () => {
    const renderer = await render(<UnsupportedFeeConfigurationScreen />);
    expect(text(renderer)).toContain('No live configuration operation exists');
    expect(text(renderer)).toContain('No mock fallback');
  });

  it('shows closed Session configuration as read-only', async () => {
    academicStore.setState({ sessionStatus: 'CLOSED' });
    currentFeeConfigurationStore.setState({ sessionStatus: 'CLOSED' });
    const renderer = await render(<FeeSetupScreen navigation={navigation<'FeeSetup'>()} route={route('FeeSetup', { ...params, sessionStatus: 'CLOSED' })} />);
    expect(text(renderer)).toContain('Closed Session · Read only');
  });
});
