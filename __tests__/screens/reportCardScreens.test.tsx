import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { RoleStackParamList } from '../../src/navigation/navigationTypes';
import * as Screens from '../../src/screens/reportCard/ReportCardScreens';
import {
  INITIAL_REPORT_CARD_STATE,
  reportCardStore,
} from '../../src/store/reportCard/reportCardStore';

jest.mock('react-native-keychain', () => ({
  getAllGenericPasswordServices: jest.fn().mockResolvedValue([]),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  setGenericPassword: jest.fn().mockResolvedValue({ service: 'test' }),
}));

const metrics = {
  frame: { height: 800, width: 400, x: 0, y: 0 },
  insets: { bottom: 0, left: 0, right: 0, top: 24 },
};
const base = {
  academicSessionId: 'session-school-omt-current',
  branchId: 'branch-main',
  examId: 'exam-omt-scheduled',
  examStatus: 'SCHEDULED' as const,
  schoolId: 'school-omt',
  sessionStatus: 'ACTIVE' as const,
};
function navigation() {
  return {
    goBack: jest.fn(),
    navigate: jest.fn(),
    popTo: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
  } as unknown as NativeStackScreenProps<
    RoleStackParamList,
    keyof RoleStackParamList
  >['navigation'];
}
function route(name: keyof RoleStackParamList, params: object) {
  return {
    key: `${String(name)}-test`,
    name,
    params,
  } as unknown as NativeStackScreenProps<
    RoleStackParamList,
    keyof RoleStackParamList
  >['route'];
}

beforeEach(() => {
  const yes = jest.fn().mockResolvedValue(true);
  reportCardStore.setState({
    ...INITIAL_REPORT_CARD_STATE,
    generateReportCards: yes,
    loadCommunicationHistory: yes,
    loadDashboard: yes,
    loadDocument: yes,
    loadGenerationHistory: yes,
    loadGenerationRun: yes,
    loadParentReportCard: yes,
    loadParentReportCards: yes,
    loadParentResult: yes,
    loadParentResults: yes,
    loadReportCard: yes,
    loadReportCards: yes,
    loadStudentReportCard: yes,
    loadStudentReportCards: yes,
    loadStudentResult: yes,
    loadStudentResults: yes,
    loadTemplate: yes,
    loadTemplates: yes,
    previewCommunication: yes,
    previewGeneration: yes,
    revokeReportCard: yes,
    saveTemplate: yes,
    sendCommunication: yes,
    setContext: jest.fn(),
    shareReportCard: yes,
  } as never);
});

describe('Report Card screens', () => {
  it('renders all 25 Phase 13 routes with ID-only parameters', async () => {
    const parent = {
      parentMembershipId: 'membership-parent',
      schoolId: 'school-omt',
    };
    const student = {
      schoolId: 'school-omt',
      studentMembershipId: 'membership-student',
    };
    const entries: Array<
      [string, keyof RoleStackParamList, React.ElementType, object]
    > = [
      [
        'report-card-dashboard-screen',
        'ReportCardDashboard',
        Screens.ReportCardDashboardScreen,
        base,
      ],
      [
        'report-card-templates-screen',
        'ReportCardTemplates',
        Screens.ReportCardTemplatesScreen,
        { schoolId: base.schoolId },
      ],
      [
        'create-report-card-template-screen',
        'CreateReportCardTemplate',
        Screens.CreateReportCardTemplateScreen,
        { schoolId: base.schoolId },
      ],
      [
        'edit-report-card-template-screen',
        'EditReportCardTemplate',
        Screens.EditReportCardTemplateScreen,
        { schoolId: base.schoolId, templateId: 'template' },
      ],
      [
        'report-card-template-details-screen',
        'ReportCardTemplateDetails',
        Screens.ReportCardTemplateDetailsScreen,
        { schoolId: base.schoolId, templateId: 'template' },
      ],
      [
        'report-card-template-preview-screen',
        'ReportCardTemplatePreview',
        Screens.ReportCardTemplatePreviewScreen,
        { schoolId: base.schoolId, templateId: 'template' },
      ],
      [
        'generate-report-cards-screen',
        'GenerateReportCards',
        Screens.GenerateReportCardsScreen,
        base,
      ],
      [
        'report-card-generation-preview-screen',
        'ReportCardGenerationPreview',
        Screens.ReportCardGenerationPreviewScreen,
        base,
      ],
      [
        'report-card-generation-result-screen',
        'ReportCardGenerationResult',
        Screens.ReportCardGenerationResultScreen,
        base,
      ],
      [
        'report-card-generation-history-screen',
        'ReportCardGenerationHistory',
        Screens.ReportCardGenerationHistoryScreen,
        base,
      ],
      [
        'report-card-generation-run-details-screen',
        'ReportCardGenerationRunDetails',
        Screens.ReportCardGenerationRunDetailsScreen,
        { ...base, generationRunId: 'run' },
      ],
      ['report-cards-screen', 'ReportCards', Screens.ReportCardsScreen, base],
      [
        'report-card-details-screen',
        'ReportCardDetails',
        Screens.ReportCardDetailsScreen,
        { ...base, reportCardId: 'card' },
      ],
      [
        'report-card-preview-screen',
        'ReportCardPreview',
        Screens.ReportCardPreviewScreen,
        { ...base, reportCardId: 'card' },
      ],
      [
        'revoke-report-card-screen',
        'RevokeReportCard',
        Screens.RevokeReportCardScreen,
        { ...base, reportCardId: 'card' },
      ],
      [
        'parent-results-screen',
        'ParentResults',
        Screens.ParentResultsScreen,
        parent,
      ],
      [
        'parent-student-result-details-screen',
        'ParentStudentResultDetails',
        Screens.ParentStudentResultDetailsScreen,
        { ...parent, publishedResultSnapshotId: 'result' },
      ],
      [
        'parent-report-cards-screen',
        'ParentReportCards',
        Screens.ParentReportCardsScreen,
        parent,
      ],
      [
        'parent-report-card-details-screen',
        'ParentReportCardDetails',
        Screens.ParentReportCardDetailsScreen,
        { ...parent, reportCardId: 'card' },
      ],
      [
        'student-results-screen',
        'StudentResults',
        Screens.StudentResultsScreen,
        student,
      ],
      [
        'student-result-details-screen',
        'StudentSelfResultDetails',
        Screens.StudentResultDetailsScreen,
        { ...student, publishedResultSnapshotId: 'result' },
      ],
      [
        'student-report-cards-screen',
        'StudentReportCards',
        Screens.StudentReportCardsScreen,
        student,
      ],
      [
        'student-report-card-details-screen',
        'StudentReportCardDetails',
        Screens.StudentReportCardDetailsScreen,
        { ...student, reportCardId: 'card' },
      ],
      [
        'result-communication-screen',
        'ResultCommunication',
        Screens.ResultCommunicationScreen,
        base,
      ],
      [
        'examination-communication-history-screen',
        'ExaminationCommunicationHistory',
        Screens.ExaminationCommunicationHistoryScreen,
        base,
      ],
    ];
    expect(entries).toHaveLength(25);
    for (const [testID, name, Component, params] of entries) {
      let tree!: ReactTestRenderer.ReactTestRenderer;
      await act(async () => {
        tree = ReactTestRenderer.create(
          <SafeAreaProvider initialMetrics={metrics}>
            <Component navigation={navigation()} route={route(name, params)} />
          </SafeAreaProvider>,
        );
      });
      expect(tree.root.findByProps({ testID })).toBeTruthy();
      act(() => tree.unmount());
    }
  });
});
