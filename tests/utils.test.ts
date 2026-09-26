import { describe, it, expect } from 'vitest';
import { formatTimecode, parseTimecode, formatBytes } from '@/lib/utils';

describe('formatTimecode', () => {
  it('formats zero correctly', () => {
    expect(formatTimecode(0)).toBe('00:00:00.000');
  });

  it('formats hours, minutes, seconds, and milliseconds', () => {
    expect(formatTimecode(3722.5)).toBe('01:02:02.500');
  });

  it('clamps negative input to zero', () => {
    expect(formatTimecode(-5)).toBe('00:00:00.000');
  });
});

describe('parseTimecode', () => {
  it('parses a well-formed timecode', () => {
    expect(parseTimecode('01:02:02.500')).toBeCloseTo(3722.5, 3);
  });

  it('parses a timecode without milliseconds', () => {
    expect(parseTimecode('00:00:10')).toBe(10);
  });

  it('returns null for malformed input', () => {
    expect(parseTimecode('not a timecode')).toBeNull();
    expect(parseTimecode('12:34')).toBeNull();
  });

  it('round-trips with formatTimecode', () => {
    const original = 128.75;
    const parsed = parseTimecode(formatTimecode(original));
    expect(parsed).toBeCloseTo(original, 2);
  });
});

describe('formatBytes', () => {
  it('formats bytes at each unit boundary', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
  });

  it('accepts a stringified bigint-sized value', () => {
    expect(formatBytes('1073741824')).toBe('1.0 GB');
  });
});
