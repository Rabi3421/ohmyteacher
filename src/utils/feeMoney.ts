import { ApiClientError } from '../services/api/apiError';
import { formatCurrency } from './currency';

export const MAX_FEE_AMOUNT_PAISE = 9_999_999_999;

const FORM_DECIMAL = /^(0|[1-9]\d{0,7})(?:\.(\d{1,2}))?$/;
const BACKEND_DECIMAL = /^(0|[1-9]\d{0,7})\.(\d{2})$/;

function invalid(message: string): ApiClientError {
  return new ApiClientError({
    code: 'INVALID_FEE_AMOUNT',
    fieldErrors: { amount: message },
    kind: 'validation',
    message,
    status: 400,
  });
}

function partsToPaise(rupees: string, fraction: string): number {
  const whole = Number(rupees);
  const paise = Number(fraction.padEnd(2, '0'));
  const result = whole * 100 + paise;
  if (!Number.isSafeInteger(result) || result > MAX_FEE_AMOUNT_PAISE) {
    throw invalid('Amount exceeds Django’s maximum of ₹99,999,999.99.');
  }
  return result;
}

/** Parses a user-entered, non-localized decimal rupee value without rounding. */
export function parseFeeAmountInput(value: string): number {
  const normalized = value.trim();
  const match = FORM_DECIMAL.exec(normalized);
  if (!match) {
    throw invalid(
      'Enter rupees without commas or signs, using at most two decimal places.',
    );
  }
  return partsToPaise(match[1], match[2] ?? '');
}

/** Parses DRF DecimalField output. It must be a canonical fixed-scale string. */
export function parseFeeAmountDto(value: unknown): number {
  if (typeof value !== 'string') {
    throw invalid('The server returned a non-string fee amount.');
  }
  const match = BACKEND_DECIMAL.exec(value);
  if (!match) {
    throw invalid('The server returned a malformed two-decimal fee amount.');
  }
  return partsToPaise(match[1], match[2]);
}

/** Converts exact integer paise into the canonical DecimalField request form. */
export function feePaiseToDto(value: number): string {
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > MAX_FEE_AMOUNT_PAISE
  ) {
    throw invalid('Fee amount must be exact, non-negative integer paise.');
  }
  const rupees = Math.floor(value / 100);
  const paise = value % 100;
  return `${rupees}.${paise.toString().padStart(2, '0')}`;
}

export function addFeePaise(values: readonly number[]): number {
  return values.reduce((total, value) => {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw invalid('Cannot total an invalid fee amount.');
    }
    const next = total + value;
    if (!Number.isSafeInteger(next)) {
      throw invalid('Fee total exceeds the safe internal precision.');
    }
    return next;
  }, 0);
}

export function formatFeePaise(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) return '₹0.00';
  return formatCurrency(value / 100, { showDecimals: true });
}
