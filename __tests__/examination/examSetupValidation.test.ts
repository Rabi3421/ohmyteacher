import {
  INITIAL_EXAM_CLASS_CONFIGURATIONS,
  INITIAL_EXAMS,
  INITIAL_EXAM_SUBJECT_PAPERS,
  INITIAL_GRADING_SCHEMES,
} from '../../src/services/examinationSetup/examinationSetupFixtures';
import { validateExamSetup } from '../../src/utils/examSetupValidation';

const exam = INITIAL_EXAMS.find(item => item.id === 'exam-omt-complete-draft')!;
const configuration = INITIAL_EXAM_CLASS_CONFIGURATIONS.find(
  item => item.examId === exam.id,
)!;
const paper = INITIAL_EXAM_SUBJECT_PAPERS.find(
  item => item.examId === exam.id,
)!;
const base = {
  configurations: [configuration],
  exam,
  examTypeActive: true,
  gradingSchemes: INITIAL_GRADING_SCHEMES,
  papers: [paper],
  sessionClosed: false,
  sessionEndDate: '2027-03-31',
  sessionStartDate: '2026-04-01',
  termActive: true,
};

describe('Exam setup completeness', () => {
  it('marks a fully configured Exam complete', () => {
    const result = validateExamSetup(base);
    expect(result.isComplete).toBe(true);
    expect(result.completionPercent).toBe(100);
    expect(result.blockers).toEqual([]);
  });

  it.each([
    ['no class', { configurations: [], papers: [] }, 'EXAM_CLASS_REQUIRED'],
    [
      'no section',
      { configurations: [{ ...configuration, sectionIds: [] }] },
      'EXAM_SECTION_REQUIRED',
    ],
    ['no paper', { papers: [] }, 'SUBJECT_PAPER_REQUIRED'],
    [
      'missing schedule',
      { papers: [{ ...paper, examDate: undefined }] },
      'MISSING_SCHEDULE',
    ],
    [
      'invalid marks',
      { papers: [{ ...paper, totalPassMarks: 101 }] },
      'INVALID_PAPER_PASS_MARKS',
    ],
  ])('returns a blocker for %s', (_label, override, code) => {
    const result = validateExamSetup({ ...base, ...override });
    expect(result.isComplete).toBe(false);
    expect(result.completionPercent).toBeLessThan(100);
    expect(result.blockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ code })]),
    );
  });

  it('keeps a room overlap as a warning while Class overlap remains blocking', () => {
    const otherConfiguration = {
      ...configuration,
      id: 'other-config',
      classId: 'other-class',
      classNameSnapshot: 'Other Class',
      sectionIds: ['other-section'],
    };
    const otherPaper = {
      ...paper,
      id: 'other-paper',
      examClassConfigurationId: otherConfiguration.id,
      classId: otherConfiguration.classId,
      subjectId: 'other-subject',
    };
    const result = validateExamSetup({
      ...base,
      configurations: [configuration, otherConfiguration],
      papers: [paper, otherPaper],
    });
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ROOM_TIME_OVERLAP' }),
      ]),
    );
  });
});
