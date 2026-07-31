import type { ExamSubjectPaper } from '../../src/models/examination';
import {
  assessmentComponentPassTotal,
  assessmentComponentTotal,
  validateMarksConfiguration,
} from '../../src/utils/marksConfiguration';

function paper(overrides: Partial<ExamSubjectPaper> = {}): ExamSubjectPaper {
  return {
    academicSessionId: 'session',
    branchId: 'branch',
    classId: 'class',
    components: [
      {
        id: 'theory',
        displayOrder: 1,
        marksEntryRequired: true,
        maximumMarks: 80,
        name: 'Theory',
        passMarks: 32,
        type: 'THEORY',
      },
      {
        id: 'practical',
        displayOrder: 2,
        marksEntryRequired: true,
        maximumMarks: 20,
        name: 'Practical',
        passMarks: 8,
        type: 'PRACTICAL',
      },
    ],
    createdAt: '',
    displayOrder: 1,
    examClassConfigurationId: 'config',
    examId: 'exam',
    id: 'paper',
    schoolId: 'school',
    status: 'DRAFT',
    subjectCodeSnapshot: 'SCI',
    subjectId: 'subject',
    subjectNameSnapshot: 'Science',
    subjectTypeSnapshot: 'CORE',
    totalMaximumMarks: 100,
    totalPassMarks: 40,
    updatedAt: '',
    ...overrides,
  };
}

describe('Marks configuration', () => {
  it('supports theory-only, practical, and oral component totals', () => {
    expect(validateMarksConfiguration(paper())).toEqual([]);
    expect(assessmentComponentTotal(paper().components)).toBe(100);
    expect(assessmentComponentPassTotal(paper().components)).toBe(40);
    expect(
      validateMarksConfiguration(
        paper({
          components: [
            {
              id: 'oral',
              displayOrder: 1,
              marksEntryRequired: true,
              maximumMarks: 100,
              name: 'Oral',
              passMarks: 40,
              type: 'ORAL',
            },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it.each([
    ['pass above maximum', { totalPassMarks: 101 }, 'INVALID_PAPER_PASS_MARKS'],
    [
      'component mismatch',
      { totalMaximumMarks: 90 },
      'COMPONENT_TOTAL_MISMATCH',
    ],
    ['invalid weightage', { weightagePercent: 101 }, 'INVALID_PAPER_WEIGHTAGE'],
    ['floating marks', { totalMaximumMarks: 100.5 }, 'INVALID_PAPER_MAXIMUM'],
  ])('rejects %s', (_label, override, code) => {
    expect(
      validateMarksConfiguration(paper(override)).some(
        item => item.code === code,
      ),
    ).toBe(true);
  });

  it('rejects duplicate names and display orders', () => {
    const components = paper().components.map((item, index) =>
      index ? { ...item, name: 'Theory', displayOrder: 1 } : item,
    );
    const codes = validateMarksConfiguration(paper({ components })).map(
      item => item.code,
    );
    expect(codes).toEqual(
      expect.arrayContaining([
        'DUPLICATE_COMPONENT_NAME',
        'INVALID_COMPONENT_DISPLAY_ORDER',
      ]),
    );
  });
});
