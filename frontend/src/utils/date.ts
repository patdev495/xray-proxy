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
