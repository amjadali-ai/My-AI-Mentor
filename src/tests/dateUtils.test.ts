import { describe, it, expect } from 'vitest';
import {
  getLocalDateString,
  getTomorrowDateString,
  getLocalDayName,
  createSafeIsoRange,
  formatMinutesToHours,
} from '../lib/dateUtils';

describe('Date & Timezone Utilities (dateUtils.ts)', () => {
  it('formats local calendar date consistently as YYYY-MM-DD', () => {
    const testDate = new Date(2026, 9, 14, 23, 45, 0); // Oct 14, 2026, 23:45 local
    expect(getLocalDateString(testDate)).toBe('2026-10-14');
  });

  it('calculates tomorrow local calendar date', () => {
    const testDate = new Date(2026, 9, 14, 23, 45, 0); // Oct 14, 2026
    expect(getTomorrowDateString(testDate)).toBe('2026-10-15');
  });

  it('computes local day of week correctly', () => {
    const wednesday = new Date(2026, 9, 14); // Oct 14, 2026 is Wednesday
    expect(getLocalDayName(wednesday)).toBe('Wednesday');
  });

  it('safely computes ISO ranges without throwing RangeError for long sessions (> 60m)', () => {
    // Before fix, `new Date('2026-10-14T10:90:00.000Z')` threw RangeError
    const range90m = createSafeIsoRange('2026-10-14', 90);
    expect(range90m.startTime).toBeDefined();
    expect(range90m.endTime).toBeDefined();

    const start = new Date(range90m.startTime).getTime();
    const end = new Date(range90m.endTime).getTime();
    expect(Math.round((end - start) / 60000)).toBe(90);

    const range180m = createSafeIsoRange('2026-10-14', 180);
    const start180 = new Date(range180m.startTime).getTime();
    const end180 = new Date(range180m.endTime).getTime();
    expect(Math.round((end180 - start180) / 60000)).toBe(180);
  });

  it('formats minutes into human readable hours and minutes', () => {
    expect(formatMinutesToHours(45)).toBe('45m');
    expect(formatMinutesToHours(60)).toBe('1h');
    expect(formatMinutesToHours(125)).toBe('2h 5m');
  });
});
