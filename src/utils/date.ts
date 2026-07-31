import { DEFAULT_LOCALE } from '../constants/app';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function normalizeDate(value: Date | string | number): Date {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string') {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateOnly) {
      return new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      );
    }
  }

  return new Date(value);
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatApiDate(value: Date | string | number): string {
  const date = normalizeDate(value);
  if (!isValidDate(date)) {
    return '';
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

export function formatDisplayDate(value: Date | string | number): string {
  const date = normalizeDate(value);
  if (!isValidDate(date)) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return `${pad(date.getDate())} ${MONTHS[date.getMonth()].slice(
      0,
      3,
    )} ${date.getFullYear()}`;
  }
}

export function formatDateTime(value: Date | string | number): string {
  const date = normalizeDate(value);
  if (!isValidDate(date)) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return `${formatDisplayDate(date)}, ${pad(date.getHours())}:${pad(
      date.getMinutes(),
    )}`;
  }
}

export function formatAcademicSession(
  startYear: number,
  endYear = startYear + 1,
): string {
  return `${startYear}–${String(endYear).slice(-2)}`;
}

export function getMonthName(month: number, short = false): string {
  const monthName = MONTHS[month - 1];
  if (!monthName) {
    return '';
  }

  return short ? monthName.slice(0, 3) : monthName;
}
