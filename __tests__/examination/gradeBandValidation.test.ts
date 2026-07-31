import type { GradeBand } from '../../src/models/examination';
import {
  findGradeBand,
  sortGradeBands,
  validateGradeBands,
} from '../../src/utils/gradeBandValidation';

const valid: GradeBand[] = [
  {
    id: 'a',
    displayOrder: 1,
    grade: 'A',
    gradePoint: 10,
    isPassing: true,
    maximumPercentage: 100,
    minimumPercentage: 80,
  },
  {
    id: 'b',
    displayOrder: 2,
    grade: 'B',
    gradePoint: 8,
    isPassing: true,
    maximumPercentage: 79.99,
    minimumPercentage: 40,
  },
  {
    id: 'f',
    displayOrder: 3,
    grade: 'F',
    gradePoint: 0,
    isPassing: false,
    maximumPercentage: 39.99,
    minimumPercentage: 0,
  },
];

describe('Grade Band validation', () => {
  it('accepts deterministic full-range coverage and resolves boundaries', () => {
    expect(validateGradeBands(valid)).toEqual([]);
    expect(sortGradeBands(valid).map(item => item.grade)).toEqual([
      'F',
      'B',
      'A',
    ]);
    expect(findGradeBand(valid, 0)?.grade).toBe('F');
    expect(findGradeBand(valid, 39.99)?.grade).toBe('F');
    expect(findGradeBand(valid, 40)?.grade).toBe('B');
    expect(findGradeBand(valid, 100)?.grade).toBe('A');
    expect(findGradeBand(valid, 101)).toBeUndefined();
  });

  it.each([
    [
      'overlap',
      [{ ...valid[1], minimumPercentage: 39 }],
      'OVERLAPPING_GRADE_BANDS',
    ],
    ['gap', [{ ...valid[1], minimumPercentage: 41 }], 'GAP_IN_GRADE_BANDS'],
    [
      'out of range',
      [{ ...valid[0], maximumPercentage: 101 }],
      'GRADE_RANGE_OUT_OF_BOUNDS',
    ],
    [
      'invalid min/max',
      [{ ...valid[1], minimumPercentage: 90 }],
      'INVALID_GRADE_RANGE',
    ],
  ])('detects %s', (_label, replacements, code) => {
    const values = valid.map(
      item => replacements.find(value => value.id === item.id) ?? item,
    );
    expect(validateGradeBands(values).some(error => error.code === code)).toBe(
      true,
    );
  });

  it('requires passing and failing bands and unique labels', () => {
    expect(
      validateGradeBands(valid.map(item => ({ ...item, isPassing: true }))),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'FAILING_GRADE_REQUIRED' }),
      ]),
    );
    expect(
      validateGradeBands(
        valid.map((item, index) =>
          index === 1 ? { ...item, grade: 'A' } : item,
        ),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DUPLICATE_GRADE' }),
      ]),
    );
  });
});
