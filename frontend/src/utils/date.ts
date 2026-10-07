/**
 * Parse an ISO date string safely treating naive timestamps from backend/SQLite as UTC.
 */
export function parseUtcDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const normalized = dateStr.endsWith('Z') || dateStr.includes('+')
    ? dateStr
    : `${dateStr}Z`;
  return new Date(normalized);
}

export function formatDateTime(date: Date | string, language: string): string {
  const value = typeof date === 'string' ? parseUtcDate(date) : date;
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

export function formatVnd(amount: number, language: string): string {
  return new Intl.NumberFormat(language === 'en' ? 'en-US' : 'vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}
