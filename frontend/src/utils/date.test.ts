import { describe, expect, it } from 'vitest';
import { formatDateTime, formatVnd } from './date';
import { resolveLanguagePreference } from '../i18n';

describe('localized formatters', () => {
  it('formats VND for Vietnamese and English interface languages', () => {
    expect(formatVnd(50000, 'vi')).toContain('50.000');
    expect(formatVnd(50000, 'en')).toContain('50,000');
  });

  it('uses the selected locale for date and time display', () => {
    const instant = new Date('2026-01-02T03:04:00Z');
    expect(formatDateTime(instant, 'vi')).not.toEqual(formatDateTime(instant, 'en'));
  });

  it('defaults a missing or invalid stored preference to Vietnamese', () => {
    expect(resolveLanguagePreference(null)).toBe('vi');
    expect(resolveLanguagePreference('en')).toBe('en');
    expect(resolveLanguagePreference('fr')).toBe('vi');
  });
});
