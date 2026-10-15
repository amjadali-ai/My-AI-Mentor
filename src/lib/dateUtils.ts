/**
 * Date & Timezone Utilities
 * Ensures consistent local-time calculations without UTC offset drift
 * and prevents Invalid Date RangeErrors.
 */

import { DayOfWeek } from '../types';

/**
 * Returns YYYY-MM-DD string in user's local timezone
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns tomorrow's YYYY-MM-DD string in user's local timezone
 */
export function getTomorrowDateString(d: Date = new Date()): string {
  const tomorrow = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return getLocalDateString(tomorrow);
}

/**
 * Returns the day of the week in English
 */
export function getLocalDayName(d: Date = new Date()): DayOfWeek {
  const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[d.getDay()];
}

/**
 * Formats a local date and duration (in minutes) into safe ISO strings
 * Prevents RangeError: Invalid time value when minutes >= 60
 */
export function createSafeIsoRange(dateStr: string, durationMinutes: number): { startTime: string; endTime: string } {
  // Parse dateStr (expected YYYY-MM-DD)
  const [year, month, day] = dateStr.split('-').map(Number);
  const start = new Date(year, (month || 1) - 1, day || 1, 10, 0, 0);
  const end = new Date(start.getTime() + Math.max(1, durationMinutes) * 60000);

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
}

/**
 * Format minutes into Xh Ym
 */
export function formatMinutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
