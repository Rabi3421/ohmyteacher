import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { RoleStackParamList } from '../../src/navigation/navigationTypes';
import * as Screens from '../../src/screens/marksResult/MarksResultScreens';
import {
  INITIAL_MARKS_RESULT_STATE,
  marksResultStore,
} from '../../src/store/marksResult/marksResultStore';

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
  marksResultStore.setState({
    ...INITIAL_MARKS_RESULT_STATE,
    calculateResults: jest.fn().mockResolvedValue(true),
    loadClassResults: jest.fn().mockResolvedValue(true),
    loadDashboard: jest.fn().mockResolvedValue(true),
    loadMarkHistory: jest.fn().mockResolvedValue(true),
    loadMarkSheet: jest.fn().mockResolvedValue(true),
    loadMarkSheets: jest.fn().mockResolvedValue(true),
    loadPublicationHistory: jest.fn().mockResolvedValue(true),
    loadRankList: jest.fn().mockResolvedValue(true),
    loadResultSummary: jest.fn().mockResolvedValue(true),
    loadSectionResults: jest.fn().mockResolvedValue(true),
    loadStudentResult: jest.fn().mockResolvedValue(true),
    previewCalculation: jest.fn().mockResolvedValue(true),
    publishResults: jest.fn().mockResolvedValue(true),
    reviewResults: jest.fn().mockResolvedValue(true),
    saveDraft: jest.fn().mockResolvedValue(true),
    setContext: jest.fn(),
    submitMarkSheet: jest.fn().mockResolvedValue(true),
    unlockMarkSheet: jest.fn().mockResolvedValue(true),
    unpublishResults: jest.fn().mockResolvedValue(true),
  } as never);
});

describe('Marks and Results screens', () => {
  it('renders all 21 Phase 12 internal routes using ID-only parameters', async () => {
    const entries: Array<
      [string, keyof RoleStackParamList, React.ElementType, object]
    > = [
      [
        'marks-dashboard-screen',
        'MarksDashboard',
        Screens.MarksDashboardScreen,
        base,
      ],
      ['mark-sheets-screen', 'MarkSheets', Screens.MarkSheetsScreen, base],
      [
        'mark-sheet-details-screen',
        'MarkSheetDetails',
        Screens.MarkSheetDetailsScreen,
        { ...base, markSheetId: 'sheet' },
      ],
      [
        'marks-entry-screen',
        'MarksEntry',
        Screens.MarksEntryScreen,
        { ...base, markSheetId: 'sheet' },
      ],
      [
        'marks-entry-review-screen',
        'MarksEntryReview',
        Screens.MarksEntryReviewScreen,
        { ...base, markSheetId: 'sheet' },
      ],
      [
        'submit-mark-sheet-screen',
        'SubmitMarkSheet',
        Screens.SubmitMarkSheetScreen,
        { ...base, markSheetId: 'sheet' },
      ],
      [
        'lock-mark-sheet-screen',
        'LockMarkSheet',
        Screens.LockMarkSheetScreen,
        { ...base, markSheetId: 'sheet' },
      ],
      [
        'unlock-mark-sheet-screen',
        'UnlockMarkSheet',
        Screens.UnlockMarkSheetScreen,
        { ...base, markSheetId: 'sheet' },
      ],
      [
        'mark-sheet-history-screen',
        'MarkSheetHistory',
        Screens.MarkSheetHistoryScreen,
        { ...base, markSheetId: 'sheet' },
      ],
      [
        'result-processing-dashboard-screen',
        'ResultProcessingDashboard',
        Screens.ResultProcessingDashboardScreen,
        base,
      ],
      [
        'calculate-results-screen',
        'CalculateResults',
        Screens.CalculateResultsScreen,
        base,
      ],
      [
        'result-calculation-preview-screen',
        'ResultCalculationPreview',
        Screens.ResultCalculationPreviewScreen,
        base,
      ],
      [
        'result-calculation-result-screen',
        'ResultCalculationResult',
        Screens.ResultCalculationResultScreen,
        { ...base, calculationRunId: 'run' },
      ],
      [
        'class-results-screen',
        'ClassResults',
        Screens.ClassResultsScreen,
        { ...base, examClassConfigurationId: 'configuration' },
      ],
      [
        'section-results-screen',
        'SectionResults',
        Screens.SectionResultsScreen,
        {
          ...base,
          examClassConfigurationId: 'configuration',
          sectionId: 'section',
        },
      ],
      [
        'student-result-details-screen',
        'StudentResultDetails',
        Screens.StudentResultDetailsScreen,
        { ...base, studentId: 'student' },
      ],
      [
        'result-review-screen',
        'ResultReview',
        Screens.ResultReviewScreen,
        {
          ...base,
          calculationRunId: 'run',
          examClassConfigurationId: 'configuration',
          sectionId: 'section',
        },
      ],
      [
        'publish-results-screen',
        'PublishResults',
        Screens.PublishResultsScreen,
        {
          ...base,
          calculationRunId: 'run',
          examClassConfigurationId: 'configuration',
          sectionId: 'section',
        },
      ],
      [
        'unpublish-results-screen',
        'UnpublishResults',
        Screens.UnpublishResultsScreen,
        { ...base, publicationBatchId: 'batch' },
      ],
      [
        'result-publication-history-screen',
        'ResultPublicationHistory',
        Screens.ResultPublicationHistoryScreen,
        base,
      ],
      [
        'rank-list-screen',
        'RankList',
        Screens.RankListScreen,
        {
          ...base,
          examClassConfigurationId: 'configuration',
          sectionId: 'section',
        },
      ],
    ];
    for (const [testID, name, Component, params] of entries) {
      let renderer: ReactTestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = ReactTestRenderer.create(
          <SafeAreaProvider initialMetrics={metrics}>
            <Component navigation={navigation()} route={route(name, params)} />
          </SafeAreaProvider>,
        );
      });
      expect(renderer!.root.findByProps({ testID })).toBeTruthy();
      act(() => renderer!.unmount());
    }
  });
});
