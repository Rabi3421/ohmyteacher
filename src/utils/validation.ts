function asNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value.trim());
}

export function isRequired(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value !== null && value !== undefined;
}

export function isIndianMobile(value: string): boolean {
  return /^[6-9]\d{9}$/.test(value.replace(/[\s-]/g, ''));
}

export function normalizeIndianMobile(value: string): string {
  return value.replace(/\D/g, '').slice(-10);
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function isPinCode(value: string): boolean {
  return /^[1-9][0-9]{5}$/.test(value.trim());
}

export function normalizeSchoolCode(value: string): string {
  return value.trim().replace(/\s+/g, '').toUpperCase();
}

export function isSchoolCode(value: string): boolean {
  return /^[A-Z0-9][A-Z0-9-]{2,19}$/.test(normalizeSchoolCode(value));
}

export function isMobileOrEmail(value: string): boolean {
  return isIndianMobile(value) || isEmail(value);
}

export function isSixDigitOtp(value: string): boolean {
  return /^\d{6}$/.test(value);
}

export function isPositiveAmount(value: number | string): boolean {
  const number = asNumber(value);
  return Number.isFinite(number) && number > 0;
}

export function isPercentage(value: number | string): boolean {
  const number = asNumber(value);
  return Number.isFinite(number) && number >= 0 && number <= 100;
}

export function isMarksInRange(
  value: number | string,
  maximumMarks: number,
  minimumMarks = 0,
): boolean {
  const number = asNumber(value);
  return (
    Number.isFinite(number) &&
    number >= minimumMarks &&
    number <= maximumMarks
  );
}
