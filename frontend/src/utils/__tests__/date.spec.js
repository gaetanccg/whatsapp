import { describe, it, expect } from 'vitest';
import { formatDateTimeISO, formatRelativeTime } from '../date.js';

describe('Date Utils', () => {
  describe('formatDateTimeISO', () => {
    it('formats valid ISO date', () => {
      const date = '2024-01-15T10:30:45.000Z';
      const result = formatDateTimeISO(date);
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/);
    });

    it('returns "Jamais" for null input', () => {
      expect(formatDateTimeISO(null)).toBe('Jamais');
    });

    it('returns "Jamais" for undefined input', () => {
      expect(formatDateTimeISO(undefined)).toBe('Jamais');
    });

    it('returns "Jamais" for empty string', () => {
      expect(formatDateTimeISO('')).toBe('Jamais');
    });
  });

  describe('formatRelativeTime', () => {
    it('returns "Just now" for very recent dates', () => {
      const now = new Date();
      const result = formatRelativeTime(now.toISOString());
      expect(result).toBe('Just now');
    });

    it('returns minutes for recent dates', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const result = formatRelativeTime(fiveMinutesAgo.toISOString());
      expect(result).toBe('5 minutes ago');
    });

    it('returns empty string for null input', () => {
      expect(formatRelativeTime(null)).toBe('');
    });
  });
});
