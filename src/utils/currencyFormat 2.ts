export const formatIndianCurrencyKPI = (value: number | string | null | undefined): string => {
  if (value == null) return '0';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '0';

  const absValue = Math.abs(numValue);
  let formatted = '';
  let suffix = '';

  if (absValue >= 10000000) { // 1 Crore = 10,000,000
    formatted = (numValue / 10000000).toFixed(2);
    suffix = 'Cr';
  } else if (absValue >= 100000) { // 1 Lakh = 100,000
    formatted = (numValue / 100000).toFixed(2);
    suffix = 'L';
  } else if (absValue >= 1000) { // 1K = 1,000
    formatted = (numValue / 1000).toFixed(2);
    suffix = 'K';
  } else {
    formatted = numValue.toFixed(2);
  }

  // Remove unnecessary trailing decimal zeros
  formatted = formatted.replace(/\.00$/, '');
  // Also remove trailing zero after decimal (e.g. .50 -> .5)
  if (formatted.includes('.')) {
    formatted = formatted.replace(/0+$/, '').replace(/\.$/, '');
  }

  return formatted + suffix;
};
