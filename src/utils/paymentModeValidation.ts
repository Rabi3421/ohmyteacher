import type { PaymentDetailsInput } from '../models/collection';

function isValidIsoDate(value: string | undefined): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validatePaymentDetails(
  input: PaymentDetailsInput,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!Number.isInteger(input.amountPaise) || input.amountPaise <= 0)
    errors.amountPaise = 'Enter a positive amount in integer paise.';
  if (!isValidIsoDate(input.paymentDate))
    errors.paymentDate = 'Enter a valid payment date.';
  if (
    ['UPI', 'BANK_TRANSFER', 'CARD'].includes(input.paymentMode) &&
    !input.referenceNumber?.trim()
  )
    errors.referenceNumber = 'Transaction reference is required.';
  if (input.paymentMode === 'CHEQUE') {
    if (!input.chequeNumber?.trim())
      errors.chequeNumber = 'Cheque number is required.';
    if (!isValidIsoDate(input.chequeDate))
      errors.chequeDate = 'Enter a valid cheque date.';
    if (!input.bankName?.trim()) errors.bankName = 'Bank name is required.';
  }
  return errors;
}
