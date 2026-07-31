import { formatCurrency } from '../../src/utils/currency';
import {
  formatAcademicSession,
  formatApiDate,
  getMonthName,
} from '../../src/utils/date';
import {
  isEmail,
  isIndianMobile,
  isMarksInRange,
  isPercentage,
  isPinCode,
  isPositiveAmount,
  isRequired,
} from '../../src/utils/validation';

describe('foundation utilities', () => {
  it('formats Indian currency using lakh grouping', () => {
    expect(formatCurrency(1250)).toBe('₹1,250');
    expect(formatCurrency(125000)).toBe('₹1,25,000');
  });

  it('formats dates and academic sessions', () => {
    expect(formatApiDate(new Date(2026, 6, 31))).toBe('2026-07-31');
    expect(formatAcademicSession(2026)).toBe('2026–27');
    expect(getMonthName(7)).toBe('July');
  });

  it('validates common form values', () => {
    expect(isRequired(' School ')).toBe(true);
    expect(isRequired('')).toBe(false);
    expect(isIndianMobile('98765 43210')).toBe(true);
    expect(isEmail('admin@school.edu')).toBe(true);
    expect(isPinCode('751001')).toBe(true);
    expect(isPositiveAmount('1250')).toBe(true);
    expect(isPercentage(100)).toBe(true);
    expect(isPercentage(101)).toBe(false);
    expect(isMarksInRange(42, 50)).toBe(true);
    expect(isMarksInRange(51, 50)).toBe(false);
  });
});
