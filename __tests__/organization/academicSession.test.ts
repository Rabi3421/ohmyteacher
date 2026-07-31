import {
  doDateRangesOverlap,
  getAcademicYearForDate,
  getCurrentAcademicSessionEndDate,
  getCurrentAcademicSessionName,
  getCurrentAcademicSessionStartDate,
} from '../../src/utils/academicSession';

describe('Indian April–March academic session helpers', () => {
  it.each([
    ['2026-03-15T12:00:00.000Z', '2025-26'],
    ['2026-04-01T12:00:00.000Z', '2026-27'],
    ['2026-07-20T12:00:00.000Z', '2026-27'],
    ['2027-01-10T12:00:00.000Z', '2026-27'],
    ['2027-04-01T12:00:00.000Z', '2027-28'],
  ])('maps %s to %s', (date, expected) => {
    expect(getCurrentAcademicSessionName(new Date(date))).toBe(expected);
  });

  it('returns exact start and end dates', () => {
    const date = new Date('2026-07-20T12:00:00.000Z');
    expect(getCurrentAcademicSessionStartDate(date)).toBe('2026-04-01');
    expect(getCurrentAcademicSessionEndDate(date)).toBe('2027-03-31');
    expect(getAcademicYearForDate(date)).toMatchObject({
      endYear: 2027,
      startYear: 2026,
    });
  });

  it('detects inclusive date-range overlap', () => {
    expect(
      doDateRangesOverlap(
        '2026-04-01',
        '2027-03-31',
        '2027-03-31',
        '2028-03-31',
      ),
    ).toBe(true);
    expect(
      doDateRangesOverlap(
        '2026-04-01',
        '2027-03-30',
        '2027-03-31',
        '2028-03-31',
      ),
    ).toBe(false);
  });
});
