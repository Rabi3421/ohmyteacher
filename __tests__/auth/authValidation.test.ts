import {
  isIndianMobile,
  isMobileOrEmail,
  isSchoolCode,
  isSixDigitOtp,
  normalizeSchoolCode,
} from '../../src/utils/validation';

describe('authentication validation', () => {
  it('normalizes and validates school codes', () => {
    expect(normalizeSchoolCode(' omt 001 ')).toBe('OMT001');
    expect(isSchoolCode('OMT001')).toBe(true);
    expect(isSchoolCode('!')).toBe(false);
  });

  it('validates Indian mobile numbers and platform identifiers', () => {
    expect(isIndianMobile('9876543210')).toBe(true);
    expect(isIndianMobile('1234567890')).toBe(false);
    expect(isMobileOrEmail('admin@ohmyteacher.in')).toBe(true);
    expect(isMobileOrEmail('not-an-identifier')).toBe(false);
  });

  it('requires exactly six OTP digits', () => {
    expect(isSixDigitOtp('123456')).toBe(true);
    expect(isSixDigitOtp('12345')).toBe(false);
    expect(isSixDigitOtp('12345A')).toBe(false);
  });
});
