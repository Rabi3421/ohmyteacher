import { formatApiDate } from './date';

export interface AcademicYearRange {
  name: string;
  startDate: string;
  endDate: string;
  startYear: number;
  endYear: number;
}

export function getAcademicYearForDate(date: Date): AcademicYearRange {
  const year = date.getFullYear();
  const startYear = date.getMonth() >= 3 ? year : year - 1;
  const endYear = startYear + 1;

  return {
    endDate: formatApiDate(new Date(endYear, 2, 31)),
    endYear,
    name: `${startYear}-${String(endYear).slice(-2)}`,
    startDate: formatApiDate(new Date(startYear, 3, 1)),
    startYear,
  };
}

export function getCurrentAcademicSessionName(date = new Date()): string {
  return getAcademicYearForDate(date).name;
}

export function getCurrentAcademicSessionStartDate(
  date = new Date(),
): string {
  return getAcademicYearForDate(date).startDate;
}

export function getCurrentAcademicSessionEndDate(date = new Date()): string {
  return getAcademicYearForDate(date).endDate;
}

export function doDateRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return startA <= endB && startB <= endA;
}
