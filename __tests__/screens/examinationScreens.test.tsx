import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { RoleStackParamList } from '../../src/navigation/navigationTypes';
import * as Screens from '../../src/screens/examination/ExaminationScreens';
import {
  examinationSetupStore,
  INITIAL_EXAMINATION_SETUP_STATE,
} from '../../src/store/examinationSetup/examinationSetupStore';

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
  examinationSetupStore.setState({
    ...INITIAL_EXAMINATION_SETUP_STATE,
    cancelExam: jest.fn().mockResolvedValue(true),
    copyExam: jest.fn().mockResolvedValue(true),
    loadExam: jest.fn().mockResolvedValue(true),
    loadExams: jest.fn().mockResolvedValue(true),
    loadExamTerms: jest.fn().mockResolvedValue(true),
    loadExamType: jest.fn().mockResolvedValue(true),
    loadExamTypes: jest.fn().mockResolvedValue(true),
    loadGradingScheme: jest.fn().mockResolvedValue(true),
    loadGradingSchemes: jest.fn().mockResolvedValue(true),
    loadSummary: jest.fn().mockResolvedValue(true),
    loadTerm: jest.fn().mockResolvedValue(true),
    loadTerms: jest.fn().mockResolvedValue(true),
    previewCopy: jest.fn().mockResolvedValue(true),
    returnToDraft: jest.fn().mockResolvedValue(true),
    saveClassConfigurations: jest.fn().mockResolvedValue(true),
    saveExam: jest.fn().mockResolvedValue(true),
    saveExamType: jest.fn().mockResolvedValue(true),
    saveGradingScheme: jest.fn().mockResolvedValue(true),
    saveSchedule: jest.fn().mockResolvedValue(true),
    saveSubjectPapers: jest.fn().mockResolvedValue(true),
    saveTerm: jest.fn().mockResolvedValue(true),
    scheduleExam: jest.fn().mockResolvedValue(true),
    setContext: jest.fn(),
    validateSetup: jest.fn().mockResolvedValue(true),
  } as never);
});

describe('Examination Setup screens', () => {
  it('renders every required Phase 11 route with ID-only params', async () => {
    const cases: Array<[string, React.ReactElement]> = [
      [
        'examination-setup-screen',
        <Screens.ExaminationSetupScreen
          navigation={navigation<'ExaminationSetup'>()}
          route={route('ExaminationSetup', context)}
        />,
      ],
      [
        'exam-terms-screen',
        <Screens.ExamTermsScreen
          navigation={navigation<'ExamTerms'>()}
          route={route('ExamTerms', context)}
        />,
      ],
      [
        'create-exam-term-screen',
        <Screens.CreateExamTermScreen
          navigation={navigation<'CreateExamTerm'>()}
          route={route('CreateExamTerm', context)}
        />,
      ],
      [
        'edit-exam-term-screen',
        <Screens.EditExamTermScreen
          navigation={navigation<'EditExamTerm'>()}
          route={route('EditExamTerm', { ...context, termId: 'term' })}
        />,
      ],
      [
        'exam-types-screen',
        <Screens.ExamTypesScreen
          navigation={navigation<'ExamTypes'>()}
          route={route('ExamTypes', context)}
        />,
      ],
      [
        'create-exam-type-screen',
        <Screens.CreateExamTypeScreen
          navigation={navigation<'CreateExamType'>()}
          route={route('CreateExamType', context)}
        />,
      ],
      [
        'edit-exam-type-screen',
        <Screens.EditExamTypeScreen
          navigation={navigation<'EditExamType'>()}
          route={route('EditExamType', { ...context, examTypeId: 'type' })}
        />,
      ],
      [
        'exam-type-details-screen',
        <Screens.ExamTypeDetailsScreen
          navigation={navigation<'ExamTypeDetails'>()}
          route={route('ExamTypeDetails', { ...context, examTypeId: 'type' })}
        />,
      ],
      [
        'grading-schemes-screen',
        <Screens.GradingSchemesScreen
          navigation={navigation<'GradingSchemes'>()}
          route={route('GradingSchemes', context)}
        />,
      ],
      [
        'create-grading-scheme-screen',
        <Screens.CreateGradingSchemeScreen
          navigation={navigation<'CreateGradingScheme'>()}
          route={route('CreateGradingScheme', context)}
        />,
      ],
      [
        'edit-grading-scheme-screen',
        <Screens.EditGradingSchemeScreen
          navigation={navigation<'EditGradingScheme'>()}
          route={route('EditGradingScheme', {
            ...context,
            gradingSchemeId: 'scheme',
          })}
        />,
      ],
      [
        'grading-scheme-details-screen',
        <Screens.GradingSchemeDetailsScreen
          navigation={navigation<'GradingSchemeDetails'>()}
          route={route('GradingSchemeDetails', {
            ...context,
            gradingSchemeId: 'scheme',
          })}
        />,
      ],
      [
        'exams-screen',
        <Screens.ExamsScreen
          navigation={navigation<'Exams'>()}
          route={route('Exams', context)}
        />,
      ],
      [
        'create-exam-screen',
        <Screens.CreateExamScreen
          navigation={navigation<'CreateExam'>()}
          route={route('CreateExam', context)}
        />,
      ],
      [
        'edit-exam-screen',
        <Screens.EditExamScreen
          navigation={navigation<'EditExam'>()}
          route={route('EditExam', { ...context, examId: 'exam' })}
        />,
      ],
      [
        'exam-details-screen',
        <Screens.ExamDetailsScreen
          navigation={navigation<'ExamDetails'>()}
          route={route('ExamDetails', { ...context, examId: 'exam' })}
        />,
      ],
      [
        'exam-class-configurations-screen',
        <Screens.ExamClassConfigurationsScreen
          navigation={navigation<'ExamClassConfigurations'>()}
          route={route('ExamClassConfigurations', {
            ...context,
            examId: 'exam',
          })}
        />,
      ],
      [
        'exam-class-configuration-screen',
        <Screens.ExamClassConfigurationScreen
          navigation={navigation<'ExamClassConfiguration'>()}
          route={route('ExamClassConfiguration', {
            ...context,
            examId: 'exam',
          })}
        />,
      ],
      [
        'exam-subject-papers-screen',
        <Screens.ExamSubjectPapersScreen
          navigation={navigation<'ExamSubjectPapers'>()}
          route={route('ExamSubjectPapers', {
            ...context,
            examClassConfigurationId: 'config',
            examId: 'exam',
          })}
        />,
      ],
      [
        'exam-subject-paper-screen',
        <Screens.ExamSubjectPaperScreen
          navigation={navigation<'ExamSubjectPaper'>()}
          route={route('ExamSubjectPaper', {
            ...context,
            examClassConfigurationId: 'config',
            examId: 'exam',
          })}
        />,
      ],
      [
        'exam-schedule-screen',
        <Screens.ExamScheduleScreen
          navigation={navigation<'ExamSchedule'>()}
          route={route('ExamSchedule', { ...context, examId: 'exam' })}
        />,
      ],
      [
        'exam-schedule-preview-screen',
        <Screens.ExamSchedulePreviewScreen
          navigation={navigation<'ExamSchedulePreview'>()}
          route={route('ExamSchedulePreview', { ...context, examId: 'exam' })}
        />,
      ],
      [
        'exam-setup-review-screen',
        <Screens.ExamSetupReviewScreen
          navigation={navigation<'ExamSetupReview'>()}
          route={route('ExamSetupReview', { ...context, examId: 'exam' })}
        />,
      ],
      [
        'copy-exam-screen',
        <Screens.CopyExamScreen
          navigation={navigation<'CopyExam'>()}
          route={route('CopyExam', { ...context, examId: 'exam' })}
        />,
      ],
      [
        'cancel-exam-screen',
        <Screens.CancelExamScreen
          navigation={navigation<'CancelExam'>()}
          route={route('CancelExam', { ...context, examId: 'exam' })}
        />,
      ],
    ];
    for (const [testID, element] of cases) {
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <SafeAreaProvider initialMetrics={metrics}>
            {element}
          </SafeAreaProvider>,
        );
      });
      expect(renderer.root.findByProps({ testID })).toBeTruthy();
      await ReactTestRenderer.act(async () => renderer.unmount());
    }
  });

  it('shows a closed Session as read-only', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={metrics}>
          <Screens.CreateExamTermScreen
            navigation={navigation<'CreateExamTerm'>()}
            route={route('CreateExamTerm', {
              ...context,
              sessionStatus: 'CLOSED',
            })}
          />
        </SafeAreaProvider>,
      );
    });
    expect(
      renderer.root.findByProps({
        accessibilityLabel: 'Closed · Read only status',
      }),
    ).toBeTruthy();
  });
});
