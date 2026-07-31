import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from '../constants/app';

function fallbackIndianGrouping(value: number): string {
  const absolute = Math.abs(Math.round(value)).toString();
  const lastThree = absolute.slice(-3);
  const leading = absolute.slice(0, -3);
  const groupedLeading = leading.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  const grouped = leading ? `${groupedLeading},${lastThree}` : lastThree;
  return `${value < 0 ? '-' : ''}₹${grouped}`;
}

export function formatCurrency(
  value: number,
  options: { showDecimals?: boolean } = {},
): string {
  if (!Number.isFinite(value)) {
    return '₹0';
  }

  try {
    return new Intl.NumberFormat(DEFAULT_LOCALE, {
      currency: DEFAULT_CURRENCY,
      maximumFractionDigits: options.showDecimals ? 2 : 0,
      minimumFractionDigits: options.showDecimals ? 2 : 0,
      style: 'currency',
    })
      .format(value)
      .replace(/\s/g, '');
  } catch {
    return fallbackIndianGrouping(value);
  }
}
